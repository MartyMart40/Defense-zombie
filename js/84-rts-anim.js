'use strict';
/* ================= RTS : des unités qui vivent (dossier 129), seulement visuel ================= */
// Les unités du RTS glissaient sur le sol et pivotaient d'un coup vers leur cible. Elles prennent du poids, sans rien changer
// au jeu : aucun chiffre, aucune vitesse, aucune portée, aucune position réelle, aucun moment de tir.
//   Petits robots : jambes et torse séparés (les jambes suivent la marche, le torse se tourne vers la cible avant le tir),
//     recul au tir, penchés en freinant et en repartant, regard qui balaie à l'arrêt, jambes écartées et buste penché
//     pour « Tenir la position ». Mech de combat : vraies jambes qui marchent (calées sur ses pas lourds), torse qui pivote.
//   Tank : tourelle qui suit la cible pendant que la caisse garde sa route, tourelle qui recule et caisse qui se cabre au
//     coup de canon, nez qui plonge au freinage. Apache : penché dans le sens où il va, roulis dans les virages, nez vers
//     la cible avant de tirer.
//   Sélection : petit saut et anneau qui se resserre. Marqueur d'ordre (js/44) : un anneau qui se resserre sur le point.
//   Très abîmée (sous 30 %) : l'unité fume, et un robot boite (sa vitesse réelle ne change pas).
//   Sortie d'usine : l'unité sort par la porte (ou s'assemble sur place si la porte est de l'autre côté), l'Apache décolle
//     de l'héliport, l'avion de l'aérodrome ; le moment et l'endroit où elle devient jouable ne changent pas.
//   Mort : l'unité bascule, le tank saute et s'affaisse, l'appareil tombe en vrille ; la carcasse de js/79 prend le relais.
// Comment : toutes les pièces visibles d'une unité passent dans un groupe à moi (« vis ») posé à l'origine de l'objet racine
// u.g, que le jeu lit et déplace comme avant. Je ne touche qu'à vis, à des propriétés que le jeu n'écrit jamais
// (u.m.rotation.x et y, u.m.position.x et z, rotation.z des jambes, échelle de l'anneau) et à mes propres pièces.
// Le tank (tourelle à part) et le Mech de combat (jambes à part) reçoivent une géométrie sans ces pièces, faite ici.
// Hasard : jamais Math.random. Three.js tire 4 nombres pour chaque objet créé : tout est créé dans raCalme (générateur à
// part), et aucune géométrie du jeu (cache RTS_GEO) n'est demandée ici avant lui (elle sauterait ses tirages à lui).
// Les bâtiments (construction, production, tourelles, radar, écroulement) sont dans js/84-rts-anim-bat.js.
// Réglages : RA_REGL (on : false remet tout comme avant, même en pleine partie).

const RA_REGL = {
  on: true,
  vue: 120,          // au-delà de cette distance au centre de la vue (ou de max(vue, hauteur × 2,4) vue de haut) : pas animé
  rayon: 7,          // rayon de la sphère d'une unité pour le test du cadre de la caméra
  rob: { jambes:9, torse:11, torseMax:1.5, balaie:.5, balaieV:.5, recul:.16, reculA:.2, reculT:.09, penche:.022, pencheMax:.13,
    tenir:{ ecart:.17, penche:.12, t:.25 }, arriere:2.3 },
  mech: { jambes:2.8, torse:4.5, torseMax:1.1, pas:.42, recul:.28, reculA:.07, reculT:.14 },
  tank: { caisse:2.4, tourelle:3.4, recul:.38, reculA:.055, reculT:.22, cabre:.018, cabreMax:.07 },
  heli: { tourne:3.2, penche:.03, pencheMax:.3, roulis:.5, roulisMax:.32, viseT:.3 },
  choix: { saut:.45, t:.34, anneau:.5 },
  marque: { grand:2.2 },
  abime: { seuil:.3, fumee:2.5, boite:.08 },
  sortie: { t:.85, assemble:.6, envol:1.9, avion:2.4 },
  mort: { robot:.75, tank:1.1, air:1.25, max:10 }
};
const RA = { pret:false, actif:false, monde:null, root:null, u:new WeakMap(), liste:new Set(), morts:new WeakSet(), vus:new WeakSet(), depart:true,
  geo:{}, fantomes:[], fi:0, t:0, temps:{ ms:0, n:0, max:0 }, choix:new Set() };
const RA_FR = new THREE.Frustum(), RA_PM = new THREE.Matrix4(), RA_SPH = new THREE.Sphere(), _raV = new THREE.Vector3(), _raQ = new THREE.Quaternion();

/* ---------- Hasard à part ---------- */
let raS = 1290;
const raHasard = () => { raS = raS * 16807 % 2147483647; return (raS - 1) / 2147483646; };
const raR = (a, b) => a + (b - a) * raHasard();
function raCalme(fn){ const M = Math.random; Math.random = raHasard; try { return fn(); } finally { Math.random = M; } }
const raAng = a => Math.atan2(Math.sin(a), Math.cos(a));
const raVers = (cur, want, k) => cur + raAng(want - cur) * k; // approche d'un angle (k : part du chemin faite)
const raK = (dt, v) => 1 - Math.exp(-dt * v);
const raPart = () => (typeof RV === 'object' && RV.actif && RV.soft && typeof rfxP === 'function') ? RV : null; // fumée et lueurs de js/79

/* ---------- Géométries à moi (faites dans raCalme, rendues en quittant le RTS) ---------- */
// Elles reprennent les pièces des modèles de js/41-rts.js (rtsUnitGeo), séparées pour pouvoir bouger.
function raGeo(cle, draw){ if (!RA.geo[cle]){ const b = vmNew(); draw(b); RA.geo[cle] = vmGeo(b); } return RA.geo[cle]; }
const raCaisse = () => raGeo('caisse', b => { // tank sans sa tourelle
  const c = RTS_UNITS.tank.col;
  vmBox(b, 2.6, .9, 4.4, c, 0, .9, 0, 0, 0, 0, .15);
  for (const s of [-1, 1]){ vmBox(b, .7, .9, 4.6, RTS_DARK, s * 1.55, .45, 0, 0, 0, 0, .1); for (let i = 0; i < 5; i++) vmCyl(b, .32, .72, 0x2a2a28, s * 1.55, .4, -1.7 + i * .85, 0, Math.PI / 2, 0, 8); }
  vmBox(b, 2.7, .12, 4.5, RTS_Y, 0, 1.36, 0, 0, 0, 0, 0);
  vmCyl(b, .75, .12, RTS_DARK, 0, 1.42, -.1, Math.PI / 2, 0, 0, 12); // couronne de la tourelle
});
const raTourelle = () => raGeo('tourelle', b => { // pivot au centre de la tourelle (0, 0, -0,1 dans la caisse)
  const c = RTS_UNITS.tank.col;
  vmBox(b, 1.7, .7, 1.9, c, 0, 1.75, 0, 0, 0, 0, .12); vmCyl(b, .14, 3, RTS_DARK, 0, 1.8, 2.2, 0, 0, 0, 8); vmCyl(b, .22, .4, RTS_DARK, 0, 1.8, 3.6, 0, 0, 0, 8);
  vmBox(b, .4, .3, .4, VC.steel, .5, 2.2, -.5, 0, 0, 0, .04);
});
const RA_HANCHE = 4.3;
const raMechCorps = () => raGeo('mechCorps', b => { // Mech de combat sans ses jambes (même dessin que rtsUnitGeo('mech'))
  const G = RTS_UNITS.mech.col, D = VC.blue;
  vmBox(b, 3, .8, 1.7, D, 0, 4.4, 0, 0, 0, 0, .1);
  vmBox(b, 3.8, 2.3, 2.8, G, 0, 5.8, 0, 0, 0, 0, .25); vmBox(b, 3.9, .3, 2.9, RTS_Y, 0, 4.85, 0, 0, 0, 0, 0);
  vmBox(b, 2.2, .75, .12, RTS_GLASS, 0, 6.3, 1.42, -.2, 0, 0, .05);
  vmBox(b, 2.6, .5, 1.6, D, 0, 7.15, -.3, 0, 0, 0, .1); vmCyl(b, .05, 1.6, VC.light, 1.1, 7.9, -.8, Math.PI / 2, 0, 0, 6);
  for (let i = 0; i < 4; i++) vmBox(b, .14, .14, .14, [3, i % 2 ? .4 : 2.2, .2], -1.5 + i, 6.95, 1.4, 0, 0, 0, 0);
  vmBox(b, 1, 1, 1.3, G, -2.35, 6, 0, 0, 0, 0, .1); vmBox(b, .9, .9, 1.8, D, -2.35, 5.1, .6, 0, 0, 0, .08);
  for (let i = 0; i < 6; i++){ const t = i / 6 * Math.PI * 2; vmCyl(b, .08, 1.9, VC.blue, -2.35 + Math.cos(t) * .22, 5.1 + Math.sin(t) * .22, 2.4, 0, 0, 0, 6); }
  vmCyl(b, .34, .1, VC.park, -2.35, 5.1, 3.3, 0, 0, 0, 12);
  vmBox(b, 1, 1, 1.3, G, 2.35, 6, 0, 0, 0, 0, .1); vmBox(b, 1.4, 1.2, 1.9, VC.olive, 2.45, 5.3, .5, 0, 0, 0, .08);
  for (let i = 0; i < 6; i++) vmCyl(b, .16, .1, VC.port, 2.05 + (i % 3) * .4, 5.55 - Math.floor(i / 3) * .45, 1.46, 0, 0, 0, 10);
  vmBox(b, 1.42, .2, .4, [3, .6, .2], 2.45, 5.95, -.2, 0, 0, 0, 0);
});
const raMechJambe = () => raGeo('mechJambe', b => { // une jambe, pivot à la hanche
  const G = RTS_UNITS.mech.col, D = VC.blue, h = RA_HANCHE;
  vmBox(b, .9, 2.1, 1.1, G, 0, 3.2 - h, -.1, .15, 0, 0, .1); vmBox(b, .8, 2.3, 1, D, 0, 1.25 - h, .15, -.1, 0, 0, .1);
  vmBox(b, 1.3, .45, 2.1, D, 0, .22 - h, .35, 0, 0, 0, .08); vmCyl(b, .45, 1.2, VC.steel, 0, 2.25 - h, 0, 0, Math.PI / 2, 0, 10);
});

/* ---------- Une unité : ses pièces passent dans vis ---------- */
const raRobot = u => u.U.cat === 'rob' && !u.U.big;
function raAttacher(u){
  const g = u.g, vis = new THREE.Object3D(); vis.rotation.order = 'YXZ'; vis.name = 'raVis';
  const garder = [u.ring, u.hpb && u.hpb.bg, u.hpb && u.hpb.fg];
  g.children.slice().forEach(c => { if (garder.indexOf(c) < 0){ g.remove(c); vis.add(c); } });
  g.add(vis);
  u.m.rotation.order = 'YXZ';
  const yaw = g.rotation.y;
  const st = { vis, geo0:u.m.geometry, extras:[], jambes:yaw, torse:yaw, px:g.position.x, pz:g.position.z, v:0, vl:0, acc:0, penche:0, roulis:0,
    cd:[u.cd, u.cd2, u.cd3 || 0, u.cd4 || 0], kick:0, tenir:0, step:u.step, boite:0, fumeT:0, ph:raHasard() * 6.28, saut:0, sortie:null, choisi:false };
  if (u.type === 'tank'){
    u.m.geometry = raCaisse();
    st.tour = new THREE.Mesh(raTourelle(), rtsMat); st.tour.position.set(0, 0, -.1); st.tour.name = 'raTourelle'; vis.add(st.tour); st.extras.push(st.tour);
    st.tourY = yaw;
  } else if (u.type === 'mech'){
    u.m.geometry = raMechCorps();
    st.mj = [-1, 1].map(s => { const j = new THREE.Mesh(raMechJambe(), rtsMat); j.position.set(s * 1.15, RA_HANCHE, 0); j.name = 'raJambe'; vis.add(j); st.extras.push(j); return j; });
  }
  RA.u.set(u, st); RA.liste.add(u);
  return st;
}
function raDetacher(u, st){
  if (!st) return;
  const g = u.g, vis = st.vis;
  st.extras.forEach(m => { if (m.parent) m.parent.remove(m); });
  vis.children.slice().forEach(c => { vis.remove(c); g.add(c); });
  if (vis.parent) vis.parent.remove(vis);
  u.m.geometry = st.geo0; u.m.rotation.order = 'XYZ'; u.m.rotation.x = u.m.rotation.y = 0; u.m.position.x = u.m.position.z = 0;
  if (u.legs) u.legs.forEach(l => { l.rotation.z = 0; });
  if (u.ring) u.ring.scale.set(1, 1, 1);
  RA.u.delete(u); RA.liste.delete(u);
}

// Sortie d'usine : l'unité part de la porte (ou de la piste, de l'héliport) jusqu'à sa vraie place, en vis seulement
function raSortie(u, st){
  const f = typeof raUsinePour === 'function' ? raUsinePour(u) : null; if (!f) return;
  const gp = u.g.position, S = RA_REGL.sortie;
  if (u.U.kind === 'air' || u.U.kind === 'heli'){
    st.sortie = { x:f.x, y:.4, z:f.z, t:0, T:u.U.kind === 'air' ? S.avion : S.envol, mode:'envol' };
  } else {
    const p = typeof raPorteDe === 'function' ? raPorteDe(f) : null;
    if (p && Math.hypot(p.x - gp.x, p.z - gp.z) < f.r + 1.5 && (gp.x - f.x) * p.nx + (gp.z - f.z) * p.nz > 0) st.sortie = { x:p.x, y:0, z:p.z, t:0, T:S.t, mode:'porte' };
    else st.sortie = { t:0, T:S.assemble, mode:'assemble' };
    if (typeof raPorteOuvrir === 'function') raPorteOuvrir(f);
  }
}

/* ---------- Chaque image, pour une unité visible ---------- */
function raCible(u){ // ce que l'unité vise ou va viser (pas forcément déjà à portée de tir)
  const t = u.tgt && !u.tgt.dead && u.tgt.g ? u.tgt.g.position : null;
  if (t) return t;
  const n = u.nest && !u.nest.dead ? u.nest : (u.autoNest && !u.autoNest.dead ? u.autoNest : null);
  return n ? _raV.set(n.x, 0, n.z) : null;
}
function raTirs(u, st){ // un tir vient de partir : le temps de recharge est remonté (le jeu le fait au moment du tir)
  const C = st.cd, a = u.cd, b = u.cd2, c = u.cd3 || 0, d = u.cd4 || 0; let k = 0;
  if (a > C[0] + 1e-6 || b > C[1] + 1e-6) k = 1; else if (d > C[3] + 1e-6) k = .6; else if (c > C[2] + 1e-6) k = .3;
  C[0] = a; C[1] = b; C[2] = c; C[3] = d;
  return k;
}
function raPortee(u, st){ if (!(st.rngT > RA.t)){ st.rngT = RA.t + .5; st.rng = rtsStat(u, 'range'); } return st.rng; } // relue deux fois par seconde
function raUnite(u, st, dt, voit){
  const g = u.g, gp = g.position, U = u.U, R = RA_REGL;
  // Vitesse réelle (déplacement de l'objet racine), pour les pas, la penche et la poussière
  const dx = gp.x - st.px, dz = gp.z - st.pz, d = Math.hypot(dx, dz); st.px = gp.x; st.pz = gp.z;
  const v = dt > 0 ? Math.min(40, d / dt) : st.v, acc = dt > 0 ? (v - st.v) / dt : 0; st.v = v;
  st.acc += (clamp(acc, -60, 60) - st.acc) * raK(dt, 10);
  const tir = raTirs(u, st); if (tir) st.kick = Math.max(st.kick, tir);
  const pilote = RTS.pilot === u;
  for (let i = 0; i < st.extras.length; i++) st.extras[i].visible = u.m.visible;
  // Sortie d'usine : le temps passe même hors de la vue (l'unité arrive à sa place à l'heure)
  let ox = 0, oy = 0, oz = 0, es = 1, P = null;
  if (st.sortie && dt > 0){
    const S2 = st.sortie; S2.t += dt; const k = Math.min(1, S2.t / S2.T), e = 1 - Math.pow(1 - k, 3);
    if (S2.mode === 'assemble'){ es = .25 + .75 * e; P = raPart(); if (P && voit && raHasard() < dt * 30) rfxP(P.glow, gp.x + raR(-1, 1), raR(.3, 2), gp.z + raR(-1, 1), raR(-2, 2), raR(1, 3), raR(-2, 2), raR(.2, .4), raR(.4, .8), .1, RV_FUM.feu, RV_FUM.braise, .9, -6); }
    else { const w = 1 - (S2.mode === 'envol' ? k * k * (3 - 2 * k) : e); ox = (S2.x - gp.x) * w; oy = (S2.y - gp.y) * w; oz = (S2.z - gp.z) * w; }
    if (k >= 1){ st.sortie = null; if (!voit) raPose(st, g, 0, 0, 0, 1); }
  }
  if (pilote){ st.jambes = st.torse = g.rotation.y; if (st.tour) st.tourY = g.rotation.y; return; } // repris sans tour sur lui-même
  if (!voit || dt <= 0) return;
  const sc = g.scale.x || 1, cible = raCible(u);
  // Saut à la sélection
  const choisi = RTS.sel.indexOf(u) >= 0; if (choisi && !st.choisi) st.saut = R.choix.t; st.choisi = choisi;
  let hy = 0;
  if (st.saut > 0){ st.saut = Math.max(0, st.saut - dt); const k = 1 - st.saut / R.choix.t; hy = Math.sin(Math.PI * k) * R.choix.saut / sc; u.ring.scale.setScalar(1 + R.choix.anneau * (1 - k)); }
  else if (u.ring.scale.x !== 1) u.ring.scale.set(1, 1, 1);
  // Abîmée : fumée (et un robot boite)
  P = raPart();
  if (P && u.hp < u.maxHp * R.abime.seuil){ st.fumeT -= dt; if (st.fumeT <= 0){ st.fumeT = 1 / R.abime.fumee * (isTouch ? 1.6 : 1); const h = U.big ? 7 : raRobot(u) ? 2.6 * sc : U.kind === 'ground' ? 2.2 : gp.y + .6; rfxP(P.soft, gp.x + raR(-.4, .4), h, gp.z + raR(-.4, .4), RV_REGL.vent.x * .5, raR(1.2, 1.9), RV_REGL.vent.z * .5, raR(1.8, 2.6), .8, 2.6, RV_FUM.noire, RV_FUM.grise, .5, 0, .2); } }
  st.kick *= Math.exp(-dt / (U.big ? R.mech.reculT : u.type === 'tank' ? R.tank.reculT : R.rob.reculT));
  if (st.kick < .002) st.kick = 0;
  if (raRobot(u) || U.big) raMarcheur(u, st, dt, v, dx, dz, cible, hy, ox, oy, oz, es);
  else if (u.type === 'tank') raTank(u, st, dt, v, dx, dz, cible, hy, ox, oy, oz);
  else if (U.kind === 'heli') raHeli(u, st, dt, dx, dz, cible, hy, ox, oy, oz);
  else raPose(st, g, ox, oy + hy, oz, es); // avions : seulement le décollage (ils s'inclinent déjà en virant)
}
// Décalage du monde (sortie d'usine) remis dans le repère de l'objet racine (tourné, et grandi pour les petits robots)
function raPose(st, g, ox, oy, oz, es){
  const vis = st.vis;
  if (ox || oy || oz){ _raQ.copy(g.quaternion).invert(); _raV.set(ox, oy, oz).applyQuaternion(_raQ).divideScalar(g.scale.x || 1); vis.position.copy(_raV); }
  else vis.position.set(0, 0, 0);
  vis.scale.setScalar(es || 1);
}
// Petits robots et Mech de combat : jambes (vis) et torse (u.m) séparés
function raMarcheur(u, st, dt, v, dx, dz, cible, hy, ox, oy, oz, es){
  const g = u.g, gp = g.position, R = RA_REGL, big = !!u.U.big, C = big ? R.mech : R.rob, gy = g.rotation.y;
  const marche = v > .8;
  st.tenir += ((u.hold ? 1 : 0) - st.tenir) * raK(dt, 1 / R.rob.tenir.t);
  let vise = cible ? Math.atan2(cible.x - gp.x, cible.z - gp.z) : null;
  if (cible && Math.hypot(cible.x - gp.x, cible.z - gp.z) > raPortee(u, st) + 6) vise = null;
  // Jambes : dans le sens de la marche (à reculons si le torse regarde derrière) ; à l'arrêt, elles suivent le torse de loin
  if (marche){
    let dir = Math.atan2(dx, dz);
    const ref = vise != null ? vise : gy;
    if (Math.abs(raAng(dir - ref)) > R.rob.arriere) dir += Math.PI;
    st.jambes = raVers(st.jambes, dir, raK(dt, C.jambes));
  } else if (Math.abs(raAng(st.torse - st.jambes)) > C.torseMax * .8) st.jambes = raVers(st.jambes, st.torse, raK(dt, C.jambes * .5));
  // Torse : vers la cible ; sinon dans le sens des jambes ; à l'arrêt sans rien à faire, le regard balaie
  let veut = vise != null ? vise : st.jambes;
  if (vise == null && !marche && !u.hold && u.cmd === 'idle') veut += Math.sin(RA.t * R.rob.balaieV + st.ph) * R.rob.balaie * (big ? .5 : 1);
  st.torse = raVers(st.torse, veut, raK(dt, C.torse));
  const tr = clamp(raAng(st.torse - st.jambes), -C.torseMax, C.torseMax); st.torse = st.jambes + tr;
  // Penche : le corps part en avant au freinage, en arrière en repartant ; boite quand il est très abîmé
  st.penche += (clamp(-st.acc * R.rob.penche, -R.rob.pencheMax, R.rob.pencheMax) - st.penche) * raK(dt, 8);
  const abime = u.hp < u.maxHp * R.abime.seuil;
  const boite = abime && marche ? Math.abs(Math.sin(u.step)) * R.abime.boite : 0;
  const vis = st.vis; raPose(st, g, ox, oy, oz, es); vis.position.y += hy;
  vis.rotation.set(st.penche + st.tenir * R.rob.tenir.penche * .4, raAng(st.jambes - gy), boite * (Math.sin(u.step) > 0 ? 1 : -1));
  // Torse : rotation, recul (le buste part en arrière dans le sens où il regarde)
  const m = u.m, k = st.kick;
  m.rotation.y = tr; m.rotation.x = -k * C.reculA + st.tenir * R.rob.tenir.penche;
  m.position.x = -Math.sin(tr) * k * C.recul; m.position.z = -Math.cos(tr) * k * C.recul;
  // Jambes : écartées pour tenir la position ; celles du Mech de combat marchent (au rythme de ses pas lourds)
  if (u.legs && (st.tenir > 1e-4 || u.legs[1].rotation.z !== 0)){ const e = st.tenir > 1e-4 ? st.tenir * R.rob.tenir.ecart : 0; u.legs[0].rotation.z = -e; u.legs[1].rotation.z = e; }
  if (st.mj){
    const pas = u.step !== st.step; st.step = u.step;
    st.ampl = (st.ampl || 0) + ((pas ? 1 : 0) - (st.ampl || 0)) * raK(dt, pas ? 6 : 4);
    const a = Math.cos(u.step) * R.mech.pas * st.ampl;
    st.mj[0].rotation.x = a; st.mj[1].rotation.x = -a;
  }
}
// Tank : la caisse garde sa route, la tourelle suit la cible
function raTank(u, st, dt, v, dx, dz, cible, hy, ox, oy, oz){
  const g = u.g, gp = g.position, R = RA_REGL.tank, gy = g.rotation.y;
  if (v > 1.5) st.jambes = raVers(st.jambes, Math.atan2(dx, dz), raK(dt, R.caisse));
  const veut = cible && Math.hypot(cible.x - gp.x, cible.z - gp.z) < raPortee(u, st) + 8 ? Math.atan2(cible.x - gp.x, cible.z - gp.z) : st.jambes;
  st.tourY = raVers(st.tourY, veut, raK(dt, R.tourelle));
  const tr = raAng(st.tourY - st.jambes), k = st.kick;
  st.penche += (clamp(-st.acc * R.cabre, -R.cabreMax, R.cabreMax) - st.penche) * raK(dt, 6);
  raPose(st, g, ox, oy, oz, 1); st.vis.position.y += hy;
  st.vis.rotation.set(st.penche - k * R.reculA * Math.cos(tr), raAng(st.jambes - gy), k * R.reculA * Math.sin(tr));
  st.tour.rotation.y = tr; st.tour.position.set(-Math.sin(tr) * k * R.recul, 0, -.1 - Math.cos(tr) * k * R.recul);
}
// Apache : penché dans le sens où il va, roulis en virant, nez vers la cible
function raHeli(u, st, dt, dx, dz, cible, hy, ox, oy, oz){
  const g = u.g, gp = g.position, R = RA_REGL.heli, gy = g.rotation.y;
  const veut = cible && Math.hypot(cible.x - gp.x, cible.z - gp.z) < raPortee(u, st) + 6 ? Math.atan2(cible.x - gp.x, cible.z - gp.z) : gy;
  const avant = st.jambes; st.jambes = raVers(st.jambes, veut, raK(dt, R.tourne));
  const vr = dt > 0 ? raAng(st.jambes - avant) / dt : 0;
  const vx = dt > 0 ? dx / dt : 0, vz = dt > 0 ? dz / dt : 0, fx = Math.sin(st.jambes), fz = Math.cos(st.jambes);
  const vf = vx * fx + vz * fz, vlat = vx * fz - vz * fx;
  st.penche += (clamp(vf * R.penche, -R.pencheMax, R.pencheMax) - st.penche) * raK(dt, 3);
  st.roulis += (clamp(-vr * R.roulis - vlat * R.penche, -R.roulisMax, R.roulisMax) - st.roulis) * raK(dt, 3);
  raPose(st, g, ox, oy, oz, 1); st.vis.position.y += hy;
  st.vis.rotation.set(st.penche - st.kick * .04, raAng(st.jambes - gy), st.roulis);
}

/* ---------- Morts : l'unité bascule, saute ou tombe (fantômes en réserve fixe) ---------- */
function raFantome(){ // le plus libre, sinon le plus vieux
  let f = RA.fantomes[0];
  for (const q of RA.fantomes){ if (!q.on){ f = q; break; } if (q.t / q.T > f.t / f.T) f = q; }
  return f;
}
function raMort(u, st){
  const f = raFantome(); if (!f) return;
  const g = u.g, gp = g.position, U = u.U;
  f.m.geometry = st ? st.geo0 : u.m.geometry; f.m.position.copy(gp); f.m.scale.copy(g.scale);
  f.m.rotation.set(0, st ? st.torse : g.rotation.y, U.kind === 'air' ? g.rotation.z : 0, 'YXZ');
  const M = RA_REGL.mort;
  Object.assign(f, { on:true, t:0, kind:U.kind !== 'ground' ? 'air' : raRobot(u) || U.big ? 'robot' : 'tank', T:U.kind !== 'ground' ? M.air : raRobot(u) ? M.robot : U.big ? M.robot * 1.5 : M.tank,
    y0:gp.y, yaw:f.m.rotation.y, sens:raHasard() < .5 ? -1 : 1, v:U.kind === 'air' ? Math.min(18, U.speed * .6) : 0, spin:U.kind === 'heli' ? 7 : 0, fumT:0 });
  f.m.visible = true;
}
function raFantomes(dt){
  const P = raPart(), ombre = typeof rstActif === 'function' && rstActif();
  for (const f of RA.fantomes){
    if (!f.on) continue;
    f.t += dt; const k = Math.min(1, f.t / f.T), m = f.m;
    m.castShadow = ombre;
    if (f.kind === 'robot'){ // il bascule en arrière, puis s'enfonce
      m.rotation.x = -Math.min(1, k * 1.6) * 1.45 * (1 - Math.max(0, k - .8) * .2); m.rotation.z = f.sens * Math.min(1, k * 1.6) * .25;
      m.position.y = f.y0 - Math.max(0, k - .6) / .4 * 1.2;
    } else if (f.kind === 'tank'){ // soufflé vers le haut, il retombe et s'affaisse de côté
      m.position.y = f.y0 + (k < .3 ? Math.sin(Math.PI * k / .3) * .9 : 0) - Math.max(0, k - .5) / .5 * .9;
      m.rotation.z = f.sens * Math.min(.22, k * .6); m.rotation.x = -Math.sin(Math.PI * Math.min(1, k / .3)) * .15;
    } else if (f.kind === 'bat' || f.kind === 'tete'){ if (typeof raFantomeBat === 'function') raFantomeBat(f, dt, k, P); }
    else { // en vrille jusqu'au sol, en avançant encore un peu
      m.position.y = f.y0 * (1 - k * k); f.yaw += f.spin * dt; m.rotation.y = f.yaw;
      m.position.x += Math.sin(f.yaw) * f.v * dt * (1 - k); m.position.z += Math.cos(f.yaw) * f.v * dt * (1 - k);
      m.rotation.x = Math.min(.9, k * 1.4); m.rotation.z += f.sens * dt * (f.spin ? .3 : 2.2);
      if (P && dt > 0){ f.fumT -= dt; if (f.fumT <= 0){ f.fumT = isTouch ? .08 : .045; rfxP(P.soft, m.position.x, m.position.y, m.position.z, 0, raR(.3, .8), 0, raR(1.6, 2.4), 1, 3, RV_FUM.noire, RV_FUM.grise, .6, 0, .3); } }
    }
    if (k >= 1){ f.on = false; m.visible = false; m.rotation.set(0, 0, 0); }
  }
}

/* ---------- Création, partie neuve, départ ---------- */
function raCreer(){
  RA.root = new THREE.Group(); RA.root.name = 'raRoot'; scene.add(RA.root);
  const vide = new THREE.BufferGeometry(); RA.geo.vide = vide;
  RA.fantomes = [];
  for (let i = 0; i < RA_REGL.mort.max; i++){ const m = new THREE.Mesh(vide, rtsMat); m.visible = false; m.frustumCulled = false; RA.root.add(m); RA.fantomes.push({ m, on:false, t:0, T:1 }); }
  if (typeof raBatCreer === 'function') raBatCreer();
  RA.pret = true;
}
// Nouvelle partie (ou nouvelle vallée) : ce qui est déjà là au départ n'a ni sortie d'usine ni construction
function raNouvelle(){
  RA.liste.clear(); RA.vus = new WeakSet(); RA.morts = new WeakSet(); RA.depart = true;
  RA.fantomes.forEach(f => { f.on = false; f.m.visible = false; f.m.geometry = RA.geo.vide; });
  if (typeof raBatNouvelle === 'function') raBatNouvelle();
}
function raQuitter(){
  RA.actif = false; RA.monde = null;
  RA.liste.forEach(u => raDetacher(u, RA.u.get(u)));
  RA.liste.clear();
  if (typeof raBatQuitter === 'function') raBatQuitter();
  if (!RA.pret) return;
  RA.fantomes.forEach(f => { f.on = false; f.m.visible = false; f.m.geometry = RA.geo.vide; });
  RA.root.visible = false;
  if (typeof rtsMark === 'object') rtsMark.scale.set(1, 1, 1);
  // Mémoire graphique rendue (les géométries seront refaites à la prochaine partie, dans raCalme)
  Object.keys(RA.geo).forEach(k => { if (k !== 'vide') { RA.geo[k].dispose(); delete RA.geo[k]; } });
}
// Interrupteur coupé en pleine partie : tout revient comme avant (pièces rendues à l'objet racine, géométries d'origine)
function raCouper(){ if (RA.actif) raQuitter(); }

/* ---------- Chaque image ---------- */
function raVoir(){ // cadre de la caméra et centre de la vue
  camera.updateMatrixWorld(); RA_PM.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse); RA_FR.setFromProjectionMatrix(RA_PM);
  const c = RTS.pilot ? camera.position : _raV.set(RTS.cam.x, 0, RTS.cam.z);
  RA.cx = c.x; RA.cz = c.z; RA.vue = RTS.pilot ? RA_REGL.vue : Math.max(RA_REGL.vue, (RTS.cam.h || 56) * 2.4);
}
function raVisible(x, y, z, r){
  const dx = x - RA.cx, dz = z - RA.cz; if (dx * dx + dz * dz > RA.vue * RA.vue) return false;
  RA_SPH.center.set(x, y, z); RA_SPH.radius = r || RA_REGL.rayon; return RA_FR.intersectsSphere(RA_SPH);
}
function raImage(dt){
  const t0 = performance.now();
  if (!RA_REGL.on || !RTS.on || !world){ if (RA.actif) raQuitter(); return; }
  if (!RA.pret) raCalme(raCreer);
  if (!RA.actif){ RA.actif = true; RA.root.visible = true; }
  if (RA.monde !== world){ RA.monde = world; raNouvelle(); }
  const fige = RTS.paused || state !== 'rts';
  dt = fige ? 0 : Math.min(dt || 0, .1);
  RA.t += dt;
  raVoir();
  const depart = RA.depart; RA.depart = false;
  for (const u of RTS.units){
    if (u.dead){
      if (!RA.morts.has(u)){ RA.morts.add(u); const st = RA.u.get(u); if (RA.pret && !fige) raMort(u, st); RA.u.delete(u); RA.liste.delete(u); }
      continue;
    }
    let st = RA.u.get(u);
    if (!st){
      st = raCalme(() => raAttacher(u));
      if (!depart && !RA.vus.has(u)) raSortie(u, st);
      RA.vus.add(u);
    }
    raUnite(u, st, dt, raVisible(u.g.position.x, u.g.position.y, u.g.position.z, u.U.kind === 'air' ? 12 : u.U.big ? 8 : RA_REGL.rayon));
  }
  if (typeof raBatiments === 'function') raBatiments(dt, depart);
  raFantomes(dt);
  // Marqueur d'ordre (js/44-rts-interface.js) : il se resserre sur le point en s'effaçant
  if (typeof rtsMark === 'object' && typeof rtsMarkT === 'number'){ const k = rtsMarkT > 0 ? rtsMarkT / .6 : 0; rtsMark.scale.setScalar(1 + (RA_REGL.marque.grand - 1) * k * k); }
  const ms = performance.now() - t0; RA.temps.ms += ms; RA.temps.n++; if (ms > RA.temps.max) RA.temps.max = ms;
}
Jeu.on('image', dt => { try { raImage(dt); } catch (e) { errNote(e); } });

// Accès pour les tests automatiques
window.__rtsAnim = {
  RA, RA_REGL, raImage, raQuitter, raCouper, raAng,
  etat: u => RA.u.get(u) || null,
  compte(){ let f = 0; RA.fantomes.forEach(q => { if (q.on) f++; }); return { unites:RA.liste.size, fantomes:f, actif:RA.actif, geos:Object.keys(RA.geo).length }; },
  temps(){ const T = RA.temps; return { moy:T.n ? T.ms / T.n : 0, max:T.max, n:T.n }; },
  tempsZero(){ RA.temps.ms = 0; RA.temps.n = 0; RA.temps.max = 0; }
};
