import * as THREE from 'three';
import { PLOTS } from '../world/layout';
import { MAT, box, cyl, mesh } from './builders';

function labelTexture(title, sub) {
  const c = document.createElement('canvas');
  c.width = 512; c.height = 128;
  const g = c.getContext('2d');
  g.fillStyle = 'rgba(13,18,38,0.78)';
  g.beginPath(); g.roundRect(8, 8, 496, 112, 40); g.fill();
  g.strokeStyle = 'rgba(5,206,145,0.7)'; g.lineWidth = 3; g.stroke();
  g.fillStyle = '#05ce91'; g.font = '600 38px Inter, sans-serif'; g.textAlign = 'center';
  g.fillText(title, 256, 60);
  g.fillStyle = '#e2e8f0'; g.font = '26px Inter, sans-serif';
  g.fillText(sub, 256, 98);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

const ALLOWED = {
  Small: 'Homes, shops, decor', Medium: 'Homes, shops, civic, decor', Large: 'All except palaces', Estate: 'All structures',
  Landmark: 'Cultural, magical, homes', Agricultural: 'Farms, homes, decor', Commercial: 'Shops, civic, decor', Decorative: 'Small structures, decor', Secret: 'All structures',
};

export class Plots {
  constructor(e) {
    this.e = e;
    this.group = new THREE.Group();
    e.scene.add(this.group);
    this.list = PLOTS.map((p) => {
      const y = e.groundAt(p.x, p.z);
      const g = new THREE.Group();
      g.position.set(p.x, y, p.z);
      if (p.style === 'stones') for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; g.add(mesh(new THREE.DodecahedronGeometry(0.35), MAT.stone, Math.cos(a) * p.r, e.groundAt(p.x + Math.cos(a) * p.r, p.z + Math.sin(a) * p.r) - y + 0.1, Math.sin(a) * p.r)); }
      else if (p.style === 'foundation') { g.add(cyl(p.r * 0.7, p.r * 0.72, 0.3, MAT.darkStone, 0, 0.05, 0, 10)); for (let i = 0; i < 7; i++) { const a = (i / 7) * Math.PI * 2; g.add(box(1.2, 0.6 + (i % 3) * 0.4, 0.8, MAT.stone, Math.cos(a) * p.r * 0.72, 0.3, Math.sin(a) * p.r * 0.72)); } }
      else if (p.style === 'platform') g.add(cyl(p.r * 0.6, p.r * 0.62, 0.25, MAT.stone, 0, 0.05, 0, 24));
      else { g.add(cyl(0.08, 0.08, 1.4, MAT.darkWood, 0, 0.7, 0, 6)); g.add(box(0.8, 0.45, 0.06, MAT.wood, 0, 1.2, 0)); }
      const banner = new THREE.Group();
      banner.add(cyl(0.06, 0.08, 3.5, MAT.darkWood, 0, 1.75, 0, 6));
      banner.add(box(0.04, 0.8, 1.2, MAT.clothTeal, 0, 3, 0.6));
      banner.position.set(p.r * 0.8, 0, 0);
      g.add(banner);
      const icon = new THREE.Sprite(new THREE.SpriteMaterial({ map: labelTexture('Available Land', p.name), transparent: true, opacity: 0, depthWrite: false }));
      icon.scale.set(6, 1.5, 1); icon.position.y = 4;
      g.add(icon);
      const pts = [];
      for (let i = 0; i <= 64; i++) { const a = (i / 64) * Math.PI * 2; const x = p.x + Math.cos(a) * p.r, z = p.z + Math.sin(a) * p.r; pts.push(new THREE.Vector3(x - p.x, e.groundAt(x, z) - y + 0.2, z - p.z)); }
      const ring = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: '#f59e0b', transparent: true, opacity: 0.9, depthTest: false }));
      ring.visible = false;
      g.add(ring);
      this.group.add(g);
      const plot = { ...p, y, g, banner, icon, ring };
      e.interact.add({ verb: 'Select Plot', label: p.name, radius: p.r + 2, pos: new THREE.Vector3(p.x, y, p.z), action: () => e.openPlot(plot) });
      return plot;
    });
  }

  isOwned(p) { return (this.e.island?.owned_plots || []).includes(p.id); }

  unlockState(p) {
    const disc = this.e.island?.discovered || [];
    if (p.unlock === 'free') return { ok: true, label: 'Free starter land' };
    if (p.unlock === 'purchase') return { ok: true, label: 'Available for purchase' };
    if (p.unlock === 'quest') return { ok: disc.length >= 5, label: `Quest reward: discover 5 locations (${Math.min(5, disc.length)}/5)` };
    const need = p.unlock.split(':')[1];
    return { ok: disc.includes(need), label: 'Discover the Hidden Hollow to unlock' };
  }

  info(p) {
    const u = this.unlockState(p);
    return { id: p.id, name: p.name, size: p.size, biome: p.biome, price: p.price, owned: this.isOwned(p), unlocked: u.ok, unlockLabel: u.label, radius: p.r, allowed: ALLOWED[p.size], unlock: p.unlock };
  }

  refresh() { for (const p of this.list) p.banner.visible = this.isOwned(p); }

  showRings(on) { for (const p of this.list) { p.ring.visible = on; p.ring.material.color.set(this.isOwned(p) ? '#05ce91' : '#f59e0b'); } }

  plotAt(x, z) { return this.list.find((p) => Math.hypot(x - p.x, z - p.z) <= p.r); }

  plotContaining(pts) { return this.list.find((p) => pts.every(([x, z]) => Math.hypot(x - p.x, z - p.z) <= p.r + 0.5)); }

  update(dt, pos, playMode) {
    for (const p of this.list) {
      const d = Math.hypot(pos.x - p.x, pos.z - p.z);
      const target = playMode && !this.isOwned(p) && d < p.r + 18 ? 0.95 : 0;
      p.icon.material.opacity += (target - p.icon.material.opacity) * Math.min(1, dt * 4);
      p.icon.visible = p.icon.material.opacity > 0.02;
      p.icon.position.y = 4 + Math.sin(this.e.time * 1.5 + p.x) * 0.15;
    }
  }
}