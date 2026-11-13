'use strict';
/* Tests de la montée de difficulté d'une ville à l'autre (js/06-donnees.js, CITY_SCALE) */
(function(){
  if (typeof test !== 'function' || typeof TESTS === 'undefined') return;
  test('Difficulté : chaque ville est au moins 20 % plus dure que la précédente (vie et dégâts)', () => {
    if (lire('typeof CITY_SCALE === "number"') !== true) ignorer('CITY_SCALE absent');
    reset();
    const r = J(function(){ return { s: CITY_SCALE, p: LOCS.map(function(L){ var p = wavePlan(3, L); return { hp: p.hpMult, dmg: p.dmgMult, nom: L.name }; }) }; });
    ok(Math.abs(r.s - 1.2) < 1e-9, 'CITY_SCALE : ' + r.s);
    for (let i = 1; i < r.p.length; i++){
      const a = r.p[i - 1], b = r.p[i];
      ok(b.hp / a.hp >= 1.2 * 1.05, b.nom + ' : vie ×' + (b.hp / a.hp).toFixed(2) + ' par rapport à ' + a.nom);
      ok(b.dmg / a.dmg >= 1.2 * 1.05, b.nom + ' : dégâts ×' + (b.dmg / a.dmg).toFixed(2));
    }
    ok(Math.abs(r.p[0].hp - (1 + .1 * 2)) < 1e-9, 'Saint-Clou ne change pas : ' + r.p[0].hp);
  });
  test('Difficulté : villes 2 à 5 durcies le 13 novembre 2026, pas le mode infini ni le robot', () => {
    reset();
    const r = J(function(){
      var o = { dur: LOCS.map(function(L){ return L.dur || 1; }) };
      o.val = wavePlan(3, LOCS[1]).hpMult / (1.2 * (1 + .4 * .6) * 1.2); o.port = wavePlan(3, LOCS[4]).dmgMult / ((1 + 2.4 * .6) * Math.pow(1.2, 4));
      o.inf = wavePlan(3, Object.assign({}, LOCS[4], { diff:1, off:0, inf:true })).hpMult;
      return o;
    });
    egal(r.dur.join(','), '1,1.35,1.6,1.4,1.25', 'Durcissement par ville');
    ok(Math.abs(r.val - 1.35) < 1e-6, 'Val-des-Cendres : vie ×1,35 (' + r.val + ')'); ok(Math.abs(r.port - 1.25) < 1e-6, 'Port : dégâts ×1,25 (' + r.port + ')');
    ok(Math.abs(r.inf - 1.2) < 1e-9, 'Mode infini : pas de durcissement (' + r.inf + ')');
  });
})();
