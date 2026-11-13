'use strict';
/* Tests des astuces des premières parties RTS (js/47-rts-astuces.js) */
(function(){
  if (typeof test !== 'function' || typeof TESTS === 'undefined') return;
  const exiger = () => { if (lire('typeof __rtsTips === "object" && typeof __rtsTips.rtsTipStep === "function"') !== true) ignorer('Astuces du RTS absentes (js/47-rts-astuces.js)'); };
  // Partie calme, astuces remises à zéro
  const calme = 'function calme(){ __rtsTips.rtsTipsReset(); __rts.rtsStart(); var R = __rts.RTS; R.nests.forEach(function(n){ n.spawnT = 1e9; }); R.hordeT = 1e9; clearZombies(); __rtsTips.RTS_TIP.gap = 3; return R; }';
  const fin = () => J(function(){ if (__rts.RTS.on) __rts.rtsQuit(); __rtsTips.rtsTipsReset(); });
  const vis = 'function vis(){ return !document.getElementById("rtTip").classList.contains("hide"); }';

  test('Astuces RTS : la première vient après quelques secondes, OK la ferme, la suivante attend', () => {
    exiger(); reset();
    const r = J(new Function(calme + vis + `
      var R = calme(), T = __rtsTips, o = {};
      T.rtsTipStep(1); o.tot = vis();
      R.t = 3; T.rtsTipStep(2.5); o.id = T.RTS_TIP.cur && T.RTS_TIP.cur.id; o.vu = vis();
      o.txt = document.getElementById('rtTipTxt').textContent;
      o.garde = T.rtsTipSeen().indexOf('choisir') >= 0;
      document.getElementById('rtTipOk').click(); o.ferme = !vis();
      R.t = 20; T.rtsTipStep(2); o.attend = !vis();
      T.rtsTipStep(6); o.deux = T.RTS_TIP.cur && T.RTS_TIP.cur.id;
      return o;
    `));
    fin();
    ok(!r.tot, 'Une astuce trop tôt');
    egal(r.id, 'choisir', 'Première astuce'); ok(r.vu, 'La bulle doit être visible');
    ok(r.txt.length > 30, 'Texte : ' + r.txt); ok(r.garde, 'L’astuce doit être notée comme vue');
    ok(r.ferme, 'OK doit fermer la bulle'); ok(r.attend, 'La suivante doit attendre quelques secondes');
    egal(r.deux, 'but', 'Deuxième astuce : le but (la Ruche, tâche 101)');
  });

  test('Astuces RTS : chacune une seule fois, même dans une autre partie, et rien en pause', () => {
    exiger(); reset();
    const r = J(new Function(calme + vis + `
      var R = calme(), T = __rtsTips, ids = [];
      R.t = 500; R.hordeN = 2; S.money = 9999; __rts.rtsNestDie(R.nests[0]);
      for (var i = 0; i < 400; i++){ var t = T.rtsTipStep(.5); if (t && ids.indexOf(t.id) < 0) ids.push(t.id); }
      var o = { ids: ids.join(','), n: ids.length };
      __rts.rtsQuit(); __rts.rtsStart(); R = __rts.RTS; R.t = 500; T.RTS_TIP.gap = 0;
      var encore = null; for (var j = 0; j < 40; j++){ var u = T.rtsTipStep(.5); if (u && ids.indexOf(u.id) >= 0) encore = u.id; }
      o.encore = encore;
      T.rtsTipsReset(); T.RTS_TIP.gap = 0; R.paused = true; T.rtsTipStep(5); o.pause = !vis(); R.paused = false;
      return o;
    `));
    fin();
    ok(r.n >= 7, 'Astuces vues dans une longue partie : ' + r.ids);
    ok(/choisir/.test(r.ids) && /horde/.test(r.ids) && /nid/.test(r.ids) && /usine/.test(r.ids), 'Astuces : ' + r.ids);
    egal(r.encore, null, 'Une astuce déjà vue est revenue');
    ok(r.pause, 'Pas d’astuce en pause');
  });

  test('Astuces RTS : l’usine lourde seulement si on peut la payer et qu’on n’en a pas', () => {
    exiger(); reset();
    const r = J(new Function(calme + `
      var R = calme(), T = __rtsTips, u = T.RTS_TIPS.filter(function(x){ return x.id === 'usine'; })[0], o = {};
      R.t = 50; S.money = 300; o.pauvre = u.cond(R);
      S.money = 5000; o.riche = u.cond(R);
      __rts.rtsBuild('heavyfac', 16, 12, 0); S.money = 5000; o.deja = u.cond(R);
      return o;
    `));
    fin();
    ok(!r.pauvre, 'Pas d’astuce sans argent'); ok(r.riche, 'Astuce quand on peut la payer'); ok(!r.deja, 'Pas d’astuce quand l’usine existe');
  });

  test('Astuces RTS : « Plus d’astuces » les coupe, la pause permet de les revoir', () => {
    exiger(); reset();
    const r = J(new Function(calme + vis + `
      var R = calme(), T = __rtsTips, o = {};
      R.t = 3; T.rtsTipStep(3); o.avant = vis();
      document.getElementById('rtTipOff').click(); o.coupe = !vis() && T.rtsTipsOff();
      R.t = 100; T.RTS_TIP.gap = 0; T.rtsTipStep(1); o.plus = !vis();
      __rts.rtsPause(); var b = document.getElementById('rtTipAgain'); o.btn = !!b;
      if (b) b.click(); o.remis = !T.rtsTipsOff() && T.rtsTipSeen().length === 0;
      R.paused = false; document.getElementById('rtsPanel').classList.add('hide');
      T.RTS_TIP.gap = 0; T.rtsTipStep(1); o.revient = vis();
      return o;
    `));
    fin();
    ok(r.avant, 'Astuce visible au départ'); ok(r.coupe, '« Plus d’astuces » doit les couper'); ok(r.plus, 'Plus aucune astuce après');
    ok(r.btn, 'Bouton « Revoir les astuces » dans la pause'); ok(r.remis, 'Astuces remises à zéro'); ok(r.revient, 'Les astuces reviennent');
  });
})();
