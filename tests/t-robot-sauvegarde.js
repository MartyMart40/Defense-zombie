'use strict';
/* Tests de la sauvegarde de la course du robot (js/50-robot-sauvegarde.js) */
(function(){
  if (typeof test !== 'function' || typeof TESTS === 'undefined') return;
  const exiger = () => { if (lire('typeof __mechSave === "object" && typeof __mechSave.mechResumeRun === "function"') !== true) ignorer('Sauvegarde du robot absente (js/50-robot-sauvegarde.js)'); };
  const fin = () => J(function(){ if (MECH.on) mechQuit(); __mechSave.mechSaveClear(); });

  test('Robot sauvegarde : gardé au début de chaque rue, repris au début de la même rue', () => {
    exiger(); reset({ mech:{ unlocked:true } });
    const r = J(function(){
      var o = {}; P.mech = P.mech || {}; P.mech.unlocked = true; __mechSave.mechSaveClear();
      mechStart(); o.rue1 = !!__mechSave.mechSaveGet() && __mechSave.mechSaveGet().street === 1;
      MECH.street = 3; mechStreet(false); MECH.kills = 42; S.bar = 777; __mechSave.mechSave();
      var bm = S.barMax; mechQuit();
      var b = document.getElementById('btnMechGo'); o.bouton = !!b && !b.classList.contains('hide') && /rue 3/.test(b.textContent);
      b.click();
      o.etat = state; o.rue = MECH.street; o.bar = Math.round(S.bar); o.barMax = S.barMax === bm; o.kills = MECH.kills; o.pow = Math.abs(MECH.pow - 2.4 * Math.pow(1.16, 2)) < 1e-6;
      mechOver(); o.efface = !__mechSave.mechSaveGet();
      mechQuit(); o.cache = document.getElementById('btnMechGo').classList.contains('hide');
      return o;
    });
    fin();
    ok(r.rue1, 'Sauvé dès la rue 1'); ok(r.bouton, 'Bouton Continuer le robot (rue 3)');
    egal(r.etat, 'mech', 'État après la reprise'); egal(r.rue, 3, 'Rue reprise'); egal(r.bar, 777, 'Blindage gardé'); ok(r.barMax, 'Blindage maximum gardé');
    egal(r.kills, 42, 'Zombies abattus gardés'); ok(r.pow, 'Force des armes de la rue 3');
    ok(r.efface, 'Effacé quand le robot est détruit'); ok(r.cache, 'Plus de bouton Continuer');
  });

  test('Robot sauvegarde : une nouvelle course efface l’ancienne, sauvegarde abîmée ignorée', () => {
    exiger(); reset({ mech:{ unlocked:true } });
    const r = J(function(){
      var o = {}; P.mech = P.mech || {}; P.mech.unlocked = true;
      localStorage.setItem('dt_mech_partie', JSON.stringify({ v:1, street:5, bar:100, barMax:2000, kills:9 }));
      mechStart(); o.neuve = __mechSave.mechSaveGet().street === 1; mechQuit();
      localStorage.setItem('dt_mech_partie', JSON.stringify({ v:9, street:'x' })); __mechSave.mechSaveBtn();
      o.abime = __mechSave.mechSaveGet() === null && document.getElementById('btnMechGo').classList.contains('hide');
      return o;
    });
    fin();
    ok(r.neuve, 'Une nouvelle course repart à la rue 1'); ok(r.abime, 'Sauvegarde abîmée ignorée');
  });
})();
