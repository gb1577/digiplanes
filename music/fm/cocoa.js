// Plane 07 COCOA: "Hot Chocolate". Bb minor pentatonic, 100 BPM, after ElectroSynthAge_10:
// cozy music box up high (the source's melody sat around F6), soft e-piano pulse.
GlassCompose.song({
  id: 'cocoa', name: '07 Cocoa · Hot Chocolate', key: 'Bb minor', bpm: 100, bars: 28, loopFrom: 5, tune: -24,
  start: { bright: 0.85, space: 0.55 }, fx: { div: '1/8.', echoMix: 0.32, revMix: 0.4 },
  tracks: {
    riff:  { patch: 'glassEP',  gain: 0.55, color: '#e3b36a' },
    box:   { patch: 'musicBox', gain: 0.9,  color: '#7fd3c8' },
    bell:  { patch: 'glassBell', gain: 0.6, color: '#c99be8' },
    bass:  { patch: 'bass',     gain: 0.75, color: '#9fd47a' },
    pad:   { patch: 'pad',      gain: 0.5,  color: '#8d8a84' },
  },
}, (s) => {
  const C = {
    Bbm: { riff: ['Bb2', 'F3', 'Bb3', 'Db4'], bass: 'Bb1', pad: ['F3', 'Bb3', 'Db4', 'C4'] },
    Gb:  { riff: ['Gb2', 'Db3', 'Gb3', 'Bb3'], bass: 'Gb1', pad: ['Gb3', 'Bb3', 'Db4', 'F4'] },
    Db:  { riff: ['Db2', 'Ab2', 'Db3', 'F3'], bass: 'Db1', pad: ['F3', 'Ab3', 'Db4'] },
    Ab:  { riff: ['Ab2', 'Eb3', 'Ab3', 'C4'], bass: 'Ab1', pad: ['Ab3', 'C4', 'Eb4'] },
    Ebm: { riff: ['Eb2', 'Bb2', 'Eb3', 'Gb3'], bass: 'Eb1', pad: ['Gb3', 'Bb3', 'Eb4'] },
    F:   { riff: ['F2', 'C3', 'F3', 'A3'], bass: 'F1', pad: ['F3', 'A3', 'C4', 'Eb4'] },
  };
  s.pad(1, C.Bbm.pad, 16, 38); s.bass(1, 'Bb1', 16, 58);
  s.mel('box', 1, 'r/2 F5/2:64 | r/1 Db5/1:58 Bb4/2:58 | r/4 | r/4'); // music box sounds an octave up
  s.riff(3, C.Bbm.riff, { pattern: 'pulse', vel: 42 }); s.riff(4, C.Bbm.riff, { pattern: 'pulse', vel: 54 });

  const A = ['Bbm', 'Bbm', 'Gb', 'Gb', 'Db', 'Db', 'Ab', 'Ab'];
  const B = ['Ebm', 'Ebm', 'Bbm', 'Bbm', 'Gb', 'Gb', 'F', 'F'];
  const MEL_A = 'F5/1 Db5/1 Bb4/2 | F5/1 Ab5/1 F5/2 | Eb5/1 Db5/1 Bb4/2 | Db5/4 |' +
                'Ab4/1 Db5/1 F5/2 | Eb5/1 F5/1 Ab5/2 | Eb5/2 C5/2 | Eb5/4';
  s.auto(5, { bright: 0.95 });
  s.prog(5, A, C, { pattern: 'pulse', riffVel: 66 });
  s.mel('box', 5, MEL_A, 84);

  s.auto(13, { bright: 1.1, space: 0.62 });
  s.prog(13, B, C, { pattern: ['pulse', 'orbit'], riffVel: 68, pad: true });
  s.mel('box', 13, 'Gb5/2 F5/1 Eb5/1 | Bb4/4 | Db5/1 F5/1 Bb5/2 | Ab5/2 F5/2 |' +
                   'Gb5/1 F5/1 Db5/2 | Bb4/4 | A4/1 C5/1 F5/2 | C5/2 A4/2', 86);
  s.mel('bell', 13, 'r/2 Bb5/2:56 | r/4 | r/2 F5/2:54 | r/4 | r/2 Db6/2:56 | r/4 | r/2 C6/2:54 | r/4');

  s.auto(21, { bright: 1.0, space: 0.58 });
  s.prog(21, A, C, { pattern: 'pulse', riffVel: 64, pad: true, padVel: 36 });
  s.mel('box', 21, MEL_A, 82);
  s.mel('bell', 21, 'r/4 | r/2 Ab5/2:52 | r/4 | r/2 F5/2:52 | r/4 | r/2 Ab5/2:52 | r/4 | r/2 C6/2:52');
});
