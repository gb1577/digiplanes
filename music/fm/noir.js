// Plane 03 NOIR: "Red Wire". C minor, 92 BPM, after ElectroSynthAge_07:
// sparse and dark, low bells, long quarter-note echoes, harmonic-minor tension on G.
GlassCompose.song({
  id: 'noir', name: '03 Noir · Red Wire', key: 'C minor', bpm: 92, bars: 28, loopFrom: 5, tune: -24,
  start: { bright: 0.7, space: 0.7 }, fx: { div: '1/4.', echoMix: 0.45, echoFb: 0.5, revMix: 0.48, revSize: 3.4 },
  tracks: {
    riff:  { patch: 'glassEP',   gain: 0.55, color: '#e3b36a', tweak: { idxAtk: 1.8, D: 1.4 } },
    bell:  { patch: 'glassBell', gain: 1.0,  color: '#7fd3c8', tweak: { idx: 0.6 } },
    chime: { patch: 'chime',     gain: 0.45, color: '#c99be8' },
    bass:  { patch: 'bass',      gain: 0.8,  color: '#9fd47a' },
    pad:   { patch: 'pad',       gain: 0.5,  color: '#8d8a84', tweak: { A: 1.2, R: 2.4 } },
  },
}, (s) => {
  const C = {
    Cm: { riff: ['C2', 'G2', 'C3', 'Eb3'], bass: 'C1', pad: ['G3', 'C4', 'Eb4', 'D4'] },
    Ab: { riff: ['Ab2', 'Eb3', 'Ab3', 'C4'], bass: 'Ab1', pad: ['Ab3', 'C4', 'Eb4', 'G4'] },
    Fm: { riff: ['F2', 'C3', 'F3', 'Ab3'], bass: 'F1', pad: ['F3', 'Ab3', 'C4', 'Eb4'] },
    G:  { riff: ['G2', 'D3', 'G3', 'B3'], bass: 'G1', pad: ['G3', 'B3', 'D4', 'F4'] },
  };
  s.pad(1, C.Cm.pad, 16, 36); s.bass(1, 'C1', 16, 56);
  s.mel('bell', 1, 'r/4 | G5/4:58 | r/4 | r/4');
  s.riff(3, C.Cm.riff, { pattern: 'sparse', vel: 44 }); s.riff(4, C.Cm.riff, { pattern: 'sparse', vel: 54 });

  const A = ['Cm', 'Cm', 'Ab', 'Ab', 'Cm', 'Cm', 'Fm', 'G'];
  const B = ['Ab', 'Ab', 'Fm', 'Fm', 'Cm', 'Cm', 'G', 'G'];
  const MEL_A = 'G5/3 Eb5/1 | C5/4 | Eb5/2 C5/1 Ab4/1 | C5/4 |' +
                'G5/1.5 Ab5/.5 G5/2 | Eb5/2 D5/2 | C5/2 F5/2 | D5/2 B4/2';
  s.auto(5, { bright: 0.8 });
  s.prog(5, A, C, { pattern: 'sparse', riffVel: 68 });
  s.mel('bell', 5, MEL_A, 84);

  s.auto(13, { bright: 0.95, space: 0.78 });
  s.prog(13, B, C, { pattern: ['sparse', 'pulse'], riffVel: 66, pad: true });
  s.mel('bell', 13, 'C6/2 Bb5/1 Ab5/1 | Eb5/4 | F5/1 Ab5/1 C6/2 | Bb5/2 Ab5/2 |' +
                    'G5/3 Eb5/1 | G5/1 Ab5/1 G5/2 | D5/2 F5/2 | B4/2 D5/2', 86);
  s.mel('chime', 13, 'r/2 Eb4/2:52 | r/4 | r/2 C4/2:50 | r/4 | r/2 G3/2:50 | r/4 | r/2 B3/2:52 | r/4');

  s.auto(21, { bright: 0.85, space: 0.7 });
  s.prog(21, A, C, { pattern: 'sparse', riffVel: 64, pad: true, padVel: 38 });
  s.mel('bell', 21, MEL_A, 80);
});
