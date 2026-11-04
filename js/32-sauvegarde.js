'use strict';
/* ================= Sauvegarde dans un fichier (OneDrive, Google Drive, ordinateur) ================= */
// Écran « Sauvegarde » (bouton sur l'écran titre) :
// - Enregistrer : toutes les clés dt_ (profil, réglages) dans un fichier JSON. Sur cell, la feuille de partage
//   s'ouvre (choisir OneDrive) ; sinon le fichier est téléchargé (le mettre dans le dossier OneDrive de l'ordi).
// - Charger : choisir le fichier (le sélecteur du cell montre OneDrive), vérifier, remplacer la sauvegarde, recharger.
//   L'ancienne sauvegarde est gardée sous SAV_AVANT (hors dt_), au cas où.
const SAV_NOM = 'dernier-toit-sauvegarde.json';
const SAV_JEU = 'dernier-toit';
const SAV_AVANT = 'sauv_avant_import';

function savCollect(){
  const cles = {};
  try {
    for (let i = 0; i < localStorage.length; i++){
      const k = localStorage.key(i);
      if (k && k.indexOf('dt_') === 0) cles[k] = localStorage.getItem(k);
    }
  } catch (e) { errNote(e); }
  return { jeu:SAV_JEU, version:1, date:new Date().toISOString(), cles };
}
// Vérifie un fichier lu : rend { ok, err, data }
function savCheck(txt){
  let d;
  try { d = typeof txt === 'string' ? JSON.parse(txt) : txt; } catch (e) { return { ok:false, err:'Ce fichier n’est pas une sauvegarde lisible.' }; }
  if (!d || d.jeu !== SAV_JEU || !d.cles || typeof d.cles !== 'object') return { ok:false, err:'Ce fichier n’est pas une sauvegarde de Dernier toit.' };
  const ks = Object.keys(d.cles);
  if (!ks.length || ks.some(k => k.indexOf('dt_') !== 0 || typeof d.cles[k] !== 'string')) return { ok:false, err:'Sauvegarde abîmée : contenu inattendu.' };
  if (d.cles.dt_prof != null){ try { const p = JSON.parse(d.cles.dt_prof); if (!p || typeof p !== 'object') throw 0; } catch (e) { return { ok:false, err:'Sauvegarde abîmée : profil illisible.' }; } }
  return { ok:true, data:d };
}
// Remplace la sauvegarde du navigateur par celle du fichier (l'ancienne est mise de côté)
function savApply(d){
  try {
    localStorage.setItem(SAV_AVANT, JSON.stringify(savCollect()));
    const vieux = []; for (let i = 0; i < localStorage.length; i++){ const k = localStorage.key(i); if (k && k.indexOf('dt_') === 0) vieux.push(k); }
    vieux.forEach(k => localStorage.removeItem(k));
    Object.keys(d.cles).forEach(k => localStorage.setItem(k, d.cles[k]));
    return true;
  } catch (e) { return false; }
}
// Résumé lisible d'une sauvegarde (profil déjà lu ou texte JSON)
function savSummary(prof){
  let p = prof;
  if (typeof p === 'string'){ try { p = JSON.parse(p); } catch (e) { p = null; } }
  if (!p) return 'Aucune progression.';
  const n = Array.isArray(p.slots) ? p.slots.filter(Boolean).length : 0;
  const villes = Math.min(p.unlocked || 1, typeof LOCS !== 'undefined' ? LOCS.length : 5);
  return 'Niveau ' + (p.level || 1) + ' · ' + villes + ' ville' + (villes > 1 ? 's' : '') + ' débloquée' + (villes > 1 ? 's' : '')
    + ' · ' + fmtN(Math.floor(p.scrap || 0)) + ' ⚙' + (n ? ' · ' + n + ' défense' + (n > 1 ? 's' : '') : '');
}
function savMsg(t, bad){ const el = $('savMsg'); if (!el) return; el.textContent = t; el.style.color = bad ? '#ff8a7a' : '#9aff70'; }
function savRender(){ const el = $('savNow'); if (el) el.textContent = 'Dans ce navigateur : ' + savSummary(P); }

async function savExport(){
  try { saveP(); } catch (e) { errNote(e); }
  const txt = JSON.stringify(savCollect(), null, 1);
  const blob = new Blob([txt], { type:'application/json' });
  // Cell : feuille de partage avec le fichier (OneDrive, Drive, courriel...)
  try {
    if (typeof File === 'function' && navigator.canShare){
      const f = new File([blob], SAV_NOM, { type:'application/json' });
      if (navigator.canShare({ files:[f] })){
        await navigator.share({ files:[f], title:'Sauvegarde Dernier toit' });
        savMsg('Sauvegarde envoyée. Choisis OneDrive et remplace l’ancien fichier.');
        return 'partage';
      }
    }
  } catch (e) {
    if (e && e.name === 'AbortError'){ savMsg('Envoi annulé.', true); return 'annule'; }
  }
  // Ordinateur : téléchargement
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = SAV_NOM;
  document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  savMsg('Fichier « ' + SAV_NOM + ' » téléchargé. Mets-le dans ton dossier OneDrive.');
  return 'telecharge';
}
function savImportFile(file){
  if (!file) return;
  const rd = new FileReader();
  rd.onload = () => {
    const r = savCheck(String(rd.result || ''));
    if (!r.ok){ savMsg(r.err, true); return; }
    const quand = r.data.date ? new Date(r.data.date).toLocaleString('fr-CA', { dateStyle:'medium', timeStyle:'short' }) : 'date inconnue';
    const msg = 'Charger cette sauvegarde ?\n\nFichier (' + quand + ') : ' + savSummary(r.data.cles.dt_prof)
      + '\nActuelle : ' + savSummary(P) + '\n\nLa progression actuelle de ce navigateur sera remplacée.';
    if (!confirm(msg)){ savMsg('Rien n’a été changé.'); return; }
    if (!savApply(r.data)){ savMsg('Impossible d’écrire la sauvegarde dans ce navigateur.', true); return; }
    savMsg('Sauvegarde chargée. Le jeu redémarre…');
    setTimeout(() => location.reload(), 600);
  };
  rd.onerror = () => savMsg('Lecture du fichier impossible.', true);
  rd.readAsText(file);
}

/* ---------- Écran et boutons ---------- */
try {
  const _b = showScreen;
  showScreen = function(id){ const r = _b.apply(this, arguments); const el = $('scrSave'); if (el) el.classList.toggle('hide', id !== 'scrSave'); return r; };
} catch (e) { errNote(e); }
(function(){
  const on = (id, ev, f) => { const el = $(id); if (el && el.addEventListener) el.addEventListener(ev, f); };
  on('btnSaveTitle', 'click', () => { savMsg(''); savRender(); showScreen('scrSave'); });
  on('btnSaveExport', 'click', () => { savExport(); });
  on('btnSaveImport', 'click', () => { const i = $('savFile'); if (i){ i.value = ''; i.click(); } });
  on('savFile', 'change', e => savImportFile(e.target.files && e.target.files[0]));
  on('btnSaveBack', 'click', () => showScreen('scrTitle'));
})();

// Accès pour les tests automatiques
window.__sauv = { SAV_NOM, SAV_AVANT, savCollect, savCheck, savApply, savSummary, savExport };
