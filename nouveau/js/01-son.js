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
  }
};
