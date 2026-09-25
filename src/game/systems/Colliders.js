import * as THREE from 'three';

export class Colliders {
  constructor() {
    this.items = new Set();
    this.grid = new Map();
    this.cell = 12;
    this.enabled = true;
  }

  _keys(x, z, r) {
    const c = this.cell, k = [];
    for (let i = Math.floor((x - r) / c); i <= Math.floor((x + r) / c); i++)
      for (let j = Math.floor((z - r) / c); j <= Math.floor((z + r) / c); j++) k.push(i + ',' + j);
    return k;
  }

  _insert(o) {
    o.keys = this._keys(o.x, o.z, o.br);
    for (const k of o.keys) { if (!this.grid.has(k)) this.grid.set(k, []); this.grid.get(k).push(o); }
    this.items.add(o);
    return o;
  }

  addCircle(x, z, r, y0 = -50, y1 = 300, tag = '') { return this._insert({ type: 'c', x, z, r, br: r, y0, y1, tag }); }

  addBox(x, z, hw, hd, rot, y0 = -50, y1 = 300, tag = '') {
    return this._insert({ type: 'b', x, z, hw, hd, rot, c: Math.cos(rot), s: Math.sin(rot), br: Math.hypot(hw, hd), y0, y1, tag });
  }

  remove(o) {
    if (!o || !this.items.has(o)) return;
    this.items.delete(o);
    for (const k of o.keys) { const a = this.grid.get(k); if (a) { const i = a.indexOf(o); if (i >= 0) a.splice(i, 1); } }
  }

  query(x, z, r) {
    const out = new Set();
    for (const k of this._keys(x, z, r)) { const a = this.grid.get(k); if (a) for (const o of a) out.add(o); }
    return out;
  }

  contains(o, x, z, rad) {
    if (o.type === 'c') return Math.hypot(x - o.x, z - o.z) < o.r + rad;
    const dx = x - o.x, dz = z - o.z;
    const lx = dx * o.c - dz * o.s, lz = dx * o.s + dz * o.c;
    return Math.abs(lx) < o.hw + rad && Math.abs(lz) < o.hd + rad;
  }

  resolve(p, rad, y) {
    if (!this.enabled) return;
    for (const o of this.query(p.x, p.z, rad + 1)) {
      if (y < o.y0 || y > o.y1) continue;
      if (o.type === 'c') {
        const dx = p.x - o.x, dz = p.z - o.z, d = Math.hypot(dx, dz), m = o.r + rad;
        if (d < m && d > 1e-5) { p.x = o.x + (dx / d) * m; p.z = o.z + (dz / d) * m; }
      } else {
        const dx = p.x - o.x, dz = p.z - o.z;
        let lx = dx * o.c - dz * o.s, lz = dx * o.s + dz * o.c;
        const cx = Math.max(-o.hw, Math.min(o.hw, lx)), cz = Math.max(-o.hd, Math.min(o.hd, lz));
        const ex = lx - cx, ez = lz - cz, d = Math.hypot(ex, ez);
        if (d >= rad) continue;
        if (d > 1e-5) { lx = cx + (ex / d) * rad; lz = cz + (ez / d) * rad; }
        else if (o.hw - Math.abs(lx) < o.hd - Math.abs(lz)) lx = Math.sign(lx || 1) * (o.hw + rad);
        else lz = Math.sign(lz || 1) * (o.hd + rad);
        p.x = o.x + lx * o.c + lz * o.s;
        p.z = o.z - lx * o.s + lz * o.c;
      }
    }
  }

  blocked(x, z, rad, y) {
    for (const o of this.query(x, z, rad + 1)) {
      if (y < o.y0 || y > o.y1) continue;
      if (this.contains(o, x, z, rad)) return o;
    }
    return null;
  }

  rayLimit(from, dir, maxD, rad) {
    const steps = 16;
    for (let i = 1; i <= steps; i++) {
      const d = (maxD * i) / steps;
      if (this.blocked(from.x + dir.x * d, from.z + dir.z * d, rad, from.y + dir.y * d)) return Math.max(0.7, d - maxD / steps);
    }
    return maxD;
  }

  debugMesh(getY) {
    const pts = [];
    for (const o of this.items) {
      const y = getY(o.x, o.z) + 0.3;
      if (o.type === 'c') {
        for (let i = 0; i < 12; i++) {
          const a = (i / 12) * Math.PI * 2, b = ((i + 1) / 12) * Math.PI * 2;
          pts.push(o.x + Math.cos(a) * o.r, y, o.z + Math.sin(a) * o.r, o.x + Math.cos(b) * o.r, y, o.z + Math.sin(b) * o.r);
        }
      } else {
        const cs = [[-o.hw, -o.hd], [o.hw, -o.hd], [o.hw, o.hd], [-o.hw, o.hd]].map(([lx, lz]) => [o.x + lx * o.c + lz * o.s, o.z - lx * o.s + lz * o.c]);
        for (let i = 0; i < 4; i++) { const a = cs[i], b = cs[(i + 1) % 4]; pts.push(a[0], y, a[1], b[0], y, b[1]); }
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
    return new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color: '#f59e0b', depthTest: false, transparent: true }));
  }
}