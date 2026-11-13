'use strict';
/* ================= Son ================= */
/* ---------- Mixage : table des niveaux ----------
   Mesurés hors ligne (OfflineAudioContext, après 0,5 s de chauffe du limiteur) à la sortie, volume « son » au maximum, en dBFS
   (0 = saturation). « Court » : RMS le plus fort sur 50 ms. « Cell » : la même mesure après un passe-haut à 300 Hz,
   comme un petit haut-parleur de téléphone (les graves n'y passent pas : c'est le chiffre qui compte pour Martin).
   Le hasard de chaque son fait bouger ces chiffres de 1 à 2 dB.
     Groupe       Son                                         Court    Cell    Bus
     Tirs         pistolet, fusil                              -22/-25  -28/-31  arme (réverbération de rue)
                  pompe, sniper, roquette                      -12/-15  -23/-26  arme
                  minigun (continu, MG_VOL)                    -15      -25      arme
                  arbalète, lance-flammes (très souvent)       -32/-43  -37/-44  arme
                  recharge, chargeur vide                      -35/-41  -42/-41  arme
     Explosions   grenade (1), ogive (2,5)                     -10/-9   -20/-19  arme
     Zombies      marcheur, bouclier, cracheur (fond)          -30/-31  -31/-32  monde (placé gauche/droite, plus faible de loin)
                  coureur, volant, gargouillis, gargouille     -26/-27  -26/-28  monde (cris de danger)
                  costaud, colosse                             -24/-22  -28/-26  monde
                  sauteur, rampant, corbeau, gonflé            -29/-31  -30/-32  monde
     Impacts      balle dans la chair (hit)                    -33      -39      monde
                  tir à la tête qui tue (headPop)              -26      -26      monde
                  abattu (killConfirm, 4 par seconde au plus)  -37      -37      ui
     Barricade    coup faible, marcheur, colosse (thud k)      -29/-23/-16  -35/-31/-28  monde
                  alarme sous 30 %, battement de cœur          -27/-19  -27/-32  ui
     Interface    achat                                        -27      -27      ui
                  début de vague, dernière vague               -15/-13  -29/-25  ui
                  fin de vague, victoire (et fanfare)          -25/-22  -25/-22  ui
     Ambiance     vent, pluie, horde                           -26/-40  -43/-43  amb (MIX.amb)
     Musique      vague, boss (réglage 0,6)                    -27/-24  -39/-37  musique
     Tout         60 zombies, minigun, 6 explosions, 10 pompes  pic -0,4, court -6 (sans limiteur : pic +18, saturé)
   Sortie : master 0,5, puis compresseur-limiteur (seuil -6 dB, ratio 20, attaque 2 ms) et écrêtage doux (jamais au-dessus de 0,95).
   Au plus VOIX_MAX (10) sons courts à la fois : au-delà, le plus vieux de priorité égale ou plus basse est coupé en 30 ms ;
   si tout ce qui joue est plus important, le nouveau son est laissé tomber.
   Priorités : 0 impacts, douilles et corps qui tombent ; 1 zombies, minigun, lance-flammes, appels des autres fichiers ;
   2 tirs, recharge, cris de danger, gros coups ; 3 interface, explosions, signatures, alarme.
   Rien ne joue (aucun nœud audio créé) quand Snd.on est faux. */
const MIX = { master:.5, arme:1, monde:1, ui:1, amb:.6 };
const Snd = {
  ctx:null, master:null, noise:null, on: store.get('dt_sound', true),
  init(){
    if (this.ctx){ if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    try{
      const C = window.AudioContext || window.webkitAudioContext; if (!C) return;
      this.ctx = new C(); this._chaine();
      const len = Math.floor(this.ctx.sampleRate * 2.5), b = this.ctx.createBuffer(1, len, this.ctx.sampleRate), d = b.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      this.noise = b;
    }catch(e){ this.ctx = null; }
  },
  setOn(v){ this.on = v; store.set('dt_sound', v); if (this.master) this.master.gain.value = v ? MIX.master : 0; if (!v) this._toutCouper(); },
  /* ---------- Chaîne de sortie, bus et budget de voix ---------- */
  VOIX_MAX: 10, voix: [], voixN: 0, voixCoupees: 0, voixRefusees: 0, buses: null, lim: null, _vg: null, _vEnd: 0, _autoV: null,
  _ok(){ return !!(this.ctx && this.master && this.on); },
  _now: () => (typeof performance === 'object' ? performance.now() : Date.now()) / 1000,
  // master -> compresseur-limiteur -> écrêtage doux -> haut-parleurs
  _chaine(){
    const c = this.ctx; this.master = c.createGain(); this.master.gain.value = this.on ? MIX.master : 0; this.buses = {}; this.voix = [];
    let out = c.destination;
    try {
      const sh = c.createWaveShaper(), n = 2048, cv = new Float32Array(n);
      for (let i = 0; i < n; i++){ const x = i / (n - 1) * 2 - 1, a = Math.abs(x); cv[i] = a < .8 ? x : Math.sign(x) * (.8 + .2 * Math.tanh((a - .8) / .2)); }
      sh.curve = cv; sh.connect(out); out = sh;
      const L = c.createDynamicsCompressor(); L.threshold.value = -6; L.knee.value = 3; L.ratio.value = 20; L.attack.value = .002; L.release.value = .2;
      L.connect(out); out = L; this.lim = L;
    } catch (e) { errNote(e); }
    this.master.connect(out);
  },
  _bus(n){
    if (!this.ctx || !this.master) return null;
    if (!this.buses) this.buses = {};
    const b = this.buses[n]; if (b && b.context === this.ctx) return b;
    try { const g = this.ctx.createGain(); g.gain.value = MIX[n] != null ? MIX[n] : 1; g.connect(this.master); return (this.buses[n] = g); }
    catch (e) { errNote(e); return this.master; }
  },
  _fin(t){ if (this._vg && t > this._vEnd) this._vEnd = t; },
  // Joue f dans une voix (un gain propre) : bus = nom de bus ou nœud ; rend false si le son est coupé, refusé ou sans audio
  _voix(bus, pri, f){
    if (!this._ok()) return false;
    if (this._vg){ try { f(); } catch (e) { errNote(e); } return true; } // déjà dans une voix : même voix
    const c = this.ctx, now = c.currentTime;
    this.voix = this.voix.filter(v => v.fin > now);
    if (this.voix.length >= this.VOIX_MAX){
      let k = 0; this.voix.forEach((v, i) => { const m = this.voix[k]; if (v.pri < m.pri || (v.pri === m.pri && v.n < m.n)) k = i; });
      if (this.voix[k].pri > pri){ this.voixRefusees++; return false; } // tout ce qui joue est plus important
      this._couper(this.voix[k]); this.voix.splice(k, 1);
    }
    let g;
    try { g = c.createGain(); g.connect(this._out || (typeof bus === 'string' ? this._bus(bus) : bus) || this.master); } catch (e) { errNote(e); return false; }
    const v = { g, n: ++this.voixN, pri, fin: now };
    this._dans(v, f); this.voix.push(v);
    return true;
  },
  _dans(v, f){
    const o = this._out, og = this._vg, oe = this._vEnd; this._vg = v; this._out = v.g; this._vEnd = v.fin;
    try { f(); } catch (e) { errNote(e); } finally { v.fin = Math.max(v.fin, this._vEnd + .05); this._vg = og; this._out = o; this._vEnd = oe; }
  },
  _couper(v){
    this.voixCoupees++;
    try { const t = this.ctx.currentTime; v.g.gain.cancelScheduledValues(t); v.g.gain.setValueAtTime(v.g.gain.value, t); v.g.gain.linearRampToValueAtTime(0, t + .03); } catch (e) { errNote(e); }
  },
  _toutCouper(){ if (this.ctx) this.voix.forEach(v => this._couper(v)); this.voix = []; if (this.mg) this._mgStop(); },
  // Appel sans voix (autres fichiers : tone, burst, _nz, _osc) : une voix « monde » ; les appels du même instant (au plus 3) la partagent
  _auto(f){
    const a = this._autoV;
    if (a && a.k < 3 && this.voix.indexOf(a.v) >= 0){ a.k++; this._dans(a.v, f); return; }
    let nv = null; this._voix('monde', 1, () => { nv = this._vg; f(); });
    if (nv){ const A = this._autoV = { v: nv, k: 1 }; Promise.resolve().then(() => { if (this._autoV === A) this._autoV = null; }); }
  },
  burst(freq, dur, vol, delay){
    if (!this._ok()) return; if (!this._out) return this._auto(() => this.burst(freq, dur, vol, delay));
    const c = this.ctx, t = c.currentTime + (delay || 0);
    const s = c.createBufferSource(); s.buffer = this.noise;
    const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.setValueAtTime(freq, t); f.frequency.exponentialRampToValueAtTime(120, t + dur);
    const g = c.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    s.connect(f); f.connect(g); g.connect(this._out); s.start(t, Math.random() * 1.6); s.stop(t + dur + 0.05); this._fin(t + dur + .05);
  },
  tone(freq, dur, type, vol, slideTo, delay){
    if (!this._ok()) return; if (!this._out) return this._auto(() => this.tone(freq, dur, type, vol, slideTo, delay));
    const c = this.ctx, t = c.currentTime + (delay || 0);
    const o = c.createOscillator(); o.type = type; o.frequency.setValueAtTime(freq, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    const g = c.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g); g.connect(this._out); o.start(t); o.stop(t + dur + 0.05); this._fin(t + dur + .05);
  },
  /* ---------- Tirs : son de fusil en couches, différent à chaque coup ----------
     Couches : claquement sec (bruit aigu très court), corps grave (bruit filtré + coup sourd qui descend),
     écho de rue (bruit sombre retardé, deux rebonds pour les grosses armes), mécanique propre à l'arme.
     Chaque coup tire au hasard la hauteur, le volume, le timbre (filtres) et le délai d'écho.
     Profil : crack [fréq, durée, vol], body [fréq filtre, durée, vol], thump [fréq départ, fréq fin, durée, vol],
     echo [délai, durée, vol, fréq], mech (bruit d'arme après le coup). */
  GUNS: {
    pistol:  { crack:[4200, .035, .32], body:[1900, .16, .42], thump:[190, 60, .12, .38], echo:[.11, .45, .1, 1300] },
    shotgun: { crack:[3000, .05, .42], body:[1100, .34, .8],  thump:[120, 34, .26, .8],  echo:[.13, .9, .2, 900], echo2:.34, mech:'pump' },
    rifle:   { crack:[5200, .028, .3], body:[2300, .11, .36], thump:[160, 55, .09, .34], echo:[.09, .35, .08, 1500], light:true },
    sniper:  { crack:[6000, .05, .55], body:[900, .5, .9],    thump:[95, 28, .34, .95],  echo:[.18, 1.4, .26, 800], echo2:.5, mech:'bolt' },
    crossbow:{ twang:true },
    flamer:  { flame:true },
    minigun: { cont:true }, // son continu : mgTick
    rocket:  { crack:[1800, .06, .3], body:[700, .6, .6],     thump:[80, 30, .5, .55],   echo:[.2, 1.2, .18, 700], mech:'whoosh' }
  },
  lastShot: 0, shotN: 0,
  // Bruit filtré : source dans le grand tampon blanc, départ au hasard (jamais deux fois le même grain)
  _nz(t, type, freq, q, dur, vol, out, sweepTo, atk){
    if (!this._ok()) return;
    if (!out){ if (!this._out) return this._auto(() => this._nz(t, type, freq, q, dur, vol, out, sweepTo, atk)); this._fin(t + dur + .05); }
    const c = this.ctx, s = c.createBufferSource(); s.buffer = this.noise;
    const f = c.createBiquadFilter(); f.type = type; f.frequency.setValueAtTime(freq, t); if (q) f.Q.value = q;
    if (sweepTo) f.frequency.exponentialRampToValueAtTime(sweepTo, t + dur);
    const g = c.createGain();
    if (atk){ g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + atk); } else g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0005, t + dur);
    s.connect(f); f.connect(g); g.connect(out || this._out || this.master); s.start(t, Math.random() * 1.8); s.stop(t + dur + .05);
  },
  _osc(t, type, f0, f1, dur, vol, out){
    if (!this._ok()) return;
    if (!out){ if (!this._out) return this._auto(() => this._osc(t, type, f0, f1, dur, vol, out)); this._fin(t + dur + .05); }
    const c = this.ctx, o = c.createOscillator(), g = c.createGain(); o.type = type;
    o.frequency.setValueAtTime(f0, t); if (f1) o.frequency.exponentialRampToValueAtTime(f1, t + dur);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0005, t + dur);
    o.connect(g); g.connect(out || this._out || this.master); o.start(t); o.stop(t + dur + .05);
  },
  // Rend true quand l'arme est connue (le coup est compté, joué si le son est actif), false sinon
  shot(kind){
    const P = this.GUNS[kind]; if (!P) return false;
    this.shotN++;
    if (!this._ok()) return true;
    const c = this.ctx, t = c.currentTime, gap = t - this.lastShot; this.lastShot = t;
    const pit = rand(.86, 1.16), vol = rand(.78, 1.08), tim = rand(.7, 1.35);
    // Silencieux : plus faible et plus sourd ; arbalète, lance-flammes et minigun : priorité plus basse (très fréquents ou continus)
    this._voix(this.quiet ? this._qbus() : this._fx(), P.twang || P.flame || P.cont ? 1 : 2, () => {
      if (P.twang){ // arbalète : corde qui claque, presque silencieuse
        this._osc(t, 'triangle', 520 * pit, 150, .1, .08 * vol); this._nz(t, 'highpass', 3000 * tim, 0, .05, .06 * vol);
        this._osc(t + .01, 'sine', 95 * pit, 60, .14, .1 * vol); return;
      }
      if (P.flame){ this._nz(t, 'lowpass', 700 * tim, 0, .16, .14 * vol, null, 300); return; } // souffle grondant (appelé très souvent : une seule couche)
      if (P.cont){ if (gap > .25) this._nz(t, 'highpass', 4000 * tim, 0, .02, .12 * vol); return; } // minigun : le son continu vient de mgTick
      const busy = gap < .09; // tir rapide : on allège (moins de nœuds audio par seconde)
      const cr = P.crack, bo = P.body, th = P.thump, ec = P.echo;
      this._nz(t, 'highpass', cr[0] * tim, 0, cr[1] * rand(.8, 1.25), cr[2] * vol);
      this._nz(t, 'lowpass', bo[0] * tim, rand(.5, 2.5), bo[1] * rand(.85, 1.2), bo[2] * vol, null, 140);
      this._osc(t, 'sine', th[0] * pit, th[1] * pit, th[2] * rand(.85, 1.15), th[3] * vol);
      if (!busy || Math.random() < .3){
        const d = ec[0] * rand(.75, 1.35);
        this._nz(t + d, 'bandpass', ec[3] * tim, .8, ec[1] * rand(.8, 1.2), ec[2] * vol, null, 250, .02);
        if (P.echo2 && !busy) this._nz(t + d + P.echo2 * rand(.8, 1.3), 'lowpass', ec[3] * .7 * tim, 0, ec[1] * .9, ec[2] * .45 * vol, null, 180, .04);
      }
      if (P.buzz && !busy) this._osc(t, 'sawtooth', 110 * pit, 70, .05, .04 * vol);
      if (P.mech === 'pump'){ this._nz(t + .38, 'bandpass', 2400, 4, .04, .12); this._nz(t + .5, 'bandpass', 1800, 4, .05, .14); }
      else if (P.mech === 'bolt'){ this._nz(t + .55, 'bandpass', 3200, 5, .035, .1); this._nz(t + .72, 'bandpass', 2600, 5, .04, .11); }
      else if (P.mech === 'whoosh') this._nz(t, 'bandpass', 900, 1.2, .9, .3 * vol, null, 2600, .05);
    });
    return true;
  },
  /* ---------- Effets du jeu ---------- */
  // Impact sur un zombie : choc mat dans la chair, petit claquement
  hit(){
    this._voix('monde', 0, () => { const t = this.ctx.currentTime, p = rand(.85, 1.15);
      this._nz(t, 'lowpass', 1400 * p, 1, .06, .2); this._osc(t, 'sine', 190 * p, 80, .07, .1); this._nz(t, 'bandpass', 3200 * p, 4, .02, .13);
    });
  },
  // Tir à la tête qui tue : « pop » sec (hauteur qui tombe en 50 ms), claquement d'os, petit souffle mouillé.
  // Deux appels pour le même coup (moins de 35 ms) ne jouent qu'une fois.
  _popT: -9, popN: 0,
  headPop(){
    if (!this._ok()) return false;
    const w = this._now(); if (w - this._popT < .035) return false;
    this._popT = w; this.popN++;
    return this._voix('monde', 2, () => { const t = this.ctx.currentTime, p = rand(.92, 1.1);
      this._osc(t, 'sine', 1150 * p, 170, .055, .35); this._osc(t, 'triangle', 2300 * p, 700, .025, .09);
      this._nz(t, 'bandpass', 2700 * p, 3, .03, .25); this._nz(t + .008, 'lowpass', 900 * p, 1, .1, .14, null, 200);
    });
  },
  // Zombie abattu : tic discret et court. Au plus un tous les KC_GAP (4 par seconde) ; en série, un peu plus aigu et plus doux.
  KC_GAP: .25, _kcT: -9, _kcSuite: 0, kcN: 0,
  killConfirm(){
    if (!this._ok()) return false;
    const w = this._now(), gap = w - this._kcT; if (gap < this.KC_GAP) return false;
    this._kcSuite = gap < .8 ? Math.min(this._kcSuite + 1, 6) : 0; this._kcT = w; this.kcN++;
    const k = 1 - .07 * this._kcSuite, f = 1900 + 45 * this._kcSuite;
    return this._voix('ui', 1, () => { const t = this.ctx.currentTime;
      this._osc(t, 'sine', f, f * .97, .045, .1 * k); this._nz(t, 'highpass', 5200, 0, .012, .06 * k);
    });
  },
  // Recharge : déclic du chargeur, chargeur qui glisse, claque en place, culasse armée
  reload(){
    this._voix('arme', 2, () => { const t = this.ctx.currentTime, p = rand(.92, 1.08);
      this._nz(t, 'bandpass', 3400 * p, 6, .025, .24);
      this._nz(t + .12, 'bandpass', 1500 * p, 2, .14, .12, null, 900);
      this._nz(t + .5, 'bandpass', 2300 * p, 5, .04, .32); this._osc(t + .5, 'sine', 160 * p, 90, .06, .1);
      this._nz(t + .72, 'bandpass', 2800 * p, 6, .03, .24); this._nz(t + .82, 'bandpass', 2000 * p, 6, .04, .28);
    });
  },
  // Chargeur vide : percuteur qui claque à sec (assez fort pour s'entendre dans la mêlée)
  empty(){ this._voix('arme', 2, () => { const t = this.ctx.currentTime; this._nz(t, 'bandpass', 4200, 9, .02, .9); this._nz(t + .012, 'bandpass', 1800, 6, .02, .45); }); },
  // Coup sur la barricade : bois qui craque, choc sourd. k : force du coup (0,4 à 2,5 ; 1 = marcheur, 1,5 = costaud, 2,4 = colosse)
  // Gros coups : plus grave, plus long, planches qui cèdent. Sans k : Snd._thudK (posé par 37-bruitages.js), sinon 1.
  thudN: 0, _thudK: null,
  thud(k){
    k = clamp(+(k != null ? k : this._thudK) || 1, .4, 2.5);
    if (!this._ok()) return;
    this.thudN++;
    this._voix('monde', k > 1.3 ? 2 : 1, () => { const t = this.ctx.currentTime, p = rand(.85, 1.15) / Math.sqrt(k), v = Math.min(k, 1.8);
      this._nz(t, 'lowpass', 700 * p, 1, .2 + .1 * k, .3 * v, null, 150); this._osc(t, 'sine', 95 * p, 45, .14 + .08 * k, .25 * v);
      this._nz(t, 'bandpass', 1700 * p, 3, .07, .45 * v); this._nz(t, 'bandpass', 900 * p, 2, .12, .3 * v);
      if (k > 1.3){ this._nz(t + .02, 'bandpass', rand(2200, 2800), 4, .1, .22 * v); this._nz(t + .04, 'lowpass', 320, 1, .45, .3 * (k - 1), null, 90); }
      else if (Math.random() < .4) this._nz(t + rand(.03, .08), 'bandpass', rand(2200, 3200), 5, .05, .08); // éclat de bois
    });
  },
  // Achat : clic de caisse, deux notes vives qui montent (mi, si), éclat aigu ; net et court (0,25 s)
  buy(){
    this._voix('ui', 3, () => { const t = this.ctx.currentTime;
      this._nz(t, 'bandpass', 3800, 5, .018, .3);
      this._osc(t + .01, 'square', 1319, 0, .06, .05); this._osc(t + .01, 'triangle', 1319, 0, .09, .16);
      this._osc(t + .075, 'square', 1976, 0, .09, .045); this._osc(t + .075, 'triangle', 1976, 0, .17, .16);
      this._osc(t + .075, 'sine', 3951, 0, .12, .04);
    });
  },
  // Voix de zombie (profils : GROAN ici, les autres types dans 37-bruitages.js, Snd.ZV) :
  // dent de scie avec vibrato, formants (passe-bande), souffle ; bulles (gargouillis), sous-grave et répétitions facultatifs.
  //   f [min, max] Hz, depart et fin (rapport de hauteur), monte (part de la durée pour atteindre f), d [min, max] s, vib [min, max] Hz,
  //   vibA (profondeur), formants [[min, max, Q]], vol, atk, souffle [fmin, fmax, vol], bulles [min, max] Hz, sub Hz, rep et gap
  GROAN: { f:[65, 115], fin:.7, d:[.8, 1.6], vib:[5, 9], vibA:.06, formants:[[450, 700, 4], [950, 1300, 6]], vol:.42, atk:.18, souffle:[600, 900, .07] },
  _cri(o, retard){
    const c = this.ctx, t = c.currentTime + (retard || 0), d = rand(o.d[0], o.d[1]), f0 = rand(o.f[0], o.f[1]);
    const os = c.createOscillator(); os.type = o.onde || 'sawtooth';
    os.frequency.setValueAtTime(f0 * (o.depart || 1), t);
    if (o.monte) os.frequency.linearRampToValueAtTime(f0, t + d * o.monte);
    os.frequency.linearRampToValueAtTime(f0 * (o.fin || .7) * rand(.92, 1.08), t + d);
    const lfo = c.createOscillator(), lg = c.createGain(); lfo.frequency.value = rand(o.vib[0], o.vib[1]); lg.gain.value = f0 * (o.vibA || .06); lfo.connect(lg); lg.connect(os.frequency);
    const g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(o.vol, t + (o.atk || .18)); g.gain.exponentialRampToValueAtTime(0.001, t + d);
    o.formants.forEach(F => { const f = c.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = rand(F[0], F[1]); f.Q.value = F[2]; os.connect(f); f.connect(g); });
    const stop = [os, lfo];
    if (o.bulles){ // gargouillis : le volume bat vite (bulles dans la gorge)
      const am = c.createGain(), b = c.createOscillator(), bg = c.createGain(); am.gain.value = .55; b.frequency.value = rand(o.bulles[0], o.bulles[1]); bg.gain.value = .45;
      b.connect(bg); bg.connect(am.gain); g.connect(am); am.connect(this._out); stop.push(b);
    } else g.connect(this._out);
    stop.forEach(n => { n.start(t); n.stop(t + d + .05); });
    if (o.souffle) this._nz(t, 'bandpass', rand(o.souffle[0], o.souffle[1]), 1.5, d * .8, o.souffle[2], null, 300, .1);
    if (o.sub) this._osc(t, 'sine', o.sub, o.sub * .7, d * .9, o.vol * (o.subV || .5));
    this._fin(t + d + .05);
    if (o.rep > 1 && !retard) for (let i = 1; i < o.rep; i++) this._cri(Object.assign({}, o, { rep:0 }), i * (o.gap || .2));
  },
  // Grognement commun (37-bruitages.js le remplace par la voix du type d'un zombie au hasard, placée dans l'espace)
  groan(){ this._voix('monde', 1, () => this._cri(this.GROAN)); },
  // Explosion : claquement, boule de feu grave, grondement qui roule dans la rue, débris qui retombent
  boom(power, delay){
    const p = power || 1;
    this._voix(this._fx(), 3, () => { const t = this.ctx.currentTime + (delay || 0);
      this._nz(t, 'highpass', 2500, 0, .06, .5 * Math.min(p, 1.5));
      this._nz(t, 'lowpass', 1600, 1, .9 + .4 * p, .9 * Math.min(p, 1.6), null, 90);
      this._osc(t, 'sine', 70, 22, .8 + .4 * p, .8 * Math.min(p, 1.5));
      this._nz(t + .05, 'lowpass', 400, 1, 1.6 + p, .45 * Math.min(p, 1.6), null, 60, .1);
      for (let i = 0; i < 4; i++) this._nz(t + rand(.25, .9), 'bandpass', rand(1500, 4000), 6, rand(.03, .08), rand(.03, .08));
    });
  },
  /* ---------- Réverbération de rue (tirs et explosions) ----------
     Bus fxBus : son direct vers master + envoi dans une réverbération (réponse générée : échos sur les façades, queue de 1,5 s). */
  fxBus: null, rev: null,
  _fx(){
    if (!this.ctx || !this.master) return null;
    if (this.fxBus && this.fxBus.context === this.ctx) return this.fxBus;
    try {
      const c = this.ctx, sr = c.sampleRate, n = Math.floor(sr * 1.5), ir = c.createBuffer(2, n, sr);
      for (let ch = 0; ch < 2; ch++){
        const d = ir.getChannelData(ch);
        for (let i = 0; i < n; i++){ const tt = i / sr; d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 2.2) * (tt < .02 ? tt / .02 : 1) * .5; }
        [[.055, .6], [.09, .45], [.15, .35], [.23, .25]].forEach(e => { const k = Math.floor((e[0] + ch * .007) * sr); for (let j = 0; j < 300; j++) d[k + j] += (Math.random() * 2 - 1) * e[1] * (1 - j / 300); });
      }
      const bus = c.createGain(), cv = c.createConvolver(), send = c.createGain(), lp = c.createBiquadFilter();
      cv.buffer = ir; send.gain.value = .32; lp.type = 'lowpass'; lp.frequency.value = 3800;
      const arme = this._bus('arme') || this.master;
      bus.connect(arme); bus.connect(send); send.connect(lp); lp.connect(cv); cv.connect(arme);
      this.fxBus = bus; this.rev = cv;
    } catch (e) { this.fxBus = this.master; }
    return this.fxBus;
  },
  quiet: false, qb: null,
  _qbus(){
    if (this.qb && this.qb.context === this.ctx) return this.qb;
    try { const g = this.ctx.createGain(), f = this.ctx.createBiquadFilter(); g.gain.value = .3; f.type = 'lowpass'; f.frequency.value = 1500; g.connect(f); f.connect(this._fx() || this.master); this.qb = g; }
    catch (e) { return this._fx(); }
    return this.qb;
  },
  /* ---------- Minigun : vrai son continu ----------
     Moteur électrique qui siffle en montant en régime (suit spin de 0 à 1), puis « brrrrt » continu pendant le tir :
     tampon d'une seconde de coups très rapprochés (environ 55 par seconde, irréguliers), en boucle, avec écho de rue à l'arrêt.
     mgTick(spin, tir) est appelé à chaque image par 20-armes.js ; sans appel depuis 0,25 s, tout se coupe (pause, menu). */
  mg: null, mgLast: 0, mgFiring: false,
  _mgBuf(){
    if (this._mgB && this._mgB.sampleRate === this.ctx.sampleRate) return this._mgB;
    // Une vraie M134 tire 50 à 100 coups par seconde : les détonations se fondent en un rugissement déchiré.
    // Chaque coup : claquement (bruit très court), coup de bélier grave (65 à 90 Hz) et corps médium ; environ 70 par seconde.
    const sr = this.ctx.sampleRate, n = sr, b = this.ctx.createBuffer(1, n, sr), d = b.getChannelData(0);
    let tt = 0, lp = 0;
    while (tt < 1){
      const k0 = Math.floor(tt * sr), a = rand(.7, 1), f = rand(65, 90), fm = rand(380, 520);
      for (let j = 0; j < sr * .045 && k0 + j < n; j++){
        const u = j / sr, w = Math.random() * 2 - 1;
        lp += (w - lp) * .25; // bruit adouci pour le corps
        d[k0 + j] += w * a * Math.exp(-u / .004) + lp * 1.4 * a * Math.exp(-u / .012)
          + Math.sin(u * f * 6.283) * 1.1 * a * Math.exp(-u / .022) + Math.sin(u * fm * 6.283) * .3 * a * Math.exp(-u / .008);
      }
      tt += rand(.0128, .0158);
    }
    // Saturation douce : le son reste plein et fort sans écrêter
    for (let i = 0; i < n; i++) d[i] = Math.tanh(d[i] * 1.6) * .9;
    return (this._mgB = b);
  },
  MG_VOL: .34, // rafale (avant : 0,95, 7 dB plus fort que le fusil à pompe ; visé : -15 dBFS court)
  mgTick(sp, firing){
    if (!this._ok()){ if (this.mg) this._mgStop(); return; }
    const c = this.ctx, t = c.currentTime; this.mgLast = t;
    sp = Math.max(0, Math.min(1, +sp || 0)); firing = !!firing;
    try {
      if (!this.mg && (sp > 0 || firing)){
        // Moteur électrique (sifflement de rotation)
        const mo = c.createOscillator(), m2 = c.createOscillator(), mf = c.createBiquadFilter(), mgn = c.createGain();
        mo.type = 'sawtooth'; m2.type = 'triangle'; mf.type = 'lowpass'; mf.frequency.value = 1600; mgn.gain.value = 0.0001;
        mo.connect(mf); m2.connect(mf); mf.connect(mgn); mgn.connect(this._bus('arme') || this.master);
        // Rafale : deux lectures décalées du même tampon (gauche et droite), compresseur pour le volume, grognement grave
        const comp = c.createDynamicsCompressor(); comp.threshold.value = -20; comp.ratio.value = 5; comp.attack.value = .003; comp.release.value = .12;
        const bg = c.createGain(); bg.gain.value = 0.0001;
        const bf = c.createBiquadFilter(); bf.type = 'lowpass'; bf.frequency.value = 6000;
        const srcs = [];
        [[-.35, 1, 0], [.35, .985, .37]].forEach(o => {
          const bs = c.createBufferSource(); bs.buffer = this._mgBuf(); bs.loop = true; bs.playbackRate.value = o[1];
          let node = bs;
          if (c.createStereoPanner){ const pn = c.createStereoPanner(); pn.pan.value = o[0]; bs.connect(pn); node = pn; }
          node.connect(bf); bs.start(t, (Math.random() + o[2]) % 1); srcs.push(bs);
        });
        const sub = c.createOscillator(), sf = c.createBiquadFilter(), sg = c.createGain();
        sub.type = 'square'; sub.frequency.value = 70; sf.type = 'lowpass'; sf.frequency.value = 160; sg.gain.value = 0.0001;
        sub.connect(sf); sf.connect(sg); sg.connect(comp);
        bf.connect(comp); comp.connect(bg); bg.connect(this._fx() || this.master);
        mo.start(t); m2.start(t); sub.start(t);
        this.mg = { mo, m2, mgn, bs:srcs[0], srcs, bg, sub, sg, idle:0 };
      }
      const M = this.mg; if (!M) return;
      M.mo.frequency.setTargetAtTime(90 + 520 * sp, t, .05); M.m2.frequency.setTargetAtTime(180 + 1500 * sp, t, .05);
      M.mgn.gain.setTargetAtTime(sp > 0 ? .02 + .05 * sp : 0.0001, t, .06);
      M.bg.gain.setTargetAtTime(firing ? this.MG_VOL : 0.0001, t, firing ? .005 : .03);
      M.sg.gain.setTargetAtTime(firing ? .16 : 0.0001, t, firing ? .01 : .03);
      if (firing && Math.random() < .05){ const r = rand(.97, 1.04); M.srcs.forEach((s, k) => s.playbackRate.setTargetAtTime(r * (k ? .985 : 1), t, .2)); M.sub.frequency.setTargetAtTime(66 + 8 * Math.random(), t, .1); }
      if (this.mgFiring && !firing){ const o = this._fx(); this._nz(t + .02, 'bandpass', 700, .8, 1, .3, o, 160, .02); this._osc(t + .02, 'sine', 70, 35, .5, .25, o); } // écho de la rafale dans la rue
      this.mgFiring = firing;
      if (sp <= 0 && !firing){ M.idle += 1; if (M.idle > 90) this._mgStop(); } else M.idle = 0;
    } catch (e) { this.mg = null; }
  },
  _mgStop(){
    const M = this.mg; this.mg = null; this.mgFiring = false; if (!M || !this.ctx) return;
    const t = this.ctx.currentTime;
    try { M.mgn.gain.setTargetAtTime(0.0001, t, .05); M.bg.gain.setTargetAtTime(0.0001, t, .02); [M.mo, M.m2, M.sub].concat(M.srcs || [M.bs]).forEach(o => o.stop(t + .4)); } catch (e) { errNote(e); }
  },
  // Tonnerre : grondement grave, un peu après l'éclair (delay en secondes)
  thunder(delay, power){
    const p = power || 1, d = 2.2 + p;
    this._voix('monde', 2, () => {
      const c = this.ctx, t = c.currentTime + (delay || 0), s = c.createBufferSource(); s.buffer = this.noise; s.loop = true;
      const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.setValueAtTime(900 * p, t); f.frequency.exponentialRampToValueAtTime(70, t + d);
      const g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(.55 * p, t + .06); g.gain.exponentialRampToValueAtTime(.2 * p, t + .5);
      g.gain.linearRampToValueAtTime(.3 * p, t + .9); g.gain.exponentialRampToValueAtTime(0.001, t + d);
      s.connect(f); f.connect(g); g.connect(this._out); s.start(t); s.stop(t + d + .1); this._fin(t + d + .1);
      this.tone(48, d * .7, 'sine', .25 * p, 30, delay);
    });
  },
  /* ---------- Pluie et ambiances météo ----------
     Bruit rose et bruit brun générés une fois en longs tampons de longueurs différentes (11,3 s et 13,7 s) :
     joués ensemble avec des filtres qui dérivent lentement au hasard, la répétition ne s'entend pas.
     Gouttes : petits « tic » aléatoires sur les toits (tôle) et « plic » dans les flaques, plus nombreux quand ça tombe fort.
     Ambiances (setAmbience) : vent (rafales), oiseaux, grêle sur la tôle, criquets, cigales, grondement lointain.
     Tout passe par ambBus (sous master). rainTick() est appelé à chaque image par rainLevel(). */
  pink: null, brown: null, ambBus: null, rainLvl: 0, rainSrc: null, rainGain: null, rainNodes: null,
  ambWant: { wind:0, birds:0, hail:0, crickets:0, cicadas:0, rumble:0 }, AMB0: { wind:0, birds:0, hail:0, crickets:0, cicadas:0, rumble:0 }, ambCur: null, ambNodes: null, ambNext: 0,
  rainDrops: 0,
  _ambReady(){
    if (!this.ctx || !this.master) return false;
    if (this.ambBus && this.ambBus.context !== this.ctx){ this.ambBus = null; this.rainNodes = null; this.ambNodes = null; this.rainSrc = null; this.rainGain = null; this.pink = this.brown = null; }
    if (!this.ambBus){ this.ambBus = this.ctx.createGain(); this.ambBus.gain.value = MIX.amb; this.ambBus.connect(this.master); }
    if (!this.pink){
      // Bruit rose (filtre de Paul Kellet) et bruit brun (marche aléatoire amortie)
      const sr = this.ctx.sampleRate, mk = (sec, fn) => { const n = Math.floor(sr * sec), b = this.ctx.createBuffer(1, n, sr); fn(b.getChannelData(0), n); return b; };
      this.pink = mk(11.3, (d, n) => {
        let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
        for (let i = 0; i < n; i++){
          const w = Math.random() * 2 - 1;
          b0 = .99886 * b0 + w * .0555179; b1 = .99332 * b1 + w * .0750759; b2 = .969 * b2 + w * .153852;
          b3 = .8665 * b3 + w * .3104856; b4 = .55 * b4 + w * .5329522; b5 = -.7616 * b5 - w * .016898;
          d[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * .5362) * .11; b6 = w * .115926;
        }
      });
      this.brown = mk(13.7, (d, n) => { let l = 0; for (let i = 0; i < n; i++){ l = (l + .02 * (Math.random() * 2 - 1)) / 1.02; d[i] = l * 3.5; } });
    }
    return true;
  },
  _loop(buf, rate){
    const s = this.ctx.createBufferSource(); s.buffer = buf; s.loop = true; s.playbackRate.value = rate || 1;
    s.start(this.ctx.currentTime, Math.random() * buf.duration); return s;
  },
  // Niveau de pluie : 0 (arrêt) à environ 1,5 (orage)
  rainLevel(v){
    v = this.on ? Math.max(0, +v || 0) : 0; // son coupé : la pluie et l'ambiance s'arrêtent
    if (!this.ctx){ this.rainLvl = 0; return; }
    this.rainLvl = v;
    if (this.mg && this.ctx.currentTime - this.mgLast > .25) this._mgStop(); // minigun lâchée (pause, menu, autre arme)
    try { this._rainTick(); this._ambTick(); } catch (e) { this.rainNodes = null; this.rainSrc = null; this.rainGain = null; }
  },
  _rainTick(){
    const v = this.rainLvl, c = this.ctx;
    if (v <= 0 && !this.rainNodes) return;
    if (!this._ambReady()) return;
    const t = c.currentTime;
    if (v > 0 && !this.rainNodes){
      const g = c.createGain(); g.gain.value = 0.0001; g.connect(this.ambBus);
      // Nappe : bruit rose (sifflement de la pluie) et bruit brun (masse, grondement des grosses averses)
      const ps = this._loop(this.pink, rand(.97, 1.03)), pf = c.createBiquadFilter(); pf.type = 'lowpass'; pf.frequency.value = 3200;
      const ph = c.createBiquadFilter(); ph.type = 'highpass'; ph.frequency.value = 350;
      const pg = c.createGain(); pg.gain.value = .9;
      ps.connect(ph); ph.connect(pf); pf.connect(pg); pg.connect(g);
      const bs = this._loop(this.brown, rand(.97, 1.03)), bf = c.createBiquadFilter(); bf.type = 'lowpass'; bf.frequency.value = 600;
      const bg = c.createGain(); bg.gain.value = .5;
      bs.connect(bf); bf.connect(bg); bg.connect(g);
      this.rainNodes = { g, ps, pf, pg, bs, bf, bg, next:0, drift:0 };
      this.rainSrc = ps; this.rainGain = g;
    }
    const N = this.rainNodes; if (!N) return;
    N.g.gain.setTargetAtTime(v > 0 ? .15 * Math.min(v, 1.6) : 0.0001, t, .9);
    if (v <= 0){
      const n = N; this.rainNodes = null; this.rainSrc = null; this.rainGain = null;
      try { n.ps.stop(t + 3); n.bs.stop(t + 3); } catch (e) { errNote(e); }
      return;
    }
    // Filtres qui dérivent lentement (nouvelle cible toutes les 2 à 5 s, glissement doux)
    if (t >= N.next){
      N.next = t + rand(2, 5);
      N.pf.frequency.setTargetAtTime(rand(2200, 4600) * (v > 1.2 ? 1.1 : 1), t, rand(1.5, 3));
      N.pg.gain.setTargetAtTime(rand(.7, 1), t, rand(1, 2.5));
      N.bf.frequency.setTargetAtTime(rand(350, 800), t, rand(1.5, 3));
      N.bg.gain.setTargetAtTime((v > 1.2 ? .9 : .45) * rand(.75, 1.15), t, 2);
    }
    // Gouttes : rythme au hasard (loi exponentielle), jamais plus de quelques-unes par image
    if (!N.drop) N.drop = t;
    const rate = 6 + 22 * Math.min(v, 1.5);
    let k = 0;
    while (N.drop < t + .1 && k++ < 5){
      const at = Math.max(t, N.drop);
      if (Math.random() < .55) this._nz(at, 'bandpass', rand(2500, 6500), rand(6, 14), rand(.02, .05), rand(.03, .09) * Math.min(1, v), this.ambBus); // tic sur un toit
      else this._osc(at, 'sine', rand(900, 2200), rand(2400, 3800), rand(.03, .06), rand(.015, .04) * Math.min(1, v), this.ambBus); // plic dans une flaque
      this.rainDrops++;
      N.drop += -Math.log(1 - Math.random()) / rate;
    }
    if (N.drop < t - .5) N.drop = t;
  },
  // Ambiance de la météo : niveaux de 0 à 1 (voir ambWant)
  setAmbience(o){
    const w = this.ambWant;
    Object.keys(w).forEach(k => { w[k] = clamp(+((o && o[k]) || 0), 0, 1); });
  },
  _ambTick(){
    const w = this.on ? this.ambWant : this.AMB0, c = this.ctx;
    const any = w.wind > 0 || w.rumble > 0 || w.birds > 0 || w.hail > 0 || w.crickets > 0 || w.cicadas > 0;
    if (!any && !this.ambNodes) return;
    if (!this._ambReady()) return;
    const t = c.currentTime;
    if (!this.ambNodes && (w.wind > 0 || w.rumble > 0 || w.hail > 0)){
      // Vent : bruit brun dans un passe-bande qui balaie (sifflement des rafales) ; grondement : brun très grave
      const ws = this._loop(this.brown, rand(.9, 1.1)), wf = c.createBiquadFilter(); wf.type = 'bandpass'; wf.frequency.value = 400; wf.Q.value = 1.2;
      const wg = c.createGain(); wg.gain.value = 0.0001; ws.connect(wf); wf.connect(wg); wg.connect(this.ambBus);
      const rs = this._loop(this.brown, rand(.5, .6)), rf = c.createBiquadFilter(); rf.type = 'lowpass'; rf.frequency.value = 140;
      const rg = c.createGain(); rg.gain.value = 0.0001; rs.connect(rf); rf.connect(rg); rg.connect(this.ambBus);
      this.ambNodes = { ws, wf, wg, rs, rg, gust:0, hail:t, ev:t };
    }
    const A = this.ambNodes;
    if (A){
      if (t >= A.gust){ // rafale : nouvelle force et nouvelle hauteur au hasard
        A.gust = t + rand(1.2, 4);
        const g = rand(.45, 1.15);
        A.wg.gain.setTargetAtTime(Math.max(0.0001, .22 * w.wind * g), t, rand(.5, 1.6));
        A.wf.frequency.setTargetAtTime(rand(250, 900) * (.7 + .5 * g), t, rand(.6, 1.8));
        A.rg.gain.setTargetAtTime(Math.max(0.0001, .5 * w.rumble * rand(.7, 1.1)), t, 1.5);
      }
      if (!any){
        const n = A; this.ambNodes = null;
        n.wg.gain.setTargetAtTime(0.0001, t, .5); n.rg.gain.setTargetAtTime(0.0001, t, .5);
        try { n.ws.stop(t + 2.5); n.rs.stop(t + 2.5); } catch (e) { errNote(e); }
        return;
      }
      // Grêle : impacts durs et nombreux sur la tôle (cliquetis métallique)
      if (w.hail > 0){
        let k = 0;
        while (A.hail < t + .1 && k++ < 6){
          const at = Math.max(t, A.hail);
          this._nz(at, 'bandpass', rand(3000, 7000), rand(8, 18), rand(.015, .04), rand(.06, .14) * w.hail, this.ambBus);
          if (Math.random() < .3) this._osc(at, 'triangle', rand(1800, 3400), rand(1500, 2800), rand(.05, .12), .025 * w.hail, this.ambBus);
          A.hail += -Math.log(1 - Math.random()) / (35 * w.hail);
        }
        if (A.hail < t - .5) A.hail = t;
      }
    }
    // Événements espacés : oiseaux, criquets, cigales
    if (t < this.ambNext) return;
    this.ambNext = t + rand(.25, .6);
    if (w.birds > 0 && Math.random() < .35 * w.birds){ // gazouillis : 2 à 5 notes qui glissent
      const n = 2 + Math.floor(Math.random() * 4), f = rand(2200, 4200), d = rand(.05, .09);
      for (let i = 0; i < n; i++) this._osc(t + i * d * 1.3, 'sine', f * rand(.9, 1.15), f * rand(1.1, 1.4), d, .03 * w.birds, this.ambBus);
    }
    if (w.crickets > 0 && Math.random() < .5 * w.crickets){ // criquets : petites rafales de stridulations
      const f = rand(4200, 4800);
      for (let i = 0; i < 3; i++) this._osc(t + i * .045, 'triangle', f, f * .98, .03, .012 * w.crickets, this.ambBus);
    }
    if (w.cicadas > 0 && Math.random() < .25 * w.cicadas){ // cigales : bourdonnement aigu qui monte et descend
      const o = c.createOscillator(), g = c.createGain(), m = c.createOscillator(), mg = c.createGain(), d = rand(1.2, 2.6);
      o.type = 'sawtooth'; o.frequency.value = rand(5200, 6400); m.frequency.value = rand(38, 60); mg.gain.value = .006 * w.cicadas;
      const f = c.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 6000; f.Q.value = 3;
      g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(.012 * w.cicadas, t + d * .4); g.gain.linearRampToValueAtTime(0.0001, t + d);
      m.connect(mg); mg.connect(g.gain); o.connect(f); f.connect(g); g.connect(this.ambBus);
      o.start(t); m.start(t); o.stop(t + d + .05); m.stop(t + d + .05);
      this.ambNext = t + d * .8;
    }
  },

  /* ---------- Musique générée (aucun fichier) ----------
     Bus séparé (volume « Musique », clé dt_music) branché sur master : couper le son coupe aussi la musique.
     États : 'off', 'menu' (calme), 'wave' (sombre, monte avec l'intensité 0 à 1), 'boss' (lourd).
     Rien ne joue tant que l'AudioContext n'existe pas (créé au premier clic par Snd.init). */
  musVol: clamp(+store.get('dt_music', .6) || 0, 0, 1), musBus: null, musWant: 'off', musCur: 'off', musInt: 0, musDuck: 1,
  musNext: 0, musStep: 0, musHold: 0,
  setMusicVol(v){
    v = clamp(+v || 0, 0, 1); this.musVol = Math.round(v * 100) / 100; store.set('dt_music', this.musVol); this._musGain();
  },
  setMusic(st){ this.musWant = st || 'off'; },
  setMusicIntensity(i){ this.musInt = clamp(+i || 0, 0, 1); },
  setMusicDuck(k){ if (Math.abs(k - this.musDuck) > .001){ this.musDuck = k; this._musGain(); } },
  _musGain(){
    if (!this.musBus || !this.ctx) return;
    try{ this.musBus.gain.setTargetAtTime(this.musVol * .7 * this.musDuck, this.ctx.currentTime, .15); }catch(e){}
  },
  _musReady(){
    if (!this.ctx || !this.master) return false;
    if (this.musBus && this.musBus.context !== this.ctx) this.musBus = null; // contexte audio recréé
    if (!this.musBus){
      try{ this.musBus = this.ctx.createGain(); this.musBus.gain.value = this.musVol * .7 * this.musDuck; this.musBus.connect(this.master); }
      catch(e){ this.musBus = null; return false; }
    }
    return true;
  },
  _mtof: m => 440 * Math.pow(2, (m - 69) / 12),
  // Une note de musique : enveloppe attaque / relâche, filtre passe-bas facultatif
  _mn(m, t, dur, type, vol, atk, lp){
    const c = this.ctx, o = c.createOscillator(), g = c.createGain();
    o.type = type; o.frequency.setValueAtTime(this._mtof(m), t);
    const a = Math.min(atk || .01, dur * .6);
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + a); g.gain.exponentialRampToValueAtTime(0.0005, t + dur);
    if (lp){ const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.setValueAtTime(lp, t); o.connect(f); f.connect(g); } else o.connect(g);
    g.connect(this.musBus); o.start(t); o.stop(t + dur + .05);
  },
  _mkick(t, vol){
    const c = this.ctx, o = c.createOscillator(), g = c.createGain();
    o.type = 'sine'; o.frequency.setValueAtTime(110, t); o.frequency.exponentialRampToValueAtTime(38, t + .18);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0005, t + .32);
    o.connect(g); g.connect(this.musBus); o.start(t); o.stop(t + .36);
  },
  _mnoise(t, dur, vol, type, freq){
    if (!this.noise) return;
    const c = this.ctx, s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
    s.buffer = this.noise; f.type = type; f.frequency.value = freq;
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0005, t + dur);
    s.connect(f); f.connect(g); g.connect(this.musBus); s.start(t, Math.random() * .3); s.stop(t + dur + .05);
  },
  // Tempo (pas de double croche, en secondes) par état
  _musStepDur(st){ return st === 'boss' ? 60 / 112 / 4 : st === 'wave' ? 60 / 96 / 4 : 60 / 62 / 4; },
  // À appeler à chaque image : planifie les notes un peu à l'avance
  musTick(){
    if (!this.on || !this._musReady() || this.ctx.state !== 'running') return;
    try{
      const now = this.ctx.currentTime;
      if (now < this.musHold) return; // fanfare en cours
      if (this.musWant !== this.musCur){
        this.musCur = this.musWant; this.musStep = 0; this.musNext = Math.max(this.musNext, now + .08);
      }
      if (this.musCur === 'off') return;
      if (this.musNext < now - .2) this.musNext = now + .05; // retour après une pause de l'onglet
      const sd = this._musStepDur(this.musCur);
      let n = 0;
      while (this.musNext < now + .3 && n++ < 24){
        this._musPlay(this.musCur, this.musStep, this.musNext, sd);
        this.musNext += sd; this.musStep++;
      }
    }catch(e){}
  },
  _musPlay(st, k, t, sd){
    const s = k % 16, bar = Math.floor(k / 16), I = this.musInt;
    if (st === 'menu'){
      // La mineur, lent et doux : nappe d'accords, basse ronde, quelques notes de cloche
      const CH = [[57, 60, 64], [53, 57, 60], [50, 53, 57], [52, 56, 59]], ch = CH[bar % 4];
      if (s === 0){
        ch.forEach(m => this._mn(m, t, sd * 16 * 1.05, 'triangle', .035, 1.4, 1400));
        this._mn(ch[0] - 24, t, sd * 15, 'sine', .09, .4);
      }
      if ((s === 6 || s === 10 || s === 14) && Math.random() < .55) this._mn(pick(ch) + 12 + (Math.random() < .3 ? 12 : 0), t, 1.8, 'sine', .028, .01);
    } else if (st === 'wave'){
      // Ré mineur, sombre : basse pulsée, battement de cœur ; plus intense = filtre ouvert, charleston, arpège, caisse claire
      const ROOT = [38, 38, 41, 36][bar % 4];
      if (s % 2 === 0) this._mn(ROOT + (s === 6 || s === 14 ? 12 : 0), t, sd * 1.8, 'sawtooth', .06 + .03 * I, .005, 260 + 1100 * I);
      if (s === 0 || s === 3 || (I > .6 && (s === 8 || s === 11))) this._mkick(t, .2 + .15 * I);
      if (I > .25 && s % 4 === 2) this._mnoise(t, .05, .025 + .04 * I, 'highpass', 6500);
      if (I > .55 && s % 2 === 1){ const A = [0, 3, 7, 10, 12, 10, 7, 3]; this._mn(ROOT + 24 + A[(s >> 1) % 8], t, sd * 1.5, 'square', .018 * I, .005, 1800); }
      if (I > .7 && (s === 4 || s === 12)) this._mnoise(t, .14, .09 * I, 'bandpass', 1800);
      if (s === 0 && bar % 2 === 0) [62, 63].forEach(m => this._mn(m + (bar % 4 ? 0 : -2), t, sd * 30, 'sine', .012 + .01 * I, 1.5)); // nappe dissonante
    } else if (st === 'boss'){
      // Do mineur, lourd : grosse caisse à chaque temps, caisse claire, basse en octaves avec triton, cuivres
      const B = [36, 36, 48, 36, 36, 42, 36, 48, 36, 36, 48, 36, 39, 42, 41, 38];
      this._mn(B[s] - (bar % 4 === 3 ? 2 : 0), t, sd * .9, 'sawtooth', .08, .004, 700);
      if (s % 4 === 0 || s === 14) this._mkick(t, .42);
      if (s === 4 || s === 12) this._mnoise(t, .18, .16, 'bandpass', 1600);
      if (s % 2 === 1) this._mnoise(t, .04, .03, 'highpass', 7000);
      if (s === 0 || (s === 10 && bar % 2)){
        const C = bar % 2 ? [47, 50, 54] : [48, 51, 55];
        C.forEach(m => { this._mn(m, t, .55, 'sawtooth', .045, .02, 1500); this._mn(m + 12, t, .45, 'square', .015, .02, 1200); });
      }
      if (s === 0 && bar % 2 === 0) this._mn(24, t, sd * 30, 'sine', .14, .3);
    }
  },
  // Petite fanfare de victoire (Do majeur), puis la musique calme reprend
  musFanfare(){
    if (!this.on || !this._musReady()) return;
    try{
      const t = this.ctx.currentTime + .05, M = [67, 72, 76, 79];
      M.forEach((m, i) => { this._mn(m, t + i * .14, .3, 'square', .05, .005, 2600); this._mn(m - 12, t + i * .14, .3, 'triangle', .06, .005); });
      const t2 = t + M.length * .14;
      [72, 76, 79, 84].forEach(m => { this._mn(m, t2, 1.6, 'square', .035, .01, 2200); this._mn(m, t2, 1.8, 'triangle', .05, .01); });
      this._mn(48, t2, 1.8, 'sine', .14, .01);
      this._mkick(t2, .4); this._mnoise(t2, .9, .1, 'highpass', 5000);
      this.musHold = t2 + 1.9; this.musCur = 'off';
    }catch(e){}
  },
  // Défaite : quelques notes graves qui descendent
  musDefeat(){
    if (!this.on || !this._musReady()) return;
    try{
      const t = this.ctx.currentTime + .05;
      [55, 53, 51, 50].forEach((m, i) => this._mn(m - 12, t + i * .45, .9, 'sawtooth', .05, .03, 600));
      this._mn(26, t, 2.6, 'sine', .12, .2);
      this.musHold = t + 2.4; this.musCur = 'off';
    }catch(e){}
  }
};
