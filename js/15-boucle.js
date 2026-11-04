'use strict';
/* ================= Boucle ================= */
let last = performance.now(), time = 0;
function update(dt){
  yaw = clamp(yaw, -YAW_MAX, YAW_MAX); pitch = clamp(pitch, PITCH_MIN, PITCH_MAX);
  recoilAcc *= Math.exp(-7 * dt);
  // Armes
  cool -= dt;
  if (reloadT > 0){ reloadT -= dt; if (reloadT <= 0){ reloadT = 0; S.ammo[S.cur] = magSize(S.cur); } }
  if (firing && cool <= 0 && reloadT <= 0){
    if (S.ammo[S.cur] > 0) fire(); else { startReload(); cool = .3; }
  }
  // Apparitions
  if (plan.queue.length){
    spawnT -= dt;
    let alive = zAliveCount();
    if (spawnT <= 0 && alive < plan.maxAlive){
      // plan.burst : plusieurs zombies par sortie (mode horde, hordePlan dans 06-donnees.js) ; 1 dans la campagne
      for (let k = plan.burst || 1; k > 0 && alive < plan.maxAlive && plan.queue.length; k--){ spawnZombie(plan.queue.pop()); alive = zAliveCount(); } // recompté : un chef de meute amène ses petits
      spawnT = plan.interval * rand(.6, 1.4);
    }
  }
  updateZombies(dt);
  if (typeof defUpdate === 'function') defUpdate(dt); // défenses automatiques (17-defenses.js)
  groanT -= dt;
  if (groanT <= 0){ groanT = rand(1.5, 4); if (zAliveCount() > 0) Snd.groan(); }
  if (S.bar <= 0 && overT < 0){ overT = 1.1; shake = 1; firing = false; banner('Ils passent !', '', 1200); }
  if (overT > 0){ overT -= dt; if (overT <= 0) gameOver(); return; }
  if (!plan.queue.length && zAliveCount() === 0){
    if (endT < 0){ endT = 1.4; if (S.wave >= curLoc.waves) banner(curLoc.name + ' libérée !', '', 1400); else banner('Vague ' + S.wave + ' tenue', '', 1400); }
    else { endT -= dt; if (endT <= 0) endWave(); }
  }
}
function visuals(dt){
  time += dt;
  fires.forEach(f => { f.light.intensity = f.base * (0.75 + Math.random() * .4); f.cones.forEach((c, i) => { c.scale.y = .8 + Math.sin(time * 9 + i * 2) * .25 + Math.random() * .1; }); });
  updateParts(dt);
  if (typeof defFrame === 'function') defFrame(dt);
  if (flashT > 0){ flashT -= dt; if (flashT <= 0){ flash.visible = false; muzzleLight.intensity = 0; vmFlashLight.intensity = 0; } }
  if (hitmT > 0) hitmT -= dt;
  kick *= Math.exp(-14 * dt);
  shake *= Math.exp(-6 * dt);
  const targetFov = (zoomed && state === 'playing') ? baseFov * (WEAPONS[S ? S.cur : 'pistol'].zoomFov * (S ? accK(S.cur, 'zoom') : 1) / 70) : baseFov;
  if (Math.abs(camera.fov - targetFov) > .05){ camera.fov += (targetFov - camera.fov) * Math.min(1, dt * 14); camera.updateProjectionMatrix(); }
  const sx = (Math.random() - .5) * shake * .05, sy = (Math.random() - .5) * shake * .05;
  camera.rotation.set(pitch + recoilAcc + sy, yaw + sx, 0);
  // Arme en main : on l'amène à l'œil quand on vise
  const rl = reloadT > 0 && reloadDur > 0 ? Math.sin((1 - reloadT / reloadDur) * Math.PI) : 0;
  const wantAds = zoomed && state === 'playing' && reloadT <= 0 ? 1 : 0;
  ads += (wantAds - ads) * Math.min(1, dt * 11);
  if (Math.abs(ads - wantAds) < .002) ads = wantAds;
  const ud = S ? VMS[S.cur].userData : VMS.pistol.userData;
  const hx = VM_POS.x, hy = VM_POS.y, hz = VM_POS.z;
  const ax = 0, ay = -ud.sightY * VM_SCALE, az = ud.adsZ;
  const bob = Math.sin(time * 1.6) * .004 * (1 - ads);
  vmRoot.position.set(hx + (ax - hx) * ads, hy + (ay - hy) * ads + bob, hz + (az - hz) * ads + kick * (.07 - .04 * ads));
  vmRoot.rotation.set(kick * (.18 - .12 * ads) - rl * .7, 0, rl * .3);
  vmRoot.visible = !(S && S.cur === 'sniper' && ads > .85);
  if (typeof vmAnim === 'function') vmAnim(dt); // culasse, pompe, chargeur, douilles, respiration (04-arme-en-main.js)
}
function loop(t){
  requestAnimationFrame(loop);
  const dt = Math.min(.05, (t - last) / 1000); last = t;
  if (state === 'playing' && S) update(dt);
  visuals(dt);
  if (S && state !== 'menu') updateHUD();
  renderer.clear();
  renderer.render(scene, camera);
  renderer.clearDepth();
  renderer.render(vmScene, vmCam);
}
// Écran titre : la caméra balaie la rue doucement
buildWorld(curLoc); newGame(); plan = wavePlan(1);
requestAnimationFrame(loop);

// Accès pour les tests automatiques
window.__game = { INT, intNext, intPrev, cityTotal, DEV_CAP, get cool(){ return cool; }, LOCS, TALENTS, P, startLocation, goMap, victory, addXP, xpNeed, renderMap, renderTalents, buildWorld, get curLoc(){ return curLoc; }, get world(){ return world; }, get state(){ return state; }, get S(){ return S; }, zombies, hitMeshes, WEAPONS, UPG, wavePlan, startWave, endWave, fire, equip, spawnZombie, damage, update, camera,
  get ads(){ return ads; }, visuals, updateHUD, startReload, setZoom(v){ zoomed = v; }, VMS, vmRoot, vmCam, canFS, toggleFS, get pitch(){ return pitch; }, setAim(y, p){ yaw = y; pitch = p; }, get yaw(){ return yaw; }, get plan(){ return plan; }, renderShop, newGame, magSize, repairCost };
