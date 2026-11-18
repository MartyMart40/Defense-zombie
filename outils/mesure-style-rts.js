'use strict';
/* ================= Mesure du style Amélioré dans le RTS (dossier 118) ================= */
// Une vraie bataille (30 unités mélangées et 5 tourelles contre 300 zombies gardés à 300, hasard fixé), vue de haut puis
// en pilotant un tank, en Actuel puis en Amélioré, au format cell (915 x 412, tactile) et ordi (1600 x 900).
// Pour chaque cas : temps par image (code + dessin, le dessin attendu jusqu'au bout), appels de dessin, triangles.
// Avec un dossier en 2e argument : des captures d'écran (base, bataille, nid, Ruche, siège, tank, Apache).
// Usage :
//   python3 -m http.server 8766        (à la racine du dépôt, dans un autre terminal)
//   node outils/mesure-style-rts.js [adresse] [dossier des captures] [cell|ordi]
//   MESURE=0 : seulement les captures ; STYLES=actuel,ameliore ; PILOTE0=10 PILOTE=20 : images en pilotant (mise en route, mesure) ; SUIVI=1
// Le rendu se fait sans carte graphique (Chromium, SwiftShader) : comparer les cas entre eux, pas avec un vrai téléphone.
const { chromium } = require('playwright');
const path = require('path');

const URL = process.argv[2] || 'http://localhost:8766/';
const CAPT = process.argv[3] || '';
const SEUL = process.argv[4] || '';
const FORMATS = [
  { nom:'cell', viewport:{ width:915, height:412 }, hasTouch:true, isMobile:true, deviceScaleFactor:1 },
  { nom:'ordi', viewport:{ width:1600, height:900 }, hasTouch:false, isMobile:false, deviceScaleFactor:1 }
].filter(f => !SEUL || f.nom === SEUL);

// Dans la page : boucle du jeu arrêtée (on fait les images nous-mêmes), hasard fixé
const INIT = `(function(){ let s = 777; Math.random = function(){ s = s * 16807 % 2147483647; return (s - 1) / 2147483646; };
  window.requestAnimationFrame = function(){ return 0; }; })();`;

async function page(b, f){
  const ctx = await b.newContext({ viewport:f.viewport, hasTouch:f.hasTouch, isMobile:f.isMobile, deviceScaleFactor:f.deviceScaleFactor });
  const p = await ctx.newPage();
  await p.addInitScript(INIT);
  const fermer = p.close.bind(p); p.close = async () => { await fermer().catch(() => {}); await ctx.close().catch(() => {}); };
  p.on('pageerror', e => console.log('  (erreur dans la page : ' + e.message + ')'));
  await p.goto(URL, { waitUntil:'networkidle', timeout:120000 });
  await p.waitForFunction(() => typeof __rts === 'object' && typeof __style === 'object', null, { timeout:120000 });
  await p.evaluate(() => {
    window.__img = function(dt){
      visuals(dt);
      renderer.clear();
      if (!(typeof styleRendu === 'function' && styleRendu())) renderer.render(scene, camera);
      renderer.clearDepth(); renderer.render(vmScene, vmCam);
      const gl = renderer.getContext(); gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(4)); // attendre le dessin (sinon la file du processeur graphique grossit sans fin)
    };
    // Bataille : 30 unités, 5 tourelles, 300 zombies devant la base
    window.__bataille = function(style){
      __style.styleSet(style);
      __rts.rtsStart(); if (typeof __amb === 'object') __amb.set('clair'); // même météo partout (comparaison)
      const R = __rts.RTS; S.money = 1e8; plan.maxAlive = 500;
      const types = ['rifle', 'rifle', 'rifle', 'rifle', 'gunner', 'gunner', 'gunner', 'sniper', 'sniper', 'flamebot', 'flamebot', 'rocket', 'rocket', 'rocket', 'heavy', 'heavy', 'heavy',
        'tank', 'tank', 'tank', 'heli', 'heli', 'jet', 'warthog', 'mech', 'bomber', 'rifle', 'gunner', 'heavy', 'tank'];
      types.forEach((t, i) => { const u = __rts.rtsSpawnUnit(t, -20 + (i % 10) * 4.4, -14 - Math.floor(i / 10) * 5); u.tx = u.g.position.x; u.tz = u.g.position.z; });
      [['t_mg', -16, -22], ['t_flame', -6, -24], ['t_cannon', 4, -24], ['t_mortar', 12, -20], ['t_tesla', 20, -18]].forEach(q => rtsPlaceBld(q[0], q[1], q[2], true));
      __rts.rtsSpawnAt(0, -62, 300, 26);
      R.cam.x = 0; R.cam.z = -34; R.cam.h = 56; R.hordeT = 1e9;
      for (let i = 0; i < 10; i++) __img(1 / 30);
    };
    window.__garder = function(){ const n = zAliveCount(); if (n < 300) __rts.rtsSpawnAt(0, -66, 300 - n, 26); };
    // Mesure par petits morceaux (une longue tâche sans pause fait grossir la mémoire de la page jusqu'à la faire tomber)
    window.__M = null;
    window.__mesurer = function(n, cumul){
      const gl = renderer.getContext(), px = new Uint8Array(4), info = renderer.info;
      info.autoReset = false;
      const M = cumul && window.__M ? window.__M : (window.__M = { n:0, t:0, calls:0, tri:0, tc:0 });
      let t = 0, calls = 0, tri = 0, tc = 0;
      for (let i = 0; i < n; i++){
        __garder();
        info.reset();
        const t0 = performance.now();
        visuals(1 / 30);
        const t1 = performance.now();
        renderer.clear();
        if (!(typeof styleRendu === 'function' && styleRendu())) renderer.render(scene, camera);
        renderer.clearDepth(); renderer.render(vmScene, vmCam);
        gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px); // attendre la fin du dessin
        t += performance.now() - t0; tc += t1 - t0; calls += info.render.calls; tri += info.render.triangles;
      }
      info.autoReset = true;
      M.n += n; M.t += t; M.tc += tc; M.calls += calls; M.tri += tri; n = M.n; t = M.t; tc = M.tc; calls = M.calls; tri = M.tri;
      return { ms:+(t / n).toFixed(1), code:+(tc / n).toFixed(1), appels:Math.round(calls / n), tri:Math.round(tri / n), zombies:zAliveCount(), unites:__rts.RTS.units.length,
        mem:[renderer.info.memory.textures, renderer.info.memory.geometries] };
    };
  });
  return p;
}

(async () => {
  const b = await chromium.launch({ args:['--js-flags=--stack-size=984'] }); // repère pour suivre la mémoire de la page (ps)
  const lignes = [];
  for (const f of FORMATS){
    for (const style of process.env.MESURE === '0' ? [] : (process.env.STYLES ? process.env.STYLES.split(',') : ['actuel', 'ameliore', 'actuel', 'ameliore'])){ // deux fois chaque style, en alternance (la machine varie)
      // Une page neuve pour chaque mesure. En pilotant, la mémoire de la page grossit de 10 à 30 Mo par image sous
      // SwiftShader (aussi en Actuel, déjà avant le dossier 118) : la mesure du tank est plus courte (20 images)
      let p = await page(b, f);
      const mes = async n => { let r = null; for (let k = 0; k < n; k += 5){ r = await p.evaluate(c => __mesurer(5, c), k > 0); if (process.env.SUIVI) console.log('  ', k, r.ms, r.appels); } return r; };
      await p.evaluate(s => __bataille(s), style);
      await mes(20); // mise en route (shaders)
      const haut = await mes(90);
      await p.close(); p = await page(b, f);
      await p.evaluate(s => __bataille(s), style);
      await p.evaluate(() => { const u = __rts.RTS.units.find(x => x.type === 'tank' && !x.dead); if (u) __rts.rtsPilot(u); });
      await mes(+(process.env.PILOTE0 || 10));
      const pil = await mes(+(process.env.PILOTE || 20));
      lignes.push([f.nom, style, 'de haut', haut], [f.nom, style, 'tank', pil]);
      console.log(f.nom, style, 'de haut', JSON.stringify(haut));
      console.log(f.nom, style, 'tank   ', JSON.stringify(pil));
      await p.close();
    }
    if (CAPT) await captures(b, f);
  }
  await b.close();
})();

// Chaque groupe de captures dans une page neuve (une longue suite de batailles finit par manquer de mémoire)
async function captures(b, f){
  const tank = "const R = __rts.RTS, u = R.units.find(x => x.type === 'tank' && !x.dead); __rts.rtsPilot(u); R.pv.fire = true; for (let i = 0; i < 30; i++){ __garder(); __img(1 / 30); } R.pv.fire = false;";
  const apache = "const R = __rts.RTS, u = R.units.find(x => x.type === 'heli' && !x.dead); __rts.rtsPilot(u); R.pv.fire = true; for (let i = 0; i < 30; i++){ __garder(); __img(1 / 30); } R.pv.fire = false;";
  for (const style of ['actuel', 'ameliore']){
    const groupes = [
      [['base', "const R = __rts.RTS; __rts.rtsStart(); if (typeof __amb === 'object') __amb.set('clair'); R.hordeT = 1e9; R.cam.x = 0; R.cam.z = isTouch ? -2 : -10; for (let i = 0; i < 20; i++) __img(1 / 30);"],
       ['bataille', "__rts.rtsQuit(); __bataille(STYLE); for (let i = 0; i < 40; i++){ __garder(); __img(1 / 30); }"],
       ['nid', "const R = __rts.RTS, n = R.nests.find(x => !x.dead && !x.ruche); R.cam.x = n.x; R.cam.z = n.z + 4; R.cam.h = 40; for (let i = 0; i < 6; i++) __img(1 / 30);"],
       ['ruche', "const R = __rts.RTS; if (!R.ruche) rtsRucheSpawn(30, -120); R.cam.x = R.ruche.x; R.cam.z = R.ruche.z + 6; R.cam.h = 56; for (let i = 0; i < 6; i++) __img(1 / 30);"],
       ['siege', "const R = __rts.RTS; R.cam.h = 64; const e = rtsSiegeGo(); if (e){ __rts.rtsSpawnAt(e[0], e[1], 120, 12); R.cam.x = clamp(e[0] * .6, -60, 60); R.cam.z = e[1] * .6; } for (let i = 0; i < 60; i++) __img(1 / 30);"]],
      [['tank', "__bataille(STYLE); for (let i = 0; i < 20; i++){ __garder(); __img(1 / 30); } " + tank]],
      [['apache', "__bataille(STYLE); for (let i = 0; i < 20; i++){ __garder(); __img(1 / 30); } " + apache]]
    ];
    for (const g of groupes){
      const p = await page(b, f);
      await p.evaluate(s => { if (typeof rtsTipsStop === 'function') rtsTipsStop(); __style.styleSet(s); }, style);
      for (const [nom, code] of g){
        await p.evaluate(c => (new Function(c))(), 'const STYLE = "' + style + '"; ' + code);
        const fic = path.join(CAPT, f.nom + '-' + style + '-' + nom + '.png');
        if (nom === 'tank' || nom === 'apache'){ // en pilotant, la capture de la page reste bloquée sous SwiftShader : on prend l'image du canevas
          const url = await p.evaluate(() => { __img(1 / 30); return renderer.domElement.toDataURL('image/png'); });
          require('fs').writeFileSync(fic, Buffer.from(url.split(',')[1], 'base64'));
        } else await p.screenshot({ path:fic, timeout:180000 });
      }
      await p.close();
    }
  }
}
