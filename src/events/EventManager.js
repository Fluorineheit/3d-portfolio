// src/events/EventManager.js
import * as THREE from 'three';

export class EventManager {
  constructor(camera, renderer, uiManager, cameraController) {
    this.camera = camera;
    this.renderer = renderer;
    this.uiManager = uiManager;
    this.cameraController = cameraController;
    
    // Raycasting setup
    this.rayCaster = new THREE.Raycaster();
    this.pointer = new THREE.Vector2();
    
    // Scene reference (will be set later)
    this.scene = null;
    
    // Screen size tracking
    this.sizes = {
      width: window.innerWidth,
      height: window.innerHeight
    };
    
    // Bind methods to preserve 'this' context
    this.onMouseMove = this.onMouseMove.bind(this);
    this.onClick = this.onClick.bind(this);
    this.onWheel = this.onWheel.bind(this);
    this.onResize = this.onResize.bind(this);
    
    // Initialize event listeners
    this.setupEventListeners();
  }

  // Set scene reference
  setScene(scene) {
    this.scene = scene;
  }

  // Setup all event listeners
  setupEventListeners() {
    // Mouse movement for cursor updates and pointer tracking
    window.addEventListener("mousemove", this.onMouseMove);
    
    // Click events for interactions
    window.addEventListener("click", this.onClick);
    
    // Scroll events for UI navigation
    window.addEventListener('wheel', this.onWheel);
    
    // Resize events for responsive behavior
    window.addEventListener("resize", this.onResize);
  }

  // Handle mouse movement
  onMouseMove(event) {
    // Update pointer coordinates for raycasting
    this.pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
    this.pointer.y = -(event.clientY / window.innerHeight) * 2 + 1;
    
    // Update cursor based on what's under the mouse
    this.updateCursor();
  }

  // Handle click events
  onClick(event) {
    // Don't handle clicks during camera animation
    if (this.cameraController.getIsAnimating()) return;
    
    this.rayCaster.setFromCamera(this.pointer, this.camera);
    
    // Get appropriate raycast targets
    const raycastTargets = this.getRaycastTargets();
    const intersects = this.rayCaster.intersectObjects(raycastTargets, true);
    
    // Process intersections
    for (let i = 0; i < intersects.length; i++) {
      const intersectedObject = intersects[i].object;
      
      // Check for main screen click (enter UI mode)
      if (intersectedObject.name.includes("ClickableScreen_Raycaster")) {
        this.handleScreenClick(intersectedObject);
        break;
      }
      
      // Check for UI element clicks
      if (intersectedObject.parent && intersectedObject.parent.name === "UIScreen") {
        this.handleUIClick(intersectedObject);
        break;
      }
    }
  }

  // Handle wheel/scroll events
  onWheel(event) {
    // Let UIManager handle scroll if UI is active
    if (this.uiManager.isUIActive()) {
      const handled = this.uiManager.handleScroll(event);
      if (handled) {
        return; // Scroll was handled by UI, don't do anything else
      }
    }
    // If UI didn't handle scroll, you could add scene scroll logic here if needed
  }

  // Handle window resize
  onResize(event) {
    // Update sizes
    this.sizes.width = window.innerWidth;
    this.sizes.height = window.innerHeight;

    // Update camera through cameraController
    this.cameraController.onResize(this.sizes.width, this.sizes.height);
    
    // Update renderer
    this.renderer.setSize(this.sizes.width, this.sizes.height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  }

  // Handle main screen clicks (zoom to UI)
  handleScreenClick(screenObject) {
    this.cameraController.zoomToScreen(screenObject);
    this.uiManager.show3DUI(screenObject);
  }

  // Handle UI element clicks
  handleUIClick(intersectedObject) {
    this.uiManager.handleUIClick(intersectedObject);
  }

  // Get appropriate raycast targets based on current state
  getRaycastTargets() {
    if (this.uiManager.isUIActive()) {
      // Only raycast against the UI and its children (hitboxes)
      return this.uiManager.getRaycastTargets();
    } else {
      // Raycast against the whole scene (default)
      return this.scene ? this.scene.children : [];
    }
  }

  // Update cursor based on what's under the mouse
  updateCursor() {
    if (!this.scene) return;
    
    this.rayCaster.setFromCamera(this.pointer, this.camera);
    const raycastTargets = this.getRaycastTargets();
    const intersects = this.rayCaster.intersectObjects(raycastTargets, true);
    
    let isHovering = false;
    
    for (let i = 0; i < intersects.length; i++) {
      const intersectedObject = intersects[i].object;
      
      // Check for main screen
      if (intersectedObject.name.includes("ClickableScreen_Raycaster")) {
        isHovering = true;
        break;
      }
      
      // Check for UI elements
      if (intersectedObject.parent && intersectedObject.parent.name === "UIScreen") {
        isHovering = true;
        
        // Optional: Add specific hover effects for different UI elements
        this.handleUIHover(intersectedObject);
        break;
      }
    }
    
    // Update cursor style
    document.body.style.cursor = isHovering ? "pointer" : "default";
  }

  // Handle UI hover effects (optional enhancement)
  handleUIHover(intersectedObject) {
    const objectName = intersectedObject.name;
    
    // You can add specific hover effects here
    switch (objectName) {
      case 'BackButton':
        // Could add glow effect or texture change here
        break;
      case 'Nav_About':
      case 'Nav_Skills':
      case 'Nav_Experience':
        // Could add hover effects for navigation
        break;
      default:
        if (objectName.startsWith('Project_')) {
          // Could add hover effects for projects
        } else if (objectName.startsWith('Social_')) {
          // Could add hover effects for social media
        }
        break;
    }
  }

  // Get current mouse position in normalized coordinates
  getPointer() {
    return this.pointer.clone();
  }

  // Get current screen sizes
  getSizes() {
    return { ...this.sizes };
  }

  // Manual trigger for cursor update (useful for external calls)
  triggerCursorUpdate() {
    this.updateCursor();
  }

  // Add custom event listener
  addEventListener(type, listener, options = {}) {
    window.addEventListener(type, listener, options);
  }

  // Remove custom event listener
  removeEventListener(type, listener, options = {}) {
    window.removeEventListener(type, listener, options);
  }

  // Simulate click at specific coordinates (useful for testing)
  simulateClick(x, y) {
    const simulatedEvent = {
      clientX: x,
      clientY: y
    };
    
    // Update pointer position
    this.pointer.x = (x / window.innerWidth) * 2 - 1;
    this.pointer.y = -(y / window.innerHeight) * 2 + 1;
    
    // Trigger click handler
    this.onClick(simulatedEvent);
  }

  // Get intersected objects at current pointer position
  getIntersectedObjects() {
    if (!this.scene) return [];
    
    this.rayCaster.setFromCamera(this.pointer, this.camera);
    const raycastTargets = this.getRaycastTargets();
    return this.rayCaster.intersectObjects(raycastTargets, true);
  }

  // Enable/disable specific event types
  enableEvents(eventTypes = ['mousemove', 'click', 'wheel', 'resize']) {
    if (eventTypes.includes('mousemove')) {
      window.addEventListener("mousemove", this.onMouseMove);
    }
    if (eventTypes.includes('click')) {
      window.addEventListener("click", this.onClick);
    }
    if (eventTypes.includes('wheel')) {
      window.addEventListener('wheel', this.onWheel);
    }
    if (eventTypes.includes('resize')) {
      window.addEventListener("resize", this.onResize);
    }
  }

  // Disable specific event types
  disableEvents(eventTypes = ['mousemove', 'click', 'wheel', 'resize']) {
    if (eventTypes.includes('mousemove')) {
      window.removeEventListener("mousemove", this.onMouseMove);
    }
    if (eventTypes.includes('click')) {
      window.removeEventListener("click", this.onClick);
    }
    if (eventTypes.includes('wheel')) {
      window.removeEventListener('wheel', this.onWheel);
    }
    if (eventTypes.includes('resize')) {
      window.removeEventListener("resize", this.onResize);
    }
  }

  // Cleanup - remove all event listeners
  dispose() {
    this.disableEvents();
  }

  // Get debug information
  getDebugInfo() {
    return {
      pointerPosition: this.pointer,
      screenSizes: this.sizes,
      isUIActive: this.uiManager.isUIActive(),
      intersectedObjects: this.getIntersectedObjects().map(i => i.object.name)
    };
  }
}