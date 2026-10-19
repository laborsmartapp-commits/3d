import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { instantiate } from './catalog';

let ctx = null, chain = Promise.resolve();
const cache = new Map();

function setup() {
  const r = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
  r.setPixelRatio(1); r.setSize(160, 160, false); r.toneMapping = THREE.ACESFilmicToneMapping; r.outputColorSpace = THREE.SRGBColorSpace;
  const s = new THREE.Scene(); s.environment = new THREE.PMREMGenerator(r).fromScene(new RoomEnvironment(), 0.04).texture; s.environmentIntensity = 0.6;
  const d = new THREE.DirectionalLight('#ffffff', 2.4); d.position.set(3, 5, 4); s.add(d, new THREE.HemisphereLight('#ffffff', '#8a8a8a', 1.1));
  return { r, s, cam: new THREE.PerspectiveCamera(30, 1, 0.01, 200) };
}

// Library thumbnails rendered from the real catalog asset (one shared offscreen renderer, queued).
export function thumb(type) {
  if (cache.has(type)) return cache.get(type);
  const p = (chain = chain.then(() => new Promise((res) => requestAnimationFrame(() => {
    ctx ||= setup();
    const { node, proto } = instantiate(type), b = proto.box, c = b.getCenter(new THREE.Vector3()), R = b.getSize(new THREE.Vector3()).length() / 2 || 0.5;
    const dir = new THREE.Vector3(0.6, 0.45, 0.75).normalize(), dist = R / Math.sin(THREE.MathUtils.degToRad(15)) * 1.02;
    ctx.cam.position.copy(c).addScaledVector(dir, dist); ctx.cam.near = dist / 50; ctx.cam.far = dist * 4; ctx.cam.updateProjectionMatrix(); ctx.cam.lookAt(c);
    ctx.s.add(node); ctx.r.render(ctx.s, ctx.cam); ctx.s.remove(node);
    res(ctx.r.domElement.toDataURL('image/png'));
  }))));
  cache.set(type, p);
  return p;
}