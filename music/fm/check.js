// Sanity checker for the FM songs: `node music/fm/check.js` from the project root.
// Loads every song with the real composing kit and reports structural and harmonic problems.
const fs = require('fs');
const path = require('path');
global.window = {};
global.document = { hidden: false };
require('./compose.js');
window.GlassCompose.strict = true;
global.GlassCompose = window.GlassCompose; // browsers expose window props as globals; node needs this

const dir = __dirname;
const files = fs.readdirSync(dir).filter((f) => f.endsWith('.js') && !['compose.js', 'check.js'].includes(f));
let problems = 0;
const NN = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const name = (n) => NN[n % 12] + (Math.floor(n / 12) - 1);

for (const f of files) {
  const before = (window.GlassFMSongs || []).length;
  try { require(path.join(dir, f)); } catch (e) { console.log(`✗ ${f}: ${e.message}`); problems++; continue; }
  const s = window.GlassFMSongs[before];
  const issues = [];
  const M = s.meter || 4;
  const total = s.bars * M;
  const id = path.basename(f, '.js');
  if (s.id !== id) issues.push(`id "${s.id}" does not match file name`);
  for (const t of Object.keys(s.tracks)) if (!s.notes.some((n) => n.tr === t)) issues.push(`track ${t} has no notes`);
  for (const n of s.notes) {
    if (!s.tracks[n.tr]) issues.push(`note on unknown track ${n.tr}`);
    if (n.b + n.d > total + 1e-6) issues.push(`${n.tr} ${name(n.n)} at beat ${n.b} runs past the last bar`);
    if (n.n < 28 || n.n > 100) issues.push(`${n.tr} ${name(n.n)} out of range at bar ${Math.floor(n.b / M) + 1}`);
  }
  // harmonic clash: a held melody note (> 1 beat) a minor 9th above a sounding bass note;
  // shorter ones are passing tones (e.g. Dune's phrygian F over E)
  const bass = s.notes.filter((n) => n.tr === 'bass');
  const lead = s.notes.filter((n) => ['bell', 'bell2', 'chime', 'box'].includes(n.tr));
  const clashes = [];
  for (const m of lead) {
    const octUp = s.tracks[m.tr].patch === 'chime' || s.tracks[m.tr].patch === 'musicBox' ? 12 : 0;
    for (const b of bass) {
      if (m.d > 1.01 && b.b <= m.b && b.b + b.d > m.b && (((m.n + octUp - b.n) % 12) + 12) % 12 === 1) clashes.push(`${m.tr} ${name(m.n + octUp)} over bass ${name(b.n)} (bar ${Math.floor(m.b / M) + 1})`);
    }
  }
  if (clashes.length) issues.push(`minor-9th clashes: ${clashes.slice(0, 4).join('; ')}${clashes.length > 4 ? ` (+${clashes.length - 4})` : ''}`);
  // harshness: of all the time two notes sound together, the share spent a semitone apart (m2/m9)
  const OCT = { chime: 12, musicBox: 12 };
  const ev = s.notes.map((n) => ({ a: n.b, z: n.b + n.d, p: n.n + (OCT[s.tracks[n.tr].patch] || 0) })).sort((x, y) => x.a - y.a);
  let both = 0, harsh = 0;
  for (let i = 0; i < ev.length; i++) for (let j = i + 1; j < ev.length && ev[j].a < ev[i].z; j++) {
    const o = Math.min(ev[i].z, ev[j].z) - ev[j].a; if (o <= 0) continue;
    both += o; if (Math.abs(ev[i].p - ev[j].p) % 12 === 1) harsh += o;
  }
  const harshPct = both ? (100 * harsh) / both : 0;
  const inharmonic = Object.entries(s.tracks).filter(([, t]) => {
    const r = t.tweak?.ratio; return r != null && Math.abs(r * 2 - Math.round(r * 2)) > 0.05; // not a whole or half ratio
  }).map(([k, t]) => `${k} ${t.tweak.ratio}`);
  const secs = (total * 60) / s.bpm, loopSecs = ((total - ((s.loopFrom || 1) - 1) * M) * 60) / s.bpm;
  const status = issues.length ? '✗' : '✓';
  console.log(`${status} ${s.name.padEnd(32)} ${String(s.notes.length).padStart(4)} notes  ${s.bpm} BPM  ${secs.toFixed(0)}s (loop ${loopSecs.toFixed(0)}s)  harsh ${harshPct.toFixed(1)}%${inharmonic.length ? `  inharmonic tweak: ${inharmonic.join(", ")}` : ""}`);
  for (const i of [...new Set(issues)].slice(0, 8)) console.log('    - ' + i);
  problems += issues.length ? 1 : 0;
}
console.log(problems ? `\n${problems} song(s) need attention` : '\nall songs OK');
process.exitCode = problems ? 1 : 0;
