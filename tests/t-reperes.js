'use strict';
// Repères visuels pour jouer sans son (29-reperes.js) : flèches hors champ, flashs de la barricade, sous-titres, réglages
(function(){
  if (typeof test !== 'function' || typeof TESTS === 'undefined') return;
  function pret(){ return lire('typeof __reperes === "object" && typeof __reperes.select === "function"') === true; }
  function partie(){
    reset(null); J('startLocation(0)');
    J(function(){
      __t.geler(); clearZombies(); state = 'playing'; shake = 0; recoilAcc = 0;
      __reperes.setCues(true); __reperes.setSubs(true);
      __reperes.RP.last = {}; __reperes.RP.count = {}; __reperes.RP.fl.L = __reperes.RP.fl.R = __reperes.RP.fl.B = 0;
    });
  }
  test('Repères : un volant hors champ fait apparaître une flèche du bon côté, elle disparaît à sa mort', () => {
    if (!pret()) ignorer('Repères visuels absents');
    partie();
    const r = J(function(){
      var o = {}, W = innerWidth;
      // Regarde à gauche : un volant à droite de la rue est hors champ, à droite
      yaw = 1.2; pitch = -.16; shake = 0; visuals(.016);
      var z = __t.placer('flyer', 11, -30); z.g.position.y = 7; z.st = 'dive';
      __reperes.RP.selT = 0; visuals(.016);
      var a = __reperes.arrowsOn().filter(function(x){ return x.kind === 'flyer'; });
      o.droite = a.length; o.xD = a.length ? a[0].x : -1; o.W = W; o.urg = a.length ? a[0].urg : null;
      damage(z, 1e9, false, z.g.position.clone()); visuals(.016);
      o.apresMort = __reperes.arrowsOn().filter(function(x){ return x.kind === 'flyer'; }).length;
      // Regarde à droite : un volant à gauche, flèche à gauche
      clearZombies(); yaw = -1.2; visuals(.016);
      var z2 = __t.placer('flyer', -11, -30); z2.g.position.y = 7; z2.st = 'dive';
      __reperes.RP.selT = 0; visuals(.016);
      var b = __reperes.arrowsOn().filter(function(x){ return x.kind === 'flyer'; });
      o.gauche = b.length; o.xG = b.length ? b[0].x : -1;
      // Droit devant, bien visible : pas de flèche
      clearZombies(); yaw = 0; visuals(.016);
      var z3 = __t.placer('flyer', 0, -40); z3.g.position.y = 8; z3.st = 'dive';
      __reperes.RP.selT = 0; visuals(.016);
      o.visible = __reperes.arrowsOn().length;
      clearZombies(); yaw = 0;
      return o;
    });
    egal(r.droite, 1, 'Flèche du volant (regard à gauche)');
    ok(r.xD > r.W / 2, 'La flèche doit être à droite : x = ' + r.xD + ' sur ' + r.W);
    ok(r.urg === true, 'Volant qui plonge : flèche urgente');
    egal(r.apresMort, 0, 'La flèche disparaît quand le volant meurt');
    egal(r.gauche, 1, 'Flèche du volant (regard à droite)');
    ok(r.xG >= 0 && r.xG < r.W / 2, 'La flèche doit être à gauche : x = ' + r.xG);
    egal(r.visible, 0, 'Volant visible à l’écran : aucune flèche');
  });
  test('Repères : un coup sur la barricade allume le flash du bon côté, plus fort pour un colosse', () => {
    if (!pret()) ignorer('Repères visuels absents');
    partie();
    const r = J(function(){
      var o = {}, F = __reperes.RP.fl, raz = function(){ F.L = F.R = F.B = 0; };
      yaw = 1.2; pitch = -.16; visuals(.016); raz();
      var z = __t.placer('walker', 11, -10); hitBarricade(z, 1, .15, 1);
      o.R = F.R; o.L = F.L; o.B = F.B; o.op = +__reperes.rpFlashEl.R.style.opacity;
      clearZombies(); yaw = -1.2; visuals(.016); raz();
      var z2 = __t.placer('walker', -11, -10); hitBarricade(z2, 1, .15, 1);
      o.L2 = F.L; o.R2 = F.R;
      // Devant, regard vers la rue : le coup arrive par le bas
      clearZombies(); yaw = 0; visuals(.016); raz();
      var z3 = __t.placer('walker', 0, -10); hitBarricade(z3, 1, .15, 1);
      o.B3 = F.B; o.petit = F.B; raz();
      var c = __t.placer('colossus', 0, -12); hitBarricade(c, 1, 1.1, 1);
      o.gros = F.B;
      // L'effet s'efface
      for (var i = 0; i < 60; i++) visuals(.05);
      o.fin = F.L + F.R + F.B;
      clearZombies(); yaw = 0;
      return o;
    });
    ok(r.R > 0 && r.L === 0 && r.B === 0, 'Regard à gauche, coup à droite : flash à droite (R ' + r.R + ', L ' + r.L + ', B ' + r.B + ')');
    ok(r.op > 0, 'Le bord droit est affiché : opacité ' + r.op);
    ok(r.L2 > 0 && r.R2 === 0, 'Regard à droite, coup à gauche : flash à gauche');
    ok(r.B3 > 0, 'Coup devant, sous la vue : flash en bas');
    ok(r.gros > r.petit, 'Colosse plus fort qu’un marcheur : ' + r.gros + ' contre ' + r.petit);
    egal(r.fin, 0, 'Les flashs s’éteignent');
  });
  test('Repères : légende du boss, sans répétition', () => {
    if (!pret()) ignorer('Repères visuels absents');
    if (lire('typeof ZKINDS === "object" && !!ZKINDS.boss') !== true) ignorer('Boss absent');
    partie();
    const r = J(function(){
      var o = {}, K = '[Rugissement du boss]';
      spawnZombie('boss');
      o.lignes1 = __reperes.linesOn().filter(function(t){ return t === K; }).length;
      spawnZombie('boss');
      o.lignes2 = __reperes.linesOn().filter(function(t){ return t === K; }).length;
      o.n = __reperes.RP.count[K];
      o.direct = __reperes.caption(K);
      o.banniere = document.getElementById('banner').classList.contains('boss');
      // Beaucoup de légendes différentes : jamais plus de RP_LINES lignes
      for (var i = 0; i < 12; i++) __reperes.caption('[Essai ' + i + ']');
      o.max = __reperes.linesOn().length; o.lim = __reperes.RP_LINES;
      o.dom = __reperes.rpSubs.childElementCount;
      clearZombies();
      return o;
    });
    egal(r.lignes1, 1, 'La légende du boss apparaît');
    egal(r.lignes2, 1, 'Deuxième rugissement aussitôt : pas de doublon');
    egal(r.n, 1, 'Légende comptée une seule fois');
    egal(r.direct, false, 'Même légende refusée avant le délai');
    ok(r.banniere, 'Bannière du boss renforcée (classe boss)');
    ok(r.max <= r.lim, 'Lignes affichées : ' + r.max);
    egal(r.dom, r.lim, 'Nombre de lignes dans le DOM fixe');
  });
  test('Repères : réglages sauvegardés, ils coupent bien l’affichage', () => {
    if (!pret()) ignorer('Repères visuels absents');
    partie();
    const r = J(function(){
      var o = {}, F = __reperes.RP.fl;
      o.btn = !!document.getElementById('btnCues') && !!document.getElementById('btnSubs');
      __reperes.setCues(false); __reperes.setSubs(false);
      o.cle1 = store.get('dt_cues', 'absent'); o.cle2 = store.get('dt_subs', 'absent');
      o.txt = document.getElementById('btnCues').textContent + ' | ' + document.getElementById('btnSubs').textContent;
      yaw = 1.2; visuals(.016);
      var z = __t.placer('flyer', 11, -30); z.g.position.y = 7; z.st = 'dive';
      __reperes.RP.selT = 0; visuals(.016);
      o.fleches = __reperes.arrowsOn().length;
      var w = __t.placer('walker', 11, -10); hitBarricade(w, 1, .15, 1);
      o.flash = F.L + F.R + F.B;
      o.leg = __reperes.caption('[Test réglage]'); o.lignes = __reperes.linesOn().length;
      // Bouton de la pause : réactive
      document.getElementById('btnCues').click(); document.getElementById('btnSubs').click();
      o.cle3 = store.get('dt_cues', 'absent'); o.cle4 = store.get('dt_subs', 'absent');
      __reperes.RP.selT = 0; visuals(.016);
      o.fleches2 = __reperes.arrowsOn().length;
      clearZombies(); yaw = 0;
      return o;
    });
    ok(r.btn, 'Boutons Repères visuels et Sous-titres dans l’écran Pause');
    egal(r.cle1, false, 'dt_cues sauvegardé');
    egal(r.cle2, false, 'dt_subs sauvegardé');
    ok(/désactivés/.test(r.txt), 'Texte des boutons : ' + r.txt);
    egal(r.fleches, 0, 'Repères coupés : aucune flèche');
    egal(r.flash, 0, 'Repères coupés : aucun flash');
    egal(r.leg, false, 'Sous-titres coupés : légende refusée');
    egal(r.lignes, 0, 'Sous-titres coupés : aucune ligne');
    egal(r.cle3, true, 'Réactivés par le bouton (dt_cues)');
    egal(r.cle4, true, 'Réactivés par le bouton (dt_subs)');
    ok(r.fleches2 >= 1, 'Flèche revenue après réactivation');
  });
  test('Repères : 300 zombies, flèches bornées et DOM fixe', () => {
    if (!pret()) ignorer('Repères visuels absents');
    partie();
    const r = J(function(){
      var o = {}, R = __reperes;
      o.dom0 = R.domCount(); o.box0 = R.rpBox.childElementCount;
      yaw = 1.2; visuals(.016);
      var T = ['flyer', 'spitter', 'walker', 'runner', 'brute'];
      for (var i = 0; i < 300; i++){
        var t = T[i % T.length], z = __t.placer(t, -11 + (i * 7.3) % 22, -10 - (i * 3.1) % 80);
        if (t === 'flyer'){ z.g.position.y = 6; z.st = 'dive'; } else if (t === 'spitter'){ z.st = 'attack'; z.spitT = .3; } else { z.st = 'attack'; z.g.position.z = -10; }
      }
      o.vivants = __t.vivants();
      var t0 = performance.now();
      for (var k = 0; k < 20; k++) R.select();
      o.msSel = (performance.now() - t0) / 20;
      t0 = performance.now();
      for (var k2 = 0; k2 < 20; k2++){ R.RP.selT = 1; visuals(.016); }
      o.msFrame = (performance.now() - t0) / 20;
      R.RP.selT = 0; visuals(.016);
      o.on = R.arrowsOn().length; o.max = R.RP_MAX;
      for (var j = 0; j < 400; j++) hitBarricade(zombies[j % zombies.length], .01, .15, 0);
      o.dom1 = R.domCount(); o.box1 = R.rpBox.childElementCount;
      clearZombies(); yaw = 0;
      return o;
    });
    egal(r.vivants, 300, 'Zombies en vie');
    ok(r.on >= 1 && r.on <= r.max, 'Flèches affichées : ' + r.on + ' (max ' + r.max + ')');
    egal(r.box1, r.max, 'Pool de flèches : nombre fixe d’éléments');
    egal(r.dom1, r.dom0, 'Aucun élément créé pendant le jeu');
    ok(r.msSel < 20, 'Choix des menaces (300 zombies) : ' + r.msSel.toFixed(2) + ' ms');
  });
})();
