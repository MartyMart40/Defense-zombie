'use strict';
/* ================= Zombies ================= */
const ZG = { torso:new THREE.BoxGeometry(.62, .8, .34), head:new THREE.BoxGeometry(.4, .42, .4), arm:new THREE.BoxGeometry(.17, .72, .17), leg:new THREE.BoxGeometry(.22, .86, .24), eye:new THREE.BoxGeometry(.08, .05, .02) };
ZG.arm.translate(0, -.36, 0); ZG.leg.translate(0, -.43, 0);
const eyeMat = new THREE.MeshBasicMaterial({ color: 0xff3a1a });
const SHIRTS = [0x5b3a2e, 0x3d4a5c, 0x6a6a5a, 0x7a2e2e, 0x4b5a3a, 0x8a7a60, 0x3a3a44];
const PANTS = [0x2b2b33, 0x3a3226, 0x24303a, 0x403a32];
function spawnZombie(type){
  const T = ZTYPES[type];
  const skin = lam(T.skin), shirt = lam(pick(SHIRTS)), pants = lam(pick(PANTS));
  const g = new THREE.Group(), body = new THREE.Group(); g.add(body);
  const mk = (geo, mat, x, y, z) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); body.add(m); return m; };
  const torso = mk(ZG.torso, shirt, 0, 1.28, 0);
  const head = mk(ZG.head, skin, 0, 1.9, 0);
  mk(ZG.eye, eyeMat, -.09, 1.94, .205); mk(ZG.eye, eyeMat, .09, 1.94, .205);
  const armL = mk(ZG.arm, skin, -.4, 1.62, 0), armR = mk(ZG.arm, skin, .4, 1.62, 0);
  const legL = mk(ZG.leg, pants, -.16, .86, 0), legR = mk(ZG.leg, pants, .16, .86, 0);
  g.scale.setScalar(T.scale);
  const x = rand(-11, 11);
  g.position.set(x, 0, rand(-118, -100));
  scene.add(g);
  const z = { type, g, body, head, armL, armR, legL, legR, mats:[skin, shirt, pants],
    hp: T.hp * plan.hpMult, maxHp: T.hp * plan.hpMult, speed: T.speed * plan.spdMult * rand(.85, 1.15), dmg: T.dmg * plan.dmgMult, reward: T.reward * plan.cashMult * ECO, xp: ZXP[type] * plan.xp * ECO,
    phase: rand(0, 6.28), st:'walk', atkT: rand(.2, 1), stopZ: BAR_Z - .7 - rand(0, .9) - (type === 'brute' ? .5 : 0), flashT: 0, deadT: 0, sway: rand(.3, .9), headGone:false, meshes:[] };
  [torso, head, armL, armR, legL, legR].forEach(m => { m.userData.z = z; m.userData.head = (m === head); z.meshes.push(m); hitMeshes.push(m); });
  zombies.push(z);
}
function removeZombieMeshes(z){ z.meshes.forEach(m => { const i = hitMeshes.indexOf(m); if (i >= 0) hitMeshes.splice(i, 1); }); }
function disposeZombie(z){ scene.remove(z.g); z.mats.forEach(m => m.dispose()); }
function clearZombies(){ zombies.forEach(z => { removeZombieMeshes(z); disposeZombie(z); }); zombies.length = 0; hitMeshes.length = 0; }
const tmpV = new THREE.Vector3();
function damage(z, amt, head, point){
  if (z.dead) return;
  z.hp -= amt; z.flashT = .08;
  burst(point, 'blood', head ? 10 : 5, head ? 3 : 2);
  if (z.hp <= 0) kill(z, head, point);
}
function kill(z, head, point){
  z.dead = true; z.deadT = 0; removeZombieMeshes(z);
  const pay = Math.round(z.reward * (1 + .08 * T('scavenger')) * (head ? 1.5 : 1));
  if (typeof defOnKill === 'function') defOnKill(z); // ferraille (16-atelier.js)
  addXP(z.xp);
  S.money += pay; S.earned += pay; S.kills++; S.waveKills++;
  if (head){ z.head.visible = false; z.headGone = true; burst(point, 'blood', 14, 4); }
  floatText((head ? 'Tête ! +' : '+') + fmt(pay), point, head);
}
function updateZombies(dt){
  for (let i = zombies.length - 1; i >= 0; i--){
    const z = zombies[i];
    if (z.flashT > 0){ z.flashT -= dt; const on = z.flashT > 0; z.mats[0].emissive.setHex(on ? 0x772211 : 0); z.mats[1].emissive.setHex(on ? 0x772211 : 0); }
    if (z.dead){
      z.deadT += dt;
      z.body.rotation.x = -Math.min(1, z.deadT / .45) * Math.PI / 2;
      const crowd = zombies.length > 45 ? .45 : 1;
      if (z.deadT > 1.6 * crowd) z.g.position.y -= dt * 1.2 / crowd;
      if (z.deadT > 2.8 * crowd){ disposeZombie(z); zombies.splice(i, 1); }
      continue;
    }
    if (z.st === 'walk'){
      z.g.position.z += z.speed * dt;
      z.g.position.x += Math.sin(z.phase * .3) * z.sway * dt * .4;
      z.g.position.x = clamp(z.g.position.x, -12, 12);
      z.phase += dt * z.speed * 3.2;
      const s = Math.sin(z.phase);
      z.legL.rotation.x = s * .6; z.legR.rotation.x = -s * .6;
      z.armL.rotation.x = -1.35 + s * .18; z.armR.rotation.x = -1.35 - s * .18;
      z.body.position.y = Math.abs(Math.cos(z.phase)) * .06;
      z.body.rotation.x = z.type === 'runner' ? .25 : .06;
      z.body.rotation.z = Math.sin(z.phase * .5) * .06;
      if (z.g.position.z >= z.stopZ){ z.g.position.z = z.stopZ; z.st = 'attack'; z.legL.rotation.x = z.legR.rotation.x = 0; }
    } else {
      z.phase += dt * 9;
      z.armL.rotation.x = -1.6 + Math.sin(z.phase) * .5; z.armR.rotation.x = -1.6 - Math.sin(z.phase) * .5;
      z.atkT -= dt;
      if (z.atkT <= 0){
        z.atkT = rand(.95, 1.25);
        S.bar = Math.max(0, S.bar - z.dmg);
        shake = Math.max(shake, z.type === 'brute' ? .5 : .15);
        tmpV.set(z.g.position.x, rand(.5, 1.3), BAR_Z); burst(tmpV, 'wood', z.type === 'brute' ? 8 : 3, 2.2);
        if (Math.random() < .5) Snd.thud();
        $('dmgflash').style.opacity = .7; setTimeout(() => { $('dmgflash').style.opacity = 0; }, 90);
      }
    }
  }
}
