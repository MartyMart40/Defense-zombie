'use strict';
/* Mode RTS « Guerre des robots », suite : pilotage d'une unité à la première personne (ordi et cell) */
/* ---------- Pilotage à la première personne ---------- */
// Robots, tank et hélicoptère : on avance dans la direction du regard ; avions : toujours en avant, on vire à gauche ou à droite.
const RTS_EYE = { rob:2.6, tank:3.1, heli:.4, air:.6, big:5.4, gun:-1.6 };
function rtsPilot(u){
  if (!u || u.dead || state !== 'rts' || !RTS.on) return false;
  if (RTS.pilot) rtsUnpilot();
  rtsCancelPlace(); RTS.pilot = u; RTS.sel.length = 0; RTS.sel.push(u); RTS.bsel = null;
  const P2 = RTS.pv; P2.yaw = u.head + Math.PI; P2.pitch = u.U.kind === 'air' ? -.35 : u.U.kind === 'heli' ? -.4 : -.12; P2.fire = P2.fire2 = false; RTS.spin = 0;
  P2.joy.dx = P2.joy.dy = 0; P2.joy.id = P2.aim.id = null; Object.keys(P2.mv).forEach(k => { P2.mv[k] = 0; });
  u.m.visible = false; if (u.legs) u.legs.forEach(l => { l.visible = false; }); if (u.rotor) u.rotor.visible = false; if (u.g.userData.tail) u.g.userData.tail.visible = false;
  u.hpb.bg.visible = u.hpb.fg.visible = false; u.ring.visible = false;
  rtsInfo.classList.add('hide');
  document.body.classList.add('piloting'); rtsUI.classList.add('piloting'); rtsPilotUI.classList.remove('hide'); rtsPilotUI.classList.toggle('touch', isTouch); $('cross').classList.remove('hide');
  $('rtrpName').textContent = '🎮 ' + u.U.name;
  rtsPilotUI.classList.toggle('w2', !!u.U.w2 || !!u.U.w2n); $('rtrpFire').textContent = u.U.w1 || 'Tir'; $('rtrpFire2').textContent = u.U.w2 ? u.U.w2.name : (u.U.w2n || '');
  rtsPilotUI.classList.toggle('ac', !!u.U.gunship);
  if (u.U.gunship){
    const c = u.oc || [u.g.position.x, u.g.position.z - 30]; RTS.acC = { x:c[0], z:c[1] };
    const gp = u.g.position, dx = RTS.acC.x - gp.x, dz = RTS.acC.z - gp.z;
    P2.yaw = Math.atan2(-dx, -dz); P2.pitch = -Math.atan2(gp.y, Math.hypot(dx, dz) || 1);
    RTS.fov0 = camera.fov; camera.fov = 38; camera.updateProjectionMatrix(); canvas.classList.add('rt-ac');
  }
  rtsPilotUI.classList.toggle('rp-mech', !!u.U.big);
  if (typeof rtsPosteOn === 'function') rtsPosteOn(u); // poste de pilotage (js/54-rts-postes.js)
  if (!isTouch && typeof lockPointer === 'function') lockPointer();
  return true;
}
// Contrôle d'une tourelle (ou du mortier) : vue derrière la tête de la tourelle, on vise et on tire
function rtsTurretPilot(o){
  if (!o || o.dead || !o.B.turret || state !== 'rts') return false;
  if (RTS.pilot) rtsUnpilot();
  rtsCancelPlace(); RTS.pilot = o; RTS.sel.length = 0; RTS.bsel = null; o.ring.visible = false;
  const P2 = RTS.pv; P2.yaw = (o.head ? o.head.rotation.y : 0) + Math.PI; P2.pitch = o.B.turret.splash ? -.45 : -.08; P2.fire = P2.fire2 = false;
  P2.joy.dx = P2.joy.dy = 0; P2.joy.id = P2.aim.id = null;
  rtsInfo.classList.add('hide');
  document.body.classList.add('piloting'); rtsUI.classList.add('piloting'); rtsPilotUI.classList.remove('hide'); rtsPilotUI.classList.toggle('touch', isTouch); $('cross').classList.remove('hide');
  rtsPilotUI.classList.remove('w2', 'ac'); rtsPilotUI.classList.add('tur'); $('rtrpFire').textContent = 'Tir'; $('rtrpName').textContent = '🎮 ' + o.B.name;
  if (o.B.turret.splash){ RTS.mortRing = new THREE.Mesh(new THREE.RingGeometry(.86, 1, 40), new THREE.MeshBasicMaterial({ color:0xffd040, transparent:true, opacity:.9, depthWrite:false, side:THREE.DoubleSide })); RTS.mortRing.rotation.x = -Math.PI / 2; scene.add(RTS.mortRing); }
  if (!isTouch && typeof lockPointer === 'function') lockPointer();
  return true;
}
// Où tombera l'obus du mortier : là où vise le centre de l'écran, entre la portée mini et maxi
function rtsMortarSpot(o){
  rtsTurretCam(); camera.updateMatrixWorld(); rtsRay.setFromCamera(new THREE.Vector2(0, 0), camera);
  const O = rtsRay.ray.origin, d = rtsRay.ray.direction, rng = rtsTStat(o, 'range'), mn = o.B.turret.min || 0;
  let x, z;
  if (d.y < -1e-3){ const t = -O.y / d.y; x = O.x + d.x * t; z = O.z + d.z * t; } else { x = O.x + d.x * rng; z = O.z + d.z * rng; }
  let dx = x - o.x, dz = z - o.z, L = Math.hypot(dx, dz) || 1; const k = clamp(L, mn, rng) / L;
  return { x:o.x + dx * k, z:o.z + dz * k };
}
function rtsTurretStep(dt){
  const o = RTS.pilot, P2 = RTS.pv, T = o.B.turret;
  P2.pitch = clamp(P2.pitch, -1.1, .35);
  if (o.head) o.head.rotation.y = P2.yaw + Math.PI;
  o.cd -= dt;
  const firing = P2.fire || (isTouch && P2.aim.id !== null);
  const S2 = Object.assign({}, T, { dmg:rtsTStat(o, 'dmg'), range:rtsTStat(o, 'range') });
  if (T.splash){
    const sp = rtsMortarSpot(o); RTS.mortSpot = sp;
    if (RTS.mortRing){ RTS.mortRing.position.set(sp.x, .15, sp.z); RTS.mortRing.scale.setScalar(S2.splash); RTS.mortRing.material.opacity = .55 + .35 * Math.sin(RTS.t * 8); }
    if (firing && o.cd <= 0){
      o.cd = 1 / rtsTStat(o, 'rate'); rtsShotSnd('gl'); burst(rtsV.set(o.x, 3, o.z), 'dust', 6, 3);
      RTS.shells.push({ x:sp.x, z:sp.z, t:1 + Math.hypot(sp.x - o.x, sp.z - o.z) / 40, S2 }); // l'obus met un peu de temps à retomber
    }
    return;
  }
  if (firing && o.cd <= 0){ o.cd = 1 / rtsTStat(o, 'rate'); rtsPilotShot({ U:{}, g:{ position:new THREE.Vector3(o.x, 0, o.z) }, type:o.type }, S2); }
}
function rtsTurretCam(){
  const o = RTS.pilot, P2 = RTS.pv, mort = !!o.B.turret.splash, back = mort ? 7 : 2.2, up = mort ? 7 : 3.4;
  camera.position.set(o.x + Math.sin(P2.yaw) * back, up, o.z + Math.cos(P2.yaw) * back);
  camera.rotation.order = 'YXZ'; camera.rotation.set(P2.pitch, P2.yaw, 0);
}
function rtsUnpilot(){
  const u = RTS.pilot; RTS.pilot = null;
  if (typeof rtsPosteOff === 'function') rtsPosteOff();
  if (u && u.B){ // c'était une tourelle
    if (RTS.mortRing){ scene.remove(RTS.mortRing); RTS.mortRing.geometry.dispose(); RTS.mortRing = null; }
    rtsPilotUI.classList.remove('tur');
    RTS.pv.fire = RTS.pv.fire2 = false; RTS.pv.joy.id = RTS.pv.aim.id = null;
    RTS.cam.x = u.x; RTS.cam.z = u.z; RTS.sel.length = 0; RTS.bsel = null; rtsInfo.classList.add('hide');
    document.body.classList.remove('piloting'); rtsUI.classList.remove('piloting'); rtsPilotUI.classList.add('hide');
    const cr = $('cross'); if (cr) cr.classList.add('hide');
    if (typeof unlockPointer === 'function') unlockPointer();
    return;
  }
  RTS.pv.fire = RTS.pv.fire2 = false; RTS.pv.joy.id = RTS.pv.aim.id = null; RTS.pv.joy.dx = RTS.pv.joy.dy = 0; RTS.spin = 0;
  if (u && u.U && u.type === 'heli'){ try { if (typeof Snd === 'object' && Snd.mgTick) Snd.mgTick(0, false); } catch (e) { errNote(e); } }
  if (u && u.U.big){ try { if (typeof Snd === 'object' && Snd.mg) Snd.mgTick(0, false); if (typeof mechCk !== 'undefined') mechCk.visible = false; if (typeof mechArms === 'function') mechArms(); } catch (e) { errNote(e); } }
  if (u && !u.dead){
    u.m.visible = true; if (u.legs) u.legs.forEach(l => { l.visible = true; }); if (u.rotor) u.rotor.visible = true; if (u.g.userData.tail) u.g.userData.tail.visible = true;
    u.hpb.bg.visible = u.hpb.fg.visible = true; u.cmd = 'idle'; u.nest = null; u.retreat = false; u.tx = u.hx = u.g.position.x; u.tz = u.hz = u.g.position.z;
    RTS.cam.x = u.g.position.x; RTS.cam.z = u.g.position.z;
  }
  if (RTS.fov0){ camera.fov = RTS.fov0; camera.updateProjectionMatrix(); RTS.fov0 = 0; } canvas.classList.remove('rt-ac');
  RTS.sel.length = 0; RTS.bsel = null; if (typeof rtsInfo !== 'undefined' && rtsInfo) rtsInfo.classList.add('hide');
  document.body.classList.remove('piloting');
  if (rtsUI){ rtsUI.classList.remove('piloting'); rtsPilotUI.classList.add('hide'); }
  const cr = $('cross'); if (cr) cr.classList.add('hide');
  if (typeof unlockPointer === 'function') unlockPointer();
  camera.rotation.z = 0;
}
function rtsPilotStep(dt){
  if (RTS.pilot && RTS.pilot.B){ rtsTurretStep(dt); return; }
  const u = RTS.pilot, P2 = RTS.pv; if (!u || u.dead) return;
  const U = u.U, gp = u.g.position, spd = rtsStat(u, 'speed');
  P2.pitch = clamp(P2.pitch, -1.2, .5);
  const fwdIn = clamp(P2.mv.f - P2.mv.b - P2.joy.dy, -1, 1), sideIn = clamp(P2.mv.r - P2.mv.l + P2.joy.dx, -1, 1);
  if (U.kind === 'air' && typeof rtsRearmPilot === 'function') rtsRearmPilot(u, dt); // plein au-dessus d'un aérodrome
  if (U.gunship){
    const C = RTS.acC, sy = Math.sin(P2.yaw), cy = Math.cos(P2.yaw), mv = 14 * dt;
    C.x += (-sy * fwdIn + cy * sideIn) * mv; C.z += (-cy * fwdIn - sy * sideIn) * mv;
    C.x = clamp(C.x, -160, 160); C.z = clamp(C.z, RTS.zMin, 20);
    rtsGunshipFly(u, dt, C.x, C.z);
    // Les canons sont sur le flanc gauche : la visée reste où on l'a mise, dans un champ fixé à l'avion (js/54-rts-postes.js)
    if (typeof rtsAcCone === 'function') rtsAcCone(u);
  } else if (U.kind === 'air'){
    P2.yaw -= sideIn * U.turn * dt * 1.3;                                       // on vire
    const k = 1 + Math.max(0, fwdIn) * .4 - Math.max(0, -fwdIn) * .4;           // un peu plus ou moins vite
    gp.x += -Math.sin(P2.yaw) * spd * k * dt; gp.z += -Math.cos(P2.yaw) * spd * k * dt; gp.y += (U.alt - gp.y) * Math.min(1, dt);
    u.head = P2.yaw + Math.PI; u.g.rotation.set(0, u.head, sideIn * .5);
    rtsClampValley(gp, true);
  } else {
    const sy = Math.sin(P2.yaw), cy = Math.cos(P2.yaw), f = fwdIn * spd, s = sideIn * spd * .8;
    gp.x += (-sy * f + cy * s) * dt; gp.z += (-cy * f - sy * s) * dt;
    u.head = P2.yaw + Math.PI; u.g.rotation.y = u.head;
    if (U.kind === 'ground'){
      for (const o of RTS.blds){ if (o.dead) continue; const dx = gp.x - o.x, dz = gp.z - o.z, d = Math.hypot(dx, dz), m = u.r + o.r; if (d > 0 && d < m){ gp.x += dx / d * (m - d); gp.z += dz / d * (m - d); } }
      rtsClampValley(gp, false);
      if (Math.abs(fwdIn) + Math.abs(sideIn) > .1){ const was = Math.sin(u.step); u.step += dt * U.speed * 1.6; if (U.big && was > 0 !== Math.sin(u.step) > 0 && typeof mechStomp === 'function') mechStomp(); }
    } else { gp.y = U.alt; rtsClampValley(gp, true); }
  }
  // Tir : vers ce qui est au centre de l'écran (zombie, nid, sinon le sol)
  const firing = P2.fire || (isTouch && P2.aim.id !== null);
  const trig = (P2.fire || (isTouch && P2.aim.id !== null)) ? true : null;
  if (u.type === 'heli' && typeof rtsApacheGun === 'function') rtsApacheGun(u, dt, firing); // canon rotatif : montée en régime, grondement, secousses
  if (U.gunship || u.type === 'tank' || (u.type === 'heli' && (typeof rtsApacheGun !== 'function' || PT.spin >= .35))) rtsGat(u, dt, trig, true);
  if (U.gunship && (firing || P2.fire2) && typeof rtsPosteSet === 'function') rtsPosteSet(P2.fire2 ? 'c105' : 'c40'); // AC-130 : le poste de l'arme qui tire
  if (u.type === 'heli') rtsHellfire(u, dt, P2.fire2 ? true : null, true); // Apache : Hellfire sur le 2e bouton
  if (U.gunship && P2.fire2 && u.cd2 <= 0 && (typeof rtsAmmoUse !== 'function' || rtsAmmoUse(u, 'w2'))){ u.cd2 = 1 / rtsRate2(u); rtsPilotShot(u, rtsS2b(u), 0, 'w2'); shake = Math.max(shake, .25); if (typeof rtsPosteShot === 'function') rtsPosteShot(u, 'w2'); }
  if (U.big){ // minigun : elle monte en régime avant de tirer, avec le vrai son continu du mode robot
    RTS.spin = clamp(RTS.spin + (firing ? dt / .35 : -dt / .8), 0, 1);
    try { if (typeof Snd === 'object' && Snd.mgTick) Snd.mgTick(RTS.spin, firing && RTS.spin >= 1); } catch (e) { errNote(e); }
    if (P2.fire2 && u.cd2 <= 0){ u.cd2 = 1 / rtsRate2(u); rtsPilotShot(u, rtsS2b(u), 1.8); try { Snd.shot('rocket'); } catch (e) { errNote(e); } if (typeof mechFlashR !== 'undefined'){ mechFlashR.visible = true; setTimeout(() => { mechFlashR.visible = false; }, 70); } }
    if (firing && RTS.spin < 1) return;
  }
  if (!firing || u.cd > 0) return;
  if (U.kind === 'air' && typeof rtsAmmoUse === 'function' && !rtsAmmoUse(u, 'w1')) return; // à sec : retour à l'aérodrome
  u.cd = 1 / rtsStat(u, 'rate');
  if (typeof rtsPosteShot === 'function') rtsPosteShot(u, 'w1');
  const S2 = rtsS2(u);
  if (U.bomb){ rtsHit(rtsMuzzle(u, new THREE.Vector3()), { x:gp.x + rand(-1, 1), z:gp.z + rand(-1, 1) }, 'pt', S2); return; }
  if (U.gunship){ rtsPilotShot(u, S2, 0, 'w1'); return; }
  if (U.big) S2.snd = null; // le son vient de mgTick
  rtsPilotShot(u, S2, U.big ? -1.8 : 0, U.big ? null : 'w1');
}
// Un tir du joueur vers le centre de l'écran : zombie visé, nid, aide à la visée, sinon le sol
function rtsPilotShot(u, S2, side, kind){
  // Le départ du tir est devant et sous les yeux (sinon la traînée passe dans la caméra) ; bras gauche ou droit pour le Mech
  rtsPilotCam(); camera.updateMatrixWorld();
  const from = new THREE.Vector3(), fw = new THREE.Vector3(); camera.getWorldDirection(fw);
  from.copy(camera.position).addScaledVector(fw, 2.5); from.y -= u.U.big ? 1.2 : .8;
  if (side) from.add(rtsV3.set(-fw.z, 0, fw.x).normalize().multiplyScalar(side));
  if (kind && typeof rtsPosteMuzzle === 'function'){ const m = rtsPosteMuzzle(u, kind); if (m) from.copy(m); } // le tir part du bout du canon qu'on voit
  camera.updateMatrixWorld(); rtsRay.setFromCamera(new THREE.Vector2(0, 0), camera); rtsRay.far = 240;
  const hz = rtsRay.intersectObjects(hitMeshes, false).find(h => h.object.userData.z && !h.object.userData.z.dead);
  if (hz){ rtsHit(from, hz.object.userData.z, 'z', S2); return; }
  rtsRoot.updateMatrixWorld(true);
  const hn = rtsRay.intersectObjects(RTS.nests.filter(n => !n.dead).map(n => n.m), false)[0];
  if (hn){ rtsHit(from, hn.object.userData.rtsNest, 'nest', S2); return; }
  const o = rtsRay.ray.origin, d = rtsRay.ray.direction;
  // Aide à la visée : le zombie le plus proche de la ligne de mire (moins de 4°)
  let best = null, bc = Math.cos(.07);
  for (const q of zombies){
    if (q.dead) continue; rtsV3.set(q.g.position.x - o.x, q.g.position.y + (q.aimY || 1.1) - o.y, q.g.position.z - o.z);
    const L = rtsV3.length(); if (L > 200 || L < .5) continue;
    const c = rtsV3.dot(d) / L; if (c > bc){ bc = c; best = q; }
  }
  if (best){ rtsHit(from, best, 'z', S2); return; }
  const t = d.y < -1e-3 ? Math.min(-o.y / d.y, 200) : 120, px = o.x + d.x * t, pz = o.z + d.z * t;
  // Coup au sol : les zombies tout près du point visé sont touchés aussi (tir un peu imprécis)
  const near = rtsNearestZ(px, pz, S2.splash ? 0 : 2.2);
  if (near) rtsHit(from, near, 'z', S2); else rtsHit(from, { x:px, z:pz }, 'pt', S2);
}
function rtsPilotCam(){
  const u = RTS.pilot; if (!u) return;
  if (u.B){ rtsTurretCam(); return; }
  const P2 = RTS.pv, gp = u.g.position, U = u.U, cat = U.cat === 'rob' ? 'rob' : u.type === 'tank' ? 'tank' : U.kind === 'heli' ? 'heli' : 'air';
  const bob = cat === 'rob' ? Math.abs(Math.sin(u.step * 2)) * .12 : 0;
  const ey = U.gunship ? gp.y + RTS_EYE.gun : U.big ? RTS_EYE.big + Math.sin(u.step * 2) * .09 : (U.kind === 'ground' ? RTS_EYE[cat] * (cat === 'rob' ? RTS_SC * (u.type === 'heavy' ? 1.5 : 1) : 1) : gp.y + RTS_EYE[cat]) + bob;
  camera.position.set(gp.x - Math.sin(P2.yaw) * .4, ey, gp.z - Math.cos(P2.yaw) * .4);
  camera.rotation.order = 'YXZ'; camera.rotation.set(P2.pitch, P2.yaw, U.gunship ? 0 : U.kind === 'air' ? u.g.rotation.z * .5 : 0);
  if (U.gunship && typeof rtsPosteCam === 'function') rtsPosteCam(u); // AC-130 au cockpit
}
