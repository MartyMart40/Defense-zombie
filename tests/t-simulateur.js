'use strict';
/* Test du robot-joueur du simulateur d'équilibrage (outils/sim-bot.js, lancé par outils/simulateur.js) */
(function(){
  if (typeof test !== 'function' || typeof TESTS === 'undefined') return;

  test('Simulateur : le robot-joueur parfait tient la première vague de Saint-Clou', async () => {
    const rep = await fetch('../outils/sim-bot.js', { cache:'no-store' });
    if (!rep.ok) ignorer('outils/sim-bot.js absent');
    const code = await rep.text();
    reset();
    J(code); // installe window.SIM dans le jeu (sans arrêter la boucle du jeu : pas de SIM.preparer ici)
    const r = await J(function(){
      SIM.hasard(3); SIM.profilNeuf(); SIM.BOT.strategie = 'pistolet';
      return SIM.partieToit(0, SIM.JOUEURS.parfait, false, 1.6).then(function(o){ SIM.remettre(); return o; });
    });
    J(function(){ firing = false; try { gameOver(); } catch (e) {} });
    ok(r && r.vague >= 2, 'Vague atteinte : ' + (r && r.vague));
    ok(r.abattus >= 25, 'Zombies abattus : ' + r.abattus);
    egal(r.vagues[0] && r.vagues[0].bar, 100, 'Barricade intacte après la vague 1');
  });

  // outils/sim-horloge.js (injecté avant le jeu par outils/sim-page.js) : l'heure suit le temps simulé, le hasard est fixé.
  // Essayé dans une page vide à part, jamais dans le jeu.
  test('Simulateur : heure et hasard fixés (même graine, même partie)', async () => {
    const rep = await fetch('../outils/sim-horloge.js', { cache:'no-store' });
    if (!rep.ok) ignorer('outils/sim-horloge.js absent');
    const code = await rep.text();
    const essai = () => new Promise((fin, rate) => {
      const f = document.createElement('iframe'); f.style.display = 'none'; f.srcdoc = '<!doctype html><title>h</title>';
      f.onload = () => {
        try {
          const w = f.contentWindow; w.eval(code);
          const r = { h: [w.Math.random(), w.Math.random()], p0: w.performance.now(), d0: w.Date.now(), raf: w.requestAnimationFrame(() => {}) };
          w.__SIM_T = 2.5;
          r.p1 = w.performance.now(); r.d1 = w.Date.now(); r.nd = +new w.Date(); r.vieux = new w.Date(2020, 0, 1).getFullYear();
          f.remove(); fin(r);
        } catch (e) { f.remove(); rate(e); }
      };
      document.body.appendChild(f);
    });
    const a = await essai(), b = await essai();
    egal(JSON.stringify(a.h), JSON.stringify(b.h), 'Même hasard au chargement d’une page à l’autre');
    ok(a.h[0] !== a.h[1] && a.h[0] >= 0 && a.h[0] < 1, 'Le hasard reste un hasard (entre 0 et 1, change à chaque tirage)');
    egal(a.p1 - a.p0, 2500, 'performance.now suit le temps simulé');
    egal(a.d1 - a.d0, 2500, 'Date.now suit le temps simulé');
    egal(a.nd, a.d1, 'new Date() sans argument donne l’heure simulée');
    egal(a.vieux, 2020, 'new Date(année, mois, jour) marche toujours');
    egal(a.d0, b.d0, 'Même date de départ d’une page à l’autre');
    egal(a.raf, 0, 'La boucle du jeu ne part pas toute seule');
  });

  test('Simulateur : le robot-joueur du mode robot avance, tire et mesure les dégâts encaissés', async () => {
    if (lire('typeof __mech === "object" && typeof __mb === "object"') !== true) ignorer('Mode robot absent');
    const codes = [];
    for (const f of ['sim-bot.js', 'sim-bot-robot.js']){
      const rep = await fetch('../outils/' + f, { cache:'no-store' });
      if (!rep.ok) ignorer('outils/' + f + ' absent');
      codes.push(await rep.text());
    }
    reset();
    codes.forEach(c => J(c)); // installe window.SIM et SIM.robot (sans SIM.preparer : la boucle du jeu continue)
    ok(lire('typeof SIM === "object" && typeof SIM.robot === "object" && typeof SIM.robot.course === "function"') === true, 'SIM.robot installé');
    const r = await J(function(){
      SIM.robot.profil(); P.scrap = 600;
      var achats = SIM.robot.garage('moinsCher');
      return SIM.robot.course({ joueur:'moyen', graine:5, maxMin:.4 }).then(function(o){ o.achats = achats; o.etat = state; SIM.remettre(); return o; });
    });
    ok(r && r.rues > .5, 'Le robot avance dans la rue : ' + (r && r.rues) + ' rue(s)');
    ok(r.tues >= 15, 'Il abat des zombies : ' + r.tues);
    ok(r.achats.length >= 3 && r.achats.every(function(k){ return typeof k === 'string'; }), 'Garage : la ferraille est dépensée (' + r.achats.join(', ') + ')');
    ok(typeof r.deg === 'object' && typeof r.degTotal === 'number', 'Dégâts encaissés mesurés par type');
    egal(r.etat, 'menu', 'La course finie, retour au menu');
  });
})();
