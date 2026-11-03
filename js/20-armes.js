'use strict';
/* ================= Armes spéciales : carreaux, roquettes, flammes, brûlure, minigun ================= */
// Données : WEAPONS / WUPG (06-donnees.js). Tir : fire() (08-tir.js) appelle armLaunch(id) ou armFlame(id).
// Tous les objets sont créés une seule fois (pools) et seulement cachés ensuite : aucune fuite.
// Les dégâts passent toujours par damage() (l'armure du boss de 19-boss.js s'applique).
const ARM = { bolts:[], rockets:[], flames:[], booms:[], burns:[], active:false };
const armTmp = new THREE.Vector3(), armTmp2 = new THREE.Vector3(), armDir = new THREE.Vector3(), armPt = new THREE.Vector3(), armRight = new THREE.Vector3(), armMz = new THREE.Vector3();
const armRay = new THREE.Raycaster();
(function buildArmPools(){
  const nf = m => { m.fog = false; return m; };
  // Carreaux : tige laiton, plumes rouges
  const boltGeo = new THREE.BoxGeometry(.05, .05, .8), fletchGeo = new THREE.BoxGeometry(.02, .12, .16);
  const boltMat = new THREE.MeshBasicMaterial({ color: 0xc8a050 }), fletchMat = new THREE.MeshBasicMaterial({ color: 0xb02818 });
  for (let i = 0; i < 12; i++){
    const g = new THREE.Group(); g.add(new THREE.Mesh(boltGeo, boltMat)); const f = new THREE.Mesh(fletchGeo, fletchMat); f.position.z = .34; g.add(f);
    g.visible = false; scene.add(g);
    ARM.bolts.push({ m:g, v:new THREE.Vector3(), life:0, stuck:0, left:0, seen:[], id:'crossbow' });
  }
  // Roquettes : corps vert, ogive rouge, flamme et fumée derrière
  const rBody = new THREE.BoxGeometry(.18, .18, .9), rNose = new THREE.BoxGeometry(.12, .12, .2);
  const rMat = new THREE.MeshLambertMaterial({ color: 0x4a5a2a }), rNoseMat = new THREE.MeshLambertMaterial({ color: 0x8a2416 });
  for (let i = 0; i < 6; i++){
    const g = new THREE.Group(); g.add(new THREE.Mesh(rBody, rMat)); const n = new THREE.Mesh(rNose, rNoseMat); n.position.z = -.55; g.add(n);
    const tail = new THREE.Sprite(nf(new THREE.SpriteMaterial({ map: glowTex, color: 0xffb050, blending: THREE.AdditiveBlending, depthWrite: false })));
    tail.position.z = .6; tail.scale.set(1.1, 1.1, 1); g.add(tail);
    g.visible = false; scene.add(g);
    ARM.rockets.push({ m:g, tail, v:new THREE.Vector3(), life:0, id:'rocket', smokeT:0 });
  }
  // Flammes : sprites additifs, chacun son matériau pour fondre seul
  for (let i = 0; i < 72; i++){
    const s = new THREE.Sprite(nf(new THREE.SpriteMaterial({ map: glowTex, color: 0xffc060, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true })));
    s.visible = false; scene.add(s);
    ARM.flames.push({ m:s, v:new THREE.Vector3(), life:0, max:1, size:1 });
  }
  // Explosions
  for (let i = 0; i < 5; i++){
    const s = new THREE.Sprite(nf(new THREE.SpriteMaterial({ map: glowTex, color: 0xffa040, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true })));
    s.visible = false; scene.add(s);
    ARM.booms.push({ m:s, life:0, max:.5, size:1 });
  }
  // Zombies en feu (une flamme qui suit chaque zombie qui brûle)
  for (let i = 0; i < 28; i++){
    const s = new THREE.Sprite(nf(new THREE.SpriteMaterial({ map: glowTex, color: 0xff7a20, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: .9 })));
    s.visible = false; scene.add(s); ARM.burns.push(s);
  }
})();
const armBoomLight = new THREE.PointLight(0xff8a30, 0, 40, 2); scene.add(armBoomLight);
function armFree(a){ for (const o of a) if (!o.m.visible) return o; return null; }
// Centre du corps d'un zombie (vraie hauteur : volants, sauteurs en l'air)
function armCenter(z, out){ return out.set(z.g.position.x, z.g.position.y + (z.aimY != null ? z.aimY : 1.1), z.g.position.z); }

/* ---------- Départ des projectiles : du bout de l'arme vers ce que vise le réticule ---------- */
function armAim(out){
  fwd.set(0, 0, -1).applyQuaternion(camera.quaternion);
  ray.set(camera.position, fwd); ray.far = 260;
  const hits = ray.intersectObjects(hitMeshes, false);
  for (const h of hits){ const z = h.object.userData.z; if ((z && !z.dead) || h.object.userData.onHit){ return out.copy(h.point); } }
  if (fwd.y < -.01) return out.copy(camera.position).addScaledVector(fwd, Math.min(260, -camera.position.y / fwd.y));
  return out.copy(camera.position).addScaledVector(fwd, 200);
}
function armMuzzle(out){
  // Un peu à droite et sous l'œil, moins quand on vise
  const k = 1 - ads * .8;
  armRight.set(1, 0, 0).applyQuaternion(camera.quaternion);
  fwd.set(0, 0, -1).applyQuaternion(camera.quaternion);
  armTmp2.set(0, 1, 0).applyQuaternion(camera.quaternion);
  return out.copy(camera.position).addScaledVector(fwd, 1).addScaledVector(armRight, .22 * k).addScaledVector(armTmp2, -.18 * k);
}
function armLaunch(id){
  const W = WEAPONS[id], pool = W.kind === 'rocket' ? ARM.rockets : ARM.bolts;
  let o = armFree(pool);
  if (!o){ o = pool[0]; for (const p of pool) if (p.life > o.life) o = p; } // le plus vieux est recyclé
  armMuzzle(o.m.position); armAim(armPt);
  armDir.copy(armPt).sub(o.m.position);
  if (armDir.lengthSq() < 1) armDir.set(0, 0, -1).applyQuaternion(camera.quaternion);
  armDir.normalize();
  o.v.copy(armDir).multiplyScalar(W.speed * accK(id, 'speed')); // propulseur (34-arsenal.js)
  armTmp.copy(o.m.position).add(armDir); o.m.lookAt(armTmp); o.m.rotateY(Math.PI); // l'avant du modèle (z négatif) vers la cible
  o.m.visible = true; o.life = 0; o.id = id;
  if (W.kind === 'bolt'){ o.stuck = 0; o.left = wPierce(id); o.seen.length = 0; }
  else { o.smokeT = 0; }
  ARM.active = true;
}

/* ---------- Lance-flammes : cône court, dégâts directs et brûlure ---------- */
function armFlame(id){
  const W = WEAPONS[id], range = W.range * accK(id, 'range'), cone = W.cone * accK(id, 'cone'), dmg = wDmg(id); // buses (34-arsenal.js)
  fwd.set(0, 0, -1).applyQuaternion(camera.quaternion);
  const minZ = BAR_Z - range; // jusqu'à environ 30 m de la barricade
  let any = false;
  for (const z of zombies){
    if (z.dead || z.g.position.z < minZ) continue;
    armCenter(z, armTmp).sub(camera.position);
    const d = armTmp.length(); if (d < .5) continue;
    const big = .7 * ((ZTYPES[z.type] || {}).scale || 1); // les gros zombies sont plus faciles à toucher
    const cosA = armTmp.dot(fwd) / d;
    if (cosA < Math.cos(cone + Math.atan(big / d))) continue;
    damage(z, dmg, false, armCenter(z, armPt));
    any = true;
    if (!z.dead) armIgnite(z, id);
  }
  if (any) hitmT = .08;
  // Flammes visibles : 2 par souffle, elles avancent et grossissent
  const muzzle = armMuzzle(armMz), reach = Math.min(42, Math.hypot(camera.position.y, camera.position.z - minZ));
  for (let i = 0; i < 2; i++){
    const f = armFree(ARM.flames); if (!f) break;
    f.m.position.copy(muzzle);
    f.v.set(rand(-1, 1) * cone * .8, rand(-1, 1) * cone * .8, -1).normalize().applyQuaternion(camera.quaternion);
    f.max = f.life = rand(.45, .6); f.v.multiplyScalar(reach / f.max * rand(.75, 1));
    f.size = rand(.8, 1.3); f.m.scale.set(.3, .3, 1); f.m.material.opacity = 1; f.m.material.rotation = Math.random() * 6; f.m.visible = true;
  }
  ARM.active = true;
}
function armIgnite(z, id){
  const dur = wBurn(id), dps = wBurnDps(id);
  z.burnT = Math.max(z.burnT || 0, dur); z.burnDps = Math.max(z.burnDps || 0, dps);
  if (z.burnTick == null || z.burnTick <= 0) z.burnTick = .25;
  ARM.active = true;
}

/* ---------- Explosion de roquette ---------- */
function armExplode(pos, id){
  const r = wRadius(id), dmg = wDmg(id);
  for (const z of zombies){
    if (z.dead) continue;
    // distance au corps entier (pieds à tête), pas seulement au centre
    const gp = z.g.position, top = gp.y + 2 * (z.aimY != null ? z.aimY : 1.1);
    const dy = pos.y < gp.y ? gp.y - pos.y : pos.y > top ? pos.y - top : 0;
    const dx = gp.x - pos.x, dz = gp.z - pos.z, d = Math.sqrt(dx * dx + dy * dy + dz * dz);
    if (d > r) continue;
    damage(z, dmg * (1 - .6 * d / r), false, armCenter(z, armPt));
  }
  const b = armFree(ARM.booms) || ARM.booms[0];
  b.m.position.copy(pos); b.size = r * 2.4; b.max = b.life = .55; b.m.scale.set(1, 1, 1); b.m.material.opacity = 1; b.m.visible = true;
  armBoomLight.position.copy(pos); armBoomLight.intensity = 6;
  burst(pos, 'dust', 16, 5); burst(pos, 'wood', 6, 4);
  const near = clamp(1 - pos.distanceTo(camera.position) / 60, 0, 1);
  shake = Math.max(shake, .25 + .7 * near);
  if (Snd.boom) Snd.boom(id === 'gl' ? .75 : 1); else { Snd.burst(500, 1, .95); Snd.tone(70, .8, 'sine', .7, 25); }
  hitmT = .12;
  ARM.active = true;
}

/* ---------- Chaque image de jeu ---------- */
function armStep(dt){
  // Minigun : les canons prennent de la vitesse tant que la gâchette est tenue
  if (S.cur === 'minigun'){
    const want = firing && reloadT <= 0 && S.ammo.minigun > 0;
    const was = spin;
    if (want) spin = Math.min(1, spin + dt / Math.max(.05, wSpin('minigun')));
    else spin = Math.max(0, spin - dt / 1.2);
    if (Snd.mgTick) Snd.mgTick(spin, want && spin >= 1); // moteur et rafale continue (01-son.js)
    else if (want && was === 0) Snd.tone(70, wSpin('minigun'), 'sawtooth', .06, 320);
  } else { spin = 0; if (Snd.mg) Snd.mgTick(0, false); }
  if (!ARM.active) return;
  let busy = false;
  // Carreaux
  for (const o of ARM.bolts){
    if (!o.m.visible) continue; busy = true;
    if (o.stuck > 0){ o.stuck -= dt; if (o.stuck <= 0) o.m.visible = false; continue; }
    o.life += dt;
    const p = o.m.position, step = o.v.length() * dt;
    armDir.copy(o.v).normalize();
    armRay.set(p, armDir); armRay.far = step;
    const hits = armRay.intersectObjects(hitMeshes, false);
    let stop = false;
    for (const h of hits){
      if (h.object.userData.onHit){ if (o.seen.indexOf(h.object) < 0){ o.seen.push(h.object); h.object.userData.onHit(h.point, wDmg(o.id)); } continue; } // 23-rue.js
      const z = h.object.userData.z; if (!z || z.dead || o.seen.indexOf(z) >= 0) continue;
      o.seen.push(z);
      const head = h.object.userData.head, W = WEAPONS[o.id];
      if (h.object.userData.weak && typeof weakHit === 'function') weakHit(z, h.object, wDmg(o.id), h.point); // point faible (07-zombies.js)
      else damage(z, wDmg(o.id) * (head ? headMult() * (W.headX || 1) : 1), head, h.point);
      hitmT = .12; Snd.hit();
      if (--o.left <= 0){ p.copy(h.point); stop = true; break; }
    }
    if (stop){ o.stuck = .05; continue; }
    p.addScaledVector(o.v, dt); o.v.y -= 2.5 * dt; // chute légère
    if (p.y <= .03){ p.y = .03; o.stuck = 1.2; burst(p, 'dust', 3, 1.2); continue; } // planté dans le sol
    if (o.life > 2.5) o.m.visible = false;
  }
  // Roquettes
  for (const o of ARM.rockets){
    if (!o.m.visible) continue; busy = true;
    o.life += dt;
    const p = o.m.position, step = o.v.length() * dt;
    armDir.copy(o.v).normalize();
    armRay.set(p, armDir); armRay.far = step;
    const hits = armRay.intersectObjects(hitMeshes, false);
    let at = null;
    for (const h of hits){ const z = h.object.userData.z; if ((z && !z.dead) || h.object.userData.onHit){ at = h.point; break; } }
    if (!at){
      p.addScaledVector(o.v, dt);
      // Fusée de proximité : explose en frôlant un zombie (volants qui louvoient, sauteurs en l'air)
      for (const z of zombies){
        if (z.dead || Math.abs(z.g.position.z - p.z) > 4) continue;
        const r = .9 + .5 * ((ZTYPES[z.type] || {}).scale || 1);
        if (armCenter(z, armTmp).distanceToSquared(p) < r * r){ at = p; break; }
      }
    }
    if (!at){
      if (p.y <= .1){ p.y = .1; at = p; }
      else if (o.life > 5 || p.z < -200) at = p;
    }
    o.tail.material.rotation = Math.random() * 6; const ts = rand(.9, 1.4); o.tail.scale.set(ts, ts, 1);
    o.smokeT -= dt; if (o.smokeT <= 0){ o.smokeT = .05; armTmp.copy(p).addScaledVector(armDir, -.7); burst(armTmp, 'dust', 1, .4); }
    if (at){ armTmp.copy(at); o.m.visible = false; armExplode(armTmp, o.id); }
  }
  // Flammes
  for (const f of ARM.flames){
    if (!f.m.visible) continue; busy = true;
    f.life -= dt; if (f.life <= 0){ f.m.visible = false; continue; }
    f.m.position.addScaledVector(f.v, dt);
    if (f.m.position.y < .3){ f.m.position.y = .3; f.v.y = Math.abs(f.v.y) * .2; }
    const u = 1 - f.life / f.max, s = (.4 + 3.2 * u) * f.size;
    f.m.scale.set(s, s, 1); f.m.material.opacity = Math.min(1, 1.6 * (1 - u));
    f.m.material.color.setRGB(1, .8 - .5 * u, .4 - .35 * u);
  }
  // Explosions
  for (const b of ARM.booms){
    if (!b.m.visible) continue; busy = true;
    b.life -= dt; if (b.life <= 0){ b.m.visible = false; continue; }
    const u = 1 - b.life / b.max, s = b.size * (.3 + .9 * Math.sqrt(u));
    b.m.scale.set(s, s, 1); b.m.material.opacity = 1 - u;
  }
  if (armBoomLight.intensity > 0){ armBoomLight.intensity = Math.max(0, armBoomLight.intensity - dt * 20); if (armBoomLight.intensity > 0) busy = true; }
  // Brûlure : dégâts par petits coups (4 par seconde), une flamme suit chaque zombie
  let bi = 0;
  for (const z of zombies){
    if (!(z.burnT > 0)) continue;
    if (z.dead){ z.burnT = 0; continue; }
    busy = true;
    z.burnT -= dt; z.burnTick -= dt;
    if (z.burnTick <= 0){
      const tick = .25 - z.burnTick; z.burnTick = .25;
      damage(z, z.burnDps * Math.min(tick, .5), false, armCenter(z, armPt));
      if (z.dead) continue;
    }
    if (z.burnT <= 0){ z.burnT = 0; z.burnDps = 0; continue; }
    if (bi < ARM.burns.length){
      const s = ARM.burns[bi++], sc = (ZTYPES[z.type] || {}).scale || 1;
      armCenter(z, s.position); s.position.y += .2 * sc;
      const k = (1.2 + Math.random() * .5) * sc; s.scale.set(k, k * 1.4, 1); s.material.rotation = Math.random() * .6 - .3; s.visible = true;
    }
  }
  for (; bi < ARM.burns.length; bi++) ARM.burns[bi].visible = false;
  ARM.active = busy;
}
// Arme en main : canons du minigun qui tournent, roquette visible seulement si chargée, veilleuse qui vacille
function armVisual(dt){
  if (!S) return;
  const ud = VMS[S.cur] && VMS[S.cur].userData; if (!ud) return;
  if (ud.barrels) ud.barrels.rotation.z += dt * spin * 40;
  if (ud.warhead) ud.warhead.visible = S.ammo[S.cur] > 0 && reloadT <= 0;
  if (ud.bolt) ud.bolt.visible = S.ammo[S.cur] > 0 && (reloadT <= 0) && cool < .3;
  if (ud.pilot){ const k = .8 + Math.random() * .5; ud.pilot.scale.set(k, k, k); }
}
// Tout cacher : changement de ville, fin de partie, retour à la carte
function armClear(){
  ARM.bolts.forEach(o => { o.m.visible = false; o.life = 0; o.stuck = 0; o.seen.length = 0; });
  ARM.rockets.forEach(o => { o.m.visible = false; o.life = 0; });
  ARM.flames.forEach(f => { f.m.visible = false; f.life = 0; });
  ARM.booms.forEach(b => { b.m.visible = false; b.life = 0; });
  ARM.burns.forEach(s => { s.visible = false; });
  armBoomLight.intensity = 0; spin = 0; ARM.active = false;
}

/* ---------- Crochets sur le code commun (par réaffectation, comme 19-boss.js) ---------- */
try {
  const _updateArm = update;
  update = function(dt){ armStep(dt); return _updateArm(dt); };
} catch (e) {}
try {
  const _visualsArm = visuals;
  visuals = function(dt){
    const r = _visualsArm(dt);
    armVisual(dt);
    if (ARM.active && state !== 'playing' && state !== 'paused') armClear(); // fin de vague : plus rien en l'air
    return r;
  };
} catch (e) {}
try {
  const _clearZArm = clearZombies;
  clearZombies = function(){ const r = _clearZArm.apply(this, arguments); armClear(); return r; };
} catch (e) {}

// Accès pour les tests automatiques
window.__armes = { ARM, armLaunch, armFlame, armExplode, armIgnite, armStep, armClear, get spin(){ return spin; }, setSpin(v){ spin = v; },
  actifs(){ return ARM.bolts.filter(o => o.m.visible).length + ARM.rockets.filter(o => o.m.visible).length + ARM.flames.filter(o => o.m.visible).length; } };
