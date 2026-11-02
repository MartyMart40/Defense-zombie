'use strict';
/* ================= Performance : rendu de la foule et compteur d'images par seconde ================= */
// Le rendu par instances des zombies (07-zombies.js) est recopié juste avant chaque rendu, à la fin de visuals().
// Compteur d'images/s : option de l'écran Pause, sauvegardée (dt_fps), désactivée par défaut.
let perfFps = !!store.get('dt_fps', false);
let fpsEl = null, fpsN = 0, fpsT0 = 0, fpsVal = 0;
function fpsShow(){
  if (!fpsEl){
    fpsEl = document.createElement('div'); fpsEl.id = 'fpsBox';
    fpsEl.style.cssText = 'position:fixed;left:6px;bottom:6px;z-index:30;pointer-events:none;padding:2px 6px;border-radius:4px;'
      + 'background:rgba(0,0,0,.55);color:#f2e6cc;font:600 12px/1.3 ui-monospace,Consolas,monospace;';
    document.body.appendChild(fpsEl);
  }
  fpsEl.style.display = perfFps ? '' : 'none';
}
function fpsTick(){
  if (!perfFps) return;
  const t = performance.now(); fpsN++;
  if (!fpsT0) fpsT0 = t;
  if (t - fpsT0 >= 500){
    fpsVal = fpsN * 1000 / (t - fpsT0); fpsN = 0; fpsT0 = t;
    let n = 0; for (let i = 0; i < zombies.length; i++) if (!zombies[i].dead) n++;
    if (fpsEl) fpsEl.textContent = Math.round(fpsVal) + ' i/s · ' + n + ' zombies';
  }
}
function syncFpsBtn(){ const b = $('btnFps'); if (b) b.textContent = 'Images par seconde : ' + (perfFps ? 'affichées' : 'cachées'); }
function setFps(on){ perfFps = !!on; store.set('dt_fps', perfFps); fpsN = 0; fpsT0 = 0; fpsShow(); syncFpsBtn(); }
(function(){
  // Bouton dans l'écran Pause, avant « Reprendre »
  const res = $('btnResume');
  if (res && res.parentNode && !$('btnFps')){
    const b = document.createElement('button'); b.className = 'ghost'; b.id = 'btnFps'; b.type = 'button';
    res.parentNode.insertBefore(b, res);
    b.addEventListener('click', () => setFps(!perfFps));
  }
  syncFpsBtn(); fpsShow();
})();
try {
  const _visualsPerf = visuals;
  visuals = function(dt){ const r = _visualsPerf(dt); zInstSync(); fpsTick(); return r; };
} catch (e) {}

// Accès pour les tests automatiques et tests/perf.html
window.__zperf = {
  ZPERF, ZB, ZMATS, ZBOX, zInstSync, zAliveCount, aliveCap, hordePlan, setFps,
  get fps(){ return fpsVal; }, get fpsOn(){ return perfFps; },
  mats(){ return ZMATS.size + ZI_FIX.size + 1; },           // matériaux de zombies (partagés) : borné, ne grandit pas avec la foule
  batches(){ return zbList.length; },                        // lots d'instances (appels de dessin de la foule)
  instances(){ let n = 0; zbList.forEach(b => n += b.n); return n; },
  draws(){ let n = 0; zbList.forEach(b => { if (b.n) n++; }); return n; },
  sceneCount(){ let n = 0; scene.traverse(() => n++); return n; },
  inScene(){ let n = 0; for (const z of zombies) if (!z.inst && z.g.parent) n++; return n; }
};
