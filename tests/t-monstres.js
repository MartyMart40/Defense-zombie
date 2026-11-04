'use strict';
/* Tests des nouveaux monstres (js/35-monstres.js) : rampant, gonflé, gargouille, corbeaux, bouclier */
(function(){
  if (typeof test !== 'function' || typeof TESTS === 'undefined') return;
  const exiger = () => { if (lire('typeof __mn === "object" && typeof ZKINDS === "object" && !!ZKINDS.crawler') !== true) ignorer('Nouveaux monstres absents (js/35-monstres.js)'); };
  const NOUV = ['crawler', 'bloater', 'gargoyle', 'crow', 'shield'];
  function partie(i){ reset(); J('startLocation(' + (i || 0) + ')'); J(function(){ __t.geler(); clearZombies(); }); }

  test('Monstres : les 5 existent, avec forme, XP, ferraille, rendu par instances, et se tuent au tir', () => {
    exiger(); partie();
    const r = J(function(n){
      var o = {};
      n.forEach(function(t){
        clearZombies(); var z = spawnZombie(t), grp = zombies.filter(function(x){ return x.type === t; }).length;
        z.g.position.set(0, z.g.position.y, -25); z.g.updateMatrixWorld(true);
        var inst = !!z.inst, aim = z.aimY;
        damage(z, 1e9, false, z.g.position.clone());
        o[t] = { nom: ZTYPES[t].name, xp: ZXP[t], ferr: SCRAP_Z[t], inst: inst, groupe: grp, mort: z.dead, aim: aim };
      });
      clearZombies();
      return o;
    }, NOUV);
    NOUV.forEach(t => {
      const o = r[t];
      ok(!!o.nom && o.xp > 0 && o.ferr > 0, t + ' : nom, XP ou ferraille manquant');
      ok(o.inst, t + ' : pas dessiné par instances (lent en foule)');
      ok(o.mort, t + ' : ne meurt pas');
    });
    egal(r.crawler.groupe, 5, 'Rampants : meute de 5');
    ok(r.crow.groupe >= 7, 'Corbeaux : nuée de ' + r.crow.groupe);
  });

  test('Monstres : arrivée par ville, sans changer le nombre de zombies par vague', () => {
    exiger(); reset();
    const r = J(function(n){
      var o = { premier: {}, v1: wavePlan(1, LOCS[0]).queue.filter(function(t){ return t !== 'walker'; }).length, total: [] };
      LOCS.forEach(function(L, li){
        for (var w = 1; w <= L.waves; w++){
          var q = wavePlan(w, L).queue.filter(function(t){ return t !== 'boss'; });
          o.total.push(q.length === Math.round(30 * w * (1 + .15 * L.off)));
          n.forEach(function(t){ if (q.indexOf(t) >= 0 && !(t in o.premier)) o.premier[t] = li + ':' + w; });
        }
      });
      return o;
    }, NOUV);
    egal(r.v1, 0, 'Vague 1 de Saint-Clou : seulement des marcheurs');
    ok(r.total.every(Boolean), 'Le nombre de zombies par vague a changé');
    egal(r.premier.crawler, '0:2', 'Premier rampant'); egal(r.premier.bloater, '0:3', 'Premier gonflé');
    egal(r.premier.gargoyle, '1:2', 'Première gargouille'); egal(r.premier.crow, '2:2', 'Premiers corbeaux'); egal(r.premier.shield, '3:1', 'Premier bouclier');
  });

  test('Monstres : le rampant est bien plus rapide qu’un coureur et attaque la barricade', () => {
    exiger(); partie();
    const r = J(function(){
      var c = spawnZombie('crawler'), run = __t.placer('runner', 3, -60);
      c.g.position.set(0, 0, -60); zombies.forEach(function(z){ if (z.type === 'crawler' && z !== c) damage(z, 1e9, false, z.g.position.clone()); });
      c.speed = ZTYPES.crawler.speed; run.speed = ZTYPES.runner.speed;
      for (var i = 0; i < 30 * 4; i++) update(1 / 30);
      var o = { c: c.g.position.z, r: run.g.position.z }; var b0 = S.bar;
      for (var k = 0; k < 30 * 10; k++) update(1 / 30);
      o.st = c.st; o.bar = b0 - S.bar;
      return o;
    });
    ok(r.c - (-60) > (r.r - (-60)) * 1.3, 'Rampant : ' + (r.c + 60).toFixed(1) + ' m contre ' + (r.r + 60).toFixed(1) + ' m pour le coureur');
    egal(r.st, 'attack', 'Le rampant attaque la barricade');
    ok(r.bar > 0, 'La barricade doit perdre de la solidité');
  });

  test('Monstres : le gonflé explose à la barricade, ou au milieu des autres quand on le tue', () => {
    exiger(); partie();
    const r = J(function(){
      var o = {}, b0 = S.bar, m0 = S.money;
      var g = spawnZombie('bloater'); g.g.position.set(0, 0, g.stopZ - .2);
      var voisin = __t.placer('walker', 1.5, g.stopZ - .5); voisin.hp = voisin.maxHp = 50;
      for (var i = 0; i < 30 * 3 && !g.dead; i++) update(1 / 30);
      o.mortBar = g.dead; o.bar = b0 - S.bar; o.voisin = voisin.dead; o.gain = S.money - m0;
      clearZombies();
      // Tué au loin : il emporte les zombies autour, la barricade ne bouge pas
      var g2 = __t.placer('bloater', 0, -40), a = __t.placer('walker', 2, -41), b = __t.placer('walker', -2, -39), loin = __t.placer('walker', 0, -55);
      [a, b, loin].forEach(function(z){ z.hp = z.maxHp = 60; z.speed = 0; }); g2.speed = 0;
      var b1 = S.bar; damage(g2, 1e9, false, g2.g.position.clone());
      o.groupe = [a, b].filter(function(z){ return z.dead; }).length; o.loin = loin.dead; o.bar2 = b1 - S.bar;
      // Pustule touchée : il saute tout de suite
      clearZombies(); var g3 = __t.placer('bloater', 0, -30); g3.hp = g3.maxHp = 1e6;
      var pus = g3.meshes.filter(function(m){ return m.userData.weak && m.userData.weak.effet === 'pustule'; })[0];
      if (pus) weakHit(g3, pus, 1, g3.g.position.clone());
      o.pus = !!pus && g3.dead;
      return o;
    });
    ok(r.mortBar, 'Le gonflé doit exploser à la barricade');
    ok(r.bar > 20, 'Gros dégâts à la barricade : ' + r.bar);
    ok(r.voisin, 'L’explosion tue le zombie d’à côté');
    ok(r.gain <= 0 + 1e-9 || r.gain < 20, 'Pas d’argent pour un gonflé qui explose tout seul (' + r.gain + ')');
    egal(r.groupe, 2, 'Zombies autour tués par l’explosion');
    ok(!r.loin, 'Un zombie à 15 m ne doit pas être touché');
    egal(r.bar2, 0, 'Explosion au loin : la barricade n’est pas touchée');
    ok(r.pus, 'Un tir sur une pustule le fait sauter');
  });

  test('Monstres : le bouclier arrête les balles de face, pas les explosions ; le sniper le traverse', () => {
    exiger(); partie(3);
    const r = J(function(){
      var o = {};
      function tir(id, z, tete){
        equip(id); __t.viser(z, tete); reloadT = 0; cool = 0; S.ammo[id] = magSize(id); var h0 = z.hp; fire(); return h0 - z.hp;
      }
      S.owned.sniper = true; S.owned.pistol = true;
      var z = __t.placer('shield', 0, -25); z.hp = z.maxHp = 1e6; z.speed = 0; z.g.updateMatrixWorld(true);
      var b0 = __mn.MN.blocks;
      o.corps = tir('pistol', z, false); o.bloque = __mn.MN.blocks > b0;
      o.tete = tir('pistol', z, true);
      o.sniper = tir('sniper', z, false);
      var h = z.hp; damage(z, 100, false, z.g.position.clone()); o.explo = h - z.hp;
      o.ref = wDmg('pistol');
      return o;
    });
    ok(r.bloque, 'Le tir au corps doit être arrêté par le bouclier');
    ok(r.corps < r.ref * .2, 'Dégâts à travers le bouclier : ' + r.corps + ' (tir normal ' + r.ref + ')');
    ok(r.tete > r.ref, 'Tir à la tête : ' + r.tete);
    ok(r.sniper > r.ref, 'Le sniper (perforant) doit passer le bouclier : ' + r.sniper);
    egal(r.explo, 100, 'Les explosions passent');
  });

  test('Monstres : la gargouille vole, résiste aux balles sur les ailes, son ventre est un point faible', () => {
    exiger(); partie(1);
    const r = J(function(){
      var z = __t.placer('gargoyle', 0, -40); z.hp = z.maxHp = 1e6;
      for (var i = 0; i < 30; i++) update(1 / 30);
      var o = { y: z.g.position.y };
      var aile = z.meshes.filter(function(m){ return m.userData.weak && m.userData.weak.effet === 'pierre'; })[0];
      var ventre = z.meshes.filter(function(m){ return m.userData.weak && m.userData.weak.effet === 'ventre'; })[0];
      var h = z.hp; weakHit(z, aile, 100, z.g.position.clone()); o.aile = h - z.hp;
      h = z.hp; weakHit(z, ventre, 100, z.g.position.clone()); o.ventre = h - z.hp;
      z.hp = z.maxHp = 50; z.g.position.z = -20; for (var k = 0; k < 30 * 20 && z.st !== 'attack'; k++) update(1 / 30);
      o.st = z.st;
      return o;
    });
    ok(r.y > 4, 'La gargouille vole (y = ' + r.y + ')');
    ok(r.aile < 50, 'Ailes de pierre : ' + r.aile + ' sur 100');
    ok(r.ventre >= 240, 'Ventre : ' + r.ventre + ' sur 100');
    egal(r.st, 'attack', 'Elle finit par attaquer la barricade');
  });

  test('Monstres : les corbeaux tournent en nuée puis piquent sur la barricade', () => {
    exiger(); partie(2);
    const r = J(function(){
      var c = spawnZombie('crow'); c.g.position.z = -40;
      var nuee = zombies.filter(function(z){ return z.type === 'crow'; });
      nuee.forEach(function(z){ z.flock.cz = -40; z.g.position.z = -40 + Math.random(); });
      var memes = nuee.every(function(z){ return z.flock === c.flock; });
      for (var i = 0; i < 30 * 3; i++) update(1 / 30);
      var hauts = nuee.filter(function(z){ return z.g.position.y > 3; }).length, b0 = S.bar;
      for (var k = 0; k < 30 * 20; k++) update(1 / 30);
      return { n: nuee.length, memes: memes, hauts: hauts, att: nuee.filter(function(z){ return z.st === 'attack' || z.st === 'rise' || z.st === 'dive'; }).length, bar: b0 - S.bar };
    });
    ok(r.memes, 'Toute la nuée suit le même centre');
    ok(r.hauts >= r.n - 1, 'Les corbeaux volent en hauteur au début (' + r.hauts + ' sur ' + r.n + ')');
    ok(r.att >= r.n / 2, 'Ils finissent par piquer sur la barricade (' + r.att + ')');
    ok(r.bar > 0, 'Coups de bec sur la barricade');
  });
})();
(function(){
  if (typeof test !== 'function' || typeof TESTS === 'undefined') return;
  test('Monstres : meutes et nuées ne dépassent jamais le plafond de zombies en vie (performances)', () => {
    if (lire('typeof __mn === "object"') !== true) ignorer('Nouveaux monstres absents');
    reset(); J('startLocation(2)');
    const r = J(function(){
      __t.geler(); clearZombies(); plan.maxAlive = 8;
      for (var i = 0; i < 6; i++) __t.placer('walker', 0, -60);
      spawnZombie('crawler'); var a = zombies.filter(function(z){ return !z.dead; }).length;
      spawnZombie('crow'); var b = zombies.filter(function(z){ return !z.dead; }).length;
      return { a: a, b: b };
    });
    ok(r.a <= 8, 'Après une meute de rampants : ' + r.a + ' en vie (plafond 8)');
    ok(r.b <= 9, 'Après une nuée de corbeaux : ' + r.b + ' en vie');
  });
})();
