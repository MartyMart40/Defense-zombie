'use strict';
/* Lance toute la suite de tests dans Chromium (Playwright) et affiche le résultat.
   Usage : node outils/lancer-tests.js [adresse] [filtre]
     adresse : où le jeu est servi (défaut http://localhost:8765/), par exemple après « python3 -m http.server 8765 »
     filtre  : ne lance que les tests dont le nom contient ce mot
   Code de sortie : 0 si tout passe, 1 sinon (utilisé par GitHub Actions, .github/workflows/tests.yml). */
const { chromium } = require('playwright');
const base = (process.argv[2] || 'http://localhost:8765/').replace(/\/?$/, '/');
const filtre = process.argv[3] || '';
(async () => {
  const opts = { args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] };
  if (process.env.CHROMIUM_PATH) opts.executablePath = process.env.CHROMIUM_PATH;
  const b = await chromium.launch(opts);
  const p = await b.newPage();
  const erreurs = [];
  p.on('pageerror', e => erreurs.push(e.message));
  await p.goto(base + 'tests/' + (filtre ? '?filtre=' + encodeURIComponent(filtre) : ''));
  const t0 = Date.now();
  let r = null;
  while (Date.now() - t0 < 15 * 60 * 1000){
    r = await p.evaluate(() => window.RESULTATS && window.RESULTATS.fini ? window.RESULTATS : null);
    if (r) break;
    await new Promise(s => setTimeout(s, 3000));
  }
  await b.close();
  if (!r){ console.log('Les tests n’ont pas fini à temps (15 min).'); process.exit(1); }
  const echecs = r.echecs || [], ignores = r.ignores || [];
  console.log('Tests : ' + r.reussis + ' réussis sur ' + r.total + ', ' + echecs.length + ' échec(s), ' + ignores.length + ' ignoré(s), en ' + Math.round((Date.now() - t0) / 1000) + ' s');
  echecs.forEach(e => console.log('ÉCHEC : ' + e.nom + '\n  ' + String(e.detail).split('\n').slice(0, 4).join('\n  ')));
  if (erreurs.length) console.log('Erreurs de la page de tests : ' + erreurs.slice(0, 5).join(' | '));
  process.exit(echecs.length || !r.total ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
