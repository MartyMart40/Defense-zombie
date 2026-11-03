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
})();
