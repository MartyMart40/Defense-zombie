'use strict';
/* =====================================================================
   Tests de la foule variée du toit (dossier 124, js/77-zombies-variete.js : ZV_REGL, zvHabiller, zvTeindre)
   Visuel seulement : même hasard, mêmes cibles, pas de matériau ni de lot d'instances de plus en jouant.
   À charger APRÈS tests.js dans tests/index.html (avant t-journal.js).
   ===================================================================== */
(function(){
  if (typeof test !== 'function' || typeof TESTS === 'undefined') return;
  const exiger = () => { if (lire('typeof ZV_REGL === "object" && typeof zvHabiller === "function" && typeof __zv === "object" && typeof __zperf === "object"') !== true) ignorer('Foule variée absente (77-zombies-variete.js)'); };
  const partie = (v) => { reset(); J('startLocation(' + (v || 0) + ')'); J(function(){ __t.geler(); clearZombies(); plan.maxAlive = 1e6; if (typeof RUE === 'object' && RUE){ RUE.crateAt = []; RUE.civAt = -1; } }); };
  // Dans le jeu : fait apparaître la même suite de zombies avec ou sans la variété, en comptant les tirages de Math.random
  const SUITE = function(){
    window.__zvSuite = function(on, n, graine){
      var R0 = Math.random, s = graine, tirs = 0, out = [], on0 = ZV_REGL.on;
      Math.random = function(){ tirs++; s = s * 16807 % 2147483647; return (s - 1) / 2147483646; };
      ZV_REGL.on = on;
      try {
        var TYPES = ['walker', 'runner', 'walker', 'brute', 'walker', 'spitter', 'walker', 'runner', 'jumper', 'walker'];
        for (var i = 0; i < n; i++){
          var z = spawnZombie(TYPES[i % TYPES.length]);
          z.g.position.set(-10 + (i % 10) * 2.2, 0, -18 - Math.floor(i / 10) * 4); z.g.updateMatrixWorld(true);
          out.push(z);
        }
      } finally { Math.random = R0; ZV_REGL.on = on0; }
      return { tirs: tirs, z: out };
    };
    // Boîtes des maillages touchés (géométrie seule, sans les enfants) : place et taille exactes
    window.__zvBoites = function(z){
      z.g.updateMatrixWorld(true);
      return z.meshes.map(function(m){
        if (!m.geometry.boundingBox) m.geometry.computeBoundingBox();
        var b = m.geometry.boundingBox.clone().applyMatrix4(m.matrixWorld);
        return [b.min.x, b.min.y, b.min.z, b.max.x, b.max.y, b.max.z].map(function(v){ return Math.round(v * 1e5); }).join(',') + (m.userData.head ? 'T' : '');
      }).join(';');
    };
  };

  test('Foule variée : aucun tirage de plus dans Math.random (même suite avec et sans)', () => {
    exiger(); partie(3); J(SUITE);
    const r = J(function(){
      __zvSuite(true, 30, 77); clearZombies(); __zvSuite(false, 30, 77); clearZombies(); // lots d'instances déjà créés
      var a = __zvSuite(false, 60, 123), ta = a.z.map(function(z){ return z.type + z.tenue + z.speed.toFixed(6) + z.g.scale.y.toFixed(6); }).join('|'), va = a.z.filter(function(z){ return !!z.zv; }).length;
      clearZombies();
      var b = __zvSuite(true, 60, 123), tb = b.z.map(function(z){ return z.type + z.tenue + z.speed.toFixed(6) + z.g.scale.y.toFixed(6); }).join('|'), vb = b.z.filter(function(z){ return !!z.zv; }).length;
      clearZombies();
      // zvHabiller seul : zéro tirage
      var R0 = Math.random, n = 0; Math.random = function(){ n++; return R0(); };
      var direct = 0;
      try {
        var z = __zvSuite(false, 1, 5).z[0]; n = 0;
        var R = { g: z.g, body: z.body, head: z.head, armL: z.armL, armR: z.armR, legL: z.legL, legR: z.legR, parts: z.meshes.slice(), mats: z.mats, tenue: z.tenue || 'civil' };
        delete z.zv; zvHabiller(z, R); direct = n;
      } finally { Math.random = R0; }
      clearZombies();
      return { ta: a.tirs, tb: b.tirs, meme: ta === tb, va: va, vb: vb, direct: direct };
    });
    egal(r.tb, r.ta, 'Tirages de Math.random pendant spawnZombie avec et sans la variété');
    ok(r.meme, 'Types, tenues, vitesses et tailles doivent être les mêmes');
    egal(r.va, 0, 'Variété appliquée alors que ZV_REGL.on est faux');
    ok(r.vb >= 35, 'Variété pas appliquée aux zombies ordinaires : ' + r.vb + ' sur 60');
    egal(r.direct, 0, 'zvHabiller ne doit jamais tirer dans Math.random');
  });

  test('Foule variée : boîtes de tir, tête et cibles identiques (avant et après quelques pas)', () => {
    exiger(); partie(5); J(SUITE);
    const r = J(function(){
      var zb0 = JSON.stringify(ZBOX);
      __zvSuite(true, 20, 9); clearZombies(); __zvSuite(false, 20, 9); clearZombies();
      var lire = function(on){
        if (typeof zUid === 'number') zUid = 5000; // même numéros : même pose des bras (zBras) et même variété
        var s = __zvSuite(on, 40, 4321), avant = s.z.map(__zvBoites), cibles = hitMeshes.length, morceaux = s.z.map(function(z){ return z.meshes.length; }).join(',');
        var acc = s.z.reduce(function(n, z){ var k = 0; z.g.traverse(function(o){ if (o.isMesh && o.userData.zvAjout && (o.userData.z || hitMeshes.indexOf(o) >= 0)) k++; }); return n + k; }, 0);
        var st0 = state; state = 'playing';
        __t.graine(3, function(){ for (var k = 0; k < 20; k++) updateZombies(1 / 30); }); // même hasard pendant les pas
        state = st0;
        var tetes = s.z.map(function(z){ z.g.updateMatrixWorld(true); var b = new THREE.Box3().copy(z.head.geometry.boundingBox || (z.head.geometry.computeBoundingBox(), z.head.geometry.boundingBox)).applyMatrix4(z.head.matrixWorld); return [b.min.x, b.min.y, b.min.z, b.max.x, b.max.y, b.max.z].map(function(v){ return Math.round(v * 1e5); }).join(','); }).join(';');
        var torses = s.z.map(function(z){ var m = z.meshes[0], b = new THREE.Box3().copy(m.geometry.boundingBox).applyMatrix4(m.matrixWorld); return [b.min.x, b.min.y, b.max.x, b.max.y, b.max.z].map(function(v){ return Math.round(v * 1e5); }).join(','); }).join(';');
        var apres = s.z.map(__zvBoites).join('#');
        var pos = s.z.map(function(z){ return z.g.position.x.toFixed(6) + '/' + z.g.position.z.toFixed(6); }).join(';');
        clearZombies();
        return { avant: avant.join('#'), apres: apres, cibles: cibles, morceaux: morceaux, tetes: tetes, torses: torses, pos: pos, acc: acc };
      };
      var a = lire(false), b = lire(true);
      return { a: a, b: b, zbox: zb0 === JSON.stringify(ZBOX) || zb0 === '{}' };
    });
    ok(r.b.avant === r.a.avant, 'Les maillages touchés (place et taille) changent avec la variété');
    egal(r.b.cibles, r.a.cibles, 'Nombre de cibles (hitMeshes)');
    egal(r.b.morceaux, r.a.morceaux, 'Nombre de maillages touchés par zombie');
    egal(r.b.acc, 0, 'Un morceau ajouté est devenu une cible');
    ok(r.b.tetes === r.a.tetes, 'La tête doit rester exactement au même endroit en marchant');
    ok(r.b.torses === r.a.torses, 'Le torse doit rester exactement au même endroit en marchant');
    ok(r.b.apres === r.a.apres, 'Bras et jambes doivent bouger exactement pareil en marchant');
    ok(r.b.pos === r.a.pos, 'Même avance et même dérive de côté');
    ok(r.zbox, 'Les boîtes de tir par type (ZBOX) ont changé');
  });

  test('Foule variée : têtes et silhouettes plus variées, palette de la Centrale, couleur jusqu’à la carte graphique', () => {
    exiger(); partie(5); J(SUITE);
    const r = J(function(){
      var compter = function(on){
        var s = __zvSuite(on, 60, 2024), cols = {}, combi = 0, cheveux = 0, masques = 0, nues = 0;
        s.z.forEach(function(z){
          z.inst.forEach(function(e){ if (e.mat) cols[[e.r, e.g, e.bl].map(function(v){ return Math.round(v * 40); }).join(',')] = 1; });
          if (ZV_REGL.types[z.type] && z.head.children.length <= 1) nues++;
          if (z.meshes[0].userData.zvCol != null && z.armL && z.armL.userData.zvCol != null) combi++;
          z.head.children.forEach(function(o){ if (o.userData.zvBrut && o.scale.x > .4) cheveux++; if (o.userData.zvBrut && o.position.z > .2 && o.scale.x > .2) masques++; });
        });
        zInstSync();
        var trouve = false, z0 = null, e0 = null;
        s.z.forEach(function(z){ if (!e0) z.inst.forEach(function(e){ if (!e0 && e.m.userData.zvCol != null && e.b.col){ e0 = e; z0 = z; } }); });
        if (e0){ var a = e0.b.im.instanceColor.array; for (var j = 0; j < e0.b.n; j++) if (Math.abs(a[j * 3] - e0.r) < 1e-6 && Math.abs(a[j * 3 + 1] - e0.g) < 1e-6 && Math.abs(a[j * 3 + 2] - e0.bl) < 1e-6) trouve = true; }
        clearZombies();
        return { cols: Object.keys(cols).length, combi: combi, cheveux: cheveux, masques: masques, nues: nues, trouve: trouve };
      };
      return { off: compter(false), on: compter(true) };
    });
    ok(r.on.cols >= r.off.cols * .9, 'Couleurs de la foule moins variées : ' + r.off.cols + ' avant, ' + r.on.cols + ' après'); // la nuance par zombie (zTeinte) en donne déjà beaucoup
    ok(r.on.nues * 3 < r.off.nues, 'Trop de têtes toutes pareilles : ' + r.off.nues + ' avant, ' + r.on.nues + ' après');
    ok(r.on.combi >= 3, 'Combinaisons de la Centrale trop rares : ' + r.on.combi);
    ok(r.on.cheveux >= 8, 'Cheveux trop rares : ' + r.on.cheveux);
    ok(r.on.trouve, 'La couleur de la variété n’arrive pas dans la couleur d’instance');
    egal(r.off.combi + r.off.cheveux, 0, 'Variété présente avec ZV_REGL.on faux');
  });

  test('Foule variée : spéciaux intacts, rien hors du toit', () => {
    exiger(); partie(2); J(SUITE);
    const r = J(function(){
      var s = __zvSuite(true, 40, 31), spec = 0, ord = 0;
      s.z.forEach(function(z){
        var k = 0; z.g.traverse(function(o){ if (o.userData && o.userData.zvCol != null) k++; });
        if (!ZV_REGL.types[z.type]){ spec += k + (z.zv ? 1 : 0); } else if (z.zv) ord++;
      });
      clearZombies();
      // Un mode actif (robot, RTS) : pas de variété
      var A = Jeu.actif, hors = 0;
      Jeu.actif = function(){ return { faux: true }; };
      try { var t = __zvSuite(true, 10, 8); t.z.forEach(function(z){ if (z.zv) hors++; }); } finally { Jeu.actif = A; }
      clearZombies();
      return { spec: spec, ord: ord, hors: hors };
    });
    egal(r.spec, 0, 'Les zombies spéciaux ne doivent pas être touchés');
    ok(r.ord > 0, 'Aucun zombie ordinaire varié');
    egal(r.hors, 0, 'Variété appliquée dans un autre mode que le toit');
  });

  test('Foule variée : 150 zombies, appels de dessin et matériaux bornés, lot des morceaux qui ne grandit jamais au rendu', () => {
    exiger(); partie(3); J(SUITE);
    const r = J(function(){
      var mesurer = function(on){
        var s = __zvSuite(on, 150, 555); visuals(1 / 30);
        var o = { dessins: __zperf.draws(), lots: __zperf.batches(), mats: __zperf.mats(), inst: __zperf.instances() };
        clearZombies(); return o;
      };
      var a = mesurer(false), cap0 = __zv.ZV_LOT ? __zv.ZV_LOT.cap : -1, b = mesurer(true);
      var lot = __zv.ZV_LOT, okLot = !!lot && zbList.indexOf(lot) >= 0;
      // Le lot grandit à l'apparition (zvPlace), jamais pendant zInstSync
      var s = __zvSuite(true, 150, 556), cap1 = lot.cap; zInstSync(); var cap2 = lot.cap, n = lot.n;
      clearZombies();
      return { a: a, b: b, okLot: okLot, cap1: cap1, cap2: cap2, n: n, cap0: cap0 };
    });
    ok(r.b.dessins <= r.a.dessins + 1, 'Appels de dessin de la foule : ' + r.a.dessins + ' sans, ' + r.b.dessins + ' avec');
    egal(r.b.lots, r.a.lots, 'Lots d’instances');
    egal(r.b.mats, r.a.mats, 'Matériaux de zombies');
    ok(r.okLot, 'Le lot des morceaux doit exister dès le chargement');
    egal(r.cap2, r.cap1, 'Le lot des morceaux a grandi pendant le rendu (tirage de Math.random)');
    ok(r.n < r.cap1, 'Lot des morceaux plein');
    ok(r.b.inst < 150 * 20, 'Trop de morceaux par zombie : ' + r.b.inst);
  });
})();
