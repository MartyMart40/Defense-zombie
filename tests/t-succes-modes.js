'use strict';
/* Tests des succès du robot et du RTS (js/51-succes-modes.js) */
(function(){
  if (typeof test !== 'function' || typeof TESTS === 'undefined') return;
  const exiger = () => { if (lire('typeof __succesModes === "object"') !== true) ignorer('Succès des modes absents (js/51-succes-modes.js)'); };

  test('Succès des modes : nids, boss et minutes au RTS, avec ferraille', () => {
    exiger(); reset();
    const r = J(function(){
      var o = {}; __rts.rtsStart(); var R = __rts.RTS; R.nests.forEach(function(n){ n.spawnT = 1e9; }); R.hordeT = 1e9; clearZombies();
      visuals(1 / 30); var sc0 = P.scrap || 0;
      __rts.rtsNestDie(R.nests[0]); __rts.rtsNestDie(R.nests[1]); __rts.rtsNestDie(R.nests[2]); R.bossKills = 1; R.t = 10 * 60 + 5;
      visuals(1 / 30);
      o.nids = P.st.rtsNests; o.boss = P.st.rtsBoss; o.min = P.st.rtsMin;
      o.ach = (P.ach || {}).rtsNests >= 1 && (P.ach || {}).rtsBoss >= 1 && (P.ach || {}).rtsMin >= 1;
      o.ferraille = (P.scrap || 0) - sc0 >= 150 + 100 + 150;
      // « Rejouer » : une nouvelle partie recompte depuis zéro
      __rts.rtsStart(); R = __rts.RTS; R.nests.forEach(function(n){ n.spawnT = 1e9; }); R.hordeT = 1e9; visuals(1 / 30); __rts.rtsNestDie(R.nests[0]); visuals(1 / 30);
      o.rejoue = P.st.rtsNests === 4;
      __rts.rtsQuit();
      return o;
    });
    egal(r.nids, 3, 'Nids détruits comptés'); egal(r.boss, 1, 'Boss compté'); egal(r.min, 10, 'Minutes tenues');
    ok(r.ach, 'Succès obtenus'); ok(r.ferraille, 'Ferraille des succès versée'); ok(r.rejoue, 'Une nouvelle partie continue de compter');
  });

  test('Succès des modes : rues et zombies du robot, cachés tant que le robot est verrouillé', () => {
    exiger(); reset();
    const r = J(function(){
      var o = {};
      o.cache = __succesModes.ACH_MODES.filter(function(a){ return a.id.indexOf('mech') === 0; }).every(function(a){ return a.hide(); });
      P.mech = P.mech || {}; P.mech.unlocked = true; o.visible = !__succesModes.ACH_MODES[0].hide();
      mechStart(); visuals(1 / 30);
      for (var i = 0; i < 3; i++){ var z = __t.placer('walker', 0, -40); kill(z, false); }
      MECH.street = 6; visuals(1 / 30);
      o.kills = P.st.mechKills; o.rues = P.st.mechStreet; o.ach = (P.ach || {}).mechStreet >= 1;
      mechQuit(); if (typeof __mechSave === 'object') __mechSave.mechSaveClear();
      return o;
    });
    ok(r.cache, 'Cachés tant que le robot est verrouillé'); ok(r.visible, 'Visibles une fois débloqué');
    egal(r.kills, 3, 'Zombies abattus avec le robot'); egal(r.rues, 5, 'Rues traversées (rue 6 atteinte)'); ok(r.ach, 'Succès Briseur de rues');
  });
})();
