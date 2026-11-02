'use strict';
/* ================= Vie de la rue : barils explosifs, caisses larguées, civils à sauver ================= */
// Tout est dans rueRoot (ajouté à la scène, hors de « world ») : disposeWorld() n'y touche jamais.
// Pools créés une fois (géométries et matériaux partagés), seulement cachés ensuite : aucune fuite.
// Objets tirables : maillages ajoutés à hitMeshes avec userData.onHit(point, dmg) et SANS userData.z.
// fire() (08-tir.js), les carreaux et les roquettes (20-armes.js) appellent onHit.
// Les zombies sont blessés seulement par damage(z, ...) : armure du boss et autres crochets s'appliquent.
// Le civil n'est PAS dans zombies : défenses et pouvoirs ne le visent jamais.
// Règle des explosions : une explosion causée par le joueur (baril qu'il a fait sauter, roquette, grenade,
// frappe aérienne) tue le civil dans son rayon, avec la même pénalité qu'un tir. Les éclats des défenses
// automatiques (mortier, missiles, ogive) ne le blessent pas : elles ne sont pas sous ton contrôle.
// Crochets posés par réaffectation (comme 19-boss.js et 21-pouvoirs.js).

const RUE_CFG = {
  barRadius: 6,        // rayon de l'explosion d'un baril (m)
  barDmg: 320,         // dégâts au centre (multipliés par la force de la vague, la moitié au bord)
  barTop: 11,          // les volants jusqu'à cette hauteur sont touchés (distance verticale comptée à moitié)
  chainDelay: .18,     // délai avant qu'un baril voisin saute à son tour
  crateFall: 2.4,      // vitesse de descente de la caisse (m/s)
  crateGround: 6,      // secondes au sol avant de disparaître
  furyT: 15,           // rage de tir : durée
  furyMult: 2,         // rage de tir : dégâts
  repair: .25,         // réparation de la barricade (part du maximum)
  civSpeed: 4.8,       // vitesse du civil (m/s)
  civChance: .4,       // chance qu'un civil apparaisse pendant une vague
  civGrab: .6,         // secondes agrippé par les zombies avant d'y passer
  civSaveZ: BAR_Z - 3  // il franchit la barricade ici
};
const RUE = { barrels:[], crates:[], fires:[], booms:[], civ:null, t:0, crateAt:[], civAt:-1, furyT:0, active:false, nfxPrev:-1, shot:false, force:null, last:null };
const rueRoot = new THREE.Group(); scene.add(rueRoot);
const RUEG = { box:new THREE.BoxGeometry(1, 1, 1), cyl:new THREE.CylinderGeometry(.42, .42, 1.15, 12), band:new THREE.CylinderGeometry(.445, .445, .07, 12),
  chute:new THREE.SphereGeometry(1.7, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), cone:new THREE.ConeGeometry(.45, 1.5, 6) };
const RUEM = { barrel:new THREE.MeshLambertMaterial({ color:0xb02418, emissive:0x3a0804 }), band:lam(0x2a2422), lid:lam(0xc8a020),
  crate:new THREE.MeshLambertMaterial({ color:0x8a6a3a, emissive:0x1a1006 }), crateEdge:lam(0x4a3420), chute:new THREE.MeshLambertMaterial({ color:0xe86a1e, emissive:0x401804, side:THREE.DoubleSide }),
  rope:lam(0xd8d0c0), shirt:lam(0xe8e4d8), pants:lam(0x4a6a9a), skin:lam(0xe0b090), hair:lam(0x3a2414), shoe:lam(0x2a2420) };
const rueGlow = c => new THREE.SpriteMaterial({ map:glowTex, color:c, blending:THREE.AdditiveBlending, depthWrite:false, transparent:true, fog:false });
const RUE_V = new THREE.Vector3(), RUE_V2 = new THREE.Vector3();
function ruePart(parent, geo, mat, sx, sy, sz, x, y, z){ const m = new THREE.Mesh(geo, mat); m.scale.set(sx, sy, sz); m.position.set(x, y, z); parent.add(m); return m; }
function rueHitOn(m){ if (hitMeshes.indexOf(m) < 0) hitMeshes.push(m); }
function rueHitOff(m){ const i = hitMeshes.indexOf(m); if (i >= 0) hitMeshes.splice(i, 1); }

/* ---------- Pools ---------- */
(function rueBuild(){
  // Barils
  for (let i = 0; i < 6; i++){
    const g = new THREE.Group(); g.visible = false; rueRoot.add(g);
    const body = ruePart(g, RUEG.cyl, RUEM.barrel, 1, 1, 1, 0, .575, 0);
    ruePart(g, RUEG.band, RUEM.band, 1, 1, 1, 0, .3, 0); ruePart(g, RUEG.band, RUEM.band, 1, 1, 1, 0, .85, 0);
    ruePart(g, RUEG.box, RUEM.lid, .5, .04, .22, 0, 1.16, 0);
    const b = { g, body, live:false, fuse:-1, byPlayer:false, x:0, z:0 };
    body.userData.onHit = () => rueBarrelHit(b);
    body.userData.rue = 'baril';
    RUE.barrels.push(b);
  }
  // Caisses en parachute
  for (let i = 0; i < 2; i++){
    const g = new THREE.Group(); g.visible = false; rueRoot.add(g);
    const box = ruePart(g, RUEG.box, RUEM.crate, 1.1, 1.1, 1.1, 0, 0, 0);
    ruePart(g, RUEG.box, RUEM.crateEdge, 1.16, .14, 1.16, 0, .4, 0); ruePart(g, RUEG.box, RUEM.crateEdge, 1.16, .14, 1.16, 0, -.4, 0);
    const chute = new THREE.Group(); chute.position.y = 3.3; g.add(chute);
    const canopy = ruePart(chute, RUEG.chute, RUEM.chute, 1, .8, 1, 0, 0, 0);
    [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(p => {
      const r = ruePart(chute, RUEG.box, RUEM.rope, .03, 3.1, .03, p[0] * .85, -1.5, p[1] * .85);
      r.rotation.z = -p[0] * .2; r.rotation.x = p[1] * .2;
    });
    const beacon = new THREE.Sprite(rueGlow(0x80ff60)); beacon.position.y = .8; beacon.scale.set(.9, .9, 1); g.add(beacon);
    const c = { g, box, chute, canopy, beacon, live:false, landed:false, t:0, gt:0, x:0, y:0, z:0, ph:0 };
    box.userData.onHit = canopy.userData.onHit = () => rueCrateHit(c);
    box.userData.rue = canopy.userData.rue = 'caisse';
    RUE.crates.push(c);
  }
  // Civil (un seul à la fois) : vêtements clairs, bras le long du corps, il court droit
  {
    const g = new THREE.Group(); g.visible = false; rueRoot.add(g);
    const body = new THREE.Group(); g.add(body);
    const mk = (mat, sx, sy, sz, x, y, z) => ruePart(body, RUEG.box, mat, sx, sy, sz, x, y, z);
    const torso = mk(RUEM.shirt, .56, .74, .3, 0, 1.3, 0);
    const head = mk(RUEM.skin, .36, .38, .36, 0, 1.88, 0);
    mk(RUEM.hair, .38, .12, .38, 0, 2.08, -.02);
    const limb = (mat, x, y, len, w) => { const p = new THREE.Group(); p.position.set(x, y, 0); body.add(p); const m = ruePart(p, RUEG.box, mat, w, len, w, 0, -len / 2, 0); return { p, m }; };
    const armL = limb(RUEM.shirt, -.37, 1.64, .66, .15), armR = limb(RUEM.shirt, .37, 1.64, .66, .15);
    const legL = limb(RUEM.pants, -.15, .9, .88, .2), legR = limb(RUEM.pants, .15, .9, .88, .2);
    [legL, legR].forEach(l => ruePart(l.p, RUEG.box, RUEM.shoe, .22, .1, .32, 0, -.86, .05));
    const mark = new THREE.Sprite(rueGlow(0x60ff90)); mark.position.y = 2.6; mark.scale.set(.8, .8, 1); g.add(mark);
    const meshes = [torso, head, armL.m, armR.m, legL.m, legR.m];
    const civ = { g, body, mark, meshes, armL:armL.p, armR:armR.p, legL:legL.p, legR:legR.p, live:false, st:'run', t:0, ph:0, grab:0, x:0, z:0 };
    meshes.forEach(m => { m.userData.onHit = () => rueCivShot(); m.userData.rue = 'civil'; });
    RUE.civ = civ;
  }
  // Feux laissés par les barils (cônes du feu du décor, matériau partagé fireMat) et éclairs
  for (let i = 0; i < 4; i++){
    const g = new THREE.Group(); g.visible = false; rueRoot.add(g);
    const cones = [];
    for (let k = 0; k < 4; k++){ const c = new THREE.Mesh(RUEG.cone, fireMat); c.position.set(rand(-.5, .5), .6, rand(-.5, .5)); g.add(c); cones.push(c); }
    RUE.fires.push({ g, cones, t:0 });
  }
  for (let i = 0; i < 6; i++){
    const s = new THREE.Sprite(rueGlow(0xffa040)); s.visible = false; rueRoot.add(s);
    RUE.booms.push({ m:s, life:0, max:.6, size:8 });
  }
})();
const rueLight = new THREE.PointLight(0xff8a30, 0, 45, 2); rueLight.position.set(0, 3, -40); rueRoot.add(rueLight);

/* ---------- Texte flottant en couleur ---------- */
function rueFloat(txt, pos, color, big){
  const box = $('floats'); if (!box || box.childElementCount > 18) return;
  projV.copy(pos).project(camera); if (projV.z > 1) return;
  const el = document.createElement('div'); el.className = 'fl' + (big ? ' head' : '');
  el.textContent = txt; if (color) el.style.color = color;
  el.style.left = ((projV.x + 1) / 2 * innerWidth) + 'px'; el.style.top = ((1 - projV.y) / 2 * innerHeight - 30) + 'px';
  box.appendChild(el); setTimeout(() => el.remove(), 1300);
}
const ruePower = () => (plan && plan.hpMult > 0 ? plan.hpMult : 1);
const rueCash = () => (plan && plan.cashMult > 0 ? plan.cashMult : 1);

/* ---------- Barils ---------- */
const RUE_AVOID = [[-10.5, -30], [11, -64], [-9, -88]];
function rueSpawnBarrel(x, z){
  const b = RUE.barrels.find(o => !o.live); if (!b) return null;
  b.live = true; b.fuse = -1; b.byPlayer = false; b.x = x; b.z = z;
  b.g.position.set(x, 0, z); b.g.rotation.y = rand(0, 6.28); b.g.visible = true; b.g.updateMatrixWorld(true);
  rueHitOn(b.body); RUE.active = true;
  return b;
}
function ruePlaceBarrels(){
  const n = clamp(3 + Math.floor(((S && S.wave) || 1) / 3), 3, 5);
  const avoid = RUE_AVOID.concat(((curLoc && curLoc.fires) || []).map(f => [f[0], f[2]]));
  const put = [];
  for (let i = 0, tries = 0; i < n && tries < 80; tries++){
    const u = (Math.random() + Math.random()) / 2; // plus souvent au milieu de la rue
    const x = rand(-9, 9), z = -24 - 60 * u;
    if (avoid.some(a => Math.abs(a[0] - x) < 3 && Math.abs(a[1] - z) < 3.5)) continue;
    if (put.some(p => (p[0] - x) * (p[0] - x) + (p[1] - z) * (p[1] - z) < 25)) continue;
    put.push([x, z]); rueSpawnBarrel(x, z); i++;
  }
}
function rueBarrelHit(b){ if (!b.live || b.fuse >= 0) return; rueBarrelBlow(b, true); }
function rueBarrelBlow(b, byPlayer){
  if (!b.live) return 0;
  b.live = false; b.fuse = -1; b.g.visible = false; rueHitOff(b.body);
  const x = b.x, z0 = b.z, R = RUE_CFG.barRadius, dmg = RUE_CFG.barDmg * ruePower();
  const keep = RUE.shot; RUE.shot = false; // la rage de tir ne double pas les barils
  let kills = 0;
  for (const z of zombies){
    if (z.dead) continue;
    const cy = z.g.position.y + (z.aimY != null ? z.aimY : 1.1);
    if (cy > RUE_CFG.barTop) continue;
    const dx = z.g.position.x - x, dz = z.g.position.z - z0, dy = Math.max(0, cy - 1.5) * .5;
    const d = Math.sqrt(dx * dx + dz * dz + dy * dy);
    if (d >= R) continue;
    RUE_V.set(z.g.position.x, cy, z.g.position.z);
    damage(z, dmg * (1 - .5 * d / R), false, RUE_V);
    if (z.dead) kills++;
  }
  RUE.shot = keep;
  // Effets : boule de feu, flammes au sol, débris, secousse, son
  RUE_V.set(x, 1.2, z0);
  rueBoom(x, 1.4, z0, R * 2.6); rueBoom(x, 3, z0, R * 1.6);
  const f = RUE.fires.find(o => !o.g.visible) || RUE.fires[0];
  f.g.position.set(x, 0, z0); f.t = 4; f.g.visible = true;
  burst(RUE_V, 'dust', 14, 5); burst(RUE_V, PMATS.ember ? 'ember' : 'wood', 10, 6);
  rueLight.position.set(x, 3, z0); rueLight.intensity = 7;
  const near = clamp(1 - camera.position.distanceTo(RUE_V) / 60, 0, 1);
  shake = Math.max(shake, .35 + .6 * near);
  if (typeof Snd === 'object'){ Snd.burst(450, 1.1, .9); Snd.tone(55, .9, 'sine', .7, 22); }
  if (kills >= 2){ RUE_V.y = 2.5; rueFloat('Baril ! +' + kills, RUE_V, '#ffb040', true); }
  RUE.active = true;
  // Réaction en chaîne et ce qui est autour (caisse, civil)
  rueNearBlast(x, .6, z0, R, byPlayer);
  return kills;
}
function rueBoom(x, y, z, size){
  const o = RUE.booms.find(b => !b.m.visible) || RUE.booms[0];
  o.m.position.set(x, y, z); o.size = size; o.max = o.life = .6; o.m.scale.set(.1, .1, 1); o.m.material.opacity = 1; o.m.visible = true;
}
// Explosion quelconque (baril, roquette, grenade, frappe, mortier, missile, ogive) au point (x, y, z), rayon r
function rueNearBlast(x, y, z0, r, byPlayer){
  for (const b of RUE.barrels){
    if (!b.live || b.fuse >= 0) continue;
    const dx = b.x - x, dz = b.z - z0;
    if (dx * dx + dz * dz < r * r){ b.fuse = RUE_CFG.chainDelay; b.byPlayer = !!byPlayer; RUE.active = true; }
  }
  if (!byPlayer) return;
  for (const c of RUE.crates){
    if (!c.live) continue;
    const dx = c.x - x, dy = Math.max(0, c.y - y - 2), dz = c.z - z0;
    if (dx * dx + dy * dy + dz * dz < (r + 1) * (r + 1)) rueCrateHit(c);
  }
  const v = RUE.civ;
  if (v && v.live && v.st === 'run'){
    const dx = v.x - x, dz = v.z - z0;
    if (dx * dx + dz * dz < r * r) rueCivShot();
  }
}

/* ---------- Caisses larguées ---------- */
function rueSpawnCrate(x, y, z){
  const c = RUE.crates.find(o => !o.live); if (!c) return null;
  c.live = true; c.landed = false; c.t = 0; c.gt = 0; c.x = x; c.y = y; c.z = z; c.ph = rand(0, 6);
  c.g.position.set(x, y, z); c.g.rotation.set(0, rand(0, 6.28), 0); c.g.visible = true; c.chute.visible = true; c.beacon.visible = true; c.box.visible = true;
  c.g.updateMatrixWorld(true);
  rueHitOn(c.box); rueHitOn(c.canopy); RUE.active = true;
  return c;
}
function rueCrateOff(c){ c.live = false; c.g.visible = false; rueHitOff(c.box); rueHitOff(c.canopy); }
function rueCrateHit(c){
  if (!c.live) return;
  RUE_V.set(c.x, c.y, c.z);
  rueCrateOff(c);
  burst(RUE_V, 'wood', 12, 4);
  if (typeof Snd === 'object' && Snd.buy) Snd.buy();
  rueCrateGive(RUE_V, RUE.force);
}
const RUE_BONUS = ['ammo', 'repair', 'cash', 'fury'];
function rueCrateGive(pos, kind){
  if (!S) return null;
  if (!kind){
    const pool = RUE_BONUS.filter(k => k !== 'repair' || S.bar < S.barMax * .9);
    kind = pick(pool);
  }
  let title = '', sub = '';
  if (kind === 'ammo'){ refillAll(); title = 'Munitions pleines !'; sub = 'Toutes tes armes sont rechargées.'; }
  else if (kind === 'repair'){
    const n = Math.min(S.barMax - S.bar, S.barMax * RUE_CFG.repair); S.bar = Math.min(S.barMax, S.bar + S.barMax * RUE_CFG.repair);
    title = 'Barricade réparée !'; sub = '+' + Math.round(n) + ' de solidité (' + Math.round(RUE_CFG.repair * 100) + ' %).';
  } else if (kind === 'cash'){
    const n = Math.round((60 + 30 * (S.wave || 1)) * rueCash()); S.money += n; S.earned += n;
    title = 'Caisse d’argent !'; sub = '+' + fmt(n);
  } else {
    kind = 'fury'; RUE.furyT = RUE_CFG.furyT; S.ammo[S.cur] = magSize(S.cur); reloadT = 0;
    title = 'Rage de tir !'; sub = 'Dégâts ×' + RUE_CFG.furyMult + ' et munitions infinies pendant ' + RUE_CFG.furyT + ' s.';
  }
  RUE.last = kind;
  banner(title, sub, 2400);
  if (pos){ RUE_V2.copy(pos); rueFloat(title, RUE_V2, '#9aff70', true); }
  return kind;
}

/* ---------- Civil ---------- */
function rueSpawnCiv(x, z){
  const v = RUE.civ; if (v.live) return null;
  v.live = true; v.st = 'run'; v.t = 0; v.ph = 0; v.grab = 0; v.x = x; v.z = z;
  v.g.position.set(x, 0, z); v.g.rotation.set(0, 0, 0); v.body.rotation.set(0, 0, 0); v.body.position.set(0, 0, 0);
  v.g.visible = true; v.mark.visible = true; v.g.updateMatrixWorld(true);
  v.meshes.forEach(rueHitOn); RUE.active = true;
  return v;
}
function rueCivEnd(st){ const v = RUE.civ; v.st = st; v.t = 0; v.meshes.forEach(rueHitOff); v.mark.visible = false; }
function rueCivShot(){
  const v = RUE.civ; if (!v.live || v.st !== 'run') return;
  rueCivEnd('dead');
  const pen = Math.min(S ? S.money : 0, Math.round((60 + 30 * ((S && S.wave) || 1)) * rueCash()));
  if (S) S.money -= pen;
  RUE_V.set(v.x, 1.4, v.z); burst(RUE_V, 'blood', 8, 2.5);
  RUE_V.y = 2.4; rueFloat('Civil touché ! -' + fmt(pen), RUE_V, '#ff5a4a', true);
  toast('Tu as touché un survivant : -' + fmt(pen));
  if (typeof Snd === 'object') Snd.tone(220, .4, 'sawtooth', .12, 90);
}
function rueCivSaved(){
  const v = RUE.civ; rueCivEnd('saved');
  const cash = Math.round((80 + 40 * ((S && S.wave) || 1)) * rueCash());
  const scr = Math.max(1, Math.round(6 * ((curLoc && curLoc.diff) || 1)));
  S.money += cash; S.earned += cash;
  P.scrap = (P.scrap || 0) + scr; S.scrapGained = (S.scrapGained || 0) + scr; saveP();
  RUE_V.set(v.x, 2.6, v.z); rueFloat('Survivant sauvé ! +' + fmt(cash), RUE_V, '#9aff70', true);
  banner('Survivant sauvé !', '+' + fmt(cash) + ' et +' + scr + ' ⚙', 2200);
  if (typeof Snd === 'object' && Snd.buy) Snd.buy();
}
function rueCivCaught(){
  const v = RUE.civ; rueCivEnd('dead');
  RUE_V.set(v.x, 1.4, v.z); burst(RUE_V, 'blood', 12, 3);
  RUE_V.y = 2.4; rueFloat('Survivant perdu', RUE_V, '#ff8a7a', false);
}
function rueCivStep(dt){
  const v = RUE.civ; if (!v.live) return;
  v.t += dt;
  if (v.st === 'run'){
    // Agrippé par un zombie au sol : il ralentit, et y passe s'il reste pris trop longtemps
    let held = false;
    for (const z of zombies){
      if (z.dead || z.g.position.y > 1.5) continue;
      const dx = z.g.position.x - v.x, dz = z.g.position.z - v.z, r = .55 + .35 * ((ZTYPES[z.type] || {}).scale || 1);
      if (dx * dx + dz * dz < r * r){ held = true; break; }
    }
    if (held){ v.grab += dt; if (v.grab >= RUE_CFG.civGrab){ rueCivCaught(); return; } }
    else v.grab = Math.max(0, v.grab - dt * .5);
    const spd = RUE_CFG.civSpeed * (held ? .35 : 1);
    v.z += spd * dt;
    v.ph += dt * spd * 2.6;
    const s = Math.sin(v.ph);
    v.legL.rotation.x = s * .85; v.legR.rotation.x = -s * .85;
    v.armL.rotation.x = -s * .7; v.armR.rotation.x = s * .7; // bras le long du corps, balancés
    v.body.rotation.x = .18; v.body.rotation.z = held ? Math.sin(v.t * 30) * .12 : 0;
    v.body.position.y = Math.abs(Math.cos(v.ph)) * .08;
    v.g.position.set(v.x, 0, v.z); v.g.updateMatrixWorld(true);
    if (v.z >= RUE_CFG.civSaveZ) rueCivSaved();
  } else if (v.st === 'saved'){
    // Il saute par-dessus la barricade et disparaît
    v.g.position.y = Math.min(2.2, v.t * 6); v.z += dt * 3; v.g.position.z = v.z;
    if (v.t > .5){ v.live = false; v.g.visible = false; }
  } else {
    v.body.rotation.x = -Math.min(1, v.t / .4) * Math.PI / 2;
    if (v.t > 2.4){ v.live = false; v.g.visible = false; }
  }
}

/* ---------- Début de vague et chaque image ---------- */
function rueWave(){
  rueClear();
  if (!S) return;
  ruePlaceBarrels();
  RUE.t = 0;
  RUE.crateAt = [rand(6, 20)]; if (Math.random() < .5) RUE.crateAt.push(rand(28, 50));
  const first = curLoc && curLoc.id === 'village' && S.wave <= 1;
  RUE.civAt = !first && Math.random() < RUE_CFG.civChance ? rand(8, 25) : -1;
  RUE.active = true;
}
function rueStep(dt){
  if (!S) return;
  RUE.t += dt;
  const alive = () => { let n = 0; for (const z of zombies) if (!z.dead) n++; return n; };
  // Largages et civil programmés (seulement si la vague n'est pas sur le point de finir)
  for (let i = RUE.crateAt.length - 1; i >= 0; i--){
    if (RUE.t < RUE.crateAt[i]) continue;
    RUE.crateAt.splice(i, 1);
    if (plan && (plan.queue.length > 0 || alive() > 3)){ rueSpawnCrate(rand(-8, 8), 28, rand(-60, -24)); toast('Ravitaillement largué ! Tire sur la caisse.'); }
  }
  if (RUE.civAt >= 0 && RUE.t >= RUE.civAt){
    RUE.civAt = -1;
    if (plan && plan.queue.length > 5 && rueSpawnCiv(rand(-7, 7), -95)) toast('Un survivant court vers la barricade : couvre-le, ne lui tire pas dessus !');
  }
  // Ogive (17-defenses.js) : elle fait sauter les barils dans son rayon
  if (typeof NFX === 'object' && NFX){ if (NFX.t >= 0 && RUE.nfxPrev < 0) rueNearBlast(NFX.x, 0, NFX.z, NFX.r, false); RUE.nfxPrev = NFX.t; }
  // Barils qui vont sauter (réaction en chaîne)
  for (const b of RUE.barrels){
    if (!b.live || b.fuse < 0) continue;
    b.fuse -= dt; if (b.fuse <= 0) rueBarrelBlow(b, b.byPlayer);
  }
  // Caisses : descente en parachute, puis quelques secondes au sol
  for (const c of RUE.crates){
    if (!c.live) continue;
    c.t += dt;
    if (!c.landed){
      c.y -= RUE_CFG.crateFall * dt;
      c.x = clamp(c.x + Math.sin(c.t * .7 + c.ph) * .35 * dt, -12, 12);
      c.g.rotation.z = Math.sin(c.t * 1.3 + c.ph) * .12;
      if (c.y <= .55){ c.y = .55; c.landed = true; c.chute.visible = false; rueHitOff(c.canopy); c.g.rotation.z = 0; burst(RUE_V.set(c.x, .2, c.z), 'dust', 6, 2); }
    } else {
      c.gt += dt;
      c.beacon.visible = c.gt < RUE_CFG.crateGround - 2 || Math.sin(c.gt * 14) > 0;
      if (c.gt >= RUE_CFG.crateGround){ rueCrateOff(c); continue; }
    }
    c.g.position.set(c.x, c.y, c.z); c.g.updateMatrixWorld(true);
  }
  rueCivStep(dt);
  // Rage de tir
  if (RUE.furyT > 0){ RUE.furyT -= dt; if (RUE.furyT <= 0){ RUE.furyT = 0; toast('Fin de la rage de tir'); } }
  rueFx(dt);
}
function rueFx(dt){
  for (const f of RUE.fires){
    if (!f.g.visible) continue;
    f.t -= dt; if (f.t <= 0){ f.g.visible = false; continue; }
    const k = Math.min(1, f.t / 1.2);
    f.cones.forEach((c, i) => { const s = (.7 + Math.random() * .4) * k; c.scale.set(k, s + Math.sin(RUE.t * 9 + i * 2) * .2, k); });
  }
  for (const b of RUE.booms){
    if (!b.m.visible) continue;
    b.life -= dt; if (b.life <= 0){ b.m.visible = false; continue; }
    const u = 1 - b.life / b.max, s = b.size * (.3 + .9 * Math.sqrt(u));
    b.m.scale.set(s, s, 1); b.m.material.opacity = 1 - u;
  }
  if (rueLight.intensity > 0) rueLight.intensity = Math.max(0, rueLight.intensity - dt * 16);
}
// Tout ranger : changement de ville, fin de partie, retour à la carte, entre les vagues
function rueClear(){
  RUE.barrels.forEach(b => { b.live = false; b.fuse = -1; b.g.visible = false; rueHitOff(b.body); });
  RUE.crates.forEach(rueCrateOff);
  const v = RUE.civ; v.live = false; v.g.visible = false; v.meshes.forEach(rueHitOff);
  RUE.fires.forEach(f => { f.g.visible = false; f.t = 0; });
  RUE.booms.forEach(b => { b.m.visible = false; b.life = 0; });
  rueLight.intensity = 0;
  RUE.crateAt.length = 0; RUE.civAt = -1; RUE.furyT = 0; RUE.shot = false; RUE.active = false;
}

/* ---------- Lance-flammes : il fait aussi sauter les barils et attrape les caisses (et brûle le civil) ---------- */
function rueFlameCone(id){
  const W = WEAPONS[id]; if (!W) return;
  const minZ = BAR_Z - W.range, cone = W.cone;
  fwd.set(0, 0, -1).applyQuaternion(camera.quaternion);
  const inCone = (x, y, z, big) => {
    if (z < minZ) return false;
    RUE_V.set(x, y, z).sub(camera.position); const d = RUE_V.length(); if (d < .5) return false;
    return RUE_V.dot(fwd) / d >= Math.cos(cone + Math.atan(big / d));
  };
  for (const b of RUE.barrels) if (b.live && b.fuse < 0 && inCone(b.x, .6, b.z, .6)){ b.fuse = .05; b.byPlayer = true; RUE.active = true; }
  for (const c of RUE.crates) if (c.live && inCone(c.x, c.y, c.z, .8)) rueCrateHit(c);
  const v = RUE.civ; if (v.live && v.st === 'run' && inCone(v.x, 1.2, v.z, .5)) rueCivShot();
}

/* ---------- Crochets sur le code commun (par réaffectation) ---------- */
try { const _b = startWave; startWave = function(){ const r = _b.apply(this, arguments); try { rueWave(); } catch (e) {} return r; }; } catch (e) {}
try {
  const _b = update;
  update = function(dt){
    // Rage de tir : munitions infinies pour l'arme en main
    if (RUE.furyT > 0 && S && S.ammo[S.cur] < magSize(S.cur)){ S.ammo[S.cur] = magSize(S.cur); reloadT = 0; }
    const r = _b.apply(this, arguments);
    if (state === 'playing') rueStep(dt);
    return r;
  };
} catch (e) {}
try {
  const _b = visuals;
  visuals = function(dt){ const r = _b.apply(this, arguments); if (RUE.active && state !== 'playing' && state !== 'paused') rueClear(); return r; };
} catch (e) {}
try { const _b = clearZombies; clearZombies = function(){ const r = _b.apply(this, arguments); rueClear(); return r; }; } catch (e) {}
try { const _b = buildWorld; buildWorld = function(){ const r = _b.apply(this, arguments); rueClear(); return r; }; } catch (e) {}
// Rage de tir : dégâts doublés pour les tirs du joueur (balles, flammes, carreaux, roquettes, brûlure)
try {
  const _b = fire;
  fire = function(){
    RUE.shot = true; let r;
    try { r = _b.apply(this, arguments); } finally { RUE.shot = false; }
    if (RUE.furyT > 0 && S) S.ammo[S.cur] = magSize(S.cur);
    return r;
  };
} catch (e) {}
try {
  if (typeof armStep === 'function'){
    const _b = armStep;
    armStep = function(){ RUE.shot = true; try { return _b.apply(this, arguments); } finally { RUE.shot = false; } };
  }
} catch (e) {}
try {
  const _b = damage;
  damage = function(z, amt, head, point){
    if (RUE.furyT > 0 && RUE.shot) amt *= RUE_CFG.furyMult;
    return _b.call(this, z, amt, head, point);
  };
} catch (e) {}
try {
  if (typeof armFlame === 'function'){ const _b = armFlame; armFlame = function(id){ const r = _b.apply(this, arguments); rueFlameCone(id); return r; }; }
} catch (e) {}
// Explosions des autres systèmes : elles font sauter les barils proches
try {
  if (typeof armExplode === 'function'){
    const _b = armExplode;
    armExplode = function(pos, id){ const r = _b.apply(this, arguments); rueNearBlast(pos.x, pos.y, pos.z, wRadius(id), true); return r; };
  }
} catch (e) {}
try {
  if (typeof pwBlast === 'function'){
    const _b = pwBlast;
    pwBlast = function(x, y, z0, r){ const n = _b.apply(this, arguments); rueNearBlast(x, y, z0, r, true); return n; };
  }
} catch (e) {}
try {
  if (typeof splash === 'function'){
    const _b = splash;
    splash = function(x, z0, r){ const n = _b.apply(this, arguments); rueNearBlast(x, 0, z0, r, false); return n; };
  }
} catch (e) {}
try {
  const _b = updateHUD;
  updateHUD = function(){ const r = _b.apply(this, arguments); if (RUE.furyT > 0 && S && state === 'playing') setTxt('ammo', '∞ Rage ' + Math.ceil(RUE.furyT) + ' s'); return r; };
} catch (e) {}

// Accès pour les tests automatiques
window.__rue = { RUE, RUE_CFG, RUE_BONUS, rueRoot, rueWave, rueStep, rueClear, rueSpawnBarrel, rueSpawnCrate, rueSpawnCiv, rueBarrelBlow, rueNearBlast, rueCrateGive, rueCivShot,
  get vivants(){ return { barils:RUE.barrels.filter(b => b.live).length, caisses:RUE.crates.filter(c => c.live).length, civil:RUE.civ.live }; },
  dansHit(){ let n = 0; for (const m of hitMeshes) if (m.userData.onHit && m.userData.rue) n++; return n; } };
