'use strict';
/* ================= RTS : trois monstres à parade (dossier 122) ================= */
// Dans le RTS, le danger montait surtout par le nombre et la force des zombies ordinaires. Ces trois monstres demandent
// chacun une réponse précise du joueur, avec ses outils de toujours :
//   sapeur    (Sapeur)    : coureur fragile, un gros sac de poudre orange sur le dos. Il ignore les unités et court droit sur
//                           une tourelle (ligne rouge au sol jusqu'à elle, anneau rouge sous la tourelle visée). Au premier
//                           bâtiment touché, il saute : gros dégâts aux bâtiments autour (de quoi raser une tourelle neuve),
//                           un peu aux unités. Parade : l'abattre avant (des mitrailleurs devant les tourelles : les tourelles
//                           seules n'y suffisent pas) ou lui mettre une barricade (60 $) sur le chemin : il saute dessus.
//                           Abattu, son sac saute là où il tombe et blesse les zombies autour (ni les bâtiments, ni les autres sapeurs).
//   pilonneur (Pilonneur) : gros sac à racines, une gueule verte pointée vers le ciel. Il marche vers la base, s'enracine
//                           à RM_REGL.pilonneur.portee m du bâtiment le plus proche (hors de portée des tourelles, même au
//                           niveau 6) et lance des boules d'acide en cloche sur ce bâtiment (cercle rouge au sol pendant le
//                           vol). Parade : aller le chercher : tireur d'élite (portée 42 m, il vise les plus gros),
//                           tourelle mortier (44 m), une troupe envoyée sur lui, ou piloter une unité.
//   carapace  (Carapace)  : bête basse sous une coque bleu acier à bande jaune. Les balles et les rayons ricochent (ils ne
//                           font que RM_REGL.carapace.balles des dégâts) ; elle frappe comme un costaud. Parade : explosifs
//                           ou feu (lance-roquettes, mortier, tank, Apache et ses Hellfire, lance-flammes, Tesla).
// Début de partie inchangé : aucun monstre avant un seuil de menace ET de temps (RM_REGL.plan ; temps plus courts dans les
// vallées suivantes, RM_REGL.valTemps). Avant le seuil, ce fichier ne tire jamais dans Math.random (le simulateur à graine
// fixée garde la même partie) ; son propre hasard (rmR) sert au visuel.
// Ils remplacent un zombie du flot (nids, hordes, sièges, ponte de la Ruche) : le total ne change pas et le plafond de
// zombies (500 ordi, 300 cell) est respecté (rtsSpawnAt, js/42-rts-combat.js, demande rmChoix).
// Première rencontre : bandeau qui dit la parade, une fois par profil (P.rmVus) ; ensuite un petit message.
// Moments annoncés par Jeu.emit('monstre', quoi, z) : 'sapeur-cible', 'sapeur-boum', 'sapeur-abattu', 'pilonneur-plante',
// 'pilonneur-tir', 'pilonneur-impact', 'carapace-ricochet' (les écouteurs du toit et du robot les ignorent).
// Sons par les moyens existants de js/69-rts-sons.js : explosions (rtsSonBoom, par rtsFxBlast), crachat (rtsSonCrachat),
// ricochet (rsJouer, famille « mitrailleuse », donc son plafond de voix). Le mixage ne change pas.
// Style Amélioré (js/72-rts-style.js) : ce sont des zombies (spawnZombie), leurs ombres viennent de styleOmbresZombies ;
// les repères au sol sont des matériaux simples qui ne font pas d'ombre.
// Branchements (appels protégés par typeof) : rtsSpawnAt, rtsZombies et rtsHit (js/42-rts-combat.js), mini-carte
// (js/49-rts-commandement.js). Le reste par Jeu.on('image') et Jeu.on('tue').

/* ---------- Données ---------- */
Object.assign(ZTYPES, {
  sapeur:    { name:'Sapeur',    hp:80,  speed:4.8, dmg:6,  reward:40,  scale:1.25, skin:0x8a6a4a },
  pilonneur: { name:'Pilonneur', hp:300, speed:1.6, dmg:10, reward:120, scale:2.3,  skin:0x5e6a3a },
  carapace:  { name:'Carapace',  hp:380, speed:1.3, dmg:18, reward:150, scale:1.9,  skin:0x4a6a9a }
});
Object.assign(ZXP, { sapeur:6, pilonneur:30, carapace:35 });
try { if (typeof SCRAP_Z === 'object') Object.assign(SCRAP_Z, { sapeur:1.5, pilonneur:6, carapace:7 }); } catch (e) { errNote(e); }
const RM_TYPES = ['sapeur', 'pilonneur', 'carapace'];
const RM_REGL = {
  // Seuils de la vallée 1 : menace ET secondes de jeu (les deux). tous : secondes entre deux paquets ; paquet : taille au
  // seuil, +1 par « plus » points de menace au-delà, paquetMax au plus ; max : en vie à la fois ; premier : délai du 1er paquet
  plan: {
    sapeur:    { menace:9,  temps:600, tous:50, paquet:2, plus:8, paquetMax:4, max:6, premier:4 },
    pilonneur: { menace:12, temps:780, tous:100, paquet:1, plus:10, paquetMax:2, max:2, premier:4 },
    carapace:  { menace:15, temps:960, tous:70, paquet:1, plus:8, paquetMax:3, max:3, premier:4 }
  },
  valTemps: [1, .6, .45],   // secondes des seuils × cette part en vallée 1, 2, 3 et plus
  vue: 60,                  // annonce quand un monstre arrive à moins de (rayon de la base + vue) m du QG
  // Sapeur : souffle contre les bâtiments (× dégâts de la menace à la puissance RTS_REGL.bat.batPow), rayon (m), part du
  // souffle pour les unités, contact (m du bord d'un bâtiment), nouveau choix de cible (s), abattu : rayon et dégâts aux
  // zombies (× sa vie de départ)
  sapeur: { souffle:420, rayon:6, unites:.3, contact:1.2, choix:1, abattuR:4.5, abattuK:3 },
  // Pilonneur : distance au bord du bâtiment visé (m), temps entre deux tirs (s), vol (s), rayon (m), coup (× dégâts de la
  // menace à la puissance batPow), part pour les unités, marge avant de se déraciner (m)
  pilonneur: { portee:36, cadence:6, vol:2.4, rayon:3, coup:100, unites:.5, marge:6 },
  // Carapace : part des dégâts des balles et des rayons (explosions, feu et Tesla : tout), temps entre deux sons de ricochet (s)
  carapace: { balles:.12, son:.3 }
};
const RM_ANNONCE = {
  sapeur:    ['Sapeur !', 'Il ignore tes unités et court faire sauter une tourelle (ligne rouge au sol). Abats-le avant : des mitrailleurs devant tes tourelles, ou une barricade sur son chemin.'],
  pilonneur: ['Pilonneur !', 'Il s’enracine hors de portée des tourelles et bombarde tes bâtiments (cercle rouge). Va le chercher : tireur d’élite, tourelle mortier, une troupe envoyée sur lui, ou pilote une unité.'],
  carapace:  ['Carapace !', 'Les balles et les rayons ricochent sur sa coque. Explosifs ou feu : lance-roquettes, mortier, tank, lance-flammes ou Tesla.']
};
const RM_RAPPEL = { sapeur:'⚠ Sapeurs vers une tourelle : abats-les avant', pilonneur:'💥 Un pilonneur bombarde ta base (vert sur la mini-carte)', carapace:'🛡 Carapace : explosifs ou feu' };
const RM = { shells:null, liste:[], ouvert:{}, minuterie:{}, attente:{}, nAttente:0, rr:0, apparus:{}, tues:{}, evts:{}, file:[], rappelT:{},
  explosions:0, abattus:0, tirs:0, impacts:0, ricochets:0, degats:{}, degatsQG:{}, frappe:null, actif:false };
const rmV = new THREE.Vector3(), rmV2 = new THREE.Vector3();
// Hasard propre (visuel et sons) : jamais Math.random
let rmGraine = 24680;
function rmR(a, b){ rmGraine = rmGraine * 16807 % 2147483647; return a + (b - a) * (rmGraine - 1) / 2147483646; }
const rmEvt = (quoi, z) => { RM.evts[quoi] = (RM.evts[quoi] || 0) + 1; if (typeof Jeu === 'object' && Jeu.emit) Jeu.emit('monstre', quoi, z); };
const rmBatK = z => Math.pow(z && z.rtsDm || (typeof plan === 'object' && plan.dmgMult) || 1, RTS_REGL.bat.batPow);
const rmDistBat = (o, x, z) => Math.hypot(o.x - x, o.z - z) - o.r;
// Dégâts d'un monstre à un bâtiment, comptés par monstre (mesures : RM.degats, RM.degatsQG)
function rmFrappeBat(type, b, dmg){
  const v = Math.min(dmg, Math.max(0, b.hp));
  RM.degats[type] = (RM.degats[type] || 0) + v; if (b === RTS.base) RM.degatsQG[type] = (RM.degatsQG[type] || 0) + v;
  RM.frappe = type; // qui frappe, pour le simulateur (outils/sim-bot-rts.js)
  rtsDmgTarget(b, dmg); RM.frappe = null;
}

// Profil : monstres déjà annoncés (valeur par défaut, règle 5)
function rmNorm(){
  if (typeof P !== 'object' || !P) return {};
  if (!P.rmVus || typeof P.rmVus !== 'object' || Array.isArray(P.rmVus)) P.rmVus = {};
  return P.rmVus;
}
rmNorm();

/* ---------- Modèles (rendu par instances : matériaux zmat et zfix seulement) ---------- */
const RMM = {
  poudre: zfix(new THREE.MeshBasicMaterial({ color:0xff8a1a })),  // sac du sapeur : se voit de haut, même dans l'ombre
  meche:  zfix(new THREE.MeshBasicMaterial({ color:0xff2a14 })),
  acide:  zfix(new THREE.MeshBasicMaterial({ color:0x9cff3a })),  // gueule du pilonneur
  bande:  zfix(new THREE.MeshBasicMaterial({ color:0xf0c428 })),  // bande jaune de la carapace
  rivet:  zfix(new THREE.MeshBasicMaterial({ color:0xd8dde4 }))
};
ZKINDS.sapeur = {
  build(T){
    const skin = zmat(T.skin), sangle = zmat(0x3a2a20);
    const g = new THREE.Group(), body = zkGroup(g, 0, 0, 0), PT = [];
    zkMesh(body, ZKG.sph, skin, .34, .42, .3, 0, 1.0, 0, PT);                          // corps penché
    const head = zkMesh(body, ZKG.box, skin, .3, .28, .28, 0, 1.36, .22, PT);
    zkEyes(body, 1.4, .365, .08, 1.1);
    zkMesh(body, ZKG.sph, RMM.poudre, .78, .62, .78, 0, 1.6, -.24, PT);                // gros sac de poudre sur le dos (de haut : une tache orange)
    zkMesh(body, ZKG.box, sangle, .7, .08, .1, 0, 1.3, -.02);                          // sangle
    zkMesh(body, ZKG.box, RMM.meche, .14, .36, .14, .14, 2.3, -.24);                   // mèche
    const armL = zkGroup(body, -.3, 1.18, .05), armR = zkGroup(body, .3, 1.18, .05);
    [armL, armR].forEach(a => { zkMesh(a, ZKG.top, skin, .1, .62, .1, 0, 0, 0, PT); a.rotation.x = -1.1; });
    const legs = [];
    [-.15, .15].forEach(x => { const l = zkGroup(body, x, .66, 0); zkMesh(l, ZKG.top, skin, .13, .66, .14, 0, 0, 0, PT); legs.push(l); });
    body.rotation.x = .35;
    g.scale.setScalar(T.scale); g.userData.rig = { legs, armL, armR };
    return { g, body, head, parts:PT, mats:[skin, sangle], aimY:1.2 * T.scale };
  },
  init(z){ rmInit(z, 'sapeur'); }
};
ZKINDS.pilonneur = {
  build(T){
    const skin = zmat(T.skin), racine = zmat(0x3a3020), pust = zmat(0x7a8a4a);
    const g = new THREE.Group(), body = zkGroup(g, 0, 0, 0), PT = [];
    zkMesh(body, ZKG.sph, skin, .85, .9, .85, 0, 1.25, 0, PT);                         // sac
    const head = zkMesh(body, ZKG.sph, pust, .42, .36, .42, 0, 2.0, .35, PT);
    zkEyes(body, 2.02, .76, .14, 1.3);
    const tube = zkGroup(body, 0, 1.95, -.1); tube.rotation.x = -.3;
    zkMesh(tube, ZKG.box, racine, .5, 1.0, .5, 0, .5, 0, PT);                          // gueule tournée vers le ciel
    zkMesh(tube, ZKG.box, RMM.acide, .44, .14, .44, 0, 1.04, 0);                        // acide qui luit (de haut : point vert)
    [[.6, 1.5, .35], [-.55, 1.1, .5], [.25, .7, .7], [-.65, 1.7, -.35], [.5, 1.9, -.45]].forEach(p => zkMesh(body, ZKG.sph, RMM.acide, .14, .14, .14, p[0], p[1], p[2]));
    const legs = [];
    for (let i = 0; i < 6; i++){ const a = i / 6 * Math.PI * 2, l = zkGroup(body, Math.cos(a) * .55, .55, Math.sin(a) * .55); l.rotation.set(Math.sin(a) * .9, 0, -Math.cos(a) * .9); zkMesh(l, ZKG.top, racine, .17, .8, .17, 0, 0, 0, PT); legs.push(l); }
    g.scale.setScalar(T.scale); g.userData.rig = { legs, tube };
    return { g, body, head, parts:PT, mats:[skin, racine, pust], aimY:1.3 * T.scale };
  },
  init(z){ rmInit(z, 'pilonneur'); }
};
ZKINDS.carapace = {
  build(T){
    const skin = zmat(0x6a5a4a), coque = zmat(T.skin), plaque = zmat(0x2e3e56);
    const g = new THREE.Group(), body = zkGroup(g, 0, 0, 0), PT = [];
    zkMesh(body, ZKG.sph, coque, .95, .55, 1.2, 0, .85, 0, PT);                        // coque basse et large
    zkMesh(body, ZKG.box, plaque, 1.5, .22, .5, 0, 1.18, .55, PT);                     // plaques
    zkMesh(body, ZKG.box, plaque, 1.4, .22, .5, 0, 1.2, -.45, PT);
    zkMesh(body, ZKG.box, RMM.bande, .36, .12, 2.1, 0, 1.36, 0);                        // bande jaune (de haut)
    for (let i = 0; i < 6; i++){ const a = i / 6 * Math.PI * 2; zkMesh(body, ZKG.box, RMM.rivet, .1, .1, .1, Math.cos(a) * .8, 1.05, Math.sin(a) * 1); }
    const head = zkMesh(body, ZKG.box, skin, .45, .35, .4, 0, .65, 1.15, PT);
    zkMesh(body, ZKG.box, plaque, .6, .2, .3, 0, .9, 1.2, PT);                          // visière
    zkEyes(body, .7, 1.36, .12, 1.1);
    const legs = [];
    [[-.6, .55], [.6, .55], [-.6, -.6], [.6, -.6]].forEach(p => { const l = zkGroup(body, p[0], .55, p[1]); zkMesh(l, ZKG.top, skin, .26, .55, .3, 0, 0, 0, PT); legs.push(l); });
    g.scale.setScalar(T.scale); g.userData.rig = { legs };
    return { g, body, head, parts:PT, mats:[skin, coque, plaque], aimY:.9 * T.scale };
  },
  init(z){ rmInit(z, 'carapace'); }
};
function rmInit(z, type){
  z.rm = type; z.rig = z.g.userData.rig; z.rmEtat = type === 'pilonneur' ? 'marche' : 'course'; z.rmT = 0; z.rmCd = 0; z.rmCible = null; z.rmChoixT = 0;
  if (RM.liste.indexOf(z) < 0) RM.liste.push(z);
}

/* ---------- Plan : quand et combien ---------- */
function rmReset(){
  RM.shells = typeof RTS === 'object' ? RTS.shells : null;
  RM.liste = RM.liste.filter(z => !z.dead && zombies.indexOf(z) >= 0); RM.file.length = 0; RM.nAttente = 0; RM.rr = 0; // (rtsStart vide les zombies)
  RM_TYPES.forEach(t => { RM.ouvert[t] = null; RM.minuterie[t] = 0; RM.attente[t] = 0; RM.apparus[t] = 0; RM.tues[t] = 0; RM.rappelT[t] = -99; });
  RM.evts = {}; RM.explosions = RM.abattus = RM.tirs = RM.impacts = RM.ricochets = 0; RM.degats = {}; RM.degatsQG = {};
  rmGraine = 24680;
  rmObusRien();
}
const rmValK = () => { const v = Math.max(1, Math.floor((typeof RTS === 'object' && RTS.vallee) || 1)), L = RM_REGL.valTemps; return L[Math.min(v, L.length) - 1]; };
// Seuil d'un monstre dans la vallée en cours : { menace, temps }
const rmSeuil = type => { const C = RM_REGL.plan[type]; return { menace:C.menace, temps:C.temps * rmValK() }; };
function rmVivants(type){ let n = 0; for (const z of RM.liste) if (!z.dead && z.type === type) n++; return n; }
function rmPlan(dt){
  for (const t of RM_TYPES){
    const C = RM_REGL.plan[t];
    if (RM.ouvert[t] == null){
      const S2 = rmSeuil(t);
      if (RTS.t < S2.temps || RTS.threat < S2.menace) continue;
      RM.ouvert[t] = RTS.t; RM.minuterie[t] = C.premier;
    }
    RM.minuterie[t] -= dt;
    if (RM.minuterie[t] > 0) continue;
    RM.minuterie[t] = C.tous;
    const n = Math.min(C.paquetMax, C.paquet + Math.max(0, Math.floor((RTS.threat - C.menace) / C.plus)));
    const add = Math.max(0, Math.min(n, C.max - rmVivants(t) - RM.attente[t]));
    RM.attente[t] += add; RM.nAttente += add;
  }
}
// Appelé par rtsSpawnAt (js/42-rts-combat.js) pour chaque zombie du flot (type non imposé) : t0 est le type déjà tiré.
// Rien en attente (tout le début de partie) : rend t0 tout de suite, sans hasard.
function rmChoix(t0){
  if (!(RM.nAttente > 0) || typeof RTS !== 'object' || !RTS.on) return t0;
  if (RM.shells !== RTS.shells){ rmReset(); return t0; } // attente d'une partie d'avant : rien
  for (let k = 0; k < RM_TYPES.length; k++){
    const t = RM_TYPES[(RM.rr + k) % RM_TYPES.length];
    if (RM.attente[t] > 0 && ZTYPES[t]){ RM.attente[t]--; RM.nAttente--; RM.rr = (RM.rr + k + 1) % RM_TYPES.length; RM.apparus[t]++; return t; }
  }
  return t0;
}

/* ---------- Chaque monstre, chaque image (appelé par rtsZombies) ---------- */
// Rend vrai si ce fichier a mené le zombie (marche, attaque) ; faux : la conduite ordinaire de rtsZombies
function rmPas(z, dt){
  if (!z.rm || z.dead || z.rtsGarde) return false; // garde de la Ruche : il reste à son poste comme les autres
  z.rmT += dt;
  if (z.rm === 'sapeur') return rmSapeur(z, dt);
  if (z.rm === 'pilonneur') return rmPilonneur(z, dt);
  return false; // carapace : conduite ordinaire (sa coque est dans rmBlinde, ses coups dans ses dégâts)
}
function rmPattes(z, k, dt, amp){
  z.phase += dt * k;
  const L = z.rig && z.rig.legs; if (!L) return;
  for (let i = 0; i < L.length; i++) L[i].rotation.x = Math.sin(z.phase + i * (Math.PI * 2 / L.length + (L.length === 2 ? Math.PI / 2 : 0))) * amp;
}
function rmAller(z, tx, tz, dt){
  const gp = z.g.position, dx = tx - gp.x, dz = tz - gp.z, d = Math.hypot(dx, dz);
  z.g.rotation.y = Math.atan2(dx, dz);
  if (d > .01){ const v = Math.min(d, z.speed * dt); gp.x += dx / d * v; gp.z += dz / d * v; }
  rtsClampValley(gp, false);
  return d;
}
// Cible du sapeur : la tourelle la plus proche, sinon le bâtiment le plus proche (pas les barricades)
function rmCibleSapeur(z){
  const gp = z.g.position; let best = null, bd = 1e9, bb = null, bbd = 1e9;
  for (const o of RTS.blds){
    if (o.dead) continue; const d = rmDistBat(o, gp.x, gp.z);
    if (o.B.turret){ if (d < bd){ bd = d; best = o; } }
    else if (o.type !== 'wall' && d < bbd){ bbd = d; bb = o; }
  }
  return best || bb || RTS.base;
}
function rmSapeur(z, dt){
  const gp = z.g.position, R = RM_REGL.sapeur;
  z.rmChoixT -= dt;
  if (!z.rmCible || z.rmCible.dead || z.rmChoixT <= 0){
    const avant = z.rmCible; z.rmChoixT = R.choix; z.rmCible = rmCibleSapeur(z);
    if (z.rmCible && z.rmCible !== avant) rmEvt('sapeur-cible', z);
  }
  const T = z.rmCible; if (!T) return true;
  // Contact avec n'importe quel bâtiment (une barricade sur le chemin le fait sauter avant la tourelle)
  const sc = (ZTYPES.sapeur.scale || 1) * .5;
  for (const o of RTS.blds){ if (!o.dead && rmDistBat(o, gp.x, gp.z) < R.contact + sc){ rmBoum(z, o); return true; } }
  rmAller(z, T.x, T.z, dt);
  rmPattes(z, z.speed * 3.2, dt, .9);
  if (z.rig && z.rig.armL){ const s = Math.sin(z.phase); z.rig.armL.rotation.x = -1.1 + s * .5; z.rig.armR.rotation.x = -1.1 - s * .5; }
  return true;
}
// Le sac saute contre un bâtiment : pas d'argent pour le joueur, il n'est pas abattu
function rmBoum(z, o){
  const gp = z.g.position, R = RM_REGL.sapeur, x = gp.x, zz = gp.z, dmg = R.souffle * rmBatK(z);
  RM.explosions++; rmEvt('sapeur-boum', z);
  z.rmBoum = true; z.dead = true; z.deadT = 2.7; z.g.visible = false; removeZombieMeshes(z);
  rmSouffleFx(x, zz, R.rayon);
  RTS.blds.slice().forEach(b => { if (b.dead) return; const d = Math.max(0, rmDistBat(b, x, zz)); if (d < R.rayon) rmFrappeBat('sapeur', b, dmg * (1 - .4 * d / R.rayon)); });
  if (state !== 'rts') return;
  RTS.units.slice().forEach(u => { if (u.dead || rtsIsAir(u)) return; const d = Math.hypot(u.g.position.x - x, u.g.position.z - zz); if (d < R.rayon) rtsDmgTarget(u, dmg * R.unites * (1 - .5 * d / R.rayon)); });
  return o;
}
function rmSouffleFx(x, z, r){
  if (typeof rtsFxBlast === 'function') rtsFxBlast(x, z, { splash:r, dmg:0, tier:.7 }); // explosion et son à la taille du rayon (js/55, js/69)
  else { if (typeof rueBoom === 'function') rueBoom(x, 1.2, z, r * 2.4); if (typeof rtsSonBoom === 'function') rtsSonBoom(x, z, r); }
  shake = Math.max(shake, RTS.pilot ? .35 : .2);
}
// Sapeur abattu (Jeu.on('tue')) : son sac saute à l'image suivante et blesse les zombies autour
function rmAbattuFile(){
  if (!RM.file.length) return;
  const L = RM.file.splice(0, RM.file.length), R = RM_REGL.sapeur;
  for (const f of L){
    RM.abattus++; rmEvt('sapeur-abattu', f.z);
    rmSouffleFx(f.x, f.zz, R.abattuR);
    for (const q of zombies){ if (q.dead || q.rm === 'sapeur') continue; /* pas de réaction en chaîne dans un paquet */ const d = Math.hypot(q.g.position.x - f.x, q.g.position.z - f.zz); if (d < R.abattuR) damage(q, f.k * (1 - .5 * d / R.abattuR), false, q.g.position.clone()); }
  }
}

/* ---------- Pilonneur ---------- */
function rmBatProche(x, z){ let best = null, bd = 1e9; for (const o of RTS.blds){ if (o.dead) continue; const d = rmDistBat(o, x, z); if (d < bd){ bd = d; best = o; } } return best ? { o:best, d:bd } : null; }
function rmPilonneur(z, dt){
  const gp = z.g.position, R = RM_REGL.pilonneur, rig = z.rig;
  z.rmChoixT -= dt;
  if (!z.rmCible || z.rmCible.dead || (z.rmEtat === 'marche' && z.rmChoixT <= 0)){ z.rmChoixT = 1; const p = rmBatProche(gp.x, gp.z); z.rmCible = p ? p.o : null; }
  const T = z.rmCible; if (!T) return true;
  const d = rmDistBat(T, gp.x, gp.z);
  if (z.rmEtat === 'marche'){
    if (d > R.portee){
      rmAller(z, T.x, T.z, dt); z.phase += dt * 4;
      if (rig && rig.legs) rig.legs.forEach((l, i) => { l.rotation.y = Math.sin(z.phase + i) * .3; }); // les racines rampent
      if (z.body) z.body.rotation.z = Math.sin(z.phase * .5) * .06;
    }
    else {
      z.rmEtat = 'plante'; z.rmT = 0; z.rmCd = 1.5; z.g.rotation.y = Math.atan2(T.x - gp.x, T.z - gp.z);
      rmV.set(gp.x, .3, gp.z); burst(rmV, 'dust', 10, 2.5);
      rmEvt('pilonneur-plante', z); rmRappel('pilonneur');
    }
    return true;
  }
  // Enraciné : sa cible est tombée et la suivante est trop loin, il se déracine et repart
  if (d > R.portee + R.marge){ z.rmEtat = 'marche'; z.rmChoixT = 0; return true; }
  z.g.rotation.y = Math.atan2(T.x - gp.x, T.z - gp.z);
  z.rmCd -= dt;
  const k = z.rmCd < .7 ? clamp(1 - z.rmCd / .7, 0, 1) : 0;                         // il se gonfle avant de cracher
  if (z.body){ z.body.scale.set(1 + .14 * k, 1 - .08 * k, 1 + .14 * k); z.body.rotation.z = 0; }
  if (rig && rig.tube) rig.tube.rotation.x = -.3 - .35 * k;
  if (z.rmCd <= 0){ z.rmCd = R.cadence; rmTirer(z, T); }
  return true;
}
/* Boules d'acide en vol : un corps qui luit, un cercle rouge au sol pendant tout le vol (réserve de taille fixe) */
const RM_OBUS = [];
const RM_MARQ = { lignes:[], cibles:[], racines:[] };
(function(){
  const fixe = m => { m.userData.keep = true; return m; };
  const matObus = fixe(new THREE.MeshBasicMaterial({ color:0x9cff3a, fog:false }));
  const gCercle = new THREE.RingGeometry(.84, 1, 40); gCercle.rotateX(-Math.PI / 2);
  const gDisque = new THREE.CircleGeometry(1, 32); gDisque.rotateX(-Math.PI / 2);
  const gLigne = new THREE.PlaneGeometry(1, 1); gLigne.rotateX(-Math.PI / 2);
  const gObus = new THREE.SphereGeometry(1, 10, 8);
  const mk = (geo, col, op) => { const m = new THREE.Mesh(geo, fixe(new THREE.MeshBasicMaterial({ color:col, transparent:true, opacity:op, depthWrite:false, side:THREE.DoubleSide, fog:false })));
    m.visible = false; m.userData.keep = true; m.renderOrder = 3; m.frustumCulled = false; scene.add(m); return m; };
  for (let i = 0; i < 6; i++){
    const m = new THREE.Mesh(gObus, matObus); m.visible = false; m.userData.keep = true; m.scale.setScalar(.7); scene.add(m);
    RM_OBUS.push({ m, c:mk(gCercle, 0xff3020, .8), d:mk(gDisque, 0xff2a10, .3), actif:false, t:0, T:2, ax:0, ay:0, az:0, x:0, z:0, r:3, dmg:0, src:null, id:0 });
  }
  for (let i = 0; i < 8; i++) RM_MARQ.lignes.push(mk(gLigne, 0xff4a1a, .5));      // sapeur → sa tourelle
  for (let i = 0; i < 8; i++) RM_MARQ.cibles.push(mk(gCercle, 0xff3a1a, .7));     // sous la tourelle visée
  for (let i = 0; i < 3; i++) RM_MARQ.racines.push(mk(gCercle, 0x9cff3a, .7));    // sous le pilonneur enraciné
})();
const rmObusVol = () => { let n = 0; for (const o of RM_OBUS) if (o.actif) n++; return n; };
function rmTirer(z, T){
  const o = RM_OBUS.find(x => !x.actif); if (!o) return null;
  const gp = z.g.position, sc = z.g.scale.y || 1, R = RM_REGL.pilonneur;
  o.actif = true; o.id = ++RM.tirs; o.t = 0; o.T = R.vol; o.r = R.rayon; o.dmg = R.coup * rmBatK(z); o.src = z;
  o.ax = gp.x; o.ay = 3.2 * sc; o.az = gp.z;
  o.x = T.x + rmR(-.25, .25) * T.r; o.z = T.z + rmR(-.25, .25) * T.r;
  o.m.visible = o.c.visible = o.d.visible = true;
  o.c.scale.setScalar(Math.max(o.r, T.r + .8)); o.c.position.set(o.x, .1, o.z);
  rmEvt('pilonneur-tir', z);
  rmV.set(gp.x, 3.4 * sc, gp.z); burst(rmV, 'dust', 4, 2);
  if (typeof rtsSonCrachat === 'function') rtsSonCrachat(gp.x, gp.z); // gargouillis du crachat (js/69-rts-sons.js)
  return o;
}
function rmObusPas(dt){
  for (const o of RM_OBUS){
    if (!o.actif) continue;
    o.t += dt;
    const k = clamp(o.t / o.T, 0, 1);
    o.m.position.set(o.ax + (o.x - o.ax) * k, o.ay * (1 - k) + 16 * Math.sin(Math.PI * k), o.az + (o.z - o.az) * k);
    o.d.position.set(o.x, .08, o.z); o.d.scale.setScalar(Math.max(.05, o.c.scale.x * k));
    if (k >= 1) rmImpact(o);
  }
}
function rmImpact(o){
  o.actif = false; o.m.visible = o.c.visible = o.d.visible = false; RM.impacts++;
  if (typeof rtsFxBlast === 'function') rtsFxBlast(o.x, o.z, { splash:o.r, dmg:0, tier:.4, fam:'roquette' });
  else { rmV.set(o.x, .5, o.z); burst(rmV, PMATS.acid ? 'acid' : 'dust', 14, 4); }
  rmEvt('pilonneur-impact', o.src);
  if (!RTS.on || state !== 'rts') return;
  RTS.blds.slice().forEach(b => { if (!b.dead && rmDistBat(b, o.x, o.z) < o.r) rmFrappeBat('pilonneur', b, o.dmg); });
  if (state !== 'rts') return;
  RTS.units.slice().forEach(u => { if (!u.dead && !rtsIsAir(u) && Math.hypot(u.g.position.x - o.x, u.g.position.z - o.z) < o.r) rtsDmgTarget(u, o.dmg * RM_REGL.pilonneur.unites); });
}
function rmObusRien(){ RM_OBUS.forEach(o => { o.actif = false; o.m.visible = o.c.visible = o.d.visible = false; }); rmMarqRien(); }
function rmMarqRien(){ [RM_MARQ.lignes, RM_MARQ.cibles, RM_MARQ.racines].forEach(L => L.forEach(m => { m.visible = false; })); }

/* ---------- Carapace : la coque (appelé par rtsHit, js/42-rts-combat.js) ---------- */
// Part des dégâts d'un tir direct qui passe : balles et rayons ricochent, explosions, feu et éclairs passent
function rmBlinde(z, S2){
  if (!z || z.dead || z.rm !== 'carapace' || !S2) return 1;
  if (S2.splash || S2.flame || S2.chain) return 1;
  RM.ricochets++;
  if (!(z.rmSonT > RTS.t - RM_REGL.carapace.son)){
    z.rmSonT = RTS.t; rmEvt('carapace-ricochet', z);
    const gp = z.g.position; rmV2.set(gp.x + rmR(-.6, .6), gp.y + 1.6, gp.z + rmR(-.6, .6));
    if (PMATS.ember) burst(rmV2, 'ember', 3, 4);
    rmSonRicochet(gp.x, gp.z);
  }
  return RM_REGL.carapace.balles;
}
// Ricochet : « ting » métallique court, par la famille « mitrailleuse » de js/69-rts-sons.js (son plafond de voix)
function rmSonRicochet(x, z){
  if (typeof rsJouer !== 'function' || typeof rsO !== 'function' || typeof rsN !== 'function') return false;
  const p = rmR(.9, 1.15);
  return rsJouer('mitrailleuse', x, 1.5, z, (t, out) => { rsO(t, 'triangle', 2600 * p, 1700 * p, .14, .16, out); rsO(t, 'sine', 3900 * p, 3000 * p, .09, .06, out); rsN(t, 'highpass', 5200, 0, .025, .18, out); return .2; }, { cle:'ric' });
}

/* ---------- Annonces : bandeau à la première rencontre, puis un rappel ---------- */
function rmAnnonce(type){
  const A = RM_ANNONCE[type]; if (!A) return false;
  const V = rmNorm(); if (V[type]) return false;
  V[type] = true;
  if (typeof saveP === 'function') saveP();
  if (typeof banner === 'function') banner(A[0], A[1], 5200);
  return true;
}
function rmRappel(type){
  if (rmAnnonce(type)) { RM.rappelT[type] = RTS.t; return 'bandeau'; }
  if (RTS.t - (RM.rappelT[type] == null ? -99 : RM.rappelT[type]) < 35) return null;
  RM.rappelT[type] = RTS.t;
  if (typeof toast === 'function') toast(RM_RAPPEL[type]);
  return 'rappel';
}
function rmAnnonces(){
  const lim = (RTS.baseR || 30) + RM_REGL.vue;
  for (const z of RM.liste){
    if (z.dead || z.rmVu) continue;
    const gp = z.g.position; if (Math.hypot(gp.x, gp.z) > lim) continue;
    z.rmVu = true; if (z.rm !== 'pilonneur') rmRappel(z.rm); // le pilonneur s'annonce quand il s'enracine
  }
}

/* ---------- Repères au sol (vue de haut et en pilotant) ---------- */
function rmMarques(){
  const on = !!(RTS.on && (state === 'rts' || state === 'rtsover') && !RTS.photo);
  let nl = 0, nc = 0, nr = 0;
  const t = typeof time === 'number' ? time : RTS.t, bat = .5 + .5 * Math.sin(t * 9);
  if (on) for (const z of RM.liste){
    if (z.dead) continue;
    const gp = z.g.position;
    if (z.rm === 'sapeur' && z.rmCible && !z.rmCible.dead && nl < RM_MARQ.lignes.length){
      const T = z.rmCible, dx = T.x - gp.x, dz = T.z - gp.z, L = Math.hypot(dx, dz);
      const l = RM_MARQ.lignes[nl++]; l.visible = true; l.position.set((gp.x + T.x) / 2, .09, (gp.z + T.z) / 2);
      l.scale.set(.55, 1, Math.max(.5, L)); l.rotation.y = Math.atan2(dx, dz); l.material.opacity = .25 + .35 * bat;
      if (nc < RM_MARQ.cibles.length){ const c = RM_MARQ.cibles[nc++]; c.visible = true; c.position.set(T.x, .1, T.z); c.scale.setScalar(T.r + 1.4 + .4 * bat); c.material.opacity = .45 + .45 * bat; }
    } else if (z.rm === 'pilonneur' && z.rmEtat === 'plante' && nr < RM_MARQ.racines.length){
      const r = RM_MARQ.racines[nr++]; r.visible = true; r.position.set(gp.x, .1, gp.z); r.scale.setScalar(3.2 + .5 * bat); r.material.opacity = .4 + .4 * bat;
    }
  }
  for (; nl < RM_MARQ.lignes.length; nl++) RM_MARQ.lignes[nl].visible = false;
  for (; nc < RM_MARQ.cibles.length; nc++) RM_MARQ.cibles[nc].visible = false;
  for (; nr < RM_MARQ.racines.length; nr++) RM_MARQ.racines[nr].visible = false;
  for (const o of RM_OBUS) if (o.actif){ o.c.visible = on; o.d.visible = on; o.m.visible = on; o.c.material.opacity = .5 + .45 * Math.abs(Math.sin(o.t * (6 + 10 * o.t / o.T))); }
}

/* ---------- Mini-carte (appelé par js/49-rts-commandement.js) : un point bien à eux ---------- */
function rmMiniExtra(g, P2){
  let n = 0; const pul = .5 + .5 * Math.sin(RTS.t * 6);
  for (const z of RM.liste){
    if (z.dead || !z.g) continue;
    const q = P2(z.g.position.x, z.g.position.z); n++;
    if (z.rm === 'sapeur'){ g.fillStyle = '#ff9a2a'; g.beginPath(); g.arc(q[0], q[1], 2.4, 0, 6.283); g.fill(); }
    else if (z.rm === 'pilonneur'){
      g.fillStyle = '#9cff3a'; g.beginPath(); g.arc(q[0], q[1], 3.2, 0, 6.283); g.fill();
      if (z.rmEtat === 'plante'){ g.strokeStyle = 'rgba(156,255,58,' + (.4 + .5 * pul).toFixed(2) + ')'; g.lineWidth = 1.5; g.beginPath(); g.arc(q[0], q[1], 5 + 2 * pul, 0, 6.283); g.stroke(); }
    } else { g.fillStyle = '#8ab8ff'; g.fillRect(q[0] - 2.5, q[1] - 2.5, 5, 5); g.strokeStyle = '#f0c428'; g.lineWidth = 1; g.strokeRect(q[0] - 2.5, q[1] - 2.5, 5, 5); }
  }
  return n;
}

/* ---------- Chaque image ---------- */
function rmImage(dt){
  if (typeof RTS !== 'object' || !RTS.on){
    if (RM.actif){ RM.actif = false; RM.liste.length = 0; RM.file.length = 0; rmObusRien(); }
    return;
  }
  if (RM.shells !== RTS.shells) rmReset(); // nouvelle partie (rtsStart refait RTS.shells), reprise comprise
  RM.actif = true;
  if (RM.liste.length){ let k = 0; for (const z of RM.liste) if (!(z.dead && z.deadT > 2.5) && zombies.indexOf(z) >= 0) RM.liste[k++] = z; RM.liste.length = k; }
  if (state === 'rts' && !RTS.paused){ rmPlan(dt); rmAbattuFile(); rmObusPas(dt); rmAnnonces(); }
  rmMarques();
}
Jeu.on('image', dt => { try { rmImage(dt || 0); } catch (e) { errNote(e); } });
Jeu.on('tue', (z, was) => {
  try {
    if (!was || !z || !z.rm || typeof RTS !== 'object' || !RTS.on) return;
    RM.tues[z.rm] = (RM.tues[z.rm] || 0) + 1;
    if (z.rm === 'sapeur' && !z.rmBoum) RM.file.push({ z, x:z.g.position.x, zz:z.g.position.z, k:z.maxHp * RM_REGL.sapeur.abattuK });
  } catch (e) { errNote(e); }
});

// Accès pour les tests automatiques et le simulateur
window.__rtsMonstres = { RM, RM_REGL, RM_TYPES, RM_ANNONCE, RM_OBUS, RM_MARQ, rmChoix, rmPas, rmPlan, rmReset, rmSeuil, rmBlinde, rmTirer, rmBoum, rmCibleSapeur,
  rmMiniExtra, rmNorm, rmAnnonce, rmObusRien, rmImage, rmVivants };
