import * as THREE from 'three';

// Imported GLB/GLTF scenes can carry their own lights and cameras (KHR_lights_punctual). A light added to
// the realm changes the scene's light count, and three.js then rebuilds every shader program in the house
// on the next frame (one long synchronous stall). Imported furniture is visual only, so lights and cameras
// are stripped before the model ever reaches the scene.
export function prepareModel(g) {
  const m = g.scene.clone(true), drop = [];
  let meshes = 0, tris = 0;
  m.traverse((c) => {
    if (c.isLight || c.isCamera) drop.push(c);
    else if (c.isMesh) {
      c.castShadow = c.receiveShadow = true; meshes++;
      const gm = c.geometry; tris += (gm.index ? gm.index.count : gm.attributes.position.count) / 3;
    }
  });
  drop.forEach((c) => c.removeFromParent());
  m.updateMatrixWorld(true);
  return { m, stats: { meshes, tris: Math.round(tris), removed: drop.map((c) => c.type) } };
}

// Fit + calibration results per (catalog type, model). Computed once per pair, never per frame.
const fits = new Map();
export const fitKey = (o) => `${o.type}|${o.model_uri}|${o.model_fit !== false}`;
export const getFit = (o) => fits.get(fitKey(o));
export const putFit = (o, f) => { fits.set(fitKey(o), f); return f; };
export const DEV_TOOLS = import.meta.env.DEV;