// src/camera/CameraController.js
import * as THREE from 'three';

export class CameraController {
  constructor(camera, controls) {
    this.camera = camera;
    this.controls = controls;
    
    // Animation state
    this.isAnimating = false;
    this.animationId = null;
    
    // Original camera position and target for reset
    this.originalCameraPosition = new THREE.Vector3(25.688755018841892, 4.3063773636979565, 15.100411821420774);
    this.originalTarget = new THREE.Vector3(0.17666347376958655, 7.040941209607237, 1.8224583297318953);
    
    // UI camera position for zoomed view
    this.uiCameraPosition = new THREE.Vector3(
      11.806177745161065,
      12.94484623673,
      -4.594371204038005
    );
  }

  // Function to animate camera to screen
  zoomToScreen(screenObject, onComplete = null) {
    if (this.isAnimating) return;
    
    this.isAnimating = true;
    
    // Get the screen's world position
    const screenPosition = new THREE.Vector3();
    screenObject.getWorldPosition(screenPosition);
    
    this.controls.minDistance = 0;
    this.controls.maxDistance = Infinity;
    
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
        this.controls.minDistance = 9;
        this.controls.maxDistance = 15;
        
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
        this.controls.minDistance = 20; // Min zoom in
        this.controls.maxDistance = 45; // Max zoom out
        
        // Call completion callback if provided
        if (onComplete) {
          onComplete();
        }
      }
    };
    
    animateReset();
  }

  // Setup camera constraints and limits
  setupConstraints() {
    const minTargetY = 6;
    const minTargetX = 1;
    const maxTargetX = -1;

    this.controls.addEventListener('change', () => {
      if (this.controls.target.y < minTargetY) {
        this.controls.target.y = minTargetY;
      }
      if (this.controls.target.x < minTargetX) {
        this.controls.target.x = minTargetX;
      }
      if (this.controls.target.x > maxTargetX) {
        this.controls.target.x = maxTargetX;
      }
    });

    this.controls.maxPolarAngle = 1.7; // Limit vertical rotation to prevent going below ground
    this.controls.minPolarAngle = 0; // Prevent looking directly up
    this.controls.minDistance = 20; // Min zoom in
    this.controls.maxDistance = 45; // Max zoom out
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