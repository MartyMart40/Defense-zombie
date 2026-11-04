'use strict';
/* ================= Statistiques à vie ================= */
// Bouton « 📊 Statistiques » sur l'écran titre. Un écran qui rassemble :
//   - le temps joué (toit, robot, RTS), compté ici dans P.vie.temps (secondes, hors pause) ;
//   - les compteurs à vie déjà tenus par les succès (P.st : zombies, têtes, boss, survivants, barils, vagues, victoires) ;
//   - les records de chaque mode (villes, mode infini, combo, robot, RTS, défi) ;
//   - l'arme préférée : zombies abattus avec chaque arme en main sur le toit (P.vie.armes ; les défenses et
//     les compagnons comptent aussi pour l'arme en main à ce moment-là).
// Sauvegarde : P.vie = { temps:{ toit, robot, rts }, armes:{ id:n } }, valeurs par défaut, anciennes sauvegardes OK.

function vieNorm(){
  const o = P.vie && typeof P.vie === 'object' ? P.vie : {};
  const t = o.temps && typeof o.temps === 'object' ? o.temps : {}, a = o.armes && typeof o.armes === 'object' ? o.armes : {};
  P.vie = { temps:{ toit:+t.toit > 0 ? +t.toit : 0, robot:+t.robot > 0 ? +t.robot : 0, rts:+t.rts > 0 ? +t.rts : 0 }, armes:{} };
  Object.keys(a).forEach(k => { const v = +a[k]; if (v > 0 && isFinite(v)) P.vie.armes[k] = Math.floor(v); });
  return P.vie;
}
vieNorm();
const VIE = () => P.vie && P.vie.temps && P.vie.armes ? P.vie : vieNorm();

// Temps de jeu (pas en pause, pas dans les menus)
Jeu.on('image', dt => {
  if (!(dt > 0) || dt > .5) return;
  const v = VIE();
  if (state === 'playing') v.temps.toit += dt;
  else if (state === 'mech' && MECH.on && !MECH.paused) v.temps.robot += dt;
  else if (state === 'rts' && RTS.on && !RTS.paused) v.temps.rts += dt;
});
// Zombies abattus par arme en main (toit seulement)
Jeu.on('tue', (z, was) => { if (was && state === 'playing' && S && S.cur){ const a = VIE().armes; a[S.cur] = (a[S.cur] || 0) + 1; } });

/* ---------- Écran ---------- */
const scrStats = document.createElement('section'); scrStats.id = 'scrStats'; scrStats.className = 'screen hide';
scrStats.innerHTML = '<div class="panel"><h2 class="title sm">Statistiques</h2><div id="statsBody"></div><button class="big" id="btnStatsBack" type="button">Retour</button></div>';
document.body.appendChild(scrStats);
const vieDuree = s => { s = Math.floor(s || 0); const h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60); return h ? h + ' h ' + String(m).padStart(2, '0') + ' min' : m ? m + ' min' : s + ' s'; };
function statsHTML(){
  const v = VIE(), st = (typeof MS === 'function' ? MS() : P.st) || {}, n = x => fmtN(+x || 0);
  const tot = v.temps.toit + v.temps.robot + v.temps.rts;
  const ligne = (k, val) => '<div class="row"><div class="info"><div class="nm">' + k + '</div></div><div class="st-v">' + val + '</div></div>';
  let h = '<h3>Temps de jeu</h3>' + ligne('Au total', vieDuree(tot)) + ligne('Sur le toit', vieDuree(v.temps.toit)) + ligne('Robot de combat', vieDuree(v.temps.robot)) + ligne('Guerre des robots', vieDuree(v.temps.rts));
  const kills = +st.kills || 0, heads = +st.heads || 0;
  h += '<h3>Combat</h3>' + ligne('Zombies abattus', n(kills)) + ligne('Tirs à la tête', n(heads) + (kills ? ' (' + Math.round(100 * heads / kills) + ' % des abattus)' : ''))
    + ligne('Boss abattus', n(st.boss)) + ligne('Survivants sauvés', n(st.surv)) + ligne('Barils que tu as fait sauter', n(st.barrels)) + ligne('Vagues tenues', n(st.waves)) + ligne('Victoires (villes et défis)', n(st.wins));
  const villes = LOCS.filter(L => P.wins && P.wins[L.id] > 0).length;
  let inf = 0, infV = ''; try { LOCS.forEach(L => { const b = infBest(L.id); if (b > inf){ inf = b; infV = L.name; } }); } catch (e) { errNote(e); }
  h += '<h3>Records</h3>' + ligne('Villes libérées', villes + ' / ' + LOCS.length) + ligne('Mode infini', inf ? inf + ' vagues (' + infV + ')' : 'pas encore')
    + ligne('Meilleur combo', n(P.comboBest)) + ligne('Niveau', n(P.level || 1))
    + ligne('Robot : rues traversées', n(Math.max(+st.mechStreet || 0, (MECH.best || 1) - 1))) + ligne('Guerre des robots : nids détruits', n(RTS.best))
    + ligne('Guerre des robots : minutes tenues', n(st.rtsMin));
  if (P.defi && +P.defi.record) h += ligne('Défi du jour : meilleure série', n(P.defi.record) + ' jours');
  // Armes : les 5 qui ont abattu le plus de zombies
  const arm = Object.keys(v.armes).filter(k => WEAPONS[k]).sort((a, b) => v.armes[b] - v.armes[a]).slice(0, 5), max = arm.length ? v.armes[arm[0]] : 0;
  h += '<h3>Armes (zombies abattus avec l’arme en main)</h3>';
  h += arm.length ? arm.map((k, i) => '<div class="row st-arme"><div class="info"><div class="nm">' + (i ? '' : '⭐ ') + WEAPONS[k].name + '</div><div class="st-bar"><i style="width:' + Math.round(100 * v.armes[k] / max) + '%"></i></div></div><div class="st-v">' + n(v.armes[k]) + '</div></div>').join('')
    : '<p class="lead">Joue une partie sur le toit pour voir ton arme préférée.</p>';
  if (P.achScrap) h += '<p class="best">Ferraille gagnée par les succès : ' + n(P.achScrap) + ' ⚙</p>';
  return h;
}
function openStats(){ $('statsBody').innerHTML = statsHTML(); showScreen(null); scrStats.classList.remove('hide'); }
function closeStats(){ scrStats.classList.add('hide'); showScreen('scrTitle'); }
$('btnStatsBack').addEventListener('click', closeStats);
(function(){
  const ref = $('btnSuccesTitle');
  if (ref && ref.parentNode && !$('btnStatsTitle')){
    const b = document.createElement('button'); b.className = 'ghost'; b.id = 'btnStatsTitle'; b.type = 'button'; b.textContent = '📊 Statistiques';
    ref.parentNode.insertBefore(b, ref.nextSibling);
    b.addEventListener('click', () => { if (typeof Snd === 'object') Snd.init(); openStats(); });
  }
})();

// Accès pour les tests automatiques
window.__stats = { VIE, vieNorm, statsHTML, openStats, closeStats, vieDuree };
