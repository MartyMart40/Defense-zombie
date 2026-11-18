'use strict';
/* ================= Robot : sons d'une machine lourde (pas, moteur, armes de l'intérieur, tableau de bord, moments) ================= */
// Dossier 116. Seulement sonore : aucun chiffre de jeu ni visuel ne change. Musique : rien ici.
// Tout passe par les outils de Snd (js/01-son.js) sans les modifier : Snd._voix (budget de voix VOIX_MAX, priorités),
// Snd._nz et Snd._osc (bruit filtré et oscillateur), bus Snd._bus('robot') (machine), 'arme' (armes), 'ui' (tableau de bord
// et moments). Son coupé (Snd.on faux, dt_sound) ou pas d'audio : aucun nœud créé, rien ne joue.
// Branchement : Jeu.on('image') lit l'état du robot (pieds, chaleur, blindage, rue, carrefour, boss) à chaque image.
//   Appel direct : le pas, dans mechStomp (js/39-robot.js), quand un pied des jambes se pose (js/40-robot-habitacle.js).
//   Enveloppes de Snd (comme js/34-arsenal.js) : Snd.shot (armes du robot vues de l'intérieur, à la place du son du toit),
//   Snd.mgTick (minigun plus grave et plus lourde à lancer et à ralentir), Snd.thud (coup sur la coque au lieu du bois).
//   Hors du robot, ces enveloppes laissent passer le son du toit sans rien changer.
// 1. Pas : coup sourd et lourd à chaque pied posé (le vrai pied, pas une minuterie), panoramique léger (gauche, droite),
//    plus fort en courant ou en reculant vite ; grincement de vérin au milieu de chaque pas.
// 2. Machine : fond fait une seule fois en entrant (deux oscillateurs graves, un tampon de bruit bouclé pour la turbine,
//    un oscillateur de servomoteur) dont on règle les gains : monte un peu en marchant, servos quand le torse tourne vite.
//    Arrêté net (et ses nœuds lâchés) en pause, en quittant le robot, à la fin de la course.
// 3. Armes (bras gauche à gauche, bras droit à droite) : roquettes en salve (un départ par tube), lance-grenades,
//    canon électromagnétique qui claque puis se recharge en sifflant, lance-flammes lourd, laser lourd, arc électrique.
// 4. Tableau de bord : alarme de surchauffe (bips qui accélèrent et montent de 75 % à la coupure, une fois par chauffe,
//    réarmée sous 50 %), coupure (vapeur), blindage sous 30 % (alerte une fois, puis bip lent « bip-bop », réarmé au-dessus
//    de 40 %), coup sur la coque (choc métallique, plus grave et plus long pour un gros coup), crachat sur la vitre,
//    chargeur du bras droit de nouveau prêt après avoir été vide, canon électromagnétique rechargé.
// 5. Moments : démarrage et début de rue, carrefour, choix de rue, « Renforts ! », Titan roi (cor grave en trois coups,
//    frappe au sol qui fait trembler l'habitacle, appel à mi-vie), course réussie, robot détruit (extinction de la machine).
// 6. Monstres à parade (dossier 121) : dans js/70-robot-sons-monstres.js depuis le dossier 125. Bélier (élan, charge, fracas,
//    râle), Grappin (cri, choc sur la vitre, grattement en boucle tant qu'il est accroché, couinement), Mortier vivant (tir,
//    sifflement de l'obus, impact).
// Mesures et réglages : docs/robot.md, sections « Sons » et « Dossier 121 ».

const RSN_REGL = {
  pas:   { vol:.55, min:.6, plus:.5, recule:.15, pan:.28 },      // volume d'un pas ; force de .6 à 1,1 selon la vitesse
  grince:{ vol:.13, chance:.7 },
  fond:  { hum:.03, humPlus:.025, turbine:.02, turbinePlus:.015, servo:.06 },
  chaud: { seuil:.75, rearme:.5, lent:.42, vite:.11 },             // bips de surchauffe : intervalle de .42 à .11 s
  bas:   { seuil:.3, rearme:.4, lent:1.7, vite:1.05 },             // bip du blindage bas : intervalle de 1,7 à 1,05 s
  coqueGap: .07,                                                   // coups sur la coque : au plus un toutes les 70 ms (sauf plus gros)
  // Monstres à parade (dossier 121) : distance (m) où le son est entier (pres) et où il tombe au plus bas (loin, min),
  // largeur du panoramique, gain du grattement du Grappin, du sifflement d'un obus qui vise le robot ou qui tombe ailleurs
  mons:  { pres:12, loin:75, min:.4, pan:.7, gratte:.35, siffleVise:.12, siffleLoin:.03 },
  // Niveau de chaque famille de sons (gain de la voix), réglé par mesures hors ligne (docs/robot.md, « Sons »)
  niv: { arme:{ rocket:1.5, gl:1.4, railgun:.7, flamer:1, laser:1, arc:1 }, bipChaud:1.6, bipBas:1.4, crachat:2.5, pret:2, rue:1.4, choix:1.5, renforts:1.6, frappe:1,
    mons:{ elan:1.6, charge:1.3, sonne:1, saut:1.6, accroche:1, decroche:1.5, tir:1, impact:1, gratte:1, siffle:1 } }
};
// Hasard propre aux sons (ne pioche pas dans Math.random : le hasard du jeu et du simulateur reste pareil)
let rsnGr = 7;
const rsnHasard = () => { rsnGr = (rsnGr * 16807) % 2147483647; return (rsnGr - 1) / 2147483646; };
const RSN = { pas:0, grinces:0, alarmesChaud:0, bipsChaud:0, coupures:0, alertesBas:0, bipsBas:0, coques:0, crachats:0, prets:0,
  carrefours:0, choix:0, rues:0, renforts:0, titans:0, frappes:0, appels:0, victoires:0, extinctions:0, tirs:0, fondCrees:0,
  fond:null, voix:[], p:{ state:'' }, poses:[0, 0], pied:0, q:0, chaudArme:false, bipT:0, basArme:false, basT:0, coqueT:-9, coqueK:0,
  dernierPan:0, lastYaw:null, servo:0, mons:{}, grattes:0, grattesStop:0, gratte:null, sifflets:0, siffs:[], obusVus:{} };
const rsnOk = () => typeof Snd === 'object' && !!Snd._ok && Snd._ok();
const rsnTirIci = () => typeof MECH === 'object' && MECH.on && state === 'mech';

/* ---------- Voix : une voix du budget de Snd, placée à gauche ou à droite, gardée pour la couper net ---------- */
// niv : gain de la voix (RSN_REGL.niv), 1 par défaut
function rsnVoix(bus, pri, pan, f, niv){
  if (!rsnOk()) return false;
  const b = typeof bus === 'string' ? Snd._bus(bus) : bus;
  let v = null;
  const r = Snd._voix(b, pri, () => {
    v = Snd._vg;
    const c = Snd.ctx, t = c.currentTime, o = Snd._out;
    let out = o;
    if (pan && c.createStereoPanner){ const p = c.createStereoPanner(); p.pan.value = clamp(pan, -1, 1); p.connect(out); out = p; }
    if (niv != null && niv !== 1){ const g = c.createGain(); g.gain.value = niv; g.connect(out); out = g; }
    Snd._out = out;
    try { f(t, c); } finally { Snd._out = o; }
  });
  if (r && v){ RSN.voix = RSN.voix.filter(x => Snd.voix.indexOf(x) >= 0); RSN.voix.push(v); }
  return r;
}
// Coupe net les voix du robot encore en train de jouer (pause, sortie)
function rsnCouper(){
  if (!Snd || !Snd.ctx) { RSN.voix = []; return; }
  RSN.voix.forEach(v => { const i = Snd.voix.indexOf(v); if (i >= 0){ Snd._couper(v); Snd.voix.splice(i, 1); } });
  RSN.voix = [];
}
const rsnNz = (...a) => Snd._nz(...a), rsnOsc = (...a) => Snd._osc(...a);

/* ---------- 1. Pas ---------- */
// Appelé par mechStomp (js/39-robot.js) quand un pied se pose. Rend true si le pas est compté.
function rsnPas(){
  if (!rsnTirIci()) return false;
  // Quel pied : celui dont le compteur de poses vient de monter (js/40-robot-habitacle.js) ; sinon, chacun son tour
  let s = RSN.pied ? 1 : -1;
  if (typeof HB_JAMBES !== 'undefined' && HB_JAMBES.length === 2){
    for (let i = 0; i < 2; i++) if (HB_JAMBES[i].poses !== RSN.poses[i]){ s = HB_JAMBES[i].s; RSN.poses[i] = HB_JAMBES[i].poses; }
  }
  RSN.pied = s < 0 ? 1 : 0;
  // Force : vitesse de la marche (course plus forte), recul rapide un peu plus fort ; petits pas sur place plus doux
  const R = RSN_REGL.pas, H = typeof HB === 'object' ? HB : null;
  const v = H ? Math.hypot(H.vx || 0, H.vz || 0) : 3, rec = H && H.vz > 1.5;
  const k = R.min + R.plus * clamp(v / 7, 0, 1) + (rec ? R.recule : 0);
  RSN.pas++; RSN.dernierPan = s * R.pan; RSN.dernierK = k;
  rsnVoix('robot', 1, s * R.pan, (t) => {
    const p = rand(.94, 1.06), V = R.vol * k;
    rsnOsc(t, 'sine', 62 * p, 30, .32, .6 * V);                                  // coup sourd sous le pied
    rsnNz(t, 'lowpass', 260 * p, 1, .34, .45 * V, null, 70);                        // masse qui écrase l'asphalte
    rsnOsc(t, 'triangle', 118 * p, 66, .22, .8 * V);                               // harmoniques du coup (s'entendent au cell)
    rsnNz(t + .004, 'bandpass', 820 * p, 3, .08, .7 * V);                          // métal du pied
    rsnOsc(t + .004, 'triangle', 196 * p, 120, .12, .2 * V);                        // résonance de la jambe
    rsnNz(t + .05, 'highpass', 3200, 0, .14, .035 * V, null, 0, .03);              // vérin qui relâche sa pression
    if (Math.random() < .3) for (let i = 0; i < 3; i++) rsnNz(t + rand(.04, .2), 'bandpass', rand(1800, 3200), 6, .025, .03 * V); // gravillons
  });
  return true;
}
// Grincement de vérin entre deux pas (la jambe qui se lève)
function rsnGrince(pan){
  RSN.grinces++;
  rsnVoix('robot', 0, pan, (t, c) => {
    const d = rand(.22, .34), o = c.createOscillator(), f = c.createBiquadFilter(), g = c.createGain();
    o.type = 'sawtooth'; o.frequency.setValueAtTime(rand(130, 160), t); o.frequency.linearRampToValueAtTime(rand(100, 120), t + d);
    f.type = 'bandpass'; f.frequency.value = rand(950, 1250); f.Q.value = 9;
    g.gain.setValueAtTime(.0001, t); g.gain.linearRampToValueAtTime(RSN_REGL.grince.vol, t + .05); g.gain.exponentialRampToValueAtTime(.0005, t + d);
    o.connect(f); f.connect(g); g.connect(Snd._out); o.start(t); o.stop(t + d + .05); Snd._fin(t + d + .05);
    rsnNz(t, 'bandpass', 2400, 2, d * .7, .012, null, 1600, .04);                   // souffle hydraulique
  });
}

/* ---------- 2. Machine : fond fait une fois, gains réglés à chaque image ---------- */
function rsnFondCreer(){
  if (RSN.fond || !rsnOk() || !Snd.noise) return RSN.fond;
  const c = Snd.ctx, t = c.currentTime, F = { ctx:c };
  try {
    F.g = c.createGain(); F.g.gain.value = .0001; F.g.connect(Snd._bus('robot') || Snd.master);
    // Moteur : dent de scie grave adoucie et son octave
    F.o1 = c.createOscillator(); F.o1.type = 'sawtooth'; F.o1.frequency.value = 38;
    F.o2 = c.createOscillator(); F.o2.type = 'sine'; F.o2.frequency.value = 76;
    F.lp = c.createBiquadFilter(); F.lp.type = 'lowpass'; F.lp.frequency.value = 160; F.lp.Q.value = .8;
    F.hum = c.createGain(); F.hum.gain.value = .0001;
    F.o1.connect(F.lp); F.o2.connect(F.lp); F.lp.connect(F.hum); F.hum.connect(F.g);
    // Turbine : le tampon de bruit de Snd, bouclé, dans un passe-bande étroit
    F.nz = c.createBufferSource(); F.nz.buffer = Snd.noise; F.nz.loop = true;
    F.bp = c.createBiquadFilter(); F.bp.type = 'bandpass'; F.bp.frequency.value = 1400; F.bp.Q.value = 8;
    F.tur = c.createGain(); F.tur.gain.value = .0001;
    F.nz.connect(F.bp); F.bp.connect(F.tur); F.tur.connect(F.g);
    // Servomoteurs du torse
    F.o3 = c.createOscillator(); F.o3.type = 'sawtooth'; F.o3.frequency.value = 200;
    F.sf = c.createBiquadFilter(); F.sf.type = 'bandpass'; F.sf.frequency.value = 650; F.sf.Q.value = 4;
    F.srv = c.createGain(); F.srv.gain.value = .0001;
    F.o3.connect(F.sf); F.sf.connect(F.srv); F.srv.connect(F.g);
    F.o1.start(t); F.o2.start(t); F.o3.start(t); F.nz.start(t, Math.random() * 2);
    F.g.gain.setTargetAtTime(1, t, .25);
  } catch (e) { errNote(e); return null; }
  RSN.fondCrees++;
  return (RSN.fond = F);
}
// mort : la machine s'éteint (le moteur descend pendant 2 s) ; sinon arrêt net
function rsnFondStop(mort){
  const F = RSN.fond; RSN.fond = null; if (!F) return;
  try {
    const t = F.ctx.currentTime, fin = mort ? 2.3 : .12;
    F.g.gain.cancelScheduledValues(t); F.g.gain.setValueAtTime(F.g.gain.value, t);
    if (mort){
      F.o1.frequency.cancelScheduledValues(t); F.o1.frequency.setValueAtTime(F.o1.frequency.value, t); F.o1.frequency.exponentialRampToValueAtTime(9, t + 2.2);
      F.o2.frequency.cancelScheduledValues(t); F.o2.frequency.setValueAtTime(F.o2.frequency.value, t); F.o2.frequency.exponentialRampToValueAtTime(18, t + 2.2);
      F.bp.frequency.cancelScheduledValues(t); F.bp.frequency.setValueAtTime(F.bp.frequency.value, t); F.bp.frequency.exponentialRampToValueAtTime(200, t + 2);
      F.g.gain.linearRampToValueAtTime(F.g.gain.value * .8, t + .3); F.g.gain.exponentialRampToValueAtTime(.0001, t + 2.2);
    } else F.g.gain.setTargetAtTime(.0001, t, .025);
    [F.o1, F.o2, F.o3, F.nz].forEach(o => o.stop(t + fin));
    // Nœuds lâchés à la fin : plus rien ne les tient une fois débranchés
    setTimeout(() => { try { F.g.disconnect(); } catch (e) { errNote(e); } }, (fin + .2) * 1000);
  } catch (e) { errNote(e); }
}
function rsnFondRegler(dt){
  const F = RSN.fond; if (!F) return;
  const t = F.ctx.currentTime, R = RSN_REGL.fond, m = typeof HB === 'object' ? clamp(HB.m || 0, 0, 1) : 0;
  // Servos : vitesse à laquelle le torse tourne (rad/s)
  const dy = RSN.lastYaw == null ? 0 : Math.abs(((yaw - RSN.lastYaw) + Math.PI * 3) % (Math.PI * 2) - Math.PI);
  RSN.lastYaw = yaw;
  const vt = dt > 0 ? dy / dt : 0, sk = clamp((vt - .6) / 2.4, 0, 1);
  RSN.servo += (sk - RSN.servo) * Math.min(1, dt * 10);
  F.hum.gain.setTargetAtTime(R.hum + R.humPlus * m, t, .3);
  F.o1.frequency.setTargetAtTime(38 + 7 * m + 3 * RSN.servo, t, .4); F.o2.frequency.setTargetAtTime(76 + 14 * m, t, .4);
  F.tur.gain.setTargetAtTime(R.turbine + R.turbinePlus * m, t, .4); F.bp.frequency.setTargetAtTime(1400 + 500 * m, t, .5);
  F.srv.gain.setTargetAtTime(Math.max(.0001, R.servo * RSN.servo), t, .05); F.o3.frequency.setTargetAtTime(170 + 280 * RSN.servo, t, .06);
}

/* ---------- 3. Armes du robot, vues de l'intérieur ---------- */
// Bras gauche à gauche, bras droit à droite. Chaque fonction joue dans une seule voix.
const rsnSalve = id => 1 + (MECH_W[id] && MECH_W[id].salvo && typeof mUp === 'function' ? mUp('salvo') : 0);
const RSN_ARMES = {
  rocket(t){ // salve : un départ par tube, l'un après l'autre
    const n = rsnSalve('rocket');
    for (let i = 0; i < n; i++){
      const a = t + i * .075, p = rand(.92, 1.08), v = rand(.85, 1);
      rsnOsc(a, 'sine', 95 * p, 42, .2, .5 * v);                                   // coup du tube
      rsnNz(a, 'highpass', 2600, 0, .045, .18 * v);                                 // allumage
      rsnNz(a + .01, 'bandpass', 1100 * p, 1.2, .8, .2 * v, null, 2800, .04);       // souffle qui s'éloigne
      rsnNz(a, 'lowpass', 500, 1, .35, .3 * v, null, 90);                           // la nacelle qui encaisse
      rsnNz(a + .09, 'bandpass', 2300, 6, .03, .07);                                // tube suivant qui tourne
    }
  },
  gl(t){ // « toump » grave du tube, barillet qui tourne
    const n = rsnSalve('gl');
    for (let i = 0; i < n; i++){
      const a = t + i * .06, p = rand(.92, 1.08), v = rand(.85, 1);
      rsnOsc(a, 'sine', 150 * p, 62, .14, .5 * v); rsnNz(a, 'lowpass', 750 * p, 1, .16, .3 * v, null, 150);
      rsnNz(a + .14, 'bandpass', 2500 * p, 7, .03, .1); rsnNz(a + .19, 'bandpass', 1800 * p, 6, .035, .08);
    }
  },
  railgun(t, c){ // claque métallique et décharge ; puis le canon se recharge en sifflant (voix à part, coupée en pause)
    const p = rand(.95, 1.05);
    rsnNz(t, 'highpass', 4200, 0, .05, .45);
    rsnOsc(t, 'triangle', 520 * p, 500, .55, .12); rsnOsc(t, 'triangle', 793 * p, 760, .4, .07); rsnOsc(t, 'sine', 1310 * p, 1290, .25, .04); // coque qui sonne
    rsnOsc(t, 'sine', 58 * p, 22, .6, .75); rsnNz(t, 'lowpass', 800, 1, .5, .5, null, 100);
    rsnOsc(t, 'sawtooth', 3000 * p, 180, .12, .05);
    rsnNz(t + .2, 'bandpass', 700, .8, 1, .12, null, 180, .03);
  },
  flamer(t){ // souffle grave et lourd (appelé 15 fois par seconde : deux couches)
    const v = rand(.8, 1.05); rsnNz(t, 'lowpass', 460 * rand(.85, 1.2), 0, .18, .17 * v, null, 220); rsnOsc(t, 'sine', 52, 40, .18, .05 * v);
  },
  laser(t){
    const p = rand(.92, 1.08), v = rand(.85, 1.05);
    rsnOsc(t, 'sawtooth', 1300 * p, 220, .14, .06 * v); rsnOsc(t, 'square', 650 * p, 120, .1, .025 * v); rsnOsc(t, 'sine', 95, 70, .15, .09 * v);
  },
  arc(t){
    const v = rand(.85, 1.05);
    for (let i = 0; i < 3; i++) rsnNz(t + i * rand(.015, .035), 'bandpass', rand(1400, 3200), rand(3, 7), rand(.025, .05), rand(.1, .17) * v);
    rsnOsc(t, 'square', 46, 42, .22, .06 * v); rsnOsc(t, 'sawtooth', 600, 2000, .05, .025 * v);
  }
};
function rsnArme(kind){
  const side = MECH_W[kind] ? MECH_W[kind].side : 'R', pan = side === 'L' ? -.3 : .3;
  const pri = kind === 'flamer' || kind === 'laser' ? 1 : 2;
  rsnVoix('arme', pri, pan, (t, c) => RSN_ARMES[kind](t, c), RSN_REGL.niv.arme[kind]);
  if (kind === 'railgun') rsnCharge(pan);
}
// Recharge du canon électromagnétique : sifflement qui monte pendant toute l'attente entre deux tirs
function rsnCharge(pan){
  const cd = (MECH_W.railgun.cd || 1.9) * Math.max(.3, 1 - .08 * (typeof mUp === 'function' ? mUp('rrate') : 0));
  rsnVoix('arme', 1, pan, (t, c) => {
    const a = t + .35, d = Math.max(.3, cd - .4), o = c.createOscillator(), g = c.createGain();
    o.type = 'sine'; o.frequency.setValueAtTime(160, a); o.frequency.exponentialRampToValueAtTime(1500, a + d);
    g.gain.setValueAtTime(.0001, a); g.gain.linearRampToValueAtTime(.03, a + d * .9); g.gain.exponentialRampToValueAtTime(.0005, a + d);
    o.connect(g); g.connect(Snd._out); o.start(a); o.stop(a + d + .05); Snd._fin(a + d + .05);
  });
}

/* ---------- 4. Tableau de bord ---------- */
// Surchauffe : deux bips courts, plus aigus quand ça chauffe (h de .75 à 1)
function rsnBipChaud(h){
  RSN.bipsChaud++;
  const f = 1300 + 900 * clamp((h - .75) / .25, 0, 1);
  rsnVoix('ui', 3, -.15, (t) => { rsnOsc(t, 'square', f, f, .05, .035); rsnOsc(t, 'triangle', f, f, .06, .1); rsnOsc(t + .07, 'triangle', f * 1.06, f * 1.06, .05, .08); }, RSN_REGL.niv.bipChaud);
}
// Coupure : relais qui claque, vapeur qui s'échappe, moteur du bras qui tombe
function rsnCoupure(){
  RSN.coupures++;
  rsnVoix('ui', 3, -.25, (t) => {
    rsnNz(t, 'bandpass', 1900, 5, .03, .35); rsnOsc(t, 'sine', 140, 55, .2, .25);
    rsnNz(t + .03, 'highpass', 2800, 0, 1.3, .14, null, 0, .05); rsnNz(t + .03, 'bandpass', 5200, 1, 1.1, .05, null, 2500, .08);
    rsnOsc(t, 'sawtooth', 600, 70, .7, .025);
  });
}
// Refroidi : petit déclic du bras qui revient
function rsnRefroidi(){ rsnVoix('ui', 2, -.2, (t) => { rsnOsc(t, 'triangle', 880, 880, .06, .07); rsnOsc(t + .08, 'triangle', 1320, 1320, .08, .07); }); }
// Blindage sous 30 % : alerte (trois coups de sirène qui descendent), une fois au passage
function rsnAlerteBas(){
  RSN.alertesBas++;
  rsnVoix('ui', 3, 0, (t) => { [[740, 0], [740, .2], [494, .4]].forEach(n => { rsnOsc(t + n[1], 'square', n[0], n[0] * .97, .16, .04); rsnOsc(t + n[1], 'sawtooth', n[0] / 2, n[0] / 2, .16, .05); rsnOsc(t + n[1], 'triangle', n[0], n[0], .17, .12); }); });
}
// Blindage bas : bip lent « bip-bop » électronique (le cœur du toit est grave et sourd ; celui-ci est clair)
function rsnBipBas(k){
  RSN.bipsBas++;
  const v = .09 + .05 * (1 - clamp(k / RSN_REGL.bas.seuil, 0, 1));
  rsnVoix('ui', 3, 0, (t) => { rsnOsc(t, 'triangle', 988, 988, .09, v); rsnOsc(t, 'sine', 1976, 1976, .05, v * .25); rsnOsc(t + .14, 'triangle', 740, 740, .12, v * .9); }, RSN_REGL.niv.bipBas);
}
// Coup sur la coque : choc métallique (k : 0,4 à 2,5 ; plus grave, plus long et avec des pièces qui tremblent quand il est gros)
function rsnCoque(k){
  RSN.coques++;
  const big = k > 1.3, p = rand(.9, 1.1) / Math.sqrt(k), v = Math.min(k, 1.8);
  rsnVoix('robot', big ? 2 : 1, 0, (t) => {
    rsnNz(t, 'bandpass', 2100 * p, 4, .05, .3 * v);
    rsnOsc(t, 'triangle', 410 * p, 390 * p, .25 + .12 * k, .09 * v); rsnOsc(t, 'triangle', 637 * p, 610 * p, .18 + .08 * k, .06 * v); rsnOsc(t, 'sine', 1090 * p, 1060 * p, .12, .03 * v);
    rsnOsc(t, 'sine', 120 * p, 48, .16 + .1 * k, .3 * v); rsnNz(t, 'lowpass', 900 * p, 1, .14 + .06 * k, .25 * v, null, 120);
    if (big) for (let i = 0; i < 4; i++) rsnNz(t + rand(.04, .3), 'bandpass', rand(2500, 4200), 8, .03, .05 * v);  // boulons et vitre qui tremblent
  });
}
// Crachat sur la vitre : éclaboussure mouillée, petit coup sur le verre, acide qui grésille
function rsnCrachat(){
  RSN.crachats++;
  rsnVoix('robot', 1, rand(-.2, .2), (t) => {
    rsnNz(t, 'bandpass', 900, 1.5, .18, .22); rsnOsc(t, 'triangle', 3100, 2900, .06, .05);
    rsnNz(t + .05, 'highpass', 5500, 0, .8, .035, null, 0, .15);
  }, RSN_REGL.niv.crachat);
}
// Bras droit prêt : déclic et deux notes qui montent
function rsnPret(){
  RSN.prets++;
  rsnVoix('ui', 2, .25, (t) => { rsnNz(t, 'bandpass', 3000, 6, .02, .12); rsnOsc(t + .02, 'triangle', 1175, 1175, .06, .07); rsnOsc(t + .09, 'triangle', 1568, 1568, .08, .07); }, RSN_REGL.niv.pret);
}

/* ---------- 5. Moments ---------- */
// Début de rue (et démarrage) : relais, systèmes qui s'allument (trois notes qui montent) ; rue 9 : notes graves, menaçantes
function rsnRue(n, demarre){
  RSN.rues++;
  const der = typeof MECH_FIN === 'object' && n >= MECH_FIN.rues;
  rsnVoix('ui', 3, 0, (t) => {
    if (demarre){ rsnOsc(t, 'sawtooth', 40, 120, .9, .06); rsnNz(t, 'bandpass', 600, 1, .9, .05, null, 2400, .3); rsnNz(t + .9, 'bandpass', 1800, 5, .03, .2); }
    const a = t + (demarre ? .95 : .05), N = der ? [392, 370, 294] : [587, 784, 1175];
    rsnNz(a, 'bandpass', 2200, 5, .03, .2);
    N.forEach((f, i) => { rsnOsc(a + .08 + i * .12, 'triangle', f, f, .14, .1); rsnOsc(a + .08 + i * .12, 'square', f, f, .08, .02); });
    if (der) rsnOsc(a + .08, 'sawtooth', 73, 70, 1, .05);
  }, RSN_REGL.niv.rue);
}
// Carrefour : le robot s'arrête (vérins qui soufflent), le radar cherche les rues (deux échos)
function rsnCarrefour(){
  RSN.carrefours++;
  rsnVoix('ui', 3, 0, (t) => {
    rsnNz(t, 'highpass', 2600, 0, .7, .08, null, 0, .05); rsnOsc(t, 'sine', 80, 45, .4, .2);
    [.35, .75].forEach(d => { rsnOsc(t + d, 'sine', 1250, 1240, .5, .06); rsnOsc(t + d + .05, 'sine', 1250, 1240, .35, .025); });
  });
}
// Choix de rue : confirmation et moteur qui reprend
function rsnChoix(){
  RSN.choix++;
  rsnVoix('ui', 3, 0, (t) => {
    rsnOsc(t, 'triangle', 880, 880, .07, .1); rsnOsc(t + .08, 'triangle', 1320, 1320, .1, .1);
    rsnOsc(t + .1, 'sawtooth', 45, 95, .7, .05); rsnNz(t + .1, 'bandpass', 900, 1.5, .7, .04, null, 2200, .2);
  }, RSN_REGL.niv.choix);
}
// « Renforts ! » : corne d'alerte grave, deux coups
function rsnRenforts(){
  RSN.renforts++;
  rsnVoix('ui', 3, 0, (t) => { [0, .42].forEach(d => { rsnOsc(t + d, 'sawtooth', 185, 175, .34, .07); rsnOsc(t + d, 'square', 92, 90, .34, .05); rsnOsc(t + d, 'triangle', 370, 360, .3, .06); }); }, RSN_REGL.niv.renforts);
}
// Titan roi : cor très grave en trois coups (le dernier qui tombe), qu'on reconnaît ; sous-grave qui fait vibrer la coque
function rsnTitan(){
  RSN.titans++;
  rsnVoix('ui', 3, 0, (t, c) => {
    [[55, 0, .7], [55, .8, .7], [41, 1.6, 1.5]].forEach(n => {
      const a = t + n[1], d = n[2], fl = c.createBiquadFilter(), g = c.createGain();
      fl.type = 'lowpass'; fl.frequency.setValueAtTime(180, a); fl.frequency.linearRampToValueAtTime(900, a + .15); fl.frequency.linearRampToValueAtTime(300, a + d);
      g.gain.setValueAtTime(.0001, a); g.gain.linearRampToValueAtTime(.16, a + .06); g.gain.setValueAtTime(.16, a + d * .7); g.gain.exponentialRampToValueAtTime(.001, a + d);
      [1, 1.007, 1.5].forEach(m => { const o = c.createOscillator(); o.type = 'sawtooth'; o.frequency.value = n[0] * m; o.connect(fl); o.start(a); o.stop(a + d + .05); });
      fl.connect(g); g.connect(Snd._out);
      rsnOsc(a, 'sine', n[0] * .6, n[0] * .5, d, .25);
    });
    Snd._fin(t + 3.2);
    for (let i = 0; i < 5; i++) rsnNz(t + rand(.1, 2.6), 'bandpass', rand(2600, 4000), 8, .03, .04);       // la vitre qui vibre
  });
}
// Frappe au sol d'un Titan : la rue tremble sous les pieds, tout tremble dans l'habitacle
function rsnFrappe(roi){
  RSN.frappes++;
  rsnVoix('robot', 2, 0, (t) => {
    rsnOsc(t, 'sine', 44, 24, .9, roi ? .32 : .24); rsnNz(t, 'lowpass', 320, 1, 1.1, .2, null, 60);
    for (let i = 0; i < 7; i++) rsnNz(t + .05 + i * rand(.05, .09), 'bandpass', rand(2200, 4200), 9, .025, rand(.07, .12));
    rsnOsc(t + .06, 'triangle', 330, 320, .5, .08); rsnOsc(t + .06, 'triangle', 517, 505, .35, .05);   // la coque qui résonne
  }, RSN_REGL.niv.frappe);
}
// Appel du Titan roi à mi-vie : hurlement qui monte et tient, sur un cor grave
function rsnAppel(){
  RSN.appels++;
  rsnVoix('ui', 3, 0, (t, c) => {
    const d = 2, o = c.createOscillator(), f1 = c.createBiquadFilter(), f2 = c.createBiquadFilter(), g = c.createGain();
    o.type = 'sawtooth'; o.frequency.setValueAtTime(70, t); o.frequency.linearRampToValueAtTime(150, t + .6); o.frequency.linearRampToValueAtTime(120, t + d);
    f1.type = 'bandpass'; f1.frequency.value = 520; f1.Q.value = 4; f2.type = 'bandpass'; f2.frequency.value = 1100; f2.Q.value = 6;
    g.gain.setValueAtTime(.0001, t); g.gain.linearRampToValueAtTime(.5, t + .25); g.gain.setValueAtTime(.5, t + d * .7); g.gain.exponentialRampToValueAtTime(.001, t + d);
    o.connect(f1); o.connect(f2); f1.connect(g); f2.connect(g); g.connect(Snd._out); o.start(t); o.stop(t + d + .05); Snd._fin(t + d + .05);
    rsnOsc(t, 'sawtooth', 41, 41, 1.8, .06); rsnNz(t, 'bandpass', 700, 1.2, 1.6, .1, null, 300, .2);
  });
}
// Course réussie : la machine souffle (vapeur), le moteur se pose au ralenti, un carillon doux (la fanfare de js/40 joue aussi)
function rsnVictoire(){
  RSN.victoires++;
  rsnVoix('ui', 3, 0, (t) => {
    rsnNz(t, 'highpass', 2200, 0, 1.6, .1, null, 0, .1);
    rsnOsc(t, 'sawtooth', 90, 38, 1.4, .05);
    [[1568, .9], [2093, 1.05]].forEach(n => { rsnOsc(t + n[1], 'sine', n[0], n[0], 1, .05); rsnOsc(t + n[1], 'sine', n[0] * 2.76, n[0] * 2.76, .3, .012); });
  });
}
// Robot détruit : la machine s'éteint (moteur qui descend, relais qui lâchent, étincelles, dernier choc)
function rsnExtinction(){
  RSN.extinctions++;
  rsnFondStop(true);
  rsnVoix('ui', 3, 0, (t, c) => {
    const o = c.createOscillator(), f = c.createBiquadFilter(), g = c.createGain(), d = 2.4;
    o.type = 'sawtooth'; o.frequency.setValueAtTime(900, t + .1); o.frequency.exponentialRampToValueAtTime(35, t + d);
    f.type = 'lowpass'; f.frequency.setValueAtTime(2400, t); f.frequency.exponentialRampToValueAtTime(200, t + d);
    g.gain.setValueAtTime(.0001, t); g.gain.linearRampToValueAtTime(.06, t + .2); g.gain.exponentialRampToValueAtTime(.0005, t + d);
    o.connect(f); f.connect(g); g.connect(Snd._out); o.start(t); o.stop(t + d + .05); Snd._fin(t + d + .05);
    [.25, .7, 1.25, 1.9].forEach((a, i) => { rsnNz(t + a, 'bandpass', 1700 - i * 250, 5, .035, .22); rsnOsc(t + a, 'sine', 130 - i * 15, 60, .12, .12); });  // relais
    for (let i = 0; i < 6; i++) rsnNz(t + rand(.2, 1.6), 'highpass', rand(4000, 7000), 0, rand(.01, .03), rand(.06, .12));                  // étincelles
    rsnOsc(t + 2.3, 'sine', 70, 30, .5, .3); rsnNz(t + 2.3, 'lowpass', 400, 1, .5, .25, null, 80);                                        // le robot s'affaisse
  });
}

/* ---------- Chaque image : lire l'état du robot ---------- */
function rsnEntree(){
  const p = RSN.p;
  p.street = MECH.street; p.renf = MECH.renf || 0; p.choosing = !!MECH.choosing; p.finBoss = MECH.finBoss || null; p.finMoitie = !!MECH.finMoitie;
  p.won = !!MECH.won; p.hot = MECH.hot > 0; p.stomps = typeof MB === 'object' ? MB.stomps : 0;
  p.rchN = Math.floor(MECH.rch || 0); p.rcd = MECH.rcd || 0;
  if (typeof HB_JAMBES !== 'undefined') HB_JAMBES.forEach((J, i) => { RSN.poses[i] = J.poses; });
  RSN.chaudArme = false; RSN.basArme = false; RSN.lastYaw = null; RSN.servo = 0; RSN.q = typeof HB === 'object' ? Math.floor((HB.phi + Math.PI / 2) / Math.PI) : 0;
  if (typeof spits !== 'undefined') spits.forEach(o => { o._rsnV = o.m.visible; });
  rsnRue(MECH.street, true);
}
function rsnSortie(){ rsnFondStop(false); rsnCouper(); rsnMonstresRien(); RSN.obusVus = {}; RSN.p = { state:'' }; }
function rsnImage(dt){
  dt = dt || 0;
  if (typeof MECH !== 'object') return;
  if (!MECH.on || (state !== 'mech' && state !== 'mechover')){ if (RSN.p.state) rsnSortie(); return; }
  const p = RSN.p, st = state;
  if (st === 'mech' && p.state !== 'mech'){ p.state = st; rsnEntree(); }
  // Pause (pas le carrefour) : tout s'arrête net, rien ne change
  if (st === 'mech' && MECH.paused && !MECH.choosing){ if (RSN.fond || RSN.voix.length){ rsnFondStop(false); rsnCouper(); } rsnMonstresRien(); return; }
  // Fin de la course : victoire ou extinction
  if (st === 'mechover' && p.state === 'mech'){
    rsnMonstresRien();
    if (MECH.won) { rsnFondStop(false); rsnVictoire(); } else rsnExtinction();
    p.state = st; return;
  }
  p.state = st;
  if (st !== 'mech'){ if (RSN.fond) rsnFondStop(false); rsnMonstresRien(); return; }
  // Machine : le fond tourne tant qu'on est dans la course (au carrefour aussi, au ralenti)
  if (rsnOk()){ if (!RSN.fond) rsnFondCreer(); } else if (RSN.fond) rsnFondStop(false);
  rsnFondRegler(dt);
  // Monstres : grattement tant qu'un Grappin est sur la vitre (et pas au carrefour), sifflement des obus en vol
  const grv = !MECH.paused && rsnGrappinVitre();
  if (grv && !RSN.gratte && rsnOk()) rsnGratteCreer(); else if (!grv && RSN.gratte) rsnGratteStop();
  if (RSN.siffs.length || (typeof MR2_OBUS !== 'undefined' && MR2_OBUS.some(o => o.actif))) rsnSiffletsSync();
  // Grincement de vérin au milieu de chaque pas
  if (typeof HB === 'object'){
    const q = Math.floor((HB.phi + Math.PI / 2) / Math.PI);
    if (q !== RSN.q){ RSN.q = q; if (HB.m > .25 && rsnHasard() < RSN_REGL.grince.chance) rsnGrince(-RSN.dernierPan * .8); }
  }
  // Moments
  if (MECH.street !== p.street){ p.street = MECH.street; p.renf = MECH.renf || 0; rsnRue(MECH.street, false); }
  if ((MECH.renf || 0) > p.renf) rsnRenforts();
  p.renf = MECH.renf || 0;
  if (!!MECH.choosing !== p.choosing){ p.choosing = !!MECH.choosing; if (p.choosing) rsnCarrefour(); else rsnChoix(); }
  if (MECH.finBoss && MECH.finBoss !== p.finBoss) rsnTitan();
  p.finBoss = MECH.finBoss || null;
  if (MECH.finMoitie && !p.finMoitie) rsnAppel();
  p.finMoitie = !!MECH.finMoitie;
  if (typeof MB === 'object' && MB.stomps > p.stomps) rsnFrappe(!!(MECH.finBoss && !MECH.finBoss.dead));
  p.stomps = typeof MB === 'object' ? MB.stomps : 0;
  // Surchauffe : alarme au seuil (une fois par chauffe), bips qui accélèrent, coupure, refroidi
  const C = RSN_REGL.chaud, h = MECH.heat || 0, hot = MECH.hot > 0;
  if (hot && !p.hot) rsnCoupure();
  else if (!hot && p.hot) rsnRefroidi();
  p.hot = hot;
  if (!hot && h < C.rearme) RSN.chaudArme = false;
  if (!hot && h >= C.seuil){
    const iv = C.lent + (C.vite - C.lent) * clamp((h - C.seuil) / (1 - C.seuil), 0, 1);
    if (!RSN.chaudArme){ RSN.chaudArme = true; RSN.alarmesChaud++; RSN.bipT = iv; rsnBipChaud(h); }
    else { RSN.bipT -= dt; if (RSN.bipT <= 0){ RSN.bipT = iv; rsnBipChaud(h); } }
  }
  // Blindage bas : alerte au passage sous 30 %, puis bip lent ; réarmé au-dessus de 40 %
  if (typeof S === 'object' && S && S.barMax > 0){
    const B = RSN_REGL.bas, k = S.bar / S.barMax;
    if (k > B.rearme) RSN.basArme = false;
    if (k < B.seuil && S.bar > 0){
      if (!RSN.basArme){ RSN.basArme = true; RSN.basT = B.lent; rsnAlerteBas(); }
      else { RSN.basT -= dt; if (RSN.basT <= 0){ RSN.basT = B.lent + (B.vite - B.lent) * (1 - k / B.seuil); rsnBipBas(k); } }
    }
  }
  // Bras droit : chargeur de nouveau prêt après avoir été vide ; canon électromagnétique rechargé
  const WR = MECH_W[mW('R')] || {}, n = Math.floor(MECH.rch || 0);
  if (WR.ch && n >= 1 && p.rchN === 0) rsnPret();
  if (mW('R') === 'railgun' && p.rcd > 0 && MECH.rcd <= 0) rsnPret();
  p.rchN = n; p.rcd = MECH.rcd || 0;
  // Crachats qui touchent la vitre (le robot ne s'est pas écarté)
  if (typeof spits !== 'undefined'){
    const esq = typeof SPIT_ESQUIVE === 'number' ? SPIT_ESQUIVE : 2.6;
    for (const o of spits){
      const v = o.m.visible;
      if (o._rsnV && !v && o.t >= o.T && Math.abs(MECH.x - o.b.x) <= esq) rsnCrachat();
      o._rsnV = v;
    }
  }
}
Jeu.on('image', dt => { try { rsnImage(dt); } catch (e) { errNote(e); } });

/* ---------- Enveloppes de Snd : dans le robot, le son de la machine ; ailleurs, le son du toit ---------- */
try {
  const _s = Snd.shot;
  Snd.shot = function(kind){
    if (!rsnTirIci() || !RSN_ARMES[kind]) return _s.apply(this, arguments);
    this.shotN++; RSN.tirs++;
    if (rsnOk()) rsnArme(kind);
    return true;
  };
} catch (e) { errNote(e); }
// Minigun du robot : moteur plus grave, plus lent à lancer et à ralentir, rafale plus sourde
try {
  const _mg = Snd.mgTick;
  Snd.mgTick = function(sp){
    const r = _mg.apply(this, arguments);
    const M = this.mg;
    if (M && rsnTirIci()){
      try {
        const t = this.ctx.currentTime; sp = clamp(+sp || 0, 0, 1);
        M.mo.frequency.setTargetAtTime(55 + 330 * sp, t, .12); M.m2.frequency.setTargetAtTime(110 + 900 * sp, t, .12);
        (M.srcs || []).forEach((s, k) => s.playbackRate.setTargetAtTime(.84 * (k ? .985 : 1), t, .1));
        M.sub.frequency.setTargetAtTime(52, t, .1);
      } catch (e) { errNote(e); }
    }
    return r;
  };
} catch (e) { errNote(e); }
// Coup sur le robot : la coque sonne (métal) au lieu du bois de la barricade. Compte comme Snd.thud (js/37-bruitages.js).
try {
  const _th = Snd.thud;
  Snd.thud = function(k){
    if (!rsnTirIci()) return _th.apply(this, arguments);
    k = clamp(+(k != null ? k : this._thudK) || 1, .4, 2.5);
    if (!this._ok()) return;
    this.thudN++;
    const now = this._now();
    if (now - RSN.coqueT < RSN_REGL.coqueGap && k <= RSN.coqueK) return; // une mêlée : pas un mur de coups
    RSN.coqueT = now; RSN.coqueK = k;
    rsnCoque(k);
  };
} catch (e) { errNote(e); }

// Accès pour les tests automatiques
window.__rsn = { RSN, RSN_REGL, RSN_ARMES, rsnImage, rsnPas, rsnGrince, rsnFondCreer, rsnFondStop, rsnFondRegler, rsnCouper, rsnArme, rsnCharge, rsnBipChaud, rsnCoupure,
  rsnAlerteBas, rsnBipBas, rsnCoque, rsnCrachat, rsnPret, rsnRue, rsnCarrefour, rsnChoix, rsnRenforts, rsnTitan, rsnFrappe, rsnAppel, rsnVictoire, rsnExtinction };
