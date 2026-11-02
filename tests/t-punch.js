'use strict';
/* =====================================================================
   Tests du punch (31-punch.js) : ralenti, chiffres de dégâts, statistiques de fin
   À charger APRÈS tests.js dans tests/index.html :
     <script src="t-punch.js"></script>
   Réutilise test(), J(), lire(), ok(), egal(), reset(), ignorer() de tests.js.
   ===================================================================== */
(function(){
  if (typeof test !== 'function' || typeof TESTS === 'undefined') return;
  const exiger = () => { if (lire('typeof __punch === "object" && typeof pkSlow === "function"') !== true) ignorer('Punch absent (31-punch.js)'); };
  // Partie à Saint-Clou, apparitions gelées, sans largage ni survivant
  const partie = () => {
    reset(); J('startLocation(0)');
    J(function(){
      __t.geler(); clearZombies(); if (typeof RUE === 'object' && RUE){ RUE.crateAt = []; RUE.civAt = -1; }
      state = 'playing'; S.bar = S.barMax = 1e9; __punch.pkSetSlow(true); __punch.pkSetNums(true); __punch.setCap(__punch.PKN_MAX);
    });
  };
  // Outils : tirer sur un point avec l'arme id
  const OUTILS = function(){
    window.__tpk = {
      tirer: function(id, cible){
        S.owned[id] = true; if (S.cur !== id) equip(id);
        camera.position.copy(EYE); camera.lookAt(cible); camera.updateMatrixWorld(true); zoomed = false; recoilAcc = 0;
        reloadT = 0; cool = 0; S.ammo[id] = 99; spin = 1; return fire();
      },
      centre: function(z){ z.g.updateMatrixWorld(true); var v = new THREE.Vector3(); z.meshes[0].getWorldPosition(v); return v; },
      tete: function(z){ z.g.updateMatrixWorld(true); var v = new THREE.Vector3(); z.head.getWorldPosition(v); return v; },
      gros: function(type, x, zp){ var z = __t.placer(type || 'brute', x || 0, zp || -30); z.hp = z.maxHp = 1e7; z.speed = 0; return z; }
    };
  };

  test('Punch : la mort du boss déclenche le ralenti, puis le temps revient à 1', () => {
    exiger(); partie();
    const r = J(function(){
      var o = {};
      var w = __t.placer('walker', 0, -60); w.speed = 2; w.sway = 0;
      var b = __t.placer('boss', 4, -80);
      var z0 = w.g.position.z; update(.1); o.normal = w.g.position.z - z0;
      damage(b, 1e9, true, b.g.position.clone());
      o.bossDead = !!b.dead; o.kind = __punch.PK.sl && __punch.PK.sl.kind;
      z0 = w.g.position.z; update(.1); o.lent = w.g.position.z - z0; o.ts = __punch.PK.ts;
      o.bossCount = S.pk.boss; o.ktBoss = S.pk.kt.boss || 0;
      // Pas d'empilement : un petit ralenti ne remplace pas celui du boss
      o.empile = __punch.pkSlow('multi');
      var mini = 1; for (var i = 0; i < 40; i++){ update(1 / 30); state = 'playing'; mini = Math.min(mini, __punch.PK.ts); if (i === 34) o.milieu = __punch.PK.ts; }
      for (var k = 0; k < 30; k++){ update(1 / 30); state = 'playing'; }
      o.fin = __punch.PK.ts; o.slFin = __punch.PK.sl;
      state = 'test';
      return o;
    });
    ok(r.bossDead, 'Le boss doit mourir');
    egal(r.kind, 'boss', 'Ralenti du boss');
    ok(Math.abs(r.ts - .25) < 1e-9, 'Échelle de temps pendant le ralenti : ' + r.ts);
    ok(r.normal > 0 && Math.abs(r.lent / r.normal - .25) < .02, 'Le jeu avance à 25 % : ' + r.lent + ' contre ' + r.normal);
    ok(!r.empile, 'Un petit ralenti ne s’empile pas sur celui du boss');
    ok(r.milieu > .25 && r.milieu < 1, 'Retour progressif : ' + r.milieu);
    egal(r.fin, 1, 'Échelle de temps après le ralenti');
    egal(r.slFin, null, 'Ralenti terminé');
    egal(r.bossCount, 1, 'Boss abattus dans les statistiques');
    egal(r.ktBoss, 1, 'Boss compté par type');
  });

  test('Punch : le réglage Ralenti le désactive et il est sauvegardé', () => {
    exiger(); partie();
    const r = J(function(){
      var b0 = document.getElementById('btnSlow');
      __punch.pkSetSlow(false);
      var b = __t.placer('boss', 0, -80);
      damage(b, 1e9, true, b.g.position.clone()); update(.1);
      var o = { sl: __punch.PK.sl, ts: __punch.PK.ts, saved: localStorage.getItem('dt_slow'), btn: b0 ? b0.textContent : null };
      if (b0 && b0.click) b0.click(); else __punch.pkSetSlow(true);
      o.apres = __punch.PK.slow; o.saved2 = localStorage.getItem('dt_slow');
      state = 'test';
      return o;
    });
    egal(r.sl, null, 'Aucun ralenti quand le réglage est coupé');
    egal(r.ts, 1, 'Échelle de temps');
    egal(r.saved, 'false', 'Réglage sauvegardé (dt_slow)');
    ok(r.btn === null || /Ralenti : désactivé/.test(r.btn), 'Texte du bouton : ' + r.btn);
    egal(r.apres, true, 'Le bouton le réactive');
    egal(r.saved2, 'true', 'Réglage réactivé sauvegardé');
  });

  test('Punch : un tir crée un chiffre, le pool ne dépasse jamais sa taille', () => {
    exiger(); partie(); J(OUTILS);
    const r = J(function(){
      var o = {};
      var z = __tpk.gros('brute', 0, -30);
      __punch.pknClear();
      __tpk.tirer('pistol', __tpk.centre(z));
      __punch.pknFrame(.01);
      o.actifs = __punch.pknActive();
      var e = __punch.PKN.filter(function(x){ return x.on; })[0];
      o.txt = e ? e.el.textContent : ''; o.z = e ? e.z === z : false;
      // Grande foule : 80 zombies touchés d'un coup
      var n0 = document.getElementById('pkNums'); var kids0 = n0 && n0.children ? n0.children.length : -1;
      for (var i = 0; i < 80; i++){ var q = __t.placer('walker', -10 + (i % 20), -20 - Math.floor(i / 20) * 6); q.hp = q.maxHp = 1e6; damage(q, 10 + i, false, q.g.position.clone()); }
      __punch.pknFrame(.01);
      o.max = __punch.PKN_MAX; o.pool = __punch.PKN.length; o.actifs2 = __punch.pknActive();
      o.kids = n0 && n0.children ? n0.children.length : -1; o.kids0 = kids0;
      // Les plus gros coups restent
      var amts = __punch.PKN.filter(function(x){ return x.on; }).map(function(x){ return x.amt; });
      o.minGarde = Math.min.apply(null, amts);
      o.fmt = [__punch.pkFmt(950), __punch.pkFmt(1234), __punch.pkFmt(3400000)];
      state = 'test';
      return o;
    });
    egal(r.actifs, 1, 'Un chiffre après le tir');
    ok(r.z, 'Chiffre accroché au zombie touché');
    ok(/\d/.test(r.txt), 'Texte du chiffre : ' + r.txt);
    egal(r.pool, r.max, 'Taille du pool');
    ok(r.actifs2 <= r.max, 'Chiffres actifs : ' + r.actifs2 + ' (max ' + r.max + ')');
    egal(r.kids, r.kids0, 'Aucun élément créé pendant le jeu');
    ok(r.minGarde >= 40, 'Foule : les plus gros coups doivent rester (plus petit gardé : ' + r.minGarde + ')');
    egal(r.fmt[0], '950', 'Format sous 1000');
    egal(r.fmt[1], '1,2 k', 'Format compact des milliers');
    ok(/^3,4\d* M$/.test(r.fmt[2]), 'Format compact des millions : ' + r.fmt[2]);
  });

  test('Punch : les plombs d’une cartouche sur le même zombie font un seul chiffre', () => {
    exiger(); partie(); J(OUTILS);
    const r = J(function(){
      var z = __tpk.gros('brute', 0, -16), hp0 = z.hp;
      __punch.pknClear();
      __tpk.tirer('shotgun', __tpk.centre(z));
      var on = __punch.PKN.filter(function(x){ return x.on && x.z === z; });
      state = 'test';
      return { n: on.length, amt: on.length ? on[0].amt : 0, perte: hp0 - z.hp, pellets: wPellets('shotgun') };
    });
    ok(r.pellets > 1, 'Le fusil à pompe tire plusieurs plombs');
    egal(r.n, 1, 'Un seul chiffre pour la cartouche');
    ok(r.perte > 0 && Math.abs(r.amt - r.perte) < 1e-6, 'Le chiffre additionne les plombs : ' + r.amt + ' contre ' + r.perte);
  });

  test('Punch : le réglage Chiffres de dégâts est sauvegardé et coupe l’affichage', () => {
    exiger(); partie(); J(OUTILS);
    const r = J(function(){
      var b = document.getElementById('btnDmgNum');
      __punch.pkSetNums(false);
      var o = { saved: localStorage.getItem('dt_dmgnum'), btn: b ? b.textContent : null };
      var z = __tpk.gros('brute', 0, -30);
      __tpk.tirer('pistol', __tpk.centre(z));
      o.actifs = __punch.pknActive();
      if (b && b.click) b.click(); else __punch.pkSetNums(true);
      o.apres = __punch.PK.nums; o.saved2 = localStorage.getItem('dt_dmgnum');
      state = 'test';
      return o;
    });
    egal(r.saved, 'false', 'Réglage sauvegardé (dt_dmgnum)');
    ok(r.btn === null || /Chiffres de dégâts : cachés/.test(r.btn), 'Texte du bouton : ' + r.btn);
    egal(r.actifs, 0, 'Aucun chiffre quand le réglage est coupé');
    egal(r.apres, true, 'Le bouton le réactive');
    egal(r.saved2, 'true', 'Réglage réactivé sauvegardé');
  });

  test('Punch : statistiques de fin (précision, tête, dégâts par arme), remises à zéro à la nouvelle partie', () => {
    exiger(); partie(); J(OUTILS);
    const r = J(function(){
      var o = {};
      var z = __tpk.gros('brute', 0, -30), hp0 = z.hp;
      for (var i = 0; i < 3; i++) __tpk.tirer('pistol', __tpk.centre(z));
      var hpP = z.hp;
      __tpk.tirer('pistol', __tpk.tete(z));
      o.pistol = hp0 - z.hp;
      __tpk.tirer('pistol', new THREE.Vector3(0, 60, -40)); // raté (vers le ciel)
      var h1 = z.hp; __tpk.tirer('sniper', __tpk.centre(z)); o.sniper = h1 - z.hp;
      var w = __t.placer('walker', 3, -25); damage(w, 1e9, false, w.g.position.clone());
      S.pk.time = 125;
      var D = __punch.pkEndData();
      o.D = { shots: D.shots, hits: D.hits, acc: D.acc, heads: D.heads, dmg: D.dmg, top: D.top.map(function(t){ return t.id + ':' + t.dmg; }), fav: D.fav, types: D.types.map(function(t){ return t.id + ':' + t.n; }) };
      o.bySrc = JSON.parse(JSON.stringify(S.pk.bySrc));
      gameOver();
      var box = document.getElementById('pkEnd'), st = document.getElementById('overStats');
      o.html = box ? box.innerHTML : ''; o.stats = st ? st.innerHTML : '';
      o.voisin = !!(box && st && box.parentNode === st.parentNode);
      newGame();
      o.reset = { shots: S.pk.shots, hits: S.pk.hits, heads: S.pk.heads, dmg: S.pk.dmg, src: Object.keys(S.pk.bySrc).length, kt: Object.keys(S.pk.kt).length, time: S.pk.time };
      state = 'test';
      return o;
    });
    const D = r.D;
    egal(D.shots, 6, 'Tirs comptés (5 au pistolet, 1 au sniper)');
    egal(D.hits, 5, 'Tirs qui touchent');
    egal(D.acc, 83, 'Précision');
    egal(D.heads, 1, 'Tirs à la tête');
    ok(Math.abs(r.bySrc.pistol - r.pistol) < 1e-6, 'Dégâts du pistolet : ' + r.bySrc.pistol + ' contre ' + r.pistol);
    ok(r.sniper > 0 && Math.abs(r.bySrc.sniper - r.sniper) < 1e-6, 'Dégâts du sniper : ' + r.bySrc.sniper + ' contre ' + r.sniper);
    ok(D.top.length >= 2 && D.top.length <= 3, 'Top des armes : ' + D.top.join(', '));
    egal(D.fav, 'pistol', 'Arme préférée (le plus de tirs)');
    ok(D.types.indexOf('walker:1') >= 0, 'Zombies par type : ' + D.types.join(', '));
    ok(/Précision/.test(r.html) && /83[\s\u00a0\u202f]*%/.test(r.html), 'Section de fin affichée : ' + r.html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').slice(0, 200));
    ok(/Dégâts par arme/.test(r.html) && /Pistolet/.test(r.html), 'Barres des armes');
    ok(/2 min 05 s/.test(r.html), 'Temps de jeu');
    ok(/Zombies abattus/.test(r.stats), 'Les statistiques existantes restent');
    ok(r.voisin, 'La section est placée à côté des statistiques existantes');
    egal(JSON.stringify(r.reset), JSON.stringify({ shots: 0, hits: 0, heads: 0, dmg: 0, src: 0, kt: 0, time: 0 }), 'Remise à zéro par newGame');
  });
})();
