// src/intro/LightsReveal.js

const DARK = 0.07;   // how much of the baked light shows while "off"
const RAMP = 0.5;    // seconds for an area's share of the baked light to come up

// When each area switches on (seconds) and how much of the overall light it brings.
// Matched by the object's top-level name (or a prefix of it); anything else is "rest".
const AREAS = [
  { match: 'BAKE_StreetProps', at: 0.0, weight: 0.3 },   // street lamps first
  { match: 'BAKE_Underside', at: 0.35, weight: 0.1 },
  { match: 'BAKE_Parking', at: 0.35, weight: 0.08 },
  { match: 'BAKE_Plaza', at: 0.65, weight: 0.17 },
  { match: 'BTN_', at: 0.65, weight: 0 },
  { match: 'Gerobak', at: 0.65, weight: 0 },
  { match: 'Cafe_Root', at: 0.95, weight: 0.25 },
  { match: 'BAKE_Items', at: 0.95, weight: 0 },
];
const REST = { at: 1.25, weight: 0.1 };

// A tube catching: on / off / on / dim / on (seconds after its start)
const FLICKER = [[0, 0], [0.05, 1], [0.09, 0.1], [0.14, 0.8], [0.2, 0], [0.26, 1]];

function flicker(u) {
  if (u < 0) return 0;
  let value = 0;
  for (const [time, v] of FLICKER) if (u >= time) value = v;
  return value;
}

const ramp = (u) => Math.min(1, Math.max(0, u / RAMP));

/**
 * "Lights on" for the opening: the scene starts dark (only the cafe's neon sign is lit, matching the
 * intro sign), then the street lamps, plaza string lights, cafe and the rest switch on in turn while
 * the baked lighting rises with them. Restores every value exactly when done.
 */
export class LightsReveal {
  /**
   * root: the loaded model; lights: scene lights to dim (fill lights for unbaked materials);
   * keepOn: meshes that stay lit throughout (the neon sign).
   */
  constructor(root, lights = [], keepOn = []) {
    this.lights = lights.map((light) => ({ light, intensity: light.intensity }));
    this.areaOf = (object) => {
      let top = object;
      while (top.parent && top.parent !== root) top = top.parent;
      return AREAS.find((a) => top.name.startsWith(a.match)) ?? REST;
    };
    this.reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const keep = new Set(keepOn);
    const emissive = [];        // { mesh, slot, area }
    const base = new Map();     // unlit (baked / screen) material -> its color
    const areasByMaterial = new Map();

    root.traverse((mesh) => {
      if (!mesh.isMesh) return;
      const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      materials.forEach((material, slot) => {
        if (!material) return;
        if (material.isMeshBasicMaterial) {
          if (!base.has(material)) base.set(material, material.color.clone());
        } else if (material.emissive && material.emissiveIntensity > 0 && material.emissive.getHex() !== 0 && !keep.has(mesh)) {
          const area = this.areaOf(mesh);
          emissive.push({ mesh, slot, area });
          if (!areasByMaterial.has(material)) areasByMaterial.set(material, new Set());
          areasByMaterial.get(material).add(area);
        }
      });
    });

    // A material shared between areas (or with the sign) gets a copy per mesh, so each area can switch
    // on by itself. Unshared ones are left alone: other code keeps references to them (menu hover glow,
    // the train's clipping planes).
    const keptMaterials = new Set([...keep].flatMap((m) => (Array.isArray(m.material) ? m.material : [m.material])));
    this.tubes = emissive.map(({ mesh, slot, area }) => {
      let material = Array.isArray(mesh.material) ? mesh.material[slot] : mesh.material;
      if (areasByMaterial.get(material).size > 1 || keptMaterials.has(material)) {
        material = material.clone();
        if (Array.isArray(mesh.material)) mesh.material[slot] = material; else mesh.material = material;
      }
      return { material, intensity: material.emissiveIntensity, at: area.at + Math.random() * 0.15 };
    });
    this.base = [...base].map(([material, color]) => ({ material, color }));
  }

  // Overall share of light at time t (seconds since play)
  levelAt(t) {
    let level = DARK;
    for (const area of [...AREAS, REST]) level += (1 - DARK) * area.weight * ramp(t - area.at);
    return Math.min(1, level);
  }

  apply(t) {
    const level = this.levelAt(t);
    for (const { material, color } of this.base) material.color.copy(color).multiplyScalar(level);
    for (const { light, intensity } of this.lights) light.intensity = intensity * level;
    for (const tube of this.tubes) {
      const u = t - tube.at;
      tube.material.emissiveIntensity = tube.intensity * (this.reduced ? ramp(u) : flicker(u));
    }
  }

  // Everything off except the sign
  dark() {
    this.apply(-1);
  }

  play(onDone) {
    const end = REST.at + 0.15 + Math.max(RAMP, FLICKER.at(-1)[0]);
    const start = performance.now();
    const frame = () => {
      const t = (performance.now() - start) / 1000;
      if (t >= end) {
        this.restore();
        onDone?.();
        return;
      }
      this.apply(t);
      requestAnimationFrame(frame);
    };
    frame();
  }

  restore() {
    for (const { material, color } of this.base) material.color.copy(color);
    for (const { light, intensity } of this.lights) light.intensity = intensity;
    for (const tube of this.tubes) tube.material.emissiveIntensity = tube.intensity;
  }
}
