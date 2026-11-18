'use strict';
/* ================= Mesure de la mise en scène des boss du toit (dossier 128) ================= */
// Trois mesures de js/82-boss-scene.js et js/82-boss-sons.js :
//   identite : pour chaque boss des 5 premières villes, deux pages neuves (heure et hasard fixés par outils/sim-horloge.js),
//              fichier coupé (BS_REGL.on = false) puis allumé, même partie de 900 images (arrivée, 600 images de combat qui
//              passent sous 50 % et 25 %, mort, 300 images de chute) : nombre de tirages de Math.random et empreinte des
//              positions, vies, barricade et argent image par image. Elles doivent être identiques.
//   dessins  : appels de dessin pendant l'arrivée d'un boss (contre-jour, poussière, oiseaux), coupé puis allumé, même page.
//   sons     : niveaux hors ligne de chaque son (même chaîne et même méthode que outils/mesure-sons-centrale.js), en dBFS.
// Usage :
//   python3 -m http.server 8767        (à la racine du dépôt, dans un autre terminal)
// La barricade est remise pleine à chaque image (la même chose des deux côtés) pour voir la chute même en vague 10.
// BOSS_LISTE=4:10 : seulement ces boss (ville:vague).
//   node outils/mesure-boss-scene.js [adresse] [identite|dessins|sons|tout]      (défaut http://localhost:8767/, tout)
const { chromium } = require('playwright');
const path = require('path');

const url = (process.argv[2] || 'http://localhost:8767/').replace(/\/?$/, '/');
const quoi = process.argv[3] || 'tout';
const BOSS = (process.env.BOSS_LISTE || '0:5,1:5,2:5,3:5,4:5,4:10').split(',').map(x => x.split(':').map(Number));
const ARGS = ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'];

async function page(b){
  const ctx = await b.newContext({ viewport:{ width:960, height:540 } });
  await ctx.addInitScript({ path: path.join(__dirname, 'sim-horloge.js') });
  await ctx.addInitScript('(function(){ var R = Math.random, n = 0; Math.random = function(){ n++; return R(); }; window.__nHasard = function(){ return n; }; })();');
  const p = await ctx.newPage();
  p.on('pageerror', e => console.log('Erreur de la page : ' + e.message));
  await p.goto(url); await p.waitForFunction(() => typeof __bossScene === 'object' && typeof __boss === 'object');
  return { ctx, p };
}
// Une partie de 900 images ; rend { n, h, nom, morts, chutes }
async function partie(b, on, vi, w){
  const { ctx, p } = await page(b);
  const r = await p.evaluate(([on, vi, w]) => {
    __bossScene.BS_REGL.on = on;
    let h = 0; const H = v => { h = (h * 31 + Math.round(v * 1000)) | 0; };
    startLocation(vi); state = 'shop'; S.wave = w - 1; startWave();
    clearZombies(); plan.queue = ['walker']; spawnT = 1e9;
    for (let k = 0; k < 6; k++){ const z = spawnZombie('walker'); z.g.position.set(-8 + k * 3, 0, -20 - k * 5); }
    const bo = spawnZombie('boss'), dt = 1 / 30;
    for (let f = 0; f < 900; f++){
      if (f === 200) damage(bo, bo.maxHp * .55 / .6, false, bo.g.position.clone());
      if (f === 400) damage(bo, bo.maxHp * .25 / .6, false, bo.g.position.clone());
      if (f === 600) damage(bo, 1e12, true, bo.g.position.clone());
      window.__SIM_T += dt; S.bar = S.barMax; if (state === 'playing') update(dt); visuals(dt);
      for (const z of zombies){ H(z.g.position.x); H(z.g.position.y); H(z.g.position.z); H(z.hp); H(z.dead ? 1 : 0); }
      H(S.bar); H(S.money); H(zombies.length);
    }
    return { n: __nHasard(), h, nom: bo.bossName, morts: __bossScene.BS.n.morts, chutes: __bossScene.BS.n.chutes, etat: state };
  }, [on, vi, w]);
  await ctx.close();
  return r;
}
async function identite(b){
  console.log('Identité du jeu, fichier coupé puis allumé (pages neuves, 900 images) :');
  let bon = true;
  for (const [vi, w] of BOSS){
    const a = await partie(b, false, vi, w), c = await partie(b, true, vi, w), same = a.n === c.n && a.h === c.h;
    bon = bon && same;
    console.log('  ' + (c.nom + ' (vague ' + w + ')').padEnd(36) + 'tirages ' + a.n + ' / ' + c.n + ', empreinte ' + a.h + ' / ' + c.h
      + ', chute vue : ' + (c.chutes > 0 ? 'oui' : 'non') + ' -> ' + (same ? 'IDENTIQUE' : 'DIFFÉRENT'));
  }
  return bon;
}
async function dessins(b){
  const { ctx, p } = await page(b);
  const r = await p.evaluate(() => {
    const L = [];
    [[0, 5], [3, 5]].forEach(([vi, w]) => {
      startLocation(vi); state = 'shop'; S.wave = w - 1; startWave();
      clearZombies(); plan.queue = ['walker']; spawnT = 1e9;
      for (let k = 0; k < 6; k++){ const z = spawnZombie('walker'); z.g.position.set(-8 + k * 3, 0, -20 - k * 5); }
      const bo = spawnZombie('boss'); camera.position.copy(EYE); yaw = 0; pitch = -.16;
      __bossScene.BS_REGL.on = true;
      for (let i = 0; i < 25; i++){ window.__SIM_T += 1 / 30; update(1 / 30); visuals(1 / 30); }
      bo.hp = bo.maxHp * .2; for (let i = 0; i < 10; i++){ window.__SIM_T += 1 / 30; update(1 / 30); visuals(1 / 30); }
      const m = () => { renderer.render(scene, camera); return renderer.info.render.calls; };
      const avec = m(); __bossScene.BS_REGL.on = false; visuals(0); const sans = m(); __bossScene.BS_REGL.on = true;
      L.push({ nom: bo.bossName, avec, sans });
    });
    return L;
  });
  await ctx.close();
  console.log('Appels de dessin pendant l’arrivée (contre-jour, poussière, oiseaux) :');
  r.forEach(x => console.log('  ' + x.nom.padEnd(28) + 'coupé ' + x.sans + ', allumé ' + x.avec + ' (+' + (x.avec - x.sans) + ')'));
}
async function sons(b){
  const p = await (await b.newContext()).newPage();
  await p.goto(url); await p.waitForFunction(() => typeof __bossSons === 'object' && typeof Snd === 'object');
  const r = await p.evaluate(async () => { Snd.init(); if (!Snd.ctx) return { erreur: 'pas d’audio' }; return __bossSons.mesurer(); });
  if (r.erreur){ console.log(r.erreur); return; }
  const pad = (s, n) => (String(s) + ' '.repeat(n)).slice(0, n);
  console.log(pad('Son', 46) + pad('Groupe', 8) + pad('Crête', 8) + pad('Court', 8) + pad('Moyen', 8) + 'Cell');
  r.sons.forEach(s => console.log(pad(s.nom, 46) + pad(s.groupe, 8) + pad(s.pic, 8) + pad(s.court, 8) + pad(s.moyen, 8) + s.cell));
  if (r.pire) console.log(pad('Pire cas : Titan à la barricade, pas, chute, fusil d’assaut', 62) + pad(r.pire.pic, 8) + pad(r.pire.court, 8) + pad(r.pire.moyen, 8) + r.pire.cell);
}

(async () => {
  const b = await chromium.launch({ args: ARGS });
  let bon = true;
  if (quoi === 'identite' || quoi === 'tout') bon = await identite(b);
  if (quoi === 'dessins' || quoi === 'tout') await dessins(b);
  if (quoi === 'sons' || quoi === 'tout') await sons(b);
  await b.close();
  process.exit(bon ? 0 : 1);
})();
