// Plane 14 ULTRA: "Violet Rush". Bb minor, 126 BPM, after ElectroSynthAge_10 (high melody,
// fifth-heavy): intense cascading pluck, high bells, fast chime arpeggios in the last section.
GlassCompose.song({
  id: 'ultra', name: '14 Ultra · Violet Rush', key: 'Bb minor', bpm: 126, bars: 28, loopFrom: 5, tune: -24,
  start: { bright: 1.05, space: 0.55 }, fx: { div: '1/8.', echoMix: 0.34, revMix: 0.36 },
  tracks: {
    riff:  { patch: 'pluck',     gain: 0.58, color: '#e3b36a', tweak: { idxAtk: 5 } },
    bell:  { patch: 'glassBell', gain: 1.0,  color: '#7fd3c8' },
    arp:   { patch: 'chime',     gain: 0.36, color: '#c99be8' },
    bass:  { patch: 'bass',      gain: 0.8,  color: '#9fd47a' },
    pad:   { patch: 'pad',       gain: 0.45, color: '#8d8a84' },
  },
}, (s) => {
  const C = {
    Bbm: { riff: ['Bb2', 'F3', 'Bb3', 'Db4'], bass: 'Bb1', pad: ['F3', 'Bb3', 'Db4'] },
    Gb:  { riff: ['Gb2', 'Db3', 'Gb3', 'Bb3'], bass: 'Gb1', pad: ['Gb3', 'Bb3', 'Db4', 'F4'] },
    Ab:  { riff: ['Ab2', 'Eb3', 'Ab3', 'C4'], bass: 'Ab1', pad: ['Ab3', 'C4', 'Eb4'] },
    F:   { riff: ['F2', 'C3', 'F3', 'A3'], bass: 'F1', pad: ['F3', 'A3', 'C4', 'Eb4'] },
    Ebm: { riff: ['Eb2', 'Bb2', 'Eb3', 'Gb3'], bass: 'Eb1', pad: ['Gb3', 'Bb3', 'Eb4'] },
    Db:  { riff: ['Db3', 'Ab3', 'Db4', 'F4'], bass: 'Db2', pad: ['F3', 'Ab3', 'Db4'] },
  };
  s.pad(1, C.Bbm.pad, 16, 38); s.bass(1, 'Bb1', 16, 60);
  s.mel('bell', 1, 'r/2 F6/1:64 Db6/1:62 | Bb5/4:58 | r/4 | r/4');
  s.riff(3, C.Bbm.riff, { pattern: 'cascade', vel: 46 }); s.riff(4, C.Bbm.riff, { pattern: 'cascade', vel: 58 });

  const A = ['Bbm', 'Bbm', 'Gb', 'Gb', 'Ab', 'Ab', 'F', 'F'];
  const B = ['Ebm', 'Ebm', 'Gb', 'Gb', 'Db', 'Db', 'F', 'F'];
  const MEL_A = 'F6/1 Db6/1 Bb5/1 F6/1 | Eb6/2 Db6/2 | Bb5/1 Db6/1 Gb6/2 | F6/1 Db6/1 Bb5/2 |' +
                'C6/1 Eb6/1 Ab6/2 | Gb6/1 F6/1 Eb6/2 | F6/1 A5/1 C6/2 | Eb6/2 C6/2';
  s.auto(5, { bright: 1.15 });
  s.prog(5, A, C, { pattern: 'cascade', riffVel: 74 });
  s.mel('bell', 5, MEL_A);

  s.auto(13, { bright: 1.35, space: 0.62 });
  s.prog(13, B, C, { pattern: ['cascade', 'gallop'], riffVel: 74, pad: true });
  s.mel('bell', 13, 'Gb6/2 Eb6/1 Bb5/1 | Db6/4 | Bb5/1 Db6/1 Gb6/2 | F6/2 Db6/2 |' +
                    'Ab6/1 F6/1 Db6/2 | Ab5/4 | A5/1 C6/1 F6/2 | E6/2 C6/2', 92);

  s.auto(21, { bright: 1.25, space: 0.58 });
  s.prog(21, A, C, { pattern: 'cascade', riffVel: 72, arp: { rate: 0.25, beats: 4, vel: 42, len: 0.18 } });
  s.mel('bell', 21, MEL_A);
});
