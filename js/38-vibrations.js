'use strict';
/* ================= Vibrations du cellulaire (tirs, explosions, coups sur la barricade) ================= */
// navigator.vibrate : Android (Chrome, Samsung Internet). L'iPhone ne vibre pas depuis une page web : rien ne se passe.
// Réglage « Vibrations » dans l'écran Pause (dt_vib), activé par défaut sur cell, absent sur ordi sans vibreur.
// Une seule vibration à la fois : une plus forte remplace une plus faible ; les petites sont espacées (minigun).
const VIB_ARME = { pistol:12, shotgun:35, rifle:10, sniper:40, crossbow:8, flamer:0, minigun:9, rocket:55, mg50:22, laser:5, railgun:70, gl:28, arc:16 };
const VIB = {
  on: store.get('dt_vib', true) !== false,
  ok: typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function',
  until:0, last:0, n:0, gap:.06,
  send(p){ try { navigator.vibrate(p); } catch (e) {} } // remplacé par les tests
};
const vibNow = () => (typeof performance !== 'undefined' ? performance.now() : Date.now()) / 1000;
// ms : durée ; force : priorité (une vibration plus forte coupe la plus faible en cours)
// ms : durée, ou motif [vibre, pause, vibre...]
function vib(ms, force){
  const pat = Array.isArray(ms), tot = pat ? ms.reduce((a, b) => a + b, 0) : ms;
  if (!VIB.on || !(tot > 0) || (!VIB.ok && VIB.send === vibDefault)) return false;
  const t = vibNow();
  if (t < VIB.until && force < VIB.force) return false;     // une plus forte est en cours
  if (t - VIB.last < VIB.gap && force <= (VIB.force || 0)) return false; // trop rapproché
  VIB.last = t; VIB.until = t + tot / 1000; VIB.force = force || 0; VIB.n++;
  VIB.send(pat ? ms.map(Math.round) : Math.round(ms));
  return true;
}
const vibDefault = VIB.send;
function vibShot(id){ const ms = VIB_ARME[id]; if (ms) vib(ms, ms / 10); }
function vibBoom(power, pos){
  let near = 1;
  if (pos && typeof camera !== 'undefined') near = clamp(1.2 - camera.position.distanceTo(pos) / 70, .3, 1);
  const p = (power || 1) * near, ms = Math.round(clamp(50 + 110 * p, 40, 260));
  vib(p > 1.2 ? [ms, 40, Math.round(ms * .5)] : ms, 10 + p * 10);
}

/* ---------- Réglage dans l'écran Pause ---------- */
function vibBtn(){ const b = $('btnVib'); if (b) b.textContent = 'Vibrations : ' + (VIB.on ? 'activées' : 'coupées'); }
function vibSet(on){ VIB.on = !!on; store.set('dt_vib', VIB.on); vibBtn(); if (VIB.on) vib(40, 99); }
(function(){
  const res = $('btnResume');
  if (VIB.ok && isTouch && res && res.parentNode && !$('btnVib')){
    const b = document.createElement('button'); b.className = 'ghost'; b.id = 'btnVib'; b.type = 'button';
    res.parentNode.insertBefore(b, res);
    b.addEventListener('click', () => vibSet(!VIB.on));
  }
  vibBtn();
})();

/* ---------- Crochets ---------- */
try { const _b = fire; fire = function(){ const id = S && S.cur; const r = _b.apply(this, arguments); if (r !== false && (state === 'playing' || state === 'mech')) vibShot(id); return r; }; } catch (e) {}
// Explosions : toutes passent par Snd.boom (barils, roquettes, grenades, gonflés, mortier, ogive)
try {
  const _b = Snd.boom;
  Snd.boom = function(power){ const r = _b.apply(this, arguments); if (state === 'playing' || state === 'mech') vibBoom(power, null); return r; };
} catch (e) {}
// Gros coups sur la barricade (colosse, boss) : une secousse dans la main
try {
  const _h = hitBarricade;
  hitBarricade = function(z, dmg, shk){ const r = _h.apply(this, arguments); if (shk >= .45 && (state === 'playing' || state === 'mech')) vib(Math.round(40 + 80 * Math.min(1, shk)), 8); return r; };
} catch (e) {}

// Accès pour les tests automatiques
window.__vib = { VIB, VIB_ARME, vib, vibShot, vibBoom, vibSet };
