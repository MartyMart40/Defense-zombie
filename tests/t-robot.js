'use strict';
/* Tests du mode robot (js/39-robot.js) */
(function(){
  if (typeof test !== 'function' || typeof TESTS === 'undefined') return;
  const exiger = () => { if (lire('typeof __mech === "object"') !== true) ignorer('Mode robot absent (js/39-robot.js)'); };
  const quitter = () => J(function(){ if (__mech.MECH.on) __mech.mechQuit(); });

  test('Robot : démarre depuis l’écran titre, cockpit visible, armes en main cachées, barricade retirée', () => {
    exiger(); reset();
    const r = J(function(){
      var b = document.getElementById('btnMech'), o = { btn: !!b && !!b.closest('#scrTitle') };
      __mech.mechStart(); for (var i = 0; i < 5; i++) visuals(1 / 30);
      var M = __mech.MECH;
      o.state = state; o.ck = __mech.mechCk.visible; o.vms = Object.keys(VMS).filter(function(k){ return VMS[k].visible; }).length;
      o.ui = !document.getElementById('mechUI').classList.contains('hide'); o.hud = document.getElementById('hud').classList.contains('hide');
      o.bar = S.bar; o.camY = camera.position.y;
      var bar = world.children.filter(function(g){ return g.isGroup && g.children.length >= 6 && g.children.every(function(c){ return Math.abs(c.position.z - BAR_Z) < 1.4; }); });
      o.barricade = bar.length && bar.every(function(g){ return !g.visible; });
      return o;
    });
    quitter();
    ok(r.btn, 'Bouton « Robot de combat » sur l’écran titre');
    egal(r.state, 'mech', 'État du jeu');
    ok(r.ck && r.ui && r.hud, 'Cockpit et affichage du robot');
    egal(r.vms, 0, 'Armes en main visibles dans le cockpit');
    ok(r.bar >= 1500, 'Blindage : ' + r.bar);
    ok(r.camY > 4.5 && r.camY < 6.5, 'Hauteur du cockpit : ' + r.camY);
    ok(r.barricade, 'La barricade doit être retirée');
  });

  test('Robot : il marche dans la rue (la rue défile), se déplace de côté, le pas secoue le cockpit', () => {
    exiger(); reset();
    const r = J(function(){
      __mech.mechStart(); var M = __mech.MECH; plan.queue = []; spawnT = 1e9; clearZombies();
      var z = __t.placer('walker', 0, -60); z.speed = 0; var z0 = z.g.position.z;
      M.mv.f = 1; for (var i = 0; i < 60; i++) visuals(1 / 30); M.mv.f = 0;
      var o = { dist: M.dist, monde: world.position.z, zombie: z.g.position.z - z0, pas: M.step };
      M.mv.r = 1; for (var k = 0; k < 30; k++) visuals(1 / 30); M.mv.r = 0;
      o.x = M.x; o.camX = camera.position.x;
      return o;
    });
    quitter();
    ok(r.dist > 8 && r.dist < 14, 'Distance en 2 s : ' + r.dist);
    ok(Math.abs(r.monde - r.dist) < .01, 'Le décor défile avec la marche');
    ok(Math.abs(r.zombie - r.dist) < .5, 'Les zombies défilent aussi : ' + r.zombie);
    ok(r.pas > 2, 'Les pas avancent');
    ok(r.x > 3 && Math.abs(r.camX - r.x) < .2, 'Pas de côté : x = ' + r.x);
  });

  test('Robot : minigun (chauffe, surchauffe) et roquettes (bras droit) blessent les zombies', () => {
    exiger(); reset();
    const r = J(function(){
      __mech.mechStart(); var M = __mech.MECH, o = {}; plan.queue = []; spawnT = 1e9; clearZombies();
      var z = __t.placer('walker', 0, -30); z.hp = z.maxHp = 1e7; z.speed = 0; z.g.updateMatrixWorld(true);
      visuals(1 / 30); camera.lookAt(z.g.position.x, 1.2, z.g.position.z); var e = new THREE.Euler().setFromQuaternion(camera.quaternion, 'YXZ');
      __game.setAim(e.y, e.x);
      M.mini = true; for (var i = 0; i < 60; i++) visuals(1 / 30); M.mini = false;
      o.mini = 1e7 - z.hp; o.chaleur = M.heat;
      M.heat = .995; M.mini = true; for (var k = 0; k < 20; k++) visuals(1 / 30); o.surchauffe = M.hot > 0; M.mini = false; M.hot = 0; M.heat = 0;
      var h = z.hp; M.rocket = true; M.rcd = 0; visuals(1 / 30); M.rocket = false;
      var rk = __armes.ARM.rockets.filter(function(x){ return x.m.visible; })[0];
      o.roquette = !!rk; o.droite = rk ? rk.m.position.x > camera.position.x + .3 : false;
      for (var n = 0; n < 60; n++) visuals(1 / 30);
      o.boum = h - z.hp;
      return o;
    });
    quitter();
    ok(r.mini > 0, 'La minigun doit blesser le zombie visé');
    ok(r.chaleur > 0, 'La minigun chauffe');
    ok(r.surchauffe, 'Surchauffe au maximum');
    ok(r.roquette && r.droite, 'La roquette part du bras droit ' + JSON.stringify(r));
    ok(r.boum > 0, 'La roquette blesse le zombie');
  });

  test('Robot : les zombies devant le frappent, pas ceux loin sur le côté ; rue suivante au bout ; fin de partie', () => {
    exiger(); reset();
    const r = J(function(){
      __mech.mechStart(); var M = __mech.MECH, o = {}; plan.queue = []; spawnT = 1e9; clearZombies();
      var b0 = S.bar, loin = __t.placer('walker', 11, -10); loin.st = 'attack'; loin.atkT = 0; loin.speed = 0; M.x = -8;
      hitBarricade(loin, 50, .1, 1); o.loin = b0 - S.bar;
      var pres = __t.placer('walker', -8, -10); hitBarricade(pres, 50, .1, 1); o.pres = b0 - S.bar;
      // Rue suivante
      var a0 = S.barMax, ville0 = curLoc.id; M.dist = __mech.MECH_LEN;
      for (var i = 0; i < 60; i++) visuals(1 / 30);
      o.rue = M.street; o.monde = world.position.z; o.blindage = S.barMax - a0; o.ville = curLoc.id !== ville0;
      // Fin
      S.bar = 0; visuals(1 / 30); o.fin = state;
      return o;
    });
    egal(r.loin, 0, 'Zombie à 19 m sur le côté : pas de dégâts');
    ok(r.pres > 0, 'Zombie devant : dégâts au blindage');
    egal(r.rue, 2, 'Rue suivante'); ok(Math.abs(r.monde) < 5, 'Décor remis au début de la rue : ' + r.monde);
    egal(r.blindage, 250, 'Blindage +250 à chaque rue'); ok(r.ville, 'Nouvelle ville');
    egal(r.fin, 'mechover', 'Robot détruit');
    const q = J(function(){ __mech.mechQuit(); return { st: state, ck: __mech.mechCk.visible, cam: camera.position.distanceTo(EYE), titre: !document.getElementById('scrTitle').classList.contains('hide'), mech: document.body.classList.contains('mech') }; });
    egal(q.st, 'menu', 'Retour au menu'); ok(!q.ck && !q.mech, 'Cockpit retiré'); ok(q.cam < .01, 'Caméra remise sur le toit'); ok(q.titre, 'Écran titre');
    // La partie normale marche encore
    const n = J(function(){ startLocation(0); equip('pistol'); visuals(1 / 30); return { st: state, vis: VMS.pistol.visible, bar: world.children.some(function(g){ return g.isGroup && g.children.length >= 6 && g.visible && g.children.every(function(c){ return Math.abs(c.position.z - BAR_Z) < 1.4; }); }) }; });
    ok(n.vis, 'Pistolet visible dans une partie normale'); ok(n.bar, 'Barricade revenue');
  });
})();
