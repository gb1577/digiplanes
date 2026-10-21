import * as THREE from 'three';
import { buildEnvironment, makeMaterials } from './materials.js';
import { CageMode } from './cageMode.js';
import { PuzzleMode } from './puzzleMode.js';
import { Post } from './post.js';
import { Sound } from './audio.js';
import { LEVELS, THEMES } from './themes.js';

// ---------- input ----------
class Input {
  constructor(canvas) {
    this.down = new Set();
    this.hit = new Set();
    this.click = null;
    addEventListener('keydown', (e) => {
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Backspace'].includes(e.code)) e.preventDefault();
      if (!this.down.has(e.code)) this.hit.add(e.code);
      this.down.add(e.code);
    });
    addEventListener('keyup', (e) => this.down.delete(e.code));
    addEventListener('blur', () => this.down.clear());
    canvas.addEventListener('pointerdown', (e) => {
      if (!e.isPrimary) return; // a second finger on the canvas neither clicks nor drags
      this.lastX = e.clientX; this.lastY = e.clientY;
      this.press = e.pointerType === 'mouse' && e.button === 0 ? { t: e.timeStamp, moved: 0 } : null;
      const r = canvas.getBoundingClientRect();
      this.click = new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
      this.hit.add('Pointer'); // any click dismisses the intro card
      e.preventDefault(); // no text selection / native drag stealing the gesture
      this.armed = true; // only presses that start on the game count
      canvas.setPointerCapture(e.pointerId);
      this.buttons(e);
    });
    // trackball: while the left button is held, mouse movement pushes the cage (no pointer lock needed).
    // Button state comes from e.buttons on every event: pressing/releasing a second button while one is
    // already down arrives as a pointermove, not a pointerdown/up, so per-event e.button can't be trusted.
    this.mdx = 0; this.mdy = 0; this.dragging = false;
    // Touch and pen deltas come from clientX/Y: iOS Safari reports movementX/Y as 0 (or not at all) for touch.
    canvas.addEventListener('pointermove', (e) => {
      if (!e.isPrimary) return;
      this.buttons(e);
      const dx = e.pointerType === 'mouse' ? e.movementX : e.clientX - this.lastX;
      const dy = e.pointerType === 'mouse' ? e.movementY : e.clientY - this.lastY;
      this.lastX = e.clientX; this.lastY = e.clientY;
      if (this.dragging) { this.mdx += dx; this.mdy += dy; }
      if (this.press) this.press.moved += Math.abs(dx) + Math.abs(dy);
    });
    // Trackpad tap = hop, once the game has seen a trackpad swipe. The browser can't tell a trackpad tap from a
    // mouse click, so before any swipe (and always with a mouse) a click works as before: press and drag to roll.
    const tapHop = (e) => {
      const p = this.press; this.press = null;
      if (!this.trackpad || !p || e.pointerType !== 'mouse' || e.button !== 0) return;
      if (e.timeStamp - p.t > 250 || p.moved > 6) return; // a press-and-drag, not a tap
      this.hit.add('Space'); this.down.add('Space');
      setTimeout(() => { if (!this.rightDown) this.down.delete('Space'); }, 90); // a tap gives the short hop
    };
    const stop = (e) => { if (e.isPrimary) { tapHop(e); this.buttons(e); } };
    canvas.addEventListener('pointerup', stop);
    canvas.addEventListener('pointercancel', (e) => { if (e.isPrimary) this.buttons({ buttons: 0 }); });
    canvas.addEventListener('lostpointercapture', (e) => { if (e.isPrimary) this.buttons({ buttons: 0 }); });
    addEventListener('blur', () => this.buttons({ buttons: 0 }));
    // Trackpads (MacBook, PC precision touchpads): a two-finger swipe arrives as wheel events and steers like a
    // drag, no click needed. A mouse wheel is told apart and does nothing, as before. Pinch (ctrl + wheel) is
    // ignored, and the page never scrolls or zooms from it.
    const MAC = /Mac/.test(navigator.platform);
    canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      if (e.ctrlKey) return;
      // a notched mouse wheel scrolls in lines (Firefox) or in whole steps of 120 (wheelDeltaY, the old API);
      // anything else (small, smooth pixel steps, often sideways too) is a finger swipe
      const notched = e.deltaMode !== 0 || (e.deltaX === 0 && e.wheelDeltaY && Math.abs(e.wheelDeltaY) % 120 === 0);
      if (notched) return;
      this.trackpad = true;
      // macOS scrolls "naturally" (the content follows the fingers), Windows the other way round:
      // either way the cage rolls the way the fingers move
      const s = MAC ? -1 : 1;
      this.mdx += s * e.deltaX; this.mdy += s * e.deltaY;
    }, { passive: false });
    // right button is the hop: never open the browser menu anywhere on the page
    addEventListener('contextmenu', (e) => e.preventDefault(), { capture: true });
    // on-screen touch buttons (#touch, shown on coarse pointers) press the same key codes;
    // holding one holds the key, so the hop button gives the higher hop like Space does
    for (const b of document.querySelectorAll('#touch [data-key]')) {
      const code = b.dataset.key;
      const release = () => { this.down.delete(code); b.classList.remove('held'); };
      b.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        this.hit.add(code); this.down.add(code); b.classList.add('held');
        try { b.setPointerCapture(e.pointerId); } catch { /* pointer already gone */ }
      });
      b.addEventListener('pointerup', release);
      b.addEventListener('pointercancel', release);
      b.addEventListener('lostpointercapture', release);
    }
  }
  buttons(e) {
    // a button pressed somewhere else (chat, desktop, another window) and swept over the game is ignored
    if (!e.buttons) this.armed = false;
    const b = this.armed ? e.buttons : 0;
    this.dragging = (b & 5) !== 0; // left or middle drags
    const right = (b & 2) !== 0; // right hops (held = higher hop)
    if (right && !this.rightDown) { this.hit.add('Space'); this.down.add('Space'); }
    if (!right && this.rightDown) this.down.delete('Space');
    this.rightDown = right;
  }
  pressed(c) { return this.hit.has(c); }
  anyPressed(cs) { return cs.some((c) => this.hit.has(c)); }
  axisX() { return (this.down.has('KeyD') || this.down.has('ArrowRight') ? 1 : 0) - (this.down.has('KeyA') || this.down.has('ArrowLeft') ? 1 : 0); }
  axisY() { return (this.down.has('KeyW') || this.down.has('ArrowUp') ? 1 : 0) - (this.down.has('KeyS') || this.down.has('ArrowDown') ? 1 : 0); }
  consumeClick() { const c = this.click; this.click = null; return c; }
  endFrame() { this.hit.clear(); this.mdx = 0; this.mdy = 0; }
}

// ---------- app ----------
const TOUCH = matchMedia('(pointer: coarse)').matches; // phones/tablets: touch buttons, touch wording, lower pixel ratio
const canvas = document.getElementById('c');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, preserveDrawingBuffer: true, powerPreference: 'high-performance' });
renderer.toneMapping = THREE.NeutralToneMapping;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const $ = (id) => document.getElementById(id);
const overlay = $('overlay');
const post = new Post(renderer, innerWidth, innerHeight);
const sound = new Sound();

const app = {
  renderer, post, sound,
  mats: makeMaterials(),
  envTex: buildEnvironment(renderer),
  onRunOver(m, reason) {
    let best = 0;
    try { best = Math.max(m.score, Number(localStorage.getItem('dp-best') || 0)); localStorage.setItem('dp-best', String(best)); } catch { best = m.score; }
    showOverlay(reason, `${m.score.toLocaleString()} pts · banked ${m.banked}/${m.level.goal} · best ${best.toLocaleString()}`, 'R · retry plane');
  },
  onLevelClear(m) {
    const next = LEVELS[levelIdx + 1];
    try { localStorage.setItem('dp-unlocked', String(Math.max(levelIdx + 1, Number(localStorage.getItem('dp-unlocked') || 0)))); } catch { /* storage blocked */ }
    showOverlay('PLANE CLEAR', `${m.level.title} · ${m.score.toLocaleString()} pts`, next ? `next plane: ${next.title} …` : 'All planes cleared · R to replay');
    // roll straight on to the next plane (N still skips the wait)
    if (next) { const from = m; setTimeout(() => { if (modes.cage === from) loadLevel(levelIdx + 1); }, 3000); }
  },
  hideOverlay() { overlay.classList.remove('on'); },
};

// live reflections for chrome: a cube camera that follows the action and also sees
// the reflection-only softboxes on layer 2
const cubeRT = new THREE.WebGLCubeRenderTarget(192, { type: THREE.HalfFloatType, generateMipmaps: true, minFilter: THREE.LinearMipmapLinearFilter });
const cubeCam = new THREE.CubeCamera(0.2, 80, cubeRT);
cubeCam.children.forEach((c) => c.layers.enable(2));
const useProbe = (mats) => { for (const m of [mats.chrome, mats.chromeBar]) { m.envMap = cubeRT.texture; m.needsUpdate = true; } };
useProbe(app.mats);

const input = new Input(canvas);

const modes = { cage: null, puzzle: new PuzzleMode(app) };
let mode = null;
let levelIdx = 0;

function setThemeUI(theme) {
  const r = document.documentElement.style;
  for (const [k, v] of Object.entries(theme.ui)) r.setProperty(`--${k}`, v);
  r.setProperty('--danger', `#${theme.danger.toString(16).padStart(6, '0')}`);
}
const setAudioTag = () => {
  $('tb-audio').textContent = sound.muted ? 'MUTED · M' : 'ON · M';
  $('t-mute').textContent = sound.muted ? '♪ OFF' : '♪ ON';
};
setAudioTag();

function disposeScene(scene) {
  scene.traverse((o) => {
    o.geometry?.dispose?.();
    const ms = Array.isArray(o.material) ? o.material : o.material ? [o.material] : [];
    ms.forEach((m) => m.dispose?.());
  });
}

// Phones and tablets only allow sound after a tap, and on iPhone a drag doesn't count as one. So on touch
// screens the first plane waits on its title sheet for a tap: that tap starts the music and the run together.
let waitTap = TOUCH;
function startFromTap() {
  if (!waitTap) return;
  waitTap = false;
  sound.start();
  overlay.classList.remove('on');
}
for (const t of ['touchend', 'click']) addEventListener(t, startFromTap, { capture: true, passive: true });

function loadLevel(i) {
  levelIdx = (i + LEVELS.length) % LEVELS.length;
  const level = LEVELS[levelIdx];
  if (modes.cage) disposeScene(modes.cage.scene);
  modes.cage = new CageMode(app, level);
  useProbe(modes.cage.mats);
  if (mode === null || mode instanceof CageMode) mode = modes.cage;
  resize();
  sound.music(level.id);
  if (mode === modes.cage) {
    setThemeUI(THEMES[level.theme]);
    const extra = level.colorMatch ? ' Marbles matching the <b>portal colour</b> score big.' : '';
    showOverlay(level.title, `Bank <b>${level.goal}</b> marbles at the lit portal. Banking refuels you. Don't get caught.${extra}`,
      waitTap ? '<b>▶ TAP TO START</b><br>drag · roll  ·  HOP button · hop' : TOUCH ? 'drag · roll  ·  HOP button · hop' : 'WASD or hold left-click + drag · roll  ·  SPACE or right-click · hop',
      waitTap ? 0 : 4000);
  }
}

// ---------- HUD ----------
const HELP = {
  cage: `<b>CAGE</b> — scoop marbles (max <i>12</i>), roll them into the <i>lit portal</i> to bank. Banking refuels the clock; full loads score ×2. The <i>hunter</i> cage gets faster every bank — ram the chrome balls into it to stun it.<div class="keys"><span>WASD</span> or <span>hold left-click + drag</span> roll <span>SPACE</span> or <span>right-click</span> hop <span>R</span> retry <span>[ ]</span> plane <span>M</span> mute</div>`,
  puzzle: `<b>PUZZLE</b> — the cage tips face-by-face over a triangle grid. Land the <i>glowing face</i> on the <i>glowing target</i>. Every tip changes which face is down — plan the route.<div class="keys"><span>WASD</span>/<span>click</span> tip <span>Z</span> undo <span>R</span> reset <span>N</span> skip</div>`,
};
if (TOUCH) {
  HELP.cage = HELP.cage.replace(/<div class="keys">.*<\/div>/, '<div class="keys"><span>drag</span> roll <span>HOP</span> hop (hold = higher)</div>');
  HELP.puzzle = HELP.puzzle.replace(/<div class="keys">.*<\/div>/, '<div class="keys"><span>tap</span> a lit triangle to tip</div>');
}
let overlayTimer = 0;
function showOverlay(title, sub, hint, autoHideMs = 0) {
  overlay.innerHTML = `<div class="sheet"><h2>${title}</h2><p>${sub}</p><small>${hint}</small></div>`;
  overlay.classList.add('on');
  clearTimeout(overlayTimer);
  if (autoHideMs) overlayTimer = setTimeout(() => overlay.classList.remove('on'), autoHideMs);
}
function setMode(name) {
  mode = modes[name];
  document.querySelectorAll('[data-mode]').forEach((b) => b.classList.toggle('active', b.dataset.mode === name));
  $('help').innerHTML = HELP[name];
  if (!waitTap) overlay.classList.remove('on'); // the TAP TO START sheet stays until that tap
  document.body.dataset.mode = name;
  setThemeUI(name === 'cage' ? modes.cage.theme : THEMES.cobalt);
}
document.querySelectorAll('[data-mode]').forEach((b) => b.addEventListener('click', () => setMode(b.dataset.mode)));
// touch: the notes panel opens from the ? button and closes on the next touch of the game
$('t-help').addEventListener('click', () => document.body.classList.toggle('show-help'));
canvas.addEventListener('pointerdown', () => document.body.classList.remove('show-help'));

const popLayer = $('pops');
const arrow = $('arrow');
const _p = new THREE.Vector3();
function updateHud() {
  const h = mode.hud();
  $('title').textContent = h.title || 'PUZZLE';
  $('stats').innerHTML = h.lines.map(([k, v], i) => `<div><label><em>${String(i + 1).padStart(2, '0')}</em>${k}</label><span>${v}</span></div>`).join('');
  $('fill').style.width = `${Math.round(h.fill * 100)}%`;
  $('fill').classList.toggle('full', h.fill >= 1);
  if (h.fuel !== undefined) {
    $('fuelbar').style.width = `${Math.round(h.fuel * 100)}%`;
    $('fueltxt').textContent = `FUEL ${h.fuelText}`;
    $('fuelwrap').classList.toggle('low', h.fuelLow);
  }
  const f = mode.focus;
  $('tb-pos').textContent = `X ${f.x.toFixed(1).padStart(5)}  Z ${f.z.toFixed(1).padStart(5)}`;
  if (mode === modes.cage) {
    $('tb-dwg').textContent = `DP-${String(levelIdx + 1).padStart(2, '0')} / ${String(LEVELS.length).padStart(2, '0')}`;
    $('tb-plane').textContent = modes.cage.theme.name;
  } else { $('tb-dwg').textContent = 'DP-PZ'; $('tb-plane').textContent = 'PUZZLE'; }
  const pr = $('prompt');
  pr.classList.toggle('on', !!h.prompt);
  if (h.prompt && pr.textContent !== h.prompt) pr.textContent = h.prompt;
  $('danger').style.opacity = String((h.danger || 0) * 0.85);
  for (const ev of h.events) {
    const d = document.createElement('div');
    d.className = `ev${ev.warn ? ' warn' : ''}`;
    d.textContent = ev.text;
    $('feed').prepend(d);
    setTimeout(() => d.remove(), 1800);
  }
  const W = innerWidth, H = innerHeight;
  for (const p of h.popups || []) {
    _p.copy(p.p).project(mode.camera);
    if (_p.z > 1) continue;
    const d = document.createElement('div');
    d.className = `pop ${p.cls}`;
    d.textContent = p.text;
    d.style.left = `${(_p.x * 0.5 + 0.5) * W}px`;
    d.style.top = `${(-_p.y * 0.5 + 0.5) * H}px`;
    popLayer.append(d);
    setTimeout(() => d.remove(), 1100);
  }
  // portal pointer: marker on screen, edge arrow when off screen
  if (h.target) {
    _p.copy(h.target).project(mode.camera);
    let x = _p.x, y = _p.y;
    const behind = _p.z > 1;
    if (behind) { x = -x; y = -y; }
    const inside = !behind && Math.abs(x) < 0.9 && Math.abs(y) < 0.85;
    if (!inside) {
      const s = 0.88 / Math.max(Math.abs(x), Math.abs(y) / 0.95, 1e-3);
      x *= s; y *= s;
    }
    arrow.style.display = 'block';
    arrow.style.left = `${(x * 0.5 + 0.5) * W}px`;
    arrow.style.top = `${(-y * 0.5 + 0.5) * H}px`;
    arrow.classList.toggle('edge', !inside);
    arrow.classList.toggle('urgent', !!h.prompt);
    arrow.dataset.label = `${h.markerLabel || 'PORTAL'} ${Math.round(h.targetDist)}m`;
    arrow.style.setProperty('--rot', `${Math.atan2(-y, x)}rad`);
  } else arrow.style.display = 'none';
}

// ---------- loop ----------
let lastSize = '';
function resize() {
  const w = canvas.clientWidth || innerWidth, h = canvas.clientHeight || innerHeight, dpr = Math.min(devicePixelRatio, TOUCH ? 1.25 : 1.75); // phones: fewer pixels, steadier frames
  renderer.setPixelRatio(dpr);
  renderer.setSize(w, h, false);
  post.setSize(w, h, dpr);
  for (const m of Object.values(modes)) {
    if (!m) continue;
    m.camera.aspect = w / h;
    m.camera.updateProjectionMatrix();
    m.resize?.(w * dpr, h * dpr);
    m.scene.traverse((o) => { if (o.material && o.material.isLineMaterial) o.material.resolution.set(w, h); });
  }
  for (const lm of app.mats.allLines()) lm.resolution.set(w, h);
  lastSize = `${w}x${h}`;
}
addEventListener('resize', resize);
// Turning a phone: iOS reports the new size late, sometimes after the resize event, so check again a moment later
const settle = () => { scrollTo(0, 0); [120, 400, 900].forEach((ms) => setTimeout(() => { if (`${canvas.clientWidth}x${canvas.clientHeight}` !== lastSize) resize(); }, ms)); };
addEventListener('orientationchange', settle);
visualViewport?.addEventListener('resize', settle);

loadLevel(Number(new URLSearchParams(location.search).get('plane') || 1) - 1);
setMode(location.hash === '#puzzle' ? 'puzzle' : 'cage');

let last = performance.now();
function handleGlobalKeys() {
  if (input.pressed('Digit1')) setMode('cage');
  if (input.pressed('Digit2')) setMode('puzzle');
  if (input.pressed('KeyM')) { sound.toggle(); setAudioTag(); }
  if (mode === modes.cage) {
    if (input.pressed('BracketRight') || (input.pressed('KeyN') && modes.cage.won)) loadLevel(levelIdx + 1);
    else if (input.pressed('BracketLeft')) loadLevel(levelIdx - 1);
    if (overlay.classList.contains('on') && !modes.cage.over && input.hit.size) overlay.classList.remove('on');
  }
  if (input.pressed('KeyR')) overlay.classList.remove('on');
}
// The probe sits right above the player's cage. Its spinning bars, the marbles it carries and the
// sparks would fill most of the probe's view and make every chrome reflection flicker, so they're
// hidden from the probe (they still render normally).
function updateProbe() {
  cubeCam.position.copy(mode.focus).add(new THREE.Vector3(0, 1.2, 0));
  const hide = (mode.probeHidden?.() || []).filter((o) => o && o.visible);
  hide.forEach((o) => { o.visible = false; });
  cubeCam.update(renderer, mode.scene);
  hide.forEach((o) => { o.visible = true; });
}
function renderFrame(dt) {
  renderer.toneMappingExposure = mode.exposure || 1;
  post.grade.uniforms.uCA.value = mode.theme?.ca ?? 1;
  post.grade.uniforms.uLift.value = mode.theme?.lift ?? 0.6;
  post.grade.uniforms.uPencil.value = mode.theme?.pencil ?? 0;
  const b = mode.theme?.bloom;
  post.bloom.strength = b?.strength ?? 0.32;
  post.bloom.radius = b?.radius ?? 0.4;
  post.bloom.threshold = b?.threshold ?? 0.92;
  // probe every frame: updating at half rate made reflections step and flicker
  {
    updateProbe();
  }
  post.render(mode.scene, mode.camera, mode.focusDistance || 15, dt);
}
function tick(now) {
  const dt = Math.min(0.033, (now - last) / 1000);
  last = now;
  if (waitTap) input.endFrame(); // waiting for the first tap: the world is drawn but holds still
  handleGlobalKeys();
  mode.update(waitTap ? 0 : dt, input);
  input.endFrame();
  renderFrame(dt);
  updateHud();
  requestAnimationFrame(tick);
}
requestAnimationFrame(tick);

// ---------- screenshot / debug hooks ----------
window.game = {
  modes, setMode, post, sound, loadLevel, LEVELS, input,
  get mode() { return mode; },
  shot(name) {
    renderer.toneMappingExposure = mode.exposure || 1;
    post.render(mode.scene, mode.camera, mode.focusDistance || 15, 0);
    // the PNG sink only exists on the local dev server (server.js); elsewhere this quietly resolves null
    return fetch(`shot?name=${encodeURIComponent(name)}`, { method: 'POST', body: canvas.toDataURL('image/png') })
      .then((r) => (r.ok ? r.text() : null)).catch(() => null);
  },
  // deterministic stepping for captures: hold `keys` for `sec` seconds of game time
  advance(sec, keys = []) {
    const n = Math.round(sec * 60);
    for (let i = 0; i < n; i++) {
      keys.forEach((k) => { if (i === 0) input.hit.add(k); input.down.add(k); });
      mode.update(1 / 60, input);
      input.endFrame();
    }
    keys.forEach((k) => input.down.delete(k));
    updateProbe();
    updateHud();
  },
  key(code, ms = 300) {
    input.hit.add(code); input.down.add(code);
    return new Promise((res) => setTimeout(() => { input.down.delete(code); res(); }, ms));
  },
};
