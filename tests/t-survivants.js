'use strict';
// Survivants : poursuivants à abattre en 5 s, survivant qui reste et rapporte 1 $ par minute
(function(){
  if (typeof test !== 'function' || typeof TESTS === 'undefined') return;
  function pret(){ return lire('typeof __surv === "object" && typeof __rue === "object"') === true; }
  function partie(){ reset(null); J('startLocation(0)'); J(function(){ __t.geler(); clearZombies(); __rue.rueClear(); S.money = 0; }); }
  test('Survivants : poursuivants abattus à temps, il reste et rapporte de l’argent', () => {
    if (!pret()) ignorer('Survivants absents');
    partie();
    const r = J(function(){
      var v = __rue.rueSpawnCiv(0, -60);
      var o = { chasers: __surv.SURV.chasers.length, chasing: __surv.SURV.chasing };
      __surv.SURV.chasers.forEach(function(c){ damage(c, 1e9, false, c.g.position.clone()); });
      update(1 / 30);
      o.safe = !!v.safe; o.hud = !document.getElementById('chaseH').classList.contains('hide');
      for (var i = 0; i < 30 * 20 && v.live && v.st === 'run'; i++) update(1 / 30);
      o.st = __rue.RUE.civ.st; o.survivors = S.survivors;
      var m0 = S.money; __surv.SURV.payT = 0; __t.geler(); for (var k = 0; k < 61 * 10; k++){ state = 'playing'; update(.1); }
      o.gain = S.money - m0; o.roof = __surv.SURV.roof.filter(function(g){ return g.visible; }).length;
      newGame(); o.reset = S.survivors;
      return o;
    });
    ok(r.chasers >= 2 && r.chasers <= 3, 'Poursuivants : ' + r.chasers);
    ok(r.chasing, 'La poursuite doit démarrer');
    ok(r.safe, 'Survivant hors de danger après les poursuivants abattus');
    egal(r.st, 'saved', 'État du survivant');
    egal(r.survivors, 1, 'Survivants sur le toit');
    ok(r.gain >= 1, 'Revenu passif après une minute : ' + r.gain);
    egal(r.roof, 1, 'Silhouette sur le toit');
    egal(r.reset, 0, 'Nouvelle partie : survivants remis à zéro');
  });
  test('Survivants : délai dépassé, les poursuivants l’attrapent', () => {
    if (!pret()) ignorer('Survivants absents');
    partie();
    const r = J(function(){
      __rue.rueSpawnCiv(0, -90);
      for (var i = 0; i < 30 * 6; i++) update(1 / 30);
      return { st: __rue.RUE.civ.st, survivors: S.survivors || 0, chasing: __surv.SURV.chasing };
    });
    egal(r.st, 'dead', 'Le survivant doit être attrapé');
    egal(r.survivors, 0, 'Aucun survivant gagné');
    ok(!r.chasing, 'La poursuite doit être finie');
  });
})();
