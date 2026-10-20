// Plane 08 PRISM: "White Light". A minor, 112 BPM, after ElectroSynthAge_03 (the brisk one):
// crisp cascading pluck riff, repeated-note bell hooks, E major turnaround.
GlassCompose.song({
  id: 'prism', name: '08 Prism · White Light', key: 'A minor', bpm: 112, bars: 28, loopFrom: 5, tune: -24,
  start: { bright: 1.0, space: 0.5 }, fx: { div: '1/8.', echoMix: 0.3, revMix: 0.34 },
  tracks: {
    riff:  { patch: 'pluck',     gain: 0.55, color: '#e3b36a' },
    bell:  { patch: 'glassBell', gain: 1.0,  color: '#7fd3c8' },
    arp:   { patch: 'chime',     gain: 0.38, color: '#c99be8' },
    bass:  { patch: 'bass',      gain: 0.75, color: '#9fd47a' },
    pad:   { patch: 'pad',       gain: 0.45, color: '#8d8a84' },
  },
}, (s) => {
  const C = {
    Am: { riff: ['A2', 'E3', 'A3', 'C4'], bass: 'A1', pad: ['A3', 'C4', 'E4'] },
    G:  { riff: ['G2', 'D3', 'G3', 'B3'], bass: 'G1', pad: ['G3', 'B3', 'D4'] },
    F:  { riff: ['F2', 'C3', 'F3', 'A3'], bass: 'F1', pad: ['F3', 'A3', 'C4', 'E4'] },
    C:  { riff: ['C3', 'G3', 'C4', 'E4'], bass: 'C2', pad: ['G3', 'C4', 'E4'] },
    E:  { riff: ['E2', 'B2', 'E3', 'G#3'], bass: 'E1', pad: ['G#3', 'B3', 'E4'] },
  };
  s.pad(1, C.Am.pad, 16, 38); s.bass(1, 'A1', 16, 58);
  s.mel('bell', 1, 'r/2 E6/1:64 E6/1:60 | A5/4:60 | r/4 | r/4');
  s.riff(3, C.Am.riff, { pattern: 'cascade', vel: 42 }); s.riff(4, C.Am.riff, { pattern: 'cascade', vel: 54 });

  const A = ['Am', 'Am', 'G', 'G', 'F', 'F', 'G', 'G'];
  const B = ['C', 'C', 'G', 'G', 'Am', 'Am', 'E', 'E'];
  const MEL_A = 'E6/1 E6/1 C6/1 A5/1 | B5/2 G5/2 | D6/1 D6/1 B5/1 G5/1 | A5/2 B5/2 |' +
                'C6/1 C6/1 A5/1 F5/1 | E5/2 A5/2 | B5/1 D6/1 G6/2 | F6/1 E6/1 D6/2';
  s.auto(5, { bright: 1.1 });
  s.prog(5, A, C, { pattern: 'cascade', riffVel: 70 });
  s.mel('bell', 5, MEL_A);

  s.auto(13, { bright: 1.3, space: 0.62 });
  s.prog(13, B, C, { pattern: ['cascade', 'orbit'], riffVel: 72, pad: true });
  s.mel('bell', 13, 'E6/2 G6/2 | C6/4 | D6/1 B5/1 G5/2 | D6/2 B5/2 |' +
                    'C6/1 E6/1 A6/2 | G6/1 E6/1 C6/2 | B5/1 G#5/1 E5/2 | G#5/2 B5/2', 90);

  s.auto(21, { bright: 1.15, space: 0.55 });
  s.prog(21, A, C, { pattern: 'cascade', riffVel: 70, arp: { rate: 0.5, beats: 4, vel: 44, len: 0.25, at: 0.25 } });
  s.mel('bell', 21, MEL_A);
});
