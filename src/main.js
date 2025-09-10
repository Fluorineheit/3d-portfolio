import './style.scss'
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { UIManager } from './ui/UIManager.js';
import { CameraController } from './camera/CameraController.js';
import { AssetLoader } from './loaders/AssetLoader.js';

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

let assetLoader = null;

let iconCache = {};

window.addEventListener("mousemove", (e)=>{
  pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
  pointer.y = - (e.clientY / window.innerHeight) * 2 + 1;
})


async function initializeApp() {
  // Initialize asset loader
  assetLoader = new AssetLoader();
  
  // Load all assets
  const assetResult = await assetLoader.initializeAssets();
  
  if (assetResult.success) {
    iconCache = assetResult.iconCache;
    // Pass icon cache to UI manager
    uiManager.iconCache = iconCache;
  } else {
    console.error('Failed to load assets:', assetResult.error);
  }
}

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

assetLoader = new AssetLoader()
uiManager = new UIManager(scene, camera, controls);
cameraController = new CameraController(camera, controls);
cameraController.setupConstraints();

assetLoader.loadModel('models/porto-ril.glb', (glb) => {
  // Store reference to clickable screen
  glb.scene.traverse((child) => {
    if (child.isMesh && child.name.includes("ClickableScreen_Raycaster")) {
      clickableScreenMesh = child;
    }
  });
  
  scene.add(glb.scene);
}, 
null, // onProgress - handled by loading manager
(error) => {
  console.error('Failed to load 3D model:', error);
});

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