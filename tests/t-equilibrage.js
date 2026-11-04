'use strict';
/* Tests d'équilibrage : réglages décidés avec le simulateur (docs/equilibrage.md) */
(function(){
  if (typeof test !== 'function' || typeof TESTS === 'undefined') return;

  test('Équilibrage : le fusil à pompe bat le pistolet de près et reste utile au milieu de la rue', () => {
    reset(); J('startLocation(0)'); J('__t.geler()');
    const r = J(function(){ return __t.graine(9, function(){
      // Dégâts moyens d'une seconde de tir, sans amélioration, sur un costaud à 12 m puis à 35 m
      function essai(id, dist){
        S.owned[id] = true; equip(id); var tot = 0, n = 0;
        for (var k = 0; k < 6; k++){
          clearZombies(); var z = __t.placer('brute', 0, BAR_Z - dist); z.speed = 0; z.hp = z.maxHp = 1e6; z.g.updateMatrixWorld(true);
          __t.viser(z, false); S.ammo[id] = magSize(id); reloadT = 0; cool = 0;
          var t = 0; while (t < 1){ if (cool <= 0 && S.ammo[id] > 0) fire(); cool -= 1 / 60; t += 1 / 60; }
          tot += 1e6 - z.hp; n++;
        }
        clearZombies(); return tot / n;
      }
      return { pPres: essai('pistol', 12), pLoin: essai('pistol', 35), sPres: essai('shotgun', 12), sLoin: essai('shotgun', 35), pierce: WEAPONS.shotgun.pierce };
    }); });
    ok(r.sPres > r.pPres * 2, 'De près, le fusil à pompe doit faire plus du double du pistolet : ' + Math.round(r.sPres) + ' contre ' + Math.round(r.pPres));
    ok(r.sLoin > r.pLoin * .8, 'Au milieu de la rue, il doit rester proche du pistolet : ' + Math.round(r.sLoin) + ' contre ' + Math.round(r.pLoin));
    ok(r.pierce >= 2, 'Les plombs traversent au moins deux zombies');
  });

  test('Équilibrage : la menace du RTS monte surtout avec le temps et les nids, peu avec les tués', () => {
    if (lire('typeof __rts === "object"') !== true) ignorer('Mode RTS absent');
    reset();
    const r = J(function(){
      __rts.rtsStart(); var R = __rts.RTS; R.nests.forEach(function(n){ n.spawnT = 1e9; }); R.hordeT = 1e9; clearZombies();
      var o = {};
      R.t = 0; R.kills = 1000; __rts.rtsStep(0); o.tues = R.threat;
      R.kills = 0; R.t = 600; __rts.rtsStep(0); o.temps = R.threat;
      __rts.rtsQuit();
      return o;
    });
    ok(r.tues < 3, '1 000 zombies tués ne doivent pas faire exploser la menace : ' + r.tues.toFixed(2));
    ok(r.temps > 3 && r.temps < 4, '10 minutes de jeu : menace entre 3 et 4 (' + r.temps.toFixed(2) + ')');
  });
})();
