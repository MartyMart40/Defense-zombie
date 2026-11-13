'use strict';
/* ================= Robot : sauvegarde de la course en cours ================= */
// Au début de chaque rue, la course du robot est gardée (dt_mech_partie, donc aussi dans la sauvegarde OneDrive) :
// numéro de la rue, blindage, zombies abattus, expérience et ferraille gagnées depuis le départ.
// Bouton « ▶ Continuer le robot (rue N) » sur l'écran titre : la course reprend au début de cette rue.
// Aussi le tour (js/40-robot-fin.js) et le temps de la course (champs ajoutés au dossier 102 : une vieille sauvegarde sans eux
// reprend au tour 1).
// Pas gardé : le choix de route au carrefour (la rue reprend dans la ville prévue), la chaleur des armes.
// Effacée quand le robot est détruit, ou quand une nouvelle course commence.

const MECH_SAVE_KEY = 'dt_mech_partie';
const MECH_SAVE_V = 1;
const MECH_SV = { reprise:false };

function mechSaveGet(){
  const d = store.get(MECH_SAVE_KEY, null);
  return d && d.v === MECH_SAVE_V && d.street >= 1 && d.barMax > 0 ? d : null;
}
function mechSaveClear(){ try { localStorage.removeItem(MECH_SAVE_KEY); } catch (e) { errNote(e); } mechSaveBtn(); }
function mechSave(){
  if (!MECH.on || !S) return false;
  store.set(MECH_SAVE_KEY, { v:MECH_SAVE_V, date:Date.now(), street:MECH.street, bar:Math.round(S.bar), barMax:Math.round(S.barMax), kills:MECH.kills || 0, tour:MECH.tour || 1, temps:Math.round(MECH.temps || 0),
    xpG:Math.max(0, Math.round((P.xp || 0) - (MECH.xp0 || 0))), scrG:Math.max(0, Math.round((P.scrap || 0) - (MECH.scr0 || 0))) });
  return true;
}
// Reprendre : une course neuve, puis on saute à la bonne rue avec le blindage gardé
function mechResumeRun(d){
  d = d || mechSaveGet(); if (!d) return false;
  MECH_SV.reprise = true;
  try { mechStart(); } finally { MECH_SV.reprise = false; }
  MECH.street = d.street; S.wave = d.street; MECH.kills = d.kills || 0;
  MECH.tour = Math.max(1, Math.floor(+d.tour || 1)); MECH.temps = +d.temps || 0;
  MECH.xp0 = (P.xp || 0) - (d.xpG || 0); MECH.scr0 = (P.scrap || 0) - (d.scrG || 0);
  mechStreet(true); // la rue choisie, comme un départ (pas de réparation en plus)
  S.barMax = Math.max(1, d.barMax); S.bar = clamp(d.bar || S.barMax, 1, S.barMax);
  banner('Rue ' + MECH.street + ' : reprise', 'Le robot repart du début de la rue', 2200);
  mechSave();
  return true;
}

// Sauver au début de chaque rue ; effacer à une nouvelle course et quand le robot est détruit
try {
  const _st = mechStreet;
  mechStreet = function(first){ const r = _st.apply(this, arguments); if (MECH.on && !MECH_SV.reprise) mechSave(); return r; };
} catch (e) { errNote(e); }
try {
  const _go = mechStart;
  mechStart = function(){ if (!MECH_SV.reprise) mechSaveClear(); return _go.apply(this, arguments); };
} catch (e) { errNote(e); }
try {
  const _ov = mechOver;
  mechOver = function(){ const r = _ov.apply(this, arguments); mechSaveClear(); return r; };
} catch (e) { errNote(e); }
try {
  const _q = mechQuit;
  mechQuit = function(){ if (state === 'mech' && MECH.on) mechSave(); const r = _q.apply(this, arguments); mechSaveBtn(); return r; };
} catch (e) { errNote(e); }

/* ---------- Écran titre ---------- */
function mechSaveBtn(){
  let b = $('btnMechGo');
  const ref = $('btnMech');
  if (!b && ref && ref.parentNode){
    b = document.createElement('button'); b.className = 'ghost mech-btn'; b.id = 'btnMechGo'; b.type = 'button';
    ref.parentNode.insertBefore(b, ref);
    b.addEventListener('click', () => { if (typeof Snd === 'object') Snd.init(); if (!mechResumeRun()) mechSaveBtn(); });
  }
  if (!b) return;
  const d = mechUnlocked() ? mechSaveGet() : null;
  b.classList.toggle('hide', !d);
  if (d) b.textContent = '▶ Continuer le robot (rue ' + d.street + (d.tour > 1 ? ', tour ' + d.tour : '') + ', ' + fmtN(d.kills || 0) + ' abattus)';
}
mechSaveBtn();

// Accès pour les tests automatiques
window.__mechSave = { MECH_SAVE_KEY, mechSave, mechSaveGet, mechSaveClear, mechResumeRun, mechSaveBtn };
