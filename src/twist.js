import * as THREE from 'three';

// Spectrum set pieces: tall columns built from coloured square tiles whose layers twist
// like a puzzle tower, plus floor light strips that pulse in sequence.

const cubieGeo = new THREE.BoxGeometry(1, 1, 1);
const panelGeo = new THREE.PlaneGeometry(1, 1);
const FACES = [
  { n: [1, 0, 0], rot: [0, Math.PI / 2, 0] },
  { n: [-1, 0, 0], rot: [0, -Math.PI / 2, 0] },
  { n: [0, 1, 0], rot: [-Math.PI / 2, 0, 0] },
  { n: [0, 0, 1], rot: [0, 0, 0] },
  { n: [0, 0, -1], rot: [0, Math.PI, 0] },
];

export function spectrumMaterials(colors) {
  const glow = colors.map((c) => {
    const m = new THREE.MeshBasicMaterial({ color: new THREE.Color(c).multiplyScalar(1.5) });
    m.toneMapped = false;
    return m;
  });
  const dark = new THREE.MeshStandardMaterial({ color: 0x15151b, roughness: 0.2, metalness: 0.35 });
  const body = new THREE.MeshStandardMaterial({ color: 0x07070a, roughness: 0.22, metalness: 0.55 });
  return { glow, dark, body };
}

// 2 x N x 2 column of tiles. Horizontal layers turn 90°, vertical halves flip 180°.
export class TileColumn {
  constructor({ cell = 0.55, rng = Math.random, mats }) {
    this.group = new THREE.Group();
    this.rng = rng;
    this.s = cell;
    this.dims = { x: 2, y: 3 + Math.floor(rng() * 3), z: 2 };
    this.cubies = [];
    const { x: nx, y: ny, z: nz } = this.dims;
    for (let i = 0; i < nx; i++) for (let j = 0; j < ny; j++) for (let k = 0; k < nz; k++) {
      const c = new THREE.Group();
      c.position.set((i - (nx - 1) / 2) * cell, (j + 0.5) * cell, (k - (nz - 1) / 2) * cell);
      const body = new THREE.Mesh(cubieGeo, mats.body);
      body.scale.setScalar(cell * 0.97);
      body.castShadow = true;
      c.add(body);
      const idx = [i, j, k], max = [nx - 1, ny - 1, nz - 1];
      for (const f of FACES) {
        // only outward faces get a tile; the bottom never shows
        const outward = f.n.every((v, a) => v === 0 || (v > 0 ? idx[a] === max[a] : idx[a] === 0));
        if (!outward) continue;
        const lit = rng() < 0.7;
        const m = new THREE.Mesh(panelGeo, lit ? mats.glow[Math.floor(rng() * mats.glow.length)] : mats.dark);
        m.scale.setScalar(cell * 0.84);
        m.rotation.set(...f.rot);
        m.position.set(...f.n).multiplyScalar(cell * 0.5 + 0.004);
        c.add(m);
      }
      this.cubies.push(c);
      this.group.add(c);
    }
    this.height = ny * cell;
    this.timer = 0.6 + rng() * 2.5;
    this.twist = null;
  }

  // grid index of a cubie along an axis
  index(c, axis) {
    const n = this.dims[axis];
    const v = axis === 'y' ? c.position.y / this.s - 0.5 : c.position[axis] / this.s + (n - 1) / 2;
    return Math.round(v);
  }

  update(dt) {
    if (this.twist) {
      const t = this.twist;
      t.t = Math.min(1, t.t + dt / t.dur);
      const e = t.t < 0.5 ? 4 * t.t ** 3 : 1 - Math.pow(-2 * t.t + 2, 3) / 2;
      t.pivot.rotation[t.axis] = t.angle * e;
      if (t.t >= 1) {
        // bake the turn back into the column and snap to the grid
        t.pivot.updateMatrixWorld();
        for (const c of t.members) {
          this.group.attach(c);
          const { x: nx, z: nz } = this.dims;
          c.position.x = (Math.round(c.position.x / this.s + (nx - 1) / 2) - (nx - 1) / 2) * this.s;
          c.position.z = (Math.round(c.position.z / this.s + (nz - 1) / 2) - (nz - 1) / 2) * this.s;
          c.position.y = (Math.round(c.position.y / this.s - 0.5) + 0.5) * this.s;
        }
        this.group.remove(t.pivot);
        this.twist = null;
      }
      return;
    }
    this.timer -= dt;
    if (this.timer > 0) return;
    this.timer = 1.4 + this.rng() * 2.6;
    const axis = this.rng() < 0.65 ? 'y' : this.rng() < 0.5 ? 'x' : 'z';
    const layer = Math.floor(this.rng() * this.dims[axis]);
    const pivot = new THREE.Group();
    if (axis !== 'y') pivot.position.y = this.height / 2; // flip halves about the column's middle
    this.group.add(pivot);
    const members = this.cubies.filter((c) => this.index(c, axis) === layer);
    members.forEach((c) => pivot.attach(c));
    const dir = this.rng() < 0.5 ? 1 : -1;
    const angle = axis === 'y' ? (dir * Math.PI) / 2 : Math.PI;
    this.twist = { pivot, members, axis, angle, t: 0, dur: axis === 'y' ? 0.45 : 0.7 };
  }
}

// Floor light strips: a few patterns whose pieces pulse in a travelling sequence.
export class LightStrips {
  constructor({ cx, cz, y, rng = Math.random, colors }) {
    this.group = new THREE.Group();
    this.pieces = [];
    this.t = rng() * 10;
    this.speed = 0.8 + rng() * 0.8;
    const base = new THREE.Color(colors[Math.floor(rng() * colors.length)]);
    const add = (w, d, x, z) => {
      const m = new THREE.MeshBasicMaterial({ color: base.clone() });
      m.toneMapped = false;
      const p = new THREE.Mesh(panelGeo, m);
      p.rotation.x = -Math.PI / 2;
      p.scale.set(w, d, 1);
      p.position.set(cx + x, y + 0.004, cz + z);
      this.group.add(p);
      this.pieces.push(p);
    };
    const kind = Math.floor(rng() * 3);
    if (kind === 0) {
      // parallel bars
      for (let k = 0; k < 5; k++) add(1.5, 0.09, 0, -0.6 + k * 0.3);
    } else if (kind === 1) {
      // nested square frames
      for (const s of [1.5, 1.0, 0.5]) {
        add(s, 0.06, 0, -s / 2); add(s, 0.06, 0, s / 2);
        add(0.06, s, -s / 2, 0); add(0.06, s, s / 2, 0);
      }
    } else {
      // equaliser columns
      for (let a = 0; a < 5; a++) for (let b = 0; b < 5; b++) add(0.2, 0.2, -0.6 + a * 0.3, -0.6 + b * 0.3);
    }
    this.base = base;
  }

  update(dt) {
    this.t += dt * this.speed;
    const n = this.pieces.length;
    this.pieces.forEach((p, i) => {
      const phase = this.t * 2 - (i / n) * Math.PI * 2;
      const k = 0.18 + 0.82 * Math.max(0, Math.sin(phase)) ** 3;
      p.material.color.copy(this.base).multiplyScalar(k * 1.5);
    });
  }
}
