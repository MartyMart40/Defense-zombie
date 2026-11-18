'use strict';
/* ================= La Centrale : ses sons (dossier 123) ================= */
// Seulement sonore : aucun chiffre de jeu, aucun visuel ne change. Rien ne joue (aucun nœud audio créé) sans audio, son coupé
// (Snd.on faux, dt_sound), hors de la Centrale (ctrIci, js/71-centrale.js) ou quand un mode (robot, RTS) est actif.
// Tout passe par la chaîne de Snd (js/01-son.js) sans la modifier : bus Snd._bus('amb') pour le fond, 'monde' pour le reste,
// budget de voix de Snd (Snd._voix, VOIX_MAX) pour chaque son court. Le fond, le compteur Geiger et le grésillement de la
// flaque sont des nœuds faits une fois (comme le fond du robot, js/70-robot-sons.js), hors du budget, arrêtés net en pause.
// Hasard propre (ctsHasard) : ni ce fichier ni le bruit qu'il joue ne piochent dans Math.random (le simulateur ne change pas).
//
// 1. Fond du lieu (pendant la vague et à la boutique ; arrêté en pause, à la fin de la partie et en quittant la ville) :
//    bourdonnement des transformateurs (50 Hz et harmoniques, 100 Hz doublé à 100,8 Hz pour un léger battement, une pointe
//    de grésillement autour de 400 Hz pour les petits haut-parleurs), souffle lointain des tours de refroidissement qui va et
//    vient ; de temps en temps (toutes les 7 à 18 s) un claquement d'arc électrique à gauche ou à droite.
//    Pendant le combat du Cœur, le bourdonnement monte (les transformateurs le nourrissent) et baisse d'un cran à chaque
//    transformateur détruit ; presque éteint quand le Cœur est mort.
// 2. L'irradié : compteur Geiger qui crépite plus vite quand un irradié approche de la barricade (le plus proche compte, les
//    autres ajoutent un peu), placé de son côté ; à sa mort, la flaque se forme (éclaboussure, chuintement, petit « bloup ») ;
//    tant qu'une flaque ronge la barricade, un grésillement acide qui bouillonne (signal de danger, bien audible).
// 3. Le Cœur (boss de la vague 12) : arrivée (montée électrique et coup grave), pulsation grave tant qu'il vit (de 1,3 s à
//    0,45 s entre deux battements quand sa vie baisse), « tic-zzt » net quand un tir est absorbé par le bouclier (au plus un
//    toutes les 0,11 s), transformateur détruit (arc, explosion, sifflement qui tombe), bouclier qui tombe (décharge, verre
//    qui casse, deux notes claires), mort (grande extinction).
// 4. Gyrophares : une alarme courte et lointaine (deux montées) au début d'une vague de boss seulement (vagues 5, 10 et 12).
// Les sons d'emprunt de js/71-centrale.js (sirène toutes les 22 à 34 s, transformateur détruit) se taisent quand ce fichier
// est là (ctsEmprunt) ; le tirage de leur minuterie reste, pour que le hasard du jeu ne bouge pas.
// Mesures hors ligne : window.__centraleSons.mesurer() ; table dans docs/conception.md (« Sons de la Centrale »).

const CTS_REGL = {
  fond:   { hum:.02, buzz:.014, souffle:.03, monte:.25, chute:.25 },          // gains du fond (bus amb, 0,6) ; monte/chute : temps (s)
  coeurHum: { base:.4, parTransfo:.3, mort:.25 },                               // bourdonnement pendant le Cœur : base + parTransfo × vivants
  arc:    { min:7, max:18, vol:.35, pan:[.35, .8] },                            // claquement d'arc de temps en temps (s, gain, côtés)
  geiger: { portee:55, voitZ:-70, min:1.5, max:26, plus:.12, vol:.6, pan:.6 },  // m, z où il est vu, coups par seconde, gain
  flaque: { vol:.3, bulle:.1, neeVol:.6, ronge:1.35 },                           // grésillement tant qu'une flaque ronge ; flaque qui se forme
  coeur:  { lent:1.3, vite:.45, absorbeGap:.11 },                               // pulsation (s entre deux battements), tirs absorbés
  // Niveau de chaque son (gain de la voix), réglé par mesures hors ligne (docs/conception.md)
  niv: { arc:1, nee:1, arrive:.7, pouls:1, absorbe:1.2, transfo:.85, tombe:.75, mort:.7, sirene:1.6 }
};
// Hasard propre aux sons (générateur de Park et Miller) : jamais Math.random
let ctsGr = 1237;
const ctsHasard = () => { ctsGr = (ctsGr * 16807) % 2147483647; return (ctsGr - 1) / 2147483646; };
const ctsH = (a, b) => a + (b - a) * ctsHasard();
const CTS = {
  fond:null, gei:null, gri:null, voix:[], buf:null, arcT:8, geiT:0, poulsT:0, absT:-9, hum:1,
  p:{ ici:false, st:'', coeur:null, vivants:0, detruits:0, bouclier:0, mort:false, wave:0, S:null, fl:[] },
  n:{ fonds:0, arcs:0, clics:0, nees:0, grisCrees:0, arrivees:0, pouls:0, absorbes:0, transfos:0, tombes:0, morts:0, sirenes:0 }
};
const ctsV = new THREE.Vector3();
const ctsOk = () => typeof Snd === 'object' && !!Snd._ok && Snd._ok() && !!Snd.noise;
// Sons d'emprunt de js/71-centrale.js : ils ne jouent que si ce fichier est absent
function ctsEmprunt(){ return false; }

/* ---------- Outils ---------- */
// Tampons propres (clic du Geiger, crépitement de la flaque), faits une fois par contexte audio, avec le hasard propre
function ctsTampons(){
  const c = Snd.ctx;
  if (CTS.buf && CTS.buf.ctx === c) return CTS.buf;
  const sr = c.sampleRate, B = { ctx:c };
  const n1 = Math.round(sr * .008), clic = c.createBuffer(1, n1, sr), d1 = clic.getChannelData(0);
  for (let i = 0; i < n1; i++){ const e = Math.exp(-i / (sr * .0009)); d1[i] = ((ctsHasard() * 2 - 1) * .8 + Math.sin(2 * Math.PI * 3100 * i / sr) * .5) * e; }
  B.clic = clic;
  // Crépitement : petites impulsions éparses et courtes bouffées de bruit (1,5 s, bouclé)
  const n2 = Math.round(sr * 1.5), cr = c.createBuffer(1, n2, sr), d2 = cr.getChannelData(0);
  for (let i = 0; i < n2; i++) d2[i] = (ctsHasard() * 2 - 1) * .12;
  for (let k = 0; k < 520; k++){
    const i0 = Math.floor(ctsHasard() * (n2 - 400)), a = .3 + ctsHasard() * .7, L = 20 + Math.floor(ctsHasard() * 260);
    for (let i = 0; i < L; i++) d2[i0 + i] += (ctsHasard() * 2 - 1) * a * Math.exp(-i / (L * .3));
  }
  B.crepite = cr;
  return (CTS.buf = B);
}
// Bruit filtré dans la voix en cours (même chose que Snd._nz, mais le départ dans le tampon vient du hasard propre)
function ctsNz(t, type, freq, q, dur, vol, sweepTo, atk, buf){
  const c = Snd.ctx, s = c.createBufferSource(); s.buffer = buf || Snd.noise;
  const f = c.createBiquadFilter(); f.type = type; f.frequency.setValueAtTime(freq, t); if (q) f.Q.value = q;
  if (sweepTo) f.frequency.exponentialRampToValueAtTime(sweepTo, t + dur);
  const g = c.createGain();
  if (atk){ g.gain.setValueAtTime(.0001, t); g.gain.linearRampToValueAtTime(vol, t + atk); } else g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(.0005, t + dur);
  s.connect(f); f.connect(g); g.connect(Snd._out); s.start(t, ctsHasard() * Math.max(0, s.buffer.duration - dur - .1)); s.stop(t + dur + .05);
  Snd._fin(t + dur + .05);
}
const ctsOsc = (t, type, f0, f1, dur, vol) => Snd._osc(t, type, f0, f1, dur, vol);
// Nappe : oscillateur qui monte puis descend (atk), filtre passe-bas facultatif qui glisse de fc0 à fc1
function ctsNappe(t, type, f0, f1, dur, vol, atk, fc0, fc1){
  const c = Snd.ctx, o = c.createOscillator(), g = c.createGain(); o.type = type;
  o.frequency.setValueAtTime(f0, t); if (f1) o.frequency.exponentialRampToValueAtTime(f1, t + dur);
  g.gain.setValueAtTime(.0001, t); g.gain.linearRampToValueAtTime(vol, t + (atk || .02)); g.gain.exponentialRampToValueAtTime(.0005, t + dur);
  if (fc0){ const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.setValueAtTime(fc0, t); if (fc1) f.frequency.exponentialRampToValueAtTime(fc1, t + dur); o.connect(f); f.connect(g); }
  else o.connect(g);
  g.connect(Snd._out); o.start(t); o.stop(t + dur + .05); Snd._fin(t + dur + .05);
}
// Place d'un point du monde : panoramique (-1 à 1) et volume (plus faible de loin), comme brSpot (js/37-bruitages.js)
function ctsPlace(x, y, z){
  if (typeof camera === 'undefined') return { pan:0, vol:1 };
  camera.updateMatrixWorld();
  ctsV.set(x, y, z).applyMatrix4(camera.matrixWorldInverse);
  const h = Math.hypot(ctsV.x, ctsV.z) || 1, pan = clamp(ctsV.x / h, -1, 1) * .85;
  const d = camera.position.distanceTo(ctsV.set(x, y, z));
  return { pan, vol:clamp(1.15 - d / 110, .35, 1) };
}
// Une voix du budget de Snd, placée (pan), à un niveau (niv), gardée pour la couper net en pause
function ctsVoix(bus, pri, pan, niv, f){
  if (!ctsOk()) return false;
  let v = null;
  const r = Snd._voix(Snd._bus(bus) || Snd.master, pri, () => {
    v = Snd._vg;
    const c = Snd.ctx, o = Snd._out;
    let out = o;
    if (pan && c.createStereoPanner){ const p = c.createStereoPanner(); p.pan.value = clamp(pan, -1, 1); p.connect(out); out = p; }
    if (niv != null && niv !== 1){ const g = c.createGain(); g.gain.value = niv; g.connect(out); out = g; }
    Snd._out = out;
    try { f(c.currentTime, c); } finally { Snd._out = o; }
  });
  if (r && v){ CTS.voix = CTS.voix.filter(x => Snd.voix.indexOf(x) >= 0); CTS.voix.push(v); }
  return r;
}
function ctsCouper(){
  if (typeof Snd !== 'object' || !Snd.ctx){ CTS.voix = []; return; }
  CTS.voix.forEach(v => { const i = Snd.voix.indexOf(v); if (i >= 0){ Snd._couper(v); Snd.voix.splice(i, 1); } });
  CTS.voix = [];
}
// Arrêt d'un groupe de nœuds faits une fois : gain à zéro en 25 ms, sources arrêtées, débranché ensuite
function ctsArret(N){
  if (!N) return;
  try {
    const t = N.ctx.currentTime;
    N.g.gain.cancelScheduledValues(t); N.g.gain.setValueAtTime(N.g.gain.value, t); N.g.gain.setTargetAtTime(.0001, t, .025);
    N.src.forEach(s => { try { s.stop(t + .15); } catch (e) { errNote(e); } });
    setTimeout(() => { try { N.g.disconnect(); } catch (e) { errNote(e); } }, 400);
  } catch (e) { errNote(e); }
}
const ctsSrc = (N, s) => { N.src.push(s); return s; };

/* ---------- 1. Fond du lieu ---------- */
function ctsFondCreer(){
  if (CTS.fond || !ctsOk()) return CTS.fond;
  const c = Snd.ctx, t = c.currentTime, R = CTS_REGL.fond, F = { ctx:c, src:[] };
  try {
    F.g = c.createGain(); F.g.gain.value = .0001; F.g.connect(Snd._bus('amb') || Snd.master);
    // Bourdonnement : 50, 100 (doublé à 100,8 pour le battement), 150 Hz ; grésillement de la tôle autour de 400 Hz
    F.hum = c.createGain(); F.hum.gain.value = R.hum; F.hum.connect(F.g);
    [[50, .55], [100, 1], [100.8, .5], [150, .3], [200, .12]].forEach(([f, v]) => {
      const o = ctsSrc(F, c.createOscillator()), g = c.createGain(); o.type = 'sine'; o.frequency.value = f; g.gain.value = v; o.connect(g); g.connect(F.hum); o.start(t);
    });
    const bz = ctsSrc(F, c.createOscillator()), bf = c.createBiquadFilter(), bg = c.createGain();
    bz.type = 'sawtooth'; bz.frequency.value = 100; bf.type = 'bandpass'; bf.frequency.value = 420; bf.Q.value = 1.6; bg.gain.value = R.buzz / R.hum;
    bz.connect(bf); bf.connect(bg); bg.connect(F.hum); bz.start(t);
    // Souffle des tours de refroidissement : bruit sourd qui va et vient (période de 14 s)
    const nz = ctsSrc(F, c.createBufferSource()); nz.buffer = Snd.noise; nz.loop = true;
    const lp = c.createBiquadFilter(), hp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 520; hp.type = 'highpass'; hp.frequency.value = 90;
    F.souf = c.createGain(); F.souf.gain.value = R.souffle;
    const lfo = ctsSrc(F, c.createOscillator()), lg = c.createGain(); lfo.frequency.value = 1 / 14; lg.gain.value = R.souffle * .45; lfo.connect(lg); lg.connect(F.souf.gain);
    nz.connect(lp); lp.connect(hp); hp.connect(F.souf); F.souf.connect(F.g);
    nz.start(t, ctsHasard() * 2); lfo.start(t);
    F.g.gain.setTargetAtTime(1, t, R.monte);
  } catch (e) { errNote(e); return null; }
  CTS.n.fonds++;
  return (CTS.fond = F);
}
function ctsFondStop(){ const F = CTS.fond; CTS.fond = null; ctsArret(F); }
// k : force du bourdonnement (1 d'habitude ; pendant le Cœur, selon les transformateurs vivants)
function ctsFondRegler(k){
  const F = CTS.fond; if (!F) return;
  CTS.hum = k;
  try { F.hum.gain.setTargetAtTime(CTS_REGL.fond.hum * k, F.ctx.currentTime, CTS_REGL.fond.chute); } catch (e) { errNote(e); }
}
// Claquement d'arc électrique au loin, à gauche ou à droite
function ctsArc(cote){
  CTS.n.arcs++;
  const R = CTS_REGL.arc, s = cote || (ctsHasard() < .5 ? -1 : 1), pan = s * ctsH(R.pan[0], R.pan[1]);
  return ctsVoix('amb', 0, pan, CTS_REGL.niv.arc, (t) => {
    const n = 4 + Math.floor(ctsHasard() * 7);
    let a = t;
    for (let i = 0; i < n; i++){ ctsNz(a, 'bandpass', ctsH(1800, 4800), ctsH(3, 8), ctsH(.012, .04), R.vol * ctsH(.5, 1)); a += ctsH(.015, .07); }
    ctsOsc(t, 'square', 100, 98, a - t + .05, R.vol * .12);                          // la ligne qui ronfle pendant l'arc
    ctsNz(t, 'lowpass', 700, 1, .25, R.vol * .5, 150);                               // le claquement qui roule
  });
}

/* ---------- 2. L'irradié ---------- */
// Compteur Geiger : nœuds faits une fois ; les coups sont planifiés un peu en avance, au hasard (loi de Poisson)
function ctsGeigerCreer(){
  if (CTS.gei || !ctsOk()) return CTS.gei;
  const c = Snd.ctx, G = { ctx:c, src:[] };
  try {
    G.g = c.createGain(); G.g.gain.value = CTS_REGL.geiger.vol * .5;
    G.p = c.createStereoPanner ? c.createStereoPanner() : null;
    if (G.p){ G.g.connect(G.p); G.p.connect(Snd._bus('monde') || Snd.master); } else G.g.connect(Snd._bus('monde') || Snd.master);
    G.hp = c.createBiquadFilter(); G.hp.type = 'highpass'; G.hp.frequency.value = 700; G.hp.connect(G.g);
  } catch (e) { errNote(e); return null; }
  CTS.geiT = c.currentTime + .02;
  return (CTS.gei = G);
}
function ctsGeigerStop(){ const G = CTS.gei; CTS.gei = null; ctsArret(G); }
// Planifie les coups jusqu'à « jusqua » (temps audio), « taux » coups par seconde en moyenne
function ctsGeigerPlanifier(taux, jusqua){
  const G = CTS.gei; if (!G || !(taux > 0)) return 0;
  const c = G.ctx, B = ctsTampons(); let n = 0;
  if (CTS.geiT < c.currentTime) CTS.geiT = c.currentTime + .005;
  while (CTS.geiT < jusqua && n < 80){
    const s = c.createBufferSource(); s.buffer = B.clic; s.playbackRate.value = ctsH(.8, 1.2);
    const g = c.createGain(); g.gain.value = ctsH(.55, 1); s.connect(g); g.connect(G.hp); s.start(CTS.geiT);
    CTS.geiT += Math.max(.012, -Math.log(1 - ctsHasard() * .999) / taux); n++;
  }
  CTS.n.clics += n;
  return n;
}
// L'irradié vivant le plus proche de la barricade (vu dans la rue) : proximité de 0 à 1, nombre, place
function ctsIrradies(){
  const R = CTS_REGL.geiger; let best = null, bd = 1e9, n = 0;
  if (typeof zombies === 'undefined') return null;
  for (const z of zombies){
    if (z.dead || z.type !== 'irradie' || !z.g || z.g.position.z < R.voitZ) continue;
    n++; const d = Math.max(0, BAR_Z - z.g.position.z); if (d < bd){ bd = d; best = z; }
  }
  if (!best) return null;
  return { z:best, n, p:clamp(1 - (bd - 2) / R.portee, 0, 1) };
}
// La flaque se forme (l'irradié vient de mourir) ; plus forte si elle touche la barricade
function ctsFlaqueNee(f){
  CTS.n.nees++;
  const pl = ctsPlace(f.x, .2, f.z), k = (f.ronge ? CTS_REGL.flaque.ronge : 1) * pl.vol * CTS_REGL.flaque.neeVol;
  return ctsVoix('monde', 2, pl.pan, CTS_REGL.niv.nee, (t) => {
    ctsNz(t, 'lowpass', 900, 1.5, .3, .5 * k, 160);                                   // éclaboussure mouillée
    ctsOsc(t + .02, 'sine', 320, 85, .32, .22 * k);                                    // « bloup »
    ctsNz(t + .05, 'highpass', 3200, 0, .9, .14 * k, null, .08, ctsTampons().crepite); // chuintement qui crépite
    ctsNz(t + .05, 'bandpass', 1300, 3, .6, .08 * k, 600, .05);
    for (let i = 0; i < 6; i++) ctsOsc(t + .04 + i * ctsH(.03, .07), 'square', 3100, 3000, .006, .05 * k); // le compteur s'affole un instant
  });
}
// Grésillement tant qu'une flaque ronge la barricade : crépitement aigu bouclé et bouillonnement
function ctsGrisCreer(){
  if (CTS.gri || !ctsOk()) return CTS.gri;
  const c = Snd.ctx, t = c.currentTime, B = ctsTampons(), R = CTS_REGL.flaque, Z = { ctx:c, src:[] };
  try {
    Z.g = c.createGain(); Z.g.gain.value = .0001;
    Z.p = c.createStereoPanner ? c.createStereoPanner() : null;
    if (Z.p){ Z.g.connect(Z.p); Z.p.connect(Snd._bus('monde') || Snd.master); } else Z.g.connect(Snd._bus('monde') || Snd.master);
    const s = ctsSrc(Z, c.createBufferSource()); s.buffer = B.crepite; s.loop = true;
    const hp = c.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 1700;
    const pk = c.createBiquadFilter(); pk.type = 'peaking'; pk.frequency.value = 4200; pk.gain.value = 6;
    s.connect(hp); hp.connect(pk); pk.connect(Z.g); s.start(t, ctsHasard());
    // Bouillonnement : bruit dans un passe-bande, battu à 7 Hz
    const n = ctsSrc(Z, c.createBufferSource()); n.buffer = Snd.noise; n.loop = true;
    const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 900; bp.Q.value = 3;
    const bg = c.createGain(); bg.gain.value = R.bulle;
    const lfo = ctsSrc(Z, c.createOscillator()), lg = c.createGain(); lfo.type = 'square'; lfo.frequency.value = 7; lg.gain.value = R.bulle * .9;
    lfo.connect(lg); lg.connect(bg.gain); n.connect(bp); bp.connect(bg); bg.connect(Z.g); n.start(t, ctsHasard() * 2); lfo.start(t);
    Z.g.gain.setTargetAtTime(R.vol, t, .06);
  } catch (e) { errNote(e); return null; }
  CTS.n.grisCrees++;
  return (CTS.gri = Z);
}
function ctsGrisStop(){ const Z = CTS.gri; CTS.gri = null; ctsArret(Z); }

/* ---------- 3. Le Cœur ---------- */
function ctsCoeurArrive(z){
  CTS.n.arrivees++;
  const pl = z && z.g ? ctsPlace(z.g.position.x, 4, z.g.position.z) : { pan:0 };
  return ctsVoix('monde', 3, pl.pan * .5, CTS_REGL.niv.arrive, (t) => {
    ctsNappe(t, 'sawtooth', 45, 150, 1.4, .14, 1.1, 180, 2400);                       // montée électrique
    ctsNappe(t, 'sine', 1800, 5200, 1.1, .02, .9);                                     // sifflement qui monte
    for (let i = 0; i < 9; i++) ctsNz(t + .2 + i * ctsH(.06, .13), 'bandpass', ctsH(1600, 4200), ctsH(3, 7), ctsH(.02, .05), ctsH(.12, .22));
    ctsOsc(t + 1.25, 'sine', 70, 26, 1.5, .8);                                          // coup grave quand il est là
    ctsNz(t + 1.25, 'lowpass', 900, 1, 1.2, .5, 70);
    ctsOsc(t + 1.25, 'sawtooth', 110, 55, .9, .05);
  });
}
// Un battement : coup grave double (« boum-boum ») et ronflement électrique ; plus brut quand il est à nu
function ctsPouls(z, aNu){
  CTS.n.pouls++;
  const pl = z && z.g ? ctsPlace(z.g.position.x, 4, z.g.position.z) : { pan:0, vol:1 };
  return ctsVoix('monde', 1, pl.pan * .5, CTS_REGL.niv.pouls, (t) => {
    [[0, 1], [.19, .65]].forEach(([d, v]) => {
      ctsOsc(t + d, 'sine', 58, 36, .28, .25 * v);
      ctsNz(t + d, 'lowpass', 260, 1, .2, .12 * v, 90);
      ctsNappe(t + d, 'sawtooth', 100, 92, .24, .14 * v, .02, 520, 260);              // ronflement audible au cell
    });
    if (aNu) ctsNz(t, 'bandpass', 2600, 4, .12, .07);                                  // à nu : ça grésille
    else ctsOsc(t, 'sine', 200, 200, .3, .04);                                          // bouclier : chant du transformateur
  });
}
// Tir absorbé par le bouclier : « tic-zzt » métallique et aigu, bien à part des impacts dans la chair
function ctsAbsorbe(z){
  CTS.n.absorbes++;
  const pl = z && z.g ? ctsPlace(z.g.position.x, 4, z.g.position.z) : { pan:0 };
  return ctsVoix('monde', 2, pl.pan * .6, CTS_REGL.niv.absorbe, (t) => {
    const p = ctsH(.94, 1.06);
    ctsOsc(t, 'sine', 2350 * p, 1900 * p, .1, .2);
    ctsOsc(t, 'triangle', 3550 * p, 3400 * p, .06, .08);
    ctsNz(t + .01, 'bandpass', 5200, 4, .07, .22);
    ctsOsc(t + .01, 'square', 120, 110, .09, .035);
  });
}
function ctsTransfo(tr){
  CTS.n.transfos++;
  const pl = tr ? ctsPlace(tr.x, 2, tr.z) : { pan:0, vol:1 };
  return ctsVoix('monde', 3, pl.pan, CTS_REGL.niv.transfo, (t) => {
    let a = t;
    for (let i = 0; i < 7; i++){ ctsNz(a, 'bandpass', ctsH(1400, 4200), ctsH(3, 7), ctsH(.02, .05), ctsH(.2, .35)); a += ctsH(.02, .05); } // arc
    ctsNz(a, 'lowpass', 1400, 1, 1.3, .7, 90);                                         // explosion
    ctsOsc(a, 'sine', 95, 30, 1, .8);
    ctsNz(a + .05, 'highpass', 4200, 0, .7, .14, null, .05);                            // étincelles
    ctsNappe(t, 'sine', 950, 110, .8, .06, .02);                                        // sifflement qui tombe
  });
}
function ctsBouclierTombe(z){
  CTS.n.tombes++;
  return ctsVoix('monde', 3, 0, CTS_REGL.niv.tombe, (t) => {
    ctsOsc(t, 'sine', 190, 38, 1.2, .6);                                                // décharge
    ctsNappe(t, 'sawtooth', 1300, 70, 1.1, .08, .01, 3000, 300);
    ctsNz(t, 'highpass', 5500, 0, .45, .3);                                             // verre qui casse
    for (let i = 0; i < 5; i++) ctsOsc(t + .02 + i * ctsH(.02, .06), 'triangle', ctsH(2600, 4200), 0, .08, .05);
    ctsOsc(t + .35, 'triangle', 660, 660, .7, .14); ctsOsc(t + .55, 'triangle', 990, 990, .9, .12); // deux notes claires : « vas-y »
  });
}
function ctsCoeurMort(z){
  CTS.n.morts++;
  return ctsVoix('monde', 3, 0, CTS_REGL.niv.mort, (t) => {
    ctsOsc(t, 'sine', 62, 20, 3, .9);
    ctsNz(t, 'lowpass', 1000, 1, 3.2, .7, 60, .02);
    ctsNappe(t, 'sawtooth', 420, 30, 2.6, .08, .02, 1600, 120);                         // tout s'éteint
    let a = t + .1;
    for (let i = 0; i < 12; i++){ ctsNz(a, 'bandpass', ctsH(1500, 4000), ctsH(3, 7), .03, .25 * (1 - i / 13)); a += .06 + i * .02; }
  });
}

/* ---------- 4. Gyrophares : alarme courte et lointaine au début d'une vague de boss ---------- */
function ctsSirene(){
  CTS.n.sirenes++;
  return ctsVoix('monde', 2, -.25, CTS_REGL.niv.sirene, (t, c) => {
    // deux montées et descentes, puis l'écho sur les murs (plus sourd, de l'autre côté)
    [[0, 1, 1900], [.34, .35, 1100]].forEach(([d, v, fc]) => {
      const o = c.createOscillator(), o2 = c.createOscillator(), f = c.createBiquadFilter(), g = c.createGain(), a = t + d;
      o.type = 'sawtooth'; o2.type = 'square';
      for (let k = 0; k < 2; k++){ const b = a + k * 1.3; o.frequency.setValueAtTime(420, b); o.frequency.linearRampToValueAtTime(730, b + .75); o.frequency.linearRampToValueAtTime(420, b + 1.3); }
      o2.frequency.value = 3; // ondulation lente du timbre
      const og = c.createGain(); og.gain.value = 60; o2.connect(og); og.connect(f.frequency);
      f.type = 'lowpass'; f.frequency.value = fc; f.Q.value = 1;
      g.gain.setValueAtTime(.0001, a); g.gain.linearRampToValueAtTime(.06 * v, a + .25); g.gain.setValueAtTime(.06 * v, a + 2.3); g.gain.exponentialRampToValueAtTime(.0005, a + 2.65);
      o.connect(f); f.connect(g); g.connect(Snd._out); o.start(a); o2.start(a); o.stop(a + 2.7); o2.stop(a + 2.7); Snd._fin(a + 2.7);
    });
  });
}

/* ---------- Chaque image : lire l'état de la Centrale ---------- */
function ctsSortie(){
  ctsFondStop(); ctsGeigerStop(); ctsGrisStop(); ctsCouper();
  const p = CTS.p; p.ici = false; p.st = ''; p.coeur = null; p.fl = [];
}
// Ce qui ne joue qu'en vague (pas à la boutique ni en pause)
function ctsVagueRien(){ ctsGeigerStop(); ctsGrisStop(); }
function ctsImage(dt){
  dt = dt || 0;
  const C = typeof __centrale === 'object' ? __centrale : null;
  const ici = !!C && typeof ctrIci === 'function' && ctrIci();
  if (!ici){ if (CTS.p.ici || CTS.fond || CTS.gei || CTS.gri) ctsSortie(); return; }
  const p = CTS.p, st = state, CT0 = C.CT;
  if (!p.ici){ p.ici = true; p.coeur = null; p.vivants = C.ctrVivants(); p.detruits = CT0.stats.detruits; p.bouclier = CT0.stats.bouclier; p.wave = (typeof S === 'object' && S) ? S.wave : 0; p.S = typeof S === 'object' ? S : null; p.fl = []; CTS.arcT = ctsH(3, 9); }
  const ok = ctsOk();
  // Pause, fin de partie, menus : tout s'arrête net (voix comprises)
  if (st !== 'playing' && st !== 'shop'){
    if (CTS.fond || CTS.gei || CTS.gri) { ctsFondStop(); ctsVagueRien(); }
    if (st === 'paused' && CTS.voix.length) ctsCouper();
    ctsSuivre(C, false);
    p.st = st; return;
  }
  // Fond : pendant la vague et à la boutique (l'ambiance de la météo joue aussi à la boutique)
  if (ok){ if (!CTS.fond) ctsFondCreer(); } else if (CTS.fond) ctsFondStop();
  const coeur = CT0.coeur, vivant = typeof ctrCoeurVivant === 'function' ? ctrCoeurVivant() : false, nv = C.ctrVivants();
  const H = CTS_REGL.coeurHum;
  ctsFondRegler(vivant ? H.base + H.parTransfo * nv : coeur && coeur.dead ? H.mort : 1);
  if (st !== 'playing'){ ctsVagueRien(); ctsSuivre(C, false); p.st = st; return; }
  // Arc électrique au loin, de temps en temps
  CTS.arcT -= dt; if (CTS.arcT <= 0){ CTS.arcT = ctsH(CTS_REGL.arc.min, CTS_REGL.arc.max); if (ok) ctsArc(); }
  // Compteur Geiger : l'irradié le plus proche
  const I = ctsIrradies(), R = CTS_REGL.geiger;
  if (I && ok){
    if (!CTS.gei) ctsGeigerCreer();
    const G = CTS.gei;
    if (G){
      const taux = R.min + (R.max - R.min) * Math.pow(I.p, 1.6) * (1 + R.plus * Math.min(5, I.n - 1)), t = G.ctx.currentTime;
      G.g.gain.setTargetAtTime(R.vol * (.45 + .55 * I.p), t, .1);
      if (G.p) G.p.pan.setTargetAtTime(clamp(I.z.g.position.x / 12, -1, 1) * R.pan, t, .1);
      ctsGeigerPlanifier(taux, t + .12);
    }
  } else if (CTS.gei) ctsGeigerStop();
  // Grésillement tant qu'une flaque ronge la barricade (du côté de la plus récente)
  let fr = null; for (const f of CT0.flaques) if (f.on && f.ronge && (!fr || f.t > fr.t)) fr = f;
  if (fr && ok){
    if (!CTS.gri) ctsGrisCreer();
    if (CTS.gri && CTS.gri.p) CTS.gri.p.pan.setTargetAtTime(clamp(fr.x / 10, -1, 1) * .6, CTS.gri.ctx.currentTime, .1);
  } else if (CTS.gri) ctsGrisStop();
  ctsSuivre(C, ok);
  // Pulsation du Cœur : plus rapide quand sa vie baisse
  if (vivant && ok){
    CTS.poulsT -= dt;
    if (CTS.poulsT <= 0){ const k = clamp(coeur.hp / coeur.maxHp, 0, 1); CTS.poulsT = CTS_REGL.coeur.vite + (CTS_REGL.coeur.lent - CTS_REGL.coeur.vite) * k; ctsPouls(coeur, nv === 0); }
  }
  p.st = st;
}
// Les moments (flaque née, Cœur, transformateurs, bouclier, début de vague) : comptés même sans son, joués si « joue »
function ctsSuivre(C, joue){
  const p = CTS.p, CT0 = C.CT, st = state;
  // Flaques qui viennent de se former (réserve fixe de js/71 : une flaque réutilisée repart avec sa durée pleine)
  CT0.flaques.forEach((f, i) => {
    const q = p.fl[i] || (p.fl[i] = { on:false, t:0 });
    if (f.on && (!q.on || f.t > q.t + .05) && joue && st === 'playing') ctsFlaqueNee(f);
    q.on = f.on; q.t = f.t;
  });
  // Début de vague : alarme si un boss vient dans cette vague
  if (typeof S === 'object' && S){
    if (S !== p.S){ p.S = S; p.wave = 0; }
    if (st === 'playing' && S.wave > 0 && S.wave !== p.wave){
      p.wave = S.wave;
      const q = typeof plan === 'object' && plan && plan.queue ? plan.queue : [];
      if ((q.indexOf('boss') >= 0 || (plan && plan.boss)) && joue) ctsSirene();
    }
  }
  // Le Cœur
  const coeur = CT0.coeur, vivant = typeof ctrCoeurVivant === 'function' ? ctrCoeurVivant() : false, nv = C.ctrVivants();
  if (coeur && vivant && p.coeur !== coeur){ p.coeur = coeur; p.mort = false; p.vivants = nv; p.detruits = CT0.stats.detruits; p.bouclier = CT0.stats.bouclier; CTS.poulsT = 1.6; CTS.absT = -9; if (joue) ctsCoeurArrive(coeur); }
  if (coeur && p.coeur === coeur){
    if (CT0.stats.detruits > p.detruits){
      CT0.transfos.forEach(tr => { if (!tr.vivant && tr._ctsVu !== coeur){ tr._ctsVu = coeur; if (joue) ctsTransfo(tr); } });
      if (nv === 0 && p.vivants > 0 && vivant && joue) ctsBouclierTombe(coeur);
    }
    if (CT0.stats.bouclier > p.bouclier && nv > 0 && joue){
      const now = typeof Snd === 'object' && Snd._now ? Snd._now() : 0;
      if (now - CTS.absT >= CTS_REGL.coeur.absorbeGap){ CTS.absT = now; ctsAbsorbe(coeur); }
    }
    if (!vivant && coeur.dead && !p.mort){ p.mort = true; if (joue) ctsCoeurMort(coeur); }
  }
  if (!coeur) p.coeur = null;
  p.vivants = nv; p.detruits = CT0.stats.detruits; p.bouclier = CT0.stats.bouclier;
}
Jeu.on('image', dt => { try { ctsImage(dt); } catch (e) { errNote(e); } });

/* ---------- Mesures hors ligne ---------- */
// Rend un son (ou un mélange) dans un OfflineAudioContext avec toute la chaîne de sortie de Snd (limiteur compris),
// son au maximum. jouer est appelé à 0,5 s (limiteur chaud), etapes : [temps, fonction] en plus.
// Rend { pic, court, moyen, cell } en dBFS : pic = crête ; court = RMS le plus fort sur 50 ms ; moyen = RMS sur la partie
// qui s'entend (fenêtres de 50 ms à moins de 30 dB de la plus forte) ; cell = court après un passe-haut à 300 Hz.
const CTS_SND_K = ['ctx', 'master', 'lim', 'buses', 'fxBus', 'rev', 'qb', 'ambBus', 'musBus', 'mg', 'voix', 'on', '_out', '_autoV', '_vg', '_vEnd', 'lastShot', 'mgFiring'];
const CTS_K = ['fond', 'gei', 'gri', 'voix', 'buf', 'geiT', 'absT'];
function ctsRendre(duree, jouer, etapes){
  const sr = 44100, off = new OfflineAudioContext(1, Math.round(sr * duree), sr);
  const s0 = {}, c0 = {}, e = {}, ec = {};
  CTS_SND_K.forEach(k => { s0[k] = Snd[k]; }); CTS_K.forEach(k => { c0[k] = CTS[k]; });
  Snd.ctx = off; Snd.on = true; Snd.buses = null; Snd.fxBus = Snd.qb = Snd.ambBus = Snd.musBus = Snd.mg = Snd._autoV = Snd._out = Snd._vg = null; Snd.voix = []; Snd.lastShot = -1;
  Snd._chaine();
  CTS.fond = CTS.gei = CTS.gri = CTS.buf = null; CTS.voix = []; CTS.geiT = 0; CTS.absT = -9;
  CTS_SND_K.forEach(k => { e[k] = Snd[k]; Snd[k] = s0[k]; }); CTS_K.forEach(k => { ec[k] = CTS[k]; CTS[k] = c0[k]; });
  const dans = f => { const s2 = {}, c2 = {}; CTS_SND_K.forEach(k => { s2[k] = Snd[k]; Snd[k] = e[k]; }); CTS_K.forEach(k => { c2[k] = CTS[k]; CTS[k] = ec[k]; });
    try { f(off); } catch (x) { errNote(x); } finally { CTS_SND_K.forEach(k => { e[k] = Snd[k]; Snd[k] = s2[k]; }); CTS_K.forEach(k => { ec[k] = CTS[k]; CTS[k] = c2[k]; }); } };
  const L = [[.5, jouer]].concat(etapes || []);
  L.forEach(x => { off.suspend(Math.round(x[0] * sr / 128) * 128 / sr).then(() => { dans(x[1]); off.resume(); }); });
  return off.startRendering().then(buf => ctsAnalyse(buf.getChannelData(0), sr, .5));
}
function ctsAnalyse(d, sr, debut){
  const i0 = Math.round(debut * sr), w = Math.round(sr * .05), db = x => x > 1e-6 ? Math.round(200 * Math.log10(x)) / 10 : -120;
  const f0 = 300, Q = .707, a = 2 * Math.PI * f0 / sr, al = Math.sin(a) / (2 * Q), cs = Math.cos(a), a0 = 1 + al;
  const b0 = (1 + cs) / 2 / a0, b1 = -(1 + cs) / a0, b2 = b0, a1 = -2 * cs / a0, a2 = (1 - al) / a0;
  let pk = 0, x1 = 0, x2 = 0, y1 = 0, y2 = 0, best = 0, bestH = 0, e = 0, eh = 0, n = 0; const fen = [];
  for (let i = i0; i < d.length; i++){
    const x = d[i], y = b0 * x + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2; x2 = x1; x1 = x; y2 = y1; y1 = y;
    const v = Math.abs(x); if (v > pk) pk = v;
    e += x * x; eh += y * y;
    if (++n === w){ const r = Math.sqrt(e / w); fen.push(r); best = Math.max(best, r); bestH = Math.max(bestH, Math.sqrt(eh / w)); e = eh = 0; n = 0; }
  }
  const act = fen.filter(r => r > best * .0316), moy = act.length ? Math.sqrt(act.reduce((s, r) => s + r * r, 0) / act.length) : 0;
  return { pic:db(pk), court:db(best), moyen:db(moy), cell:db(bestH) };
}
// Fond, Geiger et grésillement : faits dans le contexte hors ligne, réglés, laissés jouer jusqu'à la fin du rendu
const ctsMesFond = k => () => { ctsFondCreer(); ctsFondRegler(k); };
const ctsMesGeiger = (p, duree) => () => { ctsGeigerCreer(); const R = CTS_REGL.geiger; CTS.gei.g.gain.value = R.vol * (.45 + .55 * p); ctsGeigerPlanifier(R.min + (R.max - R.min) * Math.pow(p, 1.6), Snd.ctx.currentTime + duree); };
function ctsListeMesures(){
  const L = [], m = (nom, groupe, duree, jouer, etapes) => L.push({ nom, groupe, duree, jouer, etapes });
  const faux = { g:{ position:new THREE.Vector3(0, 0, -30) }, hp:1, maxHp:1 };
  m('Fond du lieu (bourdonnement et souffle)', 'Fond', 6, ctsMesFond(1));
  m('Fond pendant le Cœur, 3 transformateurs', 'Fond', 6, ctsMesFond(CTS_REGL.coeurHum.base + 3 * CTS_REGL.coeurHum.parTransfo));
  m('Arc électrique au loin', 'Fond', 2.5, () => ctsArc(1));
  m('Geiger, irradié loin (50 m)', 'Irradié', 3.5, ctsMesGeiger(.1, 3));
  m('Geiger, irradié à la barricade', 'Irradié', 3.5, ctsMesGeiger(1, 3));
  m('Flaque qui se forme (loin)', 'Irradié', 2.5, () => ctsFlaqueNee({ x:0, z:-30, ronge:false }));
  m('Flaque qui se forme (contre la barricade)', 'Irradié', 2.5, () => ctsFlaqueNee({ x:2, z:BAR_Z - 1, ronge:true }));
  m('Grésillement : une flaque ronge la barricade', 'Irradié', 3.5, () => ctsGrisCreer());
  m('Cœur : arrivée', 'Cœur', 4.5, () => ctsCoeurArrive(faux));
  m('Cœur : un battement (bouclier)', 'Cœur', 2, () => ctsPouls(faux, false));
  m('Cœur : tir absorbé', 'Cœur', 1.5, () => ctsAbsorbe(faux));
  m('Cœur : transformateur détruit', 'Cœur', 3, () => ctsTransfo({ x:-15.6, z:-30 }));
  m('Cœur : le bouclier tombe', 'Cœur', 3, () => ctsBouclierTombe(faux));
  m('Cœur : mort', 'Cœur', 5, () => ctsCoeurMort(faux));
  m('Alarme des gyrophares (vague de boss)', 'Moment', 4, () => ctsSirene());
  const toit = (nom, f, duree) => m(nom, 'Toit', duree || 2.5, f);
  toit('Toit : pistolet', () => Snd.shot('pistol')); toit('Toit : fusil d’assaut', () => Snd.shot('rifle'));
  toit('Toit : fusil à pompe', () => Snd.shot('shotgun')); toit('Toit : grognement de marcheur', () => Snd.zvoix('walker'));
  return L;
}
// Pire cas réaliste : vague 12, le Cœur vit avec ses 3 transformateurs ; fond, Geiger au plus fort, une flaque qui ronge,
// battements rapides, tirs absorbés, et le fusil d'assaut qui tire 8 coups par seconde pendant 4 s
function ctsPireCas(avecArme){
  const faux = { g:{ position:new THREE.Vector3(0, 0, -25) }, hp:.2, maxHp:1 }, etapes = [];
  for (let k = 0; k < 32; k++) etapes.push([.6 + k * .125, () => { if (avecArme) Snd.shot('rifle'); if (k % 2 === 0) ctsAbsorbe(faux); }]);
  for (let k = 0; k < 8; k++) etapes.push([.7 + k * .5, () => ctsPouls(faux, false)]);
  etapes.push([1.5, () => ctsArc(-1)]);
  return ctsRendre(5, () => { ctsMesFond(1.3)(); ctsMesGeiger(1, 4.5)(); ctsGrisCreer(); }, etapes);
}
function ctsArmeSeule(){
  const etapes = []; for (let k = 0; k < 32; k++) etapes.push([.6 + k * .125, () => Snd.shot('rifle')]);
  return ctsRendre(5, () => {}, etapes);
}
function ctsMesurer(){
  const L = ctsListeMesures(), res = [];
  let p = Promise.resolve();
  L.forEach(x => { p = p.then(() => ctsRendre(x.duree, x.jouer, x.etapes).then(r => { res.push(Object.assign({ nom:x.nom, groupe:x.groupe }, r)); })); });
  const mix = {};
  return p.then(() => ctsArmeSeule()).then(r => { mix.arme = r; return ctsPireCas(false); })
    .then(r => { mix.sansArme = r; return ctsPireCas(true); }).then(r => { mix.avecArme = r; return { sons:res, mix }; });
}

// Accès pour les tests automatiques et les mesures
window.__centraleSons = { CTS, CTS_REGL, ctsHasard, ctsImage, ctsSuivre, ctsSortie, ctsFondCreer, ctsFondStop, ctsFondRegler, ctsArc, ctsGeigerCreer, ctsGeigerStop,
  ctsGeigerPlanifier, ctsIrradies, ctsFlaqueNee, ctsGrisCreer, ctsGrisStop, ctsCoeurArrive, ctsPouls, ctsAbsorbe, ctsTransfo, ctsBouclierTombe, ctsCoeurMort,
  ctsSirene, ctsCouper, ctsRendre, ctsAnalyse, ctsListeMesures, ctsPireCas, mesurer:ctsMesurer };
