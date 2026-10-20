// Glass FM — a small 2-operator FM synth in the spirit of early-90s vector/FM
// workstations: thin glassy bells, digital e-pianos, metallic plucks, plus a
// ping-pong echo and a grainy early-digital reverb. Pure Web Audio, no deps.
// Classic script (works from file:// too): exposes window.GlassFM.
(() => {

const PATCH_PARAMS = {
  ratio:    { label: 'Ratio',   min: 0.5,  max: 14,  scale: 'log', fmt: (v) => v.toFixed(2) },
  idx:      { label: 'Index',   min: 0,    max: 4,   fmt: (v) => v.toFixed(2) },
  idxAtk:   { label: 'Strike',  min: 0,    max: 8,   fmt: (v) => v.toFixed(1) },
  idxDecay: { label: 'Strike T',min: 0.02, max: 3,   scale: 'log', fmt: sec },
  shimmer:  { label: 'Shimmer', min: 0,    max: 0.4, fmt: pct(0.4) },
  det:      { label: 'Chorus',  min: 0,    max: 20,  fmt: (v) => v.toFixed(1) + 'c' },
  A:        { label: 'Attack',  min: 0.001,max: 3,   scale: 'log', fmt: sec },
  D:        { label: 'Decay',   min: 0.05, max: 8,   scale: 'log', fmt: sec },
  S:        { label: 'Sustain', min: 0,    max: 1,   fmt: pct(1) },
  R:        { label: 'Release', min: 0.02, max: 6,   scale: 'log', fmt: sec },
  level:    { label: 'Level',   min: 0,    max: 1.5, fmt: pct(1) },
};

function sec(v) { return v < 1 ? Math.round(v * 1000) + 'ms' : v.toFixed(2) + 's'; }
function pct(max) { return (v) => Math.round((v / max) * 100) + '%'; }

// tine / partial ratios are fixed per patch; knobs cover the musical controls
const PRESETS = {
  glassBell: {
    name: 'Glass Bell', ratio: 3.5, idx: 0.8, idxAtk: 3.2, idxDecay: 0.35, shimmer: 0.12, partial: 5.19,
    det: 4, A: 0.002, D: 2.4, S: 0, R: 1.4, level: 1.0,
  },
  chime: {
    name: 'Delicate Chime', ratio: 3.5, idx: 0.4, idxAtk: 1.8, idxDecay: 0.6, shimmer: 0.08, partial: 7.11,
    det: 6, A: 0.002, D: 3.2, S: 0, R: 2.0, level: 0.85, octave: 1,
  },
  glassEP: {
    name: 'Glass E.Piano', ratio: 1, idx: 0.8, idxAtk: 3.0, idxDecay: 0.5, shimmer: 0, tine: 14, tineAmt: 0.1,
    det: 3, A: 0.003, D: 2.6, S: 0.22, R: 0.45, level: 1.0,
  },
  pluck: {
    name: 'Metallic Pluck', ratio: 1.41, idx: 0.5, idxAtk: 4.2, idxDecay: 0.12, shimmer: 0.05, partial: 3.73,
    det: 5, A: 0.001, D: 0.7, S: 0, R: 0.35, level: 0.95,
  },
  musicBox: {
    name: 'Music Box', ratio: 5, idx: 0.6, idxAtk: 2.4, idxDecay: 0.25, shimmer: 0.1, partial: 9.03,
    det: 2, A: 0.001, D: 1.6, S: 0, R: 1.0, level: 0.8, octave: 1,
  },
  bass: {
    name: 'FM Bass', ratio: 1, idx: 0.7, idxAtk: 2.2, idxDecay: 0.25, shimmer: 0,
    det: 0, A: 0.003, D: 0.9, S: 0.55, R: 0.18, level: 1.1,
  },
  pad: {
    name: 'Soft Pad', ratio: 2, idx: 0.7, idxAtk: 0.6, idxDecay: 1.5, shimmer: 0.04, partial: 3.01,
    det: 9, A: 0.6, D: 2.5, S: 0.8, R: 1.8, level: 0.75,
  },
};

const ECHO_DIVS = { '1/8': 0.5, '1/8.': 0.75, '1/4': 1, '1/4.': 1.5, '1/16.': 0.375 };

class FMEngine {
  constructor() {
    this.ctx = null;
    this.voices = [];
    this.maxVoices = 48;
    this.bright = 1;          // vector X: scales FM index of new notes
    this.tune = 0;            // cents; songs can detune like a vintage synth (the SY22 recordings sit ~-24c)
    this.sources = new Map(); // per-keyboard pitch bend / mod wheel / sustain state
    this.fx = { echoMix: 0.35, echoFb: 0.42, echoTone: 3500, bpm: 99, div: '1/8.', revMix: 0.38, revSize: 2.6, grain: 0.4, space: 0.6, lofi: true };
    this.volume = 0.8;
    this.muted = false;
    this.onVoiceCount = null;
  }

  // A host (e.g. the game) can pass its own AudioContext and an output node to share one mix.
  async start({ ctx: hostCtx, destination } = {}) {
    if (this.ctx) { await this.ctx.resume(); return; }
    const ctx = (this.ctx = hostCtx || new AudioContext({ latencyHint: 0 })); // 0 = smallest buffer the device allows

    this.voiceBus = ctx.createGain();
    this.preMaster = ctx.createGain();
    const dry = ctx.createGain();
    this.voiceBus.connect(dry).connect(this.preMaster);

    // space send (vector Y) feeds echo + reverb
    this.send = ctx.createGain();
    this.voiceBus.connect(this.send);

    // ping-pong echo: mono in -> L -> R -> L ...
    this.echoIn = ctx.createGain();
    this.echoIn.channelCount = 1; this.echoIn.channelCountMode = 'explicit';
    this.dL = ctx.createDelay(4); this.dR = ctx.createDelay(4);
    this.toneL = ctx.createBiquadFilter(); this.toneR = ctx.createBiquadFilter();
    this.toneL.type = this.toneR.type = 'lowpass';
    this.fbL = ctx.createGain(); this.fbR = ctx.createGain();
    const merge = ctx.createChannelMerger(2);
    this.echoOut = ctx.createGain();
    this.send.connect(this.echoIn).connect(this.dL);
    this.dL.connect(this.toneL).connect(this.fbL).connect(this.dR);
    this.dR.connect(this.toneR).connect(this.fbR).connect(this.dL);
    this.toneL.connect(merge, 0, 0); this.toneR.connect(merge, 0, 1);
    merge.connect(this.echoOut).connect(this.preMaster);

    // reverb: generated hall IR, then a bit-crushed (grainy) wet path
    this.conv = ctx.createConvolver();
    this.revIn = ctx.createGain();
    this.crush = ctx.createWaveShaper();
    this.revTone = ctx.createBiquadFilter(); this.revTone.type = 'lowpass'; this.revTone.frequency.value = 6000;
    this.revOut = ctx.createGain();
    this.send.connect(this.revIn);
    this.echoOut.connect(this.revIn); // echoes bloom into the hall
    this.revIn.connect(this.conv).connect(this.crush).connect(this.revTone).connect(this.revOut).connect(this.preMaster);

    // master: optional vintage DAC colour (12-bit + 11 kHz roll-off), soft limiter, analyser, volume
    // (no DynamicsCompressor: its fixed ~6 ms lookahead delays every note)
    this.clean = ctx.createGain();
    this.dacIn = ctx.createGain();
    this.dac = ctx.createWaveShaper(); this.dac.curve = stairs(12); this.dac.oversample = 'none';
    const dacLp = ctx.createBiquadFilter(); dacLp.type = 'lowpass'; dacLp.frequency.value = 11000; dacLp.Q.value = 0.5;
    this.comp = ctx.createWaveShaper(); this.comp.curve = softClip(); this.comp.oversample = 'none';
    this.preMaster.connect(this.clean).connect(this.comp);
    this.preMaster.connect(this.dacIn).connect(this.dac).connect(dacLp).connect(this.comp);
    this.analyser = ctx.createAnalyser(); this.analyser.fftSize = 2048;
    this.out = ctx.createGain();
    this.comp.connect(this.analyser).connect(this.out).connect(destination || ctx.destination);

    this.lfo = ctx.createOscillator(); this.lfo.frequency.value = 5.2; this.lfo.start();

    this.applyFx();
    this.setVolume(this.volume, this.muted);
  }

  setVolume(v, muted = this.muted) {
    this.volume = v; this.muted = muted;
    if (this.out) this.out.gain.setTargetAtTime(muted ? 0 : v, this.ctx.currentTime, 0.02);
  }

  setFx(patch) { Object.assign(this.fx, patch); if (this.ctx) this.applyFx(patch); }

  applyFx(changed = null) {
    const f = this.fx, t = this.ctx.currentTime, k = 0.03;
    const beat = 60 / f.bpm, dt = Math.min(3.9, beat * (ECHO_DIVS[f.div] ?? 0.75));
    this.dL.delayTime.setTargetAtTime(dt, t, k); this.dR.delayTime.setTargetAtTime(dt, t, k);
    this.fbL.gain.setTargetAtTime(f.echoFb, t, k); this.fbR.gain.setTargetAtTime(f.echoFb, t, k);
    this.toneL.frequency.setTargetAtTime(f.echoTone, t, k); this.toneR.frequency.setTargetAtTime(f.echoTone, t, k);
    this.echoIn.gain.setTargetAtTime(f.echoMix, t, k);
    this.revIn.gain.setTargetAtTime(f.revMix * 0.9, t, k);
    this.send.gain.setTargetAtTime(f.space, t, k);
    this.revOut.gain.setTargetAtTime(1, t, k);
    this.clean.gain.setTargetAtTime(f.lofi ? 0 : 1, t, k);
    this.dacIn.gain.setTargetAtTime(f.lofi ? 1 : 0, t, k);
    if (!changed || 'grain' in changed) this.crush.curve = stairs(Math.round(16 - f.grain * 10));
    if (!changed || 'revSize' in changed) this.conv.buffer = hallIR(this.ctx, f.revSize);
  }

  source(id) {
    let s = this.sources.get(id);
    if (!s && this.ctx) {
      const bend = new ConstantSourceNode(this.ctx, { offset: 0 }); bend.start();
      const vib = this.ctx.createGain(); vib.gain.value = 0;
      this.lfo.connect(vib).connect(bend.offset); // vibrato rides on the bend signal (cents)
      s = { bend, vib, sustain: false };
      this.sources.set(id, s);
    }
    return s;
  }

  pitchBend(id, amount /* -1..1 */, range = 2) {
    const s = this.source(id); if (!s) return;
    s.bend.offset.setTargetAtTime(amount * range * 100, this.ctx.currentTime, 0.005);
  }

  modWheel(id, amount /* 0..1 */) {
    const s = this.source(id); if (!s) return;
    s.vib.gain.setTargetAtTime(amount * 28, this.ctx.currentTime, 0.02);
  }

  sustain(id, down) {
    const s = this.source(id); if (!s) return;
    s.sustain = down;
    if (!down) for (const v of this.voices) if (v.src === id && v.held && !v.keyDown) this.release(v);
  }

  // `when` (AudioContext seconds) lets a sequencer schedule notes ahead; live playing omits it
  noteOn(id, note, vel, patch, { octave = 0, gain = 1, when } = {}) {
    if (!this.ctx || this.ctx.state !== 'running') return;
    const ctx = this.ctx, t = Math.max(ctx.currentTime, when ?? 0), s = this.source(id);
    // retrigger of the same key from the same source: release the old voice
    for (const v of this.voices) if (v.src === id && v.note === note && v.keyDown) { v.keyDown = false; this.release(v, 0.04, t); }
    while (this.voices.filter((v) => !v.dead).length >= this.maxVoices) {
      const old = this.voices.find((v) => !v.dead); if (!old) break; this.release(old, 0.03);
    }

    const p = patch;
    const semis = note + 12 * (octave + (p.octave || 0)) - 69 + this.tune / 100;
    const f = 440 * 2 ** (semis / 12);
    const vn = vel / 127;
    const mf = f * p.ratio;
    const nodes = [], params = [];

    const amp = ctx.createGain(); amp.gain.value = 0;
    const pan = new StereoPannerNode(ctx, { pan: clamp((semis + 3) / 40 + (Math.random() - 0.5) * 0.25, -0.7, 0.7) });
    amp.connect(pan).connect(this.voiceBus);

    const mod = new OscillatorNode(ctx, { frequency: mf });
    const modG = ctx.createGain();
    const iBase = p.idx * this.bright, iPeak = (p.idx + p.idxAtk * (0.3 + 0.7 * vn)) * this.bright;
    modG.gain.setValueAtTime(iPeak * mf, t);
    modG.gain.setTargetAtTime(iBase * mf, t, Math.max(0.005, p.idxDecay / 3));
    mod.connect(modG); nodes.push(mod); params.push(mod.detune);

    const dets = p.det > 0 ? [-p.det, p.det] : [0];
    for (const d of dets) {
      const car = new OscillatorNode(ctx, { frequency: f, detune: d });
      modG.connect(car.frequency);
      const cg = ctx.createGain(); cg.gain.value = 1 / dets.length;
      car.connect(cg).connect(amp);
      nodes.push(car); params.push(car.detune);
    }
    if (p.tine) { // e-piano tine click
      const o = new OscillatorNode(ctx, { frequency: f * p.tine });
      const g = ctx.createGain();
      g.gain.setValueAtTime(p.tineAmt * vn, t); g.gain.setTargetAtTime(0, t, 0.03);
      o.connect(g).connect(amp); nodes.push(o); params.push(o.detune);
    }
    if (p.shimmer > 0 && p.partial) { // inharmonic partial = metallic shimmer
      const o = new OscillatorNode(ctx, { frequency: f * p.partial });
      const g = ctx.createGain();
      g.gain.setValueAtTime(p.shimmer * (0.4 + 0.6 * vn), t); g.gain.setTargetAtTime(0, t, Math.max(0.05, p.D / 5));
      o.connect(g).connect(amp); nodes.push(o); params.push(o.detune);
    }
    for (const prm of params) s.bend.connect(prm);

    const peak = 0.16 * p.level * gain * (0.25 + 0.75 * vn * vn);
    amp.gain.setValueAtTime(0, t);
    amp.gain.linearRampToValueAtTime(peak, t + p.A);
    amp.gain.setTargetAtTime(peak * p.S, t + p.A, Math.max(0.01, p.D / 4));
    for (const o of nodes) o.start(t);

    const v = { src: id, note, keyDown: true, held: false, dead: false, amp, nodes, params, s, p, born: t };
    this.voices.push(v);
    // percussive patches die on their own even with the key held
    if (p.S === 0) v.autoEnd = setTimeout(() => this.release(v, 0.3), (t - ctx.currentTime + p.A + p.D * 1.9 + 0.1) * 1000);
    this.onVoiceCount?.(this.voices.length);
    return v;
  }

  noteOff(id, note) {
    for (const v of this.voices) {
      if (v.src !== id || v.note !== note || !v.keyDown) continue;
      v.keyDown = false;
      if (v.s.sustain) v.held = true; else this.release(v);
    }
  }

  release(v, rel, at) {
    if (v.dead) return;
    v.dead = true; v.keyDown = false; clearTimeout(v.autoEnd);
    const t = Math.max(this.ctx.currentTime, at ?? 0), R = rel ?? v.p.R;
    const g = v.amp.gain;
    if (g.cancelAndHoldAtTime) g.cancelAndHoldAtTime(t); else { g.cancelScheduledValues(t); g.setValueAtTime(g.value, t); }
    g.setTargetAtTime(0, t, Math.max(0.005, R / 4));
    const end = t + R * 1.6 + 0.05;
    for (const o of v.nodes) o.stop(end);
    v.nodes[0].onended = () => {
      for (const prm of v.params) { try { v.s.bend.disconnect(prm); } catch {} }
      v.amp.disconnect();
      this.voices = this.voices.filter((x) => x !== v);
      this.onVoiceCount?.(this.voices.length);
    };
  }

  // seconds from note-on to sound leaving the browser (buffer + output device)
  latency() {
    if (!this.ctx) return null;
    return { base: this.ctx.baseLatency || 0, output: this.ctx.outputLatency || 0 };
  }

  panic() { for (const v of [...this.voices]) this.release(v, 0.05); }
}

// zero-latency limiter: linear below -6 dB, smooth tanh knee above (peaks land near -1 dB)
function softClip() {
  const n = 8192, c = new Float32Array(n), k = 0.5;
  for (let i = 0; i < n; i++) {
    const x = (i / (n - 1)) * 2 - 1, a = Math.abs(x); // WaveShaper input range is -1..1
    c[i] = Math.sign(x) * (a <= k ? a : k + (1 - k) * Math.tanh((a - k) / (1 - k)));
  }
  return c;
}

function clamp(x, a, b) { return Math.max(a, Math.min(b, x)); }

// staircase transfer curve = bit-depth reduction
function stairs(bits) {
  const n = 65536, c = new Float32Array(n), steps = 2 ** (bits - 1);
  for (let i = 0; i < n; i++) { const x = (i / (n - 1)) * 2 - 1; c[i] = Math.round(x * steps) / steps; }
  return c;
}

// decaying filtered noise, independent per channel, short predelay
function hallIR(ctx, seconds) {
  const sr = ctx.sampleRate, len = Math.floor(sr * seconds), buf = ctx.createBuffer(2, len, sr);
  const pre = Math.floor(0.02 * sr), decay = 6.9 / seconds; // ~-60 dB at the end
  for (let ch = 0; ch < 2; ch++) {
    const d = buf.getChannelData(ch); let lp = 0;
    for (let i = pre; i < len; i++) {
      const tt = (i - pre) / sr;
      lp += 0.55 * ((Math.random() * 2 - 1) - lp);
      d[i] = lp * Math.exp(-tt * decay) * 0.6;
    }
  }
  return buf;
}

// Plays song data (see songs/*.js) on an FMEngine, scheduling notes ~250 ms ahead on the
// audio clock. Songs may set loopFrom (1-based bar): the intro plays once, then
// bars loopFrom..bars repeat seamlessly while loop is on.
class SongPlayer {
  constructor(engine, { getPatch } = {}) {
    this.engine = engine;
    this.getPatch = getPatch || ((id) => PRESETS[id]);
    this.song = null;
    this.onNote = null; // (sounding note, trackId, color, on, muted)
    this.muted = new Set(); // track ids that stay silent; their notes still reach onNote (as guides)
    this.onAuto = null; // (automation step) after it is applied
    this.onPos = null;  // (bar, bars)
    this.onEnd = null;
  }

  get playing() { return !!this.song; }

  patchFor(tr) {
    const base = this.getPatch(tr.patch) || PRESETS[tr.patch];
    return tr.tweak ? { ...base, ...tr.tweak } : base;
  }

  applyAuto(a) {
    const e = this.engine;
    if (a.bright != null) e.bright = a.bright;
    const fx = {};
    for (const k of ['space', 'echoMix', 'echoFb', 'revMix', 'div']) if (a[k] != null) fx[k] = a[k];
    if (Object.keys(fx).length) e.setFx(fx);
    this.onAuto?.(a);
  }

  play(song, { loop = true } = {}) {
    this.stop(0.05);
    const e = this.engine, ctx = e.ctx;
    if (!ctx) return;
    const M = song.meter || 4; // beats per bar
    const spb = 60 / song.bpm, total = song.bars * M;
    const loopStart = ((song.loopFrom || 1) - 1) * M;
    const notes = [...song.notes].sort((a, b) => a.b - b.b);
    const autos = [...(song.auto || [])].sort((a, b) => a.b - b.b);
    const gain = song.gain || 1;
    e.setFx({ bpm: song.bpm, ...(song.fx || {}) });
    e.tune = song.tune || 0;
    if (song.start) this.applyAuto(song.start);
    const p = (this.state = { base: ctx.currentTime + 0.15, i: 0, ai: 0, timers: new Set(), loop });
    this.song = song;
    const later = (ms, fn) => { const id = setTimeout(() => { p.timers.delete(id); fn(); }, Math.max(0, ms)); p.timers.add(id); };
    const firstFrom = (arr, beat) => { const k = arr.findIndex((x) => x.b >= beat); return k < 0 ? arr.length : k; };

    p.iv = setInterval(() => {
      // background tabs throttle timers to ~1 s, so schedule further ahead while hidden
      const now = ctx.currentTime, horizon = now + (document.hidden ? 1.6 : 0.25);
      while (p.i < notes.length && p.base + notes[p.i].b * spb < horizon) {
        const n = notes[p.i++], tr = song.tracks[n.tr], patch = this.patchFor(tr);
        const when = p.base + n.b * spb, off = when + n.d * spb;
        const muted = this.muted.has(n.tr);
        const v = muted ? null : e.noteOn('song:' + n.tr, n.n, n.v, patch, { when, gain: (tr.gain ?? 1) * gain });
        if (v) e.release(v, undefined, off);
        if (this.onNote) {
          const shown = n.n + 12 * (patch.octave || 0);
          later((when - now) * 1000, () => this.onNote(shown, n.tr, tr.color, true, muted));
          later((off - now) * 1000 - 20, () => this.onNote(shown, n.tr, tr.color, false, muted));
        }
      }
      while (p.ai < autos.length && p.base + autos[p.ai].b * spb < horizon) {
        const a = autos[p.ai++]; later((p.base + a.b * spb - now) * 1000, () => this.applyAuto(a));
      }
      const beat = (now - p.base) / spb;
      this.onPos?.(Math.max(1, Math.min(song.bars, Math.floor(beat / M) + 1)), song.bars);
      if (p.i >= notes.length) {
        if (p.loop && now > p.base + total * spb - 0.3) {
          // jump back: beat loopStart of the next pass lands exactly on the end of this one
          p.base += (total - loopStart) * spb;
          p.i = firstFrom(notes, loopStart); p.ai = firstFrom(autos, loopStart);
        } else if (!p.loop && now > p.base + total * spb + (song.tail || 0)) {
          this.stop(); this.onEnd?.();
        }
      }
    }, 25);
  }

  setLoop(on) { if (this.state) this.state.loop = on; }

  // mute or unmute a track while playing; notes already sounding on it fade out
  setMuted(tr, on) {
    on ? this.muted.add(tr) : this.muted.delete(tr);
    if (on) for (const v of [...this.engine.voices]) if (v.src === 'song:' + tr) this.engine.release(v, 0.12);
  }

  stop(rel = 0.15) {
    const p = this.state; if (!p) return;
    clearInterval(p.iv); p.timers.forEach(clearTimeout);
    for (const v of [...this.engine.voices]) if (v.src.startsWith('song:')) this.engine.release(v, rel);
    this.state = null; this.song = null;
    this.engine.tune = 0;
  }
}

window.GlassFM = { FMEngine, SongPlayer, PRESETS, PATCH_PARAMS };
})();
