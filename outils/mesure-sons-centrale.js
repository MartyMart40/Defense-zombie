'use strict';
/* ================= Mesure des sons de la Centrale (dossier 123) ================= */
// Rend hors ligne (OfflineAudioContext, toute la chaîne de sortie de Snd, son au maximum) chaque son de la Centrale
// (js/76-centrale-sons.js), quelques sons du toit pour comparer, puis le pire cas réaliste (le Cœur et ses 3 transformateurs,
// fond, Geiger au plus fort, une flaque qui ronge, battements rapides, tirs absorbés), sans et avec le fusil d'assaut qui tire.
// Table : crête, court (RMS le plus fort sur 50 ms), moyen (RMS de la partie qui s'entend), cell (court après un passe-haut
// à 300 Hz), en dBFS.
// Usage :
//   python3 -m http.server 8767        (à la racine du dépôt, dans un autre terminal)
//   node outils/mesure-sons-centrale.js [adresse]      (défaut http://localhost:8767/)
const { chromium } = require('playwright');

(async () => {
  const url = process.argv[2] || 'http://localhost:8767/';
  const b = await chromium.launch();
  const p = await b.newPage();
  const erreurs = [];
  p.on('pageerror', e => erreurs.push(e.message));
  await p.goto(url);
  await p.waitForFunction(() => typeof __centraleSons === 'object' && typeof Snd === 'object');
  const r = await p.evaluate(async () => {
    Snd.init(); if (!Snd.ctx) return { erreur: 'pas d’audio' };
    const res = await __centraleSons.mesurer();
    res.journal = (window.JOURNAL || []).map(e => String(e.msg || e.message || e)).slice(0, 5);
    return res;
  });
  await b.close();
  if (r.erreur){ console.log(r.erreur); process.exit(1); }
  const pad = (s, n) => (String(s) + ' '.repeat(n)).slice(0, n);
  console.log(pad('Son', 48) + pad('Groupe', 9) + pad('Crête', 8) + pad('Court', 8) + pad('Moyen', 8) + 'Cell');
  r.sons.forEach(s => console.log(pad(s.nom, 48) + pad(s.groupe, 9) + pad(s.pic, 8) + pad(s.court, 8) + pad(s.moyen, 8) + s.cell));
  const l = (nom, m) => console.log(pad(nom, 57) + pad(m.pic, 8) + pad(m.court, 8) + pad(m.moyen, 8) + m.cell);
  console.log('');
  l('Fusil d’assaut seul, 8 coups/s pendant 4 s', r.mix.arme);
  l('Pire cas de la Centrale, sans arme', r.mix.sansArme);
  l('Pire cas de la Centrale, avec le fusil d’assaut', r.mix.avecArme);
  if (r.journal && r.journal.length) console.log('JOURNAL : ' + r.journal.join(' | '));
  if (erreurs.length) console.log('Erreurs de la page : ' + erreurs.join(' | '));
})();
