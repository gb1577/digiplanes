// Visual themes ("planes") and the levels built on them.
// Add a level: pick/define a theme, a layout (see world.js legend), and tuning.
// Music: music/<level.id>.mp3 if present, else the Glass FM song music/fm/<level.id>.js (see music/README.txt).

export const THEMES = {
  cobalt: {
    name: 'COBALT',
    floor: 0x4447bc, floorRough: 0.5, floorMetal: 0.2,
    plate: 0x4447bc, plateRough: 0.38,
    deep: 0x23257a,
    cage: 0x4448c4, cageRough: 0.42, cageMetal: 0.2,
    line: 0x5fcdf5, lineOpacity: 0.85, cageLine: 0x7fe0ff,
    hunter: 0x3a3db0, hunterLine: 0xff4f8b,
    fog: 0x2a2c86, fogNear: 26, fogFar: 60,
    sky: 0x9aa6ff, ground: 0x1c1e60, hemi: 0.6,
    sun: 0xf4f2ff, sunI: 2.1, sunDir: [-11, 16, -3],
    exposure: 1.0,
    envDome: 0x1b1d63, envFloor: 0x3a3ec0, envStrip: 0x66ddff,
    portal: 0xeaf2ff, spark: 0x9fe8ff, accent: 0xffd27a, danger: 0xff4f8b, pitGlow: 0x5fd8ff,
    dust: 0xe8f4ff, lines: true,
    chromeRough: 0.1, // a touch soft: razor-sharp highlights on small balls sparkle as they roll
    ui: { ink: '#e9ecff', cy: '#8fe8ff', acc: '#ffd27a', bg: '#2a2c86', panel: 'rgba(18,20,80,.55)' },
  },
  clay: {
    name: 'CLAY',
    floor: 0xcfcfcc, floorRough: 0.9, floorMetal: 0.0,
    plate: 0xd8d8d5, plateRough: 0.85,
    deep: 0x8d8d8b,
    cage: 0xd9d9d6, cageRough: 0.6, cageMetal: 0.0,
    // technical-drawing look: every line is dark graphite
    line: 0x16181c, lineOpacity: 0.95, cageLine: 0x2b2d31,
    cornerShade: 0.42, // plane darkens toward its corners (ref)
    hunter: 0xe2e2df, hunterLine: 0x2b2d31, hunterLineWidth: 2.4, cageLineWidth: 1.8,
    ca: 0.1, lift: 0.1, // keep graphite lines crisp: almost no lens fringing
    chromeRough: 0.16, chromeEnv: 0.72, // calmer marble highlights on the bright clay
    bloom: { strength: 0, radius: 0.2, threshold: 2 }, // nothing glows on clay: no shimmer
    fog: 0xbdbdba, fogNear: 34, fogFar: 75,
    sky: 0xffffff, ground: 0x5c5c5a, hemi: 0.55,
    sun: 0xfff3e2, sunI: 3.4, sunDir: [-14, 9, -8],
    exposure: 0.82,
    envDome: 0xa8a8a6, envFloor: 0xbdbdbb, envStrip: 0xffffff,
    portal: 0xffffff, spark: 0x2fa8ff, accent: 0xff7a3a, danger: 0xff5a2a, pitGlow: 0xff8a4a,
    dust: 0x9aa3b0, lines: true,
    ui: { ink: '#2b2e36', cy: '#1f8fe6', acc: '#ff7a3a', bg: '#c9c9c6', panel: 'rgba(255,255,255,.55)' },
  },
  noir: {
    name: 'NOIR',
    floor: 0x0d0d11, floorRough: 0.22, floorMetal: 0.5,
    plate: 0x121217, plateRough: 0.18,
    deep: 0x000000,
    cage: 0xd6d8e0, cageRough: 0.55, cageMetal: 0.0,
    line: 0xc4c8d8, lineOpacity: 0.7, cageLine: 0xffffff, cageLineWidth: 1.8,
    hunter: 0xc8cad2, hunterLine: 0xff2a4a, hunterLineWidth: 2.2,
    lineGlow: 5, playerGlow: 1.3, // HDR-bright wireframes: only the lines cross the bloom threshold
    bloom: { strength: 0.55, radius: 0.22, threshold: 0.95 }, // tight glow that hugs the wire
    mirror: 0.3, // faint reflection on the black floor
    pitGlow: 0xff2a4a, // holes glow red from below
    chromeRough: 0.17, chromeEnv: 0.78, // keeps marble highlights under the bloom threshold
    fog: 0x07070a, fogNear: 24, fogFar: 56,
    sky: 0x9aa2b8, ground: 0x06060a, hemi: 0.55,
    sun: 0xffffff, sunI: 2.1, sunDir: [-8, 18, 6],
    exposure: 1.15,
    envDome: 0x030304, envFloor: 0x0a0a0c, envStrip: 0xffffff,
    portal: 0xffffff, spark: 0xffffff, accent: 0xff2a4a, danger: 0xff2a4a,
    dust: 0xffffff, lines: true,
    ui: { ink: '#e8e8ee', cy: '#ffffff', acc: '#ff2a4a', bg: '#050507', panel: 'rgba(20,20,26,.6)' },
  },
  spectrum: {
    name: 'SPECTRUM',
    floor: 0x0a0a0d, floorRough: 0.16, floorMetal: 0.55,
    plate: 0x0e0e12, plateRough: 0.12,
    deep: 0x000000,
    cage: 0x0b0b0e, cageRough: 0.22, cageMetal: 0.4,
    line: 0x2c2d36, lineOpacity: 0.9, cageLine: 0x9a9caa,
    hunter: 0x111114, hunterLine: 0xff2a2a, hunterLineWidth: 2.2,
    fog: 0x030305, fogNear: 22, fogFar: 50,
    sky: 0x9098b0, ground: 0x000000, hemi: 0.3,
    sun: 0xffffff, sunI: 1.3, sunDir: [-9, 16, -4],
    exposure: 1.0,
    envDome: 0x020203, envFloor: 0x050506, envStrip: 0xffffff,
    portal: 0xffffff, spark: 0xffffff, accent: 0x22e6ff, danger: 0xff2a2a,
    dust: 0xffffff, lines: true,
    mirror: 0.55, // planar reflection strength on the glossy floor
    chromeRough: 0.12, chromeEnv: 0.85,
    panes: true, // coloured glass in the cage windows
    palette: [0xff2bd6, 0x22e6ff, 0x9dff3a, 0xffb020, 0x8a5bff, 0xffffff], // magenta cyan lime amber violet white
    ui: { ink: '#f2f2f6', cy: '#ffffff', acc: '#22e6ff', bg: '#030305', panel: 'rgba(14,14,18,.65)' },
  },
  milk: {
    name: 'MILK',
    floor: 0x060607, floorRough: 0.14, floorMetal: 0.6, // glossy black like the ref
    plate: 0xc8cad2, plateRough: 0.16, plateMilk: 0.35, plateGradient: [0.32, 0.95], // grey glass: glossy, reflective, graded light-to-dark
    deep: 0x000000,
    cage: 0xe6e7ec, cageRough: 0.45, cageMetal: 0, cageTransmission: 0.6, cageClearcoat: 0.6,
    line: 0xe8ecff, lineOpacity: 0.85, cageLine: 0xffffff, cageLineWidth: 1.3,
    hunter: 0xf0f0f4, hunterLine: 0xff4060, hunterLineWidth: 1.4, lineGlow: 1.5, playerGlow: 1, // keep the hunter's body milky, only the edge is red
    bloom: { strength: 0.4, radius: 0.4, threshold: 0.85 }, // gentle glow: stronger made glossy highlights shimmer
    chromeRough: 0.16, chromeEnv: 0.8, mirror: 0.55, lift: 0.25,
    fog: 0x050506, fogNear: 26, fogFar: 64,
    sky: 0xb8bcc8, ground: 0x08080a, hemi: 0.6,
    sun: 0xffffff, sunI: 2.0, sunDir: [-10, 16, 4],
    exposure: 1.05,
    envDome: 0x050506, envFloor: 0x0a0a0c, envStrip: 0xffffff,
    portal: 0xffffff, spark: 0xffffff, accent: 0xffffff, danger: 0xff4060, pitGlow: 0xdfe6ff,
    dust: 0xffffff, lines: true,
    ui: { ink: '#ececf2', cy: '#ffffff', acc: '#ffffff', bg: '#050506', panel: 'rgba(16,16,20,.6)' },
  },
  amber: {
    name: 'AMBER',
    floor: 0xc39a14, floorRough: 0.78, floorMetal: 0,
    plate: 0xb88f10, plateRough: 0.7,
    deep: 0x6e5306,
    cage: 0x4a2618, cageRough: 0.32, cageMetal: 0.25, cageClearcoat: 0.8,
    decor: 0x4a2618,
    line: 0x7c5f06, lineOpacity: 0.45, cageLine: 0xe8c27a, cageLineWidth: 1.2,
    hunter: 0x2c150c, hunterLine: 0xff6a1a, hunterLineWidth: 2,
    fog: 0xb18c10, fogNear: 30, fogFar: 72,
    sky: 0xfff0c0, ground: 0x6e5306, hemi: 0.7,
    sun: 0xfff1d6, sunI: 2.8, sunDir: [-14, 10, -6],
    exposure: 0.95, ca: 0.3, lift: 0.15,
    chromeRough: 0.12, chromeEnv: 0.85,
    bloom: { strength: 0.2, radius: 0.3, threshold: 1.2 },
    envDome: 0x7a5c08, envFloor: 0xc39a14, envStrip: 0xfff2c8,
    portal: 0xfff6dc, spark: 0xffe2a0, accent: 0xff7a1a, danger: 0xff6a1a, pitGlow: 0xff8a2a,
    dust: 0xfff2c8, lines: true,
    ui: { ink: '#2a1608', cy: '#4a2618', acc: '#ff6a1a', bg: '#c39a14', panel: 'rgba(255,236,170,.55)' },
  },
  cocoa: {
    name: 'COCOA',
    floor: 0x2a0f07, floorRough: 0.7, floorMetal: 0.0, // dark grooves between the pieces
    plate: 0x6a321c, plateRough: 0.3, // milk chocolate with a soft sheen
    chocolate: true, // flat tiles become bevelled chocolate-bar pieces
    deep: 0x220b06,
    cage: 0x6a3620, cageRough: 0.3, cageMetal: 0.2, cageClearcoat: 0.8,
    decor: 0x4e2414,
    line: 0x2a0e07, lineOpacity: 0.6, cageLine: 0xf0cf96, cageLineWidth: 1.2,
    hunter: 0x3a160c, hunterLine: 0xff9a40, hunterLineWidth: 1.6,
    fog: 0x34140b, fogNear: 26, fogFar: 64,
    sky: 0xffd9b0, ground: 0x220b06, hemi: 0.5,
    sun: 0xffe2c0, sunI: 2.6, sunDir: [-12, 12, -8],
    exposure: 1.0, ca: 0.4,
    chromeRough: 0.14, chromeEnv: 0.8,
    bloom: { strength: 0.25, radius: 0.3, threshold: 1.1 },
    envDome: 0x2a0f08, envFloor: 0x4a2014, envStrip: 0xffd9b0,
    portal: 0xffe8c8, spark: 0xffd9a0, accent: 0xffb050, danger: 0xff9a40, pitGlow: 0xff9a40,
    dust: 0xffd9b0, lines: true,
    ui: { ink: '#f6e2c8', cy: '#f0cf96', acc: '#ffb050', bg: '#34140b', panel: 'rgba(40,16,8,.6)' },
  },
  prism: {
    name: 'PRISM',
    floor: 0xd8d9e0, floorRough: 0.3, floorMetal: 0.05,
    plate: 0xf2f2f6, plateRough: 0.2,
    deep: 0x9a9caa,
    cage: 0x111114, cageRough: 0.2, cageMetal: 0.4,
    line: 0xa8acb8, lineOpacity: 0.6, cageLine: 0x2a2a30, cageLineWidth: 1.4,
    hunter: 0x18181c, hunterLine: 0xff2d55, hunterLineWidth: 2,
    fog: 0xd2d4dc, fogNear: 38, fogFar: 85,
    sky: 0xffffff, ground: 0x8a8c9a, hemi: 0.55,
    sun: 0xffffff, sunI: 1.6, sunDir: [-10, 16, -6],
    exposure: 0.75, ca: 0.25, lift: 0, // no blue shadow lift: keeps the white plane crisp
    panes: true, // no additive mirror: it washes out a white floor
    chromeRough: 0.12, chromeEnv: 0.8,
    bloom: { strength: 0, radius: 0.2, threshold: 5 }, // white surfaces must not bloom
    palette: [0xff3b5c, 0xff9f1c, 0xffd60a, 0x2ec4b6, 0x3a86ff, 0x8338ec],
    envDome: 0xc8cad4, envFloor: 0xe6e7ee, envStrip: 0xffffff,
    portal: 0xffffff, spark: 0x3a86ff, accent: 0xff3b5c, danger: 0xff2d55, pitGlow: 0x3a86ff,
    dust: 0x8890a8, lines: true,
    ui: { ink: '#22242c', cy: '#3a86ff', acc: '#ff3b5c', bg: '#dcdee6', panel: 'rgba(255,255,255,.6)' },
  },
};

// Layout legend (world.js): . flat  o bare  p pyramid  r recessed  v void  b marble pad
// V fall pit (merges with neighbours)  x chrome bars  k key grid  h ribs  f frame plate  u twisting tile column  g floor light strips
// G big colourful polyhedron  c cluster of small cages
// P portal  B big chrome ball  C hunter lair  S start
export const LEVELS = [
  {
    id: 'cobalt', theme: 'cobalt', seed: 7,
    title: 'PLANE 01 · COBALT', quotas: [12, 14, 16], goal: 42, cap: 12,
    upper: { decor: 'ppxrko', h: ['2222211', '1111100'] },
    fuel: 55, hunters: [{ size: 1.45, speed: 2.6, ramp: 0.25, wake: 3 }],
    layout: [
      'pP.p.x.p..pP.p',
      'p.b.xp.r.x.p.p',
      '.b.x.BB.p.xx.p',
      'p.x.pV..pr.x.p',
      'r.p.pV....p.x.',
      'p.v.r..CC..p.p',
      '..p.p..CC.r.x.',
      'p.r...p...p.x.',
      'x.p.S..k.b..p.',
      'p.v.p.k..b.p.v',
      '.p.b.pV..r.x.p',
      'P.p.x.p.v.p.p.',
      'p.b.p.r.p.b.xp',
      'pp.p.x.p.p.pP.',
    ],
  },
  {
    id: 'clay', theme: 'clay', seed: 21,
    title: 'PLANE 02 · CLAY', quotas: [13, 15, 18], goal: 46, cap: 12,
    upper: { decor: 'fpqnrkh', h: ['2221111', '1111000'] },
    fuel: 55, hunters: [{ size: 1.45, speed: 2.7, ramp: 0.26, wake: 3 }],
    layout: [
      'fP.pp.qqq.k.Pf',
      'p.b.nnn.f.q.fp',
      '.f.p.r.f.b.q.k',
      'p.b.fV.p..q.r.',
      'nn.p.V..r..f.p',
      'nn.r..CC.b.q.h',
      'f.p.f.CC.f.r.h',
      '.b.q..f..p.q.h',
      'r.p.S.f.k.b..f',
      'f.k.q.p.r.f.b.',
      '.f.b.r.fV.q.p.',
      'P.r.f.nnn.b.f.',
      'p.q.b.nnn.r.q.',
      'fp.q.k.f.p.qP.',
    ],
  },
  {
    id: 'noir', theme: 'noir', seed: 33,
    title: 'PLANE 03 · NOIR', quotas: [14, 17, 20], goal: 51, cap: 12,
    upper: { decor: 'xrfprk', h: ['2222211', '1111100'], voids: 2 },
    fuel: 55, hunters: [
      { size: 1.45, speed: 2.8, ramp: 0.25, wake: 3 },
      { size: 1.0, speed: 3.4, ramp: 0.2, wake: 40 },
    ],
    layout: [
      'xP.r.x.v.x.Pxx',
      'p.b.r.x.f.b.rp',
      '.r.r.x.BB.x.v.',
      'x.b.r.p..r.b.x',
      'r.x.f..r..f.x.',
      'p.v.r.CC.r.r.p',
      'x.f.p.CC.p.f.x',
      '.b.rv.f..r.b.r',
      'r.x.S.k.k.x.v.',
      'p.r.f.r.f.r.p.',
      '.b.xv..r.x.b.x',
      'P.r.f.x.f.v.r.',
      'x.r.b.p.b.r.xp',
      'xx.r.x.r.x.xP.',
    ],
  },
];

LEVELS.push({
  id: 'spectrum', theme: 'spectrum', seed: 44,
  title: 'PLANE 04 · SPECTRUM', quotas: [15, 18, 21], goal: 54, cap: 12,
  upper: { decor: 'ooogu', h: ['2222111', '1110000'] },
  fuel: 55, colorMatch: true,
  hunters: [{ size: 1.45, speed: 2.9, ramp: 0.25, wake: 4 }],
  layout: [
    'oP.o.g.o.u.oPo',
    'o.b.u.o.b.o.go',
    '.g.oV..g.o.u.o',
    'o.u.V.o.o.b.o.',
    'p.o.o.g.u.o.g.',
    'o.g.v.o.CC.o.o',
    'u.o.o.b.CC.b.u',
    '.o.g.o.V.g.o.o',
    'o.b.S.u.o.o.v.',
    'g.o.o.o.b.u.o.',
    '.u.g.v.o.o.g.o',
    'P.o.b.o.u.b.o.',
    'o.g.o.u.o.g.ob',
    'oo.u.o.b.o.oP.',
  ],
});

// ---------- terraced planes: one continuous digiplane on several levels ----------
// heights: one digit per tile = terrace level. L tiles are stairs up to the next level.
// '=' rows are gates: bank the zone's quota to open them and move on to the next zone.
LEVELS.push(
  {
    id: 'milk', theme: 'milk', seed: 51,
    title: 'PLANE 05 · MILK', quotas: [17, 21, 25], goal: 63, cap: 12, fuel: 60,
    hunters: [{ size: 1.45, speed: 2.8, ramp: 0.25, wake: 4 }],
    layout: [
      'p.bo.P.p.o',
      '.o.x.o.b.p',
      'b.p.oL.o.b',
      '.o.v.o.p.o',
      'p.b.o.k.o.',
      '.P.o.b.o.p',
      'o.p.o...o.',
      '==========',
      'p.o.b.o.P.',
      '.b.p.v.o.p',
      'o.x.o.b.x.',
      '.oL.p.oL.o',
      'b.o.P.o.b.',
      'p.b.o.v.o.',
      '==========',
      '.p.o.b.p.o',
      'P.b.x.o.b.',
      '.o.p.o.r.p',
      'p.b.LCC.o.',
      'o.o.bCC.b.',
      '.b.o.S.o.P',
      'p.o.b.o.b.',
    ],
    heights: [
      '3333333333',
      '3333333333',
      '2222222222',
      '2222222222',
      '2222222222',
      '2222222222',
      '2222222222',
      '2222222222',
      '2222222222',
      '2222222222',
      '2222222222',
      '1111111111',
      '1111111111',
      '1111111111',
      '1111111111',
      '1111111111',
      '1111111111',
      '1111111111',
      '0000000000',
      '0000000000',
      '0000000000',
      '0000000000',
    ],
  },
  {
    id: 'amber', theme: 'amber', seed: 62,
    title: 'PLANE 06 · AMBER', quotas: [17, 22, 28], goal: 67, cap: 12, fuel: 60,
    hunters: [{ size: 1.45, speed: 3.0, ramp: 0.25, wake: 4 }],
    layout: [
      'f.b.P.o.c.',
      '.o.c.b.f.o',
      'b.f.o.v.b.',
      '.cobL.o.P.',
      'P.o.b.f.o.',
      '.f.h.h.b.o',
      'o.b.o.c.o.',
      '==========',
      'b.o.f.P.c.',
      '.c.b.o.b.o',
      'f.oL.b.L.f',
      '.b.o.v.o.b',
      'P.f.c.o.f.',
      '.o.b.h.h.o',
      '==========',
      'f.b.o.P.o.',
      '.c.v.b.c.f',
      'b.o.f.o.b.',
      '.f.bCC.o.P',
      'o.b.CC.f.o',
      'c.o.S.o.b.',
      '.b.o.f.o.c',
    ],
    heights: [
      '0000000000',
      '0000000000',
      '0000000000',
      '0000000000',
      '1111111111',
      '1111111111',
      '1111111111',
      '1111111111',
      '1111111111',
      '1111111111',
      '1111111111',
      '2222222222',
      '2222222222',
      '2222222222',
      '3333333333',
      '3333333333',
      '3333333333',
      '3333333333',
      '3333333333',
      '3333333333',
      '3333333333',
      '3333333333',
    ],
  },
  {
    id: 'cocoa', theme: 'cocoa', seed: 73,
    title: 'PLANE 07 · COCOA', quotas: [17, 22, 28], goal: 67, cap: 12, fuel: 60,
    hunters: [3, 7, 12, 18, 26].map((wake) => ({ size: 0.85, speed: 2.4, ramp: 0.12, wake })),
    layout: [
      'c.b.o.P.c.',
      '.o.b.o.c.b',
      'b.cL.o.c.o',
      '.o.b.v.b.c',
      'P.c.o.c.o.',
      '.b.o.b.o.P',
      'c.o.c.o.b.',
      '==========',
      'b.c.o.P.o.',
      '.o.b.o.b.c',
      'c.b.oL.o.b',
      '.o.c.v.c.o',
      'P.b.o.b.o.',
      '.c.o.c.b.c',
      '==========',
      'c.b.o.P.o.',
      '.o.c.b.c.b',
      'bL.o.o.c.o',
      '.c.bCC.o.P',
      'o.b.CC.c.o',
      'c.o.S.o.b.',
      '.b.c.o.c.o',
    ],
    heights: [
      '3333333333',
      '3333333333',
      '2222222222',
      '2222222222',
      '2222222222',
      '2222222222',
      '2222222222',
      '2222222222',
      '2222222222',
      '2222222222',
      '1111111111',
      '1111111111',
      '1111111111',
      '1111111111',
      '1111111111',
      '1111111111',
      '1111111111',
      '0000000000',
      '0000000000',
      '0000000000',
      '0000000000',
      '0000000000',
    ],
  },
  {
    id: 'prism', theme: 'prism', seed: 84,
    title: 'PLANE 08 · PRISM', quotas: [20, 25, 31], goal: 76, cap: 12, fuel: 60,
    hunters: [{ size: 1.45, speed: 3.0, ramp: 0.25, wake: 4 }, { size: 1.0, speed: 3.6, ramp: 0.2, wake: 30 }],
    layout: [
      'G.b.o.P.o.',
      '.o.G.b.o.b',
      'b.o.oL.G.o',
      '.G.b.v.o.b',
      'P.o.b.o.G.',
      '.b.G.o.b.P',
      'o.o.b.G.o.',
      '==========',
      'b.G.o.P.o.',
      '.o.b.o.G.b',
      'G.oL.b.o.o',
      '.b.o.v.b.G',
      'P.o.G.o.b.',
      '.b.o.b.o.G',
      '==========',
      'G.b.o.P.o.',
      '.o.G.b.o.b',
      'b.o.oLb.G.',
      '.G.bCC.o.P',
      'o.b.CC.G.o',
      'G.o.S.o.b.',
      '.b.o.G.o.b',
    ],
    heights: [
      '3333333333',
      '3333333333',
      '2222222222',
      '2222222222',
      '2222222222',
      '2222222222',
      '2222222222',
      '2222222222',
      '2222222222',
      '2222222222',
      '1111111111',
      '1111111111',
      '1111111111',
      '1111111111',
      '1111111111',
      '1111111111',
      '1111111111',
      '0000000000',
      '0000000000',
      '0000000000',
      '0000000000',
      '0000000000',
    ],
  },
);


// ---------- planes 09-15 ----------
// Bright and dark-glowing planes alternate; difficulty climbs every plane up to PARADOX.
Object.assign(THEMES, {
  bubblegum: {
    name: 'BUBBLEGUM',
    floor: 0xffffff, floorRough: 0.32, floorMetal: 0,
    stripes: [0x4fc2ae, 0xeee7d8], stripeCount: 2, // mint and cream candy stripes
    plate: 0xf1ebdf, plateRough: 0.22,
    deep: 0x3a8f80,
    cage: 0xf6f1e8, cageRough: 0.22, cageMetal: 0, cageClearcoat: 0.9,
    line: 0x2f8f80, lineOpacity: 0.3, cageLine: 0x23786b, cageLineWidth: 1.4,
    hunter: 0xff6f86, hunterLine: 0xa3112f, hunterLineWidth: 2,
    fog: 0xa6dccf, fogNear: 34, fogFar: 90,
    sky: 0xffffff, ground: 0x3a8f80, hemi: 0.75,
    sun: 0xfff4ea, sunI: 2.5, sunDir: [-10, 15, -6],
    exposure: 0.95, ca: 0.25, lift: 0.05,
    chromeRough: 0.1, chromeEnv: 0.8,
    bloom: { strength: 0, radius: 0.2, threshold: 5 },
    candy: true, // marbles come in candy colours
    palette: [0xe31e2a, 0x9466cc, 0xc4864a, 0xe2ee84, 0xe6e3f0], // red, grape, caramel, lime, milk
    envDome: 0xc4efe6, envFloor: 0x7fd3c3, envStrip: 0xffffff,
    portal: 0xffffff, spark: 0xff7aa8, accent: 0xff4f8b, danger: 0xe31e2a, pitGlow: 0xff7aa8,
    dust: 0xffffff, lines: true,
    ui: { ink: '#1d4d46', cy: '#e31e2a', acc: '#9466cc', bg: '#c4efe6', panel: 'rgba(255,255,255,.6)' },
  },
  neon: {
    ...THEMES.noir, name: 'NEON',
    floor: 0x08060e, plate: 0x0e0a18,
    line: 0xff3ad8, lineOpacity: 0.75, cageLine: 0x3af0ff, hunterLine: 0xffe23a,
    lineGlow: 5, bloom: { strength: 0.6, radius: 0.25, threshold: 0.95 },
    fog: 0x07040c, accent: 0x3af0ff, danger: 0xffe23a, pitGlow: 0xff3ad8, spark: 0xff3ad8,
    ui: { ink: '#f2e8ff', cy: '#3af0ff', acc: '#ff3ad8', bg: '#07040c', panel: 'rgba(24,10,34,.6)' },
  },
  dune: {
    ...THEMES.clay, name: 'DUNE',
    floor: 0xe0cba2, plate: 0xe9d8b4, deep: 0xa0865a,
    line: 0x4e3a20, cageLine: 0x3c2a14, hunterLine: 0x3c2a14, hunter: 0xf0e2c4, cage: 0xeee0c2,
    cornerShade: 0.36,
    fog: 0xd6c194, sky: 0xfff4dc, ground: 0x7a6440, sun: 0xffe6c2,
    envDome: 0xc7b088, envFloor: 0xe0cba2,
    ui: { ink: '#3c2a14', cy: '#7a4e1a', acc: '#d0622a', bg: '#e0cba2', panel: 'rgba(255,246,226,.6)' },
  },
  ember: {
    ...THEMES.noir, name: 'EMBER',
    floor: 0x0e0806, plate: 0x160c08,
    line: 0xff7a1a, lineOpacity: 0.75, cageLine: 0xffc27a, hunterLine: 0x3ad0ff,
    lineGlow: 4.5, bloom: { strength: 0.55, radius: 0.25, threshold: 0.95 },
    fog: 0x0a0503, accent: 0xff7a1a, danger: 0x3ad0ff, pitGlow: 0xff5a10, spark: 0xffa040,
    ui: { ink: '#ffe8d6', cy: '#ffc27a', acc: '#ff7a1a', bg: '#0a0503', panel: 'rgba(34,16,8,.6)' },
  },
  jade: {
    ...THEMES.prism, name: 'JADE',
    floor: 0x9cd6c1, plate: 0xd4f0e5, deep: 0x4a8c77,
    line: 0x2d6a58, lineOpacity: 0.55, cageLine: 0x1e4a3e, hunterLine: 0xd8203a,
    fog: 0xa6d9c7, ground: 0x4a8c77,
    envDome: 0x8fc9b5, envFloor: 0xb6e6d4,
    ui: { ink: '#16362d', cy: '#1e7a5e', acc: '#d8203a', bg: '#b6e6d4', panel: 'rgba(240,255,250,.6)' },
  },
  ultra: {
    ...THEMES.noir, name: 'ULTRA',
    floor: 0x07050f, plate: 0x0d0a1c,
    line: 0x9a6bff, lineOpacity: 0.8, cageLine: 0xe0d4ff, hunterLine: 0xff2a6a,
    lineGlow: 5, bloom: { strength: 0.6, radius: 0.25, threshold: 0.95 }, mirror: 0.35,
    fog: 0x06040d, accent: 0x9a6bff, danger: 0xff2a6a, pitGlow: 0x9a6bff, spark: 0xc8b0ff,
    ui: { ink: '#ece6ff', cy: '#e0d4ff', acc: '#9a6bff', bg: '#06040d', panel: 'rgba(20,14,40,.6)' },
  },
  paradox: {
    ...THEMES.clay, name: 'PARADOX', // Escher-style impossible stairs, drawn in pencil
    pencil: 1, // graphite-on-paper post effect
    floor: 0xbcbcbc, plate: 0xd8d8d8, deep: 0x5a5a5a,
    cage: 0xe4e4e4, hunter: 0xcfcfcf,
    line: 0x0c0c0c, lineOpacity: 1, cageLine: 0x050505, cageLineWidth: 2.2, hunterLine: 0x000000, hunterLineWidth: 2.6,
    cornerShade: 0.5,
    sunI: 4.0, sunDir: [-12, 10, -10], hemi: 0.4, // hard light: long pencil-dark shadows
    ca: 0, lift: 0,
    fog: 0xb0b0b0, sky: 0xffffff, ground: 0x3a3a3a,
    ui: { ink: '#141414', cy: '#141414', acc: '#5a5a5a', bg: '#c8c8c8', panel: 'rgba(255,255,255,.55)' },
  },
});

// Terraced plane generator: 10 x 22 tiles, three zones split by gates (rows 7 and 14).
// `h` is one terrace height per row (top row first); stairs are placed wherever the ground steps up
// toward the gate ahead, so every rise has a ramp (and a hop clears one step anyway).
function terraced({ id, theme, title, seed, h, decor, pads = 4, portals = 2, voids = 0, stairs = 2, ...tuning }) {
  let s = seed >>> 0;
  const R = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
  const pick = (a) => a[Math.floor(R() * a.length)];
  const rows = 22, cols = 10, gates = [7, 14];
  const H = [...h].map(Number);
  if (H.length !== rows) throw new Error(`${id}: heights need ${rows} rows`);
  const g = [...Array(rows)].map((_, j) => [...Array(cols)].map((_, i) => ((i + j) % 2 === 0 ? pick(decor) : '.')));
  gates.forEach((j) => g[j].fill('='));
  // start + hunter lair (kept flat)
  g[18][4] = g[18][5] = g[19][4] = g[19][5] = 'C';
  g[20][4] = 'S';
  const reserved = (i, j) => j >= 18 && j <= 20 && i >= 3 && i <= 6;
  // the start area stays open: no big shapes, bar clusters, twisting columns or cage clusters
  // within two tiles of the start and the hunter lair, so the first moves aren't a pinball game
  const nearStart = (i, j) => j >= 16 && i >= 1 && i <= 8;
  for (let j = 16; j < rows; j++) for (let i = 0; i < cols; i++) if (nearStart(i, j) && 'Gxuc'.includes(g[j][i])) g[j][i] = 'o';
  // rows next to a height change hold the stairs; keep pits away from them
  const edgeRow = (j) => (j > 0 && H[j - 1] !== H[j]) || (j < rows - 1 && H[j + 1] !== H[j]);
  for (let j = 1; j < rows; j++) {
    if (H[j - 1] > H[j]) {
      const cs = [...Array(cols).keys()].filter((i) => !reserved(i, j));
      for (let k = 0; k < stairs && cs.length; k++) g[j][cs.splice(Math.floor(R() * cs.length), 1)[0]] = 'L';
    }
  }
  const zones = [[0, 6], [8, 13], [15, 21]];
  const free = (a, b, ok = () => true) => {
    const out = [];
    for (let j = a; j <= b; j++) for (let i = 0; i < cols; i++) if (!reserved(i, j) && g[j][i] !== 'L' && ok(i, j)) out.push([i, j]);
    return out;
  };
  const place = (cells, n, ch) => { for (let k = 0; k < n && cells.length; k++) { const [i, j] = cells.splice(Math.floor(R() * cells.length), 1)[0]; g[j][i] = ch; } };
  for (const [a, b] of zones) {
    place(free(a, b, (i) => i === 0 || i === cols - 1), portals, 'P'); // portals on the side walls
    place(free(a, b, (i, j) => g[j][i] !== 'P'), pads, 'b');
    place(free(a, b, (i, j) => !'PbS'.includes(g[j][i]) && !edgeRow(j) && !nearStart(i, j)), voids, 'v');
  }
  return { id, theme, title, seed, ...tuning, layout: g.map((r) => r.join('')), heights: H.map((v) => String(v).repeat(cols)) };
}

LEVELS.push(
  terraced({
    id: 'bubblegum', theme: 'bubblegum', title: 'PLANE 09 · BUBBLEGUM', seed: 91,
    h: '0000111111111111110000', decor: 'oooooffph', pads: 5, voids: 1,
    quotas: [21, 27, 32], goal: 80, cap: 12, fuel: 60,
    hunters: [{ size: 1.45, speed: 3.0, ramp: 0.25, wake: 4 }, { size: 1.0, speed: 3.6, ramp: 0.2, wake: 28 }],
  }),
  terraced({
    id: 'neon', theme: 'neon', title: 'PLANE 10 · NEON', seed: 102,
    h: '2221111111222111110000', decor: 'xprfkoo', voids: 1,
    quotas: [21, 28, 34], goal: 83, cap: 12, fuel: 60,
    hunters: [{ size: 1.45, speed: 3.1, ramp: 0.26, wake: 4 }, { size: 1.0, speed: 3.7, ramp: 0.2, wake: 22 }],
  }),
  terraced({
    id: 'dune', theme: 'dune', title: 'PLANE 11 · DUNE', seed: 113,
    h: '1112221111111222221111', decor: 'pqnrfko', voids: 2,
    quotas: [22, 28, 35], goal: 85, cap: 12, fuel: 59,
    hunters: [3, 10, 20].map((wake) => ({ size: 1.0, speed: 3.2, ramp: 0.18, wake })),
  }),
  terraced({
    id: 'ember', theme: 'ember', title: 'PLANE 12 · EMBER', seed: 124,
    h: '2211112222221111221111', decor: 'xrfpkoo', voids: 2,
    quotas: [24, 29, 36], goal: 89, cap: 12, fuel: 58,
    hunters: [{ size: 1.45, speed: 3.3, ramp: 0.27, wake: 4 }, { size: 1.0, speed: 3.8, ramp: 0.2, wake: 16 }, { size: 0.85, speed: 4.0, ramp: 0.15, wake: 32 }],
  }),
  terraced({
    id: 'jade', theme: 'jade', title: 'PLANE 13 · JADE', seed: 135,
    h: '0011122222210000111111', decor: 'Gooopkof', voids: 2, stairs: 3,
    quotas: [24, 31, 38], goal: 93, cap: 12, fuel: 57,
    hunters: [{ size: 1.45, speed: 3.4, ramp: 0.28, wake: 4 }, { size: 1.0, speed: 3.9, ramp: 0.2, wake: 14 }, { size: 1.0, speed: 3.9, ramp: 0.2, wake: 28 }],
  }),
  terraced({
    id: 'ultra', theme: 'ultra', title: 'PLANE 14 · ULTRA', seed: 146,
    h: '2221112221122111221111', decor: 'ugxpoo', voids: 3, stairs: 3,
    quotas: [25, 32, 39], goal: 96, cap: 12, fuel: 56,
    hunters: [{ size: 1.45, speed: 3.5, ramp: 0.3, wake: 3 }, { size: 1.0, speed: 4.0, ramp: 0.22, wake: 12 }, { size: 0.85, speed: 4.3, ramp: 0.18, wake: 24 }],
  }),
  terraced({
    id: 'paradox', theme: 'paradox', title: 'PLANE 15 · PARADOX', seed: 157,
    h: '3223321111232222112222', decor: 'pqnrfo', voids: 3, stairs: 4,
    quotas: [28, 35, 42], goal: 105, cap: 12, fuel: 54,
    hunters: [{ size: 1.45, speed: 3.6, ramp: 0.3, wake: 3 }, { size: 1.0, speed: 4.1, ramp: 0.22, wake: 10 }, { size: 1.0, speed: 4.1, ramp: 0.22, wake: 20 }, { size: 0.85, speed: 4.5, ramp: 0.18, wake: 30 }],
  }),
);

// ---------- bigger planes ----------
// Every plane gets fresh strips of tiles threaded between its rows and columns, filled from the
// plane's own decor, so runs are longer while each layout keeps its look. Strips go in pairs to
// keep the checkerboard rhythm, and never split a gate, a terrace step or a multi-tile feature
// (pits, the hunter lair, the big chrome balls). Terraced planes go 10 → 14 wide and get two
// more rows in each zone.
function grow(level, colPairs, rowPairs) {
  let s = (level.seed * 7919 + 13) >>> 0;
  const R = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
  const g = level.layout.map((r) => r.split(''));
  const H = level.heights ? level.heights.map((r) => r.split('')) : null;
  const decor = g.flat().filter((c) => !'PBCSVLb=.'.includes(c));
  const fresh = new Set(); // "j,i" of tiles grown in (fixed up once the grid is final)
  const cell = (i, j) => ((i + j) % 2 ? '.' : R() < 0.12 ? 'b' : decor[Math.floor(R() * decor.length)]);
  const joined = (a, b) => a === b && 'VCB'.includes(a);
  const spread = (n, len, ok) => {
    const picks = [];
    for (let k = 1; k <= n; k++) {
      const want = Math.round((len * k) / (n + 1));
      const c = [...Array(len - 1).keys()].map((x) => x + 1).filter((b) => ok(b) && !picks.includes(b))
        .sort((a, b) => Math.abs(a - want) - Math.abs(b - want))[0];
      if (c !== undefined) picks.push(c);
    }
    return picks.sort((a, b) => b - a); // insert from the far end so indices stay valid
  };
  // columns
  for (const b of spread(colPairs, g[0].length, (b) => g.every((r) => !joined(r[b - 1], r[b])))) {
    g.forEach((r, j) => {
      const gate = r[b - 1] === '=';
      r.splice(b, 0, ...[0, 1].map((d) => (gate ? '=' : cell(b + d, j))));
      H?.[j].splice(b, 0, H[j][b - 1], H[j][b - 1]);
    });
    for (const f of [...fresh]) { const [j, i] = f.split(',').map(Number); if (i >= b) { fresh.delete(f); fresh.add(`${j},${i + 2}`); } }
    g.forEach((_, j) => fresh.add(`${j},${b}`).add(`${j},${b + 1}`));
  }
  // rows: one pair per zone on gated planes, spread evenly on open ones
  const rowOk = (b) => !g[b - 1].includes('=') && !g[b].includes('=') && (!H || H[b - 1].join('') === H[b].join(''))
    && g[b].every((c, i) => !joined(g[b - 1][i], c));
  const gates = g.map((r, j) => (r.includes('=') ? j : -1)).filter((j) => j >= 0);
  let rows = [];
  if (gates.length) {
    const bounds = [-1, ...gates, g.length];
    for (let z = 0; z < bounds.length - 1; z++) {
      const a = bounds[z] + 1, e = bounds[z + 1];
      rows.push(...spread(rowPairs, e - a, (b) => rowOk(a + b)).map((b) => a + b));
    }
    rows.sort((a, b) => b - a);
  } else rows = spread(rowPairs, g.length, rowOk);
  for (const b of rows) {
    g.splice(b, 0, ...[0, 1].map((d) => g[0].map((_, i) => cell(i, b + d))));
    H?.splice(b, 0, [...H[b - 1]], [...H[b - 1]]);
    for (const f of [...fresh]) { const [j, i] = f.split(',').map(Number); if (j >= b) { fresh.delete(f); fresh.add(`${j + 2},${i}`); } }
    g[b].forEach((_, i) => fresh.add(`${b},${i}`).add(`${b + 1},${i}`));
  }
  // keep the start open, and keep holes off stairs
  const near = (i, j, chars, d) => {
    for (let y = j - d; y <= j + d; y++) for (let x = i - d; x <= i + d; x++) if (chars.includes(g[y]?.[x])) return true;
    return false;
  };
  for (const f of fresh) {
    const [j, i] = f.split(',').map(Number);
    if ('Gxuc'.includes(g[j][i]) && near(i, j, 'SC', 2)) g[j][i] = 'o';
    if (g[j][i] === 'v' && near(i, j, 'LS=', 1)) g[j][i] = 'o';
  }
  level.layout = g.map((r) => r.join(''));
  if (H) level.heights = H.map((r) => r.join(''));
}
// ---------- stacked planes ----------
// Planes 01-04 keep their hand-laid plane as the ground floor (zone 1) and get two terraces
// stacked behind it, each behind a gate, like the terraced planes. `upper.h` gives the terrace
// height of each new row, top row first: the top zone, then the middle zone (7 rows each). Stairs
// go wherever the ground steps up toward the gate ahead.
function stack(level) {
  const { decor, h, pads = 6, portals = 2, voids = 1, stairs = 3 } = level.upper;
  let s = (level.seed * 104729 + 7) >>> 0;
  const R = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
  const cols = level.layout[0].length, n = 7;
  const zone = (j0) => [...Array(n)].map((_, j) => [...Array(cols)].map((_, i) => ((i + j + j0) % 2 ? '.' : decor[Math.floor(R() * decor.length)])));
  const gate = () => Array(cols).fill('=');
  const g = [...zone(0), gate(), ...zone(n + 1), gate(), ...level.layout.map((r) => r.split(''))];
  const top = [...h[0]].map(Number), mid = [...h[1]].map(Number);
  const H = [...top, mid[0], ...mid, 0, ...level.layout.map(() => 0)];
  for (let j = 1; j < g.length; j++) {
    if (H[j - 1] > H[j] && g[j][0] !== '=') {
      const cs = [...Array(cols).keys()];
      for (let k = 0; k < stairs; k++) g[j][cs.splice(Math.floor(R() * cs.length), 1)[0]] = 'L';
    }
  }
  const edgeRow = (j) => H[j - 1] !== H[j] || H[j + 1] !== H[j];
  for (const a of [0, n + 1]) {
    const cells = [];
    for (let j = a; j < a + n; j++) for (let i = 0; i < cols; i++) if (g[j][i] !== 'L') cells.push([i, j]);
    const place = (k, ch, ok) => {
      const c = cells.filter(([i, j]) => ok(i, j));
      for (let m = 0; m < k && c.length; m++) {
        const [i, j] = c.splice(Math.floor(R() * c.length), 1)[0];
        g[j][i] = ch;
        cells.splice(cells.findIndex(([x, y]) => x === i && y === j), 1);
      }
    };
    place(portals, 'P', (i) => i === 0 || i === cols - 1); // portals on the side walls
    place(pads, 'b', () => true);
    place(voids, 'v', (i, j) => !edgeRow(j) && j !== a && j !== a + n - 1);
  }
  level.layout = g.map((r) => r.join(''));
  level.heights = H.map((v) => String(v).repeat(cols));
}
for (const level of LEVELS) {
  if (level.upper) stack(level);
  else if (level.quotas && !level.decks) grow(level, 2, 1);
}
