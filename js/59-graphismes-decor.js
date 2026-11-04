'use strict';
/* ================= Haute définition, séance 2 : le décor (sans téléchargement) ================= */
// Les sites de textures photo sont bloqués dans la session de travail : on améliore le décor par le code.
// Seulement en style Haute définition, sur le toit (js/58-graphismes-hd.js), et retiré en le quittant.
//   - Autos : vraies roues (pneu et jante), vitres qui reflètent, phares et feux arrière, pare-chocs, rétroviseurs,
//     carrosserie plus lisse et métallique. Les carcasses brûlées gardent leurs roues mais pas de vitres.
//   - Fils électriques qui pendent entre les lampadaires, et quelques-uns qui traversent la rue.
//   - Débris dans la rue : papiers, briques, planches, pneus, sacs-poubelles, canettes (tout en « instances » : léger).
// Les autos sont marquées par js/03-scene.js (g.userData.auto). Réglages : DECOR.

const DECOR = { monde:null, objets:[], geos:[], mats:[], caches:[], t:0, zMin:-110, nb:{ papier:40, brique:45, planche:14, pneu:8, sac:14, canette:36 } };

/* ---------- Matériaux ---------- */
function decorMat(col, rugo, metal, extra){
  const m = new THREE.MeshStandardMaterial(Object.assign({ color:col, roughness:rugo, metalness:metal, envMapIntensity:typeof HD_REGL !== 'undefined' ? HD_REGL.env * 1.4 : .8 }, extra || {}));
  DECOR.mats.push(m); return m;
}
function decorGeo(g){ DECOR.geos.push(g); return g; }
function decorAjout(o, parent){ o.castShadow = true; o.receiveShadow = true; (parent || world).add(o); DECOR.objets.push(o); return o; }

/* ---------- Autos ---------- */
function decorAutos(){
  const pneuG = decorGeo(new THREE.CylinderGeometry(.36, .36, .26, 18)), janteG = decorGeo(new THREE.CylinderGeometry(.21, .21, .28, 10));
  const vitreG = decorGeo(new THREE.PlaneGeometry(1, 1)), boiteG = decorGeo(new THREE.BoxGeometry(1, 1, 1));
  pneuG.rotateZ(Math.PI / 2); janteG.rotateZ(Math.PI / 2);
  const pneu = decorMat(0x161616, .92, 0), jante = decorMat(0x8a8a88, .35, .9), janteR = decorMat(0x3a2a20, .8, .5);
  const vitre = decorMat(0x0c1218, .06, .6), pare = decorMat(0x1c1c1c, .6, .2), chrome = decorMat(0x9a9a98, .25, 1);
  const phare = decorMat(0xfff4d8, .2, 0, { emissive:0x332a18 }), arriere = decorMat(0x8a1010, .25, 0, { emissive:0x2a0404 });
  const piece = (geo, mat, sx, sy, sz, x, y, z, g, ry) => { const m = new THREE.Mesh(geo, mat); m.scale.set(sx, sy, sz); m.position.set(x, y, z); if (ry) m.rotation.y = ry; return decorAjout(m, g); };
  world.traverse(g => {
    if (!g.userData || !g.userData.auto || !g.children) return;
    const brule = g.userData.auto.burnt, ch = g.children;
    // Les roues carrées d'origine sont cachées (remises en quittant le style)
    for (let i = 2; i < 6 && i < ch.length; i++){ DECOR.caches.push(ch[i]); ch[i].visible = false; }
    [[-1, -1.4], [1, -1.4], [-1, 1.4], [1, 1.4]].forEach(([sx, sz]) => {
      piece(pneuG, pneu, 1, 1, 1, sx * .93, .36, sz, g);
      piece(janteG, brule ? janteR : jante, 1, 1, 1, sx * .95, .36, sz, g);
    });
    // Carrosserie : plus lisse et métallique (matériau de la Haute définition, propre aux autos)
    [ch[0], ch[1]].forEach(m => { if (m && m.material && m.material.isMeshStandardMaterial && !brule){ m.material.roughness = .5; m.material.metalness = .45; } });
    piece(boiteG, pare, 2.04, .22, .18, 0, .45, 2.18, g); piece(boiteG, pare, 2.04, .22, .18, 0, .45, -2.18, g); // pare-chocs
    if (brule) return;
    // Vitres : pare-brise, lunette arrière, côtés de la cabine (1,8 x 0,6 x 2,2 à y 1,4, z -0,2)
    piece(vitreG, vitre, 1.62, .5, 1, 0, 1.42, .91, g); piece(vitreG, vitre, 1.62, .5, 1, 0, 1.42, -1.31, g, Math.PI);
    [-1, 1].forEach(sx => piece(vitreG, vitre, 1.9, .46, 1, sx * .905, 1.42, -.2, g, sx * Math.PI / 2));
    [-1, 1].forEach(sx => {
      piece(boiteG, phare, .38, .16, .05, sx * .68, .82, 2.16, g);   // phares
      piece(boiteG, arriere, .36, .14, .05, sx * .7, .82, -2.16, g); // feux arrière
      piece(boiteG, chrome, .08, .1, .16, sx * .98, 1.22, .75, g);   // rétroviseurs
    });
    piece(boiteG, chrome, .7, .14, .04, 0, .62, 2.17, g); // calandre
  });
}

/* ---------- Fils électriques ---------- */
function decorFil(a, b, creux, mat){
  const mid = a.clone().lerp(b, .5); mid.y -= creux;
  const c = new THREE.QuadraticBezierCurve3(a, mid, b);
  const m = new THREE.Mesh(decorGeo(new THREE.TubeGeometry(c, 14, .022, 4, false)), mat);
  m.receiveShadow = false; m.castShadow = true; world.add(m); DECOR.objets.push(m);
}
function decorFils(L){
  if (!L.lamps) return;
  const mat = decorMat(0x0e0e0e, .7, .3), V = THREE.Vector3;
  for (let z = -20; z > -150; z -= 26) [-1, 1].forEach(sd => {
    [6.4, 6.1].forEach((y, k) => decorFil(new V(sd * (14 + k * .15), y, z), new V(sd * (14 + k * .15), y, z - 26), .9 + k * .25, mat));
  });
  // Quelques fils qui traversent la rue
  [-46, -98].forEach(z => decorFil(new V(-14, 6.6, z), new V(14, 6.6, z - 3), 1.6, mat));
}

/* ---------- Débris (instances) ---------- */
function decorDebris(L){
  styleGr = 99 + (L.id || '').length * 977; // hasard propre du style (js/57) : même rue = mêmes débris
  const R = styleRnd, place = (larg) => [(R() - .5) * 2 * larg, DECOR.zMin + R() * (-14 - DECOR.zMin)];
  const sortes = [
    ['papier', decorGeo(new THREE.PlaneGeometry(.3, .4)), decorMat(0x8e887a, .95, 0, { side:THREE.DoubleSide }), 11, (o, i) => { o.rotation.set(-Math.PI / 2 + (R() - .5) * .3, 0, R() * 6.3); o.position.y = .015 + i * .0001; }],
    ['brique', decorGeo(new THREE.BoxGeometry(.24, .08, .12)), decorMat(0x7a3a26, .85, 0), 12, o => { o.rotation.set((R() - .5) * .4, R() * 6.3, (R() - .5) * .4); o.position.y = .05; }],
    ['planche', decorGeo(new THREE.BoxGeometry(1.4, .05, .16)), decorMat(0x5a4028, .8, 0), 12, o => { o.rotation.set(0, R() * 6.3, (R() - .5) * .2); o.position.y = .04; }],
    ['pneu', decorGeo(new THREE.TorusGeometry(.3, .12, 8, 16)), decorMat(0x141414, .9, 0), 12.5, o => { o.rotation.set(Math.PI / 2 + (R() - .5) * .3, 0, R() * 6.3); o.position.y = .12; }],
    ['sac', decorGeo(new THREE.SphereGeometry(.35, 10, 8)), decorMat(0x101214, .35, .1), 13, o => { o.scale.set(1, .7 + R() * .3, 1.1); o.position.y = .2; o.rotation.y = R() * 6.3; }],
    ['canette', decorGeo(new THREE.CylinderGeometry(.035, .035, .12, 8)), decorMat(0xa0a4a8, .3, .9), 11, o => { o.rotation.set(Math.PI / 2, 0, R() * 6.3); o.position.y = .035; }]
  ];
  const o = new THREE.Object3D();
  sortes.forEach(([nom, geo, mat, larg, pose]) => {
    const n = DECOR.nb[nom], im = new THREE.InstancedMesh(geo, mat, n);
    for (let i = 0; i < n; i++){
      o.position.set(0, 0, 0); o.rotation.set(0, 0, 0); o.scale.set(1, 1, 1);
      const [x, z] = place(larg); pose(o, i); o.position.x = x; o.position.z = z;
      if (nom === 'sac' && R() < .7){ o.position.x = (R() < .5 ? -1 : 1) * (10 + R() * 2.5); } // les sacs restent surtout sur le trottoir
      o.updateMatrix(); im.setMatrixAt(i, o.matrix);
    }
    im.instanceMatrix.needsUpdate = true;
    decorAjout(im);
  });
}

/* ---------- Poser, retirer ---------- */
function decorRetirer(){
  DECOR.objets.forEach(o => { if (o.parent) o.parent.remove(o); });
  DECOR.caches.forEach(o => { o.visible = true; });
  DECOR.geos.forEach(g => g.dispose()); DECOR.mats.forEach(m => m.dispose());
  DECOR.objets = []; DECOR.geos = []; DECOR.mats = []; DECOR.caches = []; DECOR.monde = null;
}
function decorPoser(){
  const L = STY.L; if (!L || !world) return;
  decorAutos(); decorFils(L); decorDebris(L);
  DECOR.monde = world;
}
function decorMaj(){
  const veut = typeof styleHD === 'function' && styleHD() && styleToit() && typeof HD !== 'undefined' && HD.pret && HD.pour === STY.orig && STY.orig.length > 0;
  if (!veut){ if (DECOR.monde) decorRetirer(); return; }
  if (DECOR.monde !== world) decorRetirer();
  if (!DECOR.monde) decorPoser();
}
Jeu.on('image', dt => {
  DECOR.t -= dt || 0; if (DECOR.t > 0) return; DECOR.t = .25;
  try { decorMaj(); } catch (e) { errNote(e); decorRetirer(); }
});

// Accès pour les tests automatiques
window.__decor = { DECOR, decorMaj, decorRetirer };
