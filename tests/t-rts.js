'use strict';
/* Tests du mode RTS « Guerre des robots » : base militaire dans le désert (js/41-rts.js) */
(function(){
  if (typeof test !== 'function' || typeof TESTS === 'undefined') return;
  const exiger = () => { if (lire('typeof __rts === "object" && typeof __rts.rtsBuild === "function"') !== true) ignorer('Mode RTS absent (js/41-rts.js)'); };
  const fin = () => J(function(){ if (__rts.RTS.on) __rts.rtsQuit(); });
  // Partie calme : pas de ponte, pas de horde, pas de zombies
  const calme = 'function calme(){ __rts.rtsStart(); var R = __rts.RTS; R.nests.forEach(function(n){ n.spawnT = 1e9; }); R.hordeT = 1e9; clearZombies(); return R; }';

  test('RTS : base militaire dans le désert (QG, usine, tourelles), 6 nids tout autour, vue de dessus', () => {
    exiger(); reset();
    const r = J(function(){
      var b = document.getElementById('btnRts'), o = { btn: !!b && !!b.closest('#scrTitle') };
      b.click(); for (var i = 0; i < 3; i++) visuals(1 / 30);
      var R = __rts.RTS;
      o.state = state; o.nids = R.nests.length; o.robots = R.units.length; o.argent = S.money;
      o.types = R.blds.map(function(x){ return x.type; }).sort().join(',');
      var ang = R.nests.map(function(n){ return Math.atan2(n.z, n.x); }), loin = R.nests.every(function(n){ return Math.hypot(n.x, n.z) > 60; });
      o.loin = loin; o.quadrants = [0, 1, 2, 3].filter(function(q){ return ang.some(function(a){ var k = Math.floor(((a + Math.PI * 2) % (Math.PI * 2)) / (Math.PI / 2)); return k === q; }); }).length;
      o.sable = scene.fog.color.getHexString(); o.dalle = !!R.pad && R.pad.scale.x === R.baseR;
      o.barricade = world.children.some(function(g){ return g.isGroup && g.children.length >= 6 && g.children.every(function(c){ return Math.abs(c.position.z - BAR_Z) < 1.4; }); });
      camera.updateMatrixWorld(); var d = new THREE.Vector3(); camera.getWorldDirection(d); o.bas = d.y < -.8 && camera.position.y > 24;
      return o;
    });
    fin();
    ok(r.btn, 'Bouton'); egal(r.state, 'rts', 'État');
    egal(r.nids, 6, 'Nids'); ok(r.loin, 'Nids loin de la base'); ok(r.quadrants >= 3, 'Nids tout autour (' + r.quadrants + ' côtés sur 4)');
    egal(r.types, 'factory,hq,t_mg,t_mg,t_mg', 'Bâtiments de départ'); egal(r.robots, 3, 'Robots de départ'); egal(r.argent, 900, 'Argent de départ');
    ok(!r.barricade, 'Plus de rue : pas de barricade'); ok(r.dalle, 'Dalle de la base'); ok(r.bas, 'Vue de dessus');
  });

  test('RTS : construire et placer des bâtiments dans la zone de la base, vendre', () => {
    exiger(); reset();
    const r = J(function(c){
      eval(c); var R = calme(), o = {}; S.money = 5000;
      o.dehors = __rts.rtsBuild('t_cannon', 0, -60) === null;
      o.dessus = __rts.rtsBuild('t_cannon', 0, 0) === null;
      var m0 = S.money, t = __rts.rtsBuild('t_cannon', 0, -16); o.ok = !!t && m0 - S.money === __rts.RTS_BLD.t_cannon.cost;
      // Pose au pointeur : fantôme puis clic
      __rts.rtsStartPlace('wall'); o.fantome = !!R.place; o.pose = __rts.rtsPlaceAt(-16, -6); o.fini = !R.place;
      var m1 = S.money; o.vente = __rts.rtsSell(t) && S.money - m1 === Math.round(__rts.RTS_BLD.t_cannon.cost * .5);
      o.qg = __rts.rtsSell(R.base) === false;
      return o;
    }, calme);
    fin();
    ok(r.dehors, 'Refus hors de la base'); ok(r.dessus, 'Refus sur un autre bâtiment'); ok(r.ok, 'Construction payée');
    ok(r.fantome && r.pose && r.fini, 'Pose au pointeur'); ok(r.vente, 'Vente : moitié du prix'); ok(r.qg, 'Le QG ne se vend pas');
  });

  test('RTS : robots fabriqués dans les usines (usine lourde pour les gros), améliorations des robots', () => {
    exiger(); reset();
    const r = J(function(c){
      eval(c); var R = calme(), o = {}; S.money = 20000;
      o.sansUsine = __rts.rtsBuy('heavy') === null;
      var hf = __rts.rtsBuild('heavyfac', 15, 2); o.usine = !!hf;
      var u = __rts.rtsBuy('heavy'); o.lourd = !!u && Math.hypot(u.g.position.x - hf.x, u.g.position.z - hf.z) < hf.r + 5;
      var f = __rts.rtsBuy('rifle'); var d0 = __rts.rtsStat(f, 'dmg'), h0 = f.maxHp;
      o.arm = __rts.rtsUpgBuy('rifle', 'arm') && __rts.rtsStat(f, 'dmg') > d0 * 1.15;
      o.blindage = __rts.rtsUpgBuy('rifle', 'hp') && f.maxHp > h0 * 1.2;
      o.cout = __rts.rtsUpgCost('rifle', 'arm') > 150 * .8;
      S.money = 0; o.pauvre = !__rts.rtsUpgBuy('rifle', 'rate');
      return o;
    }, calme);
    fin();
    ok(r.sansUsine, 'Mech lourd refusé sans Usine lourde'); ok(r.usine && r.lourd, 'Mech lourd fabriqué à l’Usine lourde');
    ok(r.arm && r.blindage, 'Améliorations : armes et blindage (aussi pour les robots déjà faits)'); ok(r.cout, 'Le prix monte'); ok(r.pauvre, 'Refus sans argent');
  });

  test('RTS : tourelles qui tirent, s’améliorent (niveau 6 au plus) ; Tesla en chaîne ; réparation et récupérateur', () => {
    exiger(); reset();
    const r = J(function(c){
      eval(c); var R = calme(), o = {}; S.money = 1e6;
      R.units.forEach(function(u){ u.g.position.set(0, 0, 18); u.cmd = 'idle'; u.U = Object.assign({}, u.U, { range:0 }); });
      var t = __rts.rtsBuild('t_mg', 0, -16); var z = __t.placer('walker', 0, -26); z.hp = z.maxHp = 1e6; z.speed = 0;
      for (var i = 0; i < 60; i++) visuals(1 / 30); o.tir = z.hp < 1e6;
      var d1 = __rts.rtsTStat(t, 'dmg'); o.up = __rts.rtsTurretUp(t) && t.lv === 2 && __rts.rtsTStat(t, 'dmg') > d1;
      for (var k = 0; k < 10; k++) __rts.rtsTurretUp(t); o.max = t.lv;
      clearZombies();
      var te = __rts.rtsBuild('t_tesla', 14, -8); var zs = [[14, -18], [16, -20], [12, -21]].map(function(p){ var q = __t.placer('walker', p[0], p[1]); q.hp = q.maxHp = 1e6; q.speed = 0; return q; });
      for (var n = 0; n < 60; n++) visuals(1 / 30); o.chaine = zs.filter(function(q){ return q.hp < 1e6; }).length;
      clearZombies();
      var rep = __rts.rtsBuild('repair', -14, -2); var u = R.units[0]; u.g.position.set(-14, 0, 4); u.cmd = 'idle'; u.hp = 10; o.rep = !!rep;
      var sc = __rts.rtsBuild('scrap', 16, -2); o.sc = !!sc; var m0 = S.money; R.incT = .01;
      for (var j = 0; j < 30; j++) visuals(1 / 30); o.soin = u.hp > 10; o.revenu = S.money - m0;
      return o;
    }, calme);
    fin();
    ok(r.tir, 'La tourelle tire'); ok(r.up, 'Amélioration'); egal(r.max, 6, 'Niveau maximal');
    ok(r.chaine >= 2, 'Tesla : éclair sur plusieurs zombies (' + r.chaine + ')');
    ok(r.rep && r.sc, 'Atelier et récupérateur construits'); ok(r.soin, 'L’atelier répare'); ok(r.revenu >= 15, 'Le récupérateur rapporte : ' + r.revenu);
  });

  test('RTS : zombies de partout ; ils attaquent le bâtiment le plus proche ; la base s’agrandit à chaque nid ; fin de partie', () => {
    exiger(); reset();
    const r = J(function(c){
      eval(c); var R = calme(), o = {}; S.money = 1e6;
      R.units.forEach(function(u){ u.g.position.set(0, 0, 18); u.U = Object.assign({}, u.U, { range:0, dmg:0 }); });
      R.blds.filter(function(b){ return b.type === 't_mg'; }).forEach(function(b){ __rts.rtsSell(b); });
      // Horde : du bord du désert
      R.hordeT = 0; visuals(1 / 30); R.hordeT = 1e9;
      var zs = zombies.filter(function(z){ return !z.dead; }); o.horde = zs.length; o.bord = zs.every(function(z){ return Math.hypot(z.g.position.x, z.g.position.z) > 110; });
      clearZombies();
      // Une barricade entre le zombie et le QG : il l'attaque d'abord
      var w = __rts.rtsBuild('wall', 0, -16); var z = __t.placer('walker', 0, -26); var h0 = w.hp, q0 = R.base.hp;
      for (var i = 0; i < 30 * 8; i++) visuals(1 / 30); o.mur = w.hp < h0; o.qgIntact = R.base.hp === q0;
      clearZombies();
      // La base s'agrandit
      var r0 = R.baseR; o.avant = __rts.rtsBldOk('t_mg', 0, -28) !== '';
      __rts.rtsNestDie(R.nests[0]); o.plus = R.baseR > r0; o.apres = __rts.rtsBldOk('t_mg', 0, -28) === '';
      R.nests.forEach(function(n){ if (!n.dead) __rts.rtsNestDie(n); }); o.fin = state;
      return o;
    }, calme);
    fin();
    ok(r.horde >= 10 && r.bord, 'Horde du bord du désert : ' + r.horde);
    ok(r.mur && r.qgIntact, 'Le zombie attaque la barricade d’abord');
    ok(r.avant && r.plus && r.apres, 'La base s’agrandit : on peut construire plus loin');
    egal(r.fin, 'rtsover', 'Victoire');
    const d = J(function(){ __rts.rtsStart(); __rts.RTS.base.hp = 1; var zq = __t.placer('walker', 0, -8); zq.atkT = 0; zq.hp = zq.maxHp = 1e9; for (var i = 0; i < 90 && state === 'rts'; i++) visuals(1 / 30); var s = state; __rts.rtsQuit(); return { s: s, apres: state, cam: camera.position.distanceTo(EYE), ville: !!world && world.children.some(function(g){ return g.isGroup && g.children.length >= 6; }) }; });
    egal(d.s, 'rtsover', 'Défaite quand le QG tombe'); egal(d.apres, 'menu', 'Retour au menu'); ok(d.cam < .01, 'Caméra remise sur le toit'); ok(d.ville, 'La ville revient');
  });

  test('RTS : toucher un robot le sélectionne ; toucher un bâtiment ouvre sa fenêtre', () => {
    exiger(); reset();
    const r = J(function(){
      __rts.rtsStart(); var R = __rts.RTS; visuals(1 / 30); camera.updateMatrixWorld();
      var u = R.units[0], v = u.g.position.clone(); v.y = 2; v.project(camera);
      var p = __rts.rtsPick((v.x + 1) / 2 * innerWidth, (1 - v.y) / 2 * innerHeight);
      var b = R.base, w = new THREE.Vector3(b.x, 3, b.z).project(camera);
      R.sel.length = 0; __rts.rtsTap((w.x + 1) / 2 * innerWidth, (1 - w.y) / 2 * innerHeight, false);
      return { robot: p.unit === u, fen: R.bsel === b && !document.getElementById('rtInfo').classList.contains('hide') };
    });
    fin();
    ok(r.robot, 'Le robot sous le doigt est trouvé'); ok(r.fen, 'Fenêtre du QG');
  });
})();
