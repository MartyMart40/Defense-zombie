'use strict';
/* ================= RTS : les sons de la « Guerre des robots » (tâche 115) ================= */
// Seulement sonore : aucun chiffre de jeu, aucun visuel ne change. Tout passe par la chaîne de Snd (js/01-son.js) :
// rien ne joue (aucun nœud audio créé) quand le son est coupé (Snd.on faux), sans audio, ou hors du RTS.
//
// 1. Un son par famille d'arme (RSON_FAM, recettes dans RS_TIR) : fusil (fantassin), mitrailleuse (mitrailleur,
//    tourelle, coaxiale), minigun (Mech, 25 mm de l'AC-130), « brrrt » (canons du chasseur, du Warthog et de l'Apache),
//    tir d'élite, canon (tank 120 mm ; tourelle canon plus petite), 40 mm de l'AC-130, roquette (lance-roquettes,
//    Hydra, roquettes du Mech), missile (Hellfire), mortier (« toump » puis sifflement de chute là où il tombe),
//    105 mm (coup grave et lointain du départ), laser, Tesla, lance-flammes, crachat du Béhémoth, onde du Titan.
//    Les explosions suivent le rayon réel des dégâts (S2.splash) : plus grosses, plus graves, plus longues.
// 2. Placés : volume et filtre selon la distance (loin = plus faible et plus sourd), gauche ou droite selon la place
//    à l'écran. Vue de haut : distance au point visé au centre de l'écran (la hauteur de la caméra compte un peu) ;
//    en pilotage : distance à la caméra. Explosions, canons et onde du Titan arrivent en retard de loin (340 m/s).
// 3. Mixage : chaque famille a son plafond de voix (moins au cell) et un plafond total (RSON_MAX) ; quand c'est plein,
//    le son le moins audible (volume × importance) cède sa place ou le nouveau est laissé tomber. Un même endroit ne
//    relance pas la même famille avant « gap » secondes. Plus il y a de voix, plus chaque nouvelle part un peu plus
//    douce : le volume est fixé au départ (aucune voix ne change de volume en jouant : pas de pompage). Un son qu'on
//    n'entendrait pas (volume sous RSON.seuil) ne crée aucun nœud. Chaque voix est débranchée à la fin.
// 4. Les moments : alerte « Base attaquée » (deux notes qui montent, trois et plus graves aux paliers du QG), annonce
//    du siège (sirène d'alerte aérienne qui monte et descend, rien à voir avec les tambours du toit), début du siège
//    (cor grave et tambours lents), arrivée d'une horde (rumeur de foule du côté où elle arrive), sortie de la Ruche
//    (cri très grave et long, deux voix, la terre qui gronde), nid détruit (éclatement mouillé et cri), Ruche détruite
//    (cri qui tombe), « Vallée libérée » (accord de cors et cloches), bâtiment posé (claquements de métal et une note),
//    unité produite (robot, véhicule ou avion), ordre donné et choix (petit bip, pas à chaque clic rapide), unité
//    perdue (explosion et note qui descend), QG tombé.
// 5. En pilotant un véhicule : moteur en fond (tank, hélicoptère, chasseur, AC-130, Mech, petit robot) qui suit les
//    commandes, coupé en sortant. Le minigun du Mech et le canon de l'Apache gardent le son continu de js/01-son.js.
// Musique : rien ne change.
// Mesures (rendu hors ligne) : window.__rtsSons.mesurer(), outil : node outils/mesure-sons-rts.js ; table dans docs/rts.md.
// Branché dans js/42-rts-combat.js, js/42-rts-unites.js, js/43-rts-pilotage.js, js/44-rts-interface.js,
// js/49-rts-commandement.js, js/54-rts-postes.js, js/55-rts-effets.js et js/65-rts-ruche.js (appels protégés par typeof).

// Familles : max (voix à la fois, ordi), maxC (au cell), gap (s entre deux départs au même endroit), portee (m : son plein
// en deçà), pri (importance), rev (réverbération), son (retard de la vitesse du son)
const RSON_FAM = {
  fusil:        { max:3, maxC:2, gap:.05, portee:18, pri:1 },
  mitrailleuse: { max:4, maxC:2, gap:.045, portee:18, pri:1 },
  minigun:      { max:2, maxC:1, gap:.11, portee:22, pri:1.2 },
  brrrt:        { max:3, maxC:2, gap:.34, portee:30, pri:1.5 },
  elite:        { max:2, maxC:1, gap:.08, portee:26, pri:1.5, rev:true },
  canon:        { max:3, maxC:2, gap:.1, portee:32, pri:2, rev:true, son:true },
  canon40:      { max:3, maxC:2, gap:.1, portee:30, pri:1.6, rev:true, son:true },
  roquette:     { max:4, maxC:2, gap:.06, portee:24, pri:1.6 },
  missile:      { max:2, maxC:1, gap:.1, portee:28, pri:2 },
  mortier:      { max:3, maxC:2, gap:.1, portee:24, pri:1.6 },
  obus105:      { max:2, maxC:1, gap:.2, portee:50, pri:2.5, son:true },
  laser:        { max:3, maxC:2, gap:.08, portee:20, pri:1.4 },
  tesla:        { max:2, maxC:1, gap:.12, portee:20, pri:1.5 },
  feu:          { max:3, maxC:2, gap:.11, portee:16, pri:1 },
  crachat:      { max:2, maxC:1, gap:.2, portee:28, pri:2.2 },
  onde:         { max:2, maxC:1, gap:.3, portee:40, pri:3, rev:true, son:true },
  explosion:    { max:5, maxC:3, gap:.03, portee:34, pri:2.5, rev:true, son:true },
  perte:        { max:3, maxC:2, gap:.1, portee:40, pri:2.5, rev:true, son:true },
  nid:          { max:2, maxC:1, gap:.2, portee:60, pri:3, rev:true, son:true },
  horde:        { max:2, maxC:1, gap:1, portee:60, pri:2 }
};
const RSON_MAX = isTouch ? 10 : 18;     // voix du RTS à la fois, toutes familles
// Niveaux : bus des armes et explosions, moteur du véhicule piloté (réglés par mesure, voir docs/rts.md)
const RSON_MIX = { bus:.8, moteur:.55 };
const RSON = { forcer:false, decal:0, seuil:.04, densite:.06, voix:[], n:0, crees:0, liberees:0, coupees:0, refus:0, espaces:0, muets:0,
  pic:0, picFam:{}, dem:{}, joues:{}, dernier:'', cles:{}, nCles:0, bus:null, busRev:null, motBus:null, mot:null, ecoute:null,
  moments:{}, momentsJoues:{}, cd:{}, img:0, camVu:-1, perteT:-9 };
const rsV = new THREE.Vector3();

/* ---------- Outils ---------- */
const rsAudio = () => typeof Snd === 'object' && !!Snd._ok && Snd._ok();
const rsOk = () => (RSON.forcer || (typeof RTS === 'object' && RTS.on && (state === 'rts' || state === 'rtsover'))) && rsAudio();
const rsNow = () => Snd.ctx.currentTime + RSON.decal;
const rsN = (t, type, f, q, d, v, out, sw, atk) => Snd._nz(t, type, f, q, d, v, out, sw, atk);
const rsO = (t, type, f0, f1, d, v, out) => Snd._osc(t, type, f0, f1, d, v, out);
function rsBus(rev){
  const c = Snd.ctx;
  if (!RSON.bus || RSON.bus.context !== c){
    RSON.bus = c.createGain(); RSON.bus.gain.value = RSON_MIX.bus; RSON.bus.connect(Snd._bus('arme') || Snd.master);
    RSON.busRev = c.createGain(); RSON.busRev.gain.value = RSON_MIX.bus; RSON.busRev.connect(Snd._fx() || Snd.master);
    RSON.voix = []; // voix d'un ancien contexte audio
  }
  return rev ? RSON.busRev : RSON.bus;
}
// Nappe : un oscillateur, un filtre facultatif, une montée puis une descente (sons longs qui enflent)
function rsNappe(t, out, type, f0, f1, d, v, atk, fc, q){
  const c = Snd.ctx, o = c.createOscillator(), g = c.createGain(); o.type = type;
  o.frequency.setValueAtTime(f0, t); if (f1) o.frequency.exponentialRampToValueAtTime(f1, t + d);
  g.gain.setValueAtTime(.0001, t); g.gain.linearRampToValueAtTime(v, t + (atk || .02)); g.gain.exponentialRampToValueAtTime(.0005, t + d);
  if (fc){ const f = c.createBiquadFilter(); f.type = q ? 'bandpass' : 'lowpass'; f.frequency.value = fc; if (q) f.Q.value = q; o.connect(f); f.connect(g); } else o.connect(g);
  g.connect(out); o.start(t); o.stop(t + d + .05);
  return o;
}
// Rafale : bruit filtré dont le volume bat à la cadence de tir (hz), grondement à la même cadence (sub)
function rsRafale(t, out, d, hz, fc, v, sub){
  const c = Snd.ctx, s = c.createBufferSource(); s.buffer = Snd.noise;
  const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = fc; bp.Q.value = .9;
  const am = c.createGain(); am.gain.value = .5;
  const lfo = c.createOscillator(); lfo.type = 'square'; lfo.frequency.value = hz;
  const lg = c.createGain(); lg.gain.value = .5; lfo.connect(lg); lg.connect(am.gain);
  const env = c.createGain(); env.gain.setValueAtTime(.0001, t); env.gain.linearRampToValueAtTime(v, t + .012);
  env.gain.setValueAtTime(v, t + d * .7); env.gain.exponentialRampToValueAtTime(.0005, t + d);
  s.connect(bp); bp.connect(am); am.connect(env); env.connect(out);
  s.start(t, Math.random() * 1.5); s.stop(t + d + .05); lfo.start(t); lfo.stop(t + d + .05);
  if (sub){
    const o = c.createOscillator(), lp = c.createBiquadFilter(), g = c.createGain(); o.type = 'sawtooth'; o.frequency.value = hz;
    lp.type = 'lowpass'; lp.frequency.value = 280; g.gain.value = sub; o.connect(lp); lp.connect(g); g.connect(am);
    o.start(t); o.stop(t + d + .05);
  }
}

/* ---------- Placer un son ---------- */
// Distance, panoramique (-1 à 1), volume (0 à 1) et coupure du filtre pour un point du monde (vue de haut ou pilotage)
function rsSpot(x, y, z, portee){
  let d, pan;
  const E = RSON.ecoute;
  if (E){ d = Math.hypot(Math.hypot(x - E.x, z - E.z), (E.h || 0) * .45); pan = clamp((x - E.x) / 40, -1, 1) * .8; } // mesures et tests
  else if (typeof RTS === 'object' && RTS.pilot){
    if (RSON.camVu !== RSON.img){ camera.updateMatrixWorld(); RSON.camVu = RSON.img; }
    d = camera.position.distanceTo(rsV.set(x, y, z));
    rsV.applyMatrix4(camera.matrixWorldInverse);
    const h = Math.hypot(rsV.x, rsV.z) || 1; pan = clamp(rsV.x / h, -1, 1) * .85 * Math.min(1, d / 3);
  } else {
    // La caméra du RTS regarde toujours vers le nord : l'écart en x donne le côté ; le bord de l'écran est à environ 0,75 × la hauteur
    const C = RTS.cam;
    d = Math.hypot(Math.hypot(x - C.x, z - C.z), C.h * .45);
    pan = clamp((x - C.x) / (C.h * .75), -1, 1) * .8;
  }
  const vol = Math.min(1, Math.pow(portee / Math.max(portee, d), 1.4));
  return { d, pan, vol, fc:clamp(16000 * Math.exp(-d / 90), 600, 16000) };
}
function rsCouper(v){
  RSON.coupees++;
  const i = RSON.voix.indexOf(v); if (i >= 0) RSON.voix.splice(i, 1);
  // Pas encore joué (même instant audio) : débranché tout de suite ; sinon fondu de 20 ms puis débranché
  if (rsNow() - v.debut < .003){ rsLibere(v); return; }
  try { const t = Snd.ctx.currentTime; v.g.gain.cancelScheduledValues(t); v.g.gain.setValueAtTime(v.g.gain.value, t); v.g.gain.linearRampToValueAtTime(0, t + .02); } catch (e) { errNote(e); }
  v.fin = rsNow() + .03; v.mourante = true; RSON.voix.push(v);
}
function rsLibere(v){ RSON.liberees++; try { v.g.disconnect(); v.noeuds.forEach(n => n.disconnect()); } catch (e) { errNote(e); } }
function rsPurge(now){
  const L = RSON.voix; let k = 0;
  for (let i = 0; i < L.length; i++){ const v = L[i]; if (v.fin <= now) rsLibere(v); else L[k++] = v; }
  L.length = k;
}
// Joue un son de la famille fam au point (x, y, z). f(t, sortie, o) fabrique le son et rend sa durée (s).
// o : vol (facteur), retard (s), proche (sans placement : mesures), cle (endroit pour l'espace minimal)
function rsJouer(fam, x, y, z, f, o){
  o = o || {};
  RSON.dem[fam] = (RSON.dem[fam] || 0) + 1;
  if (!rsOk()) return false;
  const F = RSON_FAM[fam] || RSON_FAM.explosion;
  const s = o.proche ? { d:0, pan:0, vol:1, fc:16000 } : rsSpot(x, y, z, F.portee);
  let vol = s.vol * (o.vol || 1);
  if (vol < RSON.seuil){ RSON.muets++; return false; }
  const now = rsNow();
  if (!o.proche){
    const cle = fam + (o.cle || '') + ':' + Math.round(x / 12) + ',' + Math.round(z / 12), t0 = RSON.cles[cle];
    if (t0 != null && now - t0 < F.gap && now >= t0){ RSON.espaces++; return false; }
    if (t0 == null && ++RSON.nCles > 400){ RSON.cles = {}; RSON.nCles = 1; }
    RSON.cles[cle] = now;
  }
  rsPurge(now);
  const sc = vol * F.pri, cap = isTouch ? F.maxC : F.max;
  const pire = L => { let m = null; for (const v of L) if (!v.mourante && (!m || v.score < m.score)) m = v; return m; };
  const mien = RSON.voix.filter(v => v.fam === fam && !v.mourante);
  if (mien.length >= cap){ const m = pire(mien); if (m.score >= sc){ RSON.refus++; return false; } rsCouper(m); }
  if (RSON.voix.filter(v => !v.mourante).length >= RSON_MAX){ const m = pire(RSON.voix); if (!m || m.score >= sc){ RSON.refus++; return false; } rsCouper(m); }
  vol /= Math.sqrt(1 + RSON.densite * RSON.voix.length); // densité, fixée au départ du son (pas de pompage)
  const c = Snd.ctx, retard = (F.son && !o.proche ? clamp((s.d - 25) / 340, 0, .8) : 0) + (o.retard || 0), t = c.currentTime + retard;
  let g; const noeuds = [];
  try {
    g = c.createGain(); g.gain.value = vol; let n = g;
    if (s.fc < 12000){ const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = s.fc; n.connect(lp); n = lp; noeuds.push(lp); }
    if (c.createStereoPanner && Math.abs(s.pan) > .02){ const p = c.createStereoPanner(); p.pan.value = s.pan; n.connect(p); n = p; noeuds.push(p); }
    n.connect(rsBus(F.rev));
  } catch (e) { errNote(e); return false; }
  let dur = .5;
  try { dur = f(t, g, o) || .5; } catch (e) { errNote(e); }
  RSON.voix.push({ fam, g, noeuds, score:sc, debut:now, retard, fin:now + retard + dur + .1, n:++RSON.n });
  RSON.crees++; RSON.joues[fam] = (RSON.joues[fam] || 0) + 1; RSON.dernier = fam;
  const nv = RSON.voix.length; if (nv > RSON.pic) RSON.pic = nv;
  const nf = RSON.voix.filter(v => v.fam === fam).length; if (nf > (RSON.picFam[fam] || 0)) RSON.picFam[fam] = nf;
  return true;
}

/* ---------- Recettes des armes ---------- */
// Chaque recette : (t, sortie, o) ; o.k : niveau de l'arme (0 à 1) ; rend la durée. Le hasard varie chaque coup.
const RS_TIR = {
  // Fantassin : coup sec de fusil, petite note électronique (robot)
  fusil(t, out, o){ const p = rand(.9, 1.12), k = o.k || 0;
    rsN(t, 'highpass', 3600 * p, 0, .03, .3, out); rsN(t, 'lowpass', 1700 * p, 1, .1, .32 + .1 * k, out, 220);
    rsO(t, 'sine', 170 * p, 60, .08, .26 + .1 * k, out); rsO(t, 'square', 950 * p, 320, .04, .04, out); return .22; },
  // Mitrailleuse : claquement court et vif (cadence élevée : peu de couches)
  mitrailleuse(t, out, o){ const p = rand(.88, 1.14);
    rsN(t, 'highpass', 4600 * p, 0, .022, .28, out); rsN(t, 'bandpass', 1250 * p, 1, .07, .32, out, 300);
    rsO(t, 'sine', 140 * p, 60, .06, .22 + .08 * (o.k || 0), out); return .14; },
  // Minigun (Mech vu de loin, 25 mm) : vrombissement déchiré, environ 55 coups par seconde
  minigun(t, out, o){ rsRafale(t, out, .17, rand(52, 58), 2300, .5, .25 + .15 * (o.k || 0)); return .2; },
  // « Brrrt » des canons d'avion et de l'Apache : rugissement grave à 65 coups par seconde, puis l'écho qui roule
  brrrt(t, out, o){ const hz = rand(62, 70);
    rsRafale(t, out, .42, hz, 950, .55, .5 + .2 * (o.k || 0)); rsN(t + .3, 'lowpass', 600, 1, .7, .22, out, 120, .05); return 1; },
  // Tir d'élite : claquement très sec, coup grave, longs échos dans la vallée
  elite(t, out, o){ const p = rand(.93, 1.07);
    rsN(t, 'highpass', 6200 * p, 0, .045, .5, out); rsN(t, 'lowpass', 950 * p, 1, .36, .6, out, 120); rsO(t, 'sine', 110 * p, 35, .28, .55, out);
    rsN(t + .18 * rand(.85, 1.2), 'bandpass', 800, .8, 1.1, .2, out, 250, .02); rsN(t + .62, 'lowpass', 560, 0, .9, .09, out, 180, .04); return 1.7; },
  // Canon (tank 120 mm ; tourelle : o.petit) : coup sec et grave, culasse qui sonne, queue qui roule
  canon(t, out, o){ const s = o.petit ? .65 : 1, p = rand(.92, 1.08) / Math.sqrt(s), k = o.k || 0;
    rsN(t, 'highpass', 2000 * p, 0, .05, .5 * s, out); rsO(t, 'sine', 78 * p, 30, .5 * s + .1, .9 * s, out);
    rsN(t, 'lowpass', 900 * p, 1, .7 * s, .7 * s * (1 + .2 * k), out, 80); rsN(t + .08, 'lowpass', 320, 1, 1.6 * s, .34 * s, out, 60, .1);
    rsN(t + .03, 'bandpass', 2600 * p, 8, .16, .07, out); return 1.8 * s + .1; },
  // 40 mm de l'AC-130 : « pom » rond, plus court
  canon40(t, out, o){ const p = rand(.92, 1.08);
    rsO(t, 'sine', 165 * p, 70, .18, .55, out); rsN(t, 'lowpass', 1400 * p, 1, .15, .45, out, 200);
    rsN(t, 'bandpass', 3000 * p, 1, .02, .2, out); rsN(t + .05, 'lowpass', 420, 1, .5, .16 + .06 * (o.k || 0), out, 90, .03); return .7; },
  // Roquette : allumage, départ sifflant qui monte, petit coup sourd
  roquette(t, out, o){ const p = rand(.9, 1.1);
    rsN(t, 'bandpass', 1500 * p, 1, .04, .35, out); rsN(t, 'bandpass', 600 * p, 1.5, .5, .36, out, 3200 * p, .03);
    rsN(t, 'highpass', 4000, 0, .4, .08, out, 0, .02); rsO(t, 'sine', 92 * p, 50, .1, .26 + .08 * (o.k || 0), out); return .62; },
  // Missile Hellfire : claquement de départ, moteur qui gronde, sifflement qui monte, plus long que la roquette
  missile(t, out, o){ const p = rand(.95, 1.05);
    rsN(t, 'bandpass', 2200 * p, 1, .03, .36, out); rsN(t, 'lowpass', 1800 * p, 1, .9, .3, out, 700, .05);
    rsO(t, 'triangle', 1400 * p, 2600 * p, .7, .05, out); rsN(t, 'bandpass', 400 * p, 1.2, 1, .3, out, 2000, .08); return 1.1; },
  // Mortier : « toump » creux au départ ; o.chute : sifflement qui descend là où il tombe, juste avant l'impact
  mortier(t, out, o){
    if (o.chute){ const d = .5; rsO(t, 'sine', 1700, 650, d, .07, out); rsO(t, 'triangle', 1720, 640, d, .025, out); return d + .05; }
    const p = rand(.92, 1.08); rsO(t, 'sine', 210 * p, 70, .14, .6, out); rsO(t, 'triangle', 420 * p, 140, .08, .15, out);
    rsN(t, 'bandpass', 500 * p, 2, .12, .35, out); rsN(t + .04, 'lowpass', 380, 1, .5, .12, out, 100, .04); return .6; },
  // 105 mm (départ, de l'avion) : coup très grave et lointain
  obus105(t, out){ rsO(t, 'sine', 55, 28, .7, .7, out); rsN(t, 'lowpass', 420, 1, 1.2, .5, out, 60, .03); rsN(t, 'bandpass', 1200, 1, .05, .15, out); return 1.3; },
  // Laser : bourdonnement (deux dents de scie qui frottent) et « zap » qui tombe
  laser(t, out, o){ const p = rand(.95, 1.05), k = o.k || 0;
    rsNappe(t, out, 'sawtooth', 110 * p, 0, .32, .12, .01, 900, 3); rsNappe(t, out, 'square', 112.5 * p, 0, .3, .05, .01, 1400, 4);
    rsO(t, 'sine', 2400 * p, 300, .18, .2 + .06 * k, out); rsN(t, 'highpass', 5200, 0, .05, .08, out); return .36; },
  // Tesla : claquements électriques irréguliers, bourdonnement à 60 Hz, éclat final
  tesla(t, out){ let a = t;
    for (let i = 0; i < 6; i++){ rsN(a, 'highpass', rand(2800, 4200), 0, .018, rand(.35, .6), out); a += rand(.015, .04); }
    rsNappe(t, out, 'sawtooth', 60, 0, .28, .14, .01, 700, 1.5); rsN(t + .02, 'bandpass', 5200, .7, .06, .4, out); return .4; },
  // Lance-flammes : souffle qui gronde, quelques crépitements
  feu(t, out){ rsN(t, 'lowpass', 620 * rand(.9, 1.1), .7, .32, .7, out, 1100, .05); rsN(t, 'lowpass', 150, 1, .3, .3, out, 0, .04);
    for (let i = 0; i < 2; i++) rsN(t + rand(.03, .25), 'bandpass', rand(2200, 3200), 3, .025, .12, out); return .36; },
  // Crachat du Béhémoth : gargouillis mouillé, « ptou », puis l'acide qui grésille à l'arrivée
  crachat(t, out){ rsO(t, 'sawtooth', 160, 60, .3, .12, out); rsN(t, 'bandpass', 900, 2, .3, .3, out, 300); rsO(t, 'sine', 300, 120, .08, .3, out);
    rsN(t + .45, 'highpass', 2500, 0, .5, .15, out, 0, .02); rsN(t + .45, 'bandpass', 700, 1.5, .15, .2, out); return 1; },
  // Onde du Titan : la terre frappe, grondement, cailloux
  onde(t, out){ rsO(t, 'sine', 45, 22, .9, 1, out); rsN(t, 'lowpass', 250, 1, 1.4, .6, out, 50, .02); rsN(t, 'bandpass', 900, 1, .08, .5, out);
    rsN(t, 'bandpass', 380, 1, .9, .55, out, 140, .01);
    for (let i = 0; i < 5; i++) rsN(t + rand(.15, .9), 'bandpass', rand(1500, 3000), 5, .04, .05, out); return 1.5; }
};
// Explosion selon le rayon réel R (m) : claquement, boule de feu, coup grave, grondement qui roule, débris ; o.big : 105 mm
function rsBoomRecette(R, big, k){
  const s = clamp(R / 6, .4, 2), v = .3 + .7 * Math.min(s, 1);
  return (t, out) => { const p = rand(.92, 1.08) / Math.sqrt(s);
    rsN(t, 'highpass', 2200 * Math.pow(s, -.3), 0, .05, .45 * Math.min(s, 1.2) * v, out);
    rsN(t, 'lowpass', 1400 * p, 1, .6 + .5 * s, .8 * v * (1 + .15 * (k || 0)), out, 70);
    rsO(t, 'sine', 80 * p, 22, .5 + .5 * s, .85 * v, out);
    rsN(t + .05, 'lowpass', 350, 1, 1.2 + 1.2 * s, .4 * v, out, 50, .1);
    for (let i = 0, n = 2 + Math.round(2 * s); i < n; i++) rsN(t + rand(.2, .9), 'bandpass', rand(1500, 4000), 6, rand(.03, .07), rand(.03, .07), out);
    if (big){ rsO(t, 'sine', 38, 18, 2.2, .6, out); rsN(t + .3, 'lowpass', 200, 1, 3, .35, out, 45, .3); }
    return 1.6 + 1.3 * s + (big ? 1.6 : 0);
  };
}

/* ---------- Branchements des armes ---------- */
// Famille sonore d'un tir (champs du tir, comme rfxFam de js/55-rts-effets.js, mais plus fin pour les balles)
function rsFamTir(S2){
  if (!S2) return 'mitrailleuse';
  if (S2.flame) return 'feu';
  if (S2.chain) return 'tesla';
  if (S2.fam === 'missile') return 'missile';
  if (S2.splash){
    if (S2.big) return 'obus105';
    if (S2.min) return 'mortier';
    if (S2.snd === 'mg50') return 'canon';
    if (S2.snd === 'sniper') return 'canon40';
    return 'roquette';
  }
  if (S2.beam === 0x50f0ff) return 'laser';
  if (S2.pierce) return S2.beam === 0xffc060 ? 'canonT' : 'elite';
  const s = S2.snd; return s === 'pistol' ? 'fusil' : s === 'minigun' ? 'minigun' : s === 'mg50' ? 'brrrt' : 'mitrailleuse';
}
// Un tir (appelé par rtsHit, js/42-rts-combat.js) : départ au bout du canon ; le mortier siffle là où il tombe
function rtsSonTir(from, to, S2, kind){
  let fam = rsFamTir(S2); const petit = fam === 'canonT'; if (petit) fam = 'canon';
  if (!rsOk() || !from) return false;
  const o = { k:S2 && typeof S2.tier === 'number' ? clamp(S2.tier, 0, 1) : 0, petit };
  const r = rsJouer(fam, from.x, from.y, from.z, RS_TIR[fam], o);
  if (fam === 'mortier' && to){ const vol = clamp(Math.hypot(to.x - from.x, to.z - from.z) / 70, .04, .6); rsJouer('mortier', to.x, to.y, to.z, RS_TIR.mortier, { chute:true, cle:'c', retard:Math.max(.05, vol - .5) }); }
  return r;
}
// Mortier piloté : l'obus met tv secondes à tomber
function rtsSonMortier(fx, fz, x, z, tv){
  if (!rsOk()) return false;
  const r = rsJouer('mortier', fx, 3, fz, RS_TIR.mortier, {});
  rsJouer('mortier', x, .5, z, RS_TIR.mortier, { chute:true, cle:'c', retard:Math.max(.05, (tv || 1) - .5) });
  return r;
}
// Explosion au sol, rayon réel R ; o : big (105 mm), k (niveau), bat (bâtiment), vol
function rtsSonBoom(x, z, R, o){
  o = o || {};
  if (!rsOk()) return false;
  return rsJouer('explosion', x, 1, z, rsBoomRecette(R || 3, !!o.big, o.k), { vol:o.vol });
}
function rtsSonOnde(x, z){ return rsOk() && rsJouer('onde', x, 0, z, RS_TIR.onde, {}); }
function rtsSonCrachat(x, z){ return rsOk() && rsJouer('crachat', x, 3, z, RS_TIR.crachat, {}); }

/* ---------- Moments du jeu ---------- */
// Compte chaque moment demandé (même son coupé) ; f joue dans une voix « ui » de Snd (non placée), rend vrai si joué
function rsMoment(nom, pri, f){
  RSON.moments[nom] = (RSON.moments[nom] || 0) + 1;
  if (!rsOk()) return false;
  const r = Snd._voix('ui', pri, () => f(Snd.ctx.currentTime));
  if (r) RSON.momentsJoues[nom] = (RSON.momentsJoues[nom] || 0) + 1;
  return r;
}
// Attente minimale entre deux fois le même moment (s), selon l'horloge du jeu
function rsAttente(nom, s){ const w = Snd._now(); if (w - (RSON.cd[nom] || -99) < s) return false; RSON.cd[nom] = w; return true; }
// Alerte (js/49-rts-commandement.js) : n = palier (0 bâtiment, 1 tourelle perdue, 2 base, 3 QG, 4 QG < 50 %, 5 QG < 25 %)
function rtsSonAlerte(n){
  n = clamp(+n || 0, 0, 5);
  return rsMoment('alerte', 3, t => {
    const f = 560 + 50 * n, nb = n >= 4 ? 3 : 2, ec = n >= 4 ? .16 : .2;
    for (let i = 0; i < nb; i++){ const a = t + i * ec * 2;
      rsO(a, 'square', f, 0, ec * .8, .045); rsO(a, 'triangle', f, 0, ec * .8, .12);
      rsO(a + ec, 'square', f * 1.26, 0, ec * .8, .045); rsO(a + ec, 'triangle', f * 1.26, 0, ec * .8, .12); }
    if (n >= 3) rsO(t, 'sine', 110, 70, .35, .25); // coup grave : c'est le QG
  });
}
// Annonce du siège : sirène d'alerte aérienne (deux dents de scie qui battent), deux montées et descentes
function rtsSonSiege(){
  return rsMoment('siege', 3, t => {
    const c = Snd.ctx, d = 3.8, fl = c.createBiquadFilter(), g = c.createGain(); fl.type = 'lowpass'; fl.frequency.value = 1700;
    g.gain.setValueAtTime(.0001, t); g.gain.linearRampToValueAtTime(.09, t + .5); g.gain.setValueAtTime(.09, t + d - .6); g.gain.exponentialRampToValueAtTime(.001, t + d);
    [1, 1.007].forEach(m => { const o = c.createOscillator(); o.type = 'sawtooth';
      o.frequency.setValueAtTime(240 * m, t); o.frequency.linearRampToValueAtTime(700 * m, t + 1.2); o.frequency.linearRampToValueAtTime(330 * m, t + 1.9);
      o.frequency.linearRampToValueAtTime(720 * m, t + 3); o.frequency.linearRampToValueAtTime(260 * m, t + d); o.connect(fl); o.start(t); o.stop(t + d + .05); });
    fl.connect(g); g.connect(Snd._out); Snd._fin(t + d + .05);
  });
}
// Début du siège : cor grave (ré grave) et trois coups de tambour lents
function rtsSonSiegeDebut(){
  return rsMoment('siegeDebut', 3, t => {
    if (typeof Snd._tambour === 'function') [0, .5, 1].forEach((d, i) => Snd._tambour(t + d, 70 - i * 6, .5));
    if (typeof Snd._cor === 'function'){ Snd._cor(t + .2, 73.4, 1.6, .13); Snd._cor(t + .2, 110, 1.6, .06); }
  });
}
// Une horde arrive : rumeur de foule du côté où elle arrive
function rtsSonHorde(x, z){
  RSON.moments.horde = (RSON.moments.horde || 0) + 1;
  if (!rsOk()) return false;
  return rsJouer('horde', x, 0, z, (t, out) => {
    rsN(t, 'bandpass', 380, 1.2, 1.8, .3, out, 250, .4); rsN(t + .2, 'bandpass', 750, 2, 1.4, .14, out, 400, .3);
    const o = Snd._out; Snd._out = out;
    try { if (typeof Snd.zvoix === 'function'){ Snd.zvoix('brute'); Snd.zvoix('walker'); } } finally { Snd._out = o; }
    return 2;
  }, { vol:1.6 });
}
// Sortie de la Ruche : cri très grave et long (deux voix qui frottent, souffle, sous-grave), la terre qui gronde, l'éclatement
const RS_RUCHE = { f:[46, 50], depart:.8, monte:.35, fin:.62, d:[3.6, 3.8], vib:[3, 4], vibA:.09, formants:[[240, 320, 3], [580, 740, 5], [1250, 1450, 8]], vol:.85, atk:.6, sub:30, subV:.45, souffle:[200, 400, .2] };
const RS_RUCHE2 = { f:[72, 76], depart:.75, monte:.4, fin:.6, d:[3.2, 3.4], vib:[4, 5], vibA:.07, formants:[[420, 520, 4], [1000, 1200, 6]], vol:.35, atk:.5 };
const RS_RUCHE_MORT = { f:[60, 66], depart:1.2, monte:.1, fin:.35, d:[2.4, 2.7], vib:[5, 7], vibA:.12, formants:[[300, 380, 3], [700, 850, 5]], vol:.8, atk:.08, sub:40, subV:.4, souffle:[300, 600, .2] };
function rtsSonRuche(x, z){
  if (rsOk() && x != null) rsJouer('nid', x, 2, z, rsBoomRecette(9, true), { vol:1.2 });
  return rsMoment('ruche', 3, t => {
    Snd._cri(RS_RUCHE); Snd._cri(RS_RUCHE2, .15);
    rsN(t, 'lowpass', 180, 1, 3.4, .35, null, 50, .6);
    for (let i = 0; i < 6; i++) rsN(t + rand(.3, 2.8), 'bandpass', rand(900, 2200), 3, .05, .05);
  });
}
// Ruche détruite : cri qui tombe et grosse explosion
function rtsSonRucheMort(x, z){
  if (rsOk() && x != null) rsJouer('nid', x, 2, z, rsBoomRecette(12, true), { vol:1.2 });
  return rsMoment('rucheMort', 3, () => { Snd._cri(RS_RUCHE_MORT); });
}
// « Vallée libérée » : accord de cors (do, mi, sol) qui monte, cloches
function rtsSonLiberee(){
  return rsMoment('liberee', 3, t => {
    if (typeof Snd._cor === 'function'){ Snd._cor(t, 130.8, .5, .1); Snd._cor(t + .45, 164.8, .5, .1); Snd._cor(t + .9, 196, 1.6, .11); Snd._cor(t + .9, 261.6, 1.6, .08); }
    [1047, 1319, 1568].forEach((f, i) => { rsO(t + .9 + i * .12, 'sine', f, 0, 1.8, .1); rsO(t + .9 + i * .12, 'sine', f * 2.76, 0, .5, .025); });
  });
}
// Nid détruit : éclatement mouillé et cri qui meurt, placé
function rtsSonNid(x, z){
  RSON.moments.nid = (RSON.moments.nid || 0) + 1;
  if (!rsOk()) return false;
  const boom = rsBoomRecette(6, false);
  return rsJouer('nid', x, 3, z, (t, out) => {
    const d = boom(t, out);
    rsN(t, 'lowpass', 1200, 2, .6, .4, out, 150); rsO(t + .05, 'sawtooth', 420, 110, .8, .1, out); rsO(t + .05, 'sawtooth', 432, 104, .8, .07, out);
    return Math.max(d, 2);
  }, {});
}
// Bâtiment posé : claquements de métal, coup sourd, une note claire
function rtsSonBatiment(){
  return rsMoment('batiment', 3, t => {
    [0, .12, .24].forEach((d, i) => rsN(t + d, 'bandpass', [2200, 1800, 2500][i] * rand(.95, 1.05), 8, .06, .25));
    rsN(t, 'lowpass', 300, 1, .2, .3, null, 90); rsO(t, 'sine', 95, 50, .18, .2); rsO(t + .34, 'sine', 1568, 0, .35, .07); rsO(t + .34, 'triangle', 784, 0, .3, .05);
  });
}
// Unité produite : robot (servo et deux bips), véhicule (moteur qui démarre), avion (souffle qui monte)
function rtsSonUnite(u){
  const U = u && u.U ? u.U : {}, cat = U.kind === 'air' || U.kind === 'heli' ? 'air' : U.cat === 'veh' || U.big ? 'veh' : 'rob';
  return rsMoment('unite', 3, t => {
    if (cat === 'rob'){ rsO(t, 'triangle', 300, 900, .25, .11); rsO(t + .26, 'sine', 1200, 0, .06, .11); rsO(t + .34, 'sine', 1600, 0, .08, .11); }
    else if (cat === 'veh'){ rsO(t, 'sawtooth', 42, 68, .7, .12); rsN(t, 'lowpass', 320, 1, .6, .25, null, 120, .12); rsO(t + .5, 'sine', 1200, 0, .08, .06); }
    else { rsN(t, 'bandpass', 500, 1.2, .9, .22, null, 2600, .25); rsO(t + .6, 'sine', 1400, 0, .08, .06); }
  });
}
// Ordre donné : petit bip discret (deux notes), au plus un toutes les 0,3 s (clics rapides : rien de plus)
function rtsSonOrdre(){
  RSON.moments.ordre = (RSON.moments.ordre || 0) + 1;
  if (!rsOk() || !rsAttente('ordre', .3)) return false;
  const r = Snd._voix('ui', 1, () => { const t = Snd.ctx.currentTime; rsO(t, 'sine', 1000, 0, .05, .08); rsO(t + .05, 'sine', 1500, 0, .06, .07); });
  if (r) RSON.momentsJoues.ordre = (RSON.momentsJoues.ordre || 0) + 1;
  return r;
}
// Choix d'unités : tic plus doux encore, au plus un toutes les 0,2 s
function rtsSonChoix(){
  RSON.moments.choix = (RSON.moments.choix || 0) + 1;
  if (!rsOk() || !rsAttente('choix', .2)) return false;
  return Snd._voix('ui', 1, () => { const t = Snd.ctx.currentTime; rsO(t, 'sine', 1300, 1500, .035, .035); });
}
// Unité perdue : explosion placée, puis (au plus toutes les 1,5 s) une note qui descend
function rtsSonPerte(u){
  RSON.moments.perte = (RSON.moments.perte || 0) + 1;
  if (!rsOk() || !u || !u.g) return false;
  const p = u.g.position, air = typeof rtsIsAir === 'function' && rtsIsAir(u), boom = rsBoomRecette(air ? 4 : 2.5, false);
  const r = rsJouer('perte', p.x, p.y, p.z, (t, out) => { const d = boom(t, out); rsN(t + .05, 'bandpass', 1800, 4, .25, .2, out, 600); return d; }, {});
  if (rsAttente('perteNote', 1.5)) Snd._voix('ui', 2, () => { const t = Snd.ctx.currentTime + .15; rsO(t, 'sine', 660, 0, .18, .07); rsO(t + .16, 'sine', 440, 0, .3, .07); });
  return r;
}
// Bâtiment détruit : explosion à la taille du bâtiment, métal qui s'écroule
function rtsSonBatPerdu(o){
  if (!rsOk() || !o) return false;
  const boom = rsBoomRecette((o.r || 2) * 1.5, false);
  return rsJouer('perte', o.x, 2, o.z, (t, out) => { const d = boom(t, out); rsN(t + .1, 'bandpass', 1100, 2, .9, .18, out, 300, .05); return d; }, {});
}
// QG tombé (ou fin de la partie) : grosse explosion à la base, puis notes graves qui descendent si c'est perdu
function rtsSonFin(won){
  const Q = typeof RTS === 'object' ? RTS.base : null;
  if (rsOk() && Q) rsJouer('nid', Q.x, 2, Q.z, rsBoomRecette(12, true), { vol:1.2 });
  return rsMoment('fin', 3, t => {
    if (!won){ [220, 196, 165, 147].forEach((f, i) => rsNappe(t + .6 + i * .4, Snd._out, 'sawtooth', f / 2, 0, .9, .06, .03, 600)); Snd._fin(t + 2.6); }
    else rsO(t, 'sine', 523, 0, .4, .06);
  });
}
// Grognement de fond : la voix d'un zombie vivant, le plus proche de quelques-uns tirés au hasard, placée
function rtsSonGrogne(){
  if (!rsOk() || typeof zombies === 'undefined' || !zombies.length || typeof Snd.zvoix !== 'function') return false;
  let best = null, bd = 1e12;
  const C = RSON.ecoute || (RTS.pilot ? camera.position : RTS.cam);
  for (let i = 0; i < 6; i++){ const z = zombies[Math.floor(Math.random() * zombies.length)]; if (!z || z.dead || !z.g) continue; const d = (z.g.position.x - C.x) ** 2 + (z.g.position.z - C.z) ** 2; if (d < bd){ bd = d; best = z; } }
  if (!best) return false;
  const p = best.g.position, s = rsSpot(p.x, p.y + 1.5, p.z, 22);
  if (s.vol < RSON.seuil) return false;
  const c = Snd.ctx; let g = null; const ns = [];
  try {
    g = c.createGain(); g.gain.value = s.vol; let n = g;
    if (s.fc < 12000){ const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = s.fc; n.connect(lp); n = lp; ns.push(lp); }
    if (c.createStereoPanner){ const pn = c.createStereoPanner(); pn.pan.value = s.pan; n.connect(pn); n = pn; ns.push(pn); }
    n.connect(Snd._bus('monde') || Snd.master);
  } catch (e) { errNote(e); return false; }
  const o = Snd._out; Snd._out = g; let r = false;
  try { r = Snd.zvoix(best.type); } finally { Snd._out = o; }
  setTimeout(() => { try { g.disconnect(); ns.forEach(x => x.disconnect()); } catch (e) { errNote(e); } }, 4000);
  return r;
}

/* ---------- Moteur du véhicule piloté ---------- */
function rsMoteurType(u){
  const U = u.U || {};
  if (U.gunship) return 'helices';
  if (U.kind === 'air') return 'jet';
  if (U.kind === 'heli') return 'heli';
  if (u.type === 'tank') return 'tank';
  if (U.big) return 'mech';
  return 'robot';
}
// Fabrique les nœuds d'un moteur ; maj(ch) règle le régime (0 au ralenti, 1 à fond)
function rsMoteurFait(type){
  const c = Snd.ctx, t = c.currentTime, src = [], out = c.createGain(); out.gain.setValueAtTime(.0001, t); out.gain.linearRampToValueAtTime(1, t + .4);
  if (!RSON.motBus || RSON.motBus.context !== c){ RSON.motBus = c.createGain(); RSON.motBus.gain.value = RSON_MIX.moteur; RSON.motBus.connect(Snd._bus('arme') || Snd.master); }
  out.connect(RSON.motBus);
  const osc = (ty, f) => { const o = c.createOscillator(); o.type = ty; o.frequency.value = f; o.start(t); src.push(o); return o; };
  const bruit = rate => { const s = c.createBufferSource(); s.buffer = Snd.brown || Snd.noise; s.loop = true; s.playbackRate.value = rate || 1; s.start(t, Math.random() * 2); src.push(s); return s; };
  const filtre = (ty, f, q) => { const b = c.createBiquadFilter(); b.type = ty; b.frequency.value = f; if (q) b.Q.value = q; return b; };
  const gain = v => { const g = c.createGain(); g.gain.value = v; return g; };
  const chaine = (...L) => { for (let i = 0; i < L.length - 1; i++) L[i].connect(L[i + 1]); return L[L.length - 1]; };
  // Volume qui bat (chenilles, pales) : base + profondeur × oscillateur basse fréquence
  const bat = (hz, ty, prof) => { const am = gain(1 - prof), l = osc(ty || 'sine', hz), lg = gain(prof); l.connect(lg); lg.connect(am.gain); return { am, l }; };
  const M = { type, out, src, maj:() => {} };
  const T = (p, v) => p.setTargetAtTime(v, c.currentTime, .15);
  if (type === 'tank'){ // diesel grave, chenilles qui claquent, grondement
    const d1 = osc('sawtooth', 32), d2 = osc('square', 64.6), lp = filtre('lowpass', 260), gd = gain(.1); d1.connect(lp); d2.connect(lp); chaine(lp, gd, out);
    const ch = bat(7, 'square', .8), nb = bruit(1.4), bp = filtre('bandpass', 1100, 1.5), gc = gain(.1); chaine(nb, bp, ch.am, gc, out);
    const rb = bruit(.6), rl = filtre('lowpass', 150), gr = gain(.15); chaine(rb, rl, gr, out);
    M.maj = ch2 => { T(d1.frequency, 32 + 16 * ch2); T(d2.frequency, 64.6 + 32 * ch2); T(lp.frequency, 260 + 300 * ch2); T(ch.l.frequency, 4 + 8 * ch2); T(gc.gain, .08 + .2 * ch2); T(gd.gain, .1 + .05 * ch2); };
  } else if (type === 'heli'){ // pales qui battent (« wop-wop »), corps grave, sifflement de turbine
    const p = bat(11, 'sawtooth', .85), nb = bruit(1), lp = filtre('lowpass', 900), gp = gain(1); chaine(nb, lp, p.am, gp, out);
    const b1 = osc('triangle', 55), gb = gain(.22), pb = bat(11, 'square', .7); chaine(b1, pb.am, gb, out);
    const tu = osc('sine', 1900), gt = gain(.02); chaine(tu, gt, out);
    M.maj = ch2 => { T(p.l.frequency, 10.5 + 1.5 * ch2); T(pb.l.frequency, 10.5 + 1.5 * ch2); T(tu.frequency, 1900 + 400 * ch2); T(gp.gain, .9 + .35 * ch2); };
  } else if (type === 'jet'){ // réacteur : souffle large, grondement, sifflement aigu
    const nb = bruit(2), bp = filtre('bandpass', 900, .6), gs = gain(.7); chaine(nb, bp, gs, out);
    const rb = bruit(.7), rl = filtre('lowpass', 260), gr = gain(.5); chaine(rb, rl, gr, out);
    const wh = osc('sine', 3200), gw = gain(.01); chaine(wh, gw, out);
    M.maj = ch2 => { T(bp.frequency, 800 + 700 * ch2); T(gs.gain, .55 + .35 * ch2); T(wh.frequency, 3000 + 900 * ch2); };
  } else if (type === 'helices'){ // AC-130 : quatre turbopropulseurs qui battent entre eux, souffle des hélices
    const a = osc('sawtooth', 98), b = osc('sawtooth', 99.3), lp = filtre('lowpass', 520), h = bat(19, 'sine', .3), ga = gain(.2); a.connect(lp); b.connect(lp); chaine(lp, h.am, ga, out);
    const nb = bruit(1), bp = filtre('bandpass', 260, .8), gn = gain(.5); chaine(nb, bp, gn, out);
    M.maj = ch2 => { T(a.frequency, 96 + 6 * ch2); T(b.frequency, 97.3 + 6 * ch2); };
  } else if (type === 'mech'){ // grand robot : bourdonnement hydraulique grave, servomoteurs qui sifflent en marchant
    const hm = osc('sawtooth', 45), lp = filtre('lowpass', 180), gh = gain(.28); chaine(hm, lp, gh, out);
    const sv = osc('triangle', 380), gs = gain(.0001), sl = filtre('lowpass', 1400); chaine(sv, sl, gs, out);
    M.maj = ch2 => { T(sv.frequency, 380 + 320 * ch2); T(gs.gain, .0001 + .1 * ch2); T(hm.frequency, 45 + 8 * ch2); };
  } else { // petit robot : moteur électrique qui siffle, ronron discret
    const wh = osc('triangle', 600), lp = filtre('lowpass', 1500), gw = gain(.03); chaine(wh, lp, gw, out);
    const hm = osc('sine', 120), gh = gain(.14); chaine(hm, gh, out);
    M.maj = ch2 => { T(wh.frequency, 600 + 500 * ch2); T(gw.gain, .03 + .08 * ch2); };
  }
  return M;
}
function rsMoteurStop(){
  const M = RSON.mot; RSON.mot = null; if (!M || !Snd.ctx) return;
  try { const t = Snd.ctx.currentTime; M.out.gain.cancelScheduledValues(t); M.out.gain.setTargetAtTime(.0001, t, .08); M.src.forEach(s => s.stop(t + .5)); } catch (e) { errNote(e); }
  setTimeout(() => { try { M.out.disconnect(); } catch (e) { errNote(e); } }, 700);
}
function rsMoteurTick(dt){
  const P2 = typeof RTS === 'object' ? RTS.pilot : null;
  const u = P2 && !P2.B && !P2.dead && RTS.on && state === 'rts' && !RTS.paused ? P2 : null;
  const type = u && rsAudio() ? rsMoteurType(u) : null;
  if (RSON.mot && (RSON.mot.type !== type || RSON.mot.u !== u)) rsMoteurStop();
  if (!type) return;
  if (!RSON.mot){ try { RSON.mot = rsMoteurFait(type); RSON.mot.u = u; RSON.mot.ch = 0; RSON.moteurs = (RSON.moteurs || 0) + 1; } catch (e) { errNote(e); RSON.mot = null; return; } }
  const pv = RTS.pv || {}, mv = pv.mv || {}, j = pv.joy || {};
  const ent = Math.min(1, Math.abs((mv.f ? 1 : 0) - (mv.b ? 1 : 0) - (j.dy || 0)) + Math.abs((mv.r ? 1 : 0) - (mv.l ? 1 : 0) + (j.dx || 0)));
  const want = type === 'jet' || type === 'helices' || type === 'heli' ? .45 + .55 * ent : ent;
  const M = RSON.mot; M.ch += (want - M.ch) * Math.min(1, (dt || 0) * 3);
  try { M.maj(M.ch); } catch (e) { errNote(e); }
}

/* ---------- Chaque image ---------- */
Jeu.on('image', dt => {
  RSON.img++;
  try {
    if (Snd.ctx && RSON.voix.length) rsPurge(rsNow());
    rsMoteurTick(dt);
  } catch (e) { errNote(e); }
});

/* ---------- Mesures hors ligne ---------- */
// Rend un son (ou un scénario) dans un OfflineAudioContext avec toute la chaîne de sortie de Snd (limiteur compris),
// le volume au maximum. jouer(off) est appelé à 0,5 s (le limiteur est chaud) ; etapes : [temps, fonction] en plus.
// Rend { pic, court, cell } en dBFS (court : RMS le plus fort sur 50 ms ; cell : la même chose après un passe-haut à 300 Hz)
// et actif : part des fenêtres de 50 ms où la crête passe le seuil du limiteur (-6 dBFS).
const RS_SND_K = ['ctx', 'master', 'lim', 'buses', 'fxBus', 'rev', 'qb', 'ambBus', 'musBus', 'mg', 'voix', 'on', '_out', '_autoV', '_vg', '_vEnd', 'lastShot', 'mgFiring'];
const RS_RS_K = ['bus', 'busRev', 'motBus', 'mot', 'voix', 'cles', 'nCles', 'forcer', 'ecoute', 'decal', 'cd'];
function rsRendre(duree, jouer, etapes){
  const sr = 44100, off = new OfflineAudioContext(1, Math.round(sr * duree), sr);
  const s0 = {}, r0 = {}, e = {}, er = {};
  RS_SND_K.forEach(k => { s0[k] = Snd[k]; }); RS_RS_K.forEach(k => { r0[k] = RSON[k]; });
  Snd.ctx = off; Snd.on = true; Snd.buses = null; Snd.fxBus = Snd.qb = Snd.ambBus = Snd.musBus = Snd.mg = Snd._autoV = Snd._out = Snd._vg = null; Snd.voix = []; Snd.lastShot = -1;
  Snd._chaine();
  RSON.bus = RSON.busRev = RSON.motBus = RSON.mot = null; RSON.voix = []; RSON.cles = {}; RSON.nCles = 0; RSON.forcer = true; RSON.ecoute = { x:0, z:0, h:0 }; RSON.decal = 0; RSON.cd = {};
  RS_SND_K.forEach(k => { e[k] = Snd[k]; Snd[k] = s0[k]; }); RS_RS_K.forEach(k => { er[k] = RSON[k]; RSON[k] = r0[k]; });
  const dans = f => { const s2 = {}, r2 = {}; RS_SND_K.forEach(k => { s2[k] = Snd[k]; Snd[k] = e[k]; }); RS_RS_K.forEach(k => { r2[k] = RSON[k]; RSON[k] = er[k]; });
    try { f(off); } catch (x) { errNote(x); } finally { RS_SND_K.forEach(k => { e[k] = Snd[k]; Snd[k] = s2[k]; }); RS_RS_K.forEach(k => { er[k] = RSON[k]; RSON[k] = r2[k]; }); } };
  const L = [[.5, jouer]].concat(etapes || []);
  L.forEach(x => { off.suspend(Math.round(x[0] * sr / 128) * 128 / sr).then(() => { dans(x[1]); off.resume(); }); });
  return off.startRendering().then(buf => rsAnalyse(buf.getChannelData(0), sr, .5));
}
function rsAnalyse(d, sr, debut){
  const i0 = Math.round(debut * sr), w = Math.round(sr * .05), db = x => x > 1e-6 ? Math.round(200 * Math.log10(x)) / 10 : -120;
  // passe-haut à 300 Hz (filtre biquad, formules de R. Bristow-Johnson)
  const f0 = 300, Q = .707, a = 2 * Math.PI * f0 / sr, al = Math.sin(a) / (2 * Q), cs = Math.cos(a), a0 = 1 + al;
  const b0 = (1 + cs) / 2 / a0, b1 = -(1 + cs) / a0, b2 = b0, a1 = -2 * cs / a0, a2 = (1 - al) / a0;
  let pk = 0, x1 = 0, x2 = 0, y1 = 0, y2 = 0, best = 0, bestH = 0, e = 0, eh = 0, n = 0, wpk = 0, act = 0, fen = 0;
  for (let i = i0; i < d.length; i++){
    const x = d[i], y = b0 * x + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2; x2 = x1; x1 = x; y2 = y1; y1 = y;
    const v = Math.abs(x); if (v > pk) pk = v; if (v > wpk) wpk = v;
    e += x * x; eh += y * y;
    if (++n === w){ best = Math.max(best, Math.sqrt(e / w)); bestH = Math.max(bestH, Math.sqrt(eh / w)); if (wpk > .5) act++; fen++; e = eh = 0; n = 0; wpk = 0; }
  }
  return { pic:db(pk), court:db(best), cell:db(bestH), actif:fen ? Math.round(100 * act / fen) : 0, picLin:pk };
}
// Liste des sons mesurés : ceux du RTS (de près, sans placement) et quelques sons du toit pour comparer
function rsListeMesures(){
  const L = [];
  const tir = (nom, fam, o) => L.push({ nom, groupe:'RTS', duree:3, jouer:() => rsJouer(fam, 0, 0, 0, RS_TIR[fam], Object.assign({ proche:true }, o)) });
  tir('Fusil (fantassin)', 'fusil'); tir('Mitrailleuse', 'mitrailleuse'); tir('Minigun (Mech vu de loin)', 'minigun'); tir('Brrrt (chasseur, Warthog, Apache)', 'brrrt');
  tir('Tir d’élite', 'elite'); tir('Canon du tank', 'canon'); tir('Tourelle canon', 'canon', { petit:true }); tir('40 mm', 'canon40'); tir('Roquette', 'roquette');
  tir('Missile Hellfire', 'missile'); tir('Mortier (départ)', 'mortier'); tir('Mortier (chute)', 'mortier', { chute:true }); tir('105 mm (départ)', 'obus105');
  tir('Laser', 'laser'); tir('Tesla', 'tesla'); tir('Lance-flammes', 'feu'); tir('Crachat du Béhémoth', 'crachat'); tir('Onde du Titan', 'onde');
  [[3.5, 'Explosion 3,5 m (lance-roquettes)'], [6.5, 'Explosion 6,5 m (tank)'], [11, 'Explosion 11 m (105 mm)']].forEach(x => L.push({ nom:x[1], groupe:'RTS', duree:6, jouer:() => rsJouer('explosion', 0, 0, 0, rsBoomRecette(x[0], x[0] > 10), { proche:true }) }));
  const mom = (nom, f, duree) => L.push({ nom, groupe:'Moment', duree:duree || 4, jouer:f });
  mom('Alerte (bâtiment)', () => rtsSonAlerte(0)); mom('Alerte (QG sous 25 %)', () => rtsSonAlerte(5)); mom('Sirène du siège', () => rtsSonSiege(), 5);
  mom('Début du siège', () => rtsSonSiegeDebut()); mom('Sortie de la Ruche (cri)', () => rtsSonRuche(), 5.5); mom('Vallée libérée', () => rtsSonLiberee());
  mom('Nid détruit', () => rtsJouerProche('nid', (t, out) => { rsN(t, 'lowpass', 1200, 2, .6, .4, out, 150); return rsBoomRecette(6)(t, out); }), 5);
  mom('Bâtiment posé', () => rtsSonBatiment()); mom('Unité produite (robot)', () => rtsSonUnite({ U:{ cat:'rob', kind:'ground' } })); mom('Ordre (bip)', () => rtsSonOrdre(), 2);
  ['tank', 'heli', 'jet', 'helices', 'mech', 'robot'].forEach(ty => L.push({ nom:'Moteur : ' + ty, groupe:'Moteur', duree:2.5, jouer:() => { const M = rsMoteurFait(ty); M.maj(.6); RSON.mot = M; } }));
  const toit = (nom, f, duree) => L.push({ nom, groupe:'Toit', duree:duree || 3, jouer:f });
  toit('Toit : fusil (rifle)', () => Snd.shot('rifle')); toit('Toit : fusil à pompe', () => Snd.shot('shotgun')); toit('Toit : grenade (boom 1)', () => Snd.boom(1), 5);
  toit('Toit : début de vague', () => Snd.waveStart(false)); toit('Toit : grognement', () => Snd.zvoix('walker'));
  return L;
}
function rtsJouerProche(fam, f){ return rsJouer(fam, 0, 0, 0, f, { proche:true }); }
// Scénario chargé : 40 unités mixtes autour du centre de l'écran tirent pendant 6 s (4 tourelles, explosions, 2 nids),
// vues de haut (hauteur 56 m). Rend la mesure de sortie et le nombre de voix au pire moment.
function rsScenario40(){
  const types = ['rifle', 'rifle', 'gunner', 'gunner', 'gunner', 'gunner', 'sniper', 'flamebot', 'rocket', 'rocket', 'heavy', 'tank', 'tank', 'heli', 'jet', 'warthog', 'mech', 'bomber'];
  const S2de = t => { const U = RTS_UNITS[t]; return { snd:U.snd, beam:U.beam, pierce:U.pierce, splash:U.splash, flame:U.flame, big:false, rate:U.rate }; };
  let g = 777; const al = () => { g = g * 16807 % 2147483647; return (g - 1) / 2147483646; };
  const U40 = []; for (let i = 0; i < 40; i++){ const t = types[i % types.length]; U40.push({ t, x:al() * 80 - 40, z:al() * 60 - 30, S2:S2de(t) }); }
  ['t_mg', 't_cannon', 't_flame', 't_tesla'].forEach(b => U40.push({ t:b, x:al() * 60 - 30, z:al() * 20, S2:Object.assign({}, RTS_BLD[b].turret, { tier:0 }), rate:RTS_BLD[b].turret.rate }));
  let voixMax = 0, sndMax = 0;
  const etapes = [];
  for (let k = 0; k < 120; k++){
    etapes.push([.55 + k * .05, () => {
      RSON.ecoute.h = 56;
      for (const u of U40){
        const rate = u.rate || u.S2.rate || 1;
        if (al() < rate * .05){ const from = { x:u.x, y:2, z:u.z }, to = { x:u.x + al() * 10 - 5, y:1, z:u.z - 20 }; rtsSonTir(from, to, u.S2); if (u.S2.splash) rtsSonBoom(to.x, to.z, u.S2.splash); }
      }
      if (k === 30 || k === 80) rtsSonNid(al() * 40 - 20, -20);
      if (k % 7 === 0) rtsSonGrogne();
      voixMax = Math.max(voixMax, RSON.voix.filter(v => !v.mourante).length); sndMax = Math.max(sndMax, Snd.voix.length);
    }]);
  }
  return rsRendre(6.8, () => { RSON.ecoute.h = 56; }, etapes).then(r => Object.assign(r, { voixMax, sndMax, cap:RSON_MAX }));
}
// Tout : table des niveaux et scénario chargé (promesse)
function rsMesurer(){
  const L = rsListeMesures(), res = [];
  let p = Promise.resolve();
  L.forEach(m => { p = p.then(() => rsRendre(m.duree, m.jouer).then(r => { res.push(Object.assign({ nom:m.nom, groupe:m.groupe }, r)); })); });
  return p.then(() => rsScenario40()).then(sc => ({ sons:res, scenario:sc }));
}

// Accès pour les tests automatiques et l'outil de mesure
window.__rtsSons = { RSON, RSON_FAM, RSON_MAX, RSON_MIX, RS_TIR, rsFamTir, rsSpot, rsJouer, rsPurge, rsBoomRecette, rsMoteurFait, rsMoteurStop, rsMoteurTick,
  rsRendre, rsAnalyse, rsListeMesures, rsScenario40, mesurer:rsMesurer,
  remise(){ RSON.voix.forEach(rsLibere); RSON.voix = []; RSON.cles = {}; RSON.nCles = 0; RSON.cd = {}; RSON.decal = 0; RSON.ecoute = null; RSON.forcer = false; RSON.pic = 0; RSON.picFam = {}; } };
