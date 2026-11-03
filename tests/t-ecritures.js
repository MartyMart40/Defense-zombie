'use strict';
/* Tests des écritures en colonne à gauche (js/33-ecritures.js) */
(function(){
  if (typeof test !== 'function' || typeof TESTS === 'undefined') return;
  const exiger = () => { if (lire('typeof __ecr === "object" && typeof __ecr.ecrPush === "function"') !== true) ignorer('Écritures à gauche absentes (js/33-ecritures.js)'); };
  test('Écritures : les textes du jeu vont dans la colonne de gauche, plus au-dessus du viseur', () => {
    exiger(); reset(); J('startLocation(0)');
    const r = J(function(){
      __ecr.ecrClear();
      var p = new THREE.Vector3(0, 1.5, -20), avant = document.getElementById('floats').childElementCount;
      floatText('+15 $', p, false); weakText('Point faible !', p); rueFloat('Baril ! +3', p, '#ffb040', true);
      var box = document.getElementById('ecrFeed'), els = box ? Array.prototype.slice.call(box.children) : [];
      var rc = els.map(function(e){ return e.getBoundingClientRect(); });
      var o = { n: els.length, txt: els.map(function(e){ return e.textContent; }), floats: document.getElementById('floats').childElementCount - avant,
        gauche: rc.every(function(b){ return b.left < innerWidth * .3; }), loinDuViseur: rc.every(function(b){ return b.right < innerWidth / 2 - 20; }), col: els[0] ? els[0].style.color : '' };
      floatText('Tête !', p, true); floatText('Tête !', p, true);
      o.groupe = box.children[0].textContent;
      for (var i = 0; i < 12; i++) floatText('Texte ' + i, p);
      o.max = box.querySelectorAll('.ecr:not(.out)').length; o.cap = __ecr.ECR_MAX;
      showScreen('scrTitle'); o.vide = box.children.length;
      return o;
    });
    egal(r.n, 3, 'Lignes dans la colonne');
    egal(r.txt[0], 'Baril ! +3', 'Le plus récent en haut');
    egal(r.floats, 0, 'Plus aucun texte au point d’impact');
    ok(r.gauche && r.loinDuViseur, 'Colonne à gauche, loin du viseur');
    ok(/176|255/.test(r.col) || r.col !== '', 'Couleur du texte gardée : ' + r.col);
    egal(r.groupe, 'Tête ! ×2', 'Textes répétés regroupés');
    ok(r.max <= r.cap, 'Trop de lignes : ' + r.max);
    egal(r.vide, 0, 'Colonne vidée hors partie');
  });
})();
