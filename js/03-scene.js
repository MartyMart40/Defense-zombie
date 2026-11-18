'use strict';
/* ================= Scène ================= */
const canvas = $('c');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: !isTouch, powerPreference:'high-performance' });
renderer.autoClear = false;
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, isTouch ? 1.5 : 2));
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x5e2e1e);
scene.fog = new THREE.Fog(0x5e2e1e, 30, 125);
const camera = new THREE.PerspectiveCamera(70, 1, 0.05, 400);
camera.rotation.order = 'YXZ';
const EYE = new THREE.Vector3(0, 10, -3.3);
camera.position.copy(EYE);
scene.add(camera);
let baseFov = 70;

function canvasTex(w, h, draw){ const cv = document.createElement('canvas'); cv.width = w; cv.height = h; draw(cv.getContext('2d'), w, h); return new THREE.CanvasTexture(cv); }
const glowTex = canvasTex(128, 128, (g) => {
  const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  gr.addColorStop(0, 'rgba(255,220,160,1)'); gr.addColorStop(.25, 'rgba(255,150,70,.8)'); gr.addColorStop(1, 'rgba(255,120,40,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
});
const lam = c => new THREE.MeshLambertMaterial({ color: c });
let world = null;
function box(w, h, d, mat, x, y, z, parent){ const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(x, y, z); (parent || world).add(m); return m; }
let WALLS = ['#3a302b'], LIT = .06, WIN = '#ffb35a';
function facadeMat(seed, w, h){
  const lit = [];
  const col = canvasTex(128, 256, (g) => {
    g.fillStyle = WALLS[seed % WALLS.length]; g.fillRect(0, 0, 128, 256);
    for (let y = 10; y < 256; y += 32) for (let x = 8; x < 120; x += 30){
      const r = Math.random(); const on = r < LIT;
      g.fillStyle = on ? WIN : (r < LIT + .06 ? '#6a3e24' : '#14100e'); g.fillRect(x, y, 18, 20);
      if (on) lit.push([x, y]);
    }
  });
  const em = canvasTex(128, 256, (g) => { g.fillStyle = '#000'; g.fillRect(0, 0, 128, 256); g.fillStyle = WIN; lit.forEach(p => g.fillRect(p[0], p[1], 18, 20)); });
  [col, em].forEach(t => { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(Math.max(.5, w / 8), Math.max(.25, h / 16)); });
  return new THREE.MeshLambertMaterial({ map: col, emissiveMap: em, emissive: 0xffffff, emissiveIntensity: 0.65 });
}
const fireMat = new THREE.MeshBasicMaterial({ color: 0xff8a2a, transparent: true, opacity: .85, blending: THREE.AdditiveBlending, depthWrite: false, fog: false });
fireMat.userData.keep = true;
const fires = [];
function makeFire(x, y, z, size){
  const g = new THREE.Group(); g.position.set(x, y, z); world.add(g);
  const cones = [];
  for (let i = 0; i < 4; i++){ const c = new THREE.Mesh(new THREE.ConeGeometry(.5 * size, 1.6 * size, 6), fireMat); c.position.set(rand(-.5, .5) * size, .7 * size, rand(-.5, .5) * size); g.add(c); cones.push(c); }
  const light = new THREE.PointLight(0xff7a2a, 2, 28 * size, 1.6); light.position.y = 1.5 * size; g.add(light);
  fires.push({ cones, light, base: 2 }); return g;
}
function car(x, z, rot, mat, burnt){
  const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = rot; world.add(g); g.userData.auto = { burnt: !!burnt }; // détails en Haute définition (js/59)
  box(2, .8, 4.3, burnt ? lam(0x1a1614) : mat, 0, .7, 0, g); box(1.8, .6, 2.2, burnt ? lam(0x141110) : mat, 0, 1.4, -.2, g);
  const wm = lam(0x111111); [[-1, -1.4], [1, -1.4], [-1, 1.4], [1, 1.4]].forEach(p => fixe(box(.3, .6, .6, wm, p[0], .3, p[1], g))); // roues : un seul maillage (js/03-scene-fusion.js)
  return g;
}
function roof(x, y, z, w, d, h, col){
  const g = new THREE.Group(); g.position.set(x, y, z); world.add(g);
  const c = fixe(new THREE.Mesh(new THREE.ConeGeometry(1, 1, 4), lam(col))); c.rotation.y = Math.PI / 4; c.position.y = .5; g.add(c);
  g.scale.set(w / Math.SQRT2 * 1.12, h, d / Math.SQRT2 * 1.12);
}
function house(x, z, w, d, h, roofCol, seed){
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), facadeMat(seed, Math.max(w, d), h)); m.position.set(x, h / 2, z); world.add(m);
  roof(x, h, z, w, d, rand(2, 3.2), roofCol);
}
/* ---------- Arbres : facettes, deux espèces, tous fusionnés en un seul objet ---------- */
// Chaque arbre est fait de quelques formes simples déformées et colorées par sommet.
// Tous les arbres d'une ville sont réunis dans une seule géométrie (1 appel de dessin),
// plus une seconde pour les ombres au sol : léger même sur cell.
let treeParts = null, shadowParts = null;
const _tm = new THREE.Matrix4(), _tq = new THREE.Quaternion(), _te = new THREE.Euler(), _ts = new THREE.Vector3(), _tp = new THREE.Vector3(), _tc = new THREE.Color();
function treeAdd(geo, x, y, z, rx, ry, rz, sx, sy, sz, col, jit, shade){
  const g = geo.index ? geo.toNonIndexed() : geo;
  _te.set(rx, ry, rz); _tq.setFromEuler(_te); _ts.set(sx, sy, sz); _tp.set(x, y, z);
  _tm.compose(_tp, _tq, _ts); g.applyMatrix4(_tm);
  const pos = g.attributes.position, n = pos.count;
  // Déformation douce : les sommets au même endroit bougent pareil (pas de trous entre les facettes)
  if (jit) for (let i = 0; i < n; i++){
    const px = pos.getX(i), py = pos.getY(i), pz = pos.getZ(i);
    const h = Math.sin(px * 12.9898 + py * 78.233 + pz * 37.719) * 43758.5453, k = (h - Math.floor(h)) - .5;
    const h2 = Math.sin(px * 39.3468 + py * 11.135 + pz * 83.155) * 24634.6345, k2 = (h2 - Math.floor(h2)) - .5;
    pos.setXYZ(i, px + k * jit, py + k2 * jit * .7, pz + (k - k2) * jit);
  }
  g.computeVertexNormals();
  // Couleur par facette : nuance au hasard, plus sombre en bas, plus claire en haut (lumière du ciel)
  const cols = new Float32Array(n * 3); let ymin = Infinity, ymax = -Infinity;
  for (let i = 0; i < n; i++){ const v = pos.getY(i); if (v < ymin) ymin = v; if (v > ymax) ymax = v; }
  for (let f = 0; f < n; f += 3){
    const var1 = 1 + (Math.random() - .5) * .38;
    for (let j = 0; j < 3; j++){
      const t = (pos.getY(f + j) - ymin) / Math.max(.01, ymax - ymin);
      const l = var1 * (shade ? (.62 + .55 * t) : .8);
      _tc.setHex(col); cols[(f + j) * 3] = _tc.r * l; cols[(f + j) * 3 + 1] = _tc.g * l; cols[(f + j) * 3 + 2] = _tc.b * l;
    }
  }
  g.setAttribute('color', new THREE.BufferAttribute(cols, 3));
  treeParts.push(g);
  if (g !== geo) geo.dispose();
}
function treeMerge(list){
  let n = 0; list.forEach(g => n += g.attributes.position.count);
  const P = new Float32Array(n * 3), N = new Float32Array(n * 3), C = new Float32Array(n * 3); let o = 0;
  list.forEach(g => {
    P.set(g.attributes.position.array, o * 3); N.set(g.attributes.normal.array, o * 3);
    if (g.attributes.color) C.set(g.attributes.color.array, o * 3); else C.fill(1, o * 3, (o + g.attributes.position.count) * 3);
    o += g.attributes.position.count; g.dispose();
  });
  const m = new THREE.BufferGeometry();
  m.setAttribute('position', new THREE.BufferAttribute(P, 3)); m.setAttribute('normal', new THREE.BufferAttribute(N, 3)); m.setAttribute('color', new THREE.BufferAttribute(C, 3));
  m.computeBoundingSphere(); return m;
}
let TREE_PAL = null;
function treeStart(L){
  treeParts = []; shadowParts = [];
  const night = L.id === 'banlieue';
  TREE_PAL = {
    bark: night ? [0x2a231e, 0x332a22] : [0x4a3524, 0x5a3f2a, 0x3e2c1e],
    pine: night ? [0x1a2a22, 0x1f3026, 0x16241c] : [0x24391f, 0x2c4424, 0x203420, 0x34492a],
    leaf: night ? [0x22301f, 0x2a3824, 0x1e2a1e] : [0x3e5a26, 0x4a6a2c, 0x56702e, 0x6a6a2a, 0x8a5a24, 0x9a6a2a], // quelques touches d'automne
  };
}
function tree(x, z, sc){
  if (!treeParts) treeStart(curLoc || LOCS[0]);
  const ry = Math.random() * 6.28, bark = pick(TREE_PAL.bark);
  if (Math.random() < .5){
    // Sapin : tronc effilé et 4 étages de branches qui rapetissent
    const h = rand(5.5, 7.5) * sc, col = pick(TREE_PAL.pine);
    treeAdd(new THREE.CylinderGeometry(.09 * sc, .26 * sc, h * .55, 6), x, h * .27, z, 0, ry, 0, 1, 1, 1, bark, .04 * sc, true);
    const tiers = 4;
    for (let i = 0; i < tiers; i++){
      const t = i / (tiers - 1), r = (1.9 - 1.25 * t) * sc * rand(.9, 1.1), hh = (2.2 - .6 * t) * sc;
      const y = h * .2 + i * h * .2 + hh / 2;
      treeAdd(new THREE.ConeGeometry(r, hh, 9, 1, true), x + rand(-.08, .08) * sc, y, z + rand(-.08, .08) * sc, rand(-.05, .05), ry + i * .7, rand(-.05, .05), 1, 1, 1, col, .28 * sc * (1 - .5 * t), true);
      // dessous de chaque étage, plus sombre
      treeAdd(new THREE.CircleGeometry(r * .92, 9), x, y - hh / 2 + .02, z, Math.PI / 2, 0, ry, 1, 1, 1, col, .12 * sc, false);
    }
    treeAdd(new THREE.ConeGeometry(.35 * sc, .9 * sc, 6), x, h * .2 + tiers * h * .2 + .3 * sc, z, 0, ry, 0, 1, 1, 1, col, .06 * sc, true);
    shadowParts.push([x, z, 2 * sc]);
  } else {
    // Feuillu : tronc tordu, 3 branches, feuillage en grappes bosselées
    const h = rand(2.4, 3.2) * sc, col = pick(TREE_PAL.leaf), lean = rand(-.12, .12);
    treeAdd(new THREE.CylinderGeometry(.14 * sc, .3 * sc, h, 7), x, h / 2, z, lean, ry, rand(-.1, .1), 1, 1, 1, bark, .07 * sc, true);
    const top = new THREE.Vector3(x + Math.sin(lean) * h * .5, h, z);
    const blobs = [[0, .9, 0, 1.45]];
    for (let i = 0; i < 3; i++){
      const a = ry + i * 2.1 + rand(-.3, .3), bl = rand(1, 1.5) * sc;
      treeAdd(new THREE.CylinderGeometry(.05 * sc, .11 * sc, bl, 5), top.x + Math.cos(a) * bl * .35, top.y - .1 * sc + bl * .3, top.z + Math.sin(a) * bl * .35, Math.sin(a) * .9, 0, -Math.cos(a) * .9, 1, 1, 1, bark, .03 * sc, false);
      blobs.push([Math.cos(a) * bl * .8 / sc, .5 + rand(.1, .5), Math.sin(a) * bl * .8 / sc, rand(.95, 1.25)]);
    }
    for (let i = 0; i < 2; i++){ const a = rand(0, 6.28); blobs.push([Math.cos(a) * .7, 1.5 + rand(0, .3), Math.sin(a) * .7, rand(.8, 1.05)]); }
    blobs.forEach(b => {
      const r = b[3] * sc;
      treeAdd(new THREE.IcosahedronGeometry(r, 1), top.x + b[0] * sc, top.y + b[1] * sc, top.z + b[2] * sc, rand(0, 3), rand(0, 3), 0, 1, rand(.8, .95), 1, col, .32 * r, true);
    });
    shadowParts.push([top.x, z, 2.4 * sc]);
  }
}
function treeFinish(){
  if (!treeParts) return;
  if (treeParts.length){
    const mat = new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide });
    world.add(new THREE.Mesh(treeMerge(treeParts), mat));
  }
  if (shadowParts.length){
    const list = shadowParts.map(p => { const g = new THREE.CircleGeometry(p[2], 12).toNonIndexed(); g.rotateX(-Math.PI / 2); g.translate(p[0], .04, p[1]); g.computeVertexNormals(); return g; });
    const sm = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: .28, depthWrite: false });
    world.add(new THREE.Mesh(treeMerge(list), sm));
  }
  treeParts = shadowParts = null;
}
function disposeWorld(){
  if (!world) return;
  scene.remove(world);
  world.traverse(o => {
    if (o.geometry) o.geometry.dispose();
    if (o.material){ (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => {
      if (m.userData.keep) return;
      if (m.map && m.map !== glowTex) m.map.dispose(); if (m.emissiveMap) m.emissiveMap.dispose(); m.dispose(); }); }
  });
  world = null;
}
/* ---------- La Centrale (dossier 117) : décor fusionné, peu d'appels de dessin ---------- */
// Chaque sorte de pièce (béton, métal peint, acier, tuyaux, porcelaine) est réunie dans une seule géométrie : un appel de
// dessin par matériau. Les façades (facadeMat) restent des boîtes à part : js/68-toit-decor.js y pose ses fenêtres.
// Le fond (mur, réacteur, tours de refroidissement) est loin dans la brume : matériaux sans brouillard, mêlés à la couleur
// de la brume par js/71-centrale.js (ctrBrume), qui anime aussi gyrophares, vapeur, cendres, lueur et transformateurs.
const CTRG = { box:new THREE.BoxGeometry(1, 1, 1), cyl:new THREE.CylinderGeometry(1, 1, 1, 14), dome:new THREE.SphereGeometry(1, 18, 8, 0, Math.PI * 2, 0, Math.PI / 2) };
const _cM = new THREE.Matrix4(), _cQ = new THREE.Quaternion(), _cE = new THREE.Euler(), _cS = new THREE.Vector3(), _cP = new THREE.Vector3(), _cA = new THREE.Vector3(), _cU = new THREE.Vector3(0, 1, 0);
function cPiece(list, geo, x, y, z, sx, sy, sz, rx, ry, rz){
  const g = geo.index ? geo.toNonIndexed() : geo.clone();
  _cE.set(rx || 0, ry || 0, rz || 0); _cQ.setFromEuler(_cE); _cS.set(sx, sy, sz); _cP.set(x, y, z);
  g.applyMatrix4(_cM.compose(_cP, _cQ, _cS)); list.push(g); return g;
}
// Barre d'épaisseur t entre deux points (montants des pylônes, fissures)
function cBarre(list, x1, y1, z1, x2, y2, z2, t, t2){
  _cA.set(x2 - x1, y2 - y1, z2 - z1); const l = _cA.length(); if (l < 1e-4) return;
  _cQ.setFromUnitVectors(_cU, _cA.multiplyScalar(1 / l)); _cS.set(t, l, t2 || t); _cP.set((x1 + x2) / 2, (y1 + y2) / 2, (z1 + z2) / 2);
  const g = CTRG.box.toNonIndexed(); g.applyMatrix4(_cM.compose(_cP, _cQ, _cS)); list.push(g);
}
function cFusion(list){
  let n = 0; list.forEach(g => n += g.attributes.position.count);
  const P = new Float32Array(n * 3), N = new Float32Array(n * 3), U = new Float32Array(n * 2); let o = 0;
  list.forEach(g => { P.set(g.attributes.position.array, o * 3); N.set(g.attributes.normal.array, o * 3); if (g.attributes.uv) U.set(g.attributes.uv.array, o * 2); o += g.attributes.position.count; g.dispose(); });
  const m = new THREE.BufferGeometry();
  m.setAttribute('position', new THREE.BufferAttribute(P, 3)); m.setAttribute('normal', new THREE.BufferAttribute(N, 3)); m.setAttribute('uv', new THREE.BufferAttribute(U, 2));
  m.computeBoundingSphere(); return m;
}
function cMesh(list, mat){ if (!list.length) return null; const m = new THREE.Mesh(cFusion(list), mat); world.add(m); list.length = 0; return m; }
// Matériaux partagés, jamais libérés (userData.keep) : grillage, panneaux, fond dans la brume, fissures, ampoules
const ctrKeep = m => { m.userData.keep = true; return m; };
const CTR_GRILLAGE = ctrKeep(new THREE.MeshLambertMaterial({ side:THREE.DoubleSide, alphaTest:.45, map:canvasTex(32, 32, (g) => {
  g.strokeStyle = 'rgb(150,160,156)'; g.lineWidth = 2.2; g.beginPath(); g.moveTo(0, 0); g.lineTo(32, 32); g.moveTo(32, 0); g.lineTo(0, 32); g.stroke();
}) }));
CTR_GRILLAGE.map.wrapS = CTR_GRILLAGE.map.wrapT = THREE.RepeatWrapping;
const CTR_PANNEAU = ctrKeep(new THREE.MeshLambertMaterial({ map:canvasTex(64, 64, (g) => { // danger : rayonnements
  g.fillStyle = '#d8b624'; g.fillRect(0, 0, 64, 64); g.fillStyle = '#16140c'; g.fillRect(0, 0, 64, 4); g.fillRect(0, 60, 64, 4);
  g.beginPath(); g.arc(32, 32, 5, 0, 7); g.fill();
  for (let i = 0; i < 3; i++){ const a = -Math.PI / 2 + i * Math.PI * 2 / 3; g.beginPath(); g.moveTo(32, 32); g.arc(32, 32, 22, a - .5, a + .5); g.closePath(); g.fill(); }
  g.fillStyle = '#d8b624'; g.beginPath(); g.arc(32, 32, 8, 0, 7); g.fill(); g.fillStyle = '#16140c'; g.beginPath(); g.arc(32, 32, 5, 0, 7); g.fill();
}) }));
const CTR_LOIN = ctrKeep(new THREE.MeshLambertMaterial({ color:0x5a605c, fog:false }));
const CTR_TOUR = ctrKeep(new THREE.MeshLambertMaterial({ color:0x8a8e86, fog:false, side:THREE.DoubleSide }));
const CTR_FISSURE = ctrKeep(new THREE.MeshBasicMaterial({ color:0xa8ffd0, fog:false }));
const CTR_AMPOULE = ctrKeep(new THREE.MeshBasicMaterial({ color:0xff5a14, fog:false }));
const CTR_FIL = ctrKeep(new THREE.LineBasicMaterial({ color:0x101616 }));
const CTR_VOYANT = ctrKeep(new THREE.MeshBasicMaterial({ color:0x6affc0, fog:false }));
// Transformateur : cuve à ailettes, couvercle, réservoir couché, trois traversées en porcelaine
function cTransfo(ME, PO, x, z, s, ry){
  const c = Math.cos(ry || 0), sn = Math.sin(ry || 0), at = (dx, dz) => [x + dx * c + dz * sn, z - dx * sn + dz * c];
  let p = at(0, 0); cPiece(ME, CTRG.box, p[0], 1.35 * s, p[1], 2.2 * s, 2.4 * s, 1.7 * s, 0, ry);
  cPiece(ME, CTRG.box, p[0], 2.62 * s, p[1], 2.4 * s, .16 * s, 1.9 * s, 0, ry);
  for (let k = -2; k <= 2; k++) [-1, 1].forEach(sd => { p = at(k * .42 * s, sd * 1.05 * s); cPiece(ME, CTRG.box, p[0], 1.3 * s, p[1], .08 * s, 2 * s, .45 * s, 0, ry); });
  p = at(0, -.5 * s); cPiece(ME, CTRG.cyl, p[0], 3.1 * s, p[1], .38 * s, 1.9 * s, .38 * s, 0, ry, Math.PI / 2);
  for (let k = -1; k <= 1; k++){
    p = at(k * .62 * s, .35 * s); cPiece(PO, CTRG.cyl, p[0], 3.15 * s, p[1], .12 * s, 1 * s, .12 * s);
    for (let j = 0; j < 3; j++) cPiece(PO, CTRG.cyl, p[0], (2.85 + j * .26) * s, p[1], .24 * s, .07 * s, .24 * s);
  }
}
// Pylône en treillis (4 montants, croisillons, deux bras) ; rend les bouts des bras pour les fils
function cPylone(AC, PO, x, z, h){
  const b = 2.4, t = .55, pts = [];
  [[-1, -1], [1, -1], [1, 1], [-1, 1]].forEach(q => cBarre(AC, x + q[0] * b, 0, z + q[1] * b, x + q[0] * t, h, z + q[1] * t, .22));
  for (let i = 0; i < 5; i++){
    const y0 = h * i / 5, y1 = h * (i + 1) / 5, r0 = b + (t - b) * i / 5, r1 = b + (t - b) * (i + 1) / 5;
    for (let f = 0; f < 4; f++){
      const a = [[-1, -1], [1, -1], [1, 1], [-1, 1]][f], c2 = [[1, -1], [1, 1], [-1, 1], [-1, -1]][f];
      cBarre(AC, x + a[0] * r0, y0, z + a[1] * r0, x + c2[0] * r1, y1, z + c2[1] * r1, .09);
      cBarre(AC, x + c2[0] * r0, y0, z + c2[1] * r0, x + a[0] * r1, y1, z + a[1] * r1, .09);
    }
  }
  [[h * .78, 5.2], [h * .93, 3.6]].forEach(([y, w]) => {
    cPiece(AC, CTRG.box, x, y, z, w * 2, .3, .4);
    [-1, 1].forEach(sd => { cPiece(PO, CTRG.cyl, x + sd * w, y - .7, z, .13, 1.2, .13); pts.push([x + sd * w, y - 1.3, z]); });
  });
  return pts;
}
function centraleRue(L, seed){
  const M = { beton:lam(0x6b6f6b), metal:lam(0x4f5d58), acier:lam(0x2c3334), tuyau:lam(0x7d7466), porc:lam(0x7a4632), transfo:lam(0x5d6e5a) };
  const BE = [], ME = [], AC = [], TU = [], PO = [], GR = [], PA = [], AMP = [];
  const C = world.userData.centrale = { transfos:[], gyros:[], fils:[], tours:[], reacteur:null, fissures:null };
  const gyro = (x, y, z) => { C.gyros.push([x, y, z]); cPiece(AC, CTRG.cyl, x, y - .25, z, .18, .3, .18); cPiece(AMP, CTRG.cyl, x, y, z, .2, .3, .2); };
  [-1, 1].forEach(sd => {
    // Clôture grillagée derrière le trottoir : poteaux, lisse, barbelés, panneaux « danger »
    const x = sd * 19.6, z0 = -6, z1 = -172, len = z0 - z1, zm = (z0 + z1) / 2;
    for (let z = z0; z >= z1; z -= 4){ cPiece(AC, CTRG.box, x, 1.35, z, .1, 2.7, .1); cPiece(AC, CTRG.box, x + sd * .16, 2.86, z, .05, .45, .05, 0, 0, -sd * .6); }
    cPiece(AC, CTRG.box, x, 2.66, zm, .05, .05, len); cPiece(AC, CTRG.box, x + sd * .3, 3.02, zm, .03, .03, len); cPiece(AC, CTRG.box, x + sd * .18, 2.86, zm, .03, .03, len);
    const pl = new THREE.PlaneGeometry(len, 2.5), uv = pl.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * len / 1.4, uv.getY(i) * 2.5 / 1.4);
    pl.rotateY(-sd * Math.PI / 2); pl.translate(x, 1.3, zm); GR.push(pl.toNonIndexed()); pl.dispose();
    for (let z = -14 - (sd > 0 ? 11 : 0); z > -165; z -= 22){ const s = new THREE.PlaneGeometry(.8, .8); s.rotateY(-sd * Math.PI / 2); s.translate(x - sd * .07, 1.7, z); PA.push(s.toNonIndexed()); s.dispose(); }
    // Derrière la clôture : bâtiments techniques en béton et cours de transformateurs
    for (let z = -8; z > -168; ){
      if (Math.random() < .55){
        const d = rand(14, 22), w = rand(10, 15), h = rand(L.bh[0], L.bh[1]), cx = sd * (22 + w / 2), cz = z - d / 2;
        if (Math.random() < .5){ // bureaux (façade à fenêtres : js/68-toit-decor.js y allume quelques fenêtres)
          const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), facadeMat(seed++, d, h)); m.position.set(cx, h / 2, cz); world.add(m);
        } else { // salle des machines en béton : porte roulante, bandeau de petites fenêtres hautes
          cPiece(BE, CTRG.box, cx, h / 2, cz, w, h, d);
          cPiece(ME, CTRG.box, cx - sd * w / 2, 2.4, cz + rand(-2, 2), .25, 4.8, 5.2);
          for (let k = 0; k < Math.floor(d / 2.6); k++) cPiece(AC, CTRG.box, cx - sd * w / 2, h - 1.6, cz - d / 2 + 1.3 + k * 2.6, .2, .9, 1.6);
          cPiece(ME, CTRG.box, cx - sd * w / 2, 5.6, cz, .3, .25, d * .9);
        }
        cPiece(BE, CTRG.box, cx, h + .3, cz, w + .4, .6, d + .4);                                   // rebord du toit
        cPiece(ME, CTRG.box, cx - sd * w * .2, h + 1.1, cz + d * .2, 1.8, 1.1, 1.8);                 // bouches d'aération
        cPiece(ME, CTRG.cyl, cx + sd * w * .15, h + 1.4, cz - d * .25, .7, 1.6, .7);
        if (Math.random() < .55) gyro(cx - sd * (w / 2 - 1), h + .9, cz + d / 2 - 1.2);
        z -= d + rand(3, 6);
      } else {
        const d = rand(14, 20), cx = sd * rand(25, 28), cz = z - d / 2;
        cPiece(BE, CTRG.box, cx, .12, cz, 9, .24, d - 2);                                             // dalle
        for (let k = 0; k < 2; k++) cTransfo(ME, PO, cx + rand(-1.4, 1.4), z - d * (.3 + .4 * k), rand(.9, 1.2), rand(-.1, .1));
        cPiece(AC, CTRG.box, cx - 3.6, 4.5, cz, .3, 9, .3); cPiece(AC, CTRG.box, cx + 3.6, 4.5, cz, .3, 9, .3); cPiece(AC, CTRG.box, cx, 9, cz, 7.6, .35, .35); // portique
        z -= d + rand(2, 4);
      }
    }
    // Pylônes à haute tension, loin derrière
    let prev = null;
    [-34, -96, -158].forEach(zp => { const pts = cPylone(AC, PO, sd * rand(34, 38), zp + rand(-4, 4), rand(26, 30)); if (prev) pts.forEach((p, i) => C.fils.push([prev[i], p])); if (zp === -96) C.fils.push(['x', pts]); prev = pts; });
  });
  // Fils qui traversent la rue entre les deux pylônes du milieu
  const tr = C.fils.filter(f => f[0] === 'x'); C.fils = C.fils.filter(f => f[0] !== 'x');
  if (tr.length === 2) tr[0][1].forEach((p, i) => C.fils.push([p, tr[1][1][i]]));
  // Gros tuyaux : deux conduites sur le trottoir de gauche, une passerelle qui traverse la rue, puis à droite
  [[.55, 1.3], [.36, 2.3]].forEach(([r, y], k) => {
    cPiece(TU, CTRG.cyl, -17.6, y, -52, r, 80, r, Math.PI / 2); cPiece(TU, CTRG.cyl, 17.6, y, -130, r, 76, r, Math.PI / 2);
    cPiece(TU, CTRG.cyl, -17.6, (y + 9.3 - k * 1.3) / 2, -92, r, 9.3 - k * 1.3 - y, r); cPiece(TU, CTRG.cyl, 17.6, (y + 9.3 - k * 1.3) / 2, -92, r, 9.3 - k * 1.3 - y, r);
    cPiece(TU, CTRG.cyl, 0, 9.3 - k * 1.3, -92 - k * .2, r, 35.2, r, 0, 0, Math.PI / 2);
  });
  for (let z = -14; z > -168; z -= 6){ const sx = z > -92 ? -17.6 : 17.6; cPiece(AC, CTRG.box, sx, .9, z, .25, 1.8, 1.5); cPiece(TU, CTRG.cyl, sx, 1.3, z + 3, .66, .14, .66, Math.PI / 2); }
  [-1, 1].forEach(sd => { cPiece(AC, CTRG.box, sd * 15.4, 4.3, -92, .5, 8.6, .5); cPiece(AC, CTRG.box, sd * 15.4, 4.3, -93.6, .5, 8.6, .5); });
  cPiece(AC, CTRG.box, 0, 8.65, -92.8, 31.6, .4, 2);
  gyro(-15.4, 9.2, -92.8); gyro(15.4, 9.2, -92.8);
  // Blocs de béton au bord de la rue
  [[-12.6, -24, .2], [12.4, -47, -.15], [-12.8, -82, .1], [12.7, -110, .3]].forEach(b => cPiece(BE, CTRG.box, b[0], .45, b[1], .7, .9, 3, 0, b[2]));
  // Les trois transformateurs de la rue (le Cœur s'y recharge : js/71-centrale.js). Hors des emplacements de l'atelier.
  [[-15.6, -30, .2], [15.6, -38, -.3], [-15.6, -68, .1]].forEach(([tx, tz, ry]) => {
    const list = [], po = []; cTransfo(list, po, 0, 0, 1.15, ry); list.push(...po);
    const g = new THREE.Group(); g.position.set(tx, 0, tz); world.add(g);
    const m = cMesh(list, M.transfo); world.remove(m); g.add(m);
    const v = new THREE.Mesh(CTRG.box, CTR_VOYANT); v.scale.set(.32, .32, .32); v.position.set(-Math.sign(tx) * 1.15, 2.2, 0); g.add(v);
    C.transfos.push({ g, corps:m, voyant:v, x:tx, z:tz });
  });
  cMesh(BE, M.beton); cMesh(ME, M.metal); cMesh(AC, M.acier); cMesh(TU, M.tuyau); cMesh(PO, M.porc); cMesh(GR, CTR_GRILLAGE); cMesh(PA, CTR_PANNEAU);
  C.ampoules = cMesh(AMP, CTR_AMPOULE);
  // Fils électriques qui pendent entre les pylônes (un seul objet)
  const fp = [];
  C.fils.forEach(([a, b]) => { for (let i = 0; i < 8; i++){ const t0 = i / 8, t1 = (i + 1) / 8, s0 = 4 * t0 * (1 - t0) * 2.2, s1 = 4 * t1 * (1 - t1) * 2.2;
    fp.push(a[0] + (b[0] - a[0]) * t0, a[1] + (b[1] - a[1]) * t0 - s0, a[2] + (b[2] - a[2]) * t0, a[0] + (b[0] - a[0]) * t1, a[1] + (b[1] - a[1]) * t1 - s1, a[2] + (b[2] - a[2]) * t1); } });
  if (fp.length){ const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(fp, 3)); world.add(new THREE.LineSegments(g, CTR_FIL)); }
  return seed;
}
// Bout de la rue : mur d'enceinte et sa porte, bâtiment du réacteur fissuré, cheminée, deux tours de refroidissement
function centraleFond(L, seed){
  const C = world.userData.centrale || (world.userData.centrale = { transfos:[], gyros:[], fils:[], tours:[] });
  const LO = [], TO = [], FI = [], AMP = [];
  cPiece(LO, CTRG.box, -21, 3, -172, 30, 6, 1.2); cPiece(LO, CTRG.box, 21, 3, -172, 30, 6, 1.2);
  cPiece(LO, CTRG.box, -6.5, 4, -172, 1.4, 8, 1.6); cPiece(LO, CTRG.box, 6.5, 4, -172, 1.4, 8, 1.6); cPiece(LO, CTRG.box, 0, 8.3, -172, 15, 1, 1.4);
  [-6.5, 6.5].forEach(x => { C.gyros.push([x, 9.1, -172]); cPiece(AMP, CTRG.cyl, x, 9.1, -172, .3, .4, .3); });
  cPiece(LO, CTRG.box, 0, 6, -194, 46, 12, 22);                       // salle des machines
  cPiece(LO, CTRG.cyl, 0, 18, -198, 13, 24, 13);                      // enceinte du réacteur
  cPiece(LO, CTRG.dome, 0, 30, -198, 13, 10, 13);                     // dôme
  cPiece(LO, CTRG.cyl, 17, 24, -204, 1.7, 48, 1.7);                   // cheminée
  cPiece(LO, CTRG.box, -16, 15, -190, 8, 6, 10);
  // Fissures qui luisent sur la face avant de l'enceinte et du dôme (zigzags)
  const R = 13.08, zc = -198;
  [[-.5, 36, 8], [.15, 34, 7], [.62, 30, 5]].forEach(([a0, y0, n]) => {
    let a = a0, y = y0;
    for (let i = 0; i < n; i++){
      const a2 = a + rand(-.14, .14), y2 = y - rand(2.2, 3.6), rr = y > 30 ? R * Math.sqrt(Math.max(0, 1 - Math.pow((y - 30) / 10.2, 2))) + .05 : R, rr2 = y2 > 30 ? R * Math.sqrt(Math.max(0, 1 - Math.pow((y2 - 30) / 10.2, 2))) + .05 : R;
      cBarre(FI, Math.sin(a) * rr, y, zc + Math.cos(a) * rr, Math.sin(a2) * rr2, y2, zc + Math.cos(a2) * rr2, .32, .12);
      a = a2; y = y2;
    }
  });
  cPiece(FI, CTRG.box, 0, 16, -186.9, 6, 2.2, .2); // porte du réacteur, ouverte sur la lueur
  // Tours de refroidissement : hyperboloïdes (rayon 20 au pied, 12 à la taille, 62 m de haut)
  const prof = []; for (let i = 0; i <= 14; i++){ const y = 62 * i / 14; prof.push(new THREE.Vector2(12 * Math.sqrt(1 + Math.pow((y - 46) / 34.5, 2)), y)); }
  const lathe = new THREE.LatheGeometry(prof, 28);
  [[-52, -230, 1], [48, -248, .92]].forEach(([x, z, s]) => { cPiece(TO, lathe, x, 0, z, s, s, s); C.tours.push([x, 62 * s, z, 12.6 * s]); });
  lathe.dispose();
  C.reacteur = [0, 22, -184];
  cMesh(LO, CTR_LOIN); cMesh(TO, CTR_TOUR); C.fissures = cMesh(FI, CTR_FISSURE); C.ampoulesFond = cMesh(AMP, CTR_AMPOULE);
  return seed;
}
const BAR_Z = -9;
function buildWorld(L){
  disposeWorld(); fires.length = 0; treeStart(L);
  world = new THREE.Group(); scene.add(world); world.userData.tetes = []; // têtes de lampadaires (halos de js/36)
  scene.fog.color.setHex(L.fog); scene.background.setHex(L.fog); scene.fog.near = L.fogNear; scene.fog.far = L.fogFar;
  world.add(new THREE.HemisphereLight(L.hemi[0], L.hemi[1], L.hemi[2]));
  const sun = new THREE.DirectionalLight(L.sunCol, L.sunI); sun.position.set(-30, 25, -120); world.add(sun);
  world.add(new THREE.AmbientLight(L.amb, 0.35));
  // Ciel
  const skyTex = canvasTex(4, 256, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, 0, h); const st = [0, .35, .47, .5, .53, 1];
    L.sky.forEach((c, i) => gr.addColorStop(st[i], c)); g.fillStyle = gr; g.fillRect(0, 0, w, h);
  });
  world.add(new THREE.Mesh(new THREE.SphereGeometry(300, 24, 16), new THREE.MeshBasicMaterial({ map: skyTex, side: THREE.BackSide, fog: false, depthWrite:false })));
  const sunSpr = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: L.glow, fog: false, depthWrite: false, blending: THREE.AdditiveBlending }));
  sunSpr.position.set(-60, L.glowY, -280); const gs = L.glowY > 30 ? 40 : 80; sunSpr.scale.set(gs, gs, 1); world.add(sunSpr);
  // Sol, rue, trottoirs
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(240, 300, 40, 50), lam(L.ground));
  ground.rotation.x = -Math.PI / 2; ground.position.set(0, 0, -120); world.add(ground);
  const lineMat = lam(0x9a7a2a);
  for (let z = -12; z > -170; z -= 7) fixe(box(0.25, 0.02, 3, lineMat, 0, 0.01, z));
  const walkMat = lam(L.walk);
  box(6, 0.2, 200, walkMat, -16, 0.1, -100); box(6, 0.2, 200, walkMat, 16, 0.1, -100);
  WALLS = L.walls; LIT = 0; WIN = L.win; // fenêtres allumées : js/68-toit-decor.js (elles s'allument et s'éteignent)
  let seed = 0;
  // Bâtiments le long de la rue
  if (L.style === 'houses'){
    [-1, 1].forEach(side => {
      box(60, .1, 200, lam(L.lawn), side * 49, .05, -100);
      for (let z = -8; z > -170; ){
        const w = rand(L.hw[0], L.hw[1]), d = rand(7, 10), h = rand(L.bh[0], L.bh[1]), set = rand(2, 6);
        house(side * (19 + set + w / 2), z - d / 2, w, d, h, pick(L.roofs), seed++);
        if (Math.random() < L.trees) tree(side * rand(18, 19.5), z - d - rand(1, 3), rand(.8, 1.3));
        z -= d + rand(L.gap[0], L.gap[1]);
      }
    });
  } else if (L.style === 'centrale'){
    seed = centraleRue(L, seed); // La Centrale (dossier 117)
  } else if (L.style === 'port'){
    [-1, 1].forEach(side => {
      for (let z = -6; z > -175; ){
        const d = rand(18, 26), w = rand(14, 20), h = rand(L.bh[0], L.bh[1]);
        const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), facadeMat(seed++, d, h)); m.position.set(side * (21 + w / 2), h / 2, z - d / 2); world.add(m);
        z -= d + rand(2, 5);
      }
      for (let z = -16; z > -150; z -= rand(8, 13)){
        const n = 1 + Math.floor(Math.random() * 3), cm = lam(pick(L.cont));
        for (let k = 0; k < n; k++){ const c = fixe(box(2.5, 2.6, 6, cm, side * rand(16.5, 18), 1.3 + k * 2.6, z)); c.rotation.y = rand(-.08, .08); }
      }
    });
  } else {
    [-1, 1].forEach(side => {
      for (let z = -6; z > -175; ){
        const d = rand(10, 18), w = rand(10, 16), h = rand(L.bh[0], L.bh[1]);
        const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), facadeMat(seed++, d, h)); m.position.set(side * (19 + w / 2), h / 2, z - d / 2); world.add(m);
        z -= d + rand(L.gap[0], L.gap[1]);
      }
    });
  }
  // Fond de la rue
  if (L.end === 'church'){
    const m = new THREE.Mesh(new THREE.BoxGeometry(14, 10, 12), facadeMat(seed++, 14, 10)); m.position.set(0, 5, -182); world.add(m);
    roof(0, 10, -182, 14, 12, 4, 0x3a2a24);
    fixe(box(3.5, 14, 3.5, lam(0x857560), 0, 7, -174));
    roof(0, 14, -174, 3.5, 3.5, 7, 0x3a2a24);
  } else if (L.end === 'reacteur'){
    seed = centraleFond(L, seed);
  } else if (L.end === 'cranes'){
    const cm = lam(0xa07a1e);
    [-14, 12].forEach((x, i) => {
      const z = -150 - i * 18; fixe(box(1.2, 34, 1.2, cm, x - 3, 17, z)); fixe(box(1.2, 34, 1.2, cm, x + 3, 17, z));
      fixe(box(30, 1.6, 1.6, cm, x + (i ? -8 : 8), 34, z)); fixe(box(.15, 14, .15, lam(0x222222), x + (i ? -18 : 18), 27, z));
    });
    const endB = new THREE.Mesh(new THREE.BoxGeometry(70, 16, 10), facadeMat(seed++, 70, 16)); endB.position.set(0, 8, -185); world.add(endB);
  } else {
    const hh = L.style === 'houses' ? 14 : Math.max(40, L.bh[1]);
    const endB = new THREE.Mesh(new THREE.BoxGeometry(70, hh, 10), facadeMat(seed++, 70, hh)); endB.position.set(0, hh / 2, -180); world.add(endB);
  }
  treeFinish(); // tous les arbres de la ville en un seul objet
  // Notre immeuble et les voisins
  const ours = new THREE.Mesh(new THREE.BoxGeometry(30, 8.6, 24), facadeMat(3, 30, 8.6)); ours.position.set(0, 4.3, 8.1); world.add(ours);
  [-1, 1].forEach(sd => { const m = new THREE.Mesh(new THREE.BoxGeometry(20, 14, 22), facadeMat(seed++, 20, 14)); m.position.set(sd * 25, 7, 7.2); world.add(m); });
  // Sacs de sable sur le rebord
  const bagMat = lam(0x8b7a55), bagGeo = new THREE.BoxGeometry(0.72, 0.26, 0.4);
  for (let x = -6; x <= 6; x += 0.7){ const b = new THREE.Mesh(bagGeo.clone(), bagMat); b.position.set(x + rand(-.05, .05), 8.74, -3.75); b.rotation.y = rand(-.12, .12); world.add(b); }
  bagGeo.dispose();
  // Lampadaires
  if (L.lamps){
    const poleMat = lam(0x222224), headMat = new THREE.MeshBasicMaterial({ color: L.lampGlow ? 0xffd27a : 0x3a2a1a });
    for (let z = -20; z > -160; z -= 26) [-1, 1].forEach(sd => { fixe(box(.2, 7, .2, poleMat, sd * 14, 3.5, z)); fixe(box(1.6, .15, .3, poleMat, sd * 13.3, 7, z)); fixe(box(.6, .15, .4, headMat, sd * 12.7, 6.9, z)); world.userData.tetes.push([sd * 12.7, 6.9, z]); });
  }
  // Autos abandonnées
  const carMats = [lam(0x5a2a22), lam(0x2d3b4a), lam(0x5c5a50), lam(0x1f2224)];
  car(-10.5, -30, .2, carMats[1]); car(11, -64, -.4, carMats[2]); car(-9, -88, 2.9, carMats[0]);
  // Feux (certains sur des carcasses d'autos)
  L.fires.forEach(f => { if (f[4]) car(f[0], f[2], rand(0, 3), null, true); else fixe(box(.7, 1, .7, lam(0x3b2a20), f[0], .5, f[2])); makeFire(f[0], f[1], f[2], f[3]); });
  // Barricade
  const barricade = new THREE.Group(); barricade.userData.barricade = true; world.add(barricade); // état visible : js/68-toit-decor.js
  const woodMat = lam(0x6b4a2c), wood2 = lam(0x55391f), concMat = lam(0x77736c);
  for (let x = -13; x <= 13; x += 3.2){
    fixe(box(.25, 1.6, .25, wood2, x, .8, BAR_Z, barricade), true); // planches et poteaux : penchent et tombent (js/68)
    const p1 = fixe(box(3.6, .28, .1, woodMat, x + 1.6, .9, BAR_Z - .15, barricade), true); p1.rotation.z = rand(-.35, .35);
    const p2 = fixe(box(3.6, .28, .1, woodMat, x + 1.6, .5, BAR_Z - .2, barricade), true); p2.rotation.z = rand(-.25, .25);
  }
  for (let x = -12; x <= 12; x += 6) fixe(box(2.4, .8, .7, concMat, x + rand(-1, 1), .4, BAR_Z + .5, barricade));
  car(-15, BAR_Z, 1.57, carMats[3]); car(15, BAR_Z, -1.5, carMats[0]);
  if (FUSION.on) fusionMonde(); // décor fixe : un maillage par matériau (js/03-scene-fusion.js)
  Jeu.emit('monde', L); // la rue est bâtie (style graphique, js/57-graphismes.js)
}
