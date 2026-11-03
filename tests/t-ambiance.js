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
      var ctx0 = Snd.ctx, sauve = { master: Snd.master, noise: Snd.noise, musBus: Snd.musBus, rainSrc: Snd.rainSrc, rainGain: Snd.rainGain, init: Snd.init }, res = { erreurs: [] };
      Snd.init = function(){ if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume(); }; // pas de nouveau contexte audio pendant le test
      function etape(nom, f){ try { f(); } catch (e) { res.erreurs.push(nom + ' : ' + e.message); } }
      [true, false].forEach(function(sansAudio){
        var k = sansAudio ? 'sans' : 'avec';
        if (sansAudio) Snd.ctx = null; else { Snd.ctx = ctx0; Snd.master = sauve.master; Snd.musBus = sauve.musBus; }
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
      Snd.ctx = ctx0; Object.keys(sauve).forEach(function(k){ Snd[k] = sauve[k]; }); state = 'test';
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

  test('Ambiance : nouvelles météos présentes, chacune avec son nom et son ambiance sonore', () => {
    exiger();
    const r = J(function(){ var o = {}; Object.keys(__amb.WEATHERS).forEach(function(k){ var W = __amb.WEATHERS[k]; o[k] = { name: W.name, snd: !!W.snd }; }); return o; });
    ['soleil', 'canicule', 'coucher', 'aube', 'vent', 'grele', 'poussiere', 'nuitClaire', 'tornade'].forEach(k => {
      ok(!!r[k], 'Météo absente : ' + k);
      if (r[k]) ok(!!r[k].name, 'Météo sans nom : ' + k);
    });
    Object.keys(r).forEach(k => ok(r[k].snd, 'Météo sans ambiance sonore : ' + k));
  });

  test('Ambiance : beau temps fréquent partout, pluie et orage rares, tornade très rare', () => {
    exiger();
    const r = J(function(){ return { T: __amb.WEATHER_BY_LOC, nice: __amb.AMB_NICE, keep: __amb.AMB_KEEP, ids: LOCS.map(function(L){ return L.id; }) }; });
    ok(r.keep <= .2, 'AMB_KEEP trop haut : ' + r.keep);
    r.ids.forEach(id => {
      const t = r.T[id]; ok(!!t, 'Ville sans table : ' + id); if (!t) return;
      let sum = 0, nice = 0, wet = 0; Object.keys(t).forEach(k => { sum += t[k]; if (r.nice.indexOf(k) >= 0) nice += t[k]; if (k === 'pluie' || k === 'orage') wet += t[k]; });
      ok(Object.keys(t).length >= 9, id + ' : au moins 9 météos possibles (' + Object.keys(t).length + ')');
      ok(nice / sum >= .55, id + ' : beau temps ' + Math.round(nice / sum * 100) + ' %');
      ok(wet / sum <= .12, id + ' : pluie et orage ' + Math.round(wet / sum * 100) + ' %');
      if (t.tornade) ok(t.tornade / sum <= .03, id + ' : tornade trop fréquente');
    });
  });

  test('Ambiance : la météo change souvent d’une vague à l’autre', () => {
    exiger(); reset(); J('startLocation(0)');
    const r = J(function(){
      var vus = {}, chg = 0, prev = __amb.weather, n = 400, pluie = 0;
      for (var i = 0; i < n; i++){
        var w = __amb.pick(curLoc, 2 + (i % 3)); AMB.weather = w;
        vus[w] = 1; if (w !== prev) chg++; if (w === 'pluie' || w === 'orage') pluie++; prev = w;
      }
      __amb.set('clair');
      return { sortes: Object.keys(vus).length, chg: chg / n, pluie: pluie / n };
    });
    ok(r.sortes >= 9, 'Variété : ' + r.sortes + ' météos en 400 vagues');
    ok(r.chg >= .65, 'La météo change ' + Math.round(r.chg * 100) + ' % du temps');
    ok(r.pluie <= .15, 'Pluie ou orage ' + Math.round(r.pluie * 100) + ' % du temps');
  });

  test('Ambiance : chaque météo s’applique sans erreur, avec ses effets, et tout repart au temps clair', () => {
    exiger(); reset(); J('startLocation(0)');
    const r = J(function(){
      var o = { err: [], far: [] , fx: {} }, sky = AMB.base.sky;
      Object.keys(__amb.WEATHERS).forEach(function(k){
        try {
          __amb.set(k); for (var i = 0; i < 10; i++) __amb.frame(1 / 30);
          var W = __amb.WEATHERS[k], X = __amb.AMB_X;
          if (scene.fog.far < Math.min(LOCS[0].fogFar, __amb.AMB_MIN_FAR) - 1e-9) o.far.push(k + ' ' + scene.fog.far);
          o.fx[k] = { flk: W.flakes ? !!(__amb.flakes && __amb.flakes.o.visible && __amb.flakes.kind === W.flakes) : null,
            heat: W.heat ? !!(X.heat && X.heat.g.visible) : null, moon: W.moon ? !!(X.sky && X.sky.g.visible) : null,
            tor: W.tornado ? !!(X.tornado && X.tornado.g.visible) : null,
            ciel: sky ? sky.o.material.color.getHexString() : '' };
        } catch (e) { o.err.push(k + ' : ' + e.message); }
      });
      __amb.set('clair'); __amb.frame(1 / 30);
      var X = __amb.AMB_X;
      o.apres = { heat: !!(X.heat && X.heat.g.visible), moon: !!(X.sky && X.sky.g.visible), tor: !!(X.tornado && X.tornado.g.visible), flk: !!(__amb.flakes && __amb.flakes.o.visible), pluie: !!(__amb.rain && __amb.rain.o.visible) };
      o.nflk = __amb.flakes ? __amb.flakes.pos.length / 3 : 0; o.touch = isTouch;
      o.sun = AMB.base.sun ? [AMB.base.sun.o.color.getHex(), AMB.base.sun.c] : null;
      return o;
    });
    egal(r.err.length, 0, 'Erreurs : ' + r.err.join(' | ') + '\nNombre');
    egal(r.far.join(', '), '', 'Brouillard trop épais');
    Object.keys(r.fx).forEach(k => { const f = r.fx[k]; ['flk', 'heat', 'moon', 'tor'].forEach(e => { if (f[e] !== null) ok(f[e], k + ' : effet ' + e + ' absent'); }); });
    ok(r.fx.soleil.ciel !== r.fx.orage.ciel, 'Le ciel du grand soleil devrait différer de celui de l’orage');
    ok(!r.apres.heat && !r.apres.moon && !r.apres.tor && !r.apres.flk && !r.apres.pluie, 'Restes après le retour au temps clair : ' + JSON.stringify(r.apres));
    ok(r.nflk <= (r.touch ? 220 : 600), 'Particules au-dessus du plafond : ' + r.nflk);
    if (r.sun) egal(r.sun[0], r.sun[1], 'Couleur du soleil remise après le temps clair');
  });
})();
