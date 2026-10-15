// src/camera/framing.js
import * as THREE from 'three';
import { getScreenFacing } from './screenFacing.js';

/**
 * Camera pose that looks straight at a group of flat objects (a note, a billboard) from the side they
 * face, far enough back to fit them with some margin.
 */
export function frameObjects(objects, camera, toward, { margin = 1.5 } = {}) {
  const box = new THREE.Box3();
  objects.forEach((o) => box.expandByObject(o));
  const center = box.getCenter(new THREE.Vector3());
  const size = box.getSize(new THREE.Vector3());

  let flat = null;
  objects.forEach((o) => o.traverse((c) => { if (!flat && c.isMesh) flat = c; }));
  const normal = getScreenFacing(flat, toward);

  // Width across the view (horizontal, perpendicular to the normal) and height
  const across = new THREE.Vector3(-normal.z, 0, normal.x);
  const width = Math.abs(size.x * across.x) + Math.abs(size.z * across.z);
  const height = size.y;

  const vfov = THREE.MathUtils.degToRad(camera.fov);
  const hfov = 2 * Math.atan(Math.tan(vfov / 2) * camera.aspect);
  const distance = Math.max(
    (height * margin) / 2 / Math.tan(vfov / 2),
    (width * margin) / 2 / Math.tan(hfov / 2),
  );

  const target = center.clone();
  const position = center.clone().addScaledVector(normal, distance);
  return { position, target };
}
