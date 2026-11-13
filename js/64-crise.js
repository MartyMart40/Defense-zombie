'use strict';
/* ================= Moments de crise sur le toit (tâche 100) ================= */
// But : entre « en sécurité » et « mort », des moments où on a chaud et où on s'en sort. Trois morceaux, sur le toit
// seulement (campagne, défi du jour, mode infini ; jamais en robot ni en RTS : Jeu.actif()).
//   1. Assauts : à partir de la vague 2, une ou deux fois par vague, 3 secondes d'avertissement (bandeau « ASSAUT ! »,
//      sirène, sous-titre), puis une partie des zombies de la vague sort 4 fois plus serrée, puis un creux pour souffler.
//      Le total de la vague ne change pas : ce sont les zombies suivants de la file (plan.queue) qui sortent plus vite.
//      plan.maxAlive et le plafond de l'appareil restent respectés (la boucle de 15-boucle.js les vérifie toujours).
//      Pas d'assaut pendant que le boss est là, ni quand le boss est dans le paquet, ni dans les 10 premières secondes,
//      ni pendant une bulle du tutoriel (js/53-tutoriel.js).
//   2. Brèche (dernier souffle) : une fois par partie (mode infini : rechargée à chaque boss abattu), quand la barricade
//      tombe à 0, « BRÈCHE ! Tiens bon ! » : 10 secondes où elle ne peut plus descendre (au plus bas 1, et ce qui est réparé reste acquis), un court ralenti (pkSlow de
//      js/31-punch.js, coupé si le ralenti est désactivé), et chaque zombie abattu la répare un peu (plafonné).
//      À la fin, si elle est sous 5 %, elle cède pour vrai. À la deuxième chute, c'est fini.
//   3. Sentir le danger : sous 30 % le bord rouge (#vignette, déjà là) bat, la barre clignote, battement de cœur ;
//      sous 15 % tout bat plus vite et plus fort. Seulement des classes CSS (opacité) : léger au cell.
// Branchements : deux appels dans js/15-boucle.js (criseStep dans update, avant le test de fin de partie, et
// criseRythme dans le calcul de spawnT), Jeu.on('image') pour l'affichage et Jeu.on('tue') pour la réparation.
// Toutes les sources de dégâts à la barricade (coups, crachats, autos du boss) passent avant ce test : rien d'autre
// à envelopper. Rien de permanent n'est sauvé.

/* ---------- Réglages (à doser) ---------- */
const CRISE = {
  // Assauts
  assautVague: 2,                    // première vague avec des assauts
  assautParVille: [1, 1, 1.5, 1.5, 2], // assauts par vague selon la ville (1,5 = un, plus une chance sur deux d'un deuxième)
  assautInfini: 2,                   // mode infini
  assautPart: [.15, .25],            // part des zombies de la vague dans un assaut (tirée entre les deux)
  assautMin: 8,                      // moins de zombies que ça dans la file : pas d'assaut
  assautVitesse: 4,                  // intervalle entre deux sorties divisé par ce chiffre pendant l'assaut
  assautAvis: 3,                     // secondes d'avertissement
  assautDebut: 10,                   // pas d'assaut dans les premières secondes de la vague
  assautDureeMax: 25,                // un assaut freiné par le plafond de zombies s'arrête quand même après ce temps
  assautMoments: [[.25, .5], [.55, .75]], // quand, en part de la file déjà sortie (un assaut : le premier intervalle élargi)
  creuxDuree: 6,                     // secondes de creux après un assaut
  creuxLent: 2.5,                    // intervalle multiplié par ce chiffre pendant le creux
  // Brèche
  brecheDuree: 10,                   // secondes
  brecheGarde: true,                 // pendant la brèche, les coups ne défont pas la réparation (false : seulement « jamais sous 1 »)
  brecheRep: .015,                   // réparation par zombie abattu (part de la barricade maximale)
  brecheRepMax: .35,                 // réparation totale au plus
  brecheSeuil: .05,                  // sous ce niveau à la fin, la barricade cède
  brecheRalenti: { scale: .3, hold: .7, ramp: .6, prio: 3 },
  // Danger
  danger: .3, dangerFort: .15,       // seuils (part de la barricade)
  coeur: [1.05, .62]                 // secondes entre deux battements (sous 30 %, sous 15 %)
};

/* ---------- État ---------- */
const CR = {
  S: null, wave: -1, t: 0,
  moments: [], prochain: 0,          // assauts prévus pour la vague (part de la file sortie)
  phase: '', phaseT: 0, n: 0, q0: 0, qDebut: 0, assautT: 0,
  assautsVague: 0, brecheVague: 0, assauts: 0,
  breche: { dispo: true, on: false, t: 0, rep: 0, n: 0, cede: false },
  coeurT: 0, niveau: 0, el: null
};
const crActif = () => !!S && !(typeof Jeu === 'object' && Jeu.actif && Jeu.actif()) && !!plan;

/* ---------- Nouvelle partie, nouvelle vague ---------- */
function crNouvellePartie(){
  CR.S = S; CR.wave = -1; CR.assauts = 0;
  const B = CR.breche; B.dispo = true; B.on = false; B.t = 0; B.rep = 0; B.n = 0; B.cede = false;
  CR.phase = ''; CR.phaseT = 0;
}
function crAssautsPrevus(){
  if (!S || S.wave < CRISE.assautVague) return 0;
  let x;
  if (curLoc && curLoc.inf) x = CRISE.assautInfini;
  else { const i = Math.max(0, LOCS.findIndex(L => L && curLoc && L.id === curLoc.id)); x = CRISE.assautParVille[Math.min(i, CRISE.assautParVille.length - 1)]; }
  const n = Math.floor(x);
  return n + (Math.random() < x - n ? 1 : 0);
}
function crNouvelleVague(){
  CR.wave = S.wave; CR.t = 0; CR.prochain = 0; CR.assautsVague = 0; CR.brecheVague = 0;
  CR.phase = ''; CR.phaseT = 0;
  CR.q0 = plan && plan.queue ? plan.queue.length : 0;
  const n = crAssautsPrevus(), M = CRISE.assautMoments;
  CR.moments = [];
  if (n === 1) CR.moments.push(rand(M[0][0], M[1][0]));
  else for (let i = 0; i < n; i++){ const m = M[Math.min(i, M.length - 1)]; CR.moments.push(rand(m[0], m[1])); }
}

/* ---------- 1. Assauts ---------- */
function crBossLa(){ return typeof liveBoss === 'function' ? !!liveBoss() : zombies.some(z => z.type === 'boss' && !z.dead); }
function crTutoOuvert(){ return typeof TU === 'object' && !!TU && !!(TU.cur || TU.offre); }
// Nombre de zombies du prochain assaut, ou 0 si le moment ne s'y prête pas
function crTaillePossible(){
  const q = plan.queue, reste = q.length;
  if (reste < CRISE.assautMin) return -1; // trop tard dans la vague : on abandonne cet assaut
  const n = Math.min(reste, Math.max(CRISE.assautMin, Math.round((plan.total || CR.q0) * rand(CRISE.assautPart[0], CRISE.assautPart[1]))));
  const ib = q.lastIndexOf('boss');
  if (ib >= 0 && reste - 1 - ib < n) return 0; // le boss serait dans le paquet : on attend qu'il soit sorti et abattu
  return n;
}
function crAvis(){
  CR.phase = 'avis'; CR.phaseT = CRISE.assautAvis;
  crSon('sirene');
  if (typeof rpCaption === 'function') rpCaption('[Sirène : un assaut arrive]', 'assaut');
  if (typeof rpFlash === 'function'){ rpFlash('L', .7); rpFlash('R', .7); }
}
function crAssaut(){
  const n = crTaillePossible();
  if (n < 0){ CR.prochain++; CR.phase = ''; return; }
  if (n === 0){ CR.phase = 'attente'; return; } // le boss arrive : on garde l'assaut pour après
  CR.phase = 'assaut'; CR.n = n; CR.qDebut = plan.queue.length; CR.assautT = 0;
  CR.prochain++; CR.assautsVague++; CR.assauts++;
  spawnT = Math.min(spawnT, .15);
  crSon('charge');
}
function crCreux(){ CR.phase = 'creux'; CR.phaseT = CRISE.creuxDuree; }
// Multiplicateur de l'intervalle entre deux sorties (appelé par 15-boucle.js)
function criseRythme(){
  if (!crActif()) return 1;
  if (CR.phase === 'assaut') return 1 / CRISE.assautVitesse;
  if (CR.phase === 'creux') return CRISE.creuxLent;
  return 1;
}
function crAssautStep(dt){
  const q = plan.queue;
  if (CR.phase === 'avis'){
    CR.phaseT -= dt;
    if (crBossLa()){ CR.phase = 'attente'; return; }
    if (CR.phaseT <= 0) crAssaut();
    return;
  }
  if (CR.phase === 'assaut'){
    CR.assautT += dt;
    if (CR.qDebut - q.length >= CR.n || !q.length || CR.assautT > CRISE.assautDureeMax || crBossLa()) crCreux();
    return;
  }
  if (CR.phase === 'creux'){ CR.phaseT -= dt; if (CR.phaseT <= 0) CR.phase = ''; return; }
  // Normal ou en attente : un assaut est-il dû ?
  if (CR.prochain >= CR.moments.length || !q.length || CR.t < CRISE.assautDebut || crBossLa() || crTutoOuvert()) return;
  const sortie = CR.q0 > 0 ? 1 - q.length / CR.q0 : 1;
  if (CR.phase === 'attente' || sortie >= CR.moments[CR.prochain]){
    const n = crTaillePossible();
    if (n < 0){ CR.prochain++; CR.phase = ''; return; }
    if (n === 0){ CR.phase = 'attente'; return; }
    crAvis();
  }
}

/* ---------- 2. Brèche ---------- */
function crBrecheDebut(){
  const B = CR.breche;
  B.dispo = false; B.on = true; B.t = CRISE.brecheDuree; B.rep = 0; B.n = 0; B.cede = false;
  S.bar = 1; CR.brecheVague = 1;
  if (typeof PK_SLOW === 'object' && PK_SLOW && !PK_SLOW.breche) PK_SLOW.breche = CRISE.brecheRalenti;
  if (typeof pkSlow === 'function') pkSlow('breche');
  shake = Math.max(shake, .8);
  crSon('breche');
  if (typeof rpCaption === 'function') rpCaption('[La barricade craque : brèche !]', 'breche');
  if (typeof rpFlash === 'function'){ rpFlash('L', 1); rpFlash('R', 1); rpFlash('B', 1); }
  if (typeof vib === 'function') try { vib(220, 9); } catch (e) { errNote(e); }
}
function crBrecheFin(){
  const B = CR.breche; B.on = false;
  if (S.bar < S.barMax * CRISE.brecheSeuil){ B.cede = true; S.bar = 0; } // rien réparé : elle cède (15-boucle.js finit la partie)
  else { crSon('tient'); if (typeof rpCaption === 'function') rpCaption('[La barricade tient]', 'tient'); }
}
// Pendant la brèche : jamais sous 1, et (brecheGarde) jamais sous ce qui est déjà réparé
function crBrechePlancher(){
  const B = CR.breche, bas = 1 + (CRISE.brecheGarde ? B.rep : 0);
  if (S.bar < bas) S.bar = Math.min(S.barMax, bas);
}
function crBrecheStep(dt){
  const B = CR.breche;
  if (B.on){
    crBrechePlancher();
    B.t -= dt;
    if (B.t <= 0) crBrecheFin();
    return;
  }
  if (S.bar <= 0 && overT < 0 && B.dispo) crBrecheDebut();
}
// Un zombie abattu pendant la brèche répare un peu la barricade
function crTue(z, etaitVivant){
  if (!etaitVivant || !z || !S || !crActif()) return;
  const B = CR.breche;
  if (B.on && (state === 'playing' || state === 'paused')){
    const max = S.barMax * CRISE.brecheRepMax, add = Math.min(S.barMax * CRISE.brecheRep, max - B.rep);
    if (add > 0){ B.rep += add; B.n++; S.bar = Math.min(S.barMax, S.bar + add); }
  }
  // Mode infini : le dernier souffle revient à chaque boss abattu
  if (z.type === 'boss' && curLoc && curLoc.inf && !B.dispo){
    B.dispo = true;
    if (typeof toast === 'function') toast('Dernier souffle rechargé ♥');
  }
}

/* ---------- Chaque pas de jeu (appelé par update, 15-boucle.js) ---------- */
function criseStep(dt){
  if (!crActif() || state !== 'playing') return;
  try {
    if (CR.S !== S) crNouvellePartie();
    if (CR.wave !== S.wave) crNouvelleVague();
    CR.t += dt;
    crAssautStep(dt);
    crBrecheStep(dt);
  } catch (e) { errNote(e); }
}

/* ---------- Sons (Web Audio, rien si le son est coupé) ---------- */
function crSon(k){
  if (typeof Snd !== 'object' || !Snd.ctx || !Snd.on) return;
  try {
    const c = Snd.ctx, t0 = c.currentTime, out = Snd._out || Snd.master;
    const ton = (type, f0, f1, t, d, v) => {
      const o = c.createOscillator(), g = c.createGain();
      o.type = type; o.frequency.setValueAtTime(f0, t); if (f1) o.frequency.exponentialRampToValueAtTime(f1, t + d);
      g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(v, t + .02); g.gain.exponentialRampToValueAtTime(0.001, t + d);
      o.connect(g); g.connect(out); o.start(t); o.stop(t + d + .05);
    };
    if (k === 'sirene') for (let i = 0; i < 3; i++){ ton('square', 620, 0, t0 + i * .5, .22, .05); ton('square', 830, 0, t0 + i * .5 + .25, .22, .05); }
    else if (k === 'charge'){ ton('sawtooth', 90, 45, t0, .9, .12); ton('square', 880, 660, t0, .3, .04); }
    else if (k === 'breche'){ ton('sawtooth', 160, 38, t0, 1.1, .2); ton('triangle', 70, 30, t0, 1.4, .25); }
    else if (k === 'tient'){ ton('triangle', 440, 0, t0, .25, .08); ton('triangle', 660, 0, t0 + .12, .35, .08); }
    else if (k === 'coeur'){ ton('sine', 62, 40, t0, .16, .32); ton('sine', 55, 36, t0 + .2, .18, .24); }
  } catch (e) { errNote(e); }
}

/* ---------- Affichage ---------- */
function crEl(){
  if (CR.el) return CR.el;
  const b = document.createElement('div'); b.id = 'crBande'; b.className = 'hide'; b.setAttribute('role', 'status');
  b.innerHTML = '<div class="cr-t"></div><div class="cr-s"></div><div class="cr-g"><i></i></div>';
  document.body.appendChild(b);
  // Icône du dernier souffle, à côté du mot « Barricade »
  const lbl = document.querySelector('#hudC .lbl'), ic = document.createElement('span');
  ic.id = 'crSouffle'; ic.textContent = '♥';
  if (lbl) lbl.appendChild(ic);
  CR.el = { b, t: b.querySelector('.cr-t'), s: b.querySelector('.cr-s'), g: b.querySelector('.cr-g'), gi: b.querySelector('.cr-g i'), ic, vu: {} };
  return CR.el;
}
// Change un texte, une classe ou un style seulement s'il a changé (pas de travail du navigateur à chaque image)
function crSet(cle, v, f){ const E = crEl(); if (E.vu[cle] !== v){ E.vu[cle] = v; f(v); } }
function crImage(dt){
  try {
    const E = crEl(), jeu = crActif() && (state === 'playing' || state === 'paused'), B = CR.breche;
    if (!jeu && B.on) B.on = false; // fin de vague ou de partie pendant la brèche
    if (jeu && B.on) crBrechePlancher(); // un coup tombé pendant le rendu (crachat) ne se voit pas
    if (!jeu && CR.phase){ CR.phase = ''; }
    // Bandeau : brèche d'abord, sinon l'assaut
    let mode = '', titre = '', sous = '', jauge = -1;
    if (jeu && B.on){ mode = 'breche'; titre = 'BRÈCHE !'; sous = 'Tiens bon ! ' + Math.max(1, Math.ceil(B.t)) + ' s · chaque zombie abattu répare'; jauge = B.rep / (S.barMax * CRISE.brecheRepMax); }
    else if (jeu && CR.phase === 'avis'){ mode = 'assaut'; titre = 'ASSAUT !'; sous = 'Ils chargent dans ' + Math.max(1, Math.ceil(CR.phaseT)) + ' s'; }
    else if (jeu && CR.phase === 'assaut' && CR.assautT < 2){ mode = 'assaut'; titre = 'ILS CHARGENT !'; sous = ''; }
    else if (jeu && CR.phase === 'creux' && CR.phaseT > CRISE.creuxDuree - 2.5){ mode = 'creux'; titre = 'Ils reculent'; sous = 'Souffle un peu'; }
    crSet('mode', mode, v => { E.b.className = v ? 'on cr-' + v : 'hide'; });
    crSet('titre', titre, v => { E.t.textContent = v; });
    crSet('sous', sous, v => { E.s.textContent = v; });
    crSet('jauge', jauge < 0 ? -1 : Math.round(clamp(jauge, 0, 1) * 50) / 50, v => { E.g.style.display = v < 0 ? 'none' : ''; if (v >= 0) E.gi.style.width = Math.round(v * 100) + '%'; });
    // Icône du dernier souffle
    const ic = !jeu ? '' : B.on ? 'en-cours' : B.dispo ? 'dispo' : 'vide';
    crSet('ic', ic, v => {
      E.ic.className = v; E.ic.style.display = v ? '' : 'none';
      E.ic.title = v === 'dispo' ? 'Dernier souffle disponible' : v === 'en-cours' ? 'Dernier souffle en cours' : 'Dernier souffle déjà utilisé';
      E.ic.setAttribute('aria-label', E.ic.title);
    });
    // 3. Danger : bord rouge, barre qui clignote, battement de cœur
    const pct = jeu && S.barMax > 0 ? clamp(S.bar / S.barMax, 0, 1) : 1;
    const niv = !jeu ? 0 : pct < CRISE.dangerFort ? 2 : pct < CRISE.danger ? 1 : 0;
    crSet('niv', niv, v => {
      const vg = $('vignette'), bf = $('barFill');
      if (vg){ vg.classList.toggle('on', v > 0 && state === 'playing'); vg.classList.toggle('crit', v > 1); }
      if (bf){ bf.classList.toggle('clign', v === 1); bf.classList.toggle('clign2', v > 1); }
      if (v > CR.niveau && typeof rpCaption === 'function') rpCaption(v > 1 ? '[Cœur qui s’emballe]' : '[Battements de cœur]', 'coeur' + v);
      CR.niveau = v;
    });
    if (niv > 0 && state === 'playing'){
      CR.coeurT -= dt || 0;
      if (CR.coeurT <= 0){ CR.coeurT = CRISE.coeur[niv - 1]; crSon('coeur'); }
    } else CR.coeurT = 0;
  } catch (e) { errNote(e); }
}

/* ---------- Branchements ---------- */
Jeu.on('image', dt => crImage(dt));
Jeu.on('tue', (z, etaitVivant) => crTue(z, etaitVivant));

// Accès pour les tests et l'outil de mesure (outils/mesure-crise.js)
window.__crise = {
  CRISE, CR, criseStep, criseRythme, crImage,
  get assautsVague(){ return CR.assautsVague; }, get brecheVague(){ return CR.brecheVague; },
  get phase(){ return CR.phase; }, get breche(){ return CR.breche; },
  // Tests : lancer un assaut tout de suite (sans avertissement si direct)
  forcerAssaut(direct){ if (!S || !plan) return false; if (CR.S !== S) crNouvellePartie(); if (CR.wave !== S.wave) crNouvelleVague(); CR.moments.push(0); CR.t = Math.max(CR.t, CRISE.assautDebut); if (direct){ crAssaut(); return CR.phase === 'assaut'; } crAvis(); return true; },
  nouvellePartie: crNouvellePartie
};
