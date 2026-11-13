'use strict';
/* ================= Particules ================= */
// Un seul InstancedMesh pour tout le pool (1 appel de dessin au lieu de 180) ; la couleur vient de PMATS[type].color.
// PMATS reste ouvert : un autre fichier peut y ajouter une couleur (ex. PMATS.ember dans 17-defenses.js).
const PGEO = new THREE.BoxGeometry(.1, .1, .1);
const PMATS = { blood: new THREE.MeshBasicMaterial({ color: 0x7a0e0c }), dust: new THREE.MeshBasicMaterial({ color: 0x8a7a68 }), wood: new THREE.MeshBasicMaterial({ color: 0x8a6238 }),
  spark: new THREE.MeshBasicMaterial({ color: 0xffd890 }), chip: new THREE.MeshBasicMaterial({ color: 0x9a948a }) }; // étincelles et éclats des balles perdues
const PSZ = { spark: .45, chip: .75 }; // taille propre à un type (1 sinon)
const PN = 180;
const pIM = new THREE.InstancedMesh(PGEO, new THREE.MeshBasicMaterial({ color: 0xffffff }), PN);
pIM.setColorAt(0, pIM.material.color); pIM.instanceMatrix.setUsage(THREE.DynamicDrawUsage); pIM.instanceColor.setUsage(THREE.DynamicDrawUsage);
pIM.frustumCulled = false; pIM.count = 0; pIM.visible = false; scene.add(pIM);
const parts = [];
for (let i = 0; i < PN; i++) parts.push({ m: { visible: false, position: new THREE.Vector3(), s: 1, c: PMATS.blood.color }, v: new THREE.Vector3(), life: 0, max: 1, sz: 1 });
let pIdx = 0;
// life : multiplie la durée de vie (étincelles brèves) ; dir : vitesse ajoutée dans cette direction (éclats qui partent d'un mur)
function burst(pos, type, n, spd, life, dir){
  const M = PMATS[type] || PMATS.blood, sz = PSZ[type] || 1;
  for (let i = 0; i < n; i++){
    const p = parts[pIdx]; pIdx = (pIdx + 1) % parts.length;
    p.m.c = M.color; p.m.visible = true; p.m.position.copy(pos);
    p.v.set(rand(-1, 1) * spd, rand(.3, 1.2) * spd, rand(-1, 1) * spd);
    if (dir) p.v.addScaledVector(dir, spd * rand(.6, 1.2));
    p.max = p.life = rand(.5, .9) * (life || 1); p.m.s = rand(.6, 1.5); p.sz = sz;
  }
}
function updateParts(dt){
  const A = pIM.instanceMatrix.array, C = pIM.instanceColor.array; let n = 0;
  for (const p of parts){
    if (!p.m.visible) continue;
    p.life -= dt; if (p.life <= 0){ p.m.visible = false; continue; }
    const q = p.m.position;
    if (q.y > .03){ p.v.y -= 12 * dt; q.addScaledVector(p.v, dt); } else q.y = .03;
    const s = Math.max(.15, p.life / p.max) * 1.2 * p.sz, o = n * 16, c = p.m.c;
    A[o] = s; A[o + 1] = 0; A[o + 2] = 0; A[o + 3] = 0; A[o + 4] = 0; A[o + 5] = s; A[o + 6] = 0; A[o + 7] = 0;
    A[o + 8] = 0; A[o + 9] = 0; A[o + 10] = s; A[o + 11] = 0; A[o + 12] = q.x; A[o + 13] = q.y; A[o + 14] = q.z; A[o + 15] = 1;
    C[n * 3] = c.r; C[n * 3 + 1] = c.g; C[n * 3 + 2] = c.b; n++;
  }
  if (n || pIM.count){ pIM.count = n; pIM.visible = n > 0; pIM.instanceMatrix.needsUpdate = true; pIM.instanceColor.needsUpdate = true; }
}

/* ---------- Balles perdues : poussière et étincelles au sol, éclats sur les murs ---------- */
// fire() (08-tir.js) appelle impactRate pour chaque balle ou plomb qui ne touche rien. Les murs (façades, maisons,
// conteneurs le long de la rue) sont relevés une fois par rue (Jeu.on('monde')) en boîtes : aucun objet créé par tir.
// « Effets de tir » coupé (PK.tir, 31-punch.js) : seulement la poussière au sol d'avant.
const IMP = { murs: [], ray: new THREE.Ray(), p: new THREE.Vector3(), q: new THREE.Vector3(), n: new THREE.Vector3(), k: 0 };
function impMurs(){
  IMP.murs.length = 0;
  if (typeof world === 'undefined' || !world) return 0;
  world.updateMatrixWorld(true);
  world.traverse(o => {
    if (!o.isMesh || !o.geometry || o.geometry.type !== 'BoxGeometry') return;
    const b = new THREE.Box3().setFromObject(o);
    if (b.max.y - b.min.y < 2.5 || Math.max(b.max.x - b.min.x, b.max.z - b.min.z) < 3) return;
    if (b.min.x < 14 && b.max.x > -14 && b.max.z > -170) return; // dans la rue (toit du joueur, barricade) : pas un mur
    IMP.murs.push(b);
  });
  return IMP.murs.length;
}
try { Jeu.on('monde', () => impMurs()); } catch (e) { errNote(e); }
function impactRate(o, d, p){
  const fx = typeof PK === 'undefined' || PK.tir !== false;
  const tg = d.y < -.01 ? -o.y / d.y : Infinity; // distance jusqu'au sol
  if (!fx){ if (tg < Infinity && p % 3 === 0){ IMP.p.copy(o).addScaledVector(d, tg); burst(IMP.p, 'dust', 3, 1.5); } return null; }
  if (p % 3 !== 0) return null;                                  // plombs : un impact sur trois, comme avant
  const W = typeof S !== 'undefined' && S && WEAPONS[S.cur], vite = W && W.rate >= 8;
  if (vite && (IMP.k++ & 1)) return null;                        // armes rapides : un tir sur deux (le pool reste lisible)
  let best = Math.min(tg, 220), mur = null;
  const R = IMP.ray; R.origin.copy(o); R.direction.copy(d);
  for (let i = 0; i < IMP.murs.length; i++){
    if (!R.intersectBox(IMP.murs[i], IMP.q)) continue;
    const t = IMP.q.distanceTo(o); if (t < best){ best = t; mur = IMP.murs[i]; }
  }
  const ck = typeof zCrowdK === 'function' ? zCrowdK() : 1, nb = v => Math.max(1, Math.round(v * ck));
  if (mur){
    IMP.p.copy(o).addScaledVector(d, best);
    // Face touchée : la plus proche du point
    const P = IMP.p; let j = 0, fm = Infinity;
    for (let i = 0; i < 6; i++){ const a = i >> 1, v = i & 1 ? mur.max.getComponent(a) - P.getComponent(a) : P.getComponent(a) - mur.min.getComponent(a); if (v < fm){ fm = v; j = i; } }
    IMP.n.set(0, 0, 0); IMP.n.setComponent(j >> 1, j & 1 ? 1 : -1);
    P.addScaledVector(IMP.n, .05);
    burst(P, 'chip', nb(vite ? 2 : 3), 1.3, .8, IMP.n);
    burst(P, 'spark', nb(vite ? 1 : 2), 2.2, .35, IMP.n);
    burst(P, 'dust', nb(2), .8, .9, IMP.n);
    return 'mur';
  }
  if (tg === Infinity) return null;
  IMP.p.copy(o).addScaledVector(d, tg); IMP.p.y = .04;
  burst(IMP.p, 'dust', nb(vite ? 2 : 4), 1.5);
  burst(IMP.p, 'spark', nb(vite ? 1 : 2), 2, .35);
  return 'sol';
}
