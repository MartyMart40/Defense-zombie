'use strict';
/* ================= Bruitages : son placé dans l'espace, voix des zombies, barricade, vagues ================= */
// Tout passe par les outils de Snd (01-son.js) ; sans audio (Snd.ctx absent) ou son coupé (Snd.on faux), rien ne joue.
//   Son placé : voix et coups sur la barricade viennent de gauche ou de droite selon le zombie, plus faibles de loin.
//   Voix des zombies (Snd.ZV) : chaque type a la sienne, pour reconnaître un danger à l'oreille :
//     marcheur grognement rauque ; coureur cri aigu et bref ; costaud grondement grave ; cracheur gargouille,
//     puis gargouille plus fort 0,8 s avant de cracher ; volant cri strident et battements d'ailes ; sauteur « hop » à chaque saut ;
//     colosse mugissement très grave et long ; gargouille pierre qui racle ; rampant crépitement ; corbeau croassement ;
//     gonflé rot mouillé ; bouclier grognement étouffé.
//     Le grognement de fond (toutes les 1,5 à 4 s) prend la voix d'un zombie au hasard. Un zombie dangereux crie aussi
//     la première fois qu'il approche (z > -70), au plus une fois par BR_ANNONCE secondes pour chaque type.
//   Douilles : tintement sur le toit un instant après l'éjection. Au plus BR_TINK_MAX par seconde (minigun).
//   Zombies abattus : corps qui tombe, craquement à la tête. Snd.headPop() et Snd.killConfirm() (01-son.js) existent mais ne sont
//     branchés sur rien : js/62-ressenti.js fait déjà ses propres sons de tir à la tête et d'abattu (sinon ils seraient doublés).
//   Horde : murmure continu de la foule, plus fort quand il y a beaucoup de zombies proches.
//   Barricade : coup proportionné aux dégâts (Snd.thud(k)) ; moins de 35 % : le bois craque ;
//     moins de 30 % : alarme une fois au passage, puis battement de cœur de plus en plus rapide (70 à 140 par minute).
//   Vagues (toit) : signature au début (plus lourde pour la dernière vague), à la fin, et cloches de victoire.

const BR = { tinks:0, drops:0, crunch:0, creaks:0, tinkSec:0, tinkT:0, dropT:0, creakT:4, horde:null, hordeLvl:0,
  annonces:0, gargles:0, hops:0, cd:{}, beats:0, alarmes:0, beatT:0, bas:false, debuts:0, derniere:0, fins:0, victoires:0, vWave:0, vS:null, vSt:'' };
const BR_TINK_MAX = 10;
// Attente entre deux cris d'approche d'un même type (s)
const BR_ANNONCE = { runner:1, jumper:1.5, crawler:2, flyer:2, crow:2.5, brute:2.5, spitter:3, gargoyle:3, bloater:3, shield:3, colossus:5, boss:5 };
const brV = new THREE.Vector3();
const brOk = () => typeof Snd === 'object' && !!Snd._ok && Snd._ok();

/* ---------- Voix des zombies et signatures (ajoutées à Snd) ---------- */
// Profils pour Snd._cri (01-son.js) ; pri : priorité dans le budget de voix (2 = danger)
Object.assign(Snd, {
  ZV: {
    walker:   Snd.GROAN,
    runner:   { f:[300, 420], depart:.7, monte:.2, fin:.8, d:[.35, .6], vib:[11, 15], vibA:.04, formants:[[1300, 1800, 5], [2600, 3300, 7]], vol:.8, atk:.03, souffle:[2500, 3500, .12], pri:2 },
    brute:    { f:[42, 58], fin:.75, d:[1.1, 1.7], vib:[3, 5], vibA:.08, formants:[[260, 380, 3], [600, 800, 5], [1100, 1400, 8]], vol:.6, atk:.12, sub:40, subV:.15, souffle:[300, 500, .12], pri:2 },
    spitter:  { f:[95, 130], fin:.8, d:[.6, 1], vib:[6, 8], vibA:.05, formants:[[500, 800, 3], [1300, 1700, 5]], vol:.5, atk:.1, bulles:[18, 28], souffle:[400, 700, .1], pri:2 },
    gargle:   { f:[110, 150], depart:.8, monte:.9, fin:1.2, d:[.75, .8], vib:[7, 9], vibA:.07, formants:[[600, 900, 3], [1500, 1900, 5]], vol:.8, atk:.5, bulles:[24, 34], souffle:[500, 900, .16], pri:2 },
    flyer:    { f:[650, 850], depart:1.1, fin:.55, d:[.5, .8], vib:[8, 12], vibA:.03, formants:[[1800, 2400, 4], [3200, 3800, 6]], vol:.4, atk:.04, souffle:[3000, 4500, .06], ailes:true, pri:2 },
    jumper:   { f:[170, 230], fin:.6, d:[.16, .26], vib:[5, 7], vibA:.03, formants:[[700, 950, 4], [1500, 1900, 6]], vol:.55, atk:.015, souffle:[1000, 1500, .1], rep:2, gap:.22, pri:2 },
    hop:      { f:[180, 240], fin:.55, d:[.14, .2], vib:[5, 7], vibA:.03, formants:[[700, 950, 4], [1500, 1900, 6]], vol:.55, atk:.012, souffle:[1000, 1500, .1], pri:1 },
    colossus: { f:[28, 36], fin:.7, d:[2, 2.8], vib:[2, 3.5], vibA:.1, formants:[[180, 260, 3], [420, 560, 5], [900, 1150, 8]], vol:.9, atk:.35, sub:32, subV:.2, souffle:[200, 400, .16], pri:2 },
    gargoyle: { f:[60, 80], fin:.8, d:[1, 1.5], vib:[14, 20], vibA:.1, formants:[[350, 500, 3], [900, 1200, 5]], vol:.55, atk:.1, souffle:[1500, 2500, .12], pierre:true, pri:2 },
    crawler:  { f:[180, 240], fin:.9, d:[.25, .4], vib:[25, 30], vibA:.15, formants:[[2000, 2600, 6], [3500, 4200, 8]], vol:.7, atk:.02, souffle:[3000, 5000, .16], pri:1 },
    crow:     { f:[500, 620], depart:1.1, fin:.8, d:[.15, .22], vib:[30, 40], vibA:.05, formants:[[1100, 1500, 4], [2400, 2900, 6]], vol:.35, atk:.01, rep:2, gap:.17, pri:1 },
    bloater:  { f:[55, 75], fin:.6, d:[.9, 1.3], vib:[4, 6], vibA:.08, formants:[[300, 450, 3], [700, 900, 5]], vol:.6, atk:.15, bulles:[10, 16], souffle:[300, 500, .1], pri:1 },
    shield:   { f:[65, 110], fin:.7, d:[.8, 1.4], vib:[5, 9], vibA:.06, formants:[[350, 550, 4], [800, 1000, 6]], vol:.42, atk:.18, souffle:[500, 700, .05], pri:1 }
  },
  zvoixN: 0,
  // Voix d'un type de zombie (inconnu : grognement commun) ; rend false si rien n'a joué
  zvoix(type){
    const o = this.ZV[type] || (type === 'boss' ? this.ZV.colossus : this.GROAN);
    const r = this._voix('monde', o.pri != null ? o.pri : 1, () => {
      const t = this.ctx.currentTime;
      this._cri(o);
      if (o.ailes) for (let i = 0; i < 3; i++) this._nz(t + i * .14, 'lowpass', 650, 1, .09, .2, null, 180); // battements d'ailes
      if (o.pierre) this._nz(t, 'bandpass', 1800, 2, .5, .12, null, 900, .05); // pierre qui racle
    });
    if (r) this.zvoixN++;
    return r;
  },
  // Tambour de guerre (harmonique pour les petits haut-parleurs du cell) et cor (deux dents de scie, filtre qui s'ouvre)
  _tambour(t, f, v){
    this._osc(t, 'sine', f, f * .5, .45, v); this._osc(t, 'triangle', f * 2.1, f, .18, v * .35);
    this._nz(t, 'lowpass', 700, 1, .15, v * .5, null, 150); this._nz(t, 'bandpass', 2200, 2, .03, v * .2);
  },
  _cor(t, f, d, v){
    const c = this.ctx, o = c.createOscillator(), o2 = c.createOscillator(), fl = c.createBiquadFilter(), g = c.createGain();
    o.type = o2.type = 'sawtooth'; o.frequency.value = f; o2.frequency.value = f * 1.006;
    fl.type = 'lowpass'; fl.frequency.setValueAtTime(400, t); fl.frequency.linearRampToValueAtTime(1600, t + .15); fl.frequency.linearRampToValueAtTime(900, t + d);
    g.gain.setValueAtTime(.0001, t); g.gain.linearRampToValueAtTime(v, t + .08); g.gain.setValueAtTime(v, t + d * .7); g.gain.exponentialRampToValueAtTime(.001, t + d);
    o.connect(fl); o2.connect(fl); fl.connect(g); g.connect(this._out);
    [o, o2].forEach(n => { n.start(t); n.stop(t + d + .05); }); this._fin(t + d + .05);
  },
  // Début de vague : deux coups de tambour et un appel de cor (ré, la). Dernière vague : tambours qui accélèrent,
  // cor en triton (ré, sol dièse) doublé à l'octave grave et sirène qui monte (2,5 s)
  waveStart(last){
    return this._voix('ui', 3, () => { const t = this.ctx.currentTime + .05;
      if (!last){ this._tambour(t, 95, .5); this._tambour(t + .26, 85, .45); this._cor(t + .5, 146.8, .35, .1); this._cor(t + .86, 220, .7, .11); return; }
      [0, .24, .42, .54, .64].forEach((d, i) => this._tambour(t + d, 100 - i * 6, .45 + i * .06));
      this._cor(t + .8, 146.8, .5, .12); this._cor(t + 1.3, 207.7, 1.2, .12); this._cor(t + 1.3, 103.8, 1.2, .09);
      this._osc(t + .8, 'triangle', 320, 980, 1.6, .05);
    });
  },
  // Fin de vague : soulagement, deux notes de cloche qui montent (la, ré) et un souffle qui retombe
  waveEnd(){
    return this._voix('ui', 3, () => { const t = this.ctx.currentTime + .05;
      [[880, 0], [1175, .16]].forEach(n => { this._osc(t + n[1], 'sine', n[0], 0, 1.1, .11); this._osc(t + n[1], 'sine', n[0] * 2.76, 0, .4, .03); this._osc(t + n[1], 'triangle', n[0] / 2, 0, .6, .05); });
      this._nz(t, 'bandpass', 2400, 1, .8, .05, null, 500, .2);
    });
  },
  // Victoire : carillon (do, mi, sol, do) qui tombe sur l'accord de la fanfare (Snd.musFanfare), éclat de cymbale
  victoire(){
    return this._voix('ui', 3, () => { const t = this.ctx.currentTime + .6;
      [1047, 1319, 1568, 2093].forEach((f, i) => { this._osc(t + i * .09, 'sine', f, 0, 1.6, .12); this._osc(t + i * .09, 'sine', f * 2.76, 0, .5, .03); });
      this._nz(t, 'highpass', 6000, 0, 1.4, .07, null, 0, .02);
    });
  },
  // Barricade sous 30 % : alarme (deux fois deux notes qui descendent), joue une fois au passage
  alarme(){
    return this._voix('ui', 3, () => { const t = this.ctx.currentTime;
      for (let i = 0; i < 2; i++){ const a = t + i * .32; this._osc(a, 'square', 880, 0, .14, .06); this._osc(a, 'triangle', 880, 0, .14, .14); this._osc(a + .15, 'square', 622, 0, .15, .06); this._osc(a + .15, 'triangle', 622, 0, .15, .14); }
    });
  },
  // Battement de cœur (k : 0 à 30 % de la barricade, 1 quand elle cède) ; harmonique à 124 Hz pour les haut-parleurs du cell
  coeur(k){
    k = clamp(+k || 0, 0, 1);
    return this._voix('ui', 3, () => { const t = this.ctx.currentTime, v = .35 + .35 * k;
      [[0, 1], [.24, .75]].forEach(b => { const a = t + b[0], w = v * b[1];
        this._osc(a, 'sine', 62, 40, .16, w * .6); this._osc(a, 'triangle', 124, 80, .1, w * .7); this._nz(a, 'lowpass', 300, 1, .09, w * .5, null, 120); });
    });
  }
});

/* ---------- Son placé ---------- */
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
// Sortie panoramique : Snd._out pendant l'appel f (les voix de Snd s'y branchent). Son coupé : f est appelé quand même, sans panoramique.
function brAt(x, y, z, f){
  if (!brOk()){ f(); return; }
  const c = Snd.ctx, s = brSpot(x, y, z);
  let g = null;
  try {
    g = c.createGain(); g.gain.value = s.vol;
    const out = Snd._bus('monde') || Snd.master;
    if (c.createStereoPanner){ const p = c.createStereoPanner(); p.pan.value = s.pan; g.connect(p); p.connect(out); }
    else g.connect(out);
  } catch (e) { errNote(e); f(); return; }
  const o = Snd._out; Snd._out = g;
  try { f(); } finally { Snd._out = o; }
  setTimeout(() => { try { g.disconnect(); } catch (e) { errNote(e); } }, 4000);
}

/* ---------- Douilles qui tombent sur le toit ---------- */
function brTink(shell){
  if (typeof Snd !== 'object' || !Snd.ctx) return;
  const now = Snd.ctx.currentTime;
  if (now - BR.tinkT > 1){ BR.tinkT = now; BR.tinkSec = 0; }
  if (++BR.tinkSec > BR_TINK_MAX) return;
  BR.tinks++;
  Snd._voix('arme', 0, () => {
    const t = now + rand(.28, .45), v = rand(.6, 1);
    if (shell === 1){ Snd._nz(t, 'bandpass', rand(700, 1000), 3, .06, .07 * v); Snd._nz(t + rand(.08, .14), 'bandpass', 800, 3, .05, .04 * v); return; } // cartouche en plastique
    const big = shell === 5 || shell === 6 || shell === 7, f = big ? rand(1400, 2200) : rand(3200, 5600);
    for (let i = 0; i < (big ? 2 : 3); i++){
      const ti = t + i * rand(.06, .12), k = Math.pow(.55, i);
      Snd._osc(ti, 'triangle', f * rand(.97, 1.03), f * .98, big ? .12 : .07, (big ? .06 : .045) * v * k);
      Snd._osc(ti, 'sine', f * 2.7, f * 2.6, .04, .015 * v * k);
    }
  });
}

/* ---------- Zombies abattus ---------- */
function brKill(z, head){
  if (typeof Snd !== 'object' || !Snd.ctx || !z || !z.g) return;
  const now = Snd.ctx.currentTime, gp = z.g.position;
  if (head){ BR.crunch++; brAt(gp.x, 1.6, gp.z, () => Snd._voix('monde', 0, () => { const t = Snd.ctx.currentTime; Snd._nz(t, 'bandpass', rand(1000, 1500), 2, .09, .16); Snd._nz(t + .01, 'highpass', 3500, 0, .025, .1); })); }
  if (now - BR.dropT < .12) return; // pas plus de 8 chutes par seconde
  BR.dropT = now; BR.drops++;
  const big = ((ZTYPES[z.type] || {}).scale || 1) > 1.4, air = gp.y > 1.5;
  brAt(gp.x, 0, gp.z, () => Snd._voix('monde', 0, () => {
    const t = Snd.ctx.currentTime + (air ? .45 : .32);
    Snd._nz(t, 'lowpass', big ? 220 : 380, 1, big ? .35 : .18, big ? .5 : .22);
    Snd._osc(t, 'sine', big ? 55 : 85, 35, big ? .3 : .12, big ? .4 : .15);
  }));
}

/* ---------- Murmure de la horde ---------- */
function brHorde(dt){
  if (typeof Snd !== 'object' || !Snd.ctx || !Snd.master) return;
  let n = 0;
  const jeu = state === 'playing' || state === 'mech' || state === 'rts';
  if (jeu) for (let i = 0; i < zombies.length; i++){ const z = zombies[i]; if (!z.dead && z.g.position.z > -75) n++; }
  const want = jeu ? clamp(n / (isTouch ? 30 : 45), 0, 1) : 0;
  BR.hordeLvl += (want - BR.hordeLvl) * Math.min(1, dt * 1.5);
  try {
    if (!BR.horde && BR.hordeLvl > .02 && brOk() && Snd._ambReady && Snd._ambReady() && Snd.brown){
      const c = Snd.ctx, s = c.createBufferSource(); s.buffer = Snd.brown; s.loop = true; s.playbackRate.value = .9;
      const f1 = c.createBiquadFilter(); f1.type = 'bandpass'; f1.frequency.value = 380; f1.Q.value = 2.5;
      const f2 = c.createBiquadFilter(); f2.type = 'bandpass'; f2.frequency.value = 760; f2.Q.value = 4;
      const g = c.createGain(); g.gain.value = 0.0001;
      const lfo = c.createOscillator(), lg = c.createGain(); lfo.frequency.value = .35; lg.gain.value = .03; lfo.connect(lg); lg.connect(g.gain);
      s.connect(f1); s.connect(f2); f1.connect(g); f2.connect(g); g.connect(Snd.ambBus);
      s.start(c.currentTime, Math.random() * 5); lfo.start();
      BR.horde = { s, g, f1, lfo };
    }
    if (BR.horde){
      const t = Snd.ctx.currentTime, on = brOk();
      BR.horde.g.gain.setTargetAtTime(on ? Math.max(0.0001, .18 * BR.hordeLvl) : 0.0001, t, on ? .4 : .05);
      BR.horde.f1.frequency.setTargetAtTime(330 + 120 * BR.hordeLvl, t, .8);
      if (!on || (BR.hordeLvl <= .01 && !jeu)){ const h = BR.horde; BR.horde = null; h.g.gain.setTargetAtTime(0.0001, t, .2); try { h.s.stop(t + 1); h.lfo.stop(t + 1); } catch (e) { errNote(e); } }
    }
  } catch (e) { BR.horde = null; }
}

/* ---------- Barricade : craquements, alarme et battement de cœur ---------- */
function brCreak(dt){
  if ((state !== 'playing' && state !== 'mech') || !S || typeof Snd !== 'object' || !Snd.ctx || S.bar > S.barMax * .35) return;
  BR.creakT -= dt; if (BR.creakT > 0) return;
  BR.creakT = rand(2.5, 6) * (.4 + S.bar / S.barMax); BR.creaks++;
  brAt(rand(-8, 8), 1, BAR_Z, () => Snd._voix('monde', 1, () => {
    const c = Snd.ctx, t = c.currentTime, o = c.createOscillator(), f = c.createBiquadFilter(), g = c.createGain(), d = rand(.4, .8);
    o.type = 'sawtooth'; o.frequency.setValueAtTime(rand(70, 110), t); o.frequency.linearRampToValueAtTime(rand(50, 80), t + d);
    f.type = 'bandpass'; f.frequency.value = rand(700, 1100); f.Q.value = 9;
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(.12, t + .05); g.gain.exponentialRampToValueAtTime(0.001, t + d);
    o.connect(f); f.connect(g); g.connect(Snd._out); o.start(t); o.stop(t + d + .05); Snd._fin(t + d + .05);
  }));
}
// Toit seulement (le robot a son propre tableau de bord). Réarmé quand la barricade repasse au-dessus de 40 %.
function brCoeur(dt){
  if (state !== 'playing' || !S || !(S.barMax > 0)) return;
  const k = S.bar / S.barMax;
  if (k > .4) BR.bas = false;
  if (k >= .3 || S.bar <= 0){ BR.beatT = 0; return; }
  if (!BR.bas){ BR.bas = true; BR.alarmes++; BR.beatT = .7; if (brOk()) Snd.alarme(); return; }
  BR.beatT -= dt; if (BR.beatT > 0) return;
  const g = 1 - k / .3; // 0 à 30 %, 1 quand elle cède
  BR.beatT = 60 / (70 + 70 * g); BR.beats++;
  if (brOk()) Snd.coeur(g);
}

/* ---------- Voix d'approche, gargouillis avant le crachat, « hop » du sauteur ---------- */
function brVoix(){
  if (state !== 'playing' || typeof zombies === 'undefined') return;
  const now = Snd._now();
  const cri = (z, ty, compte) => { BR[compte]++; const gp = z.g.position; brAt(gp.x, gp.y + 1.5, gp.z, () => Snd.zvoix(ty)); };
  for (let i = 0; i < zombies.length; i++){
    const z = zombies[i]; if (z.dead || !z.g) continue;
    const ty = z.type, gp = z.g.position;
    if (!z.brVu && gp.z > -70){
      z.brVu = true;
      if (BR_ANNONCE[ty] != null && now - (BR.cd[ty] || -99) >= BR_ANNONCE[ty]){ BR.cd[ty] = now; cri(z, ty, 'annonces'); }
    }
    if (ty === 'spitter' && z.st !== 'walk' && typeof z.spitT === 'number'){
      if (z.brSp > .8 && z.spitT <= .8 && now - (BR.cd.gargle || -99) >= .3){ BR.cd.gargle = now; cri(z, 'gargle', 'gargles'); }
      z.brSp = z.spitT;
    }
    if (ty === 'jumper' && z.jst){
      if (z.brJ === 'crouch' && z.jst === 'air' && gp.z > -60 && now - (BR.cd.hop || -99) >= .35){ BR.cd.hop = now; cri(z, 'hop', 'hops'); }
      z.brJ = z.jst;
    }
  }
}

/* ---------- Signatures des vagues (toit) ---------- */
function brVague(){
  if (typeof S === 'undefined' || !S) return;
  const st = state;
  if (S !== BR.vS){ BR.vS = S; BR.vWave = 0; } // nouvelle partie
  const fini = curLoc && !curLoc.inf && S.wave >= curLoc.waves;
  if (st === 'playing' && S.wave > 0 && S.wave !== BR.vWave){
    BR.vWave = S.wave; BR.debuts++; if (fini) BR.derniere++;
    if (brOk()) Snd.waveStart(!!fini);
  }
  if (BR.vSt === 'playing' && st === 'shop'){ BR.fins++; if (brOk()) Snd.waveEnd(); }
  if (BR.vSt === 'playing' && st === 'over' && fini && S.bar > 0){ BR.victoires++; if (brOk()) Snd.victoire(); }
  BR.vSt = st;
}

/* ---------- Crochets ---------- */
// Grognement de fond : la voix du type d'un zombie vivant au hasard, placée à gauche ou à droite, plus faible de loin
try {
  Snd.groan = function(type){
    const list = typeof zombies !== 'undefined' ? zombies.filter(z => !z.dead && z.g) : [];
    if (!list.length || !brOk()) return this.zvoix(type || 'walker');
    const z = list[Math.floor(Math.random() * list.length)], gp = z.g.position;
    brAt(gp.x, gp.y + 1.5, gp.z, () => this.zvoix(type || z.type));
  };
} catch (e) { errNote(e); }
// Coups sur la barricade : le bruit vient du côté du zombie qui frappe ; force selon les dégâts (k = racine de dmg / 8 :
// marcheur 0,9, costaud 1,5, colosse 2,4). Les gros coups (k > 1,3) sonnent toujours, les petits une fois sur deux (07-zombies.js).
try {
  const _h = hitBarricade;
  hitBarricade = function(z, dmg){
    if (!z || !z.g || !brOk()) return _h.apply(this, arguments);
    let r; const args = arguments, k = clamp(Math.sqrt(Math.max(0, +dmg || 0) / 8), .4, 2.5), n0 = Snd.thudN;
    brAt(z.g.position.x, 1, BAR_Z, () => {
      Snd._thudK = k;
      try { r = _h.apply(this, args); } finally { Snd._thudK = null; }
      if (k > 1.3 && Snd.thudN === n0) Snd.thud(k);
    });
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
// Chaque image (registre, js/00-base.js)
Jeu.on('image', dt => { dt = dt || 0; brHorde(dt); brCreak(dt); brCoeur(dt); brVoix(); brVague(); });

// Accès pour les tests automatiques
window.__br = { BR, BR_ANNONCE, brSpot, brAt, brTink, brKill, brHorde, brCreak, brCoeur, brVoix, brVague };
