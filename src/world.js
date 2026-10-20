import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { EdgeBatch } from './geometry.js';
import { TileColumn, LightStrips, spectrumMaterials } from './twist.js';
import { BigShape, CageCluster, shapeMaterials } from './shapes.js';

export const T = 2; // tile size
export const LEVEL_H = 0.8; // height of one terrace step (about one slab thick)

// Hand laid plane loosely following the ref composition.
// . flat  p stepped pyramid  r recessed steps  v void  b ball pad  x chrome bars
// o bare floor  k key grid  P light portal  B big chrome ball  C mother cage  S start
// q block grid (random raised cubes in a frame)  n long bevelled bars
export const CAGE_LAYOUT = [
  'pP.p.x.p..pP.p',
  'p.b.xp.r.x.p.p',
  '.b.x.BB.p.xx.p',
  'p.x.p...pr.x.p',
  'r.p.p.....p.x.',
  'p.v.r..CC..p.p',
  '..p.p..CC.r.x.',
  'p.r...p...p.x.',
  'x.p.S..k.b..p.',
  'p.v.p.k..b.p.v',
  '.p.b.p...r.x.p',
  'P.p.x.p.v.p.p.',
  'p.b.p.r.p.b.xp',
  'pp.p.x.p.p.pP.',
];

function rng(seed) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Square frustum (bevelled slab) with flat normals.
function frustum(wb, wt, h, y0, cx, cz) {
  const g = new THREE.CylinderGeometry(wt / Math.SQRT2, wb / Math.SQRT2, h, 4, 1).toNonIndexed();
  g.rotateY(Math.PI / 4);
  g.translate(cx, y0 + h / 2, cz);
  g.computeVertexNormals();
  return g;
}
function box(w, h, d, cx, y0, cz) {
  const g = new THREE.BoxGeometry(w, h, d);
  g.translate(cx, y0 + h / 2, cz);
  return g;
}

export class World {
  constructor(mats, { lines = true, layout = CAGE_LAYOUT, seed = 7, heights = null } = {}) {
    this.heights = heights;
    this.mats = mats;
    this.layout = layout;
    this.seed = seed;
    this.group = new THREE.Group();
    this.rows = layout.length;
    this.cols = layout[0].length;
    this.tiles = [];
    this.obstacles = []; // {min,max (Vector2 xz), top, group, smash tier, kind}
    this.ballSpawns = []; // {x,y,z,pad}
    this.bigBalls = [];
    this.portals = [];
    this.start = new THREE.Vector3();
    this.motherCage = new THREE.Vector3();
    this.animated = [];
    this.palette = mats.theme.palette || [0xff2bd6, 0x22e6ff, 0x9dff3a, 0xffb020, 0x8a5bff, 0xffffff];
    this.build(lines);
  }

  tileCenter(i, j) {
    return [(i - (this.cols - 1) / 2) * T, (j - (this.rows - 1) / 2) * T];
  }
  get halfX() { return (this.cols * T) / 2; }
  get halfZ() { return (this.rows * T) / 2; }

  build(withLines) {
    const R = rng(this.seed);
    const geos = { floor: [], plate: [], deep: [], voidMat: [] };
    const lines = new EdgeBatch();
    const faint = new EdgeBatch();
    const addSolid = (key, g, edges = lines) => { geos[key].push(g); if (edges) edges.add(g, null, 20); };
    const square = (cx, cz, hw, y, batch = lines) => {
      const p = [[-hw, -hw], [hw, -hw], [hw, hw], [-hw, hw]].map(([a, b]) => new THREE.Vector3(cx + a, y, cz + b));
      for (let k = 0; k < 4; k++) batch.addSegment(p[k], p[(k + 1) % 4]);
    };

    const lvl = (i, j) => (this.heights && this.heights[j] && this.heights[j][i] !== undefined ? Number(this.heights[j][i]) || 0 : 0);
    this.gateRows = [];
    for (let j = 0; j < this.rows; j++) if (this.layout[j].includes('=')) this.gateRows.push(j);
    // zone = how many gate rows lie between this row and the start (bottom) of the course
    this.zoneOfRow = (j) => this.gateRows.filter((g) => g > j).length;

    for (let j = 0; j < this.rows; j++) {
      for (let i = 0; i < this.cols; i++) {
        const e = lvl(i, j) * LEVEL_H;
        const mark = {
          geos: Object.fromEntries(Object.keys(geos).map((k) => [k, geos[k].length])),
          lines: lines.arr.length, faint: faint.arr.length, kids: this.group.children.length,
          obst: this.obstacles.length, spawns: this.ballSpawns.length, bigs: this.bigBalls.length,
        };
        this.buildTile(i, j, e, lvl, geos, lines, faint, addSolid, square, R);
        // lift everything this tile created onto its terrace
        if (e) {
          for (const k of Object.keys(geos)) for (let n = mark.geos[k]; n < geos[k].length; n++) geos[k][n].translate(0, e, 0);
          for (const [b, from] of [[lines, mark.lines], [faint, mark.faint]]) for (let n = from + 1; n < b.arr.length; n += 3) b.arr[n] += e;
          for (let n = mark.kids; n < this.group.children.length; n++) this.group.children[n].position.y += e;
          for (let n = mark.obst; n < this.obstacles.length; n++) { const o = this.obstacles[n]; o.top += e; if (o.center) o.center.y += e; }
          for (let n = mark.spawns; n < this.ballSpawns.length; n++) this.ballSpawns[n].y += e;
          for (let n = mark.bigs; n < this.bigBalls.length; n++) this.bigBalls[n].y += e;
        }
      }
    }
    this.start.y = this.startE || 0;
    this.motherCage.y = this.lairE || 0;
    this.addBorderRails(lvl);
    this.finish(geos, lines, faint, withLines);
  }

  buildTile(i, j, e, lvl, geos, lines, faint, addSolid, square, R) {
    {
      {
        const ch = this.layout[j][i];
        const [cx, cz] = this.tileCenter(i, j);
        const tile = { type: ch, cx, cz, plate: 0, plateHW: 0, e, zone: this.zoneOfRow(j) };
        this.tiles.push(tile);
        const hw = T / 2;
        // terrace walls: extend the slab down so raised tiles read as solid steps
        if (e > 0) {
          if (ch !== 'v' && ch !== 'V') geos.floor.push(box(T, e, T, cx, -1 - e, cz)); // holes keep their open shaft
          // cliff edges toward lower neighbours, drawn like the rest of the line work
          const sides = [[i, j - 1, [-hw, -hw], [hw, -hw]], [i, j + 1, [-hw, hw], [hw, hw]], [i - 1, j, [-hw, -hw], [-hw, hw]], [i + 1, j, [hw, -hw], [hw, hw]]];
          for (const [ni, nj, a, b] of sides) {
            const inside = ni >= 0 && nj >= 0 && ni < this.cols && nj < this.rows;
            const ne = inside ? lvl(ni, nj) * LEVEL_H : 0;
            if (ne >= e) continue;
            const yb = ne - e; // relative: this tile gets lifted by e afterwards
            lines.addSegment(new THREE.Vector3(cx + a[0], yb, cz + a[1]), new THREE.Vector3(cx + b[0], yb, cz + b[1]));
            lines.addSegment(new THREE.Vector3(cx + a[0], yb, cz + a[1]), new THREE.Vector3(cx + a[0], 0, cz + a[1]));
            lines.addSegment(new THREE.Vector3(cx + b[0], yb, cz + b[1]), new THREE.Vector3(cx + b[0], 0, cz + b[1]));
          }
        }

        if (ch === 'r') {
          // recessed stepped pit
          const n = 5, d = 0.14, h = 0.09;
          Object.assign(tile, { n, d, h });
          for (let k = 0; k < n; k++) {
            const o = hw - k * d, inn = hw - (k + 1) * d, top = -k * h;
            const ringH = 1 + top;
            addSolid('floor', box(2 * o, ringH, d, cx, -1, cz - o + d / 2), null);
            addSolid('floor', box(2 * o, ringH, d, cx, -1, cz + o - d / 2), null);
            addSolid('floor', box(d, ringH, 2 * inn, cx - o + d / 2, -1, cz), null);
            addSolid('floor', box(d, ringH, 2 * inn, cx + o - d / 2, -1, cz), null);
            square(cx, cz, o, top);
            square(cx, cz, inn, top, faint);
          }
          const inn = hw - n * d;
          addSolid('deep', box(2 * inn, 1 - n * h, 2 * inn, cx, -1, cz), null);
          square(cx, cz, inn, -n * h, faint);
          return;
        }
        if (ch === 'v' || ch === 'V') {
          // fall pit drawn as a stepped funnel going down to a dark opening.
          // The last ring runs all the way down, so its inner face is the shaft wall:
          // no coincident faces, no flicker.
          const n = 2, d = 0.1, h = 0.2, depth = 6; // two shallow steps around a wide opening
          Object.assign(tile, { type: 'v', n, d, h });
          for (let k = 0; k < n; k++) {
            const o = hw - k * d, inn = hw - (k + 1) * d, top = -k * h;
            const bottom = k === n - 1 ? -depth : -1;
            const ringH = top - bottom;
            addSolid('floor', box(2 * o, ringH, d, cx, bottom, cz - o + d / 2), null);
            addSolid('floor', box(2 * o, ringH, d, cx, bottom, cz + o - d / 2), null);
            addSolid('floor', box(d, ringH, 2 * inn, cx - o + d / 2, bottom, cz), null);
            addSolid('floor', box(d, ringH, 2 * inn, cx + o - d / 2, bottom, cz), null);
            square(cx, cz, o, top);
            square(cx, cz, inn, top, k === n - 1 ? lines : faint);
          }
          // depth rings inside the shaft, nudged off the wall so they never z-fight
          const hole = hw - n * d - 0.01;
          for (let k = 1; k <= 5; k++) square(cx, cz, hole, -n * h - k * 0.5, faint);
          addSolid('voidMat', box(2 * hole, 0.02, 2 * hole, cx, -depth, cz), null);
          this.addPitGlow(cx, cz, hole - 0.02, -n * h, -n * h - 1.3); // glowing floor just below the steps, visible from above
          return;
        }

        // base slab
        geos.floor.push(box(T, 1, T, cx, -1, cz));
        square(cx, cz, hw, 0);

        if (ch === 'p') {
          const n = 6 + Math.floor(R() * 3), d = 0.11, h = 0.075;
          const hb = hw - 0.08;
          Object.assign(tile, { n, d, h, hb });
          for (let k = 0; k < n; k++) {
            const w = 2 * (hb - k * d);
            addSolid('plate', frustum(w, w - 0.02, h, k * h, cx, cz));
          }
          return;
        }
        if (ch === 'L') {
          // stairs: 5 small steps rising toward the neighbour one level up
          const dirs = [[0, -1], [0, 1], [-1, 0], [1, 0]];
          let dir = dirs.find(([di, dj]) => lvl(i + di, j + dj) * LEVEL_H > e + 0.01) || [0, -1];
          const n = 5;
          Object.assign(tile, { dir, n });
          for (let k = 0; k < n; k++) {
            const hgt = ((k + 1) * LEVEL_H) / n;
            const f0 = -hw + (k * T) / n; // along the climb direction
            const len = T / n;
            const ox = dir[0] ? dir[0] * (f0 + len / 2) : 0, oz = dir[1] ? dir[1] * (f0 + len / 2) : 0;
            const g = box(dir[0] ? len : T, hgt, dir[0] ? T : len, cx + ox, 0, cz + oz);
            addSolid('plate', g);
          }
          return;
        }
        if (ch === 'h') {
          // parallel ribs (clay ref): bumpy to roll across
          const n = 7, bw = 0.17, bh = 0.1;
          Object.assign(tile, { n, bw, bh });
          for (let k = 0; k < n; k++) {
            addSolid('plate', box(T - 0.12, bh, bw, cx, 0, cz - hw + (k + 0.5) * (T / n)));
          }
          return;
        }
        if (ch === 'q') {
          // block grid (clay ref): a low frame holding a 5x5 grid, some cells raised as small cubes
          const kn = 5, phw = 0.84, ks = (2 * phw) / kn, base = 0.04, kh = 0.12;
          const mask = [];
          addSolid('plate', frustum(2 * phw + 0.08, 2 * phw, base, 0, cx, cz));
          for (let a = 0; a < kn; a++) for (let b = 0; b < kn; b++) {
            const up = R() < 0.42;
            mask.push(up);
            const x = cx - phw + ks * (a + 0.5), z = cz - phw + ks * (b + 0.5);
            if (up) addSolid('plate', box(ks * 0.78, kh, ks * 0.78, x, base, z), faint);
            else square(x, z, ks * 0.39, base + 0.002, faint);
          }
          Object.assign(tile, { plate: base, plateHW: phw, kn, ks, kh, mask });
          return;
        }
        if (ch === 'n') {
          // long bevelled bars (clay ref): four chunky ribs with sloped sides and ends
          const n = 4, pitch = T / n, bw = pitch * 0.74, bh = 0.16;
          const alongX = R() < 0.5;
          Object.assign(tile, { n, bw, bh, alongX });
          for (let k = 0; k < n; k++) {
            const off = -T / 2 + (k + 0.5) * pitch;
            const g = frustum(bw, bw * 0.62, bh, 0, 0, 0);
            const len = (T - 0.14) / bw;
            if (alongX) g.scale(len, 1, 1); else g.scale(1, 1, len);
            g.translate(alongX ? cx : cx + off, 0, alongX ? cz + off : cz);
            addSolid('plate', g);
          }
          return;
        }
        if (ch === 'f') {
          // two-tier frame plate
          addSolid('plate', frustum(1.84, 1.72, 0.12, 0, cx, cz));
          addSolid('plate', frustum(1.24, 1.16, 0.05, 0.12, cx, cz));
          return;
        }

        // chocolate-bar planes: every flat tile is a bevelled chocolate piece, grooves between them
        if (this.mats.theme.chocolate && (ch === '.' || ch === 'o')) {
          addSolid('plate', frustum(1.86, 1.5, 0.12, 0, cx, cz)); // wide bevelled shoulder
          addSolid('plate', frustum(1.5, 1.42, 0.04, 0.12, cx, cz)); // flat top with a soft edge
          Object.assign(tile, { plate: 0.16, plateHW: 0.84 });
          return;
        }

        // plate for other tiles
        let plate = 0, phw = 0;
        if (ch === '.' && R() < 0.55 && !this.mats.theme.stripes) { plate = 0.05 + R() * 0.12; phw = 0.55 + R() * 0.35; }
        if ('bxkPugGc'.includes(ch)) { plate = 0.08; phw = 0.86; }
        if (ch === '=') { plate = 0.04; phw = 0.9; }
        if (ch === 'S') { plate = 0.04; phw = 0.7; }
        if (plate) {
          addSolid('plate', frustum(2 * phw + 0.06, 2 * phw, plate, 0, cx, cz));
          Object.assign(tile, { plate, plateHW: phw });
        }

        if (ch === 'k') {
          const kn = 6, ks = (2 * phw) / kn, kh = 0.11;
          Object.assign(tile, { kn, ks, kh });
          for (let a = 0; a < kn; a++) for (let b = 0; b < kn; b++) {
            const x = cx - phw + ks * (a + 0.5), z = cz - phw + ks * (b + 0.5);
            const g = frustum(ks * 0.82, ks * 0.7, kh, plate, x, z);
            geos.plate.push(g);
            faint.add(g, null, 20);
          }
        }
        if (ch === 'b') {
          for (let a = 0; a < 4; a++) for (let b = 0; b < 4; b++) {
            this.ballSpawns.push({ x: cx - 0.5 + a / 3, z: cz - 0.5 + b / 3, y: plate, pad: tile });
          }
        }
        if (ch === 'x') this.addBars(cx, cz, plate, R);
        if (ch === 'P') this.addPortal(cx, cz, plate);
        if (ch === 'u') this.addTower(cx, cz, plate, R);
        if (ch === 'g') this.addLights(cx, cz, plate, R);
        if (ch === 'G') this.addShape(cx, cz, plate, R);
        if (ch === 'c') this.addCluster(cx, cz, plate, R);
        if (ch === 'B') this.bigBalls.push(new THREE.Vector3(cx, 0, cz));
        if (ch === 'S') this.start.set(cx, 0, cz);
        if (ch === 'C') { this.motherCage.add(new THREE.Vector3(cx / 4, 0, cz / 4)); this.lairE = e; }
        if (ch === 'S') this.startE = e;
        if (ch === '=') this.addGate(cx, cz, tile.zone);
      }
    }
  }

  finish(geos, lines, faint, withLines) {
    const grad = this.mats.theme.plateGradient;
    if (grad && geos.plate.length) {
      const c = new THREE.Vector3();
      geos.plate = geos.plate.map((g0) => {
        const g = g0.index ? g0.toNonIndexed() : g0;
        g.computeBoundingBox();
        g.boundingBox.getCenter(c);
        // tile tone: soft diagonal gradient plus per-tile variation
        const ti = Math.floor(c.x / T), tj = Math.floor(c.z / T);
        const hsh = Math.abs(Math.sin(ti * 12.9898 + tj * 78.233 + this.seed) * 43758.5453) % 1;
        const diag = (c.x - c.z) / (this.halfX + this.halfZ) * 0.5 + 0.5;
        const tone = grad[0] + (grad[1] - grad[0]) * (0.55 * diag + 0.45 * hsh);
        const p = g.attributes.position, col = new Float32Array(p.count * 3);
        for (let i = 0; i < p.count; i++) {
          const v = Math.min(1.25, tone * (0.82 + p.getY(i) * 0.45)); // pyramid tops catch more light
          col[i * 3] = col[i * 3 + 1] = col[i * 3 + 2] = v;
        }
        g.setAttribute('color', new THREE.BufferAttribute(col, 3));
        return g;
      });
    }
    // corner shading (clay ref): the plane darkens toward its outer corners, and the floor
    // is a touch darker than the raised pieces so they stand out
    const shade = this.mats.theme.cornerShade;
    if (shade) {
      for (const key of ['floor', 'plate', 'deep']) {
        geos[key] = geos[key].map((g0) => {
          const g = g0.index ? g0.toNonIndexed() : g0;
          const p = g.attributes.position;
          const old = g.attributes.color;
          const col = new Float32Array(p.count * 3);
          for (let i = 0; i < p.count; i++) {
            const u = Math.abs(p.getX(i)) / this.halfX, v = Math.abs(p.getZ(i)) / this.halfZ;
            const r = Math.min(1, Math.hypot(u, v) / Math.SQRT2);
            const k = 1 - shade * r * r;
            for (let ch = 0; ch < 3; ch++) col[i * 3 + ch] = (old ? old.getX(i) : 1) * k;
          }
          g.setAttribute('color', new THREE.BufferAttribute(col, 3));
          return g;
        });
      }
    }
    for (const key of Object.keys(geos)) {
      if (!geos[key].length) continue;
      const m = new THREE.Mesh(mergeGeometries(geos[key].map((g) => (g.index ? g.toNonIndexed() : g))), this.mats[key]);
      m.receiveShadow = true;
      m.castShadow = key === 'plate';
      this.group.add(m);
    }
    if (withLines) {
      this.group.add(lines.build(this.mats.line));
      this.group.add(faint.build(this.mats.lineFaint));
    }
  }

  addBars(cx, cz, y0, R) {
    const g = new THREE.Group();
    const bars = [];
    const n = 3;
    for (let a = 0; a < n; a++) for (let b = 0; b < n; b++) {
      if (R() < 0.25) continue;
      // compact cluster: always leaves a lane between neighbouring tiles
      const w = 0.2 + R() * 0.1, h = 0.5 + R() * 1.9;
      const glass = R() < 0.3;
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, w * (0.7 + R() * 0.5)), glass ? this.mats.glass : this.mats.chromeBar);
      m.position.set(cx - 0.32 + a * 0.32, y0 + h / 2, cz - 0.32 + b * 0.32);
      m.castShadow = !glass;
      m.receiveShadow = true;
      g.add(m);
      bars.push(m);
    }
    this.group.add(g);
    const top = Math.max(...bars.map((m) => m.position.y + m.geometry.parameters.height / 2));
    this.obstacles.push({
      kind: 'bars', group: g, bars, top, smashTier: top < 1.4 ? 1 : 2,
      min: new THREE.Vector2(cx - 0.48, cz - 0.48), max: new THREE.Vector2(cx + 0.48, cz + 0.48),
    });
  }

  // u: twisting column of coloured tiles (spectrum)
  addTower(cx, cz, y0, R) {
    this.spectrumMats ||= spectrumMaterials(this.palette);
    const t = new TileColumn({ rng: R, mats: this.spectrumMats });
    t.group.position.set(cx, y0, cz);
    t.group.rotation.y = Math.floor(R() * 4) * Math.PI / 2;
    this.group.add(t.group);
    this.animated.push(t);
    const r = t.s; // 2 x 2 footprint
    this.obstacles.push({
      kind: 'block', top: y0 + t.height,
      min: new THREE.Vector2(cx - r, cz - r), max: new THREE.Vector2(cx + r, cz + r),
    });
  }

  // G: big colourful polyhedron (prism)
  addShape(cx, cz, y0, R) {
    this.shapeMats ||= shapeMaterials();
    const s = new BigShape({ rng: R, palette: this.palette, mats: this.shapeMats });
    s.group.position.set(cx, y0, cz);
    this.group.add(s.group);
    this.animated.push(s);
    const r = s.r * 0.78;
    this.obstacles.push({ kind: 'block', top: y0 + s.height, min: new THREE.Vector2(cx - r, cz - r), max: new THREE.Vector2(cx + r, cz + r) });
  }

  // c: cluster of small chocolate cages (cocoa)
  addCluster(cx, cz, y0, R) {
    const c = new CageCluster({ rng: R, mat: this.mats.decor || this.mats.cage });
    c.group.position.set(cx, y0, cz);
    this.group.add(c.group);
    this.animated.push(c);
    this.obstacles.push({ kind: 'block', top: y0 + c.height, min: new THREE.Vector2(cx - 0.85, cz - 0.85), max: new THREE.Vector2(cx + 0.85, cz + 0.85) });
  }

  // g: pulsing floor light strips
  addLights(cx, cz, y0, R) {
    const l = new LightStrips({ cx, cz, y: y0, rng: R, colors: this.palette });
    this.group.add(l.group);
    this.animated.push(l);
  }

  // light rising out of a pit so it reads as a hole, even on dark planes
  addPitGlow(cx, cz, hw, top, bottom) {
    const color = this.mats.theme.pitGlow ?? this.mats.theme.accent;
    if (!World.pitTex) {
      const c = document.createElement('canvas');
      c.width = 4; c.height = 128;
      const g = c.getContext('2d');
      const grad = g.createLinearGradient(0, 0, 0, 128);
      grad.addColorStop(0, 'rgba(255,255,255,0.12)');
      grad.addColorStop(0.6, 'rgba(255,255,255,0.45)');
      grad.addColorStop(1, 'rgba(255,255,255,1)');
      g.fillStyle = grad;
      g.fillRect(0, 0, 4, 128);
      World.pitTex = new THREE.CanvasTexture(c);
    }
    this.pitMats ||= {
      floor: Object.assign(new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(1.4) }), { toneMapped: false }),
      shaft: Object.assign(new THREE.MeshBasicMaterial({
        color, map: World.pitTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.BackSide,
      }), { toneMapped: false }),
    };
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(2 * hw, 2 * hw), this.pitMats.floor);
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(cx, bottom, cz);
    this.group.add(floor);
    const hgt = top - bottom;
    // open top/bottom: the box's +y / -y faces get an invisible material
    this.pitMats.none ||= new THREE.MeshBasicMaterial({ visible: false });
    const sm = this.pitMats.shaft, no = this.pitMats.none;
    const shaft = new THREE.Mesh(new THREE.BoxGeometry(2 * hw, hgt, 2 * hw), [sm, sm, no, no, sm, sm]);
    shaft.position.set(cx, bottom + hgt / 2, cz);
    shaft.layers.set(1); // not in the chrome reflections
    this.group.add(shaft);
  }

  // '=' gate: a glowing laser barrier across the tile. When its zone's quota is banked it sinks into
  // the floor and leaves only a faint line as a hint of where it was. Gates share one set of
  // materials per zone so the whole barrier pulses and fades together.
  gateMats(zone) {
    this.gateZones ||= [];
    if (this.gateZones[zone]) return this.gateZones[zone];
    const theme = this.mats.theme;
    const glow = Math.max(1.8, (theme.lineGlow || 1) * 0.7); // HDR: over the bloom threshold where there is bloom
    const add = (o) => {
      const m = new THREE.MeshBasicMaterial({ color: theme.accent, transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, ...o });
      m.toneMapped = false;
      return m;
    };
    World.gateTex ||= (() => {
      // soft band: bright core, fading out above and below
      const c = document.createElement('canvas');
      c.width = 4; c.height = 64;
      const x = c.getContext('2d'), g = x.createLinearGradient(0, 0, 0, 64);
      g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.5, 'rgba(255,255,255,1)'); g.addColorStop(1, 'rgba(255,255,255,0)');
      x.fillStyle = g; x.fillRect(0, 0, 4, 64);
      return new THREE.CanvasTexture(c);
    })();
    World.curtainTex ||= (() => {
      // curtain: brightest at the laser and the floor, thin scan lines between
      const c = document.createElement('canvas');
      c.width = 4; c.height = 128;
      const x = c.getContext('2d');
      for (let y = 0; y < 128; y++) {
        const v = y / 127; // 0 = top
        const a = 0.25 + 0.75 * Math.max(Math.exp(-v * 9), Math.exp(-(1 - v) * 7)) + (y % 8 < 2 ? 0.25 : 0);
        x.fillStyle = `rgba(255,255,255,${Math.min(1, a)})`;
        x.fillRect(0, y, 4, 1);
      }
      return new THREE.CanvasTexture(c);
    })();
    const m = {
      curtain: add({ map: World.curtainTex, opacity: 0.22 }),
      halo: add({ map: World.gateTex, opacity: 0.5 }),
      bar: add({ blending: THREE.NormalBlending, opacity: 1 }),
      glow,
    };
    m.bar.color.multiplyScalar(glow);
    this.gateZones[zone] = m;
    return m;
  }

  addGate(cx, cz, zone) {
    const m = this.gateMats(zone);
    // low light barrier: reads as a gate without hiding the zone behind it
    const curtain = new THREE.Mesh(new THREE.PlaneGeometry(T, 1.0), m.curtain);
    curtain.position.set(cx, 0.5, cz);
    const bar = new THREE.Mesh(new THREE.BoxGeometry(T, 0.08, 0.08), m.bar);
    bar.position.set(cx, 1.0, cz);
    // glow around the laser: one band standing up, one lying flat, so it reads from any angle
    const haloV = new THREE.Mesh(new THREE.PlaneGeometry(T, 0.7), m.halo);
    const haloH = new THREE.Mesh(new THREE.PlaneGeometry(T, 0.7), m.halo);
    haloH.rotation.x = -Math.PI / 2;
    const halo = new THREE.Group();
    halo.add(haloV, haloH);
    halo.position.copy(bar.position);
    for (const o of [curtain, bar, haloV, haloH]) o.layers.set(1); // not in the chrome reflections
    this.group.add(curtain, bar, halo);
    const o = { kind: 'gate', zone, top: 99, curtain, bar, halo, open: 0,
      min: new THREE.Vector2(cx - T / 2, cz - 0.25), max: new THREE.Vector2(cx + T / 2, cz + 0.25) };
    this.obstacles.push(o);
    (this.gates ||= []).push(o);
  }

  openGate(zone) {
    for (const g of this.gates || []) if (g.zone === zone) { g.smashed = true; g.opening = true; }
  }

  resetGates() {
    for (const g of this.gates || []) {
      g.baseY ??= g.curtain.position.y;
      g.barY ??= g.bar.position.y;
      Object.assign(g, { smashed: false, opening: false, open: 0 });
      g.curtain.visible = g.halo.visible = true;
      g.curtain.scale.y = 1;
      g.curtain.position.y = g.baseY;
      g.bar.position.y = g.halo.position.y = g.barY;
    }
  }

  // low glowing rails along the whole outer border keep you on the plane
  addBorderRails(lvl) {
    const m = new THREE.MeshBasicMaterial({ color: new THREE.Color(this.mats.theme.cageLine).multiplyScalar(1.1) });
    m.toneMapped = false;
    const hw = T / 2, geo = [];
    const rail = (x, z, e, alongX) => {
      const g = new THREE.BoxGeometry(alongX ? T : 0.1, 0.1, alongX ? 0.1 : T);
      g.translate(x, e + 0.32, z);
      geo.push(g);
      for (const dx of alongX ? [-hw, hw] : [0]) for (const dz of alongX ? [0] : [-hw, hw]) {
        const post = new THREE.BoxGeometry(0.08, 0.32, 0.08);
        post.translate(x + dx, e + 0.16, z + dz);
        geo.push(post);
      }
    };
    for (let i = 0; i < this.cols; i++) {
      const [cx0, cz0] = this.tileCenter(i, 0), [cx1, cz1] = this.tileCenter(i, this.rows - 1);
      rail(cx0, cz0 - hw, lvl(i, 0) * LEVEL_H, true);
      rail(cx1, cz1 + hw, lvl(i, this.rows - 1) * LEVEL_H, true);
    }
    for (let j = 0; j < this.rows; j++) {
      const [cx0, cz0] = this.tileCenter(0, j), [cx1, cz1] = this.tileCenter(this.cols - 1, j);
      rail(cx0 - hw, cz0, lvl(0, j) * LEVEL_H, false);
      rail(cx1 + hw, cz1, lvl(this.cols - 1, j) * LEVEL_H, false);
    }
    if (this.heights) this.group.add(new THREE.Mesh(mergeGeometries(geo), m));
  }

  update(dt) {
    for (const a of this.animated) a.update(dt);
    if (World.portalTex) World.portalTex.map.offset.y = -performance.now() / 1000 * 0.12; // portal lines drift up
    // closed gates hum; opened ones sink to a dimmer line on the floor that slowly breathes,
    // marking the way into the new zone
    const time = performance.now() / 1000;
    (this.gateZones || []).forEach((m, zone) => {
      const g = this.gates.find((x) => x.zone === zone);
      const open = g ? g.open : 0;
      const hum = 0.85 + 0.15 * Math.sin(time * 5 + zone) + 0.05 * Math.sin(time * 23);
      const breathe = 0.75 + 0.25 * Math.sin(time * 1.6 + zone);
      const closed = 1 - open;
      m.curtain.opacity = 0.22 * hum * closed;
      m.halo.opacity = 0.5 * hum * closed + 0.2 * breathe * open;
      m.bar.opacity = 0.4 * breathe + (1 - 0.4 * breathe) * closed;
      m.bar.color.setHex(this.mats.theme.accent).multiplyScalar(m.glow * closed + 1.0 * open);
    });
    for (const g of this.gates || []) {
      if (!g.opening) continue;
      g.baseY ??= g.curtain.position.y;
      g.barY ??= g.bar.position.y;
      g.open = Math.min(1, g.open + dt * 1.5);
      // the curtain sinks into the floor
      g.curtain.scale.y = Math.max(0.001, 1 - g.open);
      g.curtain.position.y = g.baseY - 0.5 * g.open;
      g.bar.position.y = g.halo.position.y = g.barY - 0.95 * g.open;
      if (g.open >= 1) { g.curtain.visible = false; g.opening = false; }
    }
  }

  // Portal textures, shared by every portal: fine light lines that scroll upward through the field
  // (map), and the field's shape (alphaMap): see-through in the middle, brighter along the posts and
  // the floor, fading out toward the top.
  static portalTextures() {
    if (World.portalTex) return World.portalTex;
    const lines = document.createElement('canvas');
    lines.width = 4; lines.height = 64;
    let x = lines.getContext('2d');
    x.fillStyle = '#8c8c8c'; x.fillRect(0, 0, 4, 64);
    x.fillStyle = '#ffffff'; x.fillRect(0, 0, 4, 2); x.fillRect(0, 30, 4, 1);
    const map = new THREE.CanvasTexture(lines);
    map.wrapS = map.wrapT = THREE.RepeatWrapping;
    map.repeat.set(1, 3);
    const shape = document.createElement('canvas');
    shape.width = 64; shape.height = 128;
    x = shape.getContext('2d');
    const img = x.createImageData(64, 128);
    for (let py = 0; py < 128; py++) for (let px = 0; px < 64; px++) {
      const u = px / 63, v = 1 - py / 127; // v = 0 at the floor
      const edge = Math.exp(-Math.min(u, 1 - u) * 14);
      const a = (0.16 + 0.6 * edge + 0.5 * Math.exp(-v * 7)) * (1 - 0.75 * v * v);
      const k = Math.round(255 * Math.min(1, a));
      img.data.set([k, k, k, 255], (py * 64 + px) * 4);
    }
    x.putImageData(img, 0, 0);
    const alphaMap = new THREE.CanvasTexture(shape);
    // halo: a soft rounded rectangle of light behind the doorway
    const halo = document.createElement('canvas');
    halo.width = 64; halo.height = 128;
    x = halo.getContext('2d');
    const himg = x.createImageData(64, 128);
    for (let py = 0; py < 128; py++) for (let px = 0; px < 64; px++) {
      const dx = Math.max(0, Math.abs(px / 63 - 0.5) * 2 - 0.45) / 0.55, dy = Math.max(0, Math.abs(py / 127 - 0.5) * 2 - 0.7) / 0.3;
      const a = Math.max(0, 1 - Math.hypot(dx, dy)) ** 2;
      himg.data.set([255, 255, 255, Math.round(255 * a)], (py * 64 + px) * 4);
    }
    x.putImageData(himg, 0, 0);
    World.portalTex = { map, alphaMap, halo: new THREE.CanvasTexture(halo) };
    return World.portalTex;
  }

  addPortal(cx, cz, y0) {
    const h = 3.6, w = 1.5;
    const tex = World.portalTextures();
    // energy field: `mesh` keeps its name and material colour so the lit portal can be tinted
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), this.mats.portal.clone());
    Object.assign(m.material, { map: tex.map, alphaMap: tex.alphaMap, opacity: 0.9, side: THREE.DoubleSide });
    m.position.set(cx, y0 + h / 2, cz);
    this.group.add(m);
    // slim frame: two posts and a lintel, bright enough to catch the bloom
    const frameMat = new THREE.MeshBasicMaterial({ color: this.mats.theme.portal });
    frameMat.toneMapped = false;
    const t = 0.07;
    const frame = new THREE.Group();
    for (const [fw, fh, fx, fy] of [[t, h, -w / 2, 0], [t, h, w / 2, 0], [w + t, t, 0, h / 2]]) {
      const bar = new THREE.Mesh(new THREE.BoxGeometry(fw, fh, t), frameMat);
      bar.position.set(fx, fy, 0);
      frame.add(bar);
    }
    // small feet anchor the posts to the floor
    for (const fx of [-w / 2, w / 2]) {
      const foot = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.06, 0.34), frameMat);
      foot.position.set(fx, -h / 2 + 0.03, 0);
      frame.add(foot);
    }
    frame.position.copy(m.position);
    this.group.add(frame);
    const glowMat = this.mats.portalGlow.clone();
    Object.assign(glowMat, { map: tex.halo, side: THREE.DoubleSide });
    const glow = new THREE.Mesh(new THREE.PlaneGeometry(w + 1.4, h + 1.0), glowMat);
    glow.position.copy(m.position);
    glow.position.z -= 0.02;
    this.group.add(glow);
    const light = new THREE.PointLight(this.mats.theme.portal, 3, 5, 1.5);
    light.position.set(cx, 1.2, cz + 0.9);
    this.group.add(light);
    const o = {
      kind: 'portal', mesh: m, frame: frameMat, glow, light, top: 99,
      min: new THREE.Vector2(cx - 0.75, cz - 0.25), max: new THREE.Vector2(cx + 0.75, cz + 0.25),
      center: new THREE.Vector3(cx, y0 + h * 0.6, cz),
    };
    this.obstacles.push(o);
    this.portals.push(o);
  }

  deckY() { return 0; }
  get minY() { return 0; }
  deckIndexAt() { return 0; }
  get worldTiles() { return this.tiles; }

  tileAt(x, z) {
    const i = Math.floor(x / T + this.cols / 2), j = Math.floor(z / T + this.rows / 2);
    if (i < 0 || j < 0 || i >= this.cols || j >= this.rows) return null;
    return this.tiles[j * this.cols + i];
  }

  heightAt(x, z) {
    const t = this.tileAt(x, z);
    if (!t) return -100;
    const h = this.tileHeight(t, x, z);
    return h <= -50 ? h : h + t.e;
  }

  tileHeight(t, x, z) {
    const lx = x - t.cx, lz = z - t.cz;
    const c = Math.max(Math.abs(lx), Math.abs(lz));
    switch (t.type) {
      case 'p': {
        let k = 0;
        while (k < t.n && t.hb - k * t.d > c) k++;
        return k * t.h;
      }
      case 'r': {
        const k = Math.min(t.n, Math.max(0, Math.floor((T / 2 - c) / t.d)));
        return -k * t.h;
      }
      case 'v': {
        const k = Math.floor((T / 2 - c) / t.d);
        return k >= t.n ? -100 : -Math.max(0, k) * t.h;
      }
      case 'k': {
        if (c > t.plateHW) return 0;
        const fx = ((lx + t.plateHW) / t.ks) % 1, fz = ((lz + t.plateHW) / t.ks) % 1;
        const inKey = fx > 0.12 && fx < 0.88 && fz > 0.12 && fz < 0.88;
        return t.plate + (inKey ? t.kh : 0);
      }
      case 'h': {
        const k = Math.floor((lz + T / 2) / (T / t.n));
        const cz = -T / 2 + (k + 0.5) * (T / t.n);
        return Math.abs(lx) < T / 2 - 0.06 && Math.abs(lz - cz) < t.bw / 2 ? t.bh : 0;
      }
      case 'f':
        return c < 0.6 ? 0.17 : c < 0.9 ? 0.12 : 0;
      case 'q': {
        if (c > t.plateHW) return 0;
        const a = Math.min(t.kn - 1, Math.floor((lx + t.plateHW) / t.ks)), b = Math.min(t.kn - 1, Math.floor((lz + t.plateHW) / t.ks));
        return t.plate + (t.mask[a * t.kn + b] ? t.kh : 0);
      }
      case 'n': {
        const across = t.alongX ? lz : lx;
        const k = Math.floor((across + T / 2) / (T / t.n));
        const mid = -T / 2 + (k + 0.5) * (T / t.n);
        return Math.abs(across - mid) < t.bw * 0.4 && Math.abs(t.alongX ? lx : lz) < T / 2 - 0.1 ? t.bh : 0;
      }
      case 'L': {
        const along = t.dir[0] ? lx * t.dir[0] : lz * t.dir[1];
        const k = Math.min(t.n - 1, Math.max(0, Math.floor(((along + T / 2) / T) * t.n)));
        return ((k + 1) * LEVEL_H) / t.n;
      }
      default:
        return c < t.plateHW ? t.plate : 0;
    }
  }
}
