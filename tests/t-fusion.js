'use strict';
/* =====================================================================
   Tests du décor fusionné (js/03-scene-fusion.js, dossier 120) : appels de dessin, même hasard,
   barricade suivie, halos des lampadaires, pas de fuite.
   À charger APRÈS tests.js dans tests/index.html :
     <script src="t-fusion.js"></script>
   ===================================================================== */
(function(){
  if (typeof test !== 'function' || typeof TESTS === 'undefined') return;
  const avant = TESTS.length;
  const exiger = () => { if (lire('typeof FUSION === "object" && typeof fusionMonde === "function"') !== true) ignorer('Décor fusionné absent (js/03-scene-fusion.js)'); };
  // Appels de dessin de la scène, rue vide, en regardant devant (comme t-toit-decor.js)
  const OUTILS = function(){
    if (window.__tfus) return;
    window.__tfus = {
      appels: function(i){
        startLocation(i); clearZombies(); state = 'menu'; yaw = 0; pitch = -.16; camera.rotation.set(pitch, yaw, 0); camera.updateMatrixWorld();
        visuals(1 / 30); renderer.render(scene, camera); return renderer.info.render.calls;
      }
    };
  };
  // Plafonds en Actuel, rue vide, dans la page de tests (dossier 120 : 72, 77, 78, 84, 58 et 65, plus une marge ;
  // sans la fusion : 159, 144, 163, 152, 143 et 100). La Centrale avait déjà son décor fusionné (dossier 117) : 25 % de moins suffit.
  const PLAFOND = [85, 90, 90, 96, 72, 78];

  test('Décor fusionné : appels de dessin sous le plafond dans chaque ville, au moins 35 % de moins qu’avant', () => {
    exiger(); reset(); J(OUTILS);
    const r = J(function(){
      var avantSt = __style.STY.pref, out = [];
      __style.styleSet('actuel');
      for (var i = 0; i < LOCS.length; i++){
        FUSION.on = false; var sans = __tfus.appels(i);
        FUSION.on = true; var avec = Math.min(__tfus.appels(i), __tfus.appels(i), __tfus.appels(i)); // le décor tiré au hasard fait varier le compte : le plus petit de 3 rues
        out.push({ ville: LOCS[i].name, sans: sans, avec: avec });
      }
      __style.styleSet(avantSt); FUSION.on = true; state = 'menu';
      return out;
    });
    r.forEach((o, i) => {
      ok(o.avec <= PLAFOND[i], o.ville + ' : ' + o.avec + ' appels de dessin (plafond ' + PLAFOND[i] + ')');
      const k = i === 5 ? .75 : .65;
      ok(o.avec <= o.sans * k, o.ville + ' : ' + o.avec + ' appels avec la fusion, ' + o.sans + ' sans (au moins ' + Math.round(100 - k * 100) + ' % de moins)');
    });
  });

  test('Décor fusionné : même hasard qu’avant la fusion, rien de fusionné parmi les cibles', () => {
    exiger(); reset();
    const r = J(function(){
      var tire = function(on, i){ FUSION.on = on; return __t.graine(31, function(){ startLocation(i); return [Math.random(), Math.random()].join(','); }); };
      var out = [];
      // Dans une même page, la première rue de chaque sorte crée des choses une seule fois (caches) : on bâtit d'abord
      // chaque ville avec et sans fusion, puis on compare (l'égalité dans des pages neuves est vérifiée par outils/mesure-perf.js)
      for (var i = 0; i < LOCS.length; i++){ tire(false, i); tire(true, i); out.push(tire(false, i) === tire(true, i)); }
      FUSION.on = true;
      var cibles = 0; hitMeshes.forEach(function(m){ if (m.userData && (m.userData.fusion || m.userData.fixe)) cibles++; });
      var fus = 0; world.traverse(function(o){ if (o.userData.fusion) fus++; });
      return { pareil: out, cibles: cibles, fus: fus };
    });
    r.pareil.forEach((p, i) => ok(p, 'Ville ' + i + ' : le hasard après buildWorld change avec la fusion'));
    egal(r.cibles, 0, 'Pièces fusionnées parmi les cibles (hitMeshes)');
    ok(r.fus >= 5, 'Maillages fusionnés dans la rue : ' + r.fus);
  });

  test('Décor fusionné : la barricade fusionnée suit les planches qui penchent et tombent (js/68)', () => {
    exiger(); reset();
    if (lire('typeof __toitDecor === "object"') !== true) ignorer('Décor du toit absent (js/68)');
    const r = J(function(){
      startLocation(0); clearZombies(); state = 'menu';
      var g = world.children.find(function(o){ return o.userData && o.userData.barricade; });
      var copies = FUSION.bar.length, orig = g.children.filter(function(o){ return o.userData.bouge; });
      var caches = orig.every(function(o){ return !o.layers.test(camera.layers); });
      var somme = function(){ var s = 0; FUSION.bar.forEach(function(B){ var a = B.m.geometry.attributes.position.array; for (var i = 0; i < a.length; i++) s += Math.abs(a[i]); }); return s; };
      renderer.render(scene, camera); var s0 = somme();
      __toitDecor.tdBarricadeEtat(.1); renderer.render(scene, camera); var s2 = somme();
      var manque = orig.filter(function(o){ return !o.visible; }).length;
      __toitDecor.tdBarricadeEtat(1); renderer.render(scene, camera); var s3 = somme();
      return { copies: copies, n: orig.length, caches: caches, s0: s0, s2: s2, s3: s3, manque: manque };
    });
    ok(r.copies >= 2, 'Copies fusionnées des planches et poteaux : ' + r.copies);
    ok(r.n >= 20 && r.caches, 'Planches et poteaux d’origine hors de la couche dessinée : ' + r.n);
    ok(r.manque >= 2 && r.s2 < r.s0, 'Planches tombées : la copie doit changer (' + r.manque + ' manquent)');
    ok(Math.abs(r.s3 - r.s0) < 1e-3 * r.s0, 'Barricade réparée : la copie revient comme avant');
  });

  test('Décor fusionné : halos et lumière de nuit des lampadaires, pas de fuite sur 8 rues', () => {
    exiger(); reset();
    const r = J(function(){
      startLocation(0);
      var halos = gfxHalos.filter(function(h){ return h.userData.on; }).length, tetes = world.userData.tetes.length, heads = AMB.heads.length;
      var geo = [];
      for (var k = 0; k < 8; k++){ startLocation(k % 3); visuals(1 / 30); renderer.render(scene, camera); geo.push(renderer.info.memory.geometries); }
      return { halos: halos, tetes: tetes, heads: heads, geo: geo };
    });
    egal(r.tetes, 12, 'Têtes de lampadaires gardées à Saint-Clou');
    egal(r.halos, 12, 'Halos posés sur les lampadaires');
    egal(r.heads, 1, 'Matériau des têtes trouvé par js/22 (allumé la nuit)');
    // Le décor tiré au hasard fait varier le compte : le plus bas des dernières rues ne doit pas dépasser le plus bas des premières
    const a = Math.min.apply(null, r.geo.slice(0, 3)), b = Math.min.apply(null, r.geo.slice(5));
    ok(b <= a + 5, 'Géométries en mémoire : ' + r.geo.join(', '));
  });

  const ajoutes = TESTS.splice(avant);
  const iErr = TESTS.findIndex(t => t.nom.indexOf('Erreurs') === 0);
  TESTS.splice(iErr < 0 ? TESTS.length : iErr, 0, ...ajoutes);
})();
