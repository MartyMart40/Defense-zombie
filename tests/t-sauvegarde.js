'use strict';
/* Tests de la sauvegarde dans un fichier (js/32-sauvegarde.js) */
(function(){
  if (typeof test !== 'function' || typeof TESTS === 'undefined') return;
  const exiger = () => { if (lire('typeof __sauv === "object" && typeof __sauv.savCheck === "function"') !== true) ignorer('Sauvegarde dans un fichier absente (js/32-sauvegarde.js)'); };

  test('Sauvegarde : le fichier contient tout le profil (tourelles, améliorations) et les réglages', () => {
    exiger(); reset();
    const r = J(function(){
      P.level = 7; P.scrap = 1234; P.slots = [{ type:'turret', paid:250, lv:{ dmg:2, rate:1, range:0, spec:0 } }, null, null, null]; saveP();
      store.set('dt_sens', 1.4);
      var d = __sauv.savCollect(), relu = JSON.parse(d.cles.dt_prof);
      return { jeu: d.jeu, v: d.version, date: !!d.date, niv: relu.level, scrap: relu.scrap, tour: relu.slots[0] && relu.slots[0].type, lv: relu.slots[0] && relu.slots[0].lv.dmg,
        sens: d.cles.dt_sens, autres: Object.keys(d.cles).every(function(k){ return k.indexOf('dt_') === 0; }), resume: __sauv.savSummary(P), check: __sauv.savCheck(JSON.stringify(d)).ok };
    });
    egal(r.jeu, 'dernier-toit', 'Marque du jeu'); egal(r.v, 1, 'Version'); ok(r.date, 'Date absente');
    egal(r.niv, 7, 'Niveau'); egal(r.scrap, 1234, 'Ferraille'); egal(r.tour, 'turret', 'Tourelle'); egal(r.lv, 2, 'Amélioration de la tourelle');
    egal(r.sens, '1.4', 'Réglage de visée'); ok(r.autres, 'Clés hors du jeu dans le fichier');
    ok(/Niveau 7/.test(r.resume) && /1 défense/.test(r.resume), 'Résumé : ' + r.resume);
    ok(r.check, 'Le fichier produit doit être accepté au chargement');
  });

  test('Sauvegarde : charger un fichier remplace la progression et garde l’ancienne de côté', () => {
    exiger(); reset();
    const r = J(function(){
      P.level = 3; saveP(); store.set('dt_fps', true);
      var f = { jeu:'dernier-toit', version:1, date:'2026-11-03T12:00:00Z', cles:{ dt_prof: JSON.stringify({ level:12, unlocked:4, scrap:900, slots:[{ type:'mortar' }, null, null, null] }), dt_music:'0.3' } };
      var c = __sauv.savCheck(JSON.stringify(f)), ok1 = __sauv.savApply(c.data);
      var o = { ok: c.ok && ok1, niv: JSON.parse(localStorage.getItem('dt_prof')).level, mus: localStorage.getItem('dt_music'), fps: localStorage.getItem('dt_fps') };
      var av = JSON.parse(localStorage.getItem(__sauv.SAV_AVANT)); o.avant = JSON.parse(av.cles.dt_prof).level;
      localStorage.removeItem(__sauv.SAV_AVANT);
      return o;
    });
    reset();
    ok(r.ok, 'Chargement refusé');
    egal(r.niv, 12, 'Niveau chargé'); egal(r.mus, '0.3', 'Réglage chargé');
    egal(r.fps, null, 'Une clé absente du fichier doit disparaître');
    egal(r.avant, 3, 'Ancienne sauvegarde gardée de côté');
  });

  test('Sauvegarde : un mauvais fichier est refusé sans rien toucher', () => {
    exiger(); reset();
    const r = J(function(){
      var avant = localStorage.getItem('dt_prof');
      var cas = ['pas du json', JSON.stringify({ jeu:'autre', cles:{ dt_prof:'{}' } }), JSON.stringify({ jeu:'dernier-toit', cles:{} }),
        JSON.stringify({ jeu:'dernier-toit', cles:{ autre_cle:'1' } }), JSON.stringify({ jeu:'dernier-toit', cles:{ dt_prof:'{abîmé' } })];
      return { refus: cas.map(function(t){ var c = __sauv.savCheck(t); return !c.ok && !!c.err; }), pareil: localStorage.getItem('dt_prof') === avant };
    });
    r.refus.forEach((x, i) => ok(x, 'Mauvais fichier n° ' + (i + 1) + ' accepté'));
    ok(r.pareil, 'La sauvegarde a changé');
  });

  test('Sauvegarde : bouton sur l’écran titre et écran avec Enregistrer, Charger et Retour', () => {
    exiger(); reset();
    const r = J(function(){
      showScreen('scrTitle'); var b = document.getElementById('btnSaveTitle'); if (b) b.click();
      var o = { btn: !!b, vu: __t.visible('scrSave'), titreCache: !__t.visible('scrTitle'), now: (document.getElementById('savNow') || {}).textContent || '',
        exp: !!document.getElementById('btnSaveExport'), imp: !!document.getElementById('btnSaveImport'), file: (document.getElementById('savFile') || {}).type };
      var back = document.getElementById('btnSaveBack'); if (back) back.click();
      o.retour = __t.visible('scrTitle') && !__t.visible('scrSave');
      return o;
    });
    ok(r.btn, 'Bouton Sauvegarde absent'); ok(r.vu && r.titreCache, 'Écran Sauvegarde pas affiché');
    ok(/Niveau/.test(r.now), 'Résumé de la sauvegarde actuelle : ' + r.now);
    ok(r.exp && r.imp, 'Boutons Enregistrer et Charger'); egal(r.file, 'file', 'Sélecteur de fichier');
    ok(r.retour, 'Retour à l’écran titre');
  });
})();
