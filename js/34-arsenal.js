'use strict';
/* ================= Arsenal : 5 armes lourdes et accessoires physiques ================= */
// Nouvelles armes (après le lance-roquettes dans la boutique) :
//   mg50 (mitrailleuse .50, balles perforantes), laser (rayon qui traverse tout), railgun (canon électromagnétique),
//   gl (lance-grenades automatique, explosions de 20-armes.js), arc (fusil à arc électrique qui saute d'un zombie à l'autre).
// Accessoires (achetés dans la boutique, par arme, pour la partie, comme les améliorations de l'arme) :
//   point rouge, lunette ×4 (une seule optique à la fois), trépied, pointeur laser, chargeur tambour, poignée avant, canon long.
//   Ils se voient sur l'arme en main (une géométrie fusionnée par arme : un seul appel de dessin de plus).
//   Effets lus par les statistiques de 06-donnees.js (accK) et le zoom de 15-boucle.js ; recul corrigé après fire().
// Tout passe par damage(z, ...) : armure du boss, argent, XP et ferraille normaux.

/* ---------- Armes ---------- */
const ARS_W = {
  mg50:    { id:'mg50',    name:'Mitrailleuse .50',  price:12000, dmg:85,  rate:8,   mag:100, reload:4.5, pellets:1, spread:.018, pierce:3,  zoomFov:44, recoil:.03, kick:.5, ucost:650,  upg:['dmg', 'mag', 'reload', 'pierce'],
             desc:'Grosses balles qui traversent 3 zombies. Chargeur de 100, gros recul.' },
  laser:   { id:'laser',   name:'Fusil laser',       price:16000, dmg:60,  rate:12,  mag:60,  reload:2.5, pellets:1, spread:0,    pierce:99, zoomFov:40, recoil:.004, kick:.2, beam:{ c:0x50f0ff, w:.05, life:.06 }, ucost:780, upg:['dmg', 'rate', 'mag', 'reload'],
             desc:'Rayon instantané qui traverse toute la file, sans dispersion.' },
  railgun: { id:'railgun', name:'Canon électromagnétique', price:22000, dmg:900, rate:.6, mag:4, reload:3, pellets:1, spread:0, pierce:99, zoomFov:20, recoil:.14, beam:{ c:0x60c8ff, w:.22, life:.3 }, ucost:950, upg:['dmg', 'rate', 'mag', 'reload'],
             desc:'Projectile à vitesse folle : 900 de dégâts à tout ce qui est dans la ligne.' },
  gl:      { id:'gl',      name:'Lance-grenades auto', price:28000, dmg:300, rate:3, mag:12, reload:3.4, pellets:1, spread:0, pierce:1, zoomFov:50, recoil:.06, kind:'rocket', speed:55, radius:4.5, ucost:1100, upg:['dmg', 'mag', 'reload', 'radius'],
             desc:'Trois grenades explosives par seconde, barillet de 12.' },
  arc:     { id:'arc',     name:'Fusil à arc électrique', price:35000, dmg:180, rate:4, mag:30, reload:2.6, pellets:1, spread:0, pierce:1, zoomFov:48, recoil:.02, kick:.3, chain:5, chainR:8, ucost:1300, upg:['dmg', 'rate', 'mag', 'reload'],
             desc:'L’éclair frappe un zombie puis saute sur 5 autres autour.' }
};
Object.keys(ARS_W).forEach(id => { WEAPONS[id] = ARS_W[id]; if (WORDER.indexOf(id) < 0) WORDER.push(id); });

/* ---------- Accessoires ---------- */
// Compatibilité réaliste : chaque accessoire ne se monte que sur les armes où il sert vraiment.
//   Point rouge : armes qu'on épaule ou qu'on tient à vue (pas le lance-flammes, ni le sniper qui a déjà sa lunette).
//   Lunette ×4 : armes précises à longue portée seulement (pas de lunette sur un fusil à pompe, un pistolet ou un lance-flammes).
//   Trépied : armes lourdes qu'on pose (mitrailleuse .50, minigun, canon électromagnétique) ; bipied du sniper.
//     Rien sur les armes légères (pistolet, fusil d'assaut, fusil à pompe) : ça n'y sert à rien.
//   Pointeur laser : armes de poing et d'épaule légères, au tir rapide de près.
//   Chargeur tambour : armes à chargeur (pas les armes à bande, à batterie, à barillet ou à réservoir).
//   Poignée avant : armes d'épaule qu'on tient à deux mains par l'avant (pas celles qui ont déjà leurs poignées).
//   Canon long : armes à canon rayé ou lisse qu'on peut rallonger.
const ACC = {
  reddot: { name:'Point rouge',      desc:'Dispersion −35 %, zoom un peu plus fort.', k:.8, grp:'optic', fx:{ spread:.65, zoom:.88 },
            on:['pistol', 'shotgun', 'rifle', 'crossbow', 'minigun', 'mg50', 'laser', 'arc', 'gl', 'rocket'] },
  scope:  { name:'Lunette ×4',       desc:'Zoom bien plus fort, dispersion −25 %, dégâts +10 %.', k:1.4, grp:'optic', fx:{ zoom:.55, spread:.75, dmg:1.1 },
            on:['rifle', 'crossbow', 'mg50', 'laser', 'railgun'] },
  bipod:  { name:'Trépied',          desc:'Arme posée : recul −50 %, dispersion −30 %.', alt:{ sniper:'Bipied' }, k:1, fx:{ recoil:.5, spread:.7 },
            on:['sniper', 'minigun', 'mg50', 'railgun'] },
  laserp: { name:'Pointeur laser',   desc:'Dispersion −25 %. Un trait rouge montre où tu tires.', k:.7, fx:{ spread:.75 },
            on:['pistol', 'shotgun', 'rifle', 'crossbow'] },
  drum:   { name:'Chargeur tambour', desc:'Chargeur +50 %.', k:1.1, fx:{ mag:1.5 },
            on:['pistol', 'shotgun', 'rifle'] },
  grip:   { name:'Poignée avant',    desc:'Recul −30 %, recharge 15 % plus vite.', k:.9, fx:{ recoil:.7, reload:.85 },
            on:['shotgun', 'rifle', 'laser', 'arc', 'gl'] },
  barrel: { name:'Canon long',       desc:'Dégâts +15 %, traverse 1 zombie de plus.', k:1.3, grp:'muzzle', fx:{ dmg:1.15, pierce:1 },
            on:['pistol', 'shotgun', 'rifle', 'sniper', 'mg50'] },
  // Propres au lance-flammes (une seule buse à la fois)
  ftank:  { name:'Réservoir dorsal', desc:'Un second réservoir sur le dos, relié par un tuyau : carburant +60 %.', k:1, fx:{ mag:1.6 }, on:['flamer'] },
  fwide:  { name:'Buse large',       desc:'Nappe de feu plus large : cône +40 %, portée −15 %.', k:.9, grp:'nozzle', fx:{ cone:1.4, range:.85 }, on:['flamer'] },
  flong:  { name:'Buse longue portée', desc:'Jet serré qui porte loin : portée +40 %, cône −20 %.', k:1, grp:'nozzle', fx:{ range:1.4, cone:.8 }, on:['flamer'] },
  fnapalm:{ name:'Mélange au napalm', desc:'Le feu colle : brûlure 50 % plus longue et 30 % plus forte.', k:1.2, fx:{ burn:1.5, burnDps:1.3 }, on:['flamer'] },
  fpump:  { name:'Pompe haute pression', desc:'Plus de débit : dégâts directs +20 %.', k:1.1, fx:{ dmg:1.2 }, on:['flamer'] },
  // Propres au lance-roquettes (une seule ogive à la fois)
  rtandem:{ name:'Ogive tandem',     desc:'Double charge perforante : dégâts +35 %.', k:1.1, grp:'warhead', fx:{ dmg:1.35 }, on:['rocket'] },
  rfrag:  { name:'Ogive à fragmentation', desc:'Éclats partout : rayon d’explosion +35 %, dégâts −10 %.', k:1, grp:'warhead', fx:{ radius:1.35, dmg:.9 }, on:['rocket'] },
  rboost: { name:'Propulseur renforcé', desc:'La roquette file 70 % plus vite : plus facile de toucher ce qui bouge.', k:.9, fx:{ speed:1.7 }, on:['rocket'] },
  rtwin:  { name:'Tube jumelé',      desc:'Un second tube : une roquette de plus par chargeur.', k:1.3, fx:{ mag:1.5 }, on:['rocket'] },
  rguide: { name:'Guidage laser',    desc:'La roquette tourne vers le zombie le plus près de ta visée.', k:1.4, fx:{ guide:1 }, on:['rocket'] },
  // Propres à chaque autre arme (look : forme visible, dessinée par accLook)
  pcomp:  { name:'Compensateur',     desc:'Les gaz poussent le canon vers le bas : recul −40 %, dispersion −15 %.', k:.8, grp:'muzzle', look:'comp', fx:{ recoil:.6, spread:.85 }, on:['pistol'] },
  pburst: { name:'Kit rafale',       desc:'Sélecteur de tir modifié : cadence +40 %.', k:1, look:'selector', fx:{ rate:1.4 }, on:['pistol'] },
  schoke: { name:'Choke serré',      desc:'Plombs plus groupés, qui portent plus loin : dispersion −40 %.', k:.9, grp:'muzzle', look:'choke', fx:{ spread:.6 }, on:['shotgun'] },
  sauto:  { name:'Kit semi-automatique', desc:'Plus besoin de pomper : cadence +60 %.', k:1.2, look:'gastube', fx:{ rate:1.6 }, on:['shotgun'] },
  rsupp:  { name:'Silencieux',       desc:'Tir étouffé, gaz mieux brûlés : dégâts +10 %, recul −20 %.', k:1, grp:'muzzle', look:'supp', fx:{ dmg:1.1, recoil:.8, quiet:1 }, on:['rifle', 'sniper'] },
  rheavy: { name:'Canon lourd',      desc:'Canon épais qui chauffe moins : dégâts +20 %, cadence −10 %.', k:1.1, look:'heavy', fx:{ dmg:1.2, rate:.9 }, on:['rifle'] },
  snbolt: { name:'Culasse rapide',   desc:'Levier allongé et culasse polie : cadence +35 %.', k:1.1, look:'bolt', fx:{ rate:1.35 }, on:['sniper'] },
  cxquiver:{ name:'Carquois',        desc:'Carquois sur le côté : carreaux +50 %.', k:.9, look:'quiver', fx:{ mag:1.5 }, on:['crossbow'] },
  cxlimbs:{ name:'Branches renforcées', desc:'Arc plus puissant : dégâts +25 %, carreaux 40 % plus rapides.', k:1.2, look:'limbs', fx:{ dmg:1.25, speed:1.4 }, on:['crossbow'] },
  mbox:   { name:'Caisse de munitions XXL', desc:'Bande plus longue : munitions +50 %.', k:1, look:'ammobox', fx:{ mag:1.5 }, on:['minigun'] },
  mmotor: { name:'Moteur renforcé',  desc:'Les canons tournent à plein régime deux fois plus vite.', k:1.1, look:'motor', fx:{ spin:.5 }, on:['minigun'] },
  m50box: { name:'Caisse double',    desc:'Deux caisses reliées : munitions +50 %.', k:1, look:'ammobox', fx:{ mag:1.5 }, on:['mg50'] },
  m50ap:  { name:'Bande perforante', desc:'Balles à pointe dure : dégâts +15 %, traverse 1 zombie de plus.', k:1.2, look:'apbelt', fx:{ dmg:1.15, pierce:1 }, on:['mg50'] },
  lcap:   { name:'Condensateur',     desc:'Recharge le cristal plus vite : cadence +30 %.', k:1, look:'capa', fx:{ rate:1.3 }, on:['laser'] },
  lfocus: { name:'Lentille focalisée', desc:'Rayon plus fin et plus chaud : dégâts +25 %.', k:1.1, look:'lens', fx:{ dmg:1.25 }, on:['laser'] },
  rgcap:  { name:'Condensateurs rapides', desc:'Les bobines se rechargent plus vite : cadence +40 %.', k:1.1, look:'capa', fx:{ rate:1.4 }, on:['railgun'] },
  rgcool: { name:'Refroidissement liquide', desc:'Tuyaux et radiateur : recharge 30 % plus rapide.', k:1, look:'cooler', fx:{ reload:.7 }, on:['railgun'] },
  gl18:   { name:'Barillet 18 coups', desc:'Gros barillet : grenades +50 %.', k:1, look:'drum18', fx:{ mag:1.5 }, on:['gl'] },
  glfrag: { name:'Grenades à fragmentation', desc:'Éclats partout : rayon d’explosion +30 %.', k:1.1, look:'frag', fx:{ radius:1.3 }, on:['gl'] },
  arcoil: { name:'Bobine Tesla',     desc:'L’éclair saute sur 2 zombies de plus.', k:1.2, look:'coil', fx:{ chain:2 }, on:['arc'] },
  arcap:  { name:'Condensateur',     desc:'Décharges plus fortes : dégâts +20 %.', k:1, look:'capa', fx:{ dmg:1.2 }, on:['arc'] }
};
const accName = (k, id) => (ACC[k].alt && ACC[k].alt[id]) || ACC[k].name;
const ACC_ORDER = ['reddot', 'scope', 'bipod', 'laserp', 'drum', 'grip', 'barrel', 'ftank', 'fwide', 'flong', 'fnapalm', 'fpump', 'rtandem', 'rfrag', 'rboost', 'rtwin', 'rguide',
  'pcomp', 'pburst', 'schoke', 'sauto', 'rsupp', 'rheavy', 'snbolt', 'cxquiver', 'cxlimbs', 'mbox', 'mmotor', 'm50box', 'm50ap', 'lcap', 'lfocus', 'rgcap', 'rgcool', 'gl18', 'glfrag', 'arcoil', 'arcap'];
const accOwned = (id, k) => !!(S && S.acc && S.acc[id] && S.acc[id][k]);
const accCost = (id, k) => Math.round((120 + (WEAPONS[id].price || 0) * .2) * ACC[k].k / 10) * 10;
// Effet multiplicatif cumulé des accessoires montés (spread, dmg, mag, reload, recoil, zoom)
function accMul(id, key){
  if (!S || !S.acc || !S.acc[id]) return 1;
  let m = 1; for (const k in S.acc[id]) if (S.acc[id][k] && ACC[k] && ACC[k].fx[key] != null && key !== 'pierce') m *= ACC[k].fx[key];
  return m;
}
function accAdd(id, key){
  if (!S || !S.acc || !S.acc[id]) return 0;
  let a = 0; for (const k in S.acc[id]) if (S.acc[id][k] && ACC[k] && ACC[k].fx[key]) a += ACC[k].fx[key];
  return a;
}
function accBuy(id, k){
  const A = ACC[k], W = WEAPONS[id];
  if (!A || !W || !S || !S.owned[id] || A.on.indexOf(id) < 0 || accOwned(id, k)) return false;
  const c = accCost(id, k); if (S.money < c) return false;
  S.money -= c; S.acc = S.acc || {}; S.acc[id] = S.acc[id] || {};
  if (A.grp) ACC_ORDER.forEach(o => { if (o !== k && ACC[o].grp === A.grp) delete S.acc[id][o]; }); // une seule optique
  S.acc[id][k] = true;
  if (k === 'drum') S.ammo[id] = magSize(id);
  accSync(id);
  return true;
}

/* ---------- Modèles en main des 5 armes (mêmes outils que 04-arme-en-main.js) ---------- */
const ARS_C = { cyan:[.6, 2.6, 3.2], blueG:[.5, 1.6, 3.4], violet:[2.2, .9, 3.4], copper:0x9a5a2a, white:0xb8bcc2, whiteD:0x7a7e86, redG:[3.4, .35, .3] };
function arsHands(b, gripZ, cupZ, cupY, fw){
  vmPush(b, 0, -.095, gripZ, -.38);
  vmBox(b, .034, .085, .044, VC.poly, 0, 0, 0, 0, 0, 0, .008);
  for (let i = 0; i < 5; i++) vmBox(b, .037, .004, .03, VC.polyE, 0, .03 - i * .015, .002, 0, 0, 0, 0);
  vmFist(b, .017, .022);
  vmPop(b);
  vmBox(b, .014, .006, .07, VC.park, 0, -.083, gripZ - .075, 0, 0, 0, 0);                    // pontet
  vmBox(b, .005, .022, .006, VC.light, 0, -.064, gripZ - .08, .3, 0, 0, 0);                   // détente
  vmCup(b, 0, cupY, cupZ, fw, fw, .07);
  vmArm(b, [-.035, cupY - .05, cupZ + .04], [-.17, -.22, -.02], .028);
  vmArm(b, [.02, -.06, gripZ + .055], [.08, -.2, .34], .028);
}
function arsSights(b, SY, zf, zr){
  vmBox(b, .03, .03, .02, VC.park, 0, SY - .025, zf, 0, 0, 0, .004);                          // guidon
  vmBox(b, .0045, .02, .006, VC.park, 0, SY - .01, zf, 0, 0, 0, 0);
  vmBox(b, .004, .004, .001, VC.glow, 0, SY - .0025, zf + .0035, 0, 0, 0, 0);
  vmBox(b, .03, .012, .03, VC.park, 0, SY - .03, zr, 0, 0, 0, .004);                          // hausse
  vmBox(b, .005, .03, .02, VC.park, -.013, SY - .01, zr, 0, 0, 0, 0);
  vmBox(b, .005, .03, .02, VC.park, .013, SY - .01, zr, 0, 0, 0, 0);
  vmRing(b, .0085, .0035, .005, VC.park, 0, SY, zr, 0, 0, 0, 8);
}
function arsBuild(){
  const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
  const out = {};
  let g, b, i;
  /* ===== Mitrailleuse .50 ===== */
  g = new THREE.Group(); b = vmNew();
  {
    const SY = .1;
    vmBox(b, .07, .075, .3, VC.olive, 0, .015, -.05, 0, 0, 0, .01);                            // boîte de culasse
    vmBox(b, .074, .012, .3, VC.oliveD, 0, .056, -.05, 0, 0, 0, 0);                             // couvercle
    for (i = 0; i < 6; i++) vmCyl(b, .005, .076, VC.steel, 0, -.005, -.17 + i * .045, 0, Math.PI / 2, 0, 6); // rivets
    vmRing(b, .03, .024, .36, VC.park, 0, .02, -.38, 0, 0, 0, 10);                               // manchon perforé
    for (i = 0; i < 6; i++) vmBox(b, .064, .01, .02, VC.port, 0, .02, -.24 - i * .055, 0, 0, Math.PI / 4, 0);
    vmCyl(b, .014, .48, VC.blue, 0, .02, -.44, 0, 0, 0, 8);                                      // canon
    vmCyl(b, .024, .07, VC.park, 0, .02, -.7, 0, 0, 0, 8);                                       // frein de bouche
    for (i = 0; i < 3; i++) vmBox(b, .052, .008, .012, VC.port, 0, .02, -.68 - i * .02, 0, 0, 0, 0);
    vmBox(b, .03, .02, .02, VC.park, -.045, .045, -.05, 0, 0, 0, 0);                              // poignée de transport, sur le côté gauche
    vmBox(b, .018, .04, .02, VC.park, -.062, .062, -.05, 0, 0, 0, 0);                            // (hors de la ligne de visée)
    vmBox(b, .018, .014, .14, VC.park, -.062, .085, -.05, 0, 0, 0, .004);
    vmBox(b, .08, .1, .1, VC.oliveD, -.085, -.03, -.08, 0, 0, 0, .008);                          // caisse de munitions
    vmBox(b, .082, .012, .102, VC.olive, -.085, .025, -.08, 0, 0, 0, 0);
    for (i = 0; i < 5; i++) vmBox(b, .012, .02, .012, VC.brass, -.044, .02 - i * .006, -.06 - i * .012, 0, 0, .6, 0); // bande
    vmCyl(b, .018, .2, VC.park, 0, .0, .19, 0, 0, 0, 8);                                         // tube de crosse
    vmBox(b, .05, .08, .14, VC.oliveD, 0, -.01, .25, 0, 0, 0, .012);
    vmBox(b, .054, .1, .02, VC.rubber, 0, -.01, .33, 0, 0, 0, .008);
    const ir = vmNew(); arsSights(ir, SY, -.6, .06);
    arsHands(b, .05, -.3, .0, .034);
    vmMesh(g, b); const irons = vmMesh(g, ir);                                                    // mires métalliques (rabattues sous une optique)
    g.userData = { irons, muzzle: -.74, muzzleY: .02, sightY: SY, adsZ: -.2, sight: [V3(0, SY, -.6), V3(0, SY, .06)], eject: V3(.036, .02, -.05), shell: 5 };
  }
  out.mg50 = g;
  /* ===== Fusil laser ===== */
  g = new THREE.Group(); b = vmNew();
  {
    const SY = .1;
    vmBox(b, .066, .07, .42, ARS_C.white, 0, .012, -.16, 0, 0, 0, .02);                         // coque
    vmBox(b, .068, .016, .34, ARS_C.whiteD, 0, -.03, -.16, 0, 0, 0, .006);
    for (i = 0; i < 2; i++) vmBox(b, .07, .008, .3, ARS_C.cyan, 0, .02 - i * .03, -.18, 0, 0, 0, 0); // bandes lumineuses
    vmBox(b, .04, .03, .2, VC.poly, 0, .055, -.1, 0, 0, 0, .008);                                // capot du cristal
    vmBox(b, .012, .012, .14, ARS_C.cyan, 0, .074, -.1, 0, 0, 0, 0);
    vmCyl(b, .028, .16, ARS_C.whiteD, 0, .015, -.44, 0, 0, 0, 10, .7);                           // émetteur
    for (i = 0; i < 3; i++) vmRing(b, .03, .024, .012, VC.park, 0, .015, -.39 - i * .045, 0, 0, 0, 10);
    vmRing(b, .022, .012, .01, ARS_C.cyan, 0, .015, -.525, 0, 0, 0, 10);
    vmBox(b, .05, .07, .05, VC.poly, 0, -.05, -.1, 0, 0, 0, .008);                               // batterie
    vmBox(b, .052, .01, .03, ARS_C.cyan, 0, -.02, -.1, 0, 0, 0, 0);
    vmBox(b, .046, .075, .16, ARS_C.white, 0, -.005, .2, 0, 0, 0, .014);                         // crosse
    vmBox(b, .05, .09, .02, VC.rubber, 0, -.005, .29, 0, 0, 0, .008);
    const ir = vmNew(); arsSights(ir, SY, -.34, .02);
    arsHands(b, .05, -.28, .0, .034);
    vmMesh(g, b); const irons = vmMesh(g, ir);                                                    // mires métalliques (rabattues sous une optique)
    g.userData = { irons, muzzle: -.53, muzzleY: .015, sightY: SY, adsZ: -.2, sight: [V3(0, SY, -.34), V3(0, SY, .02)] };
  }
  out.laser = g;
  /* ===== Canon électromagnétique ===== */
  g = new THREE.Group(); b = vmNew();
  {
    const SY = .11;
    for (const x of [-.026, .026]) vmBox(b, .016, .05, .62, VC.steel, x, .02, -.36, 0, 0, 0, .004); // rails
    for (i = 0; i < 4; i++) vmRing(b, .05, .04, .03, ARS_C.copper, 0, .02, -.16 - i * .12, 0, 0, 0, 10); // bobines
    for (i = 0; i < 4; i++) vmRing(b, .041, .038, .032, ARS_C.blueG, 0, .02, -.16 - i * .12, 0, 0, 0, 8);
    vmBox(b, .03, .012, .62, ARS_C.blueG, 0, .02, -.36, 0, 0, 0, 0);                            // arc entre les rails
    vmBox(b, .08, .08, .22, VC.blue, 0, .01, .0, 0, 0, 0, .012);                                 // corps
    vmBox(b, .07, .07, .1, VC.park, -.08, -.0, .02, 0, 0, 0, .01);                               // condensateurs
    for (i = 0; i < 3; i++) vmCyl(b, .012, .1, VC.light, -.08, .045, -.02 + i * .03, Math.PI / 2, 0, 0, 6);
    vmBox(b, .02, .02, .12, ARS_C.blueG, -.08, .0, .02, 0, 0, 0, 0);
    vmBox(b, .05, .02, .3, VC.park, 0, .06, -.2, 0, 0, 0, .004);                                 // rail supérieur
    vmBox(b, .046, .08, .16, VC.poly, 0, -.01, .2, 0, 0, 0, .014);
    vmBox(b, .05, .1, .02, VC.rubber, 0, -.01, .29, 0, 0, 0, .008);
    const ir = vmNew(); arsSights(ir, SY, -.48, .05);
    arsHands(b, .06, -.22, -.02, .04);
    vmMesh(g, b); const irons = vmMesh(g, ir);                                                    // mires métalliques (rabattues sous une optique)
    g.userData = { irons, muzzle: -.68, muzzleY: .02, sightY: SY, adsZ: -.22, sight: [V3(0, SY, -.48), V3(0, SY, .05)], eject: V3(.045, .01, .02), shell: 7 };
  }
  out.railgun = g;
  /* ===== Lance-grenades automatique ===== */
  g = new THREE.Group(); b = vmNew();
  {
    const SY = .11;
    vmCyl(b, .075, .16, VC.olive, 0, -.02, -.06, 0, 0, 0, 12);                                   // barillet
    for (i = 0; i < 6; i++){ const a = i / 6 * Math.PI * 2; vmCyl(b, .02, .162, VC.oliveD, Math.cos(a) * .048, -.02 + Math.sin(a) * .048, -.06, 0, 0, 0, 8); }
    vmCyl(b, .02, .165, VC.steel, 0, -.02, -.06, 0, 0, 0, 8);
    vmCyl(b, .034, .3, VC.park, 0, .02, -.3, 0, 0, 0, 10);                                       // tube
    vmRing(b, .04, .03, .04, VC.oliveD, 0, .02, -.45, 0, 0, 0, 10);
    vmBox(b, .05, .05, .16, VC.olive, 0, .045, -.05, 0, 0, 0, .01);                              // carcasse haute
    vmBox(b, .02, .012, .3, VC.park, 0, .075, -.15, 0, 0, 0, 0);                                 // rail
    vmBox(b, .04, .06, .18, VC.poly, 0, .0, .18, 0, 0, 0, .012);                                 // crosse
    vmBox(b, .044, .09, .02, VC.rubber, 0, -.01, .27, 0, 0, 0, .008);
    vmBox(b, .03, .1, .03, VC.poly, 0, -.07, -.26, 0, 0, 0, .006);                               // poignée avant
    const ir = vmNew(); arsSights(ir, SY, -.42, .04);
    arsHands(b, .06, -.3, .02, .036);
    vmMesh(g, b); const irons = vmMesh(g, ir);                                                    // mires métalliques (rabattues sous une optique)
    g.userData = { irons, muzzle: -.47, muzzleY: .02, sightY: SY, adsZ: -.2, sight: [V3(0, SY, -.42), V3(0, SY, .04)], eject: V3(.06, -.02, -.06), shell: 6 };
  }
  out.gl = g;
  /* ===== Fusil à arc électrique ===== */
  g = new THREE.Group(); b = vmNew();
  {
    const SY = .1;
    vmBox(b, .06, .065, .26, VC.park, 0, .01, -.05, 0, 0, 0, .012);                             // corps
    vmCyl(b, .018, .3, VC.steel, 0, .02, -.32, 0, 0, 0, 8);                                      // tige
    for (i = 0; i < 7; i++) vmRing(b, .034, .02, .016, ARS_C.copper, 0, .02, -.22 - i * .036, 0, 0, 0, 10); // bobine de cuivre
    vmCyl(b, .045, .06, ARS_C.violet, 0, .02, -.52, 0, 0, 0, 10, .4);                            // globe
    vmCyl(b, .03, .03, ARS_C.violet, 0, .02, -.49, 0, 0, 0, 10);
    for (const s of [-1, 1]) vmBox(b, .008, .008, .2, ARS_C.copper, s * .042, .02, -.36, 0, 0, 0, 0); // tiges latérales
    vmBox(b, .05, .06, .08, VC.blue, 0, -.05, -.05, 0, 0, 0, .008);                              // pile
    vmBox(b, .052, .012, .05, ARS_C.violet, 0, -.03, -.05, 0, 0, 0, 0);
    vmBox(b, .04, .07, .16, VC.woodD, 0, -.01, .17, 0, 0, 0, .014);                              // crosse en bois
    vmBox(b, .044, .085, .02, VC.rubber, 0, -.01, .255, 0, 0, 0, .008);
    const ir = vmNew(); arsSights(ir, SY, -.2, .04);
    arsHands(b, .05, -.15, .0, .032);
    vmMesh(g, b); const irons = vmMesh(g, ir);                                                    // mires métalliques (rabattues sous une optique)
    g.userData = { irons, muzzle: -.56, muzzleY: .02, sightY: SY, adsZ: -.2, sight: [V3(0, SY, -.2), V3(0, SY, .04)] };
  }
  out.arc = g;
  Object.keys(out).forEach(k => {
    const v = out[k]; v.visible = false; vmRoot.add(v); v.userData.tris = vmTris(v); v.userData.muzzleBase = v.userData.muzzle; VMS[k] = v;
  });
}
try { arsBuild(); } catch (e) { console.error('Arsenal : modèles', e); }

/* ---------- Accessoires visibles sur l'arme en main (une géométrie fusionnée par arme) ---------- */
// Formes des accessoires propres aux armes (ajoutées à la géométrie fusionnée de l'arme)
function accLook(b, look, ud, SY, mz, my){
  const X = ud.muzzleBase;
  if (look === 'comp'){
    vmBox(b, .036, .036, .07, VC.park, 0, my, X - .03, 0, 0, 0, .004);
    for (let i = 0; i < 3; i++) vmBox(b, .02, .006, .01, VC.port, 0, my + .019, X - .01 - i * .02, 0, 0, 0, 0); // évents
    ud.muzzle = X - .07;
  } else if (look === 'selector'){
    vmBox(b, .008, .02, .03, VC.light, .032, -.005, -.02, .4, 0, 0, 0); vmBox(b, .01, .01, .01, [2.2, .6, .2], .036, .005, -.03, 0, 0, 0, 0);
  } else if (look === 'choke'){
    vmCyl(b, .026, .06, VC.park, 0, my, X - .03, 0, 0, 0, 10); vmRing(b, .028, .02, .015, VC.steel, 0, my, X - .055, 0, 0, 0, 10);
    ud.muzzle = X - .06;
  } else if (look === 'gastube'){
    vmCyl(b, .012, .3, VC.steel, 0, my - .035, X * .62, 0, 0, 0, 8); vmBox(b, .03, .02, .03, VC.park, 0, my - .03, X * .9, 0, 0, 0, .004);
  } else if (look === 'supp'){
    vmCyl(b, .026, .22, VC.poly, 0, my, X - .11, 0, 0, 0, 12);
    for (let i = 0; i < 3; i++) vmRing(b, .028, .024, .012, VC.park, 0, my, X - .03 - i * .08, 0, 0, 0, 12);
    ud.muzzle = X - .22;
  } else if (look === 'heavy'){
    vmCyl(b, .02, .26, VC.blue, 0, my, X * .78, 0, 0, 0, 10);
    for (let i = 0; i < 4; i++) vmRing(b, .022, .018, .01, VC.park, 0, my, X * .68 - i * .05, 0, 0, 0, 10); // ailettes
  } else if (look === 'bolt'){
    vmCylAB(b, [.03, .03, -.02], [.09, .0, .02], .006, VC.steel, 6); vmCyl(b, .016, .02, VC.light, .095, -.003, .025, 0, Math.PI / 2, 0, 8);
  } else if (look === 'quiver'){
    vmBox(b, .05, .05, .2, VC.woodD, .075, -.04, -.1, 0, 0, 0, .008);
    for (let i = 0; i < 4; i++) vmCyl(b, .004, .26, VC.light, .062 + (i % 2) * .02, -.005 + Math.floor(i / 2) * .012, -.12, 0, 0, 0, 5);
  } else if (look === 'limbs'){
    for (const sd of [-1, 1]) vmBox(b, .2, .02, .03, VC.park, sd * .12, my + .01, X * .82, 0, sd * -.35, 0, .004);
    vmBox(b, .05, .03, .04, VC.steel, 0, my + .01, X * .82, 0, 0, 0, .004);
  } else if (look === 'ammobox'){
    vmBox(b, .09, .1, .14, VC.oliveD, -.1, -.08, -.02, 0, 0, 0, .008); vmBox(b, .092, .014, .142, VC.olive, -.1, -.025, -.02, 0, 0, 0, 0);
    for (let i = 0; i < 4; i++) vmBox(b, .012, .02, .012, VC.brass, -.05, -.04 + i * .008, -.03 - i * .012, 0, 0, .6, 0);
  } else if (look === 'motor'){
    vmCyl(b, .035, .09, VC.park, .065, .0, .05, 0, 0, 0, 10);
    for (let i = 0; i < 4; i++) vmRing(b, .04, .035, .006, VC.steel, .065, .0, .015 + i * .022, 0, 0, 0, 10);
  } else if (look === 'apbelt'){
    for (let i = 0; i < 6; i++){ vmBox(b, .012, .022, .012, VC.brass, -.05 - i * .004, .0 - i * .008, -.03 - i * .014, 0, 0, .6, 0); vmBox(b, .013, .006, .013, VC.red, -.05 - i * .004, .014 - i * .008, -.03 - i * .014, 0, 0, .6, 0); }
  } else if (look === 'capa'){
    for (const sd of [-1, 1]){ vmCyl(b, .014, .09, ARS_C.blueG, sd * .05, -.02, -.12, 0, 0, 0, 8); vmCyl(b, .016, .015, VC.park, sd * .05, -.02, -.07, 0, 0, 0, 8); }
  } else if (look === 'lens'){
    vmRing(b, .032, .018, .02, VC.park, 0, my, X - .01, 0, 0, 0, 12); vmCyl(b, .018, .004, ARS_C.cyan, 0, my, X - .015, 0, 0, 0, 10);
  } else if (look === 'cooler'){
    vmBox(b, .07, .02, .16, VC.steel, 0, .1, -.12, 0, 0, 0, .003);
    for (let i = 0; i < 6; i++) vmBox(b, .074, .016, .006, VC.park, 0, .118, -.05 - i * .028, 0, 0, 0, 0);
    vmCylAB(b, [-.04, .1, -.2], [-.05, .02, -.3], .006, ARS_C.blueG, 5);
  } else if (look === 'drum18'){
    vmCyl(b, .1, .1, VC.oliveD, 0, -.03, -.06, 0, 0, 0, 14); vmRing(b, .102, .09, .02, VC.park, 0, -.03, -.02, 0, 0, 0, 14);
  } else if (look === 'frag'){
    vmRing(b, .046, .036, .03, VC.park, 0, my, X + .03, 0, 0, 0, 10);
    for (let i = 0; i < 6; i++){ const a = i / 6 * 6.283; vmBox(b, .01, .01, .03, VC.steel, Math.cos(a) * .046, my + Math.sin(a) * .046, X + .03, 0, 0, a, 0); }
  } else if (look === 'coil'){
    for (let i = 0; i < 5; i++) vmRing(b, .05, .038, .012, ARS_C.copper, 0, my, X + .12 + i * .025, 0, 0, 0, 10);
    vmCyl(b, .008, .02, ARS_C.violet, 0, my + .055, X + .17, Math.PI / 2, 0, 0, 6);
  }
}
function accSync(id){
  const g = VMS[id]; if (!g) return;
  const ud = g.userData;
  if (ud.muzzleBase == null) ud.muzzleBase = ud.muzzle;
  if (ud.accMesh){ g.remove(ud.accMesh); ud.accMesh.geometry.dispose(); ud.accMesh = null; }
  ud.muzzle = ud.muzzleBase;
  const own = (S && S.acc && S.acc[id]) || {}, keys = ACC_ORDER.filter(k => own[k]);
  if (ud.irons) ud.irons.visible = !(own.reddot || own.scope); // mires rabattues : rien ne cache l'optique
  if (keys.length){
    const b = vmNew(), SY = ud.sightY || .1, mz = ud.muzzleBase, my = ud.muzzleY || .02;
    const zr = ud.sight && ud.sight[1] ? ud.sight[1].z : .02, zf = ud.sight && ud.sight[0] ? ud.sight[0].z : mz * .8;
    const zo = Math.min(zr - .1, (zr + zf) / 2); // optique entre le cran de mire et le guidon
    keys.forEach(k => {
      if (k === 'reddot'){
        vmBox(b, .026, .022, .05, VC.park, 0, SY - .034, zo, 0, 0, 0, .004);
        vmRing(b, .024, .019, .045, VC.park, 0, SY, zo, 0, 0, 0, 12);
        vmBox(b, .0035, .0035, .001, ARS_C.redG, 0, SY, zo - .02, 0, 0, 0, 0);               // le point rouge, sur la ligne de mire
      } else if (k === 'scope'){
        vmRing(b, .026, .021, .2, VC.blue, 0, SY, zo, 0, 0, 0, 12);
        vmRing(b, .032, .021, .03, VC.park, 0, SY, zo - .1, 0, 0, 0, 12);
        vmRing(b, .03, .021, .03, VC.park, 0, SY, zo + .1, 0, 0, 0, 12);
        for (const dz of [-.05, .05]) vmBox(b, .02, .03, .02, VC.park, 0, SY - .038, zo + dz, 0, 0, 0, .003);
        vmCyl(b, .007, .012, VC.park, 0, SY + .03, zo, Math.PI / 2, 0, 0, 7);
      } else if (k === 'bipod'){
        vmBox(b, .03, .02, .03, VC.park, 0, my - .03, mz * .72, 0, 0, 0, .004);
        for (const s of [-1, 1]){
          vmBox(b, .008, .13, .008, VC.steel, s * .03, my - .095, mz * .72, 0, 0, s * .32, 0);
          vmBox(b, .016, .008, .02, VC.rubber, s * .052, my - .158, mz * .72, 0, 0, 0, 0);
        }
      } else if (k === 'laserp'){
        vmBox(b, .022, .022, .07, VC.poly, .038, my - .015, mz * .55, 0, 0, 0, .004);
        vmCyl(b, .006, .004, ARS_C.redG, .038, my - .015, mz * .55 - .037, 0, 0, 0, 6);
        vmBox(b, .0025, .0025, 3, ARS_C.redG, .038, my - .015, mz * .55 - 1.54, 0, 0, 0, 0);   // trait rouge
      } else if (k === 'drum'){
        vmCyl(b, .055, .05, VC.park, 0, -.1, mz * .18, 0, Math.PI / 2, 0, 14);
        vmCyl(b, .02, .052, VC.steel, 0, -.1, mz * .18, 0, Math.PI / 2, 0, 8);
        vmBox(b, .03, .04, .04, VC.park, 0, -.055, mz * .18, 0, 0, 0, .004);
      } else if (k === 'grip'){
        vmBox(b, .03, .02, .05, VC.park, 0, my - .04, mz * .5, 0, 0, 0, .004);
        vmBox(b, .026, .085, .03, VC.poly, 0, my - .09, mz * .5, .15, 0, 0, .008);
        for (let i = 0; i < 3; i++) vmBox(b, .028, .004, .032, VC.polyE, 0, my - .07 - i * .018, mz * .5, .15, 0, 0, 0);
      } else if (k === 'barrel'){
        vmCyl(b, .016, .14, VC.blue, 0, my, mz - .07, 0, 0, 0, 8);
        vmCyl(b, .02, .04, VC.park, 0, my, mz - .13, 0, 0, 0, 8);
        ud.muzzle = ud.muzzleBase - .15;
      } else if (k === 'ftank'){
        vmCylAB(b, [-.03, -.06, .02], [-.12, -.16, .2], .009, VC.rubber, 6);                       // tuyau vers le dos
        vmCylAB(b, [-.12, -.16, .2], [-.2, -.24, .34], .009, VC.rubber, 6);
        vmCyl(b, .07, .2, VC.red, -.24, -.3, .42, .5, -.3, 0, 12);                                 // réservoir sur le dos (on en voit le haut)
        vmCyl(b, .072, .014, VC.steel, -.24, -.3, .42, .5, -.3, 0, 12);
        vmCyl(b, .018, .03, VC.light, -.2, -.24, .34, .5, -.3, 0, 8);                              // valve
      } else if (k === 'fwide'){
        vmRing(b, .05, .04, .05, VC.park, 0, my, mz - .04, 0, 0, 0, 12);                          // pavillon évasé
        vmRing(b, .04, .022, .03, VC.steel, 0, my, mz - .01, 0, 0, 0, 12);
        for (let i = 0; i < 4; i++) vmBox(b, .006, .02, .05, VC.park, Math.cos(i * 1.571) * .046, my + Math.sin(i * 1.571) * .046, mz - .04, 0, 0, i * 1.571, 0);
        ud.muzzle = ud.muzzleBase - .07;
      } else if (k === 'flong'){
        vmCyl(b, .011, .2, VC.steel, 0, my, mz - .1, 0, 0, 0, 8);                                // tube allongé
        vmCyl(b, .016, .03, VC.park, 0, my, mz - .015, 0, 0, 0, 8);
        vmCyl(b, .014, .03, VC.park, 0, my, mz - .2, 0, 0, 0, 8);
        vmCyl(b, .005, .16, VC.steel, 0, my - .028, mz - .1, 0, 0, 0, 6);                        // allumeur prolongé
        ud.muzzle = ud.muzzleBase - .21;
      } else if (k === 'fnapalm'){
        vmCyl(b, .026, .1, [1, .45, .08], .07, -.05, -.22, 0, 0, 0, 10);                          // bidon orange
        for (let i = 0; i < 2; i++) vmCyl(b, .027, .012, VC.rubber, .07, -.05, -.25 + i * .06, 0, 0, 0, 10);
        vmCyl(b, .008, .02, VC.steel, .07, -.05, -.28, 0, 0, 0, 6);
        vmCylAB(b, [.06, -.05, -.17], [.03, -.06, -.12], .005, VC.rubber, 5);
      } else if (ACC[k].look){ accLook(b, ACC[k].look, ud, SY, mz, my);
      } else if (k === 'rtandem'){
        vmCyl(b, .008, .13, VC.steel, 0, my, mz - .07, 0, 0, 0, 6);                               // sonde de l'ogive tandem
        vmCyl(b, .014, .02, VC.red, 0, my, mz - .13, 0, 0, 0, 8);
        vmRing(b, .056, .052, .03, VC.red, 0, my, mz + .1, 0, 0, 0, 12);                         // bande rouge
      } else if (k === 'rfrag'){
        vmRing(b, .062, .052, .05, VC.park, 0, my, mz + .08, 0, 0, 0, 12);                       // manchon à éclats
        for (let i = 0; i < 8; i++){ const a = i / 8 * 6.283; vmBox(b, .012, .012, .04, VC.steel, Math.cos(a) * .062, my + Math.sin(a) * .062, mz + .08, 0, 0, a, 0); }
      } else if (k === 'rboost'){
        vmRing(b, .08, .05, .1, VC.oliveD, 0, my, .33, 0, 0, 0, 12);                            // grosse tuyère arrière
        vmRing(b, .082, .07, .02, [2.4, 1, .3], 0, my, .29, 0, 0, 0, 12);                          // bague chauffée
      } else if (k === 'rtwin'){
        vmCyl(b, .048, .86, VC.olive, -.11, my, -.21, 0, 0, 0, 12);                               // second tube à gauche
        vmRing(b, .058, .044, .05, VC.oliveD, -.11, my, -.66, 0, 0, 0, 10);
        for (const z of [-.45, -.1, .12]) vmBox(b, .07, .016, .03, VC.park, -.055, my, z, 0, 0, 0, 0); // attaches
      } else if (k === 'rguide'){
        vmBox(b, .04, .045, .1, VC.poly, .075, my + .04, -.35, 0, 0, 0, .006);                    // désignateur laser
        vmCyl(b, .012, .004, ARS_C.redG, .075, my + .04, -.402, 0, 0, 0, 8);
        vmBox(b, .0025, .0025, 3, ARS_C.redG, .075, my + .04, -1.9, 0, 0, 0, 0);
      } else if (k === 'fpump'){
        vmBox(b, .04, .04, .08, VC.park, -.045, .03, -.32, 0, 0, 0, .006);                        // pompe sur le côté
        vmCyl(b, .012, .1, VC.steel, -.045, .062, -.32, 0, 0, 0, 8);                              // piston
        vmCyl(b, .016, .008, VC.steel, -.07, .03, -.29, 0, Math.PI / 2, 0, 10);                   // manomètre
        vmCyl(b, .012, .001, VC.face, -.075, .03, -.29, 0, Math.PI / 2, 0, 10);
      }
    });
    ud.accMesh = vmMesh(g, b);
  }
  if (S && S.cur === id && flash.parent === g) flash.position.z = ud.muzzle;
}
function accClearAll(){ Object.keys(VMS).forEach(id => { const ud = VMS[id].userData; if (ud.accMesh || (ud.muzzleBase != null && ud.muzzle !== ud.muzzleBase)){ const s0 = S; try { S = null; accSync(id); } finally { S = s0; } } }); }

/* ---------- Rayons (laser, canon électromagnétique) et éclairs (arc) ---------- */
const arsFx = new THREE.Group(); scene.add(arsFx);
const ARS_BEAM_G = new THREE.BoxGeometry(1, 1, 1);
const arsBeams = [];
for (let i = 0; i < 8; i++){
  const m = new THREE.Mesh(ARS_BEAM_G, new THREE.MeshBasicMaterial({ color:0xffffff, transparent:true, blending:THREE.AdditiveBlending, depthWrite:false, fog:false }));
  m.visible = false; arsFx.add(m); arsBeams.push({ m, life:0, max:1, w:.05 });
}
const ARS_ARC_N = 10, arsArcs = [];
for (let i = 0; i < 6; i++){
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(ARS_ARC_N * 3), 3));
  const l = new THREE.Line(geo, new THREE.LineBasicMaterial({ color:0xd8a0ff, transparent:true, blending:THREE.AdditiveBlending, depthWrite:false, fog:false }));
  l.frustumCulled = false; l.visible = false; arsFx.add(l); arsArcs.push({ l, life:0 });
}
const arsA = new THREE.Vector3(), arsB = new THREE.Vector3(), arsT = new THREE.Vector3();
const arsRay = new THREE.Raycaster();
let arsBeamsN = 0, arsArcN = 0;
function arsBeam(a, b, color, w, life){
  let o = arsBeams.find(x => !x.m.visible) || arsBeams.reduce((p, x) => (x.life < p.life ? x : p));
  o.m.material.color.setHex(color); o.m.material.opacity = 1;
  o.m.position.copy(a).add(b).multiplyScalar(.5); o.m.scale.set(w, w, Math.max(.01, a.distanceTo(b))); o.m.lookAt(b);
  o.m.visible = true; o.life = o.max = life; o.w = w; arsBeamsN++;
}
function arsBolt(a, b){
  const o = arsArcs.find(x => !x.l.visible) || arsArcs[0], p = o.l.geometry.attributes.position.array;
  const d = a.distanceTo(b), j = Math.min(.9, d * .08);
  for (let i = 0; i < ARS_ARC_N; i++){
    const t = i / (ARS_ARC_N - 1), e = i === 0 || i === ARS_ARC_N - 1 ? 0 : j;
    p[i * 3] = a.x + (b.x - a.x) * t + rand(-e, e); p[i * 3 + 1] = a.y + (b.y - a.y) * t + rand(-e, e); p[i * 3 + 2] = a.z + (b.z - a.z) * t + rand(-e, e);
  }
  o.l.geometry.attributes.position.needsUpdate = true; o.l.visible = true; o.life = .12; arsArcN++;
}
// Point d'arrivée du tir au centre de l'écran : dernier zombie traversé, sol, ou 140 m
function arsEnd(out){
  fwd.set(0, 0, -1).applyQuaternion(camera.quaternion);
  let t = 140; if (fwd.y < -.005) t = Math.min(t, -camera.position.y / fwd.y);
  return out.copy(camera.position).addScaledVector(fwd, t);
}
const arsCenter = (z, out) => out.set(z.g.position.x, z.g.position.y + (z.aimY != null ? z.aimY : 1.1 * ((ZTYPES[z.type] || {}).scale || 1)), z.g.position.z);
// Premier zombie dans le viseur (avant le tir : l'arc part de lui)
function arsFirst(){
  fwd.set(0, 0, -1).applyQuaternion(camera.quaternion);
  arsRay.set(camera.position, fwd); arsRay.far = 200;
  for (const h of arsRay.intersectObjects(hitMeshes, false)){ const z = h.object.userData.z; if (z && !z.dead) return z; }
  return null;
}
function arsChain(id, first){
  const W = WEAPONS[id], dmg = wDmg(id), hit = [first];
  armMuzzle(arsA);
  if (first) arsBolt(arsA, arsCenter(first, arsB)); else { arsBolt(arsA, arsEnd(arsB)); return 0; }
  let cur = first, n = 0;
  for (let k = 0; k < W.chain + accAdd(id, 'chain'); k++){
    let best = null, bd = W.chainR * W.chainR;
    for (const z of zombies){
      if (z.dead || hit.indexOf(z) >= 0) continue;
      const dx = z.g.position.x - cur.g.position.x, dz = z.g.position.z - cur.g.position.z, d = dx * dx + dz * dz;
      if (d < bd){ bd = d; best = z; }
    }
    if (!best) break;
    arsCenter(cur, arsA); arsCenter(best, arsB); arsBolt(arsA, arsB);
    hit.push(best); n++;
    damage(best, dmg * Math.pow(.8, k + 1), false, arsB.clone());
    cur = best;
  }
  return n;
}
function arsFxStep(dt){
  for (const o of arsBeams){
    if (!o.m.visible) continue; o.life -= dt;
    if (o.life <= 0){ o.m.visible = false; continue; }
    const u = o.life / o.max; o.m.material.opacity = u; o.m.scale.x = o.m.scale.y = o.w * (.4 + .6 * u);
  }
  for (const o of arsArcs){ if (!o.l.visible) continue; o.life -= dt; if (o.life <= 0) o.l.visible = false; }
}
function arsFxClear(){ arsBeams.forEach(o => { o.m.visible = false; }); arsArcs.forEach(o => { o.l.visible = false; }); }

/* ---------- Sons des nouvelles armes ---------- */
Object.assign(Snd.GUNS, {
  mg50:    { crack:[3400, .05, .45], body:[800, .4, .95], thump:[85, 30, .3, .9], echo:[.15, 1.1, .24, 800], echo2:.4 },
  laser:   { zap:'laser' },
  railgun: { zap:'rail' },
  gl:      { crack:[1500, .04, .2], body:[600, .22, .5], thump:[120, 55, .16, .6], echo:[.12, .5, .1, 700] },
  arc:     { zap:'arc' }
});
try {
  const _shot = Snd.shot;
  Snd.shot = function(kind){
    const P = this.GUNS[kind];
    if (!P || !P.zap) return _shot.apply(this, arguments);
    this.shotN++;
    if (!this.ctx) return true;
    try {
      const c = this.ctx, t = c.currentTime, p = rand(.9, 1.1), v = rand(.85, 1.05);
      if (P.zap === 'laser'){ this._osc(t, 'sawtooth', 2200 * p, 380, .11, .07 * v); this._osc(t, 'square', 1100 * p, 240, .08, .03 * v); this._nz(t, 'highpass', 5000, 0, .04, .05 * v); }
      else if (P.zap === 'rail'){
        this._osc(t, 'sine', 300 * p, 2600, .18, .08 * v);                                          // montée de charge
        this._nz(t + .16, 'highpass', 3500, 0, .06, .5 * v); this._nz(t + .16, 'lowpass', 900, 1, .6, .7 * v, null, 120);
        this._osc(t + .16, 'sine', 70 * p, 25, .5, .8 * v); this._nz(t + .36, 'bandpass', 800, .8, 1.2, .18 * v, null, 200, .03);
      } else {
        for (let i = 0; i < 4; i++) this._nz(t + i * rand(.012, .03), 'bandpass', rand(2000, 5000), rand(3, 8), rand(.02, .05), rand(.1, .2) * v);
        this._osc(t, 'square', 60 * p, 55, .18, .05 * v); this._osc(t, 'sawtooth', 900 * p, 3000, .06, .03 * v);
      }
    } catch (e) {}
    return true;
  };
} catch (e) {}

/* ---------- Silencieux : tir étouffé ---------- */
try {
  const _s = Snd.shot;
  Snd.shot = function(kind){ const q = !!(S && accOwned(kind, 'rsupp')); this.quiet = q; try { return _s.apply(this, arguments); } finally { this.quiet = false; } };
} catch (e) {}

/* ---------- Boutique : section Accessoires sous les améliorations de l'arme ---------- */
function accHTML(id){
  const W = WEAPONS[id]; if (!W) return '';
  const list = ACC_ORDER.filter(k => ACC[k].on.indexOf(id) >= 0);
  let h = '<h4 class="wuh">Accessoires : ' + W.name + '</h4>';
  if (!list.length) return h + '<div class="ds">Aucun accessoire ne sert sur cette arme.</div>';
  list.forEach(k => {
    const A = ACC[k], own = accOwned(id, k), c = accCost(id, k);
    const swap = A.grp && !own && ACC_ORDER.some(o => o !== k && ACC[o].grp === A.grp && accOwned(id, o));
    h += '<div class="row"><div class="info"><div class="nm">' + accName(k, id) + (own ? ' ✓' : '') + '</div><div class="ds">' + A.desc + (swap ? ' Remplace l’optique montée.' : '') + '</div></div>'
      + '<button data-act="acc" data-id="' + id + '" data-k="' + k + '"' + (own || S.money < c ? ' disabled' : '') + '>' + (own ? 'Monté' : fmt(c)) + '</button></div>';
  });
  return h;
}
try { const _b = wupgHTML; wupgHTML = function(){ const h = _b.apply(this, arguments); return h + accHTML(shopWSel); }; } catch (e) {}
(function(){
  const el = $('scrShop'); if (!el || !el.addEventListener) return;
  el.addEventListener('click', e => {
    const b = e.target.closest && e.target.closest('button[data-act="acc"]'); if (!b || b.disabled) return;
    if (accBuy(b.dataset.id, b.dataset.k)){ Snd.buy(); renderShop(); }
  });
})();

/* ---------- Guidage laser des roquettes ---------- */
// Chaque image, la roquette tourne (au plus ARS_TURN rad/s) vers le zombie vivant le plus près de son axe,
// dans un cône de 30° devant elle et à moins de 90 m.
const ARS_TURN = 2.6, arsG1 = new THREE.Vector3(), arsG2 = new THREE.Vector3();
let arsGuided = 0;
function arsGuide(dt){
  if (!S || !accOwned('rocket', 'rguide') || typeof ARM !== 'object') return;
  for (const o of ARM.rockets){
    if (!o.m.visible || o.id !== 'rocket') continue;
    const sp = o.v.length(); if (sp < .1) continue;
    arsG1.copy(o.v).divideScalar(sp);
    let best = null, bc = Math.cos(.52);
    for (const z of zombies){
      if (z.dead) continue;
      arsCenter(z, arsG2).sub(o.m.position); const d = arsG2.length(); if (d < .5 || d > 90) continue;
      const c = arsG2.dot(arsG1) / d; if (c > bc){ bc = c; best = z; }
    }
    if (!best) continue;
    arsCenter(best, arsG2).sub(o.m.position).normalize();
    const ang = Math.acos(clamp(arsG1.dot(arsG2), -1, 1)), k = ang > 1e-4 ? Math.min(1, ARS_TURN * dt / ang) : 1;
    arsG1.lerp(arsG2, k).normalize(); o.v.copy(arsG1).multiplyScalar(sp);
    arsT.copy(o.m.position).add(arsG1); o.m.lookAt(arsT); o.m.rotateY(Math.PI);
    arsGuided++;
  }
}
try { if (typeof armStep === 'function'){ const _b = armStep; armStep = function(dt){ try { arsGuide(dt || 0); } catch (e) {} return _b.apply(this, arguments); }; } } catch (e) {}

/* ---------- Secousse de l'écran par arme (les grosses armes secouent plus) ---------- */
// Valeur de shake (15-boucle.js : décalage de la caméra, amorti en environ 0,2 s). Un peu moins en visée.
const ARS_SHAKE = { shotgun:.25, sniper:.3, minigun:.28, rocket:.6, mg50:.32, laser:.06, railgun:.7, gl:.42, arc:.2 };
/* ---------- Crochets ---------- */
try {
  const _b = fire;
  fire = function(){
    const id = S.cur, W = WEAPONS[id];
    const first = W.chain ? arsFirst() : null;
    const r = _b.apply(this, arguments);
    if (r === false) return r;
    if (ARS_SHAKE[id]) shake = Math.max(shake, ARS_SHAKE[id] * (zoomed ? .7 : 1) * (accMul(id, 'recoil') < 1 ? .75 : 1)); // un trépied ou une poignée calme aussi l'écran
    const rm = accMul(id, 'recoil'); if (rm < 1) recoilAcc = Math.max(0, recoilAcc - W.recoil * (zoomed ? .6 : 1) * (1 - rm));
    if (W.beam){ armMuzzle(arsA); arsBeam(arsA, arsEnd(arsB), W.beam.c, W.beam.w, W.beam.life); }
    else if (!W.kind && !W.chain && W.pellets === 1 && Math.random() < (W.rate >= 8 ? .45 : .8)){
      // Traçante : trait lumineux très bref du canon vers la cible (balles)
      armMuzzle(arsA); arsEnd(arsB); arsT.copy(arsB).sub(arsA).multiplyScalar(rand(.35, .7)).add(arsA);
      arsBeam(arsA, arsT, 0xffd890, .025, .045);
    }
    if (W.chain) arsChain(id, first);
    return r;
  };
} catch (e) {}
try { const _b = equip; equip = function(id){ const r = _b.apply(this, arguments); if (S && S.cur === id && VMS[id] && flash.parent === VMS[id]) flash.position.z = VMS[id].userData.muzzle; return r; }; } catch (e) {}
try { const _b = newGame; newGame = function(){ accClearAll(); const r = _b.apply(this, arguments); if (S) S.acc = {}; return r; }; } catch (e) {}
try { const _b = visuals; visuals = function(dt){ const r = _b.apply(this, arguments); arsFxStep(dt); return r; }; } catch (e) {}
try { const _b = clearZombies; clearZombies = function(){ const r = _b.apply(this, arguments); arsFxClear(); return r; }; } catch (e) {}

// Accès pour les tests automatiques
window.__ars = { get guided(){ return arsGuided; }, ARS_SHAKE, ARS_W, ACC, ACC_ORDER, accName, accMul, accAdd, accBuy, accCost, accOwned, accSync, arsChain, arsFirst,
  get beams(){ return arsBeamsN; }, get arcs(){ return arsArcN; } };
