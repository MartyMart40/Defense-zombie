'use strict';
/* Tests des sons (js/01-son.js, js/37-bruitages.js) : tirs en couches par arme, pluie en bruit rose et brun, ambiances météo,
   voix des zombies, barricade, signatures des vagues, budget de voix, limiteur, son coupé.
   Les tests créent l'AudioContext s'il manque (il reste suspendu : aucun son n'est entendu). La page de tests coupe le son
   (Snd.on faux) : les tests qui ont besoin que les sons jouent mettent Snd.on à vrai le temps du test (sans toucher au volume,
   qui reste à 0), puis le remettent. */
(function(){
  if (typeof test !== 'function' || typeof TESTS === 'undefined') return;
  const exiger = () => { if (lire('typeof Snd === "object" && typeof Snd.GUNS === "object" && typeof Snd.setAmbience === "function"') !== true) ignorer('Nouveaux sons absents (js/01-son.js)'); };
  const avecAudio = () => { if (J(function(){ if (!Snd.ctx) Snd.init(); return !!(Snd.ctx && Snd.master); }) !== true) ignorer('Pas d’audio dans ce navigateur'); };
  // Lance fn dans le jeu avec le son actif (volume toujours à 0), puis remet Snd.on comme avant
  const sonActif = fn => J(function(src){ var on0 = Snd.on; Snd.on = true; try { return eval('(' + src + ')')(); } finally { Snd.on = on0; } }, fn.toString());
  const exige2 = () => { if (lire('typeof Snd.headPop === "function" && typeof Snd._voix === "function" && typeof Snd.zvoix === "function"') !== true) ignorer('Nouveaux sons absents'); };

  test('Sons : chaque arme a son propre son de tir', () => {
    exiger();
    const r = J(function(){
      var o = { manque: [], rendu: [], profils: {} };
      WORDER.forEach(function(id){
        if (!Snd.GUNS[id]) o.manque.push(id);
        var n0 = Snd.shotN, v = Snd.shot(id);
        if (v !== true || Snd.shotN !== n0 + 1) o.rendu.push(id);
        o.profils[id] = JSON.stringify(Snd.GUNS[id]);
      });
      o.inconnu = Snd.shot('arme-inconnue');
      return o;
    });
    egal(r.manque.join(','), '', 'Armes sans profil de son');
    egal(r.rendu.join(','), '', 'Armes dont le son ne joue pas');
    const vus = {};
    Object.keys(r.profils).forEach(id => { ok(!vus[r.profils[id]], 'Même son pour ' + id + ' et ' + vus[r.profils[id]]); vus[r.profils[id]] = id; });
    egal(r.inconnu, false, 'Arme inconnue : Snd.shot doit rendre false (son de secours)');
  });

  test('Sons : deux coups de suite ne sonnent jamais pareil (hauteur, volume, timbre)', () => {
    exiger(); avecAudio();
    const r = sonActif(function(){
      var log = [], nz = Snd._nz, osc = Snd._osc;
      Snd._nz = function(t, type, freq, q, dur, vol){ log.push('n' + Math.round(freq) + '/' + vol.toFixed(4) + '/' + dur.toFixed(4)); return nz.apply(this, arguments); };
      Snd._osc = function(t, type, f0, f1, dur, vol){ log.push('o' + Math.round(f0) + '/' + vol.toFixed(4)); return osc.apply(this, arguments); };
      var coups = [];
      try {
        ['pistol', 'shotgun', 'sniper', 'rifle'].forEach(function(id){
          for (var i = 0; i < 2; i++){ log = []; Snd.lastShot = -1; Snd.shot(id); coups.push({ id: id, sig: log.join(' '), n: log.length }); }
        });
      } finally { Snd._nz = nz; Snd._osc = osc; }
      return coups;
    });
    for (let i = 0; i < r.length; i += 2){
      ok(r[i].n >= 4, r[i].id + ' : au moins 4 couches (claquement, corps, coup sourd, écho) : ' + r[i].n);
      ok(r[i].sig !== r[i + 1].sig, r[i].id + ' : deux coups identiques');
    }
    ok(r[0].sig.split(' ')[0] !== r[2].sig.split(' ')[0], 'Pistolet et fusil à pompe ont le même claquement');
  });

  test('Sons : la pluie est un bruit rose et brun long, avec des gouttes au hasard', () => {
    exiger(); avecAudio();
    const r = sonActif(function(){
      var lvl0 = Snd.rainLvl;
      Snd.rainLevel(1);
      var o = { nodes: !!Snd.rainNodes, pink: Snd.pink ? Snd.pink.duration : 0, brown: Snd.brown ? Snd.brown.duration : 0, gouttes0: Snd.rainDrops };
      for (var i = 0; i < 5; i++) Snd.rainLevel(1);
      o.gouttes = Snd.rainDrops - o.gouttes0 + (o.gouttes0 > 0 ? 1 : 0);
      o.boucle = Snd.rainNodes ? Snd.rainNodes.ps.loop && Snd.rainNodes.ps.buffer === Snd.pink : false;
      o.derive = Snd.rainNodes ? Snd.rainNodes.next > 0 : false;
      // Échantillons : le bruit rose a plus de graves que le blanc (voisins corrélés)
      var d = Snd.pink.getChannelData(0), c = 0, n = 20000;
      for (var k = 1; k < n; k++) c += d[k] * d[k - 1];
      var e = 0; for (var k2 = 0; k2 < n; k2++) e += d[k2] * d[k2];
      o.correl = c / e;
      Snd.rainLevel(0); o.arret = !Snd.rainNodes;
      Snd.rainLevel(lvl0);
      return o;
    });
    ok(r.nodes, 'La pluie doit démarrer');
    ok(r.pink >= 10 && r.brown >= 10, 'Tampons longs (pas de boucle courte) : ' + r.pink.toFixed(1) + ' s et ' + r.brown.toFixed(1) + ' s');
    ok(Math.abs(r.pink - r.brown) > 1, 'Longueurs différentes, pour que la répétition ne s’entende pas');
    ok(r.boucle, 'Nappe sur le bruit rose');
    ok(r.correl > .3, 'Le bruit rose devrait être corrélé (pas du bruit blanc) : ' + r.correl.toFixed(2));
    ok(r.gouttes > 0, 'Gouttes sur les toits et les flaques');
    ok(r.derive, 'Les filtres dérivent lentement');
    ok(r.arret, 'La pluie doit s’arrêter à 0');
  });

  test('Sons : ambiance de météo (vent, grêle, oiseaux) sans erreur, avec et sans audio', () => {
    exiger();
    const r = sonActif(function(){
      var err = [], ctx0 = Snd.ctx;
      function essai(nom, f){ try { f(); } catch (e) { err.push(nom + ' : ' + e.message); } }
      essai('sans audio', function(){ Snd.ctx = null; Snd.setAmbience({ wind: 1, hail: 1 }); Snd.rainLevel(.5); });
      Snd.ctx = ctx0;
      if (!Snd.ctx) Snd.init();
      var o = { err: err, audio: !!Snd.ctx };
      if (Snd.ctx){
        essai('vent', function(){ Snd.setAmbience({ wind: 1, hail: 1, birds: 1, crickets: 1, cicadas: 1, rumble: 1 }); Snd.ambNext = 0; Snd.rainLevel(0); });
        o.vent = !!Snd.ambNodes;
        essai('arrêt', function(){ Snd.setAmbience({}); Snd.rainLevel(0); });
        o.arret = !Snd.ambNodes;
        o.zero = Object.keys(Snd.ambWant).every(function(k){ return Snd.ambWant[k] === 0; });
      }
      return o;
    });
    egal(r.err.length, 0, 'Erreurs : ' + r.err.join(' | ') + '\nNombre');
    if (r.audio){ ok(r.vent, 'Le vent doit démarrer'); ok(r.arret, 'L’ambiance doit s’arrêter'); ok(r.zero, 'Niveaux remis à zéro'); }
  });

  test('Sons : minigun en continu (moteur qui monte, rafale en boucle, arrêt quand on lâche)', () => {
    exiger(); avecAudio();
    const r = sonActif(function(){
      var o = {};
      Snd._mgStop();
      Snd.mgTick(.3, false); o.moteur = !!Snd.mg && !!Snd.mg.mo; o.boucle = Snd.mg ? Snd.mg.bs.loop : false;
      Snd.mgTick(1, true); o.tir = Snd.mgFiring;
      var b = Snd._mgBuf(); o.duree = b.duration;
      var d = b.getChannelData(0), pics = 0, haut = false;
      for (var i = 0; i < d.length; i++){ var v = Math.abs(d[i]) > .5; if (v && !haut) pics++; haut = v; }
      o.pics = pics;
      var n0 = Snd.shotN; Snd.shot('minigun'); o.shotRend = Snd.shotN === n0 + 1;
      for (var k = 0; k < 95; k++) Snd.mgTick(0, false);
      o.arret = !Snd.mg;
      return o;
    });
    ok(r.moteur && r.boucle, 'Moteur et rafale en boucle');
    ok(r.tir, 'La rafale doit jouer pendant le tir');
    ok(r.duree >= .9, 'Tampon de rafale : ' + r.duree + ' s');
    ok(r.pics >= 55, 'Coups par seconde dans la rafale (vraie rotative : 50 à 100) : ' + r.pics);
    ok(r.shotRend, 'Snd.shot(minigun) compte le coup');
    ok(r.arret, 'Le son s’arrête une fois les canons arrêtés');
  });

  test('Sons : explosions, impacts, recharge et réverbération de rue sans erreur', () => {
    exiger(); avecAudio();
    const r = sonActif(function(){
      var err = [];
      ['boom', 'hit', 'reload', 'empty', 'thud', 'groan', 'buy'].forEach(function(k){ try { if (typeof Snd[k] !== 'function') err.push(k + ' absent'); else Snd[k](1); } catch (e) { err.push(k + ' : ' + e.message); } });
      var fx = Snd._fx();
      return { err: err, rev: !!Snd.rev, fx: !!fx };
    });
    egal(r.err.join(' | '), '', 'Erreurs');
    ok(r.fx && r.rev, 'Réverbération de rue créée');
  });

  test('Sons : nouveaux sons (tête, abattu, voix par type, barricade, vagues) jouent sans erreur', () => {
    exiger(); exige2(); avecAudio();
    const r = sonActif(function(){
      var o = { err: [], muets: [] };
      function essai(nom, f){
        Snd.voix = []; var n0 = Snd.voixN;
        try { var v = f(); if (v === false || Snd.voixN === n0) o.muets.push(nom); } catch (e) { o.err.push(nom + ' : ' + e.message); }
      }
      Snd._popT = -9; essai('headPop', function(){ return Snd.headPop(); });
      Snd._kcT = -9; essai('killConfirm', function(){ return Snd.killConfirm(); });
      Object.keys(Snd.ZV).forEach(function(k){ essai('voix ' + k, function(){ return Snd.zvoix(k); }); });
      essai('voix inconnue', function(){ return Snd.zvoix('type-inconnu'); });
      essai('thud faible', function(){ Snd.thud(.5); }); essai('thud fort', function(){ Snd.thud(2.4); });
      essai('alarme', function(){ return Snd.alarme(); }); essai('coeur', function(){ return Snd.coeur(.7); });
      essai('début de vague', function(){ return Snd.waveStart(false); }); essai('dernière vague', function(){ return Snd.waveStart(true); });
      essai('fin de vague', function(){ return Snd.waveEnd(); }); essai('victoire', function(){ return Snd.victoire(); });
      essai('achat', function(){ Snd.buy(); });
      Snd.voix = [];
      return o;
    });
    egal(r.err.join(' | '), '', 'Erreurs');
    egal(r.muets.join(', '), '', 'Sons qui ne jouent pas');
  });

  test('Sons : chaque type de zombie du toit a sa propre voix', () => {
    exiger(); exige2();
    const r = J(function(){
      var o = { manque: [], sig: {} };
      ['walker', 'runner', 'brute', 'jumper', 'flyer', 'spitter', 'colossus', 'crawler', 'bloater', 'gargoyle', 'crow', 'shield'].forEach(function(k){
        if (!ZTYPES[k]) return;
        if (!Snd.ZV[k]) o.manque.push(k); else o.sig[k] = JSON.stringify(Snd.ZV[k]);
      });
      o.gargle = !!Snd.ZV.gargle; o.hop = !!Snd.ZV.hop;
      // Hauteur : le coureur crie plus aigu que le marcheur, le costaud et le colosse grondent plus grave
      o.f = { walker: Snd.ZV.walker.f[1], runner: Snd.ZV.runner.f[0], brute: Snd.ZV.brute.f[1], colossus: Snd.ZV.colossus.f[1] };
      return o;
    });
    egal(r.manque.join(','), '', 'Types sans voix');
    const vus = {};
    Object.keys(r.sig).forEach(k => { ok(!vus[r.sig[k]], 'Même voix pour ' + k + ' et ' + vus[r.sig[k]]); vus[r.sig[k]] = k; });
    ok(r.gargle && r.hop, 'Gargouillis du cracheur et « hop » du sauteur');
    ok(r.f.runner > r.f.walker * 2, 'Le coureur doit crier aigu');
    ok(r.f.brute < 65 && r.f.colossus < r.f.brute, 'Le costaud et le colosse doivent gronder grave');
  });

  test('Sons : rien ne joue quand le son est coupé (aucun nœud audio créé)', () => {
    exiger(); exige2(); avecAudio(); reset(); J('startLocation(0)');
    const r = J(function(){
      var c = Snd.ctx, n = 0, noms = ['createOscillator', 'createBufferSource', 'createGain', 'createBiquadFilter'], orig = {};
      noms.forEach(function(k){ orig[k] = c[k]; c[k] = function(){ n++; return orig[k].apply(c, arguments); }; });
      var on0 = Snd.on, o = { err: [] }, n0 = Snd.shotN;
      Snd.on = false;
      try {
        __t.geler(); clearZombies();
        var z = __t.placer('runner', 2, -40), zb = __t.placer('brute', -2, -30);
        var f = [
          function(){ o.tir = Snd.shot('shotgun'); Snd.shot('pistol'); Snd.shot('minigun'); Snd.shot('flamer'); },
          function(){ Snd.boom(1); Snd.hit(); Snd.reload(); Snd.empty(); Snd.thud(2); Snd.buy(); Snd.groan(); },
          function(){ Snd._popT = -9; o.pop = Snd.headPop(); Snd._kcT = -9; o.kc = Snd.killConfirm(); Snd.zvoix('runner'); },
          function(){ Snd.waveStart(true); Snd.waveEnd(); Snd.victoire(); Snd.alarme(); Snd.coeur(1); Snd.thunder(0, 1); },
          function(){ Snd.tone(440, .1, 'sine', .1); Snd.burst(800, .1, .1); Snd._nz(c.currentTime, 'lowpass', 500, 1, .1, .1); Snd._osc(c.currentTime, 'sine', 300, 0, .1, .1); },
          function(){ Snd.mgTick(1, true); Snd.setAmbience({ wind: 1, hail: 1, birds: 1 }); Snd.ambNext = 0; Snd.rainLevel(1); Snd.musFanfare(); },
          function(){ state = 'playing'; __br.BR.tinkT = -10; __br.brTink(0); hitBarricade(zb, 40, .01, 0); __br.BR.bas = false; S.bar = S.barMax * .1; __br.brCoeur(1); __br.brCoeur(1); __br.brVoix(); },
          function(){ __br.BR.dropT = -10; damage(z, 1e9, true, z.g.position.clone()); }
        ];
        f.forEach(function(g, i){ try { g(); } catch (e) { o.err.push(i + ' : ' + e.message); } });
      } finally {
        noms.forEach(function(k){ c[k] = orig[k]; });
        Snd.on = on0; Snd.setAmbience({}); state = 'test'; S.bar = S.barMax; clearZombies();
      }
      o.n = n; o.compte = Snd.shotN - n0; o.mg = !!Snd.mg; o.pluie = !!Snd.rainNodes;
      return o;
    });
    egal(r.err.join(' | '), '', 'Erreurs');
    egal(r.n, 0, 'Nœuds audio créés avec le son coupé');
    egal(r.tir, true, 'Snd.shot compte le coup même son coupé');
    egal(r.compte, 4, 'Coups comptés');
    ok(r.pop === false && r.kc === false, 'headPop et killConfirm rendent false son coupé');
    ok(!r.mg && !r.pluie, 'Minigun et pluie arrêtés');
  });

  test('Sons : budget de voix (au plus une dizaine de sons courts, les plus vieux coupés)', () => {
    exiger(); exige2(); avecAudio();
    const r = sonActif(function(){
      var o = {};
      Snd.voix = []; var c0 = Snd.voixCoupees, max = 0;
      for (var i = 0; i < 30; i++){ Snd.hit(); max = Math.max(max, Snd.voix.length); }
      o.max = max; o.coupees = Snd.voixCoupees - c0; o.vmax = Snd.VOIX_MAX;
      // Les plus vieux partent : le premier son n'est plus là, le dernier oui
      o.ordre = Snd.voix.map(function(v){ return v.n; });
      // Un son moins important ne coupe pas un son plus important
      Snd.voix = []; for (var k = 0; k < Snd.VOIX_MAX; k++) Snd.buy();
      var rf = Snd.voixRefusees; o.hitRefuse = Snd.hit() === false || Snd.voixRefusees > rf;
      o.toujoursAchats = Snd.voix.every(function(v){ return v.pri === 3; });
      // Les appels des autres fichiers (tone, burst) au même instant partagent une voix (au plus 3)
      Snd.voix = []; Snd._autoV = null; var n0 = Snd.voixN;
      Snd.burst(900, .2, .2); Snd.tone(300, .2, 'sine', .1); Snd.tone(200, .2, 'sine', .1); Snd.tone(100, .2, 'sine', .1);
      o.auto = Snd.voixN - n0;
      // Minigun, 60 grognements, explosions : toujours au plus VOIX_MAX
      Snd.voix = []; max = 0;
      for (var j = 0; j < 60; j++){ Snd.zvoix('walker'); Snd.hit(); if (j % 10 === 0) Snd.boom(1); Snd.shot('rifle'); max = Math.max(max, Snd.voix.length); }
      o.max2 = max;
      Snd.voix = [];
      return o;
    });
    ok(r.vmax >= 8 && r.vmax <= 12, 'Budget d’une dizaine de voix : ' + r.vmax);
    ok(r.max <= r.vmax, 'Voix à la fois : ' + r.max);
    ok(r.coupees >= 30 - r.vmax, 'Vieux sons coupés : ' + r.coupees);
    ok(r.ordre.length && r.ordre[0] > 1 && r.ordre.join() === r.ordre.slice().sort((a, b) => a - b).join(), 'Les plus vieux sont coupés en premier : ' + r.ordre.join(','));
    ok(r.hitRefuse && r.toujoursAchats, 'Un impact ne doit pas couper un achat');
    egal(r.auto, 2, 'Appels du même instant regroupés (3 par voix)');
    ok(r.max2 <= r.vmax, 'Grosse mêlée : ' + r.max2 + ' voix');
  });

  test('Sons : killConfirm limité (au plus 4 par seconde), headPop une fois par coup', () => {
    exiger(); exige2(); avecAudio();
    const r = sonActif(function(){
      var o = {};
      Snd._kcT = -9; var k0 = Snd.kcN, vals = [];
      for (var i = 0; i < 20; i++) vals.push(Snd.killConfirm());
      o.rafale = Snd.kcN - k0; o.premier = vals[0]; o.second = vals[1];
      Snd._kcT -= Snd.KC_GAP + .01; o.apres = Snd.killConfirm();
      o.gap = Snd.KC_GAP;
      // Branché sur rien (js/62-ressenti.js fait ses propres sons) : un zombie tué ne le joue pas
      var st = state; state = 'playing'; Snd._kcT = -9; var k1 = Snd.kcN; Jeu.emit('tue', {}, true); o.tue = Snd.kcN - k1; state = st;
      Snd._popT = -9; var p0 = Snd.popN; Snd.headPop(); Snd.headPop(); o.pop = Snd.popN - p0;
      Snd.voix = [];
      return o;
    });
    egal(r.rafale, 1, '20 abattus au même instant');
    ok(r.premier === true && r.second === false, 'Le premier joue, les suivants non');
    egal(r.apres, true, 'Rejoue une fois le délai passé');
    ok(r.gap >= .2, 'Au plus 5 par seconde : ' + r.gap);
    egal(r.tue, 0, 'killConfirm ne doit être branché sur aucun événement (doublon avec 62-ressenti)');
    egal(r.pop, 1, 'Deux headPop pour le même coup');
  });

  test('Sons : barricade (coup selon les dégâts, alarme sous 30 %, cœur qui accélère)', () => {
    exiger(); exige2(); avecAudio(); reset(); J('startLocation(0)');
    const r = sonActif(function(){
      var o = {}, B = __br.BR;
      __t.geler(); clearZombies(); state = 'playing';
      var z = __t.placer('walker', 0, BAR_Z - 1);
      // Gros coup : toujours un son, plus fort ; petit coup : la force passe à Snd.thud par Snd._thudK
      var th = Snd.thud, ks = [];
      Snd.thud = function(k){ ks.push(k != null ? k : Snd._thudK); return th.apply(this, arguments); };
      try {
        var n0 = Snd.thudN; hitBarricade(z, 45, .01, 0); o.gros = Snd.thudN - n0;
        for (var i = 0; i < 20; i++) hitBarricade(z, 4, .01, 0);
      } finally { Snd.thud = th; }
      o.ks = ks; o.kNul = Snd._thudK;
      S.bar = S.barMax;
      // Alarme au passage sous 30 %, une seule fois
      B.bas = false; var a0 = B.alarmes, b0 = B.beats;
      S.bar = S.barMax * .25; __br.brCoeur(1 / 30); __br.brCoeur(1 / 30); o.alarme = B.alarmes - a0;
      for (var j = 0; j < 30; j++) __br.brCoeur(1 / 10);
      o.beats = B.beats - b0;
      B.beatT = 0; __br.brCoeur(.001); o.lent = B.beatT;
      S.bar = S.barMax * .03; B.beatT = 0; __br.brCoeur(.001); o.vite = B.beatT;
      S.bar = S.barMax * .5; __br.brCoeur(.1); o.rearme = !B.bas;
      S.bar = S.barMax; state = 'test'; clearZombies(); Snd.voix = [];
      return o;
    });
    egal(r.gros, 1, 'Un coup de colosse fait toujours un bruit');
    ok(r.ks[0] > 2, 'Force du gros coup : ' + r.ks[0]);
    ok(r.ks.length > 1 && r.ks.slice(1).every(k => k < 1), 'Force des petits coups : ' + r.ks.slice(1).join(','));
    egal(r.kNul, null, 'Snd._thudK remis à null');
    egal(r.alarme, 1, 'Alarme une seule fois au passage sous 30 %');
    ok(r.beats >= 3, 'Battements de cœur : ' + r.beats);
    ok(r.vite < r.lent, 'Le cœur accélère quand la barricade cède : ' + r.lent.toFixed(2) + ' s puis ' + r.vite.toFixed(2) + ' s');
    ok(r.rearme, 'Alarme réarmée au-dessus de 40 %');
  });

  test('Sons : voix d’approche, gargouillis avant le crachat, signatures des vagues', () => {
    exiger(); exige2(); avecAudio(); reset(); J('startLocation(0)');
    const r = sonActif(function(){
      var o = {}, B = __br.BR;
      __t.geler(); clearZombies(); state = 'playing';
      var a0 = B.annonces, z1 = __t.placer('runner', 0, -50), z2 = __t.placer('runner', 1, -50), loin = __t.placer('brute', 0, -100);
      B.cd = {}; __br.brVoix(); o.annonce = B.annonces - a0; o.vu = !!z1.brVu && !!z2.brVu && !loin.brVu;
      loin.g.position.z = -40; __br.brVoix(); o.brute = B.annonces - a0;
      var sp = __t.placer('spitter', 0, -30), g0 = B.gargles; sp.st = 'attack'; sp.brSp = 1; sp.spitT = .7; __br.brVoix(); o.gargle = B.gargles - g0;
      clearZombies();
      // Vagues : début, dernière vague, fin, victoire
      var d0 = B.debuts, l0 = B.derniere, f0 = B.fins, v0 = B.victoires;
      __br.brVague();
      S.wave = 1; state = 'playing'; __br.brVague(); __br.brVague(); o.debut = B.debuts - d0;
      state = 'shop'; __br.brVague(); o.fin = B.fins - f0;
      S.wave = curLoc.waves; state = 'playing'; __br.brVague(); o.derniere = B.derniere - l0;
      state = 'over'; __br.brVague(); o.victoire = B.victoires - v0;
      state = 'test'; __br.brVague(); Snd.voix = [];
      return o;
    });
    egal(r.annonce, 1, 'Deux coureurs ensemble : un seul cri (délai par type)');
    ok(r.vu, 'Le zombie loin n’est pas encore annoncé');
    egal(r.brute, 2, 'Le costaud crie en approchant');
    egal(r.gargle, 1, 'Le cracheur gargouille avant de cracher');
    egal(r.debut, 1, 'Signature de début de vague (une fois)');
    egal(r.fin, 1, 'Signature de fin de vague');
    egal(r.derniere, 1, 'Signature de la dernière vague');
    egal(r.victoire, 1, 'Signature de victoire');
  });

  test('Sons : limiteur de sortie (60 zombies, minigun et explosions ne saturent pas)', async () => {
    exiger(); exige2(); avecAudio();
    if (lire('typeof OfflineAudioContext === "function"') !== true) ignorer('Pas d’OfflineAudioContext');
    const r = await J(function(){
      // Rendu hors ligne : la chaîne de sortie de Snd est rebâtie sur un OfflineAudioContext, puis tout est remis
      var K = ['ctx', 'master', 'lim', 'buses', 'fxBus', 'rev', 'qb', 'ambBus', 'musBus', 'mg', 'voix', 'on', '_out', '_autoV', 'lastShot', 'mgFiring'];
      var save = {}; K.forEach(function(k){ save[k] = Snd[k]; });
      var off = new OfflineAudioContext(1, 44100 * 2.5, 44100), etat = {};
      Snd.ctx = off; Snd.on = true; Snd.fxBus = Snd.qb = Snd.ambBus = Snd.musBus = Snd.mg = Snd._autoV = Snd._out = null; Snd.lastShot = -1; Snd._chaine();
      K.forEach(function(k){ etat[k] = Snd[k]; Snd[k] = save[k]; });
      off.suspend(.5).then(function(){
        var s2 = {}; K.forEach(function(k){ s2[k] = Snd[k]; Snd[k] = etat[k]; });
        var vm = Snd.VOIX_MAX;
        try {
          Snd.VOIX_MAX = 1e9; // pire cas : sans budget de voix
          Snd.mgTick(1, true);
          for (var i = 0; i < 60; i++) Snd.zvoix(i % 3 ? 'walker' : 'brute');
          for (var j = 0; j < 40; j++) Snd.hit();
          for (var b = 0; b < 6; b++) Snd.boom(1.5);
          for (var s = 0; s < 10; s++) Snd.shot('shotgun');
        } finally { Snd.VOIX_MAX = vm; K.forEach(function(k){ Snd[k] = s2[k]; }); }
        off.resume();
      });
      return off.startRendering().then(function(buf){
        var d = buf.getChannelData(0), pk = 0, e = 0;
        for (var i = 0; i < d.length; i++){ var v = Math.abs(d[i]); if (v > pk) pk = v; if (i > 22050) e += d[i] * d[i]; }
        return { pic: pk, rms: Math.sqrt(e / (d.length - 22050)), lim: !!etat.lim, vmax: Snd.VOIX_MAX };
      });
    });
    ok(r.lim, 'Compresseur-limiteur sur la sortie');
    ok(r.rms > .01, 'Le mélange doit s’entendre : RMS ' + r.rms.toFixed(3));
    ok(r.pic <= .97, 'Pic de sortie : ' + r.pic.toFixed(3) + ' (1 = saturation)');
    egal(r.vmax, 10, 'Budget de voix remis');
  });
})();
