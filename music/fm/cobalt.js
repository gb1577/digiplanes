// Plane 01 COBALT: "Glass Orbit" (sketch 01), looping in game.
// A dorian, 99 BPM, no drums: a 16th-note FM pluck riff over a held FM bass,
// sparse glass-bell melody above, pad + chime counter-lines in the B section.
// Times are in beats (4 per bar), bar 1 starts at beat 0.
(() => {
  const notes = [];
  const auto = [];
  const N = (tr, b, d, n, v) => notes.push({ tr, b, d, n, v });
  const bar = (k) => (k - 1) * 4;

  // --- riff: 16 steps, chord tones [root, fifth, octave, colour], '_' = rest ---
  const PATTERN = [0, '_', 1, 2, 3, '_', 0, 1, 2, '_', 0, 3, 1, '_', 2, '_'];
  const ACCENT = [1, 0, .6, .75, .85, 0, .7, .6, .9, 0, .65, .8, .7, 0, .75, 0];
  const RIFF = {
    A:  [45, 52, 57, 50], // A2 E3 A3 D3   (open, sus4 colour)
    A7: [45, 52, 55, 50], // A2 E3 G3 D3   (dorian b7 variant)
    F:  [41, 48, 53, 52], // F2 C3 F3 E3
    G:  [43, 50, 55, 52], // G2 D3 G3 E3
    Em: [40, 47, 52, 55], // E2 B2 E3 G3
  };
  function riff(k, chord, vel = 78, steps = 16) {
    const tones = RIFF[chord];
    for (let i = 0; i < steps; i++) {
      const s = PATTERN[i]; if (s === '_') continue;
      N('riff', bar(k) + i / 4, 0.22, tones[s], Math.round(vel * (0.55 + 0.45 * ACCENT[i])));
    }
  }

  // --- low FM bass, re-struck softly ---
  const bass = (k, n, beats = 8, v = 70) => N('bass', bar(k), beats - 0.05, n, v);
  // --- pad chords ---
  const pad = (k, chord, beats = 8, v = 52) => chord.forEach((n) => N('pad', bar(k), beats - 0.1, n, v));
  const P = {
    Asus2: [57, 59, 64], Fmaj7: [53, 57, 60, 64], G6: [55, 59, 62, 64], Em7: [52, 55, 59, 62],
  };
  // --- bells / chime: list of [beatInBar, durBeats, note, vel] from a bar ---
  const line = (tr, k, items) => items.forEach(([b, d, n, v = 88]) => N(tr, bar(k) + b, d, n, v));

  // ---------------- Intro (bars 1-4) ----------------
  bass(1, 33, 16, 62);                       // A1 drone
  pad(1, P.Asus2, 16, 40);
  line('bell', 1, [[2, 2, 88, 70]]);         // E6
  line('bell', 2, [[1, 3, 81, 62]]);         // A5
  riff(3, 'A', 48); riff(4, 'A7', 60);

  // ---------------- A section (bars 5-12) ----------------
  auto.push({ b: bar(5), bright: 1.0, space: 0.6 });
  bass(5, 33); bass(7, 33); bass(9, 33); bass(11, 33);
  ['A', 'A7', 'A', 'A7', 'A', 'A7', 'A', 'A7'].forEach((c, i) => riff(5 + i, c, 74));
  // phrase 1
  line('bell', 5,  [[0, 2, 88], [2.5, 1.5, 81, 76]]);              // E6 . A5
  line('bell', 6,  [[0, 1.5, 86], [1.5, .5, 88, 74], [2, 2, 91]]); // D6 E6 G6
  line('bell', 7,  [[0, 3, 88, 84]]);                              // E6
  line('bell', 8,  [[0, 1, 86, 80], [1, 1, 83, 74], [2, 2, 81]]);  // D6 B5 A5
  // phrase 2, reaching higher
  line('bell', 9,  [[0, 1.5, 88], [1.5, .5, 91, 76], [2, 2, 93, 94]]); // E6 G6 A6
  line('bell', 10, [[0, 1, 91, 84], [1, 1, 90, 80], [2, 2, 88]]);      // G6 F#6 E6
  line('bell', 11, [[0, 1.5, 86], [1.5, 2.5, 88, 82]]);                // D6 E6
  line('bell', 12, [[0, 4, 81, 86]]);                                  // A5

  // ---------------- B section (bars 13-20): F  G  Em  A ----------------
  auto.push({ b: bar(13), bright: 1.3, space: 0.72 });
  const B = [['F', 29, P.Fmaj7], ['G', 31, P.G6], ['Em', 28, P.Em7], ['A', 33, P.Asus2]];
  B.forEach(([c, root, chord], i) => {
    const k = 13 + i * 2;
    bass(k, root, 8, 74); pad(k, chord, 8, 50);
    riff(k, c, 70); riff(k + 1, c === 'A' ? 'A7' : c, 76);
  });
  line('bell', 13, [[0, 1, 93], [1, 1, 91, 80], [2, 2, 88]]);        // A6 G6 E6
  line('bell', 14, [[0, 1, 88, 80], [1, 3, 84, 84]]);                // E6 C6
  line('bell', 15, [[0, 1.5, 86], [1.5, .5, 83, 72], [2, 2, 86]]);   // D6 B5 D6
  line('bell', 16, [[0, 4, 91, 90]]);                                // G6
  line('bell', 17, [[0, 1, 88], [1, 1, 91, 80], [2, 2, 95, 92]]);    // E6 G6 B6
  line('bell', 18, [[0, 1, 93, 84], [1, 1, 91, 78], [2, 2, 88]]);    // A6 G6 E6
  line('bell', 19, [[0, 2, 86], [2, 2, 88, 84]]);                    // D6 E6
  line('bell', 20, [[0, 4, 93, 96]]);                                // A6
  // chime counter-line (patch plays an octave up): soft offbeat chord tones
  const CH = { 13: [72, 76], 14: [69, 72], 15: [71, 74], 16: [67, 71], 17: [71, 67], 18: [66, 71], 19: [69, 74], 20: [69, 76] };
  for (const [k, [a, b]] of Object.entries(CH)) line('chime', +k, [[1.5, 1, a, 58], [3, 1, b, 52]]);

  // ---------------- Outro (bars 21-24) ----------------
  auto.push({ b: bar(21), bright: 0.9, space: 0.68 });
  bass(21, 33, 16, 64);
  riff(21, 'A', 66); riff(22, 'A7', 52, 12); riff(23, 'A', 36, 6);
  line('bell', 21, [[0, 2, 88, 80], [2.5, 1.5, 86, 70]]);  // E6 D6
  line('bell', 22, [[1, 3, 81, 74]]);                      // A5
  line('bell', 23, [[2, 2, 88, 62]]);                      // E6, echo answers
  pad(23, [...P.Asus2, 69], 8, 44);         // stays modal: no major third
  line('bell', 24, [[0, 4, 93, 70]]);                      // final A6
  line('chime', 24, [[0.5, 3, 76, 50]]);

  (window.GlassFMSongs ||= []).push({
    id: 'cobalt',
    name: '01 Cobalt · Glass Orbit',
    key: 'A dorian',
    bpm: 99,
    gain: 2.2, // overall song level vs live playing
    bars: 24,
    loopFrom: 5, // intro once, then bars 5-24 loop
    tune: -24,   // cents: the SY22 recordings sit this flat
      // cents: the SY22 recordings sit this flat
    tail: 4, // seconds of echo/reverb after the last bar
    start: { bright: 0.8, space: 0.55 },
    tracks: {
      riff:  { patch: 'pluck',     gain: 0.62, color: '#e3b36a' },
      bell:  { patch: 'glassBell', gain: 1.0,  color: '#7fd3c8' },
      chime: { patch: 'chime',     gain: 0.55, color: '#c99be8' },
      bass:  { patch: 'bass',      gain: 0.75, color: '#9fd47a' },
      pad:   { patch: 'pad',       gain: 0.5,  color: '#8d8a84' },
    },
    notes: notes.sort((a, b) => a.b - b.b),
    auto,
  });
})();
