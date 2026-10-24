import * as THREE from 'three';

// Clips borrowed from another character's file: keep only bone rotations so the
// borrowing body keeps its own proportions (no stretched limbs or offset hips).
export const rotationsOnly = (c) => new THREE.AnimationClip(c.name, c.duration, c.tracks.filter((t) => t.name.endsWith('.quaternion')));

// Gentle breathing and weight shift for imported characters with no idle clip of their own.
export function makeIdle(model) {
  const find = (re) => { let b = null; model.traverse((o) => { if (!b && o.isBone && re.test(o.name)) b = o; }); return b; };
  const parts = [[find(/spine1?$/i), 0.025, 0], [find(/spine2$/i), 0.02, 0.3], [find(/neck$/i), 0.015, 0.6], [find(/head$/i), 0.02, 0.9]].filter((x) => x[0]);
  const hips = find(/hips$/i);
  if (hips) parts.push([hips, 0.015, 0, 'z']);
  const rest = parts.map(([b]) => b.quaternion.clone()), q = new THREE.Quaternion(), ax = { x: new THREE.Vector3(1, 0, 0), z: new THREE.Vector3(0, 0, 1) };
  let t = 0;
  // Runs only while standing still with nothing else playing, so it owns these bones then.
  return (dt) => {
    t += dt;
    parts.forEach(([b, a, ph, axis = 'x'], i) => b.quaternion.copy(rest[i]).multiply(q.setFromAxisAngle(ax[axis], Math.sin(t * (axis === 'z' ? 0.45 : 1.6) + ph) * a)));
  };
}