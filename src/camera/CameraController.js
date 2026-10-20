import * as THREE from 'three';
import { getScreenFacing } from './screenFacing.js';

// The opening shot is composed for a 16:9 screen. On narrower screens (portrait phones) the camera keeps
// that horizontal view and widens vertically instead of cropping the sides, up to MAX_FOV.
const DESIGN_ASPECT = 16 / 9;
const MAX_FOV = 80;


export class CameraController {
  constructor(camera, controls) {
    this.camera = camera;
    this.controls = controls; 
    this.homeNear = camera.near;

    // Animation state
    this.isAnimating = false;
    this.animationId = null;

    // Home view (replaced by the CAM_Start camera from the model in setStartView)
    this.originalCameraPosition = new THREE.Vector3(25.688755018841892, 4.3063773636979565, 15.100411821420774);
    this.originalTarget = new THREE.Vector3(0.17666347376958655, 7.040941209607237, 1.8224583297318953);
    this.homeLimits = { minDistance: 20, maxDistance: 45, maxPolarAngle: 1.7 };
    // Area the orbit pivot may be panned over (ground plane, THREE.Box3); set from the map in main.js.
    // Without it, the pivot stays within panRadius of the home pivot.
    this.panBounds = null;
    // Area the camera itself must stay over while panning (it trails the pivot by the orbit distance)
    this.cameraBounds = null;
    this.panRadius = 16;

    // UI camera position for zoomed view (computed from the screen in zoomToScreen)
    this.uiCameraPosition = new THREE.Vector3();
    this.screenDistance = 9;
  }

  /**
   * Use the Blender camera CAM_Start as the opening shot. The orbit pivot is placed on its line of
   * sight next to `focus` (the cafe), so the first frame matches Blender and dragging circles the cafe.
   */
  setStartView(startCamera, focus) {
    startCamera.updateWorldMatrix(true, false);
    const position = startCamera.getWorldPosition(new THREE.Vector3());
    const direction = startCamera.getWorldDirection(new THREE.Vector3());
    const along = Math.max(5, focus.clone().sub(position).dot(direction));
    const target = position.clone().addScaledVector(direction, along);

    this.baseFov = startCamera.fov;
    this.applyFov();

    this.originalCameraPosition.copy(position);
    this.originalTarget.copy(target);

    // Limits from the shot itself: never tilt lower than the opening angle (it sits just above the
    // ground), and never zoom out past the point where that angle would dip below the ground.
    const distance = position.distanceTo(target);
    const polar = Math.acos(THREE.MathUtils.clamp((position.y - target.y) / distance, -1, 1));
    const groundLimit = polar > Math.PI / 2 ? (target.y - 0.3) / Math.cos(Math.PI - polar) : Infinity;
    this.homeLimits = {
      minDistance: distance * 0.35,
      maxDistance: Math.min(distance * 1.15, groundLimit),
      maxPolarAngle: polar - 0.005,
    };
    this.hasStartView = true;
    Object.assign(this.controls, this.homeLimits);

    this.camera.position.copy(position);
    this.controls.target.copy(target);
    this.controls.update();
    // The limits above may nudge the camera (e.g. a tilt limit just inside the shot). Use the pose the
    // controls actually settled on as "home", so returning there doesn't snap at the end of the flight.
    this.originalCameraPosition.copy(this.camera.position);
  }

  // Distance at which the 3D UI panel (10.73 x 5.87) fits the view with some margin
  fitScreenDistance(width = 10.73, height = 5.87) {
    const vfov = THREE.MathUtils.degToRad(this.camera.fov);
    const hfov = 2 * Math.atan(Math.tan(vfov / 2) * this.camera.aspect);
    return Math.max((height * 1.3) / 2 / Math.tan(vfov / 2), (width * 1.15) / 2 / Math.tan(hfov / 2));
  }

  // Function to animate camera to screen
  zoomToScreen(screenObject, onComplete = null) {
    if (this.isAnimating) return;
    
    this.isAnimating = true;
    
    // Get the screen's world position
    const screenPosition = new THREE.Vector3();
    screenObject.getWorldPosition(screenPosition);

    // Stand in front of the screen, on the side facing the current camera
    this.screenDistance = this.fitScreenDistance();
    const facing = getScreenFacing(screenObject, this.camera.position);
    this.uiCameraPosition.copy(screenPosition).addScaledVector(facing, this.screenDistance);

    this.isAnimating = false; // flyTo takes over from here
    this.flyTo(this.uiCameraPosition, screenPosition, onComplete);
  }

  // Fly to a fixed shot and hold it: no orbiting, zoom only a little around the arrival distance
  flyTo(position, target, onComplete = null, { minZoom = 0.8, maxZoom = 1.4 } = {}) {
    if (this.isAnimating) return;
    this.isAnimating = true;
    this.stopGlide();

    this.controls.minDistance = 0;
    this.controls.maxDistance = Infinity;
    this.controls.maxPolarAngle = Math.PI; // free while flying; limits are restored on arrival
    this.controls.enablePan = false;

    // Animation parameters
    const startPosition = this.camera.position.clone();
    const startTarget = this.controls.target.clone();
    const endPosition = position.clone();
    const endTarget = target.clone();
    const arrival = endPosition.distanceTo(endTarget);
    // Close-ups (the About note) end nearer than the scene's near clipping plane, which would cut the
    // surface away: bring the near plane in for the visit, back out when returning home
    this.setNear(Math.min(this.homeNear, arrival * minZoom * 0.5));

    let progress = 0;
    const duration = 1500; // 1.5 seconds
    const startTime = Date.now();
    
    const animateCamera = () => {
      const elapsed = Date.now() - startTime;
      progress = Math.min(elapsed / duration, 1);
      
      // Easing function (ease-in-out)
      const eased = progress * progress * (3 - 2 * progress);
      
      // Interpolate camera position
      this.camera.position.lerpVectors(startPosition, endPosition, eased);
      
      // Interpolate controls target
      this.controls.target.lerpVectors(startTarget, endTarget, eased);
      this.controls.update();
      
      if (progress < 1) {
        this.animationId = requestAnimationFrame(animateCamera);
        this.controls.enableRotate = false;
        this.controls.enableZoom = false;
      } else {
        this.isAnimating = false;
        this.animationId = null;

        // LOCK camera movement, allow zoom only
        this.controls.enableRotate = false;
        this.controls.enableZoom = true;
        this.controls.minDistance = arrival * minZoom;
        this.controls.maxDistance = arrival * maxZoom;
        
        // Call completion callback if provided
        if (onComplete) {
          onComplete();
        }
      }
    };
    
    animateCamera();
  }

  // Function to reset camera to original position
  resetCamera(onComplete = null) {
    if (this.isAnimating) return;
    
    this.isAnimating = true;
    this.stopGlide();
    // No input during the flight (it would add new glide); re-enabled on arrival
    this.controls.enableRotate = false;
    this.controls.enableZoom = false;
    this.controls.enablePan = false;
    
    const startPosition = this.camera.position.clone();
    const startTarget = this.controls.target.clone();

    this.controls.minDistance = 0;
    this.controls.maxDistance = Infinity;
    this.controls.maxPolarAngle = Math.PI; // free while flying; limits are restored on arrival
    
    let progress = 0;
    const duration = 1500;
    const startTime = Date.now();
    
    const animateReset = () => {
      const elapsed = Date.now() - startTime;
      progress = Math.min(elapsed / duration, 1);
      
      const eased = progress * progress * (3 - 2 * progress);
      
      this.camera.position.lerpVectors(startPosition, this.originalCameraPosition, eased);
      this.controls.target.lerpVectors(startTarget, this.originalTarget, eased);
      this.controls.update();
      
      if (progress < 1) {
        this.animationId = requestAnimationFrame(animateReset);
      } else {
        this.isAnimating = false;
        this.animationId = null;

        this.controls.enableRotate = true;
        this.controls.enableZoom = true;
        this.controls.enablePan = true;
        Object.assign(this.controls, this.homeLimits);
        this.setNear(this.homeNear);
        
        // Call completion callback if provided
        if (onComplete) {
          onComplete();
        }
      }
    };
    
    animateReset();
  }

  // Orbit limits: distances and tilt come from the opening shot (setStartView). Panning slides the
  // pivot along the ground (not up/down), and clampPan keeps it near the home pivot.
  setupConstraints() {
    this.controls.minPolarAngle = 0;
    this.controls.screenSpacePanning = false;
    Object.assign(this.controls, this.homeLimits);
  }

  /**
   * Keep the panned pivot over the map (panBounds, or within panRadius of the home pivot) and at the
   * home pivot's height. The camera moves with it, so hitting the edge just stops the pan instead of
   * turning the view.
   * Returns true when it had to move the camera.
   */
  clampPan() {
    // Only at the home view (sections turn panning off) and once the opening shot set the home pivot
    if (this.isAnimating || !this.controls.enablePan || !this.hasStartView) return false;
    const target = this.controls.target;
    const allowed = new THREE.Vector3(target.x, this.originalTarget.y, target.z);
    if (this.panBounds) {
      allowed.x = THREE.MathUtils.clamp(allowed.x, this.panBounds.min.x, this.panBounds.max.x);
      allowed.z = THREE.MathUtils.clamp(allowed.z, this.panBounds.min.z, this.panBounds.max.z);
    } else {
      const dx = allowed.x - this.originalTarget.x;
      const dz = allowed.z - this.originalTarget.z;
      const d = Math.hypot(dx, dz);
      if (d > this.panRadius) {
        allowed.x = this.originalTarget.x + (dx * this.panRadius) / d;
        allowed.z = this.originalTarget.z + (dz * this.panRadius) / d;
      }
    }
    // The camera trails the pivot: if it would leave its area, hold the whole rig back
    if (this.cameraBounds) {
      const { min, max } = this.cameraBounds;
      const cx = this.camera.position.x + (allowed.x - target.x);
      const cz = this.camera.position.z + (allowed.z - target.z);
      allowed.x += THREE.MathUtils.clamp(cx, min.x, max.x) - cx;
      allowed.z += THREE.MathUtils.clamp(cz, min.z, max.z) - cz;
    }
    let moved = false;
    if (allowed.distanceToSquared(target) > 1e-8) {
      const shift = allowed.sub(target);
      target.add(shift);
      this.camera.position.add(shift);
      moved = true;
    }

    return this.keepCameraOutside() || moved;
  }

  // Buildings the camera must not enter (THREE.Box3 in world space)
  setObstacles(obstacles) {
    this.obstacles = obstacles;
  }

  // Panned and zoomed in, the camera could end up inside a building: push it back out through the
  // nearest side (or the roof). Returns true when it moved the camera.
  keepCameraOutside() {
    const p = this.camera.position;
    let moved = false;
    for (const box of this.obstacles ?? []) {
      if (!box.containsPoint(p)) continue;
      const exits = [
        ['x', box.min.x, p.x - box.min.x], ['x', box.max.x, box.max.x - p.x],
        ['z', box.min.z, p.z - box.min.z], ['z', box.max.z, box.max.z - p.z],
        ['y', box.max.y, box.max.y - p.y],
      ];
      const [axis, value] = exits.reduce((a, b) => (b[2] < a[2] ? b : a));
      p[axis] = value;
      moved = true;
    }
    return moved;
  }

  // Drop the leftover glide from a drag (damping), so it doesn't keep turning the camera after a flight.
  // OrbitControls keeps it in private fields (three r179).
  stopGlide() {
    this.controls._sphericalDelta?.set(0, 0, 0);
    this.controls._panOffset?.set(0, 0, 0);
    if ('_scale' in this.controls) this.controls._scale = 1;
  }

  // Check if camera is currently animating
  getIsAnimating() {
    return this.isAnimating;
  }

  // Cancel current animation
  cancelAnimation() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
      this.isAnimating = false;
    }
  }

  // Update camera aspect ratio on resize
  onResize(width, height) {
    this.camera.aspect = width / height;
    this.applyFov();
  }

  // Near clipping plane; the scene's own value (homeNear) keeps depth precision for the wide views
  setNear(near) {
    if (this.camera.near === near) return;
    this.camera.near = near;
    this.camera.updateProjectionMatrix();
  }

  // Vertical field of view for the current aspect (see DESIGN_ASPECT)
  applyFov() {
    const base = this.baseFov ?? this.camera.fov;
    this.baseFov = base;
    let fov = base;
    if (this.camera.aspect < DESIGN_ASPECT) {
      const halfH = Math.atan(Math.tan(THREE.MathUtils.degToRad(base) / 2) * DESIGN_ASPECT);
      fov = Math.min(MAX_FOV, THREE.MathUtils.radToDeg(2 * Math.atan(Math.tan(halfH) / this.camera.aspect)));
    }
    this.camera.fov = fov;
    this.camera.updateProjectionMatrix();
  }

  // Get current camera info for debugging
  getCameraInfo() {
    return {
      position: this.camera.position.clone(),
      target: this.controls.target.clone(),
      isAnimating: this.isAnimating
    };
  }
}