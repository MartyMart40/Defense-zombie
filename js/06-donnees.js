'use strict';
/* ================= Données de jeu ================= */
const WEAPONS = {
  pistol:  { id:'pistol',  name:'Pistolet',         price:0,    dmg:30,  rate:3.2, mag:12, reload:1.1, pellets:1, spread:.0015, pierce:1, zoomFov:56, recoil:.03, ucost:70,  upg:['dmg', 'rate', 'reload', 'pierce'], desc:'Précis et rapide à recharger.' },
  shotgun: { id:'shotgun', name:'Fusil à pompe',     price:350,  dmg:17,  rate:1.15, mag:6, reload:2.0, pellets:9, spread:.055, pierce:1, zoomFov:60, recoil:.08, ucost:110, upg:['dmg', 'mag', 'reload', 'pellets'], desc:'Dévastateur de près, faible au bout de la rue.' },
  rifle:   { id:'rifle',   name:'Fusil d’assaut',   price:900,  dmg:24,  rate:9,   mag:30, reload:1.8, pellets:1, spread:.014, pierce:1, zoomFov:50, recoil:.022, ucost:160, upg:['dmg', 'mag', 'reload', 'spread'], desc:'Tir automatique, garde le doigt sur la gâchette.' },
  sniper:  { id:'sniper',  name:'Sniper',           price:1600, dmg:190, rate:.9,  mag:5,  reload:2.4, pellets:1, spread:0,    pierce:4, zoomFov:18, recoil:.11, ucost:220, upg:['dmg', 'rate', 'reload', 'pierce'], desc:'Énormes dégâts, traverse jusqu’à 4 zombies. Lunette quand tu vises.' },
  // Nouvelles armes (projectiles, flammes et montée en régime : 20-armes.js)
  crossbow:{ id:'crossbow', name:'Arbalète',        price:2200, dmg:150, rate:1.2, mag:6,  reload:2.2, pellets:1, spread:0,    pierce:3, zoomFov:34, recoil:.05, kind:'bolt', speed:150, headX:1.6, ucost:260, upg:['dmg', 'mag', 'reload', 'pierce'],
             desc:'Silencieuse. Le carreau traverse 3 zombies et fait très mal à la tête.' },
  flamer:  { id:'flamer',  name:'Lance-flammes',    price:3500, dmg:10,   rate:15,  mag:120, reload:3.2, pellets:1, spread:0,   pierce:99, zoomFov:62, recoil:.002, kind:'flame', range:30, cone:.17, burn:3, burnDps:30, kick:.12, ucost:330, upg:['dmg', 'mag', 'reload', 'burn'],
             desc:'Cône de flammes jusqu’à 30 m de la barricade. Ce qui brûle continue de brûler.' },
  minigun: { id:'minigun', name:'Minigun',          price:5500, dmg:20,  rate:20,  mag:200, reload:5,  pellets:1, spread:.032, pierce:1, zoomFov:56, recoil:.0055, spin:1.1, kick:.35, ucost:420, upg:['dmg', 'mag', 'reload', 'spin'],
             desc:'Cadence énorme après une seconde de lancement. Chargeur de 200, longue recharge.' },
  rocket:  { id:'rocket',  name:'Lance-roquettes',  price:8000, dmg:420, rate:.85, mag:2,  reload:3.2, pellets:1, spread:0,    pierce:1, zoomFov:52, recoil:.13, kind:'rocket', speed:42, radius:5.5, magStep:1, ucost:540, upg:['dmg', 'mag', 'reload', 'radius'],
             desc:'Roquette lente qui explose et déchire tout autour. Seulement 2 par chargeur.' }
};
const WORDER = ['pistol', 'shotgun', 'rifle', 'sniper', 'crossbow', 'flamer', 'minigun', 'rocket'];
// Améliorations propres à chaque arme (WEAPONS[id].upg donne les 4 lignes de l'arme).
// Prix : WEAPONS[id].ucost × 1,55 par niveau. Elles repartent à zéro à chaque partie (S.wupg).
const WUPG = {
  dmg:    { name:'Dégâts',        max:6, desc:W => '+15 % de dégâts par niveau.' },
  rate:   { name:'Cadence',       max:5, desc:W => '+10 % de cadence par niveau.' },
  mag:    { name:'Chargeur',      max:4, desc:W => W.magStep ? '+' + W.magStep + ' roquette par chargeur.' : (W.kind === 'flame' ? '+25 % de carburant par réservoir.' : '+25 % de munitions par chargeur.') },
  reload: { name:'Recharge',      max:4, desc:W => 'Recharge 12 % plus vite par niveau.' },
  pierce: { name:'Perforation',   max:3, desc:W => 'Traverse 1 zombie de plus par niveau.' },
  pellets:{ name:'Plombs',        max:3, desc:W => '+2 plombs par cartouche.' },
  spread: { name:'Précision',     max:4, desc:W => '20 % de dispersion en moins par niveau.' },
  burn:   { name:'Brûlure',       max:4, desc:W => 'La brûlure dure 30 % plus longtemps et fait 15 % plus mal.' },
  spin:   { name:'Montée en régime', max:4, desc:W => 'Prêt à tirer 18 % plus vite.' },
  radius: { name:'Rayon d’explosion', max:4, desc:W => '+12 % de rayon d’explosion.' }
};
const wupgCost = (id, k, l) => Math.round(WEAPONS[id].ucost * Math.pow(1.55, l) * (k === 'dmg' ? 1 : .9));
const UPG = {
  dmg:    { name:'Dégâts',             desc:'+12 % de dégâts par niveau, toutes les armes.', max:10, cost:l => Math.round(160 * Math.pow(1.45, l)) },
  reload: { name:'Recharge rapide',    desc:'Recharge 12 % plus vite par niveau.',          max:5,  cost:l => Math.round(140 * Math.pow(1.5, l)) },
  mag:    { name:'Chargeurs agrandis', desc:'+20 % de balles par chargeur.',               max:5,  cost:l => Math.round(150 * Math.pow(1.5, l)) },
  wall:   { name:'Barricade renforcée', desc:'+100 de solidité et réparation complète.',    max:8,  cost:l => Math.round(220 * Math.pow(1.4, l)) }
};
// XP par type (un type absent d'ici utilise T.xp, sinon 5)
const ZXP = { walker:3, runner:5, brute:20, jumper:6, flyer:8, spitter:10, colossus:80, clown:300 };
// ZTYPES reste un objet ouvert : un autre fichier peut y ajouter un type (ex. ZTYPES.boss = {...}).
// stopOff : recul de l'arrêt devant la barricade ; hitShake / chips : secousse et éclats à chaque coup.
const ZTYPES = {
  walker:   { name:'Marcheur', hp:60,   speed:1.5,  dmg:6,  reward:10,  scale:1,    skin:0x7d9466 },
  runner:   { name:'Coureur',  hp:40,   speed:3.4,  dmg:4,  reward:15,  scale:.95,  skin:0x9aa585 },
  brute:    { name:'Costaud',  hp:380,  speed:.85,  dmg:18, reward:60,  scale:1.55, skin:0x5c7048, stopOff:.5, hitShake:.5, chips:8 },
  // Formes et comportements propres : 18-zombies-types.js
  jumper:   { name:'Sauteur',  hp:45,   speed:4.2,  dmg:5,  reward:18,  scale:1,    skin:0x8e9c6c },
  flyer:    { name:'Volant',   hp:55,   speed:3,    dmg:5,  reward:24,  scale:1,    skin:0x6e5c70 },
  spitter:  { name:'Cracheur', hp:120,  speed:1.2,  dmg:9,  reward:30,  scale:1.1,  skin:0x748c3c },
  colossus: { name:'Colosse',  hp:1500, speed:.55,  dmg:45, reward:250, scale:2.8,  skin:0x4e5e3c, stopOff:2.6, hitShake:1.1, chips:16 },
  // Très rare (environ 1 zombie sur 10 000, compté à vie : 07-zombies.js) ; jamais dans wavePlan. Gros bonus à sa mort.
  clown:    { name:'Clown',    hp:260,  speed:1.6,  dmg:6,  reward:1500, scale:1.02, skin:0x7d9466 }
};
// Combien de zombies en vie à la fois. BASE_ALIVE : vague 1 de Saint-Clou. DEV_CAP : plafond de l'appareil
// (rendu par instances et cibles pré-triées, 07-zombies.js : mesuré avec tests/perf.html).
const BASE_ALIVE = isTouch ? 26 : 34, DEV_CAP = isTouch ? 180 : 400;
// Règle de la campagne : le plafond grandit avec la vague (+25 % par vague) et la ville (difficulté), jusqu'au plafond de l'appareil.
// Saint-Clou vague 1 : 34 (ordi) ; vague 5 : 68 ; Port industriel vague 10 : environ 240 sur ordi, 180 sur cell.
// Le nombre total de zombies de la vague ne change pas (30 × vague × (1 + 0,15 × ville)).
function aliveCap(w, L){
  L = L || curLoc;
  const k = ((L && L.diff) || 1) - 1;
  return Math.round(Math.min(DEV_CAP, BASE_ALIVE * (1 + k * .5) * (1 + .25 * (Math.max(1, w) - 1)) * Math.sqrt(INT())));
}
const ECO = .35; // part de l'argent et de l'XP par zombie (il y en a environ 5 fois plus qu'avant)
function wavePlan(w, L){
  L = L || curLoc;
  const ew = w + L.off, k = L.diff - 1;
  const mult = 1 + .15 * L.off; // chaque ville : +15 % de zombies
  const total = Math.round(30 * w * mult); // vague 1 : 30, vague 2 : 60, etc.
  const brutes = ew >= 4 ? Math.round((Math.floor((ew - 2) / 2) + (ew % 5 === 0 ? 2 : 0)) * (1 + (mult - 1) * .5)) : 0;
  const runners = ew >= 2 ? Math.round(total * Math.min(.4, .08 * (ew - 1))) : 0;
  // Nouveaux types : ils remplacent une partie des marcheurs (le total ne change pas).
  // Sauteurs dès la vague 2 de Saint-Clou, cracheurs dès la 3, volants dès la 4, colosses (rares) dès la 5.
  // Plafonds plus hauts dans les villes plus dures (L.off).
  const off = L.off || 0;
  const jumpers  = ew >= 2 ? Math.round(total * Math.min(.1 + .02 * off, .025 * (ew - 1))) : 0;
  const spitters = ew >= 3 ? Math.round(total * Math.min(.08 + .015 * off, .025 * (ew - 2))) : 0;
  const flyers   = ew >= 4 ? Math.round(total * Math.min(.07 + .015 * off, .02 * (ew - 3))) : 0;
  const colossi  = ew >= 5 ? Math.max(1, Math.round(Math.floor((ew - 3) / 2) * (1 + (mult - 1) * .5))) : 0;
  const add = [['brute', brutes], ['colossus', colossi], ['spitter', spitters], ['flyer', flyers], ['jumper', jumpers], ['runner', runners]];
  // Sécurité : jamais plus de spéciaux que le total (on retire d'abord des coureurs)
  let room = total;
  add.forEach(a => { a[1] = Math.min(a[1], room); room -= a[1]; });
  const q = [];
  for (let i = 0; i < room; i++) q.push('walker');
  add.forEach(a => { for (let i = 0; i < a[1]; i++) q.push(a[0]); });
  for (let i = q.length - 1; i > 0; i--){ const j = Math.floor(Math.random() * (i + 1)); [q[i], q[j]] = [q[j], q[i]]; }
  return { queue: q, total: q.length, hpMult: (1 + .1 * (w - 1)) * (1 + k * .6), spdMult: Math.min(1.7, (1 + .03 * (w - 1)) * (1 + k * .12)),
    interval: Math.max(.12, 1.2 / Math.sqrt(w) / (1 + k * .5)),
    maxAlive: aliveCap(w, L),
    dmgMult: 1 + k * .6, cashMult: 1 + k * .5, xp: L.xp };
}
// Pour un futur mode (infini, « horde ») : une vague énorme avec le mélange de types et la force de la vague w de la ville L.
//   total : nombre de zombies (des milliers possibles : ils attendent leur tour au bout de la rue)
//   o.maxAlive : en vie à la fois (plafonné par DEV_CAP), o.interval : secondes entre deux sorties, o.burst : zombies par sortie
// Ex. : plan = hordePlan(5000, { wave:10, loc:LOCS[4], burst:4 }); puis la boucle normale (15-boucle.js) les fait sortir.
function hordePlan(total, o){
  o = o || {};
  const w = o.wave || 10, L = o.loc || curLoc, base = wavePlan(w, L), cnt = {};
  base.queue.forEach(t => { if (t !== 'boss') cnt[t] = (cnt[t] || 0) + 1; });
  const n0 = base.queue.filter(t => t !== 'boss').length || 1, q = [];
  Object.keys(cnt).forEach(t => { const n = Math.round(total * cnt[t] / n0); for (let i = 0; i < n; i++) q.push(t); });
  while (q.length < total) q.push('walker'); q.length = Math.max(0, Math.round(total));
  for (let i = q.length - 1; i > 0; i--){ const j = Math.floor(Math.random() * (i + 1)); [q[i], q[j]] = [q[j], q[i]]; }
  return Object.assign(base, { queue: q, total: q.length, boss: undefined,
    maxAlive: Math.round(Math.min(DEV_CAP, o.maxAlive || DEV_CAP)), interval: o.interval != null ? o.interval : .05, burst: Math.max(1, Math.round(o.burst || 3)) });
}


let S = null, state = 'menu', plan = null, spawnT = 0, endT = -1, lastBonus = 0;
let firing = false, cool = 0, reloadT = 0, reloadDur = 0, zoomed = false, recoilAcc = 0, kick = 0, shake = 0, groanT = 3, overT = -1;
let yaw = 0, pitch = -0.16, sens = store.get('dt_sens', 1);
const YAW_MAX = 1.2, PITCH_MIN = -1.3, PITCH_MAX = 0.3;
const zombies = [], hitMeshes = [];

function newGame(){
  S = { wave:0, money:0, kills:0, earned:0, waveKills:0, xpGained:0, levelUps:0, owned:{ pistol:true }, cur:'pistol', ammo:{}, upg:{ dmg:0, reload:0, mag:0, wall:0 }, wupg:{}, barMax:300, bar:300 };
  S.barMax = S.bar = barMaxCalc();
  clearZombies(); yaw = 0; pitch = -.16; zoomed = false; firing = false; reloadT = 0; cool = 0; overT = -1;
  equip('pistol'); refillAll();
}
// Niveau d'une amélioration propre à une arme
const wl = (id, k) => (S && S.wupg && S.wupg[id] && S.wupg[id][k]) || 0;
// Accessoires (34-arsenal.js) : accK(id, clé) multiplie la statistique, 1 sans accessoire
const accK = (id, k) => (typeof accMul === 'function' ? accMul(id, k) : 1);
const magSize = id => { const W = WEAPONS[id], l = wl(id, 'mag'); return Math.round((W.magStep ? W.mag + W.magStep * l : W.mag * (1 + .25 * l)) * (1 + .2 * S.upg.mag) * accK(id, 'mag')); };
// Statistiques finales d'une arme (améliorations générales, de l'arme et talents)
const wDmg = id => WEAPONS[id].dmg * (1 + .15 * wl(id, 'dmg')) * dmgMult() * accK(id, 'dmg');
const wRate = id => WEAPONS[id].rate * (1 + .1 * wl(id, 'rate')) * (1 + .05 * T('trigger'));
const wReload = id => WEAPONS[id].reload * Math.max(.4, 1 - .12 * wl(id, 'reload')) * reloadMult() * accK(id, 'reload');
const wPierce = id => WEAPONS[id].pierce + wl(id, 'pierce') + (typeof accAdd === 'function' ? accAdd(id, 'pierce') : 0);
const wPellets = id => WEAPONS[id].pellets + 2 * wl(id, 'pellets');
const wSpread = id => WEAPONS[id].spread * Math.max(.2, 1 - .2 * wl(id, 'spread')) * accK(id, 'spread');
const wBurn = id => (WEAPONS[id].burn || 0) * (1 + .3 * wl(id, 'burn'));
const wBurnDps = id => (WEAPONS[id].burnDps || 0) * (1 + .15 * wl(id, 'burn')) * (1 + .15 * wl(id, 'dmg')) * dmgMult();
const wSpin = id => (WEAPONS[id].spin || 0) * Math.max(.2, 1 - .18 * wl(id, 'spin'));
const wRadius = id => (WEAPONS[id].radius || 0) * (1 + .12 * wl(id, 'radius'));
const dmgMult = () => (1 + .12 * S.upg.dmg) * (1 + .06 * T('marksman'));
const reloadMult = () => Math.max(.3, (1 - .12 * S.upg.reload) * (1 - .07 * T('hands')));
const headMult = () => 2.5 * (1 + .15 * T('headhunter'));
const barMaxCalc = () => 300 + 100 * S.upg.wall + 50 * T('carpenter');
function refillAll(){ WORDER.forEach(id => { if (S.owned[id]) S.ammo[id] = magSize(id); }); reloadT = 0; }
