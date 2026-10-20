// Plane 15 PARADOX: "Endless Stairs". C# minor, 132 BPM, after ElectroSynthAge_09 (C# minor,
// chromatic colour). The harmony climbs a whole step every 2 bars forever: C#m D#m Fm Gm Am Bm C#m...
// The bell motif is a Shepard illusion: two copies an octave apart, the upper fading out as it rises
// while the lower fades in, so the climb never seems to reset (the Escher staircase, in sound).
GlassCompose.song({
  id: 'paradox', name: '15 Paradox · Endless Stairs', key: 'C# minor, rising', bpm: 132, bars: 36, loopFrom: 5, tune: -24,
  start: { bright: 1.0, space: 0.55 }, fx: { div: '1/8.', echoMix: 0.34, revMix: 0.4 },
  tracks: {
    riff:  { patch: 'pluck',     gain: 0.55, color: '#e3b36a' },
    bell:  { patch: 'glassBell', gain: 1.0,  color: '#7fd3c8' },
    bell2: { patch: 'glassBell', gain: 1.0,  color: '#7fd3c8' },
    arp:   { patch: 'chime',     gain: 0.34, color: '#c99be8' },
    bass:  { patch: 'bass',      gain: 0.8,  color: '#9fd47a' },
    pad:   { patch: 'pad',       gain: 0.45, color: '#8d8a84' },
  },
}, (s) => {
  const wrap = (n, lo) => { while (n < lo) n += 12; while (n >= lo + 12) n -= 12; return n; };
  const MOTIF = [[0, 1, 7], [1, 1, 12], [2, 1.5, 15], [3.5, 0.5, 14], [4, 2, 12], [6, 1, 19], [7, 1, 15]]; // [beat, dur, semis above root]

  function stairs(k, { arps = false } = {}) {
    for (let j = 0; j < 6; j++) {
      const r = 1 + 2 * j;                    // C# D# F G A B
      const at = k + j * 2;
      const lowRoot = wrap(36 + r, 36);       // riff root in C2..B2
      s.riff(at, [lowRoot, lowRoot + 7, lowRoot + 12, lowRoot + 15], { pattern: 'climb', bars: 2, vel: 72 });
      s.bass(at, wrap(24 + r, 28), 8, 72);    // root in E1..D#2
      const triad = [0, 3, 7].map((d) => wrap(r + d, 55)); // minor triad voiced in G3..F#4
      s.pad(at, triad, 8, 40);
      const base = wrap(60 + r, 60);          // motif root climbs C#4..B4, then wraps back down at C#
      for (const [b, d, o] of MOTIF) {
        s.N('bell', s.bar(at) + b, d * 0.95, base + o, 94 - j * 9);       // upper copy fades out as it climbs
        s.N('bell2', s.bar(at) + b, d * 0.95, base + o - 12, 42 + j * 9); // lower copy fades in
      }
      if (arps) s.arp(at, triad.map((n) => n - 12), { beats: 8, rate: 0.25, vel: 40, len: 0.15 }); // chime sounds +1 oct
    }
  }

  const C = {
    'C#m': { riff: ['C#3', 'G#3', 'C#4', 'E4'], bass: 'C#2', pad: ['G#3', 'C#4', 'E4'] },
    A:     { riff: ['A2', 'E3', 'A3', 'C#4'], bass: 'A1', pad: ['A3', 'C#4', 'E4'] },
    'F#m': { riff: ['F#2', 'C#3', 'F#3', 'A3'], bass: 'F#1', pad: ['F#3', 'A3', 'C#4'] },
    'G#':  { riff: ['G#2', 'D#3', 'G#3', 'C4'], bass: 'G#1', pad: ['G#3', 'C4', 'D#4', 'F#4'] },
  };
  s.pad(1, C['C#m'].pad, 16, 38); s.bass(1, 'C#2', 16, 58);
  s.mel('bell', 1, 'r/2 G#5/1:62 C#6/1:62 | E6/1.5:60 D#6/.5:58 C#6/2:58 | r/4 | r/4');
  s.riff(3, C['C#m'].riff, { pattern: 'climb', vel: 44 }); s.riff(4, C['C#m'].riff, { pattern: 'climb', vel: 56 });

  s.auto(5, { bright: 1.1 });
  stairs(5);

  s.auto(17, { bright: 1.25, space: 0.62 });
  s.prog(17, ['C#m', 'C#m', 'A', 'A', 'F#m', 'F#m', 'G#', 'G#'], C, { pattern: ['climb', 'cascade'], riffVel: 72, pad: true });
  s.mel('bell', 17, 'G#5/1 C#6/1 E6/2 | D#6/1 C#6/1 B5/2 | C#6/2 A5/2 | E5/4 |' +
                    'F#5/1 A5/1 C#6/2 | B5/2 A5/2 | C6/1 D#6/1 G#6/2 | F#6/2 C6/2', 90);

  s.auto(25, { bright: 1.2, space: 0.58 });
  stairs(25, { arps: true });
  // bar 36 ends on Bm; the loop restarts at bar 5 on C#m: one more whole step up the stairs
});
