'use strict';
/* Arme en main, suite : douilles éjectées et animations (culasse, pompe, chargeur, respiration) */
/* ---------- Douilles éjectées : petit pool fixe, un seul appel de dessin (InstancedMesh) ---------- */
const VM_SHELL_N = 48; // assez pour une rafale de minigun (environ 20 douilles en l'air à la fois)
// Types : 0 pistolet, 1 cartouche rouge, 2 assaut, 3 sniper, 4 minigun, 5 calibre .50, 6 douille de grenade 40 mm, 7 sabot du canon électromagnétique
// (rayon, longueur, couleur)
const VM_SHELL_T = [[1, 1, 0xb08a3a], [2.1, 2.6, 0x9a2418], [.95, 1.7, 0xb08a3a], [1.25, 2.7, 0xb8923e], [1, 1.7, 0xa8823a], [1.7, 3.6, 0xc09440], [4.2, 2.6, 0x8a8a7a], [2.2, 2.2, 0x3a4048]];
const vmShells = (function(){
  const sb = vmNew(); vmCyl(sb, .0045, .016, 0xffffff, 0, 0, 0, 0, 0, 0, 6);
  const geo = vmGeo(sb); geo.deleteAttribute('color'); geo.deleteAttribute('uv');
  const mesh = new THREE.InstancedMesh(geo, vmShellMat, VM_SHELL_N);
  mesh.frustumCulled = false; mesh.visible = false; mesh.renderOrder = 3;
  const zero = new THREE.Matrix4().makeScale(0, 0, 0), c = new THREE.Color(1, 1, 1);
  const list = [];
  for (let i = 0; i < VM_SHELL_N; i++){ mesh.setMatrixAt(i, zero); mesh.setColorAt(i, c); list.push({ p: new THREE.Vector3(), v: new THREE.Vector3(), r: new THREE.Euler(), w: new THREE.Vector3(), life: 0, t: 0 }); }
  vmCam.add(mesh);
  return { mesh, list, dummy: new THREE.Object3D(), zero, col: c, next: 0 };
})();
function vmEject(id){
  const ud = VMS[id] && VMS[id].userData; if (!ud || !ud.eject) return;
  const P = vmShells, s = P.list[P.next]; P.next = (P.next + 1) % VM_SHELL_N; // le plus vieux est réutilisé
  VMS[id].updateWorldMatrix(true, false);
  s.p.copy(ud.eject).applyMatrix4(VMS[id].matrixWorld); vmCam.updateWorldMatrix(true, false); vmCam.worldToLocal(s.p);
  // Vers la droite, bien visible : en arc vers le haut (armes à culasse), en gerbe plus basse pour la minigun
  // (l'arme est déjà à droite de l'écran : les douilles montent d'abord en arc pour rester visibles un instant)
  if (ud.ejectDown) s.v.set(rand(.35, .65), rand(.75, 1.05), rand(-.05, .12));
  else s.v.set(rand(.4, .7), rand(.7, 1), rand(.02, .2));
  s.r.set(rand(0, 6), rand(0, 6), 0); s.w.set(rand(-25, 25), rand(-25, 25), rand(-8, 8));
  s.life = 1; s.t = ud.shell || 0;
  P.col.setHex(VM_SHELL_T[s.t][2]); P.mesh.setColorAt(P.list.indexOf(s), P.col); P.mesh.instanceColor.needsUpdate = true;
}
function vmShellStep(dt){
  const P = vmShells; let any = false;
  for (let i = 0; i < VM_SHELL_N; i++){
    const s = P.list[i]; if (s.life <= 0) continue;
    s.life -= dt;
    if (s.life <= 0){ P.mesh.setMatrixAt(i, P.zero); continue; }
    any = true;
    s.v.y -= 3.2 * dt; s.p.addScaledVector(s.v, dt);
    s.r.x += s.w.x * dt; s.r.y += s.w.y * dt; s.r.z += s.w.z * dt;
    const T = VM_SHELL_T[s.t], d = P.dummy;
    d.position.copy(s.p); d.rotation.copy(s.r); d.scale.set(T[0] * 1.35, T[0] * 1.35, T[1] * 1.35); d.updateMatrix(); // un peu plus grosses : bien visibles
    P.mesh.setMatrixAt(i, d.matrix);
  }
  if (any || P.mesh.visible) P.mesh.instanceMatrix.needsUpdate = true; // rien à envoyer quand le pool dort
  P.mesh.visible = any;
}
function vmShellClear(){ const P = vmShells; P.list.forEach((s, i) => { s.life = 0; P.mesh.setMatrixAt(i, P.zero); }); P.mesh.instanceMatrix.needsUpdate = true; P.mesh.visible = false; }

/* ---------- Animations : appelées par visuals() (15-boucle.js) après la pose de l'arme ---------- */
const VMA = { hooked: false, pumpT: -1, boltT: -1, slideK: 0, id: null, loadT: 0, fu: 0, fb: 0, fr: 0, vibT: 0, vib: 0, dec: 14 };
/* ---------- Sensation de chaque arme : purement visuel (modèle en main et champ de vision) ---------- */
// k : remplace kick (recul du modèle, 15-boucle.js) ; up : canon qui se relève (rad) ; back : modèle qui recule (m) ;
// roll : bascule de côté (rad, sens au hasard) ; dec : vitesse de retour (grand = sec) ; vib : tremblement (m) ;
// fov : « coup » dans le champ de vision (degrés), que 15-boucle.js ramène tout seul. Le rayon du tir part toujours
// du centre de la caméra : ni la visée ni W.recoil ne changent. « Effets de tir » coupé (PK.tir) : comme avant.
const VM_FEEL = {
  pistol:  { k: .75, up: .09, back: .012, roll: .02, dec: 30, fov: .3 },         // sec et bref
  shotgun: { k: 1.3, up: .22, back: .05, roll: .05, dec: 9, fov: 1.8 },           // lourd, retour lent
  rifle:   { k: .6, up: .035, back: .01, roll: .015, dec: 24, vib: .0015, fov: .15 },
  sniper:  { k: 1.25, up: .16, back: .05, roll: .03, dec: 8, fov: 1.2 },
  crossbow:{ k: .55, up: .05, back: -.008, roll: .01, dec: 12 },                  // corde qui claque, doux
  flamer:  { k: .12, vib: .0025, dec: 20 },
  minigun: { k: .3, up: .01, dec: 30, vib: .0065, fov: .12 },                     // vibre tant qu'il tire
  rocket:  { k: 1.2, up: .14, back: .07, roll: .03, dec: 6, fov: 2.4 },
  mg50:    { k: .55, up: .05, back: .015, roll: .02, dec: 16, vib: .004, fov: .45 },
  laser:   { k: .2, up: .01, dec: 30, vib: .001 },
  railgun: { k: 1.4, up: .22, back: .09, roll: .04, dec: 5, fov: 2.8 },
  gl:      { k: .8, up: .1, back: .04, roll: .03, dec: 10, fov: .9 },
  arc:     { k: .5, up: .06, back: .02, roll: .04, dec: 14, vib: .002, fov: .5 }
};
const vmFeelOn = () => typeof PK === 'undefined' || PK.tir !== false;
function vmFeel(id){
  const F = VM_FEEL[id]; if (!F || state !== 'playing' || !vmFeelOn()) return false;
  const a = ads > .5 ? .55 : 1; // à l'œil : plus retenu
  if (F.k != null) kick = F.k;
  VMA.fu = Math.min(.45, VMA.fu + (F.up || 0) * a);
  VMA.fb = Math.min(.12, VMA.fb + (F.back || 0) * a);
  VMA.fr = (Math.random() < .5 ? -1 : 1) * (F.roll || 0) * a;
  VMA.dec = F.dec || 14;
  if (F.vib){ VMA.vib = F.vib; VMA.vibT = .12; }
  if (F.fov && camera && camera.isPerspectiveCamera){ camera.fov += F.fov * (zoomed ? .35 : 1); camera.updateProjectionMatrix(); }
  return true;
}
// Chaque tir réel (fire() renvoie autre chose que false) déclenche les animations de l'arme
function vmShot(){
  if (!S) return;
  const id = S.cur, ud = VMS[id] && VMS[id].userData; if (!ud) return;
  vmFeel(id);
  if (ud.slide) VMA.slideK = 1;
  if (id === 'shotgun') VMA.pumpT = 0;
  else if (id === 'sniper') VMA.boltT = 0;
  else if (ud.eject) vmEject(id);
}
function vmHook(){
  VMA.hooked = true;
  try {
    const _fireVm = fire;
    fire = function(){ const r = _fireVm.apply(this, arguments); if (r !== false) vmShot(); return r; };
  } catch (e) { errNote(e); }
}
const vmSm = t => t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t);
function vmAnim(dt){
  if (!VMA.hooked) vmHook(); // une seule fois, quand tous les fichiers sont chargés
  vmShellStep(dt);
  if (!S) return;
  const id = S.cur, g = VMS[id]; if (!g) return;
  const ud = g.userData;
  if (VMA.id !== id){ VMA.id = id; VMA.pumpT = VMA.boltT = -1; VMA.slideK = 0; }
  if (flash.parent === g) flash.position.y = ud.muzzleY;
  const rel = reloadT > 0 && reloadDur > 0 ? 1 - reloadT / reloadDur : -1; // avancement de la recharge (0 à 1)
  // Sensation de l'arme (vmFeel) : canon qui se relève, recul, bascule, tremblement ; retour selon l'arme
  if (VMA.fu || VMA.fb || VMA.fr || VMA.vibT > 0){
    const e = Math.exp(-VMA.dec * dt);
    VMA.fu *= e; VMA.fb *= e; VMA.fr *= e;
    if (VMA.fu < 1e-4 && VMA.fb < 1e-4 && Math.abs(VMA.fr) < 1e-4) VMA.fu = VMA.fb = VMA.fr = 0;
    vmRoot.rotation.x += VMA.fu; vmRoot.rotation.z += VMA.fr; vmRoot.position.z += VMA.fb;
    if (VMA.vibT > 0){ VMA.vibT -= dt; const v = VMA.vib * (1 - .5 * ads); vmRoot.position.x += (Math.random() - .5) * v; vmRoot.position.y += (Math.random() - .5) * v; }
  }
  // Minigun : vibre aussi pendant la montée en régime, tant qu'on tient la détente
  if (id === 'minigun' && firing && state === 'playing' && spin > 0 && reloadT <= 0 && vmFeelOn()){
    const v = .003 * spin * (1 - .5 * ads); vmRoot.position.x += (Math.random() - .5) * v; vmRoot.position.y += (Math.random() - .5) * v;
  }
  // Légère respiration en visée
  if (ads > 0){ vmRoot.position.y += Math.sin(time * 1.3) * .0006 * ads; vmRoot.position.x += Math.sin(time * .7 + 1) * .0004 * ads; }
  // Glissière, culasse
  if (ud.slide){
    VMA.slideK = Math.max(0, VMA.slideK - dt * 16);
    let k = VMA.slideK;
    if (ud.slideLock && S.ammo[id] <= 0 && (rel < 0 || rel < .82)) k = 1; // chargeur vide : glissière ouverte
    ud.slide.position.z = ud.slideAmp * k;
  }
  // Chargeur qui descend puis remonte
  if (ud.mag){
    let d = 0;
    if (rel >= 0) d = rel < .25 ? vmSm(rel / .25) : rel < .55 ? 1 : 1 - vmSm((rel - .55) / .3);
    ud.mag.position.copy(ud.magBase).addScaledVector(ud.magDir, d * ud.magDrop);
    ud.mag.visible = d < .98;
  }
  // Fusil à pompe : pompe après le tir, cartouches glissées une à une pendant la recharge
  if (ud.pump){
    let k = 0;
    if (VMA.pumpT >= 0){
      const was = VMA.pumpT; VMA.pumpT += dt;
      const u = (VMA.pumpT - .12) / .36; k = u > 0 && u < 1 ? Math.sin(u * Math.PI) : 0;
      if (was < .3 && VMA.pumpT >= .3) vmEject(id);
      if (VMA.pumpT > .5) VMA.pumpT = -1;
    }
    ud.pump.position.z = ud.pumpBase + ud.pumpAmp * k;
    if (rel >= 0){
      const u = (rel * 3) % 1; ud.load.visible = rel < .96;
      ud.load.position.set(0, -.085 + .05 * vmSm(u / .7), -.06 - .035 * vmSm((u - .45) / .4));
    } else ud.load.visible = false;
  }
  // Sniper : levier relevé, culasse en arrière, puis refermée (après le tir et pendant la recharge)
  if (ud.boltM){
    let u = -1;
    if (VMA.boltT >= 0){ const was = VMA.boltT; VMA.boltT += dt; u = (VMA.boltT - .15) / .6; if (was < .5 && VMA.boltT >= .5) vmEject(id); if (VMA.boltT > .8) VMA.boltT = -1; }
    if (rel >= 0) u = rel < .2 ? rel / .2 * .5 : rel > .8 ? .5 + (rel - .8) / .2 * .5 : .5;
    let rot = 0, back = 0;
    if (u > 0 && u < 1){ const q = u < .5 ? u * 2 : (1 - u) * 2; rot = vmSm(q * 2.2) * 1.1; back = vmSm(q * 2.2 - 1.1) * .07; }
    ud.boltM.rotation.z = rot; ud.boltM.position.z = back;
  }
  // Arbalète : corde tendue quand le carreau est en place
  if (ud.strDrawn){ const on = S.ammo[id] > 0 && reloadT <= 0 && cool < .3; ud.strDrawn.visible = on; ud.strRel.visible = !on; }
  // Lance-flammes : aiguille du manomètre selon le carburant
  if (ud.needle){ const f = rel >= 0 ? rel : S.ammo[id] / Math.max(1, magSize(id)); ud.needle.rotation.x = 2.2 - f * 4.4; }
}
// Statistiques pour les tests : triangles et appels de dessin de l'arme équipée
function vmStats(id){
  const g = VMS[id]; if (!g) return null;
  let calls = 0, tris = 0;
  g.traverseVisible(m => { if (m.isMesh){ calls++; tris += m.geometry.attributes.position.count / 3; } });
  return { calls, tris, maxTris: g.userData.tris };
}
buildVM();
let ads = 0; // 0 = arme à la hanche, 1 = arme à l'œil
