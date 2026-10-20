// Plane 02 CLAY: "Graphite Lines". E minor, 99 BPM, after ElectroSynthAge_02:
// clean e-piano pulse, precise music-box arpeggios, bell melody in thirds.
GlassCompose.song({
  id: 'clay', name: '02 Clay · Graphite Lines', key: 'E minor', bpm: 99, bars: 28, loopFrom: 5, tune: -24,
  start: { bright: 0.85, space: 0.5 }, fx: { div: '1/8.', echoMix: 0.3, revMix: 0.34 },
  tracks: {
    riff:  { patch: 'glassEP',   gain: 0.55, color: '#e3b36a' },
    bell:  { patch: 'glassBell', gain: 1.0,  color: '#7fd3c8' },
    arp:   { patch: 'musicBox',  gain: 0.4,  color: '#c99be8' },
    bass:  { patch: 'bass',      gain: 0.7,  color: '#9fd47a' },
    pad:   { patch: 'pad',       gain: 0.45, color: '#8d8a84' },
  },
}, (s) => {
  const C = {
    Em: { riff: ['E2', 'B2', 'E3', 'G3'], bass: 'E1', pad: ['G3', 'B3', 'D4', 'F#4'] },
    C:  { riff: ['C2', 'G2', 'C3', 'E3'], bass: 'C1', pad: ['G3', 'B3', 'E4'] },
    G:  { riff: ['G2', 'D3', 'G3', 'B3'], bass: 'G1', pad: ['G3', 'B3', 'D4'] },
    Am: { riff: ['A2', 'E3', 'A3', 'C4'], bass: 'A1', pad: ['A3', 'C4', 'E4', 'G4'] },
    F:  { riff: ['F2', 'C3', 'F3', 'A3'], bass: 'F1', pad: ['A3', 'C4', 'E4'] },
  };
  // intro
  s.pad(1, C.Em.pad, 16, 38); s.bass(1, 'E1', 16, 58);
  s.mel('bell', 1, 'r/2 B5/2:66 | r/1 E6/3:60 | r/4 | r/4');
  s.riff(3, C.Em.riff, { pattern: 'pulse', vel: 44 }); s.riff(4, C.Em.riff, { pattern: 'pulse', vel: 56 });

  const A = ['Em', 'Em', 'C', 'C', 'Em', 'Em', 'C', 'G'];
  const B = ['Am', 'Am', 'F', 'F', 'G', 'G', 'Em', 'Em'];
  const MEL_A = 'B5/1 B5/1 G5/1 E5/1 | D6/2 B5/2 | C6/1.5 B5/.5 A5/1 G5/1 | E5/4 |' +
                'B5/1 B5/1 E6/2 | D6/1 B5/1 G5/2 | E6/1.5 D6/.5 C6/1 E6/1 | D6/4';
  s.auto(5, { bright: 1.0 });
  s.prog(5, A, C, { pattern: 'pulse', riffVel: 70 });
  s.mel('bell', 5, MEL_A);

  s.auto(13, { bright: 1.15, space: 0.62 });
  s.prog(13, B, C, { pattern: ['pulse', 'orbit'], riffVel: 72, pad: true });
  s.mel('bell', 13, 'A5/1 C6/1 E6/2 | D6/1 C6/1 A5/2 | C6/2 A5/1 F5/1 | E5/4 |' +
                    'D6/1 B5/1 G5/2 | A5/1 B5/1 D6/2 | B5/4 | r/2 E6/1 D6/1');
  s.arp(15, ['F4', 'A4', 'C5', 'E5'], { beats: 8, rate: 0.5, vel: 52 }); // music box sounds an octave up

  s.auto(21, { bright: 1.0, space: 0.55 });
  s.prog(21, A, C, { pattern: 'pulse', riffVel: 70, arp: { notes: (c) => c.pad.map((n) => GlassCompose.midi(n)), rate: 1, beats: 4, vel: 44, at: 0.5 } });
  s.mel('bell', 21, MEL_A);
});
