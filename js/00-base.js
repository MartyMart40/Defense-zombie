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
