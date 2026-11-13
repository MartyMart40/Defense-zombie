'use strict';
/* Arme en main, suite de js/04-arme-en-main.js : les modèles des armes (refaits à la tâche 108) */
// userData : muzzle (z du bout du canon), muzzleY, sightY (hauteur de la ligne de mire), adsZ, sight (points de visée pour les tests),
// irons (mires rabattues sous une optique, 34-arsenal.js), pièces animées (slide, mag, pump, boltM, bolt, warhead, pilot, barrels, needle...),
// eject (fenêtre d'éjection). Ces points d'accroche sont lus par 04-arme-anim.js, 08-tir.js, 20-armes.js, 34-arsenal.js et 62-ressenti.js.
// Ici : outils de forme, pistolet, fusil à pompe, fusil d'assaut, sniper. Suite : js/04-arme-modeles2.js.

// Couleurs en plus : métal canon de fusil (un peu plus clair), polymère sable, céramique (isolants de l'arc)
VC.gun = 0x37393e; VC.fde = 0x6b5c45; VC.fdeD = 0x55493a; VC.cera = 0xc9c2b4;
vmMatiere([VC.gun], [1.05, 1.3, 0]); vmMatiere([VC.fde, VC.fdeD], [.3, .45, 0]); vmMatiere([VC.cera], [.9, 1.8, 0]);

/* ---------- Outils de forme ---------- */
// Profil elliptique (garde-mains ronds, fûts, réservoirs aplatis)
function vmEll(rx, ry, n){ const p = []; n = n || 10; for (let i = 0; i < n; i++){ const a = Math.PI / n + i / n * Math.PI * 2; p.push([Math.cos(a) * rx, Math.sin(a) * ry]); } return p; }
// Profil d'une glissière ou d'une boîte de culasse : flancs droits, dessus biseauté (largeur w, hauteur h, biseau c)
function vmTop(w, h, c){ const a = w / 2, e = h / 2; return [[a, -e], [a, e - c], [a - c, e], [-a + c, e], [-a, e - c], [-a, -e]]; }
const VM_TOP_F = null; // pas d'arête usée sur les biseaux : le reflet de la lumière suffit (sinon une bande claire)
// Rail Picatinny le long de z : semelle et dents (n dents)
function vmRail(b, x, y, z, len, w, col, n){
  vmBox(b, w * .78, .006, len, col, x, y, z, 0, 0, 0, 0);
  for (let i = 0; i < n; i++) vmBox(b, w, .005, len / n * .5, col, x, y + .0045, z - len / 2 + (i + .5) * len / n, 0, 0, 0, 0);
}
// Vis vue de côté (tête ronde sur un flanc)
function vmVis(b, x, y, z, r){ vmCyl(b, r || .0035, .004, VC.steel, x, y, z, 0, Math.PI / 2, 0, 6); }

/* ---------- Pistolet ---------- */
function vmPistolet(V3){
  const g = new THREE.Group(), b = vmNew(); let i;
  const SY = .051;
  // Carcasse en polymère : cache-poussière avec rail, pontet arrondi, arrêtoir, bouton du chargeur
  vmPrism(b, vmTop(.05, .026, .004), VM_TOP_F, .2, VC.poly, 0, -.025, -.125);
  vmBox(b, .046, .014, .05, VC.poly, 0, -.024, -.235, 0, 0, 0, .005);                        // nez de la carcasse
  for (i = 0; i < 3; i++) vmBox(b, .052, .004, .008, VC.polyE, 0, -.039, -.17 - i * .02, 0, 0, 0, 0); // rainures du rail
  vmBox(b, .014, .007, .05, VC.poly, 0, -.066, -.064, 0, 0, 0, .002);                        // pontet : fond
  vmBox(b, .014, .03, .008, VC.poly, 0, -.051, -.093, .32, 0, 0, .002);                      // avant du pontet
  vmBox(b, .014, .008, .014, VC.poly, 0, -.063, -.088, .8, 0, 0, 0);                         // coin arrondi
  vmBox(b, .006, .018, .006, VC.steel, 0, -.044, -.058, .25, 0, 0, 0);                       // détente
  vmBox(b, .006, .012, .006, VC.steel, 0, -.057, -.054, -.15, 0, 0, 0);
  vmBox(b, .003, .008, .003, VC.light, 0, -.047, -.056, .25, 0, 0, 0);                       // sécurité de détente
  vmBox(b, .006, .01, .03, VC.park, -.027, -.006, -.07, 0, 0, 0, 0);                          // arrêtoir de culasse
  vmBox(b, .008, .01, .012, VC.park, -.027, -.018, -.045, 0, 0, 0, 0);                       // bouton du chargeur
  vmBox(b, .012, .016, .01, VC.park, 0, .018, .011, -.4, 0, 0, 0);                           // chien
  vmBox(b, .036, .012, .03, VC.poly, 0, -.02, .022, -.35, 0, 0, .004);                        // queue de castor
  vmCyl(b, .009, .22, VC.steel, 0, .012, -.138, 0, 0, 0, 8);                                  // canon (visible quand la glissière recule)
  vmBox(b, .03, .018, .05, VC.steel, 0, .02, -.088, 0, 0, 0, .003);                          // bloc du canon dans la fenêtre
  vmCyl(b, .0055, .003, VC.port, 0, .012, -.249, 0, 0, 0, 8);
  vmCyl(b, .005, .03, VC.steel, 0, -.004, -.238, 0, 0, 0, 6);                                // guide du ressort
  vmPush(b, 0, -.098, .008, -.26);
  vmBox(b, .05, .118, .056, VC.poly, 0, 0, 0, 0, 0, 0, .012);                                // poignée
  for (const sd of [-1, 1]) vmBox(b, .003, .085, .042, VC.polyE, sd * .0255, -.004, .002, 0, 0, 0, .004); // plaques texturées
  for (i = 0; i < 3; i++) vmCyl(b, .007, .048, VC.poly, 0, .03 - i * .026, -.028, 0, Math.PI / 2, 0, 6); // creux des doigts
  for (i = 0; i < 4; i++) vmBox(b, .028, .004, .004, VC.polyE, 0, .03 - i * .02, .0285, 0, 0, 0, 0); // dos quadrillé
  vmBox(b, .056, .012, .062, VC.poly, 0, -.058, .002, 0, 0, 0, .004);                         // puits évasé
  vmFist(b, .025, .028);
  vmPop(b);
  vmCup(b, -.012, -.08, -.01, .03, .02, .05);                                                 // main gauche en soutien
  vmArm(b, [.02, -.07, .05], [.07, -.2, .32], .027);
  vmArm(b, [-.03, -.11, .02], [-.12, -.22, .3], .026);
  vmMesh(g, b);
  // Glissière biseautée (recule à chaque tir, reste ouverte quand le chargeur est vide)
  const s = vmNew();
  vmPrism(s, vmTop(.056, .045, .009), VM_TOP_F, .25, VC.blue, 0, .0105, -.12, 0, 0, 0, .97);
  for (const sd of [-1, 1]){
    for (i = 0; i < 6; i++) vmBox(s, .003, .03, .0035, VC.park, sd * .0282, .008, -.006 - i * .007, 0, 0, 0, 0); // stries arrière
    for (i = 0; i < 4; i++) vmBox(s, .003, .026, .0035, VC.park, sd * .0275, .008, -.2 - i * .008, 0, 0, 0, 0); // stries avant
  }
  vmBox(s, .002, .018, .046, VC.port, .0281, .02, -.088, 0, 0, 0, 0);                        // fenêtre d'éjection
  vmBox(s, .014, .002, .046, VC.port, .016, .0331, -.088, 0, 0, 0, 0);
  vmBox(s, .003, .005, .02, VC.steel, .0287, .022, -.056, 0, 0, 0, 0);                       // extracteur
  vmBox(s, .01, .002, .05, VC.port, 0, .0331, -.18, 0, 0, 0, 0);                             // allègement du dessus
  vmBox(s, .044, .008, .014, VC.park, 0, .036, -.006, 0, 0, 0, 0);                            // hausse
  vmBox(s, .013, .014, .012, VC.park, -.0125, .044, -.006, 0, 0, 0, 0);
  vmBox(s, .013, .014, .012, VC.park, .0125, .044, -.006, 0, 0, 0, 0);
  vmBox(s, .0042, .0042, .001, VC.glowD, -.0125, .046, .0003, 0, 0, 0, 0);                   // points de la hausse
  vmBox(s, .0042, .0042, .001, VC.glowD, .0125, .046, .0003, 0, 0, 0, 0);
  vmBox(s, .007, .017, .012, VC.park, 0, .0425, -.232, 0, 0, 0, 0);                            // guidon
  vmBox(s, .005, .005, .001, VC.glow, 0, .0465, -.2255, 0, 0, 0, 0);
  vmBox(s, .006, .004, .006, VC.glow, 0, SY - .002, -.232, 0, 0, 0, 0);
  vmRing(s, .0105, .0062, .004, VC.blue, 0, .012, -.244, 0, 0, 0, 8);                          // bouche
  const slide = vmMesh(g, s);
  // Chargeur (descend puis remonte à la recharge)
  const mg = vmNew();
  vmBox(mg, .04, .1, .046, VC.blue, 0, .004, 0, 0, 0, 0, .004);
  vmBox(mg, .054, .012, .062, VC.poly, 0, -.064, .002, 0, 0, 0, .004);
  vmBox(mg, .012, .004, .008, VC.brass, 0, .055, -.008, 0, 0, 0, 0);                          // cartouche du dessus
  const mag = vmMesh(g, mg, null, 0, -.098, .008); mag.rotation.x = -.26;
  g.userData = { muzzle: -.25, muzzleY: .012, sightY: SY, adsZ: -.30, sight: [V3(0, SY, -.232), V3(0, SY, -.006)],
    slide, slideAmp: .032, slideLock: true, mag, magDir: V3(0, -Math.cos(.26), Math.sin(.26)), magDrop: .2,
    eject: V3(.03, .025, -.085), shell: 0 };
  return g;
}

/* ---------- Fusil à pompe ---------- */
function vmPompe(V3){
  const g = new THREE.Group(), b = vmNew(); let i;
  const SY = .053;
  // Boîte de culasse au dessus arrondi, fenêtre d'éjection, fenêtre de chargement, goupilles
  vmPrism(b, vmTop(.064, .084, .016), VM_TOP_F, .22, VC.blue, 0, 0, -.06);
  vmBox(b, .002, .022, .07, VC.port, .0322, .012, -.07, 0, 0, 0, 0);                         // éjection
  vmBox(b, .003, .012, .05, VC.steel, .0325, .012, -.07, 0, 0, 0, 0);                         // culasse dans la fenêtre
  vmBox(b, .036, .002, .1, VC.port, 0, -.0421, -.07, 0, 0, 0, 0);                            // fenêtre de chargement
  for (i = 0; i < 2; i++) vmCyl(b, .0045, .068, VC.light, 0, -.018, -.01 - i * .1, 0, Math.PI / 2, 0, 6); // goupilles
  vmBox(b, .002, .004, .18, VC.park, .0322, -.03, -.06, 0, 0, 0, 0);                          // filet de gravure
  vmBox(b, .002, .004, .18, VC.park, -.0322, -.03, -.06, 0, 0, 0, 0);
  vmBox(b, .03, .006, .22, VC.park, 0, .044, -.06, 0, 0, 0, 0);                              // bande du dessus
  // Canon, bande ventilée, magasin tubulaire
  vmCyl(b, .017, .53, VC.blue, 0, .022, -.435, 0, 0, 0, 12);                                  // canon
  vmBox(b, .008, .004, .52, VC.park, 0, .0425, -.43, 0, 0, 0, 0);                            // bande ventilée
  for (i = 0; i < 9; i++) vmBox(b, .006, .006, .005, VC.park, 0, .0375, -.2 - i * .06, 0, 0, 0, 0);
  vmRing(b, .0195, .011, .012, VC.park, 0, .022, -.696, 0, 0, 0, 10);                        // bouche
  vmCyl(b, .014, .47, VC.blue, 0, -.018, -.405, 0, 0, 0, 10);                                 // magasin tubulaire
  vmCyl(b, .016, .03, VC.steel, 0, -.018, -.655, 0, 0, 0, 10);                                // bouchon
  vmBox(b, .012, .018, .006, VC.steel, 0, -.036, -.66, 0, 0, 0, 0);                           // anneau de bretelle
  vmBox(b, .022, .058, .016, VC.park, 0, .002, -.6, 0, 0, 0, .004);                          // collier
  const ir = vmNew();                                                                          // mires (cachées sous le point rouge)
  vmCyl(ir, .0045, .005, VC.glow, 0, SY - .0045, -.682, Math.PI / 2, 0, 0, 6);              // bille du guidon
  vmBox(ir, .008, .011, .012, VC.park, -.009, SY - .0055, -.008, 0, 0, 0, 0);               // cran de mire
  vmBox(ir, .008, .011, .012, VC.park, .009, SY - .0055, -.008, 0, 0, 0, 0);
  // Pontet, détente, sûreté
  vmBox(b, .014, .007, .06, VC.blue, 0, -.067, .0, 0, 0, 0, 0);                              // pontet
  vmBox(b, .014, .03, .008, VC.blue, 0, -.054, -.03, .2, 0, 0, 0);
  vmBox(b, .005, .022, .006, VC.light, 0, -.052, -.005, .3, 0, 0, 0);                        // détente
  vmCyl(b, .005, .07, VC.red, 0, -.045, .03, 0, Math.PI / 2, 0, 6);                          // sûreté (point rouge)
  vmBox(b, .006, .014, .02, VC.steel, -.033, -.035, -.05, 0, 0, 0, 0);                        // arrêtoir de la pompe
  // Porte-cartouches sur le flanc gauche
  vmBox(b, .006, .05, .1, VC.poly, -.0345, -.004, -.053, 0, 0, 0, .002);
  for (i = 0; i < 4; i++){
    vmCyl(b, .0085, .036, VC.red, -.04, -.003, -.02 - i * .022, Math.PI / 2, 0, 0, 7);
    vmCyl(b, .009, .008, VC.brass, -.04, -.025, -.02 - i * .022, Math.PI / 2, 0, 0, 7);
  }
  // Crosse en bois : poignée pistolet, poignet, talon, plaque de couche à liseré
  vmPush(b, 0, -.036, .095, -.32);
  vmBox(b, .046, .075, .1, VC.wood, 0, 0, 0, 0, 0, 0, .014);                                  // poignée
  for (i = 0; i < 4; i++) vmBox(b, .048, .003, .05, VC.woodD, 0, .02 - i * .014, -.01, 0, 0, 0, 0); // quadrillage
  vmBox(b, .05, .012, .03, VC.woodD, 0, -.042, .0, 0, 0, 0, .004);                            // calotte
  vmPush(b, 0, -.012, .02, .32); vmFist(b, .023, .03); vmPop(b);
  vmPop(b);
  vmPrism(b, vmTop(.05, .09, .016), VM_TOP_F, .22, VC.wood, 0, -.048, .235, -.08, 0, 0, .86); // crosse
  vmBox(b, .044, .03, .12, VC.woodD, 0, .006, .22, -.08, 0, 0, .01);                          // busc
  vmBox(b, .056, .11, .006, VC.cera, 0, -.06, .328, -.08, 0, 0, .002);                         // liseré
  vmBox(b, .056, .11, .02, VC.rubber, 0, -.06, .342, -.08, 0, 0, .008);                       // plaque de couche
  vmBox(b, .008, .01, .016, VC.steel, 0, -.108, .29, -.08, 0, 0, 0);                          // anneau de bretelle
  vmCyl(b, .004, .056, VC.light, 0, -.03, .2, 0, Math.PI / 2, 0, 6);
  vmArm(b, [.02, -.03, .14], [.08, -.2, .36], .028);
  vmMesh(g, b); const irons = vmMesh(g, ir);
  // Pompe : garde-main arrondi en bois, rainures, barres d'action, main gauche
  const p = vmNew();
  vmPrism(p, vmEll(.034, .028, 12), null, .2, VC.wood, 0, -.022, -.34);
  for (i = 0; i < 8; i++) vmRing(p, .0345, .031, .006, VC.woodD, 0, -.022, -.262 - i * .022, 0, 0, 0, 12);
  vmBox(p, .004, .008, .11, VC.steel, .03, -.012, -.19, 0, 0, 0, 0);                         // barres d'action
  vmBox(p, .004, .008, .11, VC.steel, -.03, -.012, -.19, 0, 0, 0, 0);
  vmCup(p, 0, -.022, -.35, .033, .025, .075);
  vmArm(p, [-.03, -.06, -.31], [-.16, -.24, -.02], .027);
  const pump = vmMesh(g, p);
  // Cartouche qu'on glisse dans la fenêtre pendant la recharge
  const sh = vmNew();
  vmCyl(sh, .0085, .05, VC.red, 0, 0, 0, 0, 0, 0, 7); vmCyl(sh, .009, .01, VC.brass, 0, 0, .028, 0, 0, 0, 7);
  vmBox(sh, .045, .02, .05, VC.glove, 0, -.02, .02, 0, 0, 0, .006);                          // pouce qui pousse
  const load = vmMesh(g, sh, null, 0, -.06, -.06); load.visible = false;
  g.userData = { irons, muzzle: -.7, muzzleY: .022, sightY: SY, adsZ: -.24, sight: [V3(0, SY, -.682), V3(0, SY, -.008)],
    pump, pumpAmp: .075, load, eject: V3(.034, .012, -.07), shell: 1 };
  return g;
}

/* ---------- Fusil d'assaut ---------- */
function vmAssaut(V3){
  const g = new THREE.Group(), b = vmNew(); let i;
  const SY = .095;
  // Boîte de culasse supérieure : rail continu, fenêtre et couvre-poussière, assistance de fermeture, déflecteur, levier d'armement
  vmPrism(b, vmTop(.058, .05, .008), VM_TOP_F, .26, VC.gun, 0, .02, -.04);
  vmRail(b, 0, .049, -.17, .52, .026, VC.gun, 18);
  vmBox(b, .002, .018, .05, VC.port, .0292, .022, -.04, 0, 0, 0, 0);                          // fenêtre d'éjection
  vmBox(b, .004, .02, .05, VC.park, .033, .004, -.04, .5, 0, 0, 0);                           // couvre-poussière ouvert
  vmCyl(b, .008, .022, VC.steel, .032, .036, .055, 0, 0, 0, 7);                               // assistance de fermeture
  vmBox(b, .006, .016, .02, VC.gun, .031, .03, .03, 0, 0, 0, 0);                              // déflecteur de douilles
  vmBox(b, .03, .008, .016, VC.park, 0, .04, .1, 0, 0, 0, 0);                                 // levier d'armement
  vmBox(b, .05, .006, .012, VC.park, 0, .04, .11, 0, 0, 0, 0);
  // Boîte inférieure : puits évasé, bouton du chargeur, arrêtoir, sélecteur, pontet, détente, goupilles
  vmPrism(b, vmTop(.054, .05, .006), VM_TOP_F, .2, VC.gun, 0, -.03, -.01, Math.PI, 0, 0);
  vmBox(b, .05, .05, .07, VC.gun, 0, -.062, -.11, 0, 0, 0, .006);                             // puits du chargeur
  vmBox(b, .056, .01, .074, VC.gun, 0, -.086, -.11, 0, 0, 0, .003);                           // évasement
  vmBox(b, .016, .01, .014, VC.light, -.03, -.025, .03, 0, 0, .3, 0);                          // sélecteur
  vmCyl(b, .006, .006, VC.steel, .029, -.04, -.08, 0, Math.PI / 2, 0, 6);                    // bouton du chargeur
  vmBox(b, .004, .022, .016, VC.park, -.029, -.03, -.07, 0, 0, 0, 0);                         // arrêtoir de culasse
  vmBox(b, .014, .006, .07, VC.park, 0, -.083, -.03, 0, 0, 0, 0);                             // pontet
  vmBox(b, .005, .022, .006, VC.light, 0, -.064, -.035, .3, 0, 0, 0);                         // détente
  for (i = 0; i < 2; i++) vmCyl(b, .004, .058, VC.steel, 0, -.02, -.07 + i * .1, 0, Math.PI / 2, 0, 6); // goupilles
  vmPush(b, 0, -.095, .045, -.38);
  vmBox(b, .034, .085, .044, VC.poly, 0, 0, 0, 0, 0, 0, .01);                                 // poignée
  for (i = 0; i < 5; i++) vmBox(b, .037, .004, .03, VC.polyE, 0, .03 - i * .015, .002, 0, 0, 0, 0);
  vmBox(b, .036, .008, .046, VC.polyE, 0, -.044, .0, 0, 0, 0, .003);
  vmFist(b, .017, .022);
  vmPop(b);
  // Garde-main sable à fentes, rail du dessus prolongé
  vmPrism(b, vmTop(.062, .062, .016), VM_TOP_F, .3, VC.fde, 0, .018, -.32);
  for (const sd of [-1, 1]) for (i = 0; i < 4; i++) vmBox(b, .002, .01, .036, VC.port, sd * .0312, .012, -.21 - i * .065, 0, 0, 0, 0); // fentes
  for (i = 0; i < 3; i++) vmBox(b, .024, .002, .036, VC.port, 0, -.0131, -.23 - i * .07, 0, 0, 0, 0);
  vmRing(b, .034, .028, .02, VC.gun, 0, .02, -.165, 0, 0, 0, 10);                              // écrou du canon
  // Canon, bloc des gaz, cache-flamme
  vmCyl(b, .011, .2, VC.blue, 0, .02, -.565, 0, 0, 0, 8);
  vmBox(b, .03, .03, .03, VC.park, 0, .022, -.5, 0, 0, 0, .006);                              // bloc des gaz
  vmBox(b, .03, .022, .03, VC.park, 0, .032, -.6, 0, 0, 0, .005);                             // base du guidon
  vmCyl(b, .0135, .045, VC.park, 0, .02, -.685, 0, 0, 0, 8);                                  // cache-flamme
  for (i = 0; i < 2; i++) vmBox(b, .03, .003, .03, VC.port, 0, .02, -.69, 0, 0, Math.PI / 4 + i * Math.PI / 2, 0);
  vmCyl(b, .007, .003, VC.port, 0, .02, -.708, 0, 0, 0, 8);
  const ir = vmNew();                                                                           // mires (rabattues sous une optique)
  vmBox(ir, .008, .045, .022, VC.park, 0, .065, -.6, .15, 0, 0, 0);                           // tour du guidon
  vmBox(ir, .005, .03, .012, VC.park, -.013, .085, -.6, 0, 0, 0, 0);                         // oreilles
  vmBox(ir, .005, .03, .012, VC.park, .013, .085, -.6, 0, 0, 0, 0);
  vmBox(ir, .031, .005, .012, VC.park, 0, .072, -.6, 0, 0, 0, 0);
  vmBox(ir, .0045, .02, .006, VC.park, 0, SY - .01, -.6, 0, 0, 0, 0);                         // guidon
  vmBox(ir, .004, .004, .001, VC.glow, 0, SY - .0025, -.5965, 0, 0, 0, 0);
  vmBox(ir, .03, .012, .03, VC.park, 0, .064, .05, 0, 0, 0, .004);                            // hausse à œilleton
  vmBox(ir, .005, .045, .02, VC.park, -.013, .089, .05, 0, 0, 0, 0);
  vmBox(ir, .005, .045, .02, VC.park, .013, .089, .05, 0, 0, 0, 0);
  vmBox(ir, .006, .014, .006, VC.park, 0, .077, .05, 0, 0, 0, 0);
  vmRing(ir, .0085, .0035, .005, VC.park, 0, SY, .05, 0, 0, 0, 8);
  // Crosse réglable sable : tube, corps, appui-joue, plaque, boucle de bretelle
  vmCyl(b, .015, .22, VC.park, 0, .006, .2, 0, 0, 0, 8);                                      // tube de crosse
  vmRing(b, .019, .014, .012, VC.park, 0, .006, .1, 0, 0, 0, 8);                               // écrou de crosse
  vmPrism(b, vmTop(.044, .07, .012), VM_TOP_F, .17, VC.fde, 0, -.008, .25, 0, 0, 0, .9);      // corps de crosse
  vmBox(b, .046, .022, .1, VC.fdeD, 0, -.045, .27, 0, 0, 0, .006);                             // levier de réglage
  vmBox(b, .04, .012, .12, VC.fdeD, 0, .032, .26, 0, 0, 0, .004);                              // appui-joue
  vmBox(b, .05, .095, .02, VC.rubber, 0, -.015, .34, 0, 0, 0, .008);
  vmBox(b, .006, .016, .02, VC.steel, -.026, -.03, .2, 0, 0, 0, 0);                            // boucle de bretelle
  vmCup(b, 0, .018, -.36, .031, .031, .07);                                                   // main gauche
  vmArm(b, [-.035, -.03, -.32], [-.17, -.22, -.02], .028);
  vmArm(b, [.02, -.06, .1], [.08, -.2, .34], .028);
  vmMesh(g, b); const irons = vmMesh(g, ir);
  // Culasse visible dans la fenêtre (recule à chaque tir)
  const c = vmNew(); vmBox(c, .002, .012, .034, VC.light, .0298, .022, -.04, 0, 0, 0, 0); vmBox(c, .003, .004, .01, VC.steel, .031, .022, -.03, 0, 0, 0, 0);
  const slide = vmMesh(g, c);
  // Chargeur courbe en polymère, nervures, fenêtre de cartouches, semelle
  const mg = vmNew();
  vmBox(mg, .03, .08, .06, VC.poly, 0, -.03, 0, 0, 0, 0, .006);
  vmBox(mg, .03, .07, .056, VC.poly, 0, -.1, .01, .25, 0, 0, .006);
  for (i = 0; i < 2; i++) vmBox(mg, .032, .05, .004, VC.polyE, 0, -.05, -.015 + i * .03, 0, 0, 0, 0);
  vmBox(mg, .032, .03, .012, VC.polyE, 0, -.04, .02, 0, 0, 0, 0);
  vmBox(mg, .012, .004, .03, VC.brass, 0, .011, .0, 0, 0, 0, 0);                              // cartouche du dessus
  vmBox(mg, .034, .01, .064, VC.polyE, 0, -.138, .02, .25, 0, 0, .003);
  const mag = vmMesh(g, mg, null, 0, -.06, -.11);
  g.userData = { irons, muzzle: -.71, muzzleY: .02, sightY: SY, adsZ: -.2, sight: [V3(0, SY, -.6), V3(0, SY, .05)],
    slide, slideAmp: .028, mag, magDir: V3(0, -1, .05), magDrop: .25, eject: V3(.032, .022, -.04), shell: 2 };
  return g;
}

/* ---------- Sniper ---------- */
function vmSniper(V3){
  const g = new THREE.Group(), b = vmNew(); let i;
  const SY = .09;
  // Fût en bois effilé, quadrillage, embouchoir, grenadière
  vmPrism(b, vmTop(.058, .06, .014), VM_TOP_F, .36, VC.wood, 0, -.012, -.4, 0, 0, 0, .86);    // fût
  vmBox(b, .062, .05, .22, VC.wood, 0, -.02, -.11, 0, 0, 0, .012);                            // sous la culasse
  for (const sd of [-1, 1]) for (i = 0; i < 5; i++) vmBox(b, .002, .022, .006, VC.woodD, sd * .029, -.016, -.36 - i * .02, 0, 0, 0, 0); // quadrillage
  vmBox(b, .052, .02, .02, VC.woodD, 0, -.01, -.575, 0, 0, 0, .006);                           // embouchoir
  vmBox(b, .008, .012, .018, VC.steel, 0, -.046, -.5, 0, 0, 0, 0);                             // grenadière
  // Boîte de culasse ronde, fenêtre, tenon, levier de chargeur
  vmCyl(b, .021, .22, VC.blue, 0, .02, -.1, 0, 0, 0, 12);
  vmBox(b, .002, .016, .07, VC.port, .021, .026, -.04, 0, 0, 0, 0);
  vmBox(b, .03, .012, .03, VC.blue, 0, -.002, -.19, 0, 0, 0, .003);                           // tenon de recul
  vmBox(b, .012, .006, .02, VC.light, 0, -.054, -.09, 0, 0, 0, 0);                             // arrêtoir du chargeur
  // Canon lourd à cannelures, frein de bouche à évents
  vmCyl(b, .016, .64, VC.blue, 0, .02, -.53, 0, 0, 0, 10, .72);
  for (i = 0; i < 4; i++){ const a = i / 4 * Math.PI * 2 + Math.PI / 4; vmBox(b, .003, .003, .32, VC.port, Math.cos(a) * .0135, .02 + Math.sin(a) * .0135, -.6, 0, 0, a, 0); }
  vmCyl(b, .016, .065, VC.park, 0, .02, -.88, 0, 0, 0, 10);
  for (i = 0; i < 3; i++) vmBox(b, .036, .008, .01, VC.port, 0, .02, -.865 - i * .018, 0, 0, 0, 0);
  vmCyl(b, .007, .003, VC.port, 0, .02, -.913, 0, 0, 0, 8);
  // Lunette d'origine : tube, objectif évasé, pare-soleil, tourelles à capuchons, molette de parallaxe, colliers vissés
  vmCyl(b, .016, .3, VC.blue, 0, SY, -.16, 0, 0, 0, 12);
  vmCyl(b, .025, .07, VC.blue, 0, SY, -.345, 0, 0, 0, 12, 1); vmCyl(b, .016, .05, VC.blue, 0, SY, -.3, 0, 0, 0, 12, 1.55);
  vmRing(b, .027, .022, .03, VC.park, 0, SY, -.392, 0, 0, 0, 12);                             // pare-soleil
  vmCyl(b, .022, .002, VC.lens, 0, SY, -.38, 0, 0, 0, 12);                                     // verre avant
  vmBox(b, .009, .006, .001, VC.lensHi, -.007, SY + .009, -.3805, 0, 0, .4, 0);
  vmCyl(b, .016, .05, VC.blue, 0, SY, .02, 0, 0, 0, 12, 1); vmCyl(b, .021, .04, VC.rubber, 0, SY, .06, 0, 0, 0, 12, .85); // oculaire
  vmRing(b, .0215, .019, .008, VC.park, 0, SY, .03, 0, 0, 0, 12);                              // bague de réglage
  vmCyl(b, .016, .002, VC.lens, 0, SY, .0805, 0, 0, 0, 12);
  vmCyl(b, .011, .022, VC.park, 0, SY + .022, -.16, Math.PI / 2, 0, 0, 10);                    // tourelles
  vmCyl(b, .012, .006, VC.light, 0, SY + .034, -.16, Math.PI / 2, 0, 0, 10);
  vmCyl(b, .011, .022, VC.park, .022, SY, -.16, 0, Math.PI / 2, 0, 10);
  vmCyl(b, .012, .006, VC.light, .034, SY, -.16, 0, Math.PI / 2, 0, 10);
  vmCyl(b, .009, .02, VC.park, -.02, SY, -.16, 0, Math.PI / 2, 0, 8);                          // parallaxe
  for (i = 0; i < 2; i++){                                                                       // colliers et embases
    const z = i ? -.235 : -.06;
    vmRing(b, .02, .016, .018, VC.park, 0, SY, z, 0, 0, 0, 12);
    vmBox(b, .02, .03, .016, VC.park, 0, .055, z, 0, 0, 0, .004);
    vmCyl(b, .003, .046, VC.light, 0, SY - .012, z, 0, Math.PI / 2, 0, 6);
  }
  vmRail(b, 0, .044, -.15, .24, .02, VC.park, 8);                                              // rail sous la lunette
  // Pontet, détente, poignée pistolet, crosse à busc et plaque de couche
  vmBox(b, .014, .006, .066, VC.blue, 0, -.05, -.06, 0, 0, 0, 0);
  vmBox(b, .014, .02, .006, VC.blue, 0, -.042, -.092, .3, 0, 0, 0);
  vmBox(b, .005, .022, .006, VC.light, 0, -.04, -.06, .3, 0, 0, 0);
  vmPush(b, 0, -.07, .045, -.36);
  vmBox(b, .044, .085, .055, VC.wood, 0, 0, 0, 0, 0, 0, .014);                                 // poignée
  for (i = 0; i < 4; i++) vmBox(b, .046, .003, .04, VC.woodD, 0, .022 - i * .014, -.004, 0, 0, 0, 0);
  vmBox(b, .046, .01, .05, VC.woodD, 0, -.044, 0, 0, 0, 0, .004);                              // calotte
  vmFist(b, .022, .026);
  vmPop(b);
  vmPrism(b, vmTop(.052, .11, .016), VM_TOP_F, .22, VC.wood, 0, -.045, .19, 0, 0, 0, .92);    // crosse
  vmBox(b, .046, .03, .12, VC.woodD, 0, .022, .19, 0, 0, 0, .01);                             // appui-joue
  vmBox(b, .054, .12, .02, VC.rubber, 0, -.045, .31, 0, 0, 0, .008);
  vmBox(b, .008, .01, .016, VC.steel, 0, -.103, .26, 0, 0, 0, 0);                             // anneau de bretelle
  vmVis(b, .0295, -.02, -.5, .004); vmVis(b, -.0295, -.02, -.5, .004);                         // vis du fût
  vmCup(b, 0, -.012, -.43, .029, .03, .07);
  vmArm(b, [-.035, -.06, -.39], [-.17, -.24, -.08], .028);
  vmArm(b, [.02, -.05, .11], [.08, -.2, .34], .028);
  vmMesh(g, b);
  // Levier de culasse (pivote sur l'axe de la culasse puis recule)
  const bl = vmNew();
  vmCyl(bl, .016, .1, VC.light, 0, 0, .02, 0, 0, 0, 10);
  vmCyl(bl, .012, .02, VC.steel, 0, 0, .075, 0, 0, 0, 10);                                    // chien de culasse
  vmBox(bl, .036, .007, .008, VC.light, .026, 0, .045, 0, 0, -.35, 0);
  vmCyl(bl, .01, .016, VC.park, .046, -.008, .045, 0, Math.PI / 2, 0, 10);
  const boltM = vmMesh(g, bl, null, 0, .02, 0);
  const mg = vmNew(); vmBox(mg, .036, .05, .07, VC.park, 0, 0, 0, 0, 0, 0, .006); vmBox(mg, .04, .008, .074, VC.blue, 0, -.026, 0, 0, 0, 0, .003);
  const mag = vmMesh(g, mg, null, 0, -.046, -.12);
  g.userData = { muzzle: -.91, muzzleY: .02, sightY: SY, adsZ: -.2, sight: [V3(0, SY, -.38), V3(0, SY, .08)],
    boltM, mag, magDir: V3(0, -1, 0), magDrop: .2, eject: V3(.025, .03, -.04), shell: 3 };
  return g;
}

/* ---------- Toutes les armes du toit ---------- */
function buildVM(){
  const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
  VMS.pistol = vmPistolet(V3); VMS.shotgun = vmPompe(V3); VMS.rifle = vmAssaut(V3); VMS.sniper = vmSniper(V3);
  VMS.crossbow = vmArbalete(V3); VMS.flamer = vmFlammes(V3); VMS.minigun = vmMinigun(V3); VMS.rocket = vmRoquettes(V3); // 04-arme-modeles2.js
  Object.keys(VMS).forEach(k => {
    const v = VMS[k]; v.visible = false; vmRoot.add(v); vmArme(v);
    v.userData.tris = vmTris(v);
    if (v.userData.mag){ v.userData.magBase = v.userData.mag.position.clone(); }
    if (v.userData.pump) v.userData.pumpBase = v.userData.pump.position.z;
  });
}
// Triangles des pièces visibles d'une arme (sans l'éclair)
function vmTris(o){ let n = 0; o.traverse(m => { if (m.isMesh && m.geometry) n += (m.geometry.index ? m.geometry.index.count : m.geometry.attributes.position.count) / 3; }); return n; }
