'use strict';
/* Tests de la course du robot qu'on peut gagner (js/40-robot-fin.js) : carrefour, boss final, tours, sauvegardes */
(function(){
  if (typeof test !== 'function' || typeof TESTS === 'undefined') return;
  const exiger = () => { if (lire('typeof __mechFin === "object" && typeof __mb === "object" && typeof __mech === "object"') !== true) ignorer('Fin de course du robot absente (js/40-robot-fin.js)'); };
  const fin = () => J(function(){ if (MECH.on) mechQuit(); if (typeof __mechSave === 'object') __mechSave.mechSaveClear(); });

  test('Robot fin : le carrefour apparaît en marchant jusqu’au bout de la rue', () => {
    exiger(); reset();
    const r = J(function(){
      var o = {}, M = MECH; mechStart(); clearZombies(); __mb.MB.waveT = 1e9; S.bar = S.barMax = 1e7;
      M.mv.f = 1; var i = 0;
      for (; i < 30 * 60 && !M.choosing; i++){ spawnT = 1e9; plan.queue = ['walker']; visuals(1 / 30); }
      M.mv.f = 0;
      o.choix = M.choosing; o.fondu = M.fade; o.panneau = !document.getElementById('mechPanel').classList.contains('hide');
      o.boutons = document.querySelectorAll('#mechPanel button[data-i]').length; o.rue = M.street;
      document.querySelectorAll('#mechPanel button[data-i]')[2].click();
      for (i = 0; i < 60; i++){ spawnT = 1e9; plan.queue = ['walker']; visuals(1 / 30); }
      o.rue2 = M.street; o.hud = document.getElementById('mkStreet').textContent; o.route = !!M.route;
      return o;
    });
    fin();
    ok(r.choix && r.panneau, 'Carrefour montré au bout de la rue (avant : jamais, le fondu partait avant lui)');
    ok(r.fondu <= 0, 'Pas de fondu tant que la rue n’est pas choisie : ' + r.fondu);
    egal(r.boutons, 3, 'Trois rues au choix'); egal(r.rue, 1, 'Toujours à la rue 1 pendant le choix');
    egal(r.rue2, 2, 'Rue suivante après le choix'); ok(r.route, 'La règle de la rue choisie est gardée');
    egal(r.hud, 'Rue 2 sur 9 · Tour 1', 'Progression affichée');
  });

  test('Robot fin : rue 9, boss final, bout de la rue fermé, victoire et tour 2 débloqué', () => {
    exiger(); reset();
    const r = J(function(){
      var o = {}, M = MECH, F = __mechFin, sc0;
      mechStart(); clearZombies(); __mb.MB.waveT = 1e9;
      M.street = 9; mechStreet(false); clearZombies(); S.bar = S.barMax = 1e7;
      o.fileSansBoss = plan.queue.filter(function(t){ return __mb.MB_BOSS.indexOf(t) >= 0 || t === 'boss'; }).length;
      mechHUD(); o.hud = document.getElementById('mkStreet').textContent;
      M.mv.f = 1;
      for (var i = 0; i < 30 * 50; i++){ spawnT = 1e9; plan.queue = ['walker']; __mb.MB.waveT = 1e9; visuals(1 / 30); }
      M.mv.f = 0;
      var b = M.finBoss;
      o.boss = !!b && b.finalBoss === true && !b.dead; o.nom = document.getElementById('mkBossName').textContent;
      o.ferme = M.dist <= __mech.MECH_LEN - 1 + 1e-6 && !M.choosing && M.street === 9 && state === 'mech';
      o.arret = b ? Math.abs(b.stopZ - (-5.5 - F.MECH_FIN.bossArret)) < 1e-6 : false;
      // Mi-vie : il appelle la horde
      b.hp = b.maxHp * .45; var w0 = __mb.MB.waveN; visuals(1 / 30); o.moitie = M.finMoitie && __mb.MB.waveN > w0;
      sc0 = P.scrap || 0;
      kill(b, false, b.g.position.clone());
      o.etat = state; o.gagne = M.won; o.profil = JSON.parse(JSON.stringify(P.mechFin));
      o.prime = (P.scrap || 0) - sc0 >= F.mechPrime(1);
      o.sauvegarde = typeof __mechSave === 'object' ? __mechSave.mechSaveGet() === null : true;
      // Écran « Course réussie » (normalement 1,5 s plus tard)
      F.mechWinPanel(M.victoire);
      var pn = document.getElementById('mechPanel'); o.ecran = /Course réussie/.test(pn.textContent) && /9 sur 9/.test(pn.textContent) && /Prime de victoire/.test(pn.textContent) && /Temps/.test(pn.textContent);
      o.btns = Array.prototype.map.call(pn.querySelectorAll('button[data-i]'), function(x){ return x.textContent; });
      // « Tour suivant » : nouvelle course au tour 2, zombies plus forts, plus de ferraille
      var p1 = { hp: 0, f: 0 }; M.tour = 1; M.street = 1; M.renf = 0; var a = mechPlan(); p1.hp = a.hpMult; p1.f = scrapFor('walker', curLoc);
      pn.querySelectorAll('button[data-i]')[0].click();
      o.tour = M.tour; o.etat2 = state; o.rue = M.street;
      var c = mechPlan(); o.vie = c.hpMult / p1.hp; o.pv = F.MECH_FIN.pv; o.ferT = F.MECH_FIN.fer; o.fer = scrapFor('walker', curLoc) / p1.f;
      mechHUD(); o.hud2 = document.getElementById('mkStreet').textContent;
      return o;
    });
    fin();
    egal(r.fileSansBoss, 0, 'Rue 9 : pas de boss ordinaire dans la file');
    egal(r.hud, 'Rue 9 sur 9 · Tour 1', 'Progression : dernière rue');
    ok(r.boss, 'Le boss final arrive au milieu de la rue 9'); ok(/Titan roi/.test(r.nom), 'Barre de vie du boss final : ' + r.nom);
    ok(r.ferme, 'Le bout de la rue reste fermé tant que le boss vit (pas de carrefour)');
    ok(r.arret, 'Le boss final s’arrête à distance (pas de corps à corps)');
    ok(r.moitie, 'À mi-vie, il appelle une vague');
    egal(r.etat, 'mechover', 'Fin de course'); ok(r.gagne, 'Course gagnée');
    egal(r.profil.tour, 1, 'Meilleur tour réussi gardé dans le profil'); egal(r.profil.wins, 1, 'Courses réussies'); egal(r.profil.choix, 2, 'Le tour 2 est choisi pour la suite');
    ok(r.prime, 'Prime de victoire versée'); ok(r.sauvegarde, 'Course sauvegardée effacée');
    ok(r.ecran, 'Écran « Course réussie » avec rues, temps et prime');
    ok(/Tour suivant/.test(r.btns[0]) && /garage/.test(r.btns[1]), 'Boutons : ' + r.btns.join(', '));
    egal(r.tour, 2, '« Tour suivant » part au tour 2'); egal(r.etat2, 'mech', 'En course'); egal(r.rue, 1, 'Depuis la rue 1');
    ok(Math.abs(r.vie - r.pv) < 1e-6 && r.pv > 1, 'Tour 2 : vie des zombies ×' + r.pv + ' (' + r.vie + ')'); ok(Math.abs(r.fer - 1 - r.ferT) < 1e-6 && r.ferT > 0, 'Tour 2 : plus de ferraille (' + r.fer + ')');
    egal(r.hud2, 'Rue 1 sur 9 · Tour 2', 'Progression au tour 2');
  });

  test('Robot fin : choisir son tour au garage, parmi ceux débloqués ; meilleur tour sur l’écran titre', () => {
    exiger(); reset({ mechFin: { tour: 2, wins: 3, choix: 3 } });
    const r = J(function(){
      var o = {}, pn = document.getElementById('mechPanel');
      mechGarage();
      o.n = (document.getElementById('mkTourN') || {}).textContent; o.part = pn.querySelector('button[data-i="0"]').textContent;
      o.plus = pn.querySelector('button[data-tour="1"]').disabled;
      pn.querySelector('button[data-tour="-1"]').click(); o.n2 = document.getElementById('mkTourN').textContent; o.choix = P.mechFin.choix;
      pn.querySelector('button[data-tour="-1"]').click(); pn.querySelector('button[data-tour="-1"]') && (o.moins = pn.querySelector('button[data-tour="-1"]').disabled);
      o.choix1 = P.mechFin.choix;
      pn.querySelector('button[data-i="0"]').click(); o.tour = MECH.tour; mechQuit();
      mechBtn(); o.titre = document.getElementById('btnMech').textContent;
      pn.classList.add('hide');
      return o;
    });
    fin();
    egal(r.n, 'Tour 3', 'Tour choisi affiché'); ok(/tour 3/.test(r.part), 'Bouton de départ : ' + r.part);
    ok(r.plus, 'Pas plus loin que le tour 3 (meilleur réussi : 2)');
    egal(r.n2, 'Tour 2', 'Un tour plus facile'); egal(r.choix, 2, 'Choix gardé dans le profil');
    ok(r.moins, 'Pas sous le tour 1'); egal(r.choix1, 1, 'Tour 1');
    egal(r.tour, 1, 'La course part au tour choisi');
    ok(/tour 2 réussi/.test(r.titre), 'Écran titre : ' + r.titre);
  });

  test('Robot fin : vieille sauvegarde sans tour (profil et course en cours)', () => {
    exiger(); reset();
    const r = J(function(){
      var o = {};
      delete P.mechFin; o.neuf = JSON.stringify(__mechFin.mechFinNorm());
      P.mechFin = { tour: 'x', wins: -3, choix: 99 }; o.abime = JSON.stringify(__mechFin.mechFinNorm());
      P.mechFin = { tour: 4, wins: 6, choix: 9 }; o.borne = __mechFin.mechFinNorm().choix;
      if (typeof __mechSave === 'object'){
        localStorage.setItem('dt_mech_partie', JSON.stringify({ v:1, street:4, bar:900, barMax:2500, kills:12 }));
        __mechSave.mechResumeRun(); o.vieux = { tour: MECH.tour, rue: MECH.street }; mechQuit();
        P.mechFin.choix = 1;
        localStorage.setItem('dt_mech_partie', JSON.stringify({ v:1, street:5, bar:900, barMax:2500, kills:12, tour:3, temps:120 }));
        __mechSave.mechSaveBtn(); o.bouton = document.getElementById('btnMechGo').textContent;
        __mechSave.mechResumeRun(); o.neuve = { tour: MECH.tour, rue: MECH.street, temps: Math.round(MECH.temps) };
        o.garde = __mechSave.mechSaveGet().tour; mechQuit();
      }
      return o;
    });
    fin();
    egal(r.neuf, '{"tour":0,"wins":0,"choix":1}', 'Profil sans le champ : tour 0, choix 1');
    egal(r.abime, '{"tour":0,"wins":0,"choix":1}', 'Valeurs abîmées remises en ordre');
    egal(r.borne, 5, 'Choix borné au tour débloqué (meilleur + 1)');
    if (r.vieux){
      egal(r.vieux.tour, 1, 'Course sauvée sans tour : reprise au tour 1'); egal(r.vieux.rue, 4, 'Même rue');
      ok(/tour 3/.test(r.bouton), 'Bouton Continuer : ' + r.bouton);
      egal(r.neuve.tour, 3, 'Course sauvée au tour 3 : reprise au tour 3'); egal(r.neuve.rue, 5, 'Rue 5'); egal(r.neuve.temps, 120, 'Temps gardé');
      egal(r.garde, 3, 'Le tour est gardé dans la sauvegarde de la course');
    }
  });

  test('Robot fin : succès « Course réussie » et « Grimpeur de tours » ; lance-flammes lourd renforcé', () => {
    exiger(); reset();
    const r = J(function(){
      var o = {}, sm = typeof __succesModes === 'object' ? __succesModes : null;
      o.ach = sm ? sm.ACH_MODES.filter(function(a){ return a.id === 'mechWins' || a.id === 'mechTour'; }).length : -1;
      if (sm){ sm.smMechWin(3); o.wins = P.st.mechWins; o.tour = P.st.mechTour; o.obt = (P.ach || {}).mechWins >= 1 && (P.ach || {}).mechTour >= 1; }
      o.k = MECH_W.flamer.k;
      return o;
    });
    if (r.ach >= 0){
      egal(r.ach, 2, 'Deux succès de plus'); egal(r.wins, 1, 'Course réussie comptée'); egal(r.tour, 3, 'Tour 3 compté'); ok(r.obt, 'Succès obtenus');
    }
    egal(r.k, 1.2, 'Lance-flammes lourd : k 1,2 (0,76 avant)');
  });
})();
