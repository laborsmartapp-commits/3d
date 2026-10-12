import * as THREE from 'three';
import { ART, CURB } from './layout';

// Seven lit public artworks. Each is self-illuminated and gently animated when the viewer is near.
export function buildArt(K) {
  const { M, mg, e } = K, y = CURB;
  const at = (id) => ART.find((a) => a.id === id);
  const live = (x, z, obj, fn) => { e.scene.add(obj); K.anims.push({ x, z, fn }); };

  // Orbital Ribbon: a twisting chrome band around a glowing core.
  { const a = at('ribbon'), pts = [];
    for (let i = 0; i <= 60; i++) { const t = (i / 60) * Math.PI * 4; pts.push(new THREE.Vector3(Math.cos(t) * 2.4, 1.2 + (i / 60) * 5, Math.sin(t) * 2.4)); }
    const g = new THREE.Group(); g.position.set(a.x, y, a.z);
    g.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 160, 0.16, 8), M.chrome));
    const core = new THREE.Mesh(new THREE.SphereGeometry(0.7, 20, 14), M.neon.cyan); core.position.y = 3.7; g.add(core);
    live(a.x, a.z, g, (t) => { g.rotation.y = t * 0.25; });
    mg.add(M.granite, new THREE.CylinderGeometry(3, 3.2, 0.6, 32), a.x, y + 0.3, a.z); }

  // Liquid Prism: a tall glass prism whose inner light shifts hue.
  { const a = at('prism'), mat = new THREE.MeshStandardMaterial({ color: '#bfe8ff', emissive: '#6fbfff', emissiveIntensity: 1.2, transparent: true, opacity: 0.75, roughness: 0.05, metalness: 0.2 });
    const m = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.6, 7, 3), mat); m.position.set(a.x, y + 4, a.z);
    live(a.x, a.z, m, (t) => { mat.emissive.setHSL((t * 0.03) % 1, 0.8, 0.55); m.rotation.y = t * 0.1; });
    mg.add(M.marbleBlack, new THREE.CylinderGeometry(2.6, 2.8, 0.5, 6), a.x, y + 0.25, a.z); }

  // Magnetic Bloom: bronze petals around a pulsing stamen.
  { const a = at('bloom'), g = new THREE.Group(); g.position.set(a.x, y + 0.5, a.z);
    for (let i = 0; i < 8; i++) { const p = new THREE.Mesh(new THREE.SphereGeometry(1, 12, 8, 0, Math.PI), M.bronze); p.scale.set(0.6, 2.4, 0.25); p.rotation.set(0.5, (i / 8) * Math.PI * 2, 0); p.position.set(Math.sin((i / 8) * Math.PI * 2) * 0.9, 1.8, Math.cos((i / 8) * Math.PI * 2) * 0.9); g.add(p); }
    const st = new THREE.Mesh(new THREE.SphereGeometry(0.55, 16, 12), M.neon.pink); st.position.y = 2.2; g.add(st);
    live(a.x, a.z, g, (t) => { const s = 1 + Math.sin(t * 2) * 0.12; st.scale.setScalar(s); });
    mg.add(M.granite, new THREE.CylinderGeometry(2.6, 2.8, 0.5, 32), a.x, y + 0.25, a.z); }

  // The Starfall Column: a fluted column crowned by a falling star of light.
  { const a = at('column');
    mg.add(M.stoneWhite, new THREE.CylinderGeometry(0.8, 1, 9, 20), a.x, y + 4.5, a.z);
    mg.add(M.gold, new THREE.TorusGeometry(1, 0.12, 8, 24), a.x, y + 9, a.z, Math.PI / 2);
    const star = new THREE.Mesh(new THREE.OctahedronGeometry(0.9), M.neon.amber); star.position.set(a.x, y + 10.4, a.z);
    live(a.x, a.z, star, (t) => { star.rotation.y = t; star.position.y = y + 10.4 + Math.sin(t * 1.3) * 0.25; }); }

  // Neon Roots: glowing tubes creeping from a wall base into the pavement.
  { const a = at('roots');
    for (let i = 0; i < 7; i++) { const pts = [], o = (i - 3) * 0.9; for (let k = 0; k <= 6; k++) pts.push(new THREE.Vector3(o + Math.sin(k + i) * 0.4, Math.max(0.05, 3.2 - k * 0.6), k * 0.5)); mg.add(i % 2 ? M.neon.mint : M.neon.violet, new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 24, 0.06, 5), a.x, y, a.z); } }

  // Pulse Mosaic: a wall of tiles that ripple in colour.
  { const a = at('mosaic'), n = 12, im = new THREE.InstancedMesh(new THREE.BoxGeometry(0.5, 0.5, 0.08), new THREE.MeshBasicMaterial(), n * 6), o = new THREE.Object3D(), c = new THREE.Color();
    for (let i = 0; i < n; i++) for (let j = 0; j < 6; j++) { o.position.set(a.x - 3 + i * 0.55, y + 0.8 + j * 0.55, a.z); o.updateMatrix(); im.setMatrixAt(i * 6 + j, o.matrix); im.setColorAt(i * 6 + j, c.set('#3ff0ff')); }
    live(a.x, a.z, im, (t) => { for (let i = 0; i < n; i++) for (let j = 0; j < 6; j++) { c.setHSL((0.55 + Math.sin(t * 1.5 - i * 0.4 - j * 0.3) * 0.15) % 1, 0.8, 0.5); im.setColorAt(i * 6 + j, c); } im.instanceColor.needsUpdate = true; }); }

  // Chromatic Cloud: floating lit orbs above Southstar.
  { const a = at('cloud'), g = new THREE.Group(), mats = [M.neon.pink, M.neon.cyan, M.neon.amber, M.neon.violet];
    for (let i = 0; i < 26; i++) { const m = new THREE.Mesh(new THREE.SphereGeometry(0.25 + (i % 3) * 0.12, 10, 8), mats[i % 4]); m.position.set(Math.sin(i * 2.4) * 4, 7 + Math.cos(i * 1.7) * 1.2, Math.cos(i * 2.4) * 3); g.add(m); }
    g.position.set(a.x, y, a.z);
    live(a.x, a.z, g, (t) => { g.children.forEach((m, i) => { m.position.y = 7 + Math.cos(i * 1.7 + t * 0.6) * 1.2; }); }); }

  for (const a of ART) { K.pool.add(a.x, 3, a.z, '#fff0dc', 6, 14); K.spill.pool(a.x, CURB + 0.05, a.z, 5, '#fff0dc', 0.4); if (a.r) e.colliders.addCircle(a.x, a.z, a.r); }
}