'use strict';
/* ================= Zombies ================= */
// Modèle humanoïde par défaut (walker, runner, brute). Les autres formes sont dans 18-zombies-types.js (ZKINDS).
const ZG = { torso:new THREE.BoxGeometry(.62, .8, .34), head:new THREE.BoxGeometry(.4, .42, .4), arm:new THREE.BoxGeometry(.17, .72, .17), leg:new THREE.BoxGeometry(.22, .86, .24), eye:new THREE.BoxGeometry(.08, .05, .02),
  box:new THREE.BoxGeometry(1, 1, 1) }; // cube unité : accessoires des tenues, partagé avec 18-zombies-types.js (un seul lot d'instances)
ZG.arm.translate(0, -.36, 0); ZG.leg.translate(0, -.43, 0);
const eyeMat = new THREE.MeshBasicMaterial({ color: 0xff3a1a });
const SHIRTS = [0x5b3a2e, 0x3d4a5c, 0x6a6a5a, 0x7a2e2e, 0x4b5a3a, 0x8a7a60, 0x3a3a44];
const PANTS = [0x2b2b33, 0x3a3226, 0x24303a, 0x403a32];
const zkind = type => (typeof ZKINDS !== 'undefined' && ZKINDS[type]) || null;

/* ---------- Foule : matériaux partagés, rendu par instances, cibles pré-triées ---------- */
// Réglages de performance (voir aussi BASE_ALIVE, DEV_CAP et aliveCap dans 06-donnees.js)
//   farD : au-delà (m de la caméra, à plat), modèle simplifié : sans les tout petits morceaux (yeux, gueule, griffes)
//   farPose : loin, la pose des membres est recalculée une image sur farPose (la position suit chaque image)
const ZPERF = { farD: 55, farPose: 3, smallR: .1 };
// Matériaux : un seul par couleur, partagé par tous les zombies (userData.zshared). Jamais libérés.
// Le flash rouge des coups passe par la couleur d'instance (hitC), pas par le matériau.
const ZMATS = new Map();
const zHitTint = new THREE.Color(.47, .13, .07);
function zmat(hex){
  let m = ZMATS.get(hex);
  if (!m){
    m = new THREE.MeshLambertMaterial({ color: hex });
    m.userData.zshared = true; m.userData.keep = true;
    m.userData.hitC = m.color.clone().multiplyScalar(.7).add(zHitTint);
    ZMATS.set(hex, m);
  }
  return m;
}
// Motif partagé (carreaux, pois) : une petite texture 8×8 créée une seule fois, matériau zshared blanc (la couleur
// d'instance teinte la texture, le flash rouge marche aussi). Par instances : un lot de plus par (géométrie, texture).
const ZTEX = {};
function zTexture(nom, rows, pal, rep){
  if (ZTEX[nom]) return ZTEX[nom];
  const h = rows.length, w = rows[0].length, d = new Uint8Array(w * h * 4);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++){
    const c = pal[rows[h - 1 - y][x]], o = (y * w + x) * 4;
    d[o] = c >> 16 & 255; d[o + 1] = c >> 8 & 255; d[o + 2] = c & 255; d[o + 3] = 255;
  }
  const t = new THREE.DataTexture(d, w, h, THREE.RGBAFormat);
  t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestFilter; t.generateMipmaps = false;
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rep || 1, rep || 1); t.needsUpdate = true;
  return (ZTEX[nom] = t);
}
const ZMOTIFS = {
  // Chemise de chasseur : gros carreaux rouges et noirs
  carreaux:{ rows:['RRrrNNnn', 'RRrrNNnn', 'rrRRnnNN', 'rrRRnnNN', 'NNnnRRrr', 'NNnnRRrr', 'nnNNrrRR', 'nnNNrrRR'],
    pal:{ R:0xa8261e, r:0x8a1f18, N:0x1c1414, n:0x2a1a18 }, rep:2 },
  // Pantalon de cuisinier : petits carreaux noirs et blancs
  damier:{ rows:['BBNNBBNN', 'BBNNBBNN', 'NNBBNNBB', 'NNBBNNBB', 'BBNNBBNN', 'BBNNBBNN', 'NNBBNNBB', 'NNBBNNBB'], pal:{ B:0xbcb8a8, N:0x1c1c20 }, rep:2 },
  // Costume de clown : pois multicolores sur fond bleu
  pois:{ rows:['bbbbbbbb', 'bJJbbRRb', 'bJJbbRRb', 'bbbbbbbb', 'bbbbbbbb', 'bRRbbBBb', 'bRRbbBBb', 'bbbbbbbb'], pal:{ b:0x2f63b8, J:0xf0c828, R:0xd8302a, B:0xf0ece0 }, rep:1 }
};
function zmatT(nom){
  const key = 'motif:' + nom; let m = ZMATS.get(key);
  if (!m){
    const M = ZMOTIFS[nom];
    m = new THREE.MeshLambertMaterial({ color:0xffffff, map:zTexture(nom, M.rows, M.pal, M.rep) });
    m.userData.zshared = true; m.userData.keep = true;
    m.userData.hitC = m.color.clone().multiplyScalar(.7).add(zHitTint);
    ZMATS.set(key, m); zInstTex(m.map);
  }
  return m;
}
function zInstTex(tex){ let m = ZI_FIX.get(tex); if (!m){ m = new THREE.MeshLambertMaterial({ color:0xffffff, map:tex }); m.userData.zinst = true; ZI_FIX.set(tex, m); } return m; }
// Matériau fixe partagé (yeux, acide, gueule...) : utilisable par le rendu par instances
const zfix = m => { m.userData.zfixed = true; m.userData.keep = true; return m; };
zfix(eyeMat);
// Rendu par instances : un InstancedMesh par couple (géométrie, matériau). Tous les zombies dont les maillages
// utilisent seulement des matériaux zmat/zfix y passent : environ 12 appels de dessin pour toute la foule.
// Les autres (le boss, un type externe avec ses propres matériaux) restent de vrais objets dans la scène.
const zInstRoot = new THREE.Group(); scene.add(zInstRoot);
const ZI_MAT = new THREE.MeshLambertMaterial({ color: 0xffffff }); // couleur donnée par l'instance
const ZI_FIX = new Map(); // matériau fixe → sa copie réservée aux instances
const ZB = new Map(); // clé → lot { im, geo, mat, col, cap, n }
const zbList = [];
function zMakeIM(b, cap){
  const im = new THREE.InstancedMesh(b.geo, b.mat, cap);
  if (b.col) im.setColorAt(0, ZI_MAT.color); // crée instanceColor avant le premier rendu
  im.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  if (im.instanceColor) im.instanceColor.setUsage(THREE.DynamicDrawUsage);
  im.frustumCulled = false; im.count = 0; im.visible = false; im.userData.zinst = true;
  return im;
}
function zBatch(geo, mat){
  const col = !!mat.userData.zshared, tex = col && mat.map, key = geo.uuid + (col ? '|c' + (tex ? '|' + tex.uuid : '') : '|' + mat.uuid);
  let b = ZB.get(key);
  if (!b){
    let m = ZI_MAT;
    if (!col){ m = ZI_FIX.get(mat); if (!m){ m = mat.clone(); m.userData.zinst = true; ZI_FIX.set(mat, m); } }
    else if (tex) m = zInstTex(tex); // motif : une copie par texture
    b = { geo, mat:m, col, cap:64, n:0, im:null };
    b.im = zMakeIM(b, b.cap); zInstRoot.add(b.im);
    ZB.set(key, b); zbList.push(b);
  }
  return b;
}
function zGrow(b){
  const old = b.im, cap = b.cap * 2, im = zMakeIM(b, cap);
  im.instanceMatrix.array.set(old.instanceMatrix.array);
  if (b.col) im.instanceColor.array.set(old.instanceColor.array);
  zInstRoot.remove(old); old.dispose();
  b.im = im; b.cap = cap; zInstRoot.add(im);
}
// Le zombie peut-il passer par les instances ? (tous ses maillages ont un matériau partagé)
function zInstOk(g){
  let ok = true;
  g.traverse(o => { if (o.isMesh){ const m = o.material; if (!m || Array.isArray(m) || !(m.userData.zshared || m.userData.zfixed)) ok = false; } });
  return ok;
}
function zInstPrep(z, mats){
  const I = []; z.g.updateMatrixWorld(true);
  z.g.traverse(o => {
    if (!o.isMesh) return;
    const mat = o.material, col = !!mat.userData.zshared;
    if (!o.geometry.boundingSphere) o.geometry.computeBoundingSphere();
    I.push({ m:o, b:zBatch(o.geometry, mat), mat:col ? mat : null, fl:col && (mat === mats[0] || mat === mats[1]),
      small:!!o.userData.zsmall || o.geometry.boundingSphere.radius * o.matrixWorld.getMaxScaleOnAxis() < ZPERF.smallR });
  });
  z.inst = I;
}
let zFrame = 0, zUid = 0;
// Matrices des maillages à jour (sans attendre le rendu) : la cible d'un tir est toujours exacte
function zFresh(z){
  const p = z.g.position;
  if (z._mwF === zFrame && z._mwX === p.x && z._mwY === p.y && z._mwZ === p.z) return;
  z.g.updateMatrixWorld(true);
  z._mwF = zFrame; z._mwX = p.x; z._mwY = p.y; z._mwZ = p.z;
}
// Loin : la pose (membres) est recalculée une image sur ZPERF.farPose, relative au groupe g ; la position, elle, suit
// chaque image (g ne tourne jamais : monde = position + échelle × pose relative, sans multiplication de matrices).
function zRel(z){
  const g = z.g; g.updateMatrix(); g.matrixWorld.identity();
  const C = g.children; for (let i = 0; i < C.length; i++) C[i].updateMatrixWorld(true);
  const I = z.inst; for (let k = 0; k < I.length; k++){ const e = I[k]; (e.rel || (e.rel = new THREE.Matrix4())).copy(e.m.matrixWorld); }
  z._rel = true; z._mwF = -1; // les matrices des maillages sont relatives : zFresh les remettra au monde pour un tir
}
// Chaque image avant le rendu (crochet dans 27-perf.js) : copie les matrices dans les lots d'instances
function zInstSync(){
  zFrame++;
  for (let i = 0; i < zbList.length; i++) zbList[i].n = 0;
  const cx = camera.position.x, cz = camera.position.z, FD = ZPERF.farD * ZPERF.farD, FP = ZPERF.farPose;
  for (let i = 0; i < zombies.length; i++){
    const z = zombies[i], I = z.inst; if (!I || !z.g.visible) continue;
    const p = z.g.position, dx = p.x - cx, dz = p.z - cz, far = dx * dx + dz * dz > FD;
    if (far){ if (!z._rel || (zFrame + z.uid) % FP === 0) zRel(z); }
    else { zFresh(z); z._rel = false; }
    const fl = z.flashT > 0, s = z.g.scale, sx = s.x, sy = s.y, sz = s.z, px = p.x, py = p.y, pz = p.z;
    for (let k = 0; k < I.length; k++){
      const e = I[k], m = e.m;
      if (!m.visible || (far && e.small)) continue;
      const b = e.b; if (b.n >= b.cap) zGrow(b);
      const a = b.im.instanceMatrix.array, o = b.n * 16;
      if (far){
        const r = e.rel.elements;
        a[o] = sx * r[0]; a[o + 1] = sy * r[1]; a[o + 2] = sz * r[2]; a[o + 3] = 0;
        a[o + 4] = sx * r[4]; a[o + 5] = sy * r[5]; a[o + 6] = sz * r[6]; a[o + 7] = 0;
        a[o + 8] = sx * r[8]; a[o + 9] = sy * r[9]; a[o + 10] = sz * r[10]; a[o + 11] = 0;
        a[o + 12] = sx * r[12] + px; a[o + 13] = sy * r[13] + py; a[o + 14] = sz * r[14] + pz; a[o + 15] = 1;
      } else m.matrixWorld.toArray(a, o);
      if (b.col){ const c = fl && e.fl ? e.mat.userData.hitC : e.mat.color, ca = b.im.instanceColor.array, co = b.n * 3; ca[co] = c.r; ca[co + 1] = c.g; ca[co + 2] = c.b; }
      b.n++;
    }
  }
  for (let i = 0; i < zbList.length; i++){
    const b = zbList[i], im = b.im;
    if (!b.n && !im.count) continue;
    im.count = b.n; im.visible = b.n > 0;
    im.instanceMatrix.needsUpdate = true; im.instanceMatrix.updateRange.count = b.n * 16;
    if (b.col){ im.instanceColor.needsUpdate = true; im.instanceColor.updateRange.count = b.n * 3; }
  }
}
// Cibles des tirs : chaque zombie n'a qu'UNE entrée dans hitMeshes, une boîte englobante (proxy).
// Le rayon teste d'abord la boîte, puis seulement les vrais maillages de ce zombie (tête, points faibles exacts).
// Les intersections rendues sont celles des vrais maillages (userData.z, head, weak) : rien ne change pour 08, 20, 21.
const ZBOX = {}; // type → boîte locale (sans l'échelle de g), marge pour les animations
const zBoxW = new THREE.Box3(), zRayP = new THREE.Vector3();
function zBoxFor(type, g){
  if (ZBOX[type]) return;
  g.updateMatrixWorld(true);
  const b = new THREE.Box3().setFromObject(g), s = g.scale, p = g.position;
  b.min.sub(p); b.max.sub(p); b.min.x /= s.x; b.min.y /= s.y; b.min.z /= s.z; b.max.x /= s.x; b.max.y /= s.y; b.max.z /= s.z;
  const sz = new THREE.Vector3(); b.getSize(sz); b.expandByScalar(Math.max(sz.x, sz.y, sz.z) * .3 + .1);
  ZBOX[type] = b;
}
function zProxyRaycast(rc, out){
  const z = this.userData.z; if (!z || z.dead) return;
  const B = ZBOX[z.type]; if (!B) return;
  const p = z.g.position, s = z.g.scale;
  zBoxW.min.set(p.x + B.min.x * s.x, p.y + B.min.y * s.y, p.z + B.min.z * s.z);
  zBoxW.max.set(p.x + B.max.x * s.x, p.y + B.max.y * s.y, p.z + B.max.z * s.z);
  // (départ dans la boîte : intersectBox donne la sortie, on garde donc ce cas à part)
  if (!zBoxW.containsPoint(rc.ray.origin) && (!rc.ray.intersectBox(zBoxW, zRayP) || rc.ray.origin.distanceTo(zRayP) > rc.far)) return;
  zFresh(z);
  const M = z.meshes; for (let i = 0; i < M.length; i++) M[i].raycast(rc, out);
}
// Vivants sans créer de tableau (appelé chaque image par 15-boucle.js)
function zAliveCount(){ let n = 0; for (let i = 0; i < zombies.length; i++) if (!zombies[i].dead) n++; return n; }
// Foule : moins de particules par coup quand il y a beaucoup de zombies (le pool de 05 tourne moins vite)
const zCrowdK = () => zombies.length > 150 ? .35 : zombies.length > 60 ? .65 : 1;
const zBurst = (pos, type, n, spd) => burst(pos, type, Math.max(1, Math.round(n * zCrowdK())), spd);

/* ---------- Tenues des humanoïdes (marcheur, coureur, costaud) ---------- */
// Pas un matériau par zombie : une petite palette partagée (ZC) et 3 motifs (ZMOTIFS). Les accessoires sont des cubes
// unité (ZG.box) mis à l'échelle : tous dans le même lot d'instances, donc presque aucun appel de dessin de plus.
// Les accessoires de tête sont des enfants de la tête (ils tombent avec elle) ; ils ne sont pas des cibles.
// (noir et marine reprennent des couleurs de PANTS : moins de matériaux)
const ZC = { hivis:0xd8641e, jaune:0xd8b020, blanc:0xbcb8a8, navy:0x24303a, rouge:0x9a2420, sport:0x3a7cc0, noir:0x2b2b33 };
const zCol = c => (c && c.isMaterial) ? c : typeof c === 'string' ? zmatT(c) : Array.isArray(c) ? zCol(pick(c)) : zmat(c);
// petit = true : détail qui n'est pas dessiné de loin (comme les yeux), voir ZPERF.farD
function zAcc(par, c, sx, sy, sz, x, y, z, petit){ const m = new THREE.Mesh(ZG.box, zCol(c)); m.scale.set(sx, sy, sz); m.position.set(x, y, z); if (petit) m.userData.zsmall = true; par.add(m); return m; }
// Repères (avant l'échelle de g) : torse centré à 1,28 (±0,31 × ±0,4 × ±0,17 dans son repère), tête à 1,9 (±0,2, yeux à +0,04),
// bras : épaule en 0, main vers -0,72 ; jambes : hanche en 0, pied vers -0,86.
// shirt / pants : couleur, liste de couleurs (une au hasard) ou nom de motif. manches : 'chemise' = comme le torse (avec mains).
// jambes 'peau' : jambes nues (short ou robe). acc(h) : accessoires. pour : types qui peuvent la porter ; rw : poids chez le coureur.
const TENUES = {
  civil:    { nom:'Civil', poids:30, pour:['walker', 'runner', 'brute'],
    acc(h){ if (Math.random() < .22) zkCasquette(h, pick([ZC.rouge, ZC.sport, 0x4b5a3a, 0x6a6a5a]), false); if (Math.random() < .15) zAcc(h.torso, pick([0x4b5a3a, 0x3a3226, ZC.noir]), .48, .56, .2, 0, -.02, -.27); } },
  foreur:   { nom:'Foreur', poids:8, pour:['walker', 'runner', 'brute'], shirt:ZC.hivis, pants:ZC.navy, // clin d'œil à Forages Rouillier
    acc(h){
      zAcc(h.torso, ZC.blanc, .64, .06, .355, 0, -.14, 0);                                  // bandes réfléchissantes
      zAcc(h.torso, ZC.blanc, .07, .8, .355, -.15, 0, 0); zAcc(h.torso, ZC.blanc, .07, .8, .355, .15, 0, 0);
      zAcc(h.head, ZC.jaune, .46, .15, .46, 0, .27, 0); zAcc(h.head, ZC.jaune, .52, .03, .56, 0, .2, .02); // casque jaune
    } },
  policier: { nom:'Policier', poids:6, pour:['walker', 'runner', 'brute'], shirt:ZC.navy, pants:ZC.navy, manches:'chemise',
    acc(h){
      zAcc(h.torso, ZC.noir, .64, .08, .355, 0, -.35, 0); zAcc(h.torso, ZC.jaune, .08, .09, .02, -.15, .2, .175, true); // ceinture, insigne
      zAcc(h.head, ZC.navy, .44, .1, .44, 0, .25, 0); zAcc(h.head, ZC.noir, .32, .03, .16, 0, .21, .26);         // casquette
    } },
  medecin:  { nom:'Médecin', poids:6, pour:['walker', 'runner'], shirt:ZC.blanc, pants:[0x3d4a5c, ZC.sport], manches:'chemise',
    acc(h){
      zAcc(h.torso, ZC.blanc, .64, .26, .35, 0, -.52, 0);                                    // bas de la blouse
      zAcc(h.torso, ZC.noir, .04, .3, .02, .1, .1, .175, true); zAcc(h.torso, ZC.noir, .04, .3, .02, -.06, .1, .175, true); // stéthoscope
      if (Math.random() < .5) zAcc(h.head, ZC.blanc, .32, .13, .03, 0, -.09, .205, true);            // masque
    } },
  joggeur:  { nom:'Joggeur', poids:7, rw:3, pour:['walker', 'runner'], shirt:[ZC.sport, ZC.rouge, ZC.jaune], pants:ZC.noir, jambes:'peau',
    acc(h){
      zAcc(h.legL, h.pants, .24, .38, .26, 0, -.17, 0); zAcc(h.legR, h.pants, .24, .38, .26, 0, -.17, 0); // short
      zAcc(h.head, ZC.blanc, .42, .06, .42, 0, .12, 0);                                       // bandeau
      zAcc(h.torso, ZC.blanc, .24, .2, .02, 0, -.02, .175, true);                                     // dossard
    } },
  affaires: { nom:'Homme d’affaires', poids:7, pour:['walker', 'runner'], shirt:[0x3a3a44, 0x2b2b33], pants:'chemise', manches:'chemise',
    acc(h){
      zAcc(h.torso, ZC.blanc, .16, .5, .02, 0, .15, .172); zAcc(h.torso, ZC.rouge, .07, .42, .02, 0, .08, .18); // chemise, cravate
      if (Math.random() < .5) zAcc(h.head, ZC.noir, .34, .04, .03, 0, .085, .205, true);              // lunettes
    } },
  chasseur: { nom:'Chasseur', poids:7, pour:['walker', 'runner', 'brute'], shirt:'carreaux', pants:0x3a3226, manches:'chemise',
    acc(h){ zAcc(h.head, ZC.hivis, .44, .16, .44, 0, .23, 0); zAcc(h.head, ZC.hivis, .12, .08, .12, 0, .34, 0); } }, // tuque orange
  cuisinier:{ nom:'Cuisinier', poids:5, pour:['walker', 'brute'], shirt:ZC.blanc, pants:'damier', manches:'chemise',
    acc(h){
      zAcc(h.head, ZC.blanc, .38, .36, .38, 0, .4, 0); zAcc(h.head, ZC.blanc, .42, .08, .42, 0, .22, 0); // toque
      zAcc(h.torso, ZC.rouge, .3, .06, .02, 0, .36, .177, true);                                      // foulard
    } },
  pompier:  { nom:'Pompier', poids:5, pour:['walker', 'runner', 'brute'], shirt:0x3a3a44, pants:'chemise', manches:'chemise',
    acc(h){
      zAcc(h.torso, ZC.jaune, .64, .06, .355, 0, -.2, 0); zAcc(h.torso, ZC.jaune, .64, .06, .355, 0, .14, 0);
      zAcc(h.head, ZC.rouge, .48, .16, .5, 0, .26, 0); zAcc(h.head, ZC.rouge, .5, .03, .66, 0, .18, -.04); // casque
    } },
  ado:      { nom:'Ado', poids:8, pour:['walker', 'runner'], shirt:[ZC.sport, ZC.rouge, 0x6a6a5a, 0x4b5a3a], pants:0x24303a, manches:'chemise',
    acc(h){
      zAcc(h.torso, h.shirt, .5, .14, .16, 0, .43, -.13);                                     // capuchon
      zkCasquette(h, pick([ZC.rouge, ZC.sport, ZC.noir, ZC.jaune]), true);                     // casquette à l'envers
      if (Math.random() < .6) zAcc(h.torso, pick([ZC.rouge, ZC.noir, 0x4b5a3a]), .48, .56, .2, 0, -.02, -.27); // sac à dos
    } },
  mariee:   { nom:'Mariée', poids:1.5, pour:['walker'], shirt:ZC.blanc, pants:ZC.blanc,
    acc(h){
      zAcc(h.body, ZC.blanc, .72, .62, .5, 0, .68, 0);                                         // robe
      zAcc(h.head, ZC.blanc, .46, .52, .05, 0, -.02, -.21); zAcc(h.head, ZC.jaune, .3, .04, .04, 0, .22, .1); // voile, diadème
    } },
  marie:    { nom:'Marié', poids:1.5, pour:['walker'], shirt:ZC.noir, pants:ZC.noir, manches:'chemise',
    acc(h){ zAcc(h.torso, ZC.blanc, .16, .5, .02, 0, .15, .172); zAcc(h.torso, ZC.rouge, .14, .06, .02, 0, .36, .18); zAcc(h.torso, ZC.blanc, .05, .05, .02, -.18, .26, .176, true); } }
};
// Toute la palette est créée tout de suite : le nombre de matériaux ne dépend pas des tenues tirées au hasard
Object.keys(ZC).forEach(k => zmat(ZC[k])); SHIRTS.forEach(zmat); PANTS.forEach(zmat); Object.keys(ZMOTIFS).forEach(zmatT);
function zkCasquette(h, c, envers){ const s = envers ? -1 : 1; zAcc(h.head, c, .43, .1, .43, 0, .25, 0); zAcc(h.head, c, .3, .03, .16, 0, .21, .27 * s); }
// Proportions par ville (multiplient TENUES[t].poids) : foreurs et chasseurs au village, complets au centre-ville, travailleurs au port
const VILLE_TENUES = {
  village:  { foreur:2.5, chasseur:3, affaires:.3, policier:.7, cuisinier:.7 },
  ville:    { cuisinier:1.6, policier:1.3, ado:1.3, chasseur:1.2 },
  banlieue: { joggeur:2.5, ado:1.8, mariee:1.3, marie:1.3, affaires:1.2, foreur:.7 },
  centre:   { affaires:3.5, policier:1.6, medecin:1.6, cuisinier:1.4, chasseur:.2, foreur:.6 },
  port:     { foreur:3.5, pompier:1.6, policier:1.2, affaires:.3, chasseur:.4, mariee:.3, marie:.3 }
};
function zTenueW(t, type, L){
  const D = TENUES[t]; if (!D || !(D.poids > 0) || D.pour.indexOf(type) < 0) return 0;
  const V = VILLE_TENUES[L && L.id] || {};
  return D.poids * (type === 'runner' && D.rw ? D.rw : 1) * (V[t] != null ? V[t] : 1);
}
function zTenue(type, L){
  L = L || (typeof curLoc !== 'undefined' ? curLoc : null);
  const ks = Object.keys(TENUES); let tot = 0;
  for (const k of ks) tot += zTenueW(k, type, L);
  if (!(tot > 0)) return 'civil';
  let r = Math.random() * tot;
  for (const k of ks){ r -= zTenueW(k, type, L); if (r < 0) return k; }
  return 'civil';
}
function buildHumanoid(T, tid){
  const D = TENUES[tid] || TENUES.civil;
  const skin = zmat(T.skin), shirt = D.shirt != null ? zCol(D.shirt) : zmat(pick(SHIRTS));
  const pants = D.pants === 'chemise' ? shirt : D.pants != null ? zCol(D.pants) : zmat(pick(PANTS));
  const sleeve = D.manches === 'chemise' ? shirt : D.manches != null ? zCol(D.manches) : skin;
  const headM = D.tete != null ? zCol(D.tete) : skin;
  const g = new THREE.Group(), body = new THREE.Group(); g.add(body);
  const mk = (geo, mat, x, y, z) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); body.add(m); return m; };
  // Petites variations de proportions : pas deux zombies pareils
  const wide = rand(.88, 1.16), tall = rand(.94, 1.06), hs = rand(.88, 1.12), al = rand(.9, 1.15);
  const torso = mk(ZG.torso, shirt, 0, 1.28, 0); torso.scale.set(wide, 1, rand(.9, 1.2));
  const head = mk(ZG.head, headM, rand(-.03, .03), 1.9, 0); head.scale.setScalar(hs); head.rotation.z = rand(-.15, .15);
  mk(ZG.eye, eyeMat, -.09, 1.94, .205 * hs); mk(ZG.eye, eyeMat, .09, 1.94, .205 * hs);
  const armL = mk(ZG.arm, sleeve, -.4 * wide, 1.62, 0), armR = mk(ZG.arm, sleeve, .4 * wide, 1.62, 0);
  armL.scale.y = al; armR.scale.y = al * rand(.92, 1.05);
  if (sleeve !== skin && D.mains !== false){ zAcc(armL, D.mains || skin, .15, .13, .15, 0, -.76, 0, true); zAcc(armR, D.mains || skin, .15, .13, .15, 0, -.76, 0, true); }
  const legM = D.jambes === 'peau' ? skin : pants;
  const legL = mk(ZG.leg, legM, -.16, .86, 0), legR = mk(ZG.leg, legM, .16, .86, 0);
  const h = { T, skin, shirt, pants, body, torso, head, armL, armR, legL, legR, extra:{} };
  if (D.acc) D.acc(h);
  g.scale.set(T.scale, T.scale * tall, T.scale);
  const parts = [torso, head, armL, armR, legL, legR].concat(h.parts || []);
  const mats = headM !== skin ? [headM, shirt, pants, skin] : [skin, shirt, pants];
  return { g, body, head, armL, armR, legL, legR, parts, mats, aimY:1.1 * T.scale, tenue:TENUES[tid] ? tid : 'civil', extra:h.extra };
}
/* ---------- Clown zombie : très rare, compté à vie ---------- */
// P.zVus : zombies apparus depuis toujours. P.clownSeuil : au prochain seuil (tiré entre 8 000 et 12 000 zombies plus loin),
// le prochain marcheur ou coureur devient un clown (type 'clown', z.clown = true ; modèle et comportement : 18-zombies-types.js).
// Jamais deux clowns en vie à la fois : s'il y en a déjà un, le seuil attend qu'il soit parti.
const CLOWN = { min:8000, max:12000 };
const clownSeuilApres = n => Math.round((n || 0) + rand(CLOWN.min, CLOWN.max));
function zClownNorm(){
  if (typeof P !== 'object' || !P) return;
  if (!(typeof P.zVus === 'number' && isFinite(P.zVus) && P.zVus >= 0)) P.zVus = 0;
  if (!(typeof P.clownSeuil === 'number' && isFinite(P.clownSeuil) && P.clownSeuil > 0)) P.clownSeuil = clownSeuilApres(P.zVus);
  if (!(typeof P.clowns === 'number' && P.clowns >= 0)) P.clowns = 0;
}
zClownNorm();
const zClownAlive = () => { for (let i = 0; i < zombies.length; i++){ const z = zombies[i]; if (z.clown && !z.dead) return z; } return null; };
const zClownOk = () => !!(ZTYPES.clown && zkind('clown'));
function zClownCheck(type){
  zClownNorm(); P.zVus++;
  if (type !== 'walker' && type !== 'runner') return type;
  if (P.zVus < P.clownSeuil || !zClownOk() || zClownAlive()) return type;
  P.clownSeuil = clownSeuilApres(P.zVus); P.clowns++;
  if (typeof saveP === 'function') saveP();
  return 'clown';
}
function spawnZombie(type){
  type = zClownCheck(type);
  if (type === 'clown' && (!zClownOk() || zClownAlive())) type = 'walker'; // jamais deux clowns à la fois
  const T = ZTYPES[type] || ZTYPES.walker; if (!ZTYPES[type]) type = 'walker';
  const K = zkind(type);
  // build() d'un type de ZKINDS : il s'occupe lui-même de son échelle ; on le positionne et on l'ajoute à la scène
  const R = (K && K.build) ? K.build(T) : buildHumanoid(T, zTenue(type));
  const g = R.g;
  zBoxFor(type, g);
  g.position.set(rand(-11, 11), 0, rand(-118, -100));
  const xp = ZXP[type] != null ? ZXP[type] : (T.xp != null ? T.xp : 5);
  const z = { type, g, body:R.body || g, head:R.head || null, armL:R.armL || null, armR:R.armR || null, legL:R.legL || null, legR:R.legR || null,
    mats:R.mats || [], geos:R.geos || [], aimY:R.aimY != null ? R.aimY : 1.1 * (T.scale || 1),
    hp: T.hp * plan.hpMult, maxHp: T.hp * plan.hpMult, speed: T.speed * plan.spdMult * rand(.85, 1.15), dmg: T.dmg * plan.dmgMult, reward: T.reward * plan.cashMult * ECO, xp: xp * plan.xp * ECO,
    phase: rand(0, 6.28), st:'walk', atkT: rand(.2, 1), stopZ: BAR_Z - .7 - rand(0, .9) - (T.stopOff || 0), flashT: 0, deadT: 0, sway: rand(.3, .9), headGone:false, meshes:[], uid: zUid++, inst:null };
  // Rendu : par instances si possible (aucun objet ajouté à la scène), sinon vrai groupe dans la scène
  if (zInstOk(g)) zInstPrep(z, z.mats); else scene.add(g);
  const parts = (R.parts || []).slice(); if (z.head && parts.indexOf(z.head) < 0) parts.push(z.head);
  parts.forEach(m => { m.userData.z = z; m.userData.head = (m === z.head); z.meshes.push(m); });
  const px = new THREE.Object3D(); px.userData.z = z; px.raycast = zProxyRaycast; z.proxy = px; hitMeshes.push(px);
  zombies.push(z);
  z.tenue = R.tenue || null; // tenue de l'humanoïde (TENUES), null pour les autres formes
  if (K && K.init) K.init(z);
  return z;
}
function removeZombieMeshes(z){ const i = z.proxy ? hitMeshes.indexOf(z.proxy) : -1; if (i >= 0) hitMeshes.splice(i, 1); }
function disposeZombie(z){
  if (!z.inst) scene.remove(z.g);
  z.mats.forEach(m => { if (!m.userData.zshared && !m.userData.zfixed) m.dispose(); }); z.geos.forEach(o => o.dispose());
  z.inst = null;
}
function clearZombies(){
  zombies.forEach(z => { removeZombieMeshes(z); disposeZombie(z); }); zombies.length = 0; hitMeshes.length = 0;
  if (typeof zkClear === 'function') zkClear(); // projectiles et effets des types spéciaux (18-zombies-types.js)
  zInstSync();
}
const tmpV = new THREE.Vector3();
function damage(z, amt, head, point){
  if (z.dead) return;
  z.hp -= amt; z.flashT = .08;
  if (z.clown){ const K = zkind(z.type); if (K && K.onHit) K.onHit(z, amt, head, point); } // « Pouet ! » (18-zombies-types.js)
  zBurst(point, 'blood', head ? 10 : 5, head ? 3 : 2);
  if (z.hp <= 0) kill(z, head, point);
}
function kill(z, head, point){
  z.dead = true; z.deadT = 0; removeZombieMeshes(z);
  if (typeof comboKill === 'function') comboKill(z); // combo de tes tirs (26-combos.js)
  const cm = typeof comboMult === 'function' ? comboMult() : 1; // tout l'argent des abattus est multiplié pendant un combo
  const pay = Math.round(z.reward * (1 + .08 * T('scavenger')) * (head ? 1.5 : 1) * cm);
  if (typeof defOnKill === 'function') defOnKill(z); // ferraille (16-atelier.js)
  addXP(z.xp);
  S.money += pay; S.earned += pay; S.kills++; S.waveKills++;
  if (head && z.head){ z.head.traverse(o => { o.visible = false; }); z.headGone = true; zBurst(point, 'blood', 14, 4); } // la tête part avec son casque
  floatText((head ? 'Tête ! +' : '+') + fmt(pay), point, head);
  const K = zkind(z.type); if (K && K.onKill) K.onKill(z, head, point, pay); // bonus et texte propres au type (clown)
}
/* ---------- Points faibles ---------- */
// Un maillage peut porter userData.weak = { mult, effet } (posé par ZKINDS[type].build, 18-zombies-types.js).
// Tous les impacts directs (balles, plombs, carreaux) passent par weakHit : dégâts multipliés, texte « Point faible ! »,
// puis l'effet propre au type (ZKINDS[type].onWeak(z, maillage, dégâts, point, weak) ; true = l'effet a déjà infligé les dégâts).
let weakT = 0; // marqueur d'impact vert quelques instants (26-combos.js l'affiche)
function weakText(txt, pos){
  const box = $('floats'); if (!box || box.childElementCount > 18 || typeof camera === 'undefined') return;
  tmpV.copy(pos).project(camera); if (tmpV.z > 1) return;
  const el = document.createElement('div'); el.className = 'fl weak'; el.textContent = txt;
  el.style.left = ((tmpV.x + 1) / 2 * innerWidth) + 'px'; el.style.top = ((1 - tmpV.y) / 2 * innerHeight - 44) + 'px';
  box.appendChild(el); setTimeout(() => el.remove(), 950);
}
// Retire un maillage des cibles (poche d'acide éclatée) : le rayon de Three.js touche aussi les maillages cachés.
// Les tirs passent par z.meshes (zProxyRaycast) : le retirer de z.meshes suffit ; caché, il n'est plus dessiné.
function dropZombieMesh(z, m){
  m.visible = false;
  let i = hitMeshes.indexOf(m); if (i >= 0) hitMeshes.splice(i, 1);
  i = z.meshes.indexOf(m); if (i >= 0) z.meshes.splice(i, 1);
}
function weakHit(z, m, amt, point){
  const wk = m && m.userData && m.userData.weak;
  if (!wk || !z || z.dead){ if (z) damage(z, amt, false, point); return false; }
  amt *= wk.mult || 1;
  z.wkHits = (z.wkHits || 0) + 1; weakT = .18;
  if (typeof CB !== 'undefined' && CB.ctx > 0) z.cbBy = true; // ce que l'effet abat plus tard (chute) compte pour ton combo
  const K = zkind(z.type);
  const r = K && K.onWeak ? K.onWeak(z, m, amt, point, wk) : null;
  const now = typeof time === 'number' ? time : 0;
  if (r && r.txt) weakText('Point faible ! ' + r.txt, point);
  else if (!(z.wkTxtT > now - .25)){ z.wkTxtT = now; weakText('Point faible !', point); }
  if (!(r && r.done)) damage(z, amt, false, point);
  return true;
}
// Coup porté à la barricade (utilisé aussi par les types spéciaux)
function hitBarricade(z, dmg, shk, chips){
  S.bar = Math.max(0, S.bar - dmg);
  shake = Math.max(shake, shk);
  tmpV.set(z.g.position.x, rand(.5, 1.3), BAR_Z); zBurst(tmpV, 'wood', chips, 2.2);
  if (Math.random() < .5) Snd.thud();
  $('dmgflash').style.opacity = .7; setTimeout(() => { $('dmgflash').style.opacity = 0; }, 90);
}
function updateZombies(dt){
  for (let i = zombies.length - 1; i >= 0; i--){
    const z = zombies[i];
    // Flash rouge : par instances, la couleur suit z.flashT (zInstSync) ; sinon (boss), par le matériau propre au zombie
    if (z.flashT > 0){ z.flashT -= dt; const on = z.flashT > 0; if (!z.inst) for (let k = 0; k < z.mats.length && k < 2; k++) if (z.mats[k].emissive && !z.mats[k].userData.zshared) z.mats[k].emissive.setHex(on ? 0x772211 : 0); }
    if (z.dead){
      z.deadT += dt;
      z.body.rotation.x = -Math.min(1, z.deadT / .45) * Math.PI / 2;
      const crowd = zombies.length > 150 ? .3 : zombies.length > 45 ? .45 : 1; // grosse foule : les corps partent plus vite
      // Mort en l'air (volant, sauteur en plein bond) : il tombe d'abord au sol
      if (z.deadT <= 1.6 * crowd && z.g.position.y > 0){ z.fallV = (z.fallV || 0) + 22 * dt; z.g.position.y = Math.max(0, z.g.position.y - z.fallV * dt); }
      if (z.deadT > 1.6 * crowd) z.g.position.y -= dt * 1.2 / crowd;
      if (z.deadT > 2.8 * crowd){ disposeZombie(z); zombies.splice(i, 1); }
      continue;
    }
    const K = zkind(z.type);
    if (K && K.update && K.update(z, dt) === true) continue;
    if (z.st === 'walk'){
      z.g.position.z += z.speed * dt;
      z.g.position.x += Math.sin(z.phase * .3) * z.sway * dt * .4;
      z.g.position.x = clamp(z.g.position.x, -12, 12);
      z.phase += dt * z.speed * 3.2;
      const s = Math.sin(z.phase);
      if (z.legL) z.legL.rotation.x = s * .6; if (z.legR) z.legR.rotation.x = -s * .6;
      if (z.armL) z.armL.rotation.x = -1.35 + s * .18; if (z.armR) z.armR.rotation.x = -1.35 - s * .18;
      z.body.position.y = Math.abs(Math.cos(z.phase)) * .06;
      z.body.rotation.x = z.type === 'runner' ? .25 : .06;
      z.body.rotation.z = Math.sin(z.phase * .5) * .06;
      if (z.g.position.z >= z.stopZ){ z.g.position.z = z.stopZ; z.st = 'attack'; if (z.legL) z.legL.rotation.x = 0; if (z.legR) z.legR.rotation.x = 0; }
    } else {
      z.phase += dt * 9;
      if (z.armL) z.armL.rotation.x = -1.6 + Math.sin(z.phase) * .5; if (z.armR) z.armR.rotation.x = -1.6 - Math.sin(z.phase) * .5;
      z.atkT -= dt;
      if (z.atkT <= 0){
        z.atkT = rand(.95, 1.25);
        const ZT = ZTYPES[z.type] || {};
        hitBarricade(z, z.dmg, ZT.hitShake != null ? ZT.hitShake : .15, ZT.chips != null ? ZT.chips : 3);
      }
    }
  }
  if (typeof zkFrame === 'function') zkFrame(dt); // projectiles des cracheurs (18-zombies-types.js)
  zFrame++; // les zombies ont bougé : les cibles des tirs seront remises à jour
}
