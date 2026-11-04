'use strict';
/* ================= Bruitages : son placé dans l'espace, douilles, corps, horde, barricade ================= */
// Tout passe par les outils de Snd (01-son.js) ; sans audio (Snd.ctx absent), rien ne se passe.
//   Son placé : grognements et coups sur la barricade viennent de gauche ou de droite selon le zombie, plus faibles de loin.
//   Douilles : tintement sur le toit un instant après l'éjection (laiton qui sonne, cartouche de pompe plus sourde,
//     grosse douille de .50 ou de grenade plus grave). Au plus BR_TINK_MAX par seconde (minigun).
//   Zombies abattus : corps qui tombe (bruit sourd), craquement à la tête.
//   Horde : murmure continu de la foule, plus fort quand il y a beaucoup de zombies proches.
//   Barricade abîmée (moins de 35 %) : le bois craque de temps en temps.

const BR = { tinks:0, drops:0, crunch:0, creaks:0, tinkSec:0, tinkT:0, dropT:0, creakT:4, horde:null, hordeLvl:0 };
const BR_TINK_MAX = 10;
const brV = new THREE.Vector3();

// Panoramique et distance d'un point du monde, vus de la caméra (pan -1 à 1, vol 0,25 à 1)
function brSpot(x, y, z){
  if (typeof camera === 'undefined') return { pan:0, vol:1 };
  // Angle du son par rapport au regard : sinus de l'azimut dans le repère de la caméra
  camera.updateMatrixWorld();
  brV.set(x, y, z).applyMatrix4(camera.matrixWorldInverse);
  const h = Math.sqrt(brV.x * brV.x + brV.z * brV.z) || 1, pan = clamp(brV.x / h, -1, 1) * .9;
  const d = camera.position.distanceTo(brV.set(x, y, z));
  return { pan, vol:clamp(1.15 - d / 90, .25, 1) };
}
// Sortie panoramique : Snd._out pendant l'appel f (les outils _nz, _osc et groan l'utilisent)
function brAt(x, y, z, f){
  if (typeof Snd !== 'object' || !Snd.ctx || !Snd.master) return;
  const c = Snd.ctx, s = brSpot(x, y, z);
  try {
    const g = c.createGain(); g.gain.value = s.vol;
    if (c.createStereoPanner){ const p = c.createStereoPanner(); p.pan.value = s.pan; g.connect(p); p.connect(Snd.master); }
    else g.connect(Snd.master);
    const o = Snd._out; Snd._out = g;
    try { f(); } finally { Snd._out = o; }
    setTimeout(() => { try { g.disconnect(); } catch (e) { errNote(e); } }, 4000);
  } catch (e) { errNote(e); }
}

/* ---------- Douilles qui tombent sur le toit ---------- */
function brTink(shell){
  if (typeof Snd !== 'object' || !Snd.ctx) return;
  const now = Snd.ctx.currentTime;
  if (now - BR.tinkT > 1){ BR.tinkT = now; BR.tinkSec = 0; }
  if (++BR.tinkSec > BR_TINK_MAX) return;
  BR.tinks++;
  try {
    const t = now + rand(.28, .45), v = rand(.6, 1);
    if (shell === 1){ Snd._nz(t, 'bandpass', rand(700, 1000), 3, .06, .07 * v); Snd._nz(t + rand(.08, .14), 'bandpass', 800, 3, .05, .04 * v); return; } // cartouche en plastique
    const big = shell === 5 || shell === 6 || shell === 7, f = big ? rand(1400, 2200) : rand(3200, 5600);
    for (let i = 0; i < (big ? 2 : 3); i++){
      const ti = t + i * rand(.06, .12), k = Math.pow(.55, i);
      Snd._osc(ti, 'triangle', f * rand(.97, 1.03), f * .98, big ? .12 : .07, (big ? .06 : .045) * v * k);
      Snd._osc(ti, 'sine', f * 2.7, f * 2.6, .04, .015 * v * k);
    }
  } catch (e) { errNote(e); }
}

/* ---------- Zombies abattus ---------- */
function brKill(z, head){
  if (typeof Snd !== 'object' || !Snd.ctx || !z || !z.g) return;
  const now = Snd.ctx.currentTime, gp = z.g.position;
  if (head){ BR.crunch++; brAt(gp.x, 1.6, gp.z, () => { Snd._nz(Snd.ctx.currentTime, 'bandpass', rand(1000, 1500), 2, .09, .16); Snd._nz(Snd.ctx.currentTime + .01, 'highpass', 3500, 0, .025, .1); }); }
  if (now - BR.dropT < .12) return; // pas plus de 8 chutes par seconde
  BR.dropT = now; BR.drops++;
  const big = ((ZTYPES[z.type] || {}).scale || 1) > 1.4, air = gp.y > 1.5;
  brAt(gp.x, 0, gp.z, () => {
    const t = Snd.ctx.currentTime + (air ? .45 : .32);
    Snd._nz(t, 'lowpass', big ? 220 : 380, 1, big ? .35 : .18, big ? .5 : .22);
    Snd._osc(t, 'sine', big ? 55 : 85, 35, big ? .3 : .12, big ? .4 : .15);
  });
}

/* ---------- Murmure de la horde ---------- */
function brHorde(dt){
  if (typeof Snd !== 'object' || !Snd.ctx || !Snd.master) return;
  let n = 0;
  if (state === 'playing' || state === 'mech' || state === 'rts') for (let i = 0; i < zombies.length; i++){ const z = zombies[i]; if (!z.dead && z.g.position.z > -75) n++; }
  const want = state === 'playing' || state === 'mech' || state === 'rts' ? clamp(n / (isTouch ? 30 : 45), 0, 1) : 0;
  BR.hordeLvl += (want - BR.hordeLvl) * Math.min(1, dt * 1.5);
  try {
    if (!BR.horde && BR.hordeLvl > .02 && Snd._ambReady && Snd._ambReady() && Snd.brown){
      const c = Snd.ctx, s = c.createBufferSource(); s.buffer = Snd.brown; s.loop = true; s.playbackRate.value = .9;
      const f1 = c.createBiquadFilter(); f1.type = 'bandpass'; f1.frequency.value = 380; f1.Q.value = 2.5;
      const f2 = c.createBiquadFilter(); f2.type = 'bandpass'; f2.frequency.value = 760; f2.Q.value = 4;
      const g = c.createGain(); g.gain.value = 0.0001;
      const lfo = c.createOscillator(), lg = c.createGain(); lfo.frequency.value = .35; lg.gain.value = .03; lfo.connect(lg); lg.connect(g.gain);
      s.connect(f1); s.connect(f2); f1.connect(g); f2.connect(g); g.connect(Snd.master);
      s.start(c.currentTime, Math.random() * 5); lfo.start();
      BR.horde = { s, g, f1, lfo };
    }
    if (BR.horde){
      const t = Snd.ctx.currentTime;
      BR.horde.g.gain.setTargetAtTime(Math.max(0.0001, .11 * BR.hordeLvl), t, .4);
      BR.horde.f1.frequency.setTargetAtTime(330 + 120 * BR.hordeLvl, t, .8);
      if (BR.hordeLvl <= .01 && state !== 'playing' && state !== 'mech' && state !== 'rts'){ const h = BR.horde; BR.horde = null; h.g.gain.setTargetAtTime(0.0001, t, .2); try { h.s.stop(t + 1); h.lfo.stop(t + 1); } catch (e) { errNote(e); } }
    }
  } catch (e) { BR.horde = null; }
}

/* ---------- Barricade qui craque ---------- */
function brCreak(dt){
  if ((state !== 'playing' && state !== 'mech') || !S || typeof Snd !== 'object' || !Snd.ctx || S.bar > S.barMax * .35) return;
  BR.creakT -= dt; if (BR.creakT > 0) return;
  BR.creakT = rand(2.5, 6) * (.4 + S.bar / S.barMax); BR.creaks++;
  brAt(rand(-8, 8), 1, BAR_Z, () => {
    try {
      const c = Snd.ctx, t = c.currentTime, o = c.createOscillator(), f = c.createBiquadFilter(), g = c.createGain(), d = rand(.4, .8);
      o.type = 'sawtooth'; o.frequency.setValueAtTime(rand(70, 110), t); o.frequency.linearRampToValueAtTime(rand(50, 80), t + d);
      f.type = 'bandpass'; f.frequency.value = rand(700, 1100); f.Q.value = 9;
      g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(.12, t + .05); g.gain.exponentialRampToValueAtTime(0.001, t + d);
      o.connect(f); f.connect(g); g.connect(Snd._out || Snd.master); o.start(t); o.stop(t + d + .05);
    } catch (e) { errNote(e); }
  });
}

/* ---------- Crochets ---------- */
// Grognement : d'un zombie vivant au hasard, placé à gauche ou à droite, plus faible de loin
try {
  const _g = Snd.groan;
  Snd.groan = function(){
    const list = typeof zombies !== 'undefined' ? zombies.filter(z => !z.dead && z.g) : [];
    if (!list.length || !this.ctx) return _g.apply(this, arguments);
    const z = list[Math.floor(Math.random() * list.length)], gp = z.g.position, args = arguments;
    brAt(gp.x, gp.y + 1.5, gp.z, () => _g.apply(this, args));
  };
} catch (e) { errNote(e); }
// Coups sur la barricade : le bruit vient du côté du zombie qui frappe
try {
  const _h = hitBarricade;
  hitBarricade = function(z){
    if (!z || !z.g || typeof Snd !== 'object' || !Snd.ctx) return _h.apply(this, arguments);
    let r; const args = arguments;
    brAt(z.g.position.x, 1, BAR_Z, () => { r = _h.apply(this, args); });
    return r;
  };
} catch (e) { errNote(e); }
try { const _k = kill; kill = function(z, head){ const r = _k.apply(this, arguments); try { brKill(z, head); } catch (e) { errNote(e); } return r; }; } catch (e) { errNote(e); }
try {
  if (typeof vmEject === 'function'){
    const _e = vmEject;
    vmEject = function(id){ const r = _e.apply(this, arguments); const ud = VMS[id] && VMS[id].userData; if (ud && ud.eject && (id !== 'minigun' || Math.random() < .5)) brTink(ud.shell || 0); return r; };
  }
} catch (e) { errNote(e); }
Jeu.on('image', dt => { brHorde(dt || 0); brCreak(dt || 0); }); // chaque image (registre, js/00-base.js)

// Accès pour les tests automatiques
window.__br = { BR, brSpot, brTink, brKill, brHorde, brCreak };
