'use strict';
/* =====================================================================
   Tests du compagnon sur le toit (js/24-compagnon.js)
   À charger APRÈS tests.js dans tests/index.html :
     <script src="t-compagnon.js"></script>
   Réutilise test(), J(), lire(), ok(), egal(), reset(), ignorer() de tests.js.
   Le compagnon est avancé avec __compagnon.step(sec) : les zombies ne bougent pas pendant la mesure.
   ===================================================================== */
(function(){
  if (typeof test !== 'function' || typeof TESTS === 'undefined') return;
  const exiger = () => { if (lire('typeof __compagnon === "object" && typeof __compagnon.cpnUpdate === "function"') !== true) ignorer('24-compagnon.js non chargé'); };
  // Partie à Saint-Clou, apparitions gelées, rue vide
  function partie(profil){
    reset(profil || null); J('startLocation(0)');
    J(function(){ __t.geler(); clearZombies(); __compagnon.cpnSync(); __compagnon.cpnReset(); });
    egal(J('state'), 'playing', 'État de la partie');
  }
  const tousGagnes = { wins: { village: 1, ville: 1 }, level: 4, scrap: 100000 };

  test('Compagnon : sauvegarde par défaut, aucun compagnon avant Saint-Clou', () => {
    exiger(); reset();
    const r = J(function(){
      var C = __compagnon;
      var a = { ids: C.CPN_ORDER.join(','), act: C.cpnActive(), own: C.CPN_ORDER.some(function(id){ return C.cpnOwned(id); }), sync: C.cpnSync().length };
      // Ancienne sauvegarde sans P.comp, ou abîmée : valeurs par défaut
      delete P.comp; C.cpnNorm(); a.def = JSON.stringify(P.comp);
      P.comp = { act: 'gunner', own: { gunner: false }, lv: { sniper: { dmg: 'x', rate: -2, spec: 3.7 } } }; C.cpnNorm();
      a.bad = P.comp; return a;
    });
    egal(r.ids, 'sniper,dog,gunner', 'Compagnons');
    egal(r.act, '', 'Compagnon actif sans victoire');
    ok(!r.own && r.sync === 0, 'Un compagnon est donné sans remplir la condition');
    ok(/"act":""/.test(r.def) && /"sniper":\{"dmg":0,"rate":0,"spec":0\}/.test(r.def), 'Défaut sans P.comp : ' + r.def);
    egal(r.bad.act, '', 'Compagnon actif non possédé gardé');
    ok(r.bad.lv.sniper.dmg === 0 && r.bad.lv.sniper.rate === 0 && r.bad.lv.sniper.spec === 3, 'Niveaux abîmés mal corrigés : ' + JSON.stringify(r.bad.lv.sniper));
  });

  test('Compagnon : le tireur d’élite se débloque en libérant Saint-Clou', () => {
    exiger(); reset();
    J('startLocation(0)');
    const r = J(function(){
      var C = __compagnon;
      S.wave = curLoc.waves; victory();
      return { own: C.cpnOwned('sniper'), act: C.cpnActive(), vis: C.CPN_MOD.sniper.g.visible, msg: $('overBest').textContent,
        saved: (JSON.parse(localStorage.getItem('dt_prof') || '{}').comp || {}).act, dog: C.cpnOwned('dog'), gunner: C.cpnOwned('gunner') };
    });
    ok(r.own, 'Tireur d’élite non débloqué après Saint-Clou');
    egal(r.act, 'sniper', 'Premier compagnon actif d’office');
    ok(r.vis, 'Modèle du tireur d’élite invisible sur le toit');
    ok(/compagnon/i.test(r.msg), 'Pas d’annonce sur l’écran de fin : ' + r.msg);
    egal(r.saved, 'sniper', 'Compagnon actif dans la sauvegarde');
    ok(!r.dog && !r.gunner, 'Les autres compagnons ne doivent pas être donnés');
  });

  test('Compagnon : recrutement en ferraille et choix du compagnon actif sauvegardé', () => {
    exiger(); reset({ wins: { village: 1 }, scrap: 50 });
    const r = J(function(){
      var C = __compagnon; C.cpnSync();
      var a = { lockedBuy: C.cpnBuy('gunner'), selLocked: C.cpnSelect('gunner'), act0: C.cpnActive() };
      P.wins.ville = 1; a.poor = C.cpnBuy('gunner');
      P.scrap = 1000; var s0 = P.scrap; a.buy = C.cpnBuy('gunner'); a.paid = s0 - P.scrap;
      a.sel = C.cpnSelect('gunner'); a.act = C.cpnActive();
      a.vis = [C.CPN_MOD.sniper.g.visible, C.CPN_MOD.gunner.g.visible];
      a.saved = JSON.parse(localStorage.getItem('dt_prof')).comp.act;
      C.cpnSelect(''); a.none = C.cpnActive(); a.savedNone = JSON.parse(localStorage.getItem('dt_prof')).comp.act;
      C.cpnSelect('sniper');
      return a;
    });
    ok(!r.lockedBuy && !r.selLocked, 'Mitrailleur recruté ou choisi sans condition remplie');
    egal(r.act0, 'sniper', 'Actif avant le recrutement');
    ok(!r.poor, 'Recruté sans assez de ferraille');
    ok(r.buy, 'Recrutement refusé');
    egal(r.paid, lire('__compagnon.CPN.gunner.price'), 'Prix payé en ferraille');
    ok(r.sel, 'Choix refusé');
    egal(r.act, 'gunner', 'Compagnon actif');
    ok(!r.vis[0] && r.vis[1], 'Un seul modèle visible sur le toit : ' + r.vis);
    egal(r.saved, 'gunner', 'Choix sauvegardé');
    egal(r.none, '', 'Laisser au repos');
    egal(r.savedNone, '', 'Repos sauvegardé');
    // Rechargement de la sauvegarde
    const n = J(function(){ var keep = JSON.stringify(P.comp); P.comp = JSON.parse(localStorage.getItem('dt_prof')).comp; __compagnon.cpnNorm(); var a = __compagnon.cpnActive(); P.comp = JSON.parse(keep); return a; });
    egal(n, 'sniper', 'Compagnon actif relu de la sauvegarde');
  });

  test('Compagnon : ciblage selon le rôle (dangereux, plus proche de la barricade, volants)', () => {
    exiger(); partie(tousGagnes);
    const r = J(function(){
      var C = __compagnon;
      var w = __t.placer('walker', 0, -14), c = __t.placer('colossus', 3, -80), sp = __t.placer('spitter', -4, -75), f = __t.placer('flyer', -2, -50); f.g.position.y = 6;
      var j = __t.placer('jumper', 5, -70), far = __t.placer('flyer', 0, -115); far.g.position.y = 6;
      var a = { s: C.cpnPick('sniper').type, g: C.cpnPick('gunner') === w };
      c.dead = true; a.s2 = C.cpnPick('sniper').type; c.dead = false;
      var d = C.cpnPick('dog'); a.d = d === f; f.cpnMarkT = 5; a.d2 = C.cpnPick('dog') === j; j.cpnMarkT = 5; a.d3 = C.cpnPick('dog');
      // Pas de cible au-delà de la portée du mitrailleur
      w.dead = true; a.gFar = C.cpnPick('gunner', [c, sp]);
      return a;
    });
    egal(r.s, 'colossus', 'Tireur d’élite : cible prioritaire');
    egal(r.s2, 'spitter', 'Tireur d’élite : cible suivante');
    ok(r.g, 'Mitrailleur : doit viser le plus proche de la barricade');
    ok(r.d && r.d2, 'Chien : doit signaler le volant puis le sauteur non marqués');
    egal(r.d3, null, 'Chien : rien à signaler (volant trop loin, marcheurs ignorés)');
    egal(r.gFar, null, 'Mitrailleur : cible hors de portée');
  });

  test('Compagnon : le tireur d’élite abat des zombies, argent, XP et ferraille normaux', () => {
    exiger(); partie(tousGagnes);
    const r = J(function(){
      var C = __compagnon; C.cpnSelect('sniper'); C.cpnReset();
      var zs = [__t.placer('walker', -3, -30), __t.placer('walker', 3, -45), __t.placer('runner', 0, -60)];
      var m0 = S.money, k0 = S.kills, sc0 = S.scrapGained || 0, xp0 = S.xpGained;
      C.step(12);
      return { dead: zs.filter(function(z){ return z.dead; }).length, money: S.money - m0, kills: S.kills - k0, scrap: (S.scrapGained || 0) - sc0, xp: S.xpGained - xp0,
        anim: C.CPN_MOD.sniper.yaw !== 0 };
    });
    egal(r.dead, 3, 'Zombies abattus par le tireur d’élite');
    egal(r.kills, 3, 'Abattus comptés');
    ok(r.money > 0, 'Pas d’argent pour ses abattus');
    ok(r.scrap > 0, 'Pas de ferraille pour ses abattus');
    ok(r.xp > 0, 'Pas d’expérience pour ses abattus');
  });

  test('Compagnon : le mitrailleur arrose, recharge sa bande, et les effets sont rangés', () => {
    exiger(); partie(tousGagnes);
    const r = J(function(){
      var C = __compagnon; C.cpnBuy('gunner'); C.cpnSelect('gunner'); C.cpnReset();
      var zs = []; for (var i = 0; i < 10; i++) zs.push(__t.placer('walker', -9 + i * 2, -12 - i * 2));
      var belt = C.cpnS.belt;
      C.step(1); var tr = C.cpnTracers.some(function(t){ return t.m.visible; }) || C.cpnTracers.some(function(t){ return t.life > 0; });
      C.step(11);
      var a = { belt: belt, dead: zs.filter(function(z){ return z.dead; }).length, tr: tr, pool: C.cpnTracers.length };
      a.shots = belt - C.cpnS.belt;
      C.cpnUpdate(1 / 30); gameOver(); visuals(1 / 30);
      a.after = C.cpnTracers.some(function(t){ return t.m.visible; }) || C.cpnHalos.some(function(h){ return h.m.visible; });
      return a;
    });
    ok(r.belt > 10, 'Bande trop courte : ' + r.belt);
    ok(r.dead >= 6, 'Mitrailleur : seulement ' + r.dead + ' zombies abattus sur 10');
    egal(r.pool, lire('__compagnon.cpnTracers.length'), 'Pool de traçantes');
    ok(!r.after, 'Traçantes ou halos restés visibles après la partie');
  });

  test('Compagnon : le chien marque les volants (dégâts en plus) et accélère la recharge', () => {
    exiger(); partie(tousGagnes);
    const r = J(function(){
      var C = __compagnon; C.cpnBuy('dog'); C.cpnSelect('dog'); C.cpnReset();
      var f = __t.placer('flyer', 0, -40); f.g.position.y = 6; var w = __t.placer('walker', 2, -30);
      C.step(2);
      var a = { mark: f.cpnMarkT > 0, wmark: !!(w.cpnMarkT > 0), halo: C.cpnHalos.some(function(h){ return h.m.visible && h.z === f; }) };
      var h0 = f.hp; damage(f, 10, false, f.g.position.clone()); a.dmgF = h0 - f.hp;
      var h1 = w.hp; damage(w, 10, false, w.g.position.clone()); a.dmgW = h1 - w.hp;
      a.mult = C.cpnStats('dog', P.comp.lv.dog).mark;
      reloadT = 0; S.ammo[S.cur] = 1; startReload(); a.rel = reloadT; a.base = wReload(S.cur); a.f = C.cpnStats('dog', P.comp.lv.dog).reload;
      reloadT = 0;
      return a;
    });
    ok(r.mark, 'Volant non marqué');
    ok(!r.wmark, 'Marcheur marqué à tort');
    ok(r.halo, 'Pas de surbrillance sur le volant marqué');
    ok(Math.abs(r.dmgF - 10 * r.mult) < 1e-6 && r.mult > 1, 'Dégâts sur le marqué : ' + r.dmgF + ' (attendu ' + 10 * r.mult + ')');
    ok(Math.abs(r.dmgW - 10) < 1e-6, 'Dégâts sur un non marqué changés : ' + r.dmgW);
    ok(Math.abs(r.rel - r.base * r.f) < 1e-6 && r.f < 1, 'Recharge avec le chien : ' + r.rel + ' au lieu de ' + r.base * r.f);
  });

  test('Compagnon : les améliorations en ferraille changent les stats, coûts croissants', () => {
    exiger(); reset(tousGagnes);
    const r = J(function(){
      var C = __compagnon; C.cpnSync();
      var a = {}, st = function(id){ return C.cpnStats(id, P.comp.lv[id]); };
      var s0 = st('sniper'), c0 = C.cpnUpgCost('sniper', 'dmg', 0), sc = P.scrap;
      a.up = C.cpnUpgrade('sniper', 'dmg') && C.cpnUpgrade('sniper', 'rate') && C.cpnUpgrade('sniper', 'spec');
      var s1 = st('sniper');
      a.dmg = s1.dmg > s0.dmg; a.rate = s1.rate > s0.rate; a.head = s1.head > s0.head; a.paid = sc - P.scrap;
      a.expect = c0 + C.cpnUpgCost('sniper', 'rate', 0) + C.cpnUpgCost('sniper', 'spec', 0);
      a.cres = C.cpnUpgCost('sniper', 'dmg', 1) > c0 && C.cpnUpgCost('sniper', 'dmg', 5) > C.cpnUpgCost('sniper', 'dmg', 4);
      a.notOwned = C.cpnUpgrade('gunner', 'dmg');
      C.cpnBuy('gunner'); var g0 = st('gunner'); C.cpnUpgrade('gunner', 'spec'); a.belt = st('gunner').belt > g0.belt;
      C.cpnBuy('dog'); var d0 = st('dog'); C.cpnUpgrade('dog', 'spec'); C.cpnUpgrade('dog', 'dmg'); a.dog = st('dog').reload < d0.reload && st('dog').mark > d0.mark;
      P.scrap = 0; a.poor = C.cpnUpgrade('sniper', 'dmg');
      P.comp.lv.sniper.rate = C.CPN_MAX.rate; P.scrap = 1e9; a.max = C.cpnUpgrade('sniper', 'rate');
      a.saved = JSON.parse(localStorage.getItem('dt_prof')).comp.lv.sniper.dmg;
      // Section de l'atelier
      var el = document.getElementById('cpnShop');
      if (el && typeof el.querySelectorAll === 'function'){ C.cpnRenderShop(); a.shop = document.getElementById('cpnShop').querySelectorAll('button[data-cpn="upg"]').length; }
      return a;
    });
    ok(r.up, 'Amélioration refusée');
    ok(r.dmg && r.rate && r.head, 'Stats du tireur d’élite inchangées');
    egal(r.paid, r.expect, 'Ferraille payée');
    ok(r.cres, 'Les coûts doivent croître');
    ok(!r.notOwned, 'Amélioration d’un compagnon non recruté');
    ok(r.belt, 'Bande du mitrailleur inchangée');
    ok(r.dog, 'Stats du chien inchangées');
    ok(!r.poor, 'Amélioration sans ferraille');
    ok(!r.max, 'Amélioration au-delà du maximum');
    egal(r.saved, 1, 'Niveau sauvegardé');
    if (r.shop !== undefined) ok(r.shop >= 9, 'Boutons d’amélioration dans l’atelier : ' + r.shop);
  });
})();
