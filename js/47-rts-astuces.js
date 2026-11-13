'use strict';
/* ================= RTS : astuces des premières parties ================= */
// Une bulle en haut de l'écran explique une chose à la fois, au bon moment (au début, à la première horde,
// au premier nid détruit, quand on a de quoi bâtir une usine lourde, au premier pilotage...).
// Chaque astuce ne passe qu'une fois (liste gardée dans dt_rts_astuces). « Plus d'astuces » les coupe toutes
// (dt_rts_astucesOff) ; la pause du RTS offre de les remettre à zéro.
// Le temps des astuces est le temps de jeu : rien ne bouge en pause.

const RTS_TIP_GAP = 7;   // secondes de jeu entre deux astuces
const RTS_TIP_LIFE = 14; // une astuce s'en va seule après ce temps (ou avec OK)
const rtsTipBld = t => RTS.blds.some(o => !o.dead && o.type === t);
// cond(R) : le moment est venu ; cell / ordi : texte selon l'appareil
const RTS_TIPS = [
  { id:'choisir', cond: R => R.t > 2,
    cell:'Touche un robot pour le choisir (un rond vert l’entoure), puis touche la carte pour l’y envoyer, ou un nid pour l’attaquer. Garde le doigt sur un autre robot pour l’ajouter au groupe.',
    ordi:'Clic gauche sur un robot pour le choisir (glisse pour en encadrer plusieurs, Maj+clic pour en ajouter), clic droit sur la carte pour l’y envoyer, ou sur un nid pour l’attaquer.' },
  { id:'but', cond: R => R.t > 4 && !R.libre,
    txt:'Ton but : détruire 8 nids (compteur en haut) pour faire sortir la Ruche, le nid mère, au fond de la vallée. Détruis-la pour libérer la vallée et débloquer la suivante.' },
  { id:'siege', cond: R => !!R.siege && R.siege.phase === 'annonce',
    txt:'Un siège arrive (bandeau en haut, point rouge sur la mini-carte) : une grosse horde d’un seul côté pendant 40 secondes. Envoie tes unités de ce côté, puis répare pendant l’accalmie.' },
  { id:'ruche', cond: R => !!R.ruche && !R.ruche.dead,
    txt:'La Ruche est sortie (👑 sur la mini-carte) ! Elle pond sans arrêt et se défend avec une garde et un boss. Rassemble une grosse armée et envoie-la dessus.' },
  { id:'carte', cond: R => R.t > 12,
    cell:'Glisse un doigt pour te promener sur la carte, pince avec deux doigts pour zoomer. Le bouton ▾ cache le menu du bas.',
    ordi:'ZQSD ou les flèches pour te promener sur la carte, molette pour zoomer. Espace choisit toutes tes unités, 1 à 9 achète un robot.' },
  { id:'liste', cond: R => R.t > 8 && R.units.filter(u => !u.dead).length >= 2,
    cell:'La rangée « Unités » en bas : touche une unité pour la choisir seule et y aller, même si elle est loin.',
    ordi:'La rangée « Unités » en bas : clique une unité pour la choisir seule et y aller. Tab passe à l’unité suivante, double-clic sur une unité choisit toutes celles du même type à l’écran.' },
  { id:'groupes', cond: R => R.t > 40 && R.sel.length >= 2,
    cell:'Plusieurs unités choisies : touche « ＋ Groupe » dans la rangée pour les retrouver d’un seul toucher. Garde le doigt sur un groupe pour le remplacer.',
    ordi:'Plusieurs unités choisies : Ctrl+1 à 5 les enregistre dans un groupe, Maj+1 à 5 les rappelle (deux fois : la caméra y va).' },
  { id:'tourelle', cond: R => R.t > 26,
    cell:'Touche une tourelle : tu peux l’améliorer (6 niveaux), la vendre ou la contrôler toi-même avec « 🎮 Contrôler ».',
    ordi:'Clique sur une tourelle : tu peux l’améliorer (6 niveaux), la vendre ou la contrôler toi-même avec « 🎮 Contrôler ».' },
  { id:'horde', cond: R => R.hordeN >= 1,
    txt:'Une horde arrive toutes les 45 secondes, et un boss toutes les 3 hordes. Garde des unités et des tourelles devant la base.' },
  { id:'usine', cond: R => R.t > 35 && S.money >= RTS_BLD.heavyfac.cost && !rtsTipBld('heavyfac'),
    txt:'Tu as de quoi bâtir une Usine lourde (onglet Bâtiments) : elle débloque les lance-roquettes, le Mech lourd et le Mech de combat ⭐.' },
  { id:'nid', cond: R => R.nests.some(n => n.dead),
    txt:'Nid détruit : la base grandit (le cercle jaune) et tu peux bâtir plus loin. Un nid plus fort apparaît plus au nord.' },
  { id:'piloter', cond: R => R.t > 60 && R.sel.length > 0 && !R.pilot,
    txt:'Une unité est choisie : « 🎮 Piloter » te met à ses commandes, à la première personne.' },
  { id:'pilotage', cond: R => !!R.pilot,
    cell:'Manette à gauche pour bouger, glisse à droite pour viser, bouton Tir pour tirer. « Retour à la carte » en haut.',
    ordi:'ZQSD pour bouger, la souris pour viser, clic pour tirer (clic droit ou E : 2e arme, même en tirant). F ou Échap : retour à la carte.' },
  { id:'blindes', cond: R => R.t > 150 && rtsTipBld('heavyfac') && !rtsTipBld('vehdepot') && !rtsTipBld('airfield'),
    txt:'Plus tard : Garage de blindés (tank), Héliport (hélicoptère) et Aérodrome (chasseur, Warthog, AC-130 ; 2 avions par aérodrome). Onglet Améliorations pour rendre tes unités plus fortes.' },
  { id:'sauve', cond: R => R.t > 100,
    txt:'La partie se sauve toute seule. Pause, puis « Sauver et quitter » : tu la reprendras avec « Continuer la guerre ».' }
];

const RTS_TIP = { cur:null, life:0, gap:3 };
const rtsTipSeen = () => { const v = store.get('dt_rts_astuces', []); return Array.isArray(v) ? v : []; };
const rtsTipsOff = () => !!store.get('dt_rts_astucesOff', false);
const rtsTipText = T => T.txt || (isTouch ? T.cell : T.ordi);

const rtsTipEl = document.createElement('div'); rtsTipEl.id = 'rtTip'; rtsTipEl.className = 'hide'; rtsTipEl.setAttribute('role', 'status');
rtsTipEl.innerHTML = '<span class="rt-tip-i">💡</span><span id="rtTipTxt"></span><span class="rt-tip-b"><button type="button" id="rtTipOk">OK</button><button type="button" id="rtTipOff">Plus d’astuces</button></span>';
document.body.appendChild(rtsTipEl);

function rtsTipShow(T){
  RTS_TIP.cur = T; RTS_TIP.life = RTS_TIP_LIFE;
  $('rtTipTxt').textContent = rtsTipText(T);
  rtsTipEl.classList.remove('hide');
  const seen = rtsTipSeen(); if (seen.indexOf(T.id) < 0){ seen.push(T.id); store.set('dt_rts_astuces', seen); }
}
function rtsTipHide(){
  if (RTS_TIP.cur) RTS_TIP.gap = RTS_TIP_GAP;
  RTS_TIP.cur = null; rtsTipEl.classList.add('hide');
}
function rtsTipsStop(){ store.set('dt_rts_astucesOff', true); rtsTipHide(); }
function rtsTipsReset(){ store.set('dt_rts_astuces', []); store.set('dt_rts_astucesOff', false); RTS_TIP.gap = 2; }
// Chaque image pendant une partie RTS : fait vieillir la bulle, ou montre la prochaine astuce dont le moment est venu
function rtsTipStep(dt){
  if (state !== 'rts' || !RTS.on){ if (RTS_TIP.cur || !rtsTipEl.classList.contains('hide')) rtsTipHide(); return null; }
  if (RTS.paused) return null;
  if (RTS_TIP.cur){ RTS_TIP.life -= dt; if (RTS_TIP.life <= 0) rtsTipHide(); return RTS_TIP.cur; }
  RTS_TIP.gap -= dt;
  if (RTS_TIP.gap > 0 || rtsTipsOff()) return null;
  const seen = rtsTipSeen();
  for (const T of RTS_TIPS){
    if (seen.indexOf(T.id) >= 0) continue;
    let ok = false; try { ok = !!T.cond(RTS); } catch (e) { errNote(e); }
    if (ok){ rtsTipShow(T); return T; }
  }
  return null;
}

$('rtTipOk').addEventListener('click', rtsTipHide);
$('rtTipOff').addEventListener('click', rtsTipsStop);
Jeu.on('image', dt => rtsTipStep(dt || 0));

// Pause du RTS : bouton pour revoir les astuces depuis le début
function rtsTipPauseBtn(){
  const box = document.querySelector('#rtsPanel .mk-btns'); if (!box || $('rtTipAgain')) return;
  const b = document.createElement('button'); b.type = 'button'; b.className = 'ghost'; b.id = 'rtTipAgain'; b.textContent = 'Revoir les astuces';
  b.addEventListener('click', () => { rtsTipsReset(); b.textContent = 'Les astuces vont repasser'; b.disabled = true; });
  box.appendChild(b);
}

// Accès pour les tests automatiques
window.__rtsTips = { RTS_TIPS, RTS_TIP, rtsTipStep, rtsTipShow, rtsTipHide, rtsTipsStop, rtsTipsReset, rtsTipSeen, rtsTipsOff, rtsTipPauseBtn, RTS_TIP_GAP, RTS_TIP_LIFE };
