'use strict';
/* Tests du dossier 116 : sons du mode robot (js/70-robot-sons.js) : pas sur le vrai pied, fond de la machine, alarmes du
   tableau de bord, armes vues de l'intérieur, coque, moments, son coupé, nœuds qui ne s'accumulent pas, mixage.
   Comme tests/t-sons.js : l'AudioContext reste suspendu (rien ne s'entend) et Snd.on n'est mis à vrai que le temps du test. */
(function(){
  if (typeof test !== 'function' || typeof TESTS === 'undefined') return;
  const exiger = () => {
    if (lire('typeof __rsn === "object" && typeof __mech === "object" && typeof __habitacle === "object" && typeof __mb === "object"') !== true) ignorer('Sons du robot absents (js/70-robot-sons.js)');
    if (J(function(){ if (!Snd.ctx) Snd.init(); return !!(Snd.ctx && Snd.master); }) !== true) ignorer('Pas d’audio dans ce navigateur');
  };
  const sonActif = fn => J(function(src){ var on0 = Snd.on; Snd.on = true; try { return eval('(' + src + ')')(); } finally { Snd.on = on0; } }, fn.toString());
  const fin = () => J(function(){ if (__mech.MECH.on) __mech.mechQuit(); __rsn.rsnImage(1 / 30); Snd.voix = []; });
  // Départ du robot sans zombies ni vagues
  const DEPART = 'function(){ __habitacle.vue("complet"); __mech.mechStart(); plan.queue = ["walker"]; spawnT = 1e9; clearZombies(); __mb.MB.waveT = 1e9; __mech.MECH.autoFire = false; __mech.MECH.mini = false; __mech.MECH.aim.id = null; }';

  test('Robot, sons : un pas lourd quand un pied se pose (pas à l’arrêt), gauche et droite alternés, plus fort en courant', () => {
    exiger(); reset();
    const r = sonActif(function(){
      var R = __rsn.RSN, H = __habitacle, M = __mech.MECH, dt = 1 / 30, o = {}, i;
      (0, eval)('(' + DEPART_SRC + ')')();
      for (i = 0; i < 5; i++) visuals(dt);
      var p0 = R.pas, h0 = H.HB.pas, v0 = Snd.voixN, g0 = R.grinces, pans = [];
      M.mv.f = 1;
      for (i = 0; i < 120; i++){ var a = R.pas; visuals(dt); if (R.pas > a) pans.push(R.dernierPan); }
      o.kVite = R.dernierK;
      M.mv.f = 0;
      o.pas = R.pas - p0; o.hb = H.HB.pas - h0; o.voix = Snd.voixN - v0; o.grinces = R.grinces - g0;
      o.alterne = pans.length > 3 && pans.every(function(x, k){ return k === 0 || Math.sign(x) !== Math.sign(pans[k - 1]); });
      o.pan = pans.length ? Math.abs(pans[0]) : 0;
      for (i = 0; i < 90; i++) visuals(dt);
      var pa = R.pas; for (i = 0; i < 60; i++) visuals(dt); o.arret = R.pas - pa;
      // Marche lente (manette tactile à moitié)
      M.joy.dy = -.3; for (i = 0; i < 90; i++) visuals(dt); o.kLent = R.dernierK; M.joy.dy = 0;
      return o;
    }.toString().replace('DEPART_SRC', JSON.stringify(DEPART)));
    fin();
    ok(r.pas >= 4, 'Des pas en marchant 4 s : ' + r.pas);
    egal(r.pas, r.hb, 'Un pas sonore par pied posé (jambes de js/40-robot-habitacle.js)');
    ok(r.voix >= r.pas, 'Chaque pas joue dans une voix du budget : ' + r.voix + ' voix pour ' + r.pas + ' pas');
    egal(r.arret, 0, 'À l’arrêt, plus aucun pas');
    ok(r.alterne, 'Pied gauche et pied droit à tour de rôle (panoramique)');
    ok(r.pan > .1 && r.pan < .5, 'Panoramique léger : ' + r.pan);
    ok(r.grinces > 0, 'Grincement de vérin entre deux pas');
    ok(r.kVite > r.kLent, 'Plus fort en marchant vite : ' + r.kLent.toFixed(2) + ' puis ' + r.kVite.toFixed(2));
  });

  test('Robot, sons : le fond de la machine tourne dans le robot (fait une fois), s’arrête en pause, à la fin et en quittant', () => {
    exiger(); reset();
    const r = sonActif(function(){
      var R = __rsn.RSN, M = __mech.MECH, dt = 1 / 30, o = {}, i, c0 = R.fondCrees;
      (0, eval)('(' + DEPART_SRC + ')')();
      for (i = 0; i < 3; i++) visuals(dt);
      var F = R.fond; o.dans = !!F;
      M.mv.f = 1; M.turn = 1; for (i = 0; i < 40; i++) visuals(dt); M.mv.f = 0; M.turn = 0;
      o.meme = R.fond === F; o.crees = R.fondCrees - c0; o.servo = R.servo > 0;
      __mech.mechPause(); visuals(dt); o.pause = !R.fond; o.voixPause = R.voix.length;
      __mech.mechResume(); visuals(dt); o.reprise = !!R.fond;
      var e0 = R.extinctions; state = 'mechover'; visuals(dt); o.fin = !R.fond; o.ext = R.extinctions - e0;
      __mech.mechStart(); plan.queue = ['walker']; spawnT = 1e9; __mb.MB.waveT = 1e9; visuals(dt); o.encore = !!R.fond;
      __mech.mechQuit(); visuals(dt); o.quitte = !R.fond; o.voixQuitte = R.voix.length;
      // Sur le toit, rien
      state = 'playing'; __rsn.rsnImage(dt); o.toit = !R.fond; state = 'test';
      return o;
    }.toString().replace('DEPART_SRC', JSON.stringify(DEPART)));
    fin();
    ok(r.dans, 'Le fond tourne dans le robot');
    ok(r.meme && r.crees === 1, 'Fait une seule fois, pas recréé à chaque image (' + r.crees + ')');
    ok(r.servo, 'Servomoteurs quand le torse tourne');
    ok(r.pause, 'Arrêté en pause'); egal(r.voixPause, 0, 'Voix du robot coupées net en pause');
    ok(r.reprise, 'Repart à la reprise');
    ok(r.fin, 'Arrêté à la fin de la course'); egal(r.ext, 1, 'Robot détruit : extinction de la machine (une fois)');
    ok(r.encore, 'Repart à la course suivante');
    ok(r.quitte, 'Arrêté en quittant le robot'); egal(r.voixQuitte, 0, 'Voix du robot coupées net en quittant');
    ok(r.toit, 'Rien sur le toit');
  });

  test('Robot, sons : alarme de surchauffe à 75 % et alerte de blindage sous 30 %, une seule fois, réarmées', () => {
    exiger(); reset();
    const r = sonActif(function(){
      var R = __rsn.RSN, M = __mech.MECH, dt = 1 / 30, o = {}, i;
      (0, eval)('(' + DEPART_SRC + ')')();
      for (i = 0; i < 3; i++) visuals(dt);
      var tenir = function(h, n){ for (var k = 0; k < n; k++){ M.heat = h; visuals(dt); } };
      var a0 = R.alarmesChaud, b0 = R.bipsChaud;
      tenir(.7, 20); o.sous = R.alarmesChaud - a0;
      tenir(.8, 60); o.alarme = R.alarmesChaud - a0; o.bipsLent = R.bipsChaud - b0;
      var b1 = R.bipsChaud; tenir(.97, 60); o.bipsVite = R.bipsChaud - b1;
      tenir(.6, 10); tenir(.9, 10); o.pasRearme = R.alarmesChaud - a0;
      tenir(.4, 10); tenir(.8, 10); o.rearme = R.alarmesChaud - a0;
      var c0 = R.coupures; M.heat = 1; M.hot = 2; visuals(dt); visuals(dt); o.coupure = R.coupures - c0; M.hot = 0; M.heat = 0; visuals(dt);
      // Blindage
      var tenirB = function(k, n){ for (var j = 0; j < n; j++){ S.bar = S.barMax * k; visuals(dt); } };
      var d0 = R.alertesBas, e0 = R.bipsBas;
      tenirB(.5, 10); o.bSous = R.alertesBas - d0;
      tenirB(.25, 150); o.bAlerte = R.alertesBas - d0; o.bBips = R.bipsBas - e0;
      tenirB(.35, 10); tenirB(.2, 10); o.bPasRearme = R.alertesBas - d0;
      tenirB(.45, 5); tenirB(.25, 5); o.bRearme = R.alertesBas - d0;
      S.bar = S.barMax;
      return o;
    }.toString().replace('DEPART_SRC', JSON.stringify(DEPART)));
    fin();
    egal(r.sous, 0, 'Rien sous 75 % de chaleur');
    egal(r.alarme, 1, 'Alarme de surchauffe au passage de 75 %, une fois');
    ok(r.bipsLent >= 3, 'Bips qui continuent tant que ça chauffe : ' + r.bipsLent);
    ok(r.bipsVite > r.bipsLent, 'Les bips accélèrent avant la coupure : ' + r.bipsLent + ' puis ' + r.bipsVite + ' en 2 s');
    egal(r.pasRearme, 1, 'Pas de nouvelle alarme tant que la chaleur ne repasse pas sous 50 %');
    egal(r.rearme, 2, 'Réarmée sous 50 %');
    egal(r.coupure, 1, 'Coupure (vapeur) quand le bras surchauffe');
    egal(r.bSous, 0, 'Rien à 50 % de blindage');
    egal(r.bAlerte, 1, 'Alerte de blindage sous 30 %, une fois');
    ok(r.bBips >= 2 && r.bBips <= 5, 'Bip lent du blindage bas (5 s) : ' + r.bBips);
    egal(r.bPasRearme, 1, 'Pas de nouvelle alerte entre 30 et 40 %');
    egal(r.bRearme, 2, 'Réarmée au-dessus de 40 %');
  });

  test('Robot, sons : armes du robot et coque à la place des sons du toit (dans le robot seulement), moments de la course', () => {
    exiger(); reset();
    const r = sonActif(function(){
      var R = __rsn.RSN, M = __mech.MECH, dt = 1 / 30, o = {}, i;
      (0, eval)('(' + DEPART_SRC + ')')();
      for (i = 0; i < 3; i++) visuals(dt);
      var t0 = R.tirs, n0 = Snd.shotN;
      o.rocket = Snd.shot('rocket'); ['gl', 'railgun', 'flamer', 'laser', 'arc'].forEach(function(k){ Snd.shot(k); });
      o.tirs = R.tirs - t0; o.shotN = Snd.shotN - n0;
      var t1 = R.tirs; Snd.shot('pistol'); o.pistol = R.tirs - t1;
      var q0 = R.coques, th0 = Snd.thudN; Snd.thud(2.4); o.coque = R.coques - q0; o.thudN = Snd.thudN - th0;
      // Moments (lecture de l'état seulement)
      var m = { rues: R.rues, renforts: R.renforts, carrefours: R.carrefours, choix: R.choix, titans: R.titans, appels: R.appels, frappes: R.frappes, victoires: R.victoires };
      M.renf = (M.renf || 0) + 1; __rsn.rsnImage(dt);
      M.choosing = true; M.paused = true; __rsn.rsnImage(dt); M.choosing = false; M.paused = false; __rsn.rsnImage(dt);
      M.street++; __rsn.rsnImage(dt);
      M.finBoss = { dead: false }; __rsn.rsnImage(dt); __rsn.rsnImage(dt);
      M.finMoitie = true; __rsn.rsnImage(dt);
      __mb.MB.stomps++; __rsn.rsnImage(dt);
      M.won = true; state = 'mechover'; __rsn.rsnImage(dt); __rsn.rsnImage(dt);
      Object.keys(m).forEach(function(k){ o[k] = R[k] - m[k]; });
      M.finBoss = null; M.finMoitie = false; M.won = false;
      __mech.mechQuit(); __rsn.rsnImage(dt);
      // Hors du robot : le son du toit, pas celui du robot
      state = 'test'; var t2 = R.tirs, q1 = R.coques; Snd.shot('rocket'); Snd.thud(1); o.toitTirs = R.tirs - t2; o.toitCoque = R.coques - q1;
      return o;
    }.toString().replace('DEPART_SRC', JSON.stringify(DEPART)));
    fin();
    egal(r.rocket, true, 'Snd.shot rend true pour une arme du robot');
    egal(r.tirs, 6, 'Les 6 armes de bras ont leur son vu de l’intérieur');
    egal(r.shotN, 6, 'Chaque coup compté une fois (pas de deuxième son par-dessus)');
    egal(r.pistol, 0, 'Une arme du toit garde son son');
    egal(r.coque, 1, 'Coup reçu : la coque sonne'); egal(r.thudN, 1, 'Compté comme un coup (js/37 ne le rejoue pas)');
    egal(r.renforts, 1, '« Renforts ! »'); egal(r.carrefours, 1, 'Arrivée au carrefour'); egal(r.choix, 1, 'Choix de la rue');
    egal(r.rues, 1, 'Début de la rue suivante'); egal(r.titans, 1, 'Arrivée du Titan roi (une fois)'); egal(r.appels, 1, 'Appel du Titan roi à mi-vie');
    egal(r.frappes, 1, 'Frappe au sol du Titan'); egal(r.victoires, 1, 'Course réussie (une fois)');
    egal(r.toitTirs, 0, 'Hors du robot, les roquettes ont le son du toit'); egal(r.toitCoque, 0, 'Hors du robot, la barricade reste en bois');
  });

  test('Robot, sons : rien quand le son est coupé (aucun nœud audio créé)', () => {
    exiger(); reset();
    const r = J(function(src){
      var R = __rsn.RSN, M = __mech.MECH, dt = 1 / 30, o = {}, i, c = Snd.ctx, n = 0, K = ['createGain', 'createOscillator', 'createBufferSource', 'createBiquadFilter', 'createStereoPanner'], sv = {};
      var on0 = Snd.on; Snd.on = false;
      K.forEach(function(k){ sv[k] = c[k]; c[k] = function(){ n++; return sv[k].apply(c, arguments); }; });
      try {
        (0, eval)('(' + src + ')')();
        var v0 = Snd.voixN, p0 = R.pas;
        M.mv.f = 1; for (i = 0; i < 60; i++) visuals(dt); M.mv.f = 0;
        for (i = 0; i < 20; i++){ M.heat = .9; S.bar = S.barMax * .2; visuals(dt); }
        Snd.shot('rocket'); Snd.thud(2); S.bar = S.barMax;
        o.pas = R.pas - p0; o.voix = Snd.voixN - v0; o.fond = !!R.fond; o.noeuds = n; o.mesVoix = R.voix.length;
      } finally { K.forEach(function(k){ c[k] = sv[k]; }); Snd.on = on0; }
      return o;
    }, DEPART);
    fin();
    ok(r.pas > 0, 'Les pas sont comptés (' + r.pas + ')');
    egal(r.voix, 0, 'Aucune voix jouée'); ok(!r.fond, 'Pas de fond'); egal(r.mesVoix, 0, 'Aucune voix du robot');
    egal(r.noeuds, 0, 'Aucun nœud audio créé');
  });

  test('Robot, sons : 60 s simulées (marche, minigun, alarmes) : fond fait une fois, plafond de voix respecté, nœuds mesurés', () => {
    exiger(); reset();
    const r = sonActif(function(){
      var R = __rsn.RSN, M = __mech.MECH, dt = 1 / 30, o = {}, i, c = Snd.ctx, n = 0, K = ['createGain', 'createOscillator', 'createBufferSource', 'createBiquadFilter', 'createStereoPanner'], sv = {};
      (0, eval)('(' + DEPART_SRC + ')')();
      var c0 = R.fondCrees, vmax = 0, mmax = 0;
      K.forEach(function(k){ sv[k] = c[k]; c[k] = function(){ n++; return sv[k].apply(c, arguments); }; });
      try {
        M.mini = true;
        for (i = 0; i < 1800; i++){
          var ph = Math.floor(i / 60) % 4; M.mv.f = ph === 0 || ph === 1 ? 1 : 0; M.mv.b = ph === 2 ? 1 : 0; M.turn = ph === 3 ? 1 : 0;
          if (i % 300 === 150) S.bar = S.barMax * .2; if (i % 300 === 0) S.bar = S.barMax;
          if (i % 450 === 200) Snd.shot('rocket');
          visuals(dt);
          vmax = Math.max(vmax, Snd.voix.length); mmax = Math.max(mmax, R.voix.length);
        }
      } finally { K.forEach(function(k){ c[k] = sv[k]; }); M.mini = false; M.mv.f = M.mv.b = 0; M.turn = 0; S.bar = S.barMax; }
      o.crees = R.fondCrees - c0; o.vmax = vmax; o.mmax = mmax; o.vlim = Snd.VOIX_MAX; o.noeudsSec = n / 60; o.pas = R.pas; o.alarmes = R.alarmesChaud + R.alertesBas;
      __mech.mechQuit(); visuals(dt); o.apres = !R.fond && R.voix.length === 0;
      return o;
    }.toString().replace('DEPART_SRC', JSON.stringify(DEPART)));
    fin();
    egal(r.crees, 1, 'Le fond est fait une fois pour toute la minute');
    ok(r.vmax <= r.vlim, 'Plafond de voix de Snd respecté : ' + r.vmax + ' sur ' + r.vlim);
    ok(r.mmax <= r.vlim, 'Voix du robot gardées pour la coupure : au plus ' + r.mmax);
    ok(r.noeudsSec < 150, 'Nœuds audio créés par seconde : ' + r.noeudsSec.toFixed(0) + ' (le fond refait à chaque image en ferait plus de 390)');
    ok(r.alarmes > 0, 'Les alarmes ont sonné pendant la minute');
    ok(r.apres, 'Tout est arrêté en quittant');
  });

  /* ---------- Dossier 121 : sons des trois monstres à parade (js/73-robot-monstres2.js), sons en double ---------- */
  const exigerM = () => { exiger(); if (lire('typeof __mr2 === "object" && typeof __rsn.rsnMonstre === "function"') !== true) ignorer('Monstres du robot ou leurs sons absents'); };
  // Dans le jeu : départ à une rue, sans zombies ni vagues, blindage énorme, monstres déjà annoncés (pas de bandeau)
  const PREPM = 'window.__rsnM = { prep:function(rue){ P.mr2Vus = { belier:true, grappin:true, mortier:true }; __mech.mechStart(); __mb.MB.waveT = 1e9; __mech.MECH.street = rue; __mech.mechStreet(false); clearZombies(); __mb.MB.waveT = 1e9; plan.queue = []; S.bar = S.barMax = 1e7; },'
    + ' pas:function(n){ for (var i = 0; i < n; i++){ spawnT = 1e9; plan.queue = [\'walker\']; __mb.MB.waveT = 1e9; visuals(1 / 30); } },'
    + ' accroche:function(g){ for (var i = 0; i < 150 && g.mr !== \'accroche\'; i++) this.pas(1); return g.mr === \'accroche\'; },'
    + ' secouer:function(g){ var dir = 1, t = 0; for (var i = 0; i < 120 && g.mr === \'accroche\'; i++){ t += 1 / 30; if (t > .16){ t = 0; dir = -dir; } yaw += dir * 5 / 30; this.pas(1); } return g.mr !== \'accroche\'; } };';

  test('Robot, sons : chaque moment du Bélier, du Grappin et du Mortier vivant a son propre son, une fois, sans son d’emprunt', () => {
    exigerM(); reset();
    J(PREPM);
    const r = sonActif(function(){
      var R = __rsn.RSN, M2 = __mr2, T = __rsnM, o = {}, i, emprunt = [], sv = { tone:Snd.tone, boom:Snd.boom, roar:window.mbRoar };
      Snd.tone = function(){ emprunt.push('tone'); return sv.tone.apply(Snd, arguments); };
      Snd.boom = function(){ emprunt.push('boom'); return sv.boom.apply(Snd, arguments); };
      if (typeof sv.roar === 'function') window.mbRoar = function(){ emprunt.push('roar'); return sv.roar.apply(this, arguments); };
      try {
        T.prep(4);
        var m0 = JSON.stringify(R.mons), e0 = JSON.stringify(M2.MR2.evts), v0 = Snd.voixN;
        // Bélier : élan, charge, pas de côté, il s'écrase (sonné)
        var z = spawnZombie('belier'); z.g.position.set(0, 0, MECH_CAM.z - 40); z.mrX = 0; z.mrCd = 0; z.mrDist = 40;
        var dodge = false;
        for (i = 0; i < 600 && z.mr !== 'sonne'; i++){ if (z.mr === 'charge' && !dodge){ __mech.MECH.mv.r = 1; dodge = true; } if (dodge && __mech.MECH.x > 4) __mech.MECH.mv.r = 0; T.pas(1); }
        __mech.MECH.mv.r = 0; o.sonne = z.mr === 'sonne';
        clearZombies(); T.pas(1);
        // Grappin : saut, accroché, secoué, décroché
        var g = spawnZombie('grappin'); g.g.position.set(1, 0, MECH_CAM.z - 14);
        o.accroche = T.accroche(g); T.pas(10); o.decroche = T.secouer(g);
        clearZombies(); T.pas(1);
        // Mortier vivant : tir, impact (le robot reste planté)
        var m = spawnZombie('mortier'); m.g.position.set(-2, 0, MECH_CAM.z - 60);
        for (i = 0; i < 900 && !(M2.MR2.evts.impact > (JSON.parse(e0).impact || 0)); i++) T.pas(1);
        o.voix = Snd.voixN - v0;
        var m1 = JSON.parse(m0), e1 = JSON.parse(e0);
        o.sons = {}; o.evts = {};
        Object.keys(R.mons).forEach(function(k){ o.sons[k] = R.mons[k] - (m1[k] || 0); });
        Object.keys(M2.MR2.evts).forEach(function(k){ o.evts[k] = M2.MR2.evts[k] - (e1[k] || 0); });
        o.siffle = R.sifflets;
        __mech.mechQuit(); __rsn.rsnImage(1 / 30);
      } finally { Snd.tone = sv.tone; Snd.boom = sv.boom; if (typeof sv.roar === 'function') window.mbRoar = sv.roar; }
      o.emprunt = emprunt;
      return o;
    });
    fin();
    ok(r.sonne && r.accroche && r.decroche, 'Les trois monstres font tous leurs moments (Bélier sonné, Grappin accroché puis décroché)');
    ['elan', 'charge', 'sonne', 'saut', 'accroche', 'decroche', 'tir', 'impact'].forEach(k => {
      ok((r.evts[k] || 0) >= 1, 'Moment « ' + k + ' » annoncé');
      egal(r.sons[k] || 0, r.evts[k] || 0, 'Moment « ' + k + ' » : un son par moment (' + (r.sons[k] || 0) + ' pour ' + (r.evts[k] || 0) + ')');
    });
    ok(r.siffle >= 1, 'Sifflement de l’obus pendant le vol');
    ok(r.voix >= 8, 'Chaque son joue dans une voix du budget : ' + r.voix);
    egal(r.emprunt.join(','), '', 'Aucun son d’emprunt (tone, boom, rugissement) par-dessus');
  });

  test('Robot, sons : placés à gauche ou à droite selon le monstre, plus doux de loin ; grattement du Grappin fait une fois, coupé net', () => {
    exigerM(); reset();
    J(PREPM);
    const r = sonActif(function(){
      var R = __rsn.RSN, T = __rsnM, o = {}, i, M = __mech.MECH;
      T.prep(5);
      var y0 = yaw; yaw = 0;
      o.droite = __rsn.rsnPlace(M.x + 6, MECH_CAM.z - 10); o.gauche = __rsn.rsnPlace(M.x - 6, MECH_CAM.z - 10);
      o.loin = __rsn.rsnPlace(M.x, MECH_CAM.z - 70); o.pres = __rsn.rsnPlace(M.x, MECH_CAM.z - 8);
      yaw = Math.PI / 2; o.tourne = __rsn.rsnPlace(M.x, MECH_CAM.z - 10);   // regard vers la gauche : la rue devant est à droite
      yaw = y0;
      // Grattement : une seule boucle tant qu'il est accroché
      var c0 = R.grattes, s0 = R.grattesStop;
      var g = spawnZombie('grappin'); g.g.position.set(0, 0, MECH_CAM.z - 14);
      o.acc1 = T.accroche(g); T.pas(45);
      o.boucle = !!R.gratte; o.une = R.grattes - c0;
      o.decroche = T.secouer(g); T.pas(1); o.coupeDecroche = !R.gratte && R.grattesStop - s0 === 1;
      // Pause et reprise
      clearZombies(); T.pas(1);
      var g2 = spawnZombie('grappin'); g2.g.position.set(0, 0, MECH_CAM.z - 14);
      o.acc2 = T.accroche(g2); T.pas(2); var avant = !!R.gratte;
      __mech.mechPause(); visuals(1 / 30); o.pause = avant && !R.gratte;
      __mech.mechResume(); T.pas(2); o.reprise = !!R.gratte;
      // Il lâche tout seul au bout de 10 s : coupé aussi (sans couinement)
      var d0 = R.mons.decroche || 0; g2.mrT = 100; T.pas(2); o.lacheSeul = !R.gratte && (R.mons.decroche || 0) === d0;
      // En quittant le robot
      clearZombies(); T.pas(1);
      var g3 = spawnZombie('grappin'); g3.g.position.set(0, 0, MECH_CAM.z - 14);
      o.acc3 = T.accroche(g3); T.pas(2); var av3 = !!R.gratte;
      __mech.mechQuit(); __rsn.rsnImage(1 / 30); o.quitte = av3 && !R.gratte;
      o.crees = R.grattes - c0;
      return o;
    });
    fin();
    ok(r.droite.pan > .2 && r.gauche.pan < -.2, 'Monstre à droite : à droite (' + r.droite.pan.toFixed(2) + ') ; à gauche : à gauche (' + r.gauche.pan.toFixed(2) + ')');
    ok(r.loin.k < r.pres.k && r.loin.k >= .3, 'Plus doux de loin : ' + r.pres.k.toFixed(2) + ' à 8 m, ' + r.loin.k.toFixed(2) + ' à 70 m');
    ok(r.tourne.pan > .5, 'Torse tourné vers la gauche : la rue devant s’entend à droite (' + r.tourne.pan.toFixed(2) + ')');
    ok(r.acc1 && r.boucle, 'Grappin accroché : il gratte la vitre'); egal(r.une, 1, 'Boucle faite une seule fois (45 images)');
    ok(r.decroche && r.coupeDecroche, 'Décroché : grattement coupé net');
    ok(r.acc2 && r.pause, 'Coupé en pause'); ok(r.reprise, 'Repart à la reprise s’il est encore là');
    ok(r.lacheSeul, 'Il lâche tout seul : coupé, sans couinement');
    ok(r.acc3 && r.quitte, 'Coupé en quittant le robot');
    egal(r.crees, 4, 'Une boucle par accroche (et une à la reprise)');
  });

  test('Robot, sons : un seul son à la frappe du Titan ; crachat sur la vitre sans le souffle du toit (le toit garde le sien)', () => {
    exigerM(); reset();
    J(PREPM);
    const r = sonActif(function(){
      var R = __rsn.RSN, T = __rsnM, o = {}, i, booms = 0, bursts = 0, sv = { boom:Snd.boom, burst:Snd.burst }, M = __mech.MECH;
      Snd.boom = function(){ if (!Snd._vg) booms++; return sv.boom.apply(Snd, arguments); };
      Snd.burst = function(){ if (!Snd._vg) bursts++; return sv.burst.apply(Snd, arguments); }; // un appel du jeu (pas la reprise dans sa voix, js/01)
      try {
        T.prep(9);
        var z = spawnZombie('titan'); z.g.position.set(0, 0, MECH_CAM.z - 20); T.pas(1);
        var b0 = booms, f0 = R.frappes, s0 = __mb.MB.stomps;
        z.stompT = 0; T.pas(1);
        o.stomps = __mb.MB.stomps - s0; o.frappes = R.frappes - f0; o.booms = booms - b0;
        clearZombies(); T.pas(1);
        // Crachat qui touche la vitre dans le robot
        var c0 = R.crachats; bursts = 0;
        spitLaunch(M.x + 1, 3, MECH_CAM.z - 12, M.x, 3, MECH_CAM.z, 5);
        for (i = 0; i < 60 && __types.spitsActifs; i++) T.pas(1);
        o.crachats = R.crachats - c0; o.burstsRobot = bursts;
        __mech.mechQuit(); __rsn.rsnImage(1 / 30);
        // Sur le toit : le souffle du crachat joue comme avant
        var bar = S.bar; bursts = 0;
        spitLaunch(0, 3, BAR_Z - 12, 0, 1, BAR_Z - .1, 1);
        for (i = 0; i < 60 && __types.spitsActifs; i++) __types.zkFrame(1 / 30);
        o.burstsToit = bursts; S.bar = bar;
      } finally { Snd.boom = sv.boom; Snd.burst = sv.burst; }
      return o;
    });
    fin();
    egal(r.stomps, 1, 'Le Titan frappe le sol'); egal(r.frappes, 1, 'Le son de frappe du robot joue'); egal(r.booms, 0, 'Plus d’explosion par-dessus');
    egal(r.crachats, 1, 'Robot : « crachat sur la vitre »'); egal(r.burstsRobot, 0, 'Robot : plus le petit souffle du toit en dessous');
    egal(r.burstsToit, 1, 'Toit : le souffle du crachat joue toujours');
  });

  test('Robot, sons : mixage hors ligne (minigun, pas, alarmes, coque, salve, Titan) sans saturer', async () => {
    exiger();
    if (lire('typeof OfflineAudioContext === "function"') !== true) ignorer('Pas d’OfflineAudioContext');
    const r = await J(function(){
      var K = ['ctx', 'master', 'lim', 'buses', 'fxBus', 'rev', 'qb', 'ambBus', 'musBus', 'mg', 'voix', 'on', '_out', '_autoV', 'lastShot', 'mgFiring'];
      var R = __rsn.RSN, save = {}; K.forEach(function(k){ save[k] = Snd[k]; });
      var off = new OfflineAudioContext(1, 44100 * 3, 44100), etat = {}, vmax = 0;
      Snd.ctx = off; Snd.on = true; Snd.fxBus = Snd.qb = Snd.ambBus = Snd.musBus = Snd.mg = Snd._autoV = Snd._out = null; Snd.buses = null; Snd.lastShot = -1; Snd._chaine();
      K.forEach(function(k){ etat[k] = Snd[k]; Snd[k] = save[k]; });
      off.suspend(.5).then(function(){
        var s2 = {}; K.forEach(function(k){ s2[k] = Snd[k]; Snd[k] = etat[k]; });
        var on0 = __mech.MECH.on, st0 = state, f0 = R.fond, v0 = R.voix, m0 = HB.m, sal = P.mech.lv.salvo, gr0 = R.gratte;
        __mech.MECH.on = true; state = 'mech'; R.fond = null; R.voix = []; HB.m = 1; P.mech.lv.salvo = 2; R.gratte = null;
        try {
          __rsn.rsnFondCreer(); __rsn.rsnFondRegler(0); Snd.mgTick(1, true);
          for (var i = 0; i < 4; i++) __rsn.rsnPas();
          __rsn.rsnBipChaud(.95); __rsn.rsnAlerteBas(); __rsn.rsnBipBas(.1);
          for (var j = 0; j < 6; j++) __rsn.rsnCoque(2.4);
          Snd.shot('rocket'); Snd.shot('railgun');
          __rsn.rsnFrappe(true); Snd.boom(1.4); Snd.boom(1); __rsn.rsnTitan(); __rsn.rsnRenforts();
          for (var z = 0; z < 40; z++) Snd.zvoix('walker');
          // Dossier 121 : monstres à parade en même temps (fracas du Bélier, impact d'obus, élan, Grappin qui gratte)
          if (__rsn.rsnMonstre){ var fz = function(t, dz){ return { type:t, g:{ position:{ x:0, z:MECH_CAM.z - dz } } }; }; __rsn.rsnMonstre('sonne', fz('belier', 12)); __rsn.rsnMonstre('impact', fz('mortier', 60)); __rsn.rsnMonstre('elan', fz('belier', 15)); __rsn.rsnGratteCreer(); }
          vmax = Snd.voix.length;
        } finally {
          __mech.MECH.on = on0; state = st0; R.fond = f0; R.voix = v0; HB.m = m0; P.mech.lv.salvo = sal; R.gratte = gr0;
          K.forEach(function(k){ Snd[k] = s2[k]; });
        }
        off.resume();
      });
      return off.startRendering().then(function(buf){
        var d = buf.getChannelData(0), pk = 0, e = 0;
        for (var i = 22050; i < d.length; i++){ var v = Math.abs(d[i]); if (v > pk) pk = v; e += d[i] * d[i]; }
        return { pic: pk, rms: Math.sqrt(e / (d.length - 22050)), vmax: vmax };
      });
    });
    ok(r.rms > .01, 'Le mélange doit s’entendre : RMS ' + r.rms.toFixed(3));
    ok(r.pic <= .97, 'Pic de sortie : ' + r.pic.toFixed(3) + ' (1 = saturation)');
    ok(r.vmax <= 10, 'Au plus 10 voix à la fois : ' + r.vmax);
  });
})();
