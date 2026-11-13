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
    // Lance-flammes lourd : 15,6 (10 avant le dossier 102, k 0,76 → 1,2 : il devient un vrai choix au garage)
    const avant = { minigun:24, flamer:15.6, laser:60, rocket:800, gl:300, arc:260, railgun:1300 };
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
      R.t = 0; R.kills = (typeof RTS_THREAT === 'object' ? RTS_THREAT.tues : 600) * 19; __rts.rtsStep(0); // menace 20
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

  test('Équilibrage : au RTS, une unité à explosion tire d’abord sur ce qu’elle peut toucher', () => {
    if (lire('typeof __rts === "object"') !== true) ignorer('Mode RTS absent');
    reset();
    const r = J(function(){
      __rts.rtsStart(); var R = __rts.RTS; R.nests.forEach(function(n){ n.spawnT = 1e9; }); R.hordeT = 1e9; clearZombies();
      var u = __rts.rtsSpawnUnit('tank', 0, -20), rng = 38, o = {};
      // Un zombie seul à portée (15 m) et un gros groupe juste hors de portée (41 m)
      __rts.rtsSpawnAt(0, -35, 1, .1, 'walker'); var pres = zombies[zombies.length - 1];
      __rts.rtsSpawnAt(0, -61, 8, 1, 'walker');
      zombies.forEach(function(z){ z.speed = 0; });
      var t = rtsPickTarget(u, rng + 6, 5.5, rng); o.pres = t === pres;
      var t0 = rtsPickTarget(u, rng + 6, 5.5); o.avant = t0 !== pres; // sans la portée de tir : l'ancien choix (le gros groupe)
      kill(pres, false); var t2 = rtsPickTarget(u, rng + 6, 5.5, rng); o.loin = !!t2 && Math.abs(t2.g.position.z + 61) < 3; // plus rien à portée : il va vers le groupe
      o.tank = { dmg: __rts.RTS_UNITS.tank.dmg, hp: __rts.RTS_UNITS.tank.hp }; o.mg = __rts.RTS_BLD.t_mg.turret; o.tesla = __rts.RTS_BLD.t_tesla.turret;
      __rts.rtsQuit();
      return o;
    });
    ok(r.pres, 'Le tank vise le zombie à portée, pas le groupe hors de portée'); ok(r.avant, 'Sans la portée de tir, il visait le groupe (ancien défaut)');
    ok(r.loin, 'Plus rien à portée : il vise le groupe et avance');
    ok(r.tank.dmg >= 900 && r.tank.hp >= 8000, 'Tank : 900 dégâts, 8 000 de vie (' + r.tank.dmg + ', ' + r.tank.hp + ')');
    ok(r.mg.dmg * r.mg.rate >= 200 && r.mg.range >= 24, 'Tourelle mitrailleuse : au moins 200 dégâts par seconde, portée 24 m');
    ok(r.tesla.dmg * r.tesla.rate >= 160, 'Tourelle Tesla : au moins 160 dégâts par seconde avant les sauts');
  });

  test('Équilibrage : mortier, laser et missiles valent leur ferraille face aux tourelles de base', () => {
    if (lire('typeof __atelier === "object"') !== true) ignorer('Atelier absent');
    const r = J(function(){ var d = __atelier.defStats; return { t: d('turret', {}), m: d('mortar', {}), l: d('laser', {}), k: d('missile', {}), P: __atelier.DEF_TYPES }; });
    egal(r.t.dmg, 12, 'Tourelle : inchangée');
    // Dégâts par seconde par ferraille (zone comptée pour 3 zombies, la file du laser pour 3)
    const v = { tourelle: r.t.dmg * r.t.rate / r.P.turret.price, mortier: r.m.dmg * r.m.rate * 3 / r.P.mortar.price, laser: (r.l.dps + r.l.burn) * 3 / r.P.laser.price, missiles: r.k.dmg * r.k.rate * r.k.count * 3 / r.P.missile.price };
    ok(r.m.dmg >= 120 && r.l.dps >= 80 && r.k.dmg >= 250, 'Mortier 120, laser 80, missiles 250 au moins');
    ok(v.mortier > v.tourelle * 1.4, 'Mortier : plus de dégâts par ferraille que la tourelle quand il touche 3 zombies (' + v.mortier.toFixed(3) + ' contre ' + v.tourelle.toFixed(3) + ')');
    ok(v.laser > v.tourelle, 'Laser : au moins autant par ferraille sur une file de 3 (' + v.laser.toFixed(3) + ')');
    ok(v.missiles > v.tourelle * .9, 'Missiles : proches de la tourelle par ferraille avec 3 zombies par explosion (' + v.missiles.toFixed(3) + ')');
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
    ok(r.temps > 3 && r.temps < 5, '10 minutes de jeu : menace entre 3 et 5 (' + r.temps.toFixed(2) + ')'); // tâche 101 : le temps pèse un peu plus
  });

  // Banc des appuis du RTS (13 novembre 2026, node outils/simulateur.js rts-banc) : à somme égale, ces unités tenaient
  // bien moins longtemps que des mitrailleurs (menace 14 : 40 à 50 s contre 72 s)
  const unitesRts = () => J(function(){ var U = __rts.RTS_UNITS; return JSON.parse(JSON.stringify({ heavy:U.heavy, mech:U.mech, jet:U.jet, warthog:U.warthog, gunner:U.gunner, ammo:(typeof RTS_AMMO === 'object' ? RTS_AMMO : null) })); });
  test('Équilibrage : le Mech lourd vaut ses 1 500 $ (140 dégâts, 2 600 de vie)', () => {
    if (lire('typeof __rts === "object"') !== true) ignorer('Mode RTS absent');
    const U = unitesRts();
    egal(U.heavy.dmg, 140, 'Dégâts du Mech lourd (avant : 95)'); egal(U.heavy.hp, 2600, 'Vie du Mech lourd (avant : 1 600)');
    ok(U.heavy.dmg * U.heavy.rate / U.heavy.cost >= U.gunner.dmg * U.gunner.rate / U.gunner.cost * .4, 'Il perce la file : au moins 40 % des dégâts par dollar du mitrailleur');
  });
  test('Équilibrage : le Mech de combat vaut ses 6 000 $ (minigun 36, roquettes 380, 8 000 de vie)', () => {
    if (lire('typeof __rts === "object"') !== true) ignorer('Mode RTS absent');
    const U = unitesRts();
    egal(U.mech.dmg, 36, 'Minigun (avant : 16)'); egal(U.mech.w2 && U.mech.w2.dmg, 380, 'Roquettes (avant : 260)'); egal(U.mech.hp, 8000, 'Vie (avant : 5 000)');
  });
  test('Équilibrage : le chasseur vaut son prix (150 dégâts, 300 obus)', () => {
    if (lire('typeof __rts === "object"') !== true) ignorer('Mode RTS absent');
    const U = unitesRts();
    egal(U.jet.dmg, 150, 'Canon de 20 mm (avant : 75)');
    if (U.ammo) egal(U.ammo.jet.w1, 300, 'Obus du chasseur (avant : 200)');
  });
  test('Équilibrage : le Warthog vaut son prix (110 dégâts)', () => {
    if (lire('typeof __rts === "object"') !== true) ignorer('Mode RTS absent');
    const U = unitesRts();
    egal(U.warthog.dmg, 110, 'Canon de 30 mm (avant : 55)');
    if (U.ammo) egal(U.ammo.warthog.w1, 660, 'Obus du Warthog : inchangés');
  });

  // Robot-joueur du RTS (outils/sim-bot-rts.js) : il bâtit et achète par les vraies fonctions du jeu, sans tricher
  test('Simulateur : le robot-joueur du RTS bâtit dans la base et achète avec son argent', async () => {
    if (lire('typeof __rts === "object"') !== true) ignorer('Mode RTS absent');
    const r1 = await fetch('../outils/sim-bot.js', { cache:'no-store' }), r2 = await fetch('../outils/sim-bot-rts.js', { cache:'no-store' });
    if (!r1.ok || !r2.ok) ignorer('outils/sim-bot-rts.js absent');
    const c1 = await r1.text(), c2 = await r2.text();
    reset();
    if (lire('typeof SIM === "object" && typeof SIM.rtsTour === "function"') !== true){ J(c1); J(c2); }
    const r = J(function(){
      __rts.rtsStart(); var R = __rts.RTS; R.nests.forEach(function(n){ n.spawnT = 1e9; }); R.hordeT = 1e9; clearZombies();
      var o = { strats: Object.keys(SIM.STRATS_RTS) };
      S.money = 20000; var m0 = S.money, u0 = R.units.length, b0 = R.blds.slice();
      for (var i = 0; i < 12; i++) SIM.rtsTour('mixte');
      o.depense = m0 - S.money;
      o.unites = R.units.filter(function(u){ return !u.dead; }).length - u0;
      o.scrap = R.blds.filter(function(b){ return !b.dead && b.type === 'scrap'; }).length;
      o.dansBase = R.blds.every(function(b){ return b.dead || Math.hypot(b.x, b.z) + b.r <= R.baseR + .01; });
      o.grille = R.blds.every(function(b){ return b0.indexOf(b) >= 0 || (b.x % 2 === 0 && b.z % 2 === 0); });
      o.positif = S.money >= 0;
      __rts.rtsQuit();
      return o;
    });
    ['tourelles', 'blindes', 'air', 'mixte'].forEach(k => ok(r.strats.indexOf(k) >= 0, 'Stratégie ' + k));
    ok(r.depense > 0 && r.positif, 'Il dépense son argent sans passer sous zéro (' + r.depense + ' $)');
    ok(r.unites >= 3, 'Il achète des unités : ' + r.unites);
    ok(r.scrap >= 1, 'Il bâtit un récupérateur');
    ok(r.dansBase, 'Tout est bâti dans la base'); ok(r.grille, 'Sur le quadrillage de 2 m');
  });
})();
