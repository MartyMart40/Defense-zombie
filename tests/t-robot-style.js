'use strict';
/* Tests du dossier 114 : style Amélioré dans le mode robot (js/57-graphismes.js, js/67-robot-style.js) */
(function(){
  if (typeof test !== 'function' || typeof TESTS === 'undefined') return;
  const exiger = () => {
    if (lire('typeof __style === "object" && typeof __style.styleIci === "function"') !== true) ignorer('Style du robot absent (js/57-graphismes.js)');
    if (lire('typeof __mech === "object" && typeof __mb === "object"') !== true) ignorer('Robot absent (js/39 et js/40)');
  };
  const depart = 'function depart(){ __mech.mechStart(); plan.queue = []; spawnT = 1e9; clearZombies(); __mb.MB.waveT = 1e9; S.bar = S.barMax = 1e9; }';
  const fin = () => J(function(){ if (__mech.MECH.on) __mech.mechQuit(); __style.styleSet('actuel'); });

  test('Robot, style Amélioré : textures, vraies ombres (jambes comprises), effets d\'image ; la zone d\'ombre suit le robot', () => {
    exiger(); reset();
    let r;
    try {
      r = J(new Function(depart + '; return (' + function(){
        var o = {};
        __style.styleSet('ameliore'); depart();
        for (var i = 0; i < 5; i++) visuals(1 / 30);
        var sun = world.children.find(function(c){ return c.isDirectionalLight; });
        o.ici = __style.styleIci(); o.toit = __style.styleToit(); o.robot = __style.styleRobot();
        o.n = __style.STY.orig.length; o.moteur = renderer.shadowMap.enabled; o.soleil = !!(sun && sun.castShadow);
        o.rendu = __style.styleRendu(); o.casse = __style.STY.casse;
        o.jambes = typeof __habitacle !== 'object' || __habitacle.hbJ.children.every(function(m){ return !m.isMesh || m.castShadow; });
        o.taches = typeof gfxShadows !== 'undefined' ? gfxShadows.visible : false;
        // Au début de la rue, puis 110 m plus loin : la caméra reste au même endroit de la zone d'ombre
        var ecart = function(){ visuals(1 / 30); return (camera.position.z - world.position.z) - sun.target.position.z; };
        o.e0 = ecart(); mechTread(110); __mech.MECH.dist = 110; o.e1 = ecart();
        o.carte = sun.shadow.mapSize.x;
        return o;
      } + ')();'));
    } finally { fin(); }
    ok(r.ici && r.robot && !r.toit, 'Style actif dans le robot (pas « toit ») : ' + JSON.stringify([r.ici, r.robot, r.toit]));
    ok(r.n > 20, 'Rue du robot habillée : ' + r.n);
    ok(r.moteur && r.soleil, 'Ombres du soleil dans le robot');
    ok(r.rendu === true && !r.casse, 'Éclat, lissage et couleurs dessinés dans le robot');
    ok(r.jambes, 'Les jambes du robot projettent leur ombre');
    egal(r.taches, false, 'Les taches sous les zombies laissent la place aux vraies ombres');
    ok(Math.abs(r.e0 - 41.7) < 1.5 && Math.abs(r.e1 - r.e0) < 1, 'La zone d\'ombre suit la caméra (écart ' + r.e0.toFixed(2) + ' puis ' + r.e1.toFixed(2) + ' m)');
    ok(r.carte >= 512 && r.carte <= 2048, 'Carte d\'ombre d\'Amélioré (pas celle de la Haute définition) : ' + r.carte);
  });

  test('Robot, style Actuel : ni ombres ni effets, jambes sans ombre', () => {
    exiger(); reset();
    let r;
    try {
      r = J(new Function(depart + '; return (' + function(){
        __style.styleSet('actuel'); depart();
        for (var i = 0; i < 5; i++) visuals(1 / 30);
        var sun = world.children.find(function(c){ return c.isDirectionalLight; });
        return { ici: __style.styleIci(), moteur: renderer.shadowMap.enabled, soleil: !!(sun && sun.castShadow), rendu: __style.styleRendu(), orig: __style.STY.orig.length,
          jambes: typeof __habitacle !== 'object' || __habitacle.hbJ.children.every(function(m){ return !m.isMesh || !m.castShadow; }) };
      } + ')();'));
    } finally { fin(); }
    ok(!r.ici && !r.moteur && !r.soleil && r.rendu === false, 'Rien d\'Amélioré en Actuel : ' + JSON.stringify(r));
    egal(r.orig, 0, 'Pas de matériaux d\'Amélioré en Actuel');
    ok(r.jambes, 'Jambes sans ombre en Actuel');
  });

  test('Robot, Haute définition choisie : Amélioré dans le robot, dit dans la Pause ; retour au toit en Haute définition', () => {
    exiger(); reset();
    let r;
    try {
      r = J(new Function(depart + '; return (' + function(){
        var o = {};
        __style.styleSet('hd'); depart();
        for (var i = 0; i < 5; i++) visuals(1 / 30);
        o.hd = __style.styleHD(); o.pref = __style.styleHDPref(); o.ici = __style.styleIci(); o.rendu = __style.styleRendu();
        o.mats = typeof __styleHD === 'object' ? __styleHD.HD.mats.length : 0;
        o.env = scene.environment === null;
        mechPause(); visuals(1 / 30);
        var b = document.getElementById('mkStyle'); o.btn = b ? b.textContent : null;
        o.ordre = b ? b.nextElementSibling && /Quitter/.test(b.nextElementSibling.textContent) : false;
        mechResume();
        __mech.mechQuit(); visuals(1 / 30);
        o.hd2 = __style.styleHD(); o.toit2 = __style.styleToit(); o.btnToit = document.getElementById('btnStyle').textContent;
        o.orig2 = __style.STY.orig.length;
        return o;
      } + ')();'));
    } finally { fin(); }
    ok(r.pref && !r.hd && r.ici, 'Haute définition choisie, Amélioré dans le robot : ' + JSON.stringify([r.pref, r.hd, r.ici]));
    egal(r.mats, 0, 'Pas de matériaux physiques dans le robot');
    ok(r.env, 'Pas de lumière HDR dans le robot');
    ok(r.rendu === true, 'Rendu Amélioré dans le robot');
    ok(/Haute définition/.test(r.btn || '') && /Amélioré dans le robot/.test(r.btn || ''), 'Bouton Style de la Pause du robot : ' + r.btn);
    ok(r.ordre, 'Le bouton Style est juste avant « Quitter le robot »');
    ok(r.hd2 && r.toit2 && r.orig2 > 20, 'De retour au toit : Haute définition et rue habillée');
    egal(r.btnToit, 'Style : Haute définition', 'Bouton du toit sans la mention du robot');
  });

  test('Robot, style Amélioré : pas de fuite de mémoire sur 10 rues de suite', () => {
    exiger(); reset();
    let r;
    try {
      r = J(new Function(depart + '; return (' + function(){
        __style.styleSet('ameliore'); depart();
        var M = __mech.MECH, m = [];
        for (var k = 0; k < 11; k++){
          if (k){ M.street++; S.wave = M.street; __mech.mechStreet(false); }
          for (var i = 0; i < 2; i++) visuals(1 / 30);
          __style.styleRendu(); renderer.render(scene, camera);
          m.push([renderer.info.memory.textures, renderer.info.memory.geometries]);
        }
        return m;
      } + ')();'));
    } finally { fin(); }
    const t = r.map(x => x[0]), g = r.map(x => x[1]);
    // Les rues tournent sur 5 villes et les monstres créent leurs textures à leur première sortie : on compare la même
    // ville à un tour d'écart (rues 6 et 11), une fois tout créé. Une vraie fuite ajouterait une rue entière à chaque rue.
    ok(t[10] - t[5] <= 8, 'Textures stables d\'un tour de villes à l\'autre : ' + t.join(', '));
    ok(g[10] - g[5] <= 15, 'Géométries stables d\'un tour de villes à l\'autre : ' + g.join(', '));
  });

  test('Style Amélioré dans le RTS (dossier 118, js/72-rts-style.js) ; le toit garde son style après', () => {
    exiger(); if (lire('typeof __rts === "object" && typeof __rts.rtsStart === "function"') !== true) ignorer('RTS absent'); reset();
    let r;
    try {
      r = J(function(){
        __style.styleSet('ameliore'); __rts.rtsStart();
        for (var i = 0; i < 3; i++) visuals(1 / 30);
        var o = { ici: __style.styleIci(), rendu: __style.styleRendu(), moteur: renderer.shadowMap.enabled };
        __rts.rtsQuit(); visuals(1 / 30);
        o.toit = __style.styleToit(); o.rendu2 = __style.styleRendu(); o.moteur2 = renderer.shadowMap.enabled;
        return o;
      });
    } finally { J(function(){ if (__rts.RTS.on) __rts.rtsQuit(); __style.styleSet('actuel'); }); }
    ok(r.ici && r.rendu === true && r.moteur, 'RTS avec le style (dossier 118) : ' + JSON.stringify(r));
    ok(r.toit && r.rendu2 === true && r.moteur2, 'De retour au toit : Amélioré');
  });
})();
