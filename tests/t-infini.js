'use strict';
// Mode infini (28-infini.js) et formateur compact des grands nombres (fmt / fmtN, 00-base.js)
(function(){
  if (typeof test !== 'function' || typeof TESTS === 'undefined') return;
  const GAGNE = { unlocked: 5, wins: { village: 1, ville: 1, banlieue: 1, centre: 1, port: 1 } };
  const QUATRE = { unlocked: 5, wins: { village: 1, ville: 1, banlieue: 1, centre: 1 } };
  function pret(){ return lire('typeof __inf === "object" && typeof __inf.infStart === "function"') === true; }
  const esp = t => String(t).replace(/[   ]/g, ' ');

  test('Infini : bouton verrouillé avant les 5 villes, débloqué ensuite', () => {
    if (!pret()) ignorer('Mode infini absent');
    reset(QUATRE);
    const a = J(function(){
      renderMap();
      var bs = document.querySelectorAll('#mapList button[data-inf]'), dis = 0, txt = '';
      for (var i = 0; i < bs.length; i++){ if (bs[i].disabled || bs[i].getAttribute('aria-disabled') === 'true') dis++; }
      bs[0].click(); var clicLance = !!curLoc.inf;
      var row = document.querySelector('#mapList .inf-row'); txt = row ? row.textContent : '';
      __inf.infLabels(); var t = document.getElementById('btnInfTitle');
      var r = __inf.infStart(0);
      return { n: bs.length, dis: dis, txt: txt, open: __inf.infUnlocked(), titre: t ? { dis: t.disabled, txt: t.textContent } : null, start: r, inf: !!curLoc.inf || clicLance };
    });
    egal(a.n, 5, 'Un bouton Mode infini par ville');
    egal(a.dis, 5, 'Boutons verrouillés avant la fin de la campagne');
    ok(/libère les 5 villes/i.test(a.txt), 'Explication du verrou : ' + a.txt);
    ok(!a.open, 'Pas débloqué avec 4 villes');
    ok(a.titre && a.titre.dis, 'Rappel sur l’écran titre verrouillé');
    ok(a.start === null && !a.inf, 'infStart refusé avant le déblocage');
    reset(GAGNE);
    const b = J(function(){
      renderMap(); __inf.infLabels();
      var bs = document.querySelectorAll('#mapList button[data-inf]'), dis = 0;
      for (var i = 0; i < bs.length; i++){ if (bs[i].disabled || bs[i].getAttribute('aria-disabled') === 'true') dis++; }
      var t = document.getElementById('btnInfTitle');
      document.querySelector('#mapList button[data-inf="2"]').click();
      return { dis: dis, open: __inf.infUnlocked(), titre: t ? !t.disabled : false, inf: !!curLoc.inf, id: curLoc.id, money: S.money, state: state, act: __inf.active, idx: LOCS.indexOf(curLoc), vraie: !LOCS[2].inf };
    });
    ok(b.open, 'Débloqué avec les 5 villes');
    egal(b.dis, 0, 'Boutons actifs');
    ok(b.titre, 'Rappel actif sur l’écran titre');
    ok(b.inf && b.act, 'Partie infinie lancée');
    egal(b.id, 'banlieue', 'Décor de la ville choisie');
    egal(b.money, 1000, 'Départ avec 1 000 $');
    egal(b.state, 'shop', 'Préparation avant la vague 1');
    egal(b.idx, -1, 'curLoc est une copie de la ville');
    ok(b.vraie, 'LOCS remis tel quel');
  });

  test('Infini : +10 % de zombies et d’argent, +18 % de vie, +14 % de dégâts par vague, même difficulté partout', () => {
    if (!pret()) ignorer('Mode infini absent');
    reset(GAGNE);
    const r = J(function(){
      __inf.infStart(0, true);
      var o = { p: [] };
      for (var w = 1; w <= 31; w++){ var p = wavePlan(w); o.p.push({ n: p.queue.filter(function(t){ return t !== 'boss'; }).length, hp: p.hpMult, dmg: p.dmgMult, cash: p.cashMult, max: p.maxAlive,
        col: p.queue.filter(function(t){ return t === 'colossus'; }).length / p.queue.length, spit: p.queue.filter(function(t){ return t === 'spitter'; }).length / p.queue.length, fly: p.queue.filter(function(t){ return t === 'flyer'; }).length / p.queue.length }); }
      startWave(); __t.geler();
      var z = spawnZombie('walker'); o.hp1 = z.maxHp; o.rew1 = z.reward;
      // Une autre ville en infini : mêmes chiffres
      __inf.infStart(4, true); var q = wavePlan(12); o.port = { n: q.queue.length, hp: q.hpMult }; __inf.infStart(0, true); var q0 = wavePlan(12); o.vil = { n: q0.queue.length, hp: q0.hpMult };
      o.cap50 = wavePlan(50).maxAlive; o.dev = DEV_CAP; o.n50 = wavePlan(50).queue.length;
      o.hpG = __inf.INF_HP_GROW; o.dmgG = __inf.INF_DMG_GROW;
      return o;
    });
    ok(Math.abs(r.hp1 - 50) <= 1, 'Marcheur de la vague 1 : ' + r.hp1 + ' de vie (environ 50)');
    for (let i = 1; i < r.p.length; i++){
      const a = r.p[i - 1], b = r.p[i];
      ok(Math.abs(b.hp / a.hp - (r.hpG || 1.1)) < 1e-6, 'Vie vague ' + (i + 1) + ' : ×' + (b.hp / a.hp));
      ok(Math.abs(b.dmg / a.dmg - (r.dmgG || 1.1)) < 1e-6, 'Dégâts vague ' + (i + 1));
      ok(Math.abs(b.cash / a.cash - 1.1) < 1e-6, 'Argent par zombie vague ' + (i + 1));
    }
    const k = r.p[30].n / r.p[20].n;
    ok(Math.abs(k - Math.pow(1.1, 10)) / Math.pow(1.1, 10) < .02, 'Nombre de zombies : ×' + k.toFixed(3) + ' en 10 vagues (attendu ×2,594)');
    ok(r.p[1].n > r.p[0].n, 'La vague 2 a plus de zombies que la 1');
    ok(r.p[29].col > r.p[5].col && r.p[29].spit > r.p[5].spit && r.p[29].fly > r.p[5].fly, 'Plus de colosses, cracheurs et volants avec les vagues');
    egal(r.port.n, r.vil.n, 'Même nombre de zombies dans toutes les villes');
    egal(r.port.hp, r.vil.hp, 'Même force dans toutes les villes');
    ok(r.cap50 <= r.dev, 'En vie à la fois borné par DEV_CAP : ' + r.cap50 + ' / ' + r.dev);
    ok(r.n50 > 1000, 'Des milliers de zombies à la vague 50 : ' + r.n50);
  });

  test('Infini : boss aux vagues 5 et 10, plus fort à la 10', () => {
    if (!pret()) ignorer('Mode infini absent');
    if (lire('typeof bossReady === "function" && bossReady()') !== true) ignorer('Boss absent');
    reset(GAGNE);
    const r = J(function(){
      __inf.infStart(1, true);
      var nb = function(w){ return wavePlan(w).queue.filter(function(t){ return t === 'boss'; }).length; };
      var o = { b4: nb(4), b5: nb(5), b6: nb(6), b10: nb(10), b15: nb(15) };
      startWave(); __t.geler();
      S.wave = 5; plan = wavePlan(5); __t.geler(); var z5 = spawnZombie('boss'); o.hp5 = z5.maxHp; o.dmg5 = z5.dmg; clearZombies();
      S.wave = 10; plan = wavePlan(10); __t.geler(); var z10 = spawnZombie('boss'); o.hp10 = z10.maxHp; o.dmg10 = z10.dmg; clearZombies();
      return o;
    });
    egal(r.b4, 0, 'Pas de boss à la vague 4');
    egal(r.b5, 1, 'Un boss à la vague 5');
    egal(r.b6, 0, 'Pas de boss à la vague 6');
    egal(r.b10, 1, 'Un boss à la vague 10');
    egal(r.b15, 1, 'Un boss à la vague 15');
    ok(r.hp10 > r.hp5 * 1.5, 'Boss plus fort : ' + Math.round(r.hp5) + ' puis ' + Math.round(r.hp10) + ' de vie');
    ok(r.dmg10 > r.dmg5, 'Boss frappe plus fort à la vague 10');
  });

  test('Infini : plafonds des dégâts et de la barricade retirés en infini seulement', () => {
    if (!pret()) ignorer('Mode infini absent');
    reset(GAGNE);
    const r = J(function(){
      __inf.infStart(0, true);
      S.money = 1e13; renderShop();
      var clic = function(sel){ var b = document.querySelector(sel); if (b && !b.disabled) b.click(); };
      for (var i = 0; i < 14; i++) clic('#shopUpg button[data-act="upg"][data-id="dmg"]');
      for (var j = 0; j < 11; j++) clic('#shopWall button[data-act="upg"][data-id="wall"]');
      var o = { dmg: S.upg.dmg, wall: S.upg.wall, barMax: S.barMax, lv: document.querySelectorAll('#scrShop .inf-lv').length,
        c10: UPG.dmg.cost(10), c13: UPG.dmg.cost(13), money: S.money, maxInf: UPG.dmg.max };
      // Campagne : plafonds normaux
      startLocation(1); S.money = 1e13; S.upg.dmg = 10; S.upg.wall = 8; renderShop();
      var bd = document.querySelector('#shopUpg button[data-act="upg"][data-id="dmg"]'), bw = document.querySelector('#shopWall button[data-act="upg"][data-id="wall"]');
      o.camp = { maxD: UPG.dmg.max, maxW: UPG.wall.max, dDis: bd.disabled, wDis: bw.disabled, lv: document.querySelectorAll('#scrShop .inf-lv').length };
      if (bd) bd.click(); o.camp.dmgApres = S.upg.dmg;
      return o;
    });
    egal(r.dmg, 14, 'Dégâts au-delà de 10 en infini');
    egal(r.wall, 11, 'Barricade au-delà de 8 en infini');
    ok(r.barMax >= 300 + 1100, 'Solidité de la barricade : ' + r.barMax);
    ok(r.lv >= 2, 'Niveaux affichés (niv. N) au lieu des pastilles');
    ok(r.c13 > r.c10, 'Les coûts continuent de monter');
    egal(r.camp.maxD, 10, 'Plafond des dégâts en campagne');
    egal(r.camp.maxW, 8, 'Plafond de la barricade en campagne');
    ok(r.camp.dDis && r.camp.wDis, 'Boutons « Max » en campagne');
    egal(r.camp.dmgApres, 10, 'Pas d’achat au-delà du plafond en campagne');
    egal(r.camp.lv, 0, 'Pas d’affichage infini en campagne');
  });

  test('Infini : record de vague par ville sauvegardé, « Nouveau record ! », campagne intacte', () => {
    if (!pret()) ignorer('Mode infini absent');
    reset(Object.assign({}, GAGNE, { best: { village: 5, ville: 6, banlieue: 7, centre: 8, port: 10 }, last: 3 }));
    const r = J(function(){
      var avant = { best: JSON.stringify(P.best), wins: JSON.stringify(P.wins), unlocked: P.unlocked, last: P.last };
      var xp0 = P.xp + P.level * 1e6, scr0 = P.scrap || 0;
      __inf.infStart(1, true); startWave(); __t.geler();
      var z = spawnZombie('walker'); damage(z, 1e9, false, z.g.position.clone());
      S.wave = 13; gameOver();
      var o = { rec: P.inf.best.ville, sauve: (store.get('dt_prof', {}).inf || {}).best, msg: $('overBest').textContent, titre: $('overTitle').textContent,
        again: $('btnAgain').textContent, stats: $('overStats').textContent, xp: P.xp + P.level * 1e6 > xp0, scrap: (P.scrap || 0) > scr0 };
      o.camp = { best: JSON.stringify(P.best) === avant.best, wins: JSON.stringify(P.wins) === avant.wins, unlocked: P.unlocked === avant.unlocked, last: P.last === avant.last };
      // Moins bien : le record reste
      $('btnAgain').click(); o.encore = !!curLoc.inf && curLoc.id === 'ville' && state === 'shop';
      startWave(); __t.geler(); S.wave = 4; gameOver();
      o.rec2 = P.inf.best.ville; o.msg2 = $('overBest').textContent;
      renderMap(); var row = document.querySelector('#mapList button[data-inf="1"]').closest('.inf-row'); o.carte = row ? row.textContent : '';
      o.camp2 = JSON.stringify(P.best) === avant.best && JSON.stringify(P.wins) === avant.wins && P.unlocked === avant.unlocked && P.last === avant.last;
      o.saveCamp = JSON.stringify(store.get('dt_prof', {}).best) === avant.best;
      return o;
    });
    egal(r.rec, 12, 'Record : vagues tenues');
    ok(r.sauve && r.sauve.ville === 12, 'Record sauvegardé dans dt_prof');
    ok(/Nouveau record/.test(r.msg), 'Écran de fin : ' + r.msg);
    ok(/infini/i.test(r.titre), 'Titre de fin : ' + r.titre);
    ok(/infini/i.test(r.again), 'Bouton rejouer : ' + r.again);
    ok(r.xp, 'L’XP gagnée compte');
    ok(r.scrap, 'La ferraille gagnée compte');
    ok(r.camp.best && r.camp.wins && r.camp.unlocked && r.camp.last, 'Campagne intacte : ' + JSON.stringify(r.camp));
    ok(r.encore, '« Rejouer » relance le mode infini dans la même ville');
    egal(r.rec2, 12, 'Le record ne baisse pas');
    ok(!/Nouveau record/.test(r.msg2), 'Pas de nouveau record la 2e fois');
    ok(/record : 12 vagues/.test(r.carte), 'Record affiché sur la carte : ' + r.carte);
    ok(r.camp2 && r.saveCamp, 'Campagne intacte après deux parties infinies');
  });

  test('Infini : rien ne fuit dans une partie normale ni dans un défi', () => {
    if (!pret()) ignorer('Mode infini absent');
    reset(GAGNE);
    const r = J(function(){
      var o = {};
      __inf.infStart(0, true); startWave(); __t.geler(); S.wave = 3; gameOver();
      $('btnMap').click();
      o.carte = { inf: !!curLoc.inf, run: __inf.run === null, idx: LOCS.indexOf(curLoc) };
      startLocation(0);
      o.camp = { inf: !!curLoc.inf, total: wavePlan(1).total, money: S.money, maxD: UPG.dmg.max, act: __inf.active, plan: !!plan.inf };
      updateHUD(); o.camp.hud = $('wave').textContent;
      // Infini en cours puis campagne directement (sans passer par la carte)
      __inf.infStart(0, true); startLocation(0); o.direct = { inf: !!curLoc.inf, total: wavePlan(1).total, run: __inf.run === null };
      if (typeof __defi === 'object'){
        __inf.infStart(0, true);
        __defi.defiStart({ loc: 0, waves: 3, mods: [] });
        o.defi = { defi: !!curLoc.defi, inf: !!curLoc.inf, money: S.money, plan: !!plan.inf, run: __inf.run === null };
        __inf.infStart(0, true);
        o.apresDefi = { inf: !!curLoc.inf, defi: !!curLoc.defi, run: __defi.run === null };
      }
      return o;
    });
    ok(!r.carte.inf && r.carte.run && r.carte.idx >= 0, 'Carte : on quitte le mode infini ' + JSON.stringify(r.carte));
    ok(!r.camp.inf && !r.camp.act && !r.camp.plan, 'Partie normale sans mode infini');
    egal(r.camp.total, 30, 'Vague 1 de Saint-Clou normale');
    egal(r.camp.money, 0, 'Argent de départ normal');
    egal(r.camp.maxD, 10, 'Plafond normal');
    egal(r.camp.hud, 'Vague 1 / 5', 'HUD normal');
    ok(!r.direct.inf && r.direct.run && r.direct.total === 30, 'Campagne lancée pendant l’infini : normale ' + JSON.stringify(r.direct));
    if (r.defi){
      ok(r.defi.defi && !r.defi.inf && !r.defi.plan && r.defi.run, 'Défi sans mode infini ' + JSON.stringify(r.defi));
      egal(r.defi.money, 600, 'Argent de départ du défi');
      ok(r.apresDefi.inf && !r.apresDefi.defi && r.apresDefi.run, 'Infini après un défi : plus de défi ' + JSON.stringify(r.apresDefi));
    }
  });

  test('Infini : HUD et boutique en infini (vague sans « / », record, boss annoncé)', () => {
    if (!pret()) ignorer('Mode infini absent');
    reset(GAGNE);
    const r = J(function(){
      __inf.infStart(3, true);
      var o = { titre0: $('shopTitle').textContent, stats0: $('shopStats').textContent };
      S.wave = 4; renderShop(); o.next = $('btnNext').textContent;
      startWave(); __t.geler(); updateHUD(); updateHUD();
      o.hud = $('wave').textContent; o.loc = $('locName').textContent; o.ban = $('bTitle').textContent + ' | ' + $('bSub').textContent;
      return o;
    });
    egal(r.titre0, 'Mode infini', 'Titre de la préparation');
    ok(/1\s000\s\$/.test(r.stats0.replace(/[  ]/g, ' ')), 'Argent de départ affiché : ' + r.stats0);
    ok(/vague 5/.test(r.next) && /boss/.test(r.next), 'Bouton de la vague 5 avec boss : ' + r.next);
    egal(r.hud, 'Vague 5 · infini', 'HUD');
    ok(/Infini/.test(r.loc), 'Nom de ville du HUD : ' + r.loc);
    ok(/^Vague 5 \|/.test(r.ban) && /boss/.test(r.ban), 'Bannière : ' + r.ban);
  });

  test('Infini : fmt compact (9 999 $, 12,3 k $, 4,56 M $, 7,8 G $)', () => {
    if (lire('typeof fmtN === "function"') !== true) ignorer('fmtN absent');
    const r = J(function(){ return { a: fmt(9999), b: fmt(12345), c: fmt(4560000), d: fmt(7.8e9), e: fmt(500), f: fmt(999999), g: fmtN(12345), h: fmt(-12345), i: fmt(10000), j: fmtS(25000) }; });
    egal(esp(r.a), '9 999 $', 'fmt(9999)');
    egal(esp(r.b), '12,3 k $', 'fmt(12345)');
    egal(esp(r.c), '4,56 M $', 'fmt(4560000)');
    egal(esp(r.d), '7,8 G $', 'fmt(7,8e9)');
    egal(esp(r.e), '500 $', 'fmt(500)');
    egal(esp(r.f), '1 M $', 'fmt(999999) arrondi à l’unité suivante');
    egal(esp(r.g), '12,3 k', 'fmtN(12345)');
    egal(esp(r.h), '-12,3 k $', 'fmt(-12345)');
    egal(esp(r.i), '10 k $', 'fmt(10000)');
    egal(esp(r.j), '25 k ⚙', 'Ferraille compacte');
  });
})();
