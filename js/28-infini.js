'use strict';
/* ================= Mode infini ================= */
// Débloqué quand les 5 villes de la campagne sont libérées. Ensuite chaque ville a un bouton « Mode infini » sur la carte.
// Même difficulté partout : seul le décor change. Pas de choix de difficulté : chaque vague a environ +10 % de zombies,
// +10 % de vie et de dégâts, et chaque zombie rapporte +10 % d'argent. Boss toutes les 5 vagues (19-boss.js, plus fort avec la vague).
// Départ avec 1 000 $ (+ talent Bas de laine). Les plafonds de la boutique pour les dégâts et la barricade sont retirés
// (seulement pendant une partie infinie ; les coûts continuent de monter avec la même formule).
// Une partie infinie joue sur une COPIE de la ville (curLoc = copie avec inf:true) : P.wins, P.unlocked, P.best et P.last
// sont mis de côté puis remis tels quels. L'XP et la ferraille comptent normalement (progression permanente).
// Sauvegarde : P.inf = { best:{ idVille: vagues tenues }, runs } (valeurs par défaut au chargement).
// Crochets par réaffectation (comme 25-defi.js) : wavePlan, startLocation, startWave, endWave, renderShop, updateHUD,
// gameOver, victory, showEnd, showScreen, goMap, renderMap.

const INF_CASH = 1000;               // argent de départ
const INF_GROW = 1.1;                // +10 % par vague : nombre de zombies et argent par zombie
// Vie et dégâts montent plus vite que l'argent : les armes sans plafond ne suffisent plus à suivre (vague 20 : vie ×23, dégâts ×12)
const INF_HP_GROW = 1.18, INF_DMG_GROW = 1.14;
const INF_BASE_N = 50;               // zombies à la vague 1
const INF_BASE_HP = 50 / ZTYPES.walker.hp; // un marcheur a environ 50 de vie à la vague 1
const INF_LOC = { diff:2, off:0, xp:2.4, waves:1e9 }; // même difficulté quelle que soit la ville (diff : ferraille par zombie)
const INF_CAP_LOC = { diff:1 };      // plafond de zombies en vie : règle aliveCap de la campagne, sans bonus de ville
const INF_UNCAP = ['dmg', 'wall'];   // améliorations de la boutique sans plafond en infini

/* ---------- Sauvegarde ---------- */
function infNorm(){
  const o = P.inf && typeof P.inf === 'object' ? P.inf : {};
  const best = {};
  if (o.best && typeof o.best === 'object') Object.keys(o.best).forEach(k => { const v = +o.best[k]; if (v > 0 && isFinite(v)) best[k] = Math.floor(v); });
  P.inf = { best, runs: +o.runs > 0 ? Math.floor(+o.runs) : 0 };
  return P.inf;
}
infNorm();
function IP(){ return P.inf && typeof P.inf === 'object' && P.inf.best ? P.inf : infNorm(); }
const infBest = id => IP().best[id] || 0;
const infWonCount = () => LOCS.filter(L => (P.wins && P.wins[L.id]) > 0).length;
const infUnlocked = () => infWonCount() >= LOCS.length;

/* ---------- État de la partie infinie ---------- */
const INF = { run:null, starting:false, mix:false, render:false };
const infActive = () => !!(INF.run && !INF.run.over && curLoc && curLoc.inf);
function infLocOf(i){ return Object.assign({}, LOCS[i], INF_LOC, { cash:INF_CASH, inf:true, baseIdx:i }); }
function infLeave(){
  INF.run = null;
  if (curLoc && curLoc.inf) curLoc = LOCS[curLoc.baseIdx] || LOCS[0];
}
function infSnap(){ return { best:JSON.stringify(P.best || {}), wins:JSON.stringify(P.wins || {}), unlocked:P.unlocked, last:P.last }; }
function infRestore(s){ P.best = JSON.parse(s.best); P.wins = JSON.parse(s.wins); P.unlocked = s.unlocked; P.last = s.last; saveP(); }

/* ---------- Vagues ---------- */
const infPow = w => Math.pow(INF_GROW, Math.max(1, w) - 1);
const infHpPow = w => Math.pow(INF_HP_GROW, Math.max(1, w) - 1), infDmgPow = w => Math.pow(INF_DMG_GROW, Math.max(1, w) - 1);
const infTotal = w => Math.round(INF_BASE_N * infPow(w));
// Part de chaque type spécial selon la vague (le reste : marcheurs). Plus de colosses, cracheurs et volants avec les vagues.
function infMix(w){
  const f = (start, step, max) => w >= start ? Math.min(max, step * (w - start + 1)) : 0;
  return { runner:f(2, .035, .3), jumper:f(2, .02, .14), spitter:f(3, .015, .16), flyer:f(4, .015, .16), brute:f(3, .012, .14), colossus:f(5, .004, .07) };
}
// Plan de base de la vague w (échantillon de 1000 zombies pour le mélange) : hordePlan le met à l'échelle.
function infBasePlan(w){
  const m = infMix(w), N = 1000, q = [];
  let room = N;
  Object.keys(m).forEach(t => { const n = Math.min(room, Math.round(N * m[t])); room -= n; for (let i = 0; i < n; i++) q.push(t); });
  for (let i = 0; i < room; i++) q.push('walker');
  const g = infPow(w);
  return { queue:q, total:q.length, hpMult:INF_BASE_HP * infHpPow(w), dmgMult:infDmgPow(w), cashMult:g, spdMult:Math.min(1.7, 1 + .025 * (w - 1)),
    interval:Math.max(.05, 1 / Math.sqrt(w)), maxAlive:aliveCap(w, INF_CAP_LOC), xp:INF_LOC.xp, inf:true };
}
function infPlan(w){
  const total = infTotal(w);
  let p;
  INF.mix = true;
  try {
    p = hordePlan(total, { wave:w, loc:curLoc, maxAlive:aliveCap(w, INF_CAP_LOC), interval:Math.max(.06, 1.2 / Math.sqrt(w)), burst:clamp(Math.round(total / 250), 1, 6) });
  } finally { INF.mix = false; }
  // Au moins un colosse dès la vague 6 (la mise à l'échelle peut l'arrondir à zéro sur les petites vagues)
  if (w >= 6 && p.queue.indexOf('colossus') < 0){ const j = p.queue.indexOf('walker'); if (j >= 0) p.queue[j] = 'colossus'; }
  // Boss toutes les 5 vagues (même règle que 19-boss.js : il sort après environ 60 % de la vague)
  if (typeof isBossWave === 'function' && isBossWave(w) && typeof bossReady === 'function' && bossReady()){
    p.queue.splice(Math.round(p.queue.length * .4), 0, 'boss');
    p.boss = typeof bossVariant === 'function' ? bossVariant(w, curLoc).name : 'Boss';
  }
  p.total = p.queue.length; p.inf = true;
  return p;
}
const _infWavePlan = wavePlan;
wavePlan = function(w, L){
  const LL = L || curLoc;
  if (!LL || !LL.inf) return _infWavePlan.apply(this, arguments);
  if (INF.mix) return infBasePlan(w); // appelé par hordePlan pour le mélange et la force
  return infPlan(w);
};

/* ---------- Plafonds retirés (dégâts, barricade) ---------- */
INF_UNCAP.forEach(k => {
  const U = UPG[k]; if (!U) return;
  let base = U.max;
  Object.defineProperty(U, 'max', { configurable:true, enumerable:true,
    get(){ if (!infActive()) return base; return INF.render && S ? (S.upg[k] || 0) + 1 : 1e9; },
    set(v){ base = v; } });
});

/* ---------- Départ ---------- */
const _infStartLocation = startLocation;
// force (tests, « Rejouer ») : lancer même si le mode n'est pas débloqué
function infStart(i, force){
  i = clamp(i | 0, 0, LOCS.length - 1);
  if (!force && !infUnlocked()){ toast('Libère les 5 villes pour débloquer le mode infini'); return null; }
  const snap = infSnap(), orig = LOCS[i], L = infLocOf(i);
  INF.run = { idx:i, id:orig.id, prevBest:infBest(orig.id), over:false, newRec:false, held:0 };
  IP().runs++;
  LOCS[i] = L; INF.starting = true; // startLocation(i) prend la copie : curLoc = L (les crochets des autres fichiers la voient passer)
  try { startLocation(i); }
  finally { LOCS[i] = orig; INF.starting = false; infRestore(snap); }
  return INF.run;
}
startLocation = function(i){
  if (i === -1 && curLoc && curLoc.inf) return infStart(curLoc.baseIdx, true); // « Rejouer » de l'écran de fin
  if (!INF.starting) infLeave();
  return _infStartLocation.apply(this, arguments);
};
// Toute autre nouvelle partie (défi, tests) : plus de partie infinie en cours
const _infNewGame = newGame;
newGame = function(){
  if (!INF.starting && !(curLoc && curLoc.inf)) INF.run = null;
  return _infNewGame.apply(this, arguments);
};
const _infGoMap = goMap;
goMap = function(){ infLeave(); return _infGoMap.apply(this, arguments); };

/* ---------- Pendant la partie ---------- */
function infRecord(held){
  const R = INF.run; if (!R) return;
  R.held = Math.max(R.held, held);
  const B = IP().best;
  if (held > (B[R.id] || 0)){ B[R.id] = held; saveP(); }
  if (held > R.prevBest) R.newRec = true;
}
const _infStartWave = startWave;
startWave = function(){
  const r = _infStartWave.apply(this, arguments);
  if (!infActive()) return r;
  try {
    const best = INF.run.prevBest;
    $('bTitle').textContent = 'Vague ' + S.wave;
    let sub = S.wave === 1 ? 'Mode infini · ' + curLoc.name + ' : tiens le plus longtemps possible.' : fmtN(plan.total) + ' zombies en approche';
    if (plan.boss) sub += S.wave === 1 ? ' Un boss viendra.' : ', dont un boss !';
    if (best && S.wave === best + 1) sub += ' Record à battre !';
    $('bSub').textContent = sub;
  } catch (e) { errNote(e); }
  return r;
};
const _infEndWave = endWave;
endWave = function(){
  if (infActive()) infRecord(S.wave);
  return _infEndWave.apply(this, arguments);
};
const _infUpdateHUD = updateHUD;
updateHUD = function(){
  const r = _infUpdateHUD.apply(this, arguments);
  if (!curLoc || !curLoc.inf || !S) return r;
  // Le texte de base est mis en cache comme s'il était affiché : setTxt ne réécrit pas à chaque image
  const w = 'Vague ' + fmtN(S.wave) + ' · infini', n = 'Infini · ' + curLoc.name;
  const ew = $('wave'), en = $('locName');
  if (ew && ew.textContent !== w) ew.textContent = w;
  if (en && en.textContent !== n) en.textContent = n;
  hudCache.wave = 'Vague ' + S.wave + ' / ' + curLoc.waves; hudCache.locName = curLoc.name;
  return r;
};

/* ---------- Boutique ---------- */
const _infRenderShop = renderShop;
renderShop = function(){
  const on = infActive();
  INF.render = on;
  let r;
  try { r = _infRenderShop.apply(this, arguments); } finally { INF.render = false; }
  if (!on) return r;
  try {
    const R = INF.run, best = Math.max(R.prevBest, infBest(R.id));
    if (S.wave === 0){
      $('shopTitle').textContent = 'Mode infini';
      $('shopStats').innerHTML = '<span><strong>' + curLoc.name + '</strong> : des vagues sans fin, de plus en plus fortes</span><span>Argent de départ : <strong>' + fmt(S.money) + '</strong></span>'
        + '<span>Record : <strong>' + (best ? best + ' vague' + (best > 1 ? 's' : '') : 'aucun') + '</strong></span>';
    } else {
      $('shopTitle').textContent = 'Vague ' + S.wave + ' tenue' + (R.newRec ? ' · nouveau record !' : '');
      $('shopStats').innerHTML = '<span><strong>' + fmtN(S.waveKills) + '</strong> zombies abattus</span><span>Bonus de vague : <strong>' + fmt(lastBonus) + '</strong></span>'
        + '<span>Record : <strong>' + best + ' vague' + (best > 1 ? 's' : '') + '</strong></span>';
    }
    // Lignes sans plafond : « Niv. N » au lieu des pastilles
    INF_UNCAP.forEach(k => {
      const box = k === 'wall' ? $('shopWall') : $('shopUpg');
      const b = box && box.querySelector('button[data-act="upg"][data-id="' + k + '"]'); if (!b) return;
      const row = b.closest('.row'), pp = row && row.querySelector('.pips');
      if (pp) pp.outerHTML = '<span class="inf-lv">niv. ' + S.upg[k] + '</span>';
      const ds = row && row.querySelector('.ds'); if (ds) ds.textContent += ' Sans plafond en mode infini.';
    });
    const nw = S.wave + 1;
    $('btnNext').textContent = 'Lancer la vague ' + nw + (typeof isBossWave === 'function' && isBossWave(nw) ? ' (boss)' : '');
  } catch (e) { errNote(e); }
  return r;
};

/* ---------- Fin de partie ---------- */
const _infGameOver = gameOver;
gameOver = function(){
  if (!infActive()) return _infGameOver.apply(this, arguments);
  const R = INF.run;
  infRecord(Math.max(0, (S ? S.wave : 1) - 1));
  R.over = true; saveP();
  const snap = infSnap();
  try { return _infGameOver.apply(this, arguments); } finally { infRestore(snap); infLabels(); }
};
const _infVictory = victory;
victory = function(){ // jamais atteint en infini (vagues sans fin) ; par sécurité, compté comme une fin de partie
  if (!infActive()) return _infVictory.apply(this, arguments);
  return gameOver();
};
const _infShowEnd = showEnd;
showEnd = function(won){
  const r = _infShowEnd.apply(this, arguments);
  const R = INF.run;
  if (!R || !curLoc || !curLoc.inf) return r;
  try {
    const held = R.held, best = infBest(R.id);
    $('overTitle').textContent = 'Mode infini : vague ' + fmtN(Math.max(1, S.wave));
    $('overStats').innerHTML = '<span>Vagues tenues : <strong>' + fmtN(held) + '</strong></span>'
      + '<span>Record de ' + curLoc.name + ' : <strong>' + fmtN(best) + ' vague' + (best > 1 ? 's' : '') + '</strong></span>'
      + '<span>Zombies abattus : <strong>' + fmtN(S.kills) + '</strong></span><span>Argent gagné : <strong>' + fmt(S.earned) + '</strong></span>'
      + '<span>Expérience : <strong>+' + fmtN(S.xpGained) + ' XP</strong></span>' + (typeof scrapEndHTML === 'function' ? scrapEndHTML() : '');
    let msg = R.newRec ? 'Nouveau record ! ' + held + ' vague' + (held > 1 ? 's' : '') + ' tenue' + (held > 1 ? 's' : '') + ' à ' + curLoc.name + (R.prevBest ? ' (ancien : ' + R.prevBest + ').' : '.') : 'Record à battre : ' + best + ' vague' + (best > 1 ? 's' : '') + '.';
    if (S.levelUps) msg += ' Tu as gagné ' + S.levelUps + ' niveau' + (S.levelUps > 1 ? 'x' : '') + ', va placer tes points de talent.';
    msg += ' L’expérience et la ferraille sont gardées. Le mode infini ne compte pas dans la campagne.';
    $('overBest').textContent = msg;
    const ob = $('overBest'); if (ob && ob.classList) ob.classList.toggle('inf-rec', !!R.newRec);
    againNext = false;
    $('btnAgain').textContent = 'Rejouer le mode infini';
  } catch (e) { errNote(e); }
  return r;
};

/* ---------- Carte et écran titre ---------- */
const _infRenderMap = renderMap;
renderMap = function(){
  const r = _infRenderMap.apply(this, arguments);
  try {
    const open = infUnlocked(), n = infWonCount(), list = $('mapList'); if (!list) return r;
    LOCS.forEach((L, i) => {
      const lb = list.querySelector('button[data-loc="' + i + '"]'), row = lb && lb.closest('.loc'), info = row && row.querySelector('.info'); if (!info) return;
      const best = infBest(L.id), d = document.createElement('div');
      d.className = 'inf-row' + (open ? '' : ' locked');
      d.innerHTML = '<span class="inf-txt">' + (open ? 'Mode infini · ' + (best ? 'record : ' + best + ' vague' + (best > 1 ? 's' : '') : 'pas encore de record')
        : 'Mode infini : libère les 5 villes pour le débloquer (' + n + ' / ' + LOCS.length + ')') + '</span>'
        + '<button class="inf-btn" data-inf="' + i + '"' + (open ? '' : ' aria-disabled="true" aria-label="Mode infini verrouillé"') + '>' + (open ? 'Mode infini' : '🔒 Mode infini') + '</button>';
      info.appendChild(d);
    });
  } catch (e) { errNote(e); }
  return r;
};
function infLabels(){
  const b = $('btnInfTitle'); if (!b) return;
  const open = infUnlocked();
  let top = 0, where = '';
  LOCS.forEach(L => { const v = infBest(L.id); if (v > top){ top = v; where = L.name; } });
  b.disabled = !open;
  b.classList.toggle('locked', !open);
  b.textContent = open ? 'Mode infini' + (top ? ' · record : vague ' + top + ' (' + where + ')' : ' débloqué') : '🔒 Mode infini : libère les 5 villes (' + infWonCount() + ' / ' + LOCS.length + ')';
}
const _infShowScreen = showScreen;
showScreen = function(id){
  const r = _infShowScreen.apply(this, arguments);
  if (id === 'scrTitle' || id === 'scrMap'){ infLeave(); infLabels(); }
  return r;
};
(function(){
  const list = $('mapList');
  if (list && list.addEventListener) list.addEventListener('click', e => {
    const b = e.target.closest && e.target.closest('button[data-inf]'); if (!b || b.disabled) return;
    if (b.getAttribute('aria-disabled') === 'true'){ toast('Libère les 5 villes pour débloquer le mode infini'); return; }
    if (typeof Snd === 'object' && Snd.init) Snd.init();
    infStart(+b.dataset.inf);
  });
  // Rappel sur l'écran titre (sous « Carte des villes ») : ouvre la carte
  const ref = $('btnMapTitle');
  if (ref && ref.parentNode && !$('btnInfTitle')){
    const b = document.createElement('button'); b.className = 'ghost inf-title'; b.id = 'btnInfTitle'; b.type = 'button';
    ref.parentNode.insertBefore(b, ref.nextSibling);
    b.addEventListener('click', () => { if (b.disabled) return; if (typeof Snd === 'object' && Snd.init) Snd.init(); goMap(); });
  }
  infLabels();
})();

// Accès pour les tests automatiques
window.__inf = { INF, INF_LOC, INF_CASH, INF_GROW, INF_HP_GROW, INF_DMG_GROW, INF_BASE_N, INF_BASE_HP, INF_UNCAP, infStart, infLeave, infNorm, infUnlocked, infWonCount, infBest,
  infPlan, infBasePlan, infMix, infTotal, infPow, infLabels, get run(){ return INF.run; }, get active(){ return infActive(); } };
