'use strict';
/* Tests du dossier 126 : une vallée vivante dans le RTS (js/79-rts-vallee.js), seulement visuel.
   Décor fixe dans les tronçons (semé sur la vallée, le même à la reprise), aucun tirage dans Math.random (création, décor,
   images de bataille), traces au sol (cratères, acide, chenilles, gravats, carcasses) en réserve fixe, fumée des bâtiments
   abîmés, interrupteur, tout vidé en quittant, appels de dessin bornés, pas de fuite sur plusieurs parties. */
(function(){
  if (typeof test !== 'function' || typeof TESTS === 'undefined') return;
  const exiger = () => {
    if (lire('typeof __rtsVallee === "object" && typeof __rtsVallee.rvChunk === "function"') !== true) ignorer('Vallée vivante absente (js/79-rts-vallee.js)');
    if (lire('typeof __rts === "object" && typeof __rts.rtsStart === "function"') !== true) ignorer('RTS absent');
  };
  const img = 'function img(n){ for (var i = 0; i < (n || 1); i++){ visuals(1 / 30); renderer.clear(); if (!(typeof styleRendu === "function" && styleRendu())) renderer.render(scene, camera); renderer.clearDepth(); renderer.render(vmScene, vmCam); } }';
  const calme = 'function calme(){ __rts.rtsStart(); var R = __rts.RTS; R.nests.forEach(function(n){ n.spawnT = 1e9; }); R.hordeT = 1e9; clearZombies(); S.money = 1e8; return R; }';
  // Triangles du décor des tronçons (maillages de rtsMat dans la vallée, ou de la roche du style Amélioré)
  const tris = 'function tris(){ var n = 0; world.children.forEach(function(c){ if (c.isMesh && c.geometry && c.geometry.attributes.color && !(c.geometry.parameters && c.geometry.parameters.width === 480)) n += c.geometry.attributes.position.count / 3; }); return n; }';
  const fin = () => J(function(){
    __rtsVallee.RV_REGL.on = true;
    if (__rts.RTS.pilot) __rts.rtsUnpilot();
    if (__rts.RTS.on){ __rts.RTS.paused = false; __rts.rtsQuit(); }
    localStorage.removeItem('dt_rts_partie'); var p = document.getElementById('rtsPanel'); if (p) p.classList.add('hide');
    if (typeof __style === 'object') __style.styleSet('actuel'); visuals(1 / 30);
  });
  const run = body => J(new Function(img + ';' + calme + ';' + tris + '; return (' + body + ')();'));

  test('RTS vallée : décor fixe dans les tronçons, hors de la base et de la route, le même pour une même vallée', () => {
    exiger(); reset();
    let r;
    try {
      r = run(function(){
        var V = __rtsVallee, o = {};
        V.RV_REGL.on = false; __t.graine(5, function(){ calme(); }); o.sans = tris(); __rts.rtsQuit();
        V.RV_REGL.on = true; __t.graine(5, function(){ calme(); }); o.avec = tris();
        // Un tronçon refait deux fois : même décor ; une autre vallée : un autre décor
        var R = __rts.RTS, faire = function(v, k){ R.vallee = v; var b = vmNew(); V.rvChunk(b, k, -(k + 1) * 100, -k * 100); var d = V.RV.dernier; return { n:b.p.length, sig:V.RV.sig[k], pos:d.pos, pot:d.poteaux, tri:d.tri }; };
        var a = faire(1, 2), b = faire(1, 2), c = faire(2, 2); R.vallee = 1;
        o.meme = a.n === b.n && a.sig === b.sig; o.autre = a.sig !== c.sig; o.objets = a.pos.length; o.poteaux = a.pot; o.tri = a.tri;
        o.horsBase = a.pos.concat(c.pos).every(function(p){ return Math.hypot(p[0], p[1]) > V.RV_REGL.decor.base; });
        o.horsRoute = a.pos.concat(c.pos).every(function(p){ return rtsRoadDist(p[0], p[1]) > 5; });
        o.vide = (function(){ var b2 = vmNew(); V.rvChunk(b2, -1, 0, 90); return b2.p.length; })();
        return o;
      });
    } finally { fin(); }
    ok(r.avec > r.sans + 2000, 'Décor ajouté aux tronçons : ' + r.sans + ' → ' + r.avec + ' triangles');
    ok(r.meme, 'Un tronçon refait donne le même décor');
    ok(r.autre, 'Une autre vallée a un autre décor');
    ok(r.objets >= 40 && r.poteaux >= 2, 'Rochers, buissons, cactus, os, épaves et poteaux : ' + r.objets + ' objets, ' + r.poteaux + ' poteaux, ' + r.tri + ' triangles');
    ok(r.horsBase, 'Rien dans la base (80 m)');
    ok(r.horsRoute, 'Rien sur la route');
    egal(r.vide, 0, 'Pas de décor dans le tronçon du sud (montagnes et base)');
  });

  test('RTS vallée : aucun tirage dans Math.random (création, décor, explosions, images de bataille)', () => {
    exiger(); reset();
    let r;
    try {
      r = run(function(){
        var V = __rtsVallee, o = {};
        // 1. Directement : le fichier ne tire jamais (Math.random compté pendant ses fonctions seulement)
        calme(); img(2);
        var R = __rts.RTS, n = 0, R0 = Math.random;
        V.reconstruire();
        Math.random = function(){ n++; return R0(); };
        try {
          V.rvImage(1 / 30);                                   // création des objets
          for (var i = 0; i < 60; i++) V.rvBoom(-40 + i * 1.3, -60 - (i % 7) * 4, 3 + (i % 4) * 2, i % 9 ? {} : { acide:true });
          V.rvChunk(vmNew(), 3, -400, -300);
          R.blds.forEach(function(b){ b.hp = b.maxHp * .1; });
          for (var k = 0; k < 120; k++) V.rvImage(1 / 30);
        } finally { Math.random = R0; }
        o.direct = n;
        __rts.rtsQuit();
        // 2. Pendant une bataille avec le fichier actif : aucun appel à Math.random ne vient de lui (pile d'appels)
        V.RV_REGL.on = true; V.reconstruire();
        var tot = 0, lui = 0;
        Math.random = function(){ tot++; if (String(new Error().stack).indexOf('79-rts-vallee') >= 0) lui++; return R0(); };
        try {
          calme(); R = __rts.RTS;
          ['rifle', 'gunner', 'rocket', 'tank', 'tank', 'heli', 'heavy', 'sniper'].forEach(function(t, i){ __rts.rtsSpawnUnit(t, -12 + i * 3.5, -16); });
          __rts.rtsSpawnAt(0, -55, 80, 20);
          for (var j = 0; j < 200; j++) visuals(1 / 30);
        } finally { Math.random = R0; }
        o.bataille = { tot:tot, lui:lui };
        return o;
      });
    } finally { fin(); }
    egal(r.direct, 0, 'Le fichier ne tire aucun nombre dans Math.random (création, décor, 60 explosions, 120 images)');
    ok(r.bataille.tot > 1000, 'La bataille a bien tiré dans Math.random : ' + r.bataille.tot);
    egal(r.bataille.lui, 0, 'Aucun tirage ne vient de js/79-rts-vallee.js pendant rtsStart et 200 images de bataille');
  });

  // Même partie à graine fixée dans deux pages neuves (une page qui a déjà joué garde un état qui change la suite) :
  // rtsStart puis 200 images de bataille, sans puis avec le fichier ; le nombre de tirages doit être le même.
  async function pageNeuve(){
    const base = new URL('../', location.href).href;
    let html = await (await fetch(base + 'index.html?t=' + Date.now(), { cache:'no-store' })).text();
    // Boucle du jeu arrêtée (les images sont faites par le test) : sinon l'écran titre joue avant, plus ou moins longtemps
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
  const COMPTE = function(on){
    if (typeof __rtsVallee === 'object') __rtsVallee.RV_REGL.on = on;
    // Son coupé : les sons tirent au hasard selon l'heure réelle (délais entre deux voix), qui varie d'une page à l'autre
    var son = typeof Snd === 'object' ? Snd.on : null; if (typeof Snd === 'object') Snd.on = false;
    var c = 0, s = 4242, M = Math.random;
    Math.random = function(){ c++; s = s * 16807 % 2147483647; return (s - 1) / 2147483646; };
    try {
      __rts.rtsStart(); var R = __rts.RTS; R.hordeT = 1e9; S.money = 1e8; var c0 = c;
      ['rifle', 'gunner', 'rocket', 'tank', 'tank', 'heli', 'heavy', 'sniper'].forEach(function(t, i){ __rts.rtsSpawnUnit(t, -12 + i * 3.5, -16); });
      __rts.rtsSpawnAt(0, -55, 80, 20);
      for (var j = 0; j < 200; j++) visuals(1 / 30);
      return { depart:c0, total:c, vit:typeof __rtsVallee === 'object' ? __rtsVallee.RV.actif : null };
    } finally { Math.random = M; if (son !== null) Snd.on = son; try { localStorage.removeItem('dt_rts_partie'); } catch (e) {} }
  };
  // Même stockage au départ des deux pages (astuces vues, records... changent le jeu d'une partie à l'autre)
  let stock = null;
  const stockPrendre = () => { stock = {}; for (let i = 0; i < localStorage.length; i++){ const k = localStorage.key(i); stock[k] = localStorage.getItem(k); } };
  const stockRemettre = () => { if (!stock) return; Object.keys(localStorage).forEach(k => { if (!(k in stock)) localStorage.removeItem(k); }); Object.keys(stock).forEach(k => localStorage.setItem(k, stock[k])); };
  let sansFichier = null;
  test('RTS vallée : tirages de Math.random dans une page neuve, sans le fichier (rtsStart et 200 images)', async () => {
    exiger(); sansFichier = null; stockPrendre();
    const P = await pageNeuve();
    try { sansFichier = P.w.eval('(' + COMPTE.toString() + ')(false)'); } finally { P.f.remove(); stockRemettre(); }
    ok(sansFichier.total > 1000 && sansFichier.vit === false, 'Bataille jouée sans la vallée vivante : ' + JSON.stringify(sansFichier));
  });
  test('RTS vallée : mêmes tirages de Math.random avec le fichier actif (page neuve, même graine)', async () => {
    exiger(); if (!sansFichier) ignorer('Mesure sans le fichier absente');
    stockRemettre();
    const P = await pageNeuve();
    let avec; try { avec = P.w.eval('(' + COMPTE.toString() + ')(true)'); } finally { P.f.remove(); stockRemettre(); }
    ok(avec.vit === true, 'La vallée vivante a bien tourné');
    egal(avec.depart, sansFichier.depart, 'Même nombre de tirages pendant rtsStart');
    egal(avec.total, sansFichier.total, 'Même nombre de tirages après 200 images de bataille');
  });

  test('RTS vallée : cratères, acide, chenilles, carcasses et gravats en réserve fixe', () => {
    exiger(); reset();
    let r;
    try {
      r = run(function(){
        var V = __rtsVallee, E = __rtsEffets, o = {}, R = calme(); img(2);
        var C = function(){ return V.compte(); };
        // Explosion vue (rfxBoom) : un cratère ; une flaque d'acide pour le crachat
        if (E && E.rfxBoom){ E.rfxBoom(-30, .5, -70, 6.5, 0, {}); E.rfxBoom(30, .5, -70, 2.2, .3, { acide:true }); }
        else { V.rvBoom(-30, -70, 6.5, {}); V.rvBoom(30, -70, 2.2, { acide:true }); }
        img(1); o.un = C();
        for (var i = 0; i < 10; i++) V.rvBoom(-30 + i * .2, -70, 6.5, {}); // au même endroit : la même trace
        o.meme = C().sortes.cratere;
        for (var j = 0; j < 400; j++) V.rvBoom(-60 + (j % 20) * 6, -60 - Math.floor(j / 20) * 6, 5, {});
        o.plein = C(); o.cap = V.RV_REGL.traces.cap;
        // Petite balle : rien
        var avant = C().traces; V.rvBoom(0, -50, 1, {}); o.balle = C().traces - avant;
        // Tank qui roule : traces de chenilles
        var t = __rts.rtsSpawnUnit('tank', 0, -40); t.cmd = 'idle';
        for (var k = 0; k < 40; k++){ t.g.position.z = -40 - k * .5; t.g.rotation.y = Math.PI; V.rvImage(1 / 30); }
        o.chen = C().chenilles;
        // Tank détruit : carcasse fumante et tache d'huile ; bâtiment tombé : gravats
        t.hp = 0; rtsUnitDie(t); V.rvImage(1 / 30);
        var tu = R.blds.find(function(b){ return b.B && b.B.turret && !b.dead; }); tu.hp = 0; rtsBldDie(tu); V.rvImage(1 / 30);
        var c2 = C(); o.carc = c2.carcasses; o.huile = c2.sortes.huile || 0; o.gravats = c2.sortes.gravats || 0;
        for (var q = 0; q < 30; q++) V.rvImage(1 / 30);
        o.fumeeCarc = C().fumee;
        // Hauteurs : au-dessus de la dalle et de la route, collé au sable ailleurs
        o.yDalle = V.rvY(5, 5); o.yRoute = V.rvY(RTS_ROAD[2][0], RTS_ROAD[2][1]); o.ySable = V.rvY(120, -150) - V.rvSolY(120, -150);
        return o;
      });
    } finally { fin(); }
    ok(r.un.sortes.cratere === 1 && r.un.sortes.acide === 1, 'Une explosion laisse un cratère, un crachat une flaque d’acide : ' + JSON.stringify(r.un.sortes));
    egal(r.meme, 1, 'Dix explosions au même endroit : une seule trace, rafraîchie');
    ok(r.plein.traces <= r.cap && r.plein.traces >= r.cap * .9, 'Réserve fixe recyclée : ' + r.plein.traces + ' traces pour ' + r.cap);
    egal(r.balle, 0, 'Une petite explosion (moins de 2,5 m) ne laisse pas de cratère');
    ok(r.chen >= 5, 'Traces de chenilles derrière le tank : ' + r.chen);
    ok(r.carc >= 2 && r.huile >= 1 && r.gravats >= 1, 'Carcasse, huile et gravats : ' + JSON.stringify([r.carc, r.huile, r.gravats]));
    ok(r.fumeeCarc > 0, 'La carcasse fume : ' + r.fumeeCarc);
    ok(r.yDalle >= .07 && r.yRoute >= .12 && r.ySable > .02 && r.ySable < .1, 'Décalques au-dessus de la dalle, de la route et du sable : ' + JSON.stringify([r.yDalle, r.yRoute, r.ySable]));
  });

  test('RTS vallée : fumée selon la vie des bâtiments, flammes sous 25 %, lueur des nids, drapeau et oiseaux', () => {
    exiger(); reset();
    let r;
    try {
      r = run(function(){
        var V = __rtsVallee, o = {}, R = calme(); img(2);
        for (var i = 0; i < 40; i++) V.rvImage(1 / 30);
        var neuf = V.compte();
        R.blds.forEach(function(b){ if (!b.dead) b.hp = b.maxHp * .45; });
        for (var j = 0; j < 40; j++) V.rvImage(1 / 30);
        var moyen = V.compte();
        R.blds.forEach(function(b){ if (!b.dead) b.hp = b.maxHp * .1; });
        for (var k = 0; k < 40; k++) V.rvImage(1 / 30);
        var feu = V.compte();
        o.neuf = neuf; o.moyen = moyen; o.feu = feu;
        // Nid vu de près : il bat ; oiseaux et drapeau dans le maillage animé
        var n = R.nests.find(function(x){ return !x.dead; }); R.cam.x = n.x; R.cam.z = n.z;
        V.RV.glow.life.fill(0); for (var q = 0; q < 60; q++) V.rvImage(1 / 30); o.nid = V.compte().lueurs;
        var P = V.RV.anim.geometry.attributes.position.array, haut = 0; for (var p = 1; p < P.length; p += 3) haut = Math.max(haut, P[p]);
        o.oiseaux = haut > 20; o.anim = V.RV.anim.visible;
        // Pause : rien ne bouge
        R.paused = true; var a = V.compte(); for (var s = 0; s < 30; s++) V.rvImage(1 / 30); var b = V.compte(); R.paused = false;
        o.pause = a.fumee === b.fumee && a.lueurs === b.lueurs;
        return o;
      });
    } finally { fin(); }
    ok(r.moyen.fumee > r.neuf.fumee + 10, 'Bâtiments à 45 % : ils fument (' + r.neuf.fumee + ' → ' + r.moyen.fumee + ')');
    ok(r.feu.lueurs > r.moyen.lueurs + 10, 'Sous 25 % : des flammes (' + r.moyen.lueurs + ' → ' + r.feu.lueurs + ')');
    ok(r.nid > 0, 'Lueur qui bat sur le nid : ' + r.nid);
    ok(r.oiseaux && r.anim, 'Charognards au-dessus des nids et drapeau du QG');
    ok(r.pause, 'En pause, la fumée et les lueurs ne bougent pas');
  });

  test('RTS vallée : interrupteur, tout vidé en quittant, décor rebâti pareil à la reprise', () => {
    exiger(); reset();
    let r;
    try {
      r = run(function(){
        var V = __rtsVallee, o = {};
        V.RV_REGL.on = false; var R = calme(); img(2); V.rvBoom(-20, -60, 6, {});
        o.coupe = V.compte(); __rts.rtsQuit(); img(1);
        V.RV_REGL.on = true; R = calme(); img(2); V.rvBoom(-20, -60, 6, {}); img(1);
        o.marche = V.compte();
        // Reprise : même décor (semé sur la vallée, la route est gardée)
        var sig1 = JSON.stringify(V.RV.sig), k1 = Object.keys(V.RV.sig).length;
        if (typeof rtsSave === 'function'){
          rtsSave(); __rts.rtsQuit(); img(1);
          V.RV.sig = {}; var sv = store.get('dt_rts_partie', null); __rts.rtsStart(sv); img(2);
          var s2 = V.RV.sig, same = true; Object.keys(s2).forEach(function(k){ if (JSON.parse(sig1)[k] !== undefined && JSON.parse(sig1)[k] !== s2[k]) same = false; });
          o.reprise = { same:same, k1:k1, k2:Object.keys(s2).length, traces:V.compte().traces };
        }
        __rts.rtsQuit(); img(1);
        o.quitte = V.compte();
        return o;
      });
    } finally { fin(); }
    ok(!r.coupe.actif && !r.coupe.visible && r.coupe.traces === 0, 'Interrupteur coupé : rien ne se fait : ' + JSON.stringify(r.coupe));
    ok(r.marche.actif && r.marche.visible && r.marche.traces >= 1, 'Interrupteur remis : la vallée vit');
    if (r.reprise){ ok(r.reprise.same && r.reprise.k2 >= 3, 'Partie reprise : même décor fixe : ' + JSON.stringify(r.reprise)); egal(r.reprise.traces, 0, 'Partie reprise : les traces ne sont pas gardées'); }
    ok(!r.quitte.actif && !r.quitte.visible && r.quitte.traces === 0 && r.quitte.carcasses === 0 && r.quitte.fumee === 0, 'Tout est vidé en quittant le RTS : ' + JSON.stringify(r.quitte));
  });

  test('RTS vallée : appels de dessin bornés (bataille de 30 unités, 300 zombies), pas de fuite sur 4 parties', () => {
    exiger(); reset();
    let r;
    try {
      r = run(function(){
        var V = __rtsVallee, o = {};
        var mesure = function(on){
          V.RV_REGL.on = on;
          var R = __t.graine(9, function(){ return calme(); }); plan.maxAlive = 500;
          var T = ['rifle', 'gunner', 'sniper', 'flamebot', 'rocket', 'heavy', 'tank', 'heli', 'jet', 'warthog'];
          __t.graine(9, function(){ for (var i = 0; i < 30; i++) __rts.rtsSpawnUnit(T[i % T.length], -20 + (i % 10) * 4.4, -14 - Math.floor(i / 10) * 5); __rts.rtsSpawnAt(0, -60, 300, 24); });
          R.cam.z = -34; R.blds.forEach(function(b){ b.hp = b.maxHp * .2; });
          for (var j = 0; j < 8; j++) V.rvBoom(-20 + j * 5, -50, 6, j % 3 ? {} : { acide:true });
          var u = R.units.find(function(x){ return x.type === 'tank'; }); u.hp = 0; rtsUnitDie(u);
          img(6);
          var info = renderer.info; info.autoReset = false; info.reset(); img(1); var c = info.render.calls; info.autoReset = true;
          __rts.rtsQuit(); img(1); return c;
        };
        o.sans = mesure(false); o.avec = mesure(true);
        V.RV_REGL.on = true; var m = [];
        for (var k = 0; k < 4; k++){ calme(); if (typeof __amb === 'object') __amb.set('clair'); V.rvBoom(-20, -60, 6, {}); img(3); __rts.rtsQuit(); img(1); m.push([renderer.info.memory.textures, renderer.info.memory.geometries]); }
        o.m = m;
        return o;
      });
    } finally { fin(); }
    ok(r.avec - r.sans <= 7, 'Appels de dessin : ' + r.sans + ' sans, ' + r.avec + ' avec la vallée vivante (5 au plus de plus)');
    const t = r.m.map(x => x[0]), g = r.m.map(x => x[1]);
    ok(Math.min(t[2], t[3]) <= Math.max(t[0], t[1]) + 2, 'Textures stables d’une partie à l’autre : ' + t.join(', '));
    ok(g[3] - g[0] <= 20, 'Géométries stables d’une partie à l’autre : ' + g.join(', '));
  });
})();
