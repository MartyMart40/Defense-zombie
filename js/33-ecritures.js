'use strict';
/* ================= Écritures du jeu dans une colonne à gauche ================= */
// Avant, les textes (« Tête ! », « +15 $ », « Point faible ! », « Baril ! +3 », survivants...) apparaissaient
// au point d'impact, juste au-dessus du viseur, et cachaient la cible. Ils vont maintenant dans une colonne
// à gauche, sous les infos de la partie : le plus récent en haut, au plus ECR_MAX lignes, chacune s'efface seule.
// Un même texte répété de suite est regroupé (« Tête ! ×3 »). Les chiffres de dégâts (31-punch.js) ne changent pas :
// ils se coupent dans l'écran Pause.
// floatText (11-hud.js), weakText (07-zombies.js) et rueFloat (23-rue.js) sont remplacées (réaffectation).
const ECR_MAX = isTouch ? 4 : 6;
const ECR_LIFE = 2200;   // ms d'affichage
const ECR_JOIN = 1300;   // ms pendant lesquelles un même texte se regroupe
const ECR = { items:[], box:null, n:0 };
function ecrBox(){
  if (ECR.box && ECR.box.parentNode) return ECR.box;
  const b = document.createElement('div'); b.id = 'ecrFeed'; b.setAttribute('aria-live', 'polite');
  document.body.appendChild(b); ECR.box = b; return b;
}
function ecrDrop(it){
  const i = ECR.items.indexOf(it); if (i >= 0) ECR.items.splice(i, 1);
  clearTimeout(it.to); it.el.classList.add('out'); setTimeout(() => it.el.remove(), 260);
}
function ecrPush(txt, kind, color){
  txt = String(txt == null ? '' : txt); if (!txt) return null;
  const box = ecrBox(), now = Date.now(), top = ECR.items[0];
  if (top && top.txt === txt && now - top.t < ECR_JOIN){
    top.n++; top.t = now; top.el.textContent = txt + ' ×' + top.n;
    top.el.classList.remove('pop'); void top.el.offsetWidth; top.el.classList.add('pop');
    clearTimeout(top.to); top.to = setTimeout(() => ecrDrop(top), ECR_LIFE);
    return top;
  }
  const el = document.createElement('div'); el.className = 'ecr pop' + (kind ? ' ' + kind : ''); el.textContent = txt;
  if (color) el.style.color = color;
  box.insertBefore(el, box.firstChild);
  const it = { el, txt, t:now, n:1, to:0 };
  it.to = setTimeout(() => ecrDrop(it), ECR_LIFE);
  ECR.items.unshift(it); ECR.n++;
  while (ECR.items.length > ECR_MAX) ecrDrop(ECR.items[ECR.items.length - 1]);
  return it;
}
function ecrClear(){ ECR.items.forEach(it => clearTimeout(it.to)); ECR.items.length = 0; if (ECR.box) while (ECR.box.firstChild) ECR.box.removeChild(ECR.box.firstChild); }

try { floatText = function(txt, pos, head){ ecrPush(txt, head ? 'head' : ''); }; } catch (e) {}
try { weakText = function(txt){ ecrPush(txt, 'weak'); }; } catch (e) {}
try { rueFloat = function(txt, pos, color, big){ ecrPush(txt, big ? 'head' : '', color); }; } catch (e) {}
// Hors partie (menus, fin), la colonne se vide
try { const _b = showScreen; showScreen = function(){ ecrClear(); return _b.apply(this, arguments); }; } catch (e) {}

window.__ecr = { ECR, ECR_MAX, ecrPush, ecrClear };
