import * as THREE from 'three';

// Rig-agnostic seated pose for imported humanoids: finds each thigh by common naming (Mixamo, Unreal,
// Blender, VRM...), follows its bone chain to the knee and foot, and aims the chain in world space.
const THIGH = /upleg|thigh|upperleg/i;
const isLeft = (n) => /left/i.test(n) || /(^|[_.\s:])l([_.\s]|$)/i.test(n) || /[_.]l$/i.test(n);
const isRight = (n) => /right/i.test(n) || /(^|[_.\s:])r([_.\s]|$)/i.test(n) || /[_.]r$/i.test(n);
const qa = new THREE.Quaternion(), qb = new THREE.Quaternion(), qq = new THREE.Quaternion(), va = new THREE.Vector3(), vb = new THREE.Vector3();

function aim(bone, child, dir) {
  bone.getWorldPosition(va); child.getWorldPosition(vb);
  const cur = vb.sub(va).normalize(); if (cur.lengthSq() < 1e-6) return;
  qq.setFromUnitVectors(cur, dir); bone.getWorldQuaternion(qa); bone.parent.getWorldQuaternion(qb);
  bone.quaternion.copy(qb.invert().multiply(qq.multiply(qa)));
  bone.updateMatrixWorld(true);
}

export function makeSitPose(model) {
  const th = {};
  model.traverse((o) => { if (!o.isBone) return; const n = o.name.replace(/mixamorig:?/i, ''); if (!THIGH.test(n)) return; if (isLeft(n)) th.L ||= o; else if (isRight(n)) th.R ||= o; });
  const legs = [th.L, th.R].filter(Boolean).map((t) => { const sh = t.children.find((c) => c.isBone), ft = sh?.children.find((c) => c.isBone); return sh && ft ? { t, sh, ft } : null; }).filter(Boolean);
  if (legs.length < 2) return null;
  const pose = {
    drop: null,
    apply(yaw) {
      if (pose.drop === null) pose.drop = legs[0].t.getWorldPosition(new THREE.Vector3()).distanceTo(legs[0].sh.getWorldPosition(new THREE.Vector3()));
      const fwd = new THREE.Vector3(Math.sin(yaw), -0.08, Math.cos(yaw)).normalize(), down = new THREE.Vector3(0, -1, 0);
      for (const l of legs) { aim(l.t, l.sh, fwd); aim(l.sh, l.ft, down); }
    },
  };
  return pose;
}