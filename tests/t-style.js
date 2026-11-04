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
