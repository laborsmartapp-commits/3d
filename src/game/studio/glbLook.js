import * as THREE from 'three';

// Shows an imported character's own textures at full sharpness and gives its materials realistic shading.
// Uses only the maps that ship with the model; nothing is upscaled.
export function polishGlb(model, renderer) {
  const aniso = renderer?.capabilities?.getMaxAnisotropy?.() || 8;
  model.traverse((o) => {
    if (!o.isMesh) return;
    o.castShadow = true; o.receiveShadow = true;
    for (const m of [].concat(o.material)) {
      if (!m) continue;
      for (const k of ['map', 'normalMap', 'roughnessMap', 'metalnessMap', 'aoMap', 'emissiveMap']) {
        const t = m[k]; if (!t) continue;
        t.anisotropy = aniso; t.minFilter = THREE.LinearMipmapLinearFilter; t.magFilter = THREE.LinearFilter; t.generateMipmaps = true; t.needsUpdate = true;
      }
      if (m.map) m.map.colorSpace = THREE.SRGBColorSpace;
      if (m.normalMap) m.normalScale?.set(1.15, 1.15);
      if ('envMapIntensity' in m) m.envMapIntensity = 1.1;
      if (m.isMeshStandardMaterial && !m.metalnessMap && !m.roughnessMap) { m.metalness = 0; m.roughness = 0.6; }
      m.needsUpdate = true;
    }
  });
}