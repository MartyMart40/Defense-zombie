'use strict';
/* =====================================================================
   Tests du ciel et de la météo du toit (dossier 127, js/81-ciel.js : CIEL_REGL, __ciel)
   Visuel seulement : même hasard, même brume, mêmes lumières, au plus 4 appels de dessin de plus par météo.
   À charger APRÈS tests.js dans tests/index.html (avant t-journal.js).
   ===================================================================== */
(function(){
  if (typeof test !== 'function' || typeof TESTS === 'undefined') return;
  const exiger = () => { if (lire('typeof CIEL_REGL === "object" && typeof __ciel === "object" && typeof __amb === "object"') !== true) ignorer('Ciel absent (81-ciel.js)'); };
  const METEOS = () => J('Object.keys(WEATHERS)');
  const prep = function(){
    window.__cielPrep = function(){
      if (typeof styleSet === 'function') styleSet('actuel');
      if (typeof gfxSet === 'function' && typeof GFX === 'object' && GFX.pref === 'bas') gfxSet('auto');
    };
  };

  test('Ciel : le dôme remplace les nuages en sprites sur le toit (Actuel), caché en Haute définition', () => {
    exiger(); reset(); J(prep); J('__cielPrep()'); J('startLocation(0)');
    const r = J(function(){
      var on0 = CIEL_REGL.on; CIEL_REGL.on = true;
      __amb.set('clair'); state = 'paused'; visuals(1 / 30);
      var dome = __ciel.cielDome.visible, sprites = gfxClouds.some(function(s){ return s.visible; });
      var hd = null;
      if (typeof styleSet === 'function'){ styleSet('hd'); visuals(1 / 30); hd = __ciel.cielDome.visible; styleSet('actuel'); }
      CIEL_REGL.on = false; visuals(1 / 30);
      var coupe = __ciel.cielDome.visible, spritesCoupe = gfxClouds.some(function(s){ return s.visible; });
      CIEL_REGL.on = on0; state = 'test';
      return { dome: dome, sprites: sprites, hd: hd, coupe: coupe, spritesCoupe: spritesCoupe, nuages: gfxQ().clouds };
    });
    ok(r.dome, 'Le dôme du ciel devrait être visible sur le toit en Actuel');
    ok(!r.sprites, 'Les nuages en sprites de js/36 devraient être cachés sous le dôme');
    if (r.hd !== null) ok(!r.hd, 'Le dôme devrait être caché en Haute définition');
    ok(!r.coupe, 'CIEL_REGL.on = false devrait cacher le dôme');
    if (r.nuages > 0) ok(r.spritesCoupe, 'Sans le dôme, les nuages en sprites devraient revenir');
  });

  test('Ciel : aucun tirage de plus dans Math.random (startLocation et 300 images, chaque météo)', () => {
    exiger(); reset(); J(prep); J('__cielPrep()');
    const ms = METEOS(), diff = [];
    J(function(){
      // État des particules et des minuteries remis pareil avant chaque tour (sinon le tour d'avant décale le hasard)
      window.__cielSnap = function(){
        return { r: ambRain ? [ambRain.pos.slice(), ambRain.spd.slice()] : null, f: ambFlakes ? [ambFlakes.pos.slice(), ambFlakes.spd.slice(), ambFlakes.ph.slice(), ambFlakes.kind] : null,
          t: time, sm: gfxSmoke.map(function(o){ return [o.s.visible, o.life]; }), em: gfxEmbers.map(function(o){ return [o.s.visible, o.life]; }) };
      };
      window.__cielRemet = function(o){
        if (o.r && ambRain){ ambRain.pos.set(o.r[0]); ambRain.spd.set(o.r[1]); }
        if (o.f && ambFlakes){ ambFlakes.pos.set(o.f[0]); ambFlakes.spd.set(o.f[1]); ambFlakes.ph.set(o.f[2]); ambFlakes.kind = o.f[3]; }
        gfxSmoke.forEach(function(x, i){ x.s.visible = o.sm[i][0]; x.life = o.sm[i][1]; });
        gfxEmbers.forEach(function(x, i){ x.s.visible = o.em[i][0]; x.life = o.em[i][1]; });
        GFX.fireT = 0; gfxEmberT = 0; gfxSmokeNext = 0; gfxEmberI = 0; time = o.t;
      };
    });
    ms.forEach(m => {
      const r = J(function(m){
        var snap = null, snd0 = Snd.on;
        function tour(on){
          if (snap) __cielRemet(snap);
          var R0 = Math.random, s = 4321, n = 0, par = [], on0 = CIEL_REGL.on, n0 = 0;
          Math.random = function(){ n++; s = s * 16807 % 2147483647; return (s - 1) / 2147483646; };
          CIEL_REGL.on = on; Snd.on = false; // le son suit l'horloge réelle : coupé pour la mesure
          try {
            startLocation(1); __amb.set(m); state = 'playing'; plan.queue = []; spawnT = 1e9; par.push(n);
            for (var k = 0; k < 300; k++){ n0 = n; visuals(1 / 30); if (k % 60 === 0) renderer.render(scene, camera); par.push(n - n0); }
            if (m === 'orage'){ __amb.strike(); for (var j = 0; j < 20; j++) visuals(1 / 30); renderer.render(scene, camera); par.push(n); }
          } finally { Math.random = R0; CIEL_REGL.on = on0; state = 'test'; }
          var etat = 0;
          if (ambRain) for (var i = 0; i < ambRain.pos.length; i += 7) etat += ambRain.pos[i];
          if (ambFlakes) for (var q = 0; q < ambFlakes.pos.length; q += 5) etat += ambFlakes.pos[q];
          return n + ' ' + par.join(',') + ' ' + etat.toFixed(3);
        }
        tour(false); tour(true); snap = __cielSnap(); // premier passage : sons et particules créés une fois
        var res = { sans: tour(false), avec: tour(true), sans2: tour(false) };
        // cielImage seul : jamais un tirage
        __amb.set(m);
        var R0 = Math.random, direct = 0; Math.random = function(){ direct++; return R0(); };
        var on0 = CIEL_REGL.on; CIEL_REGL.on = true;
        try { for (var k = 0; k < 60; k++) __ciel.cielImage(1 / 30); if (m === 'orage'){ __amb.AMB.strikes++; __ciel.cielImage(1 / 30); } }
        finally { Math.random = R0; CIEL_REGL.on = on0; Snd.on = snd0; }
        res.direct = direct;
        return res;
      }, m);
      if (r.sans !== r.sans2) diff.push(m + ' (mesure instable)');
      else if (r.sans !== r.avec) diff.push(m + ' (' + r.sans.slice(0, 40) + ' / ' + r.avec.slice(0, 40) + ')');
      if (r.direct) diff.push(m + ' (cielImage : ' + r.direct + ' tirages)');
    });
    egal(diff.join(', '), '', 'Météos où la suite des tirages change avec le ciel');
  });

  test('Ciel : brume et lumières de la météo inchangées', () => {
    exiger(); reset(); J(prep); J('__cielPrep()'); J('startLocation(0)');
    const r = J(function(ms){
      var out = [], on0 = CIEL_REGL.on;
      ms.forEach(function(m){
        var v = [];
        [false, true].forEach(function(on){
          CIEL_REGL.on = on; __amb.set(m); state = 'paused';
          for (var k = 0; k < 5; k++) visuals(1 / 30);
          var B = __amb.AMB.base;
          v.push([scene.fog.near, scene.fog.far, scene.fog.color.getHex(), B.hemi ? B.hemi.o.intensity : 0, B.sun ? B.sun.o.intensity : 0].join('|'));
        });
        if (v[0] !== v[1]) out.push(m + ' ' + v[0] + ' / ' + v[1]);
      });
      CIEL_REGL.on = on0; state = 'test';
      return out.join(', ');
    }, METEOS());
    egal(r, '', 'Brume ou lumières changées par le ciel');
  });

  test('Ciel : au plus 4 appels de dessin de plus par météo', () => {
    exiger(); reset(); J(prep); J('__cielPrep()'); J('startLocation(0)');
    const r = J(function(ms){
      var out = [], pire = -99, on0 = CIEL_REGL.on, info = renderer.info;
      ms.forEach(function(m){
        var c = [];
        [false, true].forEach(function(on){
          CIEL_REGL.on = on; __amb.set(m); state = 'paused'; __amb.AMB.flash = 0;
          visuals(1 / 30); camera.rotation.set(.2, 0, 0); camera.updateMatrixWorld();
          info.autoReset = false; info.reset(); renderer.render(scene, camera); c.push(info.render.calls); info.autoReset = true;
        });
        pire = Math.max(pire, c[1] - c[0]);
        if (c[1] - c[0] > 4) out.push(m + ' +' + (c[1] - c[0]));
      });
      CIEL_REGL.on = on0; state = 'test';
      return { trop: out.join(', '), pire: pire };
    }, METEOS());
    egal(r.trop, '', 'Météos à plus de 4 appels de dessin de plus (pire : ' + r.pire + ')');
  });

  test('Ciel : l’éclair se voit un instant, plus doux sans secousses ; éclaboussures sous la pluie', () => {
    exiger(); reset(); J(prep); J('__cielPrep()'); J('startLocation(0)');
    const r = J(function(){
      var on0 = CIEL_REGL.on; CIEL_REGL.on = true;
      __amb.set('orage'); state = 'paused'; __amb.AMB.stormT = 1e9; visuals(1 / 30);
      __amb.strike(); __amb.AMB.flash2 = 0; visuals(.001);
      var vu = __ciel.cielEclair.visible, op = __ciel.cielEclair.material.opacity, n = __ciel.cielEclair.geometry.drawRange.count;
      var t = 0; while (__ciel.cielEclair.visible && t < 2){ visuals(1 / 60); t += 1 / 60; }
      var doux = null;
      if (typeof RS === 'object'){ var rs0 = RS.on; RS.on = false; __amb.strike(); __amb.AMB.flash2 = 0; visuals(.001); doux = __ciel.cielEclair.material.opacity; RS.on = rs0; }
      for (var k = 0; k < 30; k++) visuals(1 / 30);
      var eclab = __ciel.cielEclab.visible;
      __amb.set('clair'); visuals(1 / 30);
      var eclabClair = __ciel.cielEclab.visible;
      CIEL_REGL.on = on0; state = 'test';
      return { vu: vu, op: op, n: n, t: t, doux: doux, eclab: eclab, eclabClair: eclabClair, phase: __ciel.cielPhase() };
    });
    ok(r.vu && r.op > .5 && r.n > 0, 'L’éclair devrait se voir juste après le coup de tonnerre');
    ok(r.t <= .2, 'L’éclair devrait disparaître en moins de 0,2 s (vu ' + r.t.toFixed(2) + ' s)');
    if (r.doux !== null) ok(r.doux < r.op, 'Sans secousses, l’éclair devrait être plus doux');
    ok(r.eclab, 'Les éclaboussures devraient se voir sous la pluie');
    ok(!r.eclabClair, 'Pas d’éclaboussures par beau temps');
    ok(r.phase >= .12 && r.phase <= .88, 'Phase de la lune entre 0,12 et 0,88');
  });
})();
