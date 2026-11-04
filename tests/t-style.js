'use strict';
/* Tests du style graphique (js/57-graphismes.js, js/58-graphismes-hd.js) : Actuel, Amélioré, Haute définition */
(function(){
  if (typeof test !== 'function' || typeof TESTS === 'undefined') return;
  const ex = () => { if (lire('typeof __style === "object"') !== true) ignorer('Style absent (js/57-graphismes.js)'); };

  test('Style : bouton dans Pause, Actuel par défaut, choix sauvegardé', () => {
    ex(); reset();
    const r = J(function(){
      var b = document.getElementById('btnStyle'), o = { btn: !!b && !!b.closest('#scrPause'), p0: __style.STY.pref };
      __style.styleSet('actuel'); b.click(); o.apres = __style.STY.pref; o.sauve = store.get('dt_style', null); o.txt = b.textContent;
      b.click(); o.hd = __style.STY.pref; o.txtHd = b.textContent;
      b.click(); o.retour = __style.STY.pref;
      __style.styleSet('nimporte'); o.mauvais = __style.STY.pref;
      return o;
    });
    ok(r.btn, 'Bouton Style absent de Pause');
    egal(r.p0, 'actuel', 'Style par défaut');
    egal(r.apres, 'ameliore', 'Un clic passe à Amélioré');
    egal(r.sauve, 'ameliore', 'Choix sauvegardé (dt_style)');
    ok(/Amélioré/.test(r.txt), 'Libellé : ' + r.txt);
    egal(r.hd, 'hd', 'Deuxième clic : Haute définition');
    ok(/Haute définition/.test(r.txtHd), 'Libellé : ' + r.txtHd);
    egal(r.retour, 'actuel', 'Troisième clic : retour à Actuel');
    egal(r.mauvais, 'actuel', 'Valeur inconnue ramenée à Actuel');
  });

  test('Style Amélioré : textures, vraies ombres, effets d\'image ; Actuel remet tout comme avant', () => {
    ex(); reset(); J('startLocation(0)');
    const r = J(function(){
      var o = {}, mats = [];
      world.traverse(function(m){ if (m.isMesh) mats.push([m, m.material]); });
      __style.styleSet('ameliore');
      var fac = 0, tex = 0, ombre = 0;
      world.traverse(function(m){ if (!m.isMesh) return; if (m.material.emissiveMap && m.material.map && m.material.map.image.width === 256) fac++; if (m.material.map && m.material.map.userData && m.material.map.userData.style) tex++; if (m.castShadow) ombre++; });
      var sun = world.children.find(function(c){ return c.isDirectionalLight; });
      visuals(1 / 30);
      o.fac = fac; o.tex = tex; o.ombre = ombre; o.soleil = !!(sun && sun.castShadow); o.moteur = renderer.shadowMap.enabled;
      o.rendu = __style.styleRendu(); o.casse = __style.STY.casse;
      o.taches = typeof gfxShadows !== 'undefined' ? gfxShadows.visible : false;
      __style.styleSet('actuel');
      visuals(1 / 30);
      o.pareil = mats.every(function(p){ return p[0].material === p[1]; });
      o.soleil2 = !!(sun && sun.castShadow); o.moteur2 = renderer.shadowMap.enabled; o.rendu2 = __style.styleRendu();
      return o;
    });
    ok(r.fac >= 10, 'Façades redessinées en double définition : ' + r.fac);
    ok(r.tex >= 10, 'Textures dessinées (asphalte, trottoir, crasse...) : ' + r.tex);
    ok(r.ombre >= 50 && r.soleil && r.moteur, 'Ombres : objets ' + r.ombre + ', soleil ' + r.soleil + ', moteur ' + r.moteur);
    ok(r.rendu === true && !r.casse, 'Effets d\'image (éclat, lissage, couleurs) dessinés');
    egal(r.taches, false, 'Les taches sous les zombies laissent la place aux vraies ombres');
    ok(r.pareil, 'Actuel : les matériaux d\'origine sont remis');
    ok(!r.soleil2 && !r.moteur2 && r.rendu2 === false, 'Actuel : plus d\'ombres ni d\'effets');
  });

  test('Style Amélioré : une nouvelle rue est habillée aussi, sans erreur ; pas d\'effets hors du toit', () => {
    ex(); reset();
    const r = J(function(){
      __style.styleSet('ameliore');
      startLocation(1);
      var o = { n: __style.STY.orig.length, L: __style.STY.L && __style.STY.L.id };
      startLocation(0); o.n2 = __style.STY.orig.length;
      for (var i = 0; i < 20; i++){ visuals(1 / 30); update(1 / 30); }
      o.zOmbre = typeof zInstRoot === 'undefined' || zInstRoot.children.every(function(c){ return c.castShadow; });
      o.toit = __style.styleToit();
      __style.styleSet('actuel');
      return o;
    });
    ok(r.n > 20 && r.n2 > 20, 'Rues habillées : ' + r.n + ' et ' + r.n2);
    egal(r.L, 'ville', 'La rue habillée est la nouvelle (Val-des-Cendres)');
    ok(r.zOmbre, 'Les zombies projettent une ombre');
    ok(r.toit, 'Style actif sur le toit');
  });
})();
(function(){
  if (typeof test !== 'function' || typeof TESTS === 'undefined') return;
  test('Style Amélioré : bouton en haut de la pause ; qualité basse = ombres moins fines et pas d\'éclat', () => {
    if (lire('typeof __style === "object" && typeof __gfx === "object"') !== true) ignorer('Style ou rendu absent');
    reset(); J('startLocation(0)');
    const r = J(function(){
      var pan = document.querySelector('#scrPause .panel'), o = { haut: pan.querySelector('h2').nextElementSibling.id }, p0 = __gfx.GFX.pref;
      __style.styleSet('ameliore');
      __gfx.gfxSet('bas'); for (var i = 0; i < 10; i++) visuals(1 / 30); __style.styleRendu();
      var sun = world.children.find(function(c){ return c.isDirectionalLight; });
      o.carteBas = sun.shadow.mapSize.x; o.eclatBas = __style.STY.bloom ? __style.STY.bloom.enabled : null;
      __gfx.gfxSet('moyen'); for (i = 0; i < 10; i++) visuals(1 / 30); __style.styleRendu();
      o.carteMoy = sun.shadow.mapSize.x; o.eclatMoy = __style.STY.bloom ? __style.STY.bloom.enabled : null;
      __style.styleSet('actuel'); __gfx.gfxSet(p0);
      return o;
    });
    egal(r.haut, 'btnStyle', 'Le bouton Style est juste sous le titre Pause');
    egal(r.carteBas, 512, 'Carte d\'ombre en qualité basse');
    egal(r.eclatBas, false, 'Pas d\'éclat en qualité basse');
    egal(r.carteMoy, 1024, 'Carte d\'ombre en qualité moyenne');
    egal(r.eclatMoy, true, 'Éclat en qualité moyenne');
  });
})();

/* Haute définition (séance 1 : la lumière) */
(function(){
  if (typeof test !== 'function' || typeof TESTS === 'undefined') return;
  test('Style Haute définition : matériaux physiques, lumière HDR, ACES et SSAO ; retour à Amélioré et Actuel sans trace', async () => {
    if (lire('typeof __style === "object" && typeof __styleHD === "object"') !== true) ignorer('Haute définition absente (js/58-graphismes-hd.js)');
    reset(); J('startLocation(0)');
    J(function(){ window.__hdMats = []; world.traverse(function(m){ if (m.isMesh) __hdMats.push([m, m.material]); }); __style.styleSet('hd'); });
    await J('__styleHD.styleHDCharger()');
    await J('__styleHD.HD.envProm || null');
    const r = J(function(){
      var H = __styleHD.HD, o = { pret: H.pret, casse: H.casse, env: !!H.env };
      var std = 0, rel = 0, vitres = 0;
      world.traverse(function(m){ if (!m.isMesh || !m.material.isMeshStandardMaterial) return; std++; if (m.material.normalMap && m.material.roughnessMap) rel++; if (m.material.emissiveMap) vitres++; });
      o.std = std; o.rel = rel; o.vitres = vitres;
      for (var i = 0; i < 3; i++) visuals(1 / 30);
      o.cielAv = scene.fog.color.getHex(); o.rendu = __style.styleRendu(); o.casse2 = H.casse;
      o.envSur = scene.environment === H.env && !!H.env;
      o.ssao = !!(H.ssao && (H.ssao.enabled || __gfx.gfxLevel() === 'bas'));
      o.ciel = scene.fog.color.getHex(); // les couleurs sont remises en sRGB après le dessin
      var sun = world.children.find(function(c){ return c.isDirectionalLight; });
      o.carte = sun.shadow.mapSize.x; o.niv = __gfx.gfxLevel(); o.touch = isTouch;
      o.enc = H.tex.size;
      __style.styleSet('ameliore'); visuals(1 / 30); __style.styleRendu();
      o.lambert = 0; world.traverse(function(m){ if (m.isMesh && m.material.isMeshStandardMaterial) o.lambert++; });
      o.enc2 = H.tex.size; o.envOff = scene.environment === null;
      __style.styleSet('actuel'); visuals(1 / 30);
      o.pareil = __hdMats.every(function(p){ return p[0].material === p[1]; });
      return o;
    });
    ok(r.pret && !r.casse, 'Morceaux de Three.js chargés (lib/three-hd.js)');
    ok(r.env, 'Image HDR chargée et filtrée (hdri/)');
    ok(r.std >= 40 && r.rel >= 40, 'Matériaux physiques avec relief et rugosité : ' + r.std + ' / ' + r.rel);
    ok(r.vitres >= 10, 'Façades physiques (vitres allumées) : ' + r.vitres);
    ok(r.rendu === true && !r.casse2, 'Rendu HDR (SSAO, éclat, ACES, FXAA) dessiné sans erreur');
    ok(r.envSur && r.ssao, 'Lumière d\'ambiance HDR posée et ombres de contact actives');
    ok(r.enc > 0, 'Textures de couleur lues en sRGB : ' + r.enc);
    if (r.niv === 'haut' && !r.touch) egal(r.carte, 4096, 'Carte d\'ombre 4096 en Haute définition (ordi, qualité haute)');
    egal(r.lambert, 0, 'Retour à Amélioré : plus de matériaux physiques');
    ok(r.enc2 === 0 && r.envOff, 'Retour à Amélioré : textures et lumière remises comme avant');
    ok(r.pareil, 'Actuel : les matériaux d\'origine sont remis');
    egal(r.ciel, r.cielAv, 'Couleurs remises en sRGB après le dessin (brume)');
  });
})();

/* Haute définition, séance 2 (sans téléchargement) : lampadaires de nuit */
(function(){
  if (typeof test !== 'function' || typeof TESTS === 'undefined') return;
  test('Style Haute définition : la nuit, les lampadaires éclairent la rue et projettent des ombres ; tout part en quittant le style', async () => {
    if (lire('typeof __styleHD === "object" && typeof __styleHD.styleHDNuit === "function"') !== true) ignorer('Lampadaires HD absents');
    reset(); J('startLocation(2)'); J("ambSet('nuitClaire', true)");
    J("__style.styleSet('hd')"); await J('__styleHD.styleHDCharger()');
    const r = J(function(){
      var N = __styleHD.HD.nuit, o = {};
      __styleHD.styleHDNuit();
      o.lum = N.lum.length; o.ombres = N.lum.filter(function(l){ return l.castShadow; }).length; o.cones = N.cones.length;
      o.dansRue = N.lum.every(function(l){ return l.parent === world; });
      o.eteintes = AMB.lamps.length === 0 || AMB.lamps.every(function(l){ return l.intensity === 0; });
      for (var i = 0; i < 3; i++) visuals(1 / 30);
      o.rendu = __style.styleRendu();
      __style.styleSet('ameliore'); __styleHD.styleHDNuit();
      o.lum2 = N.lum.length; o.rallumees = AMB.lamps.every(function(l){ return l.intensity > 0; });
      __style.styleSet('actuel');
      return o;
    });
    ok(r.lum >= 8 && r.cones === r.lum, 'Projecteurs et cônes de brume : ' + r.lum + ' / ' + r.cones);
    ok(r.ombres >= 2 && r.ombres <= 4, 'Ombres des lampadaires les plus proches : ' + r.ombres);
    ok(r.dansRue && r.eteintes, 'Projecteurs dans la rue, lampes rondes d\'origine éteintes');
    ok(r.rendu === true, 'Rendu de nuit sans erreur');
    egal(r.lum2, 0, 'Retour à Amélioré : projecteurs retirés');
    ok(r.rallumees, 'Retour à Amélioré : lampes d\'origine rallumées');
  });
})();

/* Haute définition, séance 2 : décor (autos détaillées, fils, débris) */
(function(){
  if (typeof test !== 'function' || typeof TESTS === 'undefined') return;
  test('Style Haute définition : autos détaillées, fils électriques et débris ; retirés en quittant le style', async () => {
    if (lire('typeof __decor === "object" && typeof __styleHD === "object"') !== true) ignorer('Décor HD absent (js/59-graphismes-decor.js)');
    reset(); J('startLocation(0)');
    J("__style.styleSet('hd')"); await J('__styleHD.styleHDCharger()');
    const r = J(function(){
      var D = __decor.DECOR, o = {};
      __decor.decorMaj();
      o.n = D.objets.length; o.caches = D.caches.length; o.inst = D.objets.filter(function(x){ return x.isInstancedMesh; }).length;
      o.fils = D.objets.filter(function(x){ return x.geometry && x.geometry.type === 'TubeGeometry'; }).length;
      o.autos = 0; world.traverse(function(g){ if (g.userData && g.userData.auto) o.autos++; });
      for (var i = 0; i < 3; i++) visuals(1 / 30);
      o.rendu = __style.styleRendu();
      startLocation(1); __decor.decorMaj(); o.autreRue = D.monde === world && D.objets.length > 0;
      __style.styleSet('ameliore'); __decor.decorMaj();
      o.apres = D.objets.length; o.roues = true; world.traverse(function(g){ if (g.userData && g.userData.auto) for (var k = 2; k < 6; k++) if (g.children[k] && !g.children[k].visible) o.roues = false; });
      __style.styleSet('actuel');
      return o;
    });
    ok(r.autos >= 3 && r.caches >= r.autos * 4, 'Roues d\'origine remplacées sur les ' + r.autos + ' autos');
    egal(r.inst, 6, 'Six sortes de débris en instances');
    ok(r.fils >= 10, 'Fils électriques : ' + r.fils);
    ok(r.n > 100, 'Pièces de décor ajoutées : ' + r.n);
    ok(r.rendu === true, 'Rendu sans erreur');
    ok(r.autreRue, 'Une nouvelle rue reçoit son décor');
    ok(r.apres === 0 && r.roues, 'Retour à Amélioré : décor retiré, roues d\'origine remises');
  });
})();

/* Haute définition, séance 3 : zombies détaillés, sang au sol, flou en visant */
(function(){
  if (typeof test !== 'function' || typeof TESTS === 'undefined') return;
  test('Style Haute définition : zombies physiques, sang au sol, flou de profondeur en visant ; tout part en quittant le style', async () => {
    if (lire('typeof __zhd === "object" && typeof __styleHD === "object"') !== true) ignorer('Zombies HD absents (js/60-graphismes-zombies.js)');
    reset(); J('startLocation(0)'); J('__t.geler()');
    J("__style.styleSet('hd')"); await J('__styleHD.styleHDCharger()');
    const r = J(function(){
      var Z = __zhd.ZHD, o = {};
      var a = __t.placer('walker', 0, -20), b = __t.placer('walker', 2, -25);
      for (var i = 0; i < 3; i++) visuals(1 / 30);
      o.std = zInstRoot.children.filter(function(im){ return im.material && im.material.isMeshStandardMaterial && im.material.userData.zhd; }).length;
      o.lam = zInstRoot.children.filter(function(im){ return im.visible && im.material && im.material.type === 'MeshLambertMaterial'; }).length;
      kill(a, false, a.g.position.clone()); kill(b, true, b.g.position.clone());
      o.sang = Z.sang ? Z.sang.count : 0; o.sangRue = !!Z.sang && Z.sang.parent === world;
      Z.forceVise = 1; visuals(1 / 30); o.rendu = __style.styleRendu(); o.dof = !!Z.dof && Z.dof.enabled;
      Z.forceVise = 0; visuals(1 / 30); o.dof0 = !!Z.dof && Z.dof.enabled; Z.forceVise = null;
      startLocation(1); visuals(1 / 30); o.propre = !Z.sang || Z.sang.count === 0 || Z.sang.parent !== world;
      __style.styleSet('ameliore'); visuals(1 / 30);
      o.apres = zInstRoot.children.filter(function(im){ return im.material && im.material.userData.zhd; }).length;
      __style.styleSet('actuel');
      return o;
    });
    ok(r.std >= 3, 'Zombies en matériaux physiques : ' + r.std + ' lots');
    egal(r.lam, 0, 'Plus aucun lot de zombies visible en Lambert');
    ok(r.sang === 2 && r.sangRue, 'Une flaque de sang par zombie tombé : ' + r.sang);
    ok(r.rendu === true && r.dof, 'Flou de profondeur actif en visant');
    egal(r.dof0, false, 'Pas de flou sans viser');
    ok(r.propre, 'Nouvelle rue : sol propre');
    egal(r.apres, 0, 'Retour à Amélioré : zombies d\'origine');
  });
})();

