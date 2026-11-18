'use strict';
/* Tests de la mise en scène des boss du toit (js/82-boss-scene.js, js/82-boss-sons.js, dossier 128).
   À charger APRÈS tests.js dans tests/index.html. Défensif : ignoré si les fichiers sont absents. */
(function(){
  if (typeof test !== 'function') return;
  const pret = () => lire('typeof __bossScene === "object" && typeof __boss === "object" && __boss.bossReady()') === true;
  const exiger = () => { if (!pret()) ignorer('Mise en scène des boss absente (js/82-boss-scene.js) ou boss absent'); };
  // Boss de chaque ville : [ville, vague, clé de BOSS_VAR]
  const BOSS = [[0, 5, 'village'], [1, 5, 'ville'], [2, 5, 'banlieue'], [3, 5, 'centre'], [4, 5, 'port'], [4, 10, 'port10']];
  // Lance la vague w de la ville vi, quelques marcheurs devant, puis le boss (sans le faire avancer)
  function departSrc(){
    return function(vi, w){
      startLocation(vi); state = 'shop'; S.wave = w - 1; startWave();
      clearZombies(); plan.queue = ['walker']; spawnT = 1e9;
      for (var k = 0; k < 6; k++){ var m = spawnZombie('walker'); m.g.position.set(-8 + k * 3, 0, -20 - k * 5); }
      return spawnZombie('boss');
    };
  }
  const DEPART = departSrc().toString();

  test('Boss, mise en scène : un profil différent par boss des 5 premières villes', () => {
    exiger();
    const r = J(function(){
      var P = __bossScene.BS_REGL.P, o = {};
      ['village', 'ville', 'banlieue', 'centre', 'port', 'port10'].forEach(function(k){ o[k] = { id: P[k] && P[k].id, menace: P[k] && P[k].menace, mort: P[k] && P[k].mort, gerbe: P[k] && P[k].gerbe, halo: P[k] && P[k].halo }; });
      return o;
    });
    const ids = {}, sig = {};
    Object.keys(r).forEach(k => {
      ok(r[k].id && r[k].menace && r[k].mort, 'Profil incomplet : ' + k);
      ok(!/\u2014/.test(r[k].menace), 'Tiret quadratin dans le sous-titre de ' + k);
      ids[r[k].id] = 1; sig[r[k].mort + '|' + r[k].gerbe + '|' + r[k].halo] = 1;
    });
    egal(Object.keys(ids).length, 6, 'Six boss distincts');
    egal(Object.keys(sig).length, 6, 'Chaque boss a sa façon d’arriver et de tomber');
  });

  test('Boss, mise en scène : arrivée (contre-jour, sous-titre, oiseaux), version abrégée au 2e boss', () => {
    exiger(); reset();
    const r = J(function(src){
      var dep = (0, eval)('(' + src + ')'), BS = __bossScene.BS, n0 = BS.n.arrivees, c0 = BS.n.courtes, o0 = BS.n.oiseaux;
      var b = dep(0, 5); visuals(1 / 30);
      var el = document.getElementById('bsMenace'), bar = $('bossBar');
      var o = { arr: BS.n.arrivees - n0, sous: el ? el.textContent : null, attendu: __bossScene.BS_REGL.P.village.menace, anim: bar.classList.contains('bsArrive'),
        halo: __bossScene.BSH.s.visible || BS.halo.z === b, oiseaux: BS.n.oiseaux - o0, poussiere: __bossScene.BSP.L.filter(function(p){ return p.on; }).length };
      for (var i = 0; i < 20; i++) visuals(1 / 30);
      o.haloVu = __bossScene.BSH.s.visible;
      // 2e boss de la même partie : version abrégée, sans oiseaux
      var o1 = BS.n.oiseaux; damage(b, 1e12, true, b.g.position.clone()); spawnZombie('boss'); visuals(1 / 30);
      o.courtes = BS.n.courtes - c0; o.oiseaux2 = BS.n.oiseaux - o1; o.court = bar.classList.contains('bsCourt');
      clearZombies(); visuals(1 / 30); state = 'test'; visuals(1 / 30);
      return o;
    }, DEPART);
    egal(r.arr, 1, 'Une arrivée vue'); egal(r.sous, r.attendu, 'Sous-titre de menace sous le nom');
    ok(r.anim, 'Animation d’apparition de la barre'); ok(r.halo && r.haloVu, 'Contre-jour derrière le boss');
    ok(r.oiseaux > 0, 'Les corbeaux s’envolent'); ok(r.poussiere > 0, 'Gerbe de terre à l’arrivée');
    egal(r.courtes, 1, '2e boss : version abrégée'); egal(r.oiseaux2, 0, '2e boss : pas d’oiseaux'); ok(r.court, 'Barre en version courte');
  });

  test('Boss, mise en scène : paliers de vie (50 %, 25 %), lueur et barre qui bat', () => {
    exiger(); reset();
    const r = J(function(src){
      var dep = (0, eval)('(' + src + ')'), b = dep(3, 5); visuals(1 / 30);
      var g = b.bs.glow, c0 = g ? g.color.getHex() : 0, o = { glow: !!g };
      b.hp = b.maxHp * .4; visuals(1 / 30); o.st1 = b.bs.stage; o.moitie = $('bossBar').classList.contains('bsMoitie');
      b.hp = b.maxHp * .2; visuals(1 / 30); visuals(1 / 30); o.st2 = b.bs.stage; o.quart = $('bossBar').classList.contains('bsQuart');
      o.couleur = g ? g.color.getHex() !== c0 : false;
      __bossScene.BS_REGL.on = false; visuals(1 / 30); o.remise = g ? g.color.getHex() === c0 : true; o.quartOff = $('bossBar').classList.contains('bsQuart');
      __bossScene.BS_REGL.on = true;
      clearZombies(); state = 'test'; visuals(1 / 30);
      return o;
    }, DEPART);
    ok(r.glow, 'Matériau de lueur trouvé'); egal(r.st1, 1, 'Palier sous 50 %'); ok(r.moitie, 'Barre sous 50 %');
    egal(r.st2, 2, 'Palier sous 25 %'); ok(r.quart, 'Barre qui bat sous 25 %'); ok(r.couleur, 'La lueur change sous 25 %');
    ok(r.remise, 'Interrupteur coupé : la lueur d’origine revient'); ok(!r.quartOff, 'Interrupteur coupé : barre normale');
  });

  test('Boss, mise en scène : mort en plusieurs temps, cadavre gardé puis retiré', () => {
    exiger(); reset();
    const r = J(function(src){
      var dep = (0, eval)('(' + src + ')'), BS = __bossScene.BS, b = dep(1, 5), dt = 1 / 30;
      visuals(dt); var c0 = BS.n.chutes, r0 = BS.n.corpsRepris;
      if (typeof pkSlowStop === 'function') pkSlowStop();
      damage(b, 1e12, true, b.g.position.clone());
      var o = { morts: BS.morts.length, poses: [] };
      for (var i = 0; i < 400 && BS.morts.length; i++){
        S.bar = S.barMax; if (state === 'playing') update(dt); visuals(dt);
        if (i % 20 === 0) o.poses.push(Math.round(b.body.rotation.x * 100) / 100);
      }
      o.chutes = BS.n.chutes - c0; o.repris = BS.n.corpsRepris - r0; o.fini = BS.morts.length === 0; o.dansScene = !!b.g.parent; o.dansZombies = zombies.indexOf(b) >= 0;
      clearZombies(); state = 'test'; visuals(dt);
      return o;
    }, DEPART);
    egal(r.morts, 1, 'La mort du boss lance sa chute');
    egal(r.chutes, 1, 'Un seul impact au sol');
    ok(r.poses.some(a => a < -1.2), 'Le corps finit couché (rotations : ' + r.poses.join(', ') + ')');
    ok(r.repris >= 1, 'Le cadavre est gardé après que js/07 l’a rangé');
    ok(r.fini && !r.dansScene && !r.dansZombies, 'Le cadavre est retiré à la fin');
  });

  test('Boss, mise en scène : aucun tirage de Math.random, l’état du jeu ne bouge pas (6 boss, 900 images)', () => {
    exiger();
    const L = [];
    BOSS.forEach(([vi, w]) => {
      reset();
      L.push(J(function(src, vi, w){
        var dep = (0, eval)('(' + src + ')'), BS = __bossScene.BS, dt = 1 / 30;
        var etat = function(){ var h = 0, H = function(v){ h = (h * 31 + Math.round(v * 1000)) | 0; };
          for (var i = 0; i < zombies.length; i++){ var z = zombies[i]; H(z.g.position.x); H(z.g.position.y); H(z.g.position.z); H(z.hp); H(z.dead ? 1 : 0); H(z.atkT || 0); }
          H(S.bar); H(S.money); H(S.kills); H(zombies.length); H(spawnT); H(camera.rotation.x); return h; };
        var b = dep(vi, w), m0 = BS.n.morts, c0 = BS.n.chutes;
        if (typeof pkSlowStop === 'function') pkSlowStop();
        BS.sonde = { n: 0, diff: 0, appels: 0, etat: etat };
        try {
          for (var f = 0; f < 900; f++){
            if (f === 200) b.hp = b.maxHp * .45;
            if (f === 400) b.hp = b.maxHp * .2;
            if (f === 600) damage(b, 1e12, true, b.g.position.clone());
            if (f === 300 || f === 500) damage(b, 1, false, b.g.position.clone());
            S.bar = S.barMax; if (state === 'playing') update(dt); visuals(dt);
          }
          var o = { n: BS.sonde.n, diff: BS.sonde.diff, appels: BS.sonde.appels, morts: BS.n.morts - m0, chutes: BS.n.chutes - c0, nom: b.bossName + ' (état ' + state + ', vague ' + S.wave + ', barricade ' + Math.round(S.bar) + ')' };
        } finally { BS.sonde = null; }
        clearZombies(); state = 'test'; visuals(dt);
        return o;
      }, DEPART, vi, w));
    });
    L.forEach(o => {
      ok(o.appels > 900, o.nom + ' : la sonde n’a pas tourné (' + o.appels + ')');
      egal(o.n, 0, o.nom + ' : tirages de Math.random pendant la mise en scène');
      egal(o.diff, 0, o.nom + ' : appels qui ont changé l’état du jeu');
      egal(o.morts, 1, o.nom + ' : mort vue'); egal(o.chutes, 1, o.nom + ' : chute vue');
    });
  });

  test('Boss, mise en scène : même partie image par image, fichier coupé puis allumé (même graine, 900 images)', () => {
    exiger();
    // Heure et hasard fixés pendant la partie (comme outils/sim-horloge.js), même état de départ
    function partie(on){
      reset();
      return J(function(src, on){
        window.__bsT0 = (window.__bsT0 || 0) + 10000;
        var dep = (0, eval)('(' + src + ')'), dt = 1 / 30, T = window.__bsT0, pn = performance.now, dn = Date.now, R0 = Math.random, s = 12345, n = 0;
        try { Object.defineProperty(performance, 'now', { value: function(){ return 5000 + T * 1000; }, configurable: true, writable: true }); } catch (e) {}
        Date.now = function(){ return 1e12 + T * 1000; };
        Math.random = function(){ n++; s = s * 16807 % 2147483647; return (s - 1) / 2147483646; };
        var h = 0, H = function(v){ h = (h * 31 + Math.round(v * 1000)) | 0; };
        __bossScene.BS_REGL.on = on;
        try {
          time = 100; if (typeof pkSlowStop === 'function') pkSlowStop();
          if (typeof zUid === 'number') zUid = 0; if (typeof zFrame === 'number') zFrame = 0; if (typeof groanT === 'number') groanT = 2;
          var b = dep(3, 5);
          for (var f = 0; f < 900; f++){
            T += dt;
            if (f === 200) damage(b, b.maxHp * .55 / .6, false, b.g.position.clone());
            if (f === 400) damage(b, b.maxHp * .25 / .6, false, b.g.position.clone());
            if (f === 600) damage(b, 1e12, true, b.g.position.clone());
            S.bar = S.barMax; if (state === 'playing') update(dt); visuals(dt);
            for (var i = 0; i < zombies.length; i++){ var z = zombies[i]; H(z.g.position.x); H(z.g.position.y); H(z.g.position.z); H(z.hp); H(z.dead ? 1 : 0); }
            H(S.bar); H(S.money); H(zombies.length);
          }
          return { n: n, h: h };
        } finally {
          Math.random = R0; Date.now = dn;
          try { Object.defineProperty(performance, 'now', { value: pn, configurable: true, writable: true }); } catch (e) {}
          __bossScene.BS_REGL.on = true; clearZombies(); state = 'test'; visuals(dt);
        }
      }, DEPART, on);
    }
    const a = partie(false), b = partie(true), c = partie(false);
    if (a.n !== c.n || a.h !== c.h) ignorer('Deux parties sans le fichier diffèrent déjà dans cette page (état qui reste d’un test à l’autre) : vérifié en pages neuves par la mesure du dossier 128');
    egal(b.n, a.n, 'Nombre de tirages de Math.random'); egal(b.h, a.h, 'Positions, vies, barricade et argent image par image');
  });

  test('Boss, mise en scène : au plus 4 appels de dessin de plus, rien hors du toit', () => {
    exiger(); reset();
    const r = J(function(src){
      var dep = (0, eval)('(' + src + ')'), dt = 1 / 30, BS = __bossScene.BS, b = dep(0, 5);
      camera.position.copy(EYE); camera.rotation.set(-.16, 0, 0); camera.updateMatrixWorld(true);
      for (var i = 0; i < 25; i++) visuals(dt);
      b.hp = b.maxHp * .2; for (i = 0; i < 10; i++) visuals(dt);
      var info = renderer.info, mesure = function(){ renderer.render(scene, camera); return info.render.calls; };
      var o = { halo: __bossScene.BSH.s.visible, poussiere: __bossScene.BSP.im.visible, oiseaux: __bossScene.BSO.im.visible };
      // Même image : avec les objets de la mise en scène, puis sans eux (rien d'autre ne bouge entre les deux)
      o.avec = mesure();
      var L = [__bossScene.BSH.s, __bossScene.BSP.im, __bossScene.BSO.im], v = L.map(function(x){ return x.visible; });
      L.forEach(function(x){ x.visible = false; }); o.sans = mesure(); L.forEach(function(x, i){ x.visible = v[i]; });
      __bossScene.BS_REGL.on = false; visuals(dt);
      o.cache = !__bossScene.BSH.s.visible && !__bossScene.BSP.im.visible && !__bossScene.BSO.im.visible;
      __bossScene.BS_REGL.on = true;
      // Hors du toit (robot, RTS, menus) : rien
      var st = state; state = 'mech'; visuals(dt); o.horsToit = !BS.actif && !__bossScene.BSH.s.visible; state = st;
      clearZombies(); state = 'test'; visuals(dt);
      return o;
    }, DEPART);
    ok(r.halo && r.poussiere && r.oiseaux, 'Effets actifs pendant la mesure (halo ' + r.halo + ', poussière ' + r.poussiere + ', oiseaux ' + r.oiseaux + ')');
    ok(r.avec - r.sans <= 4, 'Appels de dessin : ' + r.sans + ' sans, ' + r.avec + ' avec');
    ok(r.cache, 'Interrupteur coupé : tout est caché');
    ok(r.horsToit, 'Hors du toit : la mise en scène s’arrête');
  });

  test('Boss, sons : chaque son joue sans toucher à Math.random, coupés sans audio', () => {
    exiger();
    if (lire('typeof __bossSons === "object"') !== true) ignorer('js/82-boss-sons.js absent');
    if (J(function(){ if (!Snd.ctx) Snd.init(); return !!(Snd.ctx && Snd.master && Snd.noise); }) !== true) ignorer('Pas d’audio dans ce navigateur');
    const coupe = J(function(){ var on0 = Snd.on; Snd.on = false; try { return __bossSons.bssJouer('cri', __bossScene.BS_REGL.P.ville, 1, 0); } finally { Snd.on = on0; } });
    ok(!coupe, 'Son coupé : rien ne joue');
    return new Promise((res, rej) => {
      const w = J('window');
      // Math.random n'est compté que pendant les appels des sons (la boucle du jeu tourne pendant le rendu hors ligne)
      w.eval('window.__bsT = null; (function(){ var R0 = Math.random, k = 0, P = __bossScene.BS_REGL.P;'
        + 'var jouer = function(){ Math.random = function(){ k++; return R0(); }; try { __bossSons.bssJouer("cri", P.centre, 1, 0); __bossSons.bssJouer("chute", P.village, 1, 0); __bossSons.bssJouer("rale", P.banlieue, 1, 0); __bossSons.bssJouer("pas", P.centre, 1, 0); __bossSons.bssJouer("palier", P.ville, 2, 0); __bossSons.bssNappeCreer(); __bossSons.bssNappeRegler(1); } finally { Math.random = R0; } };'
        + '__bossSons.bssRendre(3.5, jouer).then(function(r){ window.__bsT = { k: k, r: r }; }, function(e){ window.__bsT = { k: k, err: String(e) }; }); })();');
      const t0 = Date.now();
      (function attendre(){
        const v = w.__bsT;
        if (v){
          try {
            if (v.err) throw new Error(v.err);
            if (!v.r) ignorer('Mesure hors ligne impossible ici');
            egal(v.k, 0, 'Appels à Math.random par les sons des boss');
            ok(v.r.pic > -60, 'Les sons ont joué (crête ' + v.r.pic + ' dBFS)');
            ok(v.r.pic <= 0, 'Pas d’écrêtage (crête ' + v.r.pic + ' dBFS)');
            res();
          } catch (e) { rej(e); }
          return;
        }
        if (Date.now() - t0 > 20000){ rej(new Error('Mesure trop longue')); return; }
        setTimeout(attendre, 50);
      })();
    });
  });
})();
