'use strict';
/* ================= Mesure des sons du RTS (tâche 115) ================= */
// Rend hors ligne (OfflineAudioContext, toute la chaîne de sortie de Snd, volume au maximum) chaque son du RTS,
// quelques sons du toit pour comparer, puis un scénario chargé (40 unités et 4 tourelles qui tirent 6 s, vues de haut).
// Écrit la table : crête, RMS le plus fort sur 50 ms (« court »), même chose après un passe-haut à 300 Hz (« cell »), en dBFS.
// Usage :
//   python3 -m http.server 8766        (à la racine du dépôt, dans un autre terminal)
//   node outils/mesure-sons-rts.js [adresse]      (défaut http://localhost:8766/)
const { chromium } = require('playwright');

(async () => {
  const url = process.argv[2] || 'http://localhost:8766/';
  const b = await chromium.launch();
  const p = await b.newPage();
  const erreurs = [];
  p.on('pageerror', e => erreurs.push(e.message));
  await p.goto(url);
  await p.waitForFunction(() => typeof __rtsSons === 'object' && typeof Snd === 'object');
  const r = await p.evaluate(async () => {
    Snd.init(); if (!Snd.ctx) return { erreur: 'pas d’audio' };
    return await __rtsSons.mesurer();
  });
  await b.close();
  if (r.erreur){ console.log(r.erreur); process.exit(1); }
  const pad = (s, n) => (String(s) + ' '.repeat(n)).slice(0, n);
  console.log(pad('Son', 40) + pad('Groupe', 9) + pad('Crête', 8) + pad('Court', 8) + 'Cell');
  r.sons.forEach(s => console.log(pad(s.nom, 40) + pad(s.groupe, 9) + pad(s.pic, 8) + pad(s.court, 8) + s.cell));
  const sc = r.scenario;
  console.log('\nScénario chargé (40 unités, 4 tourelles, 6 s) : crête ' + sc.pic + ' dBFS, court ' + sc.court + ' dBFS, cell ' + sc.cell
    + ' dBFS, limiteur actif ' + sc.actif + ' % du temps, voix du RTS au pire ' + sc.voixMax + ' (plafond ' + sc.cap + '), voix de Snd au pire ' + sc.sndMax);
  if (erreurs.length) console.log('Erreurs de la page : ' + erreurs.join(' | '));
})();
