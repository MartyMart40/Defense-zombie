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
})();
