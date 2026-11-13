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
