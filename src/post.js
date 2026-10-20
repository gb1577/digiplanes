import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { BokehPass } from 'three/addons/postprocessing/BokehPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';

// Film look from the ref: chromatic fringe, vignette, grain, lifted blue blacks.
const GradeShader = {
  uniforms: {
    tDiffuse: { value: null },
    uTime: { value: 0 },
    uRes: { value: new THREE.Vector2(1, 1) },
    uFlash: { value: 0 },
    uKick: { value: 0 },
    uCA: { value: 1 },
    uLift: { value: 0.6 },
    uPencil: { value: 0 },
  },
  vertexShader: /* glsl */`
    varying vec2 vUv;
    void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: /* glsl */`
    uniform sampler2D tDiffuse; uniform float uTime; uniform vec2 uRes; uniform float uFlash; uniform float uKick; uniform float uCA; uniform float uLift; uniform float uPencil;
    varying vec2 vUv;
    float hash0(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
    float vnoise(vec2 p) {
      vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
      return mix(mix(hash0(i), hash0(i + vec2(1, 0)), f.x), mix(hash0(i + vec2(0, 1)), hash0(i + vec2(1, 1)), f.x), f.y);
    }
    // graphite on paper (paradox plane): grey tone, cross-hatching in the shadows, fibrous paper grain
    vec3 pencil(vec3 c, vec2 px) {
      float lum = dot(c, vec3(0.299, 0.587, 0.114));
      float grain = vnoise(vec2(px.x * 0.9 + px.y * 0.35, px.y * 0.06 - px.x * 0.02)) * 0.6 + vnoise(px * 0.5) * 0.4;
      float h1 = abs(fract((px.x + px.y) * 0.16 + grain * 0.25) - 0.5) * 2.0;
      float h2 = abs(fract((px.x - px.y) * 0.16 + grain * 0.25) - 0.5) * 2.0;
      float h3 = abs(fract(px.x * 0.2 + grain * 0.3) - 0.5) * 2.0;
      float ink = 1.0;
      ink *= mix(1.0, 0.55 + 0.45 * smoothstep(0.1, 0.6, h1), smoothstep(0.72, 0.4, lum));
      ink *= mix(1.0, 0.55 + 0.45 * smoothstep(0.1, 0.6, h2), smoothstep(0.42, 0.18, lum));
      ink *= mix(1.0, 0.6 + 0.4 * smoothstep(0.1, 0.6, h3), smoothstep(0.2, 0.05, lum));
      float tone = clamp(pow(lum, 0.85) * 1.12 + 0.06, 0.0, 1.0);
      return vec3(tone * ink * (0.84 + 0.16 * grain));
    }
    float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233)) + uTime * 3.1) * 43758.5453); }
    void main() {
      vec2 d = vUv - 0.5;
      float r2 = dot(d, d);
      vec2 off = d * (r2 * 0.012 * uCA + uKick * 0.02);
      vec3 col;
      col.r = texture2D(tDiffuse, vUv + off).r;
      col.g = texture2D(tDiffuse, vUv).g;
      col.b = texture2D(tDiffuse, vUv - off).b;
      col = mix(col, col * vec3(0.92, 0.95, 1.08) + vec3(0.015, 0.012, 0.05), uLift);
      if (uPencil > 0.0) col = mix(col, pencil(col, vUv * uRes), uPencil);
      float vig = smoothstep(0.95, 0.25, r2 * 1.9);
      col *= mix(0.62, 1.0, vig);
      col += (hash(vUv * uRes) - 0.5) * 0.055;
      col += uFlash * vec3(0.9, 0.95, 1.0);
      gl_FragColor = vec4(col, 1.0);
    }`,
};

export class Post {
  constructor(renderer, w, h) {
    this.renderer = renderer;
    this.composer = new EffectComposer(renderer, new THREE.WebGLRenderTarget(w, h, { type: THREE.HalfFloatType, samples: 4 }));
    this.renderPass = new RenderPass(new THREE.Scene(), new THREE.PerspectiveCamera());
    this.bokeh = new BokehPass(new THREE.Scene(), new THREE.PerspectiveCamera(), { focus: 15, aperture: 0.0014, maxblur: 0.007 });
    this.bloom = new UnrealBloomPass(new THREE.Vector2(w, h), 0.32, 0.4, 0.92);
    this.grade = new ShaderPass(GradeShader);
    this.composer.addPass(this.renderPass);
    this.composer.addPass(this.bokeh);
    this.composer.addPass(this.bloom);
    this.composer.addPass(new OutputPass());
    this.composer.addPass(this.grade);
  }
  setSize(w, h, dpr) {
    this.composer.setPixelRatio(dpr);
    this.composer.setSize(w, h);
    this.grade.uniforms.uRes.value.set(w * dpr, h * dpr);
  }
  render(scene, camera, focus, dt) {
    this.renderPass.scene = scene;
    this.renderPass.camera = camera;
    this.bokeh.scene = scene;
    this.bokeh.camera = camera;
    this.bokeh.uniforms.focus.value = focus;
    this.bokeh.uniforms.aspect.value = camera.aspect;
    this.grade.uniforms.uTime.value += dt;
    const f = this.grade.uniforms.uFlash;
    f.value = Math.max(0, f.value - dt * 2.5);
    const k = this.grade.uniforms.uKick;
    k.value = Math.max(0, k.value - dt * 3);
    this.composer.render(dt);
  }
  flash(v = 0.35) { this.grade.uniforms.uFlash.value = v; }
  kick(v = 1) { this.grade.uniforms.uKick.value = Math.max(this.grade.uniforms.uKick.value, v); }
}
