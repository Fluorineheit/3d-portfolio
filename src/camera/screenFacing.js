// src/camera/screenFacing.js
import * as THREE from 'three';

/**
 * Horizontal unit vector the screen faces, on the side that points toward `toward`.
 * The screen is a flat mesh: its thinnest local axis is the normal.
 */
export function getScreenFacing(screenObject, toward) {
  screenObject.updateWorldMatrix(true, false);
  const geometry = screenObject.geometry;
  if (!geometry.boundingBox) geometry.computeBoundingBox();
  const size = geometry.boundingBox.getSize(new THREE.Vector3());
  const local =
    size.x <= size.y && size.x <= size.z ? new THREE.Vector3(1, 0, 0)
    : size.y <= size.z ? new THREE.Vector3(0, 1, 0)
    : new THREE.Vector3(0, 0, 1);

  const normal = local.transformDirection(screenObject.matrixWorld);
  normal.y = 0;
  if (normal.lengthSq() < 1e-6) normal.set(1, 0, 0);
  normal.normalize();

  const center = screenObject.getWorldPosition(new THREE.Vector3());
  if (toward && normal.dot(toward.clone().sub(center)) < 0) normal.negate();
  return normal;
}
