'use strict';
/* Tests de la 6e ville du toit, la Centrale (dossier 117) : décor dans les 4 styles, déblocage après le Port,
   mode infini, robot et défi du jour inchangés, irradié et sa flaque, boss « le Cœur » et ses transformateurs. */
(function(){
  if (typeof test !== 'function') return;
  const exiger = () => { if (lire('typeof __centrale === "object" && __centrale.idx >= 0') !== true) ignorer('La Centrale absente (js/71-centrale.js)'); };
  const IDX = () => J('__centrale.idx');

  test('Centrale : 6e ville après le Port, 12 vagues, plus dure que le Port', () => {
    exiger(); reset();
    const r = J(function(){
      var i = __centrale.idx, L = LOCS[i], Pt = LOCS[i - 1];
      return { i: i, prec: Pt.id, waves: L.waves, style: L.style, fin: L.end, tot1: wavePlan(1, L).total,
        hp: wavePlan(3, L).hpMult / wavePlan(3, Pt).hpMult, dmg: wavePlan(3, L).dmgMult / wavePlan(3, Pt).dmgMult,
        total: cityTotal(L), totalPort: cityTotal(Pt) };
    });
    egal(r.i, 5, 'Rang de la Centrale'); egal(r.prec, 'port', 'Ville d’avant');
    egal(r.waves, 12, 'Vagues'); egal(r.style, 'centrale', 'Style du décor'); egal(r.fin, 'reacteur', 'Bout de la rue');
    egal(r.tot1, Math.round(30 * (1 + .15 * 5)), 'Vague 1 : +15 % par ville');
    ok(r.hp >= 1.12 && r.dmg >= 1.12, 'Plus dure que le Port : vie ×' + r.hp.toFixed(2) + ', dégâts ×' + r.dmg.toFixed(2));
    ok(r.total > r.totalPort * 1.4, 'Plus de zombies que le Port : ' + r.total + ' contre ' + r.totalPort);
  });

  test('Centrale : se bâtit sans erreur dans les 4 styles, appels de dessin sous le plafond', () => {
    exiger(); reset();
    const r = J(function(){
      var i = __centrale.idx, out = [], j0 = (window.JOURNAL || []).length, avant = __style.STY.pref;
      ['actuel', 'ameliore', 'hd', 'ultra'].forEach(function(st){
        // Le décor et la météo tirés au hasard font varier le compte : on garde le plus petit de 3 rues
        __style.styleSet(st); var appels = 1e9;
        for (var q = 0; q < 3; q++){
          startLocation(i); clearZombies(); state = 'menu'; yaw = 0; pitch = -.16; camera.rotation.set(pitch, yaw, 0); camera.updateMatrixWorld();
          visuals(1 / 30); renderer.render(scene, camera); appels = Math.min(appels, renderer.info.render.calls);
        }
        var C = world.userData.centrale;
        out.push({ st: st, appels: appels, transfos: C ? C.transfos.length : 0, gyros: C ? C.gyros.length : 0, tours: C ? C.tours.length : 0, fx: !!__centrale.CT.fx, ici: __centrale.ctrIci() });
      });
      __style.styleSet(avant);
      // Le Port, pour comparer
      startLocation(4); clearZombies(); state = 'menu'; camera.rotation.set(-.16, 0, 0); camera.updateMatrixWorld(); visuals(1 / 30); renderer.render(scene, camera);
      var port = renderer.info.render.calls, ici = __centrale.ctrIci();
      return { out: out, port: port, portIci: ici, journal: (window.JOURNAL || []).length - j0 };
    });
    egal(r.journal, 0, 'Erreurs gardées dans JOURNAL');
    r.out.forEach(o => {
      egal(o.transfos, 3, o.st + ' : transformateurs de la rue'); ok(o.gyros >= 4, o.st + ' : gyrophares ' + o.gyros); egal(o.tours, 2, o.st + ' : tours de refroidissement');
      ok(o.fx && o.ici, o.st + ' : effets posés');
      ok(o.appels <= 185 && o.appels <= r.port + 30, // depuis la fusion du décor (dossier 120), le Port est descendu plus que la Centrale : écart de 7 à 16 selon le tirage ; le plafond par ville est dans t-fusion.js
         o.st + ' : ' + o.appels + ' appels de dessin (Port : ' + r.port + ')');
    });
    ok(!r.portIci, 'Les effets de la Centrale ne restent pas au Port');
  });

  test('Centrale : rien ne fuit quand la rue est rebâtie', () => {
    exiger(); reset();
    const r = J(function(){
      startLocation(__centrale.idx); renderer.render(scene, camera);
      // Le décor tiré au hasard change le compte d'une rue à l'autre (sans fuite) : base = le plus haut de 4 rues,
      // puis 8 rues de plus ; une vraie fuite monte à chaque rue, donc même le plus bas des 4 dernières dépasserait la base.
      var g1 = 0, t1 = 0, gF = 1e9, tF = 1e9, k;
      for (k = 0; k < 4; k++){ buildWorld(curLoc); renderer.render(scene, camera); g1 = Math.max(g1, renderer.info.memory.geometries); t1 = Math.max(t1, renderer.info.memory.textures); }
      for (k = 0; k < 8; k++){ buildWorld(curLoc); renderer.render(scene, camera); if (k >= 4){ gF = Math.min(gF, renderer.info.memory.geometries); tF = Math.min(tF, renderer.info.memory.textures); } }
      return { g1: g1, t1: t1, g2: gF, t2: tF, n: scene.children.length };
    });
    ok(r.g2 <= r.g1 + 3, 'Géométries après 8 rues de plus : ' + r.g1 + ' puis ' + r.g2);
    ok(r.t2 <= r.t1 + 2, 'Textures après 8 rues de plus : ' + r.t1 + ' puis ' + r.t2);
  });

  test('Centrale : débloquée en libérant le Port ; l’infini reste débloqué par les 5 premières villes', () => {
    exiger(); reset();
    const r = J(function(){
      var o = {}, i = __centrale.idx;
      startLocation(i - 1); victory();
      o.unl = P.unlocked; o.msg = $('overBest').textContent; o.bouton = $('btnAgain').textContent;
      // Profil qui a libéré les 5 premières villes (avant la Centrale)
      LOCS.slice(0, 5).forEach(function(L){ P.wins[L.id] = 1; });
      o.inf = __inf.infUnlocked(); o.n = __inf.infWonCount(); o.camp = campaignIdx();
      // Un vieux profil (unlocked 5, Port libéré) voit la Centrale débloquée au chargement
      P.unlocked = 5; __centrale.debloquer(); o.vieux = P.unlocked;
      // Libérer la Centrale : texte de la dernière ville, succès
      startLocation(i); victory(); o.fin = $('overBest').textContent; o.succes = (P.st && P.st.centrale) || 0;
      __centrale.CT.chk = 0; visuals(1 / 30); o.succes = (P.st && P.st.centrale) || 0;
      // L'infini se joue à la Centrale (décor seulement : pas d'irradié, pas de Cœur)
      var L = __inf.infStart(i, true); o.infId = curLoc.id; o.infCopie = !!curLoc.inf;
      o.infIrr = wavePlan(12).queue.filter(function(t){ return t === 'irradie'; }).length;
      o.infBoss = bossVariant(12, curLoc).name;
      state = 'test'; __inf.infLeave();
      return o;
    });
    egal(r.unl, 6, 'P.unlocked après le Port');
    ok(/Nouvelle ville débloquée : La Centrale/.test(r.msg), 'Message : ' + r.msg);
    ok(/Centrale/.test(r.bouton), 'Bouton : ' + r.bouton);
    ok(r.inf, 'Mode infini débloqué avec les 5 premières villes (' + r.n + ')');
    egal(r.camp, 5, '« Jouer » lance la Centrale');
    egal(r.vieux, 6, 'Vieux profil : la Centrale débloquée');
    ok(/Cœur/.test(r.fin), 'Texte de la dernière ville : ' + r.fin);
    egal(r.succes, 1, 'Succès « Courant coupé »');
    egal(r.infId, 'centrale', 'Mode infini à la Centrale'); ok(r.infCopie, 'Copie infinie');
    egal(r.infIrr, 0, 'Pas d’irradié en mode infini'); ok(!/Cœur/.test(r.infBoss), 'Pas de Cœur en mode infini : ' + r.infBoss);
  });

  test('Centrale : le robot garde ses 5 décors, le défi du jour ne change pas', () => {
    exiger(); reset();
    const r = J(function(){
      var o = { rues: [], carrefours: [], ordre: '' };
      if (typeof mbRoutes === 'function'){
        __t.graine(7, function(){ for (var k = 0; k < 40; k++) mbRoutes().forEach(function(x){ o.carrefours.push(x.loc.id); }); });
      }
      o.ordre = LOCS.map(function(L){ return L.id; }).join(',');
      if (typeof __mech === 'object' && typeof mechStreet === 'function'){
        P.mech.unlocked = true; __mech.mechStart();
        for (var s = 1; s <= 9; s++){ MECH.street = s; MECH.route = null; mechStreet(true); o.rues.push(curLoc.id); }
        __mech.mechQuit();
      }
      // Défi : la ville du décor est tirée parmi les 5 premières (même formule qu'avant la 6e ville)
      var bad = [];
      for (var d = 0; d < 120; d++){
        var k = __defi.defiKeyAdd('2026-11-01', d), raw = __defi.defiRaw(k, 0);
        var R = defiRng(defiHash('dernier-toit|defi|' + k + '|0'));
        if (raw.loc !== Math.floor(R() * 5)) bad.push(k);
      }
      o.defi = bad.length;
      return o;
    });
    if (r.rues.length) egal(r.rues.join(','), 'village,ville,banlieue,centre,port,village,ville,banlieue,centre', 'Décors des 9 rues du robot');
    if (r.carrefours.length) egal(r.carrefours.indexOf('centrale'), -1, 'Carrefours du robot : jamais la Centrale');
    egal(r.ordre, 'village,ville,banlieue,centre,port,centrale', 'LOCS remis tel quel après les carrefours');
    egal(r.defi, 0, 'Défi du jour : ville tirée comme avant');
  });

  test('Centrale : irradiés dans chaque vague (total inchangé), jamais ailleurs', () => {
    exiger(); reset();
    const r = J(function(){
      var i = __centrale.idx, L = LOCS[i], o = { irr: [], tot: [], ailleurs: 0 };
      for (var w = 1; w <= L.waves; w++){
        var q = wavePlan(w, L).queue;
        o.irr.push(q.filter(function(t){ return t === 'irradie'; }).length);
        o.tot.push(q.filter(function(t){ return t !== 'boss'; }).length === Math.round(30 * w * (1 + .15 * L.off)));
      }
      LOCS.slice(0, i).forEach(function(L2){ for (var w = 1; w <= L2.waves; w++) o.ailleurs += wavePlan(w, L2).queue.filter(function(t){ return t === 'irradie'; }).length; });
      return o;
    });
    ok(r.irr.every(n => n >= 1), 'Irradiés par vague : ' + r.irr.join(','));
    ok(r.irr[11] > r.irr[0] * 5, 'De plus en plus nombreux : ' + r.irr.join(','));
    ok(r.tot.every(Boolean), 'Le nombre de zombies par vague a changé');
    egal(r.ailleurs, 0, 'Irradiés hors de la Centrale');
  });

  test('Centrale : l’irradié laisse une flaque qui ronge la barricade seulement près d’elle', () => {
    exiger(); reset();
    const r = J(function(){
      var o = {};
      startLocation(__centrale.idx); startWave(); __t.geler(); clearZombies();
      // Loin de la barricade : la flaque luit mais ne ronge rien
      var z = __t.placer('irradie', 0, -40); o.vu = !!(P.mtVus && P.mtVus.irradie); o.inst = !!z.inst;
      S.bar = S.barMax; damage(z, 1e9, false, z.g.position.clone());
      var F = __centrale.CT.flaques.filter(function(f){ return f.on; }); o.loin = F.length; o.loinRonge = F.some(function(f){ return f.ronge; });
      __t.sim(3); o.barLoin = S.bar;
      // Tout près de la barricade : elle ronge pendant quelques secondes, puis s'efface
      var b0 = S.bar; z = __t.placer('irradie', 2, BAR_Z - 1); damage(z, 1e9, false, z.g.position.clone());
      o.pres = __centrale.CT.flaques.filter(function(f){ return f.on && f.ronge; }).length;
      __t.sim(3); o.perte3 = b0 - S.bar;
      __t.sim(4); o.perte7 = b0 - S.bar; o.reste = __centrale.CT.flaques.filter(function(f){ return f.on; }).length;
      __t.sim(3); o.perte10 = b0 - S.bar;
      visuals(1 / 30); o.dessin = __centrale.ctrFlaqueIM.count;
      clearZombies(); o.range = __centrale.CT.flaques.filter(function(f){ return f.on; }).length;
      state = 'test';
      return o;
    });
    ok(r.vu, 'Bandeau de la première rencontre (P.mtVus.irradie)');
    ok(r.inst, 'L’irradié est dessiné par instances');
    egal(r.loin, 1, 'Une flaque où il tombe'); ok(!r.loinRonge, 'Loin de la barricade : la flaque ne ronge pas');
    egal(r.pres, 1, 'Flaque contre la barricade');
    ok(r.perte3 > 0, 'La flaque ronge la barricade : ' + r.perte3);
    ok(r.perte7 > r.perte3 && Math.abs(r.perte10 - r.perte7) < 1e-6, 'Elle s’arrête après quelques secondes (' + r.perte3 + ', ' + r.perte7 + ', ' + r.perte10 + ')');
    egal(r.reste, 0, 'Flaques effacées'); egal(r.range, 0, 'clearZombies range les flaques');
  });

  test('Centrale : le Cœur à la vague 12, bouclier et recharge tant que les transformateurs tiennent', () => {
    exiger(); reset();
    const r = J(function(){
      var o = {}, i = __centrale.idx, L = LOCS[i], C = __centrale;
      o.p12 = wavePlan(12, L).boss || ''; o.p12n = wavePlan(12, L).queue.filter(function(t){ return t === 'boss'; }).length;
      o.p10 = wavePlan(10, L).boss || ''; o.p5 = wavePlan(5, L).boss || ''; o.p11 = wavePlan(11, L).boss || '';
      startLocation(i); S.wave = 12; plan = wavePlan(12); plan.queue = ['walker']; spawnT = 1e9; state = 'playing'; showScreen(null);
      var z = spawnZombie('boss'); o.nom = z.bossName; o.coeur = !!z.coeur; o.fis = (z.ctrFis || []).length;
      o.cibles = C.CT.transfos.filter(function(t){ return hitMeshes.indexOf(t.cible) >= 0; }).length;
      // Bouclier : 30 % des dégâts (et les plaques au corps : 60 %)
      var h0 = z.hp; damage(z, 1000, false, z.g.position.clone()); o.bouclier = h0 - z.hp;
      // Recharge : 3 transformateurs, 0,6 % par seconde chacun
      z.hp = z.maxHp * .5; var h1 = z.hp; __t.sim(1); o.regen = (z.hp - h1) / z.maxHp;
      // Un tir de pistolet sur un transformateur l'abîme
      var t0 = C.CT.transfos[0]; t0.g.updateMatrixWorld(true); var v = new THREE.Vector3(); t0.cible.getWorldPosition(v);
      camera.position.copy(EYE); camera.lookAt(v); camera.updateMatrixWorld(true); zoomed = false; recoilAcc = 0;
      var hp0 = t0.hp; S.ammo[S.cur] = 5; cool = 0; reloadT = 0; fire(); o.tir = hp0 - t0.hp;
      // Le robot-joueur sait quoi viser
      o.bot = (C.cibleBot() || {}).type;
      // Les trois détruits : à nu, le corps prend tout
      C.CT.transfos.forEach(function(t){ C.ctrTransfoTouche(t, null, 1e9); C.ctrTransfoTouche(t, null, 1e9); });
      o.vivants = C.ctrVivants(); o.ciblesApres = C.CT.transfos.filter(function(t){ return hitMeshes.indexOf(t.cible) >= 0; }).length;
      var h2 = z.hp; damage(z, 1000, false, z.g.position.clone()); o.aNu = h2 - z.hp;
      z.hp = z.maxHp * .5; var h3 = z.hp; __t.sim(1); o.regenApres = z.hp - h3;
      visuals(1 / 30); o.arcs = C.ctrArcs.visible;
      // Mort : succès « Arrêt du cœur »
      damage(z, 1e12, true, z.g.position.clone()); o.mort = !!z.dead; o.succes = (P.st && P.st.coeur) || 0;
      clearZombies(); state = 'test';
      o.rangeVivants = C.ctrVivants();
      return o;
    });
    egal(r.p12, 'Le Cœur', 'Boss de la vague 12'); egal(r.p12n, 1, 'Un seul boss à la vague 12');
    egal(r.p10, 'Le Liquidateur', 'Boss de la vague 10'); egal(r.p5, 'Le Liquidateur', 'Boss de la vague 5'); egal(r.p11, '', 'Pas de boss à la vague 11');
    egal(r.nom, 'Le Cœur', 'Nom'); ok(r.coeur && r.fis >= 5, 'Torse fissuré (' + r.fis + ')');
    egal(r.cibles, 3, 'Les 3 transformateurs deviennent des cibles');
    ok(Math.abs(r.bouclier - 1000 * .3 * .6) < 1, 'Bouclier : ' + r.bouclier + ' au lieu de 180');
    ok(r.regen > .015 && r.regen < .021, 'Recharge en 1 s : ' + (r.regen * 100).toFixed(2) + ' %');
    ok(r.tir > 0, 'Un tir sur un transformateur : ' + r.tir);
    egal(r.bot, 'transfo', 'Cible du robot-joueur');
    egal(r.vivants, 0, 'Transformateurs détruits'); egal(r.ciblesApres, 0, 'Plus des cibles une fois détruits');
    ok(Math.abs(r.aNu - 1000) < 1, 'À nu, le corps prend tout : ' + r.aNu);
    egal(r.regenApres, 0, 'Plus de recharge'); ok(!r.arcs, 'Plus d’arcs');
    ok(r.mort, 'Le Cœur meurt'); egal(r.succes, 1, 'Succès « Arrêt du cœur »');
    egal(r.rangeVivants, 3, 'clearZombies remet les transformateurs');
  });
  test('Centrale : image en Haute définition (dossier 123) : flaque colorée, lumière HD seulement en HD', () => {
    exiger(); reset();
    const r = J(function(){
      var o = {}, C = __centrale, im = C.ctrFlaqueIM, avant = __style.STY.pref;
      o.couleurs = im.instanceColor ? im.instanceColor.array.length : 0;
      startLocation(C.idx);
      var fx = C.CT.fx; o.lum = !!(fx && fx.lumHD); o.groupe = !!(fx && fx.lumHD && fx.lumHD.parent && fx.lumHD.parent !== world);
      __style.styleSet('actuel'); state = 'menu'; visuals(1 / 30); o.actuel = fx && fx.lumHD ? fx.lumHD.visible : null;
      __style.styleSet('ameliore'); visuals(1 / 30); o.ameliore = fx && fx.lumHD ? fx.lumHD.visible : null;
      // Flaque : la couleur de chaque instance est bien écrite (elle s'efface et bat)
      startLocation(C.idx); startWave(); __t.geler(); clearZombies();
      var z = __t.placer('irradie', 0, -30); damage(z, 1e9, false, z.g.position.clone()); visuals(1 / 30);
      o.dessin = im.count; o.c0 = im.instanceColor ? im.instanceColor.array[0] : -1;
      clearZombies(); state = 'test'; __style.styleSet(avant);
      return o;
    });
    ok(r.couleurs >= 14 * 3, 'Couleurs des flaques faites pour toute la réserve : ' + r.couleurs);
    egal(r.dessin, 1, 'Une flaque dessinée'); ok(r.c0 > 0 && r.c0 <= 1.01, 'Sa couleur est écrite : ' + r.c0);
    ok(r.lum && r.groupe, 'Lumière HD posée avec la rue, dans un groupe (pas lue par ambCapture)');
    egal(r.actuel, false, 'Lumière HD cachée en Actuel'); egal(r.ameliore, false, 'Lumière HD cachée en Amélioré');
  });
})();
