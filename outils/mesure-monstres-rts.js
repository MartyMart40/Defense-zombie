'use strict';
/* ================= Banc des monstres à parade du RTS (dossier 122) ================= */
// Pour chaque monstre (js/74-rts-monstres.js), la même attaque contre une base sans la bonne réponse, puis avec.
// Partie calme (nids et hordes coupés), menace fixée, hasard fixé (outils/sim-page.js), 2 graines. Chaque vague de monstres
// arrive avec une escorte de zombies ordinaires (ESC), que les tourelles et les unités visent aussi.
// Usage : python3 -m http.server 8765 (à la racine), puis node outils/mesure-monstres-rts.js [adresse] [graines] [monstre]
//   monstre : sapeur, pilonneur ou carapace (sans : les trois)
// Ne change aucun fichier : le résultat est affiché.
const { chromium } = require('playwright');
const { nouvellePage } = require('./sim-page.js');
const BASE = (process.argv[2] || 'http://localhost:8765/').replace(/\/?$/, '/');
const GRAINES = (process.argv[3] || '1,2').split(',').map(Number);

// Situations : base (tourelles, unités, barricades), monstres (type, nombre, toutes les « tous » s, de « z » m au nord), menace, durée
const ESC = 24;
// Une ligne « escorte seule » par base sert de témoin : ce que la même base encaisse sans les monstres
const S_B = ['t_cannon', 't_cannon', 't_cannon'], P_B = ['t_mg', 't_mg', 't_mg', 't_cannon', 't_cannon'], C_B = ['t_mg', 't_mg', 't_mg', 't_mg'];
const SV = { n:2, tous:15, z:-80 }, PV = { n:1, tous:999, z:-110 }, CV = { n:2, tous:999, z:-70 };
const BANCS = [
  { m:'sapeur', nom:'Sapeurs, base : 3 tourelles canon. Escorte seule (témoin)', menace:10, duree:60, tour:S_B, vagues:Object.assign({}, SV, { n:0 }), escorte:ESC },
  { m:'sapeur', nom:'Sapeurs contre la base seule', menace:10, duree:60, tour:S_B, vagues:SV, escorte:ESC },
  { m:'sapeur', nom:'Sapeurs : + 4 mitrailleurs devant (parade)', menace:10, duree:60, tour:S_B, unites:{ gunner:4 }, vagues:SV, escorte:ESC },
  { m:'sapeur', nom:'Sapeurs : + 3 barricades devant (parade)', menace:10, duree:60, tour:S_B, murs:3, vagues:SV, escorte:ESC },
  { m:'sapeur', nom:'Sapeurs : 3 tourelles mitrailleuses au lieu des canons', menace:10, duree:60, tour:['t_mg', 't_mg', 't_mg'], vagues:SV, escorte:ESC },
  { m:'pilonneur', nom:'Pilonneur, base : 3 tourelles mitrailleuses, 2 canon, 6 mitrailleurs. Escorte seule (témoin)', menace:13, duree:90, tour:P_B, unites:{ gunner:6 }, vagues:Object.assign({}, PV, { n:0 }), escorte:ESC },
  { m:'pilonneur', nom:'Pilonneur contre la base seule', menace:13, duree:90, tour:P_B, unites:{ gunner:6 }, vagues:PV, escorte:ESC },
  { m:'pilonneur', nom:'Pilonneur : + 2 tireurs d’élite (parade)', menace:13, duree:90, tour:P_B, unites:{ gunner:6, sniper:2 }, vagues:PV, escorte:ESC },
  { m:'pilonneur', nom:'Pilonneur : + 1 tourelle mortier devant (seule, elle vise le plus proche)', menace:13, duree:90, tour:P_B, mortier:true, unites:{ gunner:6 }, vagues:PV, escorte:ESC },
  { m:'pilonneur', nom:'Pilonneur : les 6 mitrailleurs envoyés sur lui quand il s’enracine (parade)', menace:13, duree:90, tour:P_B, envoi:true, unites:{ gunner:6 }, vagues:PV, escorte:ESC },
  { m:'carapace', nom:'Carapaces, base : 4 tourelles mitrailleuses, 8 mitrailleurs. Escorte seule (témoin)', menace:15, duree:90, tour:C_B, unites:{ gunner:8 }, vagues:Object.assign({}, CV, { n:0 }), escorte:ESC },
  { m:'carapace', nom:'Carapaces contre la base seule', menace:15, duree:90, tour:C_B, unites:{ gunner:8 }, vagues:CV, escorte:ESC },
  { m:'carapace', nom:'Carapaces : + 3 robots lance-flammes (parade)', menace:15, duree:90, tour:C_B, unites:{ gunner:8, flamebot:3 }, vagues:CV, escorte:ESC },
  { m:'carapace', nom:'Carapaces : + 3 lance-roquettes (parade)', menace:15, duree:90, tour:C_B, unites:{ gunner:8, rocket:3 }, vagues:CV, escorte:ESC }
];

async function banc(page, B, graine){
  return page.evaluate(async o => {
    const B = o.B; SIM.preparer(); SIM.hasard(o.graine);
    const pause = () => new Promise(r => { const c = new MessageChannel(); c.port1.onmessage = () => r(); c.port2.postMessage(0); });
    rtsStart(); const R = RTS, M = __rtsMonstres;
    Object.keys(M.RM_REGL.plan).forEach(k => { M.RM_REGL.plan[k].temps = 1e12; }); // le plan du jeu ne s'en mêle pas (les monstres viennent du banc)
    R.nests.forEach(n => { n.spawnT = 1e12; n.hp = n.maxHp = 1e12; }); R.hordeT = 1e12; clearZombies();
    R.units.slice().forEach(u => { u.dead = true; rtsRoot.remove(u.g); }); R.units.length = 0;
    R.blds.filter(b => b.B.turret).forEach(b => rtsBldDie(b, true));
    const tFix = (B.menace - 1) * RTS_THREAT.t, fixer = () => { R.t = tFix - R.kills * RTS_THREAT.t / RTS_THREAT.tues; rtsThreat(); };
    fixer();
    // Tourelles en arc devant le QG, barricades 9 m devant elles, unités entre les deux
    const nT = B.tour.length, T = B.tour.map((t, i) => { const a = (-.6 + 1.2 * (nT > 1 ? i / (nT - 1) : .5)), x = Math.round(Math.sin(a) * 16), z = Math.round(-Math.cos(a) * 16); return rtsPlaceBld(t, x, z, true); });
    if (B.mortier) T.push(rtsPlaceBld('t_mortar', 0, -24, true)); // devant : le pilonneur s'enracine à 36 m du bâtiment le plus proche, le mortier porte à 44 m
    for (let i = 0; i < (B.murs || 0); i++){ const a = -.5 + i * .5; rtsPlaceBld('wall', Math.round(Math.sin(a) * 27 / 2) * 2, Math.round(-Math.cos(a) * 27 / 2) * 2, true); }
    let k = 0; const nu = Object.keys(B.unites || {}).reduce((s, t) => s + B.unites[t], 0);
    Object.keys(B.unites || {}).forEach(t => { for (let i = 0; i < B.unites[t]; i++, k++){ const x = -14 + 28 * (nu > 1 ? k / (nu - 1) : .5), z = -21; const u = rtsSpawnUnit(t, x, z); u.tx = u.hx = x; u.tz = u.hz = z; u.cmd = 'idle'; if (t !== 'sniper') u.hold = true; } });
    const bat0 = R.blds.filter(b => !b.dead).reduce((s, b) => s + b.hp, 0), M0 = { ex:M.RM.explosions, ab:M.RM.abattus, imp:M.RM.impacts };
    let t = 0, n = 0, vague = 0, prochaine = 0, mort = null, envoye = false; const dt = 1 / 20, liste = [];
    while (t < B.duree && state === 'rts'){
      fixer();
      if (t >= prochaine && vague < 3){ prochaine += B.vagues.tous; vague++; for (let i = 0; i < B.vagues.n; i++){ const i0 = zombies.length; rtsSpawnAt(-12 + 24 * (B.vagues.n > 1 ? i / (B.vagues.n - 1) : .5), B.vagues.z, 1, 1, B.m); if (zombies[i0]) liste.push(zombies[i0]); }
        rtsSpawnAt(0, B.vagues.z - 6, B.escorte || 0, 14); } // escorte : des zombies ordinaires qui arrivent avec eux
      if (B.envoi && !envoye){ const q = liste.find(z => !z.dead && z.rmEtat === 'plante'); if (q){ envoye = true; rtsSelect(R.units.filter(u => !u.dead), false); rtsOrder({ x:q.g.position.x, z:q.g.position.z + 5 }); R.sel.length = 0; } }
      visuals(dt); SIM.horloge(dt); t += dt;
      if (mort == null && liste.length && liste.every(z => z.dead) && vague >= Math.min(3, Math.ceil(B.duree / B.vagues.tous))) mort = t;
      if (++n % 400 === 0) await pause();
    }
    const bat1 = R.blds.filter(b => !b.dead).reduce((s, b) => s + b.hp, 0);
    const res = { nom:B.nom, graine:o.graine, monstres:liste.length, tues:liste.filter(z => z.dead && !z.rmBoum).length, vivants:liste.filter(z => !z.dead).length,
      degatsBat:Math.round(bat0 - bat1), tourellesPerdues:T.filter(b => b.dead).length, sur:T.length, unitesPerdues:nu - R.units.filter(u => !u.dead).length,
      explosions:M.RM.explosions - M0.ex, impacts:M.RM.impacts - M0.imp, tousMorts:mort == null ? null : Math.round(mort) };
    rtsQuit();
    return res;
  }, { B, graine });
}

(async () => {
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'], executablePath: process.env.CHROMIUM_PATH || undefined });
  console.log('| Situation | Monstres | Abattus | Encore en vie | Sapeurs sautés / obus tombés | Dégâts aux bâtiments | Tourelles perdues | Unités perdues | Tous morts à |');
  console.log('|---|---|---|---|---|---|---|---|---|');
  for (const B of BANCS.filter(B => !process.argv[4] || B.m === process.argv[4])){
    const L = [];
    for (const g of GRAINES){ const p = await nouvellePage(b, BASE, ['sim-bot.js']); L.push(await banc(p, B, g)); await p.close(); }
    const moy = k => Math.round(L.reduce((s, r) => s + r[k], 0) / L.length * 10) / 10;
    const morts = L.map(r => r.tousMorts == null ? 'non' : r.tousMorts + ' s').join(', ');
    console.log('| ' + B.nom + ' | ' + moy('monstres') + ' | ' + moy('tues') + ' | ' + moy('vivants') + ' | ' + (B.m === 'pilonneur' ? moy('impacts') : moy('explosions')) + ' | ' + moy('degatsBat').toLocaleString('fr-CA') + ' | ' + moy('tourellesPerdues') + ' / ' + L[0].sur + ' | ' + moy('unitesPerdues') + ' | ' + morts + ' |');
  }
  await b.close();
})().catch(e => { console.error(e); process.exit(1); });
