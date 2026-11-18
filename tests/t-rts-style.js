'use strict';
/* Tests du dossier 118 : style Amélioré dans le RTS (js/72-rts-style.js, js/57-graphismes.js) :
   sol, usure des machines, ombres du soleil qui suivent la caméra, effets d'image avec les barres de vie hors des effets,
   rien en Actuel, bouton de la Pause, pas de fuite sur plusieurs parties, retour au toit et au robot propre, appels de dessin. */
(function(){
  if (typeof test !== 'function' || typeof TESTS === 'undefined') return;
  const exiger = () => {
    if (lire('typeof __rtsStyle === "object" && typeof __style === "object" && typeof __style.styleRTS === "function"') !== true) ignorer('Style du RTS absent (js/72-rts-style.js)');
    if (lire('typeof __rts === "object" && typeof __rts.rtsStart === "function"') !== true) ignorer('RTS absent');
  };
  // Une image comme la boucle du jeu (js/15-boucle.js)
  const img = 'function img(n){ for (var i = 0; i < (n || 1); i++){ visuals(1 / 30); renderer.clear(); if (!styleRendu()) renderer.render(scene, camera); renderer.clearDepth(); renderer.render(vmScene, vmCam); } }';
  const calme = 'function calme(){ __rts.rtsStart(); var R = __rts.RTS; R.nests.forEach(function(n){ n.spawnT = 1e9; }); R.hordeT = 1e9; clearZombies(); return R; }';
  const fin = () => J(function(){
    if (__rts.RTS.pilot) __rts.rtsUnpilot();
    if (__rts.RTS.on){ __rts.RTS.paused = false; __rts.rtsQuit(); }
    localStorage.removeItem('dt_rts_partie'); var p = document.getElementById('rtsPanel'); if (p) p.classList.add('hide');
    __style.styleSet('actuel'); visuals(1 / 30);
  });
  const run = body => J(new Function(img + ';' + calme + '; return (' + body + ')();'));

  test('RTS, style Amélioré : sol dessiné, machines usées, ombres du soleil, effets d’image, barres de vie hors des effets', () => {
    exiger(); reset();
    let r;
    try {
      r = run(function(){
        var o = {};
        __style.styleSet('ameliore'); var R = calme(); img(3);
        var RS = __rtsStyle.RST, sun = world.children.find(function(c){ return c.isDirectionalLight; });
        o.ici = __style.styleIci(); o.rts = __style.styleRTS(); o.actif = __rtsStyle.rstActif();
        o.moteur = renderer.shadowMap.enabled; o.soleil = !!(sun && sun.castShadow);
        o.sol = world.children.filter(function(c){ return c.isMesh && c.material === RS.sol; }).length;
        o.solRecoit = world.children.some(function(c){ return c.material === RS.sol && c.receiveShadow; });
        o.roc = world.children.filter(function(c){ return c.isMesh && c.material === RS.roc && c.castShadow; }).length;
        o.mach = typeof rtsMat.onBeforeCompile === 'function' && rtsMat.hasOwnProperty('onBeforeCompile');
        o.pad = !!(R.pad && R.pad.material === RS.pad && RS.pad.map);
        var qg = R.base; o.qgOmbre = !!(qg && qg.m.castShadow && qg.m.receiveShadow);
        o.anneau = qg && !qg.ring.castShadow;
        o.rendu = styleRendu(); o.casse = __style.STY.casse;
        // Barres de vie : la vraie barre revient au calque 0 après le rendu, une copie est dessinée par-dessus
        o.calque = qg.hpb.fg.layers.mask; o.copies = RS.nBarres;
        o.texSol = !!(RS.tex && RS.tex.solA && RS.tex.solB && RS.tex.usure && RS.tex.dalle);
        // Nids passés au shader du sol
        var U = RS.u.nids.value; o.nids = U.filter(function(v){ return v.w > 0; }).length; o.nidsVivants = R.nests.filter(function(n){ return !n.dead; }).length;
        // La zone d'ombre suit la caméra (vue de haut), recalée sur les points de la carte
        var zone = function(){ img(1); return [sun.target.position.x, sun.target.position.z, sun.shadow.camera.right * 2]; };
        R.cam.x = 0; R.cam.z = -10; o.z0 = zone(); R.cam.x = 40; R.cam.z = -120; o.z1 = zone();
        var n = sun.shadow.mapSize.x, tx = o.z1[2] / n;
        var d = sun.position.clone().sub(sun.target.position).normalize(), X = new THREE.Vector3().crossVectors(new THREE.Vector3(0, 1, 0), d).normalize();
        var a = sun.target.position.dot(X) / tx; o.recale = Math.abs(a - Math.round(a)) < 1e-3;
        o.carte = n; o.taches = typeof gfxShadows !== 'undefined' ? gfxShadows.visible : null;
        return o;
      });
    } finally { fin(); }
    ok(r.ici && r.rts && r.actif, 'Style actif dans le RTS : ' + JSON.stringify([r.ici, r.rts, r.actif]));
    ok(r.moteur && r.soleil, 'Ombres du soleil dans le RTS');
    ok(r.sol >= 2 && r.solRecoit, 'Sol de la vallée dessiné et qui reçoit les ombres : ' + r.sol + ' tronçons');
    ok(r.roc >= 2, 'Montagnes, ruines et épaves en roche, qui font de l’ombre : ' + r.roc);
    ok(r.mach, 'Unités et bâtiments : usure posée sur le matériau partagé');
    ok(r.pad, 'Dalle de béton de la base');
    ok(r.qgOmbre && r.anneau, 'Le QG projette et reçoit des ombres, pas son anneau de sélection');
    ok(r.rendu === true && !r.casse, 'Éclat, lissage et couleurs dessinés dans le RTS');
    egal(r.calque, 1, 'La vraie barre de vie revient au calque 0 après le rendu');
    ok(r.copies >= 5, 'Barres de vie redessinées après les effets : ' + r.copies);
    ok(r.texSol, 'Textures du sol, de l’usure et de la dalle');
    ok(r.nids >= r.nidsVivants && r.nidsVivants >= 6, 'Nids passés au sol : ' + r.nids + ' pour ' + r.nidsVivants + ' nids');
    ok(Math.hypot(r.z1[0] - r.z0[0], r.z1[1] - r.z0[1]) > 60, 'La zone d’ombre suit la caméra : ' + JSON.stringify([r.z0, r.z1]));
    ok(r.recale, 'Zone d’ombre recalée sur les points de la carte (pas de scintillement)');
    ok(r.carte >= 512 && r.carte <= 2048, 'Carte d’ombre : ' + r.carte);
    if (r.taches !== null && !lire('isTouch')) egal(r.taches, false, 'Ordi : les vraies ombres remplacent les taches sous les zombies');
  });

  test('RTS, style Actuel : rien ne change (ni ombres, ni effets, ni textures)', () => {
    exiger(); reset();
    let r;
    try {
      r = run(function(){
        __style.styleSet('actuel'); var R = calme(); img(3);
        var RS = __rtsStyle.RST, sun = world.children.find(function(c){ return c.isDirectionalLight; });
        return { ici: __style.styleIci(), actif: __rtsStyle.rstActif(), moteur: renderer.shadowMap.enabled, soleil: !!(sun && sun.castShadow), rendu: styleRendu(),
          tex: !!RS.tex, mach: rtsMat.hasOwnProperty('onBeforeCompile'), sol: world.children.some(function(c){ return c.material && c.material.userData && c.material.userData.rtsStyle; }),
          ombreQG: !!(R.base && R.base.m.castShadow), pad: !!(R.pad && R.pad.material.map) };
      });
    } finally { fin(); }
    ok(!r.ici && !r.actif && !r.moteur && !r.soleil && r.rendu === false, 'Ni ombres ni effets en Actuel : ' + JSON.stringify(r));
    ok(!r.tex && !r.mach && !r.sol && !r.ombreQG && !r.pad, 'Ni textures ni matériaux d’Amélioré en Actuel : ' + JSON.stringify(r));
  });

  test('RTS : changer de style en pleine partie habille puis déshabille la vallée', () => {
    exiger(); reset();
    let r;
    try {
      r = run(function(){
        __style.styleSet('actuel'); var R = calme(); img(2);
        var mat0 = R.pad.material, sol0 = world.children.find(function(c){ return c.isMesh && c.geometry.parameters && c.geometry.parameters.width === 480; }).material;
        __style.styleSet('ameliore'); img(2);
        var o = { on: __rtsStyle.rstActif() && !!__rtsStyle.RST.monde, rendu: styleRendu() };
        __style.styleSet('actuel'); img(2);
        var sol1 = world.children.find(function(c){ return c.isMesh && c.geometry.parameters && c.geometry.parameters.width === 480; }).material;
        var sun = world.children.find(function(c){ return c.isDirectionalLight; });
        o.retour = R.pad.material === mat0 && sol1 === sol0; o.tex = !!__rtsStyle.RST.tex; o.soleil = sun.castShadow; o.mach = rtsMat.hasOwnProperty('onBeforeCompile');
        o.dir = sun.position.clone().normalize().distanceTo(new THREE.Vector3(-60, 80, 40).normalize()) < 1e-6;
        return o;
      });
    } finally { fin(); }
    ok(r.on && r.rendu === true, 'Amélioré choisi en pleine partie : la vallée est habillée');
    ok(r.retour && !r.tex && !r.soleil && !r.mach, 'Retour à Actuel : matériaux d’origine, textures libérées : ' + JSON.stringify(r));
    ok(r.dir, 'Le soleil retrouve sa direction d’origine');
  });

  test('RTS, Haute définition choisie : Amélioré dans le RTS, dit dans la Pause ; retour au toit en Haute définition', () => {
    exiger(); reset();
    let r;
    try {
      r = run(function(){
        var o = {};
        __style.styleSet('hd'); var R = calme(); img(2);
        o.hd = __style.styleHD(); o.ici = __style.styleIci(); o.rendu = styleRendu();
        __rts.rtsPause(); img(1);
        var b = document.getElementById('rtStyle'); o.btn = b ? b.textContent : null;
        o.second = b ? b.previousElementSibling && /Reprendre/.test(b.previousElementSibling.textContent) : false;
        R.paused = false; document.getElementById('rtsPanel').classList.add('hide');
        __rts.rtsQuit(); img(2);
        o.hd2 = __style.styleHD(); o.toit2 = __style.styleToit(); o.orig2 = __style.STY.orig.length; o.btnToit = document.getElementById('btnStyle').textContent;
        o.libre = !__rtsStyle.RST.tex && !__rtsStyle.RST.monde && !rtsMat.hasOwnProperty('onBeforeCompile');
        return o;
      });
    } finally { fin(); }
    ok(!r.hd && r.ici && r.rendu === true, 'Haute définition choisie : Amélioré dans le RTS');
    ok(/Haute définition/.test(r.btn || '') && /Amélioré dans le RTS/.test(r.btn || ''), 'Bouton Style de la Pause du RTS : ' + r.btn);
    ok(r.second, 'Le bouton Style est juste après « Reprendre »');
    ok(r.hd2 && r.toit2 && r.orig2 > 20, 'De retour au toit : Haute définition et rue habillée');
    egal(r.btnToit, 'Style : Haute définition', 'Bouton du toit sans la mention du RTS');
    ok(r.libre, 'Tout le style du RTS est libéré en le quittant');
  });

  test('RTS, style Amélioré : pas de fuite de mémoire sur 3 parties de suite (et « Continuer la guerre » pareil)', () => {
    exiger(); reset();
    let r;
    try {
      r = run(function(){
        var o = {};
        // Actuel d'abord : le RTS garde déjà un peu de mémoire d'une partie à l'autre (ciel de la météo) ; on compare
        __style.styleSet('actuel'); var ma = [];
        for (var j = 0; j < 4; j++){ calme(); if (typeof __amb === 'object') __amb.set('clair'); img(2); __rts.rtsQuit(); img(1); ma.push(renderer.info.memory.textures); }
        o.actuel = ma;
        __style.styleSet('ameliore'); var m = [];
        for (var k = 0; k < 4; k++){
          var R = calme(); if (typeof __amb === 'object') __amb.set('clair'); img(3);
          if (k === 3 && typeof rtsSave === 'function'){ // partie reprise : même rendu qu'une neuve
            rtsSave(); __rts.rtsQuit(); var sv = store.get('dt_rts_partie', null); __rts.rtsStart(sv); if (typeof __amb === 'object') __amb.set('clair'); img(3);
            o.reprise = __rtsStyle.rstActif() && !!__rtsStyle.RST.monde && world.children.some(function(c){ return c.material === __rtsStyle.RST.sol; }) && renderer.shadowMap.enabled && styleRendu() === true;
          }
          __rts.rtsQuit(); img(2);
          m.push([renderer.info.memory.textures, renderer.info.memory.geometries]);
        }
        o.m = m; return o;
      });
    } finally { fin(); }
    const t = r.m.map(x => x[0]), g = r.m.map(x => x[1]);
    // Mesuré sur 24 parties : pas de fuite, mais le compte varie de 6 d'une partie à l'autre (décor tiré au hasard).
    // On compare donc le plus petit des deux dernières parties au plus gros des deux premières.
    ok(Math.min(t[2], t[3]) <= Math.max(t[0], t[1]) + 2, 'Textures stables d’une partie à l’autre : ' + t.join(', ') + ' (Actuel : ' + r.actuel.join(', ') + ')');
    ok(g[3] - g[0] <= 20, 'Géométries stables d’une partie à l’autre : ' + g.join(', '));
    if (r.reprise !== undefined) ok(r.reprise, '« Continuer la guerre » : même rendu qu’une partie neuve');
  });

  test('RTS puis robot : le robot garde son style Amélioré intact', () => {
    exiger(); if (lire('typeof __mech === "object" && typeof __mech.mechStart === "function"') !== true) ignorer('Robot absent'); reset();
    let r;
    try {
      r = run(function(){
        __style.styleSet('ameliore'); calme(); img(2); __rts.rtsQuit(); img(1);
        __mech.mechStart(); plan.queue = []; clearZombies(); img(3);
        var sun = world.children.find(function(c){ return c.isDirectionalLight; });
        var o = { robot: __style.styleRobot(), ici: __style.styleIci(), rendu: styleRendu(), soleil: !!(sun && sun.castShadow), n: __style.STY.orig.length, mach: rtsMat.hasOwnProperty('onBeforeCompile') };
        __mech.mechQuit(); return o;
      });
    } finally { fin(); }
    ok(r.robot && r.ici && r.rendu === true && r.soleil && r.n > 20 && !r.mach, 'Robot après le RTS : ' + JSON.stringify(r));
  });

  test('RTS, style Amélioré : appels de dessin bornés avec une bataille (30 unités, 300 zombies)', () => {
    exiger(); reset();
    let r;
    try {
      r = run(function(){
        var mesure = function(style){
          __style.styleSet(style); var R = calme(); S.money = 1e8; plan.maxAlive = 500;
          var T = ['rifle', 'gunner', 'sniper', 'flamebot', 'rocket', 'heavy', 'tank', 'heli', 'jet', 'warthog'];
          for (var i = 0; i < 30; i++) __rts.rtsSpawnUnit(T[i % T.length], -20 + (i % 10) * 4.4, -14 - Math.floor(i / 10) * 5);
          __rts.rtsSpawnAt(0, -60, 300, 24); R.cam.z = -34; img(4);
          var info = renderer.info, c = 0; info.autoReset = false; info.reset(); img(1); c = info.render.calls; info.autoReset = true;
          __rts.rtsQuit(); return c;
        };
        return { actuel: mesure('actuel'), ameliore: mesure('ameliore') };
      });
    } finally { fin(); }
    ok(r.ameliore < r.actuel * 2.2 + 40, 'Appels de dessin par image : Actuel ' + r.actuel + ', Amélioré ' + r.ameliore + ' (ombres et effets compris)');
    ok(r.ameliore < 900, 'Plafond d’appels de dessin en Amélioré : ' + r.ameliore);
  });
})();
