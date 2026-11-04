'use strict';
/* ================= Mode RTS : « Guerre des robots » ================= */
// Vue de stratégie au-dessus de la rue. Tu achètes des robots à ton quartier général (QG), tu les sélectionnes
// et tu les envoies se battre. Le but : détruire les bâtiments infectés (nids) qui font sortir les zombies.
// Chaque zombie abattu rapporte de l'argent (pour acheter d'autres robots) ; la menace monte avec le temps,
// les zombies abattus et les nids détruits ; des hordes arrivent régulièrement du bout de la rue.
// Perdu si le QG tombe ; gagné quand tous les nids sont détruits.
// Mêmes décors (buildWorld), mêmes zombies (spawnZombie, damage, kill : argent, XP et ferraille pour de vrai).
// Les zombies sont menés ici (rtsZombies) : ils vont vers le robot le plus proche, sinon vers le QG.
// Contrôles ordi : clic gauche (ou cadre) pour sélectionner, clic droit pour envoyer (sol : aller ; nid : attaquer),
//   ZQSD / WASD / flèches pour déplacer la vue, molette pour zoomer, 1 à 4 pour acheter, Espace pour tout sélectionner.
// Cell : toucher un robot pour le sélectionner, toucher le sol ou un nid pour l'envoyer, glisser pour déplacer la vue,
//   pincer pour zoomer, boutons en bas.
// État du jeu : 'rts' (la boucle normale n'appelle pas update ; rtsStep le fait dans visuals), 'rtsover' à la fin.

const RTS_UNITS = {
  rifle:   { name:'Fantassin',    cost:150,  hp:320,  dmg:26,  rate:3,   range:18, speed:6,   r:.8,  snd:'pistol',  col:0x4a6fa5, beam:0xffd890 },
  gunner:  { name:'Mitrailleur',  cost:400,  hp:520,  dmg:12,  rate:12,  range:16, speed:5,   r:.9,  snd:'rifle',   col:0x3d6a4a, beam:0xffd890 },
  rocket:  { name:'Lance-roquettes', cost:700, hp:420, dmg:170, rate:.8, range:26, speed:4.5, r:.9,  snd:'gl',      col:0x8a6a2a, splash:3.5 },
  heavy:   { name:'Mech lourd',   cost:1500, hp:1600, dmg:95,  rate:1.6, range:22, speed:3.6, r:1.4, snd:'laser',   col:0x6a3a6a, beam:0x50f0ff, pierce:true }
};
const RTS_ORDER = ['rifle', 'gunner', 'rocket', 'heavy'];
const RTS_SC = 1.5; // échelle des robots
const RTS_CFG = { money:600, baseHp:6000, baseZ:-2, nests:5, nestHp:4000, hordeEvery:50, bounty:500, maxUnits:40 };
const RTS = { on:false, paused:false, units:[], nests:[], base:null, sel:[], t:0, kills:0, threat:1, hordeT:0, hordeN:0, lost:0, cam:{ x:0, z:-30, h:44 },
  keys:{}, drag:null, pinch:null, sndT:0, ends:null, best:+store.get('dt_rts_best', 0) || 0 };
const rtsRoot = new THREE.Group(); scene.add(rtsRoot);
const rtsMat = new THREE.MeshLambertMaterial({ vertexColors:true });
const rtsRingMat = new THREE.MeshBasicMaterial({ color:0x6aff8a, transparent:true, opacity:.8, depthWrite:false, side:THREE.DoubleSide });
const rtsHpBg = new THREE.SpriteMaterial({ color:0x111111, depthTest:false, transparent:true, opacity:.7 });
const rtsHpG = new THREE.SpriteMaterial({ color:0x6aff8a, depthTest:false });
const rtsHpR = new THREE.SpriteMaterial({ color:0xff5a3a, depthTest:false });
const rtsV = new THREE.Vector3(), rtsV2 = new THREE.Vector3(), rtsRay = new THREE.Raycaster();

/* ---------- Modèles (géométries fusionnées, même outil que les armes en main) ---------- */
const RTS_GEO = {};
function rtsUnitGeo(type){
  if (RTS_GEO[type]) return RTS_GEO[type];
  const U = RTS_UNITS[type], b = vmNew(), c = U.col, k = type === 'heavy' ? 1.5 : 1;
  vmBox(b, .9 * k, .7 * k, .8 * k, c, 0, 1.55 * k, 0, 0, 0, 0, .08);                 // corps
  vmBox(b, .5 * k, .3 * k, .4 * k, VC.blue, 0, 1.95 * k, .2 * k, 0, 0, 0, .05);       // cockpit
  vmBox(b, .52 * k, .08 * k, .05, [.6, 2.4, 3], 0, 1.98 * k, .42 * k, 0, 0, 0, 0);   // vitre lumineuse
  vmBox(b, .95 * k, .1 * k, .85 * k, [2.6, 1.4, .3], 0, 1.22 * k, 0, 0, 0, 0, 0);    // bande de couleur (ton équipe)
  for (const s of [-1, 1]){
    vmBox(b, .22 * k, .75 * k, .26 * k, VC.park, s * .3 * k, .78 * k, 0, 0, 0, 0, .03); // cuisses
    vmBox(b, .2 * k, .7 * k, .22 * k, VC.blue, s * .3 * k, .32 * k, .05 * k, 0, 0, 0, .03); // tibias
    vmBox(b, .3 * k, .08 * k, .45 * k, VC.park, s * .3 * k, .04, .12 * k, 0, 0, 0, 0); // pieds
  }
  // Arme selon le type
  if (type === 'rifle'){ vmBox(b, .14, .14, .9, VC.park, .55, 1.6, .35, 0, 0, 0, .02); }
  else if (type === 'gunner'){ for (let i = 0; i < 4; i++) vmCyl(b, .045, .9, VC.blue, .58 + (i % 2) * .08, 1.55 + Math.floor(i / 2) * .08, .4, 0, 0, 0, 6); vmBox(b, .25, .25, .4, VC.oliveD, -.6, 1.55, 0, 0, 0, 0, .03); }
  else if (type === 'rocket'){ vmBox(b, .45, .4, .6, VC.olive, .62, 1.9, 0, 0, 0, 0, .04); for (let i = 0; i < 4; i++) vmCyl(b, .07, .05, VC.port, .52 + (i % 2) * .2, 1.82 + Math.floor(i / 2) * .16, .31, 0, 0, 0, 8); }
  else { vmCyl(b, .16, 1.6, ARS_C.whiteD, .95, 2.3, .55, 0, 0, 0, 10); for (let i = 0; i < 3; i++) vmRing(b, .2, .16, .06, ARS_C.cyan, .95, 2.3, .1 + i * .3, 0, 0, 0, 10); vmBox(b, .5, .6, .7, VC.blue, -.95, 2.3, 0, 0, 0, 0, .05); }
  return (RTS_GEO[type] = vmGeo(b));
}
let rtsNestGeo = null, rtsBaseGeo = null;
function rtsNestModel(){
  if (!rtsNestGeo){
    const b = vmNew(), flesh = 0x7a2e2e, green = [1, 2.6, .4], dark = 0x2b2b33;
    vmBox(b, 7, 6, 7, 0x4a4844, 0, 3, 0, 0, 0, 0, .2);                                          // bâtiment
    for (let i = 0; i < 6; i++) vmBox(b, 1.2, 1.4, .1, dark, -2.4 + (i % 3) * 2.4, 2 + Math.floor(i / 3) * 2.4, 3.52, 0, 0, 0, 0); // fenêtres brisées
    vmCyl(b, 2.6, 3, flesh, 0, 6.2, 0, Math.PI / 2, 0, 0, 10, .6);                              // excroissance de chair sur le toit
    for (let i = 0; i < 7; i++){ const a = i / 7 * 6.28; vmBox(b, .5, 2.6, .5, flesh, Math.cos(a) * 3.4, 1.3, Math.sin(a) * 3.4, Math.sin(a) * .4, 0, Math.cos(a) * .4, .1); } // tentacules
    for (let i = 0; i < 8; i++){ const a = i / 8 * 6.28; vmBox(b, .45, .45, .45, green, Math.cos(a) * 2, 7 + (i % 2) * .6, Math.sin(a) * 2, 0, 0, 0, .1); } // pustules lumineuses
    vmBox(b, 3, 2.2, .2, [2, .5, .2], 0, 1.1, 3.55, 0, 0, 0, 0);                                 // porte rougeoyante
    rtsNestGeo = vmGeo(b);
  }
  return new THREE.Mesh(rtsNestGeo, rtsMat);
}
function rtsBaseModel(){
  if (!rtsBaseGeo){
    const b = vmNew();
    vmBox(b, 12, 4, 6, 0x5a5d64, 0, 2, 0, 0, 0, 0, .2);
    vmBox(b, 4, 3, .2, 0x2b2b33, -3, 1.5, -3.05, 0, 0, 0, 0); vmBox(b, 4, 3, .2, 0x2b2b33, 3, 1.5, -3.05, 0, 0, 0, 0); // portes du garage
    vmBox(b, 12.2, .4, 6.2, [.6, 1.4, 3], 0, 4.1, 0, 0, 0, 0, 0);                                                   // bande bleue
    vmCyl(b, .12, 6, 0x9a9aa0, 4.5, 7, 1.5, Math.PI / 2, 0, 0, 6); vmBox(b, .5, .5, .5, [3, .4, .3], 4.5, 10, 1.5, 0, 0, 0, 0); // antenne
    vmBox(b, 2, 1.2, 2, 0x6a6a5a, -4, 4.6, 1.5, 0, 0, 0, .1);
    rtsBaseGeo = vmGeo(b);
  }
  return new THREE.Mesh(rtsBaseGeo, rtsMat);
}
function rtsHpBar(parent, y, w){
  const bg = new THREE.Sprite(rtsHpBg), fg = new THREE.Sprite(rtsHpG);
  bg.scale.set(w, .22 * (w / 1.6), 1); fg.scale.set(w, .16 * (w / 1.6), 1); bg.position.y = fg.position.y = y; fg.renderOrder = bg.renderOrder + 1;
  parent.add(bg); parent.add(fg); return { bg, fg, w };
}
function rtsHpSet(h, k){ k = clamp(k, 0, 1); h.fg.scale.x = h.w * k; h.fg.position.x = -h.w * (1 - k) / 2; h.fg.material = k < .35 ? rtsHpR : rtsHpG; }

/* ---------- Unités, nids, QG ---------- */
function rtsSpawnUnit(type, x, z){
  const U = RTS_UNITS[type], g = new THREE.Group(); g.position.set(x, 0, z); g.scale.setScalar(RTS_SC); rtsRoot.add(g); // un peu plus gros que nature : lisibles de haut
  const m = new THREE.Mesh(rtsUnitGeo(type), rtsMat); g.add(m);
  const ring = new THREE.Mesh(new THREE.RingGeometry(U.r * 1.3, U.r * 1.6, 20), rtsRingMat); ring.rotation.x = -Math.PI / 2; ring.position.y = .06; ring.visible = false; g.add(ring);
  const hp = rtsHpBar(g, type === 'heavy' ? 4.4 : 3, type === 'heavy' ? 2.2 : 1.6);
  const u = { type, U, g, m, ring, hpb:hp, hp:U.hp, maxHp:U.hp, tx:x, tz:z, cmd:'idle', nest:null, tgt:null, cd:rand(0, .5), scanT:0, step:0, dead:false };
  m.userData.rtsUnit = u;
  RTS.units.push(u); rtsHpSet(hp, 1);
  return u;
}
function rtsBuy(type){
  const U = RTS_UNITS[type]; if (!U || !RTS.on || state !== 'rts') return null;
  if (S.money < U.cost){ if (typeof toast === 'function') toast('Pas assez d’argent pour un ' + U.name + ' (' + fmt(U.cost) + ')'); return null; }
  if (RTS.units.filter(u => !u.dead).length >= RTS_CFG.maxUnits){ if (typeof toast === 'function') toast('Garage plein : ' + RTS_CFG.maxUnits + ' robots au plus'); return null; }
  S.money -= U.cost;
  const u = rtsSpawnUnit(type, rand(-4, 4), RTS_CFG.baseZ - 5);
  u.tx = u.g.position.x; u.tz = RTS_CFG.baseZ - 9; u.cmd = 'move';
  if (typeof Snd === 'object' && Snd.buy) Snd.buy();
  return u;
}
function rtsMakeNests(){
  const zs = [-55, -80, -105, -130, -155];
  zs.slice(0, RTS_CFG.nests).forEach((z, i) => {
    const x = (i % 2 ? 1 : -1) * 15.5, g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = x > 0 ? -Math.PI / 2 : Math.PI / 2; rtsRoot.add(g);
    const m = rtsNestModel(); g.add(m);
    const hp = rtsHpBar(g, 10.5, 6);
    const n = { g, m, hpb:hp, hp:RTS_CFG.nestHp * (1 + .35 * i), maxHp:RTS_CFG.nestHp * (1 + .35 * i), x, z, r:4.5, spawnT:rand(3, 6), dead:false, idx:i };
    m.userData.rtsNest = n; RTS.nests.push(n);
  });
}
function rtsMakeBase(){
  const g = new THREE.Group(); g.position.set(0, 0, RTS_CFG.baseZ + 3); rtsRoot.add(g);
  const m = rtsBaseModel(); g.add(m);
  const hp = rtsHpBar(g, 12, 8);
  RTS.base = { g, m, hpb:hp, hp:RTS_CFG.baseHp, maxHp:RTS_CFG.baseHp, x:0, z:RTS_CFG.baseZ, r:6 };
}

/* ---------- Démarrer, quitter ---------- */
function rtsHideBarricade(on){
  if (!world) return;
  world.children.forEach(o => { if (o.isGroup && o.children.length >= 6 && o.children.every(c => Math.abs(c.position.z - BAR_Z) < 1.4)) o.visible = !on; });
}
function rtsClearAll(){
  while (rtsRoot.children.length) rtsRoot.remove(rtsRoot.children[0]);
  RTS.units.length = 0; RTS.nests.length = 0; RTS.sel.length = 0; RTS.base = null;
}
function rtsStart(){
  if (typeof Snd === 'object') Snd.init();
  if (typeof infLeave === 'function') try { infLeave(); } catch (e) {}
  newGame();
  curLoc = LOCS[Math.floor(Math.random() * LOCS.length)];
  buildWorld(curLoc);
  try { if (typeof __amb === 'object') __amb.set(__amb.pick(curLoc, 2)); } catch (e) {}
  rtsHideBarricade(true); clearZombies(); rtsClearAll();
  S.money = RTS_CFG.money; S.wave = 1;
  Object.assign(RTS, { on:true, paused:false, t:0, kills:0, threat:1, hordeT:RTS_CFG.hordeEvery, hordeN:0, lost:0, ends:null, xp0:P.xp || 0, scr0:P.scrap || 0 });
  RTS.cam.x = 0; RTS.cam.z = -24; RTS.cam.h = isTouch ? 52 : 44;
  plan = { queue:[], total:0, hpMult:1, spdMult:1, dmgMult:1, cashMult:1.6, xp:1.5, maxAlive:isTouch ? 130 : 220, interval:1 };
  rtsMakeBase(); rtsMakeNests();
  for (let i = 0; i < 3; i++){ const u = rtsSpawnUnit('rifle', -3 + i * 3, RTS_CFG.baseZ - 8); u.tz = RTS_CFG.baseZ - 12; u.cmd = 'move'; }
  state = 'rts';
  showScreen(null); rtsPanel.classList.add('hide');
  $('hud').classList.add('hide'); $('touch').classList.add('hide'); $('cross').classList.add('hide');
  document.body.classList.add('rts');
  rtsUI.classList.remove('hide'); rtsUI.classList.toggle('touch', isTouch);
  if (typeof unlockPointer === 'function') unlockPointer();
  banner('Guerre des robots', 'Détruis les ' + RTS.nests.length + ' bâtiments infectés', 2600);
}
function rtsQuit(){
  RTS.on = false; RTS.paused = false;
  rtsUI.classList.add('hide'); rtsPanel.classList.add('hide'); rtsBox.style.display = 'none';
  document.body.classList.remove('rts');
  rtsClearAll(); clearZombies(); rtsHideBarricade(false);
  camera.position.copy(EYE); camera.rotation.set(0, 0, 0); camera.rotation.order = 'YXZ';
  state = 'menu'; curLoc = LOCS[0]; buildWorld(curLoc); newGame(); plan = wavePlan(1);
  if (typeof saveP === 'function') saveP();
  showScreen('scrTitle'); $('hud').classList.add('hide');
}
function rtsEnd(won){
  state = 'rtsover'; RTS.paused = false;
  const min = Math.floor(RTS.t / 60), sec = Math.floor(RTS.t % 60);
  if (won){
    P.scrap = (P.scrap || 0) + 300; addXP(200);
    if (!RTS.best || RTS.t < RTS.best){ RTS.best = Math.round(RTS.t); store.set('dt_rts_best', RTS.best); }
    if (typeof Snd === 'object' && Snd.musFanfare) Snd.musFanfare();
  } else if (typeof Snd === 'object' && Snd.boom) Snd.boom(2.2);
  if (typeof saveP === 'function') saveP();
  const xp = Math.max(0, Math.round((P.xp || 0) - RTS.xp0)), scr = Math.max(0, Math.round((P.scrap || 0) - RTS.scr0));
  setTimeout(() => rtsShowPanel('<h2 class="title sm">' + (won ? 'Ville libérée !' : 'Le QG est tombé') + '</h2><div class="stats">'
    + '<span>Bâtiments détruits : <strong>' + RTS.nests.filter(n => n.dead).length + ' / ' + RTS.nests.length + '</strong></span>'
    + '<span>Temps : <strong>' + min + ' min ' + String(sec).padStart(2, '0') + ' s</strong>' + (won && RTS.best ? ' · record : ' + Math.floor(RTS.best / 60) + ' min ' + String(RTS.best % 60).padStart(2, '0') + ' s' : '') + '</span>'
    + '<span>Zombies abattus : <strong>' + fmtN(RTS.kills) + '</strong> · Robots perdus : <strong>' + RTS.lost + '</strong></span>'
    + '<span>Expérience : <strong>+' + fmtN(xp) + '</strong> · Ferraille : <strong>+' + fmtN(scr) + ' ⚙</strong>' + (won ? ' (dont 300 de prime)' : '') + '</span></div>',
    [['Rejouer', rtsStart], ['Menu', rtsQuit]]), 1000);
}
function rtsPause(){
  if (state !== 'rts' || RTS.paused) return;
  RTS.paused = true;
  rtsShowPanel('<h2 class="title sm">Pause</h2><p class="lead">Menace ' + RTS.threat.toFixed(1).replace('.', ',') + ' · ' + fmtN(RTS.kills) + ' zombies abattus</p>',
    [['Reprendre', () => { RTS.paused = false; rtsPanel.classList.add('hide'); }], ['Abandonner', rtsQuit]]);
}

/* ---------- Chaque image ---------- */
const RTS_SPAWN = [['walker', 0], ['runner', 1.2], ['crawler', 1.4], ['spider', 2], ['bloater', 2.2], ['brute', 2.6], ['stalker', 3], ['shield', 3.4], ['spitter', 1.8], ['abomination', 4.2]];
function rtsPickType(){
  const ok = RTS_SPAWN.filter(e => RTS.threat >= e[1] && ZTYPES[e[0]]);
  return Math.random() < .45 ? 'walker' : ok[Math.floor(Math.random() * ok.length)][0];
}
function rtsSpawnAt(x, z, n){
  let alive = zAliveCount(), k = 0;
  for (let i = 0; i < n && alive < plan.maxAlive; i++){
    const t = rtsPickType(), zz = spawnZombie(t); if (!zz) continue;
    zz.g.position.set(clamp(x + rand(-3, 3), -16, 16), zz.g.position.y, z + rand(-2, 2)); zz.rtsT = 0; alive++; k++;
  }
  return k;
}
function rtsThreat(){
  const killed = RTS.nests.filter(n => n.dead).length;
  RTS.threat = 1 + RTS.kills / 140 + RTS.t / 150 + killed * .45;
  plan.hpMult = 1 + .55 * (RTS.threat - 1); plan.dmgMult = 1 + .4 * (RTS.threat - 1); plan.spdMult = Math.min(1.5, 1 + .05 * (RTS.threat - 1));
}
function rtsTargetOfZombie(z){
  const gp = z.g.position; let best = null, bd = 22 * 22;
  for (const u of RTS.units){ if (u.dead) continue; const dx = u.g.position.x - gp.x, dz = u.g.position.z - gp.z, d = dx * dx + dz * dz; if (d < bd){ bd = d; best = u; } }
  return best || RTS.base;
}
function rtsZombies(dt){
  for (let i = zombies.length - 1; i >= 0; i--){
    const z = zombies[i];
    if (z.flashT > 0) z.flashT -= dt;
    if (z.dead){ // même chute que 07-zombies.js
      z.deadT += dt; z.body.rotation.x = -Math.min(1, z.deadT / .45) * Math.PI / 2;
      if (z.deadT <= 1.6 && z.g.position.y > 0){ z.fallV = (z.fallV || 0) + 22 * dt; z.g.position.y = Math.max(0, z.g.position.y - z.fallV * dt); }
      if (z.deadT > 1.6) z.g.position.y -= dt * 1.2;
      if (z.deadT > 2.8){ disposeZombie(z); zombies.splice(i, 1); }
      continue;
    }
    z.rtsT = (z.rtsT || 0) - dt;
    if (z.rtsT <= 0 || !z.rtsTgt || z.rtsTgt.dead){ z.rtsT = rand(.3, .6); z.rtsTgt = rtsTargetOfZombie(z); }
    const T = z.rtsTgt; if (!T) continue;
    const gp = z.g.position, tx = T === RTS.base ? clamp(gp.x, -5, 5) : T.g.position.x, tz = T === RTS.base ? RTS.base.z - 3 : T.g.position.z;
    const dx = tx - gp.x, dz = tz - gp.z, d = Math.hypot(dx, dz), reach = (T.r || 1) * (T === RTS.base ? 1 : RTS_SC) + .9 * ((ZTYPES[z.type] || {}).scale || 1);
    const fly = z.type === 'flyer' || z.type === 'gargoyle' || z.type === 'crow' || z.type === 'behemoth';
    z.g.rotation.y = Math.atan2(dx, dz);
    z.phase += dt * Math.max(2, z.speed * 3);
    const s = Math.sin(z.phase);
    if (z.legL){ z.legL.rotation.x = s * .6; z.legR.rotation.x = -s * .6; }
    if (z.armL){ z.armL.rotation.x = -1.35 + s * .2; z.armR.rotation.x = -1.35 - s * .2; }
    const R = z.rig;
    if (R && R.legs) R.legs.forEach((l, k) => { l.rotation.x = Math.sin(z.phase + k * 1.3) * .5; });
    if (R && R.wing){ const a = Math.sin(z.phase * 2.5); R.wing[0].rotation.z = -a * .7; R.wing[1].rotation.z = a * .7; }
    if (fly) gp.y += ((z.alt || 5) * .6 - gp.y) * Math.min(1, dt * 2);
    if (d > reach){ const v = z.speed * dt / d; gp.x += dx * v; gp.z += dz * v; }
    else {
      z.atkT -= dt;
      if (z.atkT <= 0){
        z.atkT = rand(.9, 1.3);
        T.hp -= z.dmg; if (T.hpb) rtsHpSet(T.hpb, T.hp / T.maxHp);
        if (T.g){ rtsV.set(T.g.position.x, 1.2, T.g.position.z); burst(rtsV, 'wood', 2, 1.5); }
        if (T !== RTS.base && T.hp <= 0) rtsUnitDie(T);
      }
    }
    gp.x = clamp(gp.x, -17, 17);
  }
  zFrame++;
}
function rtsUnitDie(u){
  if (u.dead) return; u.dead = true; RTS.lost++;
  rtsV.set(u.g.position.x, 1.5, u.g.position.z);
  if (typeof rueBoom === 'function') rueBoom(rtsV.x, 1.6, rtsV.z, 7);
  burst(rtsV, 'dust', 12, 4); if (typeof Snd === 'object' && Snd.boom) Snd.boom(.6);
  rtsRoot.remove(u.g); const i = RTS.sel.indexOf(u); if (i >= 0) RTS.sel.splice(i, 1);
}
function rtsShotSnd(id){ if (RTS.sndT > 0 || typeof Snd !== 'object') return; RTS.sndT = .07; try { if (Snd.quiet !== undefined) Snd.quiet = true; Snd.shot(id); } finally { Snd.quiet = false; } }
function rtsFire(u, tgt, isNest){
  const U = u.U, from = rtsV.set(u.g.position.x, (u.type === 'heavy' ? 3.4 : 2.2) * RTS_SC, u.g.position.z);
  const to = isNest ? rtsV2.set(tgt.x, 3 + rand(-1, 2), tgt.z) : rtsV2.set(tgt.g.position.x, tgt.g.position.y + (tgt.aimY || 1.1), tgt.g.position.z);
  if (U.beam && typeof arsBeam === 'function') arsBeam(from, to, U.beam, U.pierce ? .12 : .04, U.pierce ? .12 : .05);
  rtsShotSnd(U.snd);
  if (isNest){
    tgt.hp -= U.dmg * (U.splash ? 1.6 : 1); rtsHpSet(tgt.hpb, tgt.hp / tgt.maxHp); burst(to, 'dust', 2, 2);
    if (U.splash && typeof rueBoom === 'function') rueBoom(to.x, to.y, to.z, 6);
    if (tgt.hp <= 0) rtsNestDie(tgt);
    return;
  }
  if (U.splash){
    for (const z of zombies){ if (z.dead) continue; const dx = z.g.position.x - to.x, dz = z.g.position.z - to.z, d = Math.hypot(dx, dz); if (d < U.splash) damage(z, U.dmg * (1 - .5 * d / U.splash), false, z.g.position.clone()); }
    if (typeof rueBoom === 'function') rueBoom(to.x, 1.2, to.z, U.splash * 2.4);
    if (typeof Snd === 'object' && Snd.boom && Math.random() < .5) Snd.boom(.4);
  } else if (U.pierce){ // rayon : tout ce qui est dans la ligne jusqu'à la cible
    const ax = from.x, az = from.z, bx = to.x - ax, bz = to.z - az, L2 = bx * bx + bz * bz;
    for (const z of zombies){
      if (z.dead) continue; const px = z.g.position.x - ax, pz = z.g.position.z - az, t = clamp((px * bx + pz * bz) / L2, 0, 1.4);
      const qx = px - bx * t, qz = pz - bz * t; if (qx * qx + qz * qz < 1.2) damage(z, U.dmg, false, z.g.position.clone());
    }
  } else damage(tgt, U.dmg, false, to.clone());
}
function rtsNestDie(n){
  if (n.dead) return; n.dead = true;
  const bounty = RTS_CFG.bounty + 250 * n.idx; S.money += bounty;
  rtsV.set(n.x, 4, n.z);
  if (typeof rueBoom === 'function'){ rueBoom(n.x, 4, n.z, 26); rueBoom(n.x, 8, n.z, 16); }
  burst(rtsV, 'dust', 30, 8); burst(rtsV, 'blood', 20, 6);
  if (typeof Snd === 'object' && Snd.boom) Snd.boom(2);
  shake = Math.max(shake, .6);
  n.g.scale.y = .25; n.g.position.y = -.5; n.hpb.bg.visible = n.hpb.fg.visible = false;  // ruines
  banner('Bâtiment infecté détruit !', '+' + fmt(bounty) + ' · ' + RTS.nests.filter(x => !x.dead).length + ' restant' + (RTS.nests.filter(x => !x.dead).length > 1 ? 's' : ''), 2200);
  if (RTS.nests.every(x => x.dead)) rtsEnd(true);
}
function rtsUnits(dt){
  for (const u of RTS.units){
    if (u.dead) continue;
    const gp = u.g.position, U = u.U;
    u.cd -= dt; u.scanT -= dt;
    // Cible : un nid commandé (dans la portée), sinon le zombie le plus proche
    let nest = u.nest && !u.nest.dead ? u.nest : null;
    if (u.scanT <= 0){
      u.scanT = rand(.2, .35); let best = null, bd = (U.range + (u.cmd === 'idle' ? 6 : 0)) ** 2;
      for (const z of zombies){ if (z.dead) continue; const dx = z.g.position.x - gp.x, dz = z.g.position.z - gp.z, d = dx * dx + dz * dz; if (d < bd){ bd = d; best = z; } }
      u.tgt = best;
      if (!nest && !best && u.cmd === 'idle') for (const n of RTS.nests){ if (!n.dead && Math.hypot(n.x - gp.x, n.z - gp.z) < U.range + n.r){ nest = n; break; } } // un nid tout près : on tire dessus
      u.autoNest = nest;
    }
    nest = nest || (u.autoNest && !u.autoNest.dead ? u.autoNest : null);
    // Déplacement : ordre de marche, approche d'un nid, ou approche d'un zombie repéré
    let tx = u.tx, tz = u.tz, go = u.cmd === 'move';
    if (u.nest && !u.nest.dead){ const dn = Math.hypot(u.nest.x - gp.x, u.nest.z - gp.z); if (dn > U.range + u.nest.r - 2){ tx = u.nest.x; tz = u.nest.z; go = true; } else go = false; }
    else if (u.cmd === 'idle' && u.tgt){ const dz = Math.hypot(u.tgt.g.position.x - gp.x, u.tgt.g.position.z - gp.z); if (dz > U.range){ tx = u.tgt.g.position.x; tz = u.tgt.g.position.z; go = true; } }
    if (go){
      const dx = tx - gp.x, dz = tz - gp.z, d = Math.hypot(dx, dz);
      if (d < .6){ if (u.cmd === 'move') u.cmd = 'idle'; }
      else { const v = Math.min(d, U.speed * dt); gp.x += dx / d * v; gp.z += dz / d * v; u.g.rotation.y = Math.atan2(dx, dz); u.step += dt * U.speed * 1.6; }
    }
    // Ne pas s'empiler
    for (const o of RTS.units){ if (o === u || o.dead) continue; const dx = gp.x - o.g.position.x, dz = gp.z - o.g.position.z, d = Math.hypot(dx, dz), m = (U.r + o.U.r) * RTS_SC; if (d > 0 && d < m){ gp.x += dx / d * (m - d) * .5; gp.z += dz / d * (m - d) * .5; } }
    gp.x = clamp(gp.x, -16, 16); gp.z = clamp(gp.z, -168, RTS_CFG.baseZ - 4);
    u.m.position.y = Math.abs(Math.sin(u.step * 2)) * .08; u.m.rotation.z = Math.sin(u.step) * .04;
    // Tir
    const tgt = u.tgt && !u.tgt.dead ? u.tgt : null;
    if (u.cd <= 0){
      if (tgt && Math.hypot(tgt.g.position.x - gp.x, tgt.g.position.z - gp.z) <= U.range){ u.cd = 1 / U.rate; u.g.rotation.y = Math.atan2(tgt.g.position.x - gp.x, tgt.g.position.z - gp.z); rtsFire(u, tgt, false); }
      else if (nest && Math.hypot(nest.x - gp.x, nest.z - gp.z) <= U.range + nest.r){ u.cd = 1 / U.rate; u.g.rotation.y = Math.atan2(nest.x - gp.x, nest.z - gp.z); rtsFire(u, nest, true); }
    }
    u.ring.visible = RTS.sel.indexOf(u) >= 0;
  }
}
function rtsStep(dt){
  if (!RTS.on || RTS.paused || state !== 'rts') return;
  RTS.t += dt; RTS.sndT -= dt;
  rtsThreat();
  // Les nids font sortir des zombies, de plus en plus
  for (const n of RTS.nests){
    if (n.dead) continue;
    n.spawnT -= dt;
    if (n.spawnT <= 0){ n.spawnT = Math.max(2.2, rand(6, 9) / Math.sqrt(RTS.threat)); rtsSpawnAt(n.x * .7, n.z, 1 + Math.floor(RTS.threat * .8)); }
    n.m.scale.setScalar(1 + Math.sin(RTS.t * 2.2 + n.idx) * .015); // il respire
  }
  // Hordes du bout de la rue
  RTS.hordeT -= dt;
  if (RTS.hordeT <= 0){ RTS.hordeT = RTS_CFG.hordeEvery; RTS.hordeN++; const n = rtsSpawnAt(0, -170, 10 + Math.round(RTS.threat * 5)); banner('Horde n° ' + RTS.hordeN + ' !', n + ' zombies arrivent du bout de la rue', 2000); if (typeof Snd === 'object' && Snd.groan) Snd.groan(); }
  rtsUnits(dt);
  rtsZombies(dt);
  if (RTS.base){ rtsHpSet(RTS.base.hpb, RTS.base.hp / RTS.base.maxHp); if (RTS.base.hp <= 0 && state === 'rts') rtsEnd(false); }
  groanT -= dt; if (groanT <= 0){ groanT = rand(1.5, 3.5); if (zAliveCount() > 0 && typeof Snd === 'object') Snd.groan(); }
}
function rtsCamStep(dt){
  const C = RTS.cam, k = RTS.keys, sp = C.h * .9 * dt;
  C.x += ((k.r ? 1 : 0) - (k.l ? 1 : 0)) * sp; C.z += ((k.b ? 1 : 0) - (k.f ? 1 : 0)) * sp;
  C.x = clamp(C.x, -12, 12); C.z = clamp(C.z, -165, 8); C.h = clamp(C.h, 22, 80);
  camera.position.set(C.x, C.h, C.z + C.h * .38); // vue presque d'aplomb : les immeubles ne cachent pas la rue
  camera.lookAt(C.x, 0, C.z);
}
function rtsFrame(dt){
  if (!RTS.on) return;
  if (state === 'rts' || state === 'rtsover') rtsCamStep(dt);
  Object.keys(VMS).forEach(k => { VMS[k].visible = false; });
  rtsHUD();
}

/* ---------- Affichage ---------- */
const rtsUI = document.createElement('div'); rtsUI.id = 'rtsUI'; rtsUI.className = 'hide';
rtsUI.innerHTML = '<div id="rtTop"><span id="rtMoney"></span><span id="rtThreat"></span><span id="rtNests"></span><span id="rtSel"></span></div>'
  + '<div id="rtBase"><span>QG</span><div class="mk-bar"><i id="rtBaseFill"></i></div></div>'
  + '<button id="rtPause" type="button" aria-label="Pause">❚❚</button>'
  + '<div id="rtBar">' + RTS_ORDER.map((t, i) => '<button type="button" class="rt-buy" data-t="' + t + '">' + RTS_UNITS[t].name + '<b>' + fmt(RTS_UNITS[t].cost) + '</b>' + (isTouch ? '' : '<i>' + (i + 1) + '</i>') + '</button>').join('')
  + '<button type="button" id="rtAll">Tout sélectionner</button><button type="button" id="rtStop">Arrêt</button></div>';
document.body.appendChild(rtsUI);
const rtsPanel = document.createElement('div'); rtsPanel.id = 'rtsPanel'; rtsPanel.className = 'hide'; document.body.appendChild(rtsPanel);
const rtsBox = document.createElement('div'); rtsBox.id = 'rtsBox'; document.body.appendChild(rtsBox);
function rtsShowPanel(html, btns){
  rtsPanel.innerHTML = '<div class="panel">' + html + '<div class="mk-btns">' + btns.map((b, i) => '<button class="' + (i ? 'ghost' : 'big') + '" data-i="' + i + '" type="button">' + b[0] + '</button>').join('') + '</div></div>';
  rtsPanel.querySelectorAll('button[data-i]').forEach(el => el.addEventListener('click', () => { const f = btns[+el.dataset.i][1]; if (f) f(); }));
  rtsPanel.classList.remove('hide');
}
function rtsHUD(){
  if (!RTS.on || !S) return;
  const set = (id, t) => { const el = $(id); if (el && el.textContent !== t) el.textContent = t; };
  const left = RTS.nests.filter(n => !n.dead).length, alive = RTS.units.filter(u => !u.dead).length;
  set('rtMoney', '💰 ' + fmt(Math.floor(S.money)));
  set('rtThreat', '☣ Menace ' + RTS.threat.toFixed(1).replace('.', ','));
  set('rtNests', '🏚 Nids : ' + left + ' / ' + RTS.nests.length);
  set('rtSel', '🤖 ' + alive + (RTS.sel.length ? ' (' + RTS.sel.length + ' choisi' + (RTS.sel.length > 1 ? 's' : '') + ')' : ''));
  const f = $('rtBaseFill'); if (f && RTS.base) f.style.width = (clamp(RTS.base.hp / RTS.base.maxHp, 0, 1) * 100).toFixed(1) + '%';
  rtsUI.querySelectorAll('.rt-buy').forEach(b => { const off = S.money < RTS_UNITS[b.dataset.t].cost; if (b.classList.contains('off') !== off) b.classList.toggle('off', off); });
}

/* ---------- Commandes ---------- */
function rtsNdc(cx, cy){ return new THREE.Vector2(cx / innerWidth * 2 - 1, -(cy / innerHeight) * 2 + 1); }
// Ce qu'il y a sous le doigt ou la souris : un robot, un nid, ou un point du sol
function rtsPick(cx, cy){
  camera.updateMatrixWorld(); rtsRoot.updateMatrixWorld(true); rtsRay.setFromCamera(rtsNdc(cx, cy), camera);
  const meshes = []; RTS.units.forEach(u => { if (!u.dead) meshes.push(u.m); }); RTS.nests.forEach(n => { if (!n.dead) meshes.push(n.m); });
  const h = rtsRay.intersectObjects(meshes, false)[0];
  if (h && h.object.userData.rtsUnit) return { unit:h.object.userData.rtsUnit };
  if (h && h.object.userData.rtsNest) return { nest:h.object.userData.rtsNest };
  const o = rtsRay.ray.origin, d = rtsRay.ray.direction; if (d.y >= -1e-4) return {};
  const t = -o.y / d.y; return { x:o.x + d.x * t, z:o.z + d.z * t };
}
function rtsSelect(list, add){
  if (!add) RTS.sel.length = 0;
  list.forEach(u => { if (!u.dead && RTS.sel.indexOf(u) < 0) RTS.sel.push(u); });
  if (list.length && typeof Snd === 'object' && Snd.tone) Snd.tone(900, .05, 'square', .04, 1200);
}
function rtsOrder(p){
  if (!RTS.sel.length) return false;
  if (p.nest){ RTS.sel.forEach(u => { u.nest = p.nest; u.cmd = 'attack'; }); if (typeof toast === 'function') toast('Attaque du bâtiment infecté !'); }
  else if (p.x != null){
    const n = RTS.sel.length, cols = Math.ceil(Math.sqrt(n));
    RTS.sel.forEach((u, i) => { u.nest = null; u.cmd = 'move'; u.tx = clamp(p.x + ((i % cols) - (cols - 1) / 2) * 2.2, -16, 16); u.tz = clamp(p.z + (Math.floor(i / cols) - (cols - 1) / 2) * 2.2, -168, RTS_CFG.baseZ - 4); });
    rtsMarker(p.x, p.z);
  } else return false;
  if (typeof Snd === 'object' && Snd.tone) Snd.tone(600, .06, 'triangle', .05, 800);
  return true;
}
const rtsMark = new THREE.Mesh(new THREE.RingGeometry(.8, 1.2, 24), new THREE.MeshBasicMaterial({ color:0x9aff70, transparent:true, opacity:.9, depthWrite:false, side:THREE.DoubleSide }));
rtsMark.rotation.x = -Math.PI / 2; rtsMark.visible = false; scene.add(rtsMark);
let rtsMarkT = 0;
function rtsMarker(x, z){ rtsMark.position.set(x, .08, z); rtsMark.visible = true; rtsMarkT = .6; }
function rtsBoxSelect(x0, y0, x1, y1, add){
  const a = Math.min(x0, x1), b = Math.max(x0, x1), c = Math.min(y0, y1), d = Math.max(y0, y1), list = [];
  RTS.units.forEach(u => { if (u.dead) return; rtsV.copy(u.g.position).project(camera); const sx = (rtsV.x + 1) / 2 * innerWidth, sy = (1 - rtsV.y) / 2 * innerHeight; if (sx >= a && sx <= b && sy >= c && sy <= d) list.push(u); });
  rtsSelect(list, add);
}
// Souris
canvas.addEventListener('pointerdown', e => {
  if (state !== 'rts' || RTS.paused || e.pointerType === 'touch') return;
  if (typeof Snd === 'object') Snd.init();
  if (e.button === 2){ rtsOrder(rtsPick(e.clientX, e.clientY)); return; }
  if (e.button === 0) RTS.drag = { x:e.clientX, y:e.clientY, add:e.shiftKey, box:false };
});
document.addEventListener('pointermove', e => {
  if (state !== 'rts' || !RTS.drag || e.pointerType === 'touch') return;
  const D = RTS.drag; if (Math.hypot(e.clientX - D.x, e.clientY - D.y) > 8) D.box = true;
  if (D.box){ const s = rtsBox.style; s.display = 'block'; s.left = Math.min(D.x, e.clientX) + 'px'; s.top = Math.min(D.y, e.clientY) + 'px'; s.width = Math.abs(e.clientX - D.x) + 'px'; s.height = Math.abs(e.clientY - D.y) + 'px'; }
});
document.addEventListener('pointerup', e => {
  if (state !== 'rts' || !RTS.drag || e.pointerType === 'touch') return;
  const D = RTS.drag; RTS.drag = null; rtsBox.style.display = 'none';
  if (D.box) rtsBoxSelect(D.x, D.y, e.clientX, e.clientY, D.add);
  else { const p = rtsPick(e.clientX, e.clientY); if (p.unit) rtsSelect([p.unit], D.add); else if (!D.add) RTS.sel.length = 0; }
});
document.addEventListener('wheel', e => { if (state === 'rts') RTS.cam.h = clamp(RTS.cam.h + e.deltaY * .04, 22, 80); }, { passive:true });
const RTS_KEYS = { KeyW:'f', KeyZ:'f', ArrowUp:'f', KeyS:'b', ArrowDown:'b', KeyA:'l', KeyQ:'l', ArrowLeft:'l', KeyD:'r', ArrowRight:'r' };
document.addEventListener('keydown', e => {
  if (state !== 'rts') return;
  if (RTS_KEYS[e.code]){ RTS.keys[RTS_KEYS[e.code]] = 1; e.preventDefault(); }
  else if (/^Digit[1-4]$/.test(e.code)) rtsBuy(RTS_ORDER[+e.code.slice(-1) - 1]);
  else if (e.code === 'Space'){ rtsSelect(RTS.units.filter(u => !u.dead), false); e.preventDefault(); }
  else if (e.code === 'Escape' || e.code === 'KeyP'){ if (RTS.paused){ RTS.paused = false; rtsPanel.classList.add('hide'); } else rtsPause(); }
});
document.addEventListener('keyup', e => { if (RTS_KEYS[e.code]) RTS.keys[RTS_KEYS[e.code]] = 0; });
// Tactile : toucher pour choisir et envoyer, glisser pour déplacer la vue, pincer pour zoomer
(function(){
  const pts = new Map(); let tap = null;
  canvas.addEventListener('touchstart', e => {
    if (state !== 'rts' || RTS.paused) return;
    e.preventDefault(); if (typeof Snd === 'object') Snd.init();
    for (const t of e.changedTouches) pts.set(t.identifier, { x:t.clientX, y:t.clientY });
    if (pts.size === 1){ const t = e.changedTouches[0]; tap = { x:t.clientX, y:t.clientY, moved:false, t:performance.now() }; }
    else { tap = null; const a = [...pts.values()]; RTS.pinch = { d:Math.hypot(a[0].x - a[1].x, a[0].y - a[1].y), h:RTS.cam.h }; }
  }, { passive:false });
  canvas.addEventListener('touchmove', e => {
    if (state !== 'rts') return;
    e.preventDefault();
    for (const t of e.changedTouches){
      const p = pts.get(t.identifier); if (!p) continue;
      if (pts.size === 1){
        const dx = t.clientX - p.x, dy = t.clientY - p.y;
        if (tap && Math.hypot(t.clientX - tap.x, t.clientY - tap.y) > 12) tap.moved = true;
        if (!tap || tap.moved){ const k = RTS.cam.h / innerHeight * 1.4; RTS.cam.x -= dx * k; RTS.cam.z -= dy * k; }
      }
      p.x = t.clientX; p.y = t.clientY;
    }
    if (pts.size >= 2 && RTS.pinch){ const a = [...pts.values()]; const d = Math.hypot(a[0].x - a[1].x, a[0].y - a[1].y); RTS.cam.h = clamp(RTS.pinch.h * RTS.pinch.d / Math.max(20, d), 22, 80); }
  }, { passive:false });
  const end = e => {
    if (state !== 'rts') return;
    for (const t of e.changedTouches) pts.delete(t.identifier);
    if (pts.size < 2) RTS.pinch = null;
    if (tap && !tap.moved && pts.size === 0 && e.changedTouches.length){
      const t = e.changedTouches[0], p = rtsPick(t.clientX, t.clientY);
      if (p.unit){ const i = RTS.sel.indexOf(p.unit); if (i >= 0) RTS.sel.splice(i, 1); else rtsSelect([p.unit], true); } // toucher un robot : il entre ou sort de la sélection
      else rtsOrder(p);
    }
    if (pts.size === 0) tap = null;
  };
  canvas.addEventListener('touchend', end); canvas.addEventListener('touchcancel', end);
})();
// Boutons
rtsUI.querySelectorAll('.rt-buy').forEach(b => b.addEventListener('click', () => rtsBuy(b.dataset.t)));
$('rtAll').addEventListener('click', () => rtsSelect(RTS.units.filter(u => !u.dead), false));
$('rtStop').addEventListener('click', () => { RTS.sel.forEach(u => { u.cmd = 'idle'; u.nest = null; u.tx = u.g.position.x; u.tz = u.g.position.z; }); });
$('rtPause').addEventListener('click', () => rtsPause());
(function(){
  const ref = $('btnMech') || $('btnStart');
  if (ref && ref.parentNode && !$('btnRts')){
    const b = document.createElement('button'); b.className = 'ghost rts-btn'; b.id = 'btnRts'; b.type = 'button'; b.textContent = '⚔ Guerre des robots (stratégie)';
    ref.parentNode.insertBefore(b, ref.nextSibling);
    b.addEventListener('click', () => rtsStart());
  }
})();

/* ---------- Crochets ---------- */
try {
  const _b = visuals;
  visuals = function(dt){
    if (state === 'rts') rtsStep(dt);
    const r = _b.apply(this, arguments);
    rtsFrame(dt);
    if (rtsMarkT > 0){ rtsMarkT -= dt; rtsMark.material.opacity = rtsMarkT / .6; if (rtsMarkT <= 0) rtsMark.visible = false; }
    return r;
  };
} catch (e) {}
try { const _k = kill; kill = function(){ const r = _k.apply(this, arguments); if (RTS.on) RTS.kills++; return r; }; } catch (e) {}
try { if (typeof ambMusicState === 'function'){ const _a = ambMusicState; ambMusicState = function(){ if (state === 'rts') return RTS.threat > 3.5 ? 'boss' : 'wave'; if (state === 'rtsover') return 'menu'; return _a.apply(this, arguments); }; } } catch (e) {}

// Accès pour les tests automatiques
window.__rts = { RTS, RTS_UNITS, RTS_CFG, rtsStart, rtsQuit, rtsBuy, rtsStep, rtsSelect, rtsOrder, rtsPick, rtsSpawnUnit, rtsSpawnAt, rtsNestDie, rtsEnd, rtsPause };
