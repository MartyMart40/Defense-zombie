'use strict';
/* Tests des bibites, boss, vagues et carrefours du robot (js/40-robot-monstres.js) */
(function(){
  if (typeof test !== 'function' || typeof TESTS === 'undefined') return;
  const exiger = () => { if (lire('typeof __mb === "object" && typeof __mech === "object"') !== true) ignorer('Robot : monstres absents (js/40-robot-monstres.js)'); };
  const depart = () => J(function(){ __mech.mechStart(); plan.queue = []; spawnT = 1e9; clearZombies(); __mb.MB.waveT = 1e9; });
  const fin = () => J(function(){ if (__mech.MECH.on) __mech.mechQuit(); });

  test('Robot : 3 bibites monstrueuses (forme, rendu par instances, mort) ; des rampants sortent de l’abomination', () => {
    exiger(); reset(); depart();
    const r = J(function(){
      var o = {};
      ['stalker', 'spider', 'abomination'].forEach(function(t){
        var z = spawnZombie(t); z.g.position.set(0, 0, -30); var inst = !!z.inst, n0 = zombies.filter(function(x){ return !x.dead; }).length;
        damage(z, 1e12, false, z.g.position.clone());
        o[t] = { nom: ZTYPES[t].name, inst: inst, mort: z.dead, apres: zombies.filter(function(x){ return !x.dead; }).length - (n0 - 1) };
      });
      // Le rôdeur bondit en arrivant près
      clearZombies(); var s = __t.placer('stalker', 0, -30); var v0 = s.speed; for (var i = 0; i < 30 * 6 && !s.lunged; i++) visuals(1 / 30); o.bond = s.lunged && s.speed > v0 * 1.5;
      // L'araignée court plus vite qu'un coureur
      clearZombies(); var a = __t.placer('spider', 0, -80), c = __t.placer('runner', 4, -80); a.speed = ZTYPES.spider.speed; c.speed = ZTYPES.runner.speed;
      for (var k = 0; k < 60; k++) visuals(1 / 30); o.vite = (a.g.position.z + 80) > (c.g.position.z + 80) * 1.3;
      return o;
    });
    fin();
    ['stalker', 'spider', 'abomination'].forEach(t => { ok(!!r[t].nom && r[t].inst && r[t].mort, t + ' : ' + JSON.stringify(r[t])); });
    ok(r.abomination.apres >= 4, 'Rampants sortis de l’abomination : ' + r.abomination.apres);
    ok(r.bond, 'Le rôdeur doit bondir en approchant');
    ok(r.vite, 'L’araignée doit courir plus vite qu’un coureur');
  });

  test('Robot : boss (Titan, Mère pondeuse, Béhémoth) avec barre de vie et attaques propres', () => {
    exiger(); reset(); depart();
    const r = J(function(){
      var o = { boss: {} }, M = __mech.MECH, B = __mb.MB;
      // Titan : il frappe le sol en approchant
      var t = spawnZombie('titan'); t.g.position.z = t.stopZ - 10; t.stompT = 0; var b0 = S.bar, s0 = B.stomps;
      visuals(1 / 30); visuals(1 / 30);
      o.boss.titan = { barre: !document.getElementById('mkBoss').classList.contains('hide'), nom: document.getElementById('mkBossName').textContent, coup: B.stomps > s0 && S.bar < b0, musique: ambMusicState() };
      clearZombies(); visuals(1 / 30); o.cachee = document.getElementById('mkBoss').classList.contains('hide');
      // Mère pondeuse : elle pond
      var m = spawnZombie('broodmother'); m.g.position.z = -40; m.layT = 0; var n0 = zombies.length, p0 = B.broods; visuals(1 / 30);
      o.boss.broodmother = { pond: B.broods > p0 && zombies.length > n0 };
      clearZombies();
      // Béhémoth : il crache de l'acide sur le robot
      var h = spawnZombie('behemoth'); h.g.position.z = -50; h.spitT = 0; var c0 = B.spits; visuals(1 / 30);
      o.boss.behemoth = { crache: B.spits > c0, vole: h.g.position.y > 6 };
      clearZombies();
      // Une rue sur trois a son boss dans la file
      M.street = 3; __mb.MB.spawned = {}; var p = mechPlan(); o.file = p.queue.filter(function(t){ return __mb.MB_BOSS.indexOf(t) >= 0; }).length;
      M.street = 4; var p4 = mechPlan(); o.file4 = p4.queue.filter(function(t){ return __mb.MB_BOSS.indexOf(t) >= 0 || t === 'boss'; }).length; M.street = 1;
      return o;
    });
    fin();
    ok(r.boss.titan.barre && /Titan/.test(r.boss.titan.nom), 'Barre de vie du Titan : ' + r.boss.titan.nom);
    ok(r.boss.titan.coup, 'Le Titan frappe le sol et blesse le robot');
    egal(r.boss.titan.musique, 'boss', 'Musique de boss');
    ok(r.cachee, 'Barre cachée sans boss');
    ok(r.boss.broodmother.pond, 'La Mère pondeuse pond des petits');
    ok(r.boss.behemoth.crache && r.boss.behemoth.vole, 'Le Béhémoth vole et crache');
    egal(r.file, 1, 'Un boss dans la rue 3'); egal(r.file4, 0, 'Pas de boss dans la rue 4');
  });

  test('Robot : vagues de tous les côtés (devant, derrière, ruelles) et carrefour pour choisir la rue suivante', () => {
    exiger(); reset(); depart();
    const r = J(function(){
      var o = {}, M = __mech.MECH, MZ = -5.5;
      var n = __mb.mbWave(); var zs = zombies.filter(function(z){ return !z.dead; });
      o.n = n; o.devant = zs.filter(function(z){ return z.g.position.z < -60; }).length; o.derriere = zs.filter(function(z){ return z.g.position.z > MZ + 5; }).length;
      o.cotes = zs.filter(function(z){ return Math.abs(z.g.position.x) > 12.5; }).length;
      o.banniere = /Vague/.test(document.getElementById('bTitle').textContent);
      // Vagues automatiques
      clearZombies(); __mb.MB.waveT = .05; var w0 = __mb.MB.waveN; visuals(1 / 30); visuals(1 / 30); o.auto = __mb.MB.waveN > w0;
      // Carrefour au bout de la rue
      clearZombies(); M.dist = __mech.MECH_LEN; visuals(1 / 30);
      var P2 = document.getElementById('mechPanel'); o.carrefour = M.choosing && !P2.classList.contains('hide');
      o.choix = P2.querySelectorAll('button[data-i]').length;
      var routes = __mb.MB.routes; o.villes = routes.map(function(x){ return x.loc.id; });
      // Pause pendant le choix : rien ne change
      __mech.mechResume(); o.toujours = M.choosing;
      P2.querySelectorAll('button[data-i]')[1].click();
      for (var i = 0; i < 60; i++) visuals(1 / 30);
      o.rue = M.street; o.ville = curLoc.id === routes[1].loc.id; o.regle = M.route && M.route.id === routes[1].id;
      return o;
    });
    fin();
    ok(r.n >= 10, 'Zombies dans la vague : ' + r.n);
    ok(r.devant > 0 && r.derriere > 0 && r.cotes > 0, 'Devant ' + r.devant + ', derrière ' + r.derriere + ', côtés ' + r.cotes);
    ok(r.banniere, 'Annonce de la vague'); ok(r.auto, 'Les vagues reviennent toutes seules');
    ok(r.carrefour, 'Carrefour au bout de la rue'); egal(r.choix, 3, 'Trois rues au choix');
    ok(r.toujours, 'La reprise ne saute pas le carrefour');
    egal(r.rue, 2, 'Rue suivante'); ok(r.ville && r.regle, 'La ville et la règle choisies sont appliquées');
  });
})();
