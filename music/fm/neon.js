// Plane 10 NEON: "After Hours". E harmonic minor, 108 BPM, after ElectroSynthAge_08:
// mysterious and metallic but tonal: Cmaj7 (not C augmented) on the VI, and a harmonic 2:1 pad
// (a 1.41 pad ratio and the augmented chord made it sound out of tune).
GlassCompose.song({
  id: 'neon', name: '10 Neon · After Hours', key: 'E minor', bpm: 108, bars: 28, loopFrom: 5, tune: -24,
  start: { bright: 0.95, space: 0.62 }, fx: { div: '1/8.', echoMix: 0.4, echoFb: 0.48, revMix: 0.44 },
  tracks: {
    riff:  { patch: 'pluck',     gain: 0.55, color: '#e3b36a' },
    bell:  { patch: 'glassBell', gain: 1.0,  color: '#7fd3c8' },
    chime: { patch: 'chime',     gain: 0.45, color: '#c99be8' },
    bass:  { patch: 'bass',      gain: 0.78, color: '#9fd47a' },
    pad:   { patch: 'pad',       gain: 0.5,  color: '#8d8a84', tweak: { idx: 0.5 } },
  },
}, (s) => {
  const C = {
    Em:   { riff: ['E2', 'B2', 'E3', 'G3'], bass: 'E1', pad: ['G3', 'B3', 'E4', 'F#4'] },
    Cmaj7: { riff: ['C3', 'G3', 'C4', 'E4'], bass: 'C2', pad: ['G3', 'C4', 'E4'] }, // the bell adds the maj7 (B6) on top
    Am:   { riff: ['A2', 'E3', 'A3', 'C4'], bass: 'A1', pad: ['A3', 'C4', 'E4'] },
    B:    { riff: ['B2', 'F#3', 'B3', 'D#4'], bass: 'B1', pad: ['F#3', 'A3', 'D#4'] },
    C:    { riff: ['C3', 'G3', 'C4', 'E4'], bass: 'C2', pad: ['G3', 'C4', 'E4', 'B4'] },
    D:    { riff: ['D3', 'A3', 'D4', 'F#4'], bass: 'D2', pad: ['F#3', 'A3', 'D4'] },
  };
  s.pad(1, C.Em.pad, 16, 38); s.bass(1, 'E1', 16, 58);
  s.mel('bell', 1, 'r/2 B5/2:62 | r/1 G6/3:58 | r/4 | r/4');
  s.riff(3, C.Em.riff, { pattern: 'gallop', vel: 42 }); s.riff(4, C.Cmaj7.riff, { pattern: 'gallop', vel: 54 });

  const A = ['Em', 'Em', 'Cmaj7', 'Cmaj7', 'Am', 'Am', 'B', 'B'];
  const B = ['C', 'C', 'D', 'D', 'Em', 'Em', 'B', 'B'];
  const MEL_A = 'B5/1 E6/1 G6/1 F#6/1 | E6/2 B5/2 | C6/1 E6/1 B6/2 | G6/1 E6/1 C6/2 |' +
                'A5/1 C6/1 E6/2 | C6/1 B5/1 A5/2 | D#6/1 F#6/1 B6/2 | A6/1 F#6/1 D#6/2';
  s.auto(5, { bright: 1.05 });
  s.prog(5, A, C, { pattern: 'gallop', riffVel: 68 });
  s.mel('bell', 5, MEL_A);

  s.auto(13, { bright: 1.25, space: 0.7 });
  s.prog(13, B, C, { pattern: ['gallop', 'orbit'], riffVel: 70, pad: true });
  s.mel('bell', 13, 'E6/2 G6/2 | C6/4 | F#6/1 D6/1 A5/2 | D6/2 F#6/2 |' +
                    'G6/1 F#6/1 E6/2 | B5/4 | D#6/1 F#6/1 A6/2 | F#6/2 D#6/2', 90);
  s.mel('chime', 13, 'r/2.5 E4/1.5:50 | r/2.5 G4/1.5:48 | r/2.5 D4/1.5:50 | r/2.5 A4/1.5:48 |' +
                     'r/2.5 B3/1.5:50 | r/2.5 E4/1.5:48 | r/2.5 D#4/1.5:50 | r/2.5 F#4/1.5:48');

  s.auto(21, { bright: 1.1, space: 0.64 });
  s.prog(21, A, C, { pattern: 'gallop', riffVel: 68, pad: true, padVel: 36 });
  s.mel('bell', 21, MEL_A);
});
