'use strict';
/* Journal des erreurs cachées (errNote, js/00-base.js) : à la fin de la suite, aucune erreur de programmation
   ne doit avoir été avalée par un try/catch du jeu. Ce fichier est chargé en DERNIER dans tests/index.html. */
(function(){
  if (typeof test !== 'function' || typeof TESTS === 'undefined') return;

  test('Journal : errNote garde les erreurs de programmation et ignore les refus du navigateur', () => {
    if (lire('typeof errNote === "function"') !== true) ignorer('Journal absent (js/00-base.js)');
    const r = J(function(){
      var n0 = JOURNAL.length, o = {};
      o.type = errNote(new TypeError('essai du journal'));
      o.dom = errNote(new DOMException('refus', 'NotAllowedError'));
      o.json = (function(){ try { JSON.parse('{abîmé'); } catch (e) { return errNote(e); } })();
      o.garde = JOURNAL.length === n0 + 1 && /essai du journal/.test(JOURNAL[JOURNAL.length - 1]);
      JOURNAL.splice(n0); // on retire l'essai
      return o;
    });
    ok(r.type === true && r.garde, 'Une TypeError doit être gardée');
    ok(r.dom === false, 'Un refus du navigateur est ignoré'); ok(r.json === false, 'Une sauvegarde illisible est ignorée');
  });

  test('Journal : aucune erreur cachée pendant les tests', () => {
    if (lire('typeof JOURNAL === "object"') !== true) ignorer('Journal absent (js/00-base.js)');
    const j = J('JOURNAL.slice()');
    ok(j.length === 0, j.length + ' erreur(s) cachée(s) :\n' + j.join('\n'));
  });
})();
