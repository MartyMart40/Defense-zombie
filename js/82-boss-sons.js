'use strict';
/* ================= Mise en scène des boss du toit : les sons (dossier 128) ================= */
// Seulement sonore. Appelé par js/82-boss-scene.js (bssJouer) et par Jeu.on('image') pour la nappe. Sur le toit seulement
// (aucun mode Jeu actif), rien sans audio ou son coupé (Snd.on faux, dt_sound), coupé net en pause.
// Tout passe par la chaîne de Snd (js/01-son.js) sans la modifier : bus 'monde' et budget de voix (Snd._voix) pour les sons
// courts, bus 'amb' pour la nappe (nœuds faits une fois par boss, hors du budget, comme le fond de js/76-centrale-sons.js).
// Hasard propre (bssHasard) : ni ce fichier ni le bruit qu'il joue ne piochent dans Math.random.
//   cri    : à l'arrivée, un par boss (râle et pelle qui racle, rugissement qui crépite, hurlement, béton qui grince,
//            corne de brume, deux cornes et un rugissement) ; plus court dès le 2e boss d'une partie.
//   pas    : coup sourd sous les pas du Titan et du Léviathan (les autres gardent les pas de js/19-boss.js).
//   palier : beuglement de douleur sous 50 % et sous 25 % de vie.
//   rale   : le cri de la mort, quand il commence à tituber.
//   chute  : le corps qui tombe (boum grave, gravats), avec une touche propre au boss (cloche, sifflement des braises,
//            béton qui s'effrite, corne qui s'éteint).
//   nappe  : grondement grave qui monte à mesure que le boss approche de la barricade (bus ambiance), arrêté à sa mort.
// Mesures hors ligne : window.__bossSons.mesurer() (même méthode que js/76-centrale-sons.js) ; table dans docs/conception.md.

const BSS_REGL = {
  niv: { cri:.75, pas:.4, palier:.7, rale:.7, chute:.65 },   // gain de chaque voix (réglé par mesure hors ligne)
  nappe: { min:.02, max:.12, monte:.6, f:[48, 48.6], coupe:190 }, // gain de la nappe (loin, à la barricade), temps de montée (s), fréquences (Hz), passe-bas
  pan: .7
};
let bssGr = 9001;
const bssHasard = () => { bssGr = (bssGr * 16807) % 2147483647; return (bssGr - 1) / 2147483646; };
const bssH = (a, b) => a + (b - a) * bssHasard();
const BSS = { voix:[], nappe:null, mesure:false, n:{ cris:0, pas:0, paliers:0, rales:0, chutes:0, nappes:0 } };
const bssOk = () => typeof Snd === 'object' && !!Snd._ok && Snd._ok() && !!Snd.noise;

/* ---------- Outils (même manière que js/76-centrale-sons.js, avec le hasard propre) ---------- */
function bssNz(t, type, freq, q, dur, vol, sweepTo, atk){
  const c = Snd.ctx, s = c.createBufferSource(); s.buffer = Snd.noise;
  const f = c.createBiquadFilter(); f.type = type; f.frequency.setValueAtTime(freq, t); if (q) f.Q.value = q;
  if (sweepTo) f.frequency.exponentialRampToValueAtTime(sweepTo, t + dur);
  const g = c.createGain();
  if (atk){ g.gain.setValueAtTime(.0001, t); g.gain.linearRampToValueAtTime(vol, t + atk); } else g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(.0005, t + dur);
  s.connect(f); f.connect(g); g.connect(Snd._out); s.start(t, bssHasard() * Math.max(0, s.buffer.duration - dur - .1)); s.stop(t + dur + .05);
  Snd._fin(t + dur + .05);
}
// Oscillateur qui monte puis s'éteint, passe-bas facultatif qui glisse
function bssNappe(t, type, f0, f1, dur, vol, atk, fc0, fc1, vib){
  const c = Snd.ctx, o = c.createOscillator(), g = c.createGain(); o.type = type;
  o.frequency.setValueAtTime(f0, t); if (f1) o.frequency.exponentialRampToValueAtTime(f1, t + dur);
  if (vib){ const l = c.createOscillator(), lg = c.createGain(); l.frequency.value = vib[0]; lg.gain.value = vib[1]; l.connect(lg); lg.connect(o.frequency); l.start(t); l.stop(t + dur + .05); }
  g.gain.setValueAtTime(.0001, t); g.gain.linearRampToValueAtTime(vol, t + (atk || .02)); g.gain.exponentialRampToValueAtTime(.0005, t + dur);
  if (fc0){ const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.setValueAtTime(fc0, t); if (fc1) f.frequency.exponentialRampToValueAtTime(fc1, t + dur); o.connect(f); f.connect(g); }
  else o.connect(g);
  g.connect(Snd._out); o.start(t); o.stop(t + dur + .05); Snd._fin(t + dur + .05);
}
// Une voix du budget de Snd, placée (pan), à un niveau, gardée pour la couper net en pause
function bssVoix(pri, pan, niv, f){
  if (!bssOk()) return false;
  let v = null;
  const r = Snd._voix(Snd._bus('monde') || Snd.master, pri, () => {
    v = Snd._vg;
    const c = Snd.ctx, o = Snd._out;
    let out = o;
    if (pan && c.createStereoPanner){ const p = c.createStereoPanner(); p.pan.value = clamp(pan, -1, 1); p.connect(out); out = p; }
    if (niv != null && niv !== 1){ const g = c.createGain(); g.gain.value = niv; g.connect(out); out = g; }
    Snd._out = out;
    try { f(c.currentTime, c); } finally { Snd._out = o; }
  });
  if (r && v){ BSS.voix = BSS.voix.filter(x => Snd.voix.indexOf(x) >= 0); BSS.voix.push(v); }
  return r;
}
function bssCouper(){
  if (typeof Snd !== 'object' || !Snd.ctx){ BSS.voix = []; return; }
  BSS.voix.forEach(v => { const i = Snd.voix.indexOf(v); if (i >= 0){ Snd._couper(v); Snd.voix.splice(i, 1); } });
  BSS.voix = [];
}
const bssPan = x => clamp((x || 0) / 14, -1, 1) * BSS_REGL.pan;

/* ---------- Les sons ---------- */
function bssCri(id, court, t){
  const L = court ? .65 : 1;
  if (id === 'fossoyeur'){
    bssNappe(t, 'sawtooth', 95, 60, 1.7 * L, .32, .15, 700, 260);
    bssNz(t, 'lowpass', 520, 1, 1.4 * L, .2, 200, .2);
    bssNz(t + .9 * L, 'bandpass', 2600, 9, .45, .14, 1500, .05);            // la pelle qui racle
    if (!court) bssNz(t + 1.45, 'bandpass', 2300, 9, .3, .1, 1700, .04);
  } else if (id === 'colosse' || id === 'liquidateur' || id === 'boss'){
    bssNappe(t, 'sawtooth', 125, 68, 1.8 * L, .32, .2, 950, 320);
    bssNz(t, 'lowpass', 820, 1, 1.6 * L, .22, 260, .25);
    if (id === 'colosse') for (let i = 0; i < (court ? 6 : 12); i++) bssNz(t + bssH(.1, 1.5 * L), 'bandpass', bssH(2600, 5600), 6, bssH(.01, .03), .12); // braises qui crépitent
    if (id === 'liquidateur') bssNappe(t, 'square', 100, 98, 1.2 * L, .05, .1, 600);
  } else if (id === 'ogre'){
    bssNappe(t, 'triangle', 170, 430, .9 * L, .3, .25, 0, 0, [5.5, 9]);     // hurlement qui monte
    bssNappe(t + .8 * L, 'triangle', 430, 230, 1.4 * L, .26, .05, 0, 0, [5.5, 12]);
    bssNappe(t, 'sawtooth', 85, 115, 2 * L, .1, .3, 500);
    bssNz(t, 'lowpass', 900, 1, 1.8 * L, .08, 400, .3);
  } else if (id === 'titan'){
    bssNz(t, 'lowpass', 230, 2, 2.2 * L, .42, 120, .35);                     // béton qui grince
    bssNz(t + .1, 'bandpass', 700, 3, 1.6 * L, .1, 380, .3);
    bssNappe(t, 'square', 44, 34, 2 * L, .14, .3, 260);
    bssNappe(t + .3, 'sawtooth', 82, 55, 1.6 * L, .2, .2, 600, 240);
  } else if (id === 'docker'){
    bssNappe(t, 'sawtooth', 110, 108, 2.2 * L, .16, .25, 650, 480);          // corne de brume
    bssNappe(t, 'sawtooth', 111.3, 109, 2.2 * L, .16, .25, 650, 480);
    bssNappe(t, 'sine', 55, 54, 2.2 * L, .12, .3);
  } else if (id === 'leviathan'){
    bssNappe(t, 'sawtooth', 73, 72, 2.4 * L, .18, .3, 520, 380);              // deux cornes
    bssNappe(t, 'sawtooth', 74.1, 72.6, 2.4 * L, .18, .3, 520, 380);
    if (!court){ bssNappe(t + 1.6, 'sawtooth', 65, 64, 2.2, .16, .3, 480, 360); bssNappe(t + 1.6, 'sawtooth', 66, 64.8, 2.2, .16, .3, 480, 360); }
    bssNappe(t + .4, 'sawtooth', 100, 55, 1.8 * L, .2, .2, 700, 240);
    bssNz(t + .4, 'lowpass', 600, 1, 1.6 * L, .16, 200, .25);
  }
}
function bssChute(id, t){
  bssNz(t, 'lowpass', 420, 1, 1.7, .55, 70);                                 // le corps qui tombe
  bssNappe(t, 'sine', 56, 27, 1.5, .5, .01);
  for (let i = 0; i < 6; i++) bssNz(t + .05 + bssH(0, .6), 'bandpass', bssH(800, 2400), 3, bssH(.04, .12), .1); // gravats
  if (id === 'fossoyeur') [196, 233, 294, 392].forEach((f, i) => bssNappe(t + .5, 'sine', f, f * .995, 3.2, .06 / (1 + i * .3), .01)); // une cloche au loin
  else if (id === 'colosse') bssNz(t + .2, 'highpass', 3200, 0, 1.6, .07, 0, .1);                        // braises qui sifflent
  else if (id === 'titan') for (let i = 0; i < 10; i++) bssNz(t + .1 + bssH(0, 1.3), 'lowpass', bssH(500, 1100), 2, bssH(.08, .2), .14); // béton qui s'effrite
  else if (id === 'docker' || id === 'leviathan') bssNappe(t + .3, 'sawtooth', id === 'docker' ? 110 : 73, id === 'docker' ? 70 : 46, 1.8, .11, .1, 480, 200); // la corne qui s'éteint
  else if (id === 'ogre') bssNz(t + .3, 'lowpass', 300, 1, 1.4, .12, 90, .2);
}
// nom : 'cri', 'pas', 'palier', 'rale', 'chute' ; P : profil du boss (js/82-boss-scene.js) ; k : force (0 à 1) ou palier ; x : position
function bssJouer(nom, P, k, x){
  if (!bssOk() || state !== 'playing' || (typeof Jeu === 'object' && Jeu.actif())) return false;
  const N = BSS_REGL.niv, id = (P && P.id) || 'boss', pan = bssPan(x);
  if (nom === 'cri'){ BSS.n.cris++; return bssVoix(0, pan, N.cri, t => bssCri(id, k < 1, t + .15)); }
  if (nom === 'pas'){ BSS.n.pas++; const v = .35 + .65 * clamp(k, 0, 1);
    return bssVoix(0, pan, N.pas * v, t => { bssNappe(t, 'sine', 50, 30, .5, .4, .005); bssNz(t, 'lowpass', 190, 1, .35, .25, 80); if (id === 'titan') bssNz(t + .03, 'bandpass', 1500, 3, .15, .06); }); }
  if (nom === 'palier'){ BSS.n.paliers++;
    return bssVoix(0, pan, N.palier, t => { const f = k > 1 ? 170 : 140; bssNappe(t, 'sawtooth', f, f * .62, .7, .26, .05, 900, 300); bssNz(t, 'lowpass', 700, 1, .6, .1, 250, .05); }); }
  if (nom === 'rale'){ BSS.n.rales++;
    return bssVoix(0, pan, N.rale, t => {
      bssNappe(t, 'sawtooth', 115, 48, 1.5, .3, .08, 700, 180);
      if (id === 'ogre') bssNappe(t + .1, 'triangle', 390, 120, 1.7, .22, .1, 0, 0, [6, 14]);
      else bssNz(t, 'lowpass', 600, 1, 1.2, .12, 180, .1);
    }); }
  if (nom === 'chute'){ BSS.n.chutes++; return bssVoix(0, pan, N.chute * (.6 + .4 * clamp(k, 0, 1)), t => bssChute(id, t)); }
  return false;
}

/* ---------- Nappe : grondement qui monte quand le boss approche de la barricade ---------- */
function bssNappeCreer(){
  if (BSS.nappe || !bssOk()) return BSS.nappe;
  const c = Snd.ctx, t = c.currentTime, R = BSS_REGL.nappe, N = { ctx:c, src:[] };
  try {
    N.g = c.createGain(); N.g.gain.value = .0001; N.g.connect(Snd._bus('amb') || Snd.master);
    const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = R.coupe; lp.connect(N.g);
    R.f.forEach(f => { const o = c.createOscillator(), g = c.createGain(); o.type = 'sawtooth'; o.frequency.value = f; g.gain.value = .5; o.connect(g); g.connect(lp); o.start(t); N.src.push(o); });
    const nz = c.createBufferSource(); nz.buffer = Snd.noise; nz.loop = true;
    const nf = c.createBiquadFilter(); nf.type = 'lowpass'; nf.frequency.value = 110; const ng = c.createGain(); ng.gain.value = 1.2;
    nz.connect(nf); nf.connect(ng); ng.connect(N.g); nz.start(t, bssHasard() * 2); N.src.push(nz);
    // Battement lent (le pas du géant dans le grave)
    const lfo = c.createOscillator(), lg = c.createGain(); lfo.frequency.value = .7; lg.gain.value = .25; lfo.connect(lg); lg.connect(ng.gain); lfo.start(t); N.src.push(lfo);
  } catch (e) { errNote(e); return null; }
  BSS.n.nappes++;
  return (BSS.nappe = N);
}
function bssNappeStop(){
  const N = BSS.nappe; BSS.nappe = null; if (!N) return;
  try {
    const t = N.ctx.currentTime;
    N.g.gain.cancelScheduledValues(t); N.g.gain.setValueAtTime(N.g.gain.value, t); N.g.gain.setTargetAtTime(.0001, t, .08);
    N.src.forEach(s => { try { s.stop(t + .5); } catch (e) { errNote(e); } });
    setTimeout(() => { try { N.g.disconnect(); } catch (e) { errNote(e); } }, 800);
  } catch (e) { errNote(e); }
}
// p : de 0 (le boss vient d'arriver) à 1 (à la barricade)
function bssNappeRegler(p){
  const N = BSS.nappe; if (!N) return;
  const R = BSS_REGL.nappe;
  try { N.g.gain.setTargetAtTime(R.min + (R.max - R.min) * Math.pow(clamp(p, 0, 1), 1.5), N.ctx.currentTime, R.monte); } catch (e) { errNote(e); }
}
function bssImage(){
  if (BSS.mesure) return; // une mesure hors ligne joue : on n'y touche pas
  const toit = typeof Jeu === 'object' && !Jeu.actif() && state === 'playing' && typeof BS_REGL === 'object' && BS_REGL.on;
  if (!toit){ if (BSS.nappe) bssNappeStop(); if (state !== 'playing' && BSS.voix.length) bssCouper(); return; }
  let z = null;
  for (let i = 0; i < zombies.length; i++){ const o = zombies[i]; if (o.type === 'boss' && !o.dead && o.bs && !o.bs.skip){ z = o; break; } }
  if (!z || !bssOk()){ if (BSS.nappe) bssNappeStop(); return; }
  if (!BSS.nappe) bssNappeCreer();
  const z0 = typeof BOSS_START_Z === 'number' ? BOSS_START_Z : -70, z1 = z.stopZ != null ? z.stopZ : -17;
  bssNappeRegler((z.g.position.z - z0) / Math.max(1, z1 - z0));
}
Jeu.on('image', () => { const f = () => { try { bssImage(); } catch (e) { errNote(e); } }; if (typeof bsSonde === 'function') bsSonde(f); else f(); });

/* ---------- Mesures hors ligne (avec ctsRendre de js/76-centrale-sons.js) ---------- */
function bssRendre(duree, jouer, etapes){
  if (typeof ctsRendre !== 'function') return Promise.resolve(null);
  const s0 = { voix:BSS.voix, nappe:BSS.nappe }, st = state, ja = Jeu.actif;
  const dans = f => () => { const sv = state; state = 'playing'; Jeu.actif = () => null; try { f(); } finally { state = sv; Jeu.actif = ja; } };
  BSS.voix = []; BSS.nappe = null; BSS.mesure = true;
  const fin = () => { BSS.voix = s0.voix; BSS.nappe = s0.nappe; BSS.mesure = false; state = st; };
  return ctsRendre(duree, dans(jouer), (etapes || []).map(e => [e[0], dans(e[1])])).then(r => { fin(); return r; }, e => { fin(); throw e; });
}
function bssListe(){
  const L = [], P = BS_REGL.P, m = (nom, groupe, duree, jouer, etapes) => L.push({ nom, groupe, duree, jouer, etapes });
  ['village', 'ville', 'banlieue', 'centre', 'port', 'port10'].forEach(k => {
    const p = P[k], n = BOSS_VAR[k] ? BOSS_VAR[k].name : p.id;
    m(n + ' : cri d’arrivée', 'Cri', 5, () => bssJouer('cri', p, 1, 0));
    m(n + ' : chute', 'Mort', 4.5, () => bssJouer('chute', p, 1, 0));
  });
  m('Cri abrégé (2e boss de la partie)', 'Cri', 4, () => bssJouer('cri', P.ville, .7, 0));
  m('Pas du Titan (tout près)', 'Pas', 1.5, () => bssJouer('pas', P.centre, 1, 0));
  m('Palier de vie (sous 25 %)', 'Moment', 1.5, () => bssJouer('palier', P.ville, 2, 0));
  m('Râle de la mort', 'Mort', 2.5, () => bssJouer('rale', P.ville, 1, 0));
  m('Râle de la mort de l’Ogre', 'Mort', 2.5, () => bssJouer('rale', P.banlieue, 1, 0));
  m('Nappe, boss loin', 'Nappe', 5, () => { bssNappeCreer(); bssNappeRegler(0); });
  m('Nappe, boss à la barricade', 'Nappe', 5, () => { bssNappeCreer(); bssNappeRegler(1); });
  m('Toit : fusil d’assaut', 'Toit', 2.5, () => Snd.shot('rifle'));
  m('Toit : fusil à pompe', 'Toit', 2.5, () => Snd.shot('shotgun'));
  return L;
}
function bssMesurer(){
  const L = bssListe(), res = [];
  let p = Promise.resolve();
  L.forEach(x => { p = p.then(() => bssRendre(x.duree, x.jouer, x.etapes).then(r => { if (r) res.push(Object.assign({ nom:x.nom, groupe:x.groupe }, r)); })); });
  // Pire cas : le Titan à la barricade (nappe au plus fort), un pas, sa chute, et le fusil d'assaut qui tire 8 coups/s
  const etapes = []; for (let k = 0; k < 32; k++) etapes.push([.6 + k * .125, () => Snd.shot('rifle')]);
  etapes.push([1, () => bssJouer('pas', BS_REGL.P.centre, 1, 0)], [2, () => bssJouer('rale', BS_REGL.P.centre, 1, 0)], [3, () => bssJouer('chute', BS_REGL.P.centre, 1, 0)]);
  return p.then(() => bssRendre(5.5, () => { bssNappeCreer(); bssNappeRegler(1); }, etapes)).then(r => ({ sons:res, pire:r }));
}

// Accès pour les tests automatiques et les mesures
window.__bossSons = { BSS, BSS_REGL, bssHasard, bssJouer, bssImage, bssNappeCreer, bssNappeStop, bssNappeRegler, bssCouper, bssRendre, mesurer:bssMesurer };
