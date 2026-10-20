// Tiny composing kit for Glass FM songs (classic script: window.GlassCompose).
// A song file calls GlassCompose.song({...meta}, (s) => { s.riff(...); s.mel(...); ... })
// and the result is pushed onto window.GlassFMSongs for the synth page and the game.
//
// Melody notation for s.mel(track, bar, text):
//   "E6/2"   note E6 for 2 beats        "r/.5"  rest for half a beat
//   "E6/2:96" same, velocity 96         "|"     barline: snaps to the next bar (keeps phrases aligned)
//   "[A5 E6]/2" chord (all notes together)
(() => {
  const NOTE = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  const midi = (name) => {
    if (typeof name === 'number') return name;
    const m = /^([A-G])([#b]?)(-?\d)$/.exec(name);
    if (!m) throw new Error('bad note ' + name);
    return 12 * (+m[3] + 1) + NOTE[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0);
  };

  // 16-step riff shapes: indices into the 4 chord tones, '_' = rest; accents 0..1
  const PATTERNS = {
    orbit:   { steps: [0, '_', 1, 2, 3, '_', 0, 1, 2, '_', 0, 3, 1, '_', 2, '_'], acc: [1, 0, .6, .75, .85, 0, .7, .6, .9, 0, .65, .8, .7, 0, .75, 0] },
    pulse:   { steps: [0, '_', 2, '_', 1, '_', 2, '_', 0, '_', 2, '_', 1, '_', 3, '_'], acc: [1, 0, .6, 0, .8, 0, .6, 0, .9, 0, .6, 0, .8, 0, .7, 0] },
    cascade: { steps: [3, 2, 1, 0, 3, 2, 1, 0, 3, 2, 1, 0, 2, 1, 0, '_'], acc: [1, .5, .6, .7, .9, .5, .6, .7, .9, .5, .6, .7, .8, .6, .7, 0] },
    climb:   { steps: [0, 1, 2, 3, 2, 1, 0, 1, 2, 3, 2, 1, 0, '_', 2, 3], acc: [1, .6, .7, .9, .6, .5, .8, .6, .7, .9, .6, .5, .8, 0, .7, .8] },
    sparse:  { steps: [0, '_', '_', 2, '_', '_', 1, '_', '_', 3, '_', '_', 2, '_', '_', '_'], acc: [1, 0, 0, .7, 0, 0, .8, 0, 0, .7, 0, 0, .6, 0, 0, 0] },
    gallop:  { steps: [0, '_', 0, 2, '_', 1, 0, '_', 3, '_', 0, 2, '_', 1, 2, '_'], acc: [1, 0, .6, .8, 0, .7, .9, 0, .9, 0, .6, .8, 0, .7, .8, 0] },
    twinkle: { steps: [2, 3, 2, 1, 2, 3, 2, 0, 2, 3, 2, 1, 3, 2, 1, 0], acc: [.9, .6, .7, .6, .8, .6, .7, .6, .9, .6, .7, .6, .8, .7, .6, .7] },
    // 12-step shapes for 3/4 songs (meter: 3)
    waltz:   { steps: [0, '_', '_', '_', 2, '_', 3, '_', 2, '_', 3, '_'], acc: [1, 0, 0, 0, .7, 0, .55, 0, .7, 0, .55, 0] },
    lilt:    { steps: [0, '_', 1, 2, 3, '_', 2, 1, 2, '_', 1, '_'], acc: [1, 0, .6, .7, .85, 0, .6, .55, .75, 0, .6, 0] },
    spin:    { steps: [0, 1, 2, 3, 2, 1, 0, 1, 2, 3, 2, 1], acc: [1, .5, .6, .8, .6, .5, .85, .5, .6, .8, .6, .5] },
  };

  function song(meta, build) {
    const notes = [], auto = [];
    const M = meta.meter || 4; // beats per bar (3 = waltz time)
    const bar = (k) => (k - 1) * M;
    const T = meta.transpose || 0;
    const s = {
      bar,
      N(tr, b, d, n, v) { notes.push({ tr, b, d, n: midi(n) + T, v: Math.round(Math.max(1, Math.min(127, v))) }); },
      // riff over 4 chord tones (names or midi) for `bars` bars
      riff(k, tones, { bars = 1, pattern = M === 3 ? 'lilt' : 'orbit', vel = 76, tr = 'riff', steps = M * 4, len = 0.22, rate = 0.25 } = {}) {
        const P = PATTERNS[pattern] || pattern, t = tones.map(midi);
        for (let r = 0; r < bars; r++) for (let i = 0; i < steps; i++) {
          const L = P.steps.length, st = P.steps[i % L]; if (st === '_') continue;
          s.N(tr, bar(k + r) + i * rate, len, t[st], vel * (0.55 + 0.45 * P.acc[i % L]));
        }
      },
      // notes below E1 (41 Hz) vanish on most speakers: lift them an octave
      bass(k, n, beats = 2 * M, vel = 70, tr = 'bass') { let m = midi(n); while (m + T < 28) m += 12; s.N(tr, bar(k), beats - 0.05, m, vel); },
      pad(k, chord, beats = 2 * M, vel = 50, tr = 'pad') { chord.forEach((n) => s.N(tr, bar(k), beats - 0.1, n, vel)); },
      // broken chord: notes cycled at `rate` beats for `beats` beats
      arp(k, chord, { beats = M, rate = 0.5, vel = 70, tr = 'arp', len = 0.4, at = 0 } = {}) {
        const c = chord.map(midi);
        for (let i = 0; i * rate < beats - at; i++) s.N(tr, bar(k) + at + i * rate, Math.min(len, beats - at - i * rate), c[i % c.length], vel * (i % c.length === 0 ? 1 : 0.8));
      },
      mel(tr, k, text, vel = 86) {
        let pos = bar(k);
        const strict = window.GlassCompose.strict; // checker mode: every bar must add up to M beats
        for (const tok of text.replace(/\|/g, ' | ').trim().split(/\s+(?![^\[]*\])/)) {
          if (tok === '|') {
            if (strict && Math.abs(pos / M - Math.round(pos / M)) > 1e-6) throw new Error(`${meta.id}: ${tr} bar ending at beat ${pos} is not ${M} beats`);
            pos = Math.ceil(pos / M - 1e-6) * M; continue;
          }
          const m = /^(\[[^\]]+\]|[^/]+)\/([\d.]+)(?::(\d+))?$/.exec(tok);
          if (!m) throw new Error(`bad token "${tok}" in ${meta.id}`);
          const d = +m[2], v = m[3] ? +m[3] : vel;
          if (m[1] !== 'r') {
            const ns = m[1].startsWith('[') ? m[1].slice(1, -1).trim().split(/\s+/) : [m[1]];
            ns.forEach((n) => s.N(tr, pos, d * 0.95, n, v));
          }
          pos += d;
        }
      },
      // seq = one chord name per bar; chords[name] = { riff: [4 tones], bass, pad: [...] }
      // riff every bar (pattern may be an array to alternate), bass/pad held across repeated chords
      prog(k, seq, chords, { pattern = 'orbit', riffVel = 74, bass = true, bassVel = 70, pad = false, padVel = 46, riffTr = 'riff', arp = null } = {}) {
        let i = 0;
        while (i < seq.length) {
          let j = i; while (j < seq.length && seq[j] === seq[i]) j++;
          const c = chords[seq[i]]; if (!c) throw new Error(`unknown chord ${seq[i]} in ${meta.id}`);
          if (bass && c.bass != null) s.bass(k + i, c.bass, (j - i) * M, bassVel);
          if (pad && c.pad) s.pad(k + i, c.pad, (j - i) * M, padVel);
          i = j;
        }
        seq.forEach((name, b) => {
          const pat = Array.isArray(pattern) ? pattern[b % pattern.length] : pattern;
          if (riffVel > 0) s.riff(k + b, chords[name].riff, { pattern: pat, vel: riffVel, tr: riffTr });
          if (arp) s.arp(k + b, arp.notes ? arp.notes(chords[name]) : chords[name].pad, { tr: 'arp', ...arp });
        });
      },
      auto(k, a) { auto.push({ b: bar(k), ...a }); },
    };
    build(s);
    // swing: off-beat eighths land late (amount 0.17 = triplet feel), sixteenths follow proportionally
    if (meta.swing) {
      const a = meta.swing, warp = (f) => (f <= 0.5 ? f * (0.5 + a) / 0.5 : 0.5 + a + (f - 0.5) * (0.5 - a) / 0.5);
      for (const n of notes) { const beat = Math.floor(n.b + 1e-9), f = n.b - beat; if (f > 1e-6) n.b = beat + warp(f); }
    }
    const out = { tail: 4, gain: 2.2, meter: M, ...meta, notes: notes.sort((a, b) => a.b - b.b), auto };
    delete out.transpose;
    (window.GlassFMSongs ||= []).push(out);
    return out;
  }

  window.GlassCompose = { song, midi, PATTERNS };
})();
