'use strict';
/* ================= Données de jeu ================= */
const WEAPONS = {
  pistol:  { id:'pistol',  name:'Pistolet',         price:0,    dmg:30,  rate:3.2, mag:12, reload:1.1, pellets:1, spread:.0015, pierce:1, zoomFov:56, recoil:.03, desc:'Précis et rapide à recharger.' },
  shotgun: { id:'shotgun', name:'Fusil à pompe',     price:350,  dmg:17,  rate:1.15, mag:6, reload:2.0, pellets:9, spread:.055, pierce:1, zoomFov:60, recoil:.08, desc:'Dévastateur de près, faible au bout de la rue.' },
  rifle:   { id:'rifle',   name:'Fusil d’assaut',   price:900,  dmg:24,  rate:9,   mag:30, reload:1.8, pellets:1, spread:.014, pierce:1, zoomFov:50, recoil:.022, desc:'Tir automatique, garde le doigt sur la gâchette.' },
  sniper:  { id:'sniper',  name:'Sniper',           price:1600, dmg:190, rate:.9,  mag:5,  reload:2.4, pellets:1, spread:0,    pierce:4, zoomFov:18, recoil:.11, desc:'Énormes dégâts, traverse jusqu’à 4 zombies. Lunette quand tu vises.' }
};
const WORDER = ['pistol', 'shotgun', 'rifle', 'sniper'];
const UPG = {
  dmg:    { name:'Dégâts',             desc:'+12 % de dégâts par niveau, toutes les armes.', max:10, cost:l => Math.round(160 * Math.pow(1.45, l)) },
  reload: { name:'Recharge rapide',    desc:'Recharge 12 % plus vite par niveau.',          max:5,  cost:l => Math.round(140 * Math.pow(1.5, l)) },
  mag:    { name:'Chargeurs agrandis', desc:'+20 % de balles par chargeur.',               max:5,  cost:l => Math.round(150 * Math.pow(1.5, l)) },
  wall:   { name:'Barricade renforcée', desc:'+100 de solidité et réparation complète.',    max:8,  cost:l => Math.round(220 * Math.pow(1.4, l)) }
};
// XP par type (un type absent d'ici utilise T.xp, sinon 5)
const ZXP = { walker:3, runner:5, brute:20, jumper:6, flyer:8, spitter:10, colossus:80 };
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
  colossus: { name:'Colosse',  hp:1500, speed:.55,  dmg:45, reward:250, scale:2.8,  skin:0x4e5e3c, stopOff:2.6, hitShake:1.1, chips:16 }
};
// Combien de zombies l'appareil peut afficher en même temps sans ramer
const BASE_ALIVE = isTouch ? 26 : 34, DEV_CAP = isTouch ? 60 : 100;
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
    maxAlive: Math.round(Math.min(DEV_CAP, BASE_ALIVE * (1 + k * .5) * Math.sqrt(INT()))),
    dmgMult: 1 + k * .6, cashMult: 1 + k * .5, xp: L.xp };
}


let S = null, state = 'menu', plan = null, spawnT = 0, endT = -1, lastBonus = 0;
let firing = false, cool = 0, reloadT = 0, reloadDur = 0, zoomed = false, recoilAcc = 0, kick = 0, shake = 0, groanT = 3, overT = -1;
let yaw = 0, pitch = -0.16, sens = store.get('dt_sens', 1);
const YAW_MAX = 1.2, PITCH_MIN = -1.3, PITCH_MAX = 0.3;
const zombies = [], hitMeshes = [];

function newGame(){
  S = { wave:0, money:0, kills:0, earned:0, waveKills:0, xpGained:0, levelUps:0, owned:{ pistol:true }, cur:'pistol', ammo:{}, upg:{ dmg:0, reload:0, mag:0, wall:0 }, barMax:300, bar:300 };
  S.barMax = S.bar = barMaxCalc();
  clearZombies(); yaw = 0; pitch = -.16; zoomed = false; firing = false; reloadT = 0; cool = 0; overT = -1;
  equip('pistol'); refillAll();
}
const magSize = id => Math.round(WEAPONS[id].mag * (1 + .2 * S.upg.mag));
const dmgMult = () => (1 + .12 * S.upg.dmg) * (1 + .06 * T('marksman'));
const reloadMult = () => Math.max(.3, (1 - .12 * S.upg.reload) * (1 - .07 * T('hands')));
const headMult = () => 2.5 * (1 + .15 * T('headhunter'));
const barMaxCalc = () => 300 + 100 * S.upg.wall + 50 * T('carpenter');
function refillAll(){ WORDER.forEach(id => { if (S.owned[id]) S.ammo[id] = magSize(id); }); reloadT = 0; }
