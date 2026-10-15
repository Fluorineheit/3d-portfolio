// src/scene/TrainLoop.js
// Drives the train (Train_Root and its cars) along the viaduct and loops it. At both ends of the
// viaduct the train is clipped, so it slides in and out like a tunnel instead of floating past the map.
import * as THREE from 'three';

export class TrainLoop {
  /**
   * root: Train_Root (the cars are its children)
   * track: the viaduct object; the train runs along its X extent
   */
  constructor(root, track, renderer, { speed = 40, direction = 1, pause = 1 } = {}) {
    this.root = root;
    this.speed = speed;          // scene units per second (~3.2 units = 1 m)
    this.direction = direction;  // +1 = toward +X, -1 = toward -X
    this.pause = pause;          // seconds hidden between passes
    this.wait = 0;

    // Track ends and the train's extent relative to its root, along X
    const trackBox = new THREE.Box3().setFromObject(track);
    const trainBox = new THREE.Box3().setFromObject(root);
    const x = root.position.x;
    const back = trainBox.min.x - x;
    const front = trainBox.max.x - x;
    // Fully hidden before the first end, fully hidden after the second
    this.startX = direction > 0 ? trackBox.min.x - front : trackBox.max.x - back;
    this.endX = direction > 0 ? trackBox.max.x - back : trackBox.min.x - front;

    // Only draw the train between the viaduct's ends
    renderer.localClippingEnabled = true;
    const planes = [
      new THREE.Plane(new THREE.Vector3(1, 0, 0), -trackBox.min.x),
      new THREE.Plane(new THREE.Vector3(-1, 0, 0), trackBox.max.x),
    ];
    root.traverse((o) => {
      if (!o.isMesh) return;
      const mats = Array.isArray(o.material) ? o.material : [o.material];
      mats.forEach((m) => { m.clippingPlanes = planes; });
    });

    // Respect "reduce motion": leave the train parked where it was placed in Blender
    this.enabled = !window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  }

  update(dt) {
    if (!this.enabled) return;
    if (this.wait > 0) {
      this.wait -= dt;
      return;
    }
    const p = this.root.position;
    p.x += this.speed * this.direction * dt;
    const past = this.direction > 0 ? p.x >= this.endX : p.x <= this.endX;
    if (past) {
      p.x = this.startX;
      this.wait = this.pause;
    }
  }
}
