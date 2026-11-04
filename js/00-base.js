'use strict';
const $ = id => document.getElementById(id);
const isTouch = window.matchMedia ? matchMedia('(pointer: coarse)').matches : ('ontouchstart' in window);
if (isTouch) document.body.classList.add('touch');
const store = {
  get(k, d){ try{ const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); }catch(e){ return d; } },
  set(k, v){ try{ localStorage.setItem(k, JSON.stringify(v)); }catch(e){} }
};
// Nombres : jusqu'à 9 999, l'entier comme avant (« 9 999 ») ; au-delà, forme courte à la française
// avec 3 chiffres significatifs : « 12,3 k », « 456 k », « 4,56 M », « 7,8 G » (mode infini : argent, vie, dégâts énormes).
const FMT_UNITS = ['', 'k', 'M', 'G', 'T', 'P', 'E'];
function fmtN(n){
  n = +n;
  if (!isFinite(n)) return isNaN(n) ? '0' : (n < 0 ? '-' : '') + '\u221e';
  if (Math.abs(Math.round(n)) < 10000) return Math.round(n).toLocaleString('fr-CA');
  const a = Math.abs(n), top = FMT_UNITS.length - 1;
  let e = Math.min(top, Math.floor(Math.log10(a) / 3)), v = +(a / Math.pow(1000, e)).toPrecision(3);
  if (v >= 1000 && e < top){ e++; v = +(a / Math.pow(1000, e)).toPrecision(3); }
  if (v >= 1000) return (n < 0 ? '-' : '') + a.toExponential(2).replace('.', ',').replace('e+', 'e');
  return (n < 0 ? '-' : '') + String(v).replace('.', ',') + '\u00a0' + FMT_UNITS[e];
}
const fmt = n => fmtN(n) + '\u00a0$';
const rand = (a, b) => a + Math.random() * (b - a);
const pick = a => a[Math.floor(Math.random() * a.length)];
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

/* ---------- Registre des modes et des événements ---------- */
// Un mode de jeu (robot, RTS, et les prochains) s'inscrit ici au lieu de remplacer visuals, kill, etc.
// Le branchement sur le jeu commun est fait UNE fois, dans js/90-branchements.js (chargé en dernier).
//   Jeu.mode('nom', { etats:{ jeu:'x', fin:'xover' }, actif(), etape(dt), image(dt), tue(z, etaitVivant), musique(), demarrer, quitter })
//     actif()    : vrai quand ce mode tourne (le seul mode actif reçoit etape, image, tue, musique)
//     etape(dt)  : logique du mode, appelée à chaque image quand state === etats.jeu, AVANT le rendu commun
//     image(dt)  : caméra, effets, interface, appelée à chaque image quand le mode est actif, APRÈS le rendu commun
//     tue(z, v)  : un zombie vient d'être tué (v : il était vivant juste avant)
//     musique()  : 'menu', 'wave' ou 'boss' pour la musique, ou undefined pour laisser le jeu choisir
//   Jeu.on('image', fn) / Jeu.on('tue', fn) : écouter un événement, quel que soit le mode ; Jeu.emit(nom, ...) le déclenche.
// Voir docs/architecture.md.
const Jeu = {
  modes: {},
  ecoute: {},
  mode(nom, def){ def.nom = nom; def.etats = def.etats || {}; this.modes[nom] = def; return def; },
  actif(){ for (const k in this.modes){ const m = this.modes[k]; try { if (m.actif && m.actif()) return m; } catch (e) {} } return null; },
  on(evt, fn){ (this.ecoute[evt] = this.ecoute[evt] || []).push(fn); return fn; },
  off(evt, fn){ const l = this.ecoute[evt]; if (l){ const i = l.indexOf(fn); if (i >= 0) l.splice(i, 1); } },
  emit(evt, a, b, c){
    const l = this.ecoute[evt]; if (!l || !l.length) return;
    for (const f of l.slice()){ try { f(a, b, c); } catch (e) { if (typeof console === 'object') console.error('Jeu.emit(' + evt + ')', e); } }
  }
};
