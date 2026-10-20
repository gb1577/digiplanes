// Plane 12 EMBER: "Glow Coals". C minor, 116 BPM, after ElectroSynthAge_07 but driven:
// galloping e-piano riff, descending i-bVII-bVI-V, harmonic-minor B over G.
GlassCompose.song({
  id: 'ember', name: '12 Ember · Glow Coals', key: 'C minor', bpm: 116, bars: 28, loopFrom: 5, tune: -24,
  start: { bright: 0.95, space: 0.55 }, fx: { div: '1/8.', echoMix: 0.36, revMix: 0.38 },
  tracks: {
    riff:  { patch: 'glassEP',   gain: 0.55, color: '#e3b36a', tweak: { idxAtk: 3.6 } },
    bell:  { patch: 'glassBell', gain: 1.0,  color: '#7fd3c8' },
    arp:   { patch: 'pluck',     gain: 0.35, color: '#c99be8' },
    bass:  { patch: 'bass',      gain: 0.8,  color: '#9fd47a' },
    pad:   { patch: 'pad',       gain: 0.45, color: '#8d8a84' },
  },
}, (s) => {
  const C = {
    Cm: { riff: ['C3', 'G3', 'C4', 'Eb4'], bass: 'C2', pad: ['G3', 'C4', 'Eb4'] },
    Bb: { riff: ['Bb2', 'F3', 'Bb3', 'D4'], bass: 'Bb1', pad: ['F3', 'Bb3', 'D4'] },
    Ab: { riff: ['Ab2', 'Eb3', 'Ab3', 'C4'], bass: 'Ab1', pad: ['Ab3', 'C4', 'Eb4'] },
    G:  { riff: ['G2', 'D3', 'G3', 'B3'], bass: 'G1', pad: ['G3', 'B3', 'D4', 'F4'] },
    Fm: { riff: ['F2', 'C3', 'F3', 'Ab3'], bass: 'F1', pad: ['F3', 'Ab3', 'C4'] },
  };
  s.pad(1, C.Cm.pad, 16, 38); s.bass(1, 'C2', 16, 58);
  s.mel('bell', 1, 'r/2 G5/1:62 C6/1:62 | Eb6/4:58 | r/4 | r/4');
  s.riff(3, C.Cm.riff, { pattern: 'gallop', vel: 44 }); s.riff(4, C.Cm.riff, { pattern: 'gallop', vel: 56 });

  const A = ['Cm', 'Cm', 'Bb', 'Bb', 'Ab', 'Ab', 'G', 'G'];
  const B = ['Fm', 'Fm', 'Ab', 'Ab', 'Bb', 'Bb', 'G', 'G'];
  const MEL_A = 'G5/1 C6/1 Eb6/2 | D6/1 C6/1 G5/2 | F5/1 Bb5/1 D6/2 | C6/1 Bb5/1 F5/2 |' +
                'Eb5/1 Ab5/1 C6/2 | Bb5/1 Ab5/1 Eb5/2 | D5/1 G5/1 B5/2 | D6/2 B5/2';
  s.auto(5, { bright: 1.1 });
  s.prog(5, A, C, { pattern: 'gallop', riffVel: 72 });
  s.mel('bell', 5, MEL_A);

  s.auto(13, { bright: 1.3, space: 0.62 });
  s.prog(13, B, C, { pattern: ['gallop', 'cascade'], riffVel: 72, pad: true });
  s.mel('bell', 13, 'C6/2 Ab5/1 F5/1 | Ab5/2 C6/2 | Eb6/1 C6/1 Ab5/2 | G5/4 |' +
                    'F5/1 Bb5/1 D6/2 | F6/2 D6/2 | G6/1 F6/1 D6/2 | B5/2 G5/2', 92);

  s.auto(21, { bright: 1.15, space: 0.56 });
  s.prog(21, A, C, { pattern: 'gallop', riffVel: 70, arp: { rate: 0.25, beats: 4, vel: 40, len: 0.15, notes: (c) => c.pad.map((n) => GlassCompose.midi(n) + 12) } });
  s.mel('bell', 21, MEL_A);
});
