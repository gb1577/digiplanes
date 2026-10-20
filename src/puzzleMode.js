import * as THREE from 'three';
import { World } from './world.js';
import { ICO, buildCageGeometry, edgeLines, EdgeBatch } from './geometry.js';
import { PALETTE } from './materials.js';
import { viewLens } from './view.js';

const S = 0.9; // cage circumradius
const TIP = Math.PI - Math.acos(-Math.sqrt(5) / 3); // 41.81°: rotation that lays the next face down
const UP = new THREE.Vector3(0, 1, 0);
const BOARD_R = 6.4;

const LAYOUT = [
  'p.b.x.pP.p.x',
  '.p.oooooo.p.',
  'x.oooooooo.p',
  '.ooooooooo..',
  'poooooooooop',
  '.ooooooooob.',
  'boooooooooo.',
  '.ooooooooo.x',
  'poooooooooop',
  'x.oooooooo..',
  '.p.oooooo.b.',
  'p.x.p.pPp.xp',
];

const key2 = (x, z) => `${Math.round(x * 20)},${Math.round(z * 20)}`;

function rng(seed) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export class PuzzleMode {
  constructor(app) {
    this.app = app;
    const { mats } = app;
    this.mats = mats;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(PALETTE.fog);
    this.scene.fog = new THREE.Fog(PALETTE.fog, 24, 55);
    this.scene.environment = app.envTex;
    this.camera = new THREE.PerspectiveCamera(30, 1, 0.1, 200);
    this.camera.layers.enable(1);
    this.yaw = 0.62; this.pitch = 0.72;

    this.scene.add(new THREE.HemisphereLight(0x9aa6ff, 0x1c1e60, 0.6));
    const sun = new THREE.DirectionalLight(0xf4f2ff, 2.1);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    Object.assign(sun.shadow.camera, { left: -12, right: 12, top: 12, bottom: -12, near: 1, far: 60 });
    sun.shadow.bias = -0.0004;
    sun.shadow.normalBias = 0.02;
    sun.position.set(-11, 16, -3);
    this.scene.add(sun, sun.target);

    this.world = new World(mats, { layout: LAYOUT, seed: 11 });
    this.scene.add(this.world.group);
    // decorative ball clusters around the board edge
    const ballGeo = new THREE.SphereGeometry(0.12, 20, 14);
    const balls = new THREE.InstancedMesh(ballGeo, mats.chrome, this.world.ballSpawns.length);
    const m4 = new THREE.Matrix4();
    this.world.ballSpawns.forEach((s, i) => balls.setMatrixAt(i, m4.makeTranslation(s.x, s.y + 0.12, s.z)));
    balls.castShadow = true;
    this.scene.add(balls);

    // cage
    const { geo } = buildCageGeometry();
    this.cage = new THREE.Group();
    const mesh = new THREE.Mesh(geo, mats.cage);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    this.cage.add(mesh, edgeLines(geo, mats.cageLine, 18));
    this.cage.scale.setScalar(S);
    this.scene.add(this.cage);

    // the marked face: a glowing panel filling one triangular window
    this.markMat = new THREE.MeshBasicMaterial({ color: PALETTE.accent, side: THREE.DoubleSide, transparent: true, opacity: 0.9 });
    this.markMat.toneMapped = false;
    this.mark = new THREE.Mesh(new THREE.BufferGeometry(), this.markMat);
    this.cage.add(this.mark);

    this.buildStartPose();
    this.buildLattice();

    this.targetMat = new THREE.MeshBasicMaterial({ color: PALETTE.accent, transparent: true, opacity: 0.7, side: THREE.DoubleSide, depthWrite: false });
    this.targetMat.toneMapped = false;
    this.target = new THREE.Mesh(new THREE.BufferGeometry(), this.targetMat);
    this.scene.add(this.target);
    this.beamMat = new THREE.MeshBasicMaterial({ color: PALETTE.accent, transparent: true, opacity: 0.45, depthWrite: false, side: THREE.DoubleSide });
    this.beamMat.toneMapped = false;
    this.beam = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.3, 6, 3, 1, true), this.beamMat);
    this.scene.add(this.beam);

    this.hintMat = new THREE.MeshBasicMaterial({ color: 0x8fe8ff, transparent: true, opacity: 0.3, depthWrite: false, side: THREE.DoubleSide });
    this.hintMat.toneMapped = false;
    this.hints = new THREE.Group();
    this.scene.add(this.hints);
    this.blockGroup = new THREE.Group();
    this.scene.add(this.blockGroup);

    this.raycaster = new THREE.Raycaster();
    this.level = 1;
    this.score = 0;
    this.newLevel();
  }

  // Face 0 down, one edge along +x, bottom centroid at origin.
  buildStartPose() {
    const n0 = ICO.normals[0];
    const q1 = new THREE.Quaternion().setFromUnitVectors(n0, new THREE.Vector3(0, -1, 0));
    const [a, b] = ICO.faces[0].map((i) => ICO.verts[i].clone().applyQuaternion(q1));
    const ang = Math.atan2(-(b.z - a.z), b.x - a.x);
    const qy = new THREE.Quaternion().setFromAxisAngle(UP, -ang);
    this.q0 = qy.multiply(q1);
    this.p0 = new THREE.Vector3(0, ICO.inradius * S, 0);
  }

  bottomFace(q) {
    let best = -1, by = Infinity;
    ICO.normals.forEach((n, i) => {
      const y = n.clone().applyQuaternion(q).y;
      if (y < by) { by = y; best = i; }
    });
    return best;
  }
  faceWorld(q, p, f) {
    return ICO.faces[f].map((i) => ICO.verts[i].clone().multiplyScalar(S).applyQuaternion(q).add(p));
  }

  // Lattice made from the start face's footprint.
  buildLattice() {
    const [A, B, C] = this.faceWorld(this.q0, this.p0, this.bottomFace(this.q0)).map((v) => new THREE.Vector2(v.x, v.z));
    const e1 = B.clone().sub(A), e2 = C.clone().sub(A);
    this.tris = new Map();
    const P = (i, j) => A.clone().addScaledVector(e1, i).addScaledVector(e2, j);
    const N = 16;
    for (let i = -N; i <= N; i++) for (let j = -N; j <= N; j++) {
      for (const vs of [[P(i, j), P(i + 1, j), P(i, j + 1)], [P(i + 1, j), P(i + 1, j + 1), P(i, j + 1)]]) {
        const c = vs[0].clone().add(vs[1]).add(vs[2]).divideScalar(3);
        if (c.length() > BOARD_R) continue;
        if (vs.some((v) => v.length() > BOARD_R + 0.6)) continue;
        this.tris.set(key2(c.x, c.y), { c, vs, blocked: false });
      }
    }
    const batch = new EdgeBatch();
    for (const t of this.tris.values()) {
      for (let k = 0; k < 3; k++) {
        const a = t.vs[k], b = t.vs[(k + 1) % 3];
        batch.addSegment(new THREE.Vector3(a.x, 0.012, a.y), new THREE.Vector3(b.x, 0.012, b.y));
      }
    }
    this.scene.add(batch.build(this.mats.lattice));
  }

  triOf(q, p) {
    const f = this.bottomFace(q);
    const v = this.faceWorld(q, p, f);
    const c = v[0].add(v[1]).add(v[2]).divideScalar(3);
    return key2(c.x, c.z);
  }

  // Tip across edge k of the bottom face. Pure: returns new pose.
  tip(q, p, k) {
    const f = this.bottomFace(q);
    const v = this.faceWorld(q, p, f);
    const c = v[0].clone().add(v[1]).add(v[2]).divideScalar(3);
    const a = v[k], b = v[(k + 1) % 3];
    const m = a.clone().add(b).multiplyScalar(0.5);
    m.y = 0;
    const out = new THREE.Vector3(m.x - c.x, 0, m.z - c.z).normalize();
    const axis = new THREE.Vector3().crossVectors(UP, out).normalize();
    return { axis, pivot: m, out, ...this.applyTip(q, p, axis, m, TIP) };
  }
  applyTip(q, p, axis, pivot, ang) {
    const r = new THREE.Quaternion().setFromAxisAngle(axis, ang);
    return {
      q: r.clone().multiply(q).normalize(),
      p: p.clone().sub(pivot).applyQuaternion(r).add(pivot),
    };
  }

  stateKey(q, p) {
    const s = q.w < 0 || (q.w === 0 && q.x < 0) ? -1 : 1;
    return `${this.triOf(q, p)}|${[q.x, q.y, q.z, q.w].map((v) => Math.round(v * s * 100)).join(',')}`;
  }

  // ---------- levels ----------
  newLevel() {
    const R = rng(this.level * 977 + 3);
    this.q = this.q0.clone();
    this.p = this.p0.clone();
    this.history = [];
    this.moves = 0;
    this.anim = null;
    this.won = 0;
    for (const t of this.tris.values()) t.blocked = false;

    // random walk -> target triangle + which face must land there
    const walkLen = Math.min(4 + this.level * 2, 16);
    let q = this.q.clone(), p = this.p.clone();
    const path = new Set([this.triOf(q, p)]);
    for (let s = 0; s < walkLen; s++) {
      const opts = [0, 1, 2].map((k) => this.tip(q, p, k)).filter((t) => this.tris.has(this.triOf(t.q, t.p)));
      const fresh = opts.filter((t) => !path.has(this.triOf(t.q, t.p)));
      const pool = fresh.length ? fresh : opts;
      // drift away from the start so the target sits across the board
      pool.sort((a, b) => b.p.lengthSq() - a.p.lengthSq());
      const pick = R() < 0.6 ? pool[0] : pool[Math.floor(R() * pool.length)];
      q = pick.q; p = pick.p;
      path.add(this.triOf(q, p));
    }
    this.targetKey = this.triOf(q, p);
    this.markFace = this.bottomFace(q);
    if (this.targetKey === this.triOf(this.q, this.p)) return this.level++, this.newLevel();

    // chrome blockers off the path
    const free = [...this.tris.keys()].filter((k) => !path.has(k));
    const nBlock = Math.min(6 + this.level * 2, 22);
    for (let i = 0; i < nBlock && free.length; i++) {
      const k = free.splice(Math.floor(R() * free.length), 1)[0];
      this.tris.get(k).blocked = true;
    }
    this.par = this.solve();
    this.buildLevelVisuals(R);
  }

  solve() {
    const startKey = this.stateKey(this.q, this.p);
    const seen = new Set([startKey]);
    let frontier = [{ q: this.q, p: this.p }];
    for (let d = 0; d < 40; d++) {
      const next = [];
      for (const s of frontier) {
        if (this.triOf(s.q, s.p) === this.targetKey && this.bottomFace(s.q) === this.markFace) return d;
        for (let k = 0; k < 3; k++) {
          const t = this.tip(s.q, s.p, k);
          const tk = this.triOf(t.q, t.p);
          const tri = this.tris.get(tk);
          if (!tri || tri.blocked) continue;
          const sk = this.stateKey(t.q, t.p);
          if (seen.has(sk)) continue;
          seen.add(sk);
          next.push(t);
        }
      }
      frontier = next;
      if (!frontier.length) break;
    }
    return 99;
  }

  buildLevelVisuals(R) {
    // marked face panel (cage local, unit radius)
    const [a, b, c] = ICO.faces[this.markFace].map((i) => ICO.verts[i]);
    const g = new THREE.Vector3().add(a).add(b).add(c).divideScalar(3);
    const pts = [a, b, c].map((v) => new THREE.Vector3().lerpVectors(g, v, 0.61).multiplyScalar(0.92));
    this.mark.geometry.dispose();
    this.mark.geometry = new THREE.BufferGeometry().setFromPoints(pts);

    const t = this.tris.get(this.targetKey);
    const tp = t.vs.map((v) => new THREE.Vector3(v.x, 0.02, v.y).lerp(new THREE.Vector3(t.c.x, 0.02, t.c.y), 0.12));
    this.target.geometry.dispose();
    this.target.geometry = new THREE.BufferGeometry().setFromPoints(tp);
    this.beam.position.set(t.c.x, 3, t.c.y);

    this.blockGroup.clear();
    for (const tri of this.tris.values()) {
      if (!tri.blocked) continue;
      for (let i = 0; i < 3; i++) {
        const v = tri.vs[i];
        const pos = new THREE.Vector2().lerpVectors(tri.c, v, 0.42);
        const h = 0.4 + R() * 1.3;
        const m = new THREE.Mesh(new THREE.BoxGeometry(0.2, h, 0.2), R() < 0.25 ? this.mats.glass : this.mats.chromeBar);
        m.position.set(pos.x, h / 2, pos.y);
        m.rotation.y = R() * Math.PI;
        m.castShadow = true;
        this.blockGroup.add(m);
      }
    }
    this.updateHints();
  }

  updateHints() {
    this.hints.clear();
    this.options = [0, 1, 2].map((k) => {
      const t = this.tip(this.q, this.p, k);
      const key = this.triOf(t.q, t.p);
      const tri = this.tris.get(key);
      const ok = tri && !tri.blocked;
      if (ok) {
        const pts = tri.vs.map((v) => new THREE.Vector3(v.x, 0.015, v.y).lerp(new THREE.Vector3(tri.c.x, 0.015, tri.c.y), 0.15));
        const m = new THREE.Mesh(new THREE.BufferGeometry().setFromPoints(pts), this.hintMat);
        m.userData.k = k;
        this.hints.add(m);
      }
      return { k, ok, out: t.out };
    });
  }

  // ---------- update ----------
  update(dt, input) {
    if (input.pressed('KeyR')) { this.newLevel(); }
    if (input.pressed('KeyN')) { this.level++; this.newLevel(); }
    if ((input.pressed('KeyZ') || input.pressed('Backspace')) && !this.anim && this.history.length) {
      const h = this.history.pop();
      this.q = h.q; this.p = h.p; this.moves++;
      this.updateHints();
    }

    if (this.anim) {
      const a = this.anim;
      a.t = Math.min(1, a.t + dt / a.dur);
      const e = a.bump ? Math.sin(a.t * Math.PI) * 0.18 : 1 - Math.pow(1 - a.t, 3);
      const r = this.applyTip(a.q, a.p, a.axis, a.pivot, a.ang * e);
      this.cage.quaternion.copy(r.q);
      this.cage.position.copy(r.p);
      if (a.t >= 1) {
        this.anim = null;
        if (!a.bump) {
          const fin = this.applyTip(a.q, a.p, a.axis, a.pivot, a.ang);
          this.q = fin.q; this.p = fin.p;
          this.updateHints();
          this.checkWin();
        }
      }
    } else if (this.won > 0) {
      this.won -= dt;
      if (this.won <= 0) { this.level++; this.newLevel(); }
    } else {
      let k = -1;
      const ix = input.axisX(), iz = input.axisY();
      if (input.anyPressed(['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight']) && (ix || iz)) {
        const fwd = new THREE.Vector3(-Math.sin(this.yaw), 0, -Math.cos(this.yaw));
        const right = new THREE.Vector3(Math.cos(this.yaw), 0, -Math.sin(this.yaw));
        const dir = fwd.multiplyScalar(iz).addScaledVector(right, ix).normalize();
        let best = 0.35;
        this.options.forEach((o) => { const d = o.out.dot(dir); if (d > best) { best = d; k = o.k; } });
      }
      const click = input.consumeClick();
      if (click) {
        this.raycaster.setFromCamera(click, this.camera);
        const hit = this.raycaster.intersectObjects(this.hints.children)[0];
        if (hit) k = hit.object.userData.k;
      }
      if (k >= 0) this.move(k);
    }

    // visuals
    if (!this.anim) { this.cage.quaternion.copy(this.q); this.cage.position.copy(this.p); }
    const time = performance.now() / 1000;
    this.targetMat.opacity = 0.75 + 0.25 * Math.sin(time * 4);
    this.markMat.opacity = 0.85 + 0.15 * Math.sin(time * 4);
    this.beam.rotation.y = time * 0.5;

    const target = this.camTarget || (this.camTarget = this.cage.position.clone());
    target.lerp(new THREE.Vector3(this.cage.position.x * 0.6, 0, this.cage.position.z * 0.6), 1 - Math.exp(-dt * 3));
    const lens = viewLens(17, 30); // near-isometric, like Cage mode
    this.camera.position.copy(target).add(new THREE.Vector3(
      Math.sin(this.yaw) * Math.cos(this.pitch), Math.sin(this.pitch), Math.cos(this.yaw) * Math.cos(this.pitch),
    ).multiplyScalar(lens.dist));
    if (this.camera.fov !== lens.fov) { this.camera.fov = lens.fov; this.camera.updateProjectionMatrix(); }
    this.scene.fog.near = 24 + lens.fogShift;
    this.scene.fog.far = 55 + lens.fogShift;
    this.camera.lookAt(target);
    this.focusDistance = this.camera.position.distanceTo(this.cage.position);
  }

  move(k) {
    const o = this.options[k];
    const t = this.tip(this.q, this.p, k);
    this.anim = { q: this.q.clone(), p: this.p.clone(), axis: t.axis, pivot: t.pivot, ang: TIP, t: 0, dur: 0.26, bump: !o.ok };
    if (o.ok) {
      this.history.push({ q: this.q.clone(), p: this.p.clone() });
      this.moves++;
    }
  }

  checkWin() {
    if (this.triOf(this.q, this.p) === this.targetKey && this.bottomFace(this.q) === this.markFace) {
      const pts = 100 + Math.max(0, this.par - this.moves + 3) * 25;
      this.score += pts;
      this.won = 1.4;
      this.pendingEvent = { text: this.moves <= this.par ? `PERFECT · +${pts}` : `LOCKED · +${pts}` };
    } else if (this.triOf(this.q, this.p) === this.targetKey) {
      this.pendingEvent = { text: 'WRONG FACE', warn: true };
    }
  }

  get focus() { return this.cage.position; }

  hud() {
    const ev = this.pendingEvent ? [this.pendingEvent] : [];
    this.pendingEvent = null;
    return {
      mode: 'PUZZLE',
      lines: [
        ['LEVEL', String(this.level)],
        ['MOVES', String(this.moves)],
        ['PAR', String(this.par)],
        ['SCORE', this.score.toLocaleString()],
      ],
      fill: 0,
      events: ev,
    };
  }
}
