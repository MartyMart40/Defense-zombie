'use strict';
/* ================= Son ================= */
const Snd = {
  ctx:null, master:null, noise:null, on: store.get('dt_sound', true),
  init(){
    if (this.ctx){ if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    try{
      const C = window.AudioContext || window.webkitAudioContext; if (!C) return;
      this.ctx = new C(); this.master = this.ctx.createGain();
      this.master.gain.value = this.on ? 0.5 : 0; this.master.connect(this.ctx.destination);
      const len = Math.floor(this.ctx.sampleRate * 0.7), b = this.ctx.createBuffer(1, len, this.ctx.sampleRate), d = b.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      this.noise = b;
    }catch(e){ this.ctx = null; }
  },
  setOn(v){ this.on = v; store.set('dt_sound', v); if (this.master) this.master.gain.value = v ? 0.5 : 0; },
  burst(freq, dur, vol, delay){
    if (!this.ctx) return; const c = this.ctx, t = c.currentTime + (delay || 0);
    const s = c.createBufferSource(); s.buffer = this.noise;
    const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.setValueAtTime(freq, t); f.frequency.exponentialRampToValueAtTime(120, t + dur);
    const g = c.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    s.connect(f); f.connect(g); g.connect(this.master); s.start(t); s.stop(t + dur + 0.05);
  },
  tone(freq, dur, type, vol, slideTo, delay){
    if (!this.ctx) return; const c = this.ctx, t = c.currentTime + (delay || 0);
    const o = c.createOscillator(); o.type = type; o.frequency.setValueAtTime(freq, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    const g = c.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g); g.connect(this.master); o.start(t); o.stop(t + dur + 0.05);
  },
  shot(kind){
    const p = { pistol:[2400, .18, .45], shotgun:[1300, .38, .85], rifle:[2800, .12, .38], sniper:[1000, .55, .95] }[kind];
    this.burst(p[0], p[1], p[2]); this.tone(150, .16, 'sine', p[2] * .8, 40);
  },
  hit(){ this.tone(1100, .05, 'square', .05, 600); },
  reload(){ this.tone(1500, .04, 'square', .07, 900); this.tone(900, .05, 'square', .08, 500, .28); },
  empty(){ this.tone(2000, .03, 'square', .05); },
  thud(){ this.burst(400, .22, .45); },
  buy(){ this.tone(700, .08, 'triangle', .12); this.tone(1050, .12, 'triangle', .12, null, .08); },
  groan(){
    if (!this.ctx) return; const c = this.ctx, t = c.currentTime, d = rand(.8, 1.5);
    const o = c.createOscillator(); o.type = 'sawtooth'; const f0 = rand(70, 120);
    o.frequency.setValueAtTime(f0, t); o.frequency.linearRampToValueAtTime(f0 * .7, t + d);
    const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 420;
    const g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(.09, t + .2); g.gain.exponentialRampToValueAtTime(0.001, t + d);
    o.connect(lp); lp.connect(g); g.connect(this.master); o.start(t); o.stop(t + d + .05);
  },
  // Tonnerre : grondement grave, un peu après l'éclair (delay en secondes)
  thunder(delay, power){
    if (!this.ctx) return; const c = this.ctx, t = c.currentTime + (delay || 0), p = power || 1, d = 2.2 + p;
    try{
      const s = c.createBufferSource(); s.buffer = this.noise; s.loop = true;
      const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.setValueAtTime(900 * p, t); f.frequency.exponentialRampToValueAtTime(70, t + d);
      const g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(.55 * p, t + .06); g.gain.exponentialRampToValueAtTime(.2 * p, t + .5);
      g.gain.linearRampToValueAtTime(.3 * p, t + .9); g.gain.exponentialRampToValueAtTime(0.001, t + d);
      s.connect(f); f.connect(g); g.connect(this.master); s.start(t); s.stop(t + d + .1);
      this.tone(48, d * .7, 'sine', .25 * p, 30, delay);
    }catch(e){}
  },
  // Pluie en continu : bruit filtré en boucle, niveau 0 (arrêt) à environ 1,5 (orage)
  rainLvl: 0, rainSrc: null, rainGain: null,
  rainLevel(v){
    v = v || 0; if (!this.ctx){ this.rainLvl = 0; return; }
    if (Math.abs(v - this.rainLvl) < .01 && (v === 0 || this.rainSrc)) return;
    this.rainLvl = v;
    const c = this.ctx, t = c.currentTime;
    try{
      if (v > 0 && !this.rainSrc){
        const s = c.createBufferSource(); s.buffer = this.noise; s.loop = true;
        const hp = c.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 700;
        const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 5200;
        const g = c.createGain(); g.gain.value = 0.0001;
        s.connect(hp); hp.connect(lp); lp.connect(g); g.connect(this.master); s.start(t);
        this.rainSrc = s; this.rainGain = g;
      }
      if (this.rainGain) this.rainGain.gain.setTargetAtTime(v > 0 ? .07 * v : 0.0001, t, .8);
      if (v <= 0 && this.rainSrc){ const s = this.rainSrc; this.rainSrc = null; this.rainGain = null; try{ s.stop(t + 3); }catch(e){} }
    }catch(e){ this.rainSrc = null; this.rainGain = null; }
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
    if (!this._musReady() || this.ctx.state !== 'running') return;
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
    if (!this._musReady()) return;
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
    if (!this._musReady()) return;
    try{
      const t = this.ctx.currentTime + .05;
      [55, 53, 51, 50].forEach((m, i) => this._mn(m - 12, t + i * .45, .9, 'sawtooth', .05, .03, 600));
      this._mn(26, t, 2.6, 'sine', .12, .2);
      this.musHold = t + 2.4; this.musCur = 'off';
    }catch(e){}
  }
};
