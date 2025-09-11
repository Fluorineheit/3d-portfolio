// src/ui/UIManager.js
import * as THREE from 'three';
import { gsap } from 'gsap';
import { UIRenderer } from './UIRenderer.js';
import { UIInteractions } from './UIInteractions.js';

export class UIManager {
  constructor(scene, camera, controls) {
    this.scene = scene;
    this.camera = camera;
    this.controls = controls;
    
    // UI State
    this.currentUIScreen = null;
    this.uiGroup = new THREE.Group();
    this.uiGroup.name = "UIGroup";
    
    // Initialize sub-systems
    this.renderer = new UIRenderer();
    this.interactions = new UIInteractions();
    
    // Callbacks
    this.onBackToScene = null;
    
    // Icon cache (will be set from external source)
    this.iconCache = {};
  }

  // Set icon cache from AssetLoader
  setIconCache(iconCache) {
    this.iconCache = iconCache;
    this.renderer.setIconCache(iconCache);
  }

  // Initialize UI system - preload images
  async initialize() {
    try {
      await this.renderer.preloadProjectImages();
      console.log('UI Manager initialized successfully');
    } catch (error) {
      console.warn('Failed to preload some images:', error);
      // Continue anyway - images will be loaded on demand
    }
  }

  // Load social icons (delegated to AssetLoader now, but keeping for compatibility)
  async loadSocialIcons() {
    // This method is now handled by AssetLoader
    // Keep for backward compatibility
    return this.iconCache;
  }

  // Create 3D UI Screen - now async
  async create3DUIScreen(position, rotation, scale = [4, 3, 1]) {
    const geometry = new THREE.PlaneGeometry(scale[0], scale[1]);
    const uiWidth = 2048 * (scale[0] / scale[1]);
    const uiHeight = 2048;
    const texture = await this.renderer.createUITexture(uiWidth, uiHeight);
    const material = new THREE.MeshBasicMaterial({ 
      map: texture, 
      transparent: true,
      side: THREE.DoubleSide
    });
    
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.copy(position);
    mesh.rotation.copy(rotation);
    mesh.name = "UIScreen";
    
    // Create invisible hitboxes for interactive elements
    const hitboxes = this.interactions.createUIHitboxes(mesh, scale);
    
    return { mesh, hitboxes };
  }

  // Function to show 3D UI - now async
  async show3DUI(screenObject) {
    if (this.currentUIScreen) return; // UI already shown
    
    // Get screen position and rotation
    const screenPosition = new THREE.Vector3();
    const screenRotation = new THREE.Euler();
    screenObject.getWorldPosition(screenPosition);
    screenObject.getWorldQuaternion(new THREE.Quaternion()).normalize();

    const degrees = 90;
    const radians = degrees * (Math.PI / 180);
    screenRotation.y += radians;
    
    // Position UI slightly in front of the screen
    const uiPosition = screenPosition.clone();
    uiPosition.add(new THREE.Vector3(0.19, 0.16, 0));
    
    try {
      // Create UI screen
      const { mesh: uiMesh } = await this.create3DUIScreen(
        uiPosition, 
        screenRotation,
        [10.73, 5.87, 1]
      );

      uiMesh.material.opacity = 0;
      this.currentUIScreen = uiMesh;
      
      // Update interaction system references
      this.interactions.setCurrentUIScreen(this.currentUIScreen);
      
      this.uiGroup.add(uiMesh);
      this.scene.add(this.uiGroup);
      
      // Start with about section
      await this.updateUIContent('about');

      gsap.to(uiMesh.material, { 
        opacity: 1, 
        duration: 0.5, 
        delay: 0.1  
      });
    } catch (error) {
      console.error('Failed to create UI screen:', error);
      // Create a fallback UI without images
      await this.createFallbackUI(screenObject);
    }
  }

  // Create fallback UI if main UI creation fails
  async createFallbackUI(screenObject) {
    const screenPosition = new THREE.Vector3();
    const screenRotation = new THREE.Euler();
    screenObject.getWorldPosition(screenPosition);
    
    const degrees = 90;
    const radians = degrees * (Math.PI / 180);
    screenRotation.y += radians;
    
    const uiPosition = screenPosition.clone();
    uiPosition.add(new THREE.Vector3(0.19, 0.16, 0));
    
    // Create simple fallback geometry
    const geometry = new THREE.PlaneGeometry(10.73, 5.87);
    const canvas = document.createElement('canvas');
    canvas.width = 2048;
    canvas.height = 1024;
    const ctx = canvas.getContext('2d');
    
    // Simple fallback content
    ctx.fillStyle = '#1c2d49';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#ffffff';
    ctx.font = '48px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('UI Loading...', canvas.width/2, canvas.height/2);
    
    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.MeshBasicMaterial({ 
      map: texture, 
      transparent: true,
      side: THREE.DoubleSide
    });
    
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.copy(uiPosition);
    mesh.rotation.copy(screenRotation);
    mesh.name = "UIScreen";
    
    this.currentUIScreen = mesh;
    this.interactions.setCurrentUIScreen(this.currentUIScreen);
    this.uiGroup.add(mesh);
    this.scene.add(this.uiGroup);
    
    gsap.to(mesh.material, { opacity: 1, duration: 0.5 });
  }

  // Function to hide 3D UI
  hide3DUI() {
     if (this.currentUIScreen) {
      const screenToFade = this.currentUIScreen;
      this.currentUIScreen = null;
      this.interactions.setCurrentUIScreen(null);
      
      gsap.to(screenToFade.material, {
          opacity: 0,
          duration: 0.5,
          onComplete: () => {
              this.uiGroup.remove(screenToFade);
              this.uiGroup.clear(); 
              if (screenToFade.geometry) screenToFade.geometry.dispose();
              if (screenToFade.material) {
                if (screenToFade.material.map) screenToFade.material.map.dispose();
                screenToFade.material.dispose();
              }
          }
      });
    }
  }

  // Handle UI interactions
  handleUIClick(intersectedObject) {
    const callbacks = {
      onBackToScene: () => {
        this.hide3DUI();
        if (this.onBackToScene) {
          this.onBackToScene();
        }
      },
      onBackToProjects: () => {
        this.renderer.setCurrentProjectDetail(null);
        this.interactions.setCurrentProjectDetail(null);
        this.updateUIContent('experience');
      },
      onNavigate: (section) => {
        this.updateUIContent(section);
      },
      onProjectSelect: (project) => {
        this.renderer.setCurrentProjectDetail(project);
        this.interactions.setCurrentProjectDetail(project);
        this.updateUIContent('experience');
      }
    };
    
    this.interactions.handleUIClick(intersectedObject, callbacks);
  }

  // Update UI content (recreate texture with new content) - now async
  async updateUIContent(section) {
    if (!this.currentUIScreen) return;
    
    let content = { activeNav: section };
    
    // Store current section in mesh userData
    this.currentUIScreen.userData.currentSection = section;
    
    // Pass current UI screen reference to renderer
    this.renderer.currentUIScreen = this.currentUIScreen;
    
    const currentProjectDetail = this.renderer.getCurrentProjectDetail();
    if (currentProjectDetail) {
      content.projectDetail = currentProjectDetail;
      content.title = currentProjectDetail.title;
    } else {
      switch(section) {
        case 'about':
          content.title = 'About Me';
          content.type = 'about';
          break;
        case 'skills':
          content.title = 'My Skills';
          content.type = 'skills';
          break;
        case 'experience':
          content.title = 'Experience';
          content.type = 'experience';
          break;
      }
    }
    
    // Clear existing hitboxes
    this.interactions.clearHitboxes();
    
    try {
      // Create new texture with updated content
      const newTexture = await this.renderer.createUITexture(2048, 1024, content);
      
      // Dispose old texture
      if (this.currentUIScreen.material.map) {
        this.currentUIScreen.material.map.dispose();
      }
      
      this.currentUIScreen.material.map = newTexture;
      this.currentUIScreen.material.needsUpdate = true;
      
      // Add new hitboxes
      const newHitboxes = this.interactions.createUIHitboxes(this.currentUIScreen, [10.73, 5.87, 1]);
    } catch (error) {
      console.error('Failed to update UI content:', error);
      // Keep existing content if update fails
    }
  }

  // Get raycast targets for UI interaction
  getRaycastTargets() {
    return this.interactions.getRaycastTargets();
  }

  // Handle scroll events for project list
  handleScroll(event) {
    // Only scroll if the UI is active and we're in the 'experience' section
    if (!this.currentUIScreen || 
        this.currentUIScreen.userData.currentSection !== 'experience' || 
        this.renderer.getCurrentProjectDetail()) {
      return false; // Return false to indicate scroll wasn't handled
    }

    // Let renderer handle the scroll logic
    this.renderer.handleScroll(event.deltaY);
    
    // Redraw the experience section with the new scroll position
    this.updateUIContent('experience');
    
    return true; // Return true to indicate scroll was handled
  }

  // Set callback for when user wants to go back to scene
  setBackToSceneCallback(callback) {
    this.onBackToScene = callback;
  }

  // Check if UI is currently active
  isUIActive() {
    return this.currentUIScreen !== null;
  }

  // Get current UI screen for external access
  getCurrentUIScreen() {
    return this.currentUIScreen;
  }

  // Enable/disable debug mode for hitboxes
  setDebugMode(enabled) {
    this.interactions.setDebugMode(enabled);
    if (this.currentUIScreen) {
      this.interactions.toggleHitboxVisibility(enabled);
    }
  }

  // Get renderer instance for external access
  getRenderer() {
    return this.renderer;
  }

  // Get interactions instance for external access
  getInteractions() {
    return this.interactions;
  }

  // Get debug information
  getDebugInfo() {
    return {
      isUIActive: this.isUIActive(),
      currentSection: this.currentUIScreen?.userData?.currentSection || null,
      currentProject: this.renderer.getCurrentProjectDetail()?.title || null,
      rendererInfo: this.renderer.getDebugInfo?.() || {},
      interactionsInfo: this.interactions.getDebugInfo()
    };
  }

  // Cleanup and dispose resources
  dispose() {
    this.hide3DUI();
    this.interactions.reset();
    this.renderer = null;
    this.interactions = null;
  }
}