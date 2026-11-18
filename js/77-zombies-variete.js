'use strict';
/* ================= Zombies moins pareils sur le toit (dossier 124, visuel seulement) ================= */
// Déjà là avant (07-zombies.js) : 12 tenues tirées selon la ville (TENUES, VILLE_TENUES), nuance de peau et de vêtements
// par instance (zTeinte), petites proportions au hasard (largeur, taille, tête, bras), pose des bras par zombie (zBras).
// Ce fichier ajoute, seulement aux zombies ordinaires (marcheur, coureur, costaud) du toit :
//   - palette de vêtements par ville pour la tenue « Civil » (terre au village, pyjamas en banlieue de nuit, complets
//     gris au centre-ville, bleu de travail et cirés au port, combinaisons de travail à la Centrale, avec mains et
//     parfois un masque respiratoire) ;
//   - cheveux (6 couleurs) ou tuque sur les têtes nues, taches de sang ou de crasse, bedaine chez quelques-uns.
// Abandonné : démarches propres (boiter, bras ballants, pas plus ou moins amples). Bras et jambes sont des cibles : les
// bouger autrement change quels tirs touchent (empreinte du duel du simulateur changée). Les bras varient déjà (zBras).
// Rien ne change au jeu :
//   - les couleurs passent par la couleur d'instance (aucun matériau de plus) ; les morceaux ajoutés sont des cubes
//     unité (ZV_GEO) avec un matériau déjà partagé : tous dans UN lot d'instances, créé au chargement (1 appel de dessin) ;
//   - les morceaux ajoutés ne sont pas des cibles (ni dans z.meshes, ni dans hitMeshes) et sont posés APRÈS le calcul
//     de la boîte de tir du type (zBoxFor) : boîtes de tir, tête et maillages touchés gardent leur taille et leur place ;
//   - aucun tirage dans Math.random : générateur à part, semé sur le numéro du zombie ; pendant la création des
//     morceaux (Three.js tire 4 nombres pour l'identifiant de chaque objet), Math.random est prêté à un autre générateur ;
// Seulement sur le toit (aucun mode actif) : le robot et le RTS gardent leurs zombies tels quels.
// Branchements (protégés par typeof), dans spawnZombie (js/07-zombies.js) : zvHabiller avant le rendu par instances,
// zvTeindre après.
// ZV_REGL.on = false : comme avant (comparaison, captures).

const ZV_REGL = {
  on: true,
  types: { walker:1, runner:1, brute:1 },          // les spéciaux (18, 19, 35, 63, 71) restent tels quels
  cheveux: .72,                                     // part des têtes nues qui ont des cheveux
  tuque: .12,                                       // part des têtes nues avec une tuque (avant les cheveux)
  taches: .5, taches2: .2,                          // une tache, une deuxième
  bedaine: .18,                                     // marcheurs et costauds seulement
  civil: .85,                                       // part des « Civil » qui prennent la palette de la ville
  combi: .7, masque: .35                            // Centrale : combinaison (sur les « Civil » de la palette), masque respiratoire
};
// Couleurs de cheveux, de tuques et de taches (données brutes : pas de nuance de vêtement)
const ZV_CHEVEUX = [0x17120e, 0x2e2016, 0x4a3420, 0x8a7448, 0x7a7670, 0x7a3a1e];
const ZV_TUQUES = [0x2b2b33, 0x5a1e1a, 0x24303a, 0x3a4a2e, 0x6a5a40];
const ZV_TACHES = [0x4a0c08, 0x3a0a06, 0x2c2218];
// Palettes de la tenue « Civil » par ville : chemises et pantalons ; combi : couleurs de combinaison (une pièce)
const ZV_VILLES = {
  village:  { chemises:[0x6a4a2e, 0x4b5a3a, 0x7a6a48, 0x5a3a30, 0x3e4a3e, 0x8a7a5a], pantalons:[0x3a3226, 0x2e3a4a, 0x4a4236, 0x2b2b33] },
  ville:    { chemises:[0x6a2e3a, 0x2e5a6a, 0x8a7a30, 0x5b3a2e, 0x3d4a5c, 0x7a7a72], pantalons:[0x24303a, 0x2b2b33, 0x4a4236, 0x3a3a44] },
  banlieue: { chemises:[0x8a96a8, 0xa88a8a, 0x8aa08a, 0x9a9a7a, 0x6a6a8a, 0xb0a890], pantalons:[0x5a6a8a, 0x6a5a6a, 0x4a5a4a, 0x8a8a90] }, // pyjamas, peignoirs
  centre:   { chemises:[0x9aa2ac, 0xa8a49a, 0x6a7a90, 0x4a4a52, 0x8a8478, 0x5a5a62], pantalons:[0x2b2b33, 0x3a3a44, 0x4a4a52, 0x24303a] },
  port:     { chemises:[0x2e4258, 0x3a4a5a, 0x5a3a2e, 0x4a4a3a, 0x24303a], pantalons:[0x24303a, 0x2b2b33, 0x3a3226], combi:[0x2e4258, 0xb89a28], combiPart:.4 }, // bleu de travail, ciré jaune
  centrale: { chemises:[0x5a6248, 0x4a5258, 0x6a6a5a], pantalons:[0x2b2b33, 0x3a3a44], combi:[0xd8782a, 0xc8b848, 0xb8b8a8, 0x6a7a8a, 0xd8782a] }
};

/* ---------- Hasard à part (jamais Math.random) ---------- */
function zvRng(seed){
  let s = (seed ^ 0x9e3779b9) >>> 0;
  return () => { s = (s + 0x6d2b79f5) >>> 0; let t = s; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}
let zvPret = zvRng(12345); // prêté à Math.random pendant la création des morceaux (identifiants Three.js)
function zvCalme(fn){ const R = Math.random; Math.random = zvPret; try { return fn(); } finally { Math.random = R; } }
const zvPick = (r, a) => a[Math.floor(r() * a.length) % a.length];
// Un cube unité à part et son lot d'instances, créés au chargement (sans tirage) : les lots de 07-zombies.js sont créés
// la première fois qu'on en a besoin, et chaque création tire 4 nombres ; si nos morceaux allaient dans le lot des
// accessoires (ZG.box), il serait créé plus tôt et toute la suite du hasard changerait. Le lot grandit d'avance (zvPlace),
// jamais pendant le rendu (zGrow tire aussi).
const ZV_GEO = zvCalme(() => new THREE.BoxGeometry(1, 1, 1));
const ZV_LOT = zvCalme(() => zBatch(ZV_GEO, zmat(ZC.noir)));
function zvPlace(){
  let n = 0; for (let i = 0; i < zombies.length; i++) if (zombies[i].zv) n += zombies[i].zv.n || 0;
  while (ZV_LOT.cap < n + 48) zvCalme(() => zGrow(ZV_LOT));
}
const zvToit = () => !(typeof Jeu !== 'undefined' && Jeu.actif && Jeu.actif());

/* ---------- Habillage : avant le rendu par instances (spawnZombie) ---------- */
// Un morceau : cube unité, matériau partagé déjà existant (le lot d'instances des accessoires) ; la vraie couleur
// est donnée par userData.zvCol (zvTeindre) ; brut : sans la nuance de vêtement du zombie.
function zvBoite(par, mat, sx, sy, sz, x, y, z, col, brut, petit){
  const m = new THREE.Mesh(ZV_GEO, mat); m.scale.set(sx, sy, sz); m.position.set(x, y, z);
  m.userData.zvCol = col; m.userData.zvAjout = true; if (brut) m.userData.zvBrut = true; if (petit) m.userData.zsmall = true;
  par.add(m); if (zvCur) zvCur.n++; return m;
}
let zvCur = null;
function zvHabiller(z, R){
  if (!ZV_REGL.on || !z || !R || !ZV_REGL.types[z.type] || !R.tenue || !R.head || !zvToit()) return;
  const r = zvRng((z.uid + 1) * 2654435761), L = typeof curLoc !== 'undefined' ? curLoc : null, V = ZV_VILLES[L && L.id] || null;
  const M = zmat(ZC.noir), d = z.zv = { n:0 };
  zvCur = d;
  zvCalme(() => {
    const head = R.head, torso = R.parts && R.parts[0];
    // Palette de la ville pour la tenue « Civil » (chemise : torse ; pantalon : jambes)
    if (V && R.tenue === 'civil' && torso && r() < ZV_REGL.civil){
      const combi = V.combi && r() < (V.combiPart || ZV_REGL.combi);
      const ch = combi ? zvPick(r, V.combi) : zvPick(r, V.chemises), pa = combi ? ch : zvPick(r, V.pantalons);
      torso.userData.zvCol = ch;
      if (R.legL) R.legL.userData.zvCol = pa; if (R.legR) R.legR.userData.zvCol = pa;
      if (combi){
        // Manches et mains ; la Centrale : parfois un masque respiratoire (sous les yeux : ils restent visibles)
        const sk = R.g.userData.zPeau;
        [R.armL, R.armR].forEach(ar => { if (!ar) return; ar.userData.zvCol = ch; zvBoite(ar, sk || M, .15, .13, .15, 0, -.76, 0, null, false, true); });
        if (L.id === 'centrale' && r() < ZV_REGL.masque){
          zvBoite(head, M, .3, .14, .06, 0, -.1, .215, 0x2a2c2e, true, true);
          zvBoite(head, M, .1, .1, .1, 0, -.12, .27, 0x4a4c48, true, true);
        }
      }
    }
    // Têtes nues (seulement les yeux comme enfants) : tuque ou cheveux
    if (head.children.length <= 1){
      const t = r();
      if (t < ZV_REGL.tuque) zvBoite(head, M, .44, .14, .44, 0, .25, 0, zvPick(r, ZV_TUQUES), false);
      else if (t < ZV_REGL.tuque + ZV_REGL.cheveux){
        const c = zvPick(r, ZV_CHEVEUX), ep = .06 + r() * .08;
        zvBoite(head, M, .43, ep, .43, 0, .21 + ep / 2 - .02, -.005, c, true);
        if (r() < .7) zvBoite(head, M, .43, .2 + r() * .12, .07, 0, .08, -.19, c, true, true); // derrière la tête
      }
    }
    // Taches de sang ou de crasse sur le devant (petites : pas dessinées de loin)
    if (torso && r() < ZV_REGL.taches){
      zvBoite(torso, M, .1 + r() * .14, .08 + r() * .16, .02, (r() - .5) * .42, (r() - .5) * .5, .176, zvPick(r, ZV_TACHES), true, true);
      if (r() < ZV_REGL.taches2 && R.legL) zvBoite(r() < .5 ? R.legL : R.legR, M, .16, .12 + r() * .14, .02, 0, -.3 - r() * .3, .125, zvPick(r, ZV_TACHES), true, true);
    }
    // Bedaine : devant le torse, couleur de la chemise (pas une cible : le rayon touche le torse juste derrière).
    // Jamais sur une chemise à motif : son lot d'instances (cube + texture) serait créé à part.
    const sh = torso && torso.material;
    if (sh && !sh.map && sh.color && z.type !== 'runner' && R.tenue !== 'mariee' && r() < ZV_REGL.bedaine)
      zvBoite(torso, M, .5, .34, .1, 0, -.2, .2, torso.userData.zvCol != null ? torso.userData.zvCol : sh.color.getHex(), false);
  });
  zvCur = null;
  zvPlace();
}

/* ---------- Couleurs : après le rendu par instances (spawnZombie) ---------- */
// Même recette que zInstPrep (07-zombies.js) pour un vêtement : nuance de gris sale et clarté du zombie
function zvTeindre(z){
  if (!z || !z.inst || !z.zv) return;
  const t = zTeinte(z.uid || 0), I = z.inst;
  for (let k = 0; k < I.length; k++){
    const e = I[k], u = e.m.userData; if (u.zvCol == null || !e.b.col) continue;
    const h = u.zvCol, cr = (h >> 16 & 255) / 255, cg = (h >> 8 & 255) / 255, cb = (h & 255) / 255;
    if (u.zvBrut){ e.r = cr; e.g = cg; e.bl = cb; continue; }
    const gr = (cr + cg + cb) / 3 * .8;
    e.r = (cr + (gr - cr) * t.hs) * t.hk; e.g = (cg + (gr - cg) * t.hs) * t.hk; e.bl = (cb + (gr - cb) * t.hs) * t.hk;
  }
}

// Accès pour les tests automatiques
window.__zv = { ZV_REGL, ZV_VILLES, zvRng, zvHabiller, zvTeindre, zvToit, get ZV_LOT(){ return ZV_LOT; } };
