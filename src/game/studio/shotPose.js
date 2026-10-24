import * as THREE from 'three';

// Arm poses for imported humanoids (carry, set, release), aimed in world space so they work on any rig.
// A pose gives each segment a direction as [forward, up, outward] in the character's own frame.
export const POSES = {
  reach: { u: [0.6, -0.8, 0.1], f: [0.55, -0.8, -0.25] },
  carry: { u: [0.3, -0.92, 0.08], f: [0.92, 0.15, -0.38] },
  set: { u: [0.55, 0.3, 0.38], f: [0.12, 1, -0.2], lu: [0.5, 0.25, 0.45], lf: [0.2, 0.85, -0.65] },
  release: { u: [0.5, 0.86, 0.06], f: [0.62, 0.78, 0], lu: [0.45, 0.65, 0.4], lf: [0.25, 0.9, 0.05] },
};
const va = new THREE.Vector3(), vb = new THREE.Vector3(), cur = new THREE.Vector3(), qq = new THREE.Quaternion(), qa = new THREE.Quaternion(), qb = new THREE.Quaternion();
const findBone = (m, re) => { let b = null; m.traverse((o) => { if (!b && o.isBone && re.test(o.name)) b = o; }); return b; };
const chain = (m, s) => { const u = findBone(m, new RegExp(`${s}_?(upper_?)?arm$`, 'i')), f = u?.children.find((c) => c.isBone), h = f?.children.find((c) => c.isBone); return h ? { u, f, h } : null; };

function aim(bone, child, dir, w) {
  bone.getWorldPosition(va); child.getWorldPosition(vb);
  cur.subVectors(vb, va).normalize(); if (cur.lengthSq() < 1e-6) return;
  qq.setFromUnitVectors(cur, vb.copy(cur).lerp(dir, w).normalize()); bone.getWorldQuaternion(qa); bone.parent.getWorldQuaternion(qb);
  bone.quaternion.copy(qb.invert().multiply(qq.multiply(qa)));
  bone.updateMatrixWorld(true);
}

export function makeArmRig(model) {
  const R = chain(model, 'right'), L = chain(model, 'left');
  if (!R || !L) return null;
  const side = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0), d = new THREE.Vector3();
  const dir = (fwd, s, [a, b, c], flip) => d.set(0, 0, 0).addScaledVector(fwd, a).addScaledVector(up, b).addScaledVector(side, flip ? -c : c).normalize();
  const mix = (A, B, k) => A.map((x, i) => x + (B[i] - x) * k);
  return {
    R, L,
    // Blend pose A→B by k, applied over the current animation with weight w.
    apply(yaw, A, B = A, k = 0, w = 1) {
      const fwd = new THREE.Vector3(Math.sin(yaw), 0, Math.cos(yaw));
      side.subVectors(R.u.getWorldPosition(va), L.u.getWorldPosition(vb)).setY(0).normalize();
      const P = (key, alt) => mix(A[alt] || A[key], B[alt] || B[key], k);
      aim(R.u, R.f, dir(fwd, side, P('u')).clone(), w); aim(R.f, R.h, dir(fwd, side, P('f')).clone(), w);
      aim(L.u, L.f, dir(fwd, side, P('u', 'lu'), true).clone(), w); aim(L.f, L.h, dir(fwd, side, P('f', 'lf'), true).clone(), w);
    },
    hand: (b, out) => b.h.getWorldPosition(out),
  };
}