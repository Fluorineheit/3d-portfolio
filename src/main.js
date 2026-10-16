import './style.scss'
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { Intro, downloadFraction } from './intro/Intro.js';
import { LightsReveal } from './intro/LightsReveal.js';
import { CameraController } from './camera/CameraController.js';
import { AssetLoader } from './loaders/AssetLoader.js';
import { EventManager } from './events/EventManager.js';
import { UIManager } from './ui/UIManager.js';
import { MenuController } from './ui/MenuController.js';
import { TrainLoop } from './scene/TrainLoop.js';
import { ViewControls } from './ui/ViewControls.js';
import { sound } from './audio/SoundEngine.js';
import { TrainSound } from './audio/TrainSound.js';

let trainLoop = null;
let trainSound = null;
const clock = new THREE.Clock();

// Neon-sign intro: already on screen (index.html); its tubes follow the model download
const intro = new Intro();

const canvas = document.querySelector("#experience-canvas");

// Store reference to clickable screen for positioning
let clickableScreenMesh = null;

// System managers
let uiManager = null;
let cameraController = null;
let assetLoader = null;
let eventManager = null;
// Fonts the About / Credits boards draw with (they redraw once these are ready)
function initializeApp() {
  assetLoader.loadCustomFonts();
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
const fillLight = new THREE.HemisphereLight(0xb8c4ff, 0x2a2233, 1.6);
scene.add(fillLight);
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

assetLoader.loadModel('models/porto-ril.glb', async (glb) => {
  intro.setProgress(0.92);

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
  if (train && viaduct) {
    trainLoop = new TrainLoop(train, viaduct, renderer);
    trainSound = new TrainSound(trainLoop);
  }

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

  // Opening: the scene waits in the dark with only the cafe's neon sign lit. Compile and draw it once
  // behind the intro so the first visible frame doesn't stutter, then hand over.
  const sign = ['BAKE_Cafe1F_Live_4', 'BAKE_Cafe1F_Live_5'].map((name) => glb.scene.getObjectByName(name)).filter(Boolean);
  const reveal = new LightsReveal(glb.scene, [fillLight, moonLight], sign);
  reveal.dark();
  await uploadTextures(scene);
  await renderer.compileAsync(scene, camera).catch(() => {});
  renderer.render(scene, camera);

  intro.ready({
    signRect: () => screenRect(sign),
    onEnter: () => {
      // Enter is the user gesture browsers require before any sound
      sound.unlock();
      sound.click();
      startRendering();
    },
    onReveal: () => reveal.play(() => window.dispatchEvent(new Event('loading-done'))),
  });
},
(event) => intro.setProgress(0.9 * downloadFraction(event)),
(error) => {
  console.error('Failed to load 3D model:', error);
  intro.fail('Could not load the scene. Please refresh.');
});

// Send every texture to the GPU one at a time, letting the page breathe in between. Otherwise they
// all upload inside the first render: one multi-second task on slow / GPU-less machines.
async function uploadTextures(root) {
  const textures = new Set();
  root.traverse((object) => {
    const materials = Array.isArray(object.material) ? object.material : object.material ? [object.material] : [];
    for (const material of materials) for (const value of Object.values(material)) if (value?.isTexture) textures.add(value);
  });
  for (const texture of textures) {
    renderer.initTexture(texture);
    await yieldToMain();
  }
}

// Let the browser handle input / paint before continuing. Not setTimeout: background tabs throttle it
// to once a second, which would stall the load for anyone who switched tabs.
function yieldToMain() {
  if (globalThis.scheduler?.yield) return globalThis.scheduler.yield();
  return new Promise((resolve) => {
    const channel = new MessageChannel();
    channel.port1.onmessage = () => resolve();
    channel.port2.postMessage(null);
  });
}

// Where a flat object (like the sign) appears on screen (CSS px), or null if it's missing or behind
// the camera. Only its face counts: the box is flattened along its thinnest side, so the sign's depth
// doesn't make the rectangle bigger.
function screenRect(objects) {
  if (!objects.length) return null;
  const box = new THREE.Box3();
  objects.forEach((object) => box.expandByObject(object));
  const size = box.getSize(new THREE.Vector3());
  const thin = ['x', 'y', 'z'].reduce((a, b) => (size[b] < size[a] ? b : a));
  box.min[thin] = box.max[thin] = (box.min[thin] + box.max[thin]) / 2;
  camera.updateMatrixWorld();
  const rect = { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity };
  const corner = new THREE.Vector3();
  for (const x of [box.min.x, box.max.x]) for (const y of [box.min.y, box.max.y]) for (const z of [box.min.z, box.max.z]) {
    corner.set(x, y, z).project(camera);
    if (corner.z > 1) return null;
    const sx = (corner.x + 1) / 2 * window.innerWidth;
    const sy = (1 - corner.y) / 2 * window.innerHeight;
    rect.minX = Math.min(rect.minX, sx); rect.maxX = Math.max(rect.maxX, sx);
    rect.minY = Math.min(rect.minY, sy); rect.maxY = Math.max(rect.maxY, sy);
  }
  return { x: rect.minX, y: rect.minY, width: rect.maxX - rect.minX, height: rect.maxY - rect.minY };
}


// "How to move" hint (closable, ? brings it back) and a Reset view button, once loading is done
const viewControls = new ViewControls({ cameraController, menuController, controls });
window.addEventListener('loading-done', () => viewControls.show(), { once: true });

// Wheel zoom is applied inside OrbitControls' own event handler, not in update(), so listen for it
let viewChanged = false;
controls.addEventListener('change', () => { viewChanged = true; });

// Nothing is drawn until the visitor clicks Enter: the scene sits behind the intro (one frame is drawn
// when it's ready), so the page goes quiet on the Enter screen instead of rendering 60 fps under a black
// overlay. Saves battery, and lets page-speed tools (no GPU, software WebGL) finish their run.
let rendering = false;
function startRendering() {
  if (rendering) return;
  rendering = true;
  clock.getDelta();   // don't count the time spent on the intro as one long frame
  window.requestAnimationFrame(render);
}
// A resize clears the canvas: redraw the waiting frame so it isn't blank when the intro fades
window.addEventListener('resize', () => {
  if (!rendering) renderer.render(scene, camera);
});

const render = () =>{
  // Cap the step so a background tab doesn't make the train jump on return
  const dt = Math.min(clock.getDelta(), 0.1);
  trainLoop?.update(dt);
  trainSound?.update(dt, camera);
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

initializeApp();
