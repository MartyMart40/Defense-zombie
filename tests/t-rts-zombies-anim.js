'use strict';
/* Tests du dossier 131 : les zombies, les nids et la Ruche du RTS qui vivent (js/86-rts-zombies-anim.js,
   js/86-rts-nids-anim.js), seulement visuel. Seules les copies d'instances sont corrigées (objets des zombies intacts),
   allure, frappe, sursaut, sortie de terre, morts selon l'arme, nids qui respirent, pondent, s'abîment et crèvent, Ruche
   qui sort de terre ; interrupteur, pause figée, tout rendu en quittant ; aucun tirage dans Math.random et même partie
   image par image avec et sans les fichiers (pages neuves) ; appels de dessin, temps. */
(function(){
  if (typeof test !== 'function' || typeof TESTS === 'undefined') return;
  const exiger = () => {
    if (lire('typeof __rtsZAnim === "object" && typeof __rtsZAnim.rzImage === "function"') !== true) ignorer('Animations des zombies du RTS absentes (js/86-rts-zombies-anim.js)');
    if (lire('typeof __rts === "object" && typeof __rts.rtsStart === "function"') !== true) ignorer('RTS absent');
  };
  const img = 'function img(n){ for (var i = 0; i < (n || 1); i++){ visuals(1 / 30); renderer.clear(); if (!(typeof styleRendu === "function" && styleRendu())) renderer.render(scene, camera); renderer.clearDepth(); renderer.render(vmScene, vmCam); } }';
  const pas = 'function pas(n){ for (var i = 0; i < (n || 1); i++) visuals(1 / 30); }';
  const calme = 'function calme(){ if (typeof rtsTipsStop === "function") rtsTipsStop(); __rts.rtsStart(); var R = __rts.RTS; R.nests.forEach(function(n){ n.spawnT = 1e9; }); R.hordeT = 1e9; clearZombies(); S.money = 1e8; R.blds.filter(function(o){ return o.B.turret; }).forEach(function(o){ rtsSell(o); }); return R; }';
  // Un zombie posé (vie énorme), qui ne bouge que si on le laisse faire
  const poser = 'function poser(t, x, z){ __rts.rtsSpawnAt(x, z, 1, .01, t); var q = zombies[zombies.length - 1]; q.g.position.set(x, q.g.position.y, z); q.hp = q.maxHp = 1e9; return q; }';
  const fin = () => J(function(){
    __rtsZAnim.RZ_REGL.on = true;
    if (__rts.RTS.pilot) __rts.rtsUnpilot();
    if (__rts.RTS.on){ __rts.RTS.paused = false; __rts.rtsQuit(); }
    localStorage.removeItem('dt_rts_partie'); var p = document.getElementById('rtsPanel'); if (p) p.classList.add('hide');
    if (typeof __style === 'object') __style.styleSet('actuel'); visuals(1 / 30);
  });
  const run = body => J(new Function(img + ';' + pas + ';' + calme + ';' + poser + '; return (' + body + ')();'));

  test('RTS zombies anim : seules les copies d’instances bougent (allure, frappe, sursaut), l’objet du zombie reste celui du jeu', () => {
    exiger(); reset();
    let r;
    try {
      r = run(function(){
        var A = __rtsZAnim, o = {}, R = calme(); pas(2);
        R.cam.x = 0; R.cam.z = -30; R.cam.h = 40;
        // Un coureur qui marche vers la base : son torse penche (copie décalée du vrai maillage), le jeu ne le penche pas
        var c = poser('runner', 0, -40); pas(20);
        var st = A.etat(c), P = A.places(c), ecart = 0;
        P.forEach(function(p){ var e = c.inst[p.k].m.matrixWorld.elements, a = p.im.instanceMatrix.array, s = p.s * 16; ecart = Math.max(ecart, Math.abs(a[s + 12] - e[12]), Math.abs(a[s + 14] - e[14])); });
        o.marche = st && st.mv > .5; o.ecart = ecart; o.places = P.length;
        o.objet = c.g.rotation.x === 0 && c.g.rotation.z === 0 && c.body.rotation.x === 0 && c.body.rotation.z === 0 && c.body.position.y === 0;
        // Interrupteur coupé : les copies redeviennent exactement les vrais maillages
        P = A.places(c); A.RZ_REGL.on = false; pas(1); var e2 = 0; // (mêmes zombies : mêmes places dans les lots)
        P.forEach(function(p){ var e = c.inst[p.k].m.matrixWorld.elements, a = p.im.instanceMatrix.array, s = p.s * 16; for (var q = 0; q < 16; q++) e2 = Math.max(e2, Math.abs(a[s + q] - e[q])); });
        o.coupeOk = !A.compte().actif && P.length > 3 && e2 < 1e-5;
        A.RZ_REGL.on = true; pas(2);
        // Frappe : un marcheur collé au QG lève les bras puis les abat au moment du coup (z.atkT remonte)
        var Q = R.base, w = poser('walker', Q.x, Q.z - Q.r - .6); w.dmg = 0; var vu = false, bras = 0;
        for (var i = 0; i < 90 && !vu; i++){ pas(1); var s2 = A.etat(w); if (s2 && s2.frappe < .1){ vu = true; var Pw = A.places(w), kb = s2.bras[0]; Pw.forEach(function(p){ if (p.k === kb){ var e = w.inst[kb].m.matrixWorld.elements, a = p.im.instanceMatrix.array, s = p.s * 16; bras = Math.abs(a[s + 4] - e[4]) + Math.abs(a[s + 5] - e[5]) + Math.abs(a[s + 6] - e[6]); } }); } }
        o.frappe = vu; o.bras = bras;
        // Sursaut : un coup qui fait mal
        var m = poser('walker', 6, -36); pas(3); m.hp = m.maxHp = 100; pas(1); damage(m, 40, false, m.g.position.clone()); pas(1); o.coup = A.etat(m).coup;
        // Sortie de terre : un zombie qui vient d'apparaître
        var n = poser('walker', -6, -36); pas(1); o.sortie = A.RZ_REGL.sortie.t - (A.RZ.t - A.etat(n).sortie0);
        o.decale = A.compte().decale;
        return o;
      });
    } finally { fin(); }
    ok(r.marche && r.places > 3, 'Le coureur marche et ses copies sont retrouvées : ' + r.places);
    ok(r.ecart > .05, 'Copies du coureur penchées par rapport aux vrais maillages : ' + r.ecart.toFixed(3) + ' m');
    ok(r.objet, 'Objet du zombie jamais penché ni levé par l’animation');
    ok(r.coupeOk, 'Interrupteur coupé : animation arrêtée');
    ok(r.frappe && r.bras > .1, 'Frappe : bras abattus au moment du coup (' + (r.bras || 0).toFixed(2) + ')');
    ok(r.coup > .3, 'Sursaut au coup reçu : ' + r.coup);
    ok(r.sortie > 0, 'Un zombie qui apparaît sort de terre');
    egal(r.decale, 0, 'Places dans les lots toujours retrouvées');
  });

  test('RTS zombies anim : morts selon l’arme (balle, explosif, feu, Tesla), morceaux, sac du Sapeur', () => {
    exiger(); reset();
    let r;
    try {
      r = run(function(){
        var A = __rtsZAnim, o = {}, R = calme(); pas(2);
        R.cam.x = 0; R.cam.z = -30; R.cam.h = 40;
        var de = new THREE.Vector3(0, 2, -16);
        var tuer = function(t, x, S2){ var z = poser(t, x, -34); z.hp = z.maxHp = 50; pas(2); rtsHit(de, z, 'z', S2); pas(1); return z; };
        var a = tuer('walker', -8, { dmg:1e4 });
        var b = tuer('walker', -3, { dmg:1e4, splash:2.5, range:40 });
        var c = tuer('walker', 2, { dmg:1e4, flame:true, range:40 });
        var d = tuer('walker', 7, { dmg:1e4, chain:1, range:40 });
        pas(1);
        o.mk = [a, b, c, d].map(function(z){ var s = A.etat(z); return s ? s.mk : null; });
        pas(40);
        o.cache = A.etat(b).cache; o.morceaux = A.compte().morceaux;
        // Sapeur abattu : son sac saute, il éclate
        var s = tuer('sapeur', 0, { dmg:1e4 }); pas(2); o.sapeur = A.etat(s).mk; o.sapeurCache = A.etat(s).cache;
        o.morts = A.compte().morts; o.decale = A.compte().decale;
        return o;
      });
    } finally { fin(); }
    egal(r.mk.join(','), 'tombe,eclate,brule,tesla', 'Cause de la mort : balle, explosif, feu, Tesla');
    ok(r.cache && r.morceaux > 0, 'Sous l’explosif, il éclate en morceaux : ' + r.morceaux);
    ok(r.sapeur === 'eclate' && r.sapeurCache, 'Le sac du Sapeur abattu le fait éclater');
    egal(r.decale, 0, 'Places dans les lots toujours retrouvées');
  });

  test('RTS zombies anim : nids qui respirent, pondent, s’abîment et crèvent ; la Ruche sort de terre', () => {
    exiger(); reset();
    let r;
    try {
      r = run(function(){
        var A = __rtsZAnim, o = {}, R = calme(); pas(2);
        var n = R.nests.find(function(q){ return !q.dead && !q.ruche; }); R.cam.x = n.x; R.cam.z = n.z + 4; R.cam.h = 40; pas(2);
        var s = RZN.m.get(n);
        o.copie = !!s && n.m.visible === false && s.m.visible !== false && s.m.geometry === n.m.geometry && s.m.parent === RZ.root;
        var y0 = s.m.scale.y; pas(20); o.souffle = s.m.scale.y !== y0;
        n.spawnT = 0; pas(1); n.spawnT = 1e9; pas(1); o.ponte = s.ponte;
        n.hp = n.maxHp * .1; pas(10); o.penche = Math.abs(s.m.rotation.z); o.affaisse = s.m.scale.y / (n.m.scale.x || 1);
        n.hp = 0; rtsNestDie(n); pas(3); o.creve = RZN.m.has(n) && n.m.visible === false; o.morceaux = A.compte().morceaux;
        pas(40); o.fini = !RZN.m.has(n) && n.m.visible === true && RZN.finis.has(n);
        // Ruche : elle sort de terre
        var ru = rtsRucheSpawn(n.x + 40, n.z - 40); pas(2); var sr = RZN.m.get(ru);
        o.sortie = sr ? sr.sortie : 0; o.sous = sr ? sr.m.position.y : 0;
        pas(120); o.dehors = sr.sortie === 0 && Math.abs(sr.m.position.y) < 1e-6;
        return o;
      });
    } finally { fin(); }
    ok(r.copie, 'Copie du nid dessinée à sa place, modèle du jeu caché (même géométrie)');
    ok(r.souffle, 'Le nid respire');
    ok(r.ponte > .3, 'Bouffée et gonflement à la ponte : ' + r.ponte);
    ok(r.penche > .05 && r.affaisse < .95, 'Nid abîmé : il penche et s’affaisse : ' + JSON.stringify([r.penche, r.affaisse]));
    ok(r.creve && r.morceaux > 0, 'Il crève (copie encore là, morceaux de chair)');
    ok(r.fini, 'Puis les restes du jeu reprennent (modèle du jeu visible, copie rendue)');
    ok(r.sortie > 0 && r.sous < -1, 'La Ruche sort de terre : ' + JSON.stringify([r.sortie, r.sous]));
    ok(r.dehors, 'La Ruche finit dehors');
  });

  test('RTS zombies anim : interrupteur, pause figée, tout rendu en quittant', () => {
    exiger(); reset();
    let r;
    try {
      r = run(function(){
        var A = __rtsZAnim, o = {}, R = calme(); pas(2);
        R.cam.x = 0; R.cam.z = -30; R.cam.h = 40;
        for (var i = 0; i < 6; i++) poser(i % 2 ? 'runner' : 'walker', -10 + i * 4, -40);
        pas(10);
        // Pause : les copies ne bougent plus
        R.paused = true; var z = zombies[0], P = A.places(z), av = P.map(function(p){ return p.im.instanceMatrix.array[p.s * 16 + 12].toFixed(5) + p.im.instanceMatrix.array[p.s * 16 + 13].toFixed(5); }).join();
        pas(10); P = A.places(z); o.pause = av === P.map(function(p){ return p.im.instanceMatrix.array[p.s * 16 + 12].toFixed(5) + p.im.instanceMatrix.array[p.s * 16 + 13].toFixed(5); }).join(); R.paused = false;
        // Interrupteur coupé : modèles des nids rendus, copies parties
        A.RZ_REGL.on = false; pas(1);
        o.coupe = !A.compte().actif && RZN.m.size === 0 && R.nests.every(function(n){ return n.m.visible === true; }) && A.compte().morceaux === 0;
        A.RZ_REGL.on = true; pas(2); o.remis = A.compte().actif && RZN.m.size > 0;
        __rts.rtsQuit(); pas(1);
        o.quitte = A.compte(); o.root = RZ.root ? RZ.root.visible : false;
        return o;
      });
    } finally { fin(); }
    ok(r.pause, 'En pause, rien ne bouge');
    ok(r.coupe, 'Interrupteur coupé : nids du jeu visibles, copies et morceaux partis');
    ok(r.remis, 'Interrupteur remis : tout repart');
    ok(!r.quitte.actif && r.quitte.nids === 0 && r.quitte.morceaux === 0 && !r.root, 'Tout est rendu en quittant le RTS : ' + JSON.stringify(r.quitte));
  });

  // Même partie à graine fixée dans deux pages neuves, sans puis avec les animations : rtsStart, unités, tourelles (feu et
  // Tesla), monstres, 150 zombies, nids qui pondent, puis 600 images. Mêmes tirages de Math.random, même partie image par image.
  async function pageNeuve(){
    const base = new URL('../', location.href).href;
    let html = await (await fetch(base + 'index.html?t=' + Date.now(), { cache:'no-store' })).text();
    html = html.replace(/<head[^>]*>/i, m => m + '<base href="' + base + '"><script>window.requestAnimationFrame = function(){ return 0; };<\/script>');
    const f = document.createElement('iframe'); f.style.cssText = 'position:fixed;left:-2000px;top:0;width:640px;height:360px;';
    document.body.appendChild(f); f.srcdoc = html;
    const fin = Date.now() + 25000;
    for (;;){
      await new Promise(res => setTimeout(res, 100));
      let w = null; try { w = f.contentWindow; } catch (e) {}
      try { if (w && w.document.readyState === 'complete' && w.eval('typeof __rts === "object" && typeof visuals === "function"')){ w.eval('state = "test";'); return { f, w }; } } catch (e) {}
      if (Date.now() > fin){ f.remove(); throw new Echec('Page neuve pas prête'); }
    }
  }
  const PARTIE = function(on){
    if (typeof __rtsZAnim === 'object') __rtsZAnim.RZ_REGL.on = on;
    var son = typeof Snd === 'object' ? Snd.on : null; if (typeof Snd === 'object') Snd.on = false;
    var c = 0, s = 3131, M = Math.random, h = 2166136261 >>> 0, sig = [];
    Math.random = function(){ c++; s = s * 16807 % 2147483647; return (s - 1) / 2147483646; };
    var mix = function(v){ var x = Math.round((+v || 0) * 1e4); h = Math.imul(h ^ (x & 0xffff), 16777619) >>> 0; h = Math.imul(h ^ (x >>> 16), 16777619) >>> 0; };
    var empreinte = function(){
      var R = __rts.RTS; h = 2166136261 >>> 0;
      R.units.forEach(function(u){ mix(u.g.position.x); mix(u.g.position.z); mix(u.g.position.y); mix(u.g.rotation.y); mix(u.hp); mix(u.cd); mix(u.cd2); mix(u.dead ? 1 : 0); mix(u.tgt ? zombies.indexOf(u.tgt) : -1); });
      R.blds.forEach(function(o){ mix(o.hp); mix(o.cd || 0); mix(o.head ? o.head.rotation.y : 0); mix(o.tgt ? zombies.indexOf(o.tgt) : -1); });
      R.nests.forEach(function(n){ mix(n.hp); mix(n.spawnT); mix(n.dead ? 1 : 0); });
      var n = 0; zombies.forEach(function(z){ if (z.dead){ mix(z.deadT); return; } n++; mix(z.g.position.x); mix(z.g.position.z); mix(z.g.position.y); mix(z.hp); mix(z.atkT); mix(z.rtsTgt ? 1 : 0); }); mix(n); mix(S.money); mix(R.kills);
      return h;
    };
    try {
      var o = {};
      __rts.rtsStart(); var R = __rts.RTS; R.hordeT = 1e9; S.money = 1e8; o.depart = c;
      visuals(1 / 30); visuals(1 / 30);
      ['rifle', 'gunner', 'rocket', 'tank', 'flamebot', 'heli', 'heavy', 'sniper', 'rocket', 'tank'].forEach(function(t, i){ __rts.rtsSpawnUnit(t, -16 + i * 3.5, -16); });
      [['t_flame', -6, -24], ['t_tesla', 6, -24], ['t_cannon', 0, -26]].forEach(function(q){ rtsPlaceBld(q[0], q[1], q[2], true); });
      __rts.rtsSpawnAt(0, -55, 150, 20);
      ['sapeur', 'pilonneur', 'carapace'].forEach(function(t, i){ __rts.rtsSpawnAt(-12 + i * 12, -48, 2, 2, t); });
      R.nests.forEach(function(n){ n.spawnT = Math.min(n.spawnT, 2); });
      R.cam.x = 0; R.cam.z = -30;
      for (var j = 0; j < 600; j++){ visuals(1 / 30); sig.push(empreinte()); if (j === 299) o.bataille300 = c; }
      o.total = c; o.sig = sig; o.anim = typeof __rtsZAnim === 'object' ? __rtsZAnim.RZ.actif : null; o.morts = typeof __rtsZAnim === 'object' ? __rtsZAnim.compte().morts : null;
      o.pertes = R.units.filter(function(u){ return u.dead; }).length; o.tues = R.kills;
      return o;
    } finally { Math.random = M; if (son !== null) Snd.on = son; try { localStorage.removeItem('dt_rts_partie'); } catch (e) {} }
  };
  let stock = null;
  const stockPrendre = () => { stock = {}; for (let i = 0; i < localStorage.length; i++){ const k = localStorage.key(i); stock[k] = localStorage.getItem(k); } };
  const stockRemettre = () => { if (!stock) return; Object.keys(localStorage).forEach(k => { if (!(k in stock)) localStorage.removeItem(k); }); Object.keys(stock).forEach(k => localStorage.setItem(k, stock[k])); };
  let sans = null;
  test('RTS zombies anim : partie de référence dans une page neuve, sans les animations', async () => {
    exiger(); sans = null; stockPrendre();
    const P = await pageNeuve();
    try { sans = P.w.eval('(' + PARTIE.toString() + ')(false)'); } finally { P.f.remove(); stockRemettre(); }
    ok(sans.total > 1000 && sans.anim === false && sans.tues > 0, 'Bataille jouée sans les animations : ' + JSON.stringify({ total:sans.total, tues:sans.tues, pertes:sans.pertes }));
  });
  test('RTS zombies anim : mêmes tirages de Math.random et même partie image par image avec les animations (page neuve, même graine)', async () => {
    exiger(); if (!sans) ignorer('Partie de référence absente');
    stockRemettre();
    const P = await pageNeuve();
    let avec; try { avec = P.w.eval('(' + PARTIE.toString() + ')(true)'); } finally { P.f.remove(); stockRemettre(); }
    ok(avec.anim === true, 'Les animations ont bien tourné : morts ' + JSON.stringify(avec.morts));
    egal(avec.depart, sans.depart, 'Même nombre de tirages pendant rtsStart');
    egal(avec.bataille300, sans.bataille300, 'Même nombre de tirages après 300 images de bataille');
    egal(avec.total, sans.total, 'Même nombre de tirages après 600 images de bataille');
    let k = -1; for (let i = 0; i < sans.sig.length; i++) if (avec.sig[i] !== sans.sig[i]){ k = i; break; }
    egal(k, -1, 'Même partie image par image (zombies, nids, unités, bâtiments, argent) : première image différente ' + k);
    egal(avec.tues + '/' + avec.pertes, sans.tues + '/' + sans.pertes, 'Mêmes tués et mêmes pertes');
  });

  test('RTS zombies anim : appels de dessin bornés, temps du code, pas de fuite sur 4 parties', () => {
    exiger(); reset();
    let r;
    try {
      r = run(function(){
        var A = __rtsZAnim, o = {};
        var mesure = function(on){
          A.RZ_REGL.on = on;
          var R = __t.graine(9, function(){ if (typeof rtsTipsStop === 'function') rtsTipsStop(); __rts.rtsStart(); var Q = __rts.RTS; Q.nests.forEach(function(n){ n.spawnT = 1e9; }); Q.hordeT = 1e9; clearZombies(); S.money = 1e8; return Q; }); plan.maxAlive = 500;
          var T = ['rifle', 'gunner', 'sniper', 'flamebot', 'rocket', 'heavy', 'tank', 'heli'];
          __t.graine(9, function(){ for (var i = 0; i < 24; i++) __rts.rtsSpawnUnit(T[i % T.length], -20 + (i % 8) * 5, -14 - Math.floor(i / 8) * 5); __rts.rtsSpawnAt(0, -50, 300, 24); });
          R.cam.z = -34; img(6); A.tempsZero();
          var info = renderer.info; info.autoReset = false; info.reset(); img(1); var c = info.render.calls; info.autoReset = true;
          __t.graine(9, function(){ img(20); }); var tm = A.temps();
          __rts.rtsQuit(); img(1); return { c:c, t:tm };
        };
        o.sans = mesure(false); o.avec = mesure(true);
        A.RZ_REGL.on = true; var m = [];
        for (var k = 0; k < 4; k++){ var R = calme(); if (typeof __amb === 'object') __amb.set('clair'); __rts.rtsSpawnAt(0, -40, 30, 8); var n = R.nests.find(function(q){ return !q.dead; }); img(4); n.hp = 0; rtsNestDie(n); img(4); __rts.rtsQuit(); img(1); m.push([renderer.info.memory.textures, renderer.info.memory.geometries]); }
        o.m = m;
        return o;
      });
    } finally { fin(); }
    ok(r.avec.c <= Math.ceil(r.sans.c * 1.04) + 1, 'Appels de dessin : ' + r.sans.c + ' sans, ' + r.avec.c + ' avec les animations (4 % de plus au plus)');
    ok(r.avec.t.moy < 3, 'Temps du code des animations : ' + r.avec.t.moy.toFixed(3) + ' ms par image en moyenne (300 zombies, rendu logiciel)');
    const t = r.m.map(x => x[0]), g = r.m.map(x => x[1]);
    ok(Math.min(t[2], t[3]) <= Math.max(t[0], t[1]) + 2, 'Textures stables d’une partie à l’autre : ' + t.join(', '));
    ok(Math.min(g[2], g[3]) <= Math.max(g[0], g[1]) + 2, 'Géométries stables d’une partie à l’autre : ' + g.join(', '));
  });
})();
