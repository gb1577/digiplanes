// Camera lens shared by both modes: near-isometric. The camera keeps its angle but pulls back with
// a narrow lens, so most of the perspective goes away. The lens frames a little wider than the
// plain camera would, because without the perspective fan-out toward the top of the screen it
// would show less of the plane.
import * as THREE from 'three';

const ISO_DIST = 2.2; // camera distance as a multiple of the normal one
const ISO_ZOOM = 1.25; // how much wider the lens frames than the normal camera

// Where to put a camera that would normally sit `dist` from its target with a `fov` lens.
// Returns the distance and lens to use instead, plus how far the fog has to be pushed back so
// the plane fades at the same place on screen.
export function viewLens(dist, fov) {
  const d = dist * ISO_DIST;
  const half = Math.atan(Math.tan(THREE.MathUtils.degToRad(fov / 2)) * dist * ISO_ZOOM / d);
  return { dist: d, fov: THREE.MathUtils.radToDeg(2 * half), fogShift: d - dist * ISO_ZOOM };
}
