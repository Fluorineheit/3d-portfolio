import './style.scss'
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { updateProgress, showLoadingScreen } from './loading.js';
import { UIManager } from './ui/UIManager.js'; // Import the new UIManager
import { CameraController } from './CameraController.js';

const canvas = document.querySelector("#experience-canvas");
const sizes = {
  width: window.innerWidth,
  height: window.innerHeight
}

const rayCaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();

// Store reference to clickable screen for positioning
let clickableScreenMesh = null;

// Initialize UIManager (will be set up after scene is created)
let uiManager = null;

let cameraController = null;

window.addEventListener("mousemove", (e)=>{
  pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
  pointer.y = - (e.clientY / window.innerHeight) * 2 + 1;
})

async function loadCustomFonts() {
  const fonts = [
    new FontFace('Searider Falcon Hollow', 'url(./fonts/SeariderFalcon3DHollow.ttf)', {
      weight: 'normal',
      style: 'normal'
    }),
    new FontFace('Searider Falcon', 'url(./fonts/SeariderFalcon3D.ttf)', {
      weight: 'normal',
      style: 'normal'
    }),
    new FontFace('Conthrax', 'url(./fonts/Conthrax-SemiBold.otf)', {
      weight: 'normal',
      style: 'normal'
    }),
    new FontFace('SeariderFalconPunch', 'url(./fonts/SeariderFalconPunch.otf)', {
      weight: 'normal',
      style: 'normal'
    }),
  ];

  try {
    // Load all fonts
    const loadedFonts = await Promise.all(
      fonts.map(font => font.load())
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

async function initializeApp() {
  updateProgress(5, "Loading custom fonts...");
  await loadCustomFonts();

  updateProgress(15, "Loading social media icons...");
  // UIManager will handle loading social icons
  await uiManager.loadSocialIcons();
}

const loadingManager = new THREE.LoadingManager();

loadingManager.onProgress = (url, itemsLoaded, itemsTotal) => {
  const progress = 30 + (itemsLoaded / itemsTotal) * 70; 
  updateProgress(progress);
};

loadingManager.onLoad = () => {
  updateProgress(100, "All assets loaded.");
};

// loaders
const textureLoader = new THREE.TextureLoader(loadingManager);
const loader = new GLTFLoader(loadingManager)

const textureMap = {
  Floor : {texture: '/textures/MainFloorBake.jpg'},
  MainBuilding : {texture: '/textures/BuildingBake.jpg'},
  Items : {texture: '/textures/ItemsBake.jpg'},
  Tree : {texture: '/textures/holobake.png'},
  Text : {texture: '/textures/FontBake.jpg'},
  ClickableScreen_Raycaster: {texture: '/textures/Clickable.jpg'}
}

const loaderTexture = {
  texture: {},
}

Object.entries(textureMap).forEach(([key, paths]) => {
  const texturePath = textureLoader.load(paths.texture);
  texturePath.channel=1;
  texturePath.flipY = false;
  texturePath.colorSpace = THREE.SRGBColorSpace; 
  loaderTexture.texture[key] = texturePath;
})

// Enhanced cursor detection for UI elements
function updateCursor() {
  rayCaster.setFromCamera(pointer, camera);
  
  // Get raycast targets from UIManager or use scene children
  const raycastTargets = uiManager.isUIActive() ? 
    uiManager.getRaycastTargets() : 
    scene.children;
    
  const intersects = rayCaster.intersectObjects(raycastTargets, true);
  
  let isHovering = false;
  
  for(let i = 0; i < intersects.length; i++){
    const intersectedObject = intersects[i].object;
    
    // Check for main screen
    if(intersectedObject.name.includes("ClickableScreen_Raycaster")){
      isHovering = true;
      break;
    }
    
    // Check for UI elements
    if(intersectedObject.parent && intersectedObject.parent.name === "UIScreen") {
      isHovering = true;
      break;
    }
  }
  
  document.body.style.cursor = isHovering ? "pointer" : "default";
}

// Click event listener
window.addEventListener("click", (e) => {
  if (cameraController.getIsAnimating()) return;
  
  rayCaster.setFromCamera(pointer, camera);
  
  // Get raycast targets from UIManager or use scene children
  const raycastTargets = uiManager.isUIActive() ? 
    uiManager.getRaycastTargets() : 
    scene.children;
    
  const intersects = rayCaster.intersectObjects(raycastTargets, true);
  
  for(let i = 0; i < intersects.length; i++){
    const intersectedObject = intersects[i].object;
    
    // Check for main screen click
    if(intersectedObject.name.includes("ClickableScreen_Raycaster")){
      cameraController.zoomToScreen(intersectedObject); // CHANGE: use cameraController
      uiManager.show3DUI(intersectedObject);
      break;
    }
    
    // Check for UI element clicks
    if(intersectedObject.parent && intersectedObject.parent.name === "UIScreen") {
      uiManager.handleUIClick(intersectedObject);
      break;
    }
  }
});

// Scroll event listener
window.addEventListener('wheel', (event) => {
  if (uiManager.isUIActive()) {
    const handled = uiManager.handleScroll(event);
    if (handled) {
      return; 
    }
  }
});

loader.load('models/porto-ril.glb', (glb) =>  {
  glb.scene.traverse((child) => {
    if (child.isMesh) {
      Object.keys(textureMap).forEach((key) => {
        if(child.name.toLowerCase().includes(key.toLowerCase())){
          const material = new THREE.MeshBasicMaterial({
            map: loaderTexture.texture[key],
          });

          // Store reference to clickable screen
          if(child.name.includes("ClickableScreen_Raycaster")){
            clickableScreenMesh = child;
          }
          
          child.material = material
        }
      })
    }
  });
  scene.add(glb.scene);
})

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera( 
  75, 
  sizes.width / sizes.height, 
  1, 
  200 
);

camera.position.set( 24.45732511317063, 4.914951810646316, 15.36648732308515 );

const renderer = new THREE.WebGLRenderer({canvas: canvas, antialias: true, logarithmicDepthBuffer: true });
renderer.setSize( window.innerWidth, window.innerHeight );
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

const controls = new OrbitControls( camera, renderer.domElement );
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.enablePan = false;
controls.update();
controls.target.set(-1, 6, -0.18277228675437365)

cameraController = new CameraController(camera, controls);
cameraController.setupConstraints();

// Initialize UIManager after scene, camera, and controls are set up
uiManager = new UIManager(scene, camera, controls);

// Set callback for when user wants to go back to scene
uiManager.setBackToSceneCallback(() => {
  cameraController.resetCamera();
});

// event listener
window.addEventListener("resize", ()=>{
  sizes.width = window.innerWidth;
  sizes.height = window.innerHeight;

  // update camera - now handled by cameraController
  cameraController.onResize(sizes.width, sizes.height); // CHANGE: use cameraController
  
  // update renderer
  renderer.setSize(sizes.width, sizes.height)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio,2))
})

const render = () =>{
  controls.update();
  renderer.render( scene, camera );
  updateCursor();
  
  window.requestAnimationFrame(render);
} 

initializeApp();
render()