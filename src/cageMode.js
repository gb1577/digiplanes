import * as THREE from 'three';
import { World, T } from './world.js';
import { buildCageGeometry, buildPaneGeometry, edgeLines } from './geometry.js';
import { buildMirror } from './mirror.js';
import { MultiWorld } from './multiworld.js';
import { makeMaterials, buildEnvironment, buildReflectionRig } from './materials.js';
import { THEMES } from './themes.js';
import { FX } from './fx.js';
import { viewLens } from './view.js';

const G = 16;
const RB = 0.12; // marble radius
const PR = 0.6; // player cage radius: stays small and nimble
const VMAX = 8.5;
const MAX_BALLS = 720;
const LIVES = 3;
const STEP_UP = 0.32; // highest ledge you can roll up without hopping
const FUEL_CAP = 60;

const _v = new THREE.Vector3(), _w = new THREE.Vector3(), _q = new THREE.Quaternion(), _col = new THREE.Color(), _aim = new THREE.Vector3();

export class CageMode {
  constructor(app, level) {
    this.app = app;
    this.level = level;
    const theme = (this.theme = THEMES[level.theme]);
    const mats = (this.mats = makeMaterials(theme));
    this.envTex = buildEnvironment(app.renderer, theme);

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(theme.fog);
    this.scene.fog = new THREE.Fog(theme.fog, theme.fogNear, theme.fogFar);
    this.scene.environment = this.envTex;
    this.camera = new THREE.PerspectiveCamera(30, 1, 0.1, 200);
    this.camera.layers.enable(1);
    this.camExtra = 0;
    this.yaw = 0.55; this.pitch = 0.62;
    this.exposure = theme.exposure;

    this.scene.add(new THREE.HemisphereLight(theme.sky, theme.ground, theme.hemi));
    const sun = (this.sun = new THREE.DirectionalLight(theme.sun, theme.sunI));
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    Object.assign(sun.shadow.camera, { left: -14, right: 14, top: 14, bottom: -14, near: 1, far: 70 });
    sun.shadow.bias = -0.0004;
    sun.shadow.normalBias = 0.02;
    this.scene.add(sun, sun.target);

    // multi-deck planes stack several digiplanes joined by ramps
    this.world = level.decks ? new MultiWorld(mats, level) : new World(mats, { layout: level.layout, heights: level.heights, seed: level.seed, lines: theme.lines });
    this.scene.add(this.world.group);
    if (mats.stripes) this.scene.add(this.buildStripeBowl(mats));
    this.rig = buildReflectionRig(theme);
    this.scene.add(this.rig);
    if (theme.mirror) {
      const decks = this.world.decks || [{ w: this.world, x: 0, y: 0, z: 0 }];
      this.mirrors = decks.flatMap((d) => [...new Set(d.w.tiles.map((t) => t.e || 0))].map((elev) => {
        const m = buildMirror(d.w, theme.mirror, innerWidth, innerHeight, elev);
        m.position.x += d.x; m.position.y += d.y; m.position.z += d.z;
        this.scene.add(m);
        return m;
      }));
      this.scene.userData.mirrors = this.mirrors;
    }
    // colour-match planes: marbles come in four colours, the lit portal wants one of them
    this.matchColors = level.colorMatch ? theme.palette.slice(0, 4) : null;
    // candy planes: every marble gets a random colour from the palette (no matching rule)
    this.ballColors = this.matchColors || (theme.candy ? theme.palette : null);

    const { geo, hull } = buildCageGeometry();
    this.cageGeo = geo;
    this.hull = hull;
    this.playerLineMat = mats.cageLine.clone();
    this.player = this.makeCage(mats.cage, this.playerLineMat);
    this.player.scale.setScalar(PR);
    this.scene.add(this.player);
    if (theme.panes) {
      const paneMat = (colors, opacity) => {
        const m = new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity, side: THREE.DoubleSide, depthWrite: false });
        m.toneMapped = false;
        return new THREE.Mesh(buildPaneGeometry(colors), m);
      };
      this.player.add(paneMat(theme.palette, 0.5));
      this.paneFactory = paneMat;
    }

    this.hunters = level.hunters.map((cfg) => {
      const lineMat = mats.hunterLine.clone();
      const group = this.makeCage(mats.hunter, lineMat);
      group.scale.setScalar(cfg.size);
      if (this.paneFactory) group.add(this.paneFactory([theme.danger], 0.32));
      this.scene.add(group);
      return { cfg, group, lineMat };
    });

    let ballMat = mats.chrome;
    if (this.ballColors) {
      // glossy candy marbles that glow in their own colour (bubblegum: just a hint of glow)
      const glow = theme.candy ? 0.12 : 0.55;
      ballMat = new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.08, metalness: 0.1, clearcoat: 1, envMapIntensity: 1.2 });
      ballMat.onBeforeCompile = (sh) => {
        sh.fragmentShader = sh.fragmentShader.replace('#include <emissivemap_fragment>',
          `#include <emissivemap_fragment>
          #ifdef USE_INSTANCING_COLOR
            totalEmissiveRadiance += vColor.rgb * ${glow.toFixed(2)};
          #endif`);
      };
    }
    this.ballMesh = new THREE.InstancedMesh(new THREE.SphereGeometry(RB, 24, 16), ballMat, MAX_BALLS);
    if (this.ballColors) this.ballMesh.setColorAt(0, new THREE.Color());
    this.ballMesh.castShadow = true;
    this.ballMesh.receiveShadow = true;
    this.ballMesh.frustumCulled = false;
    this.scene.add(this.ballMesh);

    this.bigBallMeshes = this.world.bigBalls.map(() => {
      const m = new THREE.Mesh(new THREE.SphereGeometry(0.62, 48, 32), mats.chrome);
      m.castShadow = true;
      this.scene.add(m);
      return m;
    });

    this.shardMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(0.09, 0.09, 0.09), mats.chromeBar, 400);
    this.shardMesh.frustumCulled = false;
    this.scene.add(this.shardMesh);

    // beam over the active portal
    const beamMat = new THREE.MeshBasicMaterial({ color: theme.accent, transparent: true, opacity: 0.22, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending });
    beamMat.toneMapped = false;
    this.beam = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.6, 12, 4, 1, true), beamMat);
    this.beam.layers.set(1);
    this.scene.add(this.beam);

    this.fx = new FX(this.scene);
    this.ray = new THREE.Raycaster();
    this.aimPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    this.mouseAim = new THREE.Vector3();
    // marker on the floor where the mouse is steering
    const am = new THREE.MeshBasicMaterial({ color: theme.cageLine, transparent: true, opacity: 0.5, depthWrite: false, side: THREE.DoubleSide });
    am.toneMapped = false;
    this.aimMark = new THREE.Mesh(new THREE.RingGeometry(0.22, 0.28, 32).rotateX(-Math.PI / 2), am);
    this.aimMark.layers.set(1);
    this.aimMark.visible = false;
    this.scene.add(this.aimMark);

    // floor chevrons pointing from the cage to the lit portal
    const chevShape = new THREE.Shape([
      new THREE.Vector2(-0.22, 0.32), new THREE.Vector2(0.26, 0), new THREE.Vector2(-0.22, -0.32), new THREE.Vector2(-0.08, 0),
    ]);
    const chevGeo = new THREE.ShapeGeometry(chevShape);
    chevGeo.rotateX(-Math.PI / 2);
    this.guide = new THREE.Group();
    this.guide.layers.set(1);
    this.chevrons = [0, 1, 2].map(() => {
      const m = new THREE.MeshBasicMaterial({ color: theme.accent, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide });
      m.toneMapped = false;
      const c = new THREE.Mesh(chevGeo, m);
      c.layers.set(1);
      this.guide.add(c);
      return c;
    });
    this.scene.add(this.guide);
    this.addDust();
    this.reset();
  }

  makeCage(mat, lineMat) {
    const g = new THREE.Group();
    const m = new THREE.Mesh(this.cageGeo, mat);
    m.castShadow = true;
    m.receiveShadow = true;
    g.add(m);
    g.add(edgeLines(this.cageGeo, lineMat, 18));
    return g;
  }

  addDust() {
    const hx = this.world.halfX, hz = this.world.halfZ;
    const n = Math.round(2600 * Math.max(1, (hx * hz) / 196)), pos = new Float32Array(n * 3); // same density on bigger planes
    const ys = this.world.decks ? this.world.decks.map((d) => d.y) : [0];
    for (let i = 0; i < n; i++) {
      pos[i * 3] = (Math.random() * 2 - 1) * hx;
      pos[i * 3 + 1] = ys[i % ys.length] + (Math.random() < 0.7 ? Math.random() * 0.25 : Math.random() * 3);
      pos[i * 3 + 2] = (Math.random() * 2 - 1) * hz;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const additive = this.theme !== THEMES.clay;
    this.dust = new THREE.Points(g, new THREE.PointsMaterial({
      color: this.theme.dust, size: 0.035, transparent: true, opacity: additive ? 0.8 : 0.5, depthWrite: false,
      blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
    }));
    this.dust.layers.set(1); // keep dust out of the chrome reflections
    this.scene.add(this.dust);
  }

  reset() {
    const w = this.world;
    this.pos = w.start.clone().setY(w.start.y + 2);
    this.vel = new THREE.Vector3();
    this.omega = new THREE.Vector3();
    this.quat = new THREE.Quaternion();
    this.safe = this.pos.clone();
    this.score = 0;
    this.banked = 0;
    this.lives = LIVES;
    this.fuel = this.level.fuel;
    this.t = 0;
    this.over = false;
    this.won = false;
    this.shake = 0;
    this.hitStop = 0;
    this.slow = 0;
    this.invuln = 0;
    this.squash = 0;
    this.pulse = 0;
    this.lineFlash = 0;
    this.fovKick = 0;
    this.chain = 0;
    this.bestChain = 0;
    this.lastCapture = -9;
    this.wasFull = false;
    this.airborne = false;
    this.coyote = 0;
    this.jumpBuf = 0;
    this.lastTick = 99;
    this.beatT = 0;
    this.beaconT = 0;
    this.balls = [];
    this.shards = [];
    this.events = [];
    this.popups = [];
    this.refillTimer = 18;
    w.ballSpawns.forEach((s) => this.spawnBall(new THREE.Vector3(s.x, s.y + RB, s.z), s));
    this.bigs = w.bigBalls.map((p) => ({ p: new THREE.Vector3(p.x, p.y + 0.62, p.z), v: new THREE.Vector3(), q: new THREE.Quaternion() }));
    w.obstacles.forEach((o) => { if (o.kind === 'bars') { o.smashed = false; o.group.visible = true; } });
    for (const hn of this.hunters) {
      Object.assign(hn, {
        pos: w.motherCage.clone().setY(w.motherCage.y + hn.cfg.size), vel: new THREE.Vector3(), omega: new THREE.Vector3(),
        quat: new THREE.Quaternion().setFromEuler(new THREE.Euler(0.4, 0.3, 0.2)),
        awake: false, stun: 0, speed: hn.cfg.speed,
      });
    }
    this.zone = 0;
    this.zoneBanked = 0;
    this.world.resetGates?.();
    this.portalIdx = -1;
    this.pickPortal();
  }

  get zoned() { return !!this.level.quotas; }
  get quota() { return this.level.quotas[this.zone]; }

  pickPortal() {
    const ps = this.world.portals;
    const cur = ps[this.portalIdx];
    let options = ps.map((p, i) => i).filter((i) => i !== this.portalIdx);
    if (this.zoned) {
      const inZone = options.filter((i) => this.portalZone(ps[i]) === this.zone);
      if (inZone.length) options = inZone;
    }
    // prefer portals far from the one just used so every bank crosses the plane
    options.sort((a, b) => (cur ? ps[b].center.distanceTo(cur.center) - ps[a].center.distanceTo(cur.center) : Math.random() - 0.5));
    this.portalIdx = options[Math.random() < 0.7 ? 0 : Math.floor(Math.random() * options.length)];
    this.portalColor = this.matchColors ? Math.floor(Math.random() * this.matchColors.length) : -1;
    const lit = this.matchColors ? this.matchColors[this.portalColor] : this.theme.portal;
    ps.forEach((p, i) => {
      const on = i === this.portalIdx;
      p.mesh.material.color.setHex(on ? lit : this.theme.portal).multiplyScalar(on ? 1 : 0.22);
      p.glow.material.color.setHex(lit);
      p.frame?.color.setHex(on ? lit : this.theme.portal).multiplyScalar(on ? 1.25 : 0.3);
      p.light.color.setHex(lit);
      p.light.intensity = on ? 4 : 0;
    });
    this.beam.material.color.setHex(this.matchColors ? lit : this.theme.accent);
  }
  portalZone(p) {
    const t = this.world.tileAt(p.center.x, p.center.z);
    return t ? t.zone ?? 0 : 0;
  }
  get portal() { return this.world.portals[this.portalIdx]; }

  spawnBall(p, spawn = null) {
    if (this.balls.length >= MAX_BALLS) return null;
    const b = { p, v: new THREE.Vector3(), state: 'field', sleep: true, spawn, noCap: 0, t: 0, c: 0 };
    if (this.matchColors) {
      // each pad holds one colour so routes can be planned
      if (spawn) spawn.pad.matchColor ??= Math.floor(Math.random() * this.matchColors.length);
      b.c = spawn ? spawn.pad.matchColor : Math.floor(Math.random() * this.matchColors.length);
    } else if (this.ballColors) b.c = Math.floor(Math.random() * this.ballColors.length);
    if (spawn) spawn.ball = b;
    this.balls.push(b);
    return b;
  }

  get inner() { return this.balls.filter((b) => b.state === 'inner'); }
  get cap() { return this.level.cap; }

  // Bubblegum ref: the striped floor sweeps up into a curved wall around the far and side edges.
  // Purely scenery: the play area stays inside the edges.
  buildStripeBowl(mats) {
    const w = this.world, hx = w.halfX, hz = w.halfZ, R = 7, up = 10;
    const mat = new THREE.MeshStandardMaterial({ map: mats.stripes, roughness: mats.floor.roughness, metalness: mats.floor.metalness, side: THREE.DoubleSide });
    const group = new THREE.Group();
    const edgeTop = (pts) => Math.max(0, ...pts.map(([x, z]) => w.heightAt(x, z)).filter((h) => h > -50));
    // one wall: runs along `len`, profile is a quarter circle then straight up
    const wall = (len, uOff, place) => {
      const segA = Math.ceil(len * 3), segV = 28;
      const g = new THREE.PlaneGeometry(len, 1, segA, segV);
      const p = g.attributes.position, uv = g.attributes.uv;
      const arc = (Math.PI / 2) * R, total = arc + up;
      for (let i = 0; i < p.count; i++) {
        const a = p.getX(i), s = (p.getY(i) + 0.5) * total;
        let out, y;
        if (s < arc) { const th = s / R; out = R * Math.sin(th); y = R * (1 - Math.cos(th)); } else { out = R; y = R + (s - arc); }
        const v = place(a, out, y);
        p.setXYZ(i, v[0], v[1], v[2]);
        uv.setXY(i, (a + uOff) / T, s / T);
      }
      g.computeVertexNormals();
      const m = new THREE.Mesh(g, mat);
      m.receiveShadow = true;
      group.add(m);
    };
    const yN = edgeTop([...Array(w.cols || 10)].map((_, i) => [-hx + (i + 0.5) * T, -hz + 0.5]));
    const yW = edgeTop([...Array(w.rows || 10)].map((_, j) => [-hx + 0.5, -hz + (j + 0.5) * T]));
    const yE = edgeTop([...Array(w.rows || 10)].map((_, j) => [hx - 0.5, -hz + (j + 0.5) * T]));
    wall(2 * hx + 2 * R, hx + R, (a, out, y) => [a, yN + y, -hz - out]); // far wall
    wall(2 * hz, hz, (a, out, y) => [-hx - out, yW + y, a]); // left
    wall(2 * hz, hz, (a, out, y) => [hx + out, yE + y, a]); // right
    return group;
  }
  probeHidden() { return [this.player, this.ballMesh, this.shardMesh, this.fx.points]; }
  get sound() { return this.app.sound; }

  popup(p, text, cls = '') { this.popups.push({ p: p.clone(), text, cls }); }

  // ---------- terrain helpers ----------
  support(x, z, r) {
    const w = this.world;
    let h = w.heightAt(x, z);
    if (h < -50) return h; // centre over a hole: tip in, the rim can't hold you
    const s = r * 0.42;
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * Math.PI * 2;
      h = Math.max(h, w.heightAt(x + Math.cos(a) * s, z + Math.sin(a) * s) - 0.02);
    }
    return h;
  }
  // true when no pit (or its stepped rim) is near: checks a ring of points at two radii
  clearOfPits(x, z, r) {
    const w = this.world;
    if (w.tileAt(x, z)?.type === 'v') return false;
    for (const rr of [r * 0.6, r]) {
      for (let k = 0; k < 16; k++) {
        const a = (k / 16) * Math.PI * 2;
        const t = w.tileAt(x + Math.cos(a) * rr, z + Math.sin(a) * rr);
        if (!t || t.type === 'v') return false;
      }
    }
    return true;
  }
  // a respawn point that is guaranteed to be away from holes
  safeSpot() {
    if (this.clearOfPits(this.safe.x, this.safe.z, 1.8)) return this.safe.clone();
    let best = null, bd = Infinity;
    for (const t of this.world.tiles) {
      if (!this.clearOfPits(t.cx, t.cz, 1.8)) continue;
      const d = (t.cx - this.safe.x) ** 2 + (t.cz - this.safe.z) ** 2;
      if (d < bd) { bd = d; best = t; }
    }
    return best ? new THREE.Vector3(best.cx, 0, best.cz) : this.world.start.clone();
  }
  contactRadius(q, scale) {
    let min = Infinity;
    for (const p of this.hull) {
      const y = _v.copy(p).applyQuaternion(q).y;
      if (y < min) min = y;
    }
    return -min * scale;
  }

  // ---------- main update ----------
  update(dt, input) {
    if (input.pressed('KeyR')) { this.reset(); this.app.hideOverlay(); }
    // hit-stop and slow-mo
    let sdt = dt;
    if (this.hitStop > 0) { this.hitStop -= dt; sdt = dt * 0.04; }
    else if (this.slow > 0) { this.slow -= dt; sdt = dt * 0.4; }

    if (!this.over) {
      this.t += sdt;
      this.fuel -= sdt;
      if (this.fuel <= 10) {
        const s = Math.ceil(this.fuel);
        if (s !== this.lastTick && s >= 0) { this.lastTick = s; this.sound?.tick(s <= 3); }
      }
      if (this.fuel <= 0) this.endRun('OUT OF FUEL');
      if (input.pressed('Space')) this.jumpBuf = 0.14;
      // trackball: mouse drag (screen pixels) becomes a velocity kick in camera space
      const mdx = input.mdx || 0, mdy = input.mdy || 0;
      if (mdx || mdy) {
        const k = 0.045, fx = -Math.sin(this.yaw), fz = -Math.cos(this.yaw), rx = Math.cos(this.yaw), rz = -Math.sin(this.yaw);
        let kx = (rx * mdx - fx * mdy) * k, kz = (rz * mdx - fz * mdy) * k;
        const L = Math.hypot(kx, kz), cap = 2.5; // one frame can't fling the cage
        if (L > cap) { kx *= cap / L; kz *= cap / L; }
        this.vel.x += kx; this.vel.z += kz;
        this.mouseSteer = 0.25;
      }
      this.mouseSteer = Math.max(0, (this.mouseSteer || 0) - sdt);
      this.aimPoint = null;
      const steps = 3, h = sdt / steps;
      for (let s = 0; s < steps; s++) this.step(h, input);
      this.jumpBuf -= sdt;

      this.refillTimer -= sdt;
      if (this.refillTimer <= 0) {
        this.refillTimer = 16;
        for (const sp of this.world.ballSpawns) {
          if (!sp.ball || sp.ball.state !== 'field' || sp.ball.p.distanceTo(_v.set(sp.x, sp.y + RB, sp.z)) > 0.3) {
            const b = this.spawnBall(new THREE.Vector3(sp.x, sp.y + RB + 0.6, sp.z), sp);
            if (b) b.sleep = false;
          }
        }
        this.balls = this.balls.filter((b) => b.state !== 'dead');
      }
      this.updateAudio(sdt);
    }
    this.updateVisuals(dt, sdt);
  }

  endRun(reason) {
    if (this.over) return;
    this.over = true;
    this.sound?.over();
    this.app.onRunOver(this, reason);
  }

  step(h, input) {
    const w = this.world;
    const inner = this.inner;
    const M = 1 + inner.length * 0.02; // payload adds a little heft, nothing sluggish
    this.invuln = Math.max(0, this.invuln - h);

    // input in camera space
    const fwd = _v.set(-Math.sin(this.yaw), 0, -Math.cos(this.yaw));
    const right = _w.set(Math.cos(this.yaw), 0, -Math.sin(this.yaw));
    const acc = new THREE.Vector3().addScaledVector(fwd, input.axisY()).addScaledVector(right, input.axisX());
    const steering = acc.lengthSq() > 0.01 || this.mouseSteer > 0;
    if (acc.lengthSq() > 1) acc.normalize();

    const cr = this.contactRadius(this.quat, PR);
    const restY = this.support(this.pos.x, this.pos.z, PR) + cr;
    const grounded = this.pos.y <= restY + 0.03;
    this.coyote = grounded ? 0.1 : this.coyote - h;

    // snappy steering: extra bite when reversing
    const sp0 = Math.hypot(this.vel.x, this.vel.z);
    let gain = (grounded ? 16 : 5) / Math.sqrt(M);
    if (steering && sp0 > 0.5 && (acc.x * this.vel.x + acc.z * this.vel.z) / sp0 < -0.2) gain *= 1.8;
    acc.multiplyScalar(gain);

    const e = 0.35 * PR;
    const gx = THREE.MathUtils.clamp((w.heightAt(this.pos.x + e, this.pos.z) - w.heightAt(this.pos.x - e, this.pos.z)) / (2 * e), -0.7, 0.7);
    const gz = THREE.MathUtils.clamp((w.heightAt(this.pos.x, this.pos.z + e) - w.heightAt(this.pos.x, this.pos.z - e)) / (2 * e), -0.7, 0.7);
    if (grounded && Math.abs(gx) < 0.69) acc.x -= G * gx * 0.4;
    if (grounded && Math.abs(gz) < 0.69) acc.z -= G * gz * 0.4;

    this.vel.x += acc.x * h;
    this.vel.z += acc.z * h;
    const damp = grounded ? 1 / (1 + (steering ? 0.7 : 2.6) * h) : 1 / (1 + 0.2 * h);
    this.vel.x *= damp; this.vel.z *= damp;
    const sp = Math.hypot(this.vel.x, this.vel.z);
    if (sp > VMAX) { this.vel.x *= VMAX / sp; this.vel.z *= VMAX / sp; }

    if (this.jumpBuf > 0 && this.coyote > 0) {
      this.vel.y = 7;
      this.jumpBuf = 0; this.coyote = 0;
      this.sound?.hop();
      this.fx.burst(_v.copy(this.pos).setY(this.pos.y - cr), 8, this.theme.spark, { speed: 2, up: 0.5, life: 0.4 });
    }
    // short hop when the button is released early
    if (this.vel.y > 0 && !input.down.has('Space')) this.vel.y -= G * 1.2 * h;

    const px = this.pos.x, pz = this.pos.z;
    this.pos.x += this.vel.x * h;
    this.pos.z += this.vel.z * h;

    let restY2 = this.support(this.pos.x, this.pos.z, PR) + this.contactRadius(this.quat, PR);
    // a terrace wall ahead is solid unless we're already above it (hopping)
    if (restY2 - this.contactRadius(this.quat, PR) > this.pos.y - this.contactRadius(this.quat, PR) + STEP_UP) {
      const nx = this.pos.x - px, nz = this.pos.z - pz, L = Math.hypot(nx, nz) || 1;
      this.pos.x = px; this.pos.z = pz;
      const vn = (this.vel.x * nx + this.vel.z * nz) / L;
      if (vn > 0) { this.vel.x -= (nx / L) * vn * 1.4; this.vel.z -= (nz / L) * vn * 1.4; if (vn > 3) this.sound?.thump(vn); }
      restY2 = this.support(px, pz, PR) + this.contactRadius(this.quat, PR);
    }
    // rolling over a pit opening: get pulled in (hopping over it is the way across)
    const overHole = this.world.heightAt(this.pos.x, this.pos.z) < -50;
    if (overHole && !this.pitCaught && this.pos.y < this.world.deckY(this.pos.x, this.pos.z) + PR + 0.45) {
      this.pitCaught = true;
      this.vel.y = Math.min(this.vel.y, -5);
      this.vel.x *= 0.45; this.vel.z *= 0.45;
    }
    if (!overHole && this.pos.y > -0.5) this.pitCaught = false;
    // below the rim of a pit the walls are solid: no popping back out
    if (this.pos.y < restY2 - PR * 0.6) {
      this.pos.x = px; this.pos.z = pz;
      this.vel.x *= -0.2; this.vel.z *= -0.2;
      restY2 = this.support(px, pz, PR) + this.contactRadius(this.quat, PR);
    }
    if (this.pos.y + this.vel.y * h > restY2 && (this.vel.y > 0 || this.pos.y > restY2 + 0.06)) {
      this.vel.y -= G * h;
      this.pos.y += this.vel.y * h;
      this.airborne = true;
    } else {
      if (this.airborne && this.vel.y < -3) this.onLand(-this.vel.y);
      this.airborne = false;
      this.vel.y = 0;
      this.pos.y += (restY2 - this.pos.y) * Math.min(1, 25 * h);
      if (restY2 > -0.01 && this.clearOfPits(this.pos.x, this.pos.z, 1.8)) this.safe.copy(this.pos);
    }

    if (this.pos.y < this.world.minY - 5) this.onVoid();

    this.collideObstacles(this.pos, this.vel, PR * 0.84, cr, true);
    this.world.keepOnRamp?.(this.pos, this.vel, PR * 0.8, this.pos.y - cr);
    const hx = w.halfX - PR, hz = w.halfZ - PR;
    if (Math.abs(this.pos.x) > hx) { this.pos.x = Math.sign(this.pos.x) * hx; this.vel.x *= -0.4; }
    if (Math.abs(this.pos.z) > hz) { this.pos.z = Math.sign(this.pos.z) * hz; this.vel.z *= -0.4; }

    for (const bb of this.bigs) this.stepBigBall(bb, h, M);
    for (const hn of this.hunters) this.stepHunter(hn, h);

    if (grounded) this.omega.set(this.vel.z, 0, -this.vel.x).divideScalar(Math.max(cr, 0.2));
    const om = this.omega.length();
    if (om > 1e-4) {
      _q.setFromAxisAngle(_v.copy(this.omega).divideScalar(om), om * h);
      this.quat.premultiply(_q).normalize();
    }

    this.stepInnerBalls(h, M);
    this.stepFieldBalls(h);

    // bank at the lit portal only
    const p = this.portal;
    if (p && this.inner.length) {
      const dx = Math.max(p.min.x - this.pos.x, 0, this.pos.x - p.max.x);
      const dz = Math.max(p.min.y - this.pos.z, 0, this.pos.z - p.max.y);
      if (Math.hypot(dx, dz) < PR + 0.9) this.bank(p);
    }

    const full = this.inner.length >= this.cap;
    if (full && !this.wasFull) {
      this.events.push({ text: 'FULL · BANK IT' });
      this.popup(this.pos, 'FULL', 'gold');
      this.sound?.tick(true);
    }
    this.wasFull = full;
  }

  onLand(v) {
    this.sound?.land(v);
    const foot = _v.copy(this.pos).setY(this.pos.y - this.contactRadius(this.quat, PR));
    this.fx.ring(foot, this.theme.spark, 1.2 + v * 0.12, 0.45, 0.7);
    this.fx.burst(foot, Math.round(v * 2), this.theme.spark, { speed: v * 0.4, up: 0.8, life: 0.45 });
    this.squash = Math.min(0.16, v / 50);
    if (v > 9) this.shake = Math.max(this.shake, 0.15);
  }

  onVoid() {
    const inner = this.inner;
    const lost = Math.ceil(inner.length / 2);
    inner.slice(0, lost).forEach((b) => (b.state = 'dead'));
    this.events.push({ text: lost ? `VOID  -${lost}` : 'VOID', warn: true });
    this.sound?.fall();
    const sp = this.safeSpot();
    this.pos.copy(sp).setY(this.world.deckY(sp.x, sp.z) + 2);
    this.vel.set(0, 0, 0);
    inner.slice(lost).forEach((b) => b.p.copy(this.pos).add(_v.set(Math.random() - 0.5, 0, Math.random() - 0.5).multiplyScalar(0.3)));
    this.shake = 0.4;
    this.invuln = Math.max(this.invuln, 1.2);
    this.app.post.kick(0.8);
  }

  sphereBlock(center, rad, pos, vel, r) {
    const d = _v.subVectors(pos, center);
    d.y *= 0.5;
    const L = d.length();
    if (L < rad + r && L > 1e-4) {
      d.divideScalar(L);
      pos.addScaledVector(d, rad + r - L);
      const vn = vel.dot(d);
      if (vn < 0) vel.addScaledVector(d, -1.4 * vn);
      return -vn;
    }
    return 0;
  }

  // ---------- hunter ----------
  stepHunter(hn, h) {
    const size = hn.cfg.size;
    if (!hn.awake) {
      if (this.t >= hn.cfg.wake) {
        hn.awake = true;
        this.events.push({ text: this.hunters.indexOf(hn) ? 'SECOND HUNTER' : 'HUNTER AWAKE', warn: true });
        this.sound?.alarm();
        this.fx.ring(_v.copy(hn.pos).setY(0.05), this.theme.danger, 6, 0.9, 0.9);
        this.shake = Math.max(this.shake, 0.2);
      }
    }
    hn.stun = Math.max(0, hn.stun - h);
    const des = new THREE.Vector3();
    if (hn.awake && !hn.stun && !this.over) {
      // aim a little ahead of the player
      // across decks it follows the ramps; on the same deck it aims a little ahead
      const nav = this.world.navTarget?.(hn.pos, this.pos);
      if (nav) des.copy(nav).sub(hn.pos).setY(0);
      else des.copy(this.pos).addScaledVector(this.vel, 0.35).sub(hn.pos).setY(0);
      if (des.lengthSq() > 1e-4) des.normalize().multiplyScalar(hn.speed);
      // steer around pits it can see ahead (it can still slide in at speed)
      const look = size * 1.3;
      const pit = (dx, dz) => this.world.heightAt(hn.pos.x + dx * look, hn.pos.z + dz * look) < -50;
      const dn = _w.copy(des).normalize();
      hn.avoidT = Math.max(0, (hn.avoidT || 0) - h);
      if (pit(dn.x, dn.z)) {
        // pick a side and stick with it for a moment, so it skirts the hole instead of dithering
        if (!hn.avoidT) hn.avoidSide = Math.random() < 0.5 ? 1 : -1;
        for (const k of [1, 2, 3, 4]) {
          let done = false;
          for (const side of [hn.avoidSide, -hn.avoidSide]) {
            const ang = side * k * 0.55, c = Math.cos(ang), sn = Math.sin(ang);
            const rx = dn.x * c - dn.z * sn, rz = dn.x * sn + dn.z * c;
            if (!pit(rx, rz)) { des.set(rx, 0, rz).multiplyScalar(hn.speed); hn.avoidSide = side; hn.avoidT = 0.6; done = true; break; }
          }
          if (done) break;
        }
      }
    }
    const a = des.sub(hn.vel).setY(0).multiplyScalar(1.6);
    if (a.length() > 7) a.setLength(7);
    hn.vel.x += a.x * h; hn.vel.z += a.z * h;
    if (hn.stun) { hn.vel.x *= 1 / (1 + 3 * h); hn.vel.z *= 1 / (1 + 3 * h); }
    const hpx = hn.pos.x, hpz = hn.pos.z;
    hn.pos.x += hn.vel.x * h; hn.pos.z += hn.vel.z * h;

    const cr = this.contactRadius(hn.quat, size);
    let rest = this.support(hn.pos.x, hn.pos.z, size) + cr;
    if (rest > hn.pos.y + STEP_UP) {
      // terrace wall: stop, and hop up it if it's chasing
      hn.pos.x = hpx; hn.pos.z = hpz;
      rest = this.support(hpx, hpz, size) + cr;
      if (hn.awake && !hn.stun && hn.pos.y <= rest + 0.06) { hn.vel.y = 8; hn.pos.y += 0.05; }
    } else if (hn.pos.y < rest - size * 0.6) {
      hn.pos.x = hpx; hn.pos.z = hpz; hn.vel.x = 0; hn.vel.z = 0;
      rest = this.support(hpx, hpz, size) + cr;
    }
    if (hn.pos.y > rest + 0.05) { hn.vel.y -= G * h; hn.pos.y += hn.vel.y * h; }
    else { hn.vel.y = 0; hn.pos.y += (rest - hn.pos.y) * Math.min(1, 20 * h); }
    if (hn.pos.y < this.world.minY - 4) {
      // lured into a pit: it climbs back out of its lair, dazed
      if (hn.awake && !this.over) {
        this.score += 150;
        this.events.push({ text: 'HUNTER FELL · +150' });
        this.sound?.fall();
      }
      hn.pos.copy(this.world.motherCage).setY(this.world.motherCage.y + size + 3);
      hn.vel.set(0, 0, 0);
      hn.stun = 2.5;
    }

    // hunters crush chrome towers in their way
    for (const o of this.world.obstacles) {
      if (o.smashed || o.kind === 'portal') continue; // portals are light: roll through them
      const qx = THREE.MathUtils.clamp(hn.pos.x, o.min.x, o.max.x), qz = THREE.MathUtils.clamp(hn.pos.z, o.min.y, o.max.y);
      let dx = hn.pos.x - qx, dz = hn.pos.z - qz;
      const L = Math.hypot(dx, dz), r = size * 0.84;
      if (L >= r) continue;
      if (o.kind === 'bars') { this.smash(o, hn.vel, false); continue; }
      if (L < 1e-5) { dx = 1; dz = 0; }
      const nx = dx / Math.max(L, 1e-5), nz = dz / Math.max(L, 1e-5);
      hn.pos.x += nx * (r - L); hn.pos.z += nz * (r - L);
      const vn = hn.vel.x * nx + hn.vel.z * nz;
      if (vn < 0) { hn.vel.x -= 1.2 * vn * nx; hn.vel.z -= 1.2 * vn * nz; }
    }
    // big chrome balls stun hunters when they hit hard
    for (const bb of this.bigs) {
      const d = _v.subVectors(bb.p, hn.pos).setY(0);
      const L = d.length(), minD = 0.62 + size * 0.84;
      if (L < minD && L > 1e-4) {
        d.divideScalar(L);
        const rel = _w.subVectors(bb.v, hn.vel).dot(d);
        bb.p.addScaledVector(d, (minD - L) * 0.7);
        hn.pos.addScaledVector(d, -(minD - L) * 0.3);
        if (rel < 0) {
          bb.v.addScaledVector(d, -1.5 * rel);
          if (-rel > 2.5 && hn.awake && !hn.stun) this.stunHunter(hn, 2.6, 'STUNNED +100');
        }
      }
    }
    for (const o of this.hunters) {
      if (o === hn) continue;
      const d = _v.subVectors(hn.pos, o.pos).setY(0);
      const L = d.length(), minD = (size + o.cfg.size) * 0.84;
      if (L < minD && L > 1e-4) hn.pos.addScaledVector(d.divideScalar(L), (minD - L) * 0.5);
    }
    const hx = this.world.halfX - size, hz = this.world.halfZ - size;
    hn.pos.x = THREE.MathUtils.clamp(hn.pos.x, -hx, hx);
    hn.pos.z = THREE.MathUtils.clamp(hn.pos.z, -hz, hz);

    hn.omega.set(hn.vel.z, 0, -hn.vel.x).divideScalar(Math.max(cr, 0.3));
    const om = hn.omega.length();
    if (om > 1e-4) {
      _q.setFromAxisAngle(_v.copy(hn.omega).divideScalar(om), om * h);
      hn.quat.premultiply(_q).normalize();
    }

    // caught?
    if (hn.awake && !hn.stun && this.invuln <= 0 && !this.over) {
      const d = _v.subVectors(this.pos, hn.pos);
      const dy = d.y;
      d.y = 0;
      if (d.length() < size * 0.72 + PR * 0.6 && Math.abs(dy) < size) this.caught(hn, d);
    }
  }

  stunHunter(hn, t, text) {
    hn.stun = t;
    this.score += 100;
    this.popup(hn.pos.clone().setY(hn.pos.y + hn.cfg.size), text, 'gold');
    this.sound?.smash();
    this.fx.burst(hn.pos, 40, this.theme.accent, { speed: 6, up: 3, life: 0.8 });
    this.hitStop = 0.08;
    this.shake = 0.3;
  }

  caught(hn, d) {
    this.lives--;
    const inner = this.inner;
    const n = inner.length;
    const dir = d.lengthSq() > 1e-4 ? d.normalize() : new THREE.Vector3(1, 0, 0);
    // payload bursts out of the windows; it can be picked up again
    inner.forEach((b) => {
      const s = new THREE.Vector3(Math.random() - 0.5, 0.8 + Math.random(), Math.random() - 0.5).normalize();
      b.state = 'field'; b.sleep = false; b.noCap = 1.0;
      b.p.copy(this.pos).addScaledVector(s, PR * 1.05);
      b.v.copy(s).multiplyScalar(3 + Math.random() * 3);
    });
    this.vel.copy(dir).multiplyScalar(11).setY(6);
    this.invuln = 2.2;
    hn.stun = 1.3;
    hn.vel.multiplyScalar(-0.3);
    this.shake = 0.55;
    this.hitStop = 0.14;
    this.fovKick = 5;
    this.chain = 0;
    this.app.post.kick(1.2);
    this.app.post.flash(0.25);
    this.sound?.thump(8);
    if (n) this.sound?.spill(n);
    this.fx.burst(this.pos, 50, this.theme.danger, { speed: 7, up: 3, life: 0.9 });
    this.fx.ring(_v.copy(this.pos).setY(0.05), this.theme.danger, 4, 0.6, 1);
    this.events.push({ text: n ? `CAUGHT · -${n}` : 'CAUGHT', warn: true });
    if (this.lives <= 0) this.endRun('CAUGHT');
  }

  stepBigBall(bb, h, M) {
    const r = 0.62;
    const d = _v.subVectors(bb.p, this.pos);
    d.y = 0;
    const L = d.length(), minD = r + PR * 0.84;
    if (L < minD && L > 1e-4) {
      d.divideScalar(L);
      const over = minD - L;
      const mb = 1.6;
      bb.p.addScaledVector(d, over * M / (M + mb));
      this.pos.addScaledVector(d, -over * mb / (M + mb));
      const rel = _w.subVectors(this.vel, bb.v).dot(d);
      if (rel > 0) {
        const j = (1.7 * rel) / (1 / M + 1 / mb);
        bb.v.addScaledVector(d, j / mb);
        this.vel.addScaledVector(d, -j / M);
        if (rel > 3) { this.sound?.clack(rel * 2, 0.4); this.shake = Math.max(this.shake, 0.08); }
      }
    }
    const gy = this.world.heightAt(bb.p.x, bb.p.z) + r;
    if (bb.p.y > gy + 0.01) bb.v.y -= G * h; else { bb.p.y = gy; bb.v.y = 0; }
    bb.v.x /= 1 + 0.45 * h; bb.v.z /= 1 + 0.45 * h;
    bb.p.addScaledVector(bb.v, h);
    if (bb.p.y < this.world.minY - 6) { const home = this.world.bigBalls[this.bigs.indexOf(bb)]; bb.p.copy(home).setY(home.y + 3); bb.v.set(0, 0, 0); }
    this.collideObstacles(bb.p, bb.v, r, r, false);
    const hx = this.world.halfX - r, hz = this.world.halfZ - r;
    if (Math.abs(bb.p.x) > hx) { bb.p.x = Math.sign(bb.p.x) * hx; bb.v.x *= -0.6; }
    if (Math.abs(bb.p.z) > hz) { bb.p.z = Math.sign(bb.p.z) * hz; bb.v.z *= -0.6; }
    const sp = Math.hypot(bb.v.x, bb.v.z);
    if (sp > 1e-3) {
      _q.setFromAxisAngle(_w.set(bb.v.z, 0, -bb.v.x).divideScalar(sp), (sp / r) * h);
      bb.q.premultiply(_q);
    }
  }

  collideObstacles(pos, vel, r, cr, isPlayer) {
    for (const o of this.world.obstacles) {
      if (o.smashed || o.kind === 'portal') continue; // portals are light: roll through them
      if (o.top < pos.y - cr + 0.25 * r) continue;
      const qx = THREE.MathUtils.clamp(pos.x, o.min.x, o.max.x);
      const qz = THREE.MathUtils.clamp(pos.z, o.min.y, o.max.y);
      let dx = pos.x - qx, dz = pos.z - qz;
      let L = Math.hypot(dx, dz);
      if (L >= r) continue;
      if (L < 1e-5) { dx = 1; dz = 0; L = 1e-5; }
      const nx = dx / L, nz = dz / L;
      pos.x += nx * (r - L); pos.z += nz * (r - L);
      const vn = vel.x * nx + vel.z * nz;
      if (vn < 0) {
        vel.x -= 1.4 * vn * nx; vel.z -= 1.4 * vn * nz;
        // ram a bar cluster near full speed and it shatters
        if (isPlayer && o.kind === 'bars' && -vn > 5.5) { this.smash(o, vel, true); continue; }
        if (isPlayer && -vn > 2) {
          this.sound?.thump(-vn);
          this.fx.burst(_v.set(pos.x - nx * r, pos.y, pos.z - nz * r), Math.round(-vn * 2), this.theme.spark, { speed: 2, up: 1.5, life: 0.4 });
          if (-vn > 6) this.spill(Math.ceil(this.inner.length * 0.25), 2.5);
          this.shake = Math.max(this.shake, Math.min(0.25, -vn * 0.03));
        }
      }
    }
  }

  smash(o, vel, byPlayer) {
    o.smashed = true;
    o.group.visible = false;
    this.sound?.smash();
    const d = o.bars[0] ? o.bars[0].getWorldPosition(new THREE.Vector3()).distanceTo(this.pos) : 99;
    if (d < 9) { this.shake = Math.max(this.shake, 0.3 * (1 - d / 9)); this.hitStop = Math.max(this.hitStop, 0.05); }
    if (byPlayer) this.score += 50;
    for (const bar of o.bars) {
      const bp = bar.getWorldPosition(new THREE.Vector3());
      this.fx.burst(bp, 6, 0xffffff, { speed: 4, up: 3, life: 0.6 });
      for (let i = 0; i < 6 && this.shards.length < 400; i++) {
        const hgt = bar.geometry.parameters.height;
        this.shards.push({
          p: bp.clone().add(new THREE.Vector3((Math.random() - 0.5) * 0.3, (Math.random() - 0.5) * hgt, (Math.random() - 0.5) * 0.3)),
          v: new THREE.Vector3((Math.random() - 0.5) * 6, Math.random() * 6, (Math.random() - 0.5) * 6).addScaledVector(vel, 0.6),
          r: new THREE.Euler(Math.random() * 6, Math.random() * 6, 0),
          s: 0.5 + Math.random() * 1.5, life: 2.5,
        });
      }
    }
  }

  spill(n, power) {
    const inner = this.inner;
    const k = Math.min(n, inner.length);
    for (let i = 0; i < k; i++) {
      const b = inner[i];
      const dir = new THREE.Vector3(Math.random() - 0.5, 0.6 + Math.random(), Math.random() - 0.5).normalize();
      b.state = 'field'; b.sleep = false; b.noCap = 1.2;
      b.p.copy(this.pos).addScaledVector(dir, PR * 1.05);
      b.v.copy(dir).multiplyScalar(power + Math.random() * 2).addScaledVector(this.vel, 0.6);
    }
    if (k > 0) {
      this.events.push({ text: `SPILL -${k}`, warn: true });
      this.sound?.spill(k);
    }
  }

  bank(portal) {
    const inner = this.inner;
    const n = inner.length;
    const full = n >= this.cap;
    const match = this.matchColors ? inner.filter((b) => b.c === this.portalColor).length : 0;
    const pts = n * 10 * (full ? 2 : 1) + this.bestChain * 5 + match * 25;
    this.score += pts;
    this.banked += n;
    this.fuel = Math.min(FUEL_CAP, this.fuel + 5 + n * 1.0 + match * 0.5);
    this.lastTick = 99;
    inner.forEach((b, i) => {
      b.state = 'bank';
      b.t = -i * 0.045;
      b.from = b.p.clone();
      b.to = portal.center;
    });
    this.popup(portal.center.clone().setY(portal.center.y + 1.6), `+${pts}${full ? '  FULL ×2' : ''}${match ? `  ${match} MATCH` : ''}`, 'big');
    this.events.push({ text: `BANK ${n} · +${Math.round(5 + n)}s FUEL` });
    this.sound?.bank(n);
    this.app.post.flash(0.18);
    this.fx.ring(_v.copy(portal.center).setY(0.05), this.theme.accent, 5, 0.8, 1);
    this.fx.burst(portal.center, 60, this.theme.accent, { speed: 5, up: 4, life: 1.0 });
    this.fovKick = 3;
    this.bestChain = 0;
    this.chain = 0;
    for (const hn of this.hunters) hn.speed = Math.min(7, hn.speed + hn.cfg.ramp);
    let cleared = this.banked >= this.level.goal;
    if (this.zoned) {
      this.zoneBanked += n;
      cleared = false;
      if (this.zoneBanked >= this.quota) {
        if (this.zone >= this.level.quotas.length - 1) cleared = true;
        else {
          this.world.openGate(this.zone);
          this.zone++;
          this.zoneBanked = 0;
          this.events.push({ text: `GATE OPEN · ZONE ${this.zone + 1}` });
          this.popup(portal.center.clone().setY(portal.center.y + 2.6), 'GATE OPEN — MOVE ON', 'gold');
          this.sound?.tierUp(Math.min(3, this.zone + 1));
          this.fuel = Math.min(FUEL_CAP, this.fuel + 10);
        }
      }
    }
    if (cleared) {
      this.over = true;
      this.won = true;
      this.slow = 1.2;
      this.sound?.tierUp(1);
      this.app.onLevelClear(this);
    } else {
      this.pickPortal();
    }
  }

  onCapture(b) {
    const now = this.t;
    this.chain = now - this.lastCapture < 1.2 ? this.chain + 1 : 1;
    this.lastCapture = now;
    this.bestChain = Math.max(this.bestChain, this.chain);
    this.sound?.capture(this.chain - 1);
    this.fx.burst(b.p, 10, this.theme.spark, { speed: 2.2, up: 1.6, life: 0.5 });
    this.pulse = 0.14;
    this.lineFlash = 1;
    this.score += this.chain;
    if (this.chain >= 3) this.popup(this.pos.clone().setY(this.pos.y + 0.9), `×${this.chain}`, this.chain >= 8 ? 'gold' : '');
  }

  stepInnerBalls(h, M) {
    const inner = this.inner;
    const Rin = PR * 0.64 - RB;
    for (const b of inner) {
      b.v.y -= G * h;
      b.p.addScaledVector(b.v, h);
      const d = _v.subVectors(b.p, this.pos);
      const L = d.length();
      if (L > Rin) {
        d.divideScalar(L);
        b.p.copy(this.pos).addScaledVector(d, Rin);
        const surf = new THREE.Vector3().crossVectors(this.omega, _w.copy(d).multiplyScalar(Rin)).add(this.vel);
        const rel = b.v.clone().sub(surf);
        const vn = rel.dot(d);
        if (vn > 0) {
          b.v.addScaledVector(d, -1.35 * vn);
          const vt = rel.addScaledVector(d, -vn);
          b.v.addScaledVector(vt, -0.22);
          const k = (1.35 * vn * 0.02) / M;
          this.vel.x += d.x * k; this.vel.z += d.z * k;
          if (vn > 1.4) this.sound?.clack(vn);
        }
      }
    }
    for (let i = 0; i < inner.length; i++) {
      for (let j = i + 1; j < inner.length; j++) {
        const a = inner[i], c = inner[j];
        const d = _v.subVectors(c.p, a.p);
        const L = d.length();
        if (L < 2 * RB && L > 1e-6) {
          d.divideScalar(L);
          const o = (2 * RB - L) / 2;
          a.p.addScaledVector(d, -o); c.p.addScaledVector(d, o);
          const rv = _w.subVectors(c.v, a.v).dot(d);
          if (rv < 0) {
            a.v.addScaledVector(d, rv * 0.9); c.v.addScaledVector(d, -rv * 0.9);
            if (rv < -0.9) this.sound?.tink(-rv);
          }
        }
      }
    }
  }

  stepFieldBalls(h) {
    const w = this.world;
    let room = this.cap - this.inner.length;
    for (const b of this.balls) {
      if (b.state === 'bank') {
        b.t += h / 0.7;
        if (b.t > 0) {
          const t = Math.min(b.t, 1);
          b.p.lerpVectors(b.from, b.to, t);
          b.p.y += Math.sin(t * Math.PI) * 2.2;
          if (t >= 1) { b.state = 'dead'; this.fx.burst(b.to, 3, this.theme.accent, { speed: 1.5, up: 1, life: 0.4 }); }
        }
        continue;
      }
      if (b.state !== 'field') continue;
      if (b.noCap > 0) b.noCap -= h;
      const d = _v.subVectors(b.p, this.pos);
      const L = d.length();
      if (L < PR * 1.05 + RB) {
        if (room > 0 && b.noCap <= 0) {
          b.state = 'inner';
          b.sleep = false;
          room--;
          if (L > PR * 0.5) b.p.copy(this.pos).addScaledVector(d.divideScalar(L), PR * 0.5);
          b.v.copy(this.vel);
          this.onCapture(b);
          continue;
        } else if (L > 1e-4) {
          d.divideScalar(L);
          b.p.copy(this.pos).addScaledVector(d, PR + RB);
          b.v.addScaledVector(d, 2).addScaledVector(this.vel, 0.4);
          b.sleep = false;
        }
      }
      for (const bb of this.bigs) {
        const e = _w.subVectors(b.p, bb.p);
        const l2 = e.length();
        if (l2 < 0.62 + RB && l2 > 1e-4) {
          e.divideScalar(l2);
          b.p.copy(bb.p).addScaledVector(e, 0.62 + RB);
          b.v.addScaledVector(e, 1.5).addScaledVector(bb.v, 0.6);
          b.sleep = false;
        }
      }
      for (const hn of this.hunters) {
        const e = _w.subVectors(b.p, hn.pos);
        const l2 = e.length(), rr = hn.cfg.size * 0.95;
        if (l2 < rr && l2 > 1e-4) {
          e.divideScalar(l2);
          b.p.copy(hn.pos).addScaledVector(e, rr);
          b.v.addScaledVector(e, 2).addScaledVector(hn.vel, 0.8);
          b.sleep = false;
        }
      }
      if (b.sleep) continue;
      const px = b.p.x, pz = b.p.z;
      b.v.y -= G * h;
      b.p.addScaledVector(b.v, h);
      const gy = w.heightAt(b.p.x, b.p.z);
      if (b.p.y - RB < gy) {
        if (gy - (b.p.y - RB) > 0.14) {
          b.p.x = px; b.p.z = pz; b.v.x *= -0.4; b.v.z *= -0.4;
        } else {
          b.p.y = gy + RB;
          b.v.y = b.v.y < -1.5 ? -b.v.y * 0.35 : 0;
          b.v.x /= 1 + 1.4 * h; b.v.z /= 1 + 1.4 * h;
          const e = 0.15;
          b.v.x -= (w.heightAt(b.p.x + e, b.p.z) - w.heightAt(b.p.x - e, b.p.z)) / (2 * e) * G * 0.3 * h;
          b.v.z -= (w.heightAt(b.p.x, b.p.z + e) - w.heightAt(b.p.x, b.p.z - e)) / (2 * e) * G * 0.3 * h;
          if (b.v.lengthSq() < 0.004) b.sleep = true;
        }
      }
      this.collideObstacles(b.p, b.v, RB, RB, false);
      const hx = w.halfX - RB, hz = w.halfZ - RB;
      if (Math.abs(b.p.x) > hx) { b.p.x = Math.sign(b.p.x) * hx; b.v.x *= -0.5; }
      if (Math.abs(b.p.z) > hz) { b.p.z = Math.sign(b.p.z) * hz; b.v.z *= -0.5; }
      if (b.p.y < this.world.minY - 6) b.state = 'dead';
    }
  }

  // ---------- audio state ----------
  updateAudio(dt) {
    const s = this.sound;
    if (!s) return;
    let near = Infinity;
    for (const hn of this.hunters) if (hn.awake && !hn.stun) near = Math.min(near, hn.pos.distanceTo(this.pos));
    this.danger = THREE.MathUtils.clamp(1 - (near - 2) / 6, 0, 1);
    if (this.danger > 0) {
      this.beatT -= dt;
      if (this.beatT <= 0) {
        s.beat(this.danger);
        this.beatT = THREE.MathUtils.lerp(0.9, 0.32, this.danger);
      }
    }
  }

  // ---------- visuals ----------
  updateVisuals(dt, sdt) {
    const th = this.theme;
    this.pulse = Math.max(0, this.pulse - dt);
    this.squash = Math.max(0, this.squash - dt * 0.8);
    this.lineFlash = Math.max(0, this.lineFlash - dt * 5);
    this.fovKick = Math.max(0, this.fovKick - dt * 8);

    this.player.position.copy(this.pos);
    this.player.quaternion.copy(this.quat);
    const ps = PR * (1 + this.pulse * 0.5);
    this.player.scale.set(ps * (1 + this.squash * 0.5), ps * (1 - this.squash), ps * (1 + this.squash * 0.5));
    this.player.visible = this.invuln <= 0 || Math.floor(this.invuln * 14) % 2 === 0;
    const fill = this.inner.length / this.cap;
    this.playerLineMat.color.setHex(th.cageLine).lerp(new THREE.Color(th.accent), fill >= 1 ? 1 : Math.max(0, fill - 0.6) / 0.4 * 0.6)
      .lerp(new THREE.Color(0xffffff), this.lineFlash * 0.7).multiplyScalar(this.mats.playerGlow);

    const time = performance.now() / 1000;
    for (const hn of this.hunters) {
      hn.group.position.copy(hn.pos);
      hn.group.quaternion.copy(hn.quat);
      const base = new THREE.Color(th.hunterLine);
      if (!hn.awake) base.multiplyScalar(0.25 + 0.15 * Math.sin(time * 3));
      else if (hn.stun) base.lerp(new THREE.Color(0x888888), 0.7).multiplyScalar(0.5 + 0.5 * Math.abs(Math.sin(time * 20)));
      hn.lineMat.color.copy(base).multiplyScalar(this.mats.glow);
    }

    if (this.aimPoint && !this.over) {
      const gy = this.world.heightAt(this.aimPoint.x, this.aimPoint.z);
      this.aimMark.position.set(this.aimPoint.x, (gy > -50 ? gy : this.aimPoint.y) + 0.04, this.aimPoint.z);
      this.aimMark.visible = true;
    } else this.aimMark.visible = false;

    // guide chevrons: faint while carrying, bright when the game wants you to bank
    const prompt = this.promptText();
    const gp = this.portal;
    const strength = this.over || !gp ? 0 : prompt ? 1 : this.inner.length ? 0.35 : 0;
    if (gp && strength > 0) {
      // point along the ramp route when the portal is on another deck
      const via = this.world.navTarget?.(this.pos, gp.center) || gp.center;
      const dir = _v.set(via.x - this.pos.x, 0, via.z - this.pos.z);
      const dist = dir.length();
      dir.divideScalar(Math.max(dist, 1e-3));
      const ang = Math.atan2(-dir.z, dir.x);
      this.chevrons.forEach((c, k) => {
        const d = PR + 0.55 + k * 0.55;
        const x = this.pos.x + dir.x * d, z = this.pos.z + dir.z * d;
        const gy = this.world.heightAt(x, z);
        c.position.set(x, (gy > -50 ? gy : this.pos.y - PR) + 0.03, z);
        c.rotation.y = ang;
        const wave = 0.35 + 0.65 * Math.max(0, Math.sin(time * 6 - k * 0.9));
        c.material.opacity = strength * wave * (dist > d + 0.5 ? 1 : 0);
      });
    } else this.chevrons.forEach((c) => (c.material.opacity = 0));

    // active portal beacon
    const p = this.portal;
    if (p) {
      this.beam.position.set(p.center.x, 11, p.center.z); // floats above the gate, never touches the floor
      this.beam.rotation.y += dt * 0.6;
      this.beam.material.opacity = 0.14 + 0.08 * Math.sin(time * 4);
      this.beam.visible = !this.over;
      p.glow.material.opacity = 0.12 + 0.08 * Math.sin(time * 4);
      this.world.portals.forEach((q) => { if (q !== p) q.glow.material.opacity = 0; });
      this.beaconT -= dt;
      if (this.beaconT <= 0 && !this.over) { this.beaconT = 1.1; this.fx.ring(_v.copy(p.center).setY(0.05), th.accent, 2.6, 1.0, 0.7); }
    }

    const m4 = new THREE.Matrix4();
    let i = 0;
    for (const b of this.balls) {
      if (b.state === 'dead') continue;
      const s = b.state === 'bank' ? Math.max(0.01, 1 - Math.max(0, b.t) ** 3) : 1;
      m4.makeScale(s, s, s).setPosition(b.p);
      if (this.ballColors) this.ballMesh.setColorAt(i, _col.setHex(this.ballColors[b.c]));
      this.ballMesh.setMatrixAt(i++, m4);
    }
    this.ballMesh.count = i;
    this.ballMesh.instanceMatrix.needsUpdate = true;
    if (this.ballMesh.instanceColor) this.ballMesh.instanceColor.needsUpdate = true;
    this.world.update(sdt);
    if (this.balls.length > 300) this.balls = this.balls.filter((b) => b.state !== 'dead');

    this.bigs.forEach((bb, k) => {
      this.bigBallMeshes[k].position.copy(bb.p);
      this.bigBallMeshes[k].quaternion.copy(bb.q);
    });

    let si = 0;
    for (const s of this.shards) {
      s.life -= sdt;
      s.v.y -= G * sdt;
      s.p.addScaledVector(s.v, sdt);
      const gy = this.world.heightAt(s.p.x, s.p.z);
      if (s.p.y < gy + 0.04) { s.p.y = gy + 0.04; s.v.multiplyScalar(0.5); s.v.y *= -0.3; }
      s.r.x += sdt * s.v.x; s.r.y += sdt * s.v.z;
      const sc = s.s * Math.min(1, s.life);
      m4.compose(s.p, _q.setFromEuler(s.r), _w.set(sc, sc * 2.5, sc));
      this.shardMesh.setMatrixAt(si++, m4);
    }
    this.shards = this.shards.filter((s) => s.life > 0);
    this.shardMesh.count = si;
    this.shardMesh.instanceMatrix.needsUpdate = true;

    this.fx.update(sdt);
    this.rig.position.set(this.pos.x, 0, this.pos.z);

    // camera: leads the motion, widens with speed
    const speed = Math.hypot(this.vel.x, this.vel.z);
    const dist = 12 + this.camExtra;
    const target = this.camTarget || (this.camTarget = this.pos.clone());
    // camera height follows the deck underfoot, plus half of any hop
    const base = this.world.deckY(this.pos.x, this.pos.z);
    this.camY = this.camY === undefined ? base : this.camY + (base - this.camY) * Math.min(1, dt * 2.5);
    const goal = _v.set(this.pos.x + this.vel.x * 0.28, this.camY + Math.max(0, (this.pos.y - base) * 0.5), this.pos.z + this.vel.z * 0.28);
    target.lerp(goal, 1 - Math.exp(-dt * 4.5));
    // the lens widens with speed; the near-isometric view (view.js) turns that into a far camera
    // with a matching narrow lens
    const fov = 30 + (speed / VMAX) * 4 + this.fovKick;
    this.baseFov = this.baseFov === undefined ? fov : this.baseFov + (fov - this.baseFov) * Math.min(1, dt * 6);
    const lens = viewLens(dist, this.baseFov);
    const off = _w.set(Math.sin(this.yaw) * Math.cos(this.pitch), Math.sin(this.pitch), Math.cos(this.yaw) * Math.cos(this.pitch));
    this.camera.position.copy(target).addScaledVector(off, lens.dist);
    if (this.shake > 0) {
      this.shake = Math.max(0, this.shake - dt);
      this.camera.position.add(new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).multiplyScalar(this.shake * 0.6));
    }
    this.camera.lookAt(target);
    if (Math.abs(this.camera.fov - lens.fov) > 0.001) { this.camera.fov = lens.fov; this.camera.updateProjectionMatrix(); }
    this.scene.fog.near = th.fogNear + lens.fogShift;
    this.scene.fog.far = th.fogFar + lens.fogShift;
    this.focusDistance = this.camera.position.distanceTo(this.pos);

    this.sun.position.copy(target).add(_v.set(...th.sunDir));
    this.sun.target.position.copy(target);
  }

  get focus() { return this.pos; }

  resize(w, h) {
    for (const m of this.mirrors || []) m.getRenderTarget().setSize(Math.round(w * 0.5), Math.round(h * 0.5));
  }

  // what the player should do right now, or null when nothing is urgent
  promptText() {
    if (this.over) return null;
    const load = this.inner.length;
    if (load >= this.cap) return 'LOAD FULL — BANK IT AT THE LIT PORTAL';
    if (this.fuel <= 15 && load > 0) return 'FUEL LOW — BANK TO REFUEL';
    if (this.fuel <= 15) return 'FUEL LOW — GRAB MARBLES, THEN BANK';
    return null;
  }

  hud() {
    const lives = '◆'.repeat(Math.max(0, this.lives)) + '◇'.repeat(Math.max(0, LIVES - this.lives));
    return {
      mode: 'CAGE',
      title: this.level.title,
      lines: [
        ['SCORE', this.score.toLocaleString()],
        this.zoned
          ? [`ZONE ${this.zone + 1}/${this.level.quotas.length}`, `${this.zoneBanked} / ${this.quota}`]
          : ['BANKED', `${this.banked} / ${this.level.goal}`],
        ['LOAD', `${this.inner.length} / ${this.cap}`],
        ['LIVES', lives],
        ...(this.matchColors && this.portalColor >= 0
          ? [['MATCH', `<i class="swatch" style="--sw:#${this.matchColors[this.portalColor].toString(16).padStart(6, '0')}"></i>`]] : []),
      ],
      fill: this.inner.length / this.cap,
      fuel: this.fuel / FUEL_CAP,
      fuelText: `${Math.max(0, Math.ceil(this.fuel))}s`,
      fuelLow: this.fuel <= 10,
      target: this.portal && !this.over ? this.portal.center : null,
      targetDist: this.portal ? Math.hypot(this.portal.center.x - this.pos.x, this.portal.center.z - this.pos.z) : 0,
      prompt: this.promptText(),
      markerLabel: this.inner.length >= this.cap ? 'BANK IT' : this.fuel <= 15 ? 'REFUEL' : 'PORTAL',
      danger: this.danger || 0,
      events: this.events.splice(0),
      popups: this.popups.splice(0),
    };
  }

  // debug / screenshot helpers
  debugFill(n) {
    for (let i = 0; i < n; i++) {
      const b = this.spawnBall(this.pos.clone().add(new THREE.Vector3((Math.random() - 0.5) * 0.3, (Math.random() - 0.5) * 0.3, (Math.random() - 0.5) * 0.3)));
      if (b) { b.state = 'inner'; b.sleep = false; }
    }
  }
  teleport(x, z) { this.pos.set(x, this.world.deckY(x, z) + 2, z); this.vel.set(0, 0, 0); this.camTarget = null; this.camY = undefined; }
  hunterTo(x, z, i = 0) { const hn = this.hunters[i]; hn.pos.set(x, hn.cfg.size, z); hn.vel.set(0, 0, 0); }
}
