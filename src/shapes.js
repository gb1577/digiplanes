import * as THREE from 'three';
import { buildCageGeometry } from './geometry.js';

// Big colourful polyhedra for the Prism plane: each face is a coloured panel set into a
// black frame (from the colourful-ball ref). They spin slowly in place.

function facePanels(geo, palette, rng, inset = 0.86) {
  const g = geo.index ? geo.toNonIndexed() : geo;
  const p = g.attributes.position;
  const tris = [];
  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
  for (let i = 0; i < p.count; i += 3) {
    a.fromBufferAttribute(p, i); b.fromBufferAttribute(p, i + 1); c.fromBufferAttribute(p, i + 2);
    const n = new THREE.Vector3().subVectors(b, a).cross(new THREE.Vector3().subVectors(c, a)).normalize();
    tris.push({ v: [a.clone(), b.clone(), c.clone()], n });
  }
  // group coplanar triangles into faces
  const faces = [];
  for (const t of tris) {
    let f = faces.find((x) => x.n.dot(t.n) > 0.999);
    if (!f) { f = { n: t.n, tris: [] }; faces.push(f); }
    f.tris.push(t);
  }
  const pos = [], col = [];
  const color = new THREE.Color();
  for (const f of faces) {
    const centre = new THREE.Vector3();
    let k = 0;
    f.tris.forEach((t) => t.v.forEach((v) => { centre.add(v); k++; }));
    centre.divideScalar(k);
    color.setHex(palette[Math.floor(rng() * palette.length)]);
    for (const t of f.tris) {
      for (const v of t.v) {
        const q = v.clone().sub(centre).multiplyScalar(inset).add(centre).addScaledVector(f.n, 0.012);
        pos.push(q.x, q.y, q.z);
        col.push(color.r, color.g, color.b);
      }
    }
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  out.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  out.computeVertexNormals();
  return out;
}

const SHAPES = [
  (r) => new THREE.DodecahedronGeometry(r),
  (r) => new THREE.IcosahedronGeometry(r),
  (r) => new THREE.OctahedronGeometry(r * 1.1),
  (r) => new THREE.CylinderGeometry(r * 0.75, r * 0.75, r * 2.2, 3), // tall triangular prism
];

export function shapeMaterials() {
  return {
    frame: new THREE.MeshPhysicalMaterial({ color: 0x0b0b0d, roughness: 0.18, metalness: 0.4, clearcoat: 1, flatShading: true }),
    panel: new THREE.MeshPhysicalMaterial({ vertexColors: true, roughness: 0.25, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.1, flatShading: true }),
  };
}

export class BigShape {
  constructor({ rng = Math.random, palette, mats }) {
    this.group = new THREE.Group();
    this.r = 1.0 + rng() * 0.3;
    const kind = Math.floor(rng() * SHAPES.length);
    const base = SHAPES[kind](this.r);
    const frame = new THREE.Mesh(base, mats.frame);
    frame.castShadow = true;
    const panels = new THREE.Mesh(facePanels(base, palette, rng), mats.panel);
    this.spin = new THREE.Group();
    this.spin.add(frame, panels);
    this.spin.rotation.set(rng() * Math.PI, rng() * Math.PI, 0);
    this.group.add(this.spin);
    this.lift = kind === 3 ? this.r * 1.1 : this.r * 0.92; // rest on the floor
    this.spin.position.y = this.lift;
    this.height = this.lift * 2;
    this.speed = (0.15 + rng() * 0.2) * (rng() < 0.5 ? -1 : 1);
  }
  update(dt) { this.spin.rotation.y += dt * this.speed; }
}

// Cocoa clusters: a few small chocolate cages turning slowly in place.
let cageGeo = null;
export class CageCluster {
  constructor({ rng = Math.random, mat }) {
    cageGeo ||= buildCageGeometry().geo;
    this.group = new THREE.Group();
    this.items = [];
    const n = 2 + Math.floor(rng() * 2);
    for (let i = 0; i < n; i++) {
      const s = 0.38 + rng() * 0.18;
      const m = new THREE.Mesh(cageGeo, mat);
      m.scale.setScalar(s);
      const a = (i / n) * Math.PI * 2 + rng();
      m.position.set(Math.cos(a) * 0.45, s * 0.9, Math.sin(a) * 0.45);
      m.rotation.set(rng() * 6, rng() * 6, rng() * 6);
      m.castShadow = true;
      m.receiveShadow = true;
      this.group.add(m);
      this.items.push({ m, w: (0.2 + rng() * 0.3) * (rng() < 0.5 ? -1 : 1) });
    }
    this.height = 1.1;
  }
  update(dt) { for (const it of this.items) it.m.rotation.y += dt * it.w; }
}
