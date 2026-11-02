'use strict';
/* =====================================================================
   Tests de la foule (07-zombies.js : matériaux partagés, rendu par instances,
   cibles par boîte englobante ; 06-donnees.js : aliveCap, hordePlan ; 27-perf.js)
   À charger APRÈS tests.js dans tests/index.html :
     <script src="t-perf.js"></script>
   Réutilise test(), J(), lire(), ok(), egal(), reset(), ignorer() de tests.js.
   Les tests sont placés avant le test final « Erreurs ».
   ===================================================================== */
(function(){
  if (typeof test !== 'function' || typeof TESTS === 'undefined') return;
  const avant = TESTS.length;
  const exiger = () => { if (lire('typeof __zperf === "object" && typeof zInstSync === "function"') !== true) ignorer('Rendu de la foule absent (27-perf.js ou 07-zombies.js)'); };
  // Partie à Saint-Clou, apparitions gelées, sans largage ni survivant (23-rue.js) pendant les mesures
  const partie = () => { reset(); J('startLocation(0)'); J(function(){ __t.geler(); clearZombies(); if (typeof RUE === 'object' && RUE){ RUE.crateAt = []; RUE.civAt = -1; } }); };
  // Remplit la rue de n zombies de tous les types (quelques colosses), sans dépasser plan.maxAlive
  const OUTILS = function(){
    if (window.__tp) return;
    var MIX = ['walker', 'runner', 'walker', 'jumper', 'brute', 'walker', 'spitter', 'flyer', 'runner', 'walker'];
    window.__tp = {
      remplir: function(n, zmin, zmax){
        for (var i = 0; i < n; i++){ var t = i % 60 === 59 ? 'colossus' : MIX[i % MIX.length]; var z = spawnZombie(t); z.g.position.set(rand(-11, 11), z.g.position.y, rand(zmin || -100, zmax || -45)); }
      },
      // Pointe la caméra sur un point et tire n balles de l'arme id (munitions pleines)
      tirerSur: function(p, id, n){
        if (id){ S.owned[id] = true; equip(id); }
        var k = 0;
        for (; k < (n || 1); k++){
          camera.position.copy(EYE); camera.lookAt(p); camera.updateMatrixWorld(true); zoomed = false; recoilAcc = 0;
          reloadT = 0; cool = 0; S.ammo[S.cur] = 99; spin = 1; fire();
        }
        return k;
      },
      centre: function(z){ return new THREE.Vector3(z.g.position.x, z.g.position.y + z.aimY, z.g.position.z); },
      barricade: function(){ S.bar = S.barMax; return false; }
    };
  };

  test('Foule : plafonds par appareil et règle de maxAlive', () => {
    exiger();
    const r = J(function(){
      var L0 = LOCS[0], L4 = LOCS[LOCS.length - 1];
      return { cap: DEV_CAP, base: BASE_ALIVE, touch: isTouch, w1: wavePlan(1, L0).maxAlive, w5: wavePlan(5, L0).maxAlive, w1d: wavePlan(1, L4).maxAlive, w10d: wavePlan(10, L4).maxAlive,
        tot1: wavePlan(1, L0).total, tot10: wavePlan(10, L4).total, monte: [1, 2, 3, 4, 5].every(function(w){ return aliveCap(w + 1, L0) >= aliveCap(w, L0); }),
        borne: LOCS.every(function(L){ for (var w = 1; w <= 40; w++) if (aliveCap(w, L) > DEV_CAP) return false; return true; }) };
    });
    ok(r.touch ? r.cap >= 150 : r.cap >= 300, 'Plafond de l’appareil trop bas : ' + r.cap);
    egal(r.w1, r.base, 'maxAlive de la vague 1 de Saint-Clou');
    ok(r.w5 > r.w1 && r.monte, 'maxAlive doit grandir avec la vague : ' + r.w1 + ' puis ' + r.w5);
    ok(r.w1d > r.w1, 'maxAlive doit grandir avec la ville');
    ok(r.borne && r.w10d <= r.cap, 'maxAlive dépasse le plafond de l’appareil : ' + r.w10d);
    egal(r.tot1, 30, 'Total de la vague 1 (inchangé)');
    egal(r.tot10, Math.round(30 * 10 * (1 + .15 * 4)) + 1, 'Total de la vague 10 du port (boss compris, inchangé)');
  });

  test('Foule : hordePlan prépare une vague énorme, la boucle respecte maxAlive', () => {
    exiger(); partie(); J(OUTILS);
    const r = J(function(){
      var p = hordePlan(3000, { wave: 8, loc: LOCS[2], maxAlive: 250, burst: 4, interval: .03 });
      var types = {}; p.queue.forEach(function(t){ types[t] = 1; });
      var res = { total: p.total, file: p.queue.length, max: p.maxAlive, burst: p.burst, types: Object.keys(types).length, boss: p.queue.indexOf('boss') };
      plan = p; spawnT = 0;
      var s = __t.sim(6, 1 / 30, __tp.barricade);
      res.maxVivants = s.maxVivants; res.reste = plan.queue.length; res.err = (window.__erreurs || []).length;
      clearZombies();
      return res;
    });
    egal(r.total, 3000, 'Total de la horde'); egal(r.file, 3000, 'File de la horde');
    ok(r.max <= lire('DEV_CAP') && r.max === Math.min(250, lire('DEV_CAP')), 'maxAlive de la horde : ' + r.max);
    ok(r.types >= 5, 'Mélange de types : ' + r.types); egal(r.boss, -1, 'Pas de boss dans hordePlan');
    ok(r.maxVivants <= r.max, 'Plus de zombies que maxAlive : ' + r.maxVivants);
    ok(r.maxVivants >= Math.min(150, r.max), 'La horde ne sort pas assez vite : ' + r.maxVivants + ' en vie au plus');
    ok(r.reste < 3000, 'La file n’a pas diminué');
    egal(r.err, 0, 'Erreurs JavaScript');
  });

  test('Foule : 300 zombies en vie sans erreur, dessinés en quelques appels', () => {
    exiger(); partie(); J(OUTILS);
    const r = J(function(){
      plan.maxAlive = 1e6; __tp.remplir(300, -105, -12); var avant = __t.vivants();
      var e0 = (window.__erreurs || []).length;
      S.owned.minigun = true; equip('minigun'); spin = 1; firing = true;
      var s = __t.sim(3, 1 / 30, function(){ S.bar = S.barMax; S.ammo[S.cur] = 999; reloadT = 0; return false; });
      firing = false; visuals(1 / 30);
      var res = { avant: avant, vivants: __t.vivants(), max: s.maxVivants, err: (window.__erreurs || []).length - e0, dessins: __zperf.draws(), lots: __zperf.batches(),
        instances: __zperf.instances(), enScene: __zperf.inScene(), cibles: hitMeshes.length, morts: zombies.length - __t.vivants(), pas: s.pas, etat: state };
      clearZombies();
      return res;
    });
    egal(r.etat, 'playing', 'État pendant la foule');
    egal(r.avant, 300, 'Zombies en vie au départ');
    ok(r.max >= 295, 'Pas 300 zombies en vie : ' + r.max);
    egal(r.err, 0, 'Erreurs JavaScript pendant la foule');
    egal(r.enScene, 0, 'Zombies dessinés en vrais objets dans la scène (au lieu des instances)');
    ok(r.dessins > 0 && r.dessins <= 24, 'Appels de dessin de la foule : ' + r.dessins);
    ok(r.instances > r.vivants * 5, 'Morceaux dessinés par instances : ' + r.instances);
    ok(r.cibles <= r.vivants + r.morts + 10, 'hitMeshes : une seule cible par zombie, obtenu ' + r.cibles + ' pour ' + r.vivants + ' vivants');
  });

  test('Foule : tir à la tête et point faible exacts près du joueur, même dans la foule', () => {
    exiger(); partie(); J(OUTILS);
    const r = J(function(){
      plan.maxAlive = 1e6; __tp.remplir(250, -110, -40); zInstSync();
      var w = __t.placer('walker', 0, -20); w.hp = w.maxHp = 1e6;
      __t.viser(w, true); var m0 = S.money, h0 = w.hp; fire(); var tete = h0 - w.hp, corps0;
      __t.viser(w, false); h0 = w.hp; fire(); corps0 = h0 - w.hp;
      // Point faible : plaque du colosse
      var c = __t.placer('colossus', 4, -24); c.hp = c.maxHp = 1e6;
      var plaque = c.meshes.filter(function(m){ return m.userData.weak; })[0];
      plaque.updateMatrixWorld(true); var pc = new THREE.Vector3(); new THREE.Box3().setFromObject(plaque).getCenter(pc);
      var wk0 = c.wkHits || 0; __tp.tirerSur(pc, 'pistol', 1);
      // Un walker tué d'une balle à la tête perd sa tête
      var k = __t.placer('walker', -3, -18); __t.viser(k, true); fire();
      var res = { tete: tete, corps: corps0, faible: (c.wkHits || 0) - wk0, mort: !!k.dead, sansTete: !!k.headGone, inst: !!w.inst && !!c.inst };
      clearZombies(); return res;
    });
    ok(r.inst, 'Les zombies proches devraient passer par les instances');
    ok(r.corps > 0, 'Le tir au corps n’a rien fait');
    ok(r.tete > r.corps * 2, 'Tir à la tête : ' + r.tete + ' contre ' + r.corps + ' au corps');
    ok(r.faible >= 1, 'La plaque du colosse n’est pas touchée comme point faible');
    ok(r.mort && r.sansTete, 'Le marcheur tué à la tête devrait mourir sans tête');
  });

  test('Foule : un zombie lointain (modèle simplifié) est touchable et meurt', () => {
    exiger(); partie(); J(OUTILS);
    const r = J(function(){
      plan.maxAlive = 1e6; __tp.remplir(120, -110, -70);
      var z = __t.placer('walker', 2, -95); z.speed = 0;
      __t.sim(.5, 1 / 30, __tp.barricade); zInstSync(); zInstSync(); // le modèle lointain est en place
      var loin = !!z._rel, hp0 = z.hp, n = 0;
      while (!z.dead && n < 30){ __tp.tirerSur(__tp.centre(z), 'sniper', 1); n++; }
      var res = { loin: loin, touche: z.hp < hp0 || z.dead, mort: !!z.dead, tirs: n, dist: Math.round(-z.g.position.z) };
      clearZombies(); return res;
    });
    ok(r.loin, 'Le zombie à ' + r.dist + ' m devrait utiliser le modèle lointain');
    ok(r.touche, 'Le zombie lointain n’est pas touché');
    ok(r.mort, 'Le zombie lointain ne meurt pas après ' + r.tirs + ' tirs');
  });

  test('Foule : flash rouge par couleur d’instance, matériaux bornés', () => {
    exiger(); partie(); J(OUTILS);
    const r = J(function(){
      var z = __t.placer('walker', 0, -20); zInstSync();
      var e = z.inst.filter(function(x){ return x.fl; })[0], b = e.b, base = e.mat.color.r;
      damage(z, 1, false, z.g.position.clone()); zInstSync();
      var j = -1; for (var i = 0; i < b.n; i++){ if (Math.abs(b.im.instanceColor.array[i * 3] - e.mat.userData.hitC.r) < 1e-6) j = i; }
      var res = { flash: j >= 0, base: base };
      z.flashT = 0; zInstSync();
      var m0 = __zperf.mats(); __tp.remplir(200, -100, -30); zInstSync(); var m1 = __zperf.mats();
      clearZombies(); __tp.remplir(200, -100, -30); zInstSync(); var m2 = __zperf.mats();
      res.m0 = m0; res.m1 = m1; res.m2 = m2; res.lots = __zperf.batches();
      clearZombies(); return res;
    });
    ok(r.flash, 'La couleur d’instance ne passe pas au rouge quand le zombie est touché');
    ok(r.m1 <= 40, 'Trop de matériaux de zombies : ' + r.m1);
    egal(r.m2, r.m1, 'Les matériaux ne doivent pas grandir avec de nouveaux zombies');
    ok(r.lots <= 24, 'Trop de lots d’instances : ' + r.lots);
  });

  test('Foule : pas de fuite après plusieurs vagues (objets de la scène, cibles, lots)', () => {
    exiger(); partie(); J(OUTILS);
    const r = J(function(){
      var mesures = [];
      for (var v = 0; v < 4; v++){
        plan.maxAlive = 1e6; __tp.remplir(150, -100, -20);
        __t.sim(.3, 1 / 30, __tp.barricade);
        zombies.slice().forEach(function(z){ if (!z.dead) damage(z, 1e9, false, z.g.position.clone()); });
        __t.sim(4, 1 / 30, __tp.barricade); visuals(1 / 30);
        mesures.push({ scene: __zperf.sceneCount(), cibles: hitMeshes.length, zombies: zombies.length, lots: __zperf.batches(), mats: __zperf.mats(), instances: __zperf.instances() });
      }
      clearZombies(); return mesures;
    });
    const a = r[1], b = r[r.length - 1];
    egal(b.zombies, 0, 'Corps restants après la vague');
    egal(b.instances, 0, 'Instances dessinées sans zombie');
    egal(b.scene, a.scene, 'Objets dans la scène entre la 2e et la dernière vague');
    egal(b.cibles, a.cibles, 'Cibles (hitMeshes)');
    egal(b.lots, a.lots, 'Lots d’instances');
    egal(b.mats, a.mats, 'Matériaux');
  });

  test('Foule : compteur d’images/s dans l’écran Pause, désactivé par défaut et sauvegardé', () => {
    exiger(); reset();
    const r = J(function(){
      try { localStorage.removeItem('dt_fps'); } catch (e) {}
      var b = document.getElementById('btnFps'), dansPause = !!b && !!b.closest('#scrPause');
      var res = { dansPause: dansPause, defaut: __zperf.fpsOn, txt0: b ? b.textContent : '' };
      if (b) b.click();
      var box = document.getElementById('fpsBox');
      res.on = __zperf.fpsOn; res.sauve = localStorage.getItem('dt_fps'); res.vis = !!box && box.style.display !== 'none';
      if (b) b.click();
      res.off = __zperf.fpsOn; res.sauve2 = localStorage.getItem('dt_fps'); res.cache = !!box && box.style.display === 'none';
      return res;
    });
    ok(r.dansPause, 'Bouton du compteur absent de l’écran Pause');
    ok(!r.defaut, 'Le compteur devrait être désactivé par défaut');
    ok(r.on && r.vis && r.sauve === 'true', 'Activation : ' + JSON.stringify(r));
    ok(!r.off && r.cache && r.sauve2 === 'false', 'Désactivation : ' + JSON.stringify(r));
  });

  // Les tests ajoutés passent avant le test final « Erreurs »
  const ajoutes = TESTS.splice(avant);
  const iErr = TESTS.findIndex(t => t.nom.indexOf('Erreurs') === 0);
  TESTS.splice(iErr < 0 ? TESTS.length : iErr, 0, ...ajoutes);
})();
