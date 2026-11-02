'use strict';
/* ================= Particules ================= */
const PGEO = new THREE.BoxGeometry(.1, .1, .1);
const PMATS = { blood: new THREE.MeshBasicMaterial({ color: 0x7a0e0c }), dust: new THREE.MeshBasicMaterial({ color: 0x8a7a68 }), wood: new THREE.MeshBasicMaterial({ color: 0x8a6238 }) };
const parts = [];
for (let i = 0; i < 180; i++){ const m = new THREE.Mesh(PGEO, PMATS.blood); m.visible = false; scene.add(m); parts.push({ m, v: new THREE.Vector3(), life: 0, max: 1 }); }
let pIdx = 0;
function burst(pos, type, n, spd){
  for (let i = 0; i < n; i++){
    const p = parts[pIdx]; pIdx = (pIdx + 1) % parts.length;
    p.m.material = PMATS[type]; p.m.visible = true; p.m.position.copy(pos);
    p.v.set(rand(-1, 1) * spd, rand(.3, 1.2) * spd, rand(-1, 1) * spd);
    p.max = p.life = rand(.5, .9); const s = rand(.6, 1.5); p.m.scale.set(s, s, s);
  }
}
function updateParts(dt){
  for (const p of parts){
    if (!p.m.visible) continue;
    p.life -= dt; if (p.life <= 0){ p.m.visible = false; continue; }
    if (p.m.position.y > .03){ p.v.y -= 12 * dt; p.m.position.addScaledVector(p.v, dt); } else p.m.position.y = .03;
    const k = Math.max(.15, p.life / p.max); p.m.scale.setScalar(k * 1.2);
  }
}
