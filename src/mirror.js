import * as THREE from 'three';
import { Reflector } from 'three/addons/objects/Reflector.js';

// Soft planar reflection laid over the glossy floor (spectrum ref): only on solid tiles,
// so pits and voids stay dark. Added on top of the floor with additive blending.
const MirrorShader = {
  name: 'SoftMirror',
  uniforms: {
    color: { value: null },
    tDiffuse: { value: null },
    textureMatrix: { value: null },
    strength: { value: 0.5 },
    blur: { value: 0.0022 },
  },
  vertexShader: Reflector.ReflectorShader.vertexShader,
  fragmentShader: /* glsl */`
    uniform vec3 color;
    uniform sampler2D tDiffuse;
    uniform float strength;
    uniform float blur;
    varying vec4 vUv;
    #include <logdepthbuf_pars_fragment>
    void main() {
      #include <logdepthbuf_fragment>
      vec2 uv = vUv.xy / vUv.w;
      vec3 sum = vec3(0.0);
      float wsum = 0.0;
      for (int x = -3; x <= 3; x++) {
        for (int y = -3; y <= 3; y++) {
          float w = 1.0 - length(vec2(x, y)) / 4.5;
          sum += texture2D(tDiffuse, uv + vec2(x, y) * blur).rgb * w;
          wsum += w;
        }
      }
      gl_FragColor = vec4(sum / wsum * color * strength, 1.0);
      #include <colorspace_fragment>
    }`,
};

// Terraced planes have one mirror per level. Each mirror renders the scene, and without a guard the
// other mirrors in view render again inside that pass (nested, overwriting each other's textures
// mid-frame) - that's the flicker. Only one mirror renders at a time, and the others are hidden
// from its reflection.
let mirrorBusy = false;

export function buildMirror(world, strength, width, height, elev = 0) {
  const pos = [];
  for (const t of world.tiles) {
    if (t.type === 'r' || t.type === 'v') continue;
    if ((t.e || 0) !== elev) continue; // one mirror per terrace level
    const h = 1; // tile half size (T = 2)
    const x0 = t.cx - h, x1 = t.cx + h, y0 = -t.cz - h, y1 = -t.cz + h;
    pos.push(x0, y0, 0, x1, y0, 0, x1, y1, 0, x0, y0, 0, x1, y1, 0, x0, y1, 0);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  const mirror = new Reflector(geo, {
    shader: MirrorShader,
    textureWidth: Math.round(width * 0.5),
    textureHeight: Math.round(height * 0.5),
    color: 0xffffff,
    clipBias: 0.003,
  });
  const m = mirror.material;
  m.uniforms.strength.value = strength;
  m.transparent = true;
  m.blending = THREE.AdditiveBlending;
  m.depthWrite = false;
  mirror.rotation.x = -Math.PI / 2;
  mirror.position.y = elev + 0.003;
  mirror.camera.layers.enable(1); // reflect line work and sparks too
  mirror.layers.set(1); // main camera only: the chrome probe must not trigger extra mirror renders
  mirror.renderOrder = 1;
  const render = mirror.onBeforeRender;
  mirror.onBeforeRender = function (renderer, scene, camera) {
    if (mirrorBusy) return;
    mirrorBusy = true;
    const others = (scene.userData.mirrors || []).filter((o) => o !== mirror && o.visible);
    others.forEach((o) => { o.visible = false; });
    try { render.call(this, renderer, scene, camera); } finally {
      others.forEach((o) => { o.visible = true; });
      mirrorBusy = false;
    }
  };
  return mirror;
}
