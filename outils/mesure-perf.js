'use strict';
/* ================= Mesure de la performance du toit (dossier 120) ================= */
// Mesure, ville par ville, ce que coûte une image du toit, sans téléphone :
//   appels de dessin, triangles et maillages dessinés (scène seule et image complète), sans zombies et avec 150 zombies ;
//   temps de update() et de visuals() sur 600 images simulées d'une vraie vague (150 zombies, minigun, fusil à pompe) ;
//   octets alloués par image (échantillonneur de tas de Chromium, objets ramassés compris) et les fonctions qui allouent le plus.
// Le rendu logiciel (SwiftShader) ne dit rien du temps de carte graphique d'un vrai cell : se fier aux appels de dessin,
// aux triangles et au temps JavaScript. Le processeur est ralenti 4 fois (comme un cell) pour les temps.
// Usage : python3 -m http.server 8767 (à la racine du dépôt), puis
//   node outils/mesure-perf.js [adresses] [quoi] [villes]
//     adresses : une ou plusieurs adresses du jeu séparées par des virgules (défaut http://localhost:8767/) ; avec deux
//                adresses (avant, après), les mesures de temps alternent de l'une à l'autre, 3 fois chacune
//     quoi     : dessins (défaut), temps, rendu (avec et sans fusion dans la même page), alloc, images, tout
//     villes   : numéros séparés par des virgules (défaut 0,1,2,3,4,5)
//   images : captures aux mêmes positions et même graine, dans les 6 villes, en Actuel et en Amélioré, comparées pixel à
//            pixel d'une adresse à l'autre (il en faut deux) ; les pires captures sont écrites dans MESURE_DOSSIER (défaut /tmp).
// Variables : MESURE_RALENTI (défaut 4), MESURE_IMAGES (défaut 600), MESURE_FORMAT (cell ou ordi, défaut cell, pour les dessins),
//   MESURE_FORMAT_TEMPS (défaut ordi), MESURE_TOURS (lancements alternés pour les temps, défaut 3).
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const adresses = (process.argv[2] || 'http://localhost:8767/').split(',').map(a => a.replace(/\/?$/, '/'));
const quoi = process.argv[3] || 'dessins';
const villes = (process.argv[4] || '0,1,2,3,4,5').split(',').map(Number);
const RALENTI = +(process.env.MESURE_RALENTI || 4), NIMG = +(process.env.MESURE_IMAGES || 600);
const FORMAT = process.env.MESURE_FORMAT || 'cell';
const DOSSIER = process.env.MESURE_DOSSIER || '/tmp';
const STYLES = ['actuel', 'ameliore'];

// Avant le jeu : hasard à graine (refixé par __graine), boucle du jeu arrêtée (on fait avancer les images nous-mêmes).
const INIT = `(function(){
  var s = 4242; Math.random = function(){ s = s * 16807 % 2147483647; return (s - 1) / 2147483646; };
  window.__graine = function(n){ s = n; };
  window.requestAnimationFrame = function(){ return 0; }; window.cancelAnimationFrame = function(){};
})();`;

async function ouvrir(b, base, format){
  const cell = (format || FORMAT) === 'cell';
  const ctx = await b.newContext(cell ? { viewport:{ width:780, height:360 }, deviceScaleFactor:2, isMobile:true, hasTouch:true } : { viewport:{ width:960, height:540 }, deviceScaleFactor:1 });
  const p = await ctx.newPage();
  await p.addInitScript({ content:INIT });
  p.on('pageerror', e => console.log('  (erreur dans la page : ' + e.message + ')'));
  await p.goto(base, { waitUntil:'networkidle', timeout:180000 });
  await p.waitForFunction(() => typeof startLocation === 'function' && typeof loop === 'function', null, { timeout:180000 });
  await p.evaluate(() => {
    try { canvas.requestPointerLock = function(){}; } catch (e) {}
    Snd.on = false; if (Snd.master) Snd.master.gain.value = 0;
    try { localStorage.removeItem('dt_style'); } catch (e) {}
    // Une image du jeu, exactement comme la boucle (loop), avec un pas fixe
    window.__img = function(dt){ loop(last + (dt || 1 / 30) * 1000); };
    window.__ville = function(i, st, graine){
      if (typeof styleSet === 'function') styleSet(st || 'actuel');
      __graine(graine || 7); startLocation(i); last = 1e4; // pas des images exactement pareils d'une page à l'autre
      if (typeof RUE === 'object' && RUE){ RUE.crateAt = []; RUE.civAt = -1; }
      plan.queue = []; spawnT = 1e9; state = 'paused'; firing = false; zoomed = false; shake = 0;
      showScreen(null);
    };
    window.__vise = function(y, p){ yaw = y; pitch = p; recoilAcc = 0; shake = 0; camera.rotation.set(p, y, 0); camera.updateMatrixWorld(); };
    // Compte une image : appels de dessin, triangles, maillages de la scène dessinés
    window.__compte = function(){
      const info = renderer.info; info.autoReset = false; info.reset();
      const vus = new Set(), rbd = renderer.renderBufferDirect;
      renderer.renderBufferDirect = function(c, s, g, m, o, gr){ if (o) vus.add(o); return rbd.apply(this, arguments); };
      __img(1 / 30);
      const tout = { appels:info.render.calls, tri:info.render.triangles };
      info.reset(); vus.clear();
      renderer.render(scene, camera);
      const sc = { appels:info.render.calls, tri:info.render.triangles, maillages:vus.size };
      renderer.renderBufferDirect = rbd; info.autoReset = true;
      return { tout, sc };
    };
    const MIX = ['walker', 'runner', 'walker', 'jumper', 'brute', 'walker', 'spitter', 'flyer', 'runner', 'walker'];
    let nz = 0;
    window.__remplir = function(n){
      let v = 0; for (let i = 0; i < zombies.length; i++) if (!zombies[i].dead) v++;
      for (; v < n; v++){ const t = nz % 60 === 59 ? 'colossus' : MIX[nz % MIX.length]; nz++; const z = spawnZombie(t); z.g.position.set(rand(-11, 11), z.g.position.y, rand(-105, -14)); z.hp = z.maxHp = z.hp * 3; }
    };
    window.__vague = function(){
      state = 'playing'; plan.queue = ['walker']; spawnT = 1e9; plan.maxAlive = 1e6;
      S.owned.minigun = true; S.owned.shotgun = true; equip('minigun'); spin = 1;
      __remplir(150);
    };
    // Entretien de la vague entre deux images (hors du temps mesuré)
    window.__entretien = function(k){
      S.bar = S.barMax; S.ammo[S.cur] = 999; reloadT = 0; firing = true; spin = 1; overT = -1; endT = -1; state = 'playing';
      yaw = Math.sin(k / 40) * .35; pitch = -.13 + Math.sin(k / 27) * .03;
      if (k % 15 === 0){ const c0 = S.cur; equip('shotgun'); cool = 0; S.ammo.shotgun = 99; fire(); equip(c0); spin = 1; }
      __remplir(150);
    };
  });
  return p;
}

const POSES = [['devant', 0, -.16], ['gauche', .7, -.2], ['droite', -.7, -.2], ['barricade', 0, -.6], ['loin', 0, -.05]];

async function dessins(b, base){
  const p = await ouvrir(b, base);
  const r = {};
  for (const st of STYLES) for (const i of villes){
    r[st + i] = await p.evaluate(([i, st, POSES]) => {
      __ville(i, st, 7);
      const o = { ville:LOCS[i].name, poses:{} };
      for (let k = 0; k < 3; k++) __img(1 / 30);
      POSES.forEach(([n, y, pp]) => { __vise(y, pp); o.poses[n] = __compte(); });
      __vague(); __vise(0, -.16); for (let k = 0; k < 5; k++){ __entretien(0); __img(1 / 30); }
      __vise(0, -.16); o.vague = __compte();
      clearZombies();
      return o;
    }, [i, st, POSES]);
  }
  await p.close();
  return r;
}

async function temps(b, base){
  const p = await ouvrir(b, base, process.env.MESURE_FORMAT_TEMPS || 'ordi'); // petit rendu : le temps du rendu logiciel ne compte pas
  const s = await p.context().newCDPSession(p);
  const r = {};
  for (const i of villes){
    await p.evaluate(i => { __ville(i, 'actuel', 7); __vague(); for (let k = 0; k < 30; k++){ __entretien(k); __img(1 / 60); } }, i);
    await s.send('Emulation.setCPUThrottlingRate', { rate:RALENTI });
    r[i] = await p.evaluate(N => {
      let tu = 0, tv = 0, ti = 0; const bu = update, bv = visuals;
      update = function(dt){ const t = performance.now(), x = bu(dt); tu += performance.now() - t; return x; };
      visuals = function(dt){ const t = performance.now(), x = bv(dt); tv += performance.now() - t; return x; };
      for (let k = 0; k < N; k++){ __entretien(k); const t = performance.now(); __img(1 / 60); ti += performance.now() - t; }
      update = bu; visuals = bv;
      const res = { update:tu / N, visuals:tv / N, image:ti / N };
      clearZombies(); return res;
    }, NIMG);
    await s.send('Emulation.setCPUThrottlingRate', { rate:1 });
    console.log('  ' + base + ' ville ' + i + ' : update ' + r[i].update.toFixed(2) + ' ms, visuals ' + r[i].visuals.toFixed(2) + ' ms, image ' + r[i].image.toFixed(2) + ' ms');
  }
  await p.close();
  return r;
}

// Temps JavaScript du rendu de la scène (renderer.render), même page, rue bâtie avec et sans fusion (FUSION.on), en
// alternant : la machine chargée par d'autres pèse pareil sur les deux. Processeur ralenti comme pour les temps.
async function rendu(b, base){
  const p = await ouvrir(b, base);
  const s = await p.context().newCDPSession(p);
  const r = {};
  for (const i of villes){
    const x = r[i] = { sans:[], avec:[] };
    for (let t = 0; t < 3; t++) for (const on of [false, true]){
      await p.evaluate(([i, on]) => { FUSION.on = on; __ville(i, 'actuel', 7); FUSION.on = true; __vise(0, -.16); for (let k = 0; k < 10; k++) renderer.render(scene, camera); }, [i, on]);
      await s.send('Emulation.setCPUThrottlingRate', { rate:RALENTI });
      const ms = await p.evaluate(N => { const t0 = performance.now(); for (let k = 0; k < N; k++) renderer.render(scene, camera); const g = renderer.getContext(); g.finish(); return (performance.now() - t0) / N; }, 200);
      await s.send('Emulation.setCPUThrottlingRate', { rate:1 });
      (on ? x.avec : x.sans).push(ms);
    }
    const med = l => l.slice().sort((a, b) => a - b)[1];
    console.log('  ville ' + i + ' : rendu de la scène ' + med(x.sans).toFixed(2) + ' ms sans fusion, ' + med(x.avec).toFixed(2) + ' ms avec   [' + x.sans.map(v => v.toFixed(2)).join(' ') + ' / ' + x.avec.map(v => v.toFixed(2)).join(' ') + ']');
  }
  await p.close();
  return r;
}

async function alloc(b, base){
  const p = await ouvrir(b, base);
  const s = await p.context().newCDPSession(p);
  await s.send('HeapProfiler.enable');
  const r = {};
  for (const i of villes){
    await p.evaluate(i => { __ville(i, 'actuel', 7); __vague(); for (let k = 0; k < 30; k++){ __entretien(k); __img(1 / 60); } }, i);
    await s.send('HeapProfiler.startSampling', { samplingInterval:512, includeObjectsCollectedByMajorGC:true, includeObjectsCollectedByMinorGC:true });
    await p.evaluate(N => { for (let k = 0; k < N; k++){ __entretien(k); __img(1 / 60); } }, NIMG);
    const { profile } = await s.send('HeapProfiler.stopSampling');
    // Somme par fonction (et fichier:ligne)
    const parF = {}; let total = 0;
    const visite = n => {
      const f = n.callFrame, cle = (f.functionName || '(anonyme)') + ' ' + String(f.url).split('/').pop().split('?')[0] + ':' + (f.lineNumber + 1);
      if (n.selfSize){ parF[cle] = (parF[cle] || 0) + n.selfSize; total += n.selfSize; }
      (n.children || []).forEach(visite);
    };
    visite(profile.head);
    const top = Object.entries(parF).sort((a, b) => b[1] - a[1]).slice(0, 14).map(([k, v]) => [k, Math.round(v / NIMG)]);
    r[i] = { parImage:Math.round(total / NIMG), top };
    await p.evaluate(() => clearZombies());
  }
  await p.close();
  return r;
}

async function captures(b, base){
  const p = await ouvrir(b, base, 'ordi');
  const r = {};
  for (const st of STYLES) for (const i of villes){
    r[st + i] = await p.evaluate(([i, st, POSES]) => {
      __ville(i, st, 7);
      for (let k = 0; k < 3; k++) __img(1 / 30);
      const o = {};
      POSES.forEach(([n, y, pp]) => { __vise(y, pp); __graine(99); __img(1 / 30); __vise(y, pp); __graine(99); __img(1 / 30); o[n] = canvas.toDataURL('image/png'); });
      return o;
    }, [i, st, POSES]);
  }
  await p.close();
  return r;
}
// Écart pixel à pixel de deux captures (dans une page vide) : moyenne et pire écart par canal (0 à 255), part des pixels qui changent
async function ecart(pg, a, b){
  return pg.evaluate(async ([a, b]) => {
    const lire = src => new Promise(res => { const im = new Image(); im.onload = () => { const c = document.createElement('canvas'); c.width = im.width; c.height = im.height; const g = c.getContext('2d'); g.drawImage(im, 0, 0); res(g.getImageData(0, 0, c.width, c.height).data); }; im.src = src; });
    const A = await lire(a), B = await lire(b);
    let s = 0, m = 0, n = 0, px = 0;
    for (let i = 0; i < A.length; i += 4){
      let d = 0; for (let k = 0; k < 3; k++){ const e = Math.abs(A[i + k] - B[i + k]); s += e; if (e > m) m = e; if (e > d) d = e; }
      if (d > 8) n++; px++;
    }
    return { moyen:s / (px * 3), pire:m, part:n / px };
  }, [a, b]);
}

(async () => {
  const b = await chromium.launch({ args:['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const sortie = {};
  if (quoi === 'dessins' || quoi === 'tout'){
    for (const a of adresses){
      const r = await dessins(b, a); sortie['dessins ' + a] = r;
      console.log('\nAppels de dessin (' + FORMAT + ') : ' + a);
      console.log('style    | ville              | devant scène (maillages, triangles) | image complète | gauche | droite | barricade | 150 zombies scène | image');
      Object.keys(r).forEach(k => { const o = r[k], d = o.poses.devant;
        console.log(k.replace(/\d$/, '').padEnd(8) + ' | ' + o.ville.padEnd(18) + ' | ' + String(d.sc.appels).padStart(4) + ' (' + d.sc.maillages + ', ' + d.sc.tri + ') | ' + d.tout.appels + ' | ' + o.poses.gauche.sc.appels + ' | ' + o.poses.droite.sc.appels + ' | ' + o.poses.barricade.sc.appels + ' | ' + o.vague.sc.appels + ' (' + o.vague.sc.tri + ') | ' + o.vague.tout.appels); });
    }
  }
  if (quoi === 'temps' || quoi === 'tout'){
    const tours = adresses.length > 1 ? +(process.env.MESURE_TOURS || 3) : 1, cumul = {};
    for (let t = 0; t < tours; t++) for (const a of adresses){
      const r = await temps(b, a);
      Object.keys(r).forEach(i => { const c = (cumul[a] = cumul[a] || {}), x = (c[i] = c[i] || { update:[], visuals:[], image:[] }); ['update', 'visuals', 'image'].forEach(k => x[k].push(r[i][k])); });
    }
    sortie.temps = cumul;
    const med = l => l.slice().sort((x, y) => x - y)[Math.floor(l.length / 2)];
    console.log('\nTemps par image, processeur ralenti ×' + RALENTI + ', ' + NIMG + ' images, 150 zombies (médiane de ' + tours + ' lancement(s), ms)');
    Object.keys(cumul).forEach(a => { console.log(a); Object.keys(cumul[a]).forEach(i => { const x = cumul[a][i]; console.log('  ville ' + i + ' : update ' + med(x.update).toFixed(2) + ' | visuals ' + med(x.visuals).toFixed(2) + ' | image entière ' + med(x.image).toFixed(2) + '   [' + x.update.map(v => v.toFixed(2)).join(' ') + ' / ' + x.visuals.map(v => v.toFixed(2)).join(' ') + ']'); }); });
  }
  if (quoi === 'rendu' || quoi === 'tout'){
    console.log('\nRendu de la scène, rue vide, processeur ralenti ×' + RALENTI + ' (médiane de 3, ms par image)');
    sortie.rendu = await rendu(b, adresses[adresses.length - 1]);
  }
  if (quoi === 'alloc' || quoi === 'tout'){
    for (const a of adresses){
      const r = await alloc(b, a); sortie['alloc ' + a] = r;
      console.log('\nOctets alloués par image (150 zombies) : ' + a);
      Object.keys(r).forEach(i => { console.log('  ville ' + i + ' : ' + r[i].parImage + ' octets par image'); r[i].top.forEach(([k, v]) => console.log('      ' + String(v).padStart(7) + '  ' + k)); });
    }
  }
  if (quoi === 'images'){
    if (adresses.length < 2){ console.log('Il faut deux adresses (avant, après) pour comparer les images.'); }
    else {
      const A = await captures(b, adresses[0]), B = await captures(b, adresses[1]);
      const pg = await b.newPage(); const lignes = []; const pires = [];
      for (const k of Object.keys(A)) for (const n of Object.keys(A[k])){
        const e = await ecart(pg, A[k][n], B[k][n]); lignes.push([k, n, e]); pires.push([e.moyen, k, n]);
      }
      pires.sort((x, y) => y[0] - x[0]);
      pires.slice(0, 4).forEach(([m, k, n]) => ['avant', 'apres'].forEach((q, j) => fs.writeFileSync(path.join(DOSSIER, 'capture-' + k + '-' + n + '-' + q + '.png'), Buffer.from((j ? B : A)[k][n].split(',')[1], 'base64'))));
      console.log('\nÉcart d\'image (' + adresses[0] + ' contre ' + adresses[1] + ') : moyen par canal / pire / part des pixels qui changent de plus de 8');
      lignes.forEach(([k, n, e]) => console.log(k.padEnd(10) + ' ' + n.padEnd(10) + ' ' + e.moyen.toFixed(3).padStart(7) + ' ' + String(e.pire).padStart(4) + ' ' + (e.part * 100).toFixed(2).padStart(6) + ' %'));
      sortie.images = lignes;
      await pg.close();
    }
  }
  if (process.env.MESURE_JSON) fs.writeFileSync(process.env.MESURE_JSON, JSON.stringify(sortie, null, 1));
  await b.close();
})().catch(e => { console.error(e); process.exit(1); });
