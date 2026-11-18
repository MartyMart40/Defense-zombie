'use strict';
/* ================= Mesure des explosions et des pouvoirs du toit (dossier 130) ================= */
// Quatre mesures de js/85-explosions.js et js/85-explosions-sons.js :
//   identite : deux pages neuves (heure et hasard fixés par outils/sim-horloge.js), l'une SANS les fichiers 85 (requêtes
//              bloquées), l'autre avec, même partie de 900 images : grenade, cocktail Molotov, frappe aérienne, baril qui
//              saute, roquette, tir du canon électromagnétique, auto du boss abattue, avec des zombies dans la rue.
//              Nombre de tirages de Math.random et empreinte des positions, vies, barricade et argent image par image :
//              elles doivent être identiques.
//   dessins  : appels de dessin et temps de exImage (le plus petit de 5 mesures) au plus fort de la frappe et d'une nappe.
//   sons     : niveaux hors ligne (même chaîne et même méthode que outils/mesure-sons-centrale.js), en dBFS.
//   captures : planches de quelques images de chaque explosion, avant (fichiers bloqués) et après, à l'ordi (4 styles)
//              et au cell (vertical et couché), dans MESURE_DOSSIER (défaut : dossier courant). MESURE_JEUX=ordi:actuel,cell:ameliore
//              pour choisir ; MESURE_AVANT=0 (après seulement) ou seul (avant seulement).
// Usage :
//   python3 -m http.server 8767        (à la racine du dépôt, dans un autre terminal)
//   node outils/mesure-explosions.js [adresse] [identite|dessins|sons|captures|tout] [scènes]   (défaut http://localhost:8767/, tout)
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const url = (process.argv[2] || 'http://localhost:8767/').replace(/\/?$/, '/');
const quoi = process.argv[3] || 'tout';
const SCENES = (process.argv[4] || 'grenade,molotov,frappe,baril,roquette,rail,auto').split(',');
const DOSSIER = process.env.MESURE_DOSSIER || '.';
const ARGS = ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'];
const FORMATS = {
  ordi: { viewport: { width: 960, height: 540 }, deviceScaleFactor: 1 },
  cell: { viewport: { width: 780, height: 360 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true },
  cellv: { viewport: { width: 360, height: 760 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true }
};

async function page(b, sans, format, horloge){
  const ctx = await b.newContext(FORMATS[format || 'ordi']);
  if (horloge) await ctx.addInitScript({ path: path.join(__dirname, 'sim-horloge.js') });
  else await ctx.addInitScript('(function(){ var s = 4242; Math.random = function(){ s = s * 16807 % 2147483647; return (s - 1) / 2147483646; }; window.__graine = function(n){ s = n; }; window.requestAnimationFrame = function(){ return 0; }; })();');
  await ctx.addInitScript('(function(){ var R = Math.random, n = 0; Math.random = function(){ n++; return R(); }; window.__nHasard = function(){ return n; }; })();');
  if (sans) await ctx.route(/js\/85-explosions/, r => r.abort());
  const p = await ctx.newPage();
  p.on('pageerror', e => console.log('Erreur de la page : ' + e.message));
  await p.goto(url, { waitUntil: 'networkidle', timeout: 180000 });
  await p.waitForFunction(() => typeof startLocation === 'function' && typeof powUse === 'function' && typeof loop === 'function', null, { timeout: 180000 });
  await p.evaluate(() => {
    try { canvas.requestPointerLock = function(){}; } catch (e) {}
    try { localStorage.removeItem('dt_style'); } catch (e) {}
    window.__img = function(dt){ loop(last + (dt || 1 / 30) * 1000); };
    // Une partie prête : ville, style, vague en cours qui ne finit pas, pouvoirs débloqués, regard droit devant
    window.__pret = function(vi, st){
      if (typeof styleSet === 'function') styleSet(st || 'actuel');
      P.level = Math.max(P.level || 1, 10);
      if (window.__graine) __graine(77);
      startLocation(vi); last = 1e4;
      if (typeof RUE === 'object' && RUE){ RUE.crateAt = []; RUE.civAt = -1; }
      state = 'playing'; plan.queue = ['walker']; spawnT = 1e9; plan.maxAlive = 1e6; firing = false; zoomed = false; shake = 0;
      showScreen(null); if (typeof pwReset === 'function') pwReset();
      yaw = 0; pitch = -.16; recoilAcc = 0; camera.rotation.set(pitch, yaw, 0); camera.updateMatrixWorld();
    };
    window.__vise = function(y, p){ yaw = y; pitch = p; recoilAcc = 0; shake = 0; };
    // Les scènes : chacune se lance au temps 0 et rend le temps (s) où l'explosion se produit
    window.__scene = {
      grenade(){ powUse('grenade', { x: 2, y: 0, z: -26 }); return pwProj.find(o => o.m.visible).T; },
      molotov(){ powUse('molotov', { x: -1, y: 0, z: -22 }); return pwProj.find(o => o.m.visible).T; },
      frappe(){ powUse('strike', { x: 0, y: 0, z: -40 }); return 0; },
      baril(){ const b = rueSpawnBarrel(3, -27); __img(1 / 30); rueBarrelHit(b); return 0; },
      roquette(){ armExplode(new THREE.Vector3(-2, .03, -30), 'rocket'); return 0; },
      rail(){ S.owned.railgun = true; equip('railgun'); S.ammo.railgun = 9; reloadT = 0; cool = 0; swapT = 0; __vise(0, -.2); fire(); return 0; },
      auto(){ const bo = spawnZombie('boss'); bo.g.position.set(-6, 0, -95); const c = bossCars[0]; c.m.visible = true; c.hp = 1; c.owner = null; c.m.position.set(3, 7, -24); visuals(0); bossCarHit(c, c.m.position.clone(), 1e6); return 0; }
    };
  });
  return { ctx, p };
}

/* ---------- Identité du jeu ---------- */
async function partie(b, sans){
  const { ctx, p } = await page(b, sans, 'ordi', true);
  const r = await p.evaluate(() => {
    let h = 0; const H = v => { h = (h * 31 + Math.round(v * 1000)) | 0; };
    __pret(1, 'actuel');
    for (let k = 0; k < 14; k++){ const z = spawnZombie(k % 3 ? 'walker' : 'runner'); z.g.position.set(-10 + (k % 7) * 3, 0, -22 - k * 2.5); z.hp = z.maxHp = z.hp * 6; }
    const bar = rueSpawnBarrel(-4, -30), dt = 1 / 30;
    for (let f = 0; f < 900; f++){
      if (f === 10) powUse('grenade', { x: 1, y: 0, z: -26 });
      if (f === 80) powUse('molotov', { x: -3, y: 0, z: -24 });
      if (f === 150) powUse('strike', { x: 0, y: 0, z: -40 });
      if (f === 300 && bar.live) rueBarrelHit(bar);
      if (f === 360) armExplode(new THREE.Vector3(2, .03, -32), 'rocket');
      if (f === 420){ S.owned.railgun = true; equip('railgun'); S.ammo.railgun = 9; reloadT = 0; cool = 0; swapT = 0; fire(); }
      if (f === 440) spawnZombie('boss');
      if (f > 440) for (const c of bossCars) if (c.m.visible && c.t > .6) bossCarHit(c, c.m.position.clone(), 1e6); // auto lancée, abattue en l'air
      if (f === 600) powUse('grenade', { x: -2, y: 0, z: -30 });
      window.__SIM_T += dt; S.bar = S.barMax; if (state === 'playing') update(dt);
      visuals(dt);
      for (const z of zombies){ H(z.g.position.x); H(z.g.position.y); H(z.g.position.z); H(z.hp); H(z.dead ? 1 : 0); }
      H(S.bar); H(S.money); H(zombies.length); H(S.kills || 0);
    }
    const E = window.__explosions;
    return { n: __nHasard(), h, argent: Math.round(S.money), morts: S.kills || 0, etat: state, vu: E ? JSON.stringify(E.EX.n) : '(sans le fichier)', journal: (window.JOURNAL || []).slice(0, 3) };
  });
  await ctx.close();
  return r;
}
async function identite(b){
  console.log('Identité du jeu, sans puis avec les fichiers 85 (pages neuves, 900 images) :');
  const a = await partie(b, true), c = await partie(b, false), same = a.n === c.n && a.h === c.h && a.argent === c.argent;
  console.log('  sans : tirages ' + a.n + ', empreinte ' + a.h + ', argent ' + a.argent + ', tués ' + a.morts + ', état ' + a.etat);
  console.log('  avec : tirages ' + c.n + ', empreinte ' + c.h + ', argent ' + c.argent + ', tués ' + c.morts + ', état ' + c.etat);
  console.log('  vu par le fichier : ' + c.vu);
  if (c.journal.length) console.log('  JOURNAL : ' + c.journal.join(' | '));
  console.log(same ? '  IDENTIQUE' : '  DIFFÉRENT');
  return same;
}

/* ---------- Appels de dessin et temps ---------- */
async function dessins(b){
  for (const format of ['ordi', 'cell']){
    const { ctx, p } = await page(b, false, format);
    if (format === 'cell'){ const cdp = await p.context().newCDPSession(p); await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 }); } // processeur ralenti comme un cell
    const r = await p.evaluate(() => {
      const compte = () => { const info = renderer.info; info.autoReset = false; info.reset(); renderer.render(scene, camera); const n = info.render.calls; info.autoReset = true; return n; };
      const E = window.__explosions, o = {};
      __pret(1, 'actuel'); for (let k = 0; k < 3; k++) __img(1 / 30);
      E.EX_REGL.on = false; __img(1 / 30); o.sans = compte();
      E.EX_REGL.on = true; __img(1 / 30); o.vide = compte();
      powUse('molotov', { x: -1, y: 0, z: -22 }); powUse('strike', { x: 0, y: 0, z: -40 });
      const b0 = rueSpawnBarrel(3, -27);
      for (let k = 0; k < 60; k++) __img(1 / 30);
      rueBarrelHit(b0);
      for (let k = 0; k < 18; k++) __img(1 / 30);
      o.plein = compte(); o.bouffees = E.bouffees; o.marques = E.marques; o.reserve = E.EXP.N;
      E.EXB.mb.visible = E.EXB.ms.visible = false; o.pleinSans = compte(); E.EXB.mb.visible = E.EXB.ms.visible = true;
      // Temps de exImage seul : le plus petit de 5 mesures de 30 appels (sans avancer le jeu)
      const sv = Object.assign({}, E.EX.n); let best = 1e9;
      for (let m = 0; m < 5; m++){ const t0 = performance.now(); for (let k = 0; k < 30; k++) E.exImage(1 / 60); best = Math.min(best, (performance.now() - t0) / 30); }
      o.ms = Math.round(best * 1000) / 1000; o.n = sv;
      return o;
    });
    console.log(format + ' : appels de dessin, rue calme ' + r.sans + ' sans le fichier et ' + r.vide + ' avec ; au plus fort (frappe, nappe, baril) ' + r.pleinSans + ' sans ses deux maillages, ' + r.plein + ' avec'
      + ' ; bouffées ' + r.bouffees + '/' + r.reserve + ', marques au sol ' + r.marques + ' ; exImage ' + r.ms + ' ms par image' + (format === 'cell' ? ' (processeur ralenti ×4)' : ''));
    await ctx.close();
  }
}

/* ---------- Sons ---------- */
async function sons(b){
  const { ctx, p } = await page(b, false, 'ordi');
  const r = await p.evaluate(async () => {
    Snd.init(); if (!Snd.ctx) return { erreur: 'pas d’audio' };
    return __explosionsSons.mesurer();
  });
  await ctx.close();
  if (r.erreur){ console.log(r.erreur); return; }
  const pad = (s, n) => (String(s) + ' '.repeat(n)).slice(0, n);
  console.log(pad('Son', 50) + pad('Groupe', 10) + pad('Crête', 8) + pad('Court', 8) + pad('Moyen', 8) + 'Cell');
  r.sons.forEach(s => console.log(pad(s.nom, 50) + pad(s.groupe, 10) + pad(s.pic, 8) + pad(s.court, 8) + pad(s.moyen, 8) + s.cell));
  const l = (nom, m) => console.log(pad(nom, 60) + pad(m.pic, 8) + pad(m.court, 8) + pad(m.moyen, 8) + m.cell);
  l('Pire cas avant (7 bombes, baril, fusil d’assaut)', r.pireAvant);
  l('Pire cas après (+ annonce, avion, nappe, graves et queues)', r.pire);
}

/* ---------- Captures ---------- */
// Pour chaque scène : temps des images après l'explosion (s)
const MOMENTS = {
  grenade: [.03, .12, .3, .6, 1.2, 3], molotov: [.05, .5, 2, 4.5, 6.2, 7.5], frappe: [.8, 2.05, 2.5, 2.8, 3.4, 5.5],
  baril: [.03, .15, .4, .9, 2, 4], roquette: [.03, .12, .3, .7, 1.5, 3.5], rail: [.0, .05, .15, .35, .6, 1], auto: [.03, .15, .4, .9, 1.6, 3]
};
async function captures(b){
  fs.mkdirSync(DOSSIER, { recursive: true });
  const jeux = (process.env.MESURE_JEUX || 'ordi:actuel,ordi:ameliore,ordi:hd,ordi:ultra,cell:actuel,cell:ameliore,cellv:actuel').split(',').map(x => x.split(':'));
  const quand = process.env.MESURE_AVANT === '0' ? [false] : process.env.MESURE_AVANT === 'seul' ? [true] : [true, false];
  for (const sans of quand) for (const [format, st] of jeux){
    if (sans && st !== 'actuel' && st !== 'ameliore') continue;
    const { ctx, p } = await page(b, sans, format);
    for (const sc of SCENES){
      const data = await p.evaluate(async ([sc, st, M]) => {
        __pret(sc === 'frappe' ? 1 : 1, st);
        if (st === 'hd' || st === 'ultra'){ for (let k = 0; k < 400 && !(typeof HD === 'object' && HD.pret); k++) await new Promise(r => setTimeout(r, 50)); }
        for (let k = 0; k < 4; k++) __img(1 / 30);
        if (sc === 'frappe') __vise(0, -.05);
        const t0 = __scene[sc]();
        const W = canvas.width, H = canvas.height, sx = .5, cw = Math.round(W * sx), ch = Math.round(H * sx), cols = 3;
        const pl = document.createElement('canvas'); pl.width = cw * cols; pl.height = ch * Math.ceil(M.length / cols);
        const g = pl.getContext('2d'); g.fillStyle = '#000'; g.fillRect(0, 0, pl.width, pl.height);
        let t = 0, i = 0; const dt = 1 / 30;
        while (i < M.length){
          const cible = t0 + M[i];
          if (t + dt * .5 >= cible || (M[i] === 0 && t >= t0)){
            __img(.001);
            g.drawImage(canvas, (i % cols) * cw, Math.floor(i / cols) * ch, cw, ch);
            g.fillStyle = 'rgba(0,0,0,.6)'; g.fillRect((i % cols) * cw, Math.floor(i / cols) * ch, 70, 18);
            g.fillStyle = '#fff'; g.font = '12px sans-serif'; g.fillText('+' + M[i].toFixed(2) + ' s', (i % cols) * cw + 4, Math.floor(i / cols) * ch + 13);
            i++; continue;
          }
          __img(dt); t += dt;
        }
        return pl.toDataURL('image/png');
      }, [sc, st, MOMENTS[sc]]);
      const f = path.join(DOSSIER, sc + '-' + format + '-' + st + '-' + (sans ? 'avant' : 'apres') + '.png');
      fs.writeFileSync(f, Buffer.from(data.split(',')[1], 'base64'));
    }
    await ctx.close();
    console.log('captures ' + (sans ? 'avant' : 'après') + ' : ' + format + ' ' + st);
  }
}

(async () => {
  const b = await chromium.launch({ args: ARGS });
  let bon = true;
  if (quoi === 'identite' || quoi === 'tout') bon = await identite(b) && bon;
  if (quoi === 'dessins' || quoi === 'tout') await dessins(b);
  if (quoi === 'sons' || quoi === 'tout') await sons(b);
  if (quoi === 'captures' || quoi === 'tout') await captures(b);
  await b.close();
  process.exit(bon ? 0 : 1);
})();
