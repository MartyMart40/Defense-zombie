'use strict';
/* ================= Particules ================= */
// Un seul InstancedMesh pour tout le pool (1 appel de dessin au lieu de 180) ; la couleur vient de PMATS[type].color.
// PMATS reste ouvert : un autre fichier peut y ajouter une couleur (ex. PMATS.ember dans 17-defenses.js).
const PGEO = new THREE.BoxGeometry(.1, .1, .1);
const PMATS = { blood: new THREE.MeshBasicMaterial({ color: 0x7a0e0c }), dust: new THREE.MeshBasicMaterial({ color: 0x8a7a68 }), wood: new THREE.MeshBasicMaterial({ color: 0x8a6238 }) };
const PN = 180;
const pIM = new THREE.InstancedMesh(PGEO, new THREE.MeshBasicMaterial({ color: 0xffffff }), PN);
pIM.setColorAt(0, pIM.material.color); pIM.instanceMatrix.setUsage(THREE.DynamicDrawUsage); pIM.instanceColor.setUsage(THREE.DynamicDrawUsage);
pIM.frustumCulled = false; pIM.count = 0; pIM.visible = false; scene.add(pIM);
const parts = [];
for (let i = 0; i < PN; i++) parts.push({ m: { visible: false, position: new THREE.Vector3(), s: 1, c: PMATS.blood.color }, v: new THREE.Vector3(), life: 0, max: 1 });
let pIdx = 0;
function burst(pos, type, n, spd){
  const M = PMATS[type] || PMATS.blood;
  for (let i = 0; i < n; i++){
    const p = parts[pIdx]; pIdx = (pIdx + 1) % parts.length;
    p.m.c = M.color; p.m.visible = true; p.m.position.copy(pos);
    p.v.set(rand(-1, 1) * spd, rand(.3, 1.2) * spd, rand(-1, 1) * spd);
    p.max = p.life = rand(.5, .9); p.m.s = rand(.6, 1.5);
  }
}
function updateParts(dt){
  const A = pIM.instanceMatrix.array, C = pIM.instanceColor.array; let n = 0;
  for (const p of parts){
    if (!p.m.visible) continue;
    p.life -= dt; if (p.life <= 0){ p.m.visible = false; continue; }
    const q = p.m.position;
    if (q.y > .03){ p.v.y -= 12 * dt; q.addScaledVector(p.v, dt); } else q.y = .03;
    const s = Math.max(.15, p.life / p.max) * 1.2, o = n * 16, c = p.m.c;
    A[o] = s; A[o + 1] = 0; A[o + 2] = 0; A[o + 3] = 0; A[o + 4] = 0; A[o + 5] = s; A[o + 6] = 0; A[o + 7] = 0;
    A[o + 8] = 0; A[o + 9] = 0; A[o + 10] = s; A[o + 11] = 0; A[o + 12] = q.x; A[o + 13] = q.y; A[o + 14] = q.z; A[o + 15] = 1;
    C[n * 3] = c.r; C[n * 3 + 1] = c.g; C[n * 3 + 2] = c.b; n++;
  }
  if (n || pIM.count){ pIM.count = n; pIM.visible = n > 0; pIM.instanceMatrix.needsUpdate = true; pIM.instanceColor.needsUpdate = true; }
}
