'use strict';
/* ================= Explosions et pouvoirs du toit : les sons (dossier 130) ================= */
// Seulement sonore, appelé par js/85-explosions.js (exSon, exSonImage) au moment où il voit naître l'explosion.
// Le son d'origine reste (Snd.boom de js/01-son.js, avec sa réverbération de rue) : on ajoute par-dessus ce qui manquait :
//   grave  : un coup très bas (55 à 26 Hz) qu'on sent plus qu'on entend, plus fort de près ;
//   queue  : un grondement qui roule dans la rue 2,5 à 4 s, plus long pour les bombes ;
//   éclats : débris qui retombent (et le couvercle du baril qui sonne), éclats de métal de l'auto ;
//   placé  : à gauche ou à droite selon la caméra, plus faible et plus sourd de loin, en retard de loin (vitesse du son) ;
//   molotov : verre qui éclate et souffle du feu qui prend ; puis le feu crépite tant qu'une nappe brûle (plus fort de près) ;
//   frappe : deux bips de radio à l'annonce, le passage de l'avion (souffle qui balaie), une seule longue queue pour tout
//            le chapelet (les bombes suivantes n'ont que leur grave) ;
//   canon électromagnétique : grésillement de l'air ionisé au point d'impact.
// Rien sans audio ou son coupé (Snd.on faux), sur le toit seulement, coupé net en pause (voix gardées, feu à zéro).
// Tout passe par la chaîne de Snd sans la modifier : bus 'monde' avec un budget de voix à part pour les sons courts,
// bus 'amb' pour le crépitement (nœuds faits une fois, hors du budget, comme la nappe de js/82-boss-sons.js).
// Hasard propre (exsHasard) : ni ce fichier ni le bruit qu'il joue ne piochent dans Math.random.
// Mesures hors ligne : window.__explosionsSons.mesurer() (même méthode que js/76-centrale-sons.js) ; table dans docs/conception.md.

const EXS_REGL = {
  niv: { grave: .75, queue: .42, eclats: .14, verre: .16, souffle: .22, bip: .06, avion: .28, rail: .4 }, // gains (réglés par mesure hors ligne)
  portee: 28,          // distance (m) où le son est à moitié
  sourd: [5200, 700],  // passe-bas de près et à 120 m (Hz)
  pan: .75,
  feu: { max: .14, portee: 22, crepite: 14 }, // crépitement : gain au plus, distance de moitié (m), craquements par seconde au plus
  voix: 6,             // sons courts de ce fichier à la fois (budget à part de celui de Snd)
  ecart: .07           // deux explosions plus proches que ça (s) : la 2e n'a que son grave
};
let exsGr = 7717;
const exsHasard = () => { exsGr = (exsGr * 16807) % 2147483647; return (exsGr - 1) / 2147483646; };
const exsH = (a, b) => a + (b - a) * exsHasard();
const EXSN = { voix: [], vn: 0, feu: null, mesure: false, dernier: -9, n: { boum: 0, graves: 0, molotov: 0, annonce: 0, avion: 0, rail: 0, craque: 0 } };
const exsOk = () => typeof Snd === 'object' && !!Snd._ok && Snd._ok() && !!Snd.noise;

/* ---------- Outils (même manière que js/82-boss-sons.js, avec le hasard propre) ---------- */
function exsNz(t, type, freq, q, dur, vol, sweepTo, atk){
  const c = Snd.ctx, s = c.createBufferSource(); s.buffer = Snd.noise;
  const f = c.createBiquadFilter(); f.type = type; f.frequency.setValueAtTime(freq, t); if (q) f.Q.value = q;
  if (sweepTo) f.frequency.exponentialRampToValueAtTime(sweepTo, t + dur);
  const g = c.createGain();
  if (atk){ g.gain.setValueAtTime(.0001, t); g.gain.linearRampToValueAtTime(vol, t + atk); } else g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(.0005, t + dur);
  s.connect(f); f.connect(g); g.connect(Snd._out); s.start(t, exsHasard() * Math.max(0, s.buffer.duration - dur - .1)); s.stop(t + dur + .05);
  Snd._fin(t + dur + .05);
}
function exsOsc(t, type, f0, f1, dur, vol, atk){
  const c = Snd.ctx, o = c.createOscillator(), g = c.createGain(); o.type = type;
  o.frequency.setValueAtTime(f0, t); if (f1) o.frequency.exponentialRampToValueAtTime(f1, t + dur);
  g.gain.setValueAtTime(.0001, t); g.gain.linearRampToValueAtTime(vol, t + (atk || .005)); g.gain.exponentialRampToValueAtTime(.0005, t + dur);
  o.connect(g); g.connect(Snd._out); o.start(t); o.stop(t + dur + .05); Snd._fin(t + dur + .05);
}
// Une voix placée (pan), assourdie de loin (passe-bas), à un niveau, sur le bus 'monde' de Snd. Budget à part
// (EXS_REGL.voix) : jamais dans Snd.voix, sinon un son du jeu refusé ou coupé changerait ses tirages de Math.random.
// dur : durée de la voix (s), pour la libérer ; gardée pour la couper net en pause.
function exsVoix(pri, pan, niv, coupe, dur, f){
  if (!exsOk()) return false;
  const c = Snd.ctx, now = c.currentTime;
  EXSN.voix = EXSN.voix.filter(v => v.fin > now);
  if (EXSN.voix.length >= EXS_REGL.voix){
    let k = 0; EXSN.voix.forEach((v, i) => { const m = EXSN.voix[k]; if (v.pri < m.pri || (v.pri === m.pri && v.n < m.n)) k = i; });
    if (EXSN.voix[k].pri > pri) return false;
    exsCoupe(EXSN.voix[k]); EXSN.voix.splice(k, 1);
  }
  const o = Snd._out, vg = Snd._vg;
  let v = null;
  try {
    const g = c.createGain(); g.connect(Snd._bus('monde') || Snd.master);
    let out = g;
    if (pan && c.createStereoPanner){ const p = c.createStereoPanner(); p.pan.value = clamp(pan, -1, 1); p.connect(out); out = p; }
    if (coupe && coupe < 18000){ const l = c.createBiquadFilter(); l.type = 'lowpass'; l.frequency.value = coupe; l.connect(out); out = l; }
    if (niv != null && niv !== 1){ const n = c.createGain(); n.gain.value = niv; n.connect(out); out = n; }
    v = { g, pri, n: ++EXSN.vn, fin: now + dur + .3 };
    Snd._out = out; Snd._vg = null;
    f(now, c);
  } catch (e) { errNote(e); return false; } finally { Snd._out = o; Snd._vg = vg; }
  EXSN.voix.push(v);
  return true;
}
function exsCoupe(v){ try { const t = Snd.ctx.currentTime; v.g.gain.cancelScheduledValues(t); v.g.gain.setValueAtTime(v.g.gain.value, t); v.g.gain.linearRampToValueAtTime(0, t + .03); v.fin = 0; } catch (e) { errNote(e); } }
function exSonCouper(){
  exSonFeu(0, 0, 0, 0);
  if (typeof Snd !== 'object' || !Snd.ctx){ EXSN.voix = []; return; }
  EXSN.voix.forEach(exsCoupe);
  EXSN.voix = [];
}
// Place un point par rapport à la caméra : { d distance, pan, att atténuation, coupe passe-bas, ret retard }
const EXS_P = { d: 0, pan: 0, att: 1, coupe: 18000, ret: 0 };
const exsV = new THREE.Vector3(), exsDroite = new THREE.Vector3();
function exsPlace(x, y, z){
  const R = EXS_REGL, P = EXS_P;
  exsV.set(x - camera.position.x, y - camera.position.y, z - camera.position.z);
  P.d = exsV.length();
  exsDroite.setFromMatrixColumn(camera.matrixWorld, 0);
  P.pan = P.d > .5 ? clamp(exsV.dot(exsDroite) / P.d, -1, 1) * R.pan : 0;
  P.att = 1 / (1 + Math.max(0, P.d - 6) / R.portee);
  const k = clamp(P.d / 120, 0, 1); P.coupe = R.sourd[0] * Math.pow(R.sourd[1] / R.sourd[0], k);
  P.ret = Math.min(.3, P.d / 340);
  return P;
}

/* ---------- Les sons ---------- */
// quoi : grenade, bombe, roquette, gl, baril, auto, molotov, annonce, avion, rail ; k : rayon (ou rang de la bombe)
function exSon(quoi, x, y, z, k){
  if (!exsOk() || state !== 'playing' || (typeof Jeu === 'object' && Jeu.actif())) return false;
  const N = EXS_REGL.niv, P = exsPlace(x, y, z), now = Snd.ctx.currentTime;
  if (quoi === 'annonce'){ EXSN.n.annonce++;
    return exsVoix(1, 0, N.bip, 0, .7, t => { for (let i = 0; i < 2; i++){ exsOsc(t + .05 + i * .16, 'sine', 1420, 1400, .09, 1, .004); exsOsc(t + .05 + i * .16, 'square', 710, 700, .09, .15, .004); } exsNz(t + .38, 'bandpass', 1800, 2, .25, .4, 900, .01); }); }
  if (quoi === 'avion'){ EXSN.n.avion++;
    // L'avion arrive de derrière, passe au-dessus vers le fond : souffle qui balaie du grave vers l'aigu puis s'éloigne
    return exsVoix(1, 0, N.avion, 0, 3.5, t => {
      exsNz(t, 'bandpass', 500, 1.2, 1.1, 1, 2600, .9); exsNz(t + 1, 'bandpass', 2600, 1.4, 2.4, .9, 300, .02);
      exsOsc(t + .2, 'sawtooth', 210, 150, 2.6, .12, .7); exsNz(t + .9, 'lowpass', 300, 1, 2.2, .7, 90, .15);
    }); }
  if (quoi === 'rail'){ EXSN.n.rail++;
    return exsVoix(1, P.pan, N.rail * P.att, P.coupe, 1, t => {
      t += P.ret; for (let i = 0; i < 9; i++) exsNz(t + exsH(0, .55), 'bandpass', exsH(2500, 6000), 6, exsH(.008, .025), exsH(.5, 1));
      exsNz(t, 'highpass', 5000, 0, .5, .35, 0, .01); exsOsc(t, 'square', 120, 110, .3, .08, .01);
    }); }
  if (quoi === 'molotov'){ EXSN.n.molotov++;
    return exsVoix(2, P.pan, P.att, P.coupe, 1.9, t => {
      t += P.ret; for (let i = 0; i < 9; i++) exsNz(t + exsH(0, .12), 'bandpass', exsH(3000, 7500), 8, exsH(.01, .04), N.verre * exsH(.6, 1)); // verre qui éclate
      exsNz(t + .04, 'bandpass', 300, 1, .9, N.souffle, 1800, .1);                    // le feu qui prend d'un coup
      exsNz(t + .1, 'lowpass', 400, 1, 1.4, N.souffle * .8, 120, .15);
      exsOsc(t + .04, 'sine', 70, 40, .4, N.grave * .4, .02);
    }); }
  // Explosions
  const premier = now - EXSN.dernier > EXS_REGL.ecart, bombe = quoi === 'bombe', queue = bombe ? k === 0 : premier;
  EXSN.dernier = now; EXSN.n.boum++;
  const f = quoi === 'gl' ? .7 : quoi === 'baril' ? 1.15 : quoi === 'auto' ? 1 : bombe ? 1.1 : 1;
  return exsVoix(2, P.pan, P.att * f, P.coupe, 4.8, t => {
    t += P.ret;
    EXSN.n.graves++;
    exsOsc(t, 'sine', 55, 26, 1 + .3 * f, N.grave, .006);                            // coup grave
    exsOsc(t, 'triangle', 90, 38, .35, N.grave * .35, .004);
    if (!queue) return;
    const L = bombe ? 4 : quoi === 'gl' ? 2.2 : 3;                                    // queue qui roule dans la rue
    exsNz(t + .08, 'lowpass', 360, 1, L, N.queue, 60, .25);
    exsNz(t + .5, 'lowpass', 240, 1, L * .8, N.queue * .7, 50, .4);
    if (bombe) for (let i = 1; i < 4; i++) exsNz(t + i * .33, 'lowpass', 420, 1, 1.4, N.queue * .6, 70, .05); // le chapelet roule
    for (let i = 0; i < 7; i++) exsNz(t + exsH(.35, 1.6), 'bandpass', exsH(1200, 3800), 7, exsH(.02, .06), N.eclats * exsH(.5, 1)); // débris
    if (quoi === 'baril'){ exsNz(t + .9, 'bandpass', 640, 22, .7, N.eclats * 1.5); exsNz(t + 1.2, 'bandpass', 910, 22, .5, N.eclats); } // couvercle qui sonne
    if (quoi === 'auto') for (let i = 0; i < 4; i++) exsNz(t + exsH(.05, .5), 'bandpass', exsH(500, 1100), 14, exsH(.15, .35), N.eclats * 1.4); // tôle
  });
}

/* ---------- Crépitement du feu (nappes du Molotov, feux des barils) ---------- */
function exsFeuCreer(){
  if (EXSN.feu || !exsOk()) return EXSN.feu;
  const c = Snd.ctx, t = c.currentTime, F = { ctx: c, src: [] };
  try {
    F.g = c.createGain(); F.g.gain.value = .0001;
    F.pan = c.createStereoPanner ? c.createStereoPanner() : null;
    if (F.pan){ F.g.connect(F.pan); F.pan.connect(Snd._bus('amb') || Snd.master); } else F.g.connect(Snd._bus('amb') || Snd.master);
    const nz = c.createBufferSource(); nz.buffer = Snd.noise; nz.loop = true;
    const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 520;
    const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 2200; bp.Q.value = .8;
    const g1 = c.createGain(), g2 = c.createGain(); g1.gain.value = 1; g2.gain.value = .25;
    nz.connect(lp); lp.connect(g1); g1.connect(F.g); nz.connect(bp); bp.connect(g2); g2.connect(F.g);
    nz.start(t, exsHasard() * 2); F.src.push(nz);
  } catch (e) { errNote(e); return null; }
  return (EXSN.feu = F);
}
// i : force du feu (0 : rien), x, z : le feu le plus proche, dt : temps de l'image (craquements)
function exSonFeu(i, x, z, dt){
  const F = EXSN.feu;
  if (!(i > 0)){ if (F){ try { F.g.gain.setTargetAtTime(.0001, F.ctx.currentTime, .05); } catch (e) { errNote(e); } } return; }
  if (!exsOk()) return;
  const G = exsFeuCreer(); if (!G) return;
  const R = EXS_REGL.feu, P = exsPlace(x, .5, z), near = 1 / (1 + Math.max(0, P.d - 5) / R.portee), v = R.max * Math.min(1, i) * near;
  try { G.g.gain.setTargetAtTime(v, G.ctx.currentTime, .12); if (G.pan) G.pan.pan.setTargetAtTime(P.pan, G.ctx.currentTime, .1); } catch (e) { errNote(e); }
  if (exsHasard() < R.crepite * Math.min(1, i) * dt){ EXSN.n.craque++;
    exsVoix(0, P.pan, near, P.coupe, .2, t => { exsNz(t, 'bandpass', exsH(1500, 4500), 5, exsH(.01, .035), exsH(.08, .2)); if (exsHasard() < .3) exsNz(t + .02, 'lowpass', 900, 1, .08, .12); }); }
}
// Chaque image (toit en jeu) : le feu le plus fort et le plus proche
function exSonImage(dt){
  if (EXSN.mesure) return;
  let best = 0, bx = 0, bz = 0;
  const pese = (x, z, f) => { const dx = x - camera.position.x, dz = z - camera.position.z, w = f / (1 + Math.sqrt(dx * dx + dz * dz) / 30); if (w > best){ best = w; bx = x; bz = z; } };
  let tot = 0;
  if (typeof pwPuddles === 'object') for (const p of pwPuddles){ if (!p.live) continue; const f = Math.min(1, p.t / 1, (p.dur - p.t) / .2 + .3); tot += f; pese(p.x, p.z, f); }
  if (typeof RUE === 'object' && RUE.fires) for (const f of RUE.fires){ if (!f.g.visible || !(f.t > 0)) continue; const k = .6 * Math.min(1, f.t / 1.2); tot += k; pese(f.g.position.x, f.g.position.z, k); }
  exSonFeu(Math.min(1.3, tot), bx, bz, dt);
}

/* ---------- Mesures hors ligne (avec ctsRendre de js/76-centrale-sons.js) ---------- */
function exsRendre(duree, jouer, etapes){
  if (typeof ctsRendre !== 'function') return Promise.resolve(null);
  const s0 = { voix: EXSN.voix, feu: EXSN.feu, dernier: EXSN.dernier }, st = state, ja = Jeu.actif;
  const dans = f => () => { const sv = state; state = 'playing'; Jeu.actif = () => null; try { f(); } finally { state = sv; Jeu.actif = ja; } };
  EXSN.voix = []; EXSN.feu = null; EXSN.dernier = -9; EXSN.mesure = true;
  const cp = camera.position.clone(), cr = camera.rotation.clone();
  camera.position.set(0, 9, -8.4); camera.rotation.set(-.16, 0, 0); camera.updateMatrixWorld();
  const fin = () => { EXSN.voix = s0.voix; EXSN.feu = s0.feu; EXSN.dernier = s0.dernier; EXSN.mesure = false; state = st; camera.position.copy(cp); camera.rotation.copy(cr); camera.updateMatrixWorld(); };
  return ctsRendre(duree, dans(jouer), (etapes || []).map(e => [e[0], dans(e[1])])).then(r => { fin(); return r; }, e => { fin(); throw e; });
}
function exsListe(){
  const L = [], m = (nom, groupe, duree, jouer, etapes) => L.push({ nom, groupe, duree, jouer, etapes });
  const boom = (quoi, z, p) => () => { Snd.boom(p); exSon(quoi, 0, 0, z, 4); };
  m('Grenade à 15 m : Snd.boom seul (avant)', 'Avant', 4.5, () => Snd.boom(.8));
  m('Grenade à 15 m : avec grave et queue', 'Grenade', 4.5, boom('grenade', -23, .8));
  m('Grenade à 60 m : avec grave et queue', 'Grenade', 4.5, boom('grenade', -68, .8));
  m('Baril à 25 m (avant)', 'Avant', 4.5, () => Snd.boom(1.1));
  m('Baril à 25 m', 'Baril', 4.5, boom('baril', -33, 1.1));
  m('Roquette à 30 m', 'Roquette', 4.5, boom('roquette', -38, 1));
  m('Auto abattue à 25 m', 'Auto', 4.5, () => { exSon('auto', 4, 6, -33, 3); });
  m('Cocktail Molotov à 20 m', 'Molotov', 3, () => exSon('molotov', 0, 0, -28, 3.6));
  m('Feu d’une nappe à 15 m (3 s)', 'Molotov', 3.5, () => { for (let i = 0; i < 90; i++) exSonFeu(1, 0, -23, 1 / 30); });
  m('Frappe : annonce', 'Frappe', 1.5, () => exSon('annonce', 0, 0, -40, 4));
  m('Frappe : passage de l’avion', 'Frappe', 4.5, () => exSon('avion', 0, 30, -20, 1));
  m('Canon électromagnétique : impact à 30 m', 'Rail', 1.5, () => exSon('rail', 0, 0, -38, 1));
  m('Toit : fusil d’assaut', 'Toit', 2.5, () => Snd.shot('rifle'));
  return L;
}
function exsMesurer(){
  const L = exsListe(), res = [];
  let p = Promise.resolve();
  L.forEach(x => { p = p.then(() => exsRendre(x.duree, x.jouer, x.etapes).then(r => { if (r) res.push(Object.assign({ nom: x.nom, groupe: x.groupe }, r)); })); });
  // Pire cas : la frappe aérienne entière (annonce, avion, 7 bombes à 0,11 s avec Snd.boom), une nappe qui brûle près, un baril
  // qui saute dans le chapelet, et le fusil d'assaut qui tire 8 coups/s pendant tout ce temps ; puis la même chose avant
  const pire = avec => {
    const e = []; for (let k = 0; k < 40; k++) e.push([.52 + k * .125, () => Snd.shot('rifle')]);
    if (avec){ e.push([.52, () => exSon('annonce', 0, 0, -30, 4)], [1.2, () => exSon('avion', 0, 30, -10, 1)]); for (let k = 0; k < 60; k++) e.push([.52 + k / 15, () => exSonFeu(1, 2, -16, 1 / 15)]); }
    for (let i = 0; i < 7; i++) e.push([2.7 + i * .11, () => { Snd.boom(1); if (avec) exSon('bombe', 0, 0, -18 - i * 4, i); }]);
    e.push([2.9, () => { Snd.boom(1.1); if (avec) exSon('baril', 3, .6, -24, 6); }]);
    // Le rendu hors ligne ne prend qu'une étape par bloc de 128 échantillons : les étapes du même bloc sont réunies
    const bl = {}; e.forEach(x => { const k = Math.round(x[0] * 44100 / 128); (bl[k] = bl[k] || []).push(x[1]); });
    return exsRendre(6.5, () => {}, Object.keys(bl).map(k => [k * 128 / 44100, () => bl[k].forEach(f => f())]));
  };
  return p.then(() => pire(false)).then(a => pire(true).then(b => ({ sons: res, pireAvant: a, pire: b })));
}

// Accès pour les tests automatiques et les mesures
window.__explosionsSons = { EXSN, EXS_REGL, exsHasard, exSon, exSonFeu, exSonImage, exSonCouper, exsPlace, exsRendre, mesurer: exsMesurer };
