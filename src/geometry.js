import * as THREE from 'three';
import { LineSegmentsGeometry } from 'three/addons/lines/LineSegmentsGeometry.js';
import { LineSegments2 } from 'three/addons/lines/LineSegments2.js';

// ---------- Icosahedron data (circumradius 1) ----------
const t = (1 + Math.sqrt(5)) / 2;
const RAW_V = [
  [-1, t, 0], [1, t, 0], [-1, -t, 0], [1, -t, 0],
  [0, -1, t], [0, 1, t], [0, -1, -t], [0, 1, -t],
  [t, 0, -1], [t, 0, 1], [-t, 0, -1], [-t, 0, 1],
];
const RAW_F = [
  [0, 11, 5], [0, 5, 1], [0, 1, 7], [0, 7, 10], [0, 10, 11],
  [1, 5, 9], [5, 11, 4], [11, 10, 2], [10, 7, 6], [7, 1, 8],
  [3, 9, 4], [3, 4, 2], [3, 2, 6], [3, 6, 8], [3, 8, 9],
  [4, 9, 5], [2, 4, 11], [6, 2, 10], [8, 6, 7], [9, 8, 1],
];

export const ICO = (() => {
  const verts = RAW_V.map((v) => new THREE.Vector3(...v).normalize());
  const faces = RAW_F.map((f) => {
    const [a, b, c] = f.map((i) => verts[i]);
    const n = new THREE.Vector3().subVectors(b, a).cross(new THREE.Vector3().subVectors(c, a));
    const g = new THREE.Vector3().add(a).add(b).add(c).divideScalar(3);
    return n.dot(g) < 0 ? [f[0], f[2], f[1]] : f.slice();
  });
  const normals = faces.map((f) => {
    const g = new THREE.Vector3();
    f.forEach((i) => g.add(verts[i]));
    return g.normalize();
  });
  const edge = verts[RAW_F[0][0]].distanceTo(verts[RAW_F[0][1]]);
  const inradius = (() => {
    const g = new THREE.Vector3();
    faces[0].forEach((i) => g.add(verts[i]));
    return g.divideScalar(3).length();
  })();
  // neighbours per vertex
  const nbrs = verts.map(() => new Set());
  faces.forEach(([a, b, c]) => {
    nbrs[a].add(b).add(c); nbrs[b].add(a).add(c); nbrs[c].add(a).add(b);
  });
  return { verts, faces, normals, edge, inradius, nbrs: nbrs.map((s) => [...s]) };
})();

// ---------- Hollow beveled cage like the reference ----------
// c: corner truncation along edges, k: window size, s: inner shell scale
export function buildCageGeometry({ c = 0.2, k = 0.6, s = 0.84, hub = 0.26 } = {}) {
  const pos = [];
  const hull = []; // outer cap points: used for polyhedral ground contact
  const lerp = (a, b, f) => new THREE.Vector3().lerpVectors(a, b, f);
  // tone: vertex colour multiplier (lighter hub caps, darker window walls, like the ref)
  const col = [];
  let tone = 1;
  const tri = (a, b, cc) => {
    pos.push(a.x, a.y, a.z, b.x, b.y, b.z, cc.x, cc.y, cc.z);
    for (let i = 0; i < 9; i++) col.push(tone);
  };
  // emits a triangle on the outer shell and its mirror on the inner shell
  const shellTri = (a, b, cc) => {
    tri(a, b, cc);
    tri(cc.clone().multiplyScalar(s), b.clone().multiplyScalar(s), a.clone().multiplyScalar(s));
  };
  // wall quad between outer edge (a,b) and inner edge, facing toward `toward`
  const wall = (a, b, toward) => {
    const ai = a.clone().multiplyScalar(s), bi = b.clone().multiplyScalar(s);
    const n = new THREE.Vector3().subVectors(b, a).cross(new THREE.Vector3().subVectors(bi, a));
    const mid = new THREE.Vector3().add(a).add(b).add(ai).add(bi).multiplyScalar(0.25);
    const t0 = tone;
    tone = t0 * 0.72;
    if (n.dot(new THREE.Vector3().subVectors(toward, mid)) >= 0) { tri(a, b, bi); tri(a, bi, ai); }
    else { tri(b, a, ai); tri(b, ai, bi); }
    tone = t0;
  };

  const { verts, faces, nbrs } = ICO;
  for (const [ia, ib, ic] of faces) {
    const A = verts[ia], B = verts[ib], C = verts[ic];
    const G = new THREE.Vector3().add(A).add(B).add(C).divideScalar(3);
    const hAB = lerp(A, B, c), hBA = lerp(B, A, c), hBC = lerp(B, C, c);
    const hCB = lerp(C, B, c), hCA = lerp(C, A, c), hAC = lerp(A, C, c);
    const iA = lerp(G, A, k), iB = lerp(G, B, k), iC = lerp(G, C, k);
    shellTri(hAB, hBA, iB); shellTri(hAB, iB, iA); shellTri(hBA, hBC, iB);
    shellTri(hBC, hCB, iC); shellTri(hBC, iC, iB); shellTri(hCB, hCA, iC);
    shellTri(hCA, hAC, iA); shellTri(hCA, iA, iC); shellTri(hAC, hAB, iA);
    wall(iA, iB, G); wall(iB, iC, G); wall(iC, iA, G);
  }
  // pentagonal hub caps with a small hole (like the ref)
  tone = 1.45;
  verts.forEach((V, vi) => {
    const pts = nbrs[vi].map((ni) => lerp(V, verts[ni], c));
    const center = new THREE.Vector3();
    pts.forEach((p) => center.add(p));
    center.divideScalar(pts.length);
    const up = V.clone().normalize();
    const ref = new THREE.Vector3().subVectors(pts[0], center).normalize();
    const side = new THREE.Vector3().crossVectors(up, ref);
    pts.sort((p, q) => {
      const dp = new THREE.Vector3().subVectors(p, center), dq = new THREE.Vector3().subVectors(q, center);
      return Math.atan2(dp.dot(side), dp.dot(ref)) - Math.atan2(dq.dot(side), dq.dot(ref));
    });
    hull.push(...pts.map((p) => p.clone()));
    const holes = pts.map((p) => lerp(center, p, hub));
    for (let i = 0; i < 5; i++) {
      const p0 = pts[i], p1 = pts[(i + 1) % 5], h0 = holes[i], h1 = holes[(i + 1) % 5];
      shellTri(p0, p1, h1); shellTri(p0, h1, h0);
      wall(h1, h0, center.clone().multiplyScalar(0.9));
    }
  });

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  geo.computeVertexNormals();
  return { geo, hull };
}

// ---------- Fat edge lines ----------
// Collects edges of many (geometry, matrix) pairs into one LineSegments2.
export class EdgeBatch {
  constructor() { this.arr = []; }
  add(geo, matrix, angle = 20) {
    const e = new THREE.EdgesGeometry(geo, angle);
    const p = e.attributes.position;
    const v = new THREE.Vector3();
    for (let i = 0; i < p.count; i++) {
      v.fromBufferAttribute(p, i);
      if (matrix) v.applyMatrix4(matrix);
      this.arr.push(v.x, v.y, v.z);
    }
    e.dispose();
  }
  addSegment(a, b) { this.arr.push(a.x, a.y, a.z, b.x, b.y, b.z); }
  build(material) {
    const g = new LineSegmentsGeometry();
    g.setPositions(this.arr);
    const l = new LineSegments2(g, material);
    l.layers.set(1); // visible to the main camera and mirror, not to the chrome reflection probe (avoids HDR sparkle)
    l.computeLineDistances();
    return l;
  }
}

export function edgeLines(geo, material, angle = 20) {
  const b = new EdgeBatch();
  b.add(geo, null, angle);
  return b.build(material);
}

// Coloured glass panes that sit in the cage's triangular windows (spectrum ref).
export function buildPaneGeometry(colors, { k = 0.6, r = 0.92, seed = 3 } = {}) {
  const pos = [], col = [];
  const c = new THREE.Color();
  let s = seed;
  const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  ICO.faces.forEach(([ia, ib, ic]) => {
    const A = ICO.verts[ia], B = ICO.verts[ib], C = ICO.verts[ic];
    const G = new THREE.Vector3().add(A).add(B).add(C).divideScalar(3);
    const p = [A, B, C].map((v) => new THREE.Vector3().lerpVectors(G, v, k).multiplyScalar(r));
    c.setHex(colors[Math.floor(rnd() * colors.length)]);
    for (const v of p) { pos.push(v.x, v.y, v.z); col.push(c.r, c.g, c.b); }
  });
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  return geo;
}
