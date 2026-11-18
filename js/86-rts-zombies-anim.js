'use strict';
/* ================= RTS : des zombies qui vivent (dossier 131), seulement visuel ================= */
// Les zombies du RTS avançaient tous de la même façon. Ils prennent une allure, sans rien changer au jeu : aucune position
// réelle, aucune vie, aucune cible, aucune vitesse, aucun moment de frappe, aucun argent.
//   Allure selon le type : le marcheur se dandine, le coureur fonce penché en avant, le costaud roule des épaules, le gonflé
//     tangue, le Sapeur court tête baissée, la Carapace avance basse. Le pas suit la phase des jambes du jeu (z.phase).
//   Frappe : contre un bâtiment ou une unité, il lève les bras puis les abat au moment exact du coup (z.atkT remonte),
//     avec un élan du corps vers l'avant.
//   Coup reçu : petit sursaut en arrière, plus fort si le coup a fait mal ; la Carapace, elle, encaisse (elle se tasse).
//     Le Pilonneur se cale (il s'enfonce un peu) quand il s'enracine et recule à chaque crachat.
//   Sortie de terre : un zombie qui vient d'apparaître monte du sol en une demi-seconde, dans un peu de poussière.
//   Morts variées : il tombe en arrière, en avant ou sur le côté ; il éclate en morceaux sous un explosif (quand l'obus ou
//     la roquette arrive) et le sac du Sapeur abattu aussi ; il noircit et brûle sous le feu ; il se fige debout dans un
//     éclair violet sous la Tesla, puis tombe tout raide.
// Comment : le jeu recopie chaque image la pose de tous les zombies dans ses lots d'instances (zInstSync, js/07-zombies.js,
// appelé à la fin de visuals). Cet écouteur Jeu.on('image') passe juste après et corrige ces copies-là (matrices et couleurs
// d'instance), qui ne servent qu'au dessin. Les objets des zombies (position, rotation, membres, boîte des tirs) ne sont
// jamais touchés : le pilotage, qui vise les vrais maillages, touche exactement comme avant. Les places dans les lots sont
// retrouvées en refaisant le parcours de zInstSync ; si le compte ne tombe pas juste, rien n'est corrigé cette image-là.
// Les boss (vrais objets dans la scène, pas en instances) gardent leur conduite.
// Hasard : jamais Math.random. La variété vient du numéro du zombie (z.uid) ; les objets sont créés dans rzCalme.
// Les nids et la Ruche sont dans js/86-rts-nids-anim.js. Réglages : RZ_REGL (on : false remet tout comme avant).

const RZ_REGL = {
  on: true,
  vue: 130,                      // au-delà de cette distance au centre de la vue (ou hauteur × 2,4 vue de haut) : pas animé
  max: isTouch ? 100 : 300,      // zombies corrigés par image au plus (les plus vieux d'abord : ceux qui sont arrivés près de la base)
  // Allure par type : penche (rad, vers l'avant en marchant), roulis (rad, dandinement), rebond (m, à l'échelle 1), tangue (rad, avant-arrière au pas)
  allure: {
    walker:      { penche:.12, roulis:.13, rebond:.07, tangue:.05 },
    runner:      { penche:.38, roulis:.06, rebond:.12, tangue:.08 },
    brute:       { penche:.16, roulis:.16, rebond:.08, tangue:.04 },
    clown:       { penche:.1,  roulis:.18, rebond:.1,  tangue:.06 },
    crawler:     { penche:0,   roulis:.06, rebond:.03, tangue:.03 },
    spider:      { penche:0,   roulis:.05, rebond:.06, tangue:.02 },
    bloater:     { penche:.05, roulis:.17, rebond:.05, tangue:.03, gonfle:.06 },
    stalker:     { penche:.3,  roulis:.05, rebond:.08, tangue:.06 },
    shield:      { penche:.08, roulis:.1,  rebond:.05, tangue:.03 },
    spitter:     { penche:.1,  roulis:.12, rebond:.06, tangue:.05 },
    flyer:       { penche:.22, roulis:.12, rebond:0,   tangue:.08 },
    abomination: { penche:.1,  roulis:.12, rebond:.07, tangue:.04 },
    sapeur:      { penche:.3,  roulis:.06, rebond:.13, tangue:.07 },   // tête baissée (en plus de sa pente à lui)
    pilonneur:   { penche:0,   roulis:0,   rebond:0,   tangue:0 },     // il rampe déjà sur ses racines (js/74)
    carapace:    { penche:.06, roulis:.08, rebond:.025, tangue:.03 },
    defaut:      { penche:.1,  roulis:.1,  rebond:.06, tangue:.04 }
  },
  sortie: { t:.5, prof:2.2 },                                            // sortie de terre : durée (s), profondeur (m, échelle 1)
  coup: { penche:.3, t:.11, min:.3, k:3, tasse:.14, carapaceT:.18 },    // sursaut : angle, durée, part minimale, part par vie perdue
  frappe: { leve:.8, abat:1.1, elan:.32, avance:.35, t:.3, avant:.35 }, // bras levés (rad), abattus, élan du corps, avancée (m), durée, temps de levée avant le coup
  pilonneur: { cale:.18, tasse:.08, recul:.28, reculT:.25 },
  mort: {
    chute:.5,                      // tomber en avant ou sur le côté (s)
    tesla:.5, teslaChute:.25,      // figé debout (s), puis chute raide (s)
    brule:1.4, braise:1.2,         // noircit (s), flammes (s)
    attente:1.2,                   // éclate : au plus tant d'attente que l'obus arrive (s)
    eclats:isTouch ? 6 : 12        // éclatements par seconde au plus (au-delà : il tombe, soufflé)
  },
  morceaux: { cap:isTouch ? 70 : 160, n:isTouch ? 6 : 9, vie:2.6, taille:.34 },
  // Nids (js/86-rts-nids-anim.js) : souffle (part de la taille), bouffée de ponte (gonfle, s), penche et affaissement à 0 % de
  // vie, fumée sous ce taux de vie, gouttes sous celui-là, crevaison (s), morceaux à la crevaison
  nid: { souffle:.045, vitesse:1.7, ponte:.14, ponteT:.35, penche:.13, affaisse:.16, fumee:.5, gouttes:.25, mort:.9, morceaux:isTouch ? 10 : 18 },
  // Ruche : sortie de terre (s, m), souffle, ouverture à la fin de la sortie (gonfle), morceaux à sa mort
  ruche: { sortie:3.2, prof:16, souffle:.035, vitesse:1.1, ouvre:.16, morceaux:isTouch ? 16 : 30 },
  couleurs: { charbon:[.1, .085, .075], tesla:[1.7, 1.55, 2.4], sang:[.42, .05, .04] }
};
const RZ = { pret:false, actif:false, monde:null, root:null, st:new WeakMap(), t:0, depart:true, cnt:new Int32Array(64), slots:new Int32Array(8192), vis:[], visSt:[], frame:0,
  morceaux:[], mi:0, im:null, tok:0, decale:0, corriges:0, temps:{ ms:0, n:0, max:0 }, morts:{ tombe:0, eclate:0, brule:0, tesla:0 } };
const RZ_FR = new THREE.Frustum(), RZ_PM = new THREE.Matrix4(), RZ_SPH = new THREE.Sphere();
const RZ_MB = new THREE.Matrix4(), RZ_MBI = new THREE.Matrix4(), RZ_Q = new THREE.Matrix4(), RZ_Q2 = new THREE.Matrix4();
// Transformations affines : 3 × 3 par lignes, puis la translation (12 nombres)
const RZ_W = new Float64Array(12), RZ_F = new Float64Array(12), RZ_A = new Float64Array(12), RZ_T = new Float64Array(12), RZ_M3 = new Float64Array(9), RZ_N3 = new Float64Array(9);

/* ---------- Hasard à part ---------- */
let rzS = 1310;
const rzHasard = () => { rzS = rzS * 16807 % 2147483647; return (rzS - 1) / 2147483646; };
const rzR = (a, b) => a + (b - a) * rzHasard();
function rzCalme(fn){ const M = Math.random; Math.random = rzHasard; try { return fn(); } finally { Math.random = M; } }
const rzFrac = x => x - Math.floor(x);
const rzK = (dt, v) => 1 - Math.exp(-dt * v);
const rzPart = () => (typeof RV === 'object' && RV.actif && RV.soft && typeof rfxP === 'function') ? RV : null; // fumée et lueurs de js/79

/* ---------- Petites opérations sur les transformations affines ---------- */
function rzMul3(A, B, out){ // out = A·B (3 × 3 par lignes)
  for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) out[i * 3 + j] = A[i * 3] * B[j] + A[i * 3 + 1] * B[3 + j] + A[i * 3 + 2] * B[6 + j];
}
// W = Ry(lacet)·Rx(penche)·Rz(roulis)·S·Ry(-lacet), autour du point p, puis décalé de d (monde)
function rzAffine(out, lacet, penche, roulis, sxz, sy, px, py, pz, dx, dy, dz){
  const cp = Math.cos(penche), sp = Math.sin(penche), cr = Math.cos(roulis), sr = Math.sin(roulis), cy = Math.cos(lacet), sy2 = Math.sin(lacet);
  const M = RZ_M3; // Rx·Rz·S
  M[0] = cr * sxz; M[1] = -sr * sy; M[2] = 0;
  M[3] = cp * sr * sxz; M[4] = cp * cr * sy; M[5] = -sp * sxz;
  M[6] = sp * sr * sxz; M[7] = sp * cr * sy; M[8] = cp * sxz;
  const N = RZ_N3; // Ry·M
  for (let j = 0; j < 3; j++){ N[j] = cy * M[j] + sy2 * M[6 + j]; N[3 + j] = M[3 + j]; N[6 + j] = -sy2 * M[j] + cy * M[6 + j]; }
  // (Ry·M)·Ry(-lacet) : Ry(-lacet) = [[cy,0,-sy],[0,1,0],[sy,0,cy]]
  for (let i = 0; i < 3; i++){ const a = N[i * 3], b = N[i * 3 + 1], c = N[i * 3 + 2]; out[i * 3] = a * cy + c * sy2; out[i * 3 + 1] = b; out[i * 3 + 2] = -a * sy2 + c * cy; }
  out[9] = px + dx - (out[0] * px + out[1] * py + out[2] * pz);
  out[10] = py + dy - (out[3] * px + out[4] * py + out[5] * pz);
  out[11] = pz + dz - (out[6] * px + out[7] * py + out[8] * pz);
  return out;
}
// Rotation d'angle a autour de l'axe x du zombie (lacet), passant par le point s (épaule)
function rzAxeX(out, lacet, a, sx, sy, sz){ return rzAffine(out, lacet, a, 0, 1, 1, sx, sy, sz, 0, 0, 0); }
function rzCompose(B, A, out){ // out = B∘A
  rzMul3(B, A, RZ_M3); const t0 = A[9], t1 = A[10], t2 = A[11];
  const x = B[0] * t0 + B[1] * t1 + B[2] * t2 + B[9], y = B[3] * t0 + B[4] * t1 + B[5] * t2 + B[10], z = B[6] * t0 + B[7] * t1 + B[8] * t2 + B[11];
  for (let i = 0; i < 9; i++) out[i] = RZ_M3[i];
  out[9] = x; out[10] = y; out[11] = z; return out;
}
function rzDeMat4(m, out){ const e = m.elements; out[0] = e[0]; out[1] = e[4]; out[2] = e[8]; out[3] = e[1]; out[4] = e[5]; out[5] = e[9]; out[6] = e[2]; out[7] = e[6]; out[8] = e[10]; out[9] = e[12]; out[10] = e[13]; out[11] = e[14]; return out; }
// Applique W à une matrice d'instance (tableau par colonnes, décalage o)
function rzAppli(a, o, W){
  for (let c = 0; c < 3; c++){ const k = o + c * 4, x = a[k], y = a[k + 1], z = a[k + 2]; a[k] = W[0] * x + W[1] * y + W[2] * z; a[k + 1] = W[3] * x + W[4] * y + W[5] * z; a[k + 2] = W[6] * x + W[7] * y + W[8] * z; }
  const k = o + 12, x = a[k], y = a[k + 1], z = a[k + 2];
  a[k] = W[0] * x + W[1] * y + W[2] * z + W[9]; a[k + 1] = W[3] * x + W[4] * y + W[5] * z + W[10]; a[k + 2] = W[6] * x + W[7] * y + W[8] * z + W[11];
}
const rzEstId = (pe, ro, sxz, sy, dx, dy, dz) => !pe && !ro && sxz === 1 && sy === 1 && !dx && !dy && !dz;

/* ---------- Un zombie : son état à moi (jamais sur l'objet du jeu) ---------- */
function rzNouveau(z){
  const h = rzFrac((z.uid || 0) * .6180339887 + .21), A = RZ_REGL.allure;
  // Ce qui ne change pas pendant la vie du zombie est lu une fois (lire beaucoup de champs de zombies de formes variées coûte)
  return { inst:null, bi:null, part:null, bras:[-1, -1], pv:z.hp, px:z.g.position.x, pz:z.g.position.z, v:0, mv:0, coup:0, atkT:z.atkT, frappe:9, leve:0,
    sortie0:-99, cale:0, recul:0, ric:0, h, mk:'', mt0:0, mt:0, vuF:-9, var:h < .4 ? 0 : h < .75 ? 1 : 2, cote:rzFrac(h * 7.31) < .5 ? -1 : 1, pj:null, cache:false, s0:0,
    rm:z.rm || '', A:A[z.type] || A.defaut, seuil:Math.max(.3, (z.speed || 1) * .25), maxHp:z.maxHp || 1, poussiere:false, compte:false };
}
// Lot de chaque morceau, et morceaux qui suivent un bras (pour la frappe)
function rzPrep(z, st){
  const I = z.inst; st.inst = I; st.bi = new Int16Array(I.length); st.part = new Int8Array(I.length); st.bras[0] = st.bras[1] = -1;
  const aL = z.armL || (z.rig && z.rig.armL) || null, aR = z.armR || (z.rig && z.rig.armR) || null;
  for (let k = 0; k < I.length; k++){
    const e = I[k]; st.bi[k] = zbList.indexOf(e.b);
    let o = e.m, p = 0;
    while (o && o !== z.g){ if (o === aL){ p = 1; break; } if (o === aR){ p = 2; break; } o = o.parent; }
    st.part[k] = p;
    if (p && st.bras[p - 1] < 0) st.bras[p - 1] = k; // premier maillage du bras : son origine est l'épaule
  }
  // Compte par lot (de près : tous les morceaux ; au loin : sans les petits), pour passer vite sur les zombies qu'on ne
  // corrige pas. Un zombie dont un morceau peut se cacher (point faible qui éclate) passe toujours morceau par morceau.
  const pr = far => { const m = new Map(); for (let k = 0; k < I.length; k++){ if (far && I[k].small) continue; m.set(st.bi[k], (m.get(st.bi[k]) || 0) + 1); } const a = new Int16Array(m.size * 2); let i = 0; m.forEach((n, b) => { a[i++] = b; a[i++] = n; }); return a; };
  st.lotsN = pr(false); st.lotsF = pr(true);
  st.lent = I.some(e => e.m.userData && e.m.userData.weak);
}

/* ---------- Morts : la cause, notée au moment du coup fatal (Jeu.on('tue')) ---------- */
function rzTue(z, was){
  if (!was || !z || !RZ.actif || typeof RTS !== 'object' || !RTS.on || !z.inst) return;
  let st = RZ.st.get(z); if (!st){ st = rzNouveau(z); RZ.st.set(z, st); }
  st.mt0 = RZ.t; st.mt = 0; st.pj = null;
  if (z.rmBoum){ st.mk = 'parti'; return; }                         // sac sauté contre un bâtiment : le jeu le cache
  if (z.rm === 'sapeur'){ st.mk = 'eclate'; return; }               // abattu : son sac saute (js/74, à cette image)
  const L = typeof RFX === 'object' ? RFX.last : null;
  const tickFeu = z.burnT > 0 && z.burnTick === .25;                 // mort par la brûlure (js/42-rts-combat.js)
  if (!tickFeu && L && L.S2 && L.S2.splash){ st.mk = 'eclate'; st.pj = L.pj || null; return; } // explosif : il éclate quand l'obus arrive
  if (typeof RFX_BEAMS === 'object'){                                 // éclair de la Tesla qui vient de partir sur lui
    const p = z.g.position;
    for (let i = 0; i < RFX_BEAMS.length; i++){ const o = RFX_BEAMS[i]; if (o.bolt && o.life > 0 && o.life === o.max && Math.abs(o.b.x - p.x) < 2.5 && Math.abs(o.b.z - p.z) < 2.5){ st.mk = 'tesla'; return; } }
  }
  st.mk = 'feu?'; // le feu est posé juste après le coup (lance-flammes) : décidé à l'image
}

/* ---------- Morceaux (éclatements, nids crevés) : une réserve fixe, un appel de dessin ---------- */
function rzMorceau(x, y, z, vx, vy, vz, r, g, b, s){
  const M = RZ.morceaux; if (!M.length) return null;
  let o = null; for (let k = 0; k < M.length; k++){ const q = M[(RZ.mi + k) % M.length]; if (!q.on){ o = q; RZ.mi = (RZ.mi + k + 1) % M.length; break; } }
  if (!o){ o = M[RZ.mi]; RZ.mi = (RZ.mi + 1) % M.length; } // plein : le plus vieux
  o.on = true; o.t = 0; o.T = RZ_REGL.morceaux.vie * rzR(.8, 1.2); o.x = x; o.y = y; o.z = z; o.vx = vx; o.vy = vy; o.vz = vz;
  o.rx = rzR(0, 6.28); o.ry = rzR(0, 6.28); o.wx = rzR(-12, 12); o.wy = rzR(-12, 12); o.s = s; o.r = r; o.g = g; o.b = b; o.sol = false;
  return o;
}
function rzMorceaux(dt){
  const im = RZ.im; if (!im) return;
  im.castShadow = typeof rstActif === 'function' && rstActif();
  if (dt <= 0) return; // figé : les matrices déjà écrites restent
  let n = 0; const a = im.instanceMatrix.array, c = im.instanceColor.array;
  for (const o of RZ.morceaux){
    if (!o.on) continue;
    o.t += dt; if (o.t >= o.T){ o.on = false; continue; }
    if (!o.sol){
      o.vy -= 22 * dt; o.x += o.vx * dt; o.y += o.vy * dt; o.z += o.vz * dt; o.rx += o.wx * dt; o.ry += o.wy * dt;
      const bas = o.s * .35;
      if (o.y < bas){ o.y = bas; if (o.vy < -3){ o.vy *= -.28; o.vx *= .5; o.vz *= .5; o.wx *= .4; o.wy *= .4; } else { o.sol = true; o.vy = 0; } }
    }
    const fin = Math.max(0, Math.min(1, (o.T - o.t) / .6)), s = o.s * fin, sang = Math.min(1, o.t * .8);
    // Matrice écrite à la main : Ry(ry)·Rx(rx)·échelle (s, 0,8 s, 1,15 s), puis la position
    const cx = Math.cos(o.rx), sx = Math.sin(o.rx), cy = Math.cos(o.ry), sy = Math.sin(o.ry), q = n * 16, s1 = s * .8, s2 = s * 1.15;
    a[q] = cy * s; a[q + 1] = 0; a[q + 2] = -sy * s; a[q + 3] = 0;
    a[q + 4] = sy * sx * s1; a[q + 5] = cx * s1; a[q + 6] = cy * sx * s1; a[q + 7] = 0;
    a[q + 8] = sy * cx * s2; a[q + 9] = -sx * s2; a[q + 10] = cy * cx * s2; a[q + 11] = 0;
    a[q + 12] = o.x; a[q + 13] = o.sol ? o.y - (1 - fin) * o.s * .3 : o.y; a[q + 14] = o.z; a[q + 15] = 1;
    const S = RZ_REGL.couleurs.sang; c[n * 3] = o.r + (S[0] - o.r) * sang * .5; c[n * 3 + 1] = o.g + (S[1] - o.g) * sang * .5; c[n * 3 + 2] = o.b + (S[2] - o.b) * sang * .5;
    n++;
  }
  im.count = n; im.visible = n > 0; if (n){ im.instanceMatrix.needsUpdate = true; im.instanceColor.needsUpdate = true; }
}
// Un zombie éclate : ses morceaux partent de leurs vraies places, à sa couleur
function rzEclate(z, st, I, s0, far){
  const P = rzPart(), gp = z.g.position, sc = z.g.scale.y || 1, N = RZ_REGL.morceaux;
  let bx = gp.x, bz = gp.z; const pj = st.pj; if (pj && pj.blast){ bx = pj.blast.x; bz = pj.blast.z; }
  if (bx === gp.x && bz === gp.z){ bx += rzR(-1, 1); bz += rzR(-1, 1); }
  const ox = gp.x - bx, oz = gp.z - bz, ol = Math.hypot(ox, oz) || 1;
  let n = 0;
  for (let k = 0; k < I.length && n < N.n; k++){
    const e = I[k], sl = RZ.slots[s0 + k]; if (sl < 0 || e.small || e.eye) continue;
    const b = zbList[st.bi[k]], a = b.im.instanceMatrix.array, o = sl * 16;
    const r = b.col ? e.r : .45, g = b.col ? e.g : .15, bl = b.col ? e.bl : .12;
    const v = rzR(5, 9);
    rzMorceau(a[o + 12], Math.max(.3, a[o + 13]), a[o + 14], ox / ol * v * .6 + rzR(-3, 3), rzR(5, 10), oz / ol * v * .6 + rzR(-3, 3), r, g, bl, N.taille * Math.sqrt(sc) * rzR(.7, 1.25));
    n++;
  }
  for (; n < N.n * .7; n++) rzMorceau(gp.x, .8 * sc, gp.z, rzR(-5, 5), rzR(5, 10), rzR(-5, 5), .4, .07, .05, N.taille * .7 * Math.sqrt(sc)); // chair et sang
  if (P){
    const S = RZ_REGL.couleurs.sang;
    for (let i = 0; i < 5; i++) rfxP(P.soft, gp.x + rzR(-.6, .6), rzR(.5, 1.6) * sc, gp.z + rzR(-.6, .6), rzR(-2, 2), rzR(.5, 2), rzR(-2, 2), rzR(.7, 1.1), 1.2 * sc, 3 * sc, S, [.3, .08, .06], .7, 0, 1.5);
  }
  st.cache = true; RZ.morts.eclate++;
}

/* ---------- Chaque image : la pose de chaque zombie vu ---------- */
function rzVoir(){
  camera.updateMatrixWorld(); RZ_PM.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse); RZ_FR.setFromProjectionMatrix(RZ_PM);
  const c = RTS.pilot ? camera.position : RTS.cam;
  RZ.cx = c.x; RZ.cz = c.z; RZ.vue = RTS.pilot ? RZ_REGL.vue : Math.max(RZ_REGL.vue, (RTS.cam.h || 56) * 2.4);
}
function rzVisible(p, s){
  const dx = p.x - RZ.cx, dz = p.z - RZ.cz; if (dx * dx + dz * dz > RZ.vue * RZ.vue) return false;
  RZ_SPH.center.set(p.x, p.y + s, p.z); RZ_SPH.radius = 2.4 * s; return RZ_FR.intersectsSphere(RZ_SPH);
}
// L'état avance pour tous les zombies (même hors de la vue), sans rien calculer de lourd
// Facteurs d'amortissement de l'image (calculés une fois par image, pas une fois par zombie)
const RZ_D = { v:0, m:0, coup:0, coupC:0, ric:0, recul:0, leve:0, cale:0 };
function rzFacteurs(dt){
  const C = RZ_REGL.coup, D = RZ_D;
  D.v = rzK(dt, 10); D.m = rzK(dt, 6); D.leve = rzK(dt, 18); D.cale = rzK(dt, 5);
  D.coup = Math.exp(-dt / C.t); D.coupC = Math.exp(-dt / C.carapaceT); D.ric = Math.exp(-dt / .15); D.recul = Math.exp(-dt / RZ_REGL.pilonneur.reculT);
}
// Suivi d'un zombie vu (continu : il était déjà vu à l'image d'avant ; sinon on repart de son état, sans effet)
function rzEtat(z, st, dt, continu){
  const gp = z.g.position, x = gp.x, y = gp.z, D = RZ_D;
  if (z.dead){ st.px = x; st.pz = y; st.mt = RZ.t - st.mt0; return; }
  const hp = z.hp, atk = z.atkT;
  if (!continu){ st.px = x; st.pz = y; st.pv = hp; st.atkT = atk; st.v = 0; st.frappe = 9; st.leve = 0; st.coup = 0; return; }
  if (dt > 0){
    const dx = x - st.px, dz = y - st.pz; let v = Math.sqrt(dx * dx + dz * dz) / dt; if (v > 30) v = 30;
    st.v += (v - st.v) * D.v; st.mv += ((st.v > st.seuil ? 1 : 0) - st.mv) * D.m;
  }
  st.px = x; st.pz = y;
  // Coup reçu : la vie a baissé
  if (hp < st.pv - 1e-6 && dt > 0){ const C = RZ_REGL.coup, k = Math.min(1, Math.max(C.min, C.k * (st.pv - hp) / st.maxHp)); if (k > st.coup) st.coup = k; }
  st.pv = hp;
  if (dt > 0){
    if (st.coup){ st.coup *= st.rm === 'carapace' ? D.coupC : D.coup; if (st.coup < .01) st.coup = 0; }
    if (st.ric){ st.ric *= D.ric; if (st.ric < .01) st.ric = 0; }
    if (st.recul){ st.recul *= D.recul; if (st.recul < .01) st.recul = 0; }
    // Frappe : z.atkT remonte au moment du coup (le jeu vient de frapper) ; il descend pendant l'approche du coup suivant
    let lv = 0;
    if (st.mv < .3 && atk !== st.atkT){
      const T = z.rtsTgt, bat = !!T && !T.dead, F = RZ_REGL.frappe;
      if (bat && atk > st.atkT + .3) st.frappe = 0;
      if (bat && atk < st.atkT && atk < F.avant) lv = 1 - Math.max(0, atk) / F.avant;
    }
    st.frappe += dt;
    if (lv || st.leve){ st.leve += (lv - st.leve) * D.leve; if (st.leve < .005) st.leve = 0; }
    if (st.rm === 'pilonneur') st.cale += ((z.rmEtat === 'plante' ? 1 : 0) - st.cale) * D.cale;
  }
  st.atkT = atk;
}
// Pose d'un zombie vivant : allure, frappe, sursaut, sortie de terre
function rzPoseVivant(z, st, far){
  const gp = z.g.position, sc = z.g.scale.y || 1, R = RZ_REGL, A = st.A, rm = st.rm, lacet = far ? 0 : z.g.rotation.y;
  const ph = z.phase || 0, s = Math.sin(ph), m = st.mv;
  let pe = A.penche * m + Math.abs(s) * A.tangue * m - (rm === 'carapace' ? 0 : st.coup * R.coup.penche);
  let ro = s * A.roulis * (.35 + .65 * m);
  let sxz = 1, sy = 1, dy = Math.abs(Math.cos(ph)) * A.rebond * sc * m, dx = 0, dz = 0;
  if (A.gonfle){ const g = Math.sin(RZ.t * 3.1 + st.h * 6) * A.gonfle; sxz += g; sy -= g * .6; }
  // Frappe : élan vers l'avant au coup, recul pendant la levée
  const F = R.frappe;
  if (st.frappe < F.t){ const k = st.frappe / F.t, e = Math.sin(Math.PI * Math.min(1, k * 1.4)); pe += F.elan * e; const av = F.avance * sc * e; dx += Math.sin(lacet) * av; dz += Math.cos(lacet) * av; }
  pe -= st.leve * F.elan * .35;
  // Carapace : elle encaisse (se tasse), petit tremblement au ricochet
  if (rm === 'carapace'){ const t = st.coup * R.coup.tasse; sy -= t; sxz += t * .5; ro += Math.sin(RZ.t * 70) * .05 * Math.max(st.ric, st.coup); }
  // Pilonneur : calé quand il s'enracine, recul à chaque crachat
  if (rm === 'pilonneur'){ const P = R.pilonneur; dy -= P.cale * st.cale * sc; sy -= P.tasse * st.cale; pe -= P.recul * st.recul; }
  const so = RZ.t - st.sortie0;
  if (so < R.sortie.t){ const k = Math.max(0, so) / R.sortie.t, e = 1 - Math.pow(1 - k, 3); dy -= R.sortie.prof * sc * (1 - e); pe += (1 - e) * .5; }
  if (rzEstId(pe, ro, sxz, sy, dx, dy, dz)) return false; // rien à corriger
  rzAffine(RZ_W, lacet, pe, ro, sxz, sy, gp.x, gp.y, gp.z, dx, dy, dz);
  return true;
}
// Pose d'un zombie mort : la chute choisie, figé sous la Tesla, recroquevillé dans le feu
function rzPoseMort(z, st, far){
  const R = RZ_REGL.mort, gp = z.g.position, sc = z.g.scale.y || 1;
  let th = null, phi = 0, pe = 0, ro = 0, sy = 1, sxz = 1;
  const t = st.mt;
  if (st.mk === 'tesla'){
    if (t < R.tesla){ th = 0; const j = (Math.floor(RZ.t * 40) % 2 ? 1 : -1) * .07; pe = j; ro = -j * .7; }
    else th = -Math.min(1, (t - R.tesla) / R.teslaChute) * Math.PI / 2;
  } else if (st.mk === 'brule'){
    const k = Math.min(1, t / 1.2); th = k * k * 1.25; sy = 1 - .15 * Math.min(1, t * 3); sxz = 1 + .05 * Math.min(1, t * 3);
  } else if (st.mk === 'eclate'){ th = 0; }                            // debout jusqu'à l'arrivée de l'obus
  else if (st.mk === 'tombe'){
    const k = Math.min(1, t / R.chute), e = k < 1 ? 1 - Math.pow(1 - k, 2) * (1 - 2.2 * k * (1 - k)) : 1; // un petit rebond à la fin
    if (st.var === 1) th = e * 1.4; else if (st.var === 2){ th = 0; phi = st.cote * e * 1.45; }
  }
  const body = z.body;
  if (th !== null && !far && body && body !== z.g){
    // F = G·T(b)·Rx(th)·Rz(phi)·Rx(-th du jeu)·T(-b)·G⁻¹ : la chute du jeu remplacée par la mienne (seulement au dessin)
    const b = body.position;
    RZ_MB.copy(z.g.matrixWorld); RZ_Q2.makeTranslation(b.x, b.y, b.z); RZ_MB.multiply(RZ_Q2); RZ_MBI.copy(RZ_MB).invert();
    RZ_Q.makeRotationX(th); if (phi){ RZ_Q2.makeRotationZ(phi); RZ_Q.multiply(RZ_Q2); } RZ_Q2.makeRotationX(-body.rotation.x); RZ_Q.multiply(RZ_Q2);
    RZ_MB.multiply(RZ_Q).multiply(RZ_MBI); rzDeMat4(RZ_MB, RZ_F);
    if (pe || ro || sy !== 1){ rzAffine(RZ_T, z.g.rotation.y, pe, ro, sxz, sy, gp.x, gp.y, gp.z, 0, 0, 0); rzCompose(RZ_T, RZ_F, RZ_W); }
    else for (let i = 0; i < 12; i++) RZ_W[i] = RZ_F[i];
    return true;
  }
  if (sy !== 1 || pe || ro){ rzAffine(RZ_W, far ? 0 : z.g.rotation.y, pe, ro, sxz, sy, gp.x, gp.y, gp.z, 0, -(1 - sy) * .2 * sc, 0); return true; }
  return false;
}
// Couleurs d'instance : charbon (feu, après la Tesla), éclair violet (Tesla)
const RZ_COL = [1, 1, 1];
function rzCouleur(st){
  const C = RZ_REGL.couleurs, R = RZ_REGL.mort, t = st.mt; let w = 0, c = null;
  if (st.mk === 'brule'){ w = Math.min(1, t / R.brule); c = C.charbon; }
  else if (st.mk === 'tesla'){ if (t < R.tesla){ w = Math.floor(RZ.t * 30) % 2 ? .85 : .45; c = C.tesla; } else { w = .55; c = C.charbon; } }
  if (c){ RZ_COL[0] = c[0]; RZ_COL[1] = c[1]; RZ_COL[2] = c[2]; }
  return w;
}
function rzFlammes(z, st, dt){
  const P = rzPart(); if (!P || dt <= 0) return;
  const gp = z.g.position, sc = z.g.scale.y || 1, t = st.mt, R = RZ_REGL.mort;
  if (st.mk === 'brule'){
    if (t < R.braise && rzHasard() < dt * (isTouch ? 14 : 26)) rfxP(P.glow, gp.x + rzR(-.4, .4) * sc, rzR(.2, 1.3) * sc, gp.z + rzR(-.4, .4) * sc, rzR(-.3, .3), rzR(1.5, 3), rzR(-.3, .3), rzR(.35, .6), rzR(.9, 1.5) * sc, .3, RV_FUM.feu, RV_FUM.braise, .9, -2);
    if (t > .4 && t < 2.6 && rzHasard() < dt * (isTouch ? 3 : 6)) rfxP(P.soft, gp.x, .8 * sc, gp.z, RV_REGL.vent.x * .5, rzR(1, 1.8), RV_REGL.vent.z * .5, rzR(1.6, 2.4), .8 * sc, 2.4 * sc, RV_FUM.noire, RV_FUM.grise, .45, 0, .2);
  } else if (st.mk === 'tesla' && t < R.tesla){
    if (rzHasard() < dt * (isTouch ? 16 : 30)) rfxP(P.glow, gp.x + rzR(-.5, .5) * sc, rzR(.3, 1.9) * sc, gp.z + rzR(-.5, .5) * sc, rzR(-3, 3), rzR(0, 3), rzR(-3, 3), rzR(.12, .25), rzR(.5, .9), .1, [.85, .7, 1], [.5, .3, 1], 1, 6);
  }
}
function rzZombies(dt, fige, depart){
  const Z = zombies, L = zbList, R = RZ_REGL, V = RZ.vis, VS = RZ.visSt, F = RZ.frame = (RZ.frame + 1) | 0;
  if (RZ.cnt.length < L.length) RZ.cnt = new Int32Array(L.length * 2);
  const cnt = RZ.cnt; cnt.fill(0, 0, L.length);
  // 1. Les places dans les lots, comme zInstSync les a remplies (même parcours, mêmes morceaux sautés) ; les zombies vus
  let c = 0, nv = 0;
  for (let i = 0; i < Z.length; i++){
    const z = Z[i], I = z.inst; if (!I) continue;
    const g = z.g; if (!g.visible) continue;
    let st = RZ.st.get(z);
    if (!st){ st = rzNouveau(z); RZ.st.set(z, st); if (!depart && !z.dead){ st.sortie0 = RZ.t; st.poussiere = true; } }
    if (st.inst !== I) rzPrep(z, st);
    const far = !!z._rel, vu = nv < R.max && rzVisible(g.position, g.scale.y || 1);
    if (vu || st.lent || z.headGone){ // morceau par morceau (places retenues pour les zombies corrigés)
      if (c + I.length > RZ.slots.length){ const s = new Int32Array(RZ.slots.length * 2); s.set(RZ.slots); RZ.slots = s; }
      const bi = st.bi, sl = RZ.slots; st.s0 = c; st.far = far;
      for (let k = 0; k < I.length; k++){ const e = I[k]; sl[c++] = (!e.m.visible || (far && e.small)) ? -1 : cnt[bi[k]]++; }
    } else { const P = far ? st.lotsF : st.lotsN; for (let k = 0; k < P.length; k += 2) cnt[P[k]] += P[k + 1]; } // vite : seulement le compte par lot
    if (vu){ V[nv] = z; VS[nv++] = st; rzEtat(z, st, dt, st.vuF === F - 1); st.vuF = F; }
  }
  for (let i = nv; i < V.length && V[i]; i++){ V[i] = null; VS[i] = null; } // pas de zombie retenu d'une image à l'autre
  for (let i = 0; i < L.length; i++) if (cnt[i] !== L[i].n){ RZ.decale++; return 0; } // le compte ne tombe pas juste : rien cette image
  // 2. Corrections des zombies vus
  for (let j = 0; j < nv; j++){
    const z = V[j], st = VS[j], I = z.inst, far = st.far, sc = z.g.scale.y || 1;
    if (z.dead){
      if (st.mk === 'feu?'){ st.mk = z.burnT > 0 ? 'brule' : 'tombe'; RZ.morts[st.mk]++; }
      else if (st.mk === ''){ st.mk = 'tombe'; RZ.morts.tombe++; } // tué sans que je l'aie vu (interrupteur remis)
      else if (st.mk === 'tesla' && !st.compte){ st.compte = true; RZ.morts.tesla++; }
      if (st.mk === 'parti') continue;
      if (st.mk === 'eclate' && !st.cache && !fige){
        const pret = !st.pj || typeof RFX !== 'object' || RFX.pj.indexOf(st.pj) < 0 || st.mt > R.mort.attente;
        if (pret){ if (RZ.tok >= 1){ RZ.tok--; rzEclate(z, st, I, st.s0, far); } else { st.mk = 'tombe'; st.var = 0; RZ.morts.tombe++; } }
      }
    }
    if (st.poussiere && !fige){ st.poussiere = false; const P = rzPart(); if (P) for (let q = 0; q < 3; q++) rfxP(P.soft, z.g.position.x + rzR(-.6, .6), .3, z.g.position.z + rzR(-.6, .6), rzR(-1, 1), rzR(.6, 1.4), rzR(-1, 1), rzR(.8, 1.2), 1 * sc, 2.4 * sc, RV_FUM.sable, RV_FUM.sableC, .55, 0, 1); }
    // Caché (éclaté) : ses copies sont aplaties à rien
    if (st.cache){ for (let k = 0; k < I.length; k++){ const sl = RZ.slots[st.s0 + k]; if (sl < 0) continue; const a = L[st.bi[k]].im.instanceMatrix.array; a.fill(0, sl * 16, sl * 16 + 16); } RZ.corriges++; continue; }
    if (z.dead) rzFlammes(z, st, dt);
    const pose = z.dead ? rzPoseMort(z, st, far) : rzPoseVivant(z, st, far);
    // Bras : levés puis abattus pour frapper (épaule = origine du premier maillage du bras, avant toute correction)
    let bras = false;
    if (!z.dead && (st.leve > .01 || st.frappe < R.frappe.t) && (st.bras[0] >= 0 || st.bras[1] >= 0)){
      const Fr = R.frappe, k = st.frappe / Fr.t;
      const ang = -st.leve * Fr.leve + (st.frappe < Fr.t ? (k < .3 ? -Fr.leve + (Fr.abat + Fr.leve) * k / .3 : Fr.abat * (1 - (k - .3) / .7)) : 0);
      const kb = st.bras[0] >= 0 ? st.bras[0] : st.bras[1], sl = RZ.slots[st.s0 + kb];
      if (sl >= 0 && ang){ const a = L[st.bi[kb]].im.instanceMatrix.array, o = sl * 16; rzAxeX(RZ_A, far ? 0 : z.g.rotation.y, ang, a[o + 12], a[o + 13], a[o + 14]); bras = true; }
      // (les deux épaules sont à la même hauteur et sur l'axe x du zombie : une seule rotation sert aux deux bras)
    }
    const col = z.dead ? rzCouleur(st) : 0;
    if (!pose && !bras && !col) continue;
    if (bras && pose) rzCompose(RZ_W, RZ_A, RZ_T);
    const C = RZ_COL;
    for (let k = 0; k < I.length; k++){
      const sl = RZ.slots[st.s0 + k]; if (sl < 0) continue;
      const b = L[st.bi[k]], o = sl * 16;
      if (bras && st.part[k]) rzAppli(b.im.instanceMatrix.array, o, pose ? RZ_T : RZ_A);
      else if (pose) rzAppli(b.im.instanceMatrix.array, o, RZ_W);
      if (col && b.col){ const ca = b.im.instanceColor.array, q = sl * 3; ca[q] += (C[0] - ca[q]) * col; ca[q + 1] += (C[1] - ca[q + 1]) * col; ca[q + 2] += (C[2] - ca[q + 2]) * col; }
    }
    RZ.corriges++;
  }
  return nv;
}

/* ---------- Création, partie neuve, départ ---------- */
function rzCreer(){
  RZ.root = new THREE.Group(); RZ.root.name = 'rzRoot'; scene.add(RZ.root);
  const N = RZ_REGL.morceaux.cap;
  const im = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshLambertMaterial({ color:0xffffff }), N);
  im.instanceMatrix.setUsage(THREE.DynamicDrawUsage); im.setColorAt(0, new THREE.Color(1, 1, 1)); im.instanceColor.setUsage(THREE.DynamicDrawUsage);
  im.count = 0; im.visible = false; im.frustumCulled = false; im.name = 'rzMorceaux'; RZ.root.add(im); RZ.im = im;
  RZ.morceaux = []; for (let i = 0; i < N; i++) RZ.morceaux.push({ on:false, t:0, T:1, x:0, y:0, z:0, vx:0, vy:0, vz:0, rx:0, ry:0, wx:0, wy:0, s:.3, r:1, g:1, b:1, sol:false });
  if (typeof rznCreer === 'function') rznCreer();
  RZ.pret = true;
}
function rzNouvelle(){
  RZ.st = new WeakMap(); RZ.depart = true; RZ.tok = RZ_REGL.mort.eclats * .5;
  RZ.morceaux.forEach(o => { o.on = false; }); if (RZ.im){ RZ.im.count = 0; RZ.im.visible = false; }
  if (typeof rznNouvelle === 'function') rznNouvelle();
}
function rzQuitter(){
  RZ.actif = false; RZ.monde = null;
  if (typeof rznQuitter === 'function') rznQuitter();
  if (!RZ.pret) return;
  RZ.morceaux.forEach(o => { o.on = false; }); RZ.im.count = 0; RZ.im.visible = false; RZ.root.visible = false;
  RZ.st = new WeakMap(); RZ.vis.length = 0; RZ.visSt.length = 0;
}
function rzCouper(){ if (RZ.actif) rzQuitter(); }

/* ---------- Chaque image ---------- */
function rzImage(dt){
  const t0 = performance.now();
  if (!RZ_REGL.on || typeof RTS !== 'object' || !RTS.on || !world){ if (RZ.actif) rzQuitter(); return; }
  if (!RZ.pret) rzCalme(rzCreer);
  if (!RZ.actif){ RZ.actif = true; RZ.root.visible = true; RZ.depart = true; }
  if (RZ.monde !== world){ RZ.monde = world; rzNouvelle(); }
  const fige = RTS.paused || state !== 'rts';
  dt = fige ? 0 : Math.min(dt || 0, .1);
  RZ.t += dt; RZ.tok = Math.min(RZ_REGL.mort.eclats * .5, RZ.tok + RZ_REGL.mort.eclats * dt);
  const depart = RZ.depart; RZ.depart = false;
  rzVoir();
  if (typeof rznImage === 'function') rznImage(dt, depart);
  rzFacteurs(dt);
  RZ.vus = rzZombies(dt, fige, depart);
  rzMorceaux(dt);
  const ms = performance.now() - t0; RZ.temps.ms += ms; RZ.temps.n++; if (ms > RZ.temps.max) RZ.temps.max = ms;
}
Jeu.on('image', dt => { try { rzImage(dt); } catch (e) { errNote(e); } });
Jeu.on('tue', (z, was) => { try { rzTue(z, was); } catch (e) { errNote(e); } });
// Moments des monstres (js/74-rts-monstres.js) : la Carapace qui encaisse un ricochet, le Pilonneur qui crache
Jeu.on('monstre', (quoi, z) => {
  try {
    if (!RZ.actif || !z) return; const st = RZ.st.get(z); if (!st) return;
    if (quoi === 'carapace-ricochet') st.ric = 1; else if (quoi === 'pilonneur-tir') st.recul = 1;
  } catch (e) { errNote(e); }
});

// Accès pour les tests automatiques
window.__rtsZAnim = {
  RZ, RZ_REGL, rzImage, rzQuitter, rzCouper, rzAffine, rzAppli,
  etat: z => RZ.st.get(z) || null,
  // Places d'un zombie dans les lots d'instances à la dernière image : [{ k, im, s }] (k : son morceau dans z.inst)
  places(z){ const st = RZ.st.get(z); if (!st || !z.inst) return []; const out = []; for (let k = 0; k < z.inst.length; k++){ const s = RZ.slots[st.s0 + k]; if (s >= 0) out.push({ k, im:zbList[st.bi[k]].im, s }); } return out; },
  compte(){ let m = 0; RZ.morceaux.forEach(o => { if (o.on) m++; }); return { actif:RZ.actif, morceaux:m, vus:RZ.vus || 0, decale:RZ.decale, morts:Object.assign({}, RZ.morts), nids:typeof RZN === 'object' ? RZN.m.size : 0 }; },
  temps(){ const T = RZ.temps; return { moy:T.n ? T.ms / T.n : 0, max:T.max, n:T.n }; },
  tempsZero(){ RZ.temps.ms = 0; RZ.temps.n = 0; RZ.temps.max = 0; }
};
