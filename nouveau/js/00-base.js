'use strict';
const $ = id => document.getElementById(id);
const isTouch = window.matchMedia ? matchMedia('(pointer: coarse)').matches : ('ontouchstart' in window);
if (isTouch) document.body.classList.add('touch');
const store = {
  get(k, d){ try{ const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); }catch(e){ return d; } },
  set(k, v){ try{ localStorage.setItem(k, JSON.stringify(v)); }catch(e){} }
};
const fmt = n => Math.round(n).toLocaleString('fr-CA') + '\u00a0$';
const rand = (a, b) => a + Math.random() * (b - a);
const pick = a => a[Math.floor(Math.random() * a.length)];
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
