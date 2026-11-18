'use strict';
/* ================= Horloge et hasard fixés pour le simulateur ================= */
// Injecté par outils/sim-page.js AVANT le premier script du jeu (page.addInitScript), jamais chargé par index.html.
// But : le même banc donne le même résultat d'un lancement à l'autre, même si la machine est chargée.
// Le jeu lit l'heure réelle à plusieurs endroits sans effet sur les règles, mais ces lectures décident parfois s'il
// pioche ou non dans Math.random (ex. un son de douille sauté s'il y en a eu un il y a moins d'une seconde : brTink,
// brKill, brVoix dans js/37-bruitages.js ; le nombre de chiffres de dégâts selon le coût mesuré : pknAdapt dans
// js/31-punch.js). Une pioche de plus ou de moins décale tout le hasard qui suit : la partie change.
// Ici, tout ce qui donne l'heure suit le temps simulé (window.__SIM_T, en secondes, avancé par SIM.horloge) :
//   performance.now, Date.now et new Date() sans argument, AudioContext.currentTime.
// Le hasard du chargement de la page est fixé (graine 4242) ; SIM.hasard(graine) le refixe ensuite pour chaque partie.
// La boucle du jeu (requestAnimationFrame) ne part jamais : c'est le simulateur qui fait avancer le temps.
(function(){
  let s = 4242;
  Math.random = function(){ s = s * 16807 % 2147483647; return (s - 1) / 2147483646; };
  window.__SIM_T = 0;
  const T0 = Date.UTC(2026, 0, 1, 12); // date fixe (le défi du jour, s'il est lu, est toujours le même)
  const ms = () => (window.__SIM_T || 0) * 1000;
  try { Object.defineProperty(performance, 'now', { value: () => 1000 + ms(), configurable: true, writable: true }); } catch (e) {}
  const D = Date;
  function DateSim(){
    if (!(this instanceof DateSim)) return new D(T0 + ms()).toString();
    const a = Array.prototype.slice.call(arguments);
    return a.length ? new (Function.prototype.bind.apply(D, [null].concat(a)))() : new D(T0 + ms());
  }
  DateSim.prototype = D.prototype; DateSim.UTC = D.UTC; DateSim.parse = D.parse; DateSim.now = () => T0 + ms();
  window.Date = DateSim;
  try {
    const BA = window.BaseAudioContext || window.AudioContext;
    if (BA) Object.defineProperty(BA.prototype, 'currentTime', { get: () => ms() / 1000, configurable: true });
  } catch (e) {}
  window.requestAnimationFrame = () => 0;
  window.cancelAnimationFrame = () => {};
})();
