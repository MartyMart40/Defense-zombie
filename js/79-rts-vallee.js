'use strict';
/* ================= RTS : une vallée vivante (dossier 126), seulement visuel ================= */
// La vallée du RTS (js/41-rts.js : rtsDesert, rtsChunk) devient vivante et garde les marques de la bataille.
//   1. Décor fixe, posé avec chaque tronçon de 100 m : rochers et éboulis au pied des montagnes, buissons secs, cactus,
//      ossements, épaves d'autos au bord de la vieille route, poteaux électriques (debout, penchés ou tombés) et leurs fils,
//      panneaux. Ajouté dans la géométrie du tronçon lui-même (même matériau rtsMat) : aucun appel de dessin de plus,
//      le style Amélioré (js/72) l'habille en roche et lui donne des ombres. Hors de la base (80 m) et loin de la route,
//      sans collision. Placé par un générateur semé sur la vallée et le tronçon : chaque vallée a son décor, toujours
//      le même (une partie reprise retrouve le sien).
//   2. Traces de la bataille, qui restent un temps : cratères aux explosions (obus, roquettes, mortier, Hellfire, bombes),
//      flaques d'acide des crachats, traces de chenilles derrière les tanks, gravats là où un bâtiment est tombé, sol brûlé
//      des nids détruits, carcasses fumantes des unités détruites (qui s'enfoncent à la fin). Décalques au sol dans une
//      réserve de taille fixe qui recycle les plus vieux (un appel de dessin), carcasses en instances (un appel).
//   3. Vie : fumée des bâtiments abîmés selon leur vie (grise sous 60 %, noire et des flammes sous 25 %), poussière des
//      véhicules et du vent, tourbillons de poussière au loin, lueur qui bat sur les nids et la Ruche, gyrophare et drapeau
//      au QG, charognards qui tournent au-dessus des nids. Deux nuages de points (machinerie de js/55-rts-effets.js) et un
//      petit maillage animé (drapeau, oiseaux).
// Coût : 5 appels de dessin au plus (6 en Amélioré : l'ombre des carcasses), plafonds plus bas au cell.
// Hasard : jamais Math.random (le simulateur et les tests à graine gardent la même partie). Three.js tire 4 nombres de
// Math.random pour chaque objet créé : les objets sont créés une fois, dans rvCalme, avec un générateur à part.
// Branchements : rtsChunk (js/41-rts.js) appelle rvChunk ; rfxBoom (js/55-rts-effets.js) appelle rvBoom. Le reste est lu
// à chaque image (unités, bâtiments, nids), par Jeu.on('image'). Réglages : RV_REGL (on : false coupe tout).

const RV_REGL = {
  on: true,
  // Décor fixe, par tronçon de 100 m : nombre d'essais (ceux qui tombent sur la route ou dans la base sont sautés)
  // (moins au cell : le décor y coûtait 20 % de triangles en plus)
  decor: { base:80, route:7, rochers:isTouch ? 26 : 32, buissons:isTouch ? 20 : 26, cactus:isTouch ? 4 : 6, os:isTouch ? 3 : 5, epaves:2, poteaux:26, poteauxCote:11, panneaux:1 },
  // Traces au sol : réserve des décalques (traces, chenilles), vie en secondes
  traces: { cap:isTouch ? 40 : 80, chenilles:isTouch ? 36 : 72, pas:1.7,
    vie:{ cratere:45, acide:20, gravats:90, nid:120, chenille:24, huile:60 } },
  carcasses: { cap:isTouch ? 10 : 20, vie:70, fume:25 },
  points: { fumee:isTouch ? 150 : 300, lueur:isTouch ? 90 : 180 },
  // Bâtiments : fumée sous ce taux de vie, flammes sous celui-là
  bat: { fumee:.6, feu:.25 },
  vent: { x:.9, z:-.3, pas:isTouch ? .3 : .14 },
  tourbillon: { tous:30, vie:12, debit:isTouch ? 24 : 50 },
  oiseaux: isTouch ? 6 : 12,
  vue: 170  // distance au centre de la vue au-delà de laquelle les nids et les bâtiments n'émettent rien
};
const RV = { pret:false, actif:false, monde:null, t:0, root:null, dec:null, carc:null, soft:null, glow:null, anim:null, tex:null,
  traces:[], chen:[], ti:0, ci:0, carcs:[], morts:new WeakSet(), suivi:new Map(), vents:0, tour:null, tourT:8, batAcc:new Map(), dernier:null, sig:{}, compte:{ chunks:0, objets:0 } };
const _rvV = new THREE.Vector3(), _rvO = new THREE.Object3D(), _rvC = new THREE.Color();

/* ---------- Hasard à part ---------- */
function rvGen(seed){ let s = Math.abs(Math.floor(seed)) % 2147483646 + 1; return () => { s = s * 16807 % 2147483647; return (s - 1) / 2147483646; }; }
const rvSeed = k => (RTS.vallee || 1) * 7919 + (k + 3) * 104729;
let rvS = 4711;
const rvHasard = () => { rvS = rvS * 16807 % 2147483647; return (rvS - 1) / 2147483646; };
const rvR = (a, b) => a + (b - a) * rvHasard();
// Création d'objets Three.js sans toucher au hasard du jeu (uuid tirés d'un générateur à part)
function rvCalme(fn){ const M = Math.random; Math.random = rvHasard; try { return fn(); } finally { Math.random = M; } }

// Hauteur du sable (même formule que rtsChunk) ; les décalques suivent le sol, la dalle et la route
function rvSolY(x, z){
  const f = clamp((Math.hypot(x, z) - RTS_FLAT_R) / 12, 0, 1);
  return f ? (Math.sin(x * .05) * Math.cos(z * .043) * .12 + Math.sin((x + z) * .11) * .08) * f : -.03;
}
function rvY(x, z){
  let y = rvSolY(x, z) + .05;
  if (Math.hypot(x, z) < (RTS.baseR || 30) + 1.5) y = Math.max(y, .075); // sur la dalle (y = .04)
  if (rtsRoadDist(x, z) < 4.8) y = Math.max(y, .12);                    // sur la route (dessus des dalles : .09)
  return y;
}

/* ---------- 1. Décor fixe : ajouté à la géométrie du tronçon (appelé par rtsChunk) ---------- */
const RV_ROC = [0x8a6a4a, 0x7a5a3e, 0x9a7a56, 0x8f7a62, 0x7d6a55], RV_BUIS = [0x6e6440, 0x7a6a3e, 0x5e5a38, 0x857650], RV_CACT = [0x5a6a42, 0x637048, 0x56603e];
const RV_AUTO = [0x7a4a2e, 0x6a5a4a, 0x5a6470, 0x8a7a5a, 0x6a3a2a], RV_BOIS = 0x5a4632, RV_OS = 0xd6ccb4, RV_FIL = 0x2a2826;
function rvRocher(b, x, z, s, R){
  const y = rvSolY(x, z), n = 1 + Math.floor(R() * 3);
  for (let i = 0; i < n; i++){
    const k = i ? .45 + R() * .35 : 1, w = s * k * (.9 + R() * .8), h = s * k * (.45 + R() * .5), d = s * k * (.8 + R() * .7);
    vmBox(b, w, h, d, RV_ROC[Math.floor(R() * RV_ROC.length)], x + (i ? (R() - .5) * s * 1.6 : 0), y + h * .32, z + (i ? (R() - .5) * s * 1.6 : 0),
      (R() - .5) * .5, R() * 3.1, (R() - .5) * .5, Math.min(w, h) * .28);
  }
}
function rvBuisson(b, x, z, s, R){
  const y = rvSolY(x, z) - .05, col = RV_BUIS[Math.floor(R() * RV_BUIS.length)], n = 3 + Math.floor(R() * (isTouch ? 2 : 3));
  vmPush(b, x, y, z, 0, R() * 6.3, 0);
  for (let i = 0; i < n; i++){
    const a = i / n * 6.283 + R() * .6, t = .35 + R() * .5, L = s * (.6 + R() * .6), ox = Math.cos(a) * .12, oz = Math.sin(a) * .12;
    vmPush(b, ox, 0, oz, 0, -a + Math.PI / 2, 0);
    vmCyl(b, .025, L, col, 0, Math.cos(t) * L / 2, Math.sin(t) * L / 2, t - Math.PI / 2, 0, 0, 4, 3.5); // pointe fine en haut, pied plus large
    vmPop(b);
  }
  vmPop(b);
}
function rvCactus(b, x, z, s, R){
  const y = rvSolY(x, z) - .1, col = RV_CACT[Math.floor(R() * RV_CACT.length)], H = 2.2 * s + R() * s;
  vmPush(b, x, y, z, 0, R() * 6.3, 0);
  vmCyl(b, .2 * s, H, col, 0, H / 2, 0, Math.PI / 2, 0, 0, 7, .85);
  for (const sd of [-1, 1]){
    if (R() < .3) continue;
    const h0 = H * (.35 + R() * .25), L = .55 * s, h1 = .7 * s + R() * .6 * s;
    vmCyl(b, .13 * s, L, col, sd * L / 2, h0, 0, 0, Math.PI / 2, 0, 6);
    vmCyl(b, .13 * s, h1, col, sd * L, h0 + h1 / 2 - .06, 0, Math.PI / 2, 0, 0, 6);
  }
  vmPop(b);
}
function rvOs(b, x, z, R){
  const y = rvSolY(x, z);
  vmPush(b, x, y, z, 0, R() * 6.3, 0);
  vmBox(b, .32, .26, .36, RV_OS, 0, .1, 0, (R() - .5) * .4, 0, (R() - .5) * .6, .08);  // crâne
  vmBox(b, .07, .06, .07, 0x3a342c, -.07, .18, .18, 0, 0, 0, 0); vmBox(b, .07, .06, .07, 0x3a342c, .07, .18, .18, 0, 0, 0, 0);
  for (let i = 0; i < 3 + Math.floor(R() * 3); i++) vmCyl(b, .035, .55 + R() * .5, RV_OS, (R() - .5) * 1.6, .03, (R() - .5) * 1.6, 0, R() * 3.1, 0, 4);
  vmPop(b);
}
function rvEpave(b, x, z, R){
  const y = rvSolY(x, z), col = RV_AUTO[Math.floor(R() * RV_AUTO.length)], q = R(), rz = q < .2 ? Math.PI : q < .35 ? Math.PI / 2 : (R() - .5) * .12;
  const hb = rz === Math.PI ? 1.25 : rz === Math.PI / 2 ? .9 : .55;
  vmPush(b, x, y + hb, z, 0, R() * 6.3, rz);
  vmBox(b, 1.8, .6, 4.1, col, 0, 0, 0, 0, 0, 0, .12);                          // caisse
  vmBox(b, 1.55, .55, 2, col, 0, .55, -.2, 0, 0, 0, .1);                         // habitacle
  vmBox(b, 1.4, .42, .06, 0x24282a, 0, .58, .82, -.5, 0, 0, 0);                 // pare-brise vide
  vmBox(b, 1.86, .18, .5, 0x2a2622, 0, -.32, 1.6, 0, 0, 0, .03); vmBox(b, 1.86, .18, .5, 0x2a2622, 0, -.32, -1.6, 0, 0, 0, .03); // pare-chocs
  if (R() < .5) vmCyl(b, .34, .24, 0x262422, -1, -.35, 1.25, 0, Math.PI / 2, 0, 8);          // une roue qui reste
  vmPop(b);
}
function rvPanneau(b, x, z, R){
  const y = rvSolY(x, z) - .1, lean = R() < .4 ? (R() - .5) * .7 : 0, c = R() < .5 ? 0x4a6a52 : 0x8a7a4a;
  vmPush(b, x, y, z, 0, R() * 6.3, 0); vmPush(b, 0, 0, 0, lean, 0, 0);
  vmBox(b, .12, 2.6, .12, 0x6a6a66, 0, 1.3, 0, 0, 0, 0, 0);
  vmBox(b, 1.7, 1, .06, c, 0, 2.5, .08, 0, 0, 0, 0);
  vmBox(b, 1.3, .08, .02, 0xd8d4c4, 0, 2.7, .12, 0, 0, 0, 0); vmBox(b, 1, .08, .02, 0xd8d4c4, -.1, 2.42, .12, 0, 0, 0, 0); // lettres effacées
  for (let i = 0; i < 4; i++) vmBox(b, .07, .07, .02, 0x1e1c1a, (R() - .5) * 1.4, 2.5 + (R() - .5) * .8, .12, 0, 0, 0, 0); // trous de balles
  vmPop(b); vmPop(b);
}
// Poteaux électriques le long de la route, à pas régulier sur toute la longueur (les tronçons se raccordent) ; chacun a son
// état (debout, penché, tombé) tiré de son numéro ; deux fils vont au suivant, qui pendent jusqu'au sol si l'un est tombé.
function rvPoteau(j){
  const D = RV_REGL.decor, pas = D.poteaux;
  let s = 0;
  for (let i = 0; i < RV_RT.length - 1; i++){
    const A = RV_RT[i], B = RV_RT[i + 1], dx = B[0] - A[0], dz = B[1] - A[1], L = Math.hypot(dx, dz);
    if (j * pas < s + L){
      const t = (j * pas - s) / L, x = A[0] + dx * t - dz / L * D.poteauxCote, z = A[1] + dz * t + dx / L * D.poteauxCote, R = rvGen(rvSeed(1000 + j)), q = R();
      const lean = q < .58 ? (R() - .5) * .08 : q < .82 ? .25 + R() * .35 : 1.42 + R() * .1, yaw = R() * 6.3;
      return { x, z, y:rvSolY(x, z) - .15, lean, yaw, R };
    }
    s += L;
  }
  return null;
}
// La route telle que la sauvegarde la garde (au décimètre, js/45) : une partie reprise retrouve exactement le même décor
let RV_RT = [];
function rvRouteDist(x, z){
  let best = 1e9;
  for (let i = 0; i < RV_RT.length - 1; i++){
    const A = RV_RT[i], B = RV_RT[i + 1], dx = B[0] - A[0], dz = B[1] - A[1], L2 = dx * dx + dz * dz || 1;
    const t = clamp(((x - A[0]) * dx + (z - A[1]) * dz) / L2, 0, 1), d = Math.hypot(A[0] + dx * t - x, A[1] + dz * t - z);
    if (d < best) best = d;
  }
  return best;
}
// x de la route à la hauteur z, sans la prolonger (rtsRoadX la prolonge avec Math.random)
function rvRouteX(z){
  for (let i = 0; i < RV_RT.length - 1; i++){ const A = RV_RT[i], B = RV_RT[i + 1]; if (z <= A[1] && z >= B[1]) return A[0] + (B[0] - A[0]) * (A[1] - z) / (A[1] - B[1]); }
  return RV_RT[RV_RT.length - 1][0];
}
function rvAncre(P, lx, ly){ // point (lx, ly) du poteau, penché puis tourné
  const y = ly * Math.cos(P.lean), zl = ly * Math.sin(P.lean), c = Math.cos(P.yaw), s = Math.sin(P.yaw);
  return [P.x + lx * c + zl * s, P.y + y, P.z - lx * s + zl * c];
}
function rvPoteaux(b, z0, z1){
  const D = RV_REGL.decor;
  let n = 0;
  for (let j = 1; j < 400; j++){
    const P = rvPoteau(j); if (!P) break;
    if (P.z <= z0 - 60) break;
    if (P.z > z1 || P.z <= z0 || Math.hypot(P.x, P.z) < D.base || Math.abs(P.x) > rtsValleyX(P.z) - 2) continue;
    vmPush(b, P.x, P.y, P.z, 0, P.yaw, 0); vmPush(b, 0, 0, 0, P.lean, 0, 0);
    vmCyl(b, .13, 6.6, RV_BOIS, 0, 3.3, 0, Math.PI / 2, 0, 0, 6, .75);
    vmBox(b, 1.8, .14, .14, RV_BOIS, 0, 6.05, 0, 0, 0, 0, 0);
    vmBox(b, .1, .16, .1, 0xc8c4b8, -.75, 6.2, 0, 0, 0, 0, 0); vmBox(b, .1, .16, .1, 0xc8c4b8, .75, 6.2, 0, 0, 0, 0, 0);
    vmPop(b); vmPop(b);
    const Q = rvPoteau(j + 1);
    if (Q && Math.hypot(Q.x, Q.z) >= D.base) for (const lx of [-.75, .75]){
      const a = rvAncre(P, lx, 6.25), c = rvAncre(Q, lx, 6.25), tombe = P.lean > 1 || Q.lean > 1;
      const mx = (a[0] + c[0]) / 2, mz = (a[2] + c[2]) / 2, my = Math.max(rvSolY(mx, mz) + .05, (a[1] + c[1]) / 2 - (tombe ? 2.2 : .8));
      vmCylAB(b, a, [mx, my, mz], .025, RV_FIL, 3); vmCylAB(b, [mx, my, mz], c, .025, RV_FIL, 3);
    }
    if (D.panneaux && j % 5 === 2){ const x = 2 * rvRouteX(P.z) - P.x; if (Math.hypot(x, P.z) > D.base && Math.abs(x) < rtsValleyX(P.z) - 3 && rvRouteDist(x, P.z) > 5) rvPanneau(b, x, P.z, P.R); } // de l'autre côté de la route
    n++;
  }
  return n;
}
// Appelé par rtsChunk (js/41-rts.js) avant de créer le maillage du tronçon k (de z0 à z1) : tout va dans le même maillage.
function rvChunk(b, k, z0, z1){
  if (!RV_REGL.on || k < 0) return 0;
  const D = RV_REGL.decor, R = rvGen(rvSeed(k)), r = (a, c) => a + (c - a) * R(), t0 = b.p.length, pos = [];
  RV_RT = RTS_ROAD.map(p => [Math.round(p[0] * 10) / 10, Math.round(p[1] * 10) / 10]);
  // Les ruines ne comptent pas (tirées au hasard du jeu, pas gardées dans la sauvegarde) : le décor ne dépend que de la vallée,
  // du tronçon et de la route (gardée) ; une partie reprise retrouve exactement le même décor
  const libre = (x, z, marge) => Math.hypot(x, z) > D.base && z > z0 && z <= z1 && rvRouteDist(x, z) > marge;
  const coin = (eb, bord) => { const z = r(z0, z1), m = rtsValleyX(z), x = eb ? (R() < .5 ? -1 : 1) * r(m - 6, m + 1) : r(-m + bord, m - bord); return [x, z]; };
  for (let i = 0; i < D.rochers; i++){ const eb = R() < .45, p = coin(eb, 3), s = eb ? r(.8, 1.9) : r(.35, 1.1); if (libre(p[0], p[1], D.route)){ rvRocher(b, p[0], p[1], s, R); pos.push(p); } }
  for (let i = 0; i < D.buissons; i++){ const p = coin(R() < .15, 3), s = r(.7, 1.4); if (libre(p[0], p[1], D.route - 1)){ rvBuisson(b, p[0], p[1], s, R); pos.push(p); } }
  for (let i = 0; i < D.cactus; i++){ const p = coin(false, 6), s = r(.8, 1.15); if (libre(p[0], p[1], D.route + 3)){ rvCactus(b, p[0], p[1], s, R); pos.push(p); } }
  for (let i = 0; i < D.os; i++){ const p = coin(false, 8); if (libre(p[0], p[1], D.route)){ rvOs(b, p[0], p[1], R); pos.push(p); } }
  // Épaves d'autos au bord de la route
  for (let i = 0; i < D.epaves; i++){
    const z = r(z0 + 8, z1 - 8), rx = rvRouteX(z), sd = R() < .5 ? -1 : 1, x = rx + sd * r(6.5, 10);
    if (Math.hypot(x, z) > D.base && rvRouteDist(x, z) > 5.5 && Math.abs(x) < rtsValleyX(z) - 4){ rvEpave(b, x, z, R); pos.push([x, z]); }
  }
  const np = rvPoteaux(b, z0, z1);
  const tri = (b.p.length - t0) / 9;
  RV.dernier = { k, pos, poteaux:np, tri };
  RV.sig[k] = pos.reduce((a, p) => a + Math.round(p[0] * 31 + p[1] * 17), 0) + ':' + tri;
  RV.compte.chunks++; RV.compte.objets += pos.length + np;
  return pos.length + np;
}

/* ---------- Création des objets (une fois, sans toucher au hasard du jeu) ---------- */
// Atlas des décalques : 4 x 2 cases de 128 px. 0 cratère, 1 brûlé, 2 acide, 3 chenilles, 4 gravats, 5 huile
const RV_CASE = { cratere:0, brule:1, acide:2, chenille:3, gravats:4, huile:5 };
function rvAtlas(){
  const R = rvGen(2626), r = (a, b) => a + (b - a) * R();
  return canvasTex(512, 256, g => {
    const cel = (i, f) => { g.save(); g.translate((i % 4) * 128 + 64, Math.floor(i / 4) * 128 + 64); f(); g.restore(); };
    const rond = (x, y, rr, c) => { g.fillStyle = c; g.beginPath(); g.arc(x, y, rr, 0, 6.3); g.fill(); };
    const halo = (r0, r1, c0, c1) => { const d = g.createRadialGradient(0, 0, r0, 0, 0, r1); d.addColorStop(0, c0); d.addColorStop(1, c1); g.fillStyle = d; g.beginPath(); g.arc(0, 0, r1, 0, 6.3); g.fill(); };
    const tache = (n, rmin, rmax, dmax, c) => { for (let i = 0; i < n; i++){ const a = R() * 6.3, d = R() * dmax; rond(Math.cos(a) * d, Math.sin(a) * d, r(rmin, rmax), c); } };
    cel(0, () => { // cratère : suie autour, bourrelet de terre, fond sombre, mottes
      halo(20, 60, 'rgba(25,18,12,.48)', 'rgba(25,18,12,0)');
      for (let i = 0; i < 26; i++){ const a = R() * 6.3, L = r(34, 60); g.strokeStyle = 'rgba(20,14,10,.28)'; g.lineWidth = r(2, 4); g.beginPath(); g.moveTo(Math.cos(a) * 22, Math.sin(a) * 22); g.lineTo(Math.cos(a) * L, Math.sin(a) * L); g.stroke(); }
      halo(18, 34, 'rgba(140,110,76,.85)', 'rgba(140,110,76,0)');
      halo(0, 26, 'rgba(32,24,17,.9)', 'rgba(56,43,30,.78)');
      halo(0, 12, 'rgba(14,10,8,.95)', 'rgba(14,10,8,0)');
      for (let i = 0; i < 40; i++){ const a = R() * 6.3, d = r(22, 48); rond(Math.cos(a) * d, Math.sin(a) * d, r(1.2, 3.5), R() < .5 ? 'rgba(60,44,30,.9)' : 'rgba(165,135,95,.85)'); }
    });
    cel(1, () => { // brûlé : suie irrégulière, traînées
      halo(0, 56, 'rgba(12,10,8,.7)', 'rgba(12,10,8,0)');
      tache(18, 8, 18, 36, 'rgba(10,8,6,.28)');
      for (let i = 0; i < 20; i++){ const a = R() * 6.3, L = r(30, 60); g.strokeStyle = 'rgba(8,6,5,.3)'; g.lineWidth = r(2, 6); g.beginPath(); g.moveTo(0, 0); g.lineTo(Math.cos(a) * L, Math.sin(a) * L); g.stroke(); }
    });
    cel(2, () => { // flaque d'acide : bord sombre, vert vif au milieu, reflets, bulles
      tache(10, 14, 24, 26, 'rgba(50,95,15,.85)');
      tache(10, 10, 19, 22, 'rgba(118,196,38,.9)');
      tache(6, 4, 9, 18, 'rgba(205,250,120,.55)');
      for (let i = 0; i < 9; i++){ const a = R() * 6.3, d = r(4, 28); g.strokeStyle = 'rgba(225,255,170,.7)'; g.lineWidth = 1.4; g.beginPath(); g.arc(Math.cos(a) * d, Math.sin(a) * d, r(1.5, 4), 0, 6.3); g.stroke(); }
      halo(30, 58, 'rgba(40,60,15,.35)', 'rgba(40,60,15,0)');
    });
    cel(3, () => { // chenilles : deux bandes avec les patins, qui se raccordent en longueur
      for (const cx of [-52, 52]){
        g.fillStyle = 'rgba(48,36,24,.42)'; g.fillRect(cx - 12, -64, 24, 128);
        g.fillStyle = 'rgba(30,22,14,.55)'; for (let y = -64; y < 64; y += 8) g.fillRect(cx - 12, y, 24, 3);
        g.fillStyle = 'rgba(190,160,120,.25)'; g.fillRect(cx - 13, -64, 2, 128); g.fillRect(cx + 11, -64, 2, 128);
      }
    });
    cel(4, () => { // gravats : poussière de béton, blocs, fers
      halo(10, 60, 'rgba(120,115,105,.7)', 'rgba(120,115,105,0)');
      for (let i = 0; i < 60; i++){
        const a = R() * 6.3, d = R() * R() * 50, s = r(2, 9), x = Math.cos(a) * d, y = Math.sin(a) * d, ro = R() * 3;
        g.save(); g.translate(x, y); g.rotate(ro); g.fillStyle = 'rgba(40,36,32,.5)'; g.fillRect(-s / 2 + 1.5, -s / 3 + 1.5, s, s * .66);
        const t = 110 + R() * 70 | 0; g.fillStyle = 'rgb(' + t + ',' + (t - 4) + ',' + (t - 12) + ')'; g.fillRect(-s / 2, -s / 3, s, s * .66); g.restore();
      }
      for (let i = 0; i < 8; i++){ const a = R() * 6.3, d = r(5, 40); g.strokeStyle = 'rgba(70,45,30,.8)'; g.lineWidth = 1.3; g.beginPath(); g.moveTo(Math.cos(a) * d, Math.sin(a) * d); g.lineTo(Math.cos(a) * d + r(-12, 12), Math.sin(a) * d + r(-12, 12)); g.stroke(); }
    });
    cel(5, () => { // huile : tache sombre et luisante sous une carcasse
      tache(9, 12, 26, 26, 'rgba(14,12,10,.55)');
      halo(0, 50, 'rgba(10,8,6,.5)', 'rgba(10,8,6,0)');
      tache(5, 3, 8, 22, 'rgba(70,60,80,.25)');
    });
  });
}
// Tas de débris : carcasse d'unité (teinte sombre) ou gravats d'un bâtiment (teinte béton, plus large)
function rvTasGeo(){
  const b = vmNew(), c = 0x6e6a62, d = 0x4a4642;
  vmBox(b, 2.6, .8, 4.2, c, 0, .35, 0, .06, 0, -.08, .15);
  vmBox(b, 1.6, .6, 1.8, d, .2, 1, -.3, -.15, .4, .2, .1);
  vmCyl(b, .12, 2.6, d, .4, 1.15, 1.2, .3, .5, 0, 6);
  vmBox(b, 1.2, .14, 2.2, c, -1.5, .5, .8, 0, .3, .9, 0);
  vmBox(b, .9, .5, .9, d, 1.5, .2, -1.6, .3, .7, .2, .1);
  vmBox(b, .8, .3, 1.1, c, -1.2, .15, -1.7, 0, 1.1, .1, .08);
  return vmGeo(b);
}
function rvCreer(){
  const T = RV_REGL.traces, N = T.cap + T.chenilles;
  RV.root = new THREE.Group(); RV.root.visible = false; scene.add(RV.root);
  RV.tex = rvAtlas();
  // Décalques : N quadrilatères dans un seul maillage (position et opacité changent ; l'opacité par sommet)
  const geo = new THREE.BufferGeometry(), idx = [];
  for (let i = 0; i < N; i++){ const o = i * 4; idx.push(o, o + 2, o + 1, o, o + 3, o + 2); }
  const nor = new Float32Array(N * 12); for (let i = 0; i < N * 4; i++) nor[i * 3 + 1] = 1;
  geo.setIndex(idx);
  geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(N * 12), 3).setUsage(THREE.DynamicDrawUsage));
  geo.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  geo.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(N * 8), 2).setUsage(THREE.DynamicDrawUsage));
  geo.setAttribute('aA', new THREE.BufferAttribute(new Float32Array(N * 4), 1).setUsage(THREE.DynamicDrawUsage));
  const mat = new THREE.MeshLambertMaterial({ map:RV.tex, transparent:true, depthWrite:false, polygonOffset:true, polygonOffsetFactor:-3, polygonOffsetUnits:-3 });
  mat.onBeforeCompile = sh => {
    sh.vertexShader = 'attribute float aA; varying float vAA;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n  vAA = aA;');
    sh.fragmentShader = 'varying float vAA;\n' + sh.fragmentShader.replace('#include <map_fragment>', '#include <map_fragment>\n  diffuseColor.a *= vAA;');
  };
  mat.customProgramCacheKey = () => 'rv-trace';
  RV.dec = new THREE.Mesh(geo, mat); RV.dec.frustumCulled = false; RV.dec.renderOrder = 1; RV.dec.receiveShadow = true; RV.root.add(RV.dec);
  RV.traces = []; for (let i = 0; i < T.cap; i++) RV.traces.push({ i, vie:0, max:1, x:0, z:0, r:1, l:1, rot:0, c:0, sale:false });
  RV.chen = []; for (let i = 0; i < T.chenilles; i++) RV.chen.push({ i:T.cap + i, vie:0, max:1, x:0, z:0, r:1, l:1, rot:0, c:3, sale:false });
  // Carcasses et gravats en instances
  const C = RV_REGL.carcasses;
  RV.carc = new THREE.InstancedMesh(rvTasGeo(), new THREE.MeshLambertMaterial({ vertexColors:true }), C.cap);
  RV.carc.instanceMatrix.setUsage(THREE.DynamicDrawUsage); RV.carc.setColorAt(0, _rvC.set(0xffffff)); RV.carc.count = 0;
  RV.carc.frustumCulled = false; RV.carc.castShadow = RV.carc.receiveShadow = true; RV.root.add(RV.carc);
  RV.carcs = []; for (let i = 0; i < C.cap; i++) RV.carcs.push({ vie:0, max:1, x:0, z:0, rot:0, s:1, sy:1, col:null, fume:0, feu:0 });
  // Fumée et lueurs : nuages de points de js/55-rts-effets.js (même nuanceur, réserves à part)
  if (typeof rfxPoints === 'function'){
    RV.soft = rfxPoints(RV_REGL.points.fumee, false); RV.glow = rfxPoints(RV_REGL.points.lueur, true);
    [RV.soft, RV.glow].forEach(D => { RV.root.add(D.pts); D.pts.renderOrder -= 2; });
  }
  // Drapeau du QG et charognards : un petit maillage refait à chaque image
  const NA = (RV_FL.nx * RV_FL.ny * 2 + 8 + RV_REGL.oiseaux * 2) * 3, ag = new THREE.BufferGeometry();
  ag.setAttribute('position', new THREE.BufferAttribute(new Float32Array(NA * 3), 3).setUsage(THREE.DynamicDrawUsage));
  ag.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(NA * 3), 3).setUsage(THREE.DynamicDrawUsage));
  ag.setAttribute('color', new THREE.BufferAttribute(new Float32Array(NA * 3), 3));
  RV.anim = new THREE.Mesh(ag, new THREE.MeshLambertMaterial({ vertexColors:true, side:THREE.DoubleSide }));
  RV.anim.frustumCulled = false; RV.anim.visible = false; RV.root.add(RV.anim);
  rvAnimCouleurs();
  RV.pret = true;
}
// Rend la mémoire graphique en quittant le RTS (les objets restent, rechargés à la prochaine partie sans rien recréer)
function rvLiberer(){
  if (!RV.pret) return;
  RV.dec.geometry.dispose(); RV.dec.material.dispose(); RV.tex.dispose();
  RV.carc.geometry.dispose(); RV.carc.material.dispose(); if (typeof RV.carc.dispose === 'function') RV.carc.dispose();
  [RV.soft, RV.glow].forEach(D => { if (D){ D.geo.dispose(); D.pts.material.dispose(); } });
  RV.anim.geometry.dispose(); RV.anim.material.dispose();
}
// Tout vider (nouvelle vallée, partie reprise, sortie)
function rvVider(){
  RV.traces.forEach(o => { o.vie = 0; o.sale = true; }); RV.chen.forEach(o => { o.vie = 0; o.sale = true; });
  RV.carcs.forEach(o => { o.vie = 0; }); RV.carc.count = 0;
  [RV.soft, RV.glow].forEach(D => { if (D){ D.life.fill(0); D.n = 0; D.geo.setDrawRange(0, 0); D.pts.visible = false; } });
  RV.suivi.clear(); RV.batAcc.clear(); RV.tour = null; RV.tourT = 8; RV.vents = 0;
  rvDecMaj(true);
}

/* ---------- 2. Traces au sol ---------- */
function rvTrace(L, kind, x, z, r, vie, rot, l){
  // Une trace de même sorte tout près : rafraîchie (une bataille au même endroit ne vide pas la réserve)
  if (kind !== 'chenille') for (const o of L){
    if (o.vie > 0 && o.c === RV_CASE[kind] && Math.hypot(o.x - x, o.z - z) < Math.max(o.r, r) * .8){ o.vie = o.max = Math.max(o.vie, vie); if (r > o.r){ o.r = Math.min(r, o.r * 1.25); o.l = o.r; o.sale = true; } return o; }
  }
  let o = null, best = 1e9; // une place libre, sinon la plus vieille
  const n = L.length, i0 = L === RV.chen ? RV.ci : RV.ti;
  for (let k = 0; k < n; k++){ const q = L[(i0 + k) % n]; if (q.vie <= 0){ o = q; break; } if (q.vie < best){ best = q.vie; o = q; } }
  if (L === RV.chen) RV.ci = (RV.ci + 1) % n; else RV.ti = (RV.ti + 1) % n;
  Object.assign(o, { vie, max:vie, x, z, r, l:l || r, rot:rot == null ? rvR(0, 6.28) : rot, c:RV_CASE[kind], sale:true });
  return o;
}
// Explosion vue (appelé par rfxBoom, js/55-rts-effets.js) : cratère au rayon réel, ou flaque d'acide
function rvBoom(x, z, R, o){
  if (!RV.actif || !RV_REGL.on) return;
  try {
    const V = RV_REGL.traces.vie;
    if (o && o.acide) rvTrace(RV.traces, 'acide', x, z, Math.max(1.4, R * .75), V.acide);
    else if (R >= 2.5) rvTrace(RV.traces, 'cratere', x, z, Math.max(1.5, R * .55), V.cratere * (o && o.big ? 1.5 : 1));
  } catch (e){ errNote(e); }
}
const RV_COINS = [[-1, -1], [1, -1], [1, 1], [-1, 1]];
function rvDecPose(o){
  const g = RV.dec.geometry, P = g.attributes.position.array, U = g.attributes.uv.array, k = o.i;
  if (o.vie <= 0){ for (let q = 0; q < 12; q++) P[k * 12 + q] = 0; return; }
  const c = Math.cos(o.rot), s = Math.sin(o.rot), u0 = (o.c % 4) / 4, v0 = 1 - Math.floor(o.c / 4) / 2;
  for (let q = 0; q < 4; q++){
    const lx = RV_COINS[q][0] * o.r, lz = RV_COINS[q][1] * o.l, x = o.x + lx * c + lz * s, z = o.z - lx * s + lz * c;
    P[k * 12 + q * 3] = x; P[k * 12 + q * 3 + 1] = rvY(x, z); P[k * 12 + q * 3 + 2] = z;
    U[k * 8 + q * 2] = u0 + (RV_COINS[q][0] + 1) / 8 * .98 + .0025; U[k * 8 + q * 2 + 1] = v0 - (RV_COINS[q][1] + 1) / 4 * .98 - .005;
  }
}
// Opacité de chaque décalque (pâlit pendant le dernier tiers de sa vie) ; positions refaites seulement quand une trace change
function rvDecMaj(tout){
  const g = RV.dec.geometry, A = g.attributes.aA.array;
  let pos = false;
  for (const L of [RV.traces, RV.chen]) for (const o of L){
    if (o.sale || tout){ rvDecPose(o); o.sale = false; pos = true; }
    const a = o.vie > 0 ? Math.min(1, o.vie / (o.max * .33)) : 0, k = o.i * 4;
    A[k] = A[k + 1] = A[k + 2] = A[k + 3] = a;
  }
  g.attributes.aA.needsUpdate = true;
  if (pos){ g.attributes.position.needsUpdate = true; g.attributes.uv.needsUpdate = true; }
}
function rvTraces(dt){
  for (const L of [RV.traces, RV.chen]) for (const o of L) if (o.vie > 0){ o.vie -= dt; if (o.vie <= 0){ o.vie = 0; o.sale = true; } }
  rvDecMaj(false);
}
// Carcasse (unité détruite) ou gravats (bâtiment tombé)
function rvCarcasse(x, z, s, sy, col, fume){
  let o = RV.carcs[0];
  for (const q of RV.carcs){ if (q.vie <= 0){ o = q; break; } if (q.vie < o.vie) o = q; }
  const C = RV_REGL.carcasses;
  Object.assign(o, { vie:C.vie, max:C.vie, x, z, rot:rvR(0, 6.28), s, sy, col, fume:fume ? C.fume : 0, feu:fume ? 8 : 0 });
}
function rvCarcasses(dt){
  let n = 0;
  for (const o of RV.carcs){
    if (o.vie <= 0) continue; o.vie -= dt; if (o.vie <= 0) continue;
    const f = o.vie / o.max, bas = f < .15 ? (1 - f / .15) * 1.4 * o.sy : 0; // s'enfonce à la fin
    _rvO.position.set(o.x, rvSolY(o.x, o.z) - .05 - bas, o.z); _rvO.rotation.set(0, o.rot, 0); _rvO.scale.set(o.s, o.sy, o.s); _rvO.updateMatrix();
    RV.carc.setMatrixAt(n, _rvO.matrix); RV.carc.setColorAt(n, _rvC.setRGB(o.col[0], o.col[1], o.col[2])); n++;
    if (RV.soft && o.fume > 0 && dt > 0){
      o.fume -= dt;
      if (rvHasard() < dt * 4) rfxP(RV.soft, o.x + rvR(-.8, .8) * o.s, 1.2 * o.sy, o.z + rvR(-.8, .8) * o.s, RV_REGL.vent.x * .6, rvR(1.4, 2.2), RV_REGL.vent.z * .6, rvR(3, 4.5), 1.4 * o.s, 4 * o.s, RV_FUM.noire, RV_FUM.grise, .55, 0, .2);
    }
    if (RV.glow && o.feu > 0 && dt > 0){ o.feu -= dt; if (rvHasard() < dt * 6) rfxP(RV.glow, o.x + rvR(-.6, .6) * o.s, .8 * o.sy, o.z + rvR(-.6, .6) * o.s, 0, rvR(.8, 1.6), 0, rvR(.4, .7), rvR(1, 1.8) * o.s, .4, RV_FUM.feu, RV_FUM.braise, .8); }
  }
  RV.carc.count = n; RV.carc.visible = n > 0;
  if (n){ RV.carc.instanceMatrix.needsUpdate = true; if (RV.carc.instanceColor) RV.carc.instanceColor.needsUpdate = true; }
}
const RV_FUM = { grise:[.42, .4, .37], noire:[.13, .12, .11], sable:[.66, .56, .42], sableC:[.78, .7, .58], feu:[1, .6, .2], braise:[.8, .22, .05],
  nid:[.55, .9, .15], nidF:[.18, .32, .05], ruche:[.62, .95, .2], gyro:[1, .68, .18], vehic:[.28, .27, .25], beton:[.78, .75, .7] };

/* ---------- Ce qui se passe dans la partie : morts, chenilles, poussière ---------- */
const rvCentre = () => RTS.pilot ? camera.position : _rvV.set(RTS.cam.x, 0, RTS.cam.z);
function rvScan(dt){
  const V = RV_REGL.traces.vie;
  for (const u of RTS.units){
    if (u.dead){
      if (RV.morts.has(u)) continue; RV.morts.add(u); RV.suivi.delete(u);
      const p = u.g.position, veh = u.U.cat !== 'rob' || u.U.big, s = u.U.big ? 1.35 : veh ? (u.U.kind === 'air' ? 1.15 : 1) : .45;
      rvCarcasse(p.x, p.z, s, veh ? 1 : .6, RV_FUM.vehic, veh);
      rvTrace(RV.traces, veh ? 'huile' : 'brule', p.x, p.z, veh ? 3.4 * s : 1.6, V.huile);
      continue;
    }
    if (u.type !== 'tank' && u.type !== 'mech') continue;
    const p = u.g.position; let S = RV.suivi.get(u);
    if (!S){ RV.suivi.set(u, S = { x:p.x, z:p.z, px:p.x, pz:p.z, pT:0 }); continue; }
    const dx = p.x - S.x, dz = p.z - S.z, d = Math.hypot(dx, dz);
    if (u.type === 'tank' && d >= RV_REGL.traces.pas){ // traces de chenilles
      if (d < 6) rvTrace(RV.chen, 'chenille', (p.x + S.x) / 2, (p.z + S.z) / 2, 1.95, V.chenille, Math.atan2(dx, dz), d / 2 + .05);
      S.x = p.x; S.z = p.z;
    }
    // Poussière derrière le véhicule qui roule
    const v = dt > 0 ? Math.hypot(p.x - S.px, p.z - S.pz) / dt : 0; S.px = p.x; S.pz = p.z;
    if (RV.soft && v > 1.2 && v < 40){ S.pT -= dt; if (S.pT <= 0){ S.pT = isTouch ? .2 : .11; const h = u.g.rotation.y; rfxP(RV.soft, p.x - Math.sin(h) * 2.6 + rvR(-.8, .8), .5, p.z - Math.cos(h) * 2.6 + rvR(-.8, .8), rvR(-.3, .3) + RV_REGL.vent.x * .4, rvR(.4, 1), rvR(-.3, .3), rvR(1.1, 1.6), 1.6, 3.6, RV_FUM.sable, RV_FUM.sableC, .4, 0, .6); } }
  }
  for (const o of RTS.blds){
    if (!o.dead || RV.morts.has(o)) continue; RV.morts.add(o); RV.batAcc.delete(o);
    if (o.hp > 0) continue; // vendu : rien ne tombe
    const s = clamp(o.r / 2.6, .6, 2.6);
    rvTrace(RV.traces, 'gravats', o.x, o.z, o.r * 1.5 + 1.5, V.gravats);
    rvCarcasse(o.x, o.z, s, .55, RV_FUM.beton, true);
  }
  for (const n of RTS.nests){
    if (!n.dead || RV.morts.has(n)) continue; RV.morts.add(n);
    if (!n.ruche){ rvTrace(RV.traces, 'brule', n.x, n.z, 9, V.nid); rvCarcasse(n.x, n.z, 1.3, .4, [.35, .2, .18], true); }
  }
}
// Bâtiments abîmés : fumée (grise puis noire) selon leur vie, flammes sous 25 % : l'état de la base se lit d'un coup d'œil
function rvBatiments(dt){
  if (!RV.soft || dt <= 0) return;
  const c = rvCentre(), B = RV_REGL.bat;
  for (const o of RTS.blds){
    if (o.dead || !o.maxHp) continue;
    const k = o.hp / o.maxHp; if (k >= B.fumee) continue;
    if (Math.hypot(o.x - c.x, o.z - c.z) > RV_REGL.vue) continue;
    let A = RV.batAcc.get(o); if (!A) RV.batAcc.set(o, A = { f:rvHasard(), l:rvHasard() });
    const g = 1 - k / B.fumee, haut = o.type === 'hq' ? 7.2 : o.B.turret ? 2.8 : Math.min(6, 2 + o.r * .6), w = Math.max(.6, o.r * .45);
    A.f += dt * (1.5 + 6 * g) * (isTouch ? .6 : 1);
    while (A.f >= 1){
      A.f -= 1;
      const col = k < B.feu ? RV_FUM.noire : [RV_FUM.grise[0] * (1 - g * .55), RV_FUM.grise[1] * (1 - g * .55), RV_FUM.grise[2] * (1 - g * .55)];
      rfxP(RV.soft, o.x + rvR(-w, w), haut, o.z + rvR(-w, w), RV_REGL.vent.x * rvR(.5, 1.1), rvR(1.5, 2.6), RV_REGL.vent.z * rvR(.5, 1.1), rvR(2.8, 4.2) + g, 1.6 + g, 4 + o.r * .6 + 4 * g, col, RV_FUM.grise, .55 + .3 * g, 0, .15);
    }
    if (k < B.feu && RV.glow){
      A.l += dt * (isTouch ? 7 : 12);
      while (A.l >= 1){ A.l -= 1; rfxP(RV.glow, o.x + rvR(-w, w), haut * rvR(.45, .9), o.z + rvR(-w, w), 0, rvR(1, 2), 0, rvR(.4, .7), rvR(1.6, 3), .5, RV_FUM.feu, RV_FUM.braise, .9); }
    }
  }
}

/* ---------- 3. Vie : vent, tourbillons, nids, gyrophare, drapeau, charognards ---------- */
function rvVent(dt){
  if (!RV.soft || dt <= 0) return;
  const w = typeof AMB === 'object' ? AMB.weather : '', fort = w === 'vent' || w === 'poussiere', c = rvCentre(), W = RV_REGL.vent;
  RV.vents -= dt * (fort ? 2.5 : 1);
  while (RV.vents <= 0){
    RV.vents += W.pas;
    const x = c.x + rvR(-45, 45), z = c.z + rvR(-40, 30);
    if (Math.hypot(x, z) < (RTS.baseR || 30) * .8) continue; // pas de sable qui vole sur la dalle
    rfxP(RV.soft, x, rvR(.2, .7), z, W.x * rvR(3, 5), rvR(.05, .3), W.z * rvR(3, 5), rvR(2, 3), rvR(2.5, 4), rvR(4.5, 7), RV_FUM.sableC, RV_FUM.sable, fort ? .24 : .15, 0, 0);
  }
}
function rvTourbillon(dt){
  if (!RV.soft || dt <= 0) return;
  const T = RV_REGL.tourbillon;
  if (!RV.tour){
    RV.tourT -= dt; if (RV.tourT > 0) return;
    RV.tourT = T.tous * rvR(.7, 1.3);
    const c = rvCentre();
    for (let k = 0; k < 6; k++){
      const a = rvR(-2.4, -.7), d = rvR(70, 140), x = c.x + Math.cos(a) * d, z = c.z + Math.sin(a) * d;
      if (z > -60 || z < (RTS.zMin || -300) + 20 || Math.abs(x) > rtsValleyX(z) - 12 || Math.hypot(x, z) < 85) continue;
      RV.tour = { x, z, t:0, acc:0 }; break;
    }
    return;
  }
  const o = RV.tour; o.t += dt; o.x += RV_REGL.vent.x * 1.4 * dt; o.z += RV_REGL.vent.z * 1.4 * dt;
  if (o.t > T.vie){ RV.tour = null; return; }
  const f = Math.min(1, o.t / 2, (T.vie - o.t) / 2);
  o.acc += dt * T.debit * f;
  while (o.acc >= 1){
    o.acc -= 1;
    const h = rvHasard() * rvHasard() * 16, r = .7 + h * .28, a = o.t * 7 + rvR(0, 6.28), ca = Math.cos(a), sa = Math.sin(a);
    rfxP(RV.soft, o.x + ca * r, h + .3, o.z + sa * r, -sa * 4.5, rvR(2, 3.5), ca * 4.5, rvR(1, 1.5), 1.2 + h * .14, 2.2 + h * .22, RV_FUM.sable, RV_FUM.sableC, .38, 0, 0);
  }
}
// Lueur qui bat sur les nids et la Ruche (vue à la ronde), gyrophare du QG
function rvNids(dt){
  if (!RV.glow || dt <= 0) return;
  const c = rvCentre(), t0 = RV.t - dt;
  for (const n of RTS.nests){
    if (n.dead || Math.hypot(n.x - c.x, n.z - c.z) > RV_REGL.vue) continue;
    const per = n.ruche ? 1.6 : 1.25, ph = (n.idx || 0) * .37;
    if (Math.floor((RV.t + ph) / per) === Math.floor((t0 + ph) / per)) continue; // un battement par période
    const big = n.ruche ? 1.9 : 1, y = n.ruche ? 11 : 7.6;
    rfxP(RV.glow, n.x, y, n.z, 0, .2, 0, .95, 5 * big, 11 * big, n.ruche ? RV_FUM.ruche : RV_FUM.nid, RV_FUM.nidF, .5);
    for (let i = 0; i < 2; i++) rfxP(RV.glow, n.x + rvR(-3, 3) * big, y - 2, n.z + rvR(-3, 3) * big, rvR(-.3, .3), rvR(.6, 1.2), rvR(-.3, .3), rvR(1.6, 2.4), .7, .3, RV_FUM.nid, RV_FUM.nidF, .7); // spores
  }
  const q = RTS.base;
  if (q && !q.dead && Math.floor(RV.t * 1.1) !== Math.floor(t0 * 1.1)){
    const a = (q.rot || 0) * Math.PI / 2, lx = 2, lz = 1, x = q.x + lx * Math.cos(a) + lz * Math.sin(a), z = q.z - lx * Math.sin(a) + lz * Math.cos(a);
    rfxP(RV.glow, x, 13.9, z, 0, 0, 0, .28, 3.2, 2, RV_FUM.gyro, RV_FUM.feu, 1);
  }
}
// Drapeau (grille nx x ny) et oiseaux (2 triangles chacun) : sommets refaits à chaque image, couleurs posées une fois
const RV_FL = { nx:7, ny:4, larg:2.6, haut:1.5 };
function rvAnimCouleurs(){
  const C = RV.anim.geometry.attributes.color.array, nf = RV_FL.nx * RV_FL.ny * 2 * 3;
  const bleu = [.16, .26, .42], jaune = [.85, .7, .2], mat = [.55, .55, .58], oiseau = [.24, .19, .15];
  let v = 0;
  for (let j = 0; j < RV_FL.ny; j++) for (let i = 0; i < RV_FL.nx; i++) for (let k = 0; k < 6; k++){ const c = j === 1 || j === 2 ? (i < 2 ? jaune : bleu) : bleu; C[v * 3] = c[0]; C[v * 3 + 1] = c[1]; C[v * 3 + 2] = c[2]; v++; }
  for (let k = 0; k < 24; k++){ C[v * 3] = mat[0]; C[v * 3 + 1] = mat[1]; C[v * 3 + 2] = mat[2]; v++; }
  while (v * 3 < C.length){ C[v * 3] = oiseau[0]; C[v * 3 + 1] = oiseau[1]; C[v * 3 + 2] = oiseau[2]; v++; }
  RV.anim.geometry.attributes.color.needsUpdate = true;
  return nf;
}
function rvAnim(){
  const P = RV.anim.geometry.attributes.position.array, t = RV.t;
  let v = 0;
  const tri = (a, b, c) => { P[v++] = a[0]; P[v++] = a[1]; P[v++] = a[2]; P[v++] = b[0]; P[v++] = b[1]; P[v++] = b[2]; P[v++] = c[0]; P[v++] = c[1]; P[v++] = c[2]; };
  const q = RTS.base, ok = q && !q.dead;
  // Drapeau : mât sur le toit du QG, toile qui ondule dans le vent
  const a = ok ? (q.rot || 0) * Math.PI / 2 : 0, ca = Math.cos(a), sa = Math.sin(a), bx = ok ? q.x + 3.6 * ca - 2.8 * sa : 0, bz = ok ? q.z - 3.6 * sa - 2.8 * ca : 0;
  const F = RV_FL, top = 11, pt = (u, w) => { // u le long de la toile (0 au mât), w de haut en bas
    const o = Math.sin(t * 5.5 - u * 3.2) * .28 * u + Math.sin(t * 3.1 - u * 2) * .1 * u;
    return [bx + u * F.larg * .95, top - w * F.haut - u * .12, bz + o];
  };
  for (let j = 0; j < F.ny; j++) for (let i = 0; i < F.nx; i++){
    if (!ok){ for (let k = 0; k < 18; k++) P[v++] = 0; continue; }
    const u0 = i / F.nx, u1 = (i + 1) / F.nx, w0 = j / F.ny, w1 = (j + 1) / F.ny, A = pt(u0, w0), B = pt(u1, w0), C = pt(u1, w1), D = pt(u0, w1);
    tri(A, B, C); tri(A, C, D);
  }
  const m = (x0, z0, x1, z1) => { const y0 = ok ? 4.7 : 0, y1 = ok ? top + .2 : 0; tri([x0, y0, z0], [x1, y0, z1], [x1, y1, z1]); tri([x0, y0, z0], [x1, y1, z1], [x0, y1, z0]); };
  const e = .07; m(bx - e, bz - e, bx + e, bz - e); m(bx + e, bz - e, bx + e, bz + e); m(bx + e, bz + e, bx - e, bz + e); m(bx - e, bz + e, bx - e, bz - e);
  // Charognards : au-dessus des nids les plus proches de la vue (et de la Ruche), en grands cercles lents
  const c = rvCentre(), nids = [];
  for (const n of RTS.nests) if (!n.dead) nids.push(n);
  nids.sort((p, r) => Math.hypot(p.x - c.x, p.z - c.z) - Math.hypot(r.x - c.x, r.z - c.z));
  let ib = 0;
  for (const n of nids){
    const nb = Math.min(n.ruche ? 4 : 3, RV_REGL.oiseaux - ib);
    for (let k = 0; k < nb; k++, ib++){
      const s = (n.idx || 0) * 1.7 + k * 2.1, r = (n.ruche ? 20 : 12) + k * 3.5, w = (k % 2 ? -1 : 1) * (.32 - k * .04), ang = t * w + s;
      const x = n.x + Math.cos(ang) * r, z = n.z + Math.sin(ang) * r, y = (n.ruche ? 25 : 21) + k * 2 + Math.sin(t * .4 + s) * 1.5;
      const hx = -Math.sin(ang) * Math.sign(w), hz = Math.cos(ang) * Math.sign(w), lx = hz, lz = -hx, bat = Math.sin(t * 7 + s) > .55 ? Math.sin(t * 14 + s) * .5 : .18, S = .75;
      const N = [x + hx * .6 * S, y, z + hz * .6 * S], Tq = [x - hx * .45 * S, y, z - hz * .45 * S];
      tri(N, [x + lx * 1.3 * S - hx * .25 * S, y + bat, z + lz * 1.3 * S - hz * .25 * S], Tq);
      tri(N, Tq, [x - lx * 1.3 * S - hx * .25 * S, y + bat, z - lz * 1.3 * S - hz * .25 * S]);
    }
    if (ib >= RV_REGL.oiseaux) break;
  }
  while (v < P.length) P[v++] = 0;
  RV.anim.geometry.attributes.position.needsUpdate = true;
  RV.anim.geometry.computeVertexNormals();
  RV.anim.visible = true;
}

/* ---------- Chaque image ---------- */
function rvImage(dt){
  if (!RV_REGL.on || !RTS.on || !world){ if (RV.actif) rvQuitter(); return; }
  if (!RV.pret) rvCalme(rvCreer);
  if (!RV.actif){ RV.actif = true; RV.root.visible = true; }
  if (RV.monde !== world){ RV.monde = world; rvVider(); }
  if (RTS.paused) dt = 0;
  dt = Math.min(dt || 0, .1);
  RV.t += dt;
  if (RV.soft && typeof RFX === 'object') RV.soft.pts.material.uniforms.uScale.value = RV.glow.pts.material.uniforms.uScale.value = RFX.scale;
  rvScan(dt); rvBatiments(dt); rvVent(dt); rvTourbillon(dt); rvNids(dt);
  rvCarcasses(dt); rvTraces(dt); rvAnim();
  if (RV.soft){ rfxPointsStep(RV.soft, dt); rfxPointsStep(RV.glow, dt); }
}
function rvQuitter(){
  RV.actif = false; RV.monde = null;
  if (!RV.pret) return;
  rvVider(); RV.root.visible = false; RV.anim.visible = false;
  rvLiberer();
}
Jeu.on('image', dt => { try { rvImage(dt); } catch (e) { errNote(e); } });

// Accès pour les tests automatiques
window.__rtsVallee = {
  RV, RV_REGL, RV_CASE, rvChunk, rvBoom, rvImage, rvSolY, rvY, rvGen, rvTrace, rvCarcasse, rvQuitter,
  compte(){
    const vie = L => L.reduce((n, o) => n + (o.vie > 0 ? 1 : 0), 0), np = D => { let k = 0; if (D) for (let i = 0; i < D.cap; i++) if (D.life[i] > 0) k++; return k; };
    const parSorte = {}; for (const o of RV.traces) if (o.vie > 0){ const k = Object.keys(RV_CASE).find(n => RV_CASE[n] === o.c); parSorte[k] = (parSorte[k] || 0) + 1; }
    return { traces:vie(RV.traces), chenilles:vie(RV.chen), carcasses:RV.carc ? RV.carc.count : 0, fumee:np(RV.soft), lueurs:np(RV.glow), sortes:parSorte, actif:RV.actif, visible:!!(RV.root && RV.root.visible) };
  },
  // Recrée tout (test du hasard : la création doit aussi se faire sans Math.random)
  reconstruire(){ if (RV.pret){ rvQuitter(); if (RV.root.parent) RV.root.parent.remove(RV.root); } RV.pret = false; RV.actif = false; RV.monde = null; }
};
