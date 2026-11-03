'use strict';
/* ================= Tir ================= */
// Armes à balles : rayon instantané ici. Carreaux, roquettes et flammes : 20-armes.js (armLaunch, armFlame).
const ray = new THREE.Raycaster();
const fwd = new THREE.Vector3();
function cur(){ return WEAPONS[S.cur]; }
function startReload(){
  if (reloadT > 0 || S.ammo[S.cur] >= magSize(S.cur)) return;
  reloadDur = reloadT = wReload(S.cur); Snd.reload();
  if (S.cur === 'minigun') Snd.tone(300, .5, 'sawtooth', .05, 60);
}
function equip(id){
  if (!S.owned[id] || !VMS[id]) return;
  S.cur = id; reloadT = 0; cool = .25; spin = 0;
  Object.keys(VMS).forEach(k => VMS[k].visible = (k === id));
  VMS[id].add(flash); flash.position.set(0, .02, VMS[id].userData.muzzle);
  if (!S.ammo[id] && S.ammo[id] !== 0) S.ammo[id] = magSize(id);
}
function swapNext(dir){
  const owned = WORDER.filter(id => S.owned[id]); if (owned.length < 2) return;
  const i = owned.indexOf(S.cur); equip(owned[(i + (dir || 1) + owned.length) % owned.length]);
}
// Sons des nouvelles armes (avec les outils de Snd, sans toucher 01-son.js)
const SHOT_SND = {
  crossbow(){ Snd.tone(520, .09, 'triangle', .07, 160); Snd.burst(3200, .05, .06); }, // presque silencieuse
  flamer(){ Snd.burst(650, .14, .1); },
  minigun(){ Snd.burst(2600, .07, .22); Snd.tone(130, .06, 'sine', .14, 50); },
  rocket(){ Snd.burst(900, .55, .6); Snd.tone(240, .5, 'sawtooth', .1, 80); }
};
// Snd.shot (01-son.js) a un son en couches par arme ; SHOT_SND sert de secours pour une arme qu'il ne connaît pas
function shotSound(id){ if (Snd.shot(id) === true) return; if (SHOT_SND[id]) SHOT_SND[id](); }
let flashT = 0, hitmT = 0;
let spin = 0; // montée en régime du minigun (0 à 1), tenue à jour par 20-armes.js
function fire(){
  const id = S.cur, W = cur();
  if (W.spin && spin < 1){ cool = 0; return false; } // les canons tournent encore : pas de balle
  S.ammo[id]--;
  const iv = 1 / wRate(id);
  cool = W.rate >= 10 ? Math.max(cool, -iv) + iv : iv; // cadence élevée : garde le reste d'une image à l'autre
  recoilAcc += W.recoil * (zoomed ? .6 : 1); kick = W.kick != null ? W.kick : 1;
  if (W.spin) shake = Math.max(shake, .07);
  const fs = { shotgun:.55, rocket:.85, flamer:.28, crossbow:0 }[id];
  if (fs !== 0){
    flash.visible = true; flash.material.rotation = Math.random() * 6; const s = fs || .35; flash.scale.set(s, s, 1);
    muzzleLight.intensity = W.kind === 'flame' ? 2 : 3; vmFlashLight.intensity = 2; flashT = .05;
  }
  shotSound(id);
  if (W.kind === 'bolt' || W.kind === 'rocket'){ if (typeof armLaunch === 'function') armLaunch(id); }
  else if (W.kind === 'flame'){ if (typeof armFlame === 'function') armFlame(id); }
  else {
    let anyHit = false;
    const origin = camera.position, n = wPellets(id), sp0 = wSpread(id), pierce = wPierce(id), dmg = wDmg(id);
    for (let p = 0; p < n; p++){
      const sp = sp0 * (zoomed ? .45 : 1);
      fwd.set(rand(-1, 1) * sp, rand(-1, 1) * sp, -1).normalize().applyQuaternion(camera.quaternion);
      ray.set(origin, fwd); ray.far = 260;
      const hits = ray.intersectObjects(hitMeshes, false);
      let pierced = 0; const seen = new Set();
      for (const h of hits){
        if (h.object.userData.onHit){ h.object.userData.onHit(h.point, dmg); anyHit = true; if (++pierced >= pierce) break; continue; } // baril, caisse, civil (23-rue.js)
        const z = h.object.userData.z; if (!z || z.dead || seen.has(z)) continue;
        seen.add(z);
        const head = h.object.userData.head;
        if (h.object.userData.weak && typeof weakHit === 'function') weakHit(z, h.object, dmg, h.point); // point faible (07-zombies.js)
        else damage(z, dmg * (head ? headMult() : 1), head, h.point);
        anyHit = true;
        if (++pierced >= pierce) break;
      }
      if (!pierced && fwd.y < -0.01){
        const t = -origin.y / fwd.y; tmpV.copy(origin).addScaledVector(fwd, t);
        if (p % 3 === 0) burst(tmpV, 'dust', 3, 1.5);
      }
    }
    if (anyHit){ hitmT = .12; Snd.hit(); }
  }
  if (S.ammo[id] <= 0) setTimeout(() => { if (state === 'playing') startReload(); }, 180);
  return true;
}
