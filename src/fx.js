import * as THREE from 'three';

// Additive spark particles + expanding floor rings.
export class FX {
  constructor(scene, max = 1500) {
    this.max = max;
    this.pos = new Float32Array(max * 3);
    this.col = new Float32Array(max * 3);
    this.vel = new Float32Array(max * 3);
    this.base = new Float32Array(max * 3);
    this.life = new Float32Array(max);
    this.maxLife = new Float32Array(max);
    this.grav = new Float32Array(max);
    this.next = 0;
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('color', new THREE.BufferAttribute(this.col, 3).setUsage(THREE.DynamicDrawUsage));
    const m = new THREE.PointsMaterial({
      size: 0.08, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    });
    m.toneMapped = false;
    this.points = new THREE.Points(g, m);
    this.points.frustumCulled = false;
    this.points.layers.set(1);
    scene.add(this.points);

    this.rings = [];
    const rg = new THREE.RingGeometry(0.92, 1, 72);
    rg.rotateX(-Math.PI / 2);
    for (let i = 0; i < 14; i++) {
      const rm = new THREE.MeshBasicMaterial({ color: 0x8fe8ff, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
      rm.toneMapped = false;
      const mesh = new THREE.Mesh(rg, rm);
      mesh.visible = false;
      mesh.layers.set(1);
      scene.add(mesh);
      this.rings.push({ mesh, t: 1, dur: 1, max: 1, alpha: 1 });
    }
  }

  burst(p, n, color, { speed = 3, up = 2, life = 0.7, grav = 6, spread = 0.1 } = {}) {
    const c = new THREE.Color(color);
    for (let k = 0; k < n; k++) {
      const i = this.next;
      this.next = (this.next + 1) % this.max;
      const a = Math.random() * Math.PI * 2, r = Math.random();
      this.pos[i * 3] = p.x + (Math.random() - 0.5) * spread;
      this.pos[i * 3 + 1] = p.y + (Math.random() - 0.5) * spread;
      this.pos[i * 3 + 2] = p.z + (Math.random() - 0.5) * spread;
      this.vel[i * 3] = Math.cos(a) * speed * r;
      this.vel[i * 3 + 1] = up * (0.4 + Math.random());
      this.vel[i * 3 + 2] = Math.sin(a) * speed * r;
      const b = 0.6 + Math.random() * 0.8;
      this.base[i * 3] = c.r * b; this.base[i * 3 + 1] = c.g * b; this.base[i * 3 + 2] = c.b * b;
      this.maxLife[i] = this.life[i] = life * (0.5 + Math.random() * 0.8);
      this.grav[i] = grav;
    }
  }

  ring(p, color = 0x8fe8ff, max = 3, dur = 0.6, alpha = 0.9) {
    const r = this.rings.find((x) => x.t >= 1) || this.rings[0];
    r.mesh.position.set(p.x, p.y + 0.03, p.z);
    r.mesh.material.color.setHex(color);
    Object.assign(r, { t: 0, dur, max, alpha });
    r.mesh.visible = true;
  }

  update(dt) {
    for (let i = 0; i < this.max; i++) {
      if (this.life[i] <= 0) continue;
      this.life[i] -= dt;
      const k = Math.max(0, this.life[i] / this.maxLife[i]);
      this.vel[i * 3 + 1] -= this.grav[i] * dt;
      for (let a = 0; a < 3; a++) {
        this.vel[i * 3 + a] *= 1 - 1.5 * dt;
        this.pos[i * 3 + a] += this.vel[i * 3 + a] * dt;
        this.col[i * 3 + a] = this.base[i * 3 + a] * k;
      }
      if (this.pos[i * 3 + 1] < 0.02) { this.pos[i * 3 + 1] = 0.02; this.vel[i * 3 + 1] *= -0.3; }
    }
    this.points.geometry.attributes.position.needsUpdate = true;
    this.points.geometry.attributes.color.needsUpdate = true;
    for (const r of this.rings) {
      if (r.t >= 1) continue;
      r.t = Math.min(1, r.t + dt / r.dur);
      const e = 1 - Math.pow(1 - r.t, 3);
      r.mesh.scale.setScalar(0.2 + e * r.max);
      r.mesh.material.opacity = r.alpha * (1 - r.t);
      if (r.t >= 1) r.mesh.visible = false;
    }
  }
}
