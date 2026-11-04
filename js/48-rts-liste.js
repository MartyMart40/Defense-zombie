'use strict';
/* ================= RTS : choisir les unités une par une ================= */
// - Rangée « Unités » au-dessus des onglets (onglets Robots et Véhicules) : fermée, elle ne montre qu'une pastille
//   « 👥 Unités · N » (et les groupes) pour ne pas cacher le jeu ; la toucher ouvre la liste, une pastille par unité
//   avec sa vie (demande de Martin : la liste prenait la moitié de l'écran). Ouverte ou fermée : gardé (dt_rts_liste).
//   Toucher une pastille choisit cette unité seule et amène la caméra dessus, même si elle est loin.
//   Retoucher la pastille de l'unité choisie la relâche.
// - Ordi : double-clic sur une unité = toutes celles du même type visibles à l'écran ; Tab = unité suivante (Maj+Tab : précédente).
// - Groupes enregistrés (5 au plus) : pastille « ＋ Groupe » = enregistrer les unités choisies ; « G1 »... = les choisir
//   (retoucher = la caméra y va) ; appui long ou clic droit = remplacer par les unités choisies (ou supprimer sans choix).
//   Ordi : Ctrl+1 à 5 enregistre, Maj+1 à 5 rappelle (les chiffres seuls achètent des robots). Gardés dans la sauvegarde (js/45).
// - Le toucher, l'appui long (ajouter au groupe) et le rayon autour du doigt sont dans js/44-rts-interface.js (rtsTap, rtsPick).

const RTS_ICON = { rob:'🤖', veh:'🛡' };
const RTS_KIND_ICON = { heli:'🚁', air:'✈' };
const RTS_SHORT = { rifle:'Fantassin', gunner:'Mitrailleur', sniper:'Tireur', flamebot:'Flammes', rocket:'Roquettes', heavy:'Mech lourd', mech:'Mech', tank:'Tank', heli:'Apache', jet:'Chasseur', warthog:'Warthog', bomber:'AC-130' };
const rtsIds = new WeakMap(); let rtsIdN = 0;
const rtsId = u => { let i = rtsIds.get(u); if (!i){ i = ++rtsIdN; rtsIds.set(u, i); } return i; };
const rtsIcon = u => RTS_KIND_ICON[u.U.kind] || RTS_ICON[u.U.cat] || '🤖';

/* ---------- Groupes enregistrés ---------- */
const RTS_GROUPS = 5;
const rtsGrpOf = i => (RTS.groups && RTS.groups[i] ? RTS.groups[i] : []).filter(u => !u.dead);
function rtsGroupsReset(){ RTS.groups = []; for (let i = 0; i < RTS_GROUPS; i++) RTS.groups.push([]); }
function rtsGroupSave(i){
  if (!RTS.groups) rtsGroupsReset();
  const list = RTS.sel.filter(u => !u.dead);
  if (i == null){ i = RTS.groups.findIndex(g => !g.some(u => !u.dead)); if (i < 0){ if (typeof toast === 'function') toast('Déjà ' + RTS_GROUPS + ' groupes : garde le doigt sur un groupe pour le remplacer'); return -1; } }
  if (!list.length){ RTS.groups[i] = []; if (typeof toast === 'function') toast('Groupe ' + (i + 1) + ' supprimé'); }
  else { RTS.groups[i] = list.slice(); if (typeof toast === 'function') toast('Groupe ' + (i + 1) + ' : ' + list.length + ' unité' + (list.length > 1 ? 's' : '')); }
  rtsRosterDraw(true);
  return i;
}
function rtsGroupPick(i){
  const g = rtsGrpOf(i); if (!g.length) return null;
  const same = RTS.sel.length === g.length && g.every(u => RTS.sel.indexOf(u) >= 0);
  if (same){ let x = 0, z = 0; g.forEach(u => { x += u.g.position.x; z += u.g.position.z; }); RTS.cam.x = x / g.length; RTS.cam.z = z / g.length; }
  else rtsSelect(g, false);
  rtsRosterDraw(true);
  return g;
}
rtsGroupsReset();

const rtsRoster = document.createElement('div'); rtsRoster.id = 'rtRoster'; rtsRoster.className = 'hide'; rtsRoster.setAttribute('aria-label', 'Unités');
(function(){ const dock = $('rtDock'); if (dock) dock.insertBefore(rtsRoster, dock.firstChild); })();
const RL = { sig:'', t:0, ouvert: store.get('dt_rts_liste', false) === true };
function rtsRosterOuvrir(on){ RL.ouvert = on == null ? !RL.ouvert : !!on; store.set('dt_rts_liste', RL.ouvert); rtsRosterDraw(true); return RL.ouvert; }

// Unités montrées : celles de l'onglet ouvert (robots ou véhicules), dans l'ordre de la boutique puis d'arrivée
function rtsRosterList(){
  const cat = RTS.tab === 'veh' ? 'veh' : RTS.tab === 'rob' ? 'rob' : null; if (!cat) return [];
  return RTS.units.filter(u => !u.dead && u.U.cat === cat && RTS.pilot !== u)
    .sort((a, b) => (RTS_ORDER.indexOf(a.type) - RTS_ORDER.indexOf(b.type)) || (rtsId(a) - rtsId(b)));
}
function rtsRosterDraw(force){
  const list = rtsRosterList();
  const grp = []; for (let i = 0; i < RTS_GROUPS; i++){ const g = rtsGrpOf(i); if (g.length) grp.push([i, g]); }
  const show = state === 'rts' && !RTS.pilot && (list.length > 0 || grp.length > 0) && (RTS.tab === 'rob' || RTS.tab === 'veh');
  rtsRoster.classList.toggle('hide', !show); if (!show){ RL.sig = ''; return list; }
  const sig = (RL.ouvert ? 'o' : 'f') + grp.map(([i, g]) => i + ':' + g.length + (g.every(u => RTS.sel.indexOf(u) >= 0) && RTS.sel.length === g.length ? '*' : '')).join(',') + '|' + (RTS.sel.length ? 'p' : '') + '|' + list.map(u => rtsId(u) + (RTS.sel.indexOf(u) >= 0 ? '*' : '')).join(',');
  if (force || sig !== RL.sig){
    RL.sig = sig;
    const n = {};
    const tog = '<button type="button" class="rt-g rt-tog' + (RL.ouvert ? ' on' : '') + '" data-tog="1" aria-expanded="' + RL.ouvert + '"><span>👥 Unités · ' + list.length + (RL.ouvert ? ' ▾' : ' ▸') + '</span></button>';
    const gh = tog + grp.map(([i, g]) => '<button type="button" class="rt-g' + (RTS.sel.length === g.length && g.every(u => RTS.sel.indexOf(u) >= 0) ? ' on' : '') + '" data-g="' + i + '" aria-label="Groupe ' + (i + 1) + '"><span>👥 G' + (i + 1) + ' · ' + g.length + '</span></button>').join('')
      + (RTS.sel.length ? '<button type="button" class="rt-g rt-gplus" data-gplus="1"><span>＋ Groupe</span></button>' : '');
    rtsRoster.innerHTML = gh + (RL.ouvert ? list : []).map(u => {
      n[u.type] = (n[u.type] || 0) + 1;
      return '<button type="button" class="rt-u' + (RTS.sel.indexOf(u) >= 0 ? ' on' : '') + '" data-id="' + rtsId(u) + '" aria-label="' + u.U.name.replace(/[⭐ ]+$/, '') + ' ' + n[u.type] + '">'
        + '<span>' + rtsIcon(u) + ' ' + (RTS_SHORT[u.type] || u.U.name) + ' ' + n[u.type] + '</span><i><b></b></i></button>';
    }).join('');
  }
  // Barres de vie (après les pastilles de groupe)
  const bs = rtsRoster.querySelectorAll('button[data-id]');
  for (let i = 0; i < bs.length && i < list.length && RL.ouvert; i++){ const u = list[i], k = clamp(u.hp / u.maxHp, 0, 1), b = bs[i].querySelector('b'); if (b){ b.style.width = Math.round(k * 100) + '%'; b.className = k < .35 ? 'bas' : ''; } }
  return list;
}
// Choisir une unité de la rangée : seule, et la caméra va la voir
function rtsRosterPick(id){
  const u = RTS.units.find(x => !x.dead && rtsId(x) === +id); if (!u) return null;
  if (RTS.sel.length === 1 && RTS.sel[0] === u){ RTS.sel.length = 0; rtsInfoShow(); rtsRosterDraw(true); return null; }
  rtsSelect([u], false); rtsCamTo(u);
  rtsRosterDraw(true);
  return u;
}
function rtsCamTo(u){ RTS.cam.x = u.g.position.x; RTS.cam.z = u.g.position.z; }
rtsRoster.addEventListener('click', e => {
  if (RL.long){ RL.long = false; return; } // l'appui long a déjà agi
  if (e.target.closest('button[data-tog]')){ rtsRosterOuvrir(); return; }
  const g = e.target.closest('button[data-g]'); if (g){ rtsGroupPick(+g.dataset.g); return; }
  if (e.target.closest('button[data-gplus]')){ rtsGroupSave(null); return; }
  const b = e.target.closest('button[data-id]'); if (b) rtsRosterPick(b.dataset.id);
});
// Appui long (doigt) ou clic droit sur un groupe : le remplacer par les unités choisies (ou le supprimer)
rtsRoster.addEventListener('contextmenu', e => { const g = e.target.closest('button[data-g]'); if (g){ e.preventDefault(); rtsGroupSave(+g.dataset.g); } });
rtsRoster.addEventListener('pointerdown', e => {
  const g = e.target.closest('button[data-g]'); if (!g || e.pointerType === 'mouse') return;
  clearTimeout(RL.lt); RL.long = false;
  RL.lt = setTimeout(() => { RL.long = true; rtsGroupSave(+g.dataset.g); if (navigator.vibrate) try { navigator.vibrate(25); } catch (x) { errNote(x); } }, RTS_LONG_MS);
});
['pointerup', 'pointercancel', 'pointerleave'].forEach(t => rtsRoster.addEventListener(t, () => clearTimeout(RL.lt)));

// Ordi : unité suivante (Tab) ou précédente (Maj+Tab), parmi toutes les unités
function rtsCycle(dir){
  const all = RTS.units.filter(u => !u.dead && RTS.pilot !== u).sort((a, b) => rtsId(a) - rtsId(b)); if (!all.length) return null;
  const cur = RTS.sel.length ? all.indexOf(RTS.sel[RTS.sel.length - 1]) : -1;
  const u = all[((cur < 0 ? (dir > 0 ? -1 : 0) : cur) + (dir > 0 ? 1 : -1) + all.length) % all.length];
  rtsSelect([u], false); rtsCamTo(u); rtsRosterDraw(true);
  return u;
}
// Ordi : double-clic sur une unité = toutes celles du même type visibles à l'écran
function rtsSameType(u){
  camera.updateMatrixWorld();
  const list = RTS.units.filter(x => {
    if (x.dead || x.type !== u.type) return false;
    rtsV.copy(x.g.position).project(camera);
    return rtsV.z < 1 && Math.abs(rtsV.x) <= 1 && Math.abs(rtsV.y) <= 1;
  });
  rtsSelect(list, false); rtsRosterDraw(true);
  return list;
}
document.addEventListener('keydown', e => {
  if (state !== 'rts' || RTS.pilot || RTS.paused) return;
  if (e.code === 'Tab'){ e.preventDefault(); rtsCycle(e.shiftKey ? -1 : 1); return; }
  // Groupes : Ctrl+1 à 5 enregistre, Maj+1 à 5 rappelle (l'achat au chiffre seul, js/44, ne se fait pas avec Ctrl ou Maj)
  const m = /^Digit([1-5])$/.exec(e.code); if (!m || !(e.ctrlKey || e.metaKey || e.shiftKey)) return;
  e.preventDefault(); e.stopImmediatePropagation();
  if (e.ctrlKey || e.metaKey) rtsGroupSave(+m[1] - 1); else rtsGroupPick(+m[1] - 1);
}, true);
canvas.addEventListener('dblclick', e => {
  if (state !== 'rts' || RTS.pilot || RTS.place || isTouch) return;
  const p = rtsPick(e.clientX, e.clientY); if (p.unit) rtsSameType(p.unit);
});

// Mise à jour : la liste quand elle change, les barres de vie 4 fois par seconde
Jeu.on('image', dt => {
  if (state !== 'rts' && rtsRoster.classList.contains('hide')) return;
  RL.t -= dt || 0;
  if (RL.t <= 0){ RL.t = .25; rtsRosterDraw(false); }
});

// Accès pour les tests automatiques
window.__rtsListe = { RL, rtsRosterOuvrir, rtsRosterList, rtsRosterDraw, rtsRosterPick, rtsCycle, rtsSameType, rtsId, RTS_SHORT, RTS_GROUPS, rtsGroupSave, rtsGroupPick, rtsGroupsReset, rtsGrpOf };
