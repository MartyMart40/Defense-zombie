'use strict';
/* Tests du dossier 129 : des unités et des bâtiments qui vivent dans le RTS (js/84-rts-anim.js, js/84-rts-anim-bat.js),
   seulement visuel. Pièces dans un groupe à part (objet racine jamais touché), tourelle du tank et torse vers la cible, recul,
   construction, porte de l'usine et sortie, écroulement, interrupteur, pilotage, sauvegarde, pause figée ; aucun tirage dans
   Math.random et même partie image par image avec et sans les fichiers (pages neuves) ; appels de dessin, temps, fuites. */
(function(){
  if (typeof test !== 'function' || typeof TESTS === 'undefined') return;
  const exiger = () => {
    if (lire('typeof __rtsAnim === "object" && typeof __rtsAnim.raImage === "function"') !== true) ignorer('Animations du RTS absentes (js/84-rts-anim.js)');
    if (lire('typeof __rts === "object" && typeof __rts.rtsStart === "function"') !== true) ignorer('RTS absent');
  };
  const img = 'function img(n){ for (var i = 0; i < (n || 1); i++){ visuals(1 / 30); renderer.clear(); if (!(typeof styleRendu === "function" && styleRendu())) renderer.render(scene, camera); renderer.clearDepth(); renderer.render(vmScene, vmCam); } }';
  const pas = 'function pas(n){ for (var i = 0; i < (n || 1); i++) visuals(1 / 30); }';
  const calme = 'function calme(){ if (typeof rtsTipsStop === "function") rtsTipsStop(); __rts.rtsStart(); var R = __rts.RTS; R.nests.forEach(function(n){ n.spawnT = 1e9; }); R.hordeT = 1e9; clearZombies(); S.money = 1e8; R.blds.filter(function(o){ return o.B.turret; }).forEach(function(o){ rtsSell(o); }); return R; }';
  const fin = () => J(function(){
    __rtsAnim.RA_REGL.on = true;
    if (__rts.RTS.pilot) __rts.rtsUnpilot();
    if (__rts.RTS.on){ __rts.RTS.paused = false; __rts.rtsQuit(); }
    localStorage.removeItem('dt_rts_partie'); var p = document.getElementById('rtsPanel'); if (p) p.classList.add('hide');
    if (typeof __style === 'object') __style.styleSet('actuel'); visuals(1 / 30);
  });
  const run = body => J(new Function(img + ';' + pas + ';' + calme + '; return (' + body + ')();'));

  test('RTS anim : pièces dans un groupe à part, tourelle du tank, jambes du Mech, objet racine intact', () => {
    exiger(); reset();
    let r;
    try {
      r = run(function(){
        var A = __rtsAnim, o = {}, R = calme(); pas(2);
        var T = ['rifle', 'heavy', 'tank', 'heli', 'mech', 'jet', 'bomber'], U = T.map(function(t, i){ return __rts.rtsSpawnUnit(t, -16 + i * 5, -16); });
        R.cam.x = 0; R.cam.z = -16; pas(3);
        o.vis = U.every(function(u){ var s = A.etat(u); return s && s.vis.parent === u.g && u.m.parent === s.vis && u.ring.parent === u.g && u.hpb.fg.parent === u.g; });
        var t = A.etat(U[2]), m = A.etat(U[4]);
        o.tour = !!(t.tour && t.tour.parent === t.vis && U[2].m.geometry !== t.geo0);
        o.jambes = !!(m.mj && m.mj.length === 2 && U[4].m.geometry !== m.geo0);
        o.legs = A.etat(U[0]).vis.children.indexOf(U[0].legs[0]) >= 0;
        o.rotor = U[3].rotor.parent === A.etat(U[3]).vis;
        // Objet racine : le jeu seul le tourne et le place (au sol : jamais penché)
        o.racine = U.filter(function(u){ return u.U.kind === 'ground'; }).every(function(u){ return u.g.rotation.x === 0 && u.g.rotation.z === 0 && u.g.position.y === 0; });
        o.compte = A.compte();
        return o;
      });
    } finally { fin(); }
    ok(r.vis, 'Les pièces visibles passent dans le groupe à part ; anneau et barre de vie restent sur l’objet racine');
    ok(r.tour, 'Tank : caisse sans tourelle et tourelle à part');
    ok(r.jambes, 'Mech de combat : corps sans jambes et deux jambes à part');
    ok(r.legs && r.rotor, 'Jambes des robots et rotor de l’Apache dans le groupe');
    ok(r.racine, 'Objet racine des unités au sol jamais penché ni levé');
    ok(r.compte.actif && r.compte.unites >= 7, 'Animations actives : ' + JSON.stringify(r.compte));
  });

  test('RTS anim : la tourelle et le torse se tournent vers la cible avant le tir, recul au tir, Apache penché', () => {
    exiger(); reset();
    let r;
    try {
      r = run(function(){
        var A = __rtsAnim, o = {}, R = calme(); pas(2);
        var t = __rts.rtsSpawnUnit('tank', 6, -16), a = __rts.rtsSpawnUnit('rifle', -2, -16);
        [t, a].forEach(function(u){ u.tx = u.hx = u.g.position.x; u.tz = u.hz = u.g.position.z; u.cmd = 'idle'; });
        R.cam.x = 2; R.cam.z = -18; pas(2);
        // Un zombie à gauche, à portée ; on retient le tir (temps de recharge haut) pour voir la visée avant le tir
        __rts.rtsSpawnAt(-14, -18, 1, .1, 'walker'); var z = zombies.filter(function(q){ return !q.dead; }).pop(); z.hp = z.maxHp = 1e9;
        z.g.position.set(-14, z.g.position.y, -18);
        t.cd = a.cd = 99; t.tgt = a.tgt = z;
        var gy0 = t.g.rotation.y, ay0 = a.g.rotation.y;
        for (var i = 0; i < 40; i++){ t.cd = a.cd = 99; t.tgt = a.tgt = z; z.g.position.set(-14, z.g.position.y, -18); pas(1); }
        var T = A.etat(t), S = A.etat(a), vers = function(u){ return Math.atan2(z.g.position.x - u.g.position.x, z.g.position.z - u.g.position.z); };
        o.tourVise = Math.abs(A.raAng(T.tourY - vers(t))) < .2; o.racineTank = t.g.rotation.y === gy0;
        o.torseVise = Math.abs(A.raAng(S.torse - vers(a))) < .25; o.racineRob = a.g.rotation.y === ay0;
        // Le tir part : le jeu remonte le temps de recharge, la tourelle recule, le buste aussi
        t.cd = a.cd = .05; t.tgt = a.tgt = z; pas(2); // le temps de recharge descend sous zéro à la 2e image : le tir part
        o.kickT = T.kick; o.kickR = S.kick; o.reculT = Math.hypot(T.tour.position.x, T.tour.position.z + .1);
        // Apache en route : penché vers l'avant
        clearZombies(); var h = __rts.rtsSpawnUnit('heli', 0, -10); h.tx = 0; h.tz = -60; h.cmd = 'move'; pas(30);
        o.heli = A.etat(h).vis.rotation.x;
        return o;
      });
    } finally { fin(); }
    ok(r.tourVise, 'La tourelle du tank vise la cible avant le tir');
    ok(r.racineTank && r.racineRob, 'Le jeu n’a pas tourné les objets racines (pas encore de tir)');
    ok(r.torseVise, 'Le torse du robot vise la cible avant le tir');
    ok(r.kickT > .5 && r.kickR > .5 && r.reculT > .1, 'Recul au tir : ' + JSON.stringify([r.kickT, r.kickR, r.reculT]));
    ok(r.heli > .1, 'Apache penché vers l’avant en volant : ' + r.heli);
  });

  test('RTS anim : construction, porte de l’usine et sortie de l’unité, écroulement, radar du QG', () => {
    exiger(); reset();
    let r;
    try {
      r = run(function(){
        var A = __rtsAnim, RA = A.RA, o = {}, R = calme(); R.baseR = 60; rtsBaseSize(); pas(2);
        R.cam.x = 12; R.cam.z = 4;
        var b = rtsBuild('heavyfac', 16, 12, 2); pas(2);
        var e = RA.ech.find(function(q){ return q.on; });
        o.monte = b.m.scale.y; o.ech = !!(e && e.m.visible);
        pas(80); o.fini = b.m.scale.y; o.echFini = !RA.ech.some(function(q){ return q.on; });
        // Production : la porte se lève, l'unité part de la porte
        var u = __rts.rtsBuy('rocket'); pas(1);
        var sb = RA.b.get(b), su = A.etat(u); pas(8);
        o.porte = sb.porte3.scale.y / sb.k; o.sortie = !!(su && su.sortie); o.decale = su ? su.vis.position.length() : 0;
        o.reel = [u.g.position.x, u.g.position.z];
        pas(60); o.porteFermee = sb.porte3.scale.y / sb.k; o.sortieFinie = !su.sortie && su.vis.position.length() < 1e-6;
        // Radar du QG
        var q = RA.b.get(R.base), a0 = q.radar.rotation.y; R.cam.x = 0; R.cam.z = 0; pas(10); o.radar = q.radar.rotation.y !== a0;
        // Écroulement : un fantôme s'enfonce, la tête de la tourelle saute
        var tu = rtsPlaceBld('t_cannon', -16, -10, true); pas(2);
        b.hp = 0; rtsBldDie(b); tu.hp = 0; rtsBldDie(tu); pas(3);
        o.fantomes = A.compte().fantomes;
        pas(60); o.apres = A.compte().fantomes;
        // Vendu : rien ne tombe
        var w = rtsBuild('wall', -20, 14, 0); pas(70); rtsSell(w); pas(2); o.vendu = A.compte().fantomes;
        return o;
      });
    } finally { fin(); }
    ok(r.monte < .5 && r.ech, 'Le bâtiment monte dans un échafaudage : ' + r.monte);
    ok(r.fini === 1 && r.echFini, 'Construction finie : bâtiment entier, échafaudage rangé');
    ok(r.porte < .5, 'La porte se lève pendant la sortie : ' + r.porte);
    ok(r.sortie && r.decale > .3, 'L’unité sort par la porte (décalage visuel ' + r.decale.toFixed(2) + ' m)');
    ok(r.porteFermee === 1 && r.sortieFinie, 'Porte refermée, l’unité à sa vraie place');
    ok(r.radar, 'Le radar du QG tourne');
    ok(r.fantomes >= 2 && r.apres === 0, 'Écroulement du bâtiment et tête de tourelle, puis rangés : ' + r.fantomes + ' → ' + r.apres);
    egal(r.vendu, 0, 'Un bâtiment vendu disparaît comme avant');
  });

  test('RTS anim : interrupteur, pilotage, sauvegarde, pause figée, tout rendu en quittant', () => {
    exiger(); reset();
    let r;
    try {
      r = run(function(){
        var A = __rtsAnim, o = {}, R = calme(); pas(2);
        var t = __rts.rtsSpawnUnit('tank', 0, -16), m = __rts.rtsSpawnUnit('mech', 8, -16), a = __rts.rtsSpawnUnit('rifle', -6, -16);
        R.cam.x = 0; R.cam.z = -16; pas(3);
        // Pilotage : la tourelle ajoutée se cache avec le modèle
        __rts.rtsPilot(t); pas(2); o.pilote = A.etat(t).tour.visible === false && t.m.visible === false;
        __rts.rtsUnpilot(); pas(2); o.depilote = A.etat(t).tour.visible === true;
        // Pause : rien ne bouge
        R.paused = true; var s = A.etat(a), avant = [s.vis.rotation.y, a.m.rotation.y, s.vis.position.y].join(); pas(20); o.pause = avant === [s.vis.rotation.y, a.m.rotation.y, s.vis.position.y].join(); R.paused = false;
        // Interrupteur coupé : tout revient comme avant
        var geoT = A.etat(t).geo0, qg = R.base;
        A.RA_REGL.on = false; pas(1);
        o.coupe = t.m.parent === t.g && t.m.geometry === geoT && m.m.parent === m.g && a.legs[0].parent === a.g && !t.g.children.some(function(c){ return c.name === 'raVis'; })
          && !qg.m.children.some(function(c){ return c.name === 'raRadar'; }) && t.m.rotation.y === 0 && !A.compte().actif;
        A.RA_REGL.on = true; pas(2);
        o.remis = !!(A.etat(t) && A.etat(t).tour && A.etat(t).sortie === null);
        // Sauvegarde : les unités reprises n'ont pas de sortie d'usine
        if (typeof rtsSave === 'function'){
          rtsSave(); __rts.rtsQuit(); pas(1);
          __rts.rtsStart(store.get('dt_rts_partie', null)); pas(3);
          o.reprise = __rts.RTS.units.filter(function(u){ return !u.dead; }).every(function(u){ var e = A.etat(u); return e && !e.sortie; });
        }
        __rts.rtsQuit(); pas(1);
        o.quitte = A.compte();
        return o;
      });
    } finally { fin(); }
    ok(r.pilote && r.depilote, 'En pilotant le tank, sa tourelle se cache avec le modèle ; elle revient après');
    ok(r.pause, 'En pause, rien ne bouge');
    ok(r.coupe, 'Interrupteur coupé : pièces rendues à l’objet racine, géométries d’origine, radar retiré');
    ok(r.remis, 'Interrupteur remis : les unités reprennent leurs pièces, sans sortie d’usine');
    if (r.reprise !== undefined) ok(r.reprise, 'Partie reprise : pas de sortie d’usine pour les unités sauvées');
    ok(!r.quitte.actif && r.quitte.fantomes === 0 && r.quitte.geos <= 1, 'Tout est rendu en quittant le RTS : ' + JSON.stringify(r.quitte));
  });

  // Même partie à graine fixée dans deux pages neuves, sans puis avec les fichiers : rtsStart, construction d'un bâtiment,
  // production de deux unités, puis 600 images de bataille. Mêmes tirages de Math.random et même partie image par image
  // (positions, vies, cibles, temps de recharge des unités et des tourelles, zombies).
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
    if (typeof __rtsAnim === 'object') __rtsAnim.RA_REGL.on = on;
    var son = typeof Snd === 'object' ? Snd.on : null; if (typeof Snd === 'object') Snd.on = false;
    var c = 0, s = 4242, M = Math.random, h = 2166136261 >>> 0, sig = [];
    Math.random = function(){ c++; s = s * 16807 % 2147483647; return (s - 1) / 2147483646; };
    var mix = function(v){ var x = Math.round((+v || 0) * 1e4); h = Math.imul(h ^ (x & 0xffff), 16777619) >>> 0; h = Math.imul(h ^ (x >>> 16), 16777619) >>> 0; };
    var empreinte = function(){
      var R = __rts.RTS; h = 2166136261 >>> 0;
      R.units.forEach(function(u){ mix(u.g.position.x); mix(u.g.position.z); mix(u.g.position.y); mix(u.g.rotation.y); mix(u.hp); mix(u.cd); mix(u.cd2); mix(u.dead ? 1 : 0); mix(u.tgt ? zombies.indexOf(u.tgt) : -1); });
      R.blds.forEach(function(o){ mix(o.hp); mix(o.cd || 0); mix(o.head ? o.head.rotation.y : 0); mix(o.tgt ? zombies.indexOf(o.tgt) : -1); });
      var n = 0; zombies.forEach(function(z){ if (z.dead) return; n++; mix(z.g.position.x); mix(z.g.position.z); mix(z.hp); }); mix(n); mix(S.money);
      return h;
    };
    try {
      var o = {};
      __rts.rtsStart(); var R = __rts.RTS; R.hordeT = 1e9; S.money = 1e8; o.depart = c;
      visuals(1 / 30); visuals(1 / 30);
      rtsBuild('heavyfac', 16, 12, 2); visuals(1 / 30); visuals(1 / 30); o.construction = c;
      __rts.rtsBuy('rifle'); __rts.rtsBuy('rocket'); visuals(1 / 30); o.production = c;
      ['rifle', 'gunner', 'rocket', 'tank', 'tank', 'heli', 'heavy', 'mech', 'sniper', 'jet'].forEach(function(t, i){ __rts.rtsSpawnUnit(t, -16 + i * 3.5, -16); });
      __rts.rtsSpawnAt(0, -55, 120, 20);
      for (var j = 0; j < 600; j++){ visuals(1 / 30); sig.push(empreinte()); if (j === 299) o.bataille300 = c; }
      o.total = c; o.sig = sig; o.anim = typeof __rtsAnim === 'object' ? __rtsAnim.RA.actif : null;
      o.morts = R.units.filter(function(u){ return u.dead; }).length; o.tues = R.kills;
      return o;
    } finally { Math.random = M; if (son !== null) Snd.on = son; try { localStorage.removeItem('dt_rts_partie'); } catch (e) {} }
  };
  let stock = null;
  const stockPrendre = () => { stock = {}; for (let i = 0; i < localStorage.length; i++){ const k = localStorage.key(i); stock[k] = localStorage.getItem(k); } };
  const stockRemettre = () => { if (!stock) return; Object.keys(localStorage).forEach(k => { if (!(k in stock)) localStorage.removeItem(k); }); Object.keys(stock).forEach(k => localStorage.setItem(k, stock[k])); };
  let sans = null;
  test('RTS anim : partie de référence dans une page neuve, sans les animations', async () => {
    exiger(); sans = null; stockPrendre();
    const P = await pageNeuve();
    try { sans = P.w.eval('(' + PARTIE.toString() + ')(false)'); } finally { P.f.remove(); stockRemettre(); }
    ok(sans.total > 1000 && sans.anim === false && sans.tues > 0, 'Bataille jouée sans les animations : ' + JSON.stringify({ total:sans.total, tues:sans.tues, morts:sans.morts }));
  });
  test('RTS anim : mêmes tirages de Math.random et même partie image par image avec les animations (page neuve, même graine)', async () => {
    exiger(); if (!sans) ignorer('Partie de référence absente');
    stockRemettre();
    const P = await pageNeuve();
    let avec; try { avec = P.w.eval('(' + PARTIE.toString() + ')(true)'); } finally { P.f.remove(); stockRemettre(); }
    ok(avec.anim === true, 'Les animations ont bien tourné');
    egal(avec.depart, sans.depart, 'Même nombre de tirages pendant rtsStart');
    egal(avec.construction, sans.construction, 'Même nombre de tirages après la construction d’un bâtiment');
    egal(avec.production, sans.production, 'Même nombre de tirages après la production de deux unités');
    egal(avec.bataille300, sans.bataille300, 'Même nombre de tirages après 300 images de bataille');
    egal(avec.total, sans.total, 'Même nombre de tirages après 600 images de bataille');
    let k = -1; for (let i = 0; i < sans.sig.length; i++) if (avec.sig[i] !== sans.sig[i]){ k = i; break; }
    egal(k, -1, 'Même partie image par image (positions, vies, cibles, tirs) : première image différente ' + k);
    egal(avec.tues + '/' + avec.morts, sans.tues + '/' + sans.morts, 'Mêmes tués et mêmes pertes');
  });

  test('RTS anim : appels de dessin bornés, temps du code, pas de fuite sur 4 parties', () => {
    exiger(); reset();
    let r;
    try {
      r = run(function(){
        var A = __rtsAnim, o = {};
        var mesure = function(on){
          A.RA_REGL.on = on;
          var R = __t.graine(9, function(){ if (typeof rtsTipsStop === 'function') rtsTipsStop(); __rts.rtsStart(); var Q = __rts.RTS; Q.nests.forEach(function(n){ n.spawnT = 1e9; }); Q.hordeT = 1e9; clearZombies(); S.money = 1e8; return Q; }); plan.maxAlive = 500;
          var T = ['rifle', 'gunner', 'sniper', 'flamebot', 'rocket', 'heavy', 'tank', 'heli', 'jet', 'warthog'];
          __t.graine(9, function(){ for (var i = 0; i < 30; i++) __rts.rtsSpawnUnit(T[i % T.length], -20 + (i % 10) * 4.4, -14 - Math.floor(i / 10) * 5); __rts.rtsSpawnAt(0, -60, 300, 24); });
          R.cam.z = -34; img(6); A.tempsZero();
          var info = renderer.info; info.autoReset = false; info.reset(); img(1); var c = info.render.calls; info.autoReset = true;
          img(20); var tm = A.temps();
          __rts.rtsQuit(); img(1); return { c:c, t:tm };
        };
        o.sans = mesure(false); o.avec = mesure(true);
        A.RA_REGL.on = true; var m = [];
        for (var k = 0; k < 4; k++){ calme(); if (typeof __amb === 'object') __amb.set('clair'); __rts.rtsSpawnUnit('tank', 0, -16); __rts.rtsSpawnUnit('mech', 6, -16); rtsBuild('factory', 16, 10, 0); img(4); __rts.rtsQuit(); img(1); m.push([renderer.info.memory.textures, renderer.info.memory.geometries]); }
        o.m = m;
        return o;
      });
    } finally { fin(); }
    ok(r.avec.c <= Math.ceil(r.sans.c * 1.05) + 1, 'Appels de dessin : ' + r.sans.c + ' sans, ' + r.avec.c + ' avec les animations (5 % de plus au plus)');
    ok(r.avec.t.moy < 2, 'Temps du code des animations : ' + r.avec.t.moy.toFixed(3) + ' ms par image en moyenne (30 unités, rendu logiciel)');
    const t = r.m.map(x => x[0]), g = r.m.map(x => x[1]);
    ok(Math.min(t[2], t[3]) <= Math.max(t[0], t[1]) + 2, 'Textures stables d’une partie à l’autre : ' + t.join(', '));
    ok(Math.min(g[2], g[3]) <= Math.max(g[0], g[1]) + 2, 'Géométries stables d’une partie à l’autre : ' + g.join(', '));
  });
})();
