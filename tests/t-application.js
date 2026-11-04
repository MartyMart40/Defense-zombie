'use strict';
/* Tests de l'application installable (manifest.webmanifest, sw.js, js/46-application.js) */
(function(){
  if (typeof test !== 'function' || typeof TESTS === 'undefined') return;
  const exiger = () => { if (lire('typeof __app === "object" && typeof __app.appRegister === "function"') !== true) ignorer('Application installable absente (js/46-application.js)'); };

  test('Application : manifeste complet (nom, plein écran, icônes qui existent)', async () => {
    exiger();
    const lien = J(function(){ var l = document.querySelector('link[rel="manifest"]'); return l ? l.getAttribute('href') : null; });
    egal(lien, 'manifest.webmanifest', 'Lien vers le manifeste');
    const rep = await fetch('../manifest.webmanifest', { cache:'no-store' });
    ok(rep.ok, 'Manifeste introuvable (HTTP ' + rep.status + ')');
    const m = await rep.json();
    egal(m.name, 'Dernier toit', 'Nom'); egal(m.lang, 'fr', 'Langue');
    ok(m.display === 'fullscreen' || m.display === 'standalone', 'Affichage : ' + m.display);
    const tailles = (m.icons || []).map(i => i.sizes).join(',');
    ok(/192x192/.test(tailles) && /512x512/.test(tailles), 'Icônes 192 et 512 : ' + tailles);
    ok((m.icons || []).some(i => i.purpose === 'maskable'), 'Icône « maskable » (Android)');
    for (const i of m.icons){ const r = await fetch('../' + i.src, { cache:'no-store' }); ok(r.ok, 'Icône introuvable : ' + i.src); }
  });

  test('Application : service worker présent, jamais enregistré dans la page de tests', async () => {
    exiger();
    const rep = await fetch('../sw.js', { cache:'no-store' });
    ok(rep.ok, 'sw.js introuvable');
    const txt = await rep.text();
    ok(/addEventListener\('fetch'/.test(txt) && /caches/.test(txt), 'sw.js doit répondre aux requêtes avec le cache');
    ok(/\/tests\//.test(txt), 'sw.js doit laisser passer la page de tests');
    const r = J(function(){ return { enreg: __app.appRegister(), btn: !!document.getElementById('btnInstall'), cache: document.getElementById('btnInstall').classList.contains('hide') }; });
    egal(r.enreg, false, 'Enregistré dans l’iframe des tests');
    ok(r.btn && r.cache, 'Le bouton Installer existe et reste caché tant que le navigateur ne le propose pas');
  });

  test('Application : « Comment jouer » explique comment installer', () => {
    exiger();
    const t = J(function(){ return document.getElementById('ctrlHelp').textContent; });
    ok(/Installer/.test(t), 'Aide : ' + t.slice(-120));
  });
})();
