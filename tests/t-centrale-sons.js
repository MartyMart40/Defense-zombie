'use strict';
/* Tests du dossier 123 : sons de la Centrale (js/76-centrale-sons.js) : fond du lieu seulement à la Centrale (arrêté en pause
   et en quittant), compteur Geiger de l'irradié, flaque, moments du Cœur, alarme des vagues de boss, sons d'emprunt de
   js/71-centrale.js muets, son coupé, rien qui fuit, hasard du jeu intact.
   Comme tests/t-sons.js : l'AudioContext reste suspendu (rien ne s'entend) et Snd.on n'est mis à vrai que le temps du test. */
(function(){
  if (typeof test !== 'function' || typeof TESTS === 'undefined') return;
  const exiger = () => {
    if (lire('typeof __centraleSons === "object" && typeof __centrale === "object" && __centrale.idx >= 0') !== true) ignorer('Sons de la Centrale absents (js/76-centrale-sons.js)');
    if (J(function(){ if (!Snd.ctx) Snd.init(); return !!(Snd.ctx && Snd.master && Snd.noise); }) !== true) ignorer('Pas d’audio dans ce navigateur');
  };
  // Lance fn dans le jeu avec le son actif, puis remet tout (sortie de la Centrale, voix vidées)
  const sonActif = fn => {
    try { return J(function(src){ var on0 = Snd.on; Snd.on = true; try { return eval('(' + src + ')')(); } finally { Snd.on = on0; } }, fn.toString()); }
    finally { J(function(){ state = 'test'; __centraleSons.ctsImage(1 / 30); __centraleSons.ctsSortie(); Snd.voix = []; }); }
  };
  // Départ à la Centrale, vague en cours, sans apparitions
  const DEPART = 'function(){ startLocation(__centrale.idx); startWave(); __t.geler(); clearZombies(); state = "playing"; showScreen(null); }';
  const avecDepart = fn => fn.toString().replace('DEPART_SRC', JSON.stringify(DEPART));

  test('Centrale, sons : le fond joue seulement à la Centrale (fait une fois), à la boutique aussi, s’arrête en pause et en quittant', () => {
    exiger(); reset();
    const r = sonActif(avecDepart(function(){
      var C = __centraleSons.CTS, dt = 1 / 30, o = {}, i, f0 = C.n.fonds, j0 = (window.JOURNAL || []).length;
      (0, eval)('(' + DEPART_SRC + ')')();
      for (i = 0; i < 4; i++) visuals(dt);
      var F = C.fond; o.ici = !!F;
      for (i = 0; i < 30; i++) visuals(dt);
      o.meme = C.fond === F; o.crees = C.n.fonds - f0;
      state = 'paused'; visuals(dt); o.pause = !C.fond; o.voixPause = C.voix.length;
      state = 'playing'; visuals(dt); o.reprise = !!C.fond;
      state = 'shop'; visuals(dt); o.boutique = !!C.fond;
      state = 'over'; visuals(dt); o.fin = !C.fond;
      state = 'playing'; visuals(dt);
      // Une autre ville : plus rien
      startLocation(4); __t.geler(); clearZombies(); state = 'playing'; visuals(dt); visuals(dt);
      o.port = !C.fond && !C.gei && !C.gri; o.voixPort = C.voix.length;
      startLocation(__centrale.idx); __t.geler(); clearZombies(); state = 'playing'; visuals(dt); o.retour = !!C.fond;
      state = 'menu'; visuals(dt); o.menu = !C.fond;
      o.journal = (window.JOURNAL || []).length - j0;
      return o;
    }));
    ok(r.ici, 'Le fond joue à la Centrale');
    ok(r.meme && r.crees === 1, 'Fait une seule fois, pas recréé à chaque image (' + r.crees + ')');
    ok(r.pause, 'Arrêté en pause'); egal(r.voixPause, 0, 'Voix de la Centrale coupées net en pause');
    ok(r.reprise, 'Repart à la reprise'); ok(r.boutique, 'Continue à la boutique, comme l’ambiance de la météo');
    ok(r.fin, 'Arrêté à la fin de la partie');
    ok(r.port, 'Rien au Port'); egal(r.voixPort, 0, 'Aucune voix de la Centrale au Port');
    ok(r.retour, 'Repart en revenant à la Centrale'); ok(r.menu, 'Arrêté au menu');
    egal(r.journal, 0, 'Erreurs gardées dans JOURNAL');
  });

  test('Centrale, sons : le compteur Geiger crépite plus vite quand l’irradié approche, et se tait sans irradié', () => {
    exiger(); reset();
    const r = sonActif(avecDepart(function(){
      var CS = __centraleSons, C = CS.CTS, dt = 1 / 30, o = {};
      (0, eval)('(' + DEPART_SRC + ')')();
      visuals(dt); o.sansIrr = !C.gei;
      var z = __t.placer('irradie', 3, -55); visuals(dt);
      var I = CS.ctsIrradies(); o.pLoin = I ? I.p : -1; o.gei = !!C.gei;
      var R = CS.CTS_REGL.geiger, taux = function(p){ return R.min + (R.max - R.min) * Math.pow(p, 1.6); };
      var t0 = Snd.ctx.currentTime; C.geiT = t0; o.nLoin = CS.ctsGeigerPlanifier(taux(o.pLoin), t0 + 2);
      z.g.position.z = BAR_Z - 2; visuals(dt);
      I = CS.ctsIrradies(); o.pPres = I ? I.p : -1;
      C.geiT = t0; o.nPres = CS.ctsGeigerPlanifier(taux(o.pPres), t0 + 2);
      // Trop loin (pas encore dans la rue) : rien
      z.g.position.z = -120; visuals(dt); o.horsVue = !C.gei;
      z.g.position.z = -30; visuals(dt); o.revient = !!C.gei;
      state = 'paused'; visuals(dt); o.pause = !C.gei;
      state = 'playing'; z.dead = true; visuals(dt); o.mort = !C.gei;
      clearZombies();
      return o;
    }));
    ok(r.sansIrr, 'Pas de Geiger sans irradié');
    ok(r.gei, 'Le Geiger part quand un irradié est dans la rue');
    ok(r.pPres > r.pLoin && r.pPres > .9, 'Proximité : ' + r.pLoin.toFixed(2) + ' loin, ' + r.pPres.toFixed(2) + ' à la barricade');
    ok(r.nPres > r.nLoin * 3, 'Plus de coups près de la barricade : ' + r.nLoin + ' puis ' + r.nPres + ' en 2 s');
    ok(r.horsVue && r.revient, 'Rien quand il est hors de la rue, repart quand il y entre');
    ok(r.pause, 'Arrêté en pause'); ok(r.mort, 'Arrêté quand il n’y a plus d’irradié');
  });

  test('Centrale, sons : la flaque qui se forme, puis le grésillement tant qu’elle ronge la barricade', () => {
    exiger(); reset();
    const r = sonActif(avecDepart(function(){
      var C = __centraleSons.CTS, dt = 1 / 30, o = {}, i;
      (0, eval)('(' + DEPART_SRC + ')')();
      visuals(dt);
      var n0 = C.n.nees, g0 = C.n.grisCrees;
      var z = __t.placer('irradie', 0, -40); damage(z, 1e9, false, z.g.position.clone());
      visuals(dt); visuals(dt); o.neeLoin = C.n.nees - n0; o.grisLoin = !!C.gri;
      z = __t.placer('irradie', 2, BAR_Z - 1); damage(z, 1e9, false, z.g.position.clone());
      visuals(dt); o.neePres = C.n.nees - n0; o.gris = !!C.gri;
      for (i = 0; i < 20; i++) visuals(dt);
      o.uneFois = C.n.nees - n0; o.grisCrees = C.n.grisCrees - g0;
      state = 'paused'; visuals(dt); o.pause = !C.gri; state = 'playing'; visuals(dt); o.reprise = !!C.gri;
      __t.sim(7); visuals(dt); o.fini = !C.gri;
      clearZombies();
      return o;
    }));
    egal(r.neeLoin, 1, 'Un son quand la flaque se forme loin'); ok(!r.grisLoin, 'Loin de la barricade : pas de grésillement');
    egal(r.neePres, 2, 'Un son pour la flaque contre la barricade'); ok(r.gris, 'Grésillement tant qu’elle ronge');
    egal(r.uneFois, 2, 'Pas joué en double'); egal(r.grisCrees, 1, 'Grésillement fait une fois');
    ok(r.pause && r.reprise, 'Arrêté en pause, repart à la reprise'); ok(r.fini, 'Se tait quand la flaque s’efface');
  });

  test('Centrale, sons : le Cœur (arrivée, pulsation, tir absorbé, transformateurs, bouclier, mort), chacun une fois, sans son d’emprunt', () => {
    exiger(); reset();
    const r = sonActif(function(){
      var CS = __centraleSons, C = CS.CTS, Ct = __centrale, dt = 1 / 30, o = {}, i, n = C.n, j0 = (window.JOURNAL || []).length;
      startLocation(Ct.idx); S.wave = 12; plan = wavePlan(12); plan.queue = ['walker']; spawnT = 1e9; state = 'playing'; showScreen(null);
      visuals(dt);
      var a0 = n.arrivees, p0 = n.pouls, b0 = n.absorbes, t0 = n.transfos, f0 = n.tombes, m0 = n.morts;
      var z = spawnZombie('boss'); visuals(dt); visuals(dt); o.arrivee = n.arrivees - a0;
      o.humFort = C.hum;
      for (i = 0; i < 70; i++) visuals(dt);
      o.pouls = n.pouls - p0;
      // Battements plus rapides quand sa vie baisse
      z.hp = z.maxHp; C.poulsT = 0; visuals(dt); var lent = C.poulsT;
      z.hp = z.maxHp * .05; C.poulsT = 0; visuals(dt); var vite = C.poulsT; o.lent = lent; o.vite = vite;
      // Tir absorbé par le bouclier
      C.absT = -9; damage(z, 500, false, z.g.position.clone()); visuals(dt); o.absorbe = n.absorbes - b0;
      // Un transformateur détruit : aucun son d'emprunt de js/71 (rien ne joue dans ctrTransfoDetruit), le sien à l'image suivante
      var v0 = Snd.voixN, T = Ct.CT.transfos; Ct.ctrTransfoTouche(T[0], null, 1e12); o.emprunt = Snd.voixN - v0;
      visuals(dt); visuals(dt); o.transfo1 = n.transfos - t0; o.humUnCran = C.hum;
      Ct.ctrTransfoTouche(T[1], null, 1e12); Ct.ctrTransfoTouche(T[2], null, 1e12); visuals(dt);
      o.transfos = n.transfos - t0; o.tombe = n.tombes - f0;
      // À nu : les tirs ne sont plus absorbés
      var b1 = n.absorbes; C.absT = -9; damage(z, 500, false, z.g.position.clone()); visuals(dt); o.absorbeANu = n.absorbes - b1;
      damage(z, 1e12, true, z.g.position.clone()); visuals(dt); visuals(dt);
      for (i = 0; i < 30; i++) visuals(dt);
      o.mort = n.morts - m0; o.humMort = C.hum; o.arrivee2 = n.arrivees - a0; o.tombe2 = n.tombes - f0; o.transfos2 = n.transfos - t0;
      clearZombies(); state = 'test';
      o.journal = (window.JOURNAL || []).length - j0;
      return o;
    });
    egal(r.arrivee, 1, 'Son d’arrivée du Cœur');
    ok(r.pouls >= 1, 'Pulsation tant qu’il vit : ' + r.pouls);
    ok(r.vite < r.lent, 'Plus rapide quand sa vie baisse : ' + r.lent.toFixed(2) + ' s puis ' + r.vite.toFixed(2) + ' s');
    egal(r.absorbe, 1, 'Son du tir absorbé');
    egal(r.emprunt, 0, 'Le son d’emprunt de js/71 ne joue plus');
    egal(r.transfo1, 1, 'Son du transformateur détruit');
    ok(r.humUnCran < r.humFort, 'Le bourdonnement baisse d’un cran : ' + r.humFort + ' puis ' + r.humUnCran);
    egal(r.transfos, 3, 'Un son par transformateur'); egal(r.tombe, 1, 'Son du bouclier qui tombe');
    egal(r.absorbeANu, 0, 'À nu : plus de son d’absorption');
    egal(r.mort, 1, 'Son de mort');
    ok(r.humMort < r.humUnCran, 'Bourdonnement presque éteint après sa mort : ' + r.humMort);
    ok(r.arrivee2 === 1 && r.tombe2 === 1 && r.transfos2 === 3, 'Aucun moment joué en double');
    egal(r.journal, 0, 'Erreurs gardées dans JOURNAL');
  });

  test('Centrale, sons : alarme des gyrophares au début d’une vague de boss seulement ; la sirène d’emprunt se tait', () => {
    exiger(); reset();
    const r = sonActif(function(){
      var C = __centraleSons.CTS, Ct = __centrale, dt = 1 / 30, o = {};
      startLocation(Ct.idx); state = 'playing'; showScreen(null); visuals(dt);
      var s0 = C.n.sirenes;
      S.wave = 4; startWave(); state = 'playing'; o.vague5 = S.wave; o.boss5 = plan.queue.indexOf('boss') >= 0; visuals(dt); visuals(dt); o.boss = C.n.sirenes - s0;
      clearZombies(); S.wave = 5; startWave(); state = 'playing'; visuals(dt); visuals(dt); o.sansBoss = C.n.sirenes - s0 - o.boss;
      // Sirène d'emprunt de js/71 : la minuterie tourne et tire son nombre, mais Snd.tone n'est plus appelé
      var t0 = Snd.tone, k = 0; Snd.tone = function(f){ if (f === 430 || f === 610) k++; return t0.apply(this, arguments); };
      try { Ct.CT.sirT = 0; visuals(dt); } finally { Snd.tone = t0; }
      o.emprunt = k; o.minuterie = Ct.CT.sirT > 20;
      clearZombies(); state = 'test';
      return o;
    });
    ok(r.boss5, 'La vague 5 de la Centrale a un boss');
    egal(r.boss, 1, 'Alarme au début de la vague de boss'); egal(r.sansBoss, 0, 'Pas d’alarme sans boss');
    egal(r.emprunt, 0, 'La sirène d’emprunt de js/71 ne joue plus'); ok(r.minuterie, 'Sa minuterie tourne toujours (hasard inchangé)');
  });

  test('Centrale, sons : son coupé, aucun nœud ; le hasard du jeu (Math.random) n’est jamais touché', () => {
    exiger(); reset();
    // Son coupé : rien ne se crée
    const coupe = J('(' + avecDepart(function(){
      var C = __centraleSons.CTS, dt = 1 / 30, on0 = Snd.on; Snd.on = false;
      try {
        (0, eval)('(' + DEPART_SRC + ')')();
        var v0 = Snd.voixN, f0 = C.n.fonds; __t.placer('irradie', 0, BAR_Z - 2); for (var i = 0; i < 10; i++) visuals(dt);
        var o = { fond: !!C.fond, gei: !!C.gei, voix: Snd.voixN - v0, crees: C.n.fonds - f0, arc: __centraleSons.ctsArc(1) };
        clearZombies(); return o;
      } finally { Snd.on = on0; }
    }) + ')()');
    ok(!coupe.fond && !coupe.gei && coupe.crees === 0, 'Son coupé : ni fond ni Geiger');
    egal(coupe.voix, 0, 'Son coupé : aucune voix'); ok(!coupe.arc, 'Son coupé : un son court ne joue pas');
    // Chaque son de la Centrale, joué avec le son actif : Math.random n'est jamais appelé
    const r = sonActif(avecDepart(function(){
      var CS = __centraleSons, C = CS.CTS, dt = 1 / 30, o = {};
      (0, eval)('(' + DEPART_SRC + ')')();
      var z = __t.placer('irradie', 2, BAR_Z - 1); damage(z, 1e9, false, z.g.position.clone()); __t.placer('irradie', 0, -20);
      var faux = { g: { position: new THREE.Vector3(0, 0, -30) }, hp: .5, maxHp: 1 }, R0 = Math.random, k = 0;
      Math.random = function(){ k++; return R0(); };
      try {
        C.buf = null;
        for (var i = 0; i < 30; i++) CS.ctsImage(dt);
        CS.ctsArc(-1); CS.ctsFlaqueNee({ x: 0, z: -12, ronge: true }); CS.ctsCoeurArrive(faux); CS.ctsPouls(faux, false); CS.ctsPouls(faux, true);
        CS.ctsAbsorbe(faux); CS.ctsTransfo({ x: -15.6, z: -30 }); CS.ctsBouclierTombe(faux); CS.ctsCoeurMort(faux); CS.ctsSirene();
        o.gei = !!C.gei; o.gri = !!C.gri; o.fond = !!C.fond;
      } finally { Math.random = R0; }
      o.appels = k; clearZombies();
      return o;
    }));
    ok(r.fond && r.gei && r.gri, 'Fond, Geiger et grésillement joués pendant la mesure');
    egal(r.appels, 0, 'Appels à Math.random par les sons de la Centrale');
  });

  test('Centrale, sons : rien ne fuit (entrer et sortir 6 fois), voix dans le budget de Snd', () => {
    exiger(); reset();
    const r = sonActif(avecDepart(function(){
      var CS = __centraleSons, C = CS.CTS, dt = 1 / 30, o = { voixMax: 0 }, f0 = C.n.fonds;
      for (var k = 0; k < 6; k++){
        (0, eval)('(' + DEPART_SRC + ')')();
        __t.placer('irradie', 0, -20);
        for (var i = 0; i < 6; i++){ visuals(dt); CS.ctsArc(1); CS.ctsAbsorbe(null); o.voixMax = Math.max(o.voixMax, Snd.voix.length); }
        clearZombies(); startLocation(0); __t.geler(); state = 'playing'; visuals(dt);
      }
      o.crees = C.n.fonds - f0; o.fond = !!C.fond; o.gei = !!C.gei; o.gri = !!C.gri; o.voix = C.voix.length; o.max = Snd.VOIX_MAX;
      state = 'test';
      return o;
    }));
    egal(r.crees, 6, 'Un fond par entrée à la Centrale');
    ok(!r.fond && !r.gei && !r.gri, 'Tout est arrêté en quittant');
    egal(r.voix, 0, 'Aucune voix de la Centrale gardée après coup');
    ok(r.voixMax <= r.max, 'Voix de Snd sous le plafond : ' + r.voixMax + ' (plafond ' + r.max + ')');
  });
})();
