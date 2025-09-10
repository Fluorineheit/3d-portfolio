// src/loaders/AssetLoader.js
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { updateProgress } from '../loading.js';

export class AssetLoader {
  constructor() {
    // Loading managers
    this.loadingManager = new THREE.LoadingManager();
    this.textureLoader = new THREE.TextureLoader(this.loadingManager);
    this.gltfLoader = new GLTFLoader(this.loadingManager);
    
    // Texture map configuration
    this.textureMap = {
      Floor: { texture: '/textures/MainFloorBake.jpg' },
      MainBuilding: { texture: '/textures/BuildingBake.jpg' },
      Items: { texture: '/textures/ItemsBake.jpg' },
      Tree: { texture: '/textures/holobake.png' },
      Text: { texture: '/textures/FontBake.jpg' },
      ClickableScreen_Raycaster: { texture: '/textures/Clickable.jpg' }
    };
    
    // Loaded textures storage
    this.loadedTextures = {
      texture: {}
    };
    
    // Font definitions
    this.fonts = [
      {
        name: 'Searider Falcon Hollow',
        url: './fonts/SeariderFalcon3DHollow.ttf',
        weight: 'normal',
        style: 'normal'
      },
      {
        name: 'Searider Falcon',
        url: './fonts/SeariderFalcon3D.ttf',
        weight: 'normal',
        style: 'normal'
      },
      {
        name: 'Conthrax',
        url: './fonts/Conthrax-SemiBold.otf',
        weight: 'normal',
        style: 'normal'
      },
      {
        name: 'SeariderFalconPunch',
        url: './fonts/SeariderFalconPunch.otf',
        weight: 'normal',
        style: 'normal'
      }
    ];
    
    // Callbacks
    this.onProgressCallback = null;
    this.onCompleteCallback = null;
    
    this.setupLoadingManager();
    this.preloadTextures();
  }

  // Setup loading manager with progress tracking
  setupLoadingManager() {
    this.loadingManager.onProgress = (url, itemsLoaded, itemsTotal) => {
      const progress = 30 + (itemsLoaded / itemsTotal) * 70;
      updateProgress(progress);
      
      if (this.onProgressCallback) {
        this.onProgressCallback(url, itemsLoaded, itemsTotal, progress);
      }
    };

    this.loadingManager.onLoad = () => {
      updateProgress(100, "All assets loaded.");
      
      if (this.onCompleteCallback) {
        this.onCompleteCallback();
      }
    };

    this.loadingManager.onError = (url) => {
      console.error(`Failed to load asset: ${url}`);
    };
  }

  // Preload all textures
  preloadTextures() {
    Object.entries(this.textureMap).forEach(([key, paths]) => {
      const texturePath = this.textureLoader.load(paths.texture);
      texturePath.channel = 1;
      texturePath.flipY = false;
      texturePath.colorSpace = THREE.SRGBColorSpace;
      this.loadedTextures.texture[key] = texturePath;
    });
  }

  // Load custom fonts
  async loadCustomFonts() {
    updateProgress(5, "Loading custom fonts...");
    
    try {
      // Load all fonts
      const loadedFonts = await Promise.all(
        this.fonts.map(fontConfig => {
          const font = new FontFace(fontConfig.name, `url(${fontConfig.url})`, {
            weight: fontConfig.weight,
            style: fontConfig.style
          });
          return font.load();
        })
      );

      // Add fonts to document
      loadedFonts.forEach(font => {
        document.fonts.add(font);
      });

      return true;
    } catch (error) {
      console.warn('Failed to load custom fonts:', error);
      return false;
    }
  }

  // Load a single SVG icon
  async loadSVGIcon(iconPath) {
    try {
      const response = await fetch(iconPath);
      const svgText = await response.text();
      
      // Create an image from the SVG
      const img = new Image();
      const svgBlob = new Blob([svgText], { type: 'image/svg+xml' });
      const url = URL.createObjectURL(svgBlob);
      
      return new Promise((resolve, reject) => {
        img.onload = () => {
          URL.revokeObjectURL(url);
          resolve(img);
        };
        img.onerror = reject;
        img.src = url;
      });
    } catch (error) {
      console.warn(`Failed to load SVG icon: ${iconPath}`, error);
      return null;
    }
  }

  // Load social media icons
  async loadSocialIcons() {
    updateProgress(15, "Loading social media icons...");
    
    const iconPaths = [
      { name: 'linkedin', path: '/icons/linkedin-color.svg' },
      { name: 'github', path: '/icons/github.svg' },
      { name: 'email', path: '/icons/gmail.svg' },
    ];

    const iconCache = {};
    const loadPromises = iconPaths.map(async (icon) => {
      const img = await this.loadSVGIcon(icon.path);
      if (img) {
        iconCache[icon.name] = img;
      }
      return { name: icon.name, loaded: !!img };
    });

    const results = await Promise.all(loadPromises);
    return iconCache;
  }

  // Load GLTF model and apply textures
  loadModel(modelPath, onLoad, onProgress = null, onError = null) {
    this.gltfLoader.load(
      modelPath,
      (glb) => {
        // Apply textures to model
        glb.scene.traverse((child) => {
          if (child.isMesh) {
            Object.keys(this.textureMap).forEach((key) => {
              if (child.name.toLowerCase().includes(key.toLowerCase())) {
                const material = new THREE.MeshBasicMaterial({
                  map: this.loadedTextures.texture[key],
                });
                child.material = material;
              }
            });
          }
        });
        
        if (onLoad) {
          onLoad(glb);
        }
      },
      onProgress,
      onError
    );
  }

  // Initialize all assets
  async initializeAssets() {
    try {
      // Load fonts first
      await this.loadCustomFonts();
      
      // Load social icons
      const iconCache = await this.loadSocialIcons();
      
      return {
        success: true,
        iconCache,
        textures: this.loadedTextures
      };
    } catch (error) {
      console.error('Failed to initialize assets:', error);
      return {
        success: false,
        error
      };
    }
  }

  // Get loaded textures
  getTextures() {
    return this.loadedTextures;
  }

  // Get specific texture
  getTexture(key) {
    return this.loadedTextures.texture[key];
  }

  // Set progress callback
  setProgressCallback(callback) {
    this.onProgressCallback = callback;
  }

  // Set completion callback
  setCompleteCallback(callback) {
    this.onCompleteCallback = callback;
  }

  // Get loading manager for external loaders
  getLoadingManager() {
    return this.loadingManager;
  }

  // Check if all assets are loaded
  isLoaded() {
    return this.loadingManager.onLoad;
  }

  // Dispose of resources
  dispose() {
    // Dispose of textures
    Object.values(this.loadedTextures.texture).forEach(texture => {
      if (texture.dispose) {
        texture.dispose();
      }
    });
    
    this.loadedTextures.texture = {};
  }

  // Add new texture dynamically
  addTexture(key, texturePath, options = {}) {
    const texture = this.textureLoader.load(texturePath);
    texture.channel = options.channel || 1;
    texture.flipY = options.flipY !== undefined ? options.flipY : false;
    texture.colorSpace = options.colorSpace || THREE.SRGBColorSpace;
    
    this.loadedTextures.texture[key] = texture;
    return texture;
  }

  // Get loading progress info
  getLoadingInfo() {
    return {
      texturesLoaded: Object.keys(this.loadedTextures.texture).length,
      totalTextures: Object.keys(this.textureMap).length,
      fontsCount: this.fonts.length
    };
  }
}