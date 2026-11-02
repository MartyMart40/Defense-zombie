'use strict';
/* =====================================================================
   Tests du défi du jour (js/25-defi.js)
   À charger APRÈS tests.js dans tests/index.html :
     <script src="t-defi.js"></script>
   Réutilise test(), J(), lire(), ok(), egal(), reset(), ignorer() de tests.js.
   La date est simulée avec __defi.setNow(...) et remise à null à la fin de chaque test.
   ===================================================================== */
(function(){
  if (typeof test !== 'function') return;
  const exiger = () => { if (lire('typeof __defi === "object" && typeof __defi.defiStart === "function"') !== true) ignorer('25-defi.js non chargé'); };
  const date = d => J(function(x){ __defi.setNow(x); }, d);
  const finir = () => { try { J(function(){ __defi.setNow(null); if (__defi.active || (curLoc && curLoc.defi)) goMap(); }); } catch (e) {} };
  // Gagne la partie de défi en cours (sans jouer les vagues)
  const gagner = () => J(function(){ state = 'playing'; S.wave = curLoc.waves; victory(); return { scrap: P.scrap, titre: $('overTitle').textContent, state: state }; });

  test('Défi : même date = même défi, dates différentes = défis différents', () => {
    exiger();
    const r = J(function(){
      var D = __defi, a = D.defiOfDay('2026-11-02'), b = D.defiOfDay('2026-11-02'), sigs = {}, pareils = 0, prev = '', bad = [];
      for (var i = 0; i < 60; i++){
        var k = D.defiKeyAdd('2026-11-02', i), d = D.defiOfDay(k), s = D.defiSig(d);
        sigs[s] = 1; if (s === prev) pareils++; prev = s;
        if (d.waves < 3 || d.waves > 5 || d.loc < 0 || d.loc >= LOCS.length || d.mods.length !== 2 || !D.defiCompat(d.mods[1], [d.mods[0]])) bad.push(k + ' ' + s);
      }
      // Date locale : deux heures du même jour donnent la même clé
      D.setNow(new Date(2026, 10, 2, 0, 5)); var k1 = D.defiToday();
      D.setNow(new Date(2026, 10, 2, 23, 55)); var k2 = D.defiToday();
      D.setNow(new Date(2026, 10, 3, 0, 5)); var k3 = D.defiToday();
      D.setNow(null);
      return { same: D.defiSig(a) === D.defiSig(b), distincts: Object.keys(sigs).length, pareils: pareils, bad: bad, k1: k1, k2: k2, k3: k3 };
    });
    ok(r.same, 'Le même jour ne donne pas le même défi');
    egal(r.pareils, 0, 'Deux jours de suite identiques');
    ok(r.distincts >= 50, 'Trop peu de défis différents sur 60 jours : ' + r.distincts);
    egal(r.bad.length, 0, 'Défis mal formés : ' + r.bad.join(' | ') + '\nNombre');
    egal(r.k1, '2026-11-02', 'Clé à 0 h 05'); egal(r.k2, '2026-11-02', 'Clé à 23 h 55'); egal(r.k3, '2026-11-03', 'Clé du lendemain');
  });

  test('Défi : modificateurs appliqués pendant le défi, retirés ensuite', () => {
    exiger(); reset();
    try {
      const r = J(function(){
        var o = {};
        // Référence : défi sans modificateur
        __defi.defiStart({ loc: 2, waves: 3, mods: [] });
        var p0 = wavePlan(2); o.spd0 = p0.spdMult; o.hp0 = p0.hpMult; o.cash0 = p0.cashMult; o.bar0 = S.barMax;
        o.fast0 = p0.queue.filter(function(t){ return t === 'runner' || t === 'jumper'; }).length / p0.queue.length;
        S.ammo[S.cur] = 0; reloadT = 0; startReload(); o.rl0 = reloadT / wReload(S.cur);
        // Défi avec modificateurs
        __defi.defiStart({ loc: 2, waves: 3, mods: ['sniper', 'rapides', 'fragile', 'munitions', 'richesse'] });
        o.actif = __defi.active; o.copie = !!curLoc.defi; o.nom = curLoc.name; o.vagues = curLoc.waves; o.etat = state;
        var p = wavePlan(2); o.spd = p.spdMult / o.spd0; o.hp = p.hpMult / o.hp0; o.cash = p.cashMult / o.cash0;
        o.armes = Object.keys(S.owned).filter(function(k){ return S.owned[k]; }).join(','); o.cur = S.cur;
        o.bar = S.barMax / barMaxCalc();
        S.ammo[S.cur] = 0; reloadT = 0; startReload(); o.rl = reloadT / wReload(S.cur);
        renderShop(); var h = $('shopWeapons').innerHTML; o.boutique = h.indexOf(WEAPONS.sniper.name) >= 0 && h.indexOf(WEAPONS.shotgun.name) < 0 && h.indexOf(WEAPONS.rifle.name) < 0;
        // Horde et boss pressé
        __defi.defiStart({ loc: 0, waves: 3, mods: ['horde', 'bossTot'] });
        var ph = wavePlan(2); o.fast = ph.queue.filter(function(t){ return t === 'runner' || t === 'jumper'; }).length / ph.queue.length;
        o.boss3 = wavePlan(3).queue.indexOf('boss') >= 0; o.bossPret = typeof __boss === 'object' && __boss.bossReady();
        // Pas de réparation
        __defi.defiStart({ loc: 1, waves: 3, mods: ['sansRep', 'nuit'] });
        S.money = 1e6; S.bar = 100; renderShop(); o.repDesactive = !!$('shopWall').innerHTML.match(/<button disabled(="")?>Interdit<\/button>/);
        S.upg.wall++; S.barMax = barMaxCalc(); S.bar = S.barMax; renderShop(); o.apresRenfort = S.bar;
        state = 'shop'; startWave(); o.meteo = typeof __amb === 'object' ? __amb.weather : 'nuit';
        // Retour au mode normal
        goMap(); o.apresCarte = __defi.active || !!curLoc.defi;
        startLocation(0);
        o.nActif = __defi.active; o.nCopie = !!curLoc.defi; o.nCur = curLoc === LOCS[0];
        o.nArmes = Object.keys(S.owned).join(','); o.nBar = S.barMax === barMaxCalc();
        var pn = wavePlan(2), pr = wavePlan(2, LOCS[0]); o.nSpd = pn.spdMult === pr.spdMult && pn.hpMult === pr.hpMult && pn.cashMult === pr.cashMult;
        S.ammo[S.cur] = 0; reloadT = 0; startReload(); o.nRl = reloadT / wReload(S.cur);
        renderShop(); o.nBoutique = $('shopWeapons').innerHTML.indexOf(WEAPONS.shotgun.name) >= 0;
        S.bar = 10; renderShop(); o.nRep = !/Interdit/.test($('shopWall').innerHTML);
        state = 'shop'; startWave(); o.nMeteoLibre = true;
        return o;
      });
      ok(r.actif && r.copie, 'Le défi n’est pas actif');
      egal(r.vagues, 3, 'Vagues du défi'); egal(r.nom, J('LOCS[2].name'), 'Ville du décor');
      egal(r.etat, 'shop', 'Le défi commence par la boutique');
      ok(Math.abs(r.spd - 1.4) < 1e-6, 'Zombies enragés : vitesse ×' + r.spd);
      ok(Math.abs(r.hp - 1.5) < 1e-6 && Math.abs(r.cash - 2) < 1e-6, 'Prime de risque : vie ×' + r.hp + ', argent ×' + r.cash);
      egal(r.armes, 'sniper', 'Armes possédées'); egal(r.cur, 'sniper', 'Arme en main');
      ok(r.boutique, 'La boutique propose d’autres armes que le sniper');
      ok(Math.abs(r.bar - .5) < .01, 'Barricade fragile : ' + r.bar);
      ok(Math.abs(r.rl - 1.7) < .01 && Math.abs(r.rl0 - 1) < .01, 'Recharges : ×' + r.rl + ' (sans modificateur ×' + r.rl0 + ')');
      ok(r.fast > r.fast0 + .3, 'Horde agile : ' + r.fast + ' de coureurs et sauteurs contre ' + r.fast0);
      if (r.bossPret) ok(r.boss3, 'Boss pressé : pas de boss à la vague 3');
      ok(r.repDesactive, 'Pas de réparation : le bouton Réparer est actif');
      egal(r.apresRenfort, 200, 'Renfort sans réparation (100 + 100)');
      egal(r.meteo, 'nuit', 'Nuit noire forcée');
      ok(!r.apresCarte, 'Le défi reste actif après la carte');
      ok(!r.nActif && !r.nCopie && r.nCur, 'La partie normale est encore en mode défi');
      egal(r.nArmes, 'pistol', 'Armes de la partie normale');
      ok(r.nBar, 'Barricade de la partie normale pas pleine');
      ok(r.nSpd, 'wavePlan de la partie normale encore modifié');
      ok(Math.abs(r.nRl - 1) < .01, 'Recharge de la partie normale : ×' + r.nRl);
      ok(r.nBoutique, 'La boutique normale ne propose pas toutes les armes');
      ok(r.nRep, 'Réparation encore interdite en partie normale');
    } finally { finir(); }
  });

  test('Défi : la prime est versée une seule fois par jour', () => {
    exiger(); reset({ scrap: 0, level: 3 });
    try {
      date('2026-11-02T12:00:00');
      const p = J(function(){ var d = __defi.defiOfDay(); return __defi.defiPrize(d.key, d.waves); });
      ok(p.first && p.scrap > 0 && p.xp > 0, 'Prime prévue : ' + JSON.stringify(p));
      const xp0 = J(function(){ __defi.defiStart(); return { lvl: P.level, xp: P.xp }; });
      const a = gagner();
      egal(a.titre, 'Défi réussi !', 'Titre de fin'); egal(a.state, 'over', 'État après la victoire');
      egal(a.scrap, p.scrap, 'Ferraille après la première réussite');
      const x1 = J(function(){ return { lvl: P.level, xp: P.xp, streak: P.defi.streak, done: P.defi.done, wins: P.defi.wins, txt: $('overStats').innerHTML }; });
      ok(x1.lvl > xp0.lvl || x1.xp > xp0.xp, 'Pas d’XP en prime');
      egal(x1.streak, 1, 'Série après la première réussite'); egal(x1.done, '2026-11-02', 'Jour réussi'); egal(x1.wins, 1, 'Défis réussis');
      ok(/Série/.test(x1.txt) && /Prime du défi/.test(x1.txt), 'Écran de fin sans prime ni série : ' + x1.txt);
      // Rejouer le même jour (bouton de l'écran de fin) : petite prime seulement
      J("$('btnAgain').click()");
      ok(J('__defi.active && !!curLoc.defi'), '« Rejouer le défi » ne relance pas le défi');
      const b = gagner();
      const gain = b.scrap - a.scrap;
      ok(gain >= 0 && gain <= p.scrap * .2, 'Deuxième réussite du jour : +' + gain + ' (prime pleine ' + p.scrap + ')');
      const x2 = J(function(){ return { streak: P.defi.streak, wins: P.defi.wins }; });
      egal(x2.streak, 1, 'Série après avoir rejoué'); egal(x2.wins, 1, 'Défis réussis après avoir rejoué');
      // Le lendemain : nouvelle prime pleine
      date('2026-11-03T09:00:00');
      J(function(){ __defi.defiStart(); });
      const c = gagner();
      ok(c.scrap - b.scrap >= p.scrap * .9, 'Pas de prime pleine le lendemain : +' + (c.scrap - b.scrap));
    } finally { finir(); }
  });

  test('Défi : la série monte et se casse si on saute un jour', () => {
    exiger(); reset();
    try {
      const r = J(function(){
        var D = __defi, o = [];
        ['2026-11-02', '2026-11-03', '2026-11-04'].forEach(function(k){ D.setNow(k + 'T15:00:00'); var w = D.defiWin(k, 4); o.push(w.streak + '/' + w.mult); });
        D.setNow('2026-11-05T08:00:00'); var garde = D.defiStreakNow();
        D.setNow('2026-11-06T08:00:00'); var cassee = D.defiStreakNow();
        var w = D.defiWin('2026-11-06', 4);
        D.setNow(null);
        return { o: o.join(' '), garde: garde, cassee: cassee, apres: w.streak, mult: w.mult, record: P.defi.record };
      });
      egal(r.o, '1/1 2/1.25 3/1.5', 'Série et multiplicateur sur 3 jours');
      egal(r.garde, 3, 'Série vue le lendemain (pas encore joué)');
      egal(r.cassee, 0, 'Série après un jour sauté');
      egal(r.apres, 1, 'Série qui repart à 1'); egal(r.mult, 1, 'Multiplicateur qui repart à 1');
      egal(r.record, 3, 'Record de série');
    } finally { finir(); }
  });

  test('Défi : aucune ville débloquée, rien dans la campagne', () => {
    exiger(); reset({ unlocked: 1, wins: {}, best: {}, last: 0 });
    try {
      const r = J(function(){
        __defi.defiStart({ loc: 4, waves: 3, mods: [] });
        var o = { ville: curLoc.name, copie: !!curLoc.defi };
        state = 'playing'; S.wave = curLoc.waves; victory();
        o.v = { unlocked: P.unlocked, wins: JSON.stringify(P.wins), best: JSON.stringify(P.best), last: P.last, camp: campaignIdx(), again: $('btnAgain').textContent };
        __defi.defiStart({ loc: 3, waves: 4, mods: [] });
        state = 'playing'; S.wave = 3; gameOver();
        o.d = { unlocked: P.unlocked, wins: JSON.stringify(P.wins), best: JSON.stringify(P.best), last: P.last, titre: $('overTitle').textContent, jour: P.defi.today && P.defi.today.waves };
        var s = JSON.parse(localStorage.getItem('dt_prof') || '{}');
        o.sauve = { unlocked: s.unlocked, wins: JSON.stringify(s.wins || {}), best: JSON.stringify(s.best || {}) };
        $('btnMap').click(); o.carte = !curLoc.defi && LOCS.indexOf(curLoc) >= 0 && !__defi.run; // vrai bouton de l'écran de fin
        renderMap(); o.verrou = document.querySelectorAll ? document.querySelectorAll('#mapList button[disabled]').length : 4;
        return o;
      });
      egal(r.ville, J('LOCS[4].name'), 'Décor du défi'); ok(r.copie, 'Pas en mode défi');
      egal(r.v.unlocked, 1, 'Villes débloquées après une victoire de défi'); egal(r.v.wins, '{}', 'P.wins'); egal(r.v.best, '{}', 'P.best'); egal(r.v.last, 0, 'P.last');
      egal(r.v.camp, 0, 'Prochaine ville de la campagne');
      ok(!/Continuer/.test(r.v.again), 'Le bouton propose de continuer la campagne : ' + r.v.again);
      egal(r.d.unlocked, 1, 'Villes débloquées après une défaite'); egal(r.d.best, '{}', 'P.best après une défaite'); egal(r.d.wins, '{}', 'P.wins après une défaite');
      egal(r.d.titre, 'Défi échoué', 'Titre de la défaite'); egal(r.d.jour, 3, 'Meilleur résultat du jour (vagues)');
      egal(r.sauve.unlocked, 1, 'Sauvegarde : villes'); egal(r.sauve.best, '{}', 'Sauvegarde : P.best'); egal(r.sauve.wins, '{}', 'Sauvegarde : P.wins');
      ok(r.carte, 'La carte garde la copie de la ville du défi');
      egal(r.verrou, 4, 'Villes verrouillées sur la carte');
    } finally { finir(); }
  });

  test('Défi : boutons, écran et sauvegarde par défaut', () => {
    exiger(); reset();
    try {
      date('2026-11-02T12:00:00');
      const r = J(function(){
        var o = { titre: !!$('btnDefiTitle'), carte: !!$('btnDefiMap') };
        __defi.defiOpen('scrTitle');
        var d = __defi.defiOfDay(); o.visible = __t.visible('scrDefi'); o.titreCache = !__t.visible('scrTitle');
        var h = $('defiBody').innerHTML; o.ville = h.indexOf(LOCS[d.loc].name) >= 0; o.mods = d.mods.every(function(m){ return h.indexOf(__defi.DEFI_MODS[m].name) >= 0; });
        o.vagues = h.indexOf(d.waves + ' vagues') >= 0; o.recomp = /Récompense/.test(h) && /Série/.test(h) && /Aujourd/.test(h);
        $('btnDefiBack').click(); o.retour = __t.visible('scrTitle') && !__t.visible('scrDefi');
        // Ancienne sauvegarde : pas de P.defi, ou abîmé
        var keep = P.defi; delete P.defi; __defi.defiNorm(); o.def = JSON.stringify(P.defi);
        P.defi = { done: 'n’importe', streak: -4, today: { key: 'x' } }; __defi.defiNorm(); o.abime = JSON.stringify(P.defi);
        P.defi = keep;
        return o;
      });
      ok(r.titre && r.carte, 'Boutons btnDefiTitle et btnDefiMap absents');
      ok(r.visible && r.titreCache, 'L’écran du défi ne s’affiche pas seul');
      ok(r.ville && r.mods && r.vagues && r.recomp, 'Écran du défi incomplet : ' + JSON.stringify(r));
      ok(r.retour, 'Retour vers l’écran titre');
      egal(r.def, '{"done":"","streak":0,"record":0,"wins":0,"today":null}', 'Valeurs par défaut');
      egal(r.abime, '{"done":"","streak":0,"record":0,"wins":0,"today":null}', 'Valeurs abîmées corrigées');
    } finally { finir(); }
  });
})();
