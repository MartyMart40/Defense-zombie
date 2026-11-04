'use strict';
/* Tests du mode RTS « Guerre des robots » : base militaire dans une vallée du désert (js/41-rts.js) */
(function(){
  if (typeof test !== 'function' || typeof TESTS === 'undefined') return;
  const exiger = () => { if (lire('typeof __rts === "object" && typeof __rts.rtsBuild === "function"') !== true) ignorer('Mode RTS absent (js/41-rts.js)'); };
  const fin = () => J(function(){ if (__rts.RTS.on) __rts.rtsQuit(); });
  // Partie calme : pas de ponte, pas de horde, pas de zombies
  const calme = 'function calme(){ __rts.rtsStart(); var R = __rts.RTS; R.nests.forEach(function(n){ n.spawnT = 1e9; }); R.hordeT = 1e9; clearZombies(); return R; }';

  test('RTS : base dans une vallée (montagnes au sud et sur les côtés), 6 nids au nord le long de la vieille route', () => {
    exiger(); reset();
    const r = J(function(){
      var b = document.getElementById('btnRts'), o = { btn: !!b && !!b.closest('#scrTitle') };
      b.click(); for (var i = 0; i < 3; i++) visuals(1 / 30);
      var R = __rts.RTS;
      o.state = state; o.nids = R.nests.length; o.robots = R.units.length; o.argent = S.money;
      o.types = R.blds.map(function(x){ return x.type; }).sort().join(',');
      o.nord = R.nests.every(function(n){ return n.z < -70 && Math.abs(Math.atan2(n.x, -n.z)) < Math.PI / 4 + .1; });
      var xs = R.nests.map(function(n){ return n.x; }); o.route = Math.max.apply(null, xs) - Math.min.apply(null, xs) > 30;
      o.dalle = !!R.pad && R.pad.scale.x === R.baseR;
      o.barricade = world.children.some(function(g){ return g.isGroup && g.children.length >= 6 && g.children.every(function(c){ return Math.abs(c.position.z - BAR_Z) < 1.4; }); });
      camera.updateMatrixWorld(); var d = new THREE.Vector3(); camera.getWorldDirection(d); o.bas = d.y < -.8 && camera.position.y > 24;
      var p = { x:80, z:20 }; __rts.rtsClampValley(p, false); o.mur = Math.abs(p.x) < 40;
      var q = { x:0, z:60 }; __rts.rtsClampValley(q, false); o.sud = q.z <= 26;
      return o;
    });
    fin();
    ok(r.btn, 'Bouton'); egal(r.state, 'rts', 'État');
    egal(r.nids, 6, 'Nids'); ok(r.nord, 'Nids au nord, dans l’ouverture de 90°'); ok(r.route, 'Nids étalés sur tout le secteur, pas seulement le long de la route');
    egal(r.types, 'factory,hq,t_mg,t_mg,t_mg', 'Bâtiments de départ'); egal(r.robots, 3, 'Robots de départ'); egal(r.argent, 900, 'Argent de départ');
    ok(!r.barricade, 'Plus de rue : pas de barricade'); ok(r.dalle, 'Dalle de la base'); ok(r.bas, 'Vue de dessus');
    ok(r.mur && r.sud, 'Montagnes : on ne passe ni par les côtés ni par le sud');
  });

  test('RTS : sans cible, ceux qui prennent la vieille route la suivent jusqu’à la base', () => {
    exiger(); reset();
    const r = J(function(c){
      eval(c); var R = calme(), o = {};
      R.units.forEach(function(u){ u.g.position.set(0, 0, 20); u.U = Object.assign({}, u.U, { range:0, dmg:0 }); });
      R.blds.filter(function(b){ return b.type === 't_mg'; }).forEach(function(b){ __rts.rtsSell(b); });
      var E = __rts.RTS_ROAD[7], z = __t.placer('walker', E[0], E[1]); z.useRoad = true; z.speed = 6; z.hp = z.maxHp = 1e9;
      var maxD = 0; for (var i = 0; i < 30 * 55; i++){ visuals(1 / 30); maxD = Math.max(maxD, __rts.rtsRoadDist(z.g.position.x, z.g.position.z)); }
      o.route = maxD; o.base = Math.hypot(z.g.position.x, z.g.position.z);
      return o;
    }, calme);
    fin();
    ok(r.route < 7, 'Il reste sur la route (écart ' + r.route.toFixed(1) + ' m)'); ok(r.base < 25, 'Il arrive à la base : ' + r.base.toFixed(0) + ' m');
  });

  test('RTS : nouveaux robots, tank, hélicoptère, chasseur, Warthog et bombardier, avec leurs bâtiments et améliorations', () => {
    exiger(); reset();
    const r = J(function(c){
      eval(c); var R = calme(), o = {}; S.money = 1e6; R.baseR = 70;
      o.sans = __rts.rtsBuy('tank') === null && __rts.rtsBuy('jet') === null;
      o.bats = ['vehdepot', 'heliport', 'airfield'].map(function(t, i){ return !!__rts.rtsBuild(t, [20, -20, 25][i], [10, 12, -25][i]); });
      var U = {}; ['sniper', 'flamebot', 'tank', 'heli', 'jet', 'warthog', 'bomber'].forEach(function(t){ U[t] = __rts.rtsBuy(t); });
      o.tous = Object.keys(U).filter(function(k){ return !!U[k]; }).join(',');
      for (var i = 0; i < 60; i++) visuals(1 / 30);
      o.vol = ['heli', 'jet', 'warthog', 'bomber'].every(function(k){ return U[k].g.position.y > 8; });
      var p0 = U.jet.g.position.clone(); visuals(1 / 30); o.avance = U.jet.g.position.distanceTo(p0) > .5;
      o.tankSol = U.tank.g.position.y === 0;
      var d0 = __rts.rtsStat(U.tank, 'dmg'); o.upTank = __rts.rtsUpgBuy('tank', 'arm') && __rts.rtsStat(U.tank, 'dmg') > d0;
      o.upAvion = __rts.rtsUpgBuy('bomber', 'spd') && __rts.rtsStat(U.bomber, 'speed') > __rts.RTS_UNITS.bomber.speed;
      // Les zombies au sol ignorent les avions ; les volants les attaquent
      clearZombies(); R.units.forEach(function(u){ if (u !== U.heli) u.g.position.x += 0; });
      U.heli.g.position.set(-60, 11, -90); var w = __t.placer('walker', -60, -92), f = ZTYPES.flyer ? __t.placer('flyer', -61, -90) : null;
      w.rtsT = 0; w.hp = w.maxHp = 1e9; if (f){ f.rtsT = 0; f.hp = f.maxHp = 1e9; } visuals(1 / 30);
      o.dbg = f ? [f.type, f.rtsTgt ? (f.rtsTgt.type || 'x') : 'null', f.dead, f.g.position.x.toFixed(1), f.g.position.z.toFixed(1), U.heli.g.position.x.toFixed(1), U.heli.g.position.z.toFixed(1), U.heli.dead].join(',') : ''; o.ignore = w.rtsTgt !== U.heli; o.vise = !f || (!!f.rtsTgt && !!f.rtsTgt.U && f.rtsTgt.U.kind !== 'ground');
      return o;
    }, calme);
    fin();
    ok(r.sans, 'Refus sans garage ni aérodrome'); egal(r.bats.join(','), 'true,true,true', 'Garage, héliport et aérodrome');
    egal(r.tous, 'sniper,flamebot,tank,heli,jet,warthog,bomber', 'Toutes les nouvelles unités'); ok(r.vol, 'Les appareils volent'); ok(r.avance, 'Le chasseur ne s’arrête jamais');
    ok(r.tankSol, 'Le tank roule au sol'); ok(r.upTank && r.upAvion, 'Améliorations des véhicules et des avions');
    ok(r.ignore, 'Les zombies au sol ignorent l’hélicoptère'); ok(r.vise, 'Les volants s’en prennent à l’hélicoptère ' + r.dbg);
  });

  test('RTS : un boss arrive avec la horde (barre de vie), le Titan piétine', () => {
    exiger(); reset();
    const r = J(function(c){
      eval(c); var R = calme(), o = {};
      R.hordeN = __rts.RTS_CFG.bossEvery - 1; R.hordeT = 0; visuals(1 / 30); R.hordeT = 1e9;
      var b = zombies.filter(function(z){ return !z.dead && z.rtsBoss; })[0]; o.boss = b ? b.type : '';
      visuals(1 / 30); o.barre = !document.getElementById('rtBoss').classList.contains('hide');
      o.pv = b ? b.maxHp < ZTYPES[b.type].hp * 1.5 : false;
      clearZombies();
      var t = __rts.rtsSpawnAt(0, -20, 1, 0, 'titan'), ti = zombies.filter(function(z){ return z.type === 'titan'; })[0];
      var u = R.units[0]; u.g.position.set(3, 0, -20); u.U = Object.assign({}, u.U, { range:0 }); var h0 = u.hp; ti.abT = 0; ti.speed = 0;
      visuals(1 / 30); o.pietine = u.dead || u.hp < h0;
      return o;
    }, calme);
    fin();
    egal(r.boss, 'titan', 'Premier boss : le Titan'); ok(r.barre, 'Barre de vie du boss'); ok(r.pv, 'Vie réduite pour le mode RTS');
    ok(r.pietine, 'Le piétinement blesse les unités autour');
  });

  test('RTS : chaque sorte d’unité attaque un zombie à sa portée', () => {
    exiger(); reset();
    const r = J(function(c){
      eval(c); var R = calme(), o = {};
      R.blds.filter(function(b){ return b.type === 't_mg'; }).forEach(function(b){ __rts.rtsSell(b); });
      R.units.forEach(function(u){ u.g.position.set(-30, 0, 20); u.U = Object.assign({}, u.U, { range:0 }); });
      Object.keys(__rts.RTS_UNITS).forEach(function(t){
        clearZombies();
        var U = __rts.RTS_UNITS[t], u = __rts.rtsSpawnUnit(t, 0, -60); u.cmd = 'idle'; u.tx = 0; u.tz = -60;
        var z = __t.placer('walker', 0, -60 - Math.min(8, U.range * .6)); z.hp = z.maxHp = 1e6; z.speed = 0; z.dmg = 0;
        for (var i = 0; i < 30 * 8; i++) visuals(1 / 30);
        o[t] = Math.round(1e6 - z.hp); u.dead = true; R.units.splice(R.units.indexOf(u), 1); __rts.RTS.sel.length = 0;
      });
      return o;
    }, calme);
    fin();
    const non = Object.keys(r).filter(k => !(r[k] > 0));
    ok(!non.length, 'Unités qui n’attaquent pas : ' + non.join(', ') + ' · ' + JSON.stringify(r));
  });

  test('RTS : Mech de combat (minigun et roquettes, cockpit du mode robot quand on le pilote)', () => {
    exiger(); reset();
    const r = J(function(c){
      eval(c); var R = calme(), o = {}; S.money = 1e6;
      R.blds.filter(function(b){ return b.type === 't_mg'; }).forEach(function(b){ __rts.rtsSell(b); });
      __rts.rtsBuild('heavyfac', 20, 8); var m = __rts.rtsBuy('mech'); o.achat = !!m && __rts.RTS_UNITS.mech.cost > __rts.RTS_UNITS.heavy.cost * 3;
      m.g.position.set(0, 0, -40); m.hx = 0; m.hz = -40; m.cmd = 'idle';
      var a = __t.placer('walker', 0, -55), b = __t.placer('walker', 1, -56), q = __t.placer('walker', -1, -56);
      [a, b, q].forEach(function(z){ z.hp = z.maxHp = 1e6; z.speed = 0; });
      var cd0 = m.cd2; for (var i = 0; i < 60; i++) visuals(1 / 30);
      o.tir = a.hp < 1e6 || b.hp < 1e6; o.roquettes = m.cd2 > 0 && b.hp < 1e6 - 200;
      __rts.rtsSelect([m], false); __rts.rtsPilotSel(); visuals(1 / 30);
      o.cockpit = typeof mechCk === 'undefined' || mechCk.visible; o.oeil = camera.position.y > 5;
      R.pv.fire = true; for (var k = 0; k < 30; k++) visuals(1 / 30); R.pv.fire = false; o.spin = R.spin > .9;
      __rts.rtsUnpilot(); visuals(1 / 30); o.fin = typeof mechCk === 'undefined' || !mechCk.visible;
      return o;
    }, calme);
    fin();
    ok(r.achat, 'Mech de combat à l’Usine lourde, bien plus cher'); ok(r.tir && r.roquettes, 'Minigun et roquettes');
    ok(r.cockpit && r.oeil, 'Cockpit du mode robot'); ok(r.spin, 'La minigun monte en régime'); ok(r.fin, 'Cockpit caché au retour');
  });

  test('RTS : IA des unités (recule devant un zombie trop proche, ne poursuit pas trop loin, se fait réparer)', () => {
    exiger(); reset();
    const r = J(function(c){
      eval(c); var R = calme(), o = {}; S.money = 1e6;
      R.blds.filter(function(b){ return b.type === 't_mg'; }).forEach(function(b){ __rts.rtsSell(b); });
      var u = R.units[0]; R.units.slice(1).forEach(function(x){ x.g.position.set(-25, 0, 20); x.hx = -25; x.hz = 20; x.U = Object.assign({}, x.U, { range:0 }); });
      u.g.position.set(0, 0, -40); u.hx = 0; u.hz = -40; u.cmd = 'idle'; u.U = Object.assign({}, u.U, { dmg:0 });
      var z = __t.placer('walker', 0, -43); z.speed = 0; z.dmg = 0; z.hp = z.maxHp = 1e6;
      for (var i = 0; i < 45; i++) visuals(1 / 30);
      o.recule = Math.hypot(u.g.position.x - z.g.position.x, u.g.position.z - z.g.position.z) > 5;
      clearZombies(); u.g.position.set(0, 0, -40);
      var loin = __t.placer('walker', 0, -40 - 18 - 30); loin.speed = 0; loin.hp = loin.maxHp = 1e6;
      for (var j = 0; j < 90; j++) visuals(1 / 30);
      o.laisse = Math.hypot(u.g.position.x, u.g.position.z + 40) < 6;
      clearZombies();
      __rts.rtsBuild('repair', -14, -2); u.hp = u.maxHp * .2; u.scanT = 0;
      for (var k = 0; k < 30 * 12 && u.hp < u.maxHp * .5; k++) visuals(1 / 30);
      o.repare = u.hp >= u.maxHp * .5;
      return o;
    }, calme);
    fin();
    ok(r.recule, 'Il recule devant un zombie trop proche'); ok(r.laisse, 'Il ne part pas à la poursuite trop loin de son poste'); ok(r.repare, 'Abîmé, il va se faire réparer à l’atelier');
  });

  test('RTS : rotation des bâtiments, AC-130 qui tourne en rond et tire, Mech de combat signalé', () => {
    exiger(); reset();
    const r = J(function(c){
      eval(c); var R = calme(), o = {}; S.money = 1e6; R.baseR = 70;
      __rts.rtsStartPlace('factory'); var k = __rts.rtsRotate(); o.fantome = k === 1;
      o.pose = __rts.rtsPlaceAt(-24, -12); var f = R.blds[R.blds.length - 1]; o.tourne = f.type === 'factory' && Math.abs(f.m.rotation.y - Math.PI / 2) < 1e-6 && f.rot === 1;
      R.placeRot = 0;
      __rts.rtsTab('rob'); visuals(1 / 30); var bt = document.querySelector('#rtBar .rt-buy[data-t="mech"]');
      o.mech = !!bt && bt.classList.contains('rt-star') && /Usine lourde/.test(bt.textContent);
      R.blds.filter(function(b){ return b.type === 't_mg'; }).forEach(function(b){ __rts.rtsSell(b); });
      R.units.forEach(function(u){ u.g.position.set(-30, 0, 20); u.hx = -30; u.hz = 20; u.U = Object.assign({}, u.U, { range:0 }); });
      var a = __rts.rtsSpawnUnit('bomber', 0, -60); var zs = [[0, -90], [2, -91], [-2, -92]].map(function(p){ var z = __t.placer('walker', p[0], p[1]); z.hp = z.maxHp = 1e6; z.speed = 0; return z; });
      var dmin = 1e9, dmax = 0, roll = 0;
      for (var i = 0; i < 30 * 20; i++){ visuals(1 / 30); if (i > 30 * 10){ var d = Math.hypot(a.g.position.x - a.oc[0], a.g.position.z - a.oc[1]); dmin = Math.min(dmin, d); dmax = Math.max(dmax, d); roll = a.g.rotation.z; } }
      o.orbite = dmin > 20 && dmax < 70; o.penche = roll > .2; o.tir = zs.filter(function(z){ return z.hp < 1e6; }).length >= 2;
      __rts.rtsSelect([a], false); __rts.rtsPilotSel(); visuals(1 / 30);
      o.vue = camera.fov < 50 && canvas.classList.contains('rt-ac') && camera.position.y > 20; o.dbg = [camera.fov, canvas.className, camera.position.y.toFixed(1), !!R.pilot].join(',');
      a.cd2 = 0; /* canon rechargé : il a pu tirer seul juste avant */ R.pv.fire2 = true; var cd = a.cd2; visuals(1 / 30); R.pv.fire2 = false; o.obus = a.cd2 > 1;
      __rts.rtsUnpilot(); o.fin = camera.fov > 50 && !canvas.classList.contains('rt-ac');
      return o;
    }, calme);
    fin();
    ok(r.fantome && r.pose && r.tourne, 'Le bâtiment posé garde sa rotation'); ok(r.mech, 'Mech de combat mis en avant, avec le bâtiment requis');
    ok(r.orbite && r.penche, 'AC-130 : il tourne en rond, penché'); ok(r.tir, 'AC-130 : il tire sur les zombies');
    ok(r.vue && r.obus, 'AC-130 piloté : vue du canonnier, obus de 105 ' + JSON.stringify(r)); ok(r.fin, 'Vue normale au retour');
  });

  test('RTS : améliorations de l’AC-130 (gatling de 25 mm, rechargement, obus incendiaires, capteurs)', () => {
    exiger(); reset();
    const r = J(function(c){
      eval(c); var R = calme(), o = {}; S.money = 1e7;
      var a = __rts.rtsSpawnUnit('bomber', 0, -60), r0 = __rts.rtsStat(a, 'range');
      o.liste = Object.keys(__rts.RTS_UPG_SPEC.bomber).join(',');
      o.achats = ['g25', 'cal105', 'fire', 'sensor'].every(function(k){ return __rts.rtsUpgBuy('bomber', k); });
      o.capteurs = __rts.rtsStat(a, 'range') > r0 * 1.1; o.maxFeu = !__rts.rtsUpgBuy('bomber', 'fire');
      __rts.rtsUpgPanel(); o.panneau = /Gatling de 25 mm/.test(document.getElementById('rtsPanel').textContent) && /Obus incendiaires/.test(document.getElementById('rtsPanel').textContent);
      R.paused = false; document.getElementById('rtsPanel').classList.add('hide');
      R.blds.filter(function(b){ return b.type === 't_mg'; }).forEach(function(b){ __rts.rtsSell(b); });
      R.units.forEach(function(u){ if (u !== a){ u.g.position.set(-30, 0, 20); u.hx = -30; u.hz = 20; u.U = Object.assign({}, u.U, { range:0 }); } });
      var zs = [[0, -90], [3, -91], [-3, -92]].map(function(p){ var z = __t.placer('walker', p[0], p[1]); z.hp = z.maxHp = 1e6; z.speed = 0; return z; });
      var gat = 0; for (var i = 0; i < 30 * 12; i++){ var c3 = a.cd3; visuals(1 / 30); if (a.cd3 > (c3 || 0)) gat++; }
      o.gatling = gat > 10; o.feu = zs.some(function(z){ return z.burnT > 0; });
      return o;
    }, calme);
    fin();
    egal(r.liste, 'g25,cal105,fire,sensor', 'Améliorations propres à l’AC-130'); ok(r.achats && r.maxFeu, 'Achats');
    ok(r.capteurs, 'Les capteurs allongent la portée'); ok(r.panneau, 'Dans le panneau des améliorations');
    ok(r.gatling, 'La gatling de 25 mm tire'); ok(r.feu, 'Les obus incendiaires mettent le feu');
  });

  test('RTS : améliorations du tank et de l’hélicoptère, hélices de l’AC-130 qui tournent', () => {
    exiger(); reset();
    const r = J(function(c){
      eval(c); var R = calme(), o = {}; S.money = 1e7;
      o.listes = Object.keys(__rts.RTS_UPG_SPEC.tank).join(',') + '|' + Object.keys(__rts.RTS_UPG_SPEC.heli).join(',');
      o.achats = ['coax', 'he', 'apfsds', 'reactive'].every(function(k){ return __rts.rtsUpgBuy('tank', k); }) && ['chaingun', 'hellfire', 'reactive', 'sensor'].every(function(k){ return __rts.rtsUpgBuy('heli', k); });
      R.blds.filter(function(b){ return b.type === 't_mg'; }).forEach(function(b){ __rts.rtsSell(b); });
      R.units.forEach(function(u){ u.g.position.set(-30, 0, 20); u.hx = -30; u.hz = 20; u.U = Object.assign({}, u.U, { range:0 }); });
      var t = __rts.rtsSpawnUnit('tank', 0, -60), h = __rts.rtsSpawnUnit('heli', 20, -60);
      t.hp = t.maxHp = 1e4;
      var zs = [[0, -72], [20, -74], [1, -80]].map(function(p){ var z = __t.placer('walker', p[0], p[1]); z.hp = z.maxHp = 1e6; z.speed = 0; z.dmg = 0; return z; });
      var c3t = 0, c4 = 0; for (var i = 0; i < 30 * 8; i++){ var a = t.cd3, b = h.cd4; visuals(1 / 30); if (t.cd3 > (a || 0)) c3t++; if (h.cd4 > (b || 0)) c4++; }
      o.coax = c3t > 5; o.hellfire = c4 >= 1;
      var a130 = __rts.rtsSpawnUnit('bomber', 0, -40), pr = a130.g.userData.props, r0 = pr[0].rotation.z; visuals(1 / 30); o.helices = pr.length === 4 && pr[0].rotation.z !== r0;
      return o;
    }, calme);
    fin();
    egal(r.listes, 'coax,he,apfsds,reactive|chaingun,hellfire,reactive,sensor', 'Améliorations du tank et de l’hélicoptère'); ok(r.achats, 'Achats');
    ok(r.coax, 'Mitrailleuse coaxiale du tank'); ok(r.hellfire, 'Missile Hellfire de l’hélicoptère'); ok(r.helices, 'Les 4 hélices de l’AC-130 tournent');
  });

  test('RTS : contrôler une tourelle (tir simple) et le mortier (rond jaune là où l’obus tombe)', () => {
    exiger(); reset();
    const r = J(function(c){
      eval(c); var R = calme(), o = {}; S.money = 1e6;
      R.units.forEach(function(u){ u.g.position.set(-30, 0, 20); u.hx = -30; u.hz = 20; u.U = Object.assign({}, u.U, { range:0 }); });
      var t = R.blds.filter(function(b){ return b.type === 't_mg'; })[0];
      R.bsel = t; __rts.rtsInfoShow(); var bt = document.querySelector('#rtInfo button[data-a="tpilot"]'); o.bouton = !!bt; bt.click();
      o.pil = R.pilot === t; visuals(1 / 30); o.cam = camera.position.y < 6;
      var z = __t.placer('walker', t.x, t.z - 14); z.hp = z.maxHp = 1e6; z.speed = 0; z.dmg = 0;
      R.pv.yaw = 0; R.pv.pitch = -.15; R.pv.fire = true; for (var i = 0; i < 30; i++) visuals(1 / 30); R.pv.fire = false;
      o.tir = z.hp < 1e6; o.tete = Math.abs(t.head.rotation.y - Math.PI) < .01;
      __rts.rtsUnpilot(); o.retour = !R.pilot;
      clearZombies(); R.blds.filter(function(b){ return b.type === 't_mg'; }).forEach(function(b){ __rts.rtsSell(b); });
      var m = __rts.rtsBuild('t_mortar', 0, -20); o.mortier = __rts.rtsTurretPilot(m); R.pv.yaw = 0; R.pv.pitch = -.35; visuals(1 / 30);
      var sp = R.mortSpot, ring = R.mortRing; o.rond = !!ring && ring.visible && Math.hypot(ring.position.x - sp.x, ring.position.z - sp.z) < .01;
      var dd = Math.hypot(sp.x - m.x, sp.z - m.z); o.portee = dd >= 8 - .01 && dd <= __rts.rtsTStat(m, 'range') + .01;
      var q = __t.placer('walker', sp.x, sp.z); q.hp = q.maxHp = 1e6; q.speed = 0; q.dmg = 0;
      m.cd = 0; R.pv.fire = true; visuals(1 / 30); R.pv.fire = false; o.vol = R.shells.length === 1 && q.hp === 1e6;
      for (var k = 0; k < 30 * 4; k++) visuals(1 / 30); o.boum = q.hp < 1e6;
      __rts.rtsUnpilot(); o.fin = !R.mortRing;
      return o;
    }, calme);
    fin();
    ok(r.bouton && r.pil && r.cam, 'Bouton Contrôler et vue de la tourelle'); ok(r.tir && r.tete, 'La tourelle tire où on vise et sa tête suit'); ok(r.retour, 'Retour à la carte');
    ok(r.mortier && r.rond && r.portee, 'Mortier : rond jaune là où l’obus tombera, dans sa portée'); ok(r.vol && r.boum, 'L’obus met un instant à tomber, puis explose'); ok(r.fin, 'Rond retiré au retour');
  });

  test('RTS : piloter une unité à la première personne (bouger, viser, tirer, revenir)', () => {
    exiger(); reset();
    const r = J(function(c){
      eval(c); var R = calme(), o = {}; S.money = 1e6;
      var u = R.units[0]; u.g.position.set(0, 0, -20); __rts.rtsSelect([u], false);
      o.pil = __rts.rtsPilotSel() && R.pilot === u; o.cache = !u.m.visible;
      visuals(1 / 30); o.cam = camera.position.distanceTo(new THREE.Vector3(u.g.position.x, camera.position.y, u.g.position.z)) < 1 && camera.position.y < 6;
      R.pv.yaw = 0; R.pv.pitch = -.15; var z0 = u.g.position.z; R.pv.mv.f = 1; for (var i = 0; i < 30; i++) visuals(1 / 30); R.pv.mv.f = 0;
      o.avance = u.g.position.z < z0 - 2;
      var z = __t.placer('walker', u.g.position.x, u.g.position.z - 14); z.hp = z.maxHp = 1e6; z.speed = 0;
      R.pv.fire = true; for (var k = 0; k < 30; k++) visuals(1 / 30); R.pv.fire = false;
      o.tir = z.hp < 1e6;
      var bt = document.getElementById('rtrpExit'); o.bouton = !!bt && !!bt.closest('#rtPilot'); bt.click(); visuals(1 / 30); o.retour = !R.pilot && u.m.visible && camera.position.y > 20;
      // Avec un groupe choisi, Piloter prend une unité du groupe ; au retour, plus rien n'est choisi
      __rts.rtsSelect(R.units.filter(function(x){ return !x.dead; }), false); o.groupe = __rts.rtsPilotSel() && R.sel.length === 1 && R.sel[0] === R.pilot;
      __rts.rtsUnpilot(); o.vide = R.sel.length === 0;
      // Changer d'onglet annule la pose d'un bâtiment
      __rts.rtsStartPlace('wall'); __rts.rtsTab('veh'); o.annule = !R.place; __rts.rtsTab('rob');
      // Un avion aussi
      var j = __rts.rtsSpawnUnit('jet', 0, -40); o.jet = __rts.rtsPilot(j); var p0 = j.g.position.clone(); visuals(1 / 30); o.jetAv = j.g.position.distanceTo(p0) > .5;
      return o;
    }, calme);
    fin();
    ok(r.pil && r.cache, 'Pilotage'); ok(r.cam, 'Caméra dans l’unité'); ok(r.avance, 'Il avance'); ok(r.tir, 'Il tire sur le zombie visé'); ok(r.bouton && r.retour, 'Bouton Retour à la carte');
    ok(r.groupe && r.vide, 'Piloter avec un groupe choisi'); ok(r.annule, 'Un onglet annule la pose');
    ok(r.jet && r.jetAv, 'On pilote aussi un avion (il avance toujours)');
  });

  test('RTS : construire et placer des bâtiments dans la zone de la base, vendre', () => {
    exiger(); reset();
    const r = J(function(c){
      eval(c); var R = calme(), o = {}; S.money = 5000;
      o.dehors = __rts.rtsBuild('t_cannon', 0, -60) === null;
      o.dessus = __rts.rtsBuild('t_cannon', 0, 0) === null;
      var m0 = S.money, t = __rts.rtsBuild('t_cannon', 0, -16); o.ok = !!t && m0 - S.money === __rts.RTS_BLD.t_cannon.cost;
      // Pose au pointeur : fantôme puis clic
      __rts.rtsStartPlace('wall'); o.fantome = !!R.place;
      o.grille = scene.children.some(function(c){ return c.isLineSegments && c.visible; });
      __rts.rtsGhostAt(-15.3, -6.4); o.cale = R.ghost.x === -16 && R.ghost.z === -6 && R.ghost.ok;
      __rts.rtsGhostAt(0, 0); o.rouge = R.ghost.ok === false && document.getElementById('rtOk').disabled;
      o.pose = __rts.rtsPlaceAt(-16.7, -5.2); var w = R.blds[R.blds.length - 1]; o.case = w.type === 'wall' && w.x === -16 && w.z === -6; o.fini = !R.place;
      o.grilleFin = !scene.children.some(function(c){ return c.isLineSegments && c.visible; });
      var m1 = S.money; o.vente = __rts.rtsSell(t) && S.money - m1 === Math.round(__rts.RTS_BLD.t_cannon.cost * .5);
      o.qg = __rts.rtsSell(R.base) === false;
      return o;
    }, calme);
    fin();
    ok(r.dehors, 'Refus hors de la base'); ok(r.dessus, 'Refus sur un autre bâtiment'); ok(r.ok, 'Construction payée');
    ok(r.fantome && r.pose && r.fini, 'Pose au pointeur'); ok(r.grille && r.grilleFin, 'Quadrillage affiché pendant la pose'); ok(r.cale && r.case, 'Le bâtiment se cale sur la grille de 2 m'); ok(r.rouge, 'Emprise rouge et bouton bloqué sur une case occupée'); ok(r.vente, 'Vente : moitié du prix'); ok(r.qg, 'Le QG ne se vend pas');
  });

  test('RTS : robots fabriqués dans les usines (usine lourde pour les gros), améliorations des robots', () => {
    exiger(); reset();
    const r = J(function(c){
      eval(c); var R = calme(), o = {}; S.money = 20000;
      o.sansUsine = __rts.rtsBuy('heavy') === null;
      var hf = __rts.rtsBuild('heavyfac', 20, 8); o.usine = !!hf;
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
      var sc = __rts.rtsBuild('scrap', -4, 14); o.sc = !!sc; var m0 = S.money; R.incT = .01;
      for (var j = 0; j < 30; j++) visuals(1 / 30); o.soin = u.hp > 10; o.revenu = S.money - m0;
      return o;
    }, calme);
    fin();
    ok(r.tir, 'La tourelle tire'); ok(r.up, 'Amélioration'); egal(r.max, 6, 'Niveau maximal');
    ok(r.chaine >= 2, 'Tesla : éclair sur plusieurs zombies (' + r.chaine + ')');
    ok(r.rep && r.sc, 'Atelier et récupérateur construits'); ok(r.soin, 'L’atelier répare'); ok(r.revenu >= 15, 'Le récupérateur rapporte : ' + r.revenu);
  });

  test('RTS : hordes du nord ; ils attaquent le bâtiment le plus proche ; la base s’agrandit à chaque nid ; fin de partie', () => {
    exiger(); reset();
    const r = J(function(c){
      eval(c); var R = calme(), o = {}; S.money = 1e6;
      R.units.forEach(function(u){ u.g.position.set(0, 0, 18); u.U = Object.assign({}, u.U, { range:0, dmg:0 }); });
      R.blds.filter(function(b){ return b.type === 't_mg'; }).forEach(function(b){ __rts.rtsSell(b); });
      // Horde : du bord du désert
      R.hordeT = 0; visuals(1 / 30); R.hordeT = 1e9;
      var zs = zombies.filter(function(z){ return !z.dead; }); o.horde = zs.length; o.bord = zs.every(function(z){ return z.g.position.z < -150; }); var hx = zs.map(function(z){ return z.g.position.x; }); o.large = Math.max.apply(null, hx) - Math.min.apply(null, hx) > 60; o.route = zs.filter(function(z){ return z.useRoad; }).length; o.droit = zs.filter(function(z){ return !z.useRoad; }).length;
      clearZombies();
      // Une barricade entre le zombie et le QG : il l'attaque d'abord
      var w = __rts.rtsBuild('wall', 0, -16); var z = __t.placer('walker', 0, -26); var h0 = w.hp, q0 = R.base.hp;
      for (var i = 0; i < 30 * 8; i++) visuals(1 / 30); o.mur = w.hp < h0; o.qgIntact = R.base.hp === q0;
      clearZombies();
      // La base s'agrandit
      var r0 = R.baseR; o.avant = __rts.rtsBldOk('t_mg', 0, -34) !== '';
      __rts.rtsNestDie(R.nests[0]); o.plus = R.baseR > r0; o.apres = __rts.rtsBldOk('t_mg', 0, -34) === '';
      // Sans fin : il reste toujours 6 nids actifs, chaque nouveau plus loin au nord et plus solide
      var f0 = __rts.rtsFront(), hp0 = Math.max.apply(null, R.nests.map(function(n){ return n.maxHp; }));
      for (var k = 0; k < 12; k++) __rts.rtsNestDie(R.nests.filter(function(n){ return !n.dead; })[0]);
      o.fin = state; o.actifs = R.nests.filter(function(n){ return !n.dead; }).length; o.loin = __rts.rtsFront() < f0 - 300;
      o.fort = R.nests[R.nests.length - 1].maxHp > hp0; o.carte = R.zMin < __rts.rtsFront();
      o.max = plan.maxAlive;
      return o;
    }, calme);
    fin();
    ok(r.horde >= 10 && r.bord, 'Horde du nord : ' + r.horde); ok(r.large, 'La horde arrive sur toute la largeur du secteur de 90°'); ok(r.droit >= 2 && r.route < r.horde * .75, 'Une bonne part coupent tout droit (' + r.droit + ') au lieu de suivre la route (' + r.route + ')');
    ok(r.mur && r.qgIntact, 'Le zombie attaque la barricade d’abord');
    ok(r.avant && r.plus && r.apres, 'La base s’agrandit : on peut construire plus loin');
    egal(r.fin, 'rts', 'La partie continue'); egal(r.actifs, 6, 'Toujours 6 nids actifs');
    ok(r.loin && r.carte, 'Les nouveaux nids sont plus loin au nord et la carte s’allonge'); ok(r.fort, 'Les nouveaux nids sont plus solides');
    ok(r.max === 500 || r.max === 300, 'Plafond de zombies sur la carte : ' + r.max);
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
