'use strict';
/* ================= Zombies ================= */
// Modèle humanoïde par défaut (walker, runner, brute). Les autres formes sont dans 18-zombies-types.js (ZKINDS).
const ZG = { torso:new THREE.BoxGeometry(.62, .8, .34), head:new THREE.BoxGeometry(.4, .42, .4), arm:new THREE.BoxGeometry(.17, .72, .17), leg:new THREE.BoxGeometry(.22, .86, .24), eye:new THREE.BoxGeometry(.08, .05, .02) };
ZG.arm.translate(0, -.36, 0); ZG.leg.translate(0, -.43, 0);
const eyeMat = new THREE.MeshBasicMaterial({ color: 0xff3a1a });
const SHIRTS = [0x5b3a2e, 0x3d4a5c, 0x6a6a5a, 0x7a2e2e, 0x4b5a3a, 0x8a7a60, 0x3a3a44];
const PANTS = [0x2b2b33, 0x3a3226, 0x24303a, 0x403a32];
const zkind = type => (typeof ZKINDS !== 'undefined' && ZKINDS[type]) || null;
function buildHumanoid(T){
  const skin = lam(T.skin), shirt = lam(pick(SHIRTS)), pants = lam(pick(PANTS));
  const g = new THREE.Group(), body = new THREE.Group(); g.add(body);
  const mk = (geo, mat, x, y, z) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); body.add(m); return m; };
  // Petites variations de proportions : pas deux zombies pareils
  const wide = rand(.88, 1.16), tall = rand(.94, 1.06), hs = rand(.88, 1.12), al = rand(.9, 1.15);
  const torso = mk(ZG.torso, shirt, 0, 1.28, 0); torso.scale.set(wide, 1, rand(.9, 1.2));
  const head = mk(ZG.head, skin, rand(-.03, .03), 1.9, 0); head.scale.setScalar(hs); head.rotation.z = rand(-.15, .15);
  mk(ZG.eye, eyeMat, -.09, 1.94, .205 * hs); mk(ZG.eye, eyeMat, .09, 1.94, .205 * hs);
  const armL = mk(ZG.arm, skin, -.4 * wide, 1.62, 0), armR = mk(ZG.arm, skin, .4 * wide, 1.62, 0);
  armL.scale.y = al; armR.scale.y = al * rand(.92, 1.05);
  const legL = mk(ZG.leg, pants, -.16, .86, 0), legR = mk(ZG.leg, pants, .16, .86, 0);
  g.scale.set(T.scale, T.scale * tall, T.scale);
  return { g, body, head, armL, armR, legL, legR, parts:[torso, head, armL, armR, legL, legR], mats:[skin, shirt, pants], aimY:1.1 * T.scale };
}
function spawnZombie(type){
  const T = ZTYPES[type] || ZTYPES.walker; if (!ZTYPES[type]) type = 'walker';
  const K = zkind(type);
  // build() d'un type de ZKINDS : il s'occupe lui-même de son échelle ; on le positionne et on l'ajoute à la scène
  const R = (K && K.build) ? K.build(T) : buildHumanoid(T);
  const g = R.g;
  g.position.set(rand(-11, 11), 0, rand(-118, -100));
  scene.add(g);
  const xp = ZXP[type] != null ? ZXP[type] : (T.xp != null ? T.xp : 5);
  const z = { type, g, body:R.body || g, head:R.head || null, armL:R.armL || null, armR:R.armR || null, legL:R.legL || null, legR:R.legR || null,
    mats:R.mats || [], geos:R.geos || [], aimY:R.aimY != null ? R.aimY : 1.1 * (T.scale || 1),
    hp: T.hp * plan.hpMult, maxHp: T.hp * plan.hpMult, speed: T.speed * plan.spdMult * rand(.85, 1.15), dmg: T.dmg * plan.dmgMult, reward: T.reward * plan.cashMult * ECO, xp: xp * plan.xp * ECO,
    phase: rand(0, 6.28), st:'walk', atkT: rand(.2, 1), stopZ: BAR_Z - .7 - rand(0, .9) - (T.stopOff || 0), flashT: 0, deadT: 0, sway: rand(.3, .9), headGone:false, meshes:[] };
  const parts = (R.parts || []).slice(); if (z.head && parts.indexOf(z.head) < 0) parts.push(z.head);
  parts.forEach(m => { m.userData.z = z; m.userData.head = (m === z.head); z.meshes.push(m); hitMeshes.push(m); });
  zombies.push(z);
  if (K && K.init) K.init(z);
  return z;
}
function removeZombieMeshes(z){ z.meshes.forEach(m => { const i = hitMeshes.indexOf(m); if (i >= 0) hitMeshes.splice(i, 1); }); }
function disposeZombie(z){ scene.remove(z.g); z.mats.forEach(m => m.dispose()); z.geos.forEach(o => o.dispose()); }
function clearZombies(){
  zombies.forEach(z => { removeZombieMeshes(z); disposeZombie(z); }); zombies.length = 0; hitMeshes.length = 0;
  if (typeof zkClear === 'function') zkClear(); // projectiles et effets des types spéciaux (18-zombies-types.js)
}
const tmpV = new THREE.Vector3();
function damage(z, amt, head, point){
  if (z.dead) return;
  z.hp -= amt; z.flashT = .08;
  burst(point, 'blood', head ? 10 : 5, head ? 3 : 2);
  if (z.hp <= 0) kill(z, head, point);
}
function kill(z, head, point){
  z.dead = true; z.deadT = 0; removeZombieMeshes(z);
  if (typeof comboKill === 'function') comboKill(z); // combo de tes tirs (26-combos.js)
  const cm = typeof comboMult === 'function' ? comboMult() : 1; // tout l'argent des abattus est multiplié pendant un combo
  const pay = Math.round(z.reward * (1 + .08 * T('scavenger')) * (head ? 1.5 : 1) * cm);
  if (typeof defOnKill === 'function') defOnKill(z); // ferraille (16-atelier.js)
  addXP(z.xp);
  S.money += pay; S.earned += pay; S.kills++; S.waveKills++;
  if (head && z.head){ z.head.visible = false; z.headGone = true; burst(point, 'blood', 14, 4); }
  floatText((head ? 'Tête ! +' : '+') + fmt(pay), point, head);
}
/* ---------- Points faibles ---------- */
// Un maillage peut porter userData.weak = { mult, effet } (posé par ZKINDS[type].build, 18-zombies-types.js).
// Tous les impacts directs (balles, plombs, carreaux) passent par weakHit : dégâts multipliés, texte « Point faible ! »,
// puis l'effet propre au type (ZKINDS[type].onWeak(z, maillage, dégâts, point, weak) ; true = l'effet a déjà infligé les dégâts).
let weakT = 0; // marqueur d'impact vert quelques instants (26-combos.js l'affiche)
function weakText(txt, pos){
  const box = $('floats'); if (!box || box.childElementCount > 18 || typeof camera === 'undefined') return;
  tmpV.copy(pos).project(camera); if (tmpV.z > 1) return;
  const el = document.createElement('div'); el.className = 'fl weak'; el.textContent = txt;
  el.style.left = ((tmpV.x + 1) / 2 * innerWidth) + 'px'; el.style.top = ((1 - tmpV.y) / 2 * innerHeight - 44) + 'px';
  box.appendChild(el); setTimeout(() => el.remove(), 950);
}
// Retire un maillage des cibles (poche d'acide éclatée) : le rayon de Three.js touche aussi les maillages cachés
function dropZombieMesh(z, m){
  m.visible = false;
  let i = hitMeshes.indexOf(m); if (i >= 0) hitMeshes.splice(i, 1);
  i = z.meshes.indexOf(m); if (i >= 0) z.meshes.splice(i, 1);
}
function weakHit(z, m, amt, point){
  const wk = m && m.userData && m.userData.weak;
  if (!wk || !z || z.dead){ if (z) damage(z, amt, false, point); return false; }
  amt *= wk.mult || 1;
  z.wkHits = (z.wkHits || 0) + 1; weakT = .18;
  if (typeof CB !== 'undefined' && CB.ctx > 0) z.cbBy = true; // ce que l'effet abat plus tard (chute) compte pour ton combo
  const K = zkind(z.type);
  const r = K && K.onWeak ? K.onWeak(z, m, amt, point, wk) : null;
  const now = typeof time === 'number' ? time : 0;
  if (r && r.txt) weakText('Point faible ! ' + r.txt, point);
  else if (!(z.wkTxtT > now - .25)){ z.wkTxtT = now; weakText('Point faible !', point); }
  if (!(r && r.done)) damage(z, amt, false, point);
  return true;
}
// Coup porté à la barricade (utilisé aussi par les types spéciaux)
function hitBarricade(z, dmg, shk, chips){
  S.bar = Math.max(0, S.bar - dmg);
  shake = Math.max(shake, shk);
  tmpV.set(z.g.position.x, rand(.5, 1.3), BAR_Z); burst(tmpV, 'wood', chips, 2.2);
  if (Math.random() < .5) Snd.thud();
  $('dmgflash').style.opacity = .7; setTimeout(() => { $('dmgflash').style.opacity = 0; }, 90);
}
function updateZombies(dt){
  for (let i = zombies.length - 1; i >= 0; i--){
    const z = zombies[i];
    if (z.flashT > 0){ z.flashT -= dt; const on = z.flashT > 0; for (let k = 0; k < z.mats.length && k < 2; k++) if (z.mats[k].emissive) z.mats[k].emissive.setHex(on ? 0x772211 : 0); }
    if (z.dead){
      z.deadT += dt;
      z.body.rotation.x = -Math.min(1, z.deadT / .45) * Math.PI / 2;
      const crowd = zombies.length > 45 ? .45 : 1;
      // Mort en l'air (volant, sauteur en plein bond) : il tombe d'abord au sol
      if (z.deadT <= 1.6 * crowd && z.g.position.y > 0){ z.fallV = (z.fallV || 0) + 22 * dt; z.g.position.y = Math.max(0, z.g.position.y - z.fallV * dt); }
      if (z.deadT > 1.6 * crowd) z.g.position.y -= dt * 1.2 / crowd;
      if (z.deadT > 2.8 * crowd){ disposeZombie(z); zombies.splice(i, 1); }
      continue;
    }
    const K = zkind(z.type);
    if (K && K.update && K.update(z, dt) === true) continue;
    if (z.st === 'walk'){
      z.g.position.z += z.speed * dt;
      z.g.position.x += Math.sin(z.phase * .3) * z.sway * dt * .4;
      z.g.position.x = clamp(z.g.position.x, -12, 12);
      z.phase += dt * z.speed * 3.2;
      const s = Math.sin(z.phase);
      if (z.legL) z.legL.rotation.x = s * .6; if (z.legR) z.legR.rotation.x = -s * .6;
      if (z.armL) z.armL.rotation.x = -1.35 + s * .18; if (z.armR) z.armR.rotation.x = -1.35 - s * .18;
      z.body.position.y = Math.abs(Math.cos(z.phase)) * .06;
      z.body.rotation.x = z.type === 'runner' ? .25 : .06;
      z.body.rotation.z = Math.sin(z.phase * .5) * .06;
      if (z.g.position.z >= z.stopZ){ z.g.position.z = z.stopZ; z.st = 'attack'; if (z.legL) z.legL.rotation.x = 0; if (z.legR) z.legR.rotation.x = 0; }
    } else {
      z.phase += dt * 9;
      if (z.armL) z.armL.rotation.x = -1.6 + Math.sin(z.phase) * .5; if (z.armR) z.armR.rotation.x = -1.6 - Math.sin(z.phase) * .5;
      z.atkT -= dt;
      if (z.atkT <= 0){
        z.atkT = rand(.95, 1.25);
        const ZT = ZTYPES[z.type] || {};
        hitBarricade(z, z.dmg, ZT.hitShake != null ? ZT.hitShake : .15, ZT.chips != null ? ZT.chips : 3);
      }
    }
  }
  if (typeof zkFrame === 'function') zkFrame(dt); // projectiles des cracheurs (18-zombies-types.js)
}
