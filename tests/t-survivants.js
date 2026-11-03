'use strict';
// Survivants : poursuivants à abattre avant les trois quarts, survivant qui reste et rapporte 10 $ par minute
(function(){
  if (typeof test !== 'function' || typeof TESTS === 'undefined') return;
  function pret(){ return lire('typeof __surv === "object" && typeof __rue === "object"') === true; }
  function partie(){ reset(null); J('startLocation(0)'); J(function(){ __t.geler(); clearZombies(); __rue.rueClear(); S.money = 0; }); }
  test('Survivants : poursuivants abattus à temps, il reste et rapporte de l’argent', () => {
    if (!pret()) ignorer('Survivants absents');
    partie();
    const r = J(function(){
      var v = rueSpawnCiv(0, -60);
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
    egal(r.gain, 10, 'Revenu passif après une minute (10 $ par survivant)');
    egal(r.roof, 1, 'Silhouette sur le toit');
    egal(r.reset, 0, 'Nouvelle partie : survivants remis à zéro');
  });
  test('Survivants : invincible jusqu’aux trois quarts, puis attrapé si un poursuivant vit encore', () => {
    if (!pret()) ignorer('Survivants absents');
    partie();
    const r = J(function(){
      var v = rueSpawnCiv(0, -90), mark = -90 + (RUE_CFG.civSaveZ + 90) * __surv.SURV_CFG.mark;
      // Un zombie tenace en travers de sa route : il l'agrippe, mais ne peut pas le tuer avant les trois quarts
      var bloc = __t.placer('walker', 0, -80); bloc.hp = bloc.maxHp = 1e9; bloc.speed = 0;
      for (var i = 0; i < 30 * 6; i++) update(1 / 30);
      var o = { st6: v.st, chasing6: __surv.SURV.chasing, hud: document.getElementById('chaseH').textContent };
      var zMort = null;
      for (var k = 0; k < 30 * 40 && v.st === 'run'; k++){ update(1 / 30); }
      zMort = v.z;
      o.st = v.st; o.zMort = zMort; o.mark = mark; o.survivors = S.survivors || 0; o.chasing = __surv.SURV.chasing;
      return o;
    });
    egal(r.st6, 'run', 'Après 6 s, le survivant doit être encore en vie');
    ok(r.chasing6, 'La poursuite doit durer');
    ok(/m/.test(r.hud), 'Le bandeau indique la distance qui reste : ' + r.hud);
    egal(r.st, 'dead', 'Le survivant doit être attrapé aux trois quarts');
    ok(r.zMort >= r.mark - .01 && r.zMort < r.mark + 1, 'Mort au point des trois quarts (z ' + r.zMort.toFixed(2) + ', repère ' + r.mark.toFixed(2) + ')');
    egal(r.survivors, 0, 'Aucun survivant gagné');
    ok(!r.chasing, 'La poursuite doit être finie');
  });
  test('Survivants : les poursuivants restent derrière lui, plus lents au départ', () => {
    if (!pret()) ignorer('Survivants absents');
    partie();
    const r = J(function(){
      var v = rueSpawnCiv(0, -90), devant = 0, ecart0 = 0, ecart = 0, spd0 = 0;
      spd0 = Math.max.apply(null, __surv.SURV.chasers.map(function(c){ return c.speed; }));
      ecart0 = v.z - Math.max.apply(null, __surv.SURV.chasers.map(function(c){ return c.g.position.z; }));
      for (var i = 0; i < 30 * 8 && v.st === 'run'; i++){
        update(1 / 30);
        __surv.SURV.chasers.forEach(function(c){ if (!c.dead && c.g.position.z >= v.z) devant++; });
      }
      ecart = v.z - Math.max.apply(null, __surv.SURV.chasers.map(function(c){ return c.g.position.z; }));
      return { devant: devant, spd0: spd0, civ: RUE_CFG.civSpeed, ecart0: ecart0, ecart: ecart, st: v.st };
    });
    egal(r.st, 'run', 'Toujours en course après 8 s');
    egal(r.devant, 0, 'Images où un poursuivant le dépasse');
    ok(r.spd0 < r.civ * .9, 'Poursuivants plus lents au départ (' + r.spd0.toFixed(2) + ' contre ' + r.civ + ')');
    ok(r.ecart > r.ecart0, 'L’écart devrait grandir au début (' + r.ecart0.toFixed(1) + ' -> ' + r.ecart.toFixed(1) + ' m)');
  });
  test('Survivants : repère visible dès son apparition, caché après', () => {
    if (!pret()) ignorer('Survivants absents');
    partie();
    const r = J(function(){
      var v = rueSpawnCiv(0, -90);
      var o = { a: !!(v.cue && v.cue.visible), fleche: !!v.arrow, halo: !!v.halo, fog: v.arrow ? v.arrow.children[0].material.fog : null };
      update(1 / 30);
      o.sc = v.arrow ? v.arrow.scale.x : 0;
      __surv.SURV.chasers.forEach(function(c){ damage(c, 1e9, false, c.g.position.clone()); });
      for (var i = 0; i < 30 * 30 && v.st === 'run'; i++) update(1 / 30);
      o.st = v.st; o.b = !!(v.cue && v.cue.visible);
      return o;
    });
    ok(r.a, 'Repère (flèche et halo) visible à l’apparition');
    ok(r.fleche && r.halo, 'Flèche et halo présents');
    egal(r.fog, false, 'La flèche doit percer le brouillard');
    ok(r.sc > 1.5, 'La flèche grossit quand il est loin : ' + r.sc);
    egal(r.st, 'saved', 'Sauvé une fois les poursuivants abattus');
    ok(!r.b, 'Repère caché une fois sauvé');
  });
  test('Survivants : un tir du joueur sur lui garde la pénalité, même invincible', () => {
    if (!pret()) ignorer('Survivants absents');
    partie();
    const r = J(function(){
      S.money = 1000;
      var v = rueSpawnCiv(0, -40); update(1 / 30);
      var m = v.meshes[0]; m.updateMatrixWorld(true);
      var c = new THREE.Vector3(); m.getWorldPosition(c);
      camera.position.copy(EYE); camera.lookAt(c); camera.updateMatrixWorld(true);
      zoomed = false; recoilAcc = 0; reloadT = 0; S.ammo[S.cur] = magSize(S.cur);
      var p = rueCivProgress(v);
      fire();
      return { st: v.st, pen: 1000 - S.money, p: p };
    });
    ok(r.p < .75, 'Avant les trois quarts : ' + r.p);
    egal(r.st, 'dead', 'Le tir doit le tuer');
    ok(r.pen > 0, 'Pénalité : ' + r.pen);
  });
  test('Survivants : chaque survivant devient un tireur sur le toit', () => {
    if (!pret()) ignorer('Survivants absents');
    partie();
    const r = J(function(){
      S.survivors = 2; __surv.survRoofSync();
      var roof = __surv.SURV.roof.filter(function(g){ return g.visible; });
      var o = { n: roof.length, devant: roof.every(function(g){ return g.position.z < EYE.z + .5 && Math.abs(g.position.x) < 15 && Math.abs(g.position.x) > 3; }) };
      var z = __t.placer('walker', 0, -30); z.hp = z.maxHp = 1e6; z.speed = 0;
      var s0 = __surv.shots, hp0 = z.hp;
      for (var i = 0; i < 30 * 4; i++) update(1 / 30);
      o.tirs = __surv.shots - s0; o.degats = hp0 - z.hp;
      var z2 = __t.placer('walker', 2, -40); clearZombies(); var s1 = __surv.shots;
      for (var k = 0; k < 30 * 2; k++) update(1 / 30);
      o.sansCible = __surv.shots - s1;
      S.survivors = 0; __surv.survRoofSync();
      return o;
    });
    egal(r.n, 2, 'Tireurs visibles sur le toit');
    ok(r.devant, 'Les tireurs doivent être sur le rebord, de chaque côté');
    ok(r.tirs >= 4, 'Tirs en 4 s pour 2 survivants : ' + r.tirs);
    ok(r.degats > 0, 'Les tirs doivent blesser le zombie');
    egal(r.sansCible, 0, 'Pas de tir sans zombie');
  });
})();
