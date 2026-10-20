import * as THREE from 'three';

// Facial performance from dialogue: imported rigs use their own blend shapes (jawOpen / mouthOpen / viseme_aa,
// smile, frown, brows) or a jaw bone; the procedural rig gets a small mouth that only shows while speaking.
const EMO = { happy: { smile: 0.6 }, excited: { smile: 0.8, brow: 0.4 }, calm: { smile: 0.2 }, sad: { frown: 0.5, brow: 0.6 }, angry: { frown: 0.7 } };

function rig(p) {
  const model = p.glbModel || null;
  if (p._face && p._face.model === model) return p._face;
  const f = { model, open: [], smile: [], brow: [], frown: [], jaw: null, mouth: null, v: 0 };
  if (model) {
    model.traverse((o) => {
      if (o.morphTargetDictionary && o.morphTargetInfluences) for (const [k, i] of Object.entries(o.morphTargetDictionary)) {
        const n = k.toLowerCase().replace(/[^a-z_]/g, '');
        if (/jawopen|mouthopen|viseme_?aa|mouth_?open/.test(n)) f.open.push([o, i]);
        else if (/smile/.test(n)) f.smile.push([o, i]);
        else if (/browinnerup/.test(n)) f.brow.push([o, i]);
        else if (/frown|browdown/.test(n)) f.frown.push([o, i]);
      }
      if (o.isBone && !f.jaw && /jaw/i.test(o.name)) f.jaw = o;
    });
    if (f.jaw) f.jaw0 = f.jaw.rotation.x;
  } else if (p.h?.head) {
    f.mouth = new THREE.Mesh(new THREE.SphereGeometry(0.035, 10, 6), new THREE.MeshStandardMaterial({ color: '#3a1418', roughness: 0.8 }));
    f.mouth.position.set(0, -0.065, 0.13); f.mouth.visible = false; p.h.head.add(f.mouth);
  }
  return (p._face = f);
}

const set = (list, w) => { for (const [o, i] of list) o.morphTargetInfluences[i] = w; };

export function applyFace(p, s, dt) {
  const f = rig(p), target = s?.mouth || 0;
  f.v = dt ? f.v + (target - f.v) * (1 - Math.exp(-dt * 25)) : target;
  const e = EMO[s?.emotion] || {}, talking = f.v > 0.02 || target > 0;
  p.face = { mouth: f.v, emotion: s?.emotion || null };
  set(f.open, f.v); set(f.smile, talking ? e.smile || 0 : 0); set(f.brow, talking ? e.brow || 0 : 0); set(f.frown, talking ? e.frown || 0 : 0);
  if (f.jaw && !f.open.length) f.jaw.rotation.x = f.jaw0 + f.v * 0.3;
  if (f.mouth) { f.mouth.visible = f.v > 0.02; f.mouth.scale.set(1.3 - f.v * 0.3 + (e.smile || 0) * 0.3, 0.12 + f.v * 0.9, 0.5); }
}