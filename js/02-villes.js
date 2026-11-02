'use strict';
/* ================= Villes ================= */
const LOCS = [
  { id:'village', name:'Saint-Clou', kind:'Village', waves:5, diff:1, xp:1, cash:0, off:0, style:'houses', end:'church',
    desc:'Un village tranquille, des maisons et des arbres. Les zombies sont encore lents.',
    sky:['#140d1a','#3a1d22','#a2481f','#e07a30','#6b3420','#2a1712'], fog:0x5e2e1e, fogNear:35, fogFar:135,
    hemi:[0xffa36b,0x2a1a14,.85], sunCol:0xff9a50, sunI:.85, amb:0x402820, glow:0xffffff, glowY:14,
    ground:0x332c24, walk:0x4a4440, lawn:0x2e3a22, walls:['#7a6a55','#6b5a48','#857560','#5e5040'], lit:.1, win:'#ffb35a',
    roofs:[0x4a2a22,0x2f2f35,0x5a3a28], bh:[3.5,5.5], hw:[7,10], gap:[5,12], trees:.85, lamps:true,
    fires:[[8,1.6,-42,1.3,1],[-11.5,1,-13,.6,0]] },
  { id:'ville', name:'Val-des-Cendres', kind:'Petite ville', waves:6, diff:1.4, xp:1.6, cash:300, off:1, style:'town', end:'tower',
    desc:'Une petite ville en briques. Plus de zombies, plus coriaces.',
    sky:['#0f0b1c','#2b1b3a','#7a3a4a','#d0603a','#4a2a30','#201418'], fog:0x4a2a34, fogNear:30, fogFar:125,
    hemi:[0xe0907a,0x201420,.78], sunCol:0xff8a60, sunI:.8, amb:0x3a2030, glow:0xffc0a0, glowY:10,
    ground:0x2c2724, walk:0x4a4440, walls:['#3a302b','#4a3a30','#2f2a28','#55453a','#3d3433'], lit:.06, win:'#ffb35a',
    bh:[10,22], gap:[0,2], lamps:true, fires:[[8,1.6,-42,1.3,1],[-11.5,1,-13,.6,0],[-6,1.4,-75,1,1]] },
  { id:'banlieue', name:'Banlieue Nord', kind:'Banlieue de nuit', waves:7, diff:1.9, xp:2.4, cash:700, off:2, style:'houses', end:'tower',
    desc:'La nuit est tombée sur les grosses maisons. On voit moins loin.',
    sky:['#03050c','#0a1224','#1a2a44','#33465e','#141c28','#0a0d12'], fog:0x141c28, fogNear:22, fogFar:100,
    hemi:[0x6a88b8,0x101418,.62], sunCol:0x8fa0d0, sunI:.4, amb:0x202838, glow:0xbfd8ff, glowY:60,
    ground:0x22252a, walk:0x3a3d42, lawn:0x1c2620, walls:['#4a4e58','#5a5550','#3e4450','#6a6560'], lit:.16, win:'#ffd27a',
    roofs:[0x2a2c33,0x3a3530,0x22262e], bh:[5,7.5], hw:[9,13], gap:[4,9], trees:.5, lamps:true, lampGlow:true,
    fires:[[8,1.6,-42,1.3,1],[-11.5,1,-13,.6,0],[10,1,-20,.7,0]] },
  { id:'centre', name:'Centre-ville', kind:'Gratte-ciel', waves:8, diff:2.6, xp:3.4, cash:1200, off:3, style:'town', end:'tower',
    desc:'Des tours à perte de vue et une ville en feu. Les costauds arrivent tôt.',
    sky:['#120606','#3a0c0a','#8a1e10','#e04a1a','#4a120c','#1a0a08'], fog:0x4a1810, fogNear:25, fogFar:120,
    hemi:[0xff7050,0x1a0c08,.78], sunCol:0xff6030, sunI:.9, amb:0x401810, glow:0xffa080, glowY:8,
    ground:0x2a2422, walk:0x45403e, walls:['#3a3436','#2c2a2e','#45403e','#353a40'], lit:.1, win:'#ffb35a',
    bh:[28,60], gap:[0,1], lamps:true, fires:[[8,1.6,-42,1.3,1],[-11.5,1,-13,.6,0],[-7,1.6,-60,1.3,1],[9,1.2,-95,1.1,0]] },
  { id:'port', name:'Port industriel', kind:'Zone portuaire', waves:10, diff:3.4, xp:4.8, cash:2000, off:4, style:'port', end:'cranes',
    desc:'Conteneurs, grues et brume toxique. La dernière ville, la plus dure.',
    sky:['#0a100a','#18241a','#3a5a2a','#9ab040','#2a3a1e','#101408'], fog:0x2a3a20, fogNear:20, fogFar:105,
    hemi:[0xb0d070,0x101408,.7], sunCol:0xc0e060, sunI:.7, amb:0x203018, glow:0xe0ff90, glowY:12,
    ground:0x262822, walk:0x3c3e38, walls:['#4a4a44','#555048','#3e4240','#5a5248'], lit:.03, win:'#d0ff80',
    cont:[0x8a2a1e,0x1e4a6a,0x3a6a2a,0xa07a1e,0x5a5a5a], bh:[8,13], lamps:false, fires:[[-11.5,1,-13,.6,0],[6,1.2,-50,1,0]] }
];
const TALENTS = {
  marksman:  { name:'Tireur aguerri',     desc:'+6 % de dégâts',                       max:10 },
  headhunter:{ name:'Chasseur de têtes',  desc:'+15 % de dégâts à la tête',            max:5 },
  trigger:   { name:'Doigt nerveux',      desc:'+5 % de cadence de tir',               max:5 },
  hands:     { name:'Mains rapides',      desc:'Recharge 7 % plus vite',               max:5 },
  carpenter: { name:'Charpentier',        desc:'+50 de solidité de barricade',         max:6 },
  scavenger: { name:'Récupérateur',       desc:'+8 % d’argent par zombie',             max:5 },
  savings:   { name:'Bas de laine',       desc:'+150 $ au début de chaque partie',     max:5 },
  student:   { name:'Studieux',           desc:'+10 % d’expérience',                   max:5 }
};
const P = Object.assign({ xp:0, level:1, pts:0, talents:{}, unlocked:1, best:{}, wins:{}, last:0, intensity:1, scrap:0 }, store.get('dt_prof', {}));
const saveP = () => store.set('dt_prof', P);
const INT = () => 1; // plus de choix du nombre de zombies : la difficulté vient de la campagne
const INT_STEPS = [1, 1.5, 2, 3, 4, 5, 7, 10];
function intNext(v){ const i = INT_STEPS.findIndex(x => x > v + 1e-9); return i >= 0 ? INT_STEPS[i] : Math.round(v * 1.5); }
function intPrev(v){ if (v > 10) return Math.max(10, Math.round(v / 1.5)); const l = INT_STEPS.filter(x => x < v - 1e-9); return l.length ? l[l.length - 1] : 1; }
const intFmt = v => '×' + String(v).replace('.', ',');
const xpNeed = l => Math.round(120 * Math.pow(1.3, l - 1));
const T = k => P.talents[k] || 0;
let curLoc = LOCS[Math.min(P.last || 0, P.unlocked - 1, LOCS.length - 1)];
let toastTO = 0;
function toast(t){ const el = document.getElementById('toast'); el.textContent = t; el.classList.add('on'); clearTimeout(toastTO); toastTO = setTimeout(() => el.classList.remove('on'), 2400); }
function addXP(n){
  n = Math.round(n * (1 + .1 * T('student'))); if (n <= 0) return 0;
  P.xp += n; if (S) S.xpGained += n;
  let up = 0; while (P.xp >= xpNeed(P.level)){ P.xp -= xpNeed(P.level); P.level++; P.pts++; up++; }
  if (up){ if (S) S.levelUps += up; toast('Niveau ' + P.level + ' ! +' + up + ' point' + (up > 1 ? 's' : '') + ' de talent'); }
  saveP(); return n;
}
function lvlHTML(){ const need = xpNeed(P.level), pct = Math.round(P.xp / need * 100); return '<span>Niveau <b>' + P.level + '</b></span><span class="xpbar"><i style="width:' + pct + '%"></i></span><span>' + P.xp + ' / ' + need + ' XP</span>'; }
