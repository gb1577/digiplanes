// Plane 04 SPECTRUM: "Coloured Glass". G major with borrowed Eb/Bb, 100 BPM, after
// ElectroSynthAge_04: bright bells that leap octaves, climbing pluck riff.
GlassCompose.song({
  id: 'spectrum', name: '04 Spectrum · Coloured Glass', key: 'G major', bpm: 100, bars: 28, loopFrom: 5, tune: -24,
  start: { bright: 0.9, space: 0.55 }, fx: { div: '1/8.', echoMix: 0.36, revMix: 0.38 },
  tracks: {
    riff:  { patch: 'pluck',     gain: 0.55, color: '#e3b36a' },
    bell:  { patch: 'glassBell', gain: 1.0,  color: '#7fd3c8' },
    chime: { patch: 'chime',     gain: 0.5,  color: '#c99be8' },
    arp:   { patch: 'chime',     gain: 0.35, color: '#c99be8' },
    bass:  { patch: 'bass',      gain: 0.72, color: '#9fd47a' },
    pad:   { patch: 'pad',       gain: 0.45, color: '#8d8a84' },
  },
}, (s) => {
  const C = {
    G:  { riff: ['G2', 'D3', 'G3', 'B3'], bass: 'G1', pad: ['G3', 'B3', 'D4', 'A4'] },
    Em: { riff: ['E2', 'B2', 'E3', 'G3'], bass: 'E1', pad: ['G3', 'B3', 'E4'] },
    C:  { riff: ['C2', 'G2', 'C3', 'E3'], bass: 'C1', pad: ['G3', 'C4', 'E4', 'B4'] },
    D:  { riff: ['D2', 'A2', 'D3', 'F#3'], bass: 'D1', pad: ['F#3', 'A3', 'D4', 'E4'] },
    Eb: { riff: ['Eb2', 'Bb2', 'Eb3', 'G3'], bass: 'Eb1', pad: ['G3', 'Bb3', 'D4'] },
    Bb: { riff: ['Bb2', 'F3', 'Bb3', 'D4'], bass: 'Bb1', pad: ['F3', 'Bb3', 'D4'] },
  };
  s.pad(1, C.G.pad, 16, 38); s.bass(1, 'G1', 16, 58);
  s.mel('bell', 1, 'r/2 D6/2:66 | G5/1:60 G6/3:64 | r/4 | r/4');
  s.riff(3, C.G.riff, { pattern: 'climb', vel: 44 }); s.riff(4, C.G.riff, { pattern: 'climb', vel: 56 });

  const A = ['G', 'G', 'Em', 'Em', 'C', 'C', 'D', 'D'];
  const B = ['Eb', 'Eb', 'Bb', 'Bb', 'C', 'C', 'D', 'D'];
  const MEL_A = 'G5/1 G6/1 D6/2 | B5/1.5 A5/.5 G5/2 | E6/1 E5/1 B5/2 | G5/4 |' +
                'E6/1.5 D6/.5 C6/2 | G5/2 E5/2 | F#5/1 A5/1 D6/2 | C6/2 A5/2';
  s.auto(5, { bright: 1.05 });
  s.prog(5, A, C, { pattern: 'climb', riffVel: 70 });
  s.mel('bell', 5, MEL_A);

  s.auto(13, { bright: 1.3, space: 0.68 });
  s.prog(13, B, C, { pattern: ['climb', 'orbit'], riffVel: 72, pad: true });
  s.mel('bell', 13, 'G5/1 Bb5/1 Eb6/2 | D6/2 Bb5/2 | F5/1 Bb5/1 D6/2 | F6/4 |' +
                    'E6/1 G6/1 C6/2 | G5/4 | F#5/1 A5/1 D6/1 F#6/1 | A6/4', 90);
  s.mel('chime', 13, 'r/1.5 G4/1:54 r/1.5 | r/1.5 Bb4/1:52 r/1.5 | r/1.5 F4/1:54 r/1.5 | r/1.5 D5/1:52 r/1.5 |' +
                     'r/1.5 E4/1:54 r/1.5 | r/1.5 C5/1:52 r/1.5 | r/1.5 A4/1:54 r/1.5 | r/1.5 F#4/1:52 r/1.5');

  s.auto(21, { bright: 1.1, space: 0.58 });
  s.prog(21, A, C, { pattern: 'climb', riffVel: 70, arp: { rate: 0.75, beats: 4, vel: 46, len: 0.3 } });
  s.mel('bell', 21, MEL_A);
});
