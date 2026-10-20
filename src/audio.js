// Procedural WebAudio sound for Digiplanes. No assets: every sound is synthesized.
// The context starts on the first user gesture (browser autoplay rules).

const PENTA = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21, 24, 26, 28, 31, 33, 36];

// FM songs are plain scripts that push onto window.GlassFMSongs; load each once on demand
// (after compose.js, the little composing kit they are written with).
const scriptLoads = new Map();
function loadScript(src) {
  if (!scriptLoads.has(src)) {
    scriptLoads.set(src, new Promise((res) => {
      const el = document.createElement('script');
      el.src = src;
      el.onload = () => res(true);
      el.onerror = () => res(false);
      document.head.append(el);
    }));
  }
  return scriptLoads.get(src);
}
async function loadSong(id) {
  const find = () => (window.GlassFMSongs || []).find((s) => s.id === id) || null;
  if (find()) return find();
  await loadScript('music/fm/compose.js');
  try { await loadScript(`music/fm/${id}.js`); } catch { /* a broken song file just means no music */ }
  return find();
}
const hz = (semi, base = 523.25) => base * Math.pow(2, semi / 12);
// Events a browser accepts as the gesture that may start audio. iOS Safari ignores touchstart/pointerdown
// for this and only takes the end of a tap (touchend, pointerup, click).
const GESTURES = ['keydown', 'pointerdown', 'pointerup', 'touchend', 'click'];
function onGesture(fn) {
  const once = () => { GESTURES.forEach((t) => removeEventListener(t, once, true)); fn(); };
  GESTURES.forEach((t) => addEventListener(t, once, { capture: true, passive: true }));
}

export class Sound {
  constructor() {
    this.ctx = null;
    this.muted = false;
    try { this.muted = localStorage.getItem('dp-muted') === '1'; } catch { /* storage blocked */ }
    this.lastClack = 0;
    this.lastTink = 0;
    // ?silent in the URL disables audio entirely (used for automated tests)
    this.silent = new URLSearchParams(location.search).has('silent');
    const unlock = () => this.start();
    GESTURES.forEach((t) => addEventListener(t, unlock, { capture: true, passive: true }));
    // go quiet in a background tab (e.g. while the ♪ SYNTH tab is open), pick up again on return
    document.addEventListener('visibilitychange', () => {
      if (!this.ctx) return;
      if (document.hidden) { this.ctx.suspend(); this.track?.pause(); }
      else { this.ctx.resume(); this.track?.play().catch(() => {}); }
    });
  }

  start() {
    if (this.silent) return;
    window.iosAudio?.(); // iPhone: play through the silent switch (synth/ios-audio.js)
    // 'suspended' before the first real tap, 'interrupted' on iOS after a call or the lock screen
    if (this.ctx) { if (this.ctx.state !== 'running' && !document.hidden) this.ctx.resume().catch(() => {}); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    const ctx = (this.ctx = new AC());
    this.master = ctx.createGain();
    this.master.gain.value = this.muted ? 0 : 0.7;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -16; comp.ratio.value = 4;
    this.master.connect(comp).connect(ctx.destination);

    // reverb send: generated impulse, wide and glassy
    this.verb = ctx.createConvolver();
    const len = ctx.sampleRate * 2.2, ir = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let c = 0; c < 2; c++) {
      const d = ir.getChannelData(c);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3.2);
    }
    this.verb.buffer = ir;
    this.verbGain = ctx.createGain();
    this.verbGain.gain.value = 0.32;
    this.verb.connect(this.verbGain).connect(this.master);

    // stereo ping-pong echo: repeats bounce L/R and darken as they fade, for a sense of deep space
    this.echo = ctx.createGain();
    const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 350;
    const dL = ctx.createDelay(2), dR = ctx.createDelay(2);
    dL.delayTime.value = 0.28; dR.delayTime.value = 0.42;
    const fbL = ctx.createGain(), fbR = ctx.createGain();
    fbL.gain.value = fbR.gain.value = 0.42;
    const damp = ctx.createBiquadFilter(); damp.type = 'lowpass'; damp.frequency.value = 3200;
    const panL = ctx.createStereoPanner(), panR = ctx.createStereoPanner();
    panL.pan.value = -0.75; panR.pan.value = 0.75;
    const ret = ctx.createGain(); ret.gain.value = 0.55;
    this.echo.connect(hp).connect(dL);
    dL.connect(panL).connect(ret);
    dR.connect(panR).connect(ret);
    dL.connect(fbL).connect(damp).connect(dR);
    dR.connect(fbR).connect(dL);
    ret.connect(this.master);
    ret.connect(this.verb); // echoes also wash into the reverb tail

    this.noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const nd = this.noiseBuf.getChannelData(0);
    for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;

  }

  setMuted(m) {
    this.muted = m;
    try { localStorage.setItem('dp-muted', m ? '1' : '0'); } catch { /* storage blocked */ }
    if (this.master) this.master.gain.setTargetAtTime(m ? 0 : 0.7, this.ctx.currentTime, 0.05);
  }
  toggle() { this.setMuted(!this.muted); return this.muted; }

  get ok() { return this.ctx && this.ctx.state === 'running'; }
  get now() { return this.ctx.currentTime; }

  // dry level, reverb send, echo send
  out(dry = 1, wet = 0, echo = 0) {
    const g = this.ctx.createGain();
    g.gain.value = dry;
    g.connect(this.master);
    if (wet) { const s = this.ctx.createGain(); s.gain.value = wet; g.connect(s).connect(this.verb); }
    if (echo) { const e = this.ctx.createGain(); e.gain.value = echo; g.connect(e).connect(this.echo); }
    return g;
  }
  env(param, t, a, peak, d, end = 0.0001) {
    param.cancelScheduledValues(t);
    param.setValueAtTime(0.0001, t);
    param.exponentialRampToValueAtTime(peak, t + a);
    param.exponentialRampToValueAtTime(end, t + a + d);
  }
  tone(type, f, t, a, d, peak, dest, f2) {
    const o = this.ctx.createOscillator(), g = this.ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f, t);
    if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + a + d);
    this.env(g.gain, t, a, peak, d);
    o.connect(g).connect(dest);
    o.start(t);
    o.stop(t + a + d + 0.05);
  }
  noise(t, d, peak, dest, type = 'bandpass', f = 1000, q = 1, f2) {
    const s = this.ctx.createBufferSource(), flt = this.ctx.createBiquadFilter(), g = this.ctx.createGain();
    s.buffer = this.noiseBuf;
    flt.type = type; flt.frequency.setValueAtTime(f, t); flt.Q.value = q;
    if (f2) flt.frequency.exponentialRampToValueAtTime(f2, t + d);
    this.env(g.gain, t, 0.004, peak, d);
    s.connect(flt).connect(g).connect(dest);
    s.start(t, Math.random());
    s.stop(t + d + 0.05);
  }

  // ---------- continuous layers ----------


  // ---------- one-shots ----------
  clack(intensity, size = 1) {
    if (!this.ok) return;
    const t = this.now;
    if (t - this.lastClack < 0.035) return;
    this.lastClack = t;
    const v = Math.min(1, intensity / 5) * 0.16;
    const out = this.out(1, 0.15, 0.12);
    const f = (2300 + Math.random() * 900) / Math.sqrt(size);
    this.tone('sine', f, t, 0.001, 0.07, v, out);
    this.tone('sine', f * 1.47, t, 0.001, 0.045, v * 0.6, out);
    this.noise(t, 0.02, v * 0.8, out, 'highpass', 5000);
  }
  // glassy bell that climbs the scale as the pickup chain grows
  capture(chain) {
    if (!this.ok) return;
    const t = this.now, out = this.out(0.85, 0.45, 0.55);
    const f = hz(PENTA[Math.min(chain, PENTA.length - 1)], 783.99);
    this.tone('sine', f, t, 0.002, 0.45, 0.17, out);
    this.tone('sine', f * 2.76, t, 0.001, 0.22, 0.07, out);
    this.tone('sine', f * 5.4, t, 0.001, 0.1, 0.03, out);
    if (chain >= 2) {
      // sparkle tail on streaks
      for (let i = 0; i < Math.min(chain, 5); i++) {
        this.tone('sine', f * 2 * (1 + i * 0.25), t + 0.05 + i * 0.035, 0.001, 0.12, 0.035, out);
      }
    }
  }
  // marbles knocking together inside the cage
  tink(v) {
    if (!this.ok) return;
    const t = this.now;
    if (t - this.lastTink < 0.05) return;
    this.lastTink = t;
    const out = this.out(0.9, 0.2, 0.35), k = Math.min(1, v / 3) * 0.1;
    const f = 3600 + Math.random() * 1800;
    this.tone('sine', f, t, 0.001, 0.14, k, out);
    this.tone('sine', f * 1.51, t, 0.001, 0.07, k * 0.5, out);
  }
  land(v) {
    if (!this.ok) return;
    const t = this.now, out = this.out(1, 0.1), k = Math.min(1, v / 9);
    this.tone('sine', 120, t, 0.003, 0.25, 0.35 * k, out, 38);
    this.noise(t, 0.12, 0.2 * k, out, 'lowpass', 900);
  }
  thump(v) {
    if (!this.ok) return;
    const t = this.now, out = this.out(1, 0.2, 0.1), k = Math.min(1, v / 8);
    this.tone('sine', 160, t, 0.002, 0.18, 0.3 * k, out, 60);
    this.tone('square', 900, t, 0.001, 0.05, 0.04 * k, out, 400);
  }
  smash() {
    if (!this.ok) return;
    const t = this.now, out = this.out(1, 0.5, 0.25);
    this.noise(t, 0.5, 0.45, out, 'highpass', 2500, 0.8);
    this.noise(t, 0.25, 0.4, out, 'bandpass', 600, 1, 120);
    this.tone('sine', 90, t, 0.002, 0.4, 0.4, out, 35);
    for (let i = 0; i < 9; i++) {
      const dt = Math.random() * 0.35;
      this.tone('sine', 2500 + Math.random() * 4000, t + dt, 0.001, 0.15 + Math.random() * 0.3, 0.05, out);
    }
  }
  tierUp(tier) {
    if (!this.ok) return;
    const t = this.now, out = this.out(0.9, 0.7, 0.4);
    this.noise(t, 0.6, 0.18, out, 'bandpass', 400, 3, 6000);
    this.tone('sine', 55, t + 0.5, 0.005, 0.9, 0.45, out, 30);
    const root = [0, 3, 5][tier - 1] || 0;
    [0, 4, 7, 12, 16, 19].forEach((s, i) => {
      this.tone('triangle', hz(root + s, 261.6), t + 0.5 + i * 0.05, 0.01, 1.4, 0.07, out);
      this.tone('sine', hz(root + s + 12, 261.6), t + 0.5 + i * 0.05, 0.005, 0.8, 0.04, out);
    });
  }
  bank(n) {
    if (!this.ok) return;
    const t = this.now, out = this.out(0.7, 0.6, 0.5);
    const m = Math.min(n, 30);
    for (let i = 0; i < m; i++) {
      const tt = t + 0.25 + i * 0.045;
      const f = hz(PENTA[i % PENTA.length], 523.25);
      this.tone('sine', f, tt, 0.002, 0.25, 0.09, out);
      this.tone('sine', f * 2.01, tt, 0.002, 0.12, 0.03, out);
    }
    const end = t + 0.35 + m * 0.045;
    [0, 4, 7, 11, 14].forEach((s, i) => this.tone('triangle', hz(s, 392), end + i * 0.02, 0.02, 1.6, 0.07, out));
    this.tone('sine', 65, end, 0.01, 1.0, 0.3, out, 45);
  }
  spill(n) {
    if (!this.ok) return;
    const t = this.now, out = this.out(0.9, 0.3, 0.35);
    for (let i = 0; i < Math.min(n, 6); i++) this.tone('square', 900 - i * 110, t + i * 0.05, 0.002, 0.08, 0.04, out, 500 - i * 60);
    this.tone('sine', 300, t, 0.003, 0.3, 0.12, out, 90);
  }
  fall() {
    if (!this.ok) return;
    const t = this.now, out = this.out(0.9, 0.6, 0.4);
    this.tone('sawtooth', 600, t, 0.01, 0.9, 0.08, out, 40);
    this.noise(t, 0.9, 0.15, out, 'bandpass', 3000, 2, 150);
  }
  hop() {
    if (!this.ok) return;
    const t = this.now, out = this.out(0.8, 0.2, 0.3);
    this.tone('sine', 280, t, 0.004, 0.14, 0.12, out, 560);
  }
  tick(last) {
    if (!this.ok) return;
    const t = this.now, out = this.out(0.8, 0.2, 0.3);
    this.tone('square', last ? 1320 : 990, t, 0.001, 0.06, 0.05, out);
  }
  alarm() {
    if (!this.ok) return;
    const t = this.now, out = this.out(0.9, 0.5, 0.4);
    for (let i = 0; i < 3; i++) {
      this.tone('sawtooth', 220, t + i * 0.22, 0.01, 0.16, 0.07, out, 165);
      this.tone('sawtooth', 233, t + i * 0.22, 0.01, 0.16, 0.05, out, 175);
    }
    this.tone('sine', 50, t, 0.02, 1.2, 0.4, out, 32);
  }
  // heartbeat-like pulse while a hunter is close; k = 0..1 closeness
  beat(k) {
    if (!this.ok) return;
    const t = this.now, out = this.out(1, 0.05);
    this.tone('sine', 62, t, 0.004, 0.16, 0.12 + 0.3 * k, out, 40);
    this.tone('sine', 58, t + 0.14, 0.004, 0.14, 0.08 + 0.2 * k, out, 38);
  }

  // Your own track (music/<id>.mp3) wins if present; otherwise the plane's Glass FM song
  // (music/fm/<id>.js) is played live on the FM synth.
  async music(id) {
    if (this.trackId === id && (this.track || this.fmSong)) return;
    this.stopMusic();
    this.trackId = id;
    const url = `music/${id}.mp3`;
    try {
      const head = await fetch(url, { method: 'HEAD' });
      if (this.trackId !== id) return;
      // a static host answers 404 (server.js answers 204) when there is no mp3
      if (head.status !== 200) return this.fmMusic(id);
    } catch { return this.trackId === id ? this.fmMusic(id) : undefined; }
    const el = new Audio(url);
    el.loop = true;
    el.crossOrigin = 'anonymous';
    this.track = el;
    const play = () => {
      if (this.track !== el) return;
      this.start();
      if (!this.ctx) return;
      if (!el._src) { el._src = this.ctx.createMediaElementSource(el); const g = this.ctx.createGain(); g.gain.value = 0.8; el._src.connect(g).connect(this.master); }
      el.play().catch(() => {});
    };
    if (this.ok) play(); else onGesture(play);
  }
  stopMusic() {
    if (this.track) { this.track.pause(); this.track = null; }
    this.fmSong = null;
    this.fmPlayer?.stop(0.8); // let the last notes ring out under the plane change
  }

  async fmMusic(id) {
    const GFM = window.GlassFM;
    if (!GFM) return;
    const song = await loadSong(id);
    if (!song || this.trackId !== id) return;
    this.fmSong = song;
    const play = async () => {
      if (this.fmSong !== song) return;
      this.start();
      if (!this.ctx) return;
      if (!this.fm) {
        this.fm = new GFM.FMEngine();
        const bus = this.ctx.createGain();
        bus.gain.value = 0.55; // music sits under the sound effects
        bus.connect(this.master);
        await this.fm.start({ ctx: this.ctx, destination: bus });
        this.fm.setVolume(1, false);
        this.fmPlayer = new GFM.SongPlayer(this.fm);
      }
      if (this.fmSong === song) this.fmPlayer.play(song, { loop: true });
    };
    if (this.ok) play();
    else onGesture(play);
  }

  over() {
    if (!this.ok) return;
    const t = this.now, out = this.out(0.8, 0.7, 0.5);
    [12, 7, 4, 0, -5].forEach((s, i) => this.tone('triangle', hz(s, 392), t + i * 0.12, 0.01, 1.2, 0.08, out));
  }
}
