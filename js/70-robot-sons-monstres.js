'use strict';
/* ================= Robot : sons des trois monstres à parade (Bélier, Grappin, Mortier vivant) ================= */
// Coupé de js/70-robot-sons.js au dossier 125 (le fichier dépassait 700 lignes), sans changer un seul son.
// Section 6 du dossier 121 : Jeu.on('monstre') de js/73-robot-monstres2.js. Se sert de la base de js/70-robot-sons.js
// (RSN, RSN_REGL, rsnVoix, rsnNz, rsnOsc, rsnHasard, rsnOk) ; js/70 appelle d'ici, à chaque image et seulement dans ses
// fonctions : rsnGrappinVitre, rsnGratteCreer, rsnGratteStop, rsnSiffletsSync et rsnMonstresRien.

/* ---------- 6. Les trois monstres à parade (js/73-robot-monstres2.js, dossier 121) ---------- */
// Écoute Jeu.emit('monstre', quoi, z) : un son qu'on reconnaît sans regarder pour chaque moment. Placé à gauche ou à droite
// selon la position du monstre (par rapport au regard), plus doux de loin. Hasard propre (rsnHasard), pas Math.random.
const rsnR = (a, b) => a + (b - a) * rsnHasard();
const RSN_MONS = ['belier', 'grappin', 'mortier'];
// Panoramique et distance d'un point de la rue ; pan : -1 gauche, 1 droite (vers la droite du regard : cos yaw, -sin yaw)
function rsnPlace(x, z){
  const R = RSN_REGL.mons;
  if (typeof MECH !== 'object' || typeof MECH_CAM !== 'object' || !isFinite(x) || !isFinite(z)) return { pan:0, k:1, d:0 };
  const dx = x - MECH.x, dz = z - MECH_CAM.z, d = Math.hypot(dx, dz);
  if (d < .5) return { pan:0, k:1, d };
  const y = typeof yaw === 'number' ? yaw : 0, droite = (dx * Math.cos(y) - dz * Math.sin(y)) / d;
  const k = clamp(1 - (d - R.pres) / (R.loin - R.pres) * (1 - R.min), R.min, 1);
  return { pan:clamp(droite, -1, 1) * R.pan, k, d };
}
const rsnPos = z => z && z.g && z.g.position ? rsnPlace(z.g.position.x, z.g.position.z) : { pan:0, k:1, d:0 };
const rsnRegl = (o, k, def) => typeof mr2Rgl === 'function' && o ? mr2Rgl(o, k) : def;
const RSN_MONSTRE = {
  // Bélier, élan : sabot qui racle l'asphalte (trois ou quatre fois) et souffle rauque des naseaux : c'est le signal de la parade
  elan(t, c, z){
    const dur = rsnRegl(typeof MR2_BEL === 'object' ? MR2_BEL : null, 'elan', 1.5), n = Math.max(3, Math.round(dur / .45));
    for (let i = 0; i < n; i++){
      const a = t + .05 + i * dur / n, p = rsnR(.9, 1.1);
      rsnNz(a, 'bandpass', 1700 * p, 2.2, .34, .55, null, 420, .05);                  // le sabot racle
      rsnNz(a, 'lowpass', 420 * p, 1, .2, .4, null, 110);                             // le poids du sabot
      rsnOsc(a, 'sine', 72 * p, 44, .18, .4);
      for (let j = 0; j < 2; j++) rsnNz(a + rsnR(.05, .25), 'bandpass', rsnR(2600, 4200), 6, .03, .07);  // gravillons
    }
    [.2, dur * .62].forEach(b => {                                                    // souffle rauque
      rsnNz(t + b, 'bandpass', 640, 1.3, .6, .4, null, 300, .09); rsnNz(t + b, 'highpass', 2300, 0, .45, .07, null, 0, .12);
      rsnOsc(t + b, 'sawtooth', 64, 48, .55, .09); rsnOsc(t + b, 'sawtooth', 96, 70, .5, .04);
    });
  },
  // Bélier, charge : galop lourd qui approche (coups qui se rapprochent et enflent), grondement qui monte
  charge(t, c, z){
    const vit = rsnRegl(typeof MR2_BEL === 'object' ? MR2_BEL : null, 'vit', 18);
    const reste = z && z.g ? MECH_CAM.z - 10 - z.g.position.z : 30, dur = clamp(reste / vit, .6, 3);
    let a = 0, i = 0;
    while (a < dur){
      const k = .3 + .7 * a / dur, h = t + a;
      rsnOsc(h, 'sine', 60, 30, .17, .55 * k); rsnNz(h, 'lowpass', 260 + 700 * a / dur, 1, .15, .45 * k, null, 90);
      rsnNz(h, 'bandpass', 900, 2, .05, .12 * k);                                      // sabot sur l'asphalte
      a += i % 2 ? .19 : .1; i++;                                                       // ta-tam, ta-tam
    }
    rsnNz(t, 'lowpass', 160, .7, dur + .2, .3, null, 420, dur * .85);                   // la masse qui arrive
    rsnOsc(t, 'sawtooth', 48, 62, dur, .05);
  },
  // Bélier, sonné : fracas de tôle et de briques contre la façade, puis râle sonné
  sonne(t, c){
    rsnNz(t, 'lowpass', 2000, .7, .7, .9, null, 140); rsnOsc(t, 'sine', 56, 26, .7, .75);  // le choc
    rsnOsc(t, 'triangle', 310, 292, 1, .13); rsnOsc(t, 'triangle', 466, 441, .8, .1); rsnOsc(t, 'square', 188, 181, .55, .03); // tôle
    rsnNz(t, 'bandpass', 2700, 3, .5, .3, null, 1400);
    for (let i = 0; i < 8; i++){ const a = t + .06 + rsnR(0, .8); rsnNz(a, 'bandpass', rsnR(450, 1400), 4, rsnR(.05, .1), rsnR(.14, .26)); rsnOsc(a, 'sine', rsnR(120, 210), 80, .06, .1); } // briques
    const a = t + .85, d = 1.3, o = c.createOscillator(), l = c.createOscillator(), lg = c.createGain(), f = c.createBiquadFilter(), g = c.createGain();
    o.type = 'sawtooth'; o.frequency.setValueAtTime(92, a); o.frequency.linearRampToValueAtTime(66, a + d);
    l.frequency.value = 5.5; lg.gain.value = 7; l.connect(lg); lg.connect(o.frequency);                 // voix qui tremble
    f.type = 'bandpass'; f.frequency.value = 520; f.Q.value = 2.2;
    g.gain.setValueAtTime(.0001, a); g.gain.linearRampToValueAtTime(.32, a + .15); g.gain.exponentialRampToValueAtTime(.001, a + d);
    o.connect(f); f.connect(g); g.connect(Snd._out); o.start(a); l.start(a); o.stop(a + d + .05); l.stop(a + d + .05); Snd._fin(a + d + .05);
    rsnNz(a, 'bandpass', 420, 1.5, d * .8, .12, null, 260, .2);
  },
  // Grappin, saut : cri aigu qui monte et tremble
  saut(t, c){
    const d = .45, o = c.createOscillator(), l = c.createOscillator(), lg = c.createGain(), f = c.createBiquadFilter(), g = c.createGain();
    o.type = 'sawtooth'; o.frequency.setValueAtTime(950, t); o.frequency.exponentialRampToValueAtTime(2000, t + .22); o.frequency.exponentialRampToValueAtTime(1450, t + d);
    l.frequency.value = 32; lg.gain.value = 70; l.connect(lg); lg.connect(o.frequency);
    f.type = 'bandpass'; f.frequency.value = 2100; f.Q.value = 2.5;
    g.gain.setValueAtTime(.0001, t); g.gain.linearRampToValueAtTime(.3, t + .04); g.gain.setValueAtTime(.3, t + .25); g.gain.exponentialRampToValueAtTime(.001, t + d);
    o.connect(f); f.connect(g); g.connect(Snd._out); o.start(t); l.start(t); o.stop(t + d + .05); l.stop(t + d + .05); Snd._fin(t + d + .05);
    rsnNz(t, 'highpass', 3500, 0, .3, .06, null, 0, .03);
  },
  // Grappin, accroché : choc sur la vitre (verre qui sonne, crochets qui se plantent, corps qui s'écrase)
  accroche(t){
    rsnOsc(t, 'triangle', 2900, 2860, .3, .13); rsnOsc(t, 'sine', 4350, 4300, .2, .06); rsnOsc(t, 'sine', 1880, 1860, .35, .08);
    rsnOsc(t, 'sine', 115, 58, .16, .45); rsnNz(t, 'lowpass', 700, 1, .12, .3, null, 150);
    rsnNz(t, 'bandpass', 3600, 4, .06, .4); rsnNz(t + .05, 'bandpass', 4200, 5, .05, .25);
  },
  // Grappin, décroché : couinement, puis il tombe au sol à côté
  decroche(t){
    rsnOsc(t, 'triangle', 1400, 2600, .09, .14); rsnOsc(t + .1, 'triangle', 2300, 850, .2, .14); rsnOsc(t + .1, 'sine', 4600, 1700, .2, .03);
    rsnOsc(t + .7, 'sine', 95, 50, .15, .25); rsnNz(t + .7, 'lowpass', 500, 1, .15, .2, null, 120);
  },
  // Mortier vivant, tir : « toump » lointain et sourd
  tir(t){
    rsnOsc(t, 'sine', 88, 40, .38, .65); rsnNz(t, 'lowpass', 270, 1, .4, .5, null, 80); rsnNz(t, 'bandpass', 520, 2, .12, .45); rsnOsc(t, 'triangle', 330, 170, .14, .3); // le « pop » du tube (s'entend au cell)
    rsnNz(t + .2, 'lowpass', 210, 0, .55, .16, null, 80, .05);                          // écho de la rue
  },
  // Mortier vivant, impact : coup mou, éclaboussure, acide qui grésille et bouillonne
  impact(t){
    rsnOsc(t, 'sine', 76, 34, .42, .6); rsnNz(t, 'lowpass', 380, 1, .36, .6, null, 90);
    rsnNz(t, 'bandpass', 820, 1.2, .26, .38, null, 380);
    rsnNz(t + .06, 'highpass', 4600, 0, 1.3, .09, null, 0, .15);
    for (let i = 0; i < 5; i++) rsnOsc(t + rsnR(.1, .8), 'sine', rsnR(480, 900), rsnR(950, 1450), .04, .045);
  }
};
// Un moment d'un monstre : compté même son coupé ; joué dans une voix (élan et charge passent avant le reste : la parade)
function rsnMonstre(quoi, z){
  if (!rsnTirIci() || !z || RSN_MONS.indexOf(z.type) < 0 || !RSN_MONSTRE[quoi]) return false;
  RSN.mons[quoi] = (RSN.mons[quoi] || 0) + 1;
  let pl;
  if (quoi === 'accroche' || quoi === 'decroche') pl = { pan:(typeof MR2 === 'object' && MR2.vitreX > 0 ? 1 : -1) * .35, k:1 };
  else if (quoi === 'impact') pl = rsnObusFini();
  else pl = rsnPos(z);
  if (quoi === 'tir') rsnObusVoir();
  const pri = quoi === 'elan' || quoi === 'charge' ? 3 : 2;
  rsnVoix('robot', pri, pl.pan, (t, c) => RSN_MONSTRE[quoi](t, c, z), (RSN_REGL.niv.mons[quoi] || 1) * pl.k);
  if (quoi === 'tir') rsnSiffletsSync();
  return true;
}
// Obus en vol (js/73) : gardés à part pour placer l'impact là où il tombe
function rsnObusVoir(){ if (typeof MR2_OBUS === 'undefined') return; MR2_OBUS.forEach(o => { if (o.actif) RSN.obusVus[o.id] = o; }); }
function rsnObusFini(){
  let pl = null;
  Object.keys(RSN.obusVus).forEach(id => { const o = RSN.obusVus[id]; if (!o.actif || o.id !== +id){ if (!pl) pl = rsnPlace(o.x, o.z); delete RSN.obusVus[id]; } });
  rsnSiffletsSync();
  return pl || { pan:0, k:1 };
}
// Boucles des monstres (grattement, sifflement) : gain placé sur le bus de la machine, oscillateur lent qui module un réglage,
// arrêt net (30 ms) qui lâche les nœuds
function rsnBoucle(c, pan){
  const X = { ctx:c, o:[], g:c.createGain() }; let out = Snd._bus('robot') || Snd.master;
  X.g.gain.value = .0001;
  if (c.createStereoPanner){ X.p = c.createStereoPanner(); X.p.pan.value = pan; X.p.connect(out); out = X.p; }
  X.g.connect(out); return X;
}
const rsnLfo = (c, f, prof, cible, type) => { const l = c.createOscillator(), g = c.createGain(); if (type) l.type = type; l.frequency.value = f; g.gain.value = prof; l.connect(g); g.connect(cible); return l; };
function rsnLacher(X){
  try {
    const t = X.ctx.currentTime;
    X.g.gain.cancelScheduledValues(t); X.g.gain.setValueAtTime(X.g.gain.value, t); X.g.gain.linearRampToValueAtTime(0, t + .03);
    X.o.forEach(o => o.stop(t + .05));
    setTimeout(() => { try { X.g.disconnect(); } catch (e) { errNote(e); } }, 250);
  } catch (e) { errNote(e); }
}
// Grappin sur la vitre : grattement et crissement des crochets, boucle faite une fois, coupée net quand il lâche
function rsnGratteCreer(){
  if (RSN.gratte || !rsnOk() || !Snd.noise) return RSN.gratte;
  const c = Snd.ctx, t = c.currentTime; let G;
  try {
    G = rsnBoucle(c, (typeof MR2 === 'object' && MR2.vitreX > 0 ? 1 : -1) * .35);
    // Grattement : bruit aigu haché par un battement (les crochets qui raclent le verre), filtre qui glisse
    const nz = c.createBufferSource(), bp = c.createBiquadFilter(), ng = c.createGain();
    nz.buffer = Snd.noise; nz.loop = true; bp.type = 'bandpass'; bp.frequency.value = 3200; bp.Q.value = 4; ng.gain.value = .5;
    nz.connect(bp); bp.connect(ng); ng.connect(G.g);
    // Crissement : une note aiguë qui glisse et revient (le verre qui crie sous la pointe)
    const sq = c.createOscillator(), sg = c.createGain(); sq.type = 'triangle'; sq.frequency.value = 2300; sg.gain.value = .05;
    sq.connect(sg); sg.connect(G.g);
    G.o = [nz, sq, rsnLfo(c, 7.3, .45, ng.gain, 'square'), rsnLfo(c, .9, 900, bp.frequency), rsnLfo(c, .7, 420, sq.frequency), rsnLfo(c, 2.3, .05, sg.gain)];
    G.o.forEach(o => { if (o === nz) o.start(t, rsnR(0, 1.5)); else o.start(t); });
    G.g.gain.setTargetAtTime(RSN_REGL.mons.gratte * (RSN_REGL.niv.mons.gratte || 1), t, .03);
  } catch (e) { errNote(e); return null; }
  RSN.grattes++;
  return (RSN.gratte = G);
}
function rsnGratteStop(){ const G = RSN.gratte; RSN.gratte = null; if (G){ RSN.grattesStop++; rsnLacher(G); } }
const rsnGrappinVitre = () => { if (typeof zombies === 'undefined') return null; for (const z of zombies) if (!z.dead && z.type === 'grappin' && z.mr === 'accroche') return z; return null; };
// Obus du Mortier vivant : sifflement qui descend pendant tout le vol (de plus en plus fort en tombant)
function rsnSiffletCreer(o){
  if (!rsnOk()) return null;
  const c = Snd.ctx, t = c.currentTime, reste = Math.max(.15, (o.T || 2) - (o.t || 0)), k0 = (o.t || 0) / (o.T || 2), f0 = 2700 - 1900 * k0; let F;
  try {
    F = rsnBoucle(c, rsnPlace(o.x, o.z).pan); F.ob = o; F.id = o.id;
    const e = c.createGain(), g2 = c.createGain(), s1 = c.createOscillator(), s2 = c.createOscillator();
    e.connect(F.g); g2.gain.value = .25; g2.connect(e);
    s1.type = 'sine'; s1.frequency.setValueAtTime(f0, t); s1.frequency.exponentialRampToValueAtTime(700, t + reste); s1.connect(e);
    s2.type = 'triangle'; s2.frequency.setValueAtTime(f0 * 1.007, t); s2.frequency.exponentialRampToValueAtTime(704, t + reste); s2.connect(g2);
    e.gain.setValueAtTime(.25 + .75 * k0 * k0, t); e.gain.linearRampToValueAtTime(1, t + reste);
    F.o = [s1, s2]; F.o.forEach(x => { x.start(t); x.stop(t + reste + .05); });
  } catch (e) { errNote(e); return null; }
  RSN.sifflets++;
  return F;
}
function rsnSiffletsRien(){ RSN.siffs.forEach(rsnLacher); RSN.siffs = []; }
// Un sifflement par obus en vol (refait à la reprise après une pause), arrêté quand l'obus tombe ; plus fort s'il vise le robot
function rsnSiffletsSync(){
  RSN.siffs = RSN.siffs.filter(F => { if (F.ob.actif && F.ob.id === F.id) return true; rsnLacher(F); return false; });
  if (typeof MR2_OBUS === 'undefined' || !rsnOk()) return;
  const R = RSN_REGL.mons, niv = RSN_REGL.niv.mons.siffle || 1;
  for (const o of MR2_OBUS){
    if (!o.actif) continue;
    let F = RSN.siffs.find(x => x.id === o.id);
    if (!F){ F = rsnSiffletCreer(o); if (!F) continue; RSN.siffs.push(F); }
    F.vise = Math.hypot(MECH.x - o.x, MECH_CAM.z - o.z) < (o.r || 3) + .5;
    try { const t = F.ctx.currentTime; F.g.gain.setTargetAtTime((F.vise ? R.siffleVise : R.siffleLoin) * niv, t, .06); if (F.p) F.p.pan.setTargetAtTime(rsnPlace(o.x, o.z).pan, t, .05); }
    catch (e) { errNote(e); }
  }
}
function rsnMonstresRien(){ rsnGratteStop(); rsnSiffletsRien(); }

Jeu.on('monstre', (quoi, z) => { try { rsnMonstre(quoi, z); } catch (e) { errNote(e); } });

// Accès pour les tests automatiques (ajoutés à window.__rsn de js/70-robot-sons.js)
Object.assign(window.__rsn || (window.__rsn = {}), { RSN_MONSTRE, rsnMonstre, rsnPlace, rsnGratteCreer, rsnGratteStop, rsnSiffletsSync, rsnMonstresRien });
