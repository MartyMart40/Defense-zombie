'use strict';
/* Tests du rendu (js/36-rendu.js) et des bruitages (js/37-bruitages.js) */
(function(){
  if (typeof test !== 'function' || typeof TESTS === 'undefined') return;
  const exGfx = () => { if (lire('typeof __gfx === "object"') !== true) ignorer('Rendu absent (js/36-rendu.js)'); };
  const exBr = () => { if (lire('typeof __br === "object"') !== true) ignorer('Bruitages absents (js/37-bruitages.js)'); };

  test('Rendu : réglage Graphismes dans Pause (auto, basse, moyenne, haute), sauvegardé, résolution appliquée', () => {
    exGfx(); reset();
    const r = J(function(){
      var o = { btn: !!document.getElementById('btnGfx'), dansPause: !!(document.getElementById('btnGfx') || {}).closest && !!document.getElementById('btnGfx').closest('#scrPause') };
      var p0 = __gfx.GFX.pref, b = document.getElementById('btnGfx'), vus = [];
      __gfx.gfxSet('auto');
      for (var i = 0; i < 4; i++){ b.click(); vus.push(__gfx.GFX.pref + ':' + renderer.getPixelRatio()); }
      o.vus = vus; o.sauve = store.get('dt_gfx', null); o.txt = b.textContent;
      __gfx.gfxSet('bas'); o.prBas = renderer.getPixelRatio();
      __gfx.gfxSet(p0);
      return o;
    });
    ok(r.btn && r.dansPause, 'Bouton Graphismes absent de Pause');
    egal(r.vus.map(v => v.split(':')[0]).join(','), 'bas,moyen,haut,auto', 'Ordre des réglages');
    egal(r.sauve, 'auto', 'Réglage sauvegardé');
    ok(/Graphismes : auto/.test(r.txt), 'Libellé : ' + r.txt);
    egal(r.prBas, 1, 'Résolution en qualité basse');
  });

  test('Rendu : nuages, brume, flaques à la pluie, ombres sous les zombies, fumée des explosions', () => {
    exGfx(); reset(); J('startLocation(0)');
    const r = J(function(){
      var o = {}, p0 = __gfx.GFX.pref;
      __t.geler(); clearZombies();
      __gfx.gfxSet('haut'); __amb.set('soleil'); __gfx.GFX.wet = 0;
      for (var i = 0; i < 5; i++) visuals(1 / 30);
      var vis = function(a){ return a.filter(function(s){ return s.visible; }).length; };
      o.nuages = vis(__gfx.gfxClouds); o.brume = vis(__gfx.gfxMist); o.flaquesSec = vis(__gfx.gfxPuddles);
      __amb.set('pluie'); for (var k = 0; k < 30 * 10; k++) visuals(1 / 30);
      o.flaques = vis(__gfx.gfxPuddles); o.mouille = __gfx.GFX.wet; o.op = __gfx.gfxPuddleMat.opacity;
      for (var n = 0; n < 12; n++) __t.placer('walker', -6 + n, -30);
      visuals(1 / 30); o.ombres = __gfx.gfxShadows.count; o.ombresVis = __gfx.gfxShadows.visible;
      var s0 = __gfx.GFX.smokeN; if (typeof armExplode === 'function'){ armExplode(new THREE.Vector3(0, 1, -40), 'rocket'); } o.fumee = __gfx.GFX.smokeN - s0;
      __gfx.gfxSet('bas'); __amb.set('soleil'); visuals(1 / 30);
      o.bas = { n: vis(__gfx.gfxClouds), b: vis(__gfx.gfxMist), o: __gfx.gfxShadows.visible };
      var s1 = __gfx.GFX.smokeN; __gfx.gfxPuff(0, 1, -30, 2, 2); o.basFumee = __gfx.GFX.smokeN - s1;
      __gfx.gfxSet(p0); __amb.set('clair'); clearZombies();
      return o;
    });
    egal(r.nuages, 12, 'Nuages au grand soleil (qualité haute)');
    ok(r.brume >= 1, 'Brume au sol');
    egal(r.flaquesSec, 0, 'Pas de flaques au soleil');
    ok(r.flaques >= 6 && r.mouille > .9 && r.op > .3, 'Flaques sous la pluie : ' + r.flaques + ' (mouillé ' + r.mouille + ')');
    ok(r.ombresVis && r.ombres >= 12, 'Ombres sous les zombies : ' + r.ombres);
    ok(r.fumee >= 3, 'Fumée après une explosion : ' + r.fumee);
    ok(!r.bas.n && !r.bas.b && !r.bas.o && !r.basFumee, 'Qualité basse : aucun effet en plus ' + JSON.stringify(r.bas));
  });

  test('Rendu : les ombres de toute la foule tiennent en un seul appel de dessin', () => {
    exGfx(); reset(); J('startLocation(0)');
    const r = J(function(){
      var p0 = __gfx.GFX.pref; __gfx.gfxSet('haut'); __t.geler(); clearZombies();
      for (var i = 0; i < 150; i++) __t.placer('walker', rand(-11, 11), rand(-90, -20));
      visuals(1 / 30);
      var n = 0; __gfx.gfxShadows.parent.children.forEach(function(o){ if (o.isInstancedMesh) n++; });
      var o = { count: __gfx.gfxShadows.count, maillages: n };
      clearZombies(); visuals(1 / 30); o.vide = __gfx.gfxShadows.count; __gfx.gfxSet(p0);
      return o;
    });
    ok(r.count >= 150, 'Ombres : ' + r.count);
    egal(r.maillages, 1, 'Un seul maillage pour toutes les ombres');
    egal(r.vide, 0, 'Plus d’ombres sans zombies');
  });

  test('Bruitages : son placé à gauche ou à droite, douilles, corps qui tombent, horde, barricade', () => {
    exBr(); reset(); J('startLocation(0)');
    const r = J(function(){
      var o = {};
      if (!Snd.ctx) Snd.init();
      o.audio = !!Snd.ctx;
      camera.position.copy(EYE); camera.lookAt(0, 1, -40); camera.updateMatrixWorld(true);
      o.g = __br.brSpot(-10, 1, -20).pan; o.d = __br.brSpot(10, 1, -20).pan; o.loin = __br.brSpot(0, 1, -100).vol; o.pres = __br.brSpot(0, 1, -12).vol;
      __t.geler(); clearZombies(); var B = __br.BR, t0 = B.tinks, d0 = B.drops;
      equip('pistol'); __br.BR.tinkT = -10; vmEject('pistol');
      o.tink = B.tinks - t0;
      var z = __t.placer('walker', 0, -25); __br.BR.dropT = -10; damage(z, 1e9, true, z.g.position.clone());
      o.chute = B.drops - d0; o.crunch = B.crunch > 0;
      for (var i = 0; i < 40; i++) __t.placer('walker', rand(-10, 10), rand(-60, -20));
      state = 'playing'; for (var k = 0; k < 60; k++) visuals(1 / 30);
      o.horde = __br.BR.hordeLvl;
      S.bar = S.barMax * .1; B.creakT = 0; var c0 = B.creaks; visuals(1 / 30); o.craque = B.creaks - c0;
      var err = null; try { Snd.groan(); var zz = zombies.filter(function(x){ return !x.dead; })[0]; hitBarricade(zz, 1, .01, 0); } catch (e) { err = e.message; }
      o.err = err; clearZombies(); S.bar = S.barMax;
      return o;
    });
    ok(r.g < -.2 && r.d > .2, 'Panoramique : gauche ' + r.g + ', droite ' + r.d);
    ok(r.loin < r.pres, 'Plus faible de loin');
    egal(r.err, null, 'Erreur');
    if (r.audio){
      egal(r.tink, 1, 'Tintement de la douille');
      egal(r.chute, 1, 'Corps qui tombe'); ok(r.crunch, 'Craquement à la tête');
      ok(r.horde > .3, 'Murmure de la horde : ' + r.horde);
      egal(r.craque, 1, 'La barricade abîmée craque');
    }
  });
})();
