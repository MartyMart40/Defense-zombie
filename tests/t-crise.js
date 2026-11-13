'use strict';
/* =====================================================================
   Tests des moments de crise sur le toit (64-crise.js) : assauts, brèche, danger
   À charger APRÈS tests.js dans tests/index.html (avant t-journal.js).
   Réutilise test(), J(), lire(), ok(), egal(), reset(), ignorer() de tests.js.
   ===================================================================== */
(function(){
  if (typeof test !== 'function' || typeof TESTS === 'undefined') return;
  const exiger = () => { if (lire('typeof __crise === "object" && typeof __crise.criseStep === "function"') !== true) ignorer('Crise absente (64-crise.js)'); };
  // Partie à Saint-Clou, vague n lancée, sans largage ni survivant
  const partie = n => {
    reset(); J('startLocation(0)');
    J(function(n){
      if (typeof RUE === 'object' && RUE){ RUE.crateAt = []; RUE.civAt = -1; }
      P.tuto = 'non'; if (typeof TU === 'object' && TU){ TU.cur = null; TU.offre = false; }
      S.wave = n - 1; startWave(); clearZombies();
      __crise.nouvellePartie();
    }, n || 2);
  };

  test('Crise : un assaut ne change pas le total de zombies de la vague et respecte le plafond', () => {
    exiger(); partie(3);
    const r = J(function(){
      var o = { total: plan.total, sortis: 0, max: plan.maxAlive, depasse: 0 };
      var sp = spawnZombie; window.spawnZombie = function(){ o.sortis++; return sp.apply(this, arguments); };
      try {
        S.bar = S.barMax = 1e9;
        __crise.forcerAssaut(true); o.phase = __crise.phase;
        var rythme = __crise.criseRythme();
        o.rythme = rythme;
        // On abat la moitié des vivants à chaque pas pour que la file se vide
        for (var i = 0; i < 60 * 240 && state === 'playing' && plan.queue.length; i++){
          update(1 / 60);
          var v = zombies.filter(function(z){ return !z.dead; });
          if (v.length > plan.maxAlive) o.depasse++;
          if (i % 3 === 0) v.slice(0, Math.ceil(v.length / 2)).forEach(function(z){ kill(z, false); });
        }
        o.reste = plan.queue.length; o.totalApres = plan.total; o.assauts = __crise.assautsVague;
      } finally { window.spawnZombie = sp; }
      return o;
    });
    egal(r.phase, 'assaut', 'Assaut lancé');
    ok(Math.abs(r.rythme - 1 / __crise_vitesse()) < 1e-9, 'Sorties plus serrées pendant l’assaut : ' + r.rythme);
    egal(r.reste, 0, 'File vidée');
    egal(r.totalApres, r.total, 'Total du plan inchangé');
    ok(r.sortis >= r.total, 'Zombies sortis : ' + r.sortis + ' pour un total de ' + r.total + ' (les petits des meutes s’ajoutent, comme sans assaut)');
    egal(r.depasse, 0, 'Jamais plus de zombies en vie que plan.maxAlive');
    ok(r.assauts >= 1, 'Assaut compté');
  });
  // La vitesse lue dans le jeu (petite aide)
  function __crise_vitesse(){ return lire('__crise.CRISE.assautVitesse') || 4; }

  test('Crise : le plan d’une vague est le même avec ou sans assauts, et pas d’assaut à la vague 1', () => {
    exiger(); partie(1);
    const r = J(function(){
      var o = {};
      o.prevus1 = __crise.CR.moments.length;
      update(1 / 60); o.prevus1 = __crise.CR.moments.length;
      o.total = [2, 5, 8].map(function(w){ return wavePlan(w).total === Math.round(30 * w) || !!wavePlan(w).boss; });
      return o;
    });
    egal(r.prevus1, 0, 'Aucun assaut prévu à la vague 1');
    ok(r.total.every(Boolean), 'Total des vagues inchangé : ' + r.total);
  });

  test('Crise : pas d’assaut pendant que le boss est là, ni dans les 10 premières secondes', () => {
    exiger(); partie(4);
    const r = J(function(){
      var o = {}, C = __crise.CR;
      update(1 / 60); C.moments = [0]; C.prochain = 0;
      o.debut = __crise.phase; // t < 10 s
      for (var i = 0; i < 30; i++) update(1 / 60);
      o.debut2 = __crise.phase;
      // Boss en vie : rien ne part, même après 10 s
      S.bar = S.barMax = 1e9;
      spawnZombie('boss'); C.t = 20; C.phase = '';
      for (var k = 0; k < 120; k++) update(1 / 60);
      o.boss = __crise.phase; o.assautsBoss = __crise.assautsVague;
      // Boss abattu : l'assaut prévu peut partir
      zombies.forEach(function(z){ if (z.type === 'boss') kill(z, true, z.g.position.clone()); });
      for (var j = 0; j < 30; j++) update(1 / 60);
      o.apres = __crise.phase;
      return o;
    });
    egal(r.debut, '', 'Pas d’assaut dans les 10 premières secondes');
    egal(r.debut2, '', 'Toujours pas avant 10 s');
    ok(r.boss === '' || r.boss === 'attente', 'Pas d’assaut avec le boss en vie : ' + r.boss);
    egal(r.assautsBoss, 0, 'Aucun assaut compté avec le boss');
    ok(r.apres === 'avis' || r.apres === 'assaut', 'L’assaut part une fois le boss abattu : ' + r.apres);
  });

  test('Crise : un assaut ne prend jamais le boss dans son paquet', () => {
    exiger(); partie(5);
    const r = J(function(){
      // Boss juste au bout de la file : le paquet le contiendrait
      plan.queue.push('boss'); for (var i = 0; i < 3; i++) plan.queue.push('walker');
      var C = __crise.CR; update(1 / 60); C.t = 20; C.moments = [0]; C.prochain = 0; C.phase = '';
      update(1 / 60);
      return __crise.phase;
    });
    ok(r === 'attente' || r === '', 'L’assaut attend que le boss soit passé : ' + r);
  });

  test('Crise : au plus un fouisseur par assaut, file inchangée', () => {
    exiger(); partie(4);
    const r = J(function(){
      var q = plan.queue; for (var i = 0; i < q.length; i++) if (i % 3 === 0) q[i] = 'burrower';
      var avant = q.slice().sort().join(',');
      clearZombies(); __t.geler(); plan.queue = q; spawnT = 1e9;
      update(1 / 60); spawnT = 1e9;
      __crise.forcerAssaut(true);
      var n = __crise.CR.n, paquet = plan.queue.slice(plan.queue.length - n);
      return { n: n, fouis: paquet.filter(function(t){ return t === 'burrower'; }).length, pareil: plan.queue.slice().sort().join(',') === avant };
    });
    ok(r.n > 3, 'Assaut lancé : ' + r.n);
    ok(r.fouis <= 1, 'Fouisseurs dans le paquet : ' + r.fouis);
    ok(r.pareil, 'Même file (rien ajouté ni retiré)');
  });

  test('Crise : la brèche empêche la fin de partie une seule fois, la réparation est plafonnée', () => {
    exiger(); partie(3);
    const r = J(function(){
      var o = {}, B = __crise.CR.breche, max = S.barMax;
      clearZombies(); __t.geler();
      update(1 / 60); // nouvelle vague vue par la crise
      S.bar = 0; update(1 / 60);
      o.on = B.on; o.bar = S.bar; o.state = state; o.dispo = B.dispo;
      // Dégâts pendant la brèche : jamais sous 1
      S.bar = -50; update(1 / 60); o.plancher = S.bar;
      // 60 zombies abattus : réparation plafonnée à 35 %
      for (var i = 0; i < 60; i++){ var z = __t.placer('walker', 0, -40); kill(z, false); }
      o.rep = B.rep / max; o.barRep = S.bar / max;
      // Fin des 10 secondes
      for (var k = 0; k < 11 * 60 && state === 'playing'; k++) update(1 / 60);
      o.fin = B.on; o.state2 = state; o.bar2 = S.bar / max;
      // Deuxième chute : c'est fini
      S.bar = 0; for (var j = 0; j < 120 && state === 'playing'; j++) update(1 / 60);
      o.state3 = state;
      return o;
    });
    ok(r.on, 'Brèche en cours'); egal(r.state, 'playing', 'La partie continue'); egal(r.dispo, false, 'Dernier souffle utilisé');
    ok(r.bar >= 1, 'Barricade à 1 au moins'); ok(r.plancher >= 1, 'Jamais sous 1 pendant la brèche : ' + r.plancher);
    ok(Math.abs(r.rep - .35) < 1e-6, 'Réparation plafonnée à 35 % : ' + r.rep);
    egal(r.fin, false, 'Brèche finie après 10 s'); egal(r.state2, 'playing', 'On continue avec ce qui est réparé');
    ok(r.bar2 > .3, 'Barricade réparée gardée : ' + r.bar2);
    egal(r.state3, 'over', 'Deuxième chute : partie finie');
  });

  test('Crise : sans réparation, la barricade cède à la fin de la brèche', () => {
    exiger(); partie(3);
    const r = J(function(){
      clearZombies(); __t.geler(); update(1 / 60);
      S.bar = 0; update(1 / 60);
      var on = __crise.CR.breche.on;
      for (var k = 0; k < 13 * 60 && state === 'playing'; k++) update(1 / 60);
      return { on: on, state: state, cede: __crise.CR.breche.cede };
    });
    ok(r.on, 'Brèche lancée'); ok(r.cede, 'Rien réparé : elle cède'); egal(r.state, 'over', 'Partie finie');
  });

  test('Crise : en mode infini, la brèche revient après un boss abattu', () => {
    exiger();
    if (lire('typeof infStart') !== 'function') ignorer('Mode infini absent');
    reset();
    const r = J(function(){
      P.tuto = 'non'; infStart(0, true); if (state === 'shop') startWave(); clearZombies(); __t.geler();
      __crise.nouvellePartie(); update(1 / 60);
      var B = __crise.CR.breche, o = {};
      S.bar = 0; update(1 / 60); o.on = B.on; o.dispo1 = B.dispo;
      for (var i = 0; i < 40; i++){ var z = __t.placer('walker', 0, -40); kill(z, false); }
      for (var k = 0; k < 11 * 60 && state === 'playing'; k++) update(1 / 60);
      o.state = state;
      spawnZombie('boss'); var b = zombies[zombies.length - 1]; kill(b, true, b.g.position.clone());
      o.dispo2 = B.dispo;
      return o;
    });
    ok(r.on, 'Brèche en infini'); egal(r.dispo1, false, 'Utilisée'); egal(r.state, 'playing', 'Toujours en jeu');
    egal(r.dispo2, true, 'Rechargée par le boss abattu');
  });

  test('Crise : rien en mode robot ni en RTS', () => {
    exiger(); reset();
    const r = J(function(){
      var o = {};
      if (typeof __rts === 'object' && __rts.rtsStart){
        __rts.rtsStart();
        o.rtsActif = !!(__jeu.actif());
        var b0 = S ? S.bar : null; if (S){ S.bar = 0; } __crise.nouvellePartie();
        __crise.criseStep(1 / 60); visuals(1 / 60);
        o.rtsBreche = __crise.CR.breche.on; o.rtsBande = document.getElementById('crBande').className;
        if (S) S.bar = b0;
        o.rtsRythme = __crise.criseRythme();
        __rts.rtsQuit();
      }
      if (typeof mechStart === 'function'){
        mechStart();
        o.mechActif = !!(__jeu.actif());
        __crise.nouvellePartie(); var b1 = S.bar; S.bar = 0;
        __crise.criseStep(1 / 60); visuals(1 / 60);
        o.mechBreche = __crise.CR.breche.on; o.mechBande = document.getElementById('crBande').className;
        S.bar = b1;
        if (typeof mechQuit === 'function') mechQuit();
      }
      return o;
    });
    if (r.rtsActif){ egal(r.rtsBreche, false, 'Pas de brèche en RTS'); egal(r.rtsBande, 'hide', 'Pas de bandeau en RTS'); egal(r.rtsRythme, 1, 'Rythme normal en RTS'); }
    if (r.mechActif){ egal(r.mechBreche, false, 'Pas de brèche en robot'); egal(r.mechBande, 'hide', 'Pas de bandeau en robot'); }
    ok(r.rtsActif || r.mechActif, 'Au moins un des deux modes vérifié');
  });

  test('Crise : affichage de l’assaut, de la brèche et du danger', () => {
    exiger(); partie(3);
    const r = J(function(){
      var o = {}; clearZombies(); __t.geler(); S.bar = S.barMax; update(1 / 60);
      __crise.forcerAssaut(false); visuals(1 / 60);
      o.avis = document.getElementById('crBande').className + '|' + document.querySelector('#crBande .cr-t').textContent;
      o.ic = document.getElementById('crSouffle').className;
      __crise.CR.phase = ''; S.bar = S.barMax * .25; visuals(1 / 60);
      o.v1 = document.getElementById('vignette').className + '|' + document.getElementById('barFill').className;
      S.bar = S.barMax * .1; visuals(1 / 60);
      o.v2 = document.getElementById('vignette').className + '|' + document.getElementById('barFill').className;
      S.bar = 0; update(1 / 60); visuals(1 / 60);
      o.breche = document.getElementById('crBande').className + '|' + document.querySelector('#crBande .cr-t').textContent;
      o.ic2 = document.getElementById('crSouffle').className;
      return o;
    });
    ok(/cr-assaut/.test(r.avis) && /ASSAUT/.test(r.avis), 'Bandeau d’assaut : ' + r.avis);
    egal(r.ic, 'dispo', 'Icône du dernier souffle disponible');
    ok(/\bon\b/.test(r.v1) && /clign/.test(r.v1) && !/crit/.test(r.v1), 'Sous 30 % : ' + r.v1);
    ok(/crit/.test(r.v2) && /clign2/.test(r.v2), 'Sous 15 % : ' + r.v2);
    ok(/cr-breche/.test(r.breche) && /BRÈCHE/.test(r.breche), 'Bandeau de brèche : ' + r.breche);
    egal(r.ic2, 'en-cours', 'Icône pendant la brèche');
  });
})();
