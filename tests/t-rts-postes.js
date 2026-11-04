'use strict';
/* Tests des postes de pilotage et des munitions des avions (js/54-rts-postes.js) */
(function(){
  if (typeof test !== 'function' || typeof TESTS === 'undefined') return;
  const exiger = () => { if (lire('typeof __rtsPostes === "object"') !== true) ignorer('Postes de pilotage absents (js/54-rts-postes.js)'); };
  const calme = 'function calme(){ __rts.rtsStart(); var R = __rts.RTS; R.nests.forEach(function(n){ n.spawnT = 1e9; }); R.hordeT = 1e9; clearZombies(); R.baseR = 70; S.money = 1e7; return R; }';
  const fin = () => J(function(){ if (__rts.RTS.pilot) __rts.rtsUnpilot(); if (__rts.RTS.on) __rts.rtsQuit(); });

  test('RTS postes : armes réalistes (tank lent et fort, Apache, chasseur, 105 mm)', () => {
    exiger();
    const r = J(function(){ var U = __rts.RTS_UNITS; return { tank: U.tank.rate <= .4 && U.tank.dmg >= 500, apache: U.heli.name === 'Apache', jet: U.jet.rate >= 8 && !U.jet.splash, ac: U.bomber.w2.dmg >= 1000 && U.bomber.w2.big === true, cap: __rtsPostes.RTS_AIR_CAP }; });
    ok(r.tank, 'Tank : un obus lent mais fort'); ok(r.apache, 'L’hélicoptère est un Apache'); ok(r.jet, 'Chasseur : canon rapide');
    ok(r.ac, 'AC-130 : 105 mm plus fort, grosse explosion'); egal(r.cap, 2, 'Avions par aérodrome');
  });

  test('RTS postes : 2 avions par aérodrome', () => {
    exiger(); reset();
    const r = J(new Function(calme + `
      var R = calme(), o = {};
      __rts.rtsBuild('airfield', 25, -25, 0);
      o.a = !!__rts.rtsBuy('jet'); o.b = !!__rts.rtsBuy('warthog'); o.refus = __rts.rtsBuy('bomber') === null;
      __rts.rtsBuild('airfield', -28, -22, 0); o.ok = !!__rts.rtsBuy('bomber');
      return o;
    `));
    fin();
    ok(r.a && r.b, 'Deux avions avec un aérodrome'); ok(r.refus, 'Le troisième est refusé'); ok(r.ok, 'Avec un 2e aérodrome, c’est bon');
  });

  test('RTS postes : à sec, l’avion retourne refaire le plein à l’aérodrome', () => {
    exiger(); reset();
    const r = J(new Function(calme + `
      var R = calme(), P = __rtsPostes, o = {};
      var af = __rts.rtsBuild('airfield', 25, -25, 0);
      var j = __rts.rtsSpawnUnit('jet', 0, -80); P.rtsAmmoInit(j); j.ammo.w1 = 2;
      var z = __t.placer('walker', 0, -100); z.hp = z.maxHp = 1e6; z.speed = 0;
      for (var i = 0; i < 30 * 6 && !j.rearm; i++) visuals(1 / 30);
      o.vide = j.ammo.w1 === 0 && j.rearm === true;
      var d0 = Math.hypot(j.g.position.x - af.x, j.g.position.z - af.z);
      for (var k = 0; k < 30 * 25 && j.rearm; k++) visuals(1 / 30);
      o.plein = !j.rearm && j.ammo.w1 === P.RTS_AMMO.jet.w1;
      return o;
    `));
    fin();
    ok(r.vide, 'Le chasseur vide son canon puis part refaire le plein'); ok(r.plein, 'Il revient plein');
  });

  test('RTS postes : tank (canon qui recule), Apache (canon rotatif, Hellfire), AC-130 (3 postes)', () => {
    exiger(); reset();
    const r = J(new Function(calme + `
      var R = calme(), P = __rtsPostes, o = {};
      var t = __rts.rtsSpawnUnit('tank', 0, -20); __rts.rtsPilot(t); visuals(1 / 30);
      o.tank = P.PT.cur === 'tank' && P.PT.g.tank.visible;
      t.cd = 0; R.pv.fire = true; visuals(1 / 30); R.pv.fire = false; o.recul = P.PT.canon.position.z > .1; /* arme de base : petit recul, il grossit avec les améliorations (t-rts-niveaux.js) */ o.lent = t.cd > 2; o.cdv = t.cd;
      __rts.rtsUnpilot(); o.cache = !P.PT.g.tank.visible;
      var h = __rts.rtsSpawnUnit('heli', 10, -30); __rts.rtsPilot(h); visuals(1 / 30);
      o.heli = P.PT.cur === 'heli' && document.getElementById('rtPilot').classList.contains('casque');
      R.pv.fire = true; var r0 = P.PT.heliBar.rotation.z; for (var i = 0; i < 20; i++) visuals(1 / 30); R.pv.fire = false; o.tourne = P.PT.heliBar.rotation.z !== r0;
      h.cd4 = 0; R.pv.fire2 = true; visuals(1 / 30); R.pv.fire2 = false; o.hellfire = h.cd4 > 1 && P.PT.mis.some(function(m){ return !m.visible; });
      __rts.rtsUnpilot();
      var a = __rts.rtsSpawnUnit('bomber', 0, -40); __rts.rtsPilot(a); visuals(1 / 30);
      o.ac40 = P.PT.cur === 'ac40' && camera.fov === 38;
      a.cd2 = 0; R.pv.fire2 = true; visuals(1 / 30); R.pv.fire2 = false; visuals(1 / 30);
      o.ac105 = P.PT.cur === 'ac105' && camera.fov === 26 && canvas.classList.contains('rt-ac105');
      document.dispatchEvent(new KeyboardEvent('keydown', { code:'KeyV', bubbles:true })); visuals(1 / 30);
      o.ck = P.PT.cur === 'acCk' && camera.fov === 62 && !canvas.classList.contains('rt-ac');
      a.cd = 0; R.pv.fire = true; visuals(1 / 30); R.pv.fire = false; o.retour40 = P.PT.cur === 'ac40';
      o.hud = /40 MM/.test(document.getElementById('rtrpHud').textContent);
      __rts.rtsUnpilot(); o.fin = !Object.keys(P.PT.g).some(function(k){ return P.PT.g[k].visible; }) && camera.fov !== 38;
      return o;
    `));
    fin();
    ok(r.tank, 'Poste du tank'); ok(r.recul, 'Le canon recule au tir'); ok(r.lent, 'Le tank recharge lentement : ' + r.cdv); ok(r.cache, 'Poste caché au retour');
    ok(r.heli, 'Vue du casque de l’Apache'); ok(r.tourne, 'Le canon rotatif tourne quand il tire'); ok(r.hellfire, 'Hellfire tiré : un missile disparaît de l’aile');
    ok(r.ac40, 'AC-130 : poste du 40 mm'); ok(r.ac105, 'Tirer le 105 mm amène à son poste (thermique blanc chaud)');
    ok(r.ck, 'Touche V : cockpit'); ok(r.retour40, 'Tirer le 40 mm ramène à son poste'); ok(r.hud, 'Viseur : munitions'); ok(r.fin, 'Tout est rangé au retour');
  });

  test('RTS postes : l’obus de 105 mm fait une grosse explosion', () => {
    exiger(); reset();
    const r = J(new Function(calme + `
      var R = calme(), a = __rts.rtsSpawnUnit('bomber', 0, -40);
      var z1 = __t.placer('walker', 0, -60), z2 = __t.placer('walker', 9.5, -60); [z1, z2].forEach(function(z){ z.hp = z.maxHp = 1e6; z.speed = 0; });
      var b = { big:true, dmg:1100, splash:11, snd:'rocket' };
      var sh0 = shake; rtsHit(new THREE.Vector3(0, 30, -40), { x:0, z:-60 }, 'pt', b);
      return { centre: 1e6 - z1.hp, loin: 1e6 - z2.hp, secousse: shake > .3 };
    `));
    fin();
    ok(r.centre >= 1000, 'Au centre : ' + Math.round(r.centre)); ok(r.loin > 0, 'À 9,5 m : touché aussi (' + Math.round(r.loin) + ')'); ok(r.secousse, 'L’écran tremble');
  });
  test('RTS postes : AC-130, canons du flanc gauche, visée fixée au sol dans un champ qui suit l’avion', () => {
    exiger(); reset();
    const r = J(new Function(calme + `
      var R = calme(), P = __rtsPostes, o = {};
      var a = __rts.rtsSpawnUnit('bomber', 0, -40); __rts.rtsPilot(a);
      for (var i = 0; i < 30 * 8; i++) visuals(1 / 30); // il entre dans son virage
      var L = P.rtsAcLeft(a), gp = a.g.position, C = R.acC, dx = C.x - gp.x, dz = C.z - gp.z;
      o.centre = (dx * L[0] + dz * L[1]) / Math.hypot(dx, dz) > .5;
      var b0 = Math.atan2(-P.rtsAcLeft(a)[0], -P.rtsAcLeft(a)[1]); R.pv.yaw = b0; visuals(1 / 30); // au milieu du champ
      var y0 = R.pv.yaw; for (var k = 0; k < 6; k++) visuals(1 / 30); o.fixe = Math.abs(Math.atan2(Math.sin(R.pv.yaw - y0), Math.cos(R.pv.yaw - y0))) < .05;
      R.pv.yaw += 3; visuals(1 / 30); var b = Math.atan2(-P.rtsAcLeft(a)[0], -P.rtsAcLeft(a)[1]);
      o.bord = Math.abs(Math.atan2(Math.sin(R.pv.yaw - b), Math.cos(R.pv.yaw - b))) <= P.AC_CONE.yaw + 1e-6;
      R.pv.pitch = 1; visuals(1 / 30); o.haut = R.pv.pitch <= P.AC_CONE.pMax + 1e-6;
      o.droite = !P.rtsAcFlanc(a, gp.x - L[0] * 30, gp.z - L[1] * 30) && P.rtsAcFlanc(a, gp.x + L[0] * 30, gp.z + L[1] * 30);
      // le tir part du bout du 40 mm : même place à l'écran
      var m = P.rtsPosteMuzzle(a, 'w1'), v = m.clone().project(camera), w = new THREE.Vector3(); P.PT.f40.getWorldPosition(w); w.project(vmCam);
      o.bout = Math.hypot(v.x - w.x, v.y - w.y) < .02 && m.distanceTo(camera.position) > 2.5;
      __rts.rtsUnpilot();
      return o;
    `));
    fin();
    ok(r.centre, 'Le flanc gauche regarde le centre du virage'); ok(r.fixe, 'La visée reste au sol quand l’avion tourne');
    ok(r.bord, 'La visée ne dépasse pas le bord du champ'); ok(r.haut, 'Ni trop haut'); ok(r.droite, 'Rien du côté droit');
    ok(r.bout, 'Le tir part du bout du canon de 40 mm');
  });

  test('RTS postes : canon rotatif de l’Apache (régime, cadence) et tirs qui partent du canon', () => {
    exiger(); reset();
    const r = J(new Function(calme + `
      var R = calme(), P = __rtsPostes, o = {};
      var h = __rts.rtsSpawnUnit('heli', 0, -30); __rts.rtsPilot(h); visuals(1 / 30);
      var z = __t.placer('walker', 0, -60); z.hp = z.maxHp = 1e6; z.speed = 0;
      var n = 0, c0; R.pv.fire = true;
      for (var i = 0; i < 60; i++){ c0 = h.cd3; visuals(1 / 30); if (h.cd3 > (c0 || 0)) n++; }
      R.pv.fire = false; o.regime = P.PT.spin > .9; o.cadence = n; o.vibre = shake > .05;
      var m = P.rtsPosteMuzzle(h, 'gat'), v = m.clone().project(camera), w = new THREE.Vector3(); P.PT.fHeli.getWorldPosition(w); w.project(vmCam);
      o.bout = Math.hypot(v.x - w.x, v.y - w.y) < .02;
      var t = __rts.rtsSpawnUnit('tank', 10, -20); __rts.rtsPilot(t); visuals(1 / 30);
      var m2 = P.rtsPosteMuzzle(t, 'w1'), v2 = m2.clone().project(camera), w2 = new THREE.Vector3(); P.PT.fTank.getWorldPosition(w2); w2.project(vmCam);
      o.tank = Math.hypot(v2.x - w2.x, v2.y - w2.y) < .02;
      __rts.rtsUnpilot();
      return o;
    `));
    fin();
    ok(r.regime, 'Le canon monte en régime'); ok(r.cadence >= 30, 'Rafale dense : ' + r.cadence + ' tirs en 2 s'); ok(r.vibre, 'L’écran vibre');
    ok(r.bout, 'Les obus partent du canon rotatif'); ok(r.tank, 'L’obus du tank part du bout du canon');
  });
})();
