'use strict';
/* ================= Mesure des moments de crise sur le toit (tâche 100) ================= */
// Fait jouer la campagne au robot-joueur de outils/sim-bot.js (sans le modifier) et note, pour chaque vague :
//   le plus bas de la barricade, si un assaut et une brèche ont eu lieu (js/64-crise.js), et si la vague a été tenue.
// Mesure principale : la part des « vagues chaudes » (barricade sous 30 % à un moment, vague tenue quand même)
// et le nombre d'essais par ville.
// Pour que deux lancements donnent la même chose : une page à la fois, chacune dans son propre contexte de
// navigateur (sauvegarde à part), et deux sources de hasard caché retirées ici (outils/sim-bot.js n'est pas modifié) :
//   - le son : couper le volume ne suffit pas, les sons lisent l'horloge audio réelle (ex. « tir rapide : on allège »)
//     et piochent alors plus ou moins dans Math.random ; on retire donc le contexte audio (Snd.ctx = null) ;
//   - le hasard du chargement de la page (ex. les 3 missions actives, gardées dans le profil de départ du robot-joueur)
//     est fixé avant le premier script du jeu ;
//   - performance.now suit le temps simulé (avancé à chaque pas), pas le vrai temps.
// Vérifié : deux lancements de la même graine donnent la même campagne.
// Usage :
//   python3 -m http.server 8766        (à la racine du dépôt, dans un autre terminal)
//   node outils/mesure-crise.js [joueurs] [graines] [essais] [fichier.json]
//     joueurs : debutant,moyen,bon (défaut)   graines : 1,2,3 (défaut) ou 1-6   essais : par ville (défaut 4)
//   Adresse : SIM_URL (défaut http://localhost:8766/)
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const BASE = process.env.SIM_URL || 'http://localhost:8766/';
const joueurs = (process.argv[2] || 'debutant,moyen,bon').split(',').filter(Boolean);
const gArg = process.argv[3] || '1,2,3';
const graines = /^\d+-\d+$/.test(gArg) ? (() => { const [a, b] = gArg.split('-').map(Number), r = []; for (let i = a; i <= b; i++) r.push(i); return r; })() : gArg.split(',').map(Number).filter(n => n > 0);
const essais = +process.argv[4] || 4;
const sortie = process.argv[5] || '';
const SEUIL = .3; // « chaude » : la barricade est descendue sous 30 %

async function unePartie(b, joueur, graine){
  const ctx = await b.newContext();
  const p = await ctx.newPage();
  await p.addInitScript(() => { let s = 4242; Math.random = function(){ s = s * 16807 % 2147483647; return (s - 1) / 2147483646; }; });
  const erreurs = [];
  p.on('pageerror', e => erreurs.push(e.message));
  await p.goto(BASE);
  await p.waitForFunction(() => typeof startLocation === 'function');
  await p.addScriptTag({ path: path.join(__dirname, 'sim-bot.js') });
  await p.evaluate(() => {
    SIM.preparer();
    try { if (Snd.ctx && Snd.ctx.close) Snd.ctx.close(); } catch (e) {}
    Snd.ctx = null; Snd.init = function(){};
    let horloge = 1e6; performance.now = () => horloge;
    // Suivi de chaque vague (une nouvelle partie = un nouvel objet S)
    const MC = window.MC = { parties: [], cur: null };
    SIM.BOT.chaque = function(t, dt){
      horloge += (dt || 0) * 1000;
      if (!S || !(S.barMax > 0)) return;
      if (!MC.cur || MC.cur.S !== S){ MC.cur = { S, ville: curLoc.name, vagues: {} }; MC.parties.push(MC.cur); }
      const w = S.wave; let v = MC.cur.vagues[w];
      if (!v) v = MC.cur.vagues[w] = { v: w, min: 1, assaut: 0, breche: 0 };
      v.min = Math.min(v.min, Math.max(0, S.bar) / S.barMax);
      const C = window.__crise;
      if (C){ v.assaut = Math.max(v.assaut, C.assautsVague || 0); v.breche = Math.max(v.breche, C.brecheVague || 0); }
    };
  });
  const c = await p.evaluate(o => SIM.campagne(o), { joueur, graine, essais, maxMin: 40 });
  const suivi = await p.evaluate(() => MC.parties.map(x => ({ ville: x.ville, vagues: Object.values(x.vagues) })));
  await ctx.close();
  // Chaque partie de la campagne avec ses vagues suivies (même ordre)
  const parties = c.parties.map((r, i) => {
    const s = suivi[i] || { vagues: [] };
    const vagues = s.vagues.map(v => {
      const tenue = r.gagne || v.v < r.vague;
      const perdue = !r.gagne && !r.finTemps && v.v === r.vague;
      return { v: v.v, min: Math.round(v.min * 100), assaut: v.assaut, breche: v.breche, tenue, perdue };
    });
    return { ville: r.ville, essai: r.essai, gagne: r.gagne, vague: r.vague, sur: r.sur, finTemps: r.finTemps, vagues };
  });
  return { joueur, graine, parties, erreurs, decalage: suivi.length !== c.parties.length };
}

function resume(liste){
  let vagues = 0, chaudes = 0, tenues = 0, perdues = 0, assauts = 0, vAssaut = 0, breches = 0, brechesSauvees = 0;
  const ess = {}, ok = {};
  liste.forEach(cmp => {
    const parVille = {};
    cmp.parties.forEach(r => {
      parVille[r.ville] = r.essai; if (r.gagne) ok[r.ville] = (ok[r.ville] || 0) + 1;
      r.vagues.forEach(v => {
        if (!v.tenue && !v.perdue) return; // arrêtée (trop long)
        vagues++; if (v.tenue) tenues++; if (v.perdue) perdues++;
        if (v.tenue && v.min < SEUIL * 100) chaudes++;
        if (v.assaut){ vAssaut++; assauts += v.assaut; }
        if (v.breche){ breches++; if (v.tenue) brechesSauvees++; }
      });
    });
    Object.keys(parVille).forEach(k => { (ess[k] = ess[k] || []).push(parVille[k]); });
  });
  const villes = {};
  Object.keys(ess).forEach(k => { const a = ess[k]; villes[k] = { essais: +(a.reduce((s, x) => s + x, 0) / a.length).toFixed(2), libereeSur: (ok[k] || 0) + '/' + a.length }; });
  return { parties: liste.length, vagues, tenues, perdues, chaudes, partChaudes: vagues ? Math.round(1000 * chaudes / vagues) / 10 : 0,
    vaguesAvecAssaut: vAssaut, assauts, breches, brechesSauvees, villes };
}

(async () => {
  const t0 = Date.now();
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'], executablePath: process.env.CHROMIUM_PATH || undefined });
  const tout = {};
  for (const j of joueurs){
    tout[j] = [];
    for (const g of graines){
      const t1 = Date.now();
      const r = await unePartie(b, j, g); // une page à la fois
      tout[j].push(r);
      console.log(j + ' graine ' + g + ' (' + Math.round((Date.now() - t1) / 1000) + ' s) : ' + r.parties.map(x => x.ville.split(' ')[0] + (x.gagne ? '✓' : '✗' + x.vague)).join(' ') + (r.erreurs.length ? '  ERREURS : ' + r.erreurs.slice(0, 2).join(' | ') : '') + (r.decalage ? '  (suivi décalé)' : ''));
    }
  }
  await b.close();
  const res = {};
  Object.keys(tout).forEach(j => { res[j] = resume(tout[j]); });
  console.log('\nRésumé (' + graines.length + ' campagne(s) par joueur, ' + essais + ' essais au plus par ville) :');
  Object.keys(res).forEach(j => {
    const r = res[j];
    console.log('  ' + j + ' : ' + r.vagues + ' vagues jouées, ' + r.chaudes + ' chaudes (' + String(r.partChaudes).replace('.', ',') + ' %), ' + r.perdues + ' perdues, '
      + r.assauts + ' assauts, ' + r.breches + ' brèches (' + r.brechesSauvees + ' sauvées)');
    console.log('    essais par ville : ' + Object.keys(r.villes).map(k => k + ' ' + String(r.villes[k].essais).replace('.', ',') + ' (' + r.villes[k].libereeSur + ')').join(', '));
  });
  console.log('Durée : ' + Math.round((Date.now() - t0) / 1000) + ' s');
  if (sortie) fs.writeFileSync(sortie, JSON.stringify({ date: new Date().toISOString(), graines, essais, resume: res, detail: tout }, null, 1));
})().catch(e => { console.error(e); process.exit(1); });
