'use strict';
/* ================= Tir ================= */
const ray = new THREE.Raycaster();
const fwd = new THREE.Vector3();
function cur(){ return WEAPONS[S.cur]; }
function startReload(){
  if (reloadT > 0 || S.ammo[S.cur] >= magSize(S.cur)) return;
  reloadDur = reloadT = cur().reload * reloadMult(); Snd.reload();
}
function equip(id){
  if (!S.owned[id]) return;
  S.cur = id; reloadT = 0; cool = .25;
  Object.keys(VMS).forEach(k => VMS[k].visible = (k === id));
  VMS[id].add(flash); flash.position.set(0, .02, VMS[id].userData.muzzle);
  if (!S.ammo[id] && S.ammo[id] !== 0) S.ammo[id] = magSize(id);
}
function swapNext(dir){
  const owned = WORDER.filter(id => S.owned[id]); if (owned.length < 2) return;
  const i = owned.indexOf(S.cur); equip(owned[(i + (dir || 1) + owned.length) % owned.length]);
}
let flashT = 0, hitmT = 0;
function fire(){
  const W = cur();
  S.ammo[S.cur]--; cool = 1 / (W.rate * (1 + .05 * T('trigger')));
  recoilAcc += W.recoil * (zoomed ? .6 : 1); kick = 1;
  flash.visible = true; flash.material.rotation = Math.random() * 6; const fs = W.id === 'shotgun' ? .55 : .35; flash.scale.set(fs, fs, 1);
  muzzleLight.intensity = 3; vmFlashLight.intensity = 2; flashT = .05;
  Snd.shot(W.id);
  let anyHit = false, anyHead = false;
  const origin = camera.position;
  for (let p = 0; p < W.pellets; p++){
    const sp = W.spread * (zoomed ? .45 : 1);
    fwd.set(rand(-1, 1) * sp, rand(-1, 1) * sp, -1).normalize().applyQuaternion(camera.quaternion);
    ray.set(origin, fwd); ray.far = 260;
    const hits = ray.intersectObjects(hitMeshes, false);
    let pierced = 0; const seen = new Set();
    for (const h of hits){
      const z = h.object.userData.z; if (!z || z.dead || seen.has(z)) continue;
      seen.add(z);
      const head = h.object.userData.head;
      damage(z, W.dmg * dmgMult() * (head ? headMult() : 1), head, h.point);
      anyHit = true; if (head) anyHead = true;
      if (++pierced >= W.pierce) break;
    }
    if (!pierced && fwd.y < -0.01){
      const t = -origin.y / fwd.y; tmpV.copy(origin).addScaledVector(fwd, t);
      if (p % 3 === 0) burst(tmpV, 'dust', 3, 1.5);
    }
  }
  if (anyHit){ hitmT = .12; Snd.hit(); }
  if (S.ammo[S.cur] <= 0) setTimeout(() => { if (state === 'playing') startReload(); }, 180);
}
