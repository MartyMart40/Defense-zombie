'use strict';
/* Tests de l'affichage au cell : Three.js local, écran titre, menu du RTS repliable, sol plat sous la base */
(function(){
  if (typeof test !== 'function' || typeof TESTS === 'undefined') return;

  test('Chargement : Three.js r128 vient de la copie locale (lib/three.min.js)', () => {
    const r = J(function(){
      var tags = [].slice.call(document.querySelectorAll('script[src]')).map(function(s){ return s.getAttribute('src'); });
      return { local: tags.some(function(s){ return /^lib\/three\.min\.js/.test(s); }), rev: typeof THREE === 'object' ? THREE.REVISION : null,
        avant: tags.findIndex(function(s){ return /three\.min\.js/.test(s); }) < tags.findIndex(function(s){ return /js\/00-base/.test(s); }) };
    });
    ok(r.local, 'Pas de balise pour lib/three.min.js');
    egal(r.rev, '128', 'Version de Three.js');
    ok(r.avant, 'Three.js doit être chargé avant les fichiers du jeu');
  });

  test('Écran titre : l’aide est repliée sous « Comment jouer », les trois modes viennent avant', () => {
    reset();
    const r = J(function(){
      var d = document.getElementById('aideJeu'), aide = document.getElementById('ctrlHelp');
      var o = { details: !!d && d.tagName === 'DETAILS', ferme: !!d && !d.open, dedans: !!d && !!aide && d.contains(aide), plein: !!aide && aide.innerHTML.length > 50 };
      var avant = function(id){ var b = document.getElementById(id); return !!b && !!d && !!(b.compareDocumentPosition(d) & Node.DOCUMENT_POSITION_FOLLOWING); };
      o.modes = avant('btnStart') && (typeof mechBtn !== 'function' || avant('btnMech')) && (typeof __rts !== 'object' || avant('btnRts'));
      o.titre = d ? d.querySelector('summary').textContent : '';
      return o;
    });
    ok(r.details, 'Pas de bloc repliable #aideJeu'); ok(r.ferme, 'L’aide doit être repliée au départ');
    ok(r.dedans && r.plein, 'L’aide des commandes doit être dans le bloc repliable');
    ok(r.modes, 'Jouer, Robot de combat et Guerre des robots doivent venir avant l’aide');
    egal(r.titre, 'Comment jouer', 'Titre du bloc');
  });

  test('RTS : le menu du bas se replie et se rouvre, le choix est gardé', () => {
    if (lire('typeof __rts === "object" && typeof __rts.rtsFold === "function"') !== true) ignorer('Menu repliable absent');
    reset();
    const r = J(function(){
      __rts.rtsStart(); var o = {};
      var vis = function(id){ var e = document.getElementById(id); return !!e && getComputedStyle(e).display !== 'none'; };
      o.ouvert0 = vis('rtBar') && vis('rtTabs');
      document.getElementById('rtFold').click();
      o.ferme = !vis('rtBar') && vis('rtFold') && store.get('dt_rtsFold', null) === true;
      o.onglet = [].slice.call(document.querySelectorAll('#rtTabs button[data-tab]')).every(function(b){ return getComputedStyle(b).display === 'none'; });
      o.txt = document.getElementById('rtFold').textContent;
      __rts.rtsQuit(); __rts.rtsStart(); o.garde = !vis('rtBar');
      document.getElementById('rtFold').click(); o.rouvert = vis('rtBar') && store.get('dt_rtsFold', null) === false;
      __rts.rtsQuit();
      return o;
    });
    ok(r.ouvert0, 'Le menu doit être ouvert au départ');
    ok(r.ferme && r.onglet, 'Replié : la rangée de boutons et les onglets doivent être cachés, le bouton Menu visible');
    ok(/Menu/.test(r.txt), 'Bouton replié : ' + r.txt);
    ok(r.garde, 'Le menu replié doit le rester à la partie suivante');
    ok(r.rouvert, 'Le menu doit se rouvrir');
  });

  test('RTS : le sable est plat sous toute la base (rien ne passe par-dessus la dalle)', () => {
    if (lire('typeof __rts === "object" && typeof __rts.rtsStart === "function"') !== true) ignorer('Mode RTS absent');
    reset();
    const r = J(function(){
      __rts.rtsStart(); var R = __rts.RTS, padY = R.pad.position.y, haut = 0, n = 0;
      world.children.forEach(function(m){
        if (!m.isMesh || !m.geometry || m.geometry.type !== 'PlaneGeometry') return;
        var p = m.geometry.attributes.position;
        for (var i = 0; i < p.count; i++){ var x = p.getX(i), z = p.getZ(i) + m.position.z; if (Math.hypot(x, z) <= 70){ n++; haut = Math.max(haut, p.getY(i) + m.position.y); } }
      });
      __rts.rtsQuit();
      return { padY: padY, haut: haut, n: n, flat: __rts.RTS_FLAT_R };
    });
    ok(r.n > 20, 'Points du sable trouvés sous la base : ' + r.n);
    ok(r.haut < r.padY, 'Le sable monte à ' + r.haut + ' sous la base, la dalle est à ' + r.padY);
    ok(r.flat >= 70, 'Rayon plat trop petit : ' + r.flat);
  });
})();
