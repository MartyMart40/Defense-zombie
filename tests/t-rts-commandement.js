'use strict';
/* Tests du commandement du RTS (js/49-rts-commandement.js) : mini-carte, ralliement, alerte, tenir la position, mode photo */
(function(){
  if (typeof test !== 'function' || typeof TESTS === 'undefined') return;
  const exiger = () => { if (lire('typeof __rtsCmd === "object" && typeof __rtsCmd.rtsHold === "function"') !== true) ignorer('Commandement du RTS absent (js/49-rts-commandement.js)'); };
  const calme = 'function calme(){ __rts.rtsStart(); var R = __rts.RTS; R.nests.forEach(function(n){ n.spawnT = 1e9; }); R.hordeT = 1e9; clearZombies(); return R; }';
  const fin = () => J(function(){ if (__rts.RTS.on){ __rtsCmd.rtsPhoto(false); __rts.rtsQuit(); } });

  test('RTS commandement : la mini-carte se dessine et la toucher déplace la caméra', () => {
    exiger(); reset();
    const r = J(new Function(calme + `
      var R = calme(), C = __rtsCmd, o = {};
      for (var i = 0; i < 6; i++) visuals(1 / 30);
      var m = document.getElementById('rtMini'); o.visible = !m.classList.contains('hide'); o.taille = m.width > 0;
      var a = C.rtsMiniXY(0, 0), w = C.rtsMiniWorld(a[0], a[1]); o.allerRetour = Math.abs(w.x) < .01 && Math.abs(w.z) < .01;
      var b = m.getBoundingClientRect(), nid = R.nests[0], q = C.rtsMiniXY(nid.x, nid.z);
      C.rtsMiniGo(b.left + q[0] / C.RTS_MINI.w * b.width, b.top + q[1] / C.RTS_MINI.h * b.height);
      o.camera = Math.hypot(R.cam.x - nid.x, R.cam.z - nid.z) < 3;
      o.coins = C.rtsViewCorners().length === 4;
      return o;
    `));
    fin();
    ok(r.visible && r.taille, 'Mini-carte visible'); ok(r.allerRetour, 'Conversion carte et monde');
    ok(r.camera, 'Toucher la mini-carte amène la caméra au nid'); ok(r.coins, 'Zone vue par la caméra');
  });

  test('RTS commandement : les unités achetées vont au point de ralliement (pas les avions)', () => {
    exiger(); reset();
    const r = J(new Function(calme + `
      var R = calme(), C = __rtsCmd, o = {};
      for (var f = 0; f < 3; f++) visuals(1 / 30); // la caméra du RTS se place
      C.rtsRallyToggle(); o.attend = R.rallyPick === true;
      __rts.rtsTap(innerWidth / 2, innerHeight / 2, false); o.place = !!R.rally && R.rallyPick === false;
      C.rtsRallySet(20, -20); S.money = 99999; var u = __rts.rtsBuy('gunner');
      o.va = Math.hypot(u.tx - 20, u.tz + 20) < 5 && u.cmd === 'move';
      for (var i = 0; i < 30 * 12; i++) visuals(1 / 30);
      o.arrive = Math.hypot(u.g.position.x - 20, u.g.position.z + 20) < 6;
      __rts.rtsBuild('airfield', -18, 14, 0); var a = __rts.rtsBuy('jet'); o.avion = !a || !C.rtsRallyApply(a);
      __rtsSave.rtsSave(); var d = __rtsSave.rtsSaveGet(); o.sauve = !!d.rally && d.rally.x === 20;
      C.rtsRallyToggle(); o.enleve = R.rally === null;
      return o;
    `));
    fin();
    ok(r.attend, 'Le bouton attend un toucher sur la carte'); ok(r.place, 'Toucher la carte place le point');
    ok(r.va, 'Une unité achetée part vers le point'); ok(r.arrive, 'Elle y arrive');
    ok(r.avion, 'Les avions ne vont pas au point'); ok(r.sauve, 'Le point est dans la sauvegarde'); ok(r.enleve, 'Retoucher le bouton l’enlève');
  });

  test('RTS commandement : « Tenir » empêche de poursuivre un zombie, sinon l’unité y va', () => {
    exiger(); reset();
    const r = J(new Function(calme + `
      var R = calme(), C = __rtsCmd, o = {};
      function essai(tenir){
        clearZombies(); var u = R.units[0]; u.hold = false; u.g.position.set(0, 0, -20); u.hx = u.tx = 0; u.hz = u.tz = -20; u.cmd = 'idle'; u.nest = null;
        __rts.rtsSelect([u], false); if (tenir) C.rtsHold();
        var z = __t.placer('walker', 0, -42); z.speed = 0; z.hp = z.maxHp = 1e6;
        for (var i = 0; i < 30 * 4; i++) visuals(1 / 30);
        var d = Math.hypot(u.g.position.x, u.g.position.z + 20); if (tenir) C.rtsHold(); return d;
      }
      o.libre = essai(false); o.tient = essai(true);
      __rts.rtsSelect([R.units[1]], false); C.rtsHold(); o.btn = document.getElementById('rtHold') && (C.rtsCmdBtns(), document.getElementById('rtHold').classList.contains('on'));
      __rtsSave.rtsSave(); o.sauve = __rtsSave.rtsSaveGet().units.some(function(u){ return u.ho === 1; });
      return o;
    `));
    fin();
    ok(r.libre > 2, 'Sans Tenir, l’unité va vers le zombie : ' + r.libre.toFixed(1) + ' m');
    ok(r.tient < 1, 'Avec Tenir, elle reste à son poste : ' + r.tient.toFixed(1) + ' m');
    ok(r.btn, 'Bouton Tenir allumé'); ok(r.sauve, 'Tenir est gardé dans la sauvegarde');
  });

  test('RTS commandement : alerte quand un bâtiment hors de l’écran est attaqué', () => {
    exiger(); reset();
    const r = J(new Function(calme + `
      var R = calme(), C = __rtsCmd, o = {};
      for (var i = 0; i < 3; i++) visuals(1 / 30);
      var t = R.blds.filter(function(b){ return b.type === 't_mg'; })[0];
      R.cam.x = 0; R.cam.z = -250; for (var j = 0; j < 3; j++) visuals(1 / 30);
      C.RTS_AL.cd = 0; C.rtsAlertCheck(0); t.hp -= 30; var a = C.rtsAlertCheck(.1);
      var el = document.getElementById('rtAlert'); o.alerte = a === t && !el.classList.contains('hide') && /Base attaquée/.test(el.textContent);
      el.click(); o.camera = Math.hypot(R.cam.x - t.x, R.cam.z - t.z) < .1;
      for (var k = 0; k < 3; k++) visuals(1 / 30);
      C.RTS_AL.cd = 0; t.hp -= 30; o.visibleRien = C.rtsAlertCheck(.1) === null;
      return o;
    `));
    fin();
    ok(r.alerte, 'Alerte affichée'); ok(r.camera, 'Toucher l’alerte amène la caméra'); ok(r.visibleRien, 'Pas d’alerte quand le bâtiment est à l’écran');
  });

  test('RTS commandement : le mode photo fige le jeu, cache les menus et donne une image', () => {
    exiger(); reset();
    const r = J(new Function(calme + `
      var R = calme(), C = __rtsCmd, o = {};
      __rts.rtsPause(); var b = document.getElementById('rtPhotoGo'); o.btn = !!b; b.click();
      o.photo = R.photo && R.paused && getComputedStyle(document.getElementById('rtsUI')).display === 'none' && !document.getElementById('rtPhoto').classList.contains('hide');
      var t0 = R.t; for (var i = 0; i < 10; i++) visuals(1 / 30); o.fige = R.t === t0;
      var url = C.rtsPhotoData(); o.image = typeof url === 'string' && url.indexOf('data:image/png') === 0;
      document.getElementById('rtPhotoOut').click(); o.sortie = !R.photo && !R.paused && document.getElementById('rtPhoto').classList.contains('hide');
      return o;
    `));
    fin();
    ok(r.btn, 'Bouton Mode photo dans la pause'); ok(r.photo, 'Mode photo : jeu figé et menus cachés');
    ok(r.fige, 'Le temps du jeu ne bouge plus'); ok(r.image, 'Image PNG'); ok(r.sortie, 'Quitter le mode photo relance le jeu');
  });
})();
