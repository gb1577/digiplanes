// Plane 06 AMBER: "Warm Resin". C# minor, 99 BPM, after ElectroSynthAge_09:
// warm 2:1 bells over a galloping e-piano, i-VI-III-VII with a G# (V) turnaround.
GlassCompose.song({
  id: 'amber', name: '06 Amber · Warm Resin', key: 'C# minor', bpm: 99, bars: 28, loopFrom: 5, tune: -24,
  start: { bright: 0.85, space: 0.55 }, fx: { div: '1/8.', echoMix: 0.34, revMix: 0.4 },
  tracks: {
    riff:  { patch: 'glassEP',   gain: 0.55, color: '#e3b36a' },
    bell:  { patch: 'glassBell', gain: 1.0,  color: '#7fd3c8', tweak: { ratio: 2, idx: 1.0, idxAtk: 2.6 } }, // warmer 2:1 bell
    chime: { patch: 'chime',     gain: 0.45, color: '#c99be8' },
    bass:  { patch: 'bass',      gain: 0.75, color: '#9fd47a' },
    pad:   { patch: 'pad',       gain: 0.5,  color: '#8d8a84' },
  },
}, (s) => {
  const C = {
    'C#m': { riff: ['C#2', 'G#2', 'C#3', 'E3'], bass: 'C#1', pad: ['G#3', 'C#4', 'E4', 'D#4'] },
    A:     { riff: ['A1', 'E2', 'A2', 'C#3'], bass: 'A0', pad: ['A3', 'C#4', 'E4', 'G#4'] },
    E:     { riff: ['E2', 'B2', 'E3', 'G#3'], bass: 'E1', pad: ['G#3', 'B3', 'E4'] },
    B:     { riff: ['B1', 'F#2', 'B2', 'D#3'], bass: 'B0', pad: ['F#3', 'B3', 'D#4'] },
    'F#m': { riff: ['F#2', 'C#3', 'F#3', 'A3'], bass: 'F#1', pad: ['F#3', 'A3', 'C#4'] },
    'G#':  { riff: ['G#1', 'D#2', 'G#2', 'C3'], bass: 'G#1', pad: ['G#3', 'C4', 'D#4', 'F#4'] },
  };
  // keep everything audible: lift the lowest chord roots an octave
  for (const k of ['A', 'B', 'G#']) { C[k].riff = C[k].riff.map((n) => GlassCompose.midi(n) + 12); }
  C.A.bass = 'A1'; C.B.bass = 'B1';

  s.pad(1, C['C#m'].pad, 16, 38); s.bass(1, 'C#1', 16, 58);
  s.mel('bell', 1, 'r/2 G#5/2:64 | r/1 C#6/3:60 | r/4 | r/4');
  s.riff(3, C['C#m'].riff, { pattern: 'gallop', vel: 42 }); s.riff(4, C['C#m'].riff, { pattern: 'gallop', vel: 54 });

  const A = ['C#m', 'C#m', 'A', 'A', 'E', 'E', 'B', 'B'];
  const B = ['A', 'A', 'E', 'E', 'F#m', 'F#m', 'G#', 'G#'];
  const MEL_A = 'G#5/1 C#6/1 E6/2 | D#6/1 C#6/1 G#5/2 | A5/1.5 B5/.5 C#6/2 | E5/4 |' +
                'G#5/1 B5/1 E6/2 | D#6/2 B5/2 | F#5/1 B5/1 D#6/2 | C#6/1 B5/1 F#5/2';
  s.auto(5, { bright: 1.0 });
  s.prog(5, A, C, { pattern: 'gallop', riffVel: 68 });
  s.mel('bell', 5, MEL_A);

  s.auto(13, { bright: 1.2, space: 0.65 });
  s.prog(13, B, C, { pattern: ['gallop', 'orbit'], riffVel: 70, pad: true });
  s.mel('bell', 13, 'C#6/2 E6/2 | A6/4 | G#6/1 E6/1 B5/2 | E6/4 |' +
                    'F#6/1 E6/1 C#6/2 | A5/4 | G#5/1 C6/1 D#6/2 | C6/2 G#5/2', 90);
  s.mel('chime', 13, 'r/3 E4/1:50 | r/3 C#4/1:48 | r/3 B3/1:50 | r/3 G#3/1:48 | r/3 A3/1:50 | r/3 C#4/1:48 | r/3 C4/1:50 | r/3 D#4/1:48');

  s.auto(21, { bright: 1.05, space: 0.58 });
  s.prog(21, A, C, { pattern: 'gallop', riffVel: 68, pad: true, padVel: 36 });
  s.mel('bell', 21, MEL_A);
});
