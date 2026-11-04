'use strict';
/* Tests du tutoriel du toit (js/53-tutoriel.js) */
(function(){
  if (typeof test !== 'function' || typeof TESTS === 'undefined') return;
  const exiger = () => { if (lire('typeof __tuto === "object"') !== true) ignorer('Tutoriel absent (js/53-tutoriel.js)'); };
  const vis = 'function vis(){ return !document.getElementById("tuTip").classList.contains("hide"); }';

  test('Tutoriel : proposé à un nouveau joueur, Oui montre les étapes une à une, Passer arrête tout', () => {
    exiger(); reset();
    const r = J(new Function(vis + `
      var T = __tuto, o = {}; delete P.tuto; P.tutoVu = []; T.TU.t = 0; T.TU.cur = null; T.TU.offre = false;
      startLocation(0); __t.geler();
      T.tuStep(1); o.pasTout = !vis();
      T.tuStep(1); o.offre = vis() && /Première partie/.test(document.getElementById('tuTxt').textContent);
      var oui = [].slice.call(document.querySelectorAll('#tuBtns button')).filter(function(b){ return b.textContent === 'Oui'; })[0]; oui.click();
      o.enCours = P.tuto === 'en cours' && !vis();
      T.tuStep(1.5); o.e1 = T.TU.cur && T.TU.cur.id === 'viser' && vis();
      document.querySelector('#tuBtns button').click(); T.tuStep(3.5); o.attend = !vis();
      T.tuStep(3); o.e2 = T.TU.cur && T.TU.cur.id === 'tirer';
      var passer = [].slice.call(document.querySelectorAll('#tuBtns button')).filter(function(b){ return /Passer/.test(b.textContent); })[0]; passer.click();
      o.fini = P.tuto === 'fait' && !vis(); T.TU.gap = 0; T.tuStep(5); o.rien = !vis();
      gameOver(); return o;
    `));
    ok(r.pasTout, 'Pas de bulle dès la première seconde'); ok(r.offre, 'Offre « Première partie ? »');
    ok(r.enCours, 'Oui lance le tutoriel'); ok(r.e1, 'Première étape : viser'); ok(r.attend, 'La suivante attend quelques secondes');
    ok(r.e2, 'Deuxième étape : tirer'); ok(r.fini && r.rien, 'Passer le tutoriel arrête tout');
  });

  test('Tutoriel : jamais proposé à un joueur qui a déjà joué ; Non merci ; Revoir', () => {
    exiger(); reset();
    const r = J(new Function(vis + `
      var T = __tuto, o = {};
      delete P.tuto; P.xp = 500; P.level = 4; o.vieux = !T.tuOffre();
      P.xp = 0; P.level = 1; P.wins = {}; o.neuf = T.tuOffre() && vis();
      var non = [].slice.call(document.querySelectorAll('#tuBtns button')).filter(function(b){ return /Non/.test(b.textContent); })[0]; non.click();
      o.non = P.tuto === 'non' && !vis() && !T.tuOffre();
      var b = document.getElementById('btnTuto'); o.btn = !!b && !!b.closest('#aideJeu'); b.click(); o.revoir = P.tuto === 'en cours' && T.tuVu().length === 0;
      // la bulle de la boutique s'en va quand la vague repart
      startLocation(0); __t.geler(); P.tutoVu = ['viser','tirer','recharger','barricade']; T.TU.gap = 0; T.TU.cur = null;
      state = 'shop'; S.wave = 1; T.tuStep(.1); o.boutique = T.TU.cur && T.TU.cur.id === 'boutique';
      state = 'playing'; T.tuStep(.1); o.part = !vis();
      gameOver(); P.tuto = 'fait'; return o;
    `));
    ok(r.vieux, 'Pas d’offre pour un joueur qui a déjà joué'); ok(r.neuf, 'Offre pour un nouveau joueur');
    ok(r.non, 'Non merci : plus jamais proposé'); ok(r.btn && r.revoir, 'Revoir le tutoriel dans Comment jouer');
    ok(r.boutique, 'Bulle de la boutique'); ok(r.part, 'Elle s’en va quand la vague repart');
  });
})();
