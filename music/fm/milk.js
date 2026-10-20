// Plane 05 MILK: "Glass of Milk". A minor, 96 BPM, after ElectroSynthAge_06:
// airy and floating, chimes carry the tune, soft e-piano underneath.
GlassCompose.song({
  id: 'milk', name: '05 Milk · Glass of Milk', key: 'A minor', bpm: 96, bars: 28, loopFrom: 5, tune: -24,
  start: { bright: 0.9, space: 0.68 }, fx: { div: '1/8.', echoMix: 0.4, revMix: 0.46, revSize: 3.2 },
  tracks: {
    riff:  { patch: 'glassEP',   gain: 0.5,  color: '#e3b36a', tweak: { idxAtk: 2.2 } },
    chime: { patch: 'chime',     gain: 0.85, color: '#7fd3c8' },
    bell:  { patch: 'glassBell', gain: 0.7,  color: '#c99be8' },
    bass:  { patch: 'bass',      gain: 0.7,  color: '#9fd47a' },
    pad:   { patch: 'pad',       gain: 0.55, color: '#8d8a84' },
  },
}, (s) => {
  const C = {
    Am: { riff: ['A2', 'E3', 'A3', 'C4'], bass: 'A1', pad: ['A3', 'C4', 'E4', 'B4'] },
    F:  { riff: ['F2', 'C3', 'F3', 'A3'], bass: 'F1', pad: ['A3', 'C4', 'E4'] },
    C:  { riff: ['C2', 'G2', 'C3', 'E3'], bass: 'C1', pad: ['G3', 'C4', 'E4'] },
    G:  { riff: ['G2', 'D3', 'G3', 'B3'], bass: 'G1', pad: ['G3', 'B3', 'D4'] },
    Dm: { riff: ['D2', 'A2', 'D3', 'F3'], bass: 'D1', pad: ['F3', 'A3', 'D4', 'E4'] },
    Em: { riff: ['E2', 'B2', 'E3', 'G3'], bass: 'E1', pad: ['G3', 'B3', 'E4'] },
  };
  s.pad(1, C.Am.pad, 16, 40); s.bass(1, 'A1', 16, 56);
  s.mel('chime', 1, 'r/2 E5/2:62 | r/1 A4/3:58 | r/4 | r/4'); // chime sounds an octave up
  s.riff(3, C.Am.riff, { pattern: 'sparse', vel: 44 }); s.riff(4, C.Am.riff, { pattern: 'sparse', vel: 54 });

  const A = ['Am', 'Am', 'F', 'F', 'C', 'C', 'G', 'G'];
  const B = ['Dm', 'Dm', 'F', 'F', 'Am', 'Am', 'Em', 'Em'];
  const MEL_A = 'E5/2 C5/1 A4/1 | B4/2 C5/2 | A4/2 C5/1 F5/1 | E5/4 |' +
                'G4/1 C5/1 E5/2 | D5/1 E5/1 G5/2 | D5/2 B4/2 | G4/4';
  s.auto(5, { bright: 1.0 });
  s.prog(5, A, C, { pattern: 'sparse', riffVel: 66, pad: true, padVel: 36 });
  s.mel('chime', 5, MEL_A, 84);

  s.auto(13, { bright: 1.15, space: 0.75 });
  s.prog(13, B, C, { pattern: ['sparse', 'pulse'], riffVel: 64, pad: true });
  s.mel('chime', 13, 'F5/2 E5/1 D5/1 | A4/4 | C5/1 D5/1 E5/2 | G5/2 F5/2 |' +
                     'E5/2 C5/2 | A4/4 | B4/1 E5/1 G5/2 | F#5/1 E5/1 B4/2', 86);
  s.mel('bell', 13, 'r/4 | r/2 D6/2:60 | r/4 | r/2 C6/2:58 | r/4 | r/2 E6/2:60 | r/4 | r/2 B5/2:58');

  s.auto(21, { bright: 1.05, space: 0.7 });
  s.prog(21, A, C, { pattern: 'sparse', riffVel: 64, pad: true, padVel: 40 });
  s.mel('chime', 21, MEL_A, 82);
  s.mel('bell', 21, 'r/4 | r/2 E6/2:56 | r/4 | r/2 A5/2:54 | r/4 | r/2 G5/2:56 | r/4 | r/2 D6/2:54');
});
