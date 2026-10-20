import * as THREE from 'three';
import { World } from './world.js';
import { EdgeBatch } from './geometry.js';

// Several digiplanes ("decks") floating at different heights, joined by ramps.
// Exposes the same interface as World, in world coordinates, so gameplay code is shared.
const RAMP_W = 5;
const CURB = 0.22;

// eased height profile: flat where it meets each deck, steepest in the middle
function rampY(r, t) {
  const e = Math.min(1, Math.max(0, t));
  const k = e * e * (3 - 2 * e);
  return r.ay + (r.by - r.ay) * k;
}

// keep ramp entrances clear: no pyramids, bars, shapes or holes right at a ramp mouth
const BLOCKING = 'pxuGcrvVhk';
function clearRampMouths(level) {
  const decks = level.decks.map((d) => ({ ...d, layout: d.layout.map((row) => row.split('')) }));
  for (const rp of level.ramps || []) {
    const [ax, az] = rp.a, [bx, bz] = rp.b;
    const L = Math.hypot(bx - ax, bz - az), ux = (bx - ax) / L, uz = (bz - az) / L;
    for (const [ex, ez, dir] of [[ax, az, -1], [bx, bz, 1]]) {
      for (const d of decks) {
        const rows = d.layout.length, cols = d.layout[0].length;
        // sample the mouth area: the ramp width across, 2 tiles into the deck
        for (let along = 0.3; along < 4.2; along += 0.5) {
          for (let u = -RAMP_W / 2 - 0.5; u <= RAMP_W / 2 + 0.5; u += 0.5) {
            const x = ex + ux * dir * along + -uz * u, z = ez + uz * dir * along + ux * u;
            const i = Math.floor((x - d.x) / 2 + cols / 2), j = Math.floor((z - d.z) / 2 + rows / 2);
            if (i < 0 || j < 0 || i >= cols || j >= rows) continue;
            if (BLOCKING.includes(d.layout[j][i])) d.layout[j][i] = '.';
          }
        }
      }
    }
  }
  return decks.map((d) => ({ ...d, layout: d.layout.map((row) => row.join('')) }));
}

export class MultiWorld {
  constructor(mats, level) {
    this.mats = mats;
    this.group = new THREE.Group();
    this.obstacles = [];
    this.portals = [];
    this.ballSpawns = [];
    this.bigBalls = [];
    this.tiles = [];
    this.start = new THREE.Vector3();
    this.motherCage = new THREE.Vector3();
    this.proxy = new Map(); // deck tile -> world-space tile

    this.decks = clearRampMouths(level).map((d, i) => {
      const w = new World(mats, { layout: d.layout, seed: level.seed + i * 13, lines: mats.theme.lines });
      w.group.position.set(d.x, d.y, d.z);
      this.group.add(w.group);
      const off = new THREE.Vector3(d.x, d.y, d.z);
      for (const o of w.obstacles) {
        o.min.x += d.x; o.max.x += d.x; o.min.y += d.z; o.max.y += d.z; o.top += d.y;
        if (o.center) o.center.add(off);
        this.obstacles.push(o);
      }
      this.portals.push(...w.portals);
      for (const s of w.ballSpawns) { s.x += d.x; s.y += d.y; s.z += d.z; this.ballSpawns.push(s); }
      for (const b of w.bigBalls) this.bigBalls.push(b.add(off));
      const has = (ch) => d.layout.some((row) => row.includes(ch));
      if (has('S')) this.start.copy(w.start).add(off);
      if (has('C')) this.motherCage.copy(w.motherCage).add(off);
      for (const t of w.tiles) {
        const p = { type: t.type, cx: t.cx + d.x, cz: t.cz + d.z, deck: i };
        this.tiles.push(p);
        this.proxy.set(t, p);
      }
      return { w, x: d.x, y: d.y, z: d.z, hx: w.halfX, hz: w.halfZ, i };
    });

    this.ramps = (level.ramps || []).map((r) => this.buildRamp(r));
    this.minY = Math.min(...this.decks.map((d) => d.y));
    this.halfX = Math.max(...this.decks.map((d) => Math.abs(d.x) + d.hx));
    this.halfZ = Math.max(...this.decks.map((d) => Math.abs(d.z) + d.hz));
  }

  get worldTiles() { return this.tiles; }

  // Marble-Madness style slope: a wide ribbon whose height eases in and out at both ends,
  // gridded like the decks so it reads as part of the same digital terrain.
  buildRamp({ a, b, w = RAMP_W }) {
    const [ax, az, ay] = a, [bx, bz, by] = b;
    const dx = bx - ax, dz = bz - az, L = Math.hypot(dx, dz);
    const r = { ax, az, ay, bx, bz, by, w, L, ux: dx / L, uz: dz / L };
    r.da = this.deckIndexAt(ax - r.ux * 0.5, az - r.uz * 0.5, false);
    r.db = this.deckIndexAt(bx + r.ux * 0.5, bz + r.uz * 0.5, false);

    const nx = -r.uz, nz = r.ux; // across the ramp
    const segs = Math.max(12, Math.round(L * 3)), across = 6, th = 0.6;
    const at = (t, u) => new THREE.Vector3(ax + dx * t + nx * u * w / 2, rampY(r, t), az + dz * t + nz * u * w / 2);
    const pos = [];
    const quad = (p0, p1, p2, p3) => pos.push(...p0.toArray(), ...p1.toArray(), ...p2.toArray(), ...p0.toArray(), ...p2.toArray(), ...p3.toArray());
    const down = new THREE.Vector3(0, -th, 0);
    for (let i = 0; i < segs; i++) {
      const t0 = i / segs, t1 = (i + 1) / segs;
      for (let j = 0; j < across; j++) {
        const u0 = -1 + (2 * j) / across, u1 = -1 + (2 * (j + 1)) / across;
        quad(at(t0, u0), at(t0, u1), at(t1, u1), at(t1, u0));
      }
      // side skirts
      quad(at(t0, -1), at(t1, -1), at(t1, -1).add(down), at(t0, -1).add(down));
      quad(at(t1, 1), at(t0, 1), at(t0, 1).add(down), at(t1, 1).add(down));
      // low curbs along both edges keep you on the slope (hop to cross them)
      const c = new THREE.Vector3(0, CURB, 0);
      for (const u of [-1, 1]) {
        const ui = u * (1 - 0.06);
        quad(at(t0, u).add(c), at(t1, u).add(c), at(t1, ui).add(c), at(t0, ui).add(c));
        quad(at(t0, ui), at(t1, ui), at(t1, ui).add(c), at(t0, ui).add(c));
        quad(at(t1, u), at(t0, u), at(t0, u).add(c), at(t1, u).add(c));
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    // graded-grey planes colour per vertex: give the ramp a mid tone so it isn't black
    const g = this.mats.theme.plateGradient, tone = g ? (g[0] + g[1]) / 2 : 1;
    geo.setAttribute('color', new THREE.Float32BufferAttribute(new Float32Array(pos.length).fill(tone), 3));
    geo.computeVertexNormals();
    const mesh = new THREE.Mesh(geo, this.mats.plate);
    mesh.material = this.mats.plate.clone();
    mesh.material.side = THREE.DoubleSide;
    mesh.receiveShadow = true;
    mesh.castShadow = true;
    this.group.add(mesh);

    if (this.mats.theme.lines) {
      // edge rails + a tile grid every 2 units along and across, like the deck tiles
      const lines = new EdgeBatch(), faint = new EdgeBatch();
      const lift = (p) => p.setY(p.y + 0.01);
      const steps = Math.max(24, segs * 2);
      for (const u of [-1, 1]) {
        for (let i = 0; i < steps; i++) lines.addSegment(lift(at(i / steps, u)), lift(at((i + 1) / steps, u)));
      }
      for (let d = 2; d < L; d += 2) {
        const t = d / L;
        lines.addSegment(lift(at(t, -1)), lift(at(t, 1)));
      }
      for (let k = 1; k < across; k++) {
        const u = -1 + (2 * k) / across;
        for (let i = 0; i < steps; i++) faint.addSegment(lift(at(i / steps, u)), lift(at((i + 1) / steps, u)));
      }
      this.group.add(lines.build(this.mats.line));
      this.group.add(faint.build(this.mats.lineFaint));
    }

    // chevrons pointing uphill, laid on the surface
    const up = by >= ay ? 1 : -1;
    const shape = new THREE.Shape([
      new THREE.Vector2(-0.3, 0.55), new THREE.Vector2(0.35, 0), new THREE.Vector2(-0.3, -0.55), new THREE.Vector2(-0.12, 0),
    ]);
    const cg = new THREE.ShapeGeometry(shape);
    cg.rotateX(-Math.PI / 2);
    const cm = new THREE.MeshBasicMaterial({ color: this.mats.theme.accent, transparent: true, opacity: 0.5, depthWrite: false });
    cm.toneMapped = false;
    for (let k = 1; k < 5; k++) {
      const t = k / 5;
      const p = at(t, 0);
      const slope = (rampY(r, t + 0.01) - rampY(r, t - 0.01)) / (0.02 * L);
      const c = new THREE.Mesh(cg, cm);
      c.position.set(p.x, p.y + 0.03, p.z);
      c.rotation.set(0, Math.atan2(-dz * up, dx * up), 0);
      c.rotateOnAxis(new THREE.Vector3(0, 0, 1), Math.atan(slope) * up);
      this.group.add(c);
    }
    return r;
  }

  // curbs: if a body on a ramp drifts into an edge, push it back and kill the outward speed
  keepOnRamp(pos, vel, rad, bottom) {
    for (const r of this.ramps) {
      const dx = pos.x - r.ax, dz = pos.z - r.az;
      const t = (dx * r.ux + dz * r.uz) / r.L;
      if (t < 0.02 || t > 0.98) continue;
      const lat = dx * -r.uz + dz * r.ux; // + toward the ramp's left normal
      const half = r.w / 2;
      if (Math.abs(lat) > half + rad) continue;
      if (bottom > rampY(r, t) + CURB) continue; // hopping over the curb
      const lim = half - rad * 0.9;
      if (Math.abs(lat) <= lim) continue;
      const s = Math.sign(lat), push = Math.abs(lat) - lim;
      pos.x -= -r.uz * s * push; pos.z -= r.ux * s * push;
      const vn = (vel.x * -r.uz + vel.z * r.ux) * s;
      if (vn > 0) { vel.x -= -r.uz * s * vn * 1.3; vel.z -= r.ux * s * vn * 1.3; }
      return true;
    }
    return false;
  }

  rampAt(x, z) {
    for (const r of this.ramps) {
      const dx = x - r.ax, dz = z - r.az;
      const t = (dx * r.ux + dz * r.uz) / r.L;
      if (t < 0 || t > 1) continue;
      if (Math.abs(dx * r.uz - dz * r.ux) > r.w / 2) continue;
      return { r, t };
    }
    return null;
  }

  // deck index, or -1 - rampIndex when on a ramp, or null in the void
  deckIndexAt(x, z, ramps = true) {
    for (const d of this.decks) if (Math.abs(x - d.x) < d.hx && Math.abs(z - d.z) < d.hz) return d.i;
    if (ramps) {
      const hit = this.rampAt(x, z);
      if (hit) return -1 - this.ramps.indexOf(hit.r);
    }
    return null;
  }

  heightAt(x, z) {
    for (const d of this.decks) {
      if (Math.abs(x - d.x) < d.hx && Math.abs(z - d.z) < d.hz) return d.w.heightAt(x - d.x, z - d.z) + d.y;
    }
    const hit = this.rampAt(x, z);
    if (hit) return rampY(hit.r, hit.t);
    return -100;
  }

  // base height of whatever is underfoot (deck level or ramp surface)
  deckY(x, z) {
    for (const d of this.decks) if (Math.abs(x - d.x) < d.hx && Math.abs(z - d.z) < d.hz) return d.y;
    const hit = this.rampAt(x, z);
    return hit ? rampY(hit.r, hit.t) : this.minY;
  }

  tileAt(x, z) {
    for (const d of this.decks) {
      if (Math.abs(x - d.x) < d.hx && Math.abs(z - d.z) < d.hz) return this.proxy.get(d.w.tileAt(x - d.x, z - d.z)) || null;
    }
    return null;
  }

  update(dt) { for (const d of this.decks) d.w.update(dt); }

  // deck-to-deck distance over the ramp graph
  hops(from, to) {
    const dist = new Map([[from, 0]]);
    const q = [from];
    while (q.length) {
      const n = q.shift();
      for (const r of this.ramps) {
        const m = r.da === n ? r.db : r.db === n ? r.da : null;
        if (m === null || dist.has(m)) continue;
        dist.set(m, dist.get(n) + 1);
        q.push(m);
      }
    }
    return dist.get(to) ?? Infinity;
  }

  // the point a chaser should head for to reach `to` from `from`; null when on the same deck
  navTarget(from, to) {
    const deckOf = (p) => {
      const k = this.deckIndexAt(p.x, p.z);
      if (k === null || k >= 0) return k;
      const r = this.ramps[-1 - k];
      const t = ((p.x - r.ax) * r.ux + (p.z - r.az) * r.uz) / r.L;
      return t < 0.5 ? r.da : r.db;
    };
    const goal = deckOf(to);
    if (goal === null) return null;
    const here = this.deckIndexAt(from.x, from.z);
    if (here === null) return null;
    const endPoint = (r, atA, past) => {
      const s = atA ? -past : r.L + past;
      return new THREE.Vector3(r.ax + r.ux * s, 0, r.az + r.uz * s);
    };
    if (here < 0) {
      // on a ramp: head off the end that leads toward the goal
      const r = this.ramps[-1 - here];
      const toA = this.hops(r.da, goal) <= this.hops(r.db, goal);
      if ((toA ? r.da : r.db) === goal && deckOf(from) === goal) return null;
      return endPoint(r, toA, 1.5);
    }
    if (here === goal) return null;
    let best = null, bh = Infinity;
    for (const r of this.ramps) {
      if (r.da !== here && r.db !== here) continue;
      const other = r.da === here ? r.db : r.da;
      const h = this.hops(other, goal);
      if (h < bh) { bh = h; best = r; }
    }
    if (!best) return null;
    const atA = best.da === here;
    const entry = endPoint(best, atA, -0.3); // just onto the ramp
    const approach = endPoint(best, atA, 1.2); // lined up on the deck
    // line up first, then drive up the ramp
    return Math.hypot(from.x - approach.x, from.z - approach.z) < 1.0 ? endPoint(best, !atA, 1.5) : (Math.hypot(from.x - entry.x, from.z - entry.z) < 2.5 ? endPoint(best, !atA, 1.5) : approach);
  }
}
