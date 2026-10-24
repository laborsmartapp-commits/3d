import * as THREE from 'three';
import { clone } from 'three/examples/jsm/utils/SkeletonUtils.js';

const key = (n) => n.replace(/^mixamorig\d*:?/i, '').toLowerCase();
const bonesOf = (root) => { const m = new Map(); root.traverse((o) => { if (o.isBone && !m.has(key(o.name))) m.set(key(o.name), o); }); return m; };

// Some exporters (e.g. Tripo) leave every bone at the origin and keep the real joints only in the
// skin's inverse bind matrices. Rebuild the bone transforms from them so animation has real joints to turn.
export function fixBindRig(root) {
  let fixed = false;
  root.updateMatrixWorld(true);
  root.traverse((o) => {
    if (!o.isSkinnedMesh) return;
    const { bones, boneInverses } = o.skeleton;
    if (!bones.every((b) => b.position.lengthSq() < 1e-10 && b.quaternion.w > 0.99999)) return;
    const world = new Map(bones.map((b, i) => [b, boneInverses[i].clone().invert()]));
    for (const b of bones) {
      const pw = world.get(b.parent) || b.parent.matrixWorld;
      pw.clone().invert().multiply(world.get(b)).decompose(b.position, b.quaternion, b.scale);
    }
    fixed = true;
  });
  if (fixed) root.updateMatrixWorld(true);
  return fixed;
}

const PREFER = /spine|neck|head|middle1|leg$|foot$|toebase|forearm|hand$|arm$/;
const childOf = (t, sb) => { const kids = t.children.filter((c) => c.isBone && sb.has(key(c.name)) && c.children.length); return kids.find((c) => PREFER.test(key(c.name))) || kids[0] || null; };

// Bakes a clip authored on another skeleton onto `target` (an unscaled, rebuilt rig) by matching where each
// limb points, so differences in rest pose and bone orientation between the two rigs don't matter.
export function retargetClip(srcScene, clip, target) {
  const src = clone(srcScene), sb = bonesOf(src), tb = bonesOf(target);
  src.updateMatrixWorld(true); target.updateMatrixWorld(true);
  const wq = (o) => o.getWorldQuaternion(new THREE.Quaternion()), wp = (o) => o.getWorldPosition(new THREE.Vector3());
  const order = []; target.traverse((o) => { if (o.isBone && sb.has(key(o.name))) order.push(o); });
  const items = order.map((t) => {
    const s = sb.get(key(t.name)), tc = childOf(t, sb), sc = tc && sb.get(key(tc.name));
    const aim = !!sc && !/hips|head$/.test(key(t.name));
    return { t, s, sc, aim, sRest: wq(s), tRest: wq(t), tDir: tc ? wp(tc).sub(wp(t)).normalize() : null, times: [], vals: [] };
  });
  const tHips = tb.get('hips'), sHips = sb.get('hips');
  const hipRest = tHips && tHips.position.clone(), sHipY = sHips ? wp(sHips).y : 1, ratio = tHips ? wp(tHips).y / (sHipY || 1) : 1, hipVals = [];
  const mixer = new THREE.AnimationMixer(src); mixer.clipAction(clip).play();
  const fps = 30, n = Math.max(2, Math.ceil(clip.duration * fps) + 1), worldQ = new Map();
  const q = new THREE.Quaternion(), d = new THREE.Vector3();
  for (let f = 0; f < n; f++) {
    const time = Math.min(clip.duration, f / fps);
    mixer.setTime(time); src.updateMatrixWorld(true); worldQ.clear();
    for (const it of items) {
      let w;
      if (it.aim) { d.copy(wp(it.sc)).sub(wp(it.s)).normalize(); w = q.setFromUnitVectors(it.tDir, d).clone().multiply(it.tRest); }
      else w = wq(it.s).multiply(it.sRest.clone().invert()).multiply(it.tRest);
      worldQ.set(it.t, w);
      const pw = worldQ.get(it.t.parent) || wq(it.t.parent);
      const local = pw.clone().invert().multiply(w);
      it.times.push(time); it.vals.push(local.x, local.y, local.z, local.w);
    }
    if (tHips && sHips) hipVals.push(hipRest.x, hipRest.y + (wp(sHips).y - sHipY) * ratio, hipRest.z);
  }
  const tracks = items.map((it) => new THREE.QuaternionKeyframeTrack(`${it.t.name}.quaternion`, it.times, it.vals));
  if (hipVals.length) tracks.push(new THREE.VectorKeyframeTrack(`${tHips.name}.position`, items[0].times, hipVals));
  return new THREE.AnimationClip(clip.name, clip.duration, tracks);
}