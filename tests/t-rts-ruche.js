'use strict';
/* Tests de la Ruche, des vallées, des sièges et des paliers d'alerte du RTS (js/65-rts-ruche.js, tâche 101) */
(function(){
  if (typeof test !== 'function' || typeof TESTS === 'undefined') return;
  const exiger = () => { if (lire('typeof __rtsRuche === "object" && typeof __rtsRuche.rtsRucheCheck === "function"') !== true) ignorer('Ruche du RTS absente (js/65-rts-ruche.js)'); };
  // Partie calme : pas de ponte, pas de horde, pas de zombie
  const calme = 'function calme(){ __rts.rtsStart(); var R = __rts.RTS; R.nests.forEach(function(n){ n.spawnT = 1e9; }); R.hordeT = 1e9; clearZombies(); return R; }'
    + ' function tuerNids(k){ for (var i = 0; i < k; i++){ var n = rtsNestsAlive().sort(function(a, b){ return b.z - a.z; })[0]; __rts.rtsNestDie(n); } }';
  const fin = () => J(function(){ if (__rts.RTS.on){ __rts.RTS.paused = false; __rts.rtsQuit(); } localStorage.removeItem('dt_rts_partie'); document.getElementById('rtsPanel').classList.add('hide'); if (typeof __rtsRuche === 'object') __rtsRuche.RTS_VAL.choix = null; });

  test('RTS Ruche : le compteur de nids est visible et la Ruche sort au 8e nid', () => {
    exiger(); reset();
    const r = J(new Function(calme + `
      var R = calme(), o = {}, N = __rtsRuche.RTS_REGL.ruche.nids;
      for (var i = 0; i < 3; i++) visuals(1 / 30);
      o.hud0 = document.getElementById('rtNests').textContent;
      tuerNids(N - 1); for (var j = 0; j < 3; j++) visuals(1 / 30);
      o.hud7 = document.getElementById('rtNests').textContent; o.avant = !!R.ruche;
      tuerNids(1); for (var k = 0; k < 3; k++) visuals(1 / 30);
      o.apres = !!R.ruche && !R.ruche.dead && R.nests.indexOf(R.ruche) >= 0;
      o.actifs = rtsNestsAlive().length; o.nidsMorts = rtsNestsDead();
      o.loin = R.ruche ? -R.ruche.z : 0; o.vie = R.ruche ? R.ruche.maxHp : 0;
      o.garde = zombies.filter(function(z){ return !z.dead && z.rtsGarde === R.ruche; }).length;
      o.boss = zombies.some(function(z){ return !z.dead && z.rtsGarde === R.ruche && z.rtsBoss; });
      o.hud8 = document.getElementById('rtNests').textContent;
      __rtsCmd.rtsMiniDraw(); o.miniZ = __rtsCmd.rtsMiniWorld(0, 0).z <= R.ruche.z;
      // Elle pond et elle se défend quand on l'attaque
      var z0 = zombies.length; R.ruche.spawnT = 0; R.ruche.hp -= 100; visuals(1 / 30); visuals(1 / 30);
      o.ponte = zombies.length > z0;
      return o;
    `));
    fin();
    ok(/0 ?\/ ?8/.test(r.hud0) && /Ruche/.test(r.hud0), 'Compteur au départ : ' + r.hud0);
    ok(/7 ?\/ ?8/.test(r.hud7), 'Compteur à 7 nids : ' + r.hud7);
    ok(!r.avant, 'Pas de Ruche avant le 8e nid'); ok(r.apres, 'La Ruche sort au 8e nid');
    egal(r.actifs, 6, 'Toujours 6 nids actifs (la Ruche ne compte pas)'); egal(r.nidsMorts, 8, 'Nids détruits');
    ok(r.loin >= 300, 'La Ruche est au fond de la vallée : ' + r.loin + ' m'); ok(r.vie >= 50000, 'Beaucoup de vie : ' + r.vie);
    ok(r.garde >= 10, 'Une garde autour d’elle : ' + r.garde); ok(r.boss, 'Un boss dans sa garde');
    ok(/Ruche 100 %/.test(r.hud8), 'Compteur avec la Ruche : ' + r.hud8);
    ok(r.miniZ, 'La mini-carte va jusqu’à la Ruche'); ok(r.ponte, 'Elle pond des zombies');
  });

  test('RTS Ruche : victoire, « Vallée libérée ! » et ses deux boutons, vallée suivante gardée dans le profil', () => {
    exiger(); reset();
    const r = J(new Function(calme + `
      var R = calme(), o = {}, scr = P.scrap || 0;
      tuerNids(__rtsRuche.RTS_REGL.ruche.nids); visuals(1 / 30);
      R.ruche.hp = 1; __rts.rtsNestDie(R.ruche);
      o.gagne = R.gagne; o.vallee = P.rtsVallee; o.lib = P.rtsLib; o.ferraille = (P.scrap || 0) - scr;
      o.sauve = JSON.parse(localStorage.getItem('dt_prof') || '{}').rtsVallee;
      __rtsRuche.rtsVictoire();
      var pan = document.getElementById('rtsPanel');
      o.visible = !pan.classList.contains('hide'); o.texte = pan.textContent;
      o.btns = [].slice.call(pan.querySelectorAll('button[data-i]')).map(function(b){ return b.textContent; });
      o.pause = R.paused;
      // « Continuer sans fin » : la partie reprend, sans Ruche
      pan.querySelector('button[data-i="1"]').click();
      o.libre = R.libre; o.reprise = !R.paused && pan.classList.contains('hide');
      for (var i = 0; i < 3; i++) visuals(1 / 30);
      o.hudLibre = document.getElementById('rtNests').textContent;
      // « Vallée suivante » : une nouvelle partie en vallée 2, plus dure
      __rtsRuche.rtsVictoire();
      R.victoire.v = 1; document.querySelector('#rtsPanel button[data-i="0"]').click();
      R.nests.forEach(function(n){ n.spawnT = 1e9; }); R.hordeT = 1e9; visuals(1 / 30);
      o.v2 = R.vallee; o.libre2 = R.libre; o.ruche2 = !!R.ruche; o.menace2 = R.threat;
      return o;
    `));
    fin();
    ok(r.gagne, 'Partie gagnée'); egal(r.vallee, 2, 'Vallée 2 débloquée'); egal(r.lib, 1, 'Vallée 1 libérée');
    egal(r.sauve, 2, 'Gardé dans le profil sauvé'); ok(r.ferraille > 0, 'Récompense en ferraille : ' + r.ferraille);
    ok(r.visible && /Vallée libérée/.test(r.texte), 'Écran de victoire : ' + r.texte.slice(0, 80));
    ok(/Temps/.test(r.texte) && /Nids/.test(r.texte) && /abattus/.test(r.texte) && /perdues/.test(r.texte), 'Temps, nids, tués, pertes');
    egal(r.btns.join('|'), 'Vallée suivante|Continuer sans fin', 'Les deux boutons');
    ok(r.pause, 'Le jeu attend pendant l’écran'); ok(r.libre && r.reprise, 'Continuer sans fin reprend la partie');
    ok(/libérée/.test(r.hudLibre), 'Compteur après la victoire : ' + r.hudLibre);
    egal(r.v2, 2, 'Vallée suivante : vallée 2'); ok(!r.libre2 && !r.ruche2, 'Nouvelle partie sans Ruche');
    ok(r.menace2 > 1.5, 'La vallée 2 part avec plus de menace : ' + r.menace2);
  });

  test('RTS Ruche : la sauvegarde garde la vallée et la Ruche ; une vieille sauvegarde se charge encore', () => {
    exiger(); reset();
    const r = J(new Function(calme + `
      var R = calme(), o = {};
      P.rtsVallee = 3; __rtsRuche.RTS_VAL.choix = 3; __rts.rtsQuit(); R = calme();
      o.v = R.vallee;
      tuerNids(__rtsRuche.RTS_REGL.ruche.nids); visuals(1 / 30);
      R.ruche.hp = R.ruche.maxHp * .4; var x = R.ruche.x, z = R.ruche.z;
      __rtsSave.rtsSave(); var d = __rtsSave.rtsSaveGet();
      o.champ = d.vallee === 3 && !!d.ruche && d.nests.every(function(n){ return n.d !== undefined; }) && d.nests.length === R.nests.length - 1;
      __rts.rtsQuit(); __rts.rtsStart(d); visuals(1 / 30);
      o.v2 = R.vallee; o.ruche = !!R.ruche && Math.abs(R.ruche.x - x) < .2 && Math.abs(R.ruche.z - z) < .2 && Math.abs(R.ruche.hp / R.ruche.maxHp - .4) < .01;
      // Vieille sauvegarde : sans vallée, sans Ruche, sans libre
      delete d.vallee; delete d.ruche; delete d.libre; d.nests.forEach(function(n){ n.d = 0; }); d.nests[0].d = 1;
      __rts.rtsQuit(); o.lisible = __rtsSave.rtsSaveOk(d); __rts.rtsStart(d); visuals(1 / 30);
      o.vieux = { etat: state, v: R.vallee, ruche: !!R.ruche, morts: rtsNestsDead(), libre: R.libre };
      return o;
    `));
    fin();
    egal(r.v, 3, 'Partie lancée dans la vallée choisie'); ok(r.champ, 'Champs vallée et Ruche dans la sauvegarde');
    egal(r.v2, 3, 'Vallée reprise'); ok(r.ruche, 'Ruche reprise (position, vie)');
    ok(r.lisible, 'Vieille sauvegarde lisible');
    egal(r.vieux.etat, 'rts', 'Vieille sauvegarde : partie lancée'); egal(r.vieux.v, 1, 'Vieille sauvegarde : vallée 1');
    ok(!r.vieux.ruche && r.vieux.morts === 1 && !r.vieux.libre, 'Vieille sauvegarde : ' + JSON.stringify(r.vieux));
  });

  test('RTS Ruche : le choix de la vallée sur l’écran titre (seulement après une vallée libérée)', () => {
    exiger(); reset();
    const r = J(function(){
      const V = __rtsRuche, o = {};
      P.rtsVallee = 1; P.rtsLib = 0; V.RTS_VAL.choix = null; const row = V.rtsValleeRow();
      o.cache = row.classList.contains('hide');
      P.rtsVallee = 3; P.rtsLib = 2; V.rtsValleeRow();
      o.montre = !row.classList.contains('hide'); o.txt = document.getElementById('rtValTxt').textContent;
      document.getElementById('rtValMoins').click(); o.choix = V.RTS_VAL.choix; o.txt2 = document.getElementById('rtValTxt').textContent;
      document.getElementById('rtValPlus').click(); document.getElementById('rtValPlus').click(); o.max = V.RTS_VAL.choix;
      o.btnHaut = document.getElementById('rtValPlus').getBoundingClientRect().height;
      V.RTS_VAL.choix = null; P.rtsVallee = 1; P.rtsLib = 0; V.rtsValleeRow();
      return o;
    });
    fin();
    ok(r.cache, 'Caché tant qu’aucune vallée n’est libérée'); ok(r.montre && /Vallée 3/.test(r.txt), 'Vallée 3 par défaut : ' + r.txt);
    egal(r.choix, 2, 'Vallée précédente'); ok(/libérée/.test(r.txt2), 'Vallée libérée marquée : ' + r.txt2);
    egal(r.max, 3, 'Pas au-delà de la vallée débloquée'); ok(r.btnHaut === 0 || r.btnHaut >= 36, 'Bouton assez grand pour le doigt : ' + r.btnHaut);
  });

  test('RTS siège : annoncé 10 s d’avance, lancé avec la horde, puis un creux', () => {
    exiger(); reset();
    const r = J(new Function(calme + `
      var R = calme(), C = __rtsRuche.RTS_REGL.siege, o = {};
      R.hordeN = C.tous - 1; R.hordeT = C.annonce - 1; visuals(1 / 30);
      o.tropTot = !R.siege; // pas de siège avant C.debut secondes
      R.t = (C.debut || 0) + 10; R.hordeT = C.annonce + .5; visuals(1 / 30);
      o.rienAvant = !R.siege;
      for (var i = 0; i < 30; i++) visuals(1 / 30);
      o.annonce = R.siege && R.siege.phase; o.cote = __rtsRuche.rtsSiegeCote();
      var el = document.getElementById('rtSiege'); o.bandeau = !el.classList.contains('hide') && /Siège dans/.test(el.textContent);
      __rtsCmd.rtsMiniDraw();
      R.hordeT = .01; var z0 = zAliveCount(); visuals(1 / 30); visuals(1 / 30);
      o.lance = R.siege && R.siege.phase; o.nb = zAliveCount() - z0; o.normal = Math.round((10 + R.threat * 5) * C.horde);
      o.titre = document.getElementById('bTitle').textContent;
      R.hordeT = 1e9; R.siege.t = .01; R.base.hp = R.base.maxHp * .5; visuals(1 / 30); visuals(1 / 30); visuals(1 / 30);
      o.creux = R.siege && R.siege.phase; o.ponteCreux = R.ponteK; o.repare = R.base.hp > R.base.maxHp * .5; R.base.hp = R.base.maxHp;
      R.siege.t = .01; visuals(1 / 30); visuals(1 / 30);
      o.finSiege = !R.siege; o.ponteLeger = R.ponteK;
      return o;
    `));
    fin();
    ok(r.tropTot, 'Pas de siège dans les premières minutes'); ok(r.rienAvant, 'Pas d’annonce trop tôt'); egal(r.annonce, 'annonce', 'Siège annoncé'); ok(r.cote.length > 3, 'Côté dit : ' + r.cote);
    ok(r.bandeau, 'Bandeau d’annonce'); egal(r.lance, 'siege', 'Siège lancé avec la horde');
    ok(r.nb > r.normal * 1.5, 'Nettement plus fort qu’une horde : ' + r.nb + ' contre ' + r.normal); ok(/Siège/.test(r.titre), 'Bandeau du siège : ' + r.titre);
    egal(r.creux, 'creux', 'Puis un creux'); ok(r.repare, 'Le QG se répare pendant l’accalmie'); ok(r.ponteCreux < .5, 'Ponte réduite pendant le creux : ' + r.ponteCreux);
    ok(r.finSiege, 'Fin du creux'); ok(r.ponteLeger < 1 && r.ponteLeger > r.ponteCreux, 'Entre les sièges, ponte un peu plus légère : ' + r.ponteLeger);
  });

  test('RTS : à haute menace, un zombie ordinaire ne rase plus un bâtiment en un instant', () => {
    exiger(); reset();
    const r = J(new Function(calme + `
      var R = calme(), o = {};
      R.t = 40 * 60; __rts.RTS.kills = 0; visuals(1 / 30); o.menace = R.threat; o.mult = plan.dmgMult;
      var t = R.blds.filter(function(b){ return b.type === 't_mg'; })[0];
      __rts.rtsSpawnAt(t.x, t.z - 2.2, 1, .05, 'walker'); var z = zombies[zombies.length - 1];
      t.hp = t.maxHp = 1e6; var h0 = t.hp; z.atkT = 0; z.rtsT = 0;
      for (var i = 0; i < 4; i++) visuals(1 / 30);
      o.coup = h0 - t.hp; o.base = ZTYPES.walker.dmg; o.zdmg = z.dmg;
      return o;
    `));
    fin();
    ok(r.menace > 10, 'Menace haute : ' + r.menace);
    ok(r.coup > 0, 'Le zombie frappe le bâtiment');
    ok(Math.abs(r.coup - r.base * Math.pow(r.mult, .6)) < r.base * .05 + .5, 'Coup = base × multiplicateur^0,6 : ' + r.coup.toFixed(1) + ' (base ' + r.base + ', mult ' + r.mult.toFixed(1) + ')');
    ok(r.coup < r.zdmg * .7, 'Moins fort que contre une unité : ' + r.coup.toFixed(1) + ' contre ' + r.zdmg.toFixed(1));
  });

  test('RTS alerte : paliers clairs (tourelle perdue, zombies dans la base, QG touché, sous 50 % et 25 %)', () => {
    exiger(); if (lire('typeof __rtsCmd === "object" && typeof __rtsCmd.rtsAlertLost === "function"') !== true) ignorer('Paliers d’alerte absents'); reset();
    const r = J(new Function(calme + `
      var R = calme(), C = __rtsCmd, el = document.getElementById('rtAlert'), o = {};
      for (var i = 0; i < 3; i++) visuals(1 / 30);
      var t = R.blds.filter(function(b){ return b.type === 't_mg'; })[0];
      t.hp = 1; rtsDmgTarget(t, 5);
      o.tourelle = !el.classList.contains('hide') && /Tourelle perdue/.test(el.textContent);
      // Zombies dans la base : palier plus grave, il passe tout de suite
      for (var k = 0; k < 8; k++){ __rts.rtsSpawnAt(4 + k, -6, 1, .1, 'walker'); }
      zombies.forEach(function(z){ z.rtsT = 9; z.speed = 0; });
      C.RTS_AL.baseT = 0; C.rtsAlertCheck(.05);
      o.base = /zombies dans la base/.test(el.textContent);
      clearZombies();
      // QG touché, puis sous 50 %, puis sous 25 %
      var Q = R.base; C.rtsAlertCheck(.05); Q.hp -= 10; C.rtsAlertCheck(.05);
      o.qg = /QG est attaqué/.test(el.textContent);
      Q.hp = Q.maxHp * .45; C.rtsAlertCheck(.05); o.q50 = /sous 50 %/.test(el.textContent);
      Q.hp = Q.maxHp * .2; C.rtsAlertCheck(.05); o.q25 = /sous 25 %/.test(el.textContent);
      o.p = el.dataset.p;
      // Moins grave pendant qu'une alerte grave est affichée : rien
      var t2 = R.blds.filter(function(b){ return b.type === 't_mg' && !b.dead; })[0]; t2.hp = 1; rtsDmgTarget(t2, 5);
      o.pasNoye = /sous 25 %/.test(el.textContent);
      Q.hp = Q.maxHp;
      return o;
    `));
    fin();
    ok(r.tourelle, 'Tourelle perdue'); ok(r.base, 'Zombies dans la base'); ok(r.qg, 'QG touché');
    ok(r.q50, 'QG sous 50 %'); ok(r.q25, 'QG sous 25 %'); egal(r.p, '5', 'Palier le plus grave');
    ok(r.pasNoye, 'Une alerte moins grave ne remplace pas une plus grave');
  });
})();
