'use strict';
/* =====================================================================
   Tests des pouvoirs à recharge (js/21-pouvoirs.js)
   À charger APRÈS tests.js dans tests/index.html :
     <script src="t-pouvoirs.js"></script>
   Réutilise test(), J(), lire(), ok(), egal(), reset(), ignorer() de tests.js.
   Les effets sont avancés avec __pouvoirs.step(sec) : les zombies ne bougent pas pendant la mesure.
   ===================================================================== */
(function(){
  if (typeof test !== 'function' || typeof TESTS === 'undefined') return;
  const avant = TESTS.length;
  const exiger = () => { if (lire('typeof __pouvoirs === "object" && typeof __pouvoirs.powUse === "function"') !== true) ignorer('21-pouvoirs.js non chargé'); };
  // Partie à Saint-Clou, apparitions gelées, rue vide
  function partie(profil){
    reset(profil || null); J('startLocation(0)');
    J(function(){ __t.geler(); clearZombies(); __pouvoirs.pwReset(); });
    egal(J('state'), 'playing', 'État de la partie');
  }

  test('Pouvoirs : trois pouvoirs, boutons et sauvegarde par défaut', () => {
    exiger();
    const r = J(function(){
      return { ids: __pouvoirs.PW_ORDER.join(','), btn: ['grenade', 'molotov', 'strike'].every(function(id){ return !!document.getElementById('pw-' + id); }),
        pow: JSON.stringify(P.pow), lv: [__pouvoirs.PW.grenade.level, __pouvoirs.PW.molotov.level, __pouvoirs.PW.strike.level] };
    });
    egal(r.ids, 'grenade,molotov,strike', 'Pouvoirs');
    ok(r.btn, 'Boutons pw-grenade, pw-molotov, pw-strike absents de index.html');
    ok(r.lv[0] === 1 && r.lv[1] > 1 && r.lv[2] > r.lv[1], 'Niveaux de déblocage : ' + r.lv.join(', '));
    // Ancienne sauvegarde sans P.pow, ou abîmée : valeurs par défaut
    const n = J(function(){
      var keep = P.pow; delete P.pow; __pouvoirs.pwNorm(); var a = JSON.stringify(P.pow);
      P.pow = { grenade: { dmg: 'x', zone: -3, cd: 2.7 }, molotov: null }; __pouvoirs.pwNorm(); var b = P.pow;
      P.pow = keep; return { a: a, g: b.grenade, m: b.molotov, s: b.strike };
    });
    ok(/"grenade":\{"dmg":0,"zone":0,"cd":0,"ch":0\}/.test(n.a), 'Défaut sans P.pow : ' + n.a);
    ok(n.g.dmg === 0 && n.g.zone === 0 && n.g.cd === 2 && n.g.ch === 0, 'Valeurs abîmées mal corrigées : ' + JSON.stringify(n.g));
    ok(n.m && n.m.dmg === 0 && n.s && n.s.ch === 0, 'Pouvoir manquant non recréé');
  });

  test('Pouvoirs : la grenade tue dans son rayon (volant compris), pas en dehors', () => {
    exiger(); partie();
    const r = J(function(){
      var R = __pouvoirs.pwStats('grenade', P.pow.grenade).radius;
      var a = __t.placer('walker', 0, -40), b = __t.placer('walker', R * .7, -40), c = __t.placer('walker', R + 3, -40), d = __t.placer('walker', 0, -40 - R - 3);
      var f = __t.placer('flyer', .5, -40); f.g.position.y = 7;
      var lance = __pouvoirs.powUse('grenade', { x: 0, y: 0, z: -40 });
      var vol = __pouvoirs.pwProj.some(function(o){ return o.m.visible; });
      __pouvoirs.step(3);
      return { lance: lance, vol: vol, a: !!a.dead, b: !!b.dead, c: !!c.dead, d: !!d.dead, f: !!f.dead, chp: c.hp, cmax: c.maxHp, dhp: d.hp };
    });
    ok(r.lance, 'powUse(grenade) a refusé');
    ok(r.vol, 'Aucune grenade en vol (arc visible)');
    ok(r.a && r.b, 'Zombies dans le rayon pas tués');
    ok(r.f, 'Le volant au-dessus de l’explosion n’est pas touché');
    ok(!r.c && !r.d && r.chp === r.cmax && r.dhp === r.cmax, 'Zombies hors du rayon touchés');
  });

  test('Pouvoirs : la recharge empêche de relancer, puis la charge revient', () => {
    exiger(); partie();
    const r = J(function(){
      var cd = __pouvoirs.pwStats('grenade', P.pow.grenade).cd;
      var a = __pouvoirs.powUse('grenade', { x: 0, z: -40 }), b = __pouvoirs.powUse('grenade', { x: 0, z: -40 });
      __pouvoirs.step(cd * .5); var c = __pouvoirs.powUse('grenade', { x: 0, z: -40 });
      __pouvoirs.step(cd * .5 + .2); var ch = __pouvoirs.pwS.grenade.ch, d = __pouvoirs.powUse('grenade', { x: 0, z: -40 });
      state = 'shop'; __pouvoirs.pwRefill(); var e = __pouvoirs.powUse('grenade', { x: 0, z: -40 }); state = 'playing';
      return { cd: cd, a: a, b: b, c: c, ch: ch, d: d, e: e };
    });
    ok(r.cd >= 5, 'Recharge trop courte : ' + r.cd);
    ok(r.a, 'Premier lancer refusé');
    ok(!r.b, 'Deuxième lancer accepté sans recharge');
    ok(!r.c, 'Lancer accepté à mi-recharge');
    egal(r.ch, 1, 'Charge revenue après la recharge');
    ok(r.d, 'Lancer refusé après la recharge');
    ok(!r.e, 'Lancer accepté hors d’une vague');
  });

  test('Pouvoirs : la nappe de feu brûle dans le temps, puis s’éteint', () => {
    exiger(); partie({ level: 3 });
    const r = J(function(){
      var s = __pouvoirs.pwStats('molotov', P.pow.molotov);
      var a = __t.placer('walker', 0, -40); a.hp = a.maxHp = 1e6;
      var w = __t.placer('walker', .5, -40.5);
      var c = __t.placer('walker', s.radius + 3, -40);
      var lance = __pouvoirs.powUse('molotov', { x: 0, z: -40 });
      __pouvoirs.step(2.5); var h1 = a.hp, nappe = __pouvoirs.pwPuddles.some(function(p){ return p.live; });
      __pouvoirs.step(2); var h2 = a.hp;
      __pouvoirs.step(s.dur + 3); var h3 = a.hp, fini = !__pouvoirs.pwPuddles.some(function(p){ return p.live; });
      __pouvoirs.step(2); var h4 = a.hp;
      return { lance: lance, nappe: nappe, h1: h1, h2: h2, h3: h3, h4: h4, w: !!w.dead, c: c.hp === c.maxHp, fini: fini };
    });
    ok(r.lance, 'powUse(molotov) a refusé au niveau 3');
    ok(r.nappe, 'Pas de nappe de feu après l’impact');
    ok(r.h1 < 1e6, 'Pas de brûlure après 2,5 s');
    ok(r.h2 < r.h1 - 50, 'La brûlure ne continue pas dans le temps (' + Math.round(r.h1 - r.h2) + ' en 2 s)');
    ok(r.w, 'Un marcheur dans le feu n’est pas mort');
    ok(r.c, 'Un zombie hors de la nappe a brûlé');
    ok(r.fini, 'La nappe ne s’éteint pas');
    egal(r.h4, r.h3, 'Brûlure après l’extinction');
  });

  test('Pouvoirs : la frappe aérienne arrive après le délai', () => {
    exiger(); partie({ level: 5 });
    const r = J(function(){
      var s = __pouvoirs.pwStats('strike', P.pow.strike);
      var a = __t.placer('walker', 0, -60), b = __t.placer('walker', 0, -60 + s.step * 2), far = __t.placer('walker', 0, -100), side = __t.placer('walker', 17, -60);
      var f = __t.placer('flyer', 0, -58); f.g.position.y = 8;
      var lance = __pouvoirs.powUse('strike', { x: 0, z: -60 });
      __pouvoirs.step(s.delay * .6); var tot = a.hp === a.maxHp && !a.dead, fumee = __pouvoirs.pwStrikes.some(function(k){ return k.live; });
      __pouvoirs.step(s.delay * .4 + 1.5);
      return { lance: lance, tot: tot, fumee: fumee, a: !!a.dead, b: !!b.dead, f: !!f.dead, far: far.hp === far.maxHp, side: side.hp === side.maxHp, delay: s.delay };
    });
    ok(r.lance, 'powUse(strike) a refusé au niveau 5');
    ok(r.delay >= 1, 'Délai trop court : ' + r.delay);
    ok(r.fumee, 'Pas de fumée rouge pendant le délai');
    ok(r.tot, 'Dégâts avant la fin du délai');
    ok(r.a && r.b, 'Zombies sur la ligne de bombes pas tués');
    ok(r.f, 'Volant sur la ligne pas tué');
    ok(r.far, 'Zombie loin de la ligne touché');
    ok(r.side, 'Zombie sur le trottoir d’en face touché');
  });

  test('Pouvoirs : déblocage par niveau et améliorations en ferraille', () => {
    exiger(); partie({ level: 1, scrap: 0 });
    const r = J(function(){
      var u = __pouvoirs.pwUnlocked, o = {};
      o.n1 = [u('grenade'), u('molotov'), u('strike')];
      o.mol1 = __pouvoirs.powUse('molotov', { x: 0, z: -40 }); o.str1 = __pouvoirs.powUse('strike', { x: 0, z: -40 });
      o.upgLocked = __pouvoirs.pwUpgrade('molotov', 'dmg');
      P.level = 3; o.n3 = [u('grenade'), u('molotov'), u('strike')];
      P.level = 5; o.n5 = [u('grenade'), u('molotov'), u('strike')];
      P.scrap = 0; o.pauvre = __pouvoirs.pwUpgrade('grenade', 'dmg');
      var c = __pouvoirs.pwUpgCost('grenade', 'dmg', 0), d0 = __pouvoirs.pwStats('grenade', P.pow.grenade).dmg;
      P.scrap = c + 5; o.achat = __pouvoirs.pwUpgrade('grenade', 'dmg'); o.reste = P.scrap; o.c = c;
      o.plus = __pouvoirs.pwStats('grenade', P.pow.grenade).dmg > d0;
      o.sauve = JSON.parse(localStorage.getItem('dt_prof')).pow.grenade.dmg;
      var r0 = __pouvoirs.pwStats('grenade', P.pow.grenade).cd; P.scrap = 1e6; __pouvoirs.pwUpgrade('grenade', 'cd'); o.cd = __pouvoirs.pwStats('grenade', P.pow.grenade).cd < r0;
      __pouvoirs.pwUpgrade('grenade', 'ch'); o.charges = __pouvoirs.pwStats('grenade', P.pow.grenade).charges;
      for (var i = 0; i < 5; i++) __pouvoirs.pwUpgrade('grenade', 'ch'); o.chMax = P.pow.grenade.ch;
      return o;
    });
    egal(r.n1.join(), 'true,false,false', 'Niveau 1');
    ok(!r.mol1 && !r.str1, 'Pouvoir verrouillé utilisable');
    ok(!r.upgLocked, 'Amélioration achetée sur un pouvoir verrouillé');
    egal(r.n3.join(), 'true,true,false', 'Niveau 3');
    egal(r.n5.join(), 'true,true,true', 'Niveau 5');
    ok(!r.pauvre, 'Amélioration sans ferraille');
    ok(r.achat && r.reste === 5, 'Achat : ' + r.achat + ', reste ' + r.reste + ' (coût ' + r.c + ')');
    ok(r.plus, 'Dégâts pas augmentés');
    egal(r.sauve, 1, 'Niveau sauvé dans dt_prof');
    ok(r.cd, 'Recharge pas réduite');
    egal(r.charges, 2, 'Charges après une amélioration');
    egal(r.chMax, __pouvoirs_max(), 'Plafond des charges');
  });
  // plafond lu dans le jeu
  function __pouvoirs_max(){ return lire('__pouvoirs.PW_MAX.ch'); }

  test('Pouvoirs : les dégâts passent par damage() (armure du boss)', () => {
    exiger(); partie({ level: 5 });
    const r = J(function(){
      var base = damage, n = 0;
      damage = function(){ n++; return base.apply(this, arguments); };
      try {
        __t.placer('walker', 0, -40); __t.placer('walker', 0, -60);
        __pouvoirs.powUse('grenade', { x: 0, z: -40 }); __pouvoirs.powUse('strike', { x: 0, z: -60 });
        __pouvoirs.step(5);
      } finally { damage = base; }
      return n;
    });
    ok(r >= 2, 'damage() appelé ' + r + ' fois');
  });

  test('Pouvoirs : touche Q lance la frappe sans changer d’arme', () => {
    exiger(); partie({ level: 5 });
    const r = J(function(){
      if (typeof KeyboardEvent !== 'function') return null;
      S.owned.shotgun = true; // deux armes : Q changeait d'arme avant les pouvoirs
      var arme = S.cur, ch = __pouvoirs.pwS.strike.ch;
      camera.position.copy(EYE); camera.lookAt(0, 0, -50); camera.updateMatrixWorld(true);
      document.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyQ', key: 'q', bubbles: true }));
      var g = __pouvoirs.pwS.grenade.ch;
      document.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyG', key: 'g', bubbles: true }));
      return { arme: S.cur === arme, strike: __pouvoirs.pwS.strike.ch === ch - 1, grenade: __pouvoirs.pwS.grenade.ch === g - 1 };
    });
    if (r === null) ignorer('KeyboardEvent absent');
    ok(r.strike, 'Q n’a pas lancé la frappe');
    ok(r.grenade, 'G n’a pas lancé la grenade');
    ok(r.arme, 'Q a changé d’arme');
  });

  test('Pouvoirs : effets rangés en fin de partie et au changement de ville', () => {
    exiger(); partie({ level: 5 });
    const r = J(function(){
      __pouvoirs.powUse('grenade', { x: 0, z: -40 }); __pouvoirs.powUse('molotov', { x: 0, z: -30 }); __pouvoirs.powUse('strike', { x: 0, z: -60 });
      __pouvoirs.step(2);
      var avant = __pouvoirs.enCours;
      goMap(); visuals(1 / 30);
      var carte = __pouvoirs.enCours, cache = document.getElementById('pows').classList.contains('hide');
      startLocation(0);
      var pleines = __pouvoirs.pwS.grenade.ch >= 1 && __pouvoirs.pwS.molotov.ch >= 1 && __pouvoirs.pwS.strike.ch >= 1;
      __pouvoirs.powUse('grenade', { x: 0, z: -40 }); gameOver(); visuals(1 / 30);
      return { avant: avant, carte: carte, cache: cache, pleines: pleines, fin: __pouvoirs.enCours, nRoot: __pouvoirs.pwRoot.children.length };
    });
    ok(r.avant, 'Aucun effet en cours avant le nettoyage');
    ok(!r.carte, 'Effets encore visibles sur la carte');
    ok(r.cache, 'Boutons de pouvoirs visibles hors partie');
    ok(r.pleines, 'Charges pas remises au changement de ville');
    ok(!r.fin, 'Effets encore visibles après la fin de partie');
    const n2 = J(function(){
      state = 'playing'; for (var i = 0; i < 20; i++){ __pouvoirs.pwRefill(); __pouvoirs.powUse('grenade', { x: 0, z: -40 }); __pouvoirs.step(.5); }
      __pouvoirs.pwClearFx(); return __pouvoirs.pwRoot.children.length;
    });
    egal(n2, r.nRoot, 'Objets ajoutés à la scène (fuite)');
  });

  // Les tests ajoutés passent avant le test final « Erreurs »
  const ajoutes = TESTS.splice(avant);
  const iErr = TESTS.findIndex(t => t.nom.indexOf('Erreurs') === 0);
  TESTS.splice(iErr < 0 ? TESTS.length : iErr, 0, ...ajoutes);
})();
