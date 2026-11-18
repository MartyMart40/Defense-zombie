'use strict';
/* Tests des sons du RTS (js/69-rts-sons.js, tâche 115) : un son par famille d'arme, explosions à la taille du rayon,
   plafond de voix avec 40 unités, rien quand le son est coupé, pas de voix qui s'accumulent, moments joués une fois,
   moteur du véhicule piloté, et mesure hors ligne (crête, voix au pire moment).
   Comme tests/t-sons.js : l'AudioContext reste suspendu (on n'entend rien) ; Snd.on est mis à vrai le temps du test. */
(function(){
  if (typeof test !== 'function' || typeof TESTS === 'undefined') return;
  const exiger = () => { if (lire('typeof __rtsSons === "object" && typeof rtsSonTir === "function" && typeof __rts === "object"') !== true) ignorer('Sons du RTS absents (js/69-rts-sons.js)'); };
  const avecAudio = () => { if (J(function(){ if (!Snd.ctx) Snd.init(); return !!(Snd.ctx && Snd.master); }) !== true) ignorer('Pas d’audio dans ce navigateur'); };
  // Partie calme (pas de ponte ni de horde), son actif le temps de la fonction (volume inchangé), puis tout est remis
  const calme = 'function calme(){ __rts.rtsStart(); var R = __rts.RTS; R.nests.forEach(function(n){ n.spawnT = 1e9; }); R.hordeT = 1e9; clearZombies(); S.money = 1e8; __rtsSons.remise(); Snd.voix = []; return R; }';
  const actif = body => J(new Function(calme + ' var on0 = Snd.on; Snd.on = true; try { ' + body + ' } finally { Snd.on = on0; __rtsSons.remise(); }'));
  const fin = () => J(function(){ if (__rts.RTS.pilot) __rts.rtsUnpilot(); if (__rts.RTS.on){ __rts.RTS.paused = false; __rts.rtsQuit(); } localStorage.removeItem('dt_rts_partie'); var p = document.getElementById('rtsPanel'); if (p) p.classList.add('hide'); __rtsSons.remise(); });

  test('RTS sons : chaque famille d’arme a son propre son (plus de « boom » pour tout)', () => {
    exiger(); avecAudio(); reset();
    const r = actif(`
      var R = calme(), RS = __rtsSons.RSON, o = { fam:{}, boom:0, joue:{} }, b0 = Snd.boom;
      Snd.boom = function(){ o.boom++; return b0.apply(this, arguments); };
      try {
        var L = [];
        ['rifle', 'gunner', 'sniper', 'flamebot', 'rocket', 'heavy', 'mech', 'tank', 'heli', 'jet', 'warthog', 'bomber'].forEach(function(t){
          var u = __rts.rtsSpawnUnit(t, 0, -10); L.push({ nom:t, S2:rtsS2(u) });
          if (RTS_UNITS[t].w2) L.push({ nom:t + ' (2e arme)', S2:rtsS2b(u) });
          if (RTS_GUNS[t]){ __rts.rtsUpgBuy(t, RTS_GUNS[t].k); L.push({ nom:t + ' (canon)', S2:rtsS25(u) }); }
        });
        L.push({ nom:'Hellfire', S2:{ fam:'missile', tier:0, dmg:300, splash:4, snd:'rocket' } });
        ['t_mg', 't_cannon', 't_flame', 't_mortar', 't_tesla'].forEach(function(t){ L.push({ nom:t, S2:Object.assign({}, RTS_BLD[t].turret, { tier:0 }) }); });
        __rts.rtsSpawnAt(0, -30, 4, 1, 'walker'); zombies.forEach(function(z){ z.hp = z.maxHp = 1e9; z.speed = 0; });
        L.forEach(function(T){
          __rtsSons.remise(); RS.dernier = ''; var n0 = RS.crees;
          rtsHit(new THREE.Vector3(0, 2.5, -14), zombies[0], 'z', T.S2);
          o.fam[T.nom] = RS.crees > n0 ? RS.dernier : '(rien)';
        });
        // Explosions : la recette suit le rayon (plus long et plus grave quand c'est gros)
        __rtsSons.remise(); var e0 = RS.joues.explosion || 0;
        rtsFxBlast(0, -30, { splash:3.5, dmg:1, tier:0 }); RS.cles = {}; rtsFxBlast(0, -30, { splash:11, dmg:1, tier:1, big:true });
        o.expl = (RS.joues.explosion || 0) - e0;
        var t = Snd.ctx.currentTime; o.durPetite = __rtsSons.rsBoomRecette(3.5)(t, Snd.master); o.durGrosse = __rtsSons.rsBoomRecette(11, true)(t, Snd.master);
        // Titan et Béhémoth
        var d0 = RS.dem.onde || 0, c0 = RS.dem.crachat || 0;
        if (ZTYPES.titan){ var ti = __rts.rtsSpawnAt(0, -30, 1, 0, 'titan') && zombies[zombies.length - 1]; ti.abT = 0; rtsBossAbility(ti, .01); }
        if (ZTYPES.behemoth){ var be = __rts.rtsSpawnAt(0, -20, 1, 0, 'behemoth') && zombies[zombies.length - 1]; be.abT = 0; rtsBossAbility(be, .01); }
        o.onde = ZTYPES.titan ? (RS.dem.onde || 0) - d0 : 1; o.crachat = ZTYPES.behemoth ? (RS.dem.crachat || 0) - c0 : 1;
        o.recettes = Object.keys(__rtsSons.RS_TIR);
      } finally { Snd.boom = b0; }
      return o;
    `);
    fin();
    const F = r.fam, att = { rifle:'fusil', gunner:'mitrailleuse', sniper:'elite', flamebot:'feu', rocket:'roquette', heavy:'laser', mech:'minigun', 'mech (2e arme)':'roquette',
      tank:'canon', 'tank (canon)':'mitrailleuse', heli:'roquette', 'heli (canon)':'brrrt', jet:'brrrt', warthog:'brrrt', bomber:'canon40', 'bomber (2e arme)':'obus105', 'bomber (canon)':'minigun',
      Hellfire:'missile', t_mg:'mitrailleuse', t_cannon:'canon', t_flame:'feu', t_mortar:'mortier', t_tesla:'tesla' };
    Object.keys(att).forEach(k => egal(F[k], att[k], 'Famille sonore de ' + k));
    egal(r.boom, 0, 'Snd.boom (son du toit) ne doit plus servir aux armes du RTS');
    egal(r.expl, 2, 'Explosions jouées (petite et grosse)');
    ok(r.durGrosse > r.durPetite + 1.5, 'La grosse explosion dure plus longtemps : ' + r.durPetite.toFixed(1) + ' s et ' + r.durGrosse.toFixed(1) + ' s');
    egal(r.onde, 1, 'Onde du Titan'); egal(r.crachat, 1, 'Crachat du Béhémoth');
    ['fusil', 'mitrailleuse', 'minigun', 'brrrt', 'elite', 'canon', 'canon40', 'roquette', 'missile', 'mortier', 'obus105', 'laser', 'tesla', 'feu', 'crachat', 'onde'].forEach(f => ok(r.recettes.indexOf(f) >= 0, 'Recette ' + f));
  });

  test('RTS sons : placés (loin = plus faible, plus sourd et en retard ; gauche ou droite selon l’écran)', () => {
    exiger(); avecAudio(); reset();
    const r = actif(`
      var R = calme(), SP = __rtsSons.rsSpot; visuals(1 / 30);
      var c = SP(R.cam.x, 0, R.cam.z, 20), loin = SP(R.cam.x, 0, R.cam.z - 150, 20), g = SP(R.cam.x - 40, 0, R.cam.z, 20), d = SP(R.cam.x + 40, 0, R.cam.z, 20), tl = SP(R.cam.x, 0, R.cam.z - 1500, 20);
      // retard de la vitesse du son : une explosion lointaine part plus tard
      var RS = __rtsSons.RSON; __rtsSons.remise(); rtsSonBoom(R.cam.x, R.cam.z - 150, 4); var v = RS.voix[RS.voix.length - 1];
      return { c:c, loin:loin, g:g, d:d, tl:tl, retard:v ? v.retard : 0, joue:!!v };
    `);
    fin();
    ok(r.c.vol > .5, 'Au centre de l’écran, bien fort : ' + r.c.vol.toFixed(2));
    ok(r.loin.vol < r.c.vol / 3 && r.loin.fc < r.c.fc / 2, 'À 150 m : plus faible et plus sourd (' + r.loin.vol.toFixed(2) + ', ' + Math.round(r.loin.fc) + ' Hz)');
    ok(r.g.pan < -.25 && r.d.pan > .25, 'Gauche et droite : ' + r.g.pan.toFixed(2) + ' / ' + r.d.pan.toFixed(2));
    ok(r.tl.vol < .04, 'Très loin : sous le seuil (aucun nœud créé)');
    ok(r.joue && r.retard > .3, 'Explosion lointaine en retard (vitesse du son) : ' + (r.retard || 0).toFixed(2) + ' s');
  });

  test('RTS sons : 40 unités pendant 60 s, plafond de voix tenu et aucune voix qui s’accumule', () => {
    exiger(); avecAudio(); reset();
    const r = actif(`
      var R = calme(), A = __rtsSons, RS = A.RSON, F = A.RSON_FAM, types = ['rifle', 'gunner', 'gunner', 'sniper', 'flamebot', 'rocket', 'heavy', 'tank', 'heli', 'jet', 'warthog', 'mech', 'bomber'];
      var U = []; for (var i = 0; i < 40; i++){ var t = types[i % types.length], u = __rts.rtsSpawnUnit(t, (i % 8) * 9 - 32, -Math.floor(i / 8) * 9); U.push({ x:u.g.position.x, z:u.g.position.z, S2:rtsS2(u), rate:RTS_UNITS[t].rate }); }
      ['t_mg', 't_cannon', 't_flame', 't_mortar', 't_tesla'].forEach(function(b, k){ U.push({ x:k * 8 - 16, z:10, S2:Object.assign({}, RTS_BLD[b].turret, { tier:0 }), rate:RTS_BLD[b].turret.rate }); });
      var max = 0, maxF = {}, trop = '', c0 = RS.crees, l0 = RS.liberees, dt = 1 / 20, g = 99;
      var al = function(){ g = g * 16807 % 2147483647; return (g - 1) / 2147483646; };
      for (var f = 0; f < 60 / dt; f++){
        RS.decal += dt;
        for (var k = 0; k < U.length; k++){ var x = U[k]; if (al() < x.rate * dt){ rtsSonTir({ x:x.x, y:2, z:x.z }, { x:x.x, y:1, z:x.z - 20 }, x.S2); if (x.S2.splash) rtsSonBoom(x.x, x.z - 20, x.S2.splash); } }
        A.rsPurge(Snd.ctx.currentTime + RS.decal);
        var vv = RS.voix.filter(function(v){ return !v.mourante; }); max = Math.max(max, vv.length);
        var par = {}; vv.forEach(function(v){ par[v.fam] = (par[v.fam] || 0) + 1; });
        Object.keys(par).forEach(function(fa){ maxF[fa] = Math.max(maxF[fa] || 0, par[fa]); var cap = isTouch ? F[fa].maxC : F[fa].max; if (par[fa] > cap) trop = fa + ' : ' + par[fa] + ' > ' + cap; });
      }
      var o = { max:max, cap:A.RSON_MAX, trop:trop, maxF:maxF, crees:RS.crees - c0, enVie:RS.voix.length, fuite:(RS.crees - c0) - (RS.liberees - l0) - RS.voix.length };
      A.rsPurge(Snd.ctx.currentTime + RS.decal + 30); o.apres = RS.voix.length; o.refus = RS.refus; o.espaces = RS.espaces;
      return o;
    `);
    fin();
    ok(r.crees > 300, 'Des sons ont joué : ' + r.crees);
    ok(r.max <= r.cap, 'Voix du RTS à la fois : ' + r.max + ' (plafond ' + r.cap + ')');
    egal(r.trop, '', 'Plafond d’une famille dépassé');
    egal(r.fuite, 0, 'Voix créées = voix libérées + voix en cours');
    egal(r.apres, 0, 'Toutes les voix libérées une fois finies');
    ok(r.refus > 0 && r.espaces > 0, 'Le mixage a choisi (refusés ' + r.refus + ', espacés ' + r.espaces + ')');
  });

  test('RTS sons : rien ne joue et aucun nœud audio n’est créé quand le son est coupé', () => {
    exiger(); avecAudio(); reset();
    const r = J(new Function(calme + `
      var R = calme(), c = Snd.ctx, n = 0, noms = ['createOscillator', 'createBufferSource', 'createGain', 'createBiquadFilter', 'createStereoPanner', 'createDynamicsCompressor'], orig = {}, o = { err:[] };
      __rts.rtsSpawnAt(R.cam.x, R.cam.z - 5, 5, 1, 'walker');
      noms.forEach(function(k){ orig[k] = c[k]; if (orig[k]) c[k] = function(){ n++; return orig[k].apply(c, arguments); }; });
      var on0 = Snd.on; Snd.on = false;
      try {
        var p = new THREE.Vector3(R.cam.x, 2, R.cam.z), A = __rtsSons;
        ['rifle', 'gunner', 'sniper', 'flamebot', 'rocket', 'heavy', 'tank', 'jet', 'bomber'].forEach(function(t){ try { var u = __rts.rtsSpawnUnit(t, R.cam.x, R.cam.z); rtsSonTir(p, p, rtsS2(u)); } catch (e) { o.err.push(t + ' : ' + e.message); } });
        [function(){ rtsSonBoom(R.cam.x, R.cam.z, 11, { big:true }); rtsSonOnde(R.cam.x, R.cam.z); rtsSonCrachat(R.cam.x, R.cam.z); rtsSonMortier(0, 0, 5, 5, 1); },
         function(){ rtsSonAlerte(5); rtsSonSiege(); rtsSonSiegeDebut(); rtsSonHorde(R.cam.x, R.cam.z); rtsSonRuche(0, -100); rtsSonRucheMort(0, -100); rtsSonLiberee(); },
         function(){ rtsSonNid(R.cam.x, R.cam.z); rtsSonBatiment(); rtsSonUnite(R.units[0]); rtsSonOrdre(); rtsSonChoix(); rtsSonPerte(R.units[0]); rtsSonFin(false); rtsSonGrogne(); },
         function(){ var u = __rts.rtsSpawnUnit('tank', R.cam.x, R.cam.z); R.pilot = u; A.rsMoteurTick(1 / 30); o.moteur = !!A.RSON.mot; R.pilot = null; A.rsMoteurTick(1 / 30); }
        ].forEach(function(f, i){ try { f(); } catch (e) { o.err.push(i + ' : ' + e.message); } });
      } finally { noms.forEach(function(k){ if (orig[k]) c[k] = orig[k]; }); Snd.on = on0; }
      o.n = n; o.voix = __rtsSons.RSON.voix.length;
      return o;
    `));
    fin();
    egal(r.err.join(' | '), '', 'Erreurs');
    egal(r.n, 0, 'Nœuds audio créés avec le son coupé');
    egal(r.voix, 0, 'Voix en cours');
    ok(!r.moteur, 'Pas de moteur avec le son coupé');
  });

  test('RTS sons : siège, Ruche, base attaquée et vallée libérée sonnent une fois ; ordres pas à chaque clic', () => {
    exiger(); avecAudio(); reset();
    const r = actif(`
      var R = calme(), RS = __rtsSons.RSON, o = {}, m = function(k){ return RS.momentsJoues[k] || 0; };
      var s0 = m('siege'); __rtsRuche.rtsSiegeAnnonce(); o.siege = m('siege') - s0;
      var d0 = m('siegeDebut'); R.t = 1e4; __rtsRuche.rtsSiegeGo(); o.siegeDebut = m('siegeDebut') - d0;
      var r0 = m('ruche'), N = __rtsRuche.RTS_REGL.ruche.nids;
      for (var i = 0; i < N; i++){ var n = rtsNestsAlive().sort(function(a, b){ return b.z - a.z; })[0]; __rts.rtsNestDie(n); }
      __rtsRuche.rtsRucheCheck(); __rtsRuche.rtsRucheCheck(); visuals(1 / 30); o.ruche = m('ruche') - r0; o.nids = RS.moments.nid || 0;
      // Base attaquée : deux fois de suite, le palier n'est redit qu'une fois
      if (typeof RTS_AL === 'object'){ RTS_AL.pcd = {}; RTS_AL.t = 0; var a0 = m('alerte'); rtsAlertShow('qg', R.base, 'QG attaqué'); rtsAlertShow('qg', R.base, 'QG attaqué'); o.alerte = m('alerte') - a0; } else o.alerte = 1;
      // Vallée libérée : quand le panneau s'affiche
      var l0 = m('liberee'); R.victoire = { v:1, fer:0, neuve:false, t:60, nids:8, tues:1, pertes:0 }; __rtsRuche.rtsVictoire(); o.liberee = m('liberee') - l0; R.paused = false;
      // Ordres : dix clics rapides, un seul bip
      RS.cd = {}; var b0 = m('ordre'); for (var k = 0; k < 10; k++) rtsSonOrdre(); o.ordres = m('ordre') - b0;
      // Bâtiment posé et unité produite
      var t0 = m('batiment'), pose = null; for (var bx = -24; bx <= 24 && !pose; bx += 4) for (var bz = -24; bz <= 20 && !pose; bz += 4) if (rtsBldOk('t_mg', bx, bz) === '') pose = rtsBuild('t_mg', bx, bz, 0); o.bat = m('batiment') - t0;
      var u0 = m('unite'); __rts.rtsBuy('rifle'); o.unite = m('unite') - u0;
      return o;
    `);
    fin();
    egal(r.siege, 1, 'Sirène du siège'); egal(r.siegeDebut, 1, 'Début du siège');
    egal(r.ruche, 1, 'Cri de la Ruche, une seule fois'); ok(r.nids >= 8, 'Nids détruits : ' + r.nids);
    egal(r.alerte, 1, 'Alerte « QG attaqué » une seule fois'); egal(r.liberee, 1, 'Vallée libérée');
    egal(r.ordres, 1, 'Dix ordres rapides : un seul bip');
    egal(r.bat, 1, 'Bâtiment posé'); egal(r.unite, 1, 'Unité produite');
  });

  test('RTS sons : moteur du véhicule piloté, selon le véhicule, coupé en sortant', () => {
    exiger(); avecAudio(); reset();
    const r = actif(`
      var R = calme(), A = __rtsSons, o = {};
      ['tank', 'heli', 'jet', 'bomber', 'mech', 'rifle'].forEach(function(t){
        var u = __rts.rtsSpawnUnit(t, 0, -20); __rts.rtsPilot(u); visuals(1 / 30); visuals(1 / 30);
        o[t] = A.RSON.mot ? A.RSON.mot.type : '(rien)';
        __rts.rtsUnpilot(); visuals(1 / 30); o[t + '_apres'] = !!A.RSON.mot;
      });
      var tu = R.blds.filter(function(b){ return b.B.turret; })[0]; if (tu && typeof rtsTurretPilot === 'function'){ rtsTurretPilot(tu); visuals(1 / 30); o.tourelle = !!A.RSON.mot; __rts.rtsUnpilot(); } else o.tourelle = false;
      return o;
    `);
    fin();
    const att = { tank:'tank', heli:'heli', jet:'jet', bomber:'helices', mech:'mech', rifle:'robot' };
    Object.keys(att).forEach(t => { egal(r[t], att[t], 'Moteur de ' + t); egal(r[t + '_apres'], false, 'Moteur coupé en quittant ' + t); });
    egal(r.tourelle, false, 'Pas de moteur dans une tourelle');
  });

  test('RTS sons : mesure hors ligne (40 unités : pas de saturation, voix au plafond ; niveaux comme ceux du toit)', async () => {
    exiger(); avecAudio();
    if (lire('typeof OfflineAudioContext === "function"') !== true) ignorer('Pas d’OfflineAudioContext');
    const r = await J(function(){
      var A = __rtsSons, L = A.rsListeMesures().filter(function(m){ return /Canon du tank|Mitrailleuse|Explosion 11|Toit : grenade|Toit : fusil \(|Sortie de la Ruche|Moteur : tank/.test(m.nom); }), res = {};
      var p = Promise.resolve();
      L.forEach(function(m){ p = p.then(function(){ return A.rsRendre(m.duree, m.jouer).then(function(x){ res[m.nom] = x; }); }); });
      return p.then(function(){ return A.rsScenario40(); }).then(function(sc){ return { sons:res, sc:sc }; });
    });
    const S = r.sons, c = r.sc, g = k => (S[k] || {}).court;
    ok(c.picLin <= .97, 'Crête du scénario chargé : ' + c.pic + ' dBFS');
    ok(c.court > -30, 'Le mélange s’entend : ' + c.court + ' dBFS');
    ok(c.voixMax > 4 && c.voixMax <= c.cap, 'Voix du RTS au pire moment : ' + c.voixMax + ' (plafond ' + c.cap + ')');
    ok(c.actif <= 15, 'Limiteur actif ' + c.actif + ' % du temps (pas de pompage)');
    ok(g('Mitrailleuse') <= g('Toit : fusil (rifle)') + 2, 'Mitrailleuse pas plus forte que le fusil du toit : ' + g('Mitrailleuse') + ' / ' + g('Toit : fusil (rifle)'));
    ok(g('Explosion 11 m (105 mm)') <= g('Toit : grenade (boom 1)') + 2 && g('Explosion 11 m (105 mm)') > g('Toit : grenade (boom 1)') - 6, 'Grosse explosion au niveau de la grenade du toit : ' + g('Explosion 11 m (105 mm)') + ' / ' + g('Toit : grenade (boom 1)'));
    ok(g('Canon du tank') > g('Mitrailleuse') + 8, 'Le canon du tank est bien plus gros que la mitrailleuse');
    ok(g('Sortie de la Ruche (cri)') > -20, 'Le cri de la Ruche s’entend : ' + g('Sortie de la Ruche (cri)'));
    ok(g('Moteur : tank') < -18 && g('Moteur : tank') > -32, 'Moteur du tank en fond : ' + g('Moteur : tank'));
  });
})();
