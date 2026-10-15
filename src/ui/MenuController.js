// src/ui/MenuController.js
// The menu board on the plaza: BTN_* objects from the model fly the camera to a section.
// About and Credits are painted onto objects in the scene (the pinned note, the credits billboard),
// the same way the videotron shows its UI.
import * as THREE from 'three';
import { frameObjects } from '../camera/framing.js';
import { SurfaceDisplay } from './SurfaceDisplay.js';
import { drawAboutNote, drawCredits } from './surfaceDesigns.js';

// Button object name (as in Blender) -> section
const ACTIONS = {
  BTN_Projects: 'projects',
  BTN_AboutMe: 'about',
  BTN_Credits: 'credits',
};
const HOVER_GLOW = 0.45;    // plate tint strength on hover
const HOVER_SCALE = 1.06;

export class MenuController {
  constructor({ camera, cameraController, uiManager, renderer }) {
    this.camera = camera;
    this.cameraController = cameraController;
    this.uiManager = uiManager;
    this.renderer = renderer;

    this.buttons = new Map();   // name -> { object, glow }
    this.screen = null;
    this.surfaces = {};         // section -> SurfaceDisplay
    this.active = null;         // section currently open, null at the plaza
    this.hovered = null;

    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') this.back();
    });
  }

  setScene(root) {
    let note = null;
    let credits = null;
    root.traverse((o) => {
      if (ACTIONS[o.name]) this.buttons.set(o.name, { object: o, glow: this.prepareGlow(o) });
      if (o.isMesh && o.name.includes('ClickableScreen_Raycaster')) this.screen = o;
      if (o.isMesh && o.name === 'ABOUT_Note') note = o;
      if (o.isMesh && o.name === 'CREDITS_Screen') credits = o;
    });
    // Canvas sizes follow each surface's proportions (note 0.82 x 0.58, billboard 11 x 7.35)
    // (scale = render resolution; the note is seen up close, so it gets more pixels)
    if (note) this.surfaces.about = new SurfaceDisplay(note, { width: 1024, height: 724, draw: drawAboutNote, scale: 2 });
    if (credits) this.surfaces.credits = new SurfaceDisplay(credits, { width: 2048, height: 1368, draw: drawCredits, scale: 1.5 });
  }

  // Hover = the dark plate lights up in the button's own label color and the button pops out a little.
  // Each button gets its own material copies so hover only affects that button.
  prepareGlow(button) {
    const labels = [];
    const plates = [];
    button.traverse((mesh) => {
      if (!mesh.isMesh || !mesh.material?.emissive) return;
      mesh.material = mesh.material.clone();
      (mesh.material.emissive.getHex() === 0 ? plates : labels).push(mesh.material);
    });
    const color = labels[0]?.emissive.clone() ?? new THREE.Color(0xff5fb2);
    return {
      plates: plates.map((material) => ({ material, base: material.emissive.clone(), baseIntensity: material.emissiveIntensity })),
      color,
      scale: button.scale.clone(),
    };
  }

  // The button an intersected mesh belongs to (multi-material buttons load as a group of meshes)
  buttonFor(object) {
    for (let o = object; o; o = o.parent) {
      if (this.buttons.has(o.name)) return o.name;
    }
    return null;
  }

  hover(name) {
    if (name === this.hovered) return;
    for (const [key, { object, glow }] of this.buttons) {
      const on = key === name;
      for (const { material, base, baseIntensity } of glow.plates) {
        material.emissive.copy(on ? glow.color : base);
        material.emissiveIntensity = on ? HOVER_GLOW : baseIntensity;
      }
      object.scale.copy(glow.scale).multiplyScalar(on ? HOVER_SCALE : 1);
    }
    this.hovered = name;
  }

  isAtPlaza() {
    return this.active === null && !this.uiManager.isUIActive() && !this.cameraController.getIsAnimating();
  }

  isInSection() {
    return this.active !== null;
  }

  open(name) {
    const section = ACTIONS[name];
    if (!section || !this.isAtPlaza()) return;
    this.hover(null);

    if (section === 'projects') {
      if (!this.screen) return;
      this.cameraController.zoomToScreen(this.screen);
      this.uiManager.show3DUI(this.screen).then(() => this.uiManager.updateUIContent('experience'));
      return;
    }

    const surface = this.surfaces[section];
    if (!surface) {
      console.warn(`MenuController: no surface for "${section}"`);
      return;
    }
    this.active = section;
    const { position, target } = frameObjects([surface.mesh], this.camera, this.camera.position, {
      margin: section === 'about' ? 1.6 : 1.12,
    });
    // About keeps the default zoom range tight so the note stays framed; other sections use the default
    const zoom = section === 'about' ? { minZoom: 0.9, maxZoom: 1.1 } : undefined;
    this.cameraController.flyTo(position, target, () => this.setSharp(true), zoom);
  }

  // While a note/billboard is open the view is still, so render above screen resolution
  // (supersampling): small text drawn on the surface stays clean instead of looking pixelated.
  setSharp(on) {
    if (!this.renderer) return;
    const base = Math.min(window.devicePixelRatio, 2);
    this.renderer.setPixelRatio(on ? Math.max(base, Math.min(window.devicePixelRatio * 1.6, 2)) : base);
    this.dirty = true;
  }

  // While a section is open the view is still, so main.js only redraws when something changed.
  // Returns (and clears) whether a redraw was requested since the last frame.
  takeDirty() {
    const d = this.dirty;
    this.dirty = false;
    return d;
  }

  // Click while a section is open: drawn areas on its surface, anything else goes back
  handleSectionClick(hit) {
    if (this.cameraController.getIsAnimating()) return;
    const surface = this.surfaces[this.active];
    const id = hit && surface && hit.object === surface.mesh ? surface.regionAt(hit.uv) : null;
    if (id === null) {
      if (!hit || hit.object !== surface?.mesh) this.back();
      return;
    }
    if (id === 'back') this.back();
    else window.open(id, id.startsWith('mailto:') ? '_self' : '_blank', 'noopener');
  }

  // Hover while a section is open: highlight drawn areas, returns whether something is clickable
  hoverSection(hit) {
    const surface = this.surfaces[this.active];
    if (!surface) return false;
    const id = hit && hit.object === surface.mesh ? surface.regionAt(hit.uv) : null;
    if (id !== surface.hovered) this.dirty = true;
    surface.setHovered(id);
    return id !== null;
  }

  back() {
    if (this.active === null || this.cameraController.getIsAnimating()) return;
    this.surfaces[this.active]?.setHovered(null);
    this.setSharp(false);
    this.cameraController.resetCamera(() => { this.active = null; });
  }
}
