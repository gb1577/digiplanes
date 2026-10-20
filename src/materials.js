import * as THREE from 'three';
import { LineMaterial } from 'three/addons/lines/LineMaterial.js';
import { THEMES } from './themes.js';

const C = THEMES.cobalt;
export const PALETTE = {
  floor: C.floor, floorDeep: C.deep, cage: C.cage, line: C.line, fog: C.fog, accent: C.accent,
};

// Studio-like environment for PBR lighting: dome, softboxes, accent strips.
export function buildEnvironment(renderer, theme = C) {
  const env = new THREE.Scene();
  const dome = new THREE.Mesh(
    new THREE.SphereGeometry(50, 32, 16),
    new THREE.MeshBasicMaterial({ color: theme.envDome, side: THREE.BackSide }),
  );
  env.add(dome);
  const panel = (w, h, color, pos) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide }));
    m.position.set(...pos);
    m.lookAt(0, 0, 0);
    env.add(m);
  };
  panel(30, 18, 0xffffff, [-12, 30, -8]); // key softbox
  panel(10, 30, 0xe6e9ff, [40, 8, -10]);
  panel(10, 30, 0xd2d8ff, [-40, 6, 20]);
  panel(40, 2, theme.envStrip, [0, 4, -45]);
  panel(40, 2, theme.envStrip, [0, 2, 45]);
  panel(60, 20, theme.envFloor, [0, -20, 0]); // floor bounce
  const pmrem = new THREE.PMREMGenerator(renderer);
  const tex = pmrem.fromScene(env, 0.02).texture;
  pmrem.dispose();
  return tex;
}

// Bright panels only the reflection probe sees (layer 2): gives chrome its hard highlights.
export function buildReflectionRig(theme = C) {
  const g = new THREE.Group();
  const mat = (c) => new THREE.MeshBasicMaterial({ color: c, side: THREE.DoubleSide, fog: false });
  const add = (w, h, c, x, y, z) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat(c));
    m.position.set(x, y, z);
    m.lookAt(0, 0, 0);
    m.layers.set(2);
    g.add(m);
  };
  add(16, 10, 0xffffff, -6, 14, -4);
  add(3, 14, 0xffffff, 16, 5, -6);
  add(3, 14, 0xf0f2ff, -16, 5, 8);
  add(18, 1.2, theme.envStrip, 0, 2.5, -18);
  add(18, 1.2, theme.envStrip, 0, 2.5, 18);
  return g;
}

// Candy stripes (bubblegum ref): a repeating stripe texture, `n` stripe pairs per tile.
function stripeTexture([a, b], n) {
  const c = document.createElement('canvas');
  c.width = 64 * n; c.height = 4;
  const g = c.getContext('2d');
  for (let i = 0; i < 2 * n; i++) { g.fillStyle = `#${(i % 2 ? b : a).toString(16).padStart(6, '0')}`; g.fillRect(i * 32, 0, 32, 4); }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 8;
  return t;
}

export function makeMaterials(theme = C) {
  const stripes = theme.stripes ? stripeTexture(theme.stripes, theme.stripeCount || 2) : null;
  const lineMat = (color, width, opacity = 1) => {
    const m = new LineMaterial({ color, linewidth: width, transparent: opacity < 1, opacity, worldUnits: false });
    m.toneMapped = false;
    return m;
  };
  const chromeTint = theme === C ? 0xdfe4ff : 0xf2f2f4;
  return {
    theme,
    floor: new THREE.MeshStandardMaterial({ color: stripes ? 0xffffff : theme.floor, map: stripes, roughness: theme.floorRough, metalness: theme.floorMetal, envMapIntensity: 0.9, vertexColors: !!theme.cornerShade }),
    stripes,
    plate: theme.plateMilk
      // milky frosted glass: soft sheen, light passes through, floor reflection shows under it
      ? new THREE.MeshPhysicalMaterial({
        color: theme.plate, roughness: theme.plateRough, metalness: 0.1, transmission: theme.plateMilk, thickness: 0.5, ior: 1.45,
        clearcoat: 1, clearcoatRoughness: 0.04, specularIntensity: 1, envMapIntensity: 1.6,
        vertexColors: !!theme.plateGradient,
      })
      : new THREE.MeshStandardMaterial({ color: theme.plate, roughness: theme.plateRough, metalness: theme.floorMetal + 0.05, envMapIntensity: 1.0, vertexColors: !!theme.cornerShade }),
    deep: new THREE.MeshStandardMaterial({ color: theme.deep, roughness: 0.7, metalness: 0.1, vertexColors: !!theme.cornerShade }),
    voidMat: new THREE.MeshBasicMaterial({ color: theme === THEMES.clay ? 0x2a2a2a : 0x05061a }),
    cage: new THREE.MeshPhysicalMaterial({
      color: theme.cage, roughness: theme.cageRough, metalness: theme.cageMetal, clearcoat: theme.cageClearcoat ?? 0.35, clearcoatRoughness: 0.35,
      envMapIntensity: 0.8, side: THREE.DoubleSide, vertexColors: true,
      // frosted milky glass (milk plane)
      transmission: theme.cageTransmission ?? 0, thickness: theme.cageTransmission ? 0.6 : 0, ior: 1.25,
    }),
    // decorative cages (cocoa clusters)
    decor: new THREE.MeshPhysicalMaterial({
      color: theme.decor ?? theme.cage, roughness: 0.3, metalness: 0.15, clearcoat: 0.8, clearcoatRoughness: 0.25,
      envMapIntensity: 0.9, side: THREE.DoubleSide, vertexColors: true,
    }),
    hunter: new THREE.MeshPhysicalMaterial({
      transmission: theme.cageTransmission ?? 0, thickness: theme.cageTransmission ? 0.8 : 0, ior: 1.25,
      color: theme.hunter, roughness: theme.cageRough, metalness: theme.cageMetal, clearcoat: 0.5, clearcoatRoughness: 0.3,
      envMapIntensity: 0.9, side: THREE.DoubleSide, vertexColors: true,
    }),
    // dark planes get slightly softer chrome: pin-point highlights on black shimmer badly
    chrome: new THREE.MeshStandardMaterial({ color: chromeTint, metalness: 1, roughness: theme.chromeRough ?? 0.05, envMapIntensity: theme.chromeEnv ?? 1.0 }),
    chromeBar: new THREE.MeshStandardMaterial({ color: theme === C ? 0xc4caff : 0xe4e4ea, metalness: 1, roughness: Math.max(0.04, (theme.chromeRough ?? 0.05) - 0.04), envMapIntensity: theme.chromeEnv ?? 1.0 }),
    glass: new THREE.MeshPhysicalMaterial({
      color: theme === C ? 0xaab4ff : 0xdadbe2, metalness: 0.1, roughness: 0.02, transparent: true, opacity: 0.35,
      envMapIntensity: 2.0, clearcoat: 1,
    }),
    portal: new THREE.MeshBasicMaterial({ color: theme.portal, transparent: true, opacity: 0.62, depthWrite: false }), // light curtain you roll through
    portalGlow: new THREE.MeshBasicMaterial({ color: theme.portal, transparent: true, opacity: 0.1, depthWrite: false, blending: THREE.AdditiveBlending }),
    accent: new THREE.MeshBasicMaterial({ color: theme.accent, transparent: true, opacity: 0.85, side: THREE.DoubleSide }),
    line: lineMat(theme.line, 1.1, theme.lineOpacity),
    lineFaint: lineMat(theme.line, 0.9, theme.lineOpacity * 0.55),
    cageLine: lineMat(theme.cageLine, theme.cageLineWidth || 1.4),
    hunterLine: lineMat(theme.hunterLine, theme.hunterLineWidth || 1.8),
    glow: theme.lineGlow || 1,
    playerGlow: theme.playerGlow || theme.lineGlow || 1,
    lattice: lineMat(0x86e2ff, 1.5, 0.85),
    allLines() { return [this.line, this.lineFaint, this.cageLine, this.hunterLine, this.lattice]; },
  };
}
