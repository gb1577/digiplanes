// Plane 13 JADE: "Green Stone". A minor, 120 BPM, after ElectroSynthAge_05:
// stepwise, gently chromatic bell lines (the source's melody moved in half/whole steps), climbing riff.
GlassCompose.song({
  id: 'jade', name: '13 Jade · Green Stone', key: 'A minor', bpm: 120, bars: 28, loopFrom: 5, tune: -24,
  start: { bright: 1.0, space: 0.5 }, fx: { div: '1/8.', echoMix: 0.32, revMix: 0.36 },
  tracks: {
    riff:  { patch: 'pluck',     gain: 0.55, color: '#e3b36a' },
    bell:  { patch: 'glassBell', gain: 1.0,  color: '#7fd3c8' },
    chime: { patch: 'chime',     gain: 0.45, color: '#c99be8' },
    bass:  { patch: 'bass',      gain: 0.78, color: '#9fd47a' },
    pad:   { patch: 'pad',       gain: 0.45, color: '#8d8a84' },
  },
}, (s) => {
  const C = {
    Am: { riff: ['A2', 'E3', 'A3', 'C4'], bass: 'A1', pad: ['A3', 'C4', 'E4'] },
    F:  { riff: ['F2', 'C3', 'F3', 'A3'], bass: 'F1', pad: ['F3', 'A3', 'C4', 'E4'] },
    Dm: { riff: ['D3', 'A3', 'D4', 'F4'], bass: 'D2', pad: ['F3', 'A3', 'D4'] },
    E:  { riff: ['E2', 'B2', 'E3', 'G#3'], bass: 'E1', pad: ['G#3', 'B3', 'D4', 'E4'] },
    G:  { riff: ['G2', 'D3', 'G3', 'B3'], bass: 'G1', pad: ['G3', 'B3', 'D4'] },
    Em: { riff: ['E2', 'B2', 'E3', 'G3'], bass: 'E1', pad: ['G3', 'B3', 'E4'] },
  };
  s.pad(1, C.Am.pad, 16, 38); s.bass(1, 'A1', 16, 58);
  s.mel('bell', 1, 'r/2 A5/.5:62 B5/.5:62 C6/1:62 | B5/1:58 A5/3:58 | r/4 | r/4');
  s.riff(3, C.Am.riff, { pattern: 'climb', vel: 42 }); s.riff(4, C.Am.riff, { pattern: 'climb', vel: 54 });

  const A = ['Am', 'Am', 'F', 'F', 'Dm', 'Dm', 'E', 'E'];
  const B = ['F', 'F', 'G', 'G', 'Em', 'Em', 'E', 'E'];
  const MEL_A = 'A5/.5 B5/.5 C6/1 B5/1 A5/1 | E5/2 A5/2 | F5/.5 G5/.5 A5/1 C6/1 A5/1 | G5/1 F5/1 E5/2 |' +
                'D5/.5 E5/.5 F5/1 A5/1 D6/1 | C6/1 B5/1 A5/2 | G#5/1 B5/1 E6/2 | D6/1 C6/1 B5/2';
  s.auto(5, { bright: 1.1 });
  s.prog(5, A, C, { pattern: 'climb', riffVel: 70 });
  s.mel('bell', 5, MEL_A);

  s.auto(13, { bright: 1.3, space: 0.6 });
  s.prog(13, B, C, { pattern: ['climb', 'cascade'], riffVel: 72, pad: true });
  s.mel('bell', 13, 'A5/1 C6/1 F6/2 | E6/1 D6/1 C6/2 | B5/1 D6/1 G6/2 | F6/1 E6/1 D6/2 |' +
                    'E6/1 G6/1 B6/2 | A6/1 G6/1 E6/2 | B5/1 G#5/1 E5/2 | G#5/2 B5/2', 90);
  s.mel('chime', 13, 'r/2 C4/.5:50 D4/.5:48 E4/1:48 | r/4 | r/2 D4/.5:50 E4/.5:48 F4/1:48 | r/4 |' +
                     'r/2 E4/.5:50 F#4/.5:48 G4/1:48 | r/4 | r/2 D4/.5:50 E4/.5:48 G#4/1:48 | r/4');

  s.auto(21, { bright: 1.15, space: 0.55 });
  s.prog(21, A, C, { pattern: 'climb', riffVel: 70, pad: true, padVel: 34 });
  s.mel('bell', 21, MEL_A);
});
