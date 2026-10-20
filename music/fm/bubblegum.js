// Plane 09 BUBBLEGUM: "Candy Stripes". D major, 112 BPM, after ElectroSynthAge_04's major colour:
// twinkling music-box riff, bouncy bell hooks.
GlassCompose.song({
  id: 'bubblegum', name: '09 Bubblegum · Candy Stripes', key: 'D major', bpm: 112, bars: 28, loopFrom: 5, tune: -24,
  start: { bright: 1.0, space: 0.45 }, fx: { div: '1/8', echoMix: 0.28, revMix: 0.3 },
  tracks: {
    riff:  { patch: 'musicBox',  gain: 0.45, color: '#e3b36a' }, // sounds an octave up
    bell:  { patch: 'glassBell', gain: 1.0,  color: '#7fd3c8' },
    ep:    { patch: 'glassEP',   gain: 0.45, color: '#c99be8' },
    bass:  { patch: 'bass',      gain: 0.75, color: '#9fd47a' },
    pad:   { patch: 'pad',       gain: 0.4,  color: '#8d8a84' },
  },
}, (s) => {
  const C = {
    D:     { riff: ['D3', 'A3', 'D4', 'F#4'], bass: 'D1', pad: ['F#3', 'A3', 'D4'] },
    Bm:    { riff: ['B2', 'F#3', 'B3', 'D4'], bass: 'B1', pad: ['F#3', 'B3', 'D4'] },
    G:     { riff: ['G2', 'D3', 'G3', 'B3'], bass: 'G1', pad: ['G3', 'B3', 'D4'] },
    A:     { riff: ['A2', 'E3', 'A3', 'C#4'], bass: 'A1', pad: ['A3', 'C#4', 'E4'] },
    'F#m': { riff: ['F#2', 'C#3', 'F#3', 'A3'], bass: 'F#1', pad: ['F#3', 'A3', 'C#4'] },
  };
  s.pad(1, C.D.pad, 16, 36); s.bass(1, 'D1', 16, 58);
  s.mel('bell', 1, 'r/2 F#6/1:64 A6/1:64 | D6/4:58 | r/4 | r/4');
  s.riff(3, C.D.riff, { pattern: 'twinkle', vel: 40 }); s.riff(4, C.D.riff, { pattern: 'twinkle', vel: 52 });

  const A = ['D', 'D', 'Bm', 'Bm', 'G', 'G', 'A', 'A'];
  const B = ['G', 'G', 'A', 'A', 'F#m', 'F#m', 'Bm', 'A'];
  const MEL_A = 'F#6/1 A6/1 F#6/1 D6/1 | E6/2 A5/2 | D6/1 F#6/1 D6/1 B5/1 | C#6/2 F#5/2 |' +
                'B5/1 D6/1 G6/2 | F#6/1 E6/1 D6/2 | C#6/1 E6/1 A6/2 | G6/1 F#6/1 E6/2';
  s.auto(5, { bright: 1.1 });
  s.prog(5, A, C, { pattern: 'twinkle', riffVel: 64 });
  s.mel('bell', 5, MEL_A);
  // e-piano offbeat chords for bounce
  const offbeats = (k, seq) => seq.forEach((c, i) => [1, 3].forEach((b) => C[c].pad.forEach((n) => s.N('ep', s.bar(k + i) + b, 0.4, n, 52))));
  offbeats(5, A);

  s.auto(13, { bright: 1.25, space: 0.55 });
  s.prog(13, B, C, { pattern: ['twinkle', 'climb'], riffVel: 66, pad: true });
  s.mel('bell', 13, 'B6/2 G6/2 | D6/4 | C#6/1 E6/1 A6/2 | G6/2 E6/2 |' +
                    'F#6/1 E6/1 C#6/2 | A5/4 | B5/1 D6/1 F#6/2 | E6/1 G6/1 C#6/2', 90);
  offbeats(13, B);

  s.auto(21, { bright: 1.15, space: 0.5 });
  s.prog(21, A, C, { pattern: 'twinkle', riffVel: 64 });
  s.mel('bell', 21, MEL_A);
  offbeats(21, A);
});
