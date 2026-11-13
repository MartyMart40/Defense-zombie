'use strict';
/* ================= Robot : une course de 9 rues qu'on peut gagner, puis des tours de plus en plus durs ================= */
// Dossier 102 (décidé avec Martin : « une fin gagnable au robot »). Avant, le robot avançait de rue en rue jusqu'à mourir.
//   Course : 9 rues (MECH_FIN.rues). Au milieu de la rue 9 arrive le boss final (un Titan renforcé : « Titan roi ») ;
//            le bout de la rue est fermé tant qu'il vit. Le battre : écran « Course réussie » et prime de victoire.
//   Tours : une victoire débloque le tour suivant (mêmes 9 rues, zombies plus forts, plus de ferraille).
//           On choisit son tour au garage, parmi ceux débloqués. Le meilleur tour réussi est gardé dans le profil.
// Sauvegarde : P.mechFin = { tour (meilleur tour réussi, 0 au départ), wins (courses réussies), choix (tour choisi) }.
//   Une vieille sauvegarde sans ce champ donne { tour:0, wins:0, choix:1 }.
// Après js/40-robot-monstres.js (carrefour, boss) et avant js/50-robot-sauvegarde.js (qui garde aussi le tour).

// pv, deg : vie et dégâts des zombies multipliés à chaque tour ; fer : ferraille en plus par tour (+15 % au tour 2, etc.)
// ferBase : toute la ferraille du robot ×0,8 (dossier 102 : avec le carrefour réparé et les primes, les 9 améliorations
//   du garage étaient toutes au maximum dès la course 6 ou 7 ; avec ×0,8, aux courses 7 à 9, comme avant ce dossier)
// prime : prime de victoire × numéro du tour ; bossPv, bossDeg : le boss final comparé à un Titan de la même rue
// bossA : part de la rue 9 où le boss final arrive ; bossLoin : à combien de mètres devant le robot il apparaît
// bossArret : le boss final s'arrête à ce nombre de mètres devant le robot et frappe le sol de là (onde de choc : 35 % de ses
//   dégâts toutes les 5 s environ). Il ne vient pas au corps à corps : un Titan qui frappe le robot de près lui enlevait
//   400 de blindage par seconde, le robot tombait en 10 s même avec 20 000 ⚙ au garage (simulateur).
// horde : pendant le combat contre le boss final, zombies en vie à la fois × horde (et sorties deux fois moins serrées) :
//   sans ça, le robot debout face au boss avait toute la horde de la rue 9 sur le dos et tombait en 13 s (simulateur)
const MECH_FIN = { rues:9, pv:1.35, deg:1.2, fer:.15, prime:1000, ferBase:.8, bossPv:1, bossDeg:1.2, bossArret:22, horde:.5, bossA:.45, bossLoin:70, nom:'Titan roi' };

function mechFinNorm(){
  const o = P.mechFin && typeof P.mechFin === 'object' ? P.mechFin : {}, n = v => (+v > 0 && isFinite(+v) ? Math.floor(+v) : 0);
  const tour = n(o.tour);
  P.mechFin = { tour, wins:n(o.wins), choix:clamp(n(o.choix) || 1, 1, tour + 1) };
  return P.mechFin;
}
mechFinNorm();
const mechTourMult = t => ({ pv:Math.pow(MECH_FIN.pv, t - 1), deg:Math.pow(MECH_FIN.deg, t - 1), fer:1 + MECH_FIN.fer * (t - 1) });
const mechPrime = t => MECH_FIN.prime * t;
const mechFinRue = () => MECH.on && MECH.street >= MECH_FIN.rues;
const finBossVivant = () => { const z = MECH.finBoss; return z && !z.dead ? z : null; };

/* ---------- Force du tour, rue 9 sans boss ordinaire ---------- */
try {
  const _mp = mechPlan;
  mechPlan = function(){
    const p = _mp.apply(this, arguments);
    try {
      const m = mechTourMult(Math.max(1, MECH.tour || 1));
      p.hpMult *= m.pv; p.dmgMult *= m.deg;
      // Rue 9 : le boss final arrive à part (mechFinPas), pas de boss ordinaire dans la file
      if (MECH.street >= MECH_FIN.rues) for (let i = p.queue.length - 1; i >= 0; i--) if (p.queue[i] === 'boss' || MB_BOSS.indexOf(p.queue[i]) >= 0) p.queue.splice(i, 1);
    } catch (e) { errNote(e); }
    return p;
  };
} catch (e) { errNote(e); }
// Ferraille du robot : × ferBase (toutes les rues), et plus aux tours suivants
try { const _sf = scrapFor; scrapFor = function(){ const v = _sf.apply(this, arguments); return MECH.on && v ? v * MECH_FIN.ferBase * mechTourMult(Math.max(1, MECH.tour || 1)).fer : v; }; } catch (e) { errNote(e); }

/* ---------- Boss final ---------- */
function mechFinBoss(){
  const z = spawnZombie('titan'); if (!z) return null;
  // Sa vie ne dépend pas des renforts déjà arrivés : seulement de la rue et du tour
  const r = Math.pow(MECH_RENFORT, MECH.renf || 0);
  z.finalBoss = true; z.maxHp = z.hp = z.maxHp / r * MECH_FIN.bossPv; z.dmg = z.dmg / r * MECH_FIN.bossDeg; z.reward *= 3;
  z.g.position.set(clamp(MECH.x, -6, 6), 0, MECH_CAM.z - MECH_FIN.bossLoin); z.g.updateMatrixWorld(true);
  z.stopZ = MECH_CAM.z - MECH_FIN.bossArret;
  MECH.finBoss = z; mechFinHorde();
  banner('👑 Boss final : ' + MECH_FIN.nom, 'Abats-le pour gagner la course', 3000);
  return z;
}
function mechFinHorde(){ if (!plan) return; plan.maxAlive = Math.max(10, Math.round(plan.maxAlive * MECH_FIN.horde)); plan.interval /= MECH_FIN.horde; }
// Rue 9 : le bout de la rue reste fermé tant que le boss final n'est pas tombé. La rue s'arrête de défiler à MECH_LEN - 1
// (on ne fait pas reculer le décor : les zombies qui frappent le robot ne sont pas poussés par sa marche, ils auraient reculé).
const mechFinLim = () => MECH_LEN - 1;
try {
  const _t = mechTread;
  mechTread = function(d){ if (d > 0 && mechFinRue()) d = Math.min(d, Math.max(0, mechFinLim() - MECH.dist)); if (d) return _t.call(this, d); };
} catch (e) { errNote(e); }
// Rue 9, à chaque image : le boss arrive au milieu de la rue ; à mi-vie, il appelle une vague de tous les côtés (une fois)
function mechFinPas(){
  if (!MECH.finBoss && MECH.dist >= MECH_FIN.bossA * MECH_LEN) mechFinBoss();
  if (MECH.dist > mechFinLim()) MECH.dist = mechFinLim();
  const b = finBossVivant();
  if (b && !MECH.finMoitie && b.hp < b.maxHp * .5){
    MECH.finMoitie = true;
    if (typeof mbWave === 'function') mbWave();
    banner('Le ' + MECH_FIN.nom + ' appelle la horde !', 'Ils arrivent de partout', 2000);
  }
}
try {
  const _st = mechStep;
  mechStep = function(dt){
    // Pendant le combat contre le boss final, la horde se reforme sans devenir plus forte (pas de renfort de plus) :
    // on est obligé de rester sur place pour le battre
    if (MECH.on && state === 'mech' && !MECH.paused && finBossVivant() && plan && !plan.queue.length){ plan = mechPlan(); mechFinHorde(); }
    const r = _st.apply(this, arguments);
    if (MECH.on && state === 'mech' && !MECH.paused && !MECH.choosing){
      MECH.temps = (MECH.temps || 0) + dt;
      if (mechFinRue()) mechFinPas();
    }
    return r;
  };
} catch (e) { errNote(e); }
Jeu.on('tue', (z, was) => { if (was && z && z.finalBoss && MECH.on && state === 'mech') mechWin(); });

/* ---------- Victoire ---------- */
const mechTemps = s => { s = Math.max(0, Math.round(s || 0)); return Math.floor(s / 60) + ' min ' + String(s % 60).padStart(2, '0') + ' s'; };
function mechFanfare(){
  if (typeof Snd !== 'object' || !Snd.tone) return;
  try { [523, 659, 784, 1047].forEach((f, i) => Snd.tone(f, .28, 'square', .07, null, i * .16)); } catch (e) { errNote(e); }
}
function mechWin(){
  if (MECH.won || !MECH.on) return false;
  MECH.won = true; state = 'mechover'; firing = false; MECH.mini = MECH.rocket = false;
  if (typeof Snd === 'object' && Snd._mgStop) Snd._mgStop();
  mechFanfare(); shake = Math.max(shake, .6);
  const F = mechFinNorm(), t = Math.max(1, MECH.tour || 1), prime = mechPrime(t), nouveau = t > F.tour;
  // La prime de la Grande avenue, si la rue 9 en était une (elle est payée au carrefour d'habitude)
  const pa = MECH.route && MECH.route.prime ? MECH.route.prime : 0;
  P.scrap = (P.scrap || 0) + prime + pa;
  F.wins++; if (nouveau) F.tour = t; F.choix = Math.min(t + 1, F.tour + 1);
  if (MECH.street > MECH.best){ MECH.best = MECH.street; store.set('dt_mech_best', MECH.best); }
  const xp = Math.max(0, Math.round((P.xp || 0) - MECH.xp0)), scr = Math.max(0, Math.round((P.scrap || 0) - MECH.scr0));
  if (typeof smMechWin === 'function') smMechWin(t);
  if (typeof saveP === 'function') saveP();
  if (typeof mechSaveClear === 'function') mechSaveClear();
  if (typeof unlockPointer === 'function') unlockPointer();
  mechBtn();
  banner('Course réussie !', 'Tour ' + t + ' gagné', 2500);
  const R = { tour:t, nouveau, prime, xp, scr, kills:MECH.kills, temps:MECH.temps || 0 };
  MECH.victoire = R;
  setTimeout(() => { if (MECH.on && MECH.won && state === 'mechover') mechWinPanel(R); }, 1500);
  return true;
}
function mechWinPanel(R){
  const t = R.tour;
  mechShowPanel('<h2 class="title sm">Course réussie !</h2><p class="lead">Tour ' + t + ' gagné' + (R.nouveau ? ' · tour ' + (t + 1) + ' débloqué' : '') + '</p><div class="stats">'
    + '<span>Rues : <strong>' + MECH_FIN.rues + ' sur ' + MECH_FIN.rues + '</strong></span>'
    + '<span>Zombies abattus : <strong>' + fmtN(R.kills) + '</strong></span>'
    + '<span>Temps : <strong>' + mechTemps(R.temps) + '</strong></span>'
    + '<span>Prime de victoire : <strong>+' + fmtN(R.prime) + ' ⚙</strong></span>'
    + '<span>Ferraille : <strong>+' + fmtN(R.scr) + ' ⚙</strong> · Expérience : <strong>+' + fmtN(R.xp) + '</strong></span></div>',
    [['Tour suivant (tour ' + (t + 1) + ')', () => { const F = mechFinNorm(); F.choix = clamp(t + 1, 1, F.tour + 1); saveP(); mechStart(); }],
     ['Retour au garage', () => { mechQuit(); mechGarage(); }]]);
}

/* ---------- Départ : le tour choisi ; nouvelle rue : remise à zéro du boss final ---------- */
try {
  const _go = mechStart;
  mechStart = function(){
    const F = mechFinNorm();
    MECH.tour = F.choix; MECH.temps = 0; MECH.won = false; MECH.victoire = null; MECH.finBoss = null; MECH.finMoitie = false;
    // Un fondu laissé en plan (course quittée entre deux rues) faisait sauter une rue au départ suivant
    MECH.fade = 0; MECH.fadeTo = null;
    return _go.apply(this, arguments);
  };
} catch (e) { errNote(e); }
try {
  const _s = mechStreet;
  mechStreet = function(first){
    MECH.finBoss = null; MECH.finMoitie = false;
    const r = _s.apply(this, arguments);
    const n = MECH.street, RT = !first && MECH.route ? MECH.route : null;
    banner('Rue ' + n + ' sur ' + MECH_FIN.rues + ' · Tour ' + (MECH.tour || 1),
      n >= MECH_FIN.rues ? 'Dernière rue : le boss final t’attend' : (RT && RT.title ? RT.title + ' · ' : '') + (curLoc ? curLoc.name : '') + (first ? ' : avance et nettoie la rue' : ' · blindage réparé'), 2400);
    return r;
  };
} catch (e) { errNote(e); }

/* ---------- Affichage : progression, boss final ---------- */
try {
  const _h = mechHUD;
  mechHUD = function(){
    const r = _h.apply(this, arguments);
    if (!MECH.on || !S) return r;
    const set = (id, t) => { const el = $(id); if (el && el.textContent !== t) el.textContent = t; };
    set('mkStreet', 'Rue ' + MECH.street + ' sur ' + MECH_FIN.rues + ' · Tour ' + (MECH.tour || 1));
    if (mechFinRue()){
      const b = finBossVivant();
      set('mkNext', b ? 'Abats le ' + MECH_FIN.nom + ' !' : MECH.finBoss ? 'Course réussie !' : 'Boss final : ' + Math.max(0, Math.ceil(MECH_FIN.bossA * MECH_LEN - MECH.dist)) + ' m');
      if (b) set('mkBossName', '👑 ' + MECH_FIN.nom);
    }
    return r;
  };
} catch (e) { errNote(e); }

/* ---------- Garage : choisir son tour ---------- */
function mechFinGarage(){
  const pnl = mechPanel.querySelector('.panel'), st = pnl && pnl.querySelector('.stats');
  if (!st || !mechPanel.querySelector('button[data-k]')) return;
  const F = mechFinNorm(), max = F.tour + 1, t = F.choix, m = mechTourMult(t), v = x => String(Math.round(x * 100) / 100).replace('.', ',');
  const d = document.createElement('div'); d.className = 'mk-tour'; d.id = 'mkTour';
  d.style.cssText = 'margin:4px 0 10px;padding:8px;border:1px solid rgba(154,255,112,.35);border-radius:10px;text-align:center';
  d.innerHTML = '<div style="font-size:14px">Course de ' + MECH_FIN.rues + ' rues et un boss final · meilleur tour réussi : <strong>' + (F.tour || 'aucun') + '</strong></div>'
    + '<div style="display:flex;align-items:center;justify-content:center;gap:12px;margin:6px 0">'
    + '<button type="button" class="ghost" data-tour="-1" aria-label="Tour plus facile" style="width:auto;flex:0 0 64px;min-height:44px;margin:0;padding:6px"' + (t <= 1 ? ' disabled' : '') + '>◀</button>'
    + '<strong id="mkTourN" style="font-size:20px;color:#9aff70;white-space:nowrap">Tour ' + t + '</strong>'
    + '<button type="button" class="ghost" data-tour="1" aria-label="Tour plus dur" style="width:auto;flex:0 0 64px;min-height:44px;margin:0;padding:6px"' + (t >= max ? ' disabled' : '') + '>▶</button></div>'
    + '<div class="ds" style="font-size:13px">' + (t === 1 ? 'Le tour de départ.' : 'Zombies : vie ×' + v(m.pv) + ', dégâts ×' + v(m.deg) + ' · ferraille ×' + v(m.fer) + '.') + ' Prime de victoire : ' + fmtN(mechPrime(t)) + ' ⚙.'
    + (max > 1 ? ' Débloqués : tours 1 à ' + max + '.' : ' Gagne le tour 1 pour débloquer le tour 2.') + '</div>';
  st.parentNode.insertBefore(d, st.nextSibling);
  d.querySelectorAll('button[data-tour]').forEach(b => b.addEventListener('click', () => { const G = mechFinNorm(); G.choix = clamp(G.choix + +b.dataset.tour, 1, G.tour + 1); saveP(); mechGarage(); }));
  const go = mechPanel.querySelector('button[data-i="0"]'); if (go) go.textContent = 'Partir au combat : tour ' + t;
}
try { const _g = mechGarage; mechGarage = function(){ const r = _g.apply(this, arguments); try { mechFinGarage(); } catch (e) { errNote(e); } return r; }; } catch (e) { errNote(e); }
// Écran titre : le meilleur tour réussi sur le bouton du robot
try {
  const _b = mechBtn;
  mechBtn = function(){ const r = _b.apply(this, arguments); const b = $('btnMech'), F = mechFinNorm(); if (b && mechUnlocked() && F.tour > 0) b.textContent = '🤖 Robot de combat · tour ' + F.tour + ' réussi'; return r; };
  mechBtn();
} catch (e) { errNote(e); }

// Souris : si le verrouillage demandé au départ arrive après que le carrefour (ou un autre panneau du robot) s'est ouvert,
// le curseur resterait capturé et les boutons du panneau ne recevraient pas les clics. On le relâche.
document.addEventListener('pointerlockchange', () => {
  if (MECH.on && document.pointerLockElement && !mechPanel.classList.contains('hide') && document.exitPointerLock) document.exitPointerLock();
});

// Accès pour les tests automatiques
window.__mechFin = { MECH_FIN, mechFinNorm, mechTourMult, mechPrime, mechFinBoss, mechFinPas, mechWin, mechWinPanel, mechFinGarage, finBossVivant };
