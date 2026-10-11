import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { clone } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { base44 } from '@/api/base44Client';

const loader = new GLTFLoader().setDRACOLoader(new DRACOLoader().setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.6/')).setMeshoptDecoder(MeshoptDecoder);
const cache = new Map();
const load = (uri) => {
  if (!cache.has(uri)) cache.set(uri, base44.integrations.Core.CreateFileSignedUrl({ file_uri: uri, expires_in: 3600 }).then((r) => loader.loadAsync(r.signed_url)));
  return cache.get(uri);
};
const isWalk = (c) => /walk/i.test(c.name);
let libWalk;
// A walk clip from the Animation Library, for characters that don't ship their own.
const libraryWalk = () => (libWalk ??= base44.entities.Asset.filter({ category: 'animation', clip_name: { $regex: 'walk', $options: 'i' } }, { limit: 1 })
  .then(async (r) => { const a = r.items[0]; return a ? (await load(a.file_uri)).animations.find((c) => c.name === a.clip_name) : null; }));

// Swaps an actor's procedural body for a library .glb character driven by a walk cycle.
export async function attachGlb(p, uri) {
  const g = await load(uri), model = clone(g.scene);
  const hb = new THREE.Box3().setFromObject(p.h.body), H = (hb.max.y - hb.min.y) / p.h.root.scale.y || 1.8;
  const mb = new THREE.Box3().setFromObject(model), s = H / ((mb.max.y - mb.min.y) || 1);
  model.scale.setScalar(s); model.position.y = -mb.min.y * s;
  p.h.body.visible = false; p.h.root.add(model);
  const walk = g.animations.find(isWalk) || await libraryWalk() || g.animations[0];
  const mixer = new THREE.AnimationMixer(model), act = walk && mixer.clipAction(walk).play();
  const libActs = new Map(); // `${uri}|${clip}` -> action (null while loading)
  const libAction = (l) => {
    const key = `${l.uri}|${l.clip}`;
    if (!libActs.has(key)) {
      libActs.set(key, null);
      load(l.uri).then((lg) => { const c = lg.animations.find((x) => x.name === l.clip) || lg.animations[0]; if (c) libActs.set(key, mixer.clipAction(c)); });
    }
    return libActs.get(key);
  };
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
    if (act) {
      const v = p.anim.speed || 0, moving = v > 0.15;
      act.setEffectiveWeight(Math.max(0, 1 - Math.min(1, total)));
      if (moving) act.time = (act.time + dt * Math.min(2.2, Math.max(0.6, v / 1.6))) % (walk.duration || 1); else act.time = 0;
    }
    mixer.update(0);
  };
}