import * as THREE from 'three';

const cache = new Map();
const m = (color) => { if (!cache.has(color)) cache.set(color, new THREE.MeshStandardMaterial({ color, roughness: 0.8 })); return cache.get(color); };
const G = {
  chest: new THREE.CapsuleGeometry(0.19, 0.34, 4, 10), head: new THREE.SphereGeometry(0.15, 14, 12),
  hair: new THREE.SphereGeometry(0.16, 12, 10, 0, Math.PI * 2, 0, Math.PI * 0.6),
  upper: new THREE.CapsuleGeometry(0.06, 0.24, 3, 8), fore: new THREE.CapsuleGeometry(0.052, 0.22, 3, 8), hand: new THREE.SphereGeometry(0.055, 8, 6),
  thigh: new THREE.CapsuleGeometry(0.08, 0.3, 3, 8), shin: new THREE.CapsuleGeometry(0.068, 0.3, 3, 8), foot: new THREE.BoxGeometry(0.12, 0.07, 0.24),
  eye: new THREE.SphereGeometry(0.018, 6, 4), belt: new THREE.CylinderGeometry(0.2, 0.21, 0.08, 12),
  cloak: new THREE.PlaneGeometry(0.46, 0.85, 1, 4), skirt: new THREE.CylinderGeometry(0.21, 0.32, 0.45, 12, 1, true),
};

function part(geo, mat, y, parent) { const mesh = new THREE.Mesh(geo, mat); mesh.position.y = y; mesh.castShadow = true; parent.add(mesh); return mesh; }

export function createHumanoid(o = {}) {
  const skin = m(o.skin || '#c99a7a'), shirt = m(o.shirt || '#1f6f66'), pants = m(o.pants || '#2a2438'), hair = m(o.hair || '#1a1420'), accent = m(o.accent || '#f59e0b');
  const root = new THREE.Group(), body = new THREE.Group();
  root.add(body);
  const hips = new THREE.Group(); hips.position.y = 0.95; body.add(hips);
  const torso = new THREE.Group(); hips.add(torso);
  part(G.chest, shirt, 0.33, torso).scale.set(1.15, 1, 0.78);
  part(G.belt, accent, 0.06, torso);
  if (o.robe) part(G.skirt, shirt, -0.12, torso);
  const head = new THREE.Group(); head.position.y = 0.72; torso.add(head);
  part(G.head, skin, 0, head);
  part(G.hair, hair, 0.02, head).rotation.x = -0.35;
  const eyeM = m('#101018');
  part(G.eye, eyeM, 0.01, head).position.set(0.055, 0.01, 0.135);
  part(G.eye, eyeM, 0.01, head).position.set(-0.055, 0.01, 0.135);
  const arm = (side) => {
    const sh = new THREE.Group(); sh.position.set(0.27 * side, 0.56, 0); torso.add(sh);
    part(G.upper, shirt, -0.17, sh);
    const el = new THREE.Group(); el.position.y = -0.36; sh.add(el);
    part(G.fore, skin, -0.14, el); part(G.hand, skin, -0.3, el);
    return [sh, el];
  };
  const [armL, elbowL] = arm(1), [armR, elbowR] = arm(-1);
  const leg = (side) => {
    const lg = new THREE.Group(); lg.position.set(0.11 * side, 0, 0); hips.add(lg);
    part(G.thigh, pants, -0.22, lg);
    const kn = new THREE.Group(); kn.position.y = -0.45; lg.add(kn);
    part(G.shin, pants, -0.2, kn);
    part(G.foot, m(o.boots || '#2a1d16'), -0.44, kn).position.z = 0.05;
    return [lg, kn];
  };
  const [legL, kneeL] = leg(1), [legR, kneeR] = leg(-1);
  let cloak = null;
  if (o.cloak) {
    cloak = new THREE.Group(); cloak.position.set(0, 0.62, -0.16); torso.add(cloak);
    const c = new THREE.Mesh(G.cloak, new THREE.MeshStandardMaterial({ color: o.cloak, side: THREE.DoubleSide, roughness: 0.9 }));
    c.position.y = -0.42; c.castShadow = true; cloak.add(c);
  }
  root.scale.setScalar(o.scale || 1);
  return { root, body, hips, torso, head, armL, armR, elbowL, elbowR, legL, legR, kneeL, kneeR, cloak };
}

const L = (a, b, k) => a + (b - a) * k;

export function animateHumanoid(h, s, dt) {
  const k = 1 - Math.exp(-dt * 12);
  const p = s.phase || 0, t = s.t || 0, sp = s.speed || 0;
  const T = { lL: 0, lR: 0, kL: 0.05, kR: 0.05, aL: 0, aR: 0, azL: 0.08, azR: -0.08, eL: -0.12, eR: -0.12, ezR: 0, hy: 0.95, tx: 0, bx: 0, by: 0, hx: 0, cl: 0.12 };
  const sitLegs = () => { T.hy = 0.5; T.lL = T.lR = -1.5; T.kL = T.kR = 1.5; T.tx = -0.05; T.cl = 0; };
  switch (s.mode) {
    case 'walk': case 'run': {
      const a = Math.min(1, 0.35 + sp * 0.07), sn = Math.sin(p), cs = Math.cos(p);
      T.lL = -sn * a; T.lR = sn * a;
      T.kL = Math.max(0, cs) * a * 1.3 + 0.05; T.kR = Math.max(0, -cs) * a * 1.3 + 0.05;
      T.aL = sn * a * 0.8; T.aR = -sn * a * 0.8; T.eL = T.eR = -0.25 - a * 0.5;
      T.hy = 0.92 + Math.abs(cs) * 0.05 * a; T.tx = 0.05 + a * 0.18; T.cl = 0.2 + a * 0.7;
      break;
    }
    case 'idle': case 'watch': T.azL = 0.1 + Math.sin(t * 1.6) * 0.02; T.azR = -T.azL; T.hy = 0.95 + Math.sin(t * 1.6) * 0.006; if (s.mode === 'watch') T.hx = -0.15; break;
    case 'jump': T.lL = -0.7; T.kL = 1.1; T.lR = 0.25; T.kR = 0.5; T.aL = T.aR = -0.5; T.azL = 0.5; T.azR = -0.5; T.cl = 0.8; break;
    case 'fall': T.lL = -0.3; T.lR = 0.2; T.kL = 0.5; T.kR = 0.4; T.azL = 1.1; T.azR = -1.1; T.cl = 1.2; break;
    case 'land': T.hy = 0.8; T.lL = T.lR = -0.6; T.kL = T.kR = 1.1; T.tx = 0.3; break;
    case 'sit': sitLegs(); T.aL = T.aR = -0.45; T.eL = T.eR = -0.7; break;
    case 'read': sitLegs(); T.aL = T.aR = -0.9; T.eL = T.eR = -1.3; T.hx = 0.35; break;
    case 'eat': sitLegs(); T.aR = -0.9 + Math.sin(t * 2) * 0.3; T.eR = -1.5; break;
    case 'wave': T.azR = -2.6; T.ezR = Math.sin(t * 9) * 0.5; T.eR = 0; break;
    case 'point': T.aR = -1.55; T.eR = 0; break;
    case 'work': T.aR = -1.6 + Math.sin(t * 7) * 0.9; T.eR = -0.6; T.aL = -0.6; T.eL = -0.8; T.tx = 0.2; break;
    case 'interact': T.aR = -1.2; T.eR = -0.4; T.tx = 0.25; break;
    case 'sweep': T.aL = -0.7 + Math.sin(t * 3) * 0.3; T.aR = -0.9 + Math.sin(t * 3) * 0.3; T.azL = T.azR = 0.3 * Math.sin(t * 3); T.eL = T.eR = -0.4; T.tx = 0.25; break;
    case 'fish': T.aL = T.aR = -0.9; T.eL = T.eR = -0.3; break;
    case 'talk': T.aR = -0.5 + Math.sin(t * 2.6) * 0.35; T.eR = -0.8; T.hx = Math.sin(t * 1.3) * 0.08; break;
    case 'warm': T.aL = T.aR = -1.2; T.eL = T.eR = -0.2; T.azL = -0.3; T.azR = 0.3; break;
    case 'garden': T.hy = 0.62; T.lL = -1.2; T.kL = 1.9; T.lR = 0.3; T.kR = 1.5; T.tx = 0.6; T.aL = -0.9 + Math.sin(t * 3) * 0.3; T.aR = -0.8; break;
    case 'play': T.hy = 0.95 + Math.abs(Math.sin(t * 6)) * 0.12; T.azL = 2.4; T.azR = -2.4; break;
    case 'swim': T.bx = 1.35; T.by = 0.25; T.aL = Math.sin(p) * 1.6 - 1.6; T.aR = -Math.sin(p) * 1.6 - 1.6; T.lL = Math.sin(t * 9) * 0.3; T.lR = -T.lL; T.hx = -0.9; T.cl = 1.4; break;
    case 'tread': T.bx = 0.15; T.azL = 0.9 + Math.sin(t * 3) * 0.3; T.azR = -T.azL; T.lL = Math.sin(t * 3) * 0.4; T.lR = -T.lL; T.kL = T.kR = 0.6; break;
    default: break;
  }
  if (s.carry) { T.aL = T.aR = -1.1; T.eL = T.eR = -0.5; }
  h.legL.rotation.x = L(h.legL.rotation.x, T.lL, k); h.legR.rotation.x = L(h.legR.rotation.x, T.lR, k);
  h.kneeL.rotation.x = L(h.kneeL.rotation.x, T.kL, k); h.kneeR.rotation.x = L(h.kneeR.rotation.x, T.kR, k);
  h.armL.rotation.x = L(h.armL.rotation.x, T.aL, k); h.armR.rotation.x = L(h.armR.rotation.x, T.aR, k);
  h.armL.rotation.z = L(h.armL.rotation.z, T.azL, k); h.armR.rotation.z = L(h.armR.rotation.z, T.azR, k);
  h.elbowL.rotation.x = L(h.elbowL.rotation.x, T.eL, k); h.elbowR.rotation.x = L(h.elbowR.rotation.x, T.eR, k);
  h.elbowR.rotation.z = L(h.elbowR.rotation.z, T.ezR, k);
  h.hips.position.y = L(h.hips.position.y, T.hy, k);
  h.torso.rotation.x = L(h.torso.rotation.x, T.tx, k);
  h.body.rotation.x = L(h.body.rotation.x, T.bx, k * 0.6);
  h.body.position.y = L(h.body.position.y, T.by, k);
  h.head.rotation.x = L(h.head.rotation.x, T.hx, k);
  if (h.cloak) h.cloak.rotation.x = L(h.cloak.rotation.x, T.cl + Math.sin(t * 2.3) * 0.04, k * 0.5);
}

export function setShadows(h, on) { h.root.traverse((o) => { if (o.isMesh) o.castShadow = on; }); }