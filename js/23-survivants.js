'use strict';
/* Vie de la rue, suite de js/23-rue.js : survivants (poursuivants à abattre, tireurs sur le toit, revenu) */
/* ---------- Survivants : poursuivants à abattre, puis il reste avec toi et rapporte de l'argent ---------- */
// Quand un survivant apparaît, 2 ou 3 zombies le poursuivent, un peu plus lents que lui au départ.
// Il est invincible (ni agrippé à mort, ni rattrapé) tant qu'il n'a pas fait les trois quarts du trajet
// entre son point d'apparition et la barricade. Rendu là : si un poursuivant vit encore, il l'attrape ;
// sinon il est sauvé et reste sur le toit pour le reste de la partie. Un tir du joueur le tue toujours (pénalité).
// Chaque survivant sur le toit rapporte SURV_CFG.income $ par minute (versé à la minute) et tire sur les zombies.
const SURV_CFG = { chasers:[2, 3], mark:.75, spd0:.78, spd1:.94, income:10, period:60, maxShown:8 };
const SURV = { chasers:[], chasing:false, roof:[], payT:0 };
function survHUDEl(id){ return document.getElementById(id); }
// Mètres qui restent avant le point des trois quarts
function survLeft(){
  const v = RUE.civ; if (!v || v.z0 == null) return 0;
  return Math.max(0, v.z0 + (RUE_CFG.civSaveZ - v.z0) * SURV_CFG.mark - v.z);
}
function survChaseHUD(){
  const el = survHUDEl('chaseH'); if (!el) return;
  if (!SURV.chasing){ el.classList.add('hide'); return; }
  const left = SURV.chasers.filter(z => !z.dead).length, m = survLeft();
  el.classList.remove('hide'); el.classList.toggle('urgent', m < 12);
  const txt = 'Abats ses poursuivants : ' + left + ' restant' + (left > 1 ? 's' : '') + '<b>' + Math.ceil(m) + ' m</b>';
  if (el.innerHTML !== txt) el.innerHTML = txt;
}
function survIncomeTxt(){
  const n = (S && S.survivors) || 0, el = survHUDEl('survH'); if (!el) return;
  if (!n){ el.classList.add('hide'); return; }
  el.classList.remove('hide');
  const txt = '👥 ' + n + ' survivant' + (n > 1 ? 's' : '') + ' · +' + fmt(n * SURV_CFG.income) + '/min';
  if (el.textContent !== txt) el.textContent = txt;
}
// Tireurs sur le toit : chaque survivant sauvé se poste sur le rebord, de part et d'autre de toi, et tire sur les zombies.
// Au-delà de SURV_CFG.maxShown, les survivants en plus renforcent les tirs des tireurs visibles.
// Chaque tireur vaut 30 % d'un tireur d'élite de base (24-compagnon.js) : même cadence (un tir aux 2,5 s), 30 % de ses dégâts,
// sans tir à la tête. Valeurs de secours si le compagnon n'est pas chargé.
const SURV_GUN = { part:.3, rate:2.5, dmg:33, range:-75, spread:.4 }; // part du tireur d'élite, s entre deux tirs, dégâts (× force de la vague), portée (z), écart du rythme
function survGunSync(){
  try { if (typeof cpnStats === 'function'){ const c = cpnStats('sniper', {}); if (c && c.rate > 0){ SURV_GUN.rate = 1 / c.rate; SURV_GUN.dmg = c.dmg * SURV_GUN.part; } } } catch (e) { errNote(e); }
}
const SURV_X = [4.2, -5.6, 6.4, -7.6, 8.6, -9.6, 10.6, -11.6];
const survRoofMat = [lam(0xd8d0b8), lam(0x6a8ab0), lam(0x3a3a44), lam(0xc8a080), lam(0x2a2826)];
const survRoot = new THREE.Group(); scene.add(survRoot);
const survFlashMat = new THREE.SpriteMaterial({ map:glowTex, color:0xffc070, blending:THREE.AdditiveBlending, depthWrite:false, transparent:true, fog:false });
function survFigure(i){
  const g = new THREE.Group();
  const body = new THREE.Group(); g.add(body);
  const shirt = new THREE.Mesh(RUEG.box, survRoofMat[i % 2 ? 1 : 0]); shirt.scale.set(.5, .7, .3); shirt.position.y = 1.25;
  const legs = new THREE.Mesh(RUEG.box, survRoofMat[2]); legs.scale.set(.42, .85, .26); legs.position.y = .45;
  const head = new THREE.Mesh(RUEG.box, survRoofMat[3]); head.scale.set(.32, .34, .32); head.position.y = 1.8;
  body.add(shirt, legs, head);
  // Bras tendus et fusil vers l'avant (-z)
  const gun = new THREE.Group(); gun.position.set(.12, 1.42, -.1); body.add(gun);
  const arms = new THREE.Mesh(RUEG.box, survRoofMat[i % 2 ? 1 : 0]); arms.scale.set(.42, .12, .4); arms.position.set(-.1, -.05, -.18); gun.add(arms);
  const barrel = new THREE.Mesh(RUEG.box, survRoofMat[4]); barrel.scale.set(.07, .09, .8); barrel.position.set(0, .04, -.45); gun.add(barrel);
  const flash = new THREE.Sprite(survFlashMat); flash.position.set(0, .04, -.92); flash.scale.set(.55, .55, 1); flash.visible = false; gun.add(flash);
  g.position.set(SURV_X[i % SURV_X.length], 8.6, -3.25);
  g.userData = { cd:rand(.3, SURV_GUN.rate), flashT:0, rec:0, body, gun, flash, yaw:0 };
  survRoot.add(g); return g;
}
const SURV_A = new THREE.Vector3(), SURV_B = new THREE.Vector3();
// Cible : un des zombies les plus proches de la barricade (au hasard parmi les 3 premiers, pour répartir les tirs)
function survTarget(){
  let a = null, b = null, c = null;
  for (const z of zombies){
    if (z.dead || z.hp <= 0 || z.g.position.z < SURV_GUN.range) continue;
    if (!a || z.g.position.z > a.g.position.z){ c = b; b = a; a = z; }
    else if (!b || z.g.position.z > b.g.position.z){ c = b; b = z; }
    else if (!c || z.g.position.z > c.g.position.z) c = z;
  }
  const l = [a, b, c].filter(Boolean); return l.length ? l[Math.floor(Math.random() * l.length)] : null;
}
let survShots = 0;
function survShoot(dt){
  const n = (S && S.survivors) || 0; if (!n || !SURV.roof.length) return;
  if (!SURV_GUN.synced){ survGunSync(); SURV_GUN.synced = true; }
  const shown = Math.min(n, SURV_CFG.maxShown), boost = n / shown; // survivants en plus : tirs renforcés
  for (let i = 0; i < shown && i < SURV.roof.length; i++){
    const g = SURV.roof[i], u = g.userData;
    if (u.flashT > 0){ u.flashT -= dt; if (u.flashT <= 0) u.flash.visible = false; }
    if (u.rec > 0){ u.rec = Math.max(0, u.rec - dt * 4); u.gun.position.z = -.1 + u.rec * .12; }
    u.cd -= dt; if (u.cd > 0) continue;
    const z = survTarget(); if (!z){ u.cd = .3; continue; }
    u.cd = SURV_GUN.rate * rand(1 - SURV_GUN.spread / 2, 1 + SURV_GUN.spread / 2);
    const ZT = ZTYPES[z.type] || {};
    SURV_B.set(z.g.position.x, z.g.position.y + (z.aimY != null ? z.aimY : 1.1 * (ZT.scale || 1)), z.g.position.z);
    const dx = SURV_B.x - g.position.x, dz = SURV_B.z - g.position.z;
    u.yaw = Math.atan2(-dx, -dz); g.rotation.y = u.yaw;
    u.gun.rotation.x = Math.atan2(SURV_B.y - (g.position.y + 1.42), Math.sqrt(dx * dx + dz * dz));
    g.updateMatrixWorld(true); u.flash.getWorldPosition(SURV_A);
    u.flash.visible = true; u.flashT = .06; u.rec = 1;
    if (typeof cpnTracer === 'function') cpnTracer(SURV_A, SURV_B, .04, .06);
    damage(z, SURV_GUN.dmg * ruePower() * boost, false, SURV_B.clone());
    survShots++;
    if (typeof Snd === 'object' && Snd.burst && Math.random() < .6) Snd.burst(rand(1800, 2600), .06, .07);
  }
}
function survRoofSync(){
  const n = Math.min(SURV_CFG.maxShown, (S && S.survivors) || 0);
  while (SURV.roof.length < n) SURV.roof.push(survFigure(SURV.roof.length));
  SURV.roof.forEach((g, i) => { g.visible = i < n; });
}
function survClearChase(){ SURV.chasers.length = 0; SURV.chasing = false; survChaseHUD(); }

const _survSpawnCiv = rueSpawnCiv;
rueSpawnCiv = function(x, z){
  const v = _survSpawnCiv.apply(this, arguments);
  if (!v || typeof spawnZombie !== 'function') return v;
  survClearChase();
  const n = SURV_CFG.chasers[0] + Math.floor(Math.random() * (SURV_CFG.chasers[1] - SURV_CFG.chasers[0] + 1));
  for (let i = 0; i < n; i++){
    const before = zombies.length;
    spawnZombie(Math.random() < .5 ? 'runner' : 'walker');
    const c = zombies[zombies.length - 1]; if (zombies.length === before || !c) continue;
    c.chaser = true;
    c.g.position.set(clamp(v.x + rand(-1.5, 1.5), -12, 12), c.g.position.y, v.z - 4 - i * 1.8);
    c.speed = RUE_CFG.civSpeed * SURV_CFG.spd0; // plus lents au départ : ils restent derrière lui
    if (c.g.updateMatrixWorld) c.g.updateMatrixWorld(true);
    SURV.chasers.push(c);
  }
  SURV.chasing = SURV.chasers.length > 0; v.safe = false;
  survChaseHUD();
  return v;
};
const _survCivStep = rueCivStep;
rueCivStep = function(dt){
  const v = RUE.civ;
  let shield = false;
  if (v && v.live && v.st === 'run' && !v.safe){
    const prog = rueCivProgress(v), k = clamp(prog / SURV_CFG.mark, 0, 1);
    if (SURV.chasing){
      // Les poursuivants suivent sa ligne et reprennent un peu de vitesse, sans jamais le dépasser
      SURV.chasers.forEach(c => {
        if (c.dead || c.st !== 'walk') return;
        c.g.position.x += clamp(v.x - c.g.position.x, -1, 1) * dt * 2;
        c.speed = RUE_CFG.civSpeed * (SURV_CFG.spd0 + (SURV_CFG.spd1 - SURV_CFG.spd0) * k);
        if (c.g.position.z > v.z - 1.2) c.g.position.z = v.z - 1.2;
      });
      if (SURV.chasers.every(c => c.dead)){
        SURV.chasing = false; v.safe = true;
        RUE_V.set(v.x, 2.6, v.z); rueFloat('Survivant hors de danger !', RUE_V, '#9aff70', true);
        if (typeof Snd === 'object' && Snd.tone) Snd.tone(880, .15, 'triangle', .12, 1320);
      }
    } else if (!v.safe) v.safe = true; // personne ne le poursuit
    if (!v.safe){
      if (prog >= SURV_CFG.mark){
        // Rendu aux trois quarts avec un poursuivant encore debout : il est rattrapé
        let best = null, bd = 1e9;
        SURV.chasers.forEach(c => { if (c.dead) return; const d = Math.abs(c.g.position.z - v.z); if (d < bd){ bd = d; best = c; } });
        if (best && best.st === 'walk'){ best.g.position.set(v.x + .4, best.g.position.y, v.z - .7); if (best.g.updateMatrixWorld) best.g.updateMatrixWorld(true); }
        SURV.chasing = false; survChaseHUD(); rueCivCaught(); return;
      }
      shield = true; // avant les trois quarts : invincible
    }
    survChaseHUD();
  }
  // Invincible avant les trois quarts, ou hors de danger : les zombies ne peuvent pas le tuer en l'agrippant
  if (v && v.live && v.st === 'run' && (v.safe || shield)){ v.grab = 0; const g0 = RUE_CFG.civGrab; RUE_CFG.civGrab = Infinity; try { return _survCivStep.apply(this, arguments); } finally { RUE_CFG.civGrab = g0; } }
  return _survCivStep.apply(this, arguments);
};
const _survCivEnd = rueCivEnd;
rueCivEnd = function(st){ const r = _survCivEnd.apply(this, arguments); if (st !== 'run') survClearChase(); return r; };
const _survSaved = rueCivSaved;
rueCivSaved = function(){
  const r = _survSaved.apply(this, arguments);
  if (S){ S.survivors = (S.survivors || 0) + 1; survRoofSync(); survIncomeTxt();
    setTimeout(() => toast('Il reste avec toi : +' + fmt(SURV_CFG.income) + ' par minute pour le reste de la partie'), 2300); }
  return r;
};
// Revenu passif : versé chaque minute de jeu
try { const _b = update; update = function(dt){ const r = _b.apply(this, arguments);
  if (state === 'playing' && S && S.survivors > 0){
    SURV.payT += dt;
    if (SURV.payT >= SURV_CFG.period){ SURV.payT -= SURV_CFG.period; const pay = S.survivors * SURV_CFG.income; S.money += pay; S.earned += pay;
      RUE_V.set(0, 9.6, -6); rueFloat('Survivants +' + fmt(pay), RUE_V, '#9aff70', false); }
  }
  if (state === 'playing') survShoot(dt);
  return r; }; } catch (e) { errNote(e); }
try { const _b = updateHUD; updateHUD = function(){ const r = _b.apply(this, arguments); survIncomeTxt(); return r; }; } catch (e) { errNote(e); }
try { const _b = newGame; newGame = function(){ const r = _b.apply(this, arguments); if (S) S.survivors = 0; SURV.payT = 0; survClearChase(); survRoofSync(); survIncomeTxt(); return r; }; } catch (e) { errNote(e); }
const _survClear = rueClear;
rueClear = function(){ const r = _survClear.apply(this, arguments); survClearChase(); return r; };
window.__surv = { SURV, SURV_CFG, SURV_GUN, survRoofSync, survLeft, survShoot, get shots(){ return survShots; } };
