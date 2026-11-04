'use strict';
/* Mode RTS « Guerre des robots », suite de js/41-rts.js : unités, bâtiments, nids, début et fin de partie (zombies, combat et boucle : js/42-rts-combat.js) */
/* ---------- Unités, bâtiments, nids ---------- */
const rtsStat = (u, k) => {
  const U = u.U, t = u.type;
  if (k === 'dmg') return U.dmg * (1 + RTS_UPG.arm.k * rtsLv(t, 'arm'));
  if (k === 'hp') return U.hp * (1 + RTS_UPG.hp.k * rtsLv(t, 'hp'));
  if (k === 'rate') return U.rate * (1 + RTS_UPG.rate.k * rtsLv(t, 'rate'));
  if (k === 'speed') return U.speed * (1 + RTS_UPG.spd.k * rtsLv(t, 'spd'));
  if (k === 'range') return U.range * (1 + .06 * rtsLv(t, 'spd') + .15 * rtsLv(t, 'sensor'));
  return U[k];
};
const rtsIsAir = u => u.U.kind !== 'ground';
function rtsSpawnUnit(type, x, z){
  const U = RTS_UNITS[type], g = new THREE.Group(), ground = U.kind === 'ground', robot = U.cat === 'rob' && !U.big;
  g.position.set(x, ground ? 0 : U.alt, z); if (robot) g.scale.setScalar(RTS_SC); rtsRoot.add(g);
  const m = new THREE.Mesh(rtsUnitGeo(type), rtsMat); g.add(m);
  let rotor = null;
  if (type === 'heli'){ rotor = new THREE.Mesh(rtsRotorGeo(true), rtsMat); rotor.position.set(0, 1.3, .6); g.add(rotor); const tr = new THREE.Mesh(rtsRotorGeo(false), rtsMat); tr.rotation.z = Math.PI / 2; tr.position.set(.25, .9, -4.6); g.add(tr); g.userData.tail = tr; }
  if (type === 'bomber'){ // 4 hélices et leur disque flou
    g.userData.props = [];
    for (const sd of [-1, 1]) for (const x of [3.6, 7.2]){
      const pr = new THREE.Mesh(rtsPropGeo(), rtsMat); pr.position.set(sd * x, 1, 3.8); g.add(pr); g.userData.props.push(pr);
      const disc = new THREE.Mesh(new THREE.CircleGeometry(1.65, 20), rtsPropBlur); disc.position.set(sd * x, 1, 3.85); g.add(disc);
    }
  }
  const rr = ground ? U.r : U.r * .8;
  const ring = new THREE.Mesh(new THREE.RingGeometry(rr * 1.3, rr * 1.6, 24), rtsRingMat); ring.rotation.x = -Math.PI / 2; ring.position.y = ground ? .06 : -U.alt + .1; ring.visible = false; g.add(ring);
  const hp = rtsHpBar(g, U.big ? 9 : robot ? (type === 'heavy' ? 4.4 : 3) : ground ? 3.4 : 2.8, robot ? (type === 'heavy' ? 2.2 : 1.6) : 3.2);
  const u = { type, U, g, m, ring, rotor, hpb:hp, hp:0, maxHp:0, tx:x, tz:z, cmd:'idle', nest:null, tgt:null, cd:rand(0, .5), cd2:rand(0, .5), scanT:0, step:0, dead:false, hx:x, hz:z, retreat:false, r:robot ? U.r * RTS_SC : U.r, head:rand(0, 6.28) };
  u.maxHp = u.hp = rtsStat(u, 'hp');
  m.userData.rtsUnit = u; RTS.units.push(u); rtsHpSet(hp, 1);
  return u;
}
function rtsPlaceBld(type, x, z, free, rot){
  const B = RTS_BLD[type], g = new THREE.Group(); g.position.set(x, 0, z); rtsRoot.add(g);
  const m = new THREE.Mesh(rtsBldGeo(type), rtsMat); m.rotation.y = ((rot || 0) % 4) * Math.PI / 2; g.add(m); // rotation par quarts de tour
  let head = null; if (B.turret){ head = new THREE.Mesh(rtsHeadGeo(type), rtsMat); head.position.y = 1.5; g.add(head); }
  const ring = new THREE.Mesh(new THREE.RingGeometry(B.size + .3, B.size + .7, 32), rtsRingMat); ring.rotation.x = -Math.PI / 2; ring.position.y = .1; ring.visible = false; g.add(ring);
  const hpb = rtsHpBar(g, type === 'hq' ? 15 : B.turret ? 4.2 : 7, Math.max(2.2, Math.min(8, B.size * 1.2)));
  const o = { type, B, g, m, head, ring, hpb, hp:B.hp, maxHp:B.hp, x, z, rot:(rot || 0) % 4, r:B.size, lv:1, cd:rand(0, .5), tgt:null, scanT:0, spent:free ? 0 : B.cost, dead:false };
  m.userData.rtsBld = o; if (head) head.userData.rtsBld = o;
  RTS.blds.push(o); rtsHpSet(hpb, 1);
  if (type === 'hq') RTS.base = o;
  return o;
}
function rtsBldOk(type, x, z){
  const B = RTS_BLD[type]; if (!B) return 'Bâtiment inconnu';
  if (Math.hypot(x, z) + B.size > RTS.baseR) return 'Hors de la base : détruis des nids pour l’agrandir';
  if (z + B.size > 26 || Math.abs(x) + B.size > rtsValleyX(z) - 2) return 'Trop près de la montagne';
  for (const o of RTS.blds) if (!o.dead && Math.hypot(o.x - x, o.z - z) < o.r + B.size + .5) return 'Trop près d’un autre bâtiment';
  return '';
}
function rtsBuild(type, x, z, rot){
  const B = RTS_BLD[type]; if (!B || B.fixed) return null;
  if (S.money < B.cost){ if (typeof toast === 'function') toast('Pas assez d’argent : ' + B.name + ' (' + fmt(B.cost) + ')'); return null; }
  const why = rtsBldOk(type, x, z); if (why){ if (typeof toast === 'function') toast(why); return null; }
  S.money -= B.cost;
  const o = rtsPlaceBld(type, x, z, false, rot);
  rtsV.set(x, .5, z); burst(rtsV, 'dust', 12, 3);
  if (typeof Snd === 'object' && Snd.buy) Snd.buy();
  return o;
}
function rtsFactoryFor(type){
  const need = RTS_UNITS[type].fac; let best = null;
  for (const o of RTS.blds) if (!o.dead && o.type === need){ best = o; if (Math.random() < .5) break; }
  return best;
}
const RTS_FAC_NAME = { factory:'une Usine de robots', heavyfac:'une Usine lourde', vehdepot:'un Garage de blindés', heliport:'un Héliport', airfield:'un Aérodrome' };
function rtsBuy(type){
  const U = RTS_UNITS[type]; if (!U || !RTS.on || state !== 'rts') return null;
  rtsCancelPlace();
  const f = rtsFactoryFor(type);
  if (!f){ if (typeof toast === 'function') toast('Construis d’abord ' + RTS_FAC_NAME[U.fac]); return null; }
  if (S.money < U.cost){ if (typeof toast === 'function') toast('Pas assez d’argent pour : ' + U.name + ' (' + fmt(U.cost) + ')'); return null; }
  if (RTS.units.filter(u => !u.dead).length >= RTS_CFG.maxUnits){ if (typeof toast === 'function') toast('Plein : ' + RTS_CFG.maxUnits + ' unités au plus'); return null; }
  S.money -= U.cost;
  const a = Math.atan2(-f.z - 20, -f.x) + rand(-.4, .4), out = f.r + 3;
  const u = rtsSpawnUnit(type, f.x + Math.cos(a) * out, f.z + Math.sin(a) * out);
  u.tx = u.hx = f.x + Math.cos(a) * (out + 4); u.tz = u.hz = f.z + Math.sin(a) * (out + 4); u.cmd = U.kind === 'air' ? 'idle' : 'move';
  if (U.kind === 'air') u.head = Math.PI; // décolle vers le nord
  if (typeof rtsRallyApply === 'function') rtsRallyApply(u); // point de ralliement (js/49-rts-commandement.js)
  if (typeof Snd === 'object' && Snd.buy) Snd.buy();
  return u;
}
const rtsUpgCost = (type, k) => Math.round(RTS_UNITS[type].cost * .8 * Math.pow(1.6, rtsLv(type, k)) * (RTS_UPG[k] ? 1 : 1.25));
function rtsUpgBuy(type, k){
  const U = rtsUpgDef(type, k), C = RTS_UNITS[type]; if (!U || !C) return false;
  const l = rtsLv(type, k), cost = rtsUpgCost(type, k);
  if (l >= U.max || S.money < cost) return false;
  S.money -= cost; RTS.upg[type] = RTS.upg[type] || {}; RTS.upg[type][k] = l + 1;
  if (k === 'hp') RTS.units.forEach(u => { if (u.type === type && !u.dead){ const k2 = rtsStat(u, 'hp') / u.maxHp; u.maxHp *= k2; u.hp *= k2; rtsHpSet(u.hpb, u.hp / u.maxHp); } });
  if (typeof Snd === 'object' && Snd.buy) Snd.buy();
  return true;
}
const rtsTCost = o => Math.round(o.B.cost * .6 * Math.pow(1.5, o.lv - 1));
const rtsTStat = (o, k) => { const T = o.B.turret, l = o.lv - 1; return k === 'dmg' ? T.dmg * (1 + .3 * l) : k === 'rate' ? T.rate * (1 + .1 * l) : k === 'range' ? T.range * (1 + .06 * l) : T[k]; };
function rtsTurretUp(o){
  if (!o || !o.B.turret || o.dead || o.lv >= RTS_TMAX) return false;
  const c = rtsTCost(o); if (S.money < c) return false;
  S.money -= c; o.spent += c; o.lv++; o.maxHp *= 1.15; o.hp = o.maxHp; rtsHpSet(o.hpb, 1);
  o.head.scale.setScalar(1 + .07 * (o.lv - 1));
  if (typeof Snd === 'object' && Snd.buy) Snd.buy();
  return true;
}
function rtsSell(o){
  if (!o || o.dead || o.B.fixed) return false;
  S.money += Math.round(o.spent * .5); rtsBldDie(o, true);
  return true;
}
// Nids : le long de la vieille route, de chaque côté, de plus en plus loin au nord
function rtsAddNest(x, z){
  const i = RTS.nestN++;
  rtsEnsureChunks(z);
  if (x == null){ // n'importe où dans le secteur de 90°, loin des ruines et des autres nids
    const w = Math.max(15, Math.min(-z * .95, rtsValleyX(z) - 10));
    for (let k = 0; k < 16; k++){
      x = rand(-w, w);
      const near = RTS.ruins.some(r => Math.hypot(r[0] - x, r[1] - z) < r[2] + 8) || RTS.nests.some(n => !n.dead && Math.hypot(n.x - x, n.z - z) < 28);
      if (!near) break;
    }
  }
  const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = Math.atan2(-x, -z); rtsRoot.add(g);
  const mm = new THREE.Mesh(rtsNestGeo(), rtsMat); g.add(mm);
  // Chaque nouveau nid est plus solide et pond plus vite que le précédent
  const hp = rtsHpBar(g, 10.5, 6), mx = Math.round(RTS_CFG.nestHp * (1 + .3 * i) * Math.pow(1.08, Math.max(0, i - 5)));
  const o = { g, m:mm, hpb:hp, hp:mx, maxHp:mx, x, z, r:4.5, spawnT:rand(3, 7), dead:false, idx:i, pow:1 + .12 * i };
  mm.userData.rtsNest = o; RTS.nests.push(o);
  return o;
}
function rtsMakeNests(){
  // Six nids étalés dans tout le secteur de 90° au nord (de 85 à 290 m environ)
  const zs = [-84, -124, -164, -204, -244, -292];
  for (let i = 0; i < RTS_CFG.nests; i++) rtsAddNest(null, zs[i] + rand(-5, 5));
}
const rtsNestsAlive = () => RTS.nests.filter(n => !n.dead);
const rtsFront = () => { let z = 0; RTS.nests.forEach(n => { if (n.z < z) z = n.z; }); return z; };

/* ---------- Démarrer, quitter ---------- */
function rtsClearAll(){
  rtsUnpilot();
  while (rtsRoot.children.length) rtsRoot.remove(rtsRoot.children[0]);
  RTS.units.length = 0; RTS.nests.length = 0; RTS.blds.length = 0; RTS.sel.length = 0; RTS.bsel = null; RTS.base = null; rtsCancelPlace();
}
// save : partie sauvée (js/45-rts-sauvegarde.js) à reprendre ; sans save, nouvelle partie
function rtsStart(save){
  if (save && !(typeof rtsSaveOk === 'function' && rtsSaveOk(save))) save = null;
  if (typeof Snd === 'object') Snd.init();
  if (typeof infLeave === 'function') try { infLeave(); } catch (e) { errNote(e); }
  newGame(); clearZombies(); rtsClearAll();
  curLoc = LOCS[0];
  Object.assign(RTS, { on:true, paused:false, t:0, kills:0, threat:1, hordeT:RTS_CFG.hordeEvery, hordeN:0, bossN:0, bossKills:0, nestN:0, lost:0, upg:{}, baseR:RTS_CFG.baseR0, incT:5, tab:'rob', xp0:P.xp || 0, scr0:P.scrap || 0, zMin:-300, spin:0, shells:[] });
  if (typeof rtsGroupsReset === 'function') rtsGroupsReset(); // groupes vides (la sauvegarde les remet ensuite)
  rtsRoadReset(); if (save) rtsLoadRoad(save);
  rtsDesert();
  if (save) rtsLoadNests(save); else rtsMakeNests();
  S.money = RTS_CFG.money; S.wave = 1;
  rtsCamHome();
  plan = { queue:[], total:0, hpMult:1, spdMult:1, dmgMult:1, cashMult:1.6, xp:1.5, maxAlive:isTouch ? RTS_CFG.maxZTouch : RTS_CFG.maxZ, interval:1 };
  if (save) rtsLoadRest(save);
  else {
    rtsPlaceBld('hq', 0, 0, true);
    rtsPlaceBld('factory', -12, 6, true);
    rtsPlaceBld('t_mg', 7, -12, true); rtsPlaceBld('t_mg', -7, -13, true); rtsPlaceBld('t_mg', 14, -3, true);
    for (let i = 0; i < 3; i++){ const u = rtsSpawnUnit('rifle', -3 + i * 3, -12); u.tx = -3 + i * 3; u.tz = -16; u.cmd = 'move'; }
  }
  rtsBaseSize(); RTS.saveT = 30;
  if (typeof RTS_TIP === 'object'){ RTS_TIP.cur = null; RTS_TIP.gap = 3; }
  if (typeof rtsCmdReset === 'function'){ rtsCmdReset(); if (save && save.rally && isFinite(save.rally.x)) rtsRallySet(+save.rally.x, +save.rally.z); }
  state = 'rts';
  showScreen(null); rtsPanel.classList.add('hide');
  $('hud').classList.add('hide'); $('touch').classList.add('hide'); $('cross').classList.add('hide');
  document.body.classList.add('rts');
  rtsUI.classList.remove('hide'); rtsUI.classList.toggle('touch', isTouch); rtsTab('rob'); rtsFold(!!store.get('dt_rtsFold', false));
  if (typeof unlockPointer === 'function') unlockPointer();
  if (save) banner('Partie reprise', 'Nids détruits : ' + RTS.nests.filter(n => n.dead).length + ' · la guerre continue', 2600);
  else banner('Base assiégée', 'Ils arrivent de partout au nord : défends tout l’avant de la base. Chaque nid détruit en fait apparaître un plus fort, plus loin.', 3200);
}
// Caméra de départ : la base au centre de la partie visible (au-dessus du menu du bas).
// Cell couché : écran bas et large, donc caméra plus proche et un peu plus au sud.
function rtsCamHome(){
  const land = isTouch && innerWidth > innerHeight;
  RTS.cam.x = 0; RTS.cam.z = land ? -2 : -10; RTS.cam.h = land ? 46 : isTouch ? 64 : 56;
}
function rtsQuit(){
  RTS.on = false; RTS.paused = false;
  rtsClearAll();
  rtsUI.classList.add('hide'); rtsPanel.classList.add('hide'); rtsBox.style.display = 'none'; rtsInfo.classList.add('hide');
  document.body.classList.remove('rts');
  clearZombies(); RTS.pad = RTS.edge = null;
  camera.position.copy(EYE); camera.rotation.order = 'YXZ'; camera.rotation.set(0, 0, 0);
  state = 'menu'; curLoc = LOCS[0]; buildWorld(curLoc); newGame(); plan = wavePlan(1);
  if (typeof saveP === 'function') saveP();
  showScreen('scrTitle'); $('hud').classList.add('hide');
  if (typeof rtsSaveBtn === 'function') rtsSaveBtn();
}
function rtsEnd(won){
  if (state === 'rtsover') return;
  rtsUnpilot();
  state = 'rtsover'; RTS.paused = false; rtsCancelPlace();
  if (typeof rtsSaveClear === 'function') rtsSaveClear(); // partie finie : plus rien à reprendre
  const min = Math.floor(RTS.t / 60), sec = Math.floor(RTS.t % 60), nd = RTS.nests.filter(n => n.dead).length;
  const rec = nd > RTS.best; if (rec){ RTS.best = nd; store.set('dt_rts_bestN', nd); }
  if (typeof Snd === 'object' && Snd.boom) Snd.boom(2.2);
  if (typeof saveP === 'function') saveP();
  const xp = Math.max(0, Math.round((P.xp || 0) - RTS.xp0)), scr = Math.max(0, Math.round((P.scrap || 0) - RTS.scr0));
  setTimeout(() => rtsShowPanel('<h2 class="title sm">' + (won ? 'Fin de la partie' : 'Le QG est tombé') + '</h2><div class="stats">'
    + '<span>Nids détruits : <strong>' + nd + '</strong>' + (rec ? ' · nouveau record !' : ' · record : ' + RTS.best) + ' · Boss abattus : <strong>' + RTS.bossKills + '</strong></span>'
    + '<span>Temps tenu : <strong>' + min + ' min ' + String(sec).padStart(2, '0') + ' s</strong></span>'
    + '<span>Zombies abattus : <strong>' + fmtN(RTS.kills) + '</strong> · Unités perdues : <strong>' + RTS.lost + '</strong></span>'
    + '<span>Expérience : <strong>+' + fmtN(xp) + '</strong> · Ferraille : <strong>+' + fmtN(scr) + ' ⚙</strong></span></div>',
    [['Rejouer', rtsStart], ['Menu', rtsQuit]]), 1000);
}
function rtsPause(){
  if (state !== 'rts' || RTS.paused) return;
  RTS.paused = true; if (typeof unlockPointer === 'function') unlockPointer();
  if (typeof rtsSave === 'function') rtsSave();
  rtsShowPanel('<h2 class="title sm">Pause</h2><p class="lead">Menace ' + RTS.threat.toFixed(1).replace('.', ',') + ' · ' + fmtN(RTS.kills) + ' zombies abattus</p>',
    [['Reprendre', () => { RTS.paused = false; rtsPanel.classList.add('hide'); if (RTS.pilot && !isTouch && typeof lockPointer === 'function') lockPointer(); }]]
      .concat(RTS.pilot ? [['Retour à la carte', () => { rtsUnpilot(); RTS.paused = false; rtsPanel.classList.add('hide'); }]] : []).concat([['Sauver et quitter', () => { if (typeof rtsSave === 'function') rtsSave(); rtsQuit(); }],
        ['Abandonner (efface la partie)', () => { if (typeof rtsSaveClear === 'function') rtsSaveClear(); rtsQuit(); }]]));
  if (typeof rtsTipPauseBtn === 'function') rtsTipPauseBtn();
  if (typeof rtsPhotoPauseBtn === 'function') rtsPhotoPauseBtn();
}
