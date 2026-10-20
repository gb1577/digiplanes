// Plane 11 DUNE: "Sand Script". E phrygian, 104 BPM, after ElectroSynthAge_02 (its F naturals):
// desert half-step E-F, metallic 1.41 bells, pluck riff.
GlassCompose.song({
  id: 'dune', name: '11 Dune · Sand Script', key: 'E phrygian', bpm: 104, bars: 28, loopFrom: 5, tune: -24,
  start: { bright: 0.9, space: 0.55 }, fx: { div: '1/8.', echoMix: 0.36, revMix: 0.4 },
  tracks: {
    riff:  { patch: 'pluck',     gain: 0.55, color: '#e3b36a' },
    bell:  { patch: 'glassBell', gain: 1.0,  color: '#7fd3c8', tweak: { ratio: 1.41, idx: 0.7, idxAtk: 2.4 } }, // exotic, gong-like
    chime: { patch: 'chime',     gain: 0.45, color: '#c99be8' },
    bass:  { patch: 'bass',      gain: 0.78, color: '#9fd47a' },
    pad:   { patch: 'pad',       gain: 0.45, color: '#8d8a84' },
  },
}, (s) => {
  const C = {
    Em: { riff: ['E2', 'B2', 'E3', 'G3'], bass: 'E1', pad: ['G3', 'B3', 'E4'] },
    F:  { riff: ['F2', 'C3', 'F3', 'A3'], bass: 'F1', pad: ['F3', 'A3', 'C4', 'E4'] },
    G:  { riff: ['G2', 'D3', 'G3', 'B3'], bass: 'G1', pad: ['G3', 'B3', 'D4'] },
    Am: { riff: ['A2', 'E3', 'A3', 'C4'], bass: 'A1', pad: ['A3', 'C4', 'E4'] },
    Dm: { riff: ['D2', 'A2', 'D3', 'F3'], bass: 'D1', pad: ['F3', 'A3', 'D4'] },
  };
  s.pad(1, C.Em.pad, 16, 38); s.bass(1, 'E1', 16, 58);
  s.mel('bell', 1, 'r/2 B5/1.5:62 C6/.5:58 | B5/4:58 | r/4 | r/4');
  s.riff(3, C.Em.riff, { pattern: 'orbit', vel: 42 }); s.riff(4, C.F.riff, { pattern: 'orbit', vel: 54 });

  const A = ['Em', 'Em', 'F', 'F', 'Em', 'Em', 'G', 'F'];
  const B = ['Am', 'Am', 'Dm', 'Dm', 'F', 'F', 'Em', 'Em'];
  const MEL_A = 'B5/1.5 C6/.5 B5/2 | G5/1 F5/1 E5/2 | A5/1 C6/1 F6/2 | E6/2 C6/2 |' +
                'B5/1 E6/1 G6/2 | F6/1 E6/1 B5/2 | D6/1 B5/1 G5/2 | A5/1 F5/1 E5/2';
  s.auto(5, { bright: 1.0 });
  s.prog(5, A, C, { pattern: 'orbit', riffVel: 68 });
  s.mel('bell', 5, MEL_A);

  s.auto(13, { bright: 1.2, space: 0.64 });
  s.prog(13, B, C, { pattern: ['orbit', 'gallop'], riffVel: 70, pad: true });
  s.mel('bell', 13, 'E6/2 C6/1 A5/1 | B5/4 | A5/1 D6/1 F6/2 | E6/1 D6/1 A5/2 |' +
                    'C6/1 F6/1 A6/2 | G6/1 F6/1 C6/2 | B5/1 G5/1 E5/2 | F5/1 E5/3', 90);
  s.mel('chime', 13, 'r/3 C4/1:50 | r/3 E4/1:48 | r/3 F4/1:50 | r/3 A3/1:48 | r/3 A3/1:50 | r/3 C4/1:48 | r/3 G3/1:50 | r/3 B3/1:48');

  s.auto(21, { bright: 1.05, space: 0.58 });
  s.prog(21, A, C, { pattern: 'orbit', riffVel: 68, pad: true, padVel: 34 });
  s.mel('bell', 21, MEL_A);
});
