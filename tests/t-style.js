'use strict';
/* Tests du style graphique (js/57-graphismes.js) : Actuel et Amélioré */
(function(){
  if (typeof test !== 'function' || typeof TESTS === 'undefined') return;
  const ex = () => { if (lire('typeof __style === "object"') !== true) ignorer('Style absent (js/57-graphismes.js)'); };

  test('Style : bouton dans Pause, Actuel par défaut, choix sauvegardé', () => {
    ex(); reset();
    const r = J(function(){
      var b = document.getElementById('btnStyle'), o = { btn: !!b && !!b.closest('#scrPause'), p0: __style.STY.pref };
      __style.styleSet('actuel'); b.click(); o.apres = __style.STY.pref; o.sauve = store.get('dt_style', null); o.txt = b.textContent;
      b.click(); o.retour = __style.STY.pref;
      __style.styleSet('nimporte'); o.mauvais = __style.STY.pref;
      return o;
    });
    ok(r.btn, 'Bouton Style absent de Pause');
    egal(r.p0, 'actuel', 'Style par défaut');
    egal(r.apres, 'ameliore', 'Un clic passe à Amélioré');
    egal(r.sauve, 'ameliore', 'Choix sauvegardé (dt_style)');
    ok(/Amélioré/.test(r.txt), 'Libellé : ' + r.txt);
    egal(r.retour, 'actuel', 'Deuxième clic : retour à Actuel');
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
