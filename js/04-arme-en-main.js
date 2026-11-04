'use strict';
/* ================= Arme en main ================= */
// L'arme est dessinée dans sa propre scène, avec sa propre caméra, par-dessus le décor :
// elle ne traverse jamais les sacs de sable et garde la même taille quand on vise.
// Modèles : formes simples à facettes, fusionnées en une géométrie par arme (un seul appel de dessin
// pour les pièces fixes, mains comprises) ; seules les pièces animées sont séparées.
// Un seul matériau partagé (couleurs par sommet + petite texture d'usure) pour toutes les armes.
// Les points lumineux (guidon, points de mire) ont des couleurs « plus fortes que 1 » : ils restent vifs dans l'ombre.
const vmScene = new THREE.Scene();
const vmCam = new THREE.PerspectiveCamera(55, 1, 0.01, 10);
vmScene.add(vmCam);
vmScene.add(new THREE.HemisphereLight(0xffb070, 0x2a1a14, 0.75));
vmScene.add(new THREE.AmbientLight(0x503020, 0.35));
const vmSun = new THREE.DirectionalLight(0xff9a50, 0.5); vmSun.position.set(-1, 1, -2); vmScene.add(vmSun);
// Éclairage en trois points : lumière principale chaude en haut à droite (reflets sur le métal), lumière de contour
// froide derrière (découpe la silhouette), petite lumière d'appoint en bas à gauche
const vmKey = new THREE.DirectionalLight(0xffe2c0, .42); vmKey.position.set(1.2, 1.6, .6); vmScene.add(vmKey);
const vmRim = new THREE.DirectionalLight(0x9ab8ff, .45); vmRim.position.set(-.6, .4, -2.2); vmScene.add(vmRim);
const vmFill = new THREE.DirectionalLight(0xffa060, .2); vmFill.position.set(-1, -.8, .5); vmScene.add(vmFill);
const vmRoot = new THREE.Group(); vmCam.add(vmRoot);
const VM_POS = new THREE.Vector3(0.22, -0.22, -0.48);
const VM_SCALE = .8;
vmRoot.position.copy(VM_POS); vmRoot.scale.setScalar(VM_SCALE);
// Éclair de bouche : étoile à branches irrégulières avec un cœur blanc (plus vrai qu'une simple lueur ronde)
const vmFlashTex = canvasTex(128, 128, (g, w, h) => {
  const cx = w / 2, cy = h / 2;
  const gr = g.createRadialGradient(cx, cy, 0, cx, cy, w / 2);
  gr.addColorStop(0, 'rgba(255,255,240,1)'); gr.addColorStop(.18, 'rgba(255,220,140,.95)'); gr.addColorStop(.45, 'rgba(255,140,40,.35)'); gr.addColorStop(1, 'rgba(255,90,20,0)');
  g.fillStyle = gr; g.fillRect(0, 0, w, h);
  g.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 9; i++){
    const a = i / 9 * Math.PI * 2 + Math.random() * .3, L = w * (.28 + Math.random() * .2), wd = .07 + Math.random() * .06;
    g.beginPath(); g.moveTo(cx, cy);
    g.lineTo(cx + Math.cos(a - wd) * L * .35, cy + Math.sin(a - wd) * L * .35); g.lineTo(cx + Math.cos(a) * L, cy + Math.sin(a) * L);
    g.lineTo(cx + Math.cos(a + wd) * L * .35, cy + Math.sin(a + wd) * L * .35); g.closePath();
    g.fillStyle = 'rgba(255,190,90,.55)'; g.fill();
  }
});
const flashMat = new THREE.SpriteMaterial({ map: vmFlashTex, blending: THREE.AdditiveBlending, depthTest: false, depthWrite: false, fog: false, color: 0xffe0b0 });
const flash = new THREE.Sprite(flashMat); flash.visible = false; flash.renderOrder = 1001;
const muzzleLight = new THREE.PointLight(0xffb060, 0, 30, 2); camera.add(muzzleLight); muzzleLight.position.set(0.2, -0.1, -1.2);
const vmFlashLight = new THREE.PointLight(0xffb060, 0, 2, 2); vmCam.add(vmFlashLight); vmFlashLight.position.set(0, 0, -.7);
const VMS = {};

/* ---------- Texture partagée : grain fin, stries dans la longueur, rayures (une seule pour toutes les armes) ---------- */
const vmTex = canvasTex(128, 128, (g, w, h) => {
  g.fillStyle = '#e4e4e4'; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 70; i++){ const v = 200 + Math.floor(Math.random() * 55); g.fillStyle = 'rgba(' + v + ',' + v + ',' + v + ',.55)'; g.fillRect(0, Math.floor(Math.random() * h), w * (.3 + Math.random() * .7), 1 + Math.floor(Math.random() * 2)); }
  for (let i = 0; i < 900; i++){ const v = Math.floor(Math.random() * 255); g.fillStyle = 'rgba(' + v + ',' + v + ',' + v + ',.18)'; g.fillRect(Math.random() * w, Math.random() * h, 1 + Math.random() * 2, 1); }
  g.fillStyle = 'rgba(255,255,255,.35)';
  for (let i = 0; i < 14; i++) g.fillRect(Math.random() * w, Math.random() * h, 4 + Math.random() * 14, 1);
});
vmTex.wrapS = vmTex.wrapT = THREE.RepeatWrapping;
// Phong : reflets spéculaires (métal bleui, polymère satiné) ; la texture d'usure module aussi les reflets
const vmMat = new THREE.MeshPhongMaterial({ vertexColors: true, map: vmTex, specularMap: vmTex, fog: false, emissive: 0x0d0805, specular: 0x3a3632, shininess: 48 });
const vmFlameMat = new THREE.MeshBasicMaterial({ vertexColors: true, fog: false, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });
const vmShellMat = new THREE.MeshLambertMaterial({ color: 0xffffff, fog: false, emissive: 0x0d0805 });

// Couleurs (un tableau [r, g, b] peut dépasser 1 : point lumineux)
const VC = {
  blue: 0x25272d, park: 0x2d2e31, steel: 0x5a5d64, light: 0x80838a, poly: 0x1e1e21, polyE: 0x323238,
  wood: 0x6e4529, woodD: 0x4c2e1a, olive: 0x414e2d, oliveD: 0x2f3a20, red: 0x7c2016, brass: 0x9a7630,
  rubber: 0x141415, glove: 0x3b2f25, gloveD: 0x281f18, sleeve: 0x30362a, string: 0xb8ab88, port: 0x0b0b0d,
  yellow: 0x8a7426, face: 0xc8c0a8, lens: 0x1a3644, lensHi: 0x6a96aa,
  glow: [3.4, 1.6, .5], glowD: [2.4, 1.1, .35]
};

/* ---------- Petit constructeur de géométrie : prismes à facettes, fusionnés ---------- */
const _vmE = new THREE.Euler(), _vmQ = new THREE.Quaternion(), _vmS = new THREE.Vector3(), _vmP = new THREE.Vector3(), _vmM = new THREE.Matrix4();
const _vmA = new THREE.Vector3(), _vmB = new THREE.Vector3(), _vmC = new THREE.Vector3(), _vmCol = new THREE.Color();
function vmNew(){ return { p: [], c: [], m: new THREE.Matrix4(), st: [] }; }
function vmPush(b, x, y, z, rx, ry, rz, sx){
  b.st.push(b.m.clone());
  _vmE.set(rx || 0, ry || 0, rz || 0); _vmQ.setFromEuler(_vmE); _vmP.set(x, y, z); _vmS.set(sx || 1, 1, 1);
  b.m.multiply(_vmM.compose(_vmP, _vmQ, _vmS));
}
function vmPop(b){ b.m = b.st.pop(); }
function vmRGB(c){ if (Array.isArray(c)) return c; _vmCol.setHex(c); return [_vmCol.r, _vmCol.g, _vmCol.b]; }
function vmWear(c){ return Array.isArray(c) ? c : vmRGB(c).map(v => Math.min(1, v * 1.55 + .035)); } // arête usée, plus claire
function vmTri(b, a, c2, d, col){
  _vmA.set(a[0], a[1], a[2]).applyMatrix4(b.m); _vmB.set(c2[0], c2[1], c2[2]).applyMatrix4(b.m); _vmC.set(d[0], d[1], d[2]).applyMatrix4(b.m);
  if (b.m.determinant() < 0) b.p.push(_vmA.x, _vmA.y, _vmA.z, _vmC.x, _vmC.y, _vmC.z, _vmB.x, _vmB.y, _vmB.z);
  else b.p.push(_vmA.x, _vmA.y, _vmA.z, _vmB.x, _vmB.y, _vmB.z, _vmC.x, _vmC.y, _vmC.z);
  b.c.push(col[0], col[1], col[2], col[0], col[1], col[2], col[0], col[1], col[2]);
}
// Prisme : profil convexe (sens antihoraire vu de +z) étiré le long de z ; sf = échelle du bout avant (z négatif)
function vmPrism(b, prof, flags, len, col, x, y, z, rx, ry, rz, sf){
  vmPush(b, x, y, z, rx, ry, rz);
  const base = vmRGB(col), edge = vmWear(col), n = prof.length, h = len / 2, f = sf == null ? 1 : sf;
  const bk = prof.map(q => [q[0], q[1], h]), fr = prof.map(q => [q[0] * f, q[1] * f, -h]);
  for (let i = 0; i < n; i++){
    const j = (i + 1) % n, cc = flags && flags[i] ? edge : base;
    vmTri(b, bk[i], fr[i], fr[j], cc); vmTri(b, bk[i], fr[j], bk[j], cc);
  }
  for (let i = 1; i < n - 1; i++){ vmTri(b, bk[0], bk[i], bk[i + 1], base); if (f > .05) vmTri(b, fr[0], fr[i + 1], fr[i], base); }
  vmPop(b);
}
function vmRect(w, h, c){
  const a = w / 2, e = h / 2;
  if (!c) return [[[a, -e], [a, e], [-a, e], [-a, -e]], null];
  return [[[a, -e + c], [a, e - c], [a - c, e], [-a + c, e], [-a, e - c], [-a, -e + c], [-a + c, -e], [a - c, -e]], [0, 1, 0, 1, 0, 1, 0, 1]];
}
function vmCirc(r, n, ph){ const p = []; ph = ph == null ? Math.PI / n : ph; for (let i = 0; i < n; i++){ const a = ph + i / n * Math.PI * 2; p.push([Math.cos(a) * r, Math.sin(a) * r]); } return p; }
// Boîte à arêtes chanfreinées le long de z (ch absent : chanfrein automatique ; 0 : boîte nette)
function vmBox(b, w, h, d, col, x, y, z, rx, ry, rz, ch){
  if (ch == null) ch = Math.min(w, h) > .014 ? Math.min(w, h) * .16 : 0;
  const r = vmRect(w, h, ch); vmPrism(b, r[0], r[1], d, col, x, y, z, rx, ry, rz);
}
function vmCyl(b, r, len, col, x, y, z, rx, ry, rz, n, sf){ vmPrism(b, vmCirc(r, n || 8), null, len, col, x, y, z, rx, ry, rz, sf); }
// Anneau (tube creux) le long de z
function vmRing(b, ro, ri, len, col, x, y, z, rx, ry, rz, n){
  n = n || 8; vmPush(b, x, y, z, rx, ry, rz);
  const c = vmRGB(col), e = vmWear(col), dk = vmRGB(VC.port), o = vmCirc(ro, n), q = vmCirc(ri, n), h = len / 2;
  for (let i = 0; i < n; i++){
    const j = (i + 1) % n, ob = [o[i][0], o[i][1], h], oj = [o[j][0], o[j][1], h], of = [o[i][0], o[i][1], -h], ofj = [o[j][0], o[j][1], -h];
    const ib = [q[i][0], q[i][1], h], ij = [q[j][0], q[j][1], h], iff = [q[i][0], q[i][1], -h], ifj = [q[j][0], q[j][1], -h];
    vmTri(b, ob, of, ofj, c); vmTri(b, ob, ofj, oj, c);           // dehors
    vmTri(b, ib, ij, ifj, dk); vmTri(b, ib, ifj, iff, dk); // dedans, sombre
    vmTri(b, ob, oj, ij, e); vmTri(b, ob, ij, ib, e);             // face arrière (arête claire)
    vmTri(b, of, iff, ifj, e); vmTri(b, of, ifj, ofj, e);         // face avant
  }
  vmPop(b);
}
// Cylindre entre deux points (bras, tuyaux, cordes)
function vmCylAB(b, a, c, r, col, n, sf){
  const d = _vmA.set(c[0] - a[0], c[1] - a[1], c[2] - a[2]), len = d.length(); d.normalize();
  b.st.push(b.m.clone());
  _vmQ.setFromUnitVectors(_vmB.set(0, 0, -1), d); _vmP.set((a[0] + c[0]) / 2, (a[1] + c[1]) / 2, (a[2] + c[2]) / 2); _vmS.set(1, 1, 1);
  b.m.multiply(_vmM.compose(_vmP, _vmQ, _vmS));
  vmPrism(b, vmCirc(r, n || 6), null, len, col, 0, 0, 0, 0, 0, 0, sf);
  vmPop(b);
}
// Géométrie finale : normales de face (facettes), UV projetées (grain dans la longueur)
function vmGeo(b){
  const n = b.p.length, nor = new Float32Array(n), uv = new Float32Array(n / 3 * 2), K = 5;
  for (let i = 0; i < n; i += 9){
    _vmA.set(b.p[i + 3] - b.p[i], b.p[i + 4] - b.p[i + 1], b.p[i + 5] - b.p[i + 2]);
    _vmB.set(b.p[i + 6] - b.p[i], b.p[i + 7] - b.p[i + 1], b.p[i + 8] - b.p[i + 2]);
    _vmA.cross(_vmB).normalize();
    const ax = Math.abs(_vmA.x), ay = Math.abs(_vmA.y), az = Math.abs(_vmA.z);
    for (let k = 0; k < 3; k++){
      const o = i + k * 3, t = (i / 3 + k) * 2;
      nor[o] = _vmA.x; nor[o + 1] = _vmA.y; nor[o + 2] = _vmA.z;
      const X = b.p[o], Y = b.p[o + 1], Z = b.p[o + 2];
      if (ax >= ay && ax >= az){ uv[t] = Z * K; uv[t + 1] = Y * K * 3; }
      else if (ay >= az){ uv[t] = Z * K; uv[t + 1] = X * K * 3; }
      else { uv[t] = X * K * 3; uv[t + 1] = Y * K * 3; }
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(b.p, 3));
  g.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(b.c, 3));
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  g.computeBoundingSphere();
  return g;
}
function vmMesh(parent, b, mat, x, y, z){ const m = new THREE.Mesh(vmGeo(b), mat || vmMat); m.position.set(x || 0, y || 0, z || 0); parent.add(m); return m; }

/* ---------- Mains (gants) et manches ---------- */
// Main droite qui serre une poignée verticale. Repère de la poignée : y le long de la poignée, z vers l'arrière.
// gw, gd : demi-largeur et demi-profondeur de la poignée. mir = -1 : main gauche.
function vmFist(b, gw, gd){
  const G = VC.glove, D = VC.gloveD;
  vmBox(b, .018, .066, gd * 2 + .022, G, gw + .008, -.006, .005, 0, 0, 0, .006);          // dos de la main
  vmBox(b, gw * 2 + .03, .06, .02, G, 0, -.01, -gd - .009, 0, 0, 0, .006);               // doigts devant
  for (let i = 0; i < 2; i++) vmBox(b, gw * 2 + .032, .0025, .021, D, 0, .005 - i * .016, -gd - .009, 0, 0, 0, 0);
  vmBox(b, .013, .058, gd * 1.5, G, -gw - .006, -.01, -gd * .25, 0, 0, 0, 0);           // bouts des doigts
  vmBox(b, .014, .016, .046, G, -gw - .006, .034, -.006, -.12, 0, 0, .004);               // pouce
  vmBox(b, gw * 2 + .02, .02, gd * 2 + .02, D, .004, .033, .006, 0, 0, 0, 0);            // haut de la main
}
// Main gauche sous un garde-main horizontal (largeur 2 fw, hauteur 2 fh, centre x,y,z) : pouce à gauche, doigts à droite
function vmCup(b, x, y, z, fw, fh, len){
  const G = VC.glove, D = VC.gloveD; len = len || .066;
  vmBox(b, fw * 2 + .016, .02, len, G, x, y - fh - .009, z, 0, 0, 0, .007);              // paume
  vmBox(b, .014, fh * 1.4, len * .95, G, x + fw + .006, y - fh * .3, z, 0, 0, 0, .005);  // doigts côté droit
  for (let i = 0; i < 2; i++) vmBox(b, .015, fh * 1.4, .0025, D, x + fw + .006, y - fh * .3, z - len * .17 + i * len * .34, 0, 0, 0, 0);
  vmBox(b, .014, fh * 1.1, len * .6, G, x - fw - .006, y - fh * .45, z + len * .1, 0, 0, 0, 0); // pouce
}
// Avant-bras : poignet, manche
function vmArm(b, a, c, r){
  // la manche s'arrête aux trois quarts : elle ne vient pas boucher la vue quand on vise
  const e = [a[0] + (c[0] - a[0]) * .8, a[1] + (c[1] - a[1]) * .8, a[2] + (c[2] - a[2]) * .8];
  vmCylAB(b, a, e, (r || .026) * .85, VC.sleeve, 6, 1.12);
  vmCylAB(b, a, [a[0] + (c[0] - a[0]) * .12, a[1] + (c[1] - a[1]) * .12, a[2] + (c[2] - a[2]) * .12], (r || .026) * .8, VC.gloveD, 6);
}

/* ---------- Les 8 armes ---------- */
// userData : muzzle (z du bout du canon), muzzleY, sightY (hauteur de la ligne de mire), adsZ, sight (points de visée pour les tests),
// pièces animées (slide, mag, pump, boltM, bolt, warhead, pilot, barrels, needle...), eject (fenêtre d'éjection)
function buildVM(){
  const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
  let g, b, i;

  /* ===== Pistolet ===== */
  g = new THREE.Group(); b = vmNew();
  {
    const SY = .051;
    vmBox(b, .052, .028, .2, VC.poly, 0, -.026, -.13, 0, 0, 0, .006);                      // carcasse
    for (i = 0; i < 3; i++) vmBox(b, .054, .004, .008, VC.polyE, 0, -.039, -.17 - i * .02, 0, 0, 0, 0); // rail
    vmBox(b, .014, .007, .058, VC.poly, 0, -.064, -.06, 0, 0, 0, 0);                         // pontet
    vmBox(b, .014, .032, .008, VC.poly, 0, -.051, -.089, .2, 0, 0, 0);
    vmBox(b, .005, .024, .006, VC.steel, 0, -.047, -.054, .3, 0, 0, 0);                      // détente
    vmCyl(b, .009, .22, VC.steel, 0, .012, -.138, 0, 0, 0, 8);                                // canon (visible quand la glissière recule)
    vmCyl(b, .0055, .003, VC.port, 0, .012, -.248, 0, 0, 0, 8);
    vmBox(b, .008, .012, .016, VC.park, -.026, -.006, -.075, 0, 0, 0, 0);                    // arrêtoir de culasse
    vmBox(b, .012, .016, .01, VC.park, 0, .02, .009, -.4, 0, 0, 0);                           // chien
    vmPush(b, 0, -.098, .008, -.26);
    vmBox(b, .05, .118, .056, VC.poly, 0, 0, 0, 0, 0, 0, .01);                                // poignée
    for (i = 0; i < 5; i++) vmBox(b, .053, .005, .04, VC.polyE, 0, .038 - i * .019, -.002, 0, 0, 0, 0); // texture
    for (i = 0; i < 4; i++) vmBox(b, .028, .004, .004, VC.polyE, 0, .03 - i * .02, .0285, 0, 0, 0, 0);
    vmCyl(b, .004, .056, VC.steel, 0, .025, .0, 0, Math.PI / 2, 0, 6);                        // vis des plaquettes
    vmFist(b, .025, .028);
    vmPop(b);
    vmCup(b, -.012, -.08, -.01, .03, .02, .05);                                                // main gauche en soutien
    vmArm(b, [.02, -.07, .05], [.07, -.2, .32], .027);
    vmArm(b, [-.03, -.11, .02], [-.12, -.22, .3], .026);
    vmMesh(g, b);
    // Glissière (recule à chaque tir, reste ouverte quand le chargeur est vide)
    const s = vmNew();
    vmBox(s, .056, .045, .25, VC.blue, 0, .0105, -.12, 0, 0, 0, .009);
    for (i = 0; i < 6; i++) vmBox(s, .058, .026, .0035, VC.park, 0, .012, -.004 - i * .007, 0, 0, 0, 0);
    for (i = 0; i < 3; i++) vmBox(s, .058, .022, .0035, VC.park, 0, .012, -.205 - i * .008, 0, 0, 0, 0);
    vmBox(s, .002, .016, .046, VC.port, .0279, .02, -.085, 0, 0, 0, 0);                     // fenêtre d'éjection
    vmBox(s, .002, .01, .03, VC.steel, .0292, .019, -.088, 0, 0, 0, 0);
    vmBox(s, .044, .008, .014, VC.park, 0, .036, -.006, 0, 0, 0, 0);                         // hausse
    vmBox(s, .013, .014, .012, VC.park, -.0125, .044, -.006, 0, 0, 0, 0);
    vmBox(s, .013, .014, .012, VC.park, .0125, .044, -.006, 0, 0, 0, 0);
    vmBox(s, .0042, .0042, .001, VC.glowD, -.0125, .046, .0003, 0, 0, 0, 0);                // points de la hausse
    vmBox(s, .0042, .0042, .001, VC.glowD, .0125, .046, .0003, 0, 0, 0, 0);
    vmBox(s, .007, .017, .012, VC.park, 0, .0425, -.232, 0, 0, 0, 0);                         // guidon
    vmBox(s, .005, .005, .001, VC.glow, 0, .0465, -.2255, 0, 0, 0, 0);
    vmBox(s, .006, .004, .006, VC.glow, 0, SY - .002, -.232, 0, 0, 0, 0);
    vmRing(s, .0105, .0062, .004, VC.blue, 0, .012, -.244, 0, 0, 0, 8);                       // bouche
    const slide = vmMesh(g, s);
    // Chargeur (descend puis remonte à la recharge)
    const mg = vmNew();
    vmBox(mg, .04, .1, .046, VC.blue, 0, .004, 0, 0, 0, 0, .004);
    vmBox(mg, .054, .012, .062, VC.poly, 0, -.064, .002, 0, 0, 0, .004);
    const mag = vmMesh(g, mg, null, 0, -.098, .008); mag.rotation.x = -.26;
    g.userData = { muzzle: -.25, muzzleY: .012, sightY: SY, adsZ: -.30, sight: [V3(0, SY, -.232), V3(0, SY, -.006)],
      slide, slideAmp: .032, slideLock: true, mag, magDir: V3(0, -Math.cos(.26), Math.sin(.26)), magDrop: .2,
      eject: V3(.03, .025, -.085), shell: 0 };
  }
  VMS.pistol = g;

  /* ===== Fusil à pompe ===== */
  g = new THREE.Group(); b = vmNew();
  {
    const SY = .053;
    vmBox(b, .064, .084, .22, VC.blue, 0, 0, -.06, 0, 0, 0, .01);                             // boîte de culasse
    vmBox(b, .002, .022, .07, VC.port, .0322, .012, -.07, 0, 0, 0, 0);                       // éjection
    vmBox(b, .036, .002, .1, VC.port, 0, -.0421, -.07, 0, 0, 0, 0);                          // fenêtre de chargement
    for (i = 0; i < 2; i++) vmCyl(b, .0045, .068, VC.light, 0, -.018, -.01 - i * .1, 0, Math.PI / 2, 0, 6); // goupilles
    vmBox(b, .03, .006, .22, VC.park, 0, .044, -.06, 0, 0, 0, 0);                             // bande du dessus
    vmCyl(b, .017, .53, VC.blue, 0, .022, -.435, 0, 0, 0, 10);                                 // canon
    vmBox(b, .008, .005, .52, VC.park, 0, .0415, -.43, 0, 0, 0, 0);                           // bande ventilée
    for (i = 0; i < 6; i++) vmBox(b, .006, .004, .006, VC.park, 0, .0375, -.22 - i * .085, 0, 0, 0, 0);
    vmRing(b, .0195, .011, .012, VC.park, 0, .022, -.696, 0, 0, 0, 10);                       // bouche
    vmCyl(b, .0045, .005, VC.glow, 0, SY - .0045, -.682, Math.PI / 2, 0, 0, 6);              // bille du guidon
    vmCyl(b, .014, .47, VC.park, 0, -.018, -.405, 0, 0, 0, 8);                                // magasin tubulaire
    vmCyl(b, .016, .03, VC.steel, 0, -.018, -.655, 0, 0, 0, 8);                               // bouchon
    vmBox(b, .022, .058, .016, VC.park, 0, .002, -.6, 0, 0, 0, .004);                         // collier
    vmBox(b, .008, .011, .012, VC.park, -.009, SY - .0055, -.008, 0, 0, 0, 0);               // cran de mire
    vmBox(b, .008, .011, .012, VC.park, .009, SY - .0055, -.008, 0, 0, 0, 0);
    vmBox(b, .014, .007, .06, VC.blue, 0, -.067, .0, 0, 0, 0, 0);                             // pontet
    vmBox(b, .014, .03, .008, VC.blue, 0, -.054, -.03, .2, 0, 0, 0);
    vmBox(b, .005, .022, .006, VC.light, 0, -.052, -.005, .3, 0, 0, 0);                       // détente
    vmCyl(b, .005, .02, VC.red, 0, -.045, .02, 0, Math.PI / 2, 0, 6);                         // sûreté
    for (i = 0; i < 4; i++){                                                                   // cartouches de réserve
      vmCyl(b, .0085, .036, VC.red, -.04, -.003, -.02 - i * .022, Math.PI / 2, 0, 0, 6);
      vmCyl(b, .009, .008, VC.brass, -.04, -.025, -.02 - i * .022, Math.PI / 2, 0, 0, 6);
    }
    vmBox(b, .006, .05, .1, VC.poly, -.0345, -.004, -.053, 0, 0, 0, .002);
    vmPush(b, 0, -.036, .095, -.32);
    vmBox(b, .046, .075, .1, VC.wood, 0, 0, 0, 0, 0, 0, .012);                                // poignée
    for (i = 0; i < 4; i++) vmBox(b, .048, .003, .05, VC.woodD, 0, .02 - i * .014, -.01, 0, 0, 0, 0); // quadrillage
    vmPush(b, 0, -.012, .02, .32); vmFist(b, .023, .03); vmPop(b);
    vmPop(b);
    vmBox(b, .052, .095, .2, VC.wood, 0, -.052, .235, -.08, 0, 0, .013);                       // crosse
    vmBox(b, .056, .11, .02, VC.rubber, 0, -.06, .34, -.08, 0, 0, .008);                      // plaque de couche
    vmCyl(b, .004, .056, VC.light, 0, -.03, .2, 0, Math.PI / 2, 0, 6);
    vmArm(b, [.02, -.03, .14], [.08, -.2, .36], .028);
    vmMesh(g, b);
    // Pompe (garde-main + main gauche)
    const p = vmNew();
    vmBox(p, .066, .05, .2, VC.wood, 0, -.022, -.34, 0, 0, 0, .012);
    for (i = 0; i < 7; i++) vmBox(p, .068, .052, .006, VC.woodD, 0, -.022, -.265 - i * .025, 0, 0, 0, .012);
    vmBox(p, .004, .008, .11, VC.steel, .03, -.012, -.19, 0, 0, 0, 0);                        // barres d'action
    vmBox(p, .004, .008, .11, VC.steel, -.03, -.012, -.19, 0, 0, 0, 0);
    vmCup(p, 0, -.022, -.35, .033, .025, .075);
    vmArm(p, [-.03, -.06, -.31], [-.16, -.24, -.02], .027);
    const pump = vmMesh(g, p);
    // Cartouche qu'on glisse dans la fenêtre pendant la recharge
    const sh = vmNew();
    vmCyl(sh, .0085, .05, VC.red, 0, 0, 0, 0, 0, 0, 7); vmCyl(sh, .009, .01, VC.brass, 0, 0, .028, 0, 0, 0, 7);
    vmBox(sh, .045, .02, .05, VC.glove, 0, -.02, .02, 0, 0, 0, .006);                        // pouce qui pousse
    const load = vmMesh(g, sh, null, 0, -.06, -.06); load.visible = false;
    g.userData = { muzzle: -.7, muzzleY: .022, sightY: SY, adsZ: -.24, sight: [V3(0, SY, -.682), V3(0, SY, -.008)],
      pump, pumpAmp: .075, load, eject: V3(.034, .012, -.07), shell: 1 };
  }
  VMS.shotgun = g;

  /* ===== Fusil d'assaut ===== */
  g = new THREE.Group(); b = vmNew();
  {
    const SY = .095;
    vmBox(b, .058, .05, .26, VC.park, 0, .02, -.04, 0, 0, 0, .009);                           // boîte de culasse supérieure
    vmBox(b, .026, .008, .52, VC.blue, 0, .049, -.17, 0, 0, 0, 0);                             // rail
    for (i = 0; i < 12; i++) vmBox(b, .03, .0045, .0065, VC.blue, 0, .0545, .072 - i * .043, 0, 0, 0, 0);
    vmBox(b, .002, .018, .05, VC.port, .0292, .022, -.04, 0, 0, 0, 0);                        // fenêtre d'éjection
    vmBox(b, .004, .02, .05, VC.park, .033, .004, -.04, .5, 0, 0, 0);                          // couvre-poussière ouvert
    vmCyl(b, .008, .022, VC.steel, .032, .036, .055, 0, 0, 0, 7);                              // assistance de fermeture
    vmBox(b, .03, .008, .016, VC.park, 0, .04, .1, 0, 0, 0, 0);                               // levier d'armement
    vmBox(b, .054, .05, .2, VC.park, 0, -.03, -.01, 0, 0, 0, .008);                          // boîte inférieure
    vmBox(b, .05, .05, .07, VC.park, 0, -.062, -.11, 0, 0, 0, .006);                          // puits du chargeur
    vmBox(b, .016, .01, .014, VC.light, -.03, -.025, .03, 0, 0, .3, 0);                       // sélecteur
    vmCyl(b, .006, .006, VC.steel, .029, -.04, -.08, 0, Math.PI / 2, 0, 6);                   // arrêtoir du chargeur
    vmBox(b, .014, .006, .07, VC.park, 0, -.083, -.03, 0, 0, 0, 0);                           // pontet
    vmBox(b, .005, .022, .006, VC.light, 0, -.064, -.035, .3, 0, 0, 0);                       // détente
    for (i = 0; i < 2; i++) vmCyl(b, .004, .058, VC.steel, 0, -.02, -.07 + i * .1, 0, Math.PI / 2, 0, 6); // goupilles
    vmPush(b, 0, -.095, .045, -.38);
    vmBox(b, .034, .085, .044, VC.poly, 0, 0, 0, 0, 0, 0, .008);                              // poignée
    for (i = 0; i < 5; i++) vmBox(b, .037, .004, .03, VC.polyE, 0, .03 - i * .015, .002, 0, 0, 0, 0);
    vmFist(b, .017, .022);
    vmPop(b);
    vmBox(b, .062, .062, .3, VC.poly, 0, .018, -.32, 0, 0, 0, .018);                          // garde-main
    for (i = 0; i < 4; i++){ vmBox(b, .064, .012, .03, VC.port, 0, .012, -.22 - i * .06, 0, 0, 0, 0); }
    vmCyl(b, .011, .2, VC.blue, 0, .02, -.565, 0, 0, 0, 8);                                    // canon
    vmBox(b, .03, .03, .03, VC.park, 0, .022, -.5, 0, 0, 0, .006);                            // bloc des gaz
    vmBox(b, .03, .022, .03, VC.park, 0, .032, -.6, 0, 0, 0, .005);                           // base du guidon
    vmBox(b, .008, .045, .022, VC.park, 0, .065, -.6, .15, 0, 0, 0);                          // tour du guidon
    vmBox(b, .005, .03, .012, VC.park, -.013, .085, -.6, 0, 0, 0, 0);                        // oreilles
    vmBox(b, .005, .03, .012, VC.park, .013, .085, -.6, 0, 0, 0, 0);
    vmBox(b, .031, .005, .012, VC.park, 0, .072, -.6, 0, 0, 0, 0);
    vmBox(b, .0045, .02, .006, VC.park, 0, SY - .01, -.6, 0, 0, 0, 0);                        // guidon
    vmBox(b, .004, .004, .001, VC.glow, 0, SY - .0025, -.5965, 0, 0, 0, 0);
    vmCyl(b, .0135, .045, VC.park, 0, .02, -.685, 0, 0, 0, 8);                                // cache-flamme
    for (i = 0; i < 2; i++) vmBox(b, .03, .003, .03, VC.port, 0, .02, -.69, 0, 0, Math.PI / 4 + i * Math.PI / 2, 0);
    vmCyl(b, .007, .003, VC.port, 0, .02, -.708, 0, 0, 0, 8);
    vmBox(b, .03, .012, .03, VC.park, 0, .064, .05, 0, 0, 0, .004);                           // hausse à œilleton
    vmBox(b, .005, .045, .02, VC.park, -.013, .089, .05, 0, 0, 0, 0);
    vmBox(b, .005, .045, .02, VC.park, .013, .089, .05, 0, 0, 0, 0);
    vmBox(b, .006, .014, .006, VC.park, 0, .077, .05, 0, 0, 0, 0);
    vmRing(b, .0085, .0035, .005, VC.park, 0, SY, .05, 0, 0, 0, 8);
    vmCyl(b, .015, .22, VC.park, 0, .006, .2, 0, 0, 0, 8);                                    // tube de crosse
    vmBox(b, .044, .07, .17, VC.poly, 0, -.008, .25, 0, 0, 0, .012);                          // crosse
    vmBox(b, .046, .02, .1, VC.polyE, 0, -.045, .27, 0, 0, 0, .006);
    vmBox(b, .05, .095, .02, VC.rubber, 0, -.015, .34, 0, 0, 0, .008);
    vmCup(b, 0, .018, -.36, .031, .031, .07);                                                   // main gauche
    vmArm(b, [-.035, -.03, -.32], [-.17, -.22, -.02], .028);
    vmArm(b, [.02, -.06, .1], [.08, -.2, .34], .028);
    vmMesh(g, b);
    // Culasse visible dans la fenêtre (recule à chaque tir)
    const c = vmNew(); vmBox(c, .002, .012, .034, VC.light, .0298, .022, -.04, 0, 0, 0, 0); vmBox(c, .003, .004, .01, VC.steel, .031, .022, -.03, 0, 0, 0, 0);
    const slide = vmMesh(g, c);
    // Chargeur courbe
    const mg = vmNew();
    vmBox(mg, .03, .08, .06, VC.park, 0, -.03, 0, 0, 0, 0, .006);
    vmBox(mg, .03, .07, .056, VC.park, 0, -.1, .01, .25, 0, 0, .006);
    for (i = 0; i < 2; i++) vmBox(mg, .032, .05, .004, VC.blue, 0, -.05, -.015 + i * .03, 0, 0, 0, 0);
    vmBox(mg, .034, .01, .064, VC.blue, 0, -.138, .02, .25, 0, 0, .003);
    const mag = vmMesh(g, mg, null, 0, -.06, -.11);
    g.userData = { muzzle: -.71, muzzleY: .02, sightY: SY, adsZ: -.2, sight: [V3(0, SY, -.6), V3(0, SY, .05)],
      slide, slideAmp: .028, mag, magDir: V3(0, -1, .05), magDrop: .25, eject: V3(.032, .022, -.04), shell: 2 };
  }
  VMS.rifle = g;

  /* ===== Sniper ===== */
  g = new THREE.Group(); b = vmNew();
  {
    const SY = .09;
    vmBox(b, .058, .06, .36, VC.wood, 0, -.012, -.4, 0, 0, 0, .014);                          // fût
    vmBox(b, .062, .05, .22, VC.wood, 0, -.02, -.11, 0, 0, 0, .012);                          // sous la culasse
    for (i = 0; i < 6; i++) vmBox(b, .06, .003, .05, VC.woodD, 0, -.044 + i * .0, -.42 - i * .025, 0, 0, 0, 0); // quadrillage
    vmCyl(b, .021, .22, VC.blue, 0, .02, -.1, 0, 0, 0, 10);                                   // boîte de culasse ronde
    vmBox(b, .002, .016, .07, VC.port, .021, .026, -.04, 0, 0, 0, 0);
    vmCyl(b, .015, .64, VC.blue, 0, .02, -.53, 0, 0, 0, 8, .75);                              // canon effilé
    vmCyl(b, .015, .055, VC.park, 0, .02, -.875, 0, 0, 0, 8);                                 // frein de bouche
    for (i = 0; i < 2; i++) vmBox(b, .034, .008, .012, VC.port, 0, .02, -.865 - i * .02, 0, 0, 0, 0);
    vmCyl(b, .007, .003, VC.port, 0, .02, -.903, 0, 0, 0, 8);
    // Lunette
    vmCyl(b, .016, .3, VC.blue, 0, SY, -.16, 0, 0, 0, 10);
    vmCyl(b, .024, .07, VC.blue, 0, SY, -.345, 0, 0, 0, 10, 1); vmCyl(b, .016, .05, VC.blue, 0, SY, -.3, 0, 0, 0, 10, 1.5);
    vmRing(b, .026, .021, .025, VC.park, 0, SY, -.39, 0, 0, 0, 10);                            // pare-soleil
    vmCyl(b, .021, .002, VC.lens, 0, SY, -.38, 0, 0, 0, 10);                                   // verre avant
    vmBox(b, .009, .006, .001, VC.lensHi, -.007, SY + .009, -.3805, 0, 0, .4, 0);
    vmCyl(b, .016, .05, VC.blue, 0, SY, .02, 0, 0, 0, 10, 1); vmCyl(b, .02, .04, VC.rubber, 0, SY, .06, 0, 0, 0, 10, .85); // oculaire
    vmCyl(b, .016, .002, VC.lens, 0, SY, .0805, 0, 0, 0, 10);
    vmCyl(b, .011, .022, VC.park, 0, SY + .022, -.16, Math.PI / 2, 0, 0, 8);                  // tourelles
    vmCyl(b, .011, .022, VC.park, .022, SY, -.16, 0, Math.PI / 2, 0, 8);
    for (i = 0; i < 2; i++){                                                                  // bagues et embases
      const z = i ? -.235 : -.06;
      vmCyl(b, .02, .016, VC.park, 0, SY, z, 0, 0, 0, 10);
      vmBox(b, .02, .03, .016, VC.park, 0, .055, z, 0, 0, 0, .004);
      vmCyl(b, .003, .046, VC.light, 0, SY - .012, z, 0, Math.PI / 2, 0, 6);
    }
    vmBox(b, .014, .006, .066, VC.blue, 0, -.05, -.06, 0, 0, 0, 0);                           // pontet
    vmBox(b, .005, .022, .006, VC.light, 0, -.04, -.06, .3, 0, 0, 0);
    vmPush(b, 0, -.07, .045, -.36);
    vmBox(b, .044, .085, .055, VC.wood, 0, 0, 0, 0, 0, 0, .012);                               // poignée
    for (i = 0; i < 4; i++) vmBox(b, .046, .003, .04, VC.woodD, 0, .022 - i * .014, -.004, 0, 0, 0, 0);
    vmFist(b, .022, .026);
    vmPop(b);
    vmBox(b, .052, .11, .22, VC.wood, 0, -.045, .19, 0, 0, 0, .014);                          // crosse
    vmBox(b, .046, .03, .12, VC.woodD, 0, .022, .19, 0, 0, 0, .01);                           // appui-joue
    vmBox(b, .054, .12, .02, VC.rubber, 0, -.045, .31, 0, 0, 0, .008);
    vmCyl(b, .004, .056, VC.light, 0, -.02, -.5, 0, Math.PI / 2, 0, 6);                       // vis du fût
    vmCup(b, 0, -.012, -.43, .029, .03, .07);
    vmArm(b, [-.035, -.06, -.39], [-.17, -.24, -.08], .028);
    vmArm(b, [.02, -.05, .11], [.08, -.2, .34], .028);
    vmMesh(g, b);
    // Levier de culasse (pivote sur l'axe de la culasse puis recule)
    const bl = vmNew();
    vmCyl(bl, .016, .1, VC.light, 0, 0, .02, 0, 0, 0, 8);
    vmBox(bl, .036, .007, .008, VC.light, .026, 0, .045, 0, 0, -.35, 0);
    vmCyl(bl, .009, .014, VC.park, .046, -.008, .045, 0, Math.PI / 2, 0, 8);
    const boltM = vmMesh(g, bl, null, 0, .02, 0);
    const mg = vmNew(); vmBox(mg, .036, .05, .07, VC.park, 0, 0, 0, 0, 0, 0, .006); vmBox(mg, .04, .008, .074, VC.blue, 0, -.026, 0, 0, 0, 0, .003);
    const mag = vmMesh(g, mg, null, 0, -.046, -.12);
    g.userData = { muzzle: -.91, muzzleY: .02, sightY: SY, adsZ: -.2, sight: [V3(0, SY, -.38), V3(0, SY, .08)],
      boltM, mag, magDir: V3(0, -1, 0), magDrop: .2, eject: V3(.025, .03, -.04), shell: 3 };
  }
  VMS.sniper = g;

  /* ===== Arbalète ===== */
  g = new THREE.Group(); b = vmNew();
  {
    const SY = .083;
    vmBox(b, .056, .052, .42, VC.wood, 0, -.006, -.25, 0, 0, 0, .012);                        // fût
    vmBox(b, .028, .012, .44, VC.steel, 0, .026, -.38, 0, 0, 0, .003);                         // rail
    vmBox(b, .004, .003, .44, VC.port, 0, .0325, -.38, 0, 0, 0, 0);                            // rainure
    vmBox(b, .05, .036, .1, VC.park, 0, .036, -.15, 0, 0, 0, .008);                            // mécanisme
    vmBox(b, .012, .01, .012, VC.light, 0, .046, -.2, 0, 0, 0, 0);                             // noix
    for (i = 0; i < 2; i++) vmCyl(b, .004, .054, VC.light, 0, .03, -.13 - i * .04, 0, Math.PI / 2, 0, 6);
    vmBox(b, .07, .06, .05, VC.park, 0, .018, -.585, 0, 0, 0, .01);                            // arc : support
    for (const s of [-1, 1]){                                                                   // branches de l'arc
      vmBox(b, .14, .016, .026, VC.poly, s * .1, .03, -.575, 0, -s * .12, 0, .004);
      vmBox(b, .1, .014, .022, VC.poly, s * .21, .03, -.553, 0, -s * .35, 0, .004);
      vmCyl(b, .014, .022, VC.steel, s * .262, .03, -.536, Math.PI / 2, 0, 0, 8);              // poulies
    }
    vmBox(b, .01, .05, .03, VC.park, -.025, -.02, -.622, .35, 0, 0, 0);                         // étrier
    vmBox(b, .01, .05, .03, VC.park, .025, -.02, -.622, .35, 0, 0, 0);
    vmBox(b, .06, .01, .012, VC.park, 0, -.044, -.64, 0, 0, 0, 0);
    vmBox(b, .006, .03, .01, VC.park, 0, .065, -.6, 0, 0, 0, 0);                               // guidon
    vmBox(b, .005, .005, .001, VC.glow, 0, SY - .004, -.5945, 0, 0, 0, 0);
    vmBox(b, .028, .006, .01, VC.park, 0, .051, -.6, 0, 0, 0, 0);
    vmBox(b, .006, .03, .01, VC.park, 0, .068, -.1, 0, 0, 0, 0);                               // œilleton
    vmRing(b, .0075, .0032, .005, VC.park, 0, SY, -.1, 0, 0, 0, 8);
    vmBox(b, .014, .006, .06, VC.park, 0, -.045, -.12, 0, 0, 0, 0);                            // pontet
    vmBox(b, .005, .022, .006, VC.light, 0, -.035, -.12, .3, 0, 0, 0);
    vmPush(b, 0, -.065, -.075, -.3);
    vmBox(b, .04, .08, .05, VC.wood, 0, 0, 0, 0, 0, 0, .012);
    for (i = 0; i < 4; i++) vmBox(b, .042, .003, .036, VC.woodD, 0, .02 - i * .013, -.004, 0, 0, 0, 0);
    vmFist(b, .02, .024);
    vmPop(b);
    vmBox(b, .03, .04, .12, VC.wood, 0, -.04, .0, -.25, 0, 0, .008);                           // crosse squelette
    vmBox(b, .048, .1, .14, VC.wood, 0, -.04, .11, 0, 0, 0, .014);
    vmBox(b, .05, .11, .02, VC.rubber, 0, -.04, .19, 0, 0, 0, .008);
    vmCup(b, 0, -.006, -.36, .028, .026, .07);
    vmArm(b, [-.035, -.05, -.32], [-.17, -.24, -.02], .028);
    vmArm(b, [.02, -.05, -.03], [.08, -.2, .26], .028);
    vmMesh(g, b);
    // Corde tendue (carreau en place) ou relâchée (après le tir)
    const sd = vmNew(); vmCylAB(sd, [-.262, .036, -.536], [0, .036, -.2], .0022, VC.string, 4); vmCylAB(sd, [.262, .036, -.536], [0, .036, -.2], .0022, VC.string, 4);
    const strDrawn = vmMesh(g, sd);
    const sr = vmNew(); vmCylAB(sr, [-.262, .036, -.536], [.262, .036, -.536], .0022, VC.string, 4);
    const strRel = vmMesh(g, sr); strRel.visible = false;
    // Carreau (affiché seulement quand il est chargé : 20-armes.js)
    const cb = vmNew();
    vmCyl(cb, .0045, .4, VC.brass, 0, 0, 0, 0, 0, 0, 6);
    vmCyl(cb, .007, .04, VC.light, 0, 0, -.22, 0, 0, Math.PI / 4, 4, .05);                   // pointe
    for (i = 0; i < 3; i++) vmBox(cb, .002, .016, .05, VC.red, 0, 0, .16, 0, 0, i * Math.PI * 2 / 3, 0); // plumes
    const bolt = vmMesh(g, cb, null, 0, .043, -.4);
    g.userData = { muzzle: -.64, muzzleY: .04, sightY: SY, adsZ: -.22, sight: [V3(0, SY, -.6), V3(0, SY, -.1)], bolt, strDrawn, strRel };
  }
  VMS.crossbow = g;

  /* ===== Lance-flammes ===== */
  g = new THREE.Group(); b = vmNew();
  {
    const SY = .052;
    vmBox(b, .064, .07, .38, VC.olive, 0, 0, -.12, 0, 0, 0, .012);                             // corps
    for (i = 0; i < 3; i++) vmCyl(b, .004, .068, VC.light, 0, -.02, -.02 - i * .12, 0, Math.PI / 2, 0, 6); // vis
    vmBox(b, .05, .05, .32, VC.park, 0, .01, -.47, 0, 0, 0, .013);                              // bouclier perforé
    for (i = 0; i < 5; i++) for (const s of [-1, 1]) vmBox(b, .004, .012, .024, VC.port, s * .0245, .01, -.35 - i * .055, 0, 0, 0, 0);
    for (i = 0; i < 5; i++) vmBox(b, .016, .003, .024, VC.port, 0, .0355, -.35 - i * .055, 0, 0, 0, 0);
    vmCyl(b, .014, .1, VC.steel, 0, .01, -.67, 0, 0, 0, 8);                                    // buse
    vmCyl(b, .021, .05, VC.park, 0, .01, -.72, 0, 0, 0, 8, .8);
    vmCyl(b, .009, .003, VC.port, 0, .01, -.746, 0, 0, 0, 8);
    vmCyl(b, .008, .05, VC.steel, 0, -.022, -.715, 0, 0, 0, 6);                               // allumeur
    vmBox(b, .008, .011, .012, VC.park, -.009, SY - .0055, -.02, 0, 0, 0, 0);                  // cran de mire
    vmBox(b, .008, .011, .012, VC.park, .009, SY - .0055, -.02, 0, 0, 0, 0);
    vmBox(b, .022, .006, .016, VC.park, 0, .038, -.02, 0, 0, 0, 0);
    vmBox(b, .006, .017, .01, VC.park, 0, SY - .0085, -.6, 0, 0, 0, 0);                        // guidon
    vmBox(b, .005, .005, .001, VC.glow, 0, SY - .003, -.5945, 0, 0, 0, 0);
    // Réservoir
    vmCyl(b, .045, .22, VC.red, 0, -.088, -.14, 0, 0, 0, 10);
    vmCyl(b, .045, .03, VC.red, 0, -.088, -.265, 0, 0, 0, 10, .6); vmCyl(b, .045, .03, VC.red, 0, -.088, -.015, 0, 0, 0, 10, 1);
    for (i = 0; i < 2; i++) vmCyl(b, .047, .012, VC.steel, 0, -.088, -.07 - i * .14, 0, 0, 0, 10);
    vmCyl(b, .0462, .03, VC.yellow, 0, -.088, -.14, 0, 0, 0, 10);
    vmCyl(b, .01, .03, VC.light, 0, -.04, -.24, Math.PI / 2, 0, 0, 7);                         // valve
    vmCylAB(b, [0, -.035, -.27], [0, -.03, -.32], .007, VC.rubber, 6); vmCylAB(b, [0, -.03, -.32], [0, -.012, -.37], .007, VC.rubber, 6);
    vmCyl(b, .015, .012, VC.steel, .046, -.075, -.1, 0, Math.PI / 2, 0, 10);                   // manomètre
    vmCyl(b, .012, .001, VC.face, .0525, -.075, -.1, 0, Math.PI / 2, 0, 10);
    vmPush(b, 0, -.075, .03, -.3);
    vmBox(b, .036, .085, .048, VC.poly, 0, 0, 0, 0, 0, 0, .008);
    for (i = 0; i < 5; i++) vmBox(b, .039, .004, .034, VC.polyE, 0, .028 - i * .014, .001, 0, 0, 0, 0);
    vmFist(b, .018, .024);
    vmPop(b);
    vmBox(b, .014, .006, .05, VC.park, 0, -.05, -.01, 0, 0, 0, 0);                             // pontet
    vmBox(b, .005, .02, .006, VC.light, 0, -.042, -.01, .3, 0, 0, 0);
    vmPush(b, 0, -.06, -.36, -.08);
    vmBox(b, .032, .08, .036, VC.poly, 0, 0, 0, 0, 0, 0, .008);                                 // poignée avant
    for (i = 0; i < 4; i++) vmBox(b, .035, .004, .03, VC.polyE, 0, .02 - i * .014, .0, 0, 0, 0, 0);
    vmPush(b, 0, 0, 0, 0, 0, 0, -1); vmFist(b, .016, .018); vmPop(b);
    vmPop(b);
    vmBox(b, .046, .06, .14, VC.olive, 0, -.01, .14, 0, 0, 0, .012);                            // crosse
    vmBox(b, .048, .07, .02, VC.rubber, 0, -.01, .215, 0, 0, 0, .008);
    vmArm(b, [-.03, -.03, -.33], [-.16, -.24, -.06], .028);
    vmArm(b, [.02, -.05, .09], [.08, -.2, .33], .028);
    vmMesh(g, b);
    // Aiguille du manomètre (montre le carburant)
    const nd = vmNew(); vmBox(nd, .001, .002, .009, VC.red, 0, 0, -.0045, 0, 0, 0, 0);
    const needle = vmMesh(g, nd, null, .0532, -.075, -.1);
    // Veilleuse allumée
    const pl = vmNew();
    vmCyl(pl, .007, .03, [1, .45, .1], 0, 0, -.012, 0, 0, 0, 6, .1); vmCyl(pl, .006, .008, [1, .45, .1], 0, 0, .007, 0, 0, 0, 6, 1);
    vmCyl(pl, .0035, .014, [.25, .4, 1], 0, 0, .004, 0, 0, 0, 5, .3);
    const pilot = vmMesh(g, pl, vmFlameMat, 0, -.022, -.75); pilot.renderOrder = 2;
    g.userData = { muzzle: -.75, muzzleY: .01, sightY: SY, adsZ: -.24, sight: [V3(0, SY, -.6), V3(0, SY, -.02)], pilot, needle };
  }
  VMS.flamer = g;

  /* ===== Minigun ===== */
  g = new THREE.Group(); b = vmNew();
  {
    const SY = .118;
    vmBox(b, .11, .11, .26, VC.park, 0, -.01, -.03, 0, 0, 0, .02);                             // carter
    for (i = 0; i < 4; i++) vmBox(b, .112, .006, .03, VC.blue, 0, .025 - i * .02, .07, 0, 0, 0, .002);
    for (i = 0; i < 3; i++) vmCyl(b, .004, .114, VC.light, 0, -.04 + i * .03, -.12, 0, Math.PI / 2, 0, 6);
    vmCyl(b, .03, .1, VC.olive, .07, -.03, .02, 0, 0, 0, 8);                                   // moteur
    vmCyl(b, .022, .012, VC.steel, .07, -.03, -.035, 0, 0, 0, 8);
    vmCyl(b, .056, .022, VC.blue, 0, -.005, -.17, 0, 0, 0, 10);                                // palier avant
    vmBox(b, .012, .04, .012, VC.park, 0, .065, .04, 0, 0, 0, 0);                               // poignée de transport
    vmBox(b, .012, .04, .012, VC.park, 0, .065, -.1, 0, 0, 0, 0);
    vmBox(b, .022, .016, .17, VC.rubber, 0, .093, -.03, 0, 0, 0, .006);
    vmBox(b, .007, .017, .01, VC.park, -.009, SY - .0085, .04, 0, 0, 0, 0);                     // cran de mire
    vmBox(b, .007, .017, .01, VC.park, .009, SY - .0085, .04, 0, 0, 0, 0);
    vmBox(b, .005, .017, .01, VC.park, 0, SY - .0085, -.1, 0, 0, 0, 0);                         // guidon
    vmBox(b, .0045, .0045, .001, VC.glow, 0, SY - .003, -.0945, 0, 0, 0, 0);
    // Boîte de munitions et bande
    vmBox(b, .08, .11, .14, VC.olive, -.11, -.08, .0, 0, 0, 0, .012);
    vmBox(b, .084, .012, .144, VC.oliveD, -.11, -.02, .0, 0, 0, 0, .004);
    vmBox(b, .081, .016, .1, VC.yellow, -.11, -.1, .0, 0, 0, 0, 0);
    vmBox(b, .02, .02, .01, VC.steel, -.11, -.05, -.072, 0, 0, 0, 0);
    vmBox(b, .04, .016, .05, VC.oliveD, -.06, -.025, -.01, 0, 0, .5, .004);                    // goulotte
    for (i = 0; i < 6; i++) vmCyl(b, .0045, .03, VC.brass, -.082 + i * .007, .0 - i * .004 + (i > 2 ? .006 : 0), -.04, Math.PI / 2, 0, 0, 6);
    vmPush(b, 0, -.1, .07, -.3);
    vmBox(b, .036, .085, .046, VC.poly, 0, 0, 0, 0, 0, 0, .008);
    for (i = 0; i < 5; i++) vmBox(b, .039, .004, .032, VC.polyE, 0, .028 - i * .014, .001, 0, 0, 0, 0);
    vmFist(b, .018, .023);
    vmPop(b);
    vmBox(b, .014, .006, .05, VC.park, 0, -.075, .02, 0, 0, 0, 0);
    vmPush(b, 0, -.1, -.2, -.05);
    vmBox(b, .03, .08, .034, VC.poly, 0, 0, 0, 0, 0, 0, .008);                                  // poignée avant
    vmPush(b, 0, 0, 0, 0, 0, 0, -1); vmFist(b, .015, .017); vmPop(b);
    vmPop(b);
    vmBox(b, .02, .03, .02, VC.park, 0, -.055, -.2, 0, 0, 0, 0);
    vmArm(b, [-.03, -.07, -.17], [-.17, -.25, .08], .029);
    vmArm(b, [.02, -.06, .12], [.08, -.2, .36], .029);
    vmMesh(g, b);
    // Barillet de 6 canons (tourne)
    const br = vmNew();
    for (i = 0; i < 6; i++){
      const a = i / 6 * Math.PI * 2, x = Math.cos(a) * .03, y = Math.sin(a) * .03;
      vmCyl(br, .0095, .5, VC.steel, x, y, 0, 0, 0, 0, 6);
      vmCyl(br, .005, .003, VC.port, x, y, -.2505, 0, 0, 0, 6);
    }
    vmCyl(br, .046, .016, VC.blue, 0, 0, -.2, 0, 0, 0, 10);
    vmCyl(br, .044, .012, VC.blue, 0, 0, -.02, 0, 0, 0, 10);
    vmCyl(br, .048, .07, VC.park, 0, 0, .2, 0, 0, 0, 10);
    vmCyl(br, .012, .52, VC.blue, 0, 0, 0, 0, 0, 0, 6);
    const barrels = vmMesh(g, br, null, 0, -.005, -.42);
    g.userData = { muzzle: -.67, muzzleY: -.005, sightY: SY, adsZ: -.26, sight: [V3(0, SY, -.1), V3(0, SY, .04)], barrels,
      eject: V3(.04, -.07, -.05), ejectDown: true, shell: 4 };
  }
  VMS.minigun = g;

  /* ===== Lance-roquettes ===== */
  g = new THREE.Group(); b = vmNew();
  {
    const SY = .098;
    vmCyl(b, .052, .9, VC.olive, 0, .02, -.21, 0, 0, 0, 12);                                   // tube
    vmRing(b, .062, .046, .05, VC.oliveD, 0, .02, -.685, 0, 0, 0, 10);                         // bouche
    vmRing(b, .066, .046, .07, VC.oliveD, 0, .02, .265, 0, 0, 0, 10);                          // venturi arrière
    vmCyl(b, .046, .004, VC.port, 0, .02, .225, 0, 0, 0, 12);
    for (const z of [-.5, -.12, .12]) vmCyl(b, .0545, .02, VC.park, 0, .02, z, 0, 0, 0, 12); // bagues
    vmBox(b, .05, .03, .1, VC.rubber, 0, -.04, .1, 0, 0, 0, .01);                              // appui d'épaule
    vmBox(b, .03, .008, .04, VC.park, 0, .073, -.58, 0, 0, 0, 0);                              // guidon à cadre
    vmBox(b, .004, .04, .006, VC.park, -.016, .093, -.58, 0, 0, 0, 0);
    vmBox(b, .004, .04, .006, VC.park, .016, .093, -.58, 0, 0, 0, 0);
    vmBox(b, .036, .004, .006, VC.park, 0, .113, -.58, 0, 0, 0, 0);
    vmBox(b, .004, .022, .005, VC.park, 0, SY - .011, -.58, 0, 0, 0, 0);
    vmBox(b, .004, .004, .001, VC.glow, 0, SY - .0025, -.577, 0, 0, 0, 0);
    vmBox(b, .03, .008, .03, VC.park, 0, .073, -.04, 0, 0, 0, 0);                              // hausse à œilleton
    vmBox(b, .006, .016, .006, VC.park, 0, .084, -.04, 0, 0, 0, 0);
    vmRing(b, .0095, .0038, .005, VC.park, 0, SY, -.04, 0, 0, 0, 8);
    // Viseur optique sur le côté
    vmBox(b, .012, .03, .05, VC.park, -.055, .045, -.1, 0, 0, 0, .003);
    vmBox(b, .03, .04, .11, VC.blue, -.075, .06, -.1, 0, 0, 0, .007);
    vmCyl(b, .013, .03, VC.rubber, -.075, .06, -.03, 0, 0, 0, 8);
    vmCyl(b, .012, .002, VC.lens, -.075, .06, -.1565, 0, 0, 0, 8);
    vmBox(b, .005, .004, .001, VC.lensHi, -.079, .065, -.1575, 0, 0, .4, 0);
    vmCyl(b, .006, .012, VC.park, -.075, .084, -.1, Math.PI / 2, 0, 0, 7);
    // Poignées
    vmPush(b, 0, -.075, -.02, -.3);
    vmBox(b, .036, .085, .048, VC.poly, 0, 0, 0, 0, 0, 0, .008);
    for (i = 0; i < 5; i++) vmBox(b, .039, .004, .034, VC.polyE, 0, .028 - i * .014, .001, 0, 0, 0, 0);
    vmFist(b, .018, .024);
    vmPop(b);
    vmBox(b, .014, .006, .06, VC.park, 0, -.056, -.07, 0, 0, 0, 0);                            // pontet
    vmBox(b, .005, .02, .006, VC.light, 0, -.045, -.07, .3, 0, 0, 0);
    vmBox(b, .04, .02, .1, VC.park, 0, -.038, -.04, 0, 0, 0, .004);
    vmPush(b, 0, -.065, -.3, -.1);
    vmBox(b, .032, .075, .036, VC.poly, 0, 0, 0, 0, 0, 0, .008);
    vmPush(b, 0, 0, 0, 0, 0, 0, -1); vmFist(b, .016, .018); vmPop(b);
    vmPop(b);
    vmBox(b, .03, .02, .04, VC.park, 0, -.032, -.3, 0, 0, 0, 0);
    vmBox(b, .012, .02, .006, VC.steel, .05, -.02, -.4, 0, 0, 0, 0);                            // anneaux de bretelle
    vmArm(b, [-.03, -.04, -.27], [-.17, -.24, .02], .029);
    vmArm(b, [.02, -.04, .03], [.08, -.2, .3], .029);
    vmMesh(g, b);
    // Roquette (visible quand chargée : 20-armes.js)
    const w = vmNew();
    vmCyl(w, .02, .06, VC.oliveD, 0, 0, .03, 0, 0, 0, 8);
    vmCyl(w, .045, .06, VC.olive, 0, 0, -.03, 0, 0, 0, 10, 1); vmCyl(w, .03, .02, VC.olive, 0, 0, .01, 0, 0, 0, 10, 1.5);
    vmCyl(w, .045, .1, VC.olive, 0, 0, -.11, 0, 0, 0, 10, .3);
    vmRing(w, .046, .04, .012, VC.red, 0, 0, -.05, 0, 0, 0, 10);
    vmCyl(w, .009, .03, VC.light, 0, 0, -.175, 0, 0, 0, 6, .6);
    const warhead = vmMesh(g, w, null, 0, .02, -.72);
    g.userData = { muzzle: -.71, muzzleY: .02, sightY: SY, adsZ: -.2, sight: [V3(0, SY, -.58), V3(0, SY, -.04)], warhead };
  }
  VMS.rocket = g;

  Object.keys(VMS).forEach(k => {
    const v = VMS[k]; v.visible = false; vmRoot.add(v);
    v.userData.tris = vmTris(v);
    if (v.userData.mag){ v.userData.magBase = v.userData.mag.position.clone(); }
    if (v.userData.pump) v.userData.pumpBase = v.userData.pump.position.z;
  });
}
// Triangles des pièces visibles d'une arme (sans l'éclair)
function vmTris(o){ let n = 0; o.traverse(m => { if (m.isMesh && m.geometry) n += (m.geometry.index ? m.geometry.index.count : m.geometry.attributes.position.count) / 3; }); return n; }

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
const VMA = { hooked: false, pumpT: -1, boltT: -1, slideK: 0, id: null, loadT: 0 };
// Chaque tir réel (fire() renvoie autre chose que false) déclenche les animations de l'arme
function vmShot(){
  if (!S) return;
  const id = S.cur, ud = VMS[id] && VMS[id].userData; if (!ud) return;
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
