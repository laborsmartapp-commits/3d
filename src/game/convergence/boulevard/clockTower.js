import * as THREE from 'three';
import { box, place } from '../geo';
import { BASE, CURB } from './layout';

const GLYPHS = ['♈', '♉', '♊', '♋', '♌', '♍', '♎', '♏', '♐', '♑', '♒', '♓'];

function clockFace() {
  const c = document.createElement('canvas'); c.width = c.height = 512; const g = c.getContext('2d');
  g.fillStyle = '#10213f'; g.beginPath(); g.arc(256, 256, 256, 0, 7); g.fill();
  g.strokeStyle = '#d4a63a'; g.lineWidth = 14; g.beginPath(); g.arc(256, 256, 244, 0, 7); g.stroke();
  g.lineWidth = 3; g.beginPath(); g.arc(256, 256, 150, 0, 7); g.stroke();
  g.fillStyle = '#f3e2b3'; g.font = '64px "Noto Sans Symbols 2", "Segoe UI Symbol", serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
  GLYPHS.forEach((s, i) => { const a = (i / 12) * Math.PI * 2 - Math.PI / 2; g.fillText(s, 256 + Math.cos(a) * 196, 256 + Math.sin(a) * 196); });
  for (let i = 0; i < 60; i++) { const a = (i / 60) * Math.PI * 2; g.fillRect(256 + Math.cos(a) * 160 - 2, 256 + Math.sin(a) * 160 - 2, 4, 4); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

// The celestial clock tower at the heart of the Zodiac Plaza. Its hands keep real time.
export function buildClockTower(e) {
  const { scene, mats: M } = e, g0 = BASE + CURB, hands = [];
  place(scene, box(8, 1.2, 8, M.sandstone, 3), 0, g0 + 0.6, 0);
  place(scene, box(6.4, 3, 6.4, M.sandstone, 3), 0, g0 + 2.7, 0);
  const shaft = place(scene, box(5, 16, 5, M.marble, 3), 0, g0 + 12.2, 0);
  e.occluders.push(shaft);
  e.colliders.addBox(0, 0, 4.1, 4.1, 0);
  place(scene, box(5.8, 0.6, 5.8, M.trim), 0, g0 + 20.4, 0);
  const faceMat = new THREE.MeshStandardMaterial({ map: clockFace(), roughness: 0.5 });
  for (let i = 0; i < 4; i++) {
    const a = (i * Math.PI) / 2, n = new THREE.Vector3(Math.sin(a), 0, Math.cos(a));
    const face = new THREE.Mesh(new THREE.CircleGeometry(1.9, 48), faceMat);
    face.position.set(n.x * 2.52, g0 + 17.4, n.z * 2.52); face.rotation.y = a; scene.add(face);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(1.95, 0.12, 8, 48), M.gold);
    ring.position.copy(face.position).addScaledVector(n, 0.03); ring.rotation.y = a; ring.castShadow = true; scene.add(ring);
    for (const [len, wid, k] of [[1.1, 0.12, 'h'], [1.6, 0.08, 'm']]) {
      const pivot = new THREE.Group(); pivot.position.copy(face.position).addScaledVector(n, 0.08 + (k === 'm' ? 0.04 : 0)); pivot.rotation.y = a;
      const arm = new THREE.Group(); pivot.add(arm);
      const hand = new THREE.Mesh(new THREE.BoxGeometry(wid, len, 0.04), M.gold); hand.position.y = len / 2 - 0.15; arm.add(hand);
      scene.add(pivot); hands.push({ arm, k });
    }
  }
  for (const [x, z] of [[-2, -2], [2, -2], [-2, 2], [2, 2]]) place(scene, box(0.7, 4, 0.7, M.marble, 3), x, g0 + 22.7, z);
  place(scene, box(5.6, 0.6, 5.6, M.trim), 0, g0 + 25, 0);
  const spire = new THREE.Mesh(new THREE.ConeGeometry(3.4, 7, 4), M.metal); spire.rotation.y = Math.PI / 4; spire.castShadow = true;
  place(scene, spire, 0, g0 + 28.8, 0);
  place(scene, new THREE.Mesh(new THREE.SphereGeometry(0.6, 20, 14), M.gold), 0, g0 + 32.6, 0);
  const bell = new THREE.Mesh(new THREE.SphereGeometry(1.1, 20, 12, 0, 7, 0, 1.9), M.gold); bell.castShadow = true;
  place(scene, bell, 0, g0 + 23.4, 0);
  return () => {
    const d = new Date(), m = d.getMinutes() + d.getSeconds() / 60, h = (d.getHours() % 12) + m / 60;
    for (const { arm, k } of hands) arm.rotation.z = -((k === 'm' ? m / 60 : h / 12) * Math.PI * 2);
  };
}