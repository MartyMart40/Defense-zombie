'use strict';
/* Tests du décor vivant du toit (js/68-toit-decor.js, dossier 113) : fenêtres qui s'allument et s'éteignent,
   bord du toit et objets de toit, pieux et état de la barricade. Purement visuel. */
(function(){
  if (typeof test !== 'function') return;
  const exiger = () => { if (lire('typeof __toitDecor === "object" && typeof __toitDecor.tdMonde === "function"') !== true) ignorer('Décor du toit absent (js/68-toit-decor.js)'); };

  test('Décor du toit : fenêtres sur les façades, une part allumée la nuit, presque rien de jour', () => {
    exiger(); reset();
    const r = J(function(){
      var D = __toitDecor, o = {};
      startLocation(2); // Banlieue Nord : ville de nuit
      if (typeof ambSet === 'function') ambSet('nuitClaire', true);
      D.avance(60);
      var F = D.TD.fen; o.n = F ? F.fen.length : 0; o.dansMonde = !!(F && F.mesh.parent === world);
      o.allumees = F ? F.fen.filter(function(w){ return w.lvl > .5; }).length : 0;
      o.moment = D.tdMoment();
      o.couleurs = F ? Array.prototype.some.call(F.col.array, function(v){ return v > 0; }) : false;
      startLocation(0); // Saint-Clou de jour
      if (typeof ambSet === 'function') ambSet('soleil', true);
      D.avance(90);
      F = D.TD.fen; o.n2 = F ? F.fen.length : 0;
      o.jour = F ? F.fen.filter(function(w){ return w.lvl > .5; }).length : 0; o.moment2 = D.tdMoment();
      // Ça bouge : en 60 s de nuit, des fenêtres changent
      startLocation(2); if (typeof ambSet === 'function') ambSet('nuit', true); D.avance(20);
      F = D.TD.fen; var avant = F.fen.map(function(w){ return w.cible; }).join('');
      D.avance(60); var apres = F.fen.map(function(w){ return w.cible; }).join('');
      o.bouge = avant !== apres;
      return o;
    });
    ok(r.n >= 200 && r.dansMonde, 'Fenêtres posées sur les façades : ' + r.n);
    egal(r.moment, 'nuit', 'Banlieue Nord, nuit claire');
    const part = r.allumees / Math.max(1, r.n);
    ok(part >= .04 && part <= .14, 'Part allumée la nuit (5 à 12 % visés) : ' + Math.round(part * 1000) / 10 + ' %');
    ok(r.couleurs, 'Les fenêtres allumées ont une couleur');
    egal(r.moment2, 'jour', 'Saint-Clou, grand soleil');
    ok(r.jour / Math.max(1, r.n2) <= .03, 'De jour : presque rien (' + r.jour + ' sur ' + r.n2 + ')');
    ok(r.bouge, 'Des fenêtres s\'allument et s\'éteignent avec le temps');
  });

  test('Décor du toit : rien ne fuit quand la rue est rebâtie (géométries, textures)', () => {
    exiger(); reset();
    const r = J(function(){
      startLocation(1); renderer.render(scene, camera);
      // Le décor tiré au hasard change le compte d'une rue à l'autre (sans fuite) : base = le plus haut de 4 rues,
      // puis 8 rues de plus ; une vraie fuite monte à chaque rue, donc même le plus bas des 4 dernières dépasserait la base.
      var g1 = 0, t1 = 0, gF = 1e9, tF = 1e9, k;
      for (k = 0; k < 4; k++){ buildWorld(curLoc); renderer.render(scene, camera); g1 = Math.max(g1, renderer.info.memory.geometries); t1 = Math.max(t1, renderer.info.memory.textures); }
      for (k = 0; k < 8; k++){ buildWorld(curLoc); renderer.render(scene, camera); if (k >= 4){ gF = Math.min(gF, renderer.info.memory.geometries); tF = Math.min(tF, renderer.info.memory.textures); } }
      var deco = 0, fen = 0; world.traverse(function(m){ if (m.name === 'toitDecor') deco++; if (m.name === 'toitFenetres') fen++; });
      return { g1: g1, t1: t1, g2: gF, t2: tF, deco: deco, fen: fen };
    });
    egal(r.deco, 1, 'Un seul décor de toit dans la rue');
    egal(r.fen, 1, 'Une seule géométrie de fenêtres dans la rue');
    ok(r.g2 <= r.g1 + 3, 'Géométries après 8 rues de plus : ' + r.g1 + ' puis ' + r.g2);
    ok(r.t2 <= r.t1 + 2, 'Textures après 8 rues de plus : ' + r.t1 + ' puis ' + r.t2);
  });

  test('Décor du toit : bord du toit, objets et sacs fusionnés ; rien du toit dans le robot ; pas une cible de tir', () => {
    exiger(); reset();
    const r = J(function(){
      var D = __toitDecor, o = {};
      startLocation(0); visuals(1 / 30);
      o.deco = !!D.TD.deco && D.TD.deco.visible; o.sacs = D.TD.sacs.length; o.sacsCaches = D.TD.sacs.every(function(s){ return !s.visible; });
      o.cible = hitMeshes.indexOf(D.TD.deco) >= 0 || (D.TD.fen && hitMeshes.indexOf(D.TD.fen.mesh) >= 0);
      if (typeof __mech === 'object'){
        P.mech.unlocked = true; __mech.mechStart(); for (var i = 0; i < 3; i++) visuals(1 / 30);
        o.robot = !!Jeu.actif(); o.decoRobot = D.TD.deco ? D.TD.deco.visible : false;
        __mech.mechQuit(); visuals(1 / 30);
        o.decoApres = D.TD.deco ? D.TD.deco.visible : false;
      }
      return o;
    });
    ok(r.deco, 'Décor du toit visible sur le toit');
    ok(r.sacs >= 15 && r.sacsCaches, 'Sacs d\'origine remplacés par les sacs fusionnés : ' + r.sacs);
    ok(!r.cible, 'Le décor ne doit pas être une cible de tir');
    if (r.robot !== undefined){
      ok(r.robot, 'Le robot est le mode actif');
      egal(r.decoRobot, false, 'Rien du toit n\'est affiché dans le robot');
      egal(r.decoApres, true, 'Le décor revient sur le toit');
    }
  });

  test('Décor du toit : la barricade penche sous 60 % et perd des planches sous 30 %, puis revient', () => {
    exiger(); reset();
    const r = J(function(){
      var D = __toitDecor, B, o = {};
      startLocation(0); state = 'playing';
      B = D.TD.bar; o.planches = B ? B.planches.length : 0;
      var rot = function(){ return B.planches.map(function(p){ return p.o.rotation.z.toFixed(3) + (p.o.visible ? 1 : 0); }).join(','); };
      var r0 = rot();
      S.bar = S.barMax * .5; visuals(1 / 30); o.e1 = D.TD.etat; o.r1 = rot() !== r0; o.vis1 = B.planches.every(function(p){ return p.o.visible; });
      S.bar = S.barMax * .2; visuals(1 / 30); o.e2 = D.TD.etat; o.manque = B.planches.filter(function(p){ return !p.o.visible; }).length;
      S.bar = S.barMax; visuals(1 / 30); o.e0 = D.TD.etat; o.retour = rot() === r0;
      state = 'menu';
      return o;
    });
    ok(r.planches >= 16, 'Planches de la barricade trouvées : ' + r.planches);
    ok(r.e1 === 1 && r.r1 && r.vis1, 'Sous 60 % : des planches penchent, aucune ne manque');
    ok(r.e2 === 2 && r.manque >= 2, 'Sous 30 % : des planches manquent (' + r.manque + ')');
    ok(r.e0 === 0 && r.retour, 'Réparée : la barricade revient comme avant');
  });

  test('Décor du toit : appels de dessin sous le plafond (au plus 4 de plus qu\'avant)', () => {
    exiger(); reset();
    const r = J(function(){
      var D = __toitDecor;
      startLocation(1); clearZombies(); state = 'menu'; yaw = 0; pitch = -.16; camera.rotation.set(pitch, yaw, 0); camera.updateMatrixWorld();
      visuals(1 / 30); renderer.render(scene, camera); var avec = renderer.info.render.calls;
      // Sans le décor : sacs d'origine remis, décor et fenêtres cachés
      D.TD.deco.visible = false; D.TD.fen.mesh.visible = false; D.TD.sacs.forEach(function(s){ s.visible = true; });
      renderer.render(scene, camera); var sans = renderer.info.render.calls;
      visuals(1 / 30);
      return { avec: avec, sans: sans };
    });
    ok(r.avec <= r.sans + 4, 'Appels de dessin : ' + r.sans + ' sans le décor, ' + r.avec + ' avec');
  });
})();
