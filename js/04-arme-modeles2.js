'use strict';
/* Arme en main, suite de js/04-arme-modeles.js (tâche 108) : arbalète, lance-flammes, minigun, lance-roquettes,
   et les modèles du canon électromagnétique et du fusil à arc (appelés par arsBuild, js/34-arsenal.js).
   Mêmes points d'accroche qu'avant (voir le haut de 04-arme-modeles.js). */

/* ---------- Arbalète à poulies ---------- */
function vmArbalete(V3){
  const g = new THREE.Group(), b = vmNew(); let i;
  const SY = .083;
  // Rail en aluminium avec rainure, mécanisme, rail d'optique
  vmPrism(b, vmTop(.034, .03, .006), VM_TOP_F, .46, VC.gun, 0, .012, -.37);
  vmBox(b, .028, .006, .44, VC.steel, 0, .026, -.38, 0, 0, 0, .002);                          // piste du carreau
  vmBox(b, .004, .003, .44, VC.port, 0, .0305, -.38, 0, 0, 0, 0);                             // rainure
  for (const sd of [-1, 1]) for (i = 0; i < 4; i++) vmBox(b, .002, .012, .05, VC.port, sd * .0172, .01, -.24 - i * .08, 0, 0, 0, 0); // allègements
  vmBox(b, .05, .04, .11, VC.park, 0, .036, -.15, 0, 0, 0, .008);                              // mécanisme
  vmBox(b, .012, .01, .012, VC.light, 0, .057, -.2, 0, 0, 0, 0);                               // noix
  vmBox(b, .014, .008, .02, VC.red, .026, .04, -.13, 0, 0, 0, 0);                              // sûreté
  for (i = 0; i < 2; i++) vmVis(b, .0255, .03, -.12 - i * .045, .004);
  vmRail(b, 0, .059, -.15, .09, .02, VC.park, 4);
  // Arc : support, branches doubles, poulies, câbles
  vmBox(b, .08, .06, .06, VC.park, 0, .02, -.585, 0, 0, 0, .012);                              // support
  vmBox(b, .03, .02, .03, VC.gun, 0, -.014, -.585, 0, 0, 0, .004);
  for (const s of [-1, 1]){
    for (const dy of [-.009, .009]){
      vmBox(b, .14, .007, .026, VC.poly, s * .1, .03 + dy, -.575, 0, -s * .12, 0, .002);
      vmBox(b, .1, .006, .022, VC.poly, s * .21, .03 + dy * .8, -.553, 0, -s * .35, 0, .002);
    }
    vmBox(b, .03, .03, .034, VC.park, s * .045, .03, -.583, 0, -s * .1, 0, .005);              // sabots des branches
    vmCyl(b, .021, .01, VC.steel, s * .262, .03, -.536, Math.PI / 2, 0, 0, 12);                // poulie
    vmCyl(b, .006, .03, VC.park, s * .262, .03, -.536, Math.PI / 2, 0, 0, 6);                  // axe
    vmCylAB(b, [s * .262, .022, -.536], [-s * .02, .022, -.575], .0018, VC.rubber, 4);         // câble croisé
  }
  vmBox(b, .01, .05, .03, VC.park, -.025, -.02, -.622, .35, 0, 0, 0);                           // étrier
  vmBox(b, .01, .05, .03, VC.park, .025, -.02, -.622, .35, 0, 0, 0);
  vmBox(b, .06, .01, .012, VC.park, 0, -.044, -.64, 0, 0, 0, 0);
  const ir = vmNew();                                                                            // mires (rabattues sous une optique)
  vmBox(ir, .006, .03, .01, VC.park, 0, .065, -.6, 0, 0, 0, 0);                                // guidon
  vmBox(ir, .005, .005, .001, VC.glow, 0, SY - .004, -.5945, 0, 0, 0, 0);
  vmBox(ir, .028, .006, .01, VC.park, 0, .051, -.6, 0, 0, 0, 0);
  vmBox(ir, .006, .03, .01, VC.park, 0, .068, -.1, 0, 0, 0, 0);                                // œilleton
  vmRing(ir, .0075, .0032, .005, VC.park, 0, SY, -.1, 0, 0, 0, 8);
  // Poignée avant avec garde-doigts (les doigts restent sous la corde)
  vmBox(b, .04, .022, .12, VC.poly, 0, -.012, -.36, 0, 0, 0, .006);
  vmBox(b, .06, .03, .008, VC.poly, 0, -.008, -.295, 0, 0, 0, .003);
  // Pontet, détente, poignée pistolet, crosse squelette
  vmBox(b, .014, .006, .06, VC.park, 0, -.045, -.12, 0, 0, 0, 0);
  vmBox(b, .005, .022, .006, VC.light, 0, -.035, -.12, .3, 0, 0, 0);
  vmPush(b, 0, -.065, -.075, -.3);
  vmBox(b, .04, .08, .05, VC.poly, 0, 0, 0, 0, 0, 0, .012);
  for (i = 0; i < 4; i++) vmBox(b, .042, .003, .036, VC.polyE, 0, .02 - i * .013, -.004, 0, 0, 0, 0);
  vmFist(b, .02, .024);
  vmPop(b);
  vmBox(b, .03, .022, .2, VC.poly, 0, .028, .03, 0, 0, 0, .006);                              // barre haute (appui-joue)
  vmBox(b, .03, .04, .12, VC.poly, 0, -.04, .0, -.25, 0, 0, .008);                             // barre basse
  vmBox(b, .046, .1, .05, VC.poly, 0, -.02, .12, 0, 0, 0, .012);                               // talon
  vmBox(b, .05, .11, .02, VC.rubber, 0, -.02, .155, 0, 0, 0, .008);
  vmCup(b, 0, -.006, -.36, .028, .026, .07);
  vmArm(b, [-.035, -.05, -.32], [-.17, -.24, -.02], .028);
  vmArm(b, [.02, -.05, -.03], [.08, -.2, .26], .028);
  vmMesh(g, b); const irons = vmMesh(g, ir);
  // Corde tendue (carreau en place) ou relâchée (après le tir)
  const sd = vmNew(); vmCylAB(sd, [-.262, .036, -.536], [0, .036, -.2], .0022, VC.string, 4); vmCylAB(sd, [.262, .036, -.536], [0, .036, -.2], .0022, VC.string, 4);
  vmBox(sd, .02, .006, .006, VC.rubber, 0, .036, -.2, 0, 0, 0, 0);                              // point d'encochage
  const strDrawn = vmMesh(g, sd);
  const sr = vmNew(); vmCylAB(sr, [-.262, .036, -.536], [.262, .036, -.536], .0022, VC.string, 4);
  const strRel = vmMesh(g, sr); strRel.visible = false;
  // Carreau (affiché seulement quand il est chargé : 20-armes.js)
  const cb = vmNew();
  vmCyl(cb, .0045, .4, VC.gun, 0, 0, 0, 0, 0, 0, 6);
  vmCyl(cb, .007, .04, VC.light, 0, 0, -.22, 0, 0, Math.PI / 4, 4, .05);                      // pointe
  vmRing(cb, .0055, .004, .006, VC.brass, 0, 0, -.19, 0, 0, 0, 6);
  for (i = 0; i < 3; i++) vmBox(cb, .002, .016, .05, VC.red, 0, 0, .16, 0, 0, i * Math.PI * 2 / 3, 0); // plumes
  const bolt = vmMesh(g, cb, null, 0, .043, -.4);
  g.userData = { irons, muzzle: -.64, muzzleY: .04, sightY: SY, adsZ: -.22, sight: [V3(0, SY, -.6), V3(0, SY, -.1)], bolt, strDrawn, strRel };
  return g;
}

/* ---------- Lance-flammes ---------- */
function vmFlammes(V3){
  const g = new THREE.Group(), b = vmNew(); let i;
  const SY = .052;
  // Corps arrondi, bouclier perforé, buse, allumeur
  vmPrism(b, vmEll(.032, .035, 10), null, .38, VC.olive, 0, 0, -.12);
  for (i = 0; i < 3; i++) vmCyl(b, .004, .068, VC.light, 0, -.02, -.02 - i * .12, 0, Math.PI / 2, 0, 6); // vis
  vmPrism(b, vmCirc(.026, 8), null, .32, VC.park, 0, .01, -.47, 0, 0, 0, .92);              // bouclier perforé
  for (i = 0; i < 5; i++) for (const s of [-1, 1]) vmBox(b, .004, .012, .024, VC.port, s * .0245, .01, -.35 - i * .055, 0, 0, 0, 0);
  for (i = 0; i < 5; i++) vmBox(b, .016, .004, .024, VC.port, 0, .0355, -.35 - i * .055, 0, 0, 0, 0);
  for (i = 0; i < 3; i++) vmRing(b, .029, .025, .008, VC.steel, 0, .01, -.33 - i * .12, 0, 0, 0, 8); // colliers
  vmCyl(b, .014, .1, VC.steel, 0, .01, -.67, 0, 0, 0, 8);                                     // buse
  vmCyl(b, .022, .05, VC.park, 0, .01, -.72, 0, 0, 0, 10, .78);
  vmRing(b, .016, .009, .006, VC.blue, 0, .01, -.745, 0, 0, 0, 10);
  vmCyl(b, .009, .003, VC.port, 0, .01, -.746, 0, 0, 0, 8);
  vmCyl(b, .008, .05, VC.steel, 0, -.022, -.715, 0, 0, 0, 6);                                // allumeur
  vmCylAB(b, [.0, -.022, -.69], [.012, -.01, -.6], .003, VC.red, 4);                          // fil de l'allumeur
  vmBox(b, .008, .011, .012, VC.park, -.009, SY - .0055, -.02, 0, 0, 0, 0);                   // cran de mire
  vmBox(b, .008, .011, .012, VC.park, .009, SY - .0055, -.02, 0, 0, 0, 0);
  vmBox(b, .022, .012, .016, VC.park, 0, .04, -.02, 0, 0, 0, 0);
  vmBox(b, .006, .017, .01, VC.park, 0, SY - .0085, -.6, 0, 0, 0, 0);                         // guidon
  vmBox(b, .005, .005, .001, VC.glow, 0, SY - .003, -.5945, 0, 0, 0, 0);
  // Réservoir de carburant (rouge, bande jaune) et bouteille de pression (gris) à gauche, sangles, tuyaux
  vmCyl(b, .045, .22, VC.red, 0, -.088, -.14, 0, 0, 0, 12);
  vmCyl(b, .045, .03, VC.red, 0, -.088, -.265, 0, 0, 0, 12, .6); vmCyl(b, .045, .03, VC.red, 0, -.088, -.015, 0, 0, 0, 12, 1);
  for (i = 0; i < 2; i++) vmRing(b, .048, .044, .012, VC.steel, 0, -.088, -.07 - i * .14, 0, 0, 0, 12); // sangles
  vmRing(b, .0465, .044, .03, VC.yellow, 0, -.088, -.14, 0, 0, 0, 12);
  vmCyl(b, .022, .2, VC.light, -.062, -.07, -.14, 0, 0, 0, 10);                               // bouteille de pression
  vmCyl(b, .022, .02, VC.light, -.062, -.07, -.25, 0, 0, 0, 10, .5);
  vmCyl(b, .009, .02, VC.park, -.062, -.07, -.025, 0, 0, 0, 8);                               // robinet
  vmCylAB(b, [-.062, -.07, -.015], [-.03, -.05, .02], .005, VC.rubber, 5);
  vmCyl(b, .01, .03, VC.light, 0, -.04, -.24, Math.PI / 2, 0, 0, 7);                          // valve
  vmBox(b, .03, .006, .01, VC.red, 0, -.024, -.24, 0, 0, 0, 0);                                // poignée de la valve
  vmCylAB(b, [0, -.035, -.27], [0, -.03, -.32], .007, VC.rubber, 6); vmCylAB(b, [0, -.03, -.32], [0, -.012, -.37], .007, VC.rubber, 6);
  vmCyl(b, .015, .012, VC.steel, .046, -.075, -.1, 0, Math.PI / 2, 0, 10);                   // manomètre
  vmCyl(b, .012, .001, VC.face, .0525, -.075, -.1, 0, Math.PI / 2, 0, 10);
  // Poignée arrière, poignée avant, crosse
  vmPush(b, 0, -.075, .03, -.3);
  vmBox(b, .036, .085, .048, VC.poly, 0, 0, 0, 0, 0, 0, .01);
  for (i = 0; i < 5; i++) vmBox(b, .039, .004, .034, VC.polyE, 0, .028 - i * .014, .001, 0, 0, 0, 0);
  vmFist(b, .018, .024);
  vmPop(b);
  vmBox(b, .014, .006, .05, VC.park, 0, -.05, -.01, 0, 0, 0, 0);                              // pontet
  vmBox(b, .005, .02, .006, VC.light, 0, -.042, -.01, .3, 0, 0, 0);
  vmPush(b, 0, -.06, -.36, -.08);
  vmBox(b, .032, .08, .036, VC.poly, 0, 0, 0, 0, 0, 0, .01);                                   // poignée avant
  for (i = 0; i < 4; i++) vmBox(b, .035, .004, .03, VC.polyE, 0, .02 - i * .014, .0, 0, 0, 0, 0);
  vmPush(b, 0, 0, 0, 0, 0, 0, -1); vmFist(b, .016, .018); vmPop(b);
  vmPop(b);
  vmPrism(b, vmTop(.046, .06, .012), VM_TOP_F, .14, VC.olive, 0, -.01, .14, 0, 0, 0, .9);     // crosse
  vmBox(b, .048, .07, .02, VC.rubber, 0, -.01, .215, 0, 0, 0, .008);
  vmArm(b, [-.03, -.03, -.33], [-.16, -.24, -.06], .028);
  vmArm(b, [.02, -.05, .09], [.08, -.2, .33], .028);
  vmMesh(g, b);
  // Aiguille du manomètre (montre le carburant)
  const nd = vmNew(); vmBox(nd, .001, .002, .009, VC.red, 0, 0, -.0045, 0, 0, 0, 0);
  const needle = vmMesh(g, nd, null, .0532, -.075, -.1);
  // Veilleuse allumée
  const pl = vmNew();
  vmCyl(pl, .007, .03, [1, .45, .1], 0, 0, -.012, 0, 0, 0, 6, .1); vmCyl(pl, .006, .008, [1, .45, .1], 0, 0, .007, 0, 0, 0, 6, 1);
  vmCyl(pl, .0035, .014, [.25, .4, 1], 0, 0, .004, 0, 0, 0, 5, .3);
  const pilot = vmMesh(g, pl, vmFlameMat, 0, -.022, -.75); pilot.renderOrder = 2;
  g.userData = { muzzle: -.75, muzzleY: .01, sightY: SY, adsZ: -.24, sight: [V3(0, SY, -.6), V3(0, SY, -.02)], pilot, needle };
  return g;
}

/* ---------- Minigun ---------- */
function vmMinigun(V3){
  const g = new THREE.Group(), b = vmNew(); let i;
  const SY = .118;
  // Carter rond du rotor, moteur, palier avant, poignée de transport
  vmCyl(b, .06, .24, VC.park, 0, -.005, -.04, 0, 0, 0, 12);
  for (i = 0; i < 4; i++) vmRing(b, .062, .058, .008, VC.blue, 0, -.005, .05 - i * .03, 0, 0, 0, 12); // nervures
  vmBox(b, .1, .05, .1, VC.park, 0, -.04, .06, 0, 0, 0, .01);                                  // boîte de mise à feu
  for (i = 0; i < 3; i++) vmVis(b, .051, -.04, .03 + i * .03, .004);
  vmCyl(b, .032, .11, VC.olive, .075, -.03, .03, 0, 0, 0, 10);                                 // moteur
  for (i = 0; i < 4; i++) vmRing(b, .034, .03, .006, VC.oliveD, .075, -.03, .0 + i * .022, 0, 0, 0, 10);
  vmCyl(b, .024, .012, VC.steel, .075, -.03, -.03, 0, 0, 0, 10);
  vmCylAB(b, [.075, -.06, .07], [.03, -.09, .1], .006, VC.rubber, 5);                         // câble du moteur
  vmCyl(b, .058, .024, VC.blue, 0, -.005, -.17, 0, 0, 0, 12);                                  // palier avant
  vmBox(b, .012, .04, .012, VC.park, 0, .065, .04, 0, 0, 0, 0);                                // poignée de transport
  vmBox(b, .012, .04, .012, VC.park, 0, .065, -.1, 0, 0, 0, 0);
  vmBox(b, .022, .016, .17, VC.rubber, 0, .093, -.03, 0, 0, 0, .006);
  vmBox(b, .007, .017, .01, VC.park, -.009, SY - .0085, .04, 0, 0, 0, 0);                      // cran de mire
  vmBox(b, .007, .017, .01, VC.park, .009, SY - .0085, .04, 0, 0, 0, 0);
  vmBox(b, .005, .017, .01, VC.park, 0, SY - .0085, -.1, 0, 0, 0, 0);                          // guidon
  vmBox(b, .0045, .0045, .001, VC.glow, 0, SY - .003, -.0945, 0, 0, 0, 0);
  // Boîte de munitions, goulotte souple, bande
  vmBox(b, .08, .11, .14, VC.olive, -.11, -.08, .0, 0, 0, 0, .012);
  vmBox(b, .084, .012, .144, VC.oliveD, -.11, -.02, .0, 0, 0, 0, .004);
  vmBox(b, .081, .016, .1, VC.yellow, -.11, -.1, .0, 0, 0, 0, 0);
  vmBox(b, .02, .02, .01, VC.steel, -.11, -.05, -.072, 0, 0, 0, 0);
  for (i = 0; i < 4; i++) vmBox(b, .044, .02, .03, VC.oliveD, -.085 + i * .012, -.028 + i * .006, -.01, 0, 0, .5, .004); // goulotte articulée
  for (i = 0; i < 6; i++) vmCyl(b, .0045, .03, VC.brass, -.082 + i * .007, .0 - i * .004 + (i > 2 ? .006 : 0), -.04, Math.PI / 2, 0, 0, 6);
  // Poignée arrière et poignée avant
  vmPush(b, 0, -.1, .07, -.3);
  vmBox(b, .036, .085, .046, VC.poly, 0, 0, 0, 0, 0, 0, .01);
  for (i = 0; i < 5; i++) vmBox(b, .039, .004, .032, VC.polyE, 0, .028 - i * .014, .001, 0, 0, 0, 0);
  vmFist(b, .018, .023);
  vmPop(b);
  vmBox(b, .014, .006, .05, VC.park, 0, -.075, .02, 0, 0, 0, 0);
  vmBox(b, .008, .016, .01, VC.red, 0, -.06, .0, 0, 0, 0, 0);                                   // détente rouge
  vmPush(b, 0, -.1, -.2, -.05);
  vmBox(b, .03, .08, .034, VC.poly, 0, 0, 0, 0, 0, 0, .01);                                     // poignée avant
  vmPush(b, 0, 0, 0, 0, 0, 0, -1); vmFist(b, .015, .017); vmPop(b);
  vmPop(b);
  vmBox(b, .02, .03, .02, VC.park, 0, -.055, -.2, 0, 0, 0, 0);
  vmArm(b, [-.03, -.07, -.17], [-.17, -.25, .08], .029);
  vmArm(b, [.02, -.06, .12], [.08, -.2, .36], .029);
  vmMesh(g, b);
  // Barillet de 6 canons (tourne) : colliers, cache-flamme
  const br = vmNew();
  for (i = 0; i < 6; i++){
    const a = i / 6 * Math.PI * 2, x = Math.cos(a) * .03, y = Math.sin(a) * .03;
    vmCyl(br, .0095, .5, VC.steel, x, y, 0, 0, 0, 0, 6);
    vmCyl(br, .005, .003, VC.port, x, y, -.2505, 0, 0, 0, 6);
  }
  vmRing(br, .046, .04, .016, VC.blue, 0, 0, -.2, 0, 0, 0, 12);                                // cache-flamme
  vmCyl(br, .044, .012, VC.blue, 0, 0, -.05, 0, 0, 0, 10);                                     // colliers
  vmCyl(br, .044, .012, VC.blue, 0, 0, .1, 0, 0, 0, 10);
  vmCyl(br, .048, .07, VC.park, 0, 0, .2, 0, 0, 0, 12);
  vmCyl(br, .012, .52, VC.blue, 0, 0, 0, 0, 0, 0, 6);
  const barrels = vmMesh(g, br, null, 0, -.005, -.42);
  g.userData = { muzzle: -.67, muzzleY: -.005, sightY: SY, adsZ: -.26, sight: [V3(0, SY, -.1), V3(0, SY, .04)], barrels,
    eject: V3(.04, -.07, -.05), ejectDown: true, shell: 4 };
  return g;
}

/* ---------- Lance-roquettes (tube à garde de bois) ---------- */
function vmRoquettes(V3){
  const g = new THREE.Group(), b = vmNew(); let i;
  const SY = .098;
  // Tube d'acier, garde de chaleur en bois, venturi évasé à l'arrière, bagues
  vmCyl(b, .042, .88, VC.gun, 0, .02, -.24, 0, 0, 0, 12);
  vmRing(b, .05, .04, .04, VC.park, 0, .02, -.67, 0, 0, 0, 12);                                // bouche
  vmPrism(b, vmCirc(.052, 12), null, .2, VC.wood, 0, .02, -.2, 0, 0, 0);                       // garde de chaleur en bois
  for (i = 0; i < 4; i++) vmBox(b, .106, .003, .004, VC.woodD, 0, .02, -.13 - i * .045, 0, 0, Math.PI / 2, 0);
  for (const z of [-.305, -.095]) vmRing(b, .055, .05, .012, VC.park, 0, .02, z, 0, 0, 0, 12);
  vmCyl(b, .045, .08, VC.gun, 0, .02, .24, 0, 0, 0, 12, .9);                                    // venturi
  vmRing(b, .068, .048, .1, VC.park, 0, .02, .32, 0, 0, 0, 12);
  vmCyl(b, .048, .004, VC.port, 0, .02, .27, 0, 0, 0, 12);
  for (const z of [-.5, .17]) vmRing(b, .046, .042, .02, VC.park, 0, .02, z, 0, 0, 0, 12);
  vmBox(b, .05, .03, .1, VC.rubber, 0, -.035, .1, 0, 0, 0, .01);                              // appui d'épaule
  const ir = vmNew();                                                                           // mires (rabattues sous une optique)
  vmBox(ir, .03, .008, .04, VC.park, 0, .066, -.58, 0, 0, 0, 0);                              // guidon à cadre
  vmBox(ir, .004, .045, .006, VC.park, -.016, .09, -.58, 0, 0, 0, 0);
  vmBox(ir, .004, .045, .006, VC.park, .016, .09, -.58, 0, 0, 0, 0);
  vmBox(ir, .036, .004, .006, VC.park, 0, .113, -.58, 0, 0, 0, 0);
  vmBox(ir, .004, .026, .005, VC.park, 0, SY - .013, -.58, 0, 0, 0, 0);
  vmBox(ir, .004, .004, .001, VC.glow, 0, SY - .0025, -.577, 0, 0, 0, 0);
  vmBox(ir, .03, .008, .03, VC.park, 0, .066, -.04, 0, 0, 0, 0);                              // hausse à œilleton
  vmBox(ir, .006, .024, .006, VC.park, 0, .08, -.04, 0, 0, 0, 0);
  vmRing(ir, .0095, .0038, .005, VC.park, 0, SY, -.04, 0, 0, 0, 8);
  // Viseur optique sur le côté gauche
  vmBox(b, .012, .03, .05, VC.park, -.055, .045, -.1, 0, 0, 0, .003);
  vmBox(b, .03, .04, .11, VC.blue, -.075, .06, -.1, 0, 0, 0, .007);
  vmCyl(b, .013, .03, VC.rubber, -.075, .06, -.03, 0, 0, 0, 8);
  vmCyl(b, .012, .002, VC.lens, -.075, .06, -.1565, 0, 0, 0, 8);
  vmBox(b, .005, .004, .001, VC.lensHi, -.079, .065, -.1575, 0, 0, .4, 0);
  vmCyl(b, .006, .012, VC.park, -.075, .084, -.1, Math.PI / 2, 0, 0, 7);
  // Poignées
  vmPush(b, 0, -.075, -.02, -.3);
  vmBox(b, .036, .085, .048, VC.wood, 0, 0, 0, 0, 0, 0, .01);
  for (i = 0; i < 5; i++) vmBox(b, .039, .004, .034, VC.woodD, 0, .028 - i * .014, .001, 0, 0, 0, 0);
  vmFist(b, .018, .024);
  vmPop(b);
  vmBox(b, .014, .006, .06, VC.park, 0, -.056, -.07, 0, 0, 0, 0);                              // pontet
  vmBox(b, .005, .02, .006, VC.light, 0, -.045, -.07, .3, 0, 0, 0);
  vmBox(b, .04, .03, .1, VC.park, 0, -.03, -.04, 0, 0, 0, .004);                               // mécanisme
  vmCyl(b, .006, .05, VC.steel, 0, -.02, -.02, 0, Math.PI / 2, 0, 6);
  vmPush(b, 0, -.065, -.3, -.1);
  vmBox(b, .032, .075, .036, VC.wood, 0, 0, 0, 0, 0, 0, .01);
  vmPush(b, 0, 0, 0, 0, 0, 0, -1); vmFist(b, .016, .018); vmPop(b);
  vmPop(b);
  vmBox(b, .03, .02, .04, VC.park, 0, -.026, -.3, 0, 0, 0, 0);
  vmBox(b, .012, .02, .006, VC.steel, .045, -.01, -.4, 0, 0, 0, 0);                            // anneaux de bretelle
  vmBox(b, .012, .02, .006, VC.steel, .045, -.01, .14, 0, 0, 0, 0);
  vmArm(b, [-.03, -.04, -.27], [-.17, -.24, .02], .029);
  vmArm(b, [.02, -.04, .03], [.08, -.2, .3], .029);
  vmMesh(g, b); const irons = vmMesh(g, ir);
  // Roquette (visible quand chargée : 20-armes.js)
  const w = vmNew();
  vmCyl(w, .02, .06, VC.oliveD, 0, 0, .03, 0, 0, 0, 8);
  vmCyl(w, .045, .06, VC.olive, 0, 0, -.03, 0, 0, 0, 12, 1); vmCyl(w, .03, .02, VC.olive, 0, 0, .01, 0, 0, 0, 12, 1.5);
  vmCyl(w, .045, .1, VC.olive, 0, 0, -.11, 0, 0, 0, 12, .3);
  vmRing(w, .046, .04, .012, VC.red, 0, 0, -.05, 0, 0, 0, 12);
  vmCyl(w, .009, .03, VC.light, 0, 0, -.175, 0, 0, 0, 6, .6);
  const warhead = vmMesh(g, w, null, 0, .02, -.72);
  g.userData = { irons, muzzle: -.71, muzzleY: .02, sightY: SY, adsZ: -.2, sight: [V3(0, SY, -.58), V3(0, SY, -.04)], warhead };
  return g;
}

/* ---------- Canon électromagnétique (appelé par arsBuild, 34-arsenal.js) ---------- */
function vmMRailgun(V3){
  const g = new THREE.Group(), b = vmNew(); let i;
  const SY = .11;
  // Deux rails d'acier dont les faces intérieures s'illuminent, cadres de serrage, bobines de cuivre
  for (const x of [-.026, .026]){
    vmBox(b, .016, .05, .62, VC.steel, x, .02, -.36, 0, 0, 0, .004);
    vmBox(b, .003, .03, .6, ARS_C.blueG, x * .64, .02, -.36, 0, 0, 0, 0);
  }
  for (i = 0; i < 5; i++){                                                                       // cadres de serrage
    const z = -.1 - i * .13;
    vmBox(b, .084, .012, .022, VC.gun, 0, .052, z, 0, 0, 0, .003);
    vmBox(b, .084, .012, .022, VC.gun, 0, -.012, z, 0, 0, 0, .003);
    vmVis(b, .042, .052, z, .004); vmVis(b, .042, -.012, z, .004);
  }
  for (i = 0; i < 3; i++){ const z = -.165 - i * .13;                                           // bobines
    vmRing(b, .052, .042, .045, ARS_C.copper, 0, .02, z, 0, 0, 0, 12);
    vmRing(b, .0425, .04, .046, ARS_C.blueG, 0, .02, z, 0, 0, 0, 10);
  }
  vmRing(b, .05, .04, .02, VC.gun, 0, .02, -.665, 0, 0, 0, 10);                                // bague de bouche
  // Corps, capot à évents, rail d'optique
  vmPrism(b, vmTop(.08, .08, .016), VM_TOP_F, .22, VC.gun, 0, .01, .0);
  for (i = 0; i < 4; i++) vmBox(b, .002, .04, .008, VC.port, .0405, .01, -.06 + i * .03, 0, 0, 0, 0); // évents
  vmRail(b, 0, .057, -.17, .3, .03, VC.park, 10);
  // Batterie de condensateurs à gauche : trois tubes à bouchons lumineux, cadre, câbles
  vmBox(b, .07, .074, .12, VC.park, -.08, .0, .02, 0, 0, 0, .01);
  for (i = 0; i < 3; i++){
    vmCyl(b, .011, .12, VC.light, -.102 + i * .022, .046, .02, 0, 0, 0, 8);                   // couchés le long de l'arme
    vmCyl(b, .0115, .01, ARS_C.blueG, -.102 + i * .022, .046, -.045, 0, 0, 0, 8);
  }
  vmBox(b, .072, .012, .08, ARS_C.blueG, -.08, -.02, .02, 0, 0, 0, 0);                          // jauge de charge
  vmCylAB(b, [-.08, .03, -.04], [-.034, .03, -.12], .006, VC.rubber, 5);                      // câbles vers les rails
  vmCylAB(b, [-.08, -.01, -.04], [-.034, .0, -.2], .006, VC.rubber, 5);
  // Garde-main sous les rails (la main gauche le tient)
  vmPrism(b, vmTop(.06, .03, .008), VM_TOP_F, .16, VC.poly, 0, -.034, -.22, Math.PI, 0, 0);
  // Crosse en polymère avec appui-joue
  vmPrism(b, vmTop(.046, .08, .014), VM_TOP_F, .16, VC.poly, 0, -.01, .2, 0, 0, 0, .9);
  vmBox(b, .04, .014, .1, VC.polyE, 0, .036, .2, 0, 0, 0, .004);
  vmBox(b, .05, .1, .02, VC.rubber, 0, -.01, .29, 0, 0, 0, .008);
  const ir = vmNew(); arsSights(ir, SY, -.48, .05);
  arsHands(b, .06, -.22, -.02, .04);
  vmMesh(g, b); const irons = vmMesh(g, ir);
  g.userData = { irons, muzzle: -.68, muzzleY: .02, sightY: SY, adsZ: -.22, sight: [V3(0, SY, -.48), V3(0, SY, .05)], eject: V3(.045, .01, .02), shell: 7 };
  return g;
}

/* ---------- Fusil à arc électrique (appelé par arsBuild) ---------- */
function vmMArc(V3){
  const g = new THREE.Group(), b = vmNew(); let i;
  const SY = .1;
  // Corps en laiton bruni, tige centrale, bobine de cuivre entre isolants de céramique
  vmPrism(b, vmTop(.06, .065, .012), VM_TOP_F, .26, VC.park, 0, .01, -.05);
  vmBox(b, .062, .012, .2, ARS_C.copper, 0, -.012, -.05, 0, 0, 0, .003);                      // bande de cuivre
  for (i = 0; i < 3; i++) vmVis(b, .031, .03, -.12 + i * .06, .004);
  vmCyl(b, .018, .3, VC.steel, 0, .02, -.32, 0, 0, 0, 8);                                      // tige
  for (i = 0; i < 7; i++) vmRing(b, .034, .02, .016, ARS_C.copper, 0, .02, -.22 - i * .036, 0, 0, 0, 10); // bobine
  for (i = 0; i < 2; i++) vmCyl(b, .038, .01, VC.cera, 0, .02, -.2 - i * .26, 0, 0, 0, 12);     // isolants
  // Globe et cage à trois griffes aux pointes lumineuses
  vmCyl(b, .045, .06, ARS_C.violet, 0, .02, -.52, 0, 0, 0, 12, .4);
  vmCyl(b, .03, .03, ARS_C.violet, 0, .02, -.49, 0, 0, 0, 12);
  for (i = 0; i < 3; i++){ const a = i / 3 * Math.PI * 2 + Math.PI / 2, cx = Math.cos(a), cy = Math.sin(a);
    vmCylAB(b, [cx * .036, .02 + cy * .036, -.46], [cx * .05, .02 + cy * .05, -.53], .004, ARS_C.copper, 5);
    vmCyl(b, .006, .01, ARS_C.violet, cx * .05, .02 + cy * .05, -.54, 0, 0, 0, 6);
  }
  // Tiges latérales sur isolants, tubes condensateurs lumineux
  for (const s of [-1, 1]){
    vmBox(b, .008, .008, .2, ARS_C.copper, s * .042, .02, -.36, 0, 0, 0, 0);
    vmCyl(b, .009, .014, VC.cera, s * .042, .02, -.27, 0, 0, 0, 8);
    vmCyl(b, .009, .014, VC.cera, s * .042, .02, -.44, 0, 0, 0, 8);
    vmCyl(b, .011, .12, ARS_C.violet, s * .04, .045, -.06, 0, 0, 0, 8);
    vmCyl(b, .013, .012, ARS_C.copper, s * .04, .045, -.125, 0, 0, 0, 8);
    vmCyl(b, .013, .012, ARS_C.copper, s * .04, .045, .005, 0, 0, 0, 8);
  }
  // Pile, jauge, câble, crosse en bois à plaque de laiton
  vmBox(b, .05, .06, .08, VC.blue, 0, -.05, -.05, 0, 0, 0, .008);
  vmBox(b, .052, .012, .05, ARS_C.violet, 0, -.03, -.05, 0, 0, 0, 0);
  vmCylAB(b, [.02, -.06, -.09], [.024, .0, -.2], .005, VC.rubber, 5);
  vmPrism(b, vmTop(.04, .07, .012), VM_TOP_F, .16, VC.woodD, 0, -.01, .17, 0, 0, 0, .9);
  vmBox(b, .044, .085, .02, VC.brass, 0, -.01, .255, 0, 0, 0, .008);
  const ir = vmNew(); arsSights(ir, SY, -.2, .04);
  arsHands(b, .05, -.15, .0, .032);
  vmMesh(g, b); const irons = vmMesh(g, ir);
  g.userData = { irons, muzzle: -.56, muzzleY: .02, sightY: SY, adsZ: -.2, sight: [V3(0, SY, -.2), V3(0, SY, .04)] };
  return g;
}
