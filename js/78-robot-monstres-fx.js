'use strict';
/* ================= Robot : effets des trois monstres à parade (dossier 125) ================= */
// Seulement l'image : aucun chiffre de jeu (vie, dégâts, vitesses, temps des parades, rayon de l'obus, boîtes de tir) ne change.
// Les modèles (cornes et épaules du Bélier, griffes et pattes du Grappin, gorge et pustules du Mortier) sont dans
// js/73-robot-monstres2.js (mr2Deco) ; ici, les effets :
//   Bélier  : poussière sous les sabots pendant l'élan (il gratte) et la charge (nuage derrière lui), éclats de briques et
//             poussière quand il s'écrase contre la façade (Jeu.on('monstre') 'sonne').
//   Grappin : traînée qui luit pendant le saut ; sur la vitre, fissures qui s'étendent et bave qui coule (dans le cadre du
//             Grappin : MR2_VITRE ne change pas, rien ne cache plus d'écran) ; morceaux qui glissent sur la vitre quand on le
//             décroche ('decroche').
//   Mortier : lueur et fumée au départ du tir ('tir'), traînée de l'obus (lueur sans brouillard et fumée claire, lisible sur le
//             ciel de jour comme de nuit), éclaboussure d'acide à l'impact (mfxImpact, appelée par mr2Impact) ; anneau qui se
//             resserre sur le cercle rouge pendant le vol : 1,7 × le rayon au départ, exactement le rayon (la zone touchée) à
//             l'impact (le cercle sous le robot reste caché par le tableau de bord en regardant devant : docs/robot.md).
// Lueurs des modèles (yeux du Bélier, gorge du Mortier, couronne du Titan roi) : dessinées ici à la place de leurs repères.
// Particules : réserves de taille fixe (poussière et fumée translucides, briques et gouttes, lueur additive sans brouillard,
// morceaux sur la vitre), un appel de dessin chacune, et seulement quand une particule vit. Aucun objet créé en jeu.
// Hasard propre (mfxHasard) : aucun tirage dans Math.random ; les objets Three.js sont créés au chargement par mr2Calme
// (js/73), qui prête Math.random à un générateur à part (4 nombres par objet créé).

const MFX_REGL = {
  solide:96, nuage:128, lueur:96, debris:12,                           // tailles des réserves
  belier:{ elanT:.09, chargeT:.035, briques:16 },                       // poussière : une bouffée toutes les ... s
  grappin:{ trainee:.025 },
  obus:{ lueurT:.025, fumeeT:.035, anneau:1.7 },                         // anneau : rayon au départ (× le rayon de l'obus)
  flaque:1.6                                                            // éclaboussure au sol : durée (s)
};
let mfxS = 1251;
const mfxHasard = () => { mfxS = mfxS * 16807 % 2147483647; return (mfxS - 1) / 2147483646; };
const mfxR = (a, b) => a + (b - a) * mfxHasard();
const MFX = { solide:null, nuage:null, lueur:null, debris:null, lueurs:{}, anneaux:[], flaques:[], fissures:null, bave:null, rue:-1, dist:0, emis:0 };

// Réserve de particules : tableaux de taille fixe, un InstancedMesh
function mfxReserve(n, mat, parent){
  const im = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 0), mat, n);
  im.setColorAt(0, new THREE.Color(1, 1, 1)); im.instanceMatrix.setUsage(THREE.DynamicDrawUsage); im.instanceColor.setUsage(THREE.DynamicDrawUsage);
  im.frustumCulled = false; im.count = 0; im.visible = false; im.userData.keep = true; im.renderOrder = 3; parent.add(im);
  const F = () => new Float32Array(n);
  return { im, n, i:0, vivants:0, x:F(), y:F(), z:F(), vx:F(), vy:F(), vz:F(), s0:F(), s1:F(), t:F(), T:F(), gr:F(), sol:F(), cr:F(), cg:F(), cb:F(), add:mat.blending === THREE.AdditiveBlending };
}
mr2Calme(() => {
  const mS = new THREE.MeshLambertMaterial({ color:0xffffff }), mL = new THREE.MeshBasicMaterial({ color:0xffffff, transparent:true, blending:THREE.AdditiveBlending, depthWrite:false, fog:false });
  const mD = new THREE.MeshBasicMaterial({ color:0xffffff, fog:false });
  const mN = new THREE.MeshLambertMaterial({ color:0xffffff, transparent:true, opacity:.6, depthWrite:false });
  [mS, mN, mL, mD].forEach(m => { m.userData.keep = true; });
  MFX.solide = mfxReserve(MFX_REGL.solide, mS, scene);
  MFX.nuage = mfxReserve(MFX_REGL.nuage, mN, scene);
  MFX.lueur = mfxReserve(MFX_REGL.lueur, mL, scene);
  MFX.debris = mfxReserve(MFX_REGL.debris, mD, vmCam); MFX.debris.im.renderOrder = 5;
  // Lueurs des modèles (repères mr2Lueur de js/73) : orange sans brouillard comme les lueurs des zombies, une matière à part
  const mO = new THREE.MeshBasicMaterial({ color:0xffa02a, fog:false }); mO.userData.keep = true;
  [['box', new THREE.BoxGeometry(1, 1, 1)], ['sph', new THREE.SphereGeometry(1, 10, 8)]].forEach(p => {
    const im = new THREE.InstancedMesh(p[1], mO, 64); im.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    im.frustumCulled = false; im.count = 0; im.visible = false; im.userData.keep = true; scene.add(im); MFX.lueurs[p[0]] = im;
  });
  // Anneaux qui se resserrent (un par obus) et éclaboussures d'acide au sol
  const gA = new THREE.RingGeometry(.9, 1, 48); gA.rotateX(-Math.PI / 2);
  const gF = new THREE.CircleGeometry(1, 28); gF.rotateX(-Math.PI / 2);
  for (let i = 0; i < 3; i++){
    const a = new THREE.Mesh(gA, new THREE.MeshBasicMaterial({ color:0xffb040, transparent:true, opacity:.5, depthWrite:false, side:THREE.DoubleSide, fog:false }));
    const f = new THREE.Mesh(gF, new THREE.MeshBasicMaterial({ color:0x8ad62a, transparent:true, opacity:0, depthWrite:false, side:THREE.DoubleSide }));
    [a, f].forEach(o => { o.visible = false; o.userData.keep = true; o.material.userData.keep = true; o.renderOrder = 2; scene.add(o); });
    MFX.anneaux.push(a); MFX.flaques.push({ m:f, t:0, x:0, z:0, r:1 });
  }
  // Vitre : fissures en étoile et bave sous la gueule, enfants du Grappin de la vitre (même place, même taille, js/73)
  if (typeof mr2Vitre === 'object'){
    const b = vmNew(), V = [.86, .9, .95];
    for (let i = 0; i < 11; i++){
      const a = i / 11 * Math.PI * 2 + mfxR(-.2, .2), L = mfxR(.3, .46), cx = Math.cos(a), cy = Math.sin(a);
      const lx = Math.min(L, .41 / Math.max(.01, Math.abs(cx))), ly = Math.min(lx, .23 / Math.max(.01, Math.abs(cy))); // dans le cadre du Grappin
      vmBox(b, .014, ly, .004, V, cx * ly / 2, cy * ly / 2, -.06, 0, 0, a - Math.PI / 2, 0);
      if (i % 2 === 0){ const a2 = a + mfxR(-.6, .6), l2 = Math.min(.07, ly * .3), ox = cx * ly * .7, oy = cy * ly * .7; vmBox(b, .008, l2, .004, V, ox + Math.cos(a2) * l2 / 2, oy + Math.sin(a2) * l2 / 2, -.06, 0, 0, a2 - Math.PI / 2, 0); }
    }
    MFX.fissures = vmMesh(mr2Vitre, b);
    const v = vmNew(), Bv = [.58, .74, .16];
    [[-.04, .2], [.015, .13], [.05, .17]].forEach(p => { vmBox(v, .024, p[1], .02, Bv, p[0], -p[1] / 2, 0, 0, 0, 0, 0); vmBox(v, .034, .03, .024, Bv, p[0], -p[1], 0, 0, 0, 0, 0); });
    MFX.bave = vmMesh(mr2Vitre, v); MFX.bave.position.set(0, .1, .11);
  }
});

/* ---------- Particules ---------- */
function mfxEmet(P, x, y, z, vx, vy, vz, s0, s1, T, c, gr, sol){
  const i = P.i; P.i = (i + 1) % P.n;
  P.x[i] = x; P.y[i] = y; P.z[i] = z; P.vx[i] = vx; P.vy[i] = vy; P.vz[i] = vz; P.s0[i] = s0; P.s1[i] = s1;
  P.t[i] = T; P.T[i] = T; P.gr[i] = gr || 0; P.sol[i] = sol == null ? -1e3 : sol; P.cr[i] = c[0]; P.cg[i] = c[1]; P.cb[i] = c[2];
  MFX.emis++;
}
function mfxPas(P, dt, dz){
  const A = P.im.instanceMatrix.array, C = P.im.instanceColor.array; let n = 0;
  for (let i = 0; i < P.n; i++){
    if (P.t[i] <= 0) continue;
    if (dt > 0){
      P.t[i] -= dt; if (P.t[i] <= 0) continue;
      P.vy[i] -= P.gr[i] * dt; P.x[i] += P.vx[i] * dt; P.y[i] += P.vy[i] * dt; P.z[i] += P.vz[i] * dt + dz;
      if (P.y[i] < P.sol[i]){ P.y[i] = P.sol[i]; P.vy[i] = Math.abs(P.vy[i]) * .25; P.vx[i] *= .5; P.vz[i] *= .5; }
    } else P.z[i] += dz;
    const k = 1 - P.t[i] / P.T[i], f = k > .7 ? (1 - k) / .3 : 1, s = (P.s0[i] + (P.s1[i] - P.s0[i]) * k) * (P.add ? 1 : f), o = n * 16;
    A[o] = s; A[o + 1] = 0; A[o + 2] = 0; A[o + 3] = 0; A[o + 4] = 0; A[o + 5] = s; A[o + 6] = 0; A[o + 7] = 0;
    A[o + 8] = 0; A[o + 9] = 0; A[o + 10] = s; A[o + 11] = 0; A[o + 12] = P.x[i]; A[o + 13] = P.y[i]; A[o + 14] = P.z[i]; A[o + 15] = 1;
    const e = P.add ? f * (1 - k * .5) : 1; // la lueur s'éteint en fondu (mélange additif)
    C[n * 3] = P.cr[i] * e; C[n * 3 + 1] = P.cg[i] * e; C[n * 3 + 2] = P.cb[i] * e; n++;
  }
  P.vivants = n;
  if (n || P.im.count){ P.im.count = n; P.im.visible = n > 0; P.im.instanceMatrix.needsUpdate = true; P.im.instanceColor.needsUpdate = true; }
}
function mfxVide(){
  [MFX.solide, MFX.nuage, MFX.lueur, MFX.debris].forEach(P => { if (!P) return; P.t.fill(0); P.vivants = 0; P.im.count = 0; P.im.visible = false; });
  MFX.anneaux.forEach(a => { a.visible = false; });
  MFX.flaques.forEach(F => { F.t = 0; F.m.visible = false; });
  Object.keys(MFX.lueurs).forEach(k => { MFX.lueurs[k].count = 0; MFX.lueurs[k].visible = false; });
}
// Lueurs des modèles : chaque image, à la place de leur repère (yeux du Bélier, gorge du Mortier, couronne du Titan roi)
function mfxLueurs(){
  const L = MFX.lueurs, n = { box:0, sph:0 };
  for (const z of zombies){
    const R = z.g.userData.lueurs; if (!R || !z.g.visible) continue;
    for (const o of R){
      const im = L[o.userData.forme]; if (!im || !o.visible || !o.parent.visible || n[o.userData.forme] >= 64) continue;
      o.updateWorldMatrix(true, false); o.matrixWorld.toArray(im.instanceMatrix.array, n[o.userData.forme]++ * 16);
    }
  }
  Object.keys(L).forEach(k => { const im = L[k]; if (n[k] || im.count){ im.count = n[k]; im.visible = n[k] > 0; im.instanceMatrix.needsUpdate = true; } });
}
const MFX_C = { poussiere:[.74, .67, .58], fumee:[.7, .68, .66], feu:[1, .55, .16], acide:[.5, 1, .2], acideS:[.42, .72, .14], jaune:[.85, .74, .22],
  briques:[[.55, .22, .15], [.66, .3, .2], [.45, .18, .12], [.6, .58, .55]], grappin:[[.62, .56, .2], [.08, .07, .06], [.58, .74, .16]] };
const mfxPick = L => L[Math.floor(mfxHasard() * L.length) % L.length];
// Bouffée de poussière (se gonfle, monte un peu, retombe en rétrécissant)
function mfxPoussiere(x, y, z, vx, vz, s){ const c = MFX_C.poussiere, v = mfxR(.85, 1.1); mfxEmet(MFX.nuage, x, y, z, vx, mfxR(.4, 1.3), vz, .25 * s, mfxR(.8, 1.2) * s, mfxR(.6, 1), [c[0] * v, c[1] * v, c[2] * v], 0); }

/* ---------- Moments ---------- */
function mfxMonstre(quoi, z){
  if (!z || !z.g || !(typeof MECH === 'object' && MECH.on)) return;
  const p = z.g.position, sc = z.g.scale.y || 1;
  if (quoi === 'sonne'){
    // Écrasé contre la façade : briques qui volent vers la rue et poussière (la tête est dans le mur)
    const s = z.mrSide || Math.sign(p.x) || 1, wx = s * 12.4;
    for (let i = 0; i < MFX_REGL.belier.briques; i++){
      const b = mfxPick(MFX_C.briques), w = mfxR(.12, .26);
      mfxEmet(MFX.solide, wx + mfxR(-.4, .4), mfxR(.8, 4), p.z + mfxR(-1.6, 1.6), -s * mfxR(1.5, 6), mfxR(1, 5), mfxR(-2, 2), w, w, mfxR(1.3, 2), b, 12, .06);
    }
    for (let i = 0; i < 10; i++) mfxPoussiere(wx - s * mfxR(0, 1.5), mfxR(.5, 3), p.z + mfxR(-2, 2), -s * mfxR(.5, 2), mfxR(-1, 1), 1.4);
  } else if (quoi === 'tir'){
    // Départ de l'obus : lueur et fumée à la bouche du tube
    for (let i = 0; i < 7; i++) mfxEmet(MFX.lueur, p.x + mfxR(-.3, .3), 3.6 * sc + mfxR(0, .6), p.z + mfxR(-.3, .3), mfxR(-1, 1), mfxR(2, 5), mfxR(-1, 1), mfxR(.4, .7), .1, mfxR(.25, .45), MFX_C.feu, 0);
    for (let i = 0; i < 6; i++) mfxEmet(MFX.nuage, p.x + mfxR(-.4, .4), 3.6 * sc + mfxR(0, .8), p.z + mfxR(-.4, .4), mfxR(-.6, .6), mfxR(1, 2.5), mfxR(-.6, .6), .3, mfxR(1, 1.6), mfxR(1, 1.6), MFX_C.fumee, 0);
  } else if (quoi === 'decroche' && typeof mr2Vitre === 'object'){
    // Morceaux qui glissent sur la vitre et tombent (repère de l'habitacle)
    const v = mr2Vitre.position, k = mr2Vitre.scale.x || 1;
    for (let i = 0; i < 10; i++) mfxEmet(MFX.debris, v.x + mfxR(-.3, .3) * k, v.y + mfxR(-.15, .15) * k, v.z + .02, mfxR(-.25, .25) * k, mfxR(-.1, .35) * k, 0, mfxR(.012, .028) * k, .006 * k, mfxR(.6, 1), mfxPick(MFX_C.grappin), 1.6 * k);
  }
}
// Impact de l'obus (appelée par mr2Impact, js/73) : éclaboussure d'acide, gouttes, flaque qui s'efface
function mfxImpact(o){
  if (!o || !(typeof MECH === 'object' && MECH.on) || !MFX.solide) return;
  for (let i = 0; i < 12; i++) mfxEmet(MFX.lueur, o.x + mfxR(-.6, .6), mfxR(.2, .8), o.z + mfxR(-.6, .6), mfxR(-4, 4), mfxR(2, 6), mfxR(-4, 4), mfxR(.35, .6), .08, mfxR(.35, .6), MFX_C.acide, 9);
  for (let i = 0; i < 16; i++){ const w = mfxR(.08, .17); mfxEmet(MFX.solide, o.x, .4, o.z, mfxR(-5, 5), mfxR(2, 7), mfxR(-5, 5), w, w * .7, mfxR(.8, 1.3), MFX_C.acideS, 14, .05); }
  const F = MFX.flaques.find(f => f.t <= 0) || MFX.flaques[0];
  F.t = MFX_REGL.flaque; F.x = o.x; F.z = o.z; F.r = o.r || 3; F.m.visible = true; F.m.position.set(F.x, .058, F.z);
}

/* ---------- Chaque image ---------- */
function mfxImage(dt){
  const on = typeof MECH === 'object' && MECH.on && (state === 'mech' || state === 'mechover');
  if (!on){ if (MFX.rue !== -1){ MFX.rue = -1; mfxVide(); } return; }
  if (MECH.street !== MFX.rue){ MFX.rue = MECH.street; MFX.dist = MECH.dist; mfxVide(); }
  let dz = MECH.dist - MFX.dist; MFX.dist = MECH.dist; if (Math.abs(dz) > 6) dz = 0;
  const jeu = state === 'mech' && !MECH.paused, d = jeu ? dt : 0;
  if (!jeu) dz = 0;
  const R = MFX_REGL, t = typeof time === 'number' ? time : 0;
  let gr = null;
  if (jeu) for (const z of zombies){
    if (z.dead) continue;
    const p = z.g.position, sc = z.g.scale.y || 1;
    if (z.type === 'belier' && (z.mr === 'elan' || z.mr === 'charge')){
      // Sabots : il gratte du sabot avant pendant l'élan ; en charge, nuage derrière lui
      z.mfxT = (z.mfxT || 0) - dt;
      if (z.mfxT <= 0){
        if (z.mr === 'elan'){ z.mfxT = R.belier.elanT; mfxPoussiere(p.x + mfxR(-1.4, -.8), .15, p.z + 1.3, mfxR(-1.5, 0), mfxR(-1.5, .3), 1.4); }
        else { z.mfxT = R.belier.chargeT; const s = mfxHasard() < .5 ? -1 : 1, av = mfxHasard() < .5; mfxPoussiere(p.x + s * mfxR(.5, .85) * sc, .2, p.z + (av ? .6 : -.8) * sc, s * mfxR(1, 2.6), mfxR(-3, -.8), 1.7); }
      }
    } else if (z.type === 'grappin'){
      if (z.mr === 'saut'){
        z.mfxT = (z.mfxT || 0) - dt;
        if (z.mfxT <= 0){ z.mfxT = R.grappin.trainee; mfxEmet(MFX.lueur, p.x, p.y + .75 * sc, p.z, 0, 0, 0, .32, .05, .35, MFX_C.jaune, 0); }
      } else if (z.mr === 'accroche' && !gr) gr = z;
    }
  } else if (MECH.on) for (const z of zombies) if (!z.dead && z.type === 'grappin' && z.mr === 'accroche'){ gr = z; break; }
  // Obus : traînée (lueur et fumée) et anneau qui se resserre jusqu'au vrai rayon
  const OB = typeof MR2_OBUS === 'object' ? MR2_OBUS : [];
  for (let i = 0; i < MFX.anneaux.length; i++){
    const o = OB[i], a = MFX.anneaux[i];
    if (!o || !o.actif){ a.visible = false; continue; }
    const k = Math.min(1, o.t / o.T), q = 1 - k;
    a.visible = true; a.position.set(o.x, .075, o.z); a.scale.setScalar(o.r * (1 + (R.obus.anneau - 1) * q * q));
    a.material.opacity = .35 + .55 * k * (.75 + .25 * Math.abs(Math.sin(t * (8 + 14 * k))));
    if (jeu){
      const m = o.m.position;
      o.mfxL = (o.mfxL || 0) - dt; o.mfxF = (o.mfxF || 0) - dt;
      if (o.mfxL <= 0){ o.mfxL = R.obus.lueurT; mfxEmet(MFX.lueur, m.x, m.y, m.z, 0, 0, 0, .55, .12, .45, MFX_C.feu, 0); }
      if (o.mfxF <= 0){ o.mfxF = R.obus.fumeeT; mfxEmet(MFX.nuage, m.x + mfxR(-.15, .15), m.y, m.z + mfxR(-.15, .15), mfxR(-.2, .2), mfxR(.1, .5), mfxR(-.2, .2), .28, mfxR(.8, 1.1), mfxR(1.1, 1.5), MFX_C.fumee, 0); }
    }
  }
  // Flaques d'acide : grandissent vite puis s'effacent (collées à la rue qui défile)
  for (const F of MFX.flaques){
    if (F.t <= 0) continue;
    F.t -= d; F.z += dz;
    if (F.t <= 0){ F.m.visible = false; continue; }
    const k = 1 - F.t / R.flaque;
    F.m.position.set(F.x, .058, F.z); F.m.scale.setScalar(F.r * (.35 + .5 * Math.min(1, k * 5)));
    F.m.material.opacity = .62 * Math.min(1, (1 - k) * 2.5);
  }
  // Vitre : fissures qui s'étendent, bave qui coule (tant qu'il est accroché)
  if (gr && MFX.fissures){
    MFX.fissures.scale.setScalar(Math.min(1, .3 + gr.mrT * .9));
    MFX.bave.scale.set(1, Math.min(1, .15 + gr.mrT * .45 + .05 * Math.sin(t * 3)), 1);
  }
  mfxLueurs();
  mfxPas(MFX.solide, d, dz); mfxPas(MFX.nuage, d, dz); mfxPas(MFX.lueur, d, dz); mfxPas(MFX.debris, d, 0);
}
try { Jeu.on('image', dt => { try { mfxImage(dt); } catch (e) { errNote(e); } }); } catch (e) { errNote(e); }
try { Jeu.on('monstre', (quoi, z) => { try { mfxMonstre(quoi, z); } catch (e) { errNote(e); } }); } catch (e) { errNote(e); }

// Accès pour les tests automatiques
window.__mfx = { MFX, MFX_REGL, mfxImage, mfxMonstre, mfxImpact, mfxVide, mfxEmet };
