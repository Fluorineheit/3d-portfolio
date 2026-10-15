// src/ui/flatSurface.js
import * as THREE from 'three';
import { getScreenFacing } from '../camera/screenFacing.js';

/**
 * Give a flat mesh a clean 0-1 UV layout as seen from its front (u = left -> right, v = top -> bottom,
 * glTF convention), and return its frame in world space so overlays can be placed on it.
 * Needed for the videotron, whose exported UVs are collapsed to a single point.
 */
export function prepareFlatSurface(mesh, toward) {
  mesh.updateWorldMatrix(true, false);
  const normal = getScreenFacing(mesh, toward);
  const up = new THREE.Vector3(0, 1, 0);
  const right = new THREE.Vector3().crossVectors(normal.clone().negate(), up).normalize();
  const down = up.clone().negate();

  mesh.geometry = mesh.geometry.clone();
  const pos = mesh.geometry.attributes.position;
  const world = [];
  for (let i = 0; i < pos.count; i++) {
    world.push(new THREE.Vector3().fromBufferAttribute(pos, i).applyMatrix4(mesh.matrixWorld));
  }
  const rs = world.map((p) => p.dot(right));
  const ds = world.map((p) => p.dot(down));
  const minR = Math.min(...rs), maxR = Math.max(...rs);
  const minD = Math.min(...ds), maxD = Math.max(...ds);

  const uv = new Float32Array(pos.count * 2);
  world.forEach((p, i) => {
    uv[i * 2] = (rs[i] - minR) / (maxR - minR);
    uv[i * 2 + 1] = (ds[i] - minD) / (maxD - minD);
  });
  mesh.geometry.setAttribute('uv', new THREE.BufferAttribute(uv, 2));

  const depth = world[0].dot(normal);
  const origin = new THREE.Vector3()
    .addScaledVector(right, minR)
    .addScaledVector(down, minD)
    .addScaledVector(normal, depth);   // top-left corner, on the surface
  return { origin, right, down, normal, width: maxR - minR, height: maxD - minD };
}
