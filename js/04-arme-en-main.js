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
// Lumières plus neutres (tâche 104) : avant, tout tirait sur l'orange et le métal, le polymère et le bois se confondaient
vmScene.add(new THREE.HemisphereLight(0xffe2c4, 0x2e2622, 0.72));
vmScene.add(new THREE.AmbientLight(0x4a4440, 0.32));
const vmSun = new THREE.DirectionalLight(0xff9a50, 0.5); vmSun.position.set(-1, 1, -2); vmScene.add(vmSun);
// Éclairage en trois points : lumière principale chaude en haut à droite (reflets sur le métal), lumière de contour
// froide derrière (découpe la silhouette), petite lumière d'appoint en bas à gauche
const vmKey = new THREE.DirectionalLight(0xfff0dc, .56); vmKey.position.set(1.2, 1.6, .8); vmScene.add(vmKey);
// Lumière douce venue de l'œil : en visée, l'arrière de l'arme (hausse, culasse) n'est plus une silhouette noire
const vmEye = new THREE.DirectionalLight(0xfff4e8, .28); vmEye.position.set(.2, .5, 1.5); vmScene.add(vmEye);
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
// Matériau des armes du toit (tâche 104) : le même, mais chaque sommet porte sa matière (attribut vmk) :
//   x = force du reflet, y = brillance (reflet serré ou large), z = lueur (pièces d'énergie qui s'illuminent au tir).
// Le métal brille, le polymère reste satiné, le bois et les gants sont mats : toujours un seul appel de dessin par pièce.
const VM_LUEUR = { value: .25 }; // lueur des pièces d'énergie : douce au repos, forte au tir (04-arme-anim.js)
const vmMatArme = new THREE.MeshPhongMaterial({ vertexColors: true, map: vmTex, specularMap: vmTex, fog: false, emissive: 0x0d0805, specular: 0x56524c, shininess: 46 });
vmMatArme.onBeforeCompile = sh => {
  sh.uniforms.uLueur = VM_LUEUR;
  sh.vertexShader = 'attribute vec3 vmk;\nvarying vec3 vVmk;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n vVmk = vmk;');
  sh.fragmentShader = 'varying vec3 vVmk;\nuniform float uLueur;\n' + sh.fragmentShader
    .replace('#include <lights_phong_fragment>', '#include <lights_phong_fragment>\n material.specularShininess = shininess * vVmk.y;\n material.specularStrength = specularStrength * vVmk.x;')
    .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n totalEmissiveRadiance += vColor * vVmk.z * uLueur;');
};
vmMatArme.customProgramCacheKey = () => 'vmArme1';
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
// Matière de chaque couleur : [reflet, brillance, lueur] (lue par vmMatArme ; [1, 1, 0] par défaut)
const VM_K = new Map();
function vmMatiere(cols, k){ cols.forEach(c => VM_K.set(c, k)); }
vmMatiere([VC.steel, VC.light], [1.5, 1.7, 0]);                       // acier nu, poli
vmMatiere([VC.blue, VC.park, VC.port], [.95, 1.25, 0]);                // acier bleui ou parkérisé
vmMatiere([VC.brass], [1.4, 1.1, 0]);
vmMatiere([VC.poly, VC.polyE], [.32, .45, 0]);                         // polymère satiné
vmMatiere([VC.rubber], [.1, .3, 0]);
vmMatiere([VC.glove, VC.gloveD, VC.sleeve, VC.string], [.05, .25, 0]); // tissu, cuir
vmMatiere([VC.wood, VC.woodD], [.2, .35, 0]);                          // bois huilé
vmMatiere([VC.olive, VC.oliveD, VC.red, VC.yellow], [.45, .7, 0]);     // métal peint
vmMatiere([VC.lens, VC.lensHi], [2.4, 3.2, 0]);                        // verre
// Couleur d'énergie : un tableau [r, g, b] marqué, qui s'illumine au tir (laser, canon électromagnétique, arc)
function vmEnergie(c){ c.e = 1; return c; }
function vmKOf(col){ if (Array.isArray(col)) return col.e ? [.3, .5, 1] : [.2, .5, 0]; return VM_K.get(col) || [1, 1, 0]; }

/* ---------- Petit constructeur de géométrie : prismes à facettes, fusionnés ---------- */
const _vmE = new THREE.Euler(), _vmQ = new THREE.Quaternion(), _vmS = new THREE.Vector3(), _vmP = new THREE.Vector3(), _vmM = new THREE.Matrix4();
const _vmA = new THREE.Vector3(), _vmB = new THREE.Vector3(), _vmC = new THREE.Vector3(), _vmCol = new THREE.Color();
function vmNew(){ return { p: [], c: [], k: [], kc: null, m: new THREE.Matrix4(), st: [] }; }
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
  const k = b.kc || VM_K1; b.k.push(k[0], k[1], k[2], k[0], k[1], k[2], k[0], k[1], k[2]);
}
const VM_K1 = [1, 1, 0];
// Prisme : profil convexe (sens antihoraire vu de +z) étiré le long de z ; sf = échelle du bout avant (z négatif)
function vmPrism(b, prof, flags, len, col, x, y, z, rx, ry, rz, sf){
  vmPush(b, x, y, z, rx, ry, rz);
  const base = vmRGB(col), edge = vmWear(col), n = prof.length, h = len / 2, f = sf == null ? 1 : sf;
  b.kc = vmKOf(col);
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
  b.kc = vmKOf(col);
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
  if (b.k && b.k.length === b.p.length) g.setAttribute('vmk', new THREE.Float32BufferAttribute(b.k, 3)); // matière (vmMatArme)
  g.computeBoundingSphere();
  return g;
}
function vmMesh(parent, b, mat, x, y, z){ const m = new THREE.Mesh(vmGeo(b), mat || vmMat); m.position.set(x || 0, y || 0, z || 0); parent.add(m); return m; }
// Armes du toit : vmMat remplacé par vmMatArme (matières par sommet, lueur au tir) ; le robot et le RTS gardent vmMat
function vmArme(g){ g.traverse(m => { if (m.isMesh && m.material === vmMat && m.geometry.getAttribute('vmk')) m.material = vmMatArme; }); return g; }

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
