'use strict';
/* Tests de l'ambiance (js/22-ambiance.js et musique de js/01-son.js). À charger APRÈS tests.js dans tests/index.html :
   <script src="t-ambiance.js"></script>
   Utilise l'API de tests.js : test(), J(), lire(), ok(), egal(), ignorer(), reset(). */
(function(){
  if (typeof test !== 'function') return;
  const exiger = () => { if (lire('typeof __amb === "object" && typeof __amb.set === "function"') !== true) ignorer('Ambiance absente (js/22-ambiance.js)'); };

  test('Ambiance : la météo se remet à zéro au changement de ville', () => {
    exiger(); reset(); J('startLocation(0)');
    const r = J(function(){
      __amb.set('orage');
      var avant = { w: __amb.weather, far: scene.fog.far, pluie: !!(__amb.rain && __amb.rain.o.visible) };
      buildWorld(LOCS[1]);
      return { avant: avant, w: __amb.weather, near: scene.fog.near, far: scene.fog.far, col: scene.fog.color.getHex(),
        L: { near: LOCS[1].fogNear, far: LOCS[1].fogFar, col: LOCS[1].fog }, pluie: !!(__amb.rain && __amb.rain.o.visible), lampes: __amb.AMB.lamps.length };
    });
    egal(r.avant.w, 'orage', 'Météo forcée');
    ok(r.avant.pluie, 'La pluie devrait tomber pendant l’orage');
    egal(r.w, 'clair', 'Météo après buildWorld');
    egal(r.near, r.L.near, 'fog.near de la ville'); egal(r.far, r.L.far, 'fog.far de la ville'); egal(r.col, r.L.col, 'Couleur du brouillard de la ville');
    ok(!r.pluie, 'La pluie tombe encore après le changement de ville');
    egal(r.lampes, 0, 'Lumières de lampadaires de nuit restantes');
  });

  test('Ambiance : l’orage produit des éclairs', () => {
    exiger(); reset(); J('startLocation(0)');
    const r = J(function(){
      __amb.set('orage'); state = 'playing'; plan.queue = ['walker']; spawnT = 1e9;
      var s0 = __amb.strikes;
      for (var i = 0; i < 30 * 40; i++) __amb.frame(1 / 30); // 40 s
      var n = __amb.strikes - s0;
      var B = __amb.AMB.base, cur = __amb.AMB.cur.hemi;
      __amb.strike(); __amb.frame(.01);
      var flash = B.hemi ? B.hemi.o.intensity : 0;
      for (var k = 0; k < 60; k++) __amb.frame(1 / 30);
      var apres = B.hemi ? B.hemi.o.intensity : 0;
      state = 'test';
      return { n: n, cur: cur, flash: flash, apres: apres, hemi: !!B.hemi };
    });
    ok(r.n >= 2, 'Éclairs en 40 s d’orage : ' + r.n);
    ok(r.hemi, 'Lumière d’ambiance introuvable');
    ok(r.flash > r.cur + 1, 'L’éclair n’illumine pas la rue (' + r.flash + ' contre ' + r.cur + ')');
    ok(Math.abs(r.apres - r.cur) < 1e-6, 'La lumière ne revient pas à la normale après l’éclair (' + r.apres + ')');
  });

  test('Ambiance : le brouillard épais rapproche scene.fog sans rendre le jeu injouable', () => {
    exiger(); reset();
    const r = J(function(){
      var out = [];
      LOCS.forEach(function(L, i){
        buildWorld(L); var f0 = scene.fog.far, n0 = scene.fog.near;
        __amb.set('brouillard'); var f1 = scene.fog.far, n1 = scene.fog.near;
        __amb.set('clair'); out.push({ f0: f0, n0: n0, f1: f1, n1: n1, f2: scene.fog.far });
      });
      return { out: out, min: __amb.AMB_MIN_FAR };
    });
    r.out.forEach((o, i) => {
      ok(o.f1 < o.f0, 'Ville ' + i + ' : fog.far ' + o.f0 + ' -> ' + o.f1);
      ok(o.n1 <= o.n0, 'Ville ' + i + ' : fog.near ' + o.n0 + ' -> ' + o.n1);
      ok(o.f1 >= Math.min(o.f0, r.min) - 1e-9, 'Ville ' + i + ' : brouillard trop épais (' + o.f1 + ')');
      egal(o.f2, o.f0, 'Ville ' + i + ' : retour au temps clair');
    });
  });

  test('Ambiance : le réglage Musique est sauvegardé (curseur dans Pause)', () => {
    exiger();
    const r = J(function(){
      var v0 = Snd.musVol, inp = document.getElementById('musVol');
      var dansPause = !!inp && !!inp.closest && !!inp.closest('#scrPause');
      Snd.setMusicVol(.3); var s1 = store.get('dt_music', null);
      var s2 = null, lib = '';
      if (inp){ inp.value = '0.8'; inp.dispatchEvent(new Event('input')); s2 = store.get('dt_music', null); lib = (document.getElementById('musVolVal') || {}).textContent; }
      Snd.setMusicVol(v0);
      return { dansPause: dansPause, s1: s1, s2: s2, lib: lib };
    });
    ok(r.dansPause, 'Curseur « Musique » absent de l’écran Pause');
    egal(r.s1, .3, 'Valeur sauvée par Snd.setMusicVol');
    egal(r.s2, .8, 'Valeur sauvée par le curseur');
    ok(/80/.test(r.lib), 'Libellé du curseur : ' + r.lib);
  });

  test('Ambiance : la musique change d’état (menu, vague, boss) sans erreur, même sans audio', () => {
    exiger(); reset();
    const r = J(function(){
      var ctx0 = Snd.ctx, res = { erreurs: [] };
      function etape(nom, f){ try { f(); } catch (e) { res.erreurs.push(nom + ' : ' + e.message); } }
      [true, false].forEach(function(sansAudio){
        var k = sansAudio ? 'sans' : 'avec';
        if (sansAudio) Snd.ctx = null; else Snd.ctx = ctx0;
        etape(k + ' menu', function(){ state = 'menu'; visuals(1 / 30); res[k + 'Menu'] = Snd.musWant; });
        etape(k + ' vague', function(){
          startLocation(0); if (state !== 'playing'){ state = 'shop'; startWave(); }
          visuals(1 / 30); res[k + 'Vague'] = Snd.musWant;
          S.bar = S.barMax * .1; for (var i = 0; i < 120; i++) visuals(1 / 30); res[k + 'Int'] = Snd.musInt;
        });
        etape(k + ' boss', function(){
          if (typeof __boss !== 'object' || !__boss.bossReady()){ res[k + 'Boss'] = 'absent'; return; }
          clearZombies(); plan.queue = ['boss']; spawnT = 0; update(1 / 30); spawnT = 1e9; visuals(1 / 30);
          res[k + 'Boss'] = Snd.musWant;
          var b = zombies.find(function(z){ return z.type === 'boss'; });
          if (b) damage(b, 1e12, true, b.g.position.clone());
          visuals(1 / 30); res[k + 'ApresBoss'] = Snd.musWant;
        });
        etape(k + ' pause', function(){ state = 'paused'; visuals(1 / 30); res[k + 'Pause'] = Snd.musWant; state = 'playing'; });
        etape(k + ' victoire', function(){ victory(); visuals(1 / 30); res[k + 'Fin'] = Snd.musWant; });
        etape(k + ' défaite', function(){ state = 'playing'; gameOver(); visuals(1 / 30); });
      });
      Snd.ctx = ctx0; state = 'test';
      return res;
    });
    egal(r.erreurs.length, 0, 'Erreurs : ' + r.erreurs.join(' | ') + '\nNombre');
    ['sans', 'avec'].forEach(k => {
      egal(r[k + 'Menu'], 'menu', k + ' audio : menu');
      egal(r[k + 'Vague'], 'wave', k + ' audio : vague');
      ok(r[k + 'Int'] > .3, k + ' audio : l’intensité devrait monter quand la barricade est basse (' + r[k + 'Int'] + ')');
      if (r[k + 'Boss'] !== 'absent'){ egal(r[k + 'Boss'], 'boss', k + ' audio : boss'); egal(r[k + 'ApresBoss'], 'wave', k + ' audio : après le boss'); }
      egal(r[k + 'Pause'], 'wave', k + ' audio : pause');
      egal(r[k + 'Fin'], 'menu', k + ' audio : après la victoire');
    });
  });

  test('Ambiance : libellé de la météo dans la bannière de vague', () => {
    exiger(); reset(); J('startLocation(0)');
    const r = J(function(){ state = 'shop'; __amb.forceNext('brouillard'); startWave(); var t = $('bSub').textContent; state = 'test'; return { t: t, w: __amb.weather }; });
    egal(r.w, 'brouillard', 'Météo forcée');
    ok(r.t.indexOf('Brouillard épais') >= 0, 'Libellé absent : « ' + r.t + ' »');
  });
})();
