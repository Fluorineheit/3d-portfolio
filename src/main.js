import './style.scss'
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { updateProgress, showLoadingScreen } from './loading.js';
import { CameraController } from './camera/CameraController.js';
import { AssetLoader } from './loaders/AssetLoader.js';
import { EventManager } from './events/EventManager.js';
import { UIManager } from './ui/UIManager.js';
import { MenuController } from './ui/MenuController.js';
import { TrainLoop } from './scene/TrainLoop.js';
import { ViewControls } from './ui/ViewControls.js';

let trainLoop = null;
const clock = new THREE.Clock();

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

// Fill light for the parts of the model that are not baked (plain-color materials).
// Baked lightmaps use MeshBasicMaterial and ignore these.
scene.add(new THREE.HemisphereLight(0xb8c4ff, 0x2a2233, 1.6));
const moonLight = new THREE.DirectionalLight(0xdfe6ff, 1.2);
moonLight.position.set(30, 50, 20);
scene.add(moonLight);

// No logarithmic depth buffer: the scene is small (near 1 / far 200) and it disables early depth
// testing on every pixel, which made the whole scene (and the moving train) noticeably slower.
const renderer = new THREE.WebGLRenderer({canvas: canvas, antialias: true });
renderer.setSize( window.innerWidth, window.innerHeight );
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

const controls = new OrbitControls( camera, renderer.domElement );
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.enablePan = true;
controls.update();
controls.target.set(-1, 6, -0.18277228675437365)

// Initialize all systems
assetLoader = new AssetLoader();
uiManager = new UIManager(scene, camera, controls);
cameraController = new CameraController(camera, controls);
cameraController.setupConstraints();
eventManager = new EventManager(camera, renderer, uiManager, cameraController);
eventManager.setScene(scene);

// Menu board on the plaza (BTN_* objects in the model) -> About / Projects / Credits
const menuController = new MenuController({
  camera, cameraController, uiManager, renderer,
  renderNow: () => renderer.render(scene, camera),
});
eventManager.setMenuController(menuController);
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
  menuController.setScene(glb.scene);

  // The train drives along the viaduct and loops
  const train = glb.scene.getObjectByName('Train_Root');
  const viaduct = glb.scene.getObjectByName('BAKE_Viaduct');
  if (train && viaduct) trainLoop = new TrainLoop(train, viaduct, renderer);

  // Panning stays over the map: the pivot stops PAN_MARGIN short of the street area's edge, and the
  // camera (which trails it) no further than CAMERA_MARGIN past it, so the empty void stays out of view
  const PAN_MARGIN = 20;
  const CAMERA_MARGIN = 16;
  const streets = glb.scene.getObjectByName('BAKE_Streets');
  if (streets) {
    const map = new THREE.Box3().setFromObject(streets);
    cameraController.panBounds = map.clone().expandByScalar(-PAN_MARGIN);
    cameraController.cameraBounds = map.clone().expandByScalar(CAMERA_MARGIN);
  }

  // Panning and zooming keep the camera out of the buildings
  const obstacles = ['Cafe_Root', 'BAKE_Parking']
    .map((name) => glb.scene.getObjectByName(name))
    .filter(Boolean)
    .map((object) => new THREE.Box3().setFromObject(object).expandByScalar(1.5));
  cameraController.setObstacles(obstacles);

  // Opening shot = the CAM_Start camera from Blender, orbiting around the cafe
  const startCamera = glb.scene.getObjectByName('CAM_Start');
  const cafe = glb.scene.getObjectByName('Cafe_Root');
  if (startCamera?.isCamera) {
    const focus = cafe ? cafe.getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(0, 8, 0)) : new THREE.Vector3(0, 8, 0);
    cameraController.setStartView(startCamera, focus);
  }
},
null,
(error) => {
  console.error('Failed to load 3D model:', error);
});


// "How to move" hint (closable, ? brings it back) and a Reset view button, once loading is done
const viewControls = new ViewControls({ cameraController, menuController, controls });
window.addEventListener('loading-done', () => viewControls.show(), { once: true });

// Wheel zoom is applied inside OrbitControls' own event handler, not in update(), so listen for it
let viewChanged = false;
controls.addEventListener('change', () => { viewChanged = true; });

const render = () =>{
  // Cap the step so a background tab doesn't make the train jump on return
  const dt = Math.min(clock.getDelta(), 0.1);
  trainLoop?.update(dt);
  menuController.update(dt);
  viewControls.update();
  const orbited = controls.update();
  const clamped = cameraController.clampPan();   // keep panning inside the plaza
  const cameraMoved = orbited || clamped || viewChanged;
  viewChanged = false;

  // With About/Credits open the view is still: only redraw when the camera moves or the
  // surface/pixel ratio changed, so the sharper (supersampled) view costs nothing while idle.
  const idle = menuController.isInSection() && !cameraController.getIsAnimating();
  const dirty = menuController.takeDirty();
  if (!idle || cameraMoved || dirty) renderer.render( scene, camera );
  
  window.requestAnimationFrame(render);
} 

render()

initializeApp();
