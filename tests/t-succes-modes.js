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

  test('Succès des modes : rues et zombies du robot, visibles dès le départ (robot ouvert)', () => {
    exiger(); reset();
    const r = J(function(){
      var o = {};
      o.cache = __succesModes.ACH_MODES.filter(function(a){ return a.id.indexOf('mech') === 0; }).every(function(a){ return !a.hide(); });
      P.mech = P.mech || {}; P.mech.unlocked = true; o.visible = !__succesModes.ACH_MODES[0].hide();
      mechStart(); visuals(1 / 30);
      for (var i = 0; i < 3; i++){ var z = __t.placer('walker', 0, -40); kill(z, false); }
      MECH.street = 6; visuals(1 / 30);
      o.kills = P.st.mechKills; o.rues = P.st.mechStreet; o.ach = (P.ach || {}).mechStreet >= 1;
      mechQuit(); if (typeof __mechSave === 'object') __mechSave.mechSaveClear();
      return o;
    });
    ok(r.cache, 'Visibles dès le départ'); ok(r.visible, 'Visibles une fois débloqué');
    egal(r.kills, 3, 'Zombies abattus avec le robot'); egal(r.rues, 5, 'Rues traversées (rue 6 atteinte)'); ok(r.ach, 'Succès Briseur de rues');
  });
  // Bogue corrigé le 2026-11-13 : la remise en ordre du profil (msNorm, au chargement) effaçait les compteurs et paliers du robot et du RTS
  test('Succès des modes : la remise en ordre du profil garde les compteurs du robot et du RTS', () => {
    if (lire('typeof __missions === "object" && typeof __succesModes === "object"') !== true) ignorer('Succès des modes absents');
    reset();
    const r = J(function(){
      var st0 = P.st, ach0 = P.ach, o = {};
      // Comme au chargement : seuls les succès du toit sont connus quand msNorm passe
      var retires = ACH.splice(ACH.length - __succesModes.ACH_MODES.length, __succesModes.ACH_MODES.length);
      P.st = { kills: 12, mechKills: 4321, rtsNests: 7, bidon: 'x' }; P.ach = { mechKills: 1, rtsNests: 1 };
      try { __missions.msNorm(); o.mk = P.st.mechKills; o.rn = P.st.rtsNests; o.k = P.st.kills; o.bidon = 'bidon' in P.st; o.am = P.ach.mechKills; o.ar = P.ach.rtsNests; }
      finally { retires.forEach(function(a){ ACH.push(a); }); P.st = st0; P.ach = ach0; __missions.msNorm(); }
      return o;
    });
    egal(r.mk, 4321, 'Zombies abattus avec le robot gardés'); egal(r.rn, 7, 'Nids détruits gardés'); egal(r.k, 12, 'Compteur du toit gardé');
    ok(!r.bidon, 'Une valeur qui n’est pas un nombre est écartée');
    egal(r.am, 1, 'Palier du robot gardé'); egal(r.ar, 1, 'Palier du RTS gardé');
  });
})();
