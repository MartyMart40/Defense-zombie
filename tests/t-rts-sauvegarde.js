'use strict';
/* Tests de la sauvegarde de la partie RTS en cours (js/45-rts-sauvegarde.js) */
(function(){
  if (typeof test !== 'function' || typeof TESTS === 'undefined') return;
  const exiger = () => { if (lire('typeof __rtsSave === "object" && typeof __rtsSave.rtsSave === "function"') !== true) ignorer('Sauvegarde du RTS absente (js/45-rts-sauvegarde.js)'); };
  const fin = () => J(function(){ if (__rts.RTS.on) __rts.rtsQuit(); localStorage.removeItem('dt_rts_partie'); __rtsSave.rtsSaveBtn(); });
  // Résumé d'une partie, pour comparer avant et après la reprise
  const resume = 'function resume(){ var R = __rts.RTS; return {'
    + ' argent: Math.round(S.money), t: Math.round(R.t), nids: R.nests.length, morts: R.nests.filter(function(n){ return n.dead; }).length,'
    + ' blds: R.blds.filter(function(o){ return !o.dead; }).map(function(o){ return o.type + ":" + o.lv + ":" + o.rot; }).sort().join(","),'
    + ' unites: R.units.filter(function(u){ return !u.dead; }).map(function(u){ return u.type; }).sort().join(","),'
    + ' upg: JSON.stringify(R.upg), base: R.baseR, route: __rts.RTS_ROAD.length, hordes: R.hordeN,'
    + ' qg: !!R.base && R.base.type === "hq" }; }';

  test('RTS : sauver puis reprendre redonne la même partie', () => {
    exiger(); reset();
    const r = J(new Function(resume + `
      __rts.rtsStart(); var R = __rts.RTS; R.nests.forEach(function(n){ n.spawnT = 1e9; }); R.hordeT = 1e9; clearZombies();
      S.money = 50000;
      __rts.rtsBuild('heavyfac', 16, 12, 1);
      var t = __rts.rtsBuild('t_cannon', -16, -8, 0); __rts.rtsTurretUp(t); __rts.rtsTurretUp(t);
      __rts.rtsBuy('gunner'); __rts.rtsBuy('rocket');
      __rts.rtsUpgBuy('rifle', 'arm');
      __rts.rtsNestDie(R.nests[0]);
      R.t = 245; R.hordeN = 4; S.money = 4321;
      var avant = resume(), ok = __rtsSave.rtsSave();
      __rts.rtsQuit();
      var b = document.getElementById('btnRtsGo'), o = { ok: ok, avant: avant, bouton: !!b && !b.classList.contains('hide'), texte: b ? b.textContent : '' };
      b.click(); for (var i = 0; i < 3; i++) visuals(1 / 30);
      o.etat = state; o.apres = resume();
      return o;
    `));
    fin();
    ok(r.ok, 'rtsSave a échoué');
    ok(r.bouton, 'Le bouton Continuer doit être visible sur l’écran titre');
    ok(/Continuer la guerre \(1 nid détruit, 4 min\)/.test(r.texte), 'Texte du bouton : ' + r.texte);
    egal(r.etat, 'rts', 'État après la reprise');
    ['argent', 't', 'nids', 'morts', 'blds', 'unites', 'upg', 'base', 'route', 'hordes', 'qg'].forEach(k => egal(r.apres[k], r.avant[k], 'Repris : ' + k));
  });

  test('RTS : sauvegarde automatique toutes les 30 s de jeu, et à la pause', () => {
    exiger(); reset();
    const r = J(function(){
      __rts.rtsStart(); var R = __rts.RTS; R.nests.forEach(function(n){ n.spawnT = 1e9; }); R.hordeT = 1e9; clearZombies();
      localStorage.removeItem('dt_rts_partie');
      R.saveT = .05; visuals(1 / 30); var avant = !!localStorage.getItem('dt_rts_partie');
      visuals(1 / 30); visuals(1 / 30); var auto = !!localStorage.getItem('dt_rts_partie');
      localStorage.removeItem('dt_rts_partie'); __rts.rtsPause(); var pause = !!localStorage.getItem('dt_rts_partie');
      var btns = [].slice.call(document.querySelectorAll('#rtsPanel button')).map(function(b){ return b.textContent; }).join('|');
      R.paused = false; __rts.rtsQuit();
      return { avant: avant, auto: auto, pause: pause, btns: btns };
    });
    fin();
    ok(!r.avant, 'Sauvé trop tôt'); ok(r.auto, 'Pas de sauvegarde automatique après 30 s');
    ok(r.pause, 'Pas de sauvegarde à la pause');
    ok(/Sauver et quitter/.test(r.btns) && /Abandonner/.test(r.btns), 'Boutons de la pause : ' + r.btns);
  });

  test('RTS : la sauvegarde est effacée quand le QG tombe ou qu’on abandonne', () => {
    exiger(); reset();
    const r = J(function(){
      var o = {};
      __rts.rtsStart(); __rtsSave.rtsSave(); o.sauve = !!__rtsSave.rtsSaveGet();
      __rts.rtsEnd(false); o.finQG = !__rtsSave.rtsSaveGet(); __rts.rtsQuit();
      __rts.rtsStart(); __rts.rtsPause();
      var ab = [].slice.call(document.querySelectorAll('#rtsPanel button')).filter(function(b){ return /Abandonner/.test(b.textContent); })[0];
      ab.click(); o.abandon = !__rtsSave.rtsSaveGet() && state !== 'rts';
      o.bouton = document.getElementById('btnRtsGo').classList.contains('hide');
      return o;
    });
    fin();
    ok(r.sauve, 'Sauvegarde'); ok(r.finQG, 'Effacée quand le QG tombe'); ok(r.abandon, 'Effacée avec Abandonner');
    ok(r.bouton, 'Le bouton Continuer doit être caché sans sauvegarde');
  });

  test('RTS : nouvelle partie avec une partie sauvée : il faut confirmer', () => {
    exiger(); reset();
    const r = J(function(){
      __rts.rtsStart(); __rtsSave.rtsSave(); __rts.rtsQuit();
      var b = document.getElementById('btnRts'), o = {};
      b.click(); o.etat1 = state; o.texte = b.textContent; o.garde = !!__rtsSave.rtsSaveGet();
      b.click(); o.etat2 = state; o.efface = !__rtsSave.rtsSaveGet();
      __rts.rtsQuit();
      return o;
    });
    fin();
    ok(r.etat1 !== 'rts', 'Le premier clic ne doit pas lancer la partie');
    ok(/Confirmer/.test(r.texte), 'Texte de confirmation : ' + r.texte);
    ok(r.garde, 'La sauvegarde doit rester après le premier clic');
    egal(r.etat2, 'rts', 'Le deuxième clic lance la partie'); ok(r.efface, 'La vieille sauvegarde est effacée');
  });

  test('RTS : une sauvegarde abîmée est ignorée (nouvelle partie normale)', () => {
    exiger(); reset();
    const r = J(function(){
      localStorage.setItem('dt_rts_partie', JSON.stringify({ v: 99, blds: [] }));
      var o = { lue: __rtsSave.rtsSaveGet() };
      __rtsSave.rtsSaveBtn(); o.cache = document.getElementById('btnRtsGo').classList.contains('hide');
      __rts.rtsStart({ v: 1, blds: [], units: [], nests: [], road: [] });
      o.etat = state; o.argent = S.money; o.nids = __rts.RTS.nests.length; o.qg = !!__rts.RTS.base;
      __rts.rtsQuit();
      return o;
    });
    fin();
    egal(r.lue, null, 'Sauvegarde abîmée lue'); ok(r.cache, 'Pas de bouton Continuer pour une sauvegarde abîmée');
    egal(r.etat, 'rts', 'État'); egal(r.argent, 900, 'Argent de départ'); egal(r.nids, 6, 'Nids'); ok(r.qg, 'QG');
  });
})();
