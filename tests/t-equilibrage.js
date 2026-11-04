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

  test('Équilibrage : les armes neuves sont plus fortes au départ (fusil d’assaut, sniper, minigun, roquettes)', () => {
    const r = J(function(){ var W = WEAPONS; return { r: W.rifle.dmg >= 30 && W.rifle.pierce >= 2, s: W.sniper.dmg >= 240 && W.sniper.pierce >= 5, m: W.minigun.dmg >= 24 && W.minigun.pierce >= 2, k: W.rocket.dmg >= 800 }; });
    ok(r.r, 'Fusil d’assaut : 30 dégâts, traverse 2 zombies'); ok(r.s, 'Sniper : 240 dégâts, traverse 5 zombies');
    ok(r.m, 'Minigun : 24 dégâts, traverse 2 zombies'); ok(r.k, 'Lance-roquettes : 800 dégâts');
  });

  test('Équilibrage : une explosion contre un boss le blesse (la largeur du corps compte)', () => {
    reset(); J('startLocation(0)'); J('__t.geler()');
    const r = J(function(){
      clearZombies(); spawnZombie('boss'); var b = zombies[zombies.length - 1]; b.g.position.set(0, 0, -40); b.speed = 0; b.hp = b.maxHp = 1e6; b.g.updateMatrixWorld(true);
      var bord = (b.aimY || 7.7) * .35 + .8; // juste contre son ventre, à 0,8 m de la surface
      var p = new THREE.Vector3(0, 3, -40 + bord), h0 = b.hp;
      __armes.armExplode(p, 'rocket'); var roq = h0 - b.hp;
      var h1 = b.hp; pwBlast(0, 0, -40 + bord, 4.5, 260, 10); var gren = h1 - b.hp;
      clearZombies();
      return { roq: roq, gren: gren, att: wDmg('rocket') * .6 * .5 };
    });
    ok(r.roq > r.att, 'Roquette contre le ventre du boss : ' + Math.round(r.roq) + ' dégâts (attendu plus de ' + Math.round(r.att) + ')');
    ok(r.gren > 0, 'Grenade contre le boss : ' + Math.round(r.gren));
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
