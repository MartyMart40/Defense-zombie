'use strict';
/* ================= Vagues ================= */
function showScreen(id){ ['scrTitle', 'scrMap', 'scrTalents', 'scrShop', 'scrPause', 'scrOver'].forEach(s => $(s).classList.toggle('hide', s !== id)); }
function setPlayingUI(on){
  $('hud').classList.toggle('hide', !on && state === 'menu');
  $('cross').classList.toggle('hide', !on);
  $('touch').classList.toggle('hide', !(on && isTouch));
  document.body.classList.toggle('aiming', on);
  updateRotateHint();
}
let bannerTO = 0;
function banner(t, s, ms){ $('bTitle').textContent = t; $('bSub').textContent = s || ''; $('banner').classList.add('on'); clearTimeout(bannerTO); bannerTO = setTimeout(() => $('banner').classList.remove('on'), ms || 2000); }
function startWave(){
  S.wave++; S.waveKills = 0; plan = wavePlan(S.wave); spawnT = 1.4; endT = -1;
  refillAll(); state = 'playing'; showScreen(null); setPlayingUI(true);
  banner('Vague ' + S.wave + ' / ' + curLoc.waves, S.wave === curLoc.waves ? 'Dernière vague !' : (S.wave === 1 ? curLoc.name + ' : ils arrivent par la rue.' : plan.total + ' zombies en approche'));
  lockPointer();
}
function endWave(){
  lastBonus = Math.round((40 + 15 * S.wave) * plan.cashMult * (1 + .08 * T('scavenger'))); S.money += lastBonus; S.earned += lastBonus;
  addXP(15 * S.wave * curLoc.xp);
  state = 'shop'; firing = false; zoomed = false; setPlayingUI(false); unlockPointer();
  if (S.wave >= curLoc.waves){ victory(); return; }
  renderShop(); showScreen('scrShop');
}
function victory(){
  state = 'over'; firing = false; zoomed = false; setPlayingUI(false); unlockPointer();
  const i = LOCS.indexOf(curLoc);
  addXP(150 * (i + 1) * curLoc.xp);
  P.best[curLoc.id] = curLoc.waves; P.wins[curLoc.id] = (P.wins[curLoc.id] || 0) + 1;
  let extra = '';
  if (i + 1 < LOCS.length && P.unlocked < i + 2){ P.unlocked = i + 2; extra = 'Nouvelle ville débloquée : ' + LOCS[i + 1].name + ' !'; }
  else if (i + 1 >= LOCS.length) extra = 'Tu as libéré la dernière ville. Bravo !';
  saveP(); showEnd(true, extra);
}
function gameOver(){
  state = 'over'; firing = false; zoomed = false; setPlayingUI(false); unlockPointer();
  P.best[curLoc.id] = Math.max(P.best[curLoc.id] || 0, S.wave - 1); saveP();
  showEnd(false, '');
}
let againNext = false;
function showEnd(won, extra){
  const held = won ? curLoc.waves : Math.max(0, S.wave - 1);
  $('overTitle').textContent = won ? curLoc.name + ' libérée !' : 'La barricade a cédé';
  $('overStats').innerHTML = '<span>Vagues tenues : <strong>' + held + ' / ' + curLoc.waves + '</strong></span><span>Zombies abattus : <strong>' + S.kills + '</strong></span><span>Expérience : <strong>+' + S.xpGained + ' XP</strong></span>';
  $('overXP').innerHTML = lvlHTML();
  let msg = extra;
  if (S.levelUps) msg += (msg ? ' ' : '') + 'Tu as gagné ' + S.levelUps + ' niveau' + (S.levelUps > 1 ? 'x' : '') + ', va placer tes points de talent.';
  
  $('overBest').textContent = msg;
  const nxt = LOCS[LOCS.indexOf(curLoc) + 1];
  againNext = won && !!nxt;
  $('btnAgain').textContent = againNext ? 'Continuer : ' + nxt.name : (won ? 'Rejouer ' : 'Réessayer ') + curLoc.name;
  $('btnAgain').className = 'big'; $('btnMap').className = 'ghost';
  $('btnTalentsOver').textContent = 'Talents' + (P.pts ? ' (' + P.pts + ' point' + (P.pts > 1 ? 's' : '') + ' à placer)' : '');
  showScreen('scrOver');
}
function startLocation(i){
  Snd.init(); curLoc = LOCS[i]; P.last = i; saveP();
  buildWorld(curLoc); newGame();
  const cash = curLoc.cash + 150 * T('savings');
  S.money = cash; plan = wavePlan(1);
  if (cash > 0){ state = 'shop'; lastBonus = 0; setPlayingUI(false); $('hud').classList.remove('hide'); renderShop(); showScreen('scrShop'); }
  else startWave();
}
function campaignIdx(){ const i = LOCS.findIndex(L => !(P.wins[L.id] > 0)); return i < 0 ? LOCS.length - 1 : i; }
function goMap(){
  state = 'menu'; clearZombies(); setPlayingUI(false); $('hud').classList.add('hide');
  renderMap(); showScreen('scrMap');
}
function renderIntensity(){
  const v = INT();
  $('intVal').textContent = intFmt(v);
  $('intMinus').disabled = v <= 1;
  const first = wavePlan(1, curLoc).total;
  $('intDesc').textContent = (v === 1 ? 'Normal. ' : '') + 'Vague 1 de ' + curLoc.name + ' : ' + first + ' zombies. Plus il y en a, plus tu gagnes d’argent et d’expérience. Pas de maximum : au-delà de ' + DEV_CAP + ' à la fois, ils attendent leur tour au bout de la rue.';
}
function cityTotal(L){ let n = 0; for (let w = 1; w <= L.waves; w++) n += wavePlan(w, L).total; return n; }
function renderMap(){
  $('mapLvl').innerHTML = lvlHTML();
  $('btnTalentsMap').textContent = 'Talents' + (P.pts ? ' (' + P.pts + ' point' + (P.pts > 1 ? 's' : '') + ' à placer)' : '');
  let h = '';
  LOCS.forEach((L, i) => {
    const locked = i >= P.unlocked, won = (P.wins[L.id] || 0) > 0, best = P.best[L.id] || 0;
    const meta = locked ? 'Libère ' + LOCS[i - 1].name + ' pour débloquer'
      : won ? 'Libérée ✓ ' + (P.wins[L.id] > 1 ? '(' + P.wins[L.id] + ' fois)' : '') + ' · +' + Math.round(150 * (i + 1) * L.xp) + ' XP en la gagnant'
      : best ? 'Record : ' + best + ' / ' + L.waves + ' vagues' : (L.cash ? 'Argent de départ : ' + fmt(L.cash) : 'Commence ici');
    h += '<div class="loc' + (locked ? ' locked' : '') + (won ? ' won' : '') + '"><div class="sw" style="background:linear-gradient(' + L.sky[1] + ',' + L.sky[3] + ' 60%,' + L.sky[5] + ')"></div>'
      + '<div class="info"><div class="nm">' + L.name + '</div><div class="ds">' + L.kind + ' · ' + L.waves + ' vagues · ' + cityTotal(L).toLocaleString('fr-CA') + ' zombies · Danger ' + pips(i + 1, 5) + '</div><div class="ds">' + L.desc + '</div><div class="meta">' + meta + '</div></div>'
      + '<button data-loc="' + i + '"' + (locked ? ' disabled aria-label="Verrouillée"' : '') + '>' + (locked ? '🔒' : won ? 'Rejouer' : 'Jouer') + '</button></div>';
  });
  $('mapList').innerHTML = h;
}
let talBack = 'scrMap';
function openTalents(from){ talBack = from; renderTalents(); showScreen('scrTalents'); }
function renderTalents(){
  $('talLvl').innerHTML = lvlHTML() + '<span class="pts">' + P.pts + ' point' + (P.pts > 1 ? 's' : '') + ' à placer</span>';
  let h = '';
  Object.keys(TALENTS).forEach(k => {
    const t = TALENTS[k], l = T(k), max = l >= t.max;
    h += '<div class="row"><div class="info"><div class="nm">' + t.name + pips(l, t.max) + '</div><div class="ds">' + t.desc + ' par point</div></div><button data-tal="' + k + '"' + (max || !P.pts ? ' disabled' : '') + '>' + (max ? 'Max' : '+1') + '</button></div>';
  });
  $('talList').innerHTML = h;
  $('btnRespec').disabled = !Object.values(P.talents).some(v => v > 0);
}
$('talList').addEventListener('click', e => {
  const b = e.target.closest('button[data-tal]'); if (!b || b.disabled) return;
  const k = b.dataset.tal; if (!P.pts || T(k) >= TALENTS[k].max) return;
  P.talents[k] = T(k) + 1; P.pts--; saveP(); Snd.buy(); renderTalents();
});
$('btnRespec').addEventListener('click', () => { let n = 0; Object.keys(P.talents).forEach(k => n += P.talents[k]); P.talents = {}; P.pts += n; saveP(); renderTalents(); });
$('btnTalBack').addEventListener('click', () => { if (talBack === 'scrMap') renderMap(); else if (talBack === 'scrOver') $('btnTalentsOver').textContent = 'Talents' + (P.pts ? ' (' + P.pts + ' à placer)' : ''); showScreen(talBack); });
$('mapList').addEventListener('click', e => { const b = e.target.closest('button[data-loc]'); if (!b || b.disabled) return; startLocation(+b.dataset.loc); });
$('btnTalentsMap').addEventListener('click', () => openTalents('scrMap'));
$('btnTalentsOver').addEventListener('click', () => openTalents('scrOver'));
$('btnMap').addEventListener('click', goMap);
$('btnMapBack').addEventListener('click', () => { showScreen('scrTitle'); });
