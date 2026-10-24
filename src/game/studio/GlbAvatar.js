import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { clone } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { base44 } from '@/api/base44Client';
import { makeSitPose } from './rigPose';
import { makeIdle, rotationsOnly } from './glbIdle';
import { fixBindRig, retargetClip } from './retarget';

const loader = new GLTFLoader().setDRACOLoader(new DRACOLoader().setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.6/')).setMeshoptDecoder(MeshoptDecoder);
const cache = new Map();
let presigned = {}; // uri -> signed url, supplied by the cloud render bundle (no user session there)
export const setPresignedUrls = (m) => { presigned = m || {}; };
const signed = (uri) => (/^https?:/.test(uri) ? Promise.resolve(uri) : presigned[uri] ? Promise.resolve(presigned[uri]) : base44.integrations.Core.CreateFileSignedUrl({ file_uri: uri, expires_in: 3600 }).then((r) => r.signed_url));
// Mixamo .fbx clips: "mixamorig:Hips" bones become "mixamorigHips" in .glb rigs.
const loadFbx = (u) => new FBXLoader().loadAsync(u).then((g) => {
  g.animations.forEach((c) => c.tracks.forEach((t) => { t.name = t.name.replace(/:/g, ''); }));
  return { scene: g, animations: g.animations };
});
export const loadModel = (uri) => load(uri);
const load = (uri) => {
  // A failed load is dropped from the cache so the next attempt retries instead of reusing the failure.
  if (!cache.has(uri)) cache.set(uri, signed(uri).then((u) => (/\.fbx(\?|$)/i.test(uri) ? loadFbx(u) : loader.loadAsync(u))).catch((err) => { cache.delete(uri); throw err; }));
  return cache.get(uri);
};
const libClips = {};
// A walk / idle clip from the Animation Library, for characters that don't ship their own.
const libraryClip = (re) => (libClips[re] ??= base44.entities.Asset.filter({ category: 'animation', clip_name: { $regex: re, $options: 'i' } }, { limit: 1 })
  .then(async (r) => { const a = r.items[0]; const c = a && (await load(a.file_uri)).animations.find((x) => x.name === a.clip_name); return c ? { g: await load(a.file_uri), c } : null; }).catch(() => null));
const ownOr = (g, re, fit) => { const c = g.animations.find((x) => new RegExp(re, 'i').test(x.name)); return c ? Promise.resolve(c) : libraryClip(re).then(fit); };
const baked = new Map(); // `${character uri}|${clip uuid}` -> clip retargeted onto that character

// Swaps an actor's procedural body for a library .glb character driven by a walk cycle.
export async function attachGlb(p, uri) {
  const own = uri;
  const g = await load(uri), model = clone(g.scene);
  // Rigs with no bone transforms get rebuilt joints, and borrowed clips are retargeted onto them.
  const rest = fixBindRig(model) ? clone(model) : null;
  const fit = (src) => {
    if (!src) return null;
    if (!rest) return rotationsOnly(src.c);
    const k = `${uri}|${src.c.uuid}`;
    if (!baked.has(k)) baked.set(k, retargetClip(src.g.scene, src.c, rest));
    return baked.get(k);
  };
  const hb = new THREE.Box3().setFromObject(p.h.body), H = (hb.max.y - hb.min.y) / p.h.root.scale.y || 1.8;
  const mb = new THREE.Box3().setFromObject(model), s = H / ((mb.max.y - mb.min.y) || 1);
  model.scale.setScalar(s); model.position.y = -mb.min.y * s;
  p.h.body.visible = false; p.h.root.add(model); p.glbModel = model;
  const sitPose = makeSitPose(model), baseY = model.position.y;
  // The body shows right away; walk and idle cycles join as soon as they load.
  const mixer = new THREE.AnimationMixer(model), procIdle = makeIdle(model);
  let walk = null, act = null, idle = null;
  ownOr(g, 'walk', fit).then((c) => { walk = c || g.animations[0]; if (walk) act = mixer.clipAction(walk).play(); });
  ownOr(g, 'idle|breath', fit).then((c) => { if (c) idle = mixer.clipAction(c).play(); });
  const libActs = new Map(); // `${uri}|${clip}` -> action (null while loading)
  const fetchClip = (uri, clip) => {
    const key = `${uri}|${clip}`;
    if (libActs.has(key)) return Promise.resolve();
    libActs.set(key, null);
    const miss = () => { (p.missingClips ||= []).push(clip || uri); };
    return load(uri).then((lg) => { const c = lg.animations.find((x) => x.name === clip) || lg.animations[0]; if (c) libActs.set(key, mixer.clipAction(uri === own ? c : fit({ g: lg, c }))); else miss(); }).catch(miss);
  };
  const libAction = (l) => { fetchClip(l.uri, l.clip); return libActs.get(`${l.uri}|${l.clip}`); };
  // Cloud render: load every library clip this actor uses before frame 0.
  p.preloadClips = (clips) => { p.clipsReady = Promise.all(clips.filter((c) => c.actor === p.actorId).map((c) => fetchClip(c.anim_uri, c.clip_name))); };
  const fin = p.finish.bind(p);
  p.finish = (dt, fp) => {
    fin(dt, fp);
    // Library body animations (dance, basketball…) scheduled on the timeline, blended over the walk cycle.
    const used = new Set(); let total = 0;
    for (const l of p.anim.layers || []) {
      if (!l.uri) continue;
      const a = libAction(l); if (!a) continue;
      used.add(a); total += l.w;
      a.enabled = true; a.play(); a.setEffectiveWeight(l.w); a.time = l.t % (a.getClip().duration || 1);
    }
    for (const a of libActs.values()) if (a && !used.has(a)) a.enabled = false;
    // Walking when moving, idle when standing; timeline animations override both.
    const v = p.anim.speed || 0, moving = v > 0.15, free = Math.max(0, 1 - Math.min(1, total));
    if (act) {
      act.setEffectiveWeight(moving ? free : 0);
      if (moving) act.time = (act.time + dt * Math.min(2.2, Math.max(0.6, v / 1.6))) % (walk.duration || 1);
    }
    if (idle) { idle.setEffectiveWeight(moving ? 0 : free); idle.time = (idle.time + dt) % (idle.getClip().duration || 1); }
    mixer.update(0);
    if (!idle && !moving && free === 1 && p.anim.mode !== 'sit') procIdle(dt);
    // Seated interactions work on imported rigs too: drop the hips and aim the leg chains.
    const sitting = p.anim.mode === 'sit' && sitPose;
    model.position.y = baseY - (sitting && sitPose.drop ? sitPose.drop / (p.h.root.scale.y || 1) : 0);
    if (sitting) { p.h.root.updateMatrixWorld(true); sitPose.apply(p.yaw); }
  };
}