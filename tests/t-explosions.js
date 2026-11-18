'use strict';
/* Tests des explosions et des pouvoirs du toit (js/85-explosions.js, js/85-explosions-sons.js, dossier 130).
   À charger APRÈS tests.js dans tests/index.html. Défensif : ignoré si les fichiers sont absents. */
(function(){
  if (typeof test !== 'function') return;
  const pret = () => lire('typeof __explosions === "object" && typeof powUse === "function" && typeof pwStrikes === "object"') === true;
  const exiger = () => { if (!pret()) ignorer('Explosions absentes (js/85-explosions.js) ou pouvoirs absents'); };
  // Partie prête : ville 1, vague en cours qui ne finit pas, pouvoirs débloqués, regard devant
  function departSrc(){
    return function(){
      P.level = Math.max(P.level || 1, 10);
      startLocation(1); state = 'playing'; plan.queue = ['walker']; spawnT = 1e9; plan.maxAlive = 1e6;
      if (typeof RUE === 'object' && RUE){ RUE.crateAt = []; RUE.civAt = -1; }
      if (typeof pwReset === 'function') pwReset();
      if (typeof showScreen === 'function') showScreen(null);
      __explosions.exVider();
    };
  }
  const DEPART = departSrc().toString();

  test('Explosions : réglages, deux géométries par instances cachées au repos, réserves fixes', () => {
    exiger(); reset();
    const r = J(function(src){
      (0, eval)('(' + src + ')')();
      var E = __explosions; visuals(1 / 30);
      var o = { on: E.EX_REGL.on, mb: E.EXB.mb.parent === scene, ms: E.EXB.ms.parent === scene, vb: E.EXB.mb.visible, vs: E.EXB.ms.visible,
        nb: E.EXP.N, ns: E.EXS.N, attr: E.EXB.b.pos.array.length, types: Object.keys(E.EX_REGL.types).length, sons: typeof __explosionsSons === 'object' };
      state = 'test'; visuals(1 / 30);
      return o;
    }, DEPART);
    ok(r.on, 'Interrupteur allumé par défaut'); ok(r.mb && r.ms, 'Les deux maillages sont dans la scène');
    ok(!r.vb && !r.vs, 'Rien de dessiné quand il n’y a pas d’explosion');
    ok(r.nb >= 100 && r.nb <= 300, 'Réserve de bouffées bornée (' + r.nb + ')'); ok(r.ns >= 16 && r.ns <= 48, 'Réserve au sol bornée (' + r.ns + ')');
    egal(r.attr, r.nb * 3, 'Attributs faits une fois à la taille de la réserve'); ok(r.types >= 6, 'Une recette par sorte d’explosion');
    ok(r.sons, 'Sons chargés (js/85-explosions-sons.js)');
  });

  test('Explosions : grenade (boule de feu, fumée, débris, brûlure qui s’efface), deux appels de dessin au plus', () => {
    exiger(); reset();
    const r = J(function(src){
      (0, eval)('(' + src + ')')();
      var E = __explosions, n0 = E.EX.n.grenade, dt = 1 / 30, o = {};
      powUse('grenade', { x: 2, y: 0, z: -26 });
      for (var f = 0; f < 45 && E.EX.n.grenade === n0; f++){ update(dt); visuals(dt); }
      for (var k = 0; k < 6; k++){ update(dt); visuals(dt); }
      o.vu = E.EX.n.grenade - n0; o.bouffees = E.bouffees; o.marques = E.marques; o.vb = E.EXB.mb.visible; o.vs = E.EXB.ms.visible;
      var info = renderer.info; info.autoReset = false; info.reset();
      E.EXB.mb.visible = E.EXB.ms.visible = false; renderer.render(scene, camera); var a = info.render.calls;
      E.EXB.mb.visible = E.EXB.ms.visible = true; info.reset(); renderer.render(scene, camera); var b = info.render.calls; info.autoReset = true;
      o.appels = b - a;
      for (var g = 0; g < 30 * 24; g++){ update(dt); visuals(dt); }
      o.apres = E.bouffees + E.marques; o.cache = !E.EXB.mb.visible && !E.EXB.ms.visible;
      state = 'test'; visuals(dt);
      return o;
    }, DEPART);
    egal(r.vu, 1, 'Une grenade vue'); ok(r.bouffees > 15, 'Feu, fumée et étincelles (' + r.bouffees + ')'); ok(r.marques >= 2, 'Onde, lueur et brûlure au sol (' + r.marques + ')');
    ok(r.vb && r.vs, 'Les deux maillages sont dessinés'); ok(r.appels <= 2, 'Au plus 2 appels de dessin de plus (' + r.appels + ')');
    egal(r.apres, 0, 'Tout s’est effacé après 24 s'); ok(r.cache, 'Maillages cachés à la fin');
  });

  test('Explosions : cocktail Molotov (feu qui vit puis s’éteint), frappe (annonce, avion, 7 bombes)', () => {
    exiger(); reset();
    const r = J(function(src){
      (0, eval)('(' + src + ')')();
      var E = __explosions, N = E.EX.n, m0 = N.molotov, e0 = N.eteint, a0 = N.annonce, v0 = N.avion, b0 = N.bombe, dt = 1 / 30, o = { feu: [] };
      powUse('molotov', { x: -1, y: 0, z: -22 });
      for (var f = 0; f < 60 && N.molotov === m0; f++){ update(dt); visuals(dt); }
      o.mol = N.molotov - m0;
      for (var k = 0; k < 5; k++){ for (var j = 0; j < 30; j++){ update(dt); visuals(dt); } var c = 0; for (var i = 0; i < E.EXP.N; i++) if (E.EXP.on[i] && E.EXP.add[i] && E.EXP.forme[i] === 0) c++; o.feu.push(c); }
      for (var g = 0; g < 90; g++){ update(dt); visuals(dt); }
      o.eteint = N.eteint - e0;
      powUse('strike', { x: 0, y: 0, z: -40 });
      for (var h = 0; h < 30 * 6; h++){ update(dt); visuals(dt); }
      o.annonce = N.annonce - a0; o.avion = N.avion - v0; o.bombes = N.bombe - b0;
      state = 'test'; visuals(dt);
      return o;
    }, DEPART);
    egal(r.mol, 1, 'Cocktail vu'); ok(r.feu.every(function(c){ return c > 0; }), 'Des langues de feu à chaque seconde de la nappe (' + r.feu.join(', ') + ')');
    egal(r.eteint, 1, 'Volutes quand la nappe s’éteint d’elle-même');
    egal(r.annonce, 1, 'Annonce de la frappe'); egal(r.avion, 1, 'Passage de l’avion'); egal(r.bombes, 7, 'Sept bombes, une explosion chacune');
  });

  test('Explosions : baril, roquette, canon électromagnétique ; rien dans le robot ni le RTS ; figé en pause', () => {
    exiger(); reset();
    const r = J(function(src){
      (0, eval)('(' + src + ')')();
      var E = __explosions, N = E.EX.n, dt = 1 / 30, o = {}, b0 = N.baril, r0 = N.roquette + N.gl, l0 = N.rail;
      var b = rueSpawnBarrel(3, -27); update(dt); visuals(dt); rueBarrelHit(b); update(dt); visuals(dt);
      o.baril = N.baril - b0;
      armExplode(new THREE.Vector3(-2, .03, -30), 'rocket'); update(dt); visuals(dt);
      o.roquette = N.roquette + N.gl - r0;
      if (typeof arsBeam === 'function' && WEAPONS.railgun){ var W = WEAPONS.railgun.beam; arsBeam(new THREE.Vector3(.3, 8, -9), new THREE.Vector3(0, 0, -40), W.c, W.w, W.life, true); visuals(dt); }
      o.rail = N.rail - l0;
      // En pause : rien ne bouge
      var x0 = []; for (var i = 0; i < E.EXP.N; i++) if (E.EXP.on[i]) x0.push(E.EXP.y[i]);
      state = 'paused'; visuals(dt); visuals(dt);
      var x1 = []; for (var j = 0; j < E.EXP.N; j++) if (E.EXP.on[j]) x1.push(E.EXP.y[j]);
      o.fige = x0.length > 0 && x0.join() === x1.join(); state = 'playing';
      // Un mode actif (robot) : tout est rangé
      var m = Jeu.modes.robot, ja = m.actif; m.actif = function(){ return true; };
      try { visuals(dt); o.robot = E.bouffees + E.marques; o.cacheRobot = !E.EXB.mb.visible && !E.EXB.ms.visible; } finally { m.actif = ja; }
      state = 'test'; visuals(dt);
      return o;
    }, DEPART);
    egal(r.baril, 1, 'Baril vu'); egal(r.roquette, 1, 'Roquette vue'); egal(r.rail, 1, 'Rayon du canon vu');
    ok(r.fige, 'En pause, les bouffées restent figées'); egal(r.robot, 0, 'Mode actif : tout est rangé'); ok(r.cacheRobot, 'Mode actif : rien de dessiné');
  });

  test('Explosions : aucun tirage de Math.random, l’état du jeu ne bouge pas pendant l’écouteur (600 images)', () => {
    exiger(); reset();
    // L'écouteur du fichier (Jeu.on('image')) est enveloppé : tirages comptés et empreinte de l'état du jeu avant et après
    // chaque appel. L'identité complète, en pages neuves avec et sans le fichier : node outils/mesure-explosions.js identite
    const r = J(function(src){
      var L = Jeu.ecoute.image, idx = -1, f0 = null, R0 = Math.random, o = { n: 0, diff: 0, appels: 0 }, compte = false;
      for (var w = 0; w < L.length; w++) if (/exImage\(dt\)/.test(String(L[w]))) idx = w;
      var etat = function(){
        var h = 0, H = function(v){ h = (h * 31 + Math.round((+v || 0) * 1000)) | 0; };
        for (var i = 0; i < zombies.length; i++){ var q = zombies[i]; H(q.g.position.x); H(q.g.position.y); H(q.g.position.z); H(q.hp); H(q.dead ? 1 : 0); }
        H(S.bar); H(S.money); H(S.kills); H(shake); H(camera.position.x); H(camera.position.y); H(camera.rotation.x); H(camera.rotation.y);
        pwPuddles.forEach(function(p){ H(p.live ? 1 : 0); H(p.t); }); pwStrikes.forEach(function(k){ H(k.t); k.bombs.forEach(function(b){ H(b.done ? 1 : 0); }); });
        pwBooms.forEach(function(b){ H(b.life); }); ARM.booms.forEach(function(b){ H(b.life); }); RUE.barrels.forEach(function(b){ H(b.live ? 1 : 0); }); RUE.fires.forEach(function(f){ H(f.t); });
        Object.keys(pwS).forEach(function(k){ H(pwS[k].ch); H(pwS[k].t); });
        return h;
      };
      Math.random = function(){ if (compte) o.n++; return R0(); };
      try {
        (0, eval)('(' + src + ')')();
        for (var k = 0; k < 10; k++){ var z = spawnZombie(k % 3 ? 'walker' : 'runner'); z.g.position.set(-9 + k * 2, 0, -22 - k * 2.5); z.hp = z.maxHp = z.hp * 6; }
        var bar = rueSpawnBarrel(-4, -30), dt = 1 / 30;
        if (idx >= 0){ f0 = L[idx]; L[idx] = function(d){ var h0 = etat(); compte = true; try { return f0(d); } finally { compte = false; o.appels++; if (etat() !== h0) o.diff++; } }; }
        for (var f = 0; f < 600; f++){
          if (f === 10) powUse('grenade', { x: 1, y: 0, z: -26 });
          if (f === 70) powUse('molotov', { x: -3, y: 0, z: -24 });
          if (f === 130) powUse('strike', { x: 0, y: 0, z: -40 });
          if (f === 300 && bar.live) rueBarrelHit(bar);
          if (f === 360) armExplode(new THREE.Vector3(2, .03, -32), 'rocket');
          if (f === 400 && typeof arsBeam === 'function' && WEAPONS.railgun){ var W = WEAPONS.railgun.beam; arsBeam(new THREE.Vector3(.3, 8, -9), new THREE.Vector3(0, 0, -40), W.c, W.w, W.life, true); }
          S.bar = S.barMax; if (state === 'playing') update(dt); visuals(dt);
        }
        o.vu = __explosions.EX.n.bombe; o.ecoute = idx >= 0;
        return o;
      } finally {
        if (f0) L[idx] = f0; Math.random = R0;
        clearZombies(); state = 'test'; visuals(1 / 30);
      }
    }, DEPART);
    ok(r.ecoute, 'Écouteur du fichier trouvé'); ok(r.appels >= 600, 'L’écouteur a tourné (' + r.appels + ')');
    ok(r.vu >= 7, 'Les explosions ont été vues (' + r.vu + ' bombes)');
    egal(r.n, 0, 'Tirages de Math.random faits par le fichier'); egal(r.diff, 0, 'Images où l’état du jeu a changé pendant l’écouteur');
  });

  test('Explosions, sons : placés selon la distance, budget à part, coupés en pause', () => {
    exiger();
    if (lire('typeof __explosionsSons === "object"') !== true) ignorer('Sons des explosions absents');
    const r = J(function(){
      var X = __explosionsSons, o = {};
      camera.position.set(0, 9, -8.4); camera.rotation.set(-.16, 0, 0); camera.updateMatrixWorld();
      var a = Object.assign({}, X.exsPlace(0, 0, -20)), b = Object.assign({}, X.exsPlace(0, 0, -90)), g = Object.assign({}, X.exsPlace(-15, 0, -20)), d = Object.assign({}, X.exsPlace(15, 0, -20));
      o.att = a.att > b.att; o.coupe = a.coupe > b.coupe; o.ret = b.ret > a.ret && b.ret <= .3; o.pan = g.pan < 0 && d.pan > 0;
      var s0 = Snd.voix ? Snd.voix.length : 0, st = state; state = 'playing';
      try { X.exSon('grenade', 0, 0, -20, 4); } finally { state = st; }
      o.budget = (Snd.voix ? Snd.voix.length : 0) === s0;
      X.exSonCouper(); o.coupe2 = X.EXSN.voix.length === 0;
      return o;
    });
    ok(r.att, 'Plus faible de loin'); ok(r.coupe, 'Plus sourd de loin'); ok(r.ret, 'En retard de loin (au plus 0,3 s)'); ok(r.pan, 'À gauche ou à droite');
    ok(r.budget, 'Jamais dans le budget de voix du jeu (Snd.voix)'); ok(r.coupe2, 'Coupés net');
  });
})();
