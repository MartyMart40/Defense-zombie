'use strict';
/* Tests du mode RTS « Guerre des robots » (js/41-rts.js) */
(function(){
  if (typeof test !== 'function' || typeof TESTS === 'undefined') return;
  const exiger = () => { if (lire('typeof __rts === "object"') !== true) ignorer('Mode RTS absent (js/41-rts.js)'); };
  const fin = () => J(function(){ if (__rts.RTS.on) __rts.rtsQuit(); });
  const sim = (s) => 'for (var i = 0; i < ' + Math.round(s * 30) + '; i++) visuals(1 / 30);';

  test('RTS : démarre depuis l’écran titre (QG, 5 nids, 3 robots, vue de dessus)', () => {
    exiger(); reset();
    const r = J(function(){
      var b = document.getElementById('btnRts'), o = { btn: !!b && !!b.closest('#scrTitle') };
      b.click(); for (var i = 0; i < 3; i++) visuals(1 / 30);
      var R = __rts.RTS;
      o.state = state; o.nids = R.nests.length; o.robots = R.units.length; o.base = !!R.base; o.argent = S.money;
      o.camY = camera.position.y; o.regard = new THREE.Vector3(); camera.getWorldDirection(o.regard); o.bas = o.regard.y < -.6;
      o.vms = Object.keys(VMS).filter(function(k){ return VMS[k].visible; }).length;
      o.ui = !document.getElementById('rtsUI').classList.contains('hide');
      return o;
    });
    fin();
    ok(r.btn, 'Bouton sur l’écran titre'); egal(r.state, 'rts', 'État');
    egal(r.nids, 5, 'Bâtiments infectés'); egal(r.robots, 3, 'Robots de départ'); ok(r.base, 'QG'); egal(r.argent, 600, 'Argent de départ');
    ok(r.camY > 20 && r.bas, 'Vue de dessus (y = ' + r.camY + ')'); egal(r.vms, 0, 'Arme en main cachée'); ok(r.ui, 'Affichage du RTS');
  });

  test('RTS : acheter des robots, les choisir, les envoyer ; ils tirent sur les zombies (argent gagné)', () => {
    exiger(); reset();
    const r = J(function(sim){
      __rts.rtsStart(); var R = __rts.RTS, o = {}; R.nests.forEach(function(n){ n.spawnT = 1e9; }); R.hordeT = 1e9; clearZombies();
      S.money = 1000; var u = __rts.rtsBuy('gunner'); o.achat = !!u && S.money === 600 && R.units.length === 4;
      S.money = 10; o.refus = __rts.rtsBuy('heavy') === null;
      // Choisir et envoyer
      __rts.rtsSelect(R.units.slice(0, 2), false); o.choisis = R.sel.length;
      __rts.rtsOrder({ x:8, z:-40 }); eval(sim);
      var a = R.units[0].g.position; o.arrive = Math.hypot(a.x - 8, a.z + 40) < 4;
      // Combat
      __rts.rtsSelect([], false);
      var z = __t.placer('walker', R.units[0].g.position.x, R.units[0].g.position.z - 8); z.speed = 0; var m0 = S.money, k0 = R.kills;
      for (var i = 0; i < 90 && !z.dead; i++) visuals(1 / 30);
      o.tue = z.dead; o.gain = S.money > m0; o.compte = R.kills > k0;
      return o;
    }, sim(8));
    fin();
    ok(r.achat, 'Achat d’un mitrailleur'); ok(r.refus, 'Achat refusé sans argent');
    egal(r.choisis, 2, 'Robots choisis'); ok(r.arrive, 'Les robots vont où on les envoie');
    ok(r.tue && r.gain && r.compte, 'Le zombie proche est abattu et rapporte de l’argent');
  });

  test('RTS : les zombies attaquent robots et QG ; les nids font sortir des zombies ; la menace monte', () => {
    exiger(); reset();
    const r = J(function(){
      __rts.rtsStart(); var R = __rts.RTS, o = {}; R.hordeT = 1e9; clearZombies();
      // Un zombie près du QG, sans robot autour : il frappe le QG
      R.units.forEach(function(u){ u.g.position.z = -150; u.g.position.x = 10; u.cmd = 'idle'; u.tgt = null; u.U = Object.assign({}, u.U, { range:0, dmg:0 }); });
      R.nests.forEach(function(n){ n.spawnT = 1e9; });
      var z = spawnZombie('walker'); z.g.position.set(0, 0, R.base.z - 5); var h0 = R.base.hp;
      for (var i = 0; i < 120; i++) visuals(1 / 30);
      o.qg = R.base.hp < h0;
      // Les nids pondent
      clearZombies(); R.nests[0].spawnT = 0; visuals(1 / 30); o.ponte = zAliveCount() > 0;
      // La menace monte avec les zombies abattus
      var t0 = R.threat; R.kills += 280; visuals(1 / 30); o.menace = R.threat > t0 + 1.5;
      return o;
    });
    fin();
    ok(r.qg, 'Le QG prend des coups'); ok(r.ponte, 'Les nids font sortir des zombies'); ok(r.menace, 'La menace monte');
  });

  test('RTS : attaquer un nid le détruit (prime) ; tous détruits = victoire ; QG détruit = défaite', () => {
    exiger(); reset();
    const r = J(function(){
      __rts.rtsStart(); var R = __rts.RTS, o = {}; R.hordeT = 1e9; R.nests.forEach(function(n){ n.spawnT = 1e9; }); clearZombies();
      var N = R.nests[0]; R.units.forEach(function(u){ u.g.position.set(N.x * .4, 0, N.z + 12); });
      __rts.rtsSelect(R.units, false); __rts.rtsOrder({ nest:N }); var h0 = N.hp;
      for (var i = 0; i < 90; i++) visuals(1 / 30);
      o.touche = N.hp < h0;
      var m0 = S.money; __rts.rtsNestDie(N); o.prime = S.money - m0; o.mort = N.dead;
      R.nests.forEach(function(n){ if (!n.dead) __rts.rtsNestDie(n); });
      o.fin = state;
      return o;
    });
    ok(r.touche, 'Le nid prend des dégâts'); ok(r.prime >= 500 && r.mort, 'Prime : ' + r.prime); egal(r.fin, 'rtsover', 'Victoire');
    fin();
    const d = J(function(){ __rts.rtsStart(); var R = __rts.RTS; R.base.hp = 0; visuals(1 / 30); var s = state; __rts.rtsQuit(); return { s: s, apres: state, cam: camera.position.distanceTo(EYE) }; });
    egal(d.s, 'rtsover', 'Défaite quand le QG tombe'); egal(d.apres, 'menu', 'Retour au menu'); ok(d.cam < .01, 'Caméra remise sur le toit');
  });

  test('RTS : toucher ou cliquer sur un robot à l’écran le sélectionne', () => {
    exiger(); reset();
    const r = J(function(){
      __rts.rtsStart(); var R = __rts.RTS; visuals(1 / 30);
      camera.updateMatrixWorld(); var u = R.units[0], v = u.g.position.clone(); v.y = 1.5; v.project(camera);
      var p = __rts.rtsPick((v.x + 1) / 2 * innerWidth, (1 - v.y) / 2 * innerHeight);
      var sol = __rts.rtsPick(innerWidth / 2, innerHeight * .3);
      return { robot: p.unit === u, sol: sol.x != null && sol.z != null };
    });
    fin();
    ok(r.robot, 'Le robot sous le doigt est trouvé'); ok(r.sol, 'Ailleurs : un point du sol');
  });
})();
