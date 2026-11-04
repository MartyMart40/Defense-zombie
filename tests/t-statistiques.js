'use strict';
/* Tests des statistiques à vie (js/52-statistiques.js) */
(function(){
  if (typeof test !== 'function' || typeof TESTS === 'undefined') return;
  const exiger = () => { if (lire('typeof __stats === "object"') !== true) ignorer('Statistiques absentes (js/52-statistiques.js)'); };

  test('Statistiques : temps par mode, zombies par arme, écran avec les records', () => {
    exiger(); reset();
    J('startLocation(0)'); J('__t.geler()');
    const r = J(function(){
      var V = __stats.VIE(), t0 = V.temps.toit, o = {};
      for (var i = 0; i < 30; i++) visuals(1 / 30);
      o.temps = V.temps.toit - t0 > .9;
      state = 'paused'; var t1 = V.temps.toit; visuals(1 / 30); o.pause = V.temps.toit === t1; state = 'playing';
      equip('pistol'); var a0 = V.armes.pistol || 0;
      var z = __t.placer('walker', 0, -30); kill(z, false); kill(z, false);
      o.arme = (V.armes.pistol || 0) - a0 === 1;
      gameOver();
      document.getElementById('btnStatsTitle').click();
      var sc = document.getElementById('scrStats'), txt = sc.textContent;
      o.ecran = !sc.classList.contains('hide') && /Temps de jeu/.test(txt) && /Zombies abattus/.test(txt) && /Records/.test(txt) && /Pistolet/.test(txt);
      o.titreCache = document.getElementById('scrTitle').classList.contains('hide');
      document.getElementById('btnStatsBack').click(); o.retour = sc.classList.contains('hide') && !document.getElementById('scrTitle').classList.contains('hide');
      o.duree = __stats.vieDuree(3725) === '1 h 02 min' && __stats.vieDuree(125) === '2 min';
      return o;
    });
    ok(r.temps, 'Le temps sur le toit avance'); ok(r.pause, 'Pas de temps compté en pause');
    ok(r.arme, 'Un zombie abattu compte une fois pour l’arme en main'); ok(r.ecran, 'Écran des statistiques');
    ok(r.titreCache, 'L’écran titre est caché derrière'); ok(r.retour, 'Retour à l’écran titre'); ok(r.duree, 'Durées en heures et minutes');
  });

  test('Statistiques : une vieille sauvegarde sans P.vie reçoit des valeurs par défaut', () => {
    exiger(); reset();
    const r = J(function(){ delete P.vie; var v = __stats.VIE(); P.vie = { temps:{ toit:'x', robot:-3 }, armes:{ pistol:'12', rien:-1 } }; var w = __stats.vieNorm(); return { v: v.temps.toit === 0 && Object.keys(v.armes).length === 0, w: w.temps.toit === 0 && w.temps.robot === 0 && w.armes.pistol === 12 && !('rien' in w.armes) }; });
    ok(r.v, 'Valeurs par défaut'); ok(r.w, 'Valeurs abîmées nettoyées');
  });
})();
