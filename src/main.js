import './style.scss'
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { updateProgress, showLoadingScreen } from './loading.js';
import { CameraController } from './camera/CameraController.js';
import { AssetLoader } from './loaders/AssetLoader.js';
import { EventManager } from './events/EventManager.js';
import { UIManager } from './ui/UIManager.js';

const canvas = document.querySelector("#experience-canvas");

// Store reference to clickable screen for positioning
let clickableScreenMesh = null;

// System managers
let uiManager = null;
let cameraController = null;
let assetLoader = null;
let eventManager = null;
let iconCache = {};

// Initialize all assets
async function initializeApp() {
  // Initialize asset loader
  assetLoader = new AssetLoader();
  
  // Load all assets
  const assetResult = await assetLoader.initializeAssets();
  
  if (assetResult.success) {
    iconCache = assetResult.iconCache;
    // Pass icon cache to UI manager
    uiManager.setIconCache(iconCache);
  } else {
    console.error('Failed to load assets:', assetResult.error);
  }
}

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera( 
  75, 
  window.innerWidth  / window.innerHeight, 
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

// Initialize all systems
assetLoader = new AssetLoader();
uiManager = new UIManager(scene, camera, controls);
cameraController = new CameraController(camera, controls);
cameraController.setupConstraints();
eventManager = new EventManager(camera, renderer, uiManager, cameraController);
eventManager.setScene(scene);

// Set callback for when user wants to go back to scene
uiManager.setBackToSceneCallback(() => {
  cameraController.resetCamera();
});

assetLoader.loadModel('models/porto-ril.glb', (glb) => {
  // Store reference to clickable screen
  glb.scene.traverse((child) => {
    if (child.isMesh && child.name.includes("ClickableScreen_Raycaster")) {
      clickableScreenMesh = child;
    }
  });
  
  scene.add(glb.scene);
}, 
null,
(error) => {
  console.error('Failed to load 3D model:', error);
});


const render = () =>{
  controls.update();
  renderer.render( scene, camera );
  
  window.requestAnimationFrame(render);
} 

render()

initializeApp();
