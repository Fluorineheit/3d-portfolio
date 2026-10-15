// src/ui/SurfaceDisplay.js
// Paints a canvas onto a flat mesh from the model (like the videotron UI), so content lives on the
// object itself. Clickable areas are found from the hit's UV, so no extra hitbox meshes are needed.
import * as THREE from 'three';

export class SurfaceDisplay {
  /**
   * mesh: flat mesh with a 0-1 UV layout (glTF: v = 0 at the top)
   * draw(ctx, width, height, hoveredId) -> [{ id, x, y, w, h }] clickable areas in layout pixels
   * scale: render resolution multiplier. Designs keep drawing in `width` x `height` layout pixels;
   *        the canvas is `scale` times larger so close-ups stay sharp.
   */
  constructor(mesh, { width, height, draw, scale = 1 }) {
    this.mesh = mesh;
    this.draw = draw;
    this.width = width;
    this.height = height;
    this.scale = scale;
    this.canvas = document.createElement('canvas');
    this.canvas.width = Math.round(width * scale);
    this.canvas.height = Math.round(height * scale);
    this.ctx = this.canvas.getContext('2d');
    this.regions = [];
    this.hovered = null;

    this.texture = new THREE.CanvasTexture(this.canvas);
    this.texture.flipY = false; // glTF UVs: canvas top = v 0
    this.texture.colorSpace = THREE.SRGBColorSpace;
    this.texture.anisotropy = 16; // clamped to what the GPU supports; keeps text crisp at an angle

    mesh.material = new THREE.MeshBasicMaterial({ map: this.texture, toneMapped: false });
    this.redraw();
    // Custom fonts (Conthrax, Searider Falcon) load asynchronously; redraw once they are ready
    document.fonts?.ready.then(() => this.redraw());
  }

  redraw() {
    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.ctx.setTransform(this.scale, 0, 0, this.scale, 0, 0);
    this.regions = this.draw(this.ctx, this.width, this.height, this.hovered) ?? [];
    this.texture.needsUpdate = true;
  }

  // Clickable area under a raycast hit on this mesh (uses the hit's UV)
  regionAt(uv) {
    if (!uv) return null;
    const x = uv.x * this.width;
    const y = uv.y * this.height;
    const r = this.regions.find((a) => x >= a.x && x <= a.x + a.w && y >= a.y && y <= a.y + a.h);
    return r ? r.id : null;
  }

  setHovered(id) {
    if (id === this.hovered) return;
    this.hovered = id;
    this.redraw();
  }
}
