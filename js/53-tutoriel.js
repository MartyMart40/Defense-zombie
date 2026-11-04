'use strict';
/* ================= Tutoriel du toit (facultatif) ================= */
// Proposé UNE fois, seulement à un nouveau joueur (aucune expérience, aucune ville libérée), au début de sa première vague :
// « Première partie ? » Oui / Non merci. Rien n'est mis en pause.
// Oui : 6 bulles au bon moment (viser, tirer, recharger, barricade, boutique, pouvoirs), chacune avec « Passer le tutoriel ».
// « Revoir le tutoriel » dans « Comment jouer » (écran titre) le relance.
// Sauvegarde : P.tuto = '' (jamais proposé), 'non', 'en cours' ou 'fait' ; P.tutoVu = étapes déjà montrées.

const TUTO = [
  { id:'viser', cond:() => true,
    cell:'Glisse le doigt n’importe où pour viser. Le petit point vert est ton viseur.', ordi:'Bouge la souris pour viser. Le petit point vert est ton viseur.' },
  { id:'tirer', cond:t => t > 5,
    cell:'Garde le doigt sur Feu pour tirer. Vise la tête : plus de dégâts et plus d’argent.', ordi:'Garde le clic gauche pour tirer (clic droit : viser avec l’arme à l’œil). Vise la tête : plus de dégâts et plus d’argent.' },
  { id:'recharger', cond:t => t > 8 && S && S.ammo[S.cur] <= Math.ceil(magSize(S.cur) * .3),
    cell:'Recharge avant d’être à sec : bouton Recharger.', ordi:'Recharge avant d’être à sec : touche R.' },
  { id:'barricade', cond:() => S && S.bar < S.barMax * .92,
    txt:'Les zombies qui arrivent en bas frappent la barricade. Si elle tombe, la partie est perdue : abats d’abord les plus proches.' },
  { id:'boutique', ecran:'shop', cond:() => state === 'shop' && S && S.wave >= 1,
    txt:'Entre les vagues : répare la barricade et améliore ton arme avec l’argent des zombies. Le fusil d’assaut et le sniper viennent ensuite.' },
  { id:'pouvoirs', cond:t => state === 'playing' && S && S.wave >= 2 && t > 4 && typeof pwUnlocked === 'function' && pwUnlocked('grenade'),
    cell:'Bouton rond 💣 à gauche : garde-le enfoncé, vise un groupe avec l’autre doigt, relâche pour lancer la grenade.', ordi:'Touche G : garde-la enfoncée, vise un groupe, relâche pour lancer la grenade.' }
];
const TU = { cur:null, life:0, gap:0, t:0, offre:false };
const tuVu = () => Array.isArray(P.tutoVu) ? P.tutoVu : (P.tutoVu = []);
const tuTexte = T => T.txt || (isTouch ? T.cell : T.ordi);
const tuNouveau = () => !(+P.xp > 0) && !(+P.level > 1) && !Object.keys(P.wins || {}).some(k => P.wins[k] > 0);

const tuEl = document.createElement('div'); tuEl.id = 'tuTip'; tuEl.className = 'hide'; tuEl.setAttribute('role', 'status');
tuEl.innerHTML = '<span class="tu-i">🎯</span><span id="tuTxt"></span><span class="tu-b" id="tuBtns"></span>';
document.body.appendChild(tuEl);

function tuBulle(texte, boutons){
  $('tuTxt').textContent = texte;
  const b = $('tuBtns'); b.innerHTML = '';
  boutons.forEach(([t, f, cl]) => { const x = document.createElement('button'); x.type = 'button'; x.textContent = t; if (cl) x.className = cl; x.addEventListener('click', f); b.appendChild(x); });
  tuEl.classList.remove('hide');
}
function tuCacher(){ tuEl.classList.add('hide'); TU.cur = null; TU.offre = false; TU.gap = 3; }
// Offre au premier départ d'un nouveau joueur
function tuOffre(){
  if (P.tuto || !tuNouveau()) return false;
  TU.offre = true; TU.life = 25;
  tuBulle('Première partie ? Je peux te montrer les bases en quelques bulles, sans arrêter le jeu.', [['Oui', tuOui], ['Non merci', tuNon, 'ghost']]);
  return true;
}
function tuOui(){ P.tuto = 'en cours'; P.tutoVu = []; saveP(); tuCacher(); TU.gap = 1; TU.t = 0; }
function tuNon(){ P.tuto = 'non'; saveP(); tuCacher(); }
function tuPasser(){ P.tuto = 'fait'; saveP(); tuCacher(); }
function tuRevoir(){ P.tuto = 'en cours'; P.tutoVu = []; saveP(); TU.gap = 1; TU.t = 0; return true; }
function tuMontrer(T){
  TU.cur = T; TU.life = T.ecran === 'shop' ? 60 : 12;
  const v = tuVu(); if (v.indexOf(T.id) < 0) v.push(T.id);
  tuBulle(tuTexte(T), [['OK', tuCacher], ['Passer le tutoriel', tuPasser, 'ghost']]);
  if (v.length >= TUTO.length){ P.tuto = 'fait'; } saveP();
}
// Chaque image : faire vieillir la bulle, proposer, ou montrer l'étape suivante dont le moment est venu
function tuStep(dt){
  const jeu = state === 'playing' || state === 'shop';
  if (!jeu){ if (!tuEl.classList.contains('hide')) tuCacher(); return null; }
  if (state === 'playing') TU.t += dt;
  if (TU.offre || TU.cur){
    TU.life -= dt;
    if (TU.cur && TU.cur.ecran === 'shop' && state !== 'shop') TU.life = 0; // la vague repart : la bulle de la boutique s'en va
    if (TU.life <= 0){ if (TU.offre) tuNon(); else tuCacher(); }
    return TU.cur;
  }
  if (!P.tuto && state === 'playing' && TU.t > 1.5){ tuOffre(); return null; }
  if (P.tuto !== 'en cours') return null;
  TU.gap -= dt; if (TU.gap > 0) return null;
  const v = tuVu();
  for (const T of TUTO){
    if (v.indexOf(T.id) >= 0) continue;
    let ok = false; try { ok = !!T.cond(TU.t); } catch (e) { errNote(e); }
    if (ok){ tuMontrer(T); return T; }
  }
  return null;
}
Jeu.on('image', dt => tuStep(dt || 0));

// « Revoir le tutoriel » dans « Comment jouer »
(function(){
  const d = $('aideJeu'); if (!d || $('btnTuto')) return;
  const b = document.createElement('button'); b.type = 'button'; b.className = 'ghost'; b.id = 'btnTuto'; b.textContent = '🎯 Revoir le tutoriel à la prochaine partie';
  b.addEventListener('click', () => { tuRevoir(); b.textContent = 'Le tutoriel passera à la prochaine partie'; b.disabled = true; });
  d.appendChild(b);
})();

// Accès pour les tests automatiques
window.__tuto = { TUTO, TU, tuStep, tuOffre, tuOui, tuNon, tuPasser, tuRevoir, tuNouveau, tuVu };
