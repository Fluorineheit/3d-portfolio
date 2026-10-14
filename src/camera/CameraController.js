import * as THREE from 'three';
import { getScreenFacing } from './screenFacing.js';


export class CameraController {
  constructor(camera, controls) {
    this.camera = camera;
    this.controls = controls;

    // Animation state
    this.isAnimating = false;
    this.animationId = null;

    // Home view (replaced by the CAM_Start camera from the model in setStartView)
    this.originalCameraPosition = new THREE.Vector3(25.688755018841892, 4.3063773636979565, 15.100411821420774);
    this.originalTarget = new THREE.Vector3(0.17666347376958655, 7.040941209607237, 1.8224583297318953);
    this.homeLimits = { minDistance: 20, maxDistance: 45, maxPolarAngle: 1.7 };

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

    this.camera.fov = startCamera.fov;
    this.camera.updateProjectionMatrix();

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
      maxPolarAngle: polar + 0.005,
    };
    Object.assign(this.controls, this.homeLimits);

    this.camera.position.copy(position);
    this.controls.target.copy(target);
    this.controls.update();
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

    this.controls.minDistance = 0;
    this.controls.maxDistance = Infinity;
    this.controls.maxPolarAngle = Math.PI; // free while flying; limits are restored on arrival
    
    // Animation parameters
    const startPosition = this.camera.position.clone();
    const startTarget = this.controls.target.clone();
    const endTarget = screenPosition.clone();
    
    let progress = 0;
    const duration = 1500; // 1.5 seconds
    const startTime = Date.now();
    
    const animateCamera = () => {
      const elapsed = Date.now() - startTime;
      progress = Math.min(elapsed / duration, 1);
      
      // Easing function (ease-in-out)
      const eased = progress * progress * (3 - 2 * progress);
      
      // Interpolate camera position
      this.camera.position.lerpVectors(startPosition, this.uiCameraPosition, eased);
      
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
        this.controls.minDistance = this.screenDistance * 0.8;
        this.controls.maxDistance = this.screenDistance * 1.4;
        
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
        Object.assign(this.controls, this.homeLimits);
        
        // Call completion callback if provided
        if (onComplete) {
          onComplete();
        }
      }
    };
    
    animateReset();
  }

  // Setup camera constraints and limits
  // Orbit limits. Panning is off, so the pivot only moves through zoomToScreen/resetCamera;
  // distances and tilt come from the opening shot (setStartView).
  setupConstraints() {
    this.controls.minPolarAngle = 0;
    Object.assign(this.controls, this.homeLimits);
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