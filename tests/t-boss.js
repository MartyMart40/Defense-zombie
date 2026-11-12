'use strict';
/* Tests du boss (js/19-boss.js). À charger APRÈS tests.js dans tests/index.html :
   <script src="t-boss.js"></script>
   Utilise l'API de tests.js : test(), J(), lire(), ok(), egal(), ignorer(), reset(). */
(function(){
  if (typeof test !== 'function') return;
  const pret = () => lire('typeof __boss === "object" && __boss.bossReady()') === true;
  const exiger = () => { if (!pret()) ignorer('Boss absent ou crochet ZKINDS de spawnZombie manquant (19-boss.js / 07-zombies.js)'); };
  const __boss_hits = () => lire('__boss.BOSS_CAR.hits');
  // Lance la vague 5 de Saint-Clou et fait apparaître le boss tout de suite
  function avecBoss(){
    reset(); J('startLocation(0)');
    return J(function(){
      state = 'shop'; S.wave = 4; startWave();
      clearZombies(); plan.queue = ['walker', 'boss']; spawnT = 0; update(1 / 30); spawnT = 1e9;
      var b = zombies.find(function(z){ return z.type === 'boss'; });
      __boss.bossFrame();
      return b ? { ok: true, hp: b.hp, maxHp: b.maxHp, scale: b.g.scale.x, nom: b.bossName, barre: __t.visible('bossBar'), nomBarre: $('bossName').textContent } : { ok: false };
    });
  }

  test('Boss : wavePlan(5) contient exactement un boss, wavePlan(4) aucun', () => {
    exiger();
    const r = J(function(){
      var n = function(w, L){ return wavePlan(w, L).queue.filter(function(t){ return t === 'boss'; }).length; };
      var p = wavePlan(5, LOCS[0]);
      return { v5: n(5, LOCS[0]), v4: n(4, LOCS[0]), v1: n(1, LOCS[0]), port5: n(5, LOCS[4]), port10: n(10, LOCS[4]), port9: n(9, LOCS[4]),
        total: p.total, file: p.queue.length, sortie: p.queue.length - 1 - p.queue.indexOf('boss') };
    });
    egal(r.v5, 1, 'Boss à la vague 5'); egal(r.v4, 0, 'Boss à la vague 4'); egal(r.v1, 0, 'Boss à la vague 1');
    egal(r.port5, 1, 'Port, vague 5'); egal(r.port10, 1, 'Port, vague 10'); egal(r.port9, 0, 'Port, vague 9');
    egal(r.total, r.file, 'p.total compte le boss');
    ok(r.sortie >= r.file * .4, 'Le boss sort trop tôt (' + r.sortie + ' zombies avant lui sur ' + r.file + ')');
  });

  test('Boss : beaucoup plus de vie et d’échelle qu’un costaud', () => {
    exiger();
    const t = J(function(){ return { bh: ZTYPES.boss.hp, bs: ZTYPES.boss.scale, ch: ZTYPES.brute.hp, cs: ZTYPES.brute.scale }; });
    ok(t.bh >= 8 * t.ch, 'Vie de base : boss ' + t.bh + ', costaud ' + t.ch);
    ok(t.bs >= 4 * t.cs, 'Échelle : boss ' + t.bs + ', costaud ' + t.cs);
    const r = avecBoss(); ok(r.ok, 'Le boss n’est pas apparu');
    ok(r.scale >= 6, 'Échelle du boss en jeu : ' + r.scale);
    ok(r.maxHp >= 8 * t.ch, 'Vie du boss en jeu : ' + r.maxHp);
  });

  test('Boss : la barre de vie apparaît à son arrivée et disparaît à sa mort', () => {
    exiger();
    const r = avecBoss(); ok(r.ok, 'Le boss n’est pas apparu');
    ok(r.barre, 'La barre de vie du boss n’est pas visible à son arrivée');
    egal(r.nomBarre, r.nom, 'Nom dans la barre');
    const m = J(function(){
      var b = zombies.find(function(z){ return z.type === 'boss'; });
      damage(b, b.hp * .5 / __boss.BOSS_ARMOR, false, b.g.position.clone()); __boss.bossFrame();
      var w = parseFloat($('bossFill').style.width);
      damage(b, 1e12, true, b.g.position.clone()); __boss.bossFrame();
      return { w: w, mort: !!b.dead, barre: __t.visible('bossBar') };
    });
    ok(m.w > 40 && m.w < 60, 'Barre à moitié attendue, obtenu ' + m.w + ' %');
    ok(m.mort, 'Le boss n’est pas mort');
    ok(!m.barre, 'La barre est encore visible après sa mort');
  });

  test('Boss : il peut être tué par les tirs, la tête fait plus mal', () => {
    exiger();
    ok(avecBoss().ok, 'Le boss n’est pas apparu');
    const r = J(function(){
      var b = zombies.find(function(z){ return z.type === 'boss'; });
      b.g.position.set(0, 0, -35); b.g.updateMatrixWorld(true);
      var p = new THREE.Vector3(); b.meshes[3].getWorldPosition(p); camera.position.copy(EYE); camera.lookAt(p); camera.updateMatrixWorld(true);
      var h = b.hp; fire(); var corps = h - b.hp;
      __t.viser(b, true); cool = 0; h = b.hp; fire(); var tete = h - b.hp;
      b.hp = 1; __t.viser(b, true); fire();
      return { corps: corps, tete: tete, mort: !!b.dead };
    });
    ok(r.corps > 0, 'Un tir au corps ne fait rien');
    ok(r.tete > r.corps * 3, 'Tête : ' + r.tete + ', corps : ' + r.corps);
    ok(r.mort, 'Le boss n’est pas mort sous les tirs');
  });

  test('Boss : touché par les défenses de l’atelier', () => {
    exiger();
    ok(avecBoss().ok, 'Le boss n’est pas apparu');
    const r = J(function(){
      var b = zombies.find(function(z){ return z.type === 'boss'; });
      var h = b.hp; splash(b.g.position.x, b.g.position.z, 4, 200);
      return { perte: h - b.hp };
    });
    ok(r.perte > 150, 'Explosion sur le boss : ' + r.perte + ' de dégâts');
  });

  test('Boss : il lance des autos et frappe la barricade', () => {
    exiger();
    ok(avecBoss().ok, 'Le boss n’est pas apparu');
    const r = J(function(){
      var b = zombies.find(function(z){ return z.type === 'boss'; });
      S.barMax = S.bar = 1e6; b.throwT = 0;
      var b0 = S.bar; __t.sim(4); var lancer = b0 - S.bar;
      b.g.position.z = b.stopZ - .01; b0 = S.bar; __t.sim(5); var coups = b0 - S.bar;
      return { lancer: lancer, coups: coups, st: b.st };
    });
    ok(r.lancer > 0, 'Aucune auto lancée n’a touché la barricade');
    egal(r.st, 'attack', 'État à la barricade');
    ok(r.coups > 0, 'Les coups du boss n’abîment pas la barricade');
  });

  test('Boss : trois balles sur une auto en vol la font exploser, la barricade ne prend rien', () => {
    exiger();
    ok(avecBoss().ok, 'Le boss n’est pas apparu');
    const r = J(function(){
      var b = zombies.find(function(z){ return z.type === 'boss'; }), B = __boss, o = {};
      S.barMax = S.bar = 1e6; b.throwT = 1e9;
      // 1. Une auto qu'on laisse passer abîme la barricade et sort de hitMeshes
      B.bossThrow(b); var c = B.bossCars.filter(function(x){ return x.m.visible; })[0];
      o.cible = !!c && hitMeshes.indexOf(c.cible) >= 0;
      for (var i = 0; i < 90 && c.m.visible; i++) B.bossUpdateFx(b, 1 / 30);
      o.passe = 1e6 - S.bar; o.rangee = hitMeshes.indexOf(c.cible) < 0;
      // 2. Trois vraies balles : on vise l'auto en vol et on tire
      S.bar = 1e6; B.bossThrow(b); c = B.bossCars.filter(function(x){ return x.m.visible; })[0];
      for (i = 0; i < 12; i++) B.bossUpdateFx(b, 1 / 30);
      equip('pistol'); zoomed = false; recoilAcc = 0; reloadT = 0; S.ammo.pistol = magSize('pistol'); o.tirs = 0;
      for (i = 0; i < 6 && c.m.visible; i++){ camera.lookAt(c.m.position); camera.updateMatrixWorld(true); cool = 0; fire(); o.tirs++; }
      o.detruite = !c.m.visible; for (i = 0; i < 90; i++) B.bossUpdateFx(b, 1 / 30);
      o.recu = 1e6 - S.bar; o.compte = S.carsShot || 0; o.propre = hitMeshes.indexOf(c.cible) < 0;
      // 3. Une roquette (dégâts énormes) suffit
      B.bossThrow(b); c = B.bossCars.filter(function(x){ return x.m.visible; })[0]; B.bossCarHit(c, c.m.position, 1e9); o.roquette = !c.m.visible;
      B.bossClearFx(); clearZombies();
      return o;
    });
    ok(r.cible, 'L’auto en vol doit être une cible des tirs'); ok(r.passe > 0 && r.rangee, 'Auto non touchée : dégâts ' + r.passe + ', retirée des cibles : ' + r.rangee);
    egal(r.tirs, __boss_hits(), 'Balles pour détruire l’auto'); ok(r.detruite && r.propre, 'Auto détruite en vol et retirée des cibles');
    egal(r.recu, 0, 'Dégâts à la barricade après destruction'); egal(r.compte, 1, 'Autos détruites comptées (S.carsShot)');
    ok(r.roquette, 'Une roquette détruit l’auto d’un coup');
  });

  test('Boss : la récompense est versée (argent, XP, ferraille)', () => {
    exiger();
    ok(avecBoss().ok, 'Le boss n’est pas apparu');
    const r = J(function(){
      var b = zombies.find(function(z){ return z.type === 'boss'; });
      var m = S.money, x = S.xpGained, f = P.scrap;
      damage(b, 1e12, false, b.g.position.clone()); __boss.bossFrame();
      return { argent: S.money - m, xp: S.xpGained - x, ferraille: P.scrap - f, titre: $('bTitle').textContent };
    });
    ok(r.argent >= 300, 'Argent : ' + r.argent);
    ok(r.xp >= 50, 'XP : ' + r.xp);
    ok(r.ferraille >= 50, 'Ferraille : ' + r.ferraille);
    egal(r.titre, 'Boss abattu !', 'Bannière');
  });
})();
