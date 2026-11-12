'use strict';
/* Tests d'équilibrage : réglages décidés avec le simulateur (docs/equilibrage.md) */
(function(){
  if (typeof test !== 'function' || typeof TESTS === 'undefined') return;
  const proche = (v, att, tol, msg) => ok(typeof v === 'number' && Math.abs(v - att) <= tol, msg + ' : attendu environ ' + att + ', obtenu ' + v);

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

  test('Équilibrage : chaque arme plus chère vaut son prix (échelle du 12 novembre 2026)', () => {
    const r = J(function(){
      var W = WEAPONS, o = {};
      // Dégâts par seconde sur papier, chargeur et recharge comptés
      var dps = function(id){ var w = W[id]; return w.dmg * w.pellets * w.mag / (w.mag / w.rate + w.reload); };
      o.fusil = dps('rifle'); o.minigun = dps('minigun'); o.mg50 = dps('mg50'); o.pistolet = dps('pistol');
      o.sniper = W.sniper.dmg * W.sniper.mag / (W.sniper.mag / W.sniper.rate + W.sniper.reload);
      o.roq = W.rocket.dmg * W.rocket.mag / (W.rocket.mag / W.rocket.rate + W.rocket.reload);
      o.portee = W.flamer.range; o.roles = WORDER.filter(function(id){ return !W[id].role; });
      o.r = W.rifle.dmg >= 30 && W.rifle.pierce >= 2; o.s = W.sniper.dmg >= 450 && W.sniper.pierce >= 5;
      return o;
    });
    ok(r.r, 'Fusil d’assaut : 30 dégâts, traverse 2 zombies'); ok(r.s, 'Sniper : 450 dégâts, traverse 5 zombies');
    ok(r.fusil > r.pistolet * 2, 'Fusil d’assaut : plus du double du pistolet (' + Math.round(r.fusil) + ' contre ' + Math.round(r.pistolet) + ')');
    ok(r.sniper > r.fusil * 2, 'Sniper : plus du double du fusil d’assaut sur une grosse cible (' + Math.round(r.sniper) + ' contre ' + Math.round(r.fusil) + ')');
    ok(r.minigun > r.fusil * 2.2, 'Minigun : au moins 2,2 fois le fusil d’assaut (' + Math.round(r.minigun) + ' contre ' + Math.round(r.fusil) + ')');
    ok(r.roq > r.minigun, 'Lance-roquettes : plus que le minigun, et en explosion (' + Math.round(r.roq) + ' contre ' + Math.round(r.minigun) + ')');
    ok(r.mg50 > r.minigun * 1.5, 'Mitrailleuse .50 : au moins 1,5 fois le minigun (' + Math.round(r.mg50) + ' contre ' + Math.round(r.minigun) + ')');
    ok(r.portee >= 36, 'Lance-flammes : porte à 36 m (les cracheurs s’arrêtent entre 25 et 40 m) : ' + r.portee);
    egal(r.roles.join(','), '', 'Armes sans étiquette « Bon contre »');
  });

  test('Équilibrage : les plombs du fusil à pompe perdent de la force avec la distance, pas les autres armes', () => {
    const r = J(function(){ return { p10: wFalloff('shotgun', 10), p25: wFalloff('shotgun', 25), p42: wFalloff('shotgun', 42.5), p60: wFalloff('shotgun', 60), p90: wFalloff('shotgun', 90), fusil: wFalloff('rifle', 90), sniper: wFalloff('sniper', 150) }; });
    egal(r.p10, 1, 'À 10 m : pleine force'); egal(r.p25, 1, 'À 25 m : pleine force');
    proche(r.p42, .65, .01, 'À 42,5 m : 65 %'); proche(r.p60, .3, .001, 'À 60 m : 30 %'); proche(r.p90, .3, .001, 'Plus loin : jamais sous 30 %');
    egal(r.fusil, 1, 'Fusil d’assaut : aucune perte'); egal(r.sniper, 1, 'Sniper : aucune perte');
  });

  test('Équilibrage : une roquette en plein sur le boss lui fait tous ses dégâts (moins son blindage)', () => {
    reset(); J('startLocation(0)'); J('__t.geler()');
    const r = J(function(){
      clearZombies(); spawnZombie('boss'); var b = zombies[zombies.length - 1]; b.g.position.set(0, 0, -45); b.speed = 0; b.hp = b.maxHp = 1e6; b.g.updateMatrixWorld(true);
      S.owned.rocket = true; equip('rocket'); __t.viser(b, true); zoomed = false; recoilAcc = 0; reloadT = 0; cool = 0; S.ammo.rocket = magSize('rocket');
      var h0 = b.hp; fire();
      for (var i = 0; i < 240 && b.hp === h0; i++) __armes.armStep(1 / 60);
      var perdu = h0 - b.hp; clearZombies();
      return { perdu: perdu, plein: wDmg('rocket') * __boss.BOSS_ARMOR };
    });
    ok(r.perdu > 0, 'La roquette a touché le boss');
    proche(r.perdu, r.plein, r.plein * .02, 'Dégâts de plein fouet (avant : environ 40 %)');
  });

  test('Équilibrage : la boutique dit contre quoi chaque arme est bonne', () => {
    reset(); J('startLocation(0)'); J("state = 'shop'");
    const r = J(function(){ S.money = 0; renderShop(); var c = document.querySelectorAll('#shopWeapons .card'), n = 0; c.forEach(function(e){ var x = e.querySelector('.crole'); if (x && /^Bon contre : .+/.test(x.textContent)) n++; }); return { cartes: c.length, roles: n, sniper: WEAPONS.sniper.role }; });
    ok(r.cartes >= 8, 'Cartes d’armes : ' + r.cartes); egal(r.roles, r.cartes, 'Étiquettes « Bon contre »');
    ok(/boss/.test(r.sniper), 'Le sniper est annoncé contre les boss : ' + r.sniper);
  });

  test('Équilibrage : le robot garde les dégâts qu’il avait avant le renforcement des armes du toit', () => {
    if (lire('typeof MECH_W === "object"') !== true) ignorer('Mode robot absent');
    const r = J(function(){ var o = {}; Object.keys(MECH_W).forEach(function(id){ o[id] = WEAPONS[id].dmg * (MECH_W[id].k || 1); }); return o; });
    const avant = { minigun:24, flamer:10, laser:60, rocket:800, gl:300, arc:260, railgun:1300 };
    Object.keys(avant).forEach(id => proche(r[id], avant[id], avant[id] * .02, 'Robot, ' + id));
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

  test('Équilibrage : les dégâts d’un boss du RTS montent moins vite que ceux des autres zombies', () => {
    if (lire('typeof __rts === "object"') !== true) ignorer('Mode RTS absent');
    reset();
    const r = J(function(){
      __rts.rtsStart(); var R = __rts.RTS; R.nests.forEach(function(n){ n.spawnT = 1e9; }); R.hordeT = 1e9; clearZombies();
      R.t = 0; R.kills = 600 * 19; __rts.rtsStep(0); // menace 20
      var o = { menace: R.threat, mult: plan.dmgMult };
      __rts.rtsSpawnAt(0, -60, 1, 2, 'titan'); var t = zombies[zombies.length - 1]; o.titan = t.dmg; o.base = ZTYPES.titan.dmg; o.boss = !!t.rtsBoss;
      __rts.rtsSpawnAt(0, -60, 1, 2, 'walker'); var w = zombies[zombies.length - 1]; o.marcheur = w.dmg / ZTYPES.walker.dmg;
      __rts.rtsQuit();
      return o;
    });
    ok(r.boss && r.menace > 19.9, 'Titan apparu à menace ' + r.menace);
    ok(Math.abs(r.marcheur - r.mult) < 1e-6, 'Un marcheur garde le multiplicateur complet (' + r.mult + ')');
    ok(Math.abs(r.titan - r.base * Math.pow(r.mult, .6)) < 1e-6, 'Titan : dégâts de base × multiplicateur à la puissance 0,6 (' + Math.round(r.titan) + ')');
    ok(r.titan < r.base * r.mult * .5, 'À menace 20, le Titan frappe moins de la moitié de ce qu’il frappait avant');
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
