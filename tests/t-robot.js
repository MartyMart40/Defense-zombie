'use strict';
/* Tests du mode robot (js/39-robot.js) */
(function(){
  if (typeof test !== 'function' || typeof TESTS === 'undefined') return;
  const exiger = () => { if (lire('typeof __mech === "object"') !== true) ignorer('Mode robot absent (js/39-robot.js)'); };
  const quitter = () => J(function(){ if (__mech.MECH.on) __mech.mechQuit(); });

  test('Robot : démarre depuis l’écran titre, cockpit visible, armes en main cachées, barricade retirée', () => {
    exiger(); reset();
    const r = J(function(){
      var b = document.getElementById('btnMech'), o = { btn: !!b && !!b.closest('#scrTitle') }; P.mech.unlocked = true;
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
      visuals(1 / 30);
      var route = typeof __mb === 'object' && __mb.MB.routes ? __mb.MB.routes[0] : null; // carrefour (40-robot-monstres.js)
      if (route) __mb.mbGo(route);
      for (var i = 0; i < 60; i++) visuals(1 / 30);
      o.rue = M.street; o.monde = world.position.z; o.blindage = S.barMax - a0; o.ville = route ? curLoc.id === route.loc.id : curLoc.id !== ville0;
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
(function(){
  if (typeof test !== 'function' || typeof TESTS === 'undefined') return;
  const exiger = () => { if (lire('typeof __mech === "object" && typeof __mech.mechGarage === "function"') !== true) ignorer('Garage du robot absent'); };

  test('Robot : verrouillé au départ, débloqué en tombant en mode infini', () => {
    exiger(); reset();
    const r = J(function(){
      var o = {}; P.mech.unlocked = false; __mech.mechBtn();
      var b = document.getElementById('btnMech'); o.txt = b.textContent; b.click();
      o.state = state; o.panneau = !document.getElementById('mechPanel').classList.contains('hide');
      __inf.infStart(0, true); __t.geler(); gameOver();
      o.debloque = __mech.mechUnlocked(); o.sauve = JSON.parse(localStorage.getItem('dt_prof')).mech.unlocked; o.txt2 = b.textContent;
      // Une partie normale perdue ne débloque rien
      P.mech.unlocked = false; startLocation(0); __t.geler(); gameOver(); o.normal = __mech.mechUnlocked();
      return o;
    });
    ok(/🔒/.test(r.txt), 'Bouton verrouillé : ' + r.txt);
    ok(r.state !== 'mech' && !r.panneau, 'Le robot ne doit pas démarrer verrouillé');
    ok(r.debloque && r.sauve, 'Débloqué et sauvegardé après une chute en infini');
    ok(!/🔒/.test(r.txt2), 'Bouton déverrouillé');
    ok(!r.normal, 'Une partie normale perdue ne débloque pas le robot');
  });

  test('Robot : garage (améliorations payées en ferraille, sauvegardées) et leurs effets', () => {
    exiger(); reset();
    const r = J(function(){
      var o = {}; P.mech.unlocked = true; P.scrap = 1e6;
      document.getElementById('btnMech').click();
      var P2 = document.getElementById('mechPanel'); o.ouvert = !P2.classList.contains('hide'); o.lignes = P2.querySelectorAll('button[data-k]').length;
      var s0 = P.scrap, c = __mech.mechUpgCost('armor', 0); P2.querySelector('button[data-k="armor"]').click();
      o.niv = __mech.mUp('armor'); o.paye = s0 - P.scrap === c; o.sauve = JSON.parse(localStorage.getItem('dt_prof')).mech.lv.armor;
      ['cool', 'salvo', 'salvo', 'legs', 'regen', 'mdmg'].forEach(function(k){ __mech.mechUpgBuy(k); });
      o.salveMax = __mech.mechUpgBuy('salvo');
      P.scrap = 0; o.pauvre = __mech.mechUpgBuy('rdmg');
      __mech.mechStart(); var M = __mech.MECH; plan.queue = []; spawnT = 1e9; clearZombies();
      o.blindage = S.barMax;
      // Salve : 3 roquettes d'un coup
      var n0 = __armes.ARM.rockets.filter(function(x){ return x.m.visible; }).length; M.rocket = true; M.rcd = 0; visuals(1 / 30); M.rocket = false;
      o.salve = __armes.ARM.rockets.filter(function(x){ return x.m.visible; }).length - n0;
      // Jambes : plus de distance en 1 s
      var d0 = M.dist; M.mv.f = 1; for (var i = 0; i < 30; i++) visuals(1 / 30); M.mv.f = 0; o.marche = M.dist - d0;
      // Nanorobots
      S.bar = S.barMax * .5; var b0 = S.bar; for (var k = 0; k < 30; k++) visuals(1 / 30); o.regen = S.bar - b0;
      __mech.mechQuit();
      return o;
    });
    ok(r.ouvert && r.lignes === 9, 'Garage ouvert avec 9 améliorations (' + r.lignes + ')');
    ok(r.niv === 1 && r.paye && r.sauve === 1, 'Achat payé en ferraille et sauvegardé');
    ok(!r.salveMax, 'Salve plafonnée à 2'); ok(!r.pauvre, 'Achat refusé sans ferraille');
    egal(r.blindage, Math.round(1500 * 1.15), 'Blindage +15 %');
    egal(r.salve, 3, 'Salve de 3 roquettes');
    ok(r.marche > 5.5 * 1.05, 'Jambes renforcées : ' + r.marche.toFixed(2) + ' m en 1 s');
    ok(r.regen > 0, 'Les nanorobots réparent');
  });
})();
(function(){
  if (typeof test !== 'function' || typeof TESTS === 'undefined') return;
  const exiger = () => { if (lire('typeof __mech === "object" && typeof __mech.mechWeapon === "function"') !== true) ignorer('Armes du robot absentes'); };

  test('Robot : demi-tour, retour sur ses pas, les zombies passés derrière le poursuivent', () => {
    exiger(); reset();
    const r = J(function(){
      __mech.mechStart(); var M = __mech.MECH, o = {}; plan.queue = []; spawnT = 1e9; clearZombies();
      M.mv.f = 1; for (var i = 0; i < 60; i++) visuals(1 / 30); M.mv.f = 0; o.avant = M.dist;
      __game.setAim(Math.PI, -.2); M.mv.f = 1; for (var k = 0; k < 30; k++) visuals(1 / 30); M.mv.f = 0; o.retour = M.dist;
      for (var n = 0; n < 120; n++){ M.mv.f = 1; visuals(1 / 30); } M.mv.f = 0; o.debut = M.dist;
      // Zombie derrière le robot : il fait demi-tour et l'attaque
      var z = __t.placer('walker', M.x, -5.5 + 9); z.speed = 2.5; var b0 = S.bar, z0 = z.g.position.z;
      for (var t = 0; t < 30 * 8; t++) visuals(1 / 30);
      o.zr = z.g.position.z < z0 - 3; o.tourne = Math.abs(z.g.rotation.y - Math.PI) < .01; o.st = z.st; o.coups = b0 - S.bar;
      // En avançant, ceux qui attaquent de face restent devant
      clearZombies(); __game.setAim(0, -.2); var f = __t.placer('walker', M.x, -10); f.st = 'attack'; var fz = f.g.position.z;
      M.mv.f = 1; for (var q = 0; q < 30; q++) visuals(1 / 30); M.mv.f = 0; o.devant = f.g.position.z < -5.5 && Math.abs(f.g.position.z - fz) < 1;
      return o;
    });
    J(function(){ __mech.mechQuit(); });
    ok(r.avant > 8, 'Avance : ' + r.avant);
    ok(r.retour < r.avant - 3, 'Demi-tour puis marche : la distance doit baisser (' + r.avant.toFixed(1) + ' -> ' + r.retour.toFixed(1) + ')');
    ok(Math.abs(r.debut) < 1e-9, 'On ne recule pas avant le début de la rue : ' + r.debut);
    ok(r.zr && r.tourne, 'Le zombie derrière doit faire demi-tour et revenir vers le robot');
    egal(r.st, 'attack', 'Il attaque le robot par derrière'); ok(r.coups > 0, 'Coups reçus par derrière');
    ok(r.devant, 'Un zombie qui attaque de face reste devant quand le robot avance');
  });

  test('Robot : sur cell, glisser pour viser tire en même temps (réglable)', () => {
    exiger(); reset();
    const r = J(function(){
      __mech.mechStart(); var M = __mech.MECH, o = {}; plan.queue = []; spawnT = 1e9; clearZombies();
      M.autoFire = true; M.aim.id = 7; for (var i = 0; i < 45; i++) visuals(1 / 30); o.chaleur = M.heat; M.aim.id = null;
      M.heat = 0; M.autoFire = false; M.aim.id = 7; for (var k = 0; k < 45; k++) visuals(1 / 30); o.coupe = M.heat; M.aim.id = null; M.autoFire = true;
      __mech.mechQuit(); return o;
    });
    ok(r.chaleur > 0, 'Viser au doigt fait tirer l’arme du bras gauche');
    egal(r.coupe, 0, 'Réglage coupé : viser ne tire pas');
  });

  test('Robot : nouvelles armes achetées et équipées au garage, chacune blesse les zombies', () => {
    exiger(); reset();
    const r = J(function(){
      var o = { achats: {}, degats: {}, vis: {} }; P.mech.unlocked = true; P.scrap = 1e6;
      ['flamer', 'laser', 'gl', 'arc', 'railgun'].forEach(function(id){ o.achats[id] = __mech.mechWeapon(id); });
      o.paye = P.scrap < 1e6; o.sauve = JSON.parse(localStorage.getItem('dt_prof')).mech.own.railgun === true;
      [['minigun', 'rocket'], ['flamer', 'gl'], ['laser', 'arc'], ['laser', 'railgun']].forEach(function(pair){
        __mech.mechWeapon(pair[0]); __mech.mechWeapon(pair[1]);
        __mech.mechStart(); var M = __mech.MECH; plan.queue = []; spawnT = 1e9; clearZombies();
        o.vis[pair.join('+')] = __mech.mechArmsG[pair[0]].visible && __mech.mechArmsG[pair[1]].visible && Object.keys(__mech.mechArmsG).filter(function(k){ return __mech.mechArmsG[k].visible; }).length === 2;
        var z = __t.placer('walker', 0, -22); z.hp = z.maxHp = 1e8; z.speed = 0; var z2 = __t.placer('walker', 2, -24); z2.hp = z2.maxHp = 1e8; z2.speed = 0;
        visuals(1 / 30); camera.lookAt(0, 1.2, -22); var e = new THREE.Euler().setFromQuaternion(camera.quaternion, 'YXZ'); __game.setAim(e.y, e.x);
        M.mini = true; for (var i = 0; i < 40; i++) visuals(1 / 30); M.mini = false;
        o.degats[pair[0]] = Math.max(o.degats[pair[0]] || 0, 1e8 - z.hp); var h = z.hp + z2.hp;
        M.rocket = true; for (var k = 0; k < 6; k++){ M.rcd = 0; visuals(1 / 30); } M.rocket = false;
        for (var n = 0; n < 45; n++) visuals(1 / 30);
        o.degats[pair[1]] = h - (z.hp + z2.hp);
        __mech.mechQuit();
      });
      return o;
    });
    Object.keys(r.achats).forEach(id => ok(r.achats[id], id + ' : achat refusé'));
    ok(r.paye && r.sauve, 'Armes payées en ferraille et sauvegardées');
    Object.keys(r.vis).forEach(k => ok(r.vis[k], k + ' : les bonnes armes doivent se voir sur les bras'));
    Object.keys(r.degats).forEach(id => ok(r.degats[id] > 0, id + ' : aucun dégât'));
  });
})();
