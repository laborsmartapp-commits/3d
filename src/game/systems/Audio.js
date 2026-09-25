export class AudioManager {
  constructor() { this.ctx = null; this.volume = 0.7; this.birdT = 2; this.owlT = 8; }

  start() {
    if (this.ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    const ctx = (this.ctx = new AC());
    this.master = ctx.createGain();
    this.master.gain.value = this.volume;
    this.master.connect(ctx.destination);
    const len = ctx.sampleRate * 2;
    this.noise = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = this.noise.getChannelData(0);
    let last = 0;
    for (let i = 0; i < len; i++) { const w = Math.random() * 2 - 1; last = (last + 0.02 * w) / 1.02; d[i] = w * 0.5 + last * 3; }
    this.wind = this.loop('lowpass', 420, 0.7);
    this.water = this.loop('bandpass', 700, 0.6);
    this.rain = this.loop('highpass', 1800, 0.5);
    this.hum = this.tone(220);
    this.hum2 = this.tone(329.6);
    const osc = ctx.createOscillator(); osc.frequency.value = 4300;
    const g1 = ctx.createGain(); g1.gain.value = 0;
    const lfo = ctx.createOscillator(); lfo.type = 'square'; lfo.frequency.value = 26;
    const lg = ctx.createGain(); lg.gain.value = 0.5; lfo.connect(lg); lg.connect(g1.gain);
    const lfo2 = ctx.createOscillator(); lfo2.type = 'square'; lfo2.frequency.value = 1.3;
    const g2 = ctx.createGain(); g2.gain.value = 0;
    const l2g = ctx.createGain(); l2g.gain.value = 0.5; lfo2.connect(l2g); l2g.connect(g2.gain);
    this.crick = ctx.createGain(); this.crick.gain.value = 0;
    osc.connect(g1); g1.connect(g2); g2.connect(this.crick); this.crick.connect(this.master);
    osc.start(); lfo.start(); lfo2.start();
  }

  loop(type, freq, q) {
    const s = this.ctx.createBufferSource(); s.buffer = this.noise; s.loop = true;
    const f = this.ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
    const g = this.ctx.createGain(); g.gain.value = 0;
    s.connect(f); f.connect(g); g.connect(this.master); s.start(0, Math.random() * 2);
    return { g, f };
  }

  tone(freq) {
    const o = this.ctx.createOscillator(); o.frequency.value = freq;
    const g = this.ctx.createGain(); g.gain.value = 0;
    o.connect(g); g.connect(this.master); o.start();
    return { g };
  }

  set(node, v, t = 0.6) { if (this.ctx) node.g.gain.setTargetAtTime(v, this.ctx.currentTime, t); }
  setVolume(v) { this.volume = v; if (this.master) this.master.gain.setTargetAtTime(v, this.ctx.currentTime, 0.1); }

  burst({ type = 'lowpass', freq = 1000, q = 1, dur = 0.08, vol = 0.2, delay = 0 }) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime + delay;
    const s = this.ctx.createBufferSource(); s.buffer = this.noise;
    const f = this.ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + 0.008); g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
    s.connect(f); f.connect(g); g.connect(this.master);
    s.start(t, Math.random() * 1.5); s.stop(t + dur + 0.05);
  }

  sweep(f0, f1, dur, vol, type = 'sine', delay = 0) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime + delay;
    const o = this.ctx.createOscillator(); o.type = type;
    o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + dur);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
    o.connect(g); g.connect(this.master); o.start(t); o.stop(t + dur + 0.05);
  }

  footstep(surface) {
    const map = {
      grass: { type: 'lowpass', freq: 900, vol: 0.08 }, dirt: { type: 'lowpass', freq: 1400, vol: 0.1 }, sand: { type: 'lowpass', freq: 700, vol: 0.09, dur: 0.12 },
      stone: { type: 'bandpass', freq: 2400, q: 1.5, vol: 0.12, dur: 0.05 }, crystal: { type: 'bandpass', freq: 3600, q: 3, vol: 0.1, dur: 0.07 },
      wood: { type: 'bandpass', freq: 500, q: 1.2, vol: 0.16, dur: 0.07 }, leaves: { type: 'highpass', freq: 1600, vol: 0.06, dur: 0.12 },
      water: { type: 'highpass', freq: 1200, vol: 0.12, dur: 0.22 },
    };
    this.burst({ dur: 0.08, ...(map[surface] || map.grass) });
    if (surface === 'crystal') this.sweep(2600, 2500, 0.3, 0.02);
  }

  thunder(delay = 1) {
    this.burst({ type: 'lowpass', freq: 180, dur: 3.5, vol: 0.9, delay });
    this.burst({ type: 'lowpass', freq: 90, dur: 4.5, vol: 0.7, delay: delay + 0.3 });
  }
  chirp() { const f = 2200 + Math.random() * 1600; this.sweep(f, f * 1.4, 0.12, 0.05); this.sweep(f * 1.1, f * 1.6, 0.1, 0.04, 'sine', 0.16); }
  owl() { this.sweep(420, 380, 0.5, 0.06); this.sweep(420, 360, 0.7, 0.06, 'sine', 0.6); }
  whale() { this.sweep(90, 60, 3.5, 0.12, 'triangle'); this.sweep(140, 95, 2.5, 0.05, 'sine', 0.8); }
  error() { this.sweep(300, 180, 0.2, 0.06, 'square'); }
  chime() { [0, 0.12, 0.24].forEach((d, i) => this.sweep(660 * (1 + i * 0.25), 660 * (1 + i * 0.25), 0.9, 0.05, 'sine', d)); }
  build() { for (let i = 0; i < 6; i++) this.burst({ type: 'bandpass', freq: 600 + i * 120, q: 2, dur: 0.07, vol: 0.12, delay: i * 0.18 }); this.chime(); }

  update(dt, c) {
    if (!this.ctx) return;
    this.set(this.wind, 0.03 + c.wind * 0.18 + c.altitude * 0.1);
    this.set(this.water, Math.max(0, 1 - c.waterDist / 70) * 0.35);
    this.set(this.rain, c.rain * 0.3);
    this.set(this.hum, Math.max(0, 1 - c.crystalDist / 25) * 0.035);
    this.set(this.hum2, Math.max(0, 1 - c.crystalDist / 25) * 0.02);
    this.crick.gain.setTargetAtTime(c.night * 0.018 * (1 - c.rain), this.ctx.currentTime, 1);
    this.birdT -= dt;
    if (this.birdT < 0) { if (c.day > 0.5 && c.rain < 0.4) this.chirp(); this.birdT = (1.5 + Math.random() * 5) / (0.4 + c.forest); }
    this.owlT -= dt;
    if (this.owlT < 0) { if (c.night > 0.7) this.owl(); this.owlT = 15 + Math.random() * 25; }
  }
}