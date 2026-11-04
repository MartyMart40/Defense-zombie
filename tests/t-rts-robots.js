'use strict';
/* Tests : jambes des petits robots et postes de pilotage des robots (js/41-rts.js rtsLegGeo, js/56-rts-postes-robots.js) */
(function(){
  if (typeof test !== 'function' || typeof TESTS === 'undefined') return;
  const exiger = () => { if (lire('typeof __rtsPostesRobots === "object"') !== true) ignorer('Postes des robots absents (js/56-rts-postes-robots.js)'); };
  const calme = 'function calme(){ __rts.rtsStart(); var R = __rts.RTS; R.nests.forEach(function(n){ n.spawnT = 1e9; }); R.hordeT = 1e9; clearZombies(); S.money = 1e8; return R; }';
  const fin = () => J(function(){ if (__rts.RTS.pilot) __rts.rtsUnpilot(); if (__rts.RTS.on) __rts.rtsQuit(); });

  test('RTS robots : les jambes font des pas quand le robot marche, droites à l’arrêt', () => {
    exiger(); reset();
    const r = J(new Function(calme + `
      var R = calme(), o = {};
      var u = __rts.rtsSpawnUnit('rifle', 0, -10); o.jambes = !!u.legs && u.legs.length === 2;
      u.tx = u.hx = 0; u.tz = u.hz = -40; u.cmd = 'move';
      var mx = 0, oppose = false; for (var i = 0; i < 30; i++){ visuals(1 / 30); mx = Math.max(mx, Math.abs(u.legs[0].rotation.x)); if (u.legs[0].rotation.x * u.legs[1].rotation.x < -.01) oppose = true; }
      o.pas = mx > .2; o.oppose = oppose;
      u.cmd = 'idle'; u.tx = u.hx = u.g.position.x; u.tz = u.hz = u.g.position.z; for (var k = 0; k < 40; k++) visuals(1 / 30);
      o.droites = Math.abs(u.legs[0].rotation.x) < .05;
      var h = __rts.rtsSpawnUnit('heavy', 5, -10); o.lourd = !!h.legs; var t = __rts.rtsSpawnUnit('tank', 10, -10); o.tank = !t.legs;
      __rts.rtsPilot(u); o.cache = !u.legs[0].visible; __rts.rtsUnpilot(); o.remis = u.legs[0].visible;
      return o;
    `));
    fin();
    ok(r.jambes, 'Deux jambes'); ok(r.pas, 'Les jambes bougent en marchant'); ok(r.oppose, 'Une jambe devant, l’autre derrière');
    ok(r.droites, 'Droites à l’arrêt'); ok(r.lourd && r.tank, 'Le Mech lourd a des jambes, pas le tank');
    ok(r.cache && r.remis, 'Cachées pendant le pilotage, remises au retour');
  });

  test('RTS robots : chaque robot a son poste, son arme, et des détails avec les améliorations', () => {
    exiger(); reset();
    const r = J(new Function(calme + `
      var R = calme(), P = __rtsPostes, N = __rtsNiveaux, o = { postes:[] };
      ['rifle', 'gunner', 'sniper', 'flamebot', 'rocket', 'heavy'].forEach(function(t, i){
        var u = __rts.rtsSpawnUnit(t, i * 3, -10); __rts.rtsPilot(u); visuals(1 / 30);
        if (P.PT.cur === 'rob_' + t && P.PT.g['rob_' + t].visible) o.postes.push(t);
        __rts.rtsUnpilot();
      });
      var u = __rts.rtsSpawnUnit('gunner', 0, -10); __rts.rtsPilot(u); visuals(1 / 30);
      o.det0 = N.PTD.rob_gunner.filter(function(g){ return g.visible; }).length;
      u.cd = 0; R.pv.fire = true; for (var i = 0; i < 10; i++) visuals(1 / 30); R.pv.fire = false;
      o.tourne = P.PT.rob.gunner.spin.rotation.z !== 0;
      var m = P.rtsPosteMuzzle(u, 'w1'), v = m.clone().project(camera), w = new THREE.Vector3(); P.PT.rob.gunner.flash.getWorldPosition(w); w.project(vmCam);
      o.bout = Math.hypot(v.x - w.x, v.y - w.y) < .02;
      ['arm', 'rate'].forEach(function(k){ for (var j = 0; j < 6; j++) __rts.rtsUpgBuy('gunner', k); }); for (var q = 0; q < 8; q++) visuals(1 / 30);
      o.det1 = N.PTD.rob_gunner.filter(function(g){ return g.visible; }).length;
      o.hud = /ARME 100 %/.test(document.getElementById('rtrpHud').textContent);
      __rts.rtsUnpilot();
      return o;
    `));
    fin();
    egal(r.postes.join(','), 'rifle,gunner,sniper,flamebot,rocket,heavy', 'Un poste par robot');
    egal(r.det0, 0, 'Robot de base : simple'); egal(r.det1, 3, 'Au maximum : 3 paliers de détails');
    ok(r.tourne, 'Les 4 canons du mitrailleur tournent'); ok(r.bout, 'Le tir part du bout de l’arme'); ok(r.hud, 'Viseur : niveau de l’arme');
  });
})();
