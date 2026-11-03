'use strict';
/* Tests des sons (js/01-son.js) : tirs en couches par arme, pluie en bruit rose et brun, ambiances météo.
   Les tests créent l'AudioContext s'il manque (il reste suspendu : aucun son n'est entendu). */
(function(){
  if (typeof test !== 'function' || typeof TESTS === 'undefined') return;
  const exiger = () => { if (lire('typeof Snd === "object" && typeof Snd.GUNS === "object" && typeof Snd.setAmbience === "function"') !== true) ignorer('Nouveaux sons absents (js/01-son.js)'); };
  const avecAudio = () => { if (J(function(){ if (!Snd.ctx) Snd.init(); return !!(Snd.ctx && Snd.master); }) !== true) ignorer('Pas d’audio dans ce navigateur'); };

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
    const r = J(function(){
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
    const r = J(function(){
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
    const r = J(function(){
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
    const r = J(function(){
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
    ok(r.pics >= 40, 'Coups par seconde dans la rafale : ' + r.pics);
    ok(r.shotRend, 'Snd.shot(minigun) compte le coup');
    ok(r.arret, 'Le son s’arrête une fois les canons arrêtés');
  });

  test('Sons : explosions, impacts, recharge et réverbération de rue sans erreur', () => {
    exiger(); avecAudio();
    const r = J(function(){
      var err = [];
      ['boom', 'hit', 'reload', 'empty', 'thud', 'groan', 'buy'].forEach(function(k){ try { if (typeof Snd[k] !== 'function') err.push(k + ' absent'); else Snd[k](1); } catch (e) { err.push(k + ' : ' + e.message); } });
      var fx = Snd._fx();
      return { err: err, rev: !!Snd.rev, fx: !!fx };
    });
    egal(r.err.join(' | '), '', 'Erreurs');
    ok(r.fx && r.rev, 'Réverbération de rue créée');
  });
})();
