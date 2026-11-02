'use strict';
// Missions et succès (30-missions.js) : ferraille versée une seule fois, paliers, missions sur plusieurs parties,
// compteurs sauvegardés, écran Succès, ancienne sauvegarde sans les nouveaux champs
(function(){
  if (typeof test !== 'function' || typeof TESTS === 'undefined') return;
  function pret(){ return lire('typeof __missions === "object" && !!__missions && typeof __missions.achCheck === "function"') === true; }
  function partie(){ J('startLocation(0)'); J(function(){ __t.geler(); clearZombies(); if (typeof __rue === 'object') __rue.rueClear(); }); }
  function abattre(type, n, extra){
    return J(function(type, n, extra){
      for (var i = 0; i < n; i++){ var z = __t.placer(type, 0, -40); if (extra) Object.assign(z, extra); damage(z, 1e9, false, z.g.position.clone()); }
      return S.kills;
    }, type, n, extra || null);
  }

  test('Missions : un succès se débloque une seule fois et verse sa ferraille', () => {
    if (!pret()) ignorer('Missions absentes');
    reset({ scrap: 0 });
    const r = J(function(){
      var o = {}; __missions.msNorm();
      __missions.msAdd('bossFlame'); o.t1 = P.ach.bossFlame; o.s1 = P.scrap; o.a1 = P.achScrap;
      __missions.msAdd('bossFlame'); __missions.achCheckAll(); o.t2 = P.ach.bossFlame; o.s2 = P.scrap; o.a2 = P.achScrap;
      return o;
    });
    egal(r.t1, 1, 'Succès obtenu');
    ok(r.s1 > 0, 'Ferraille versée : ' + r.s1);
    egal(r.a1, r.s1, 'Total de ferraille des succès');
    egal(r.t2, 1, 'Toujours un seul palier');
    egal(r.s2, r.s1, 'Ferraille versée une seule fois');
    egal(r.a2, r.a1, 'Total inchangé');
  });

  test('Missions : succès par paliers (bronze, argent, or) et tir à la tête compté', () => {
    if (!pret()) ignorer('Missions absentes');
    reset({ scrap: 0 });
    const r = J(function(){
      var o = {}, A = __missions.ACH.filter(function(a){ return a.id === 'heads'; })[0];
      __missions.msNorm();
      P.st.heads = 99; __missions.msAdd('heads'); o.t1 = P.ach.heads || 0; o.s1 = P.scrap;
      P.st.heads = 999; __missions.msAdd('heads'); o.t2 = P.ach.heads || 0; o.s2 = P.scrap;
      P.st.heads = 20000; __missions.achCheck('heads'); o.t3 = P.ach.heads || 0; o.s3 = P.scrap;
      o.attendu = A.tiers[0][1] + A.tiers[1][1] + A.tiers[2][1]; o.b1 = A.tiers[0][1];
      return o;
    });
    egal(r.t1, 1, 'Bronze à 100');
    egal(r.s1, r.b1, 'Ferraille du bronze');
    egal(r.t2, 2, 'Argent à 1 000');
    egal(r.t3, 3, 'Or à 10 000');
    egal(r.s3, r.attendu, 'Ferraille des 3 paliers');
    // Vrai tir à la tête au pistolet
    reset({ scrap: 0 }); partie();
    const h = J(function(){
      __missions.msNorm(); var h0 = P.st.heads;
      var z = __t.placer('walker', 0, -25); __t.viser(z, true); S.ammo.pistol = 12; cool = 0; fire();
      return { avant: h0, apres: P.st.heads, mort: z.dead };
    });
    ok(h.apres === h.avant + 1, 'Tir à la tête compté : ' + h.avant + ' puis ' + h.apres);
  });

  test('Missions : une mission avance sur deux parties, verse sa ferraille et est remplacée', () => {
    if (!pret()) ignorer('Missions absentes');
    reset({ scrap: 0 }); partie();
    J(function(){ __missions.setMissions(['k_jumper', 'surv', 'barrels']); });
    const goal = J('__missions.MDEF.k_jumper.goal'), rew = J('__missions.MDEF.k_jumper.rew');
    abattre('jumper', 30);
    const p1 = J(function(){ return P.miss.act[0].n; });
    egal(p1, 30, 'Progrès après la première partie');
    J('gameOver()');
    let sauve = null; try { sauve = JSON.parse(J('localStorage.getItem("dt_prof")')); } catch (e) {}
    ok(sauve && sauve.miss && sauve.miss.act[0].n === 30, 'Progrès sauvé dans dt_prof');
    partie();
    const s0 = J('P.scrap');
    abattre('jumper', goal - 30);
    const r = J(function(){ return { id: P.miss.act[0].id, n: P.miss.act[0].n, done: P.miss.done, scrap: P.miss.scrap, act: P.miss.act.map(function(m){ return m.id; }), run: __missions.MSX.run.slice() }; });
    ok(r.id !== 'k_jumper', 'Mission remplacée (encore ' + r.id + ')');
    egal(r.n, 0, 'Nouvelle mission à zéro');
    egal(r.done, 1, 'Missions réussies');
    egal(r.scrap, rew, 'Ferraille des missions');
    ok(J('P.scrap') - s0 >= rew, 'Ferraille versée');
    egal(new Set(r.act).size, 3, 'Trois missions différentes');
    ok(r.run.some(function(t){ return /sauteurs/.test(t); }), 'Mission dans la liste de la partie : ' + r.run.join(' | '));
  });

  test('Missions : compteurs à vie sauvegardés et ligne sur l’écran de fin', () => {
    if (!pret()) ignorer('Missions absentes');
    reset({ scrap: 0 }); partie();
    J(function(){ __missions.msNorm(); P.st.kills = 998; });
    abattre('walker', 3);
    const r = J(function(){
      gameOver();
      var s = null; try { s = JSON.parse(localStorage.getItem('dt_prof')); } catch (e) {}
      return { kills: P.st.kills, sauve: s && s.st && s.st.kills, ach: P.ach.kills || 0, fin: document.getElementById('overStats').innerHTML };
    });
    egal(r.kills, 1001, 'Compteur de zombies abattus');
    egal(r.sauve, 1001, 'Compteur dans dt_prof');
    egal(r.ach, 1, 'Succès Nettoyeur de rue (bronze)');
    ok(/Réussi pendant la partie/.test(r.fin) && /Nettoyeur/.test(r.fin), 'Succès de la partie sur l’écran de fin');
  });

  test('Missions : clown zombie secret, révélé seulement après', () => {
    if (!pret()) ignorer('Missions absentes');
    reset({ scrap: 0 }); partie();
    const av = J(function(){ __missions.renderSucces(); return document.getElementById('msBody').innerHTML; });
    ok(/\?\?\?/.test(av) && !/Le dernier rire/.test(av), 'Clown caché avant');
    abattre('walker', 1, { clown: true });
    const ap = J(function(){ __missions.renderSucces(); return { t: P.ach.clown || 0, h: document.getElementById('msBody').innerHTML }; });
    egal(ap.t, 1, 'Succès du clown');
    ok(/Le dernier rire/.test(ap.h), 'Clown révélé après');
  });

  test('Missions : écran Succès qui s’affiche', () => {
    if (!pret()) ignorer('Missions absentes');
    reset(null);
    const r = J(function(){
      state = 'menu'; showScreen('scrTitle');
      document.getElementById('btnSuccesTitle').click();
      var o = { vis: __t.visible('scrSucces'), titre: __t.visible('scrTitle'), h: document.getElementById('msBody').innerHTML,
        rows: document.querySelectorAll('#msBody .ms-row').length, bouton: document.getElementById('btnSuccesTitle').textContent };
      document.getElementById('btnSuccesBack').click();
      o.retour = __t.visible('scrTitle') && !__t.visible('scrSucces');
      o.inf = typeof window.__infini !== 'undefined' && !!window.__infini;
      return o;
    });
    ok(r.vis, 'Écran Succès visible');
    ok(!r.titre, 'Écran titre caché');
    ok(/Missions/.test(r.h) && /Ferraille des succès/.test(r.h), 'Missions et total de ferraille affichés');
    ok(r.rows >= 3 + 18, 'Lignes (missions + succès) : ' + r.rows);
    ok(/Succès \(\d+ \/ \d+\)/.test(r.bouton), 'Bouton avec le compte : ' + r.bouton);
    ok(r.retour, 'Retour à l’écran titre');
    ok(r.inf === /mode infini/.test(r.h), 'Succès du mode infini visibles seulement si le mode infini existe');
  });

  test('Missions : ancienne sauvegarde sans les nouveaux champs', async () => {
    if (!pret()) ignorer('Missions absentes');
    const vieux = { xp: 10, level: 3, pts: 0, talents: {}, unlocked: 2, best: {}, wins: { village: 1 }, last: 0, intensity: 1, scrap: 5, comboBest: 45 };
    if (typeof chargerJeu === 'function' && typeof win !== 'undefined'){
      J(function(v){ state = 'test'; localStorage.setItem('dt_prof', JSON.stringify(v)); }, vieux);
      await chargerJeu();
    } else {
      J(function(v){ Object.keys(P).forEach(function(k){ delete P[k]; }); Object.assign(P, v); __missions.msNorm(); __missions.achCheckAll(); }, vieux);
    }
    const r = J(function(){ return { st: typeof P.st === 'object' && P.st.kills === 0, act: P.miss && P.miss.act.length, combo: P.ach && P.ach.combo, scrap: P.scrap, lvl: P.level, wins: P.wins.village,
      erreurs: (window.__erreurs || []).length }; });
    ok(r.st, 'Compteurs créés à zéro');
    egal(r.act, 3, 'Trois missions');
    egal(r.combo, 2, 'Record de combo de 45 : bronze et argent donnés');
    ok(r.scrap > 5, 'Ferraille des succès versée : ' + r.scrap);
    egal(r.lvl, 3, 'Niveau gardé');
    egal(r.wins, 1, 'Victoires gardées');
    egal(r.erreurs, 0, 'Aucune erreur au chargement');
  });
})();
