import * as THREE from 'three';
import { rbox, sph } from './kit';

// A hinged door: animated swing, a collider while closed, and an interaction point for E / the editor.
export class Door {
  constructor(R, { ax, c, u, w, h, y0, t, swing = 'n', label, ext, open, mat, plain }) {
    this.R = R; this.label = label; this.ax = ax; this.w = w; this.h = h; this.y0 = y0; this.t = t;
    const M = R.M, a = u - w / 2, pivot = (this.pivot = new THREE.Group());
    if (ax === 'x') pivot.position.set(a, y0, c); else pivot.position.set(c, y0, a);
    this.base = ax === 'x' ? 0 : -Math.PI / 2;
    this.sign = (ax === 'x') === (swing === 'n') ? 1 : -1;
    this.cx = ax === 'x' ? u : c; this.cz = ax === 'x' ? c : u; this.cy = y0 + 1;
    const W = w - 0.03, H = h - 0.02, P = mat || (ext ? M.tint('gloss', '#1f5f63') : M.tint('paint', '#f7f4ec'));
    const add = (geo, m, x, y, z) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); o.castShadow = o.receiveShadow = true; o.userData.door = this; pivot.add(o); return o; };
    add(rbox(W, H, plain ? 0.04 : 0.045, 0.01), P, 0.015 + W / 2, H / 2 + 0.005, 0);
    if (!plain) {
      for (const s of [-1, 1]) {
        if (ext) add(rbox(W * 0.62, H * 0.3, 0.012, 0.004), M.tint('gloss', '#22323a'), 0.015 + W / 2, H * 0.72, s * 0.024);
        else for (const y of [0.72, 0.28]) for (const x of [0.3, 0.7]) add(rbox(W * 0.3, H * 0.34, 0.012, 0.004), P, 0.015 + W * x, H * y, s * 0.024);
        if (ext) for (const x of [0.3, 0.7]) add(rbox(W * 0.3, H * 0.3, 0.012, 0.004), P, 0.015 + W * x, H * 0.27, s * 0.024);
        add(sph(0.032, 14), M.tint('brass'), W - 0.06, 0.98, s * 0.05);
      }
    }
    this.open = !!open; this.a = this.open ? this.sign * 1.45 : 0; this.apply(); this.sync();
  }
  get verb() { return this.open ? 'Close' : 'Open'; }
  toggle() { this.open = !this.open; this.sync(); this.R.emit(); }
  set(open) { if (open !== this.open) this.toggle(); }
  sync() {
    const C = this.R.e.colliders;
    if (this.open && this.col) { C.remove(this.col); this.col = null; }
    if (!this.open && !this.col) this.col = this.ax === 'x' ? C.addBox(this.cx, this.cz, this.w / 2, this.t / 2 + 0.05, 0, this.y0 - 0.3, this.y0 + this.h, 'door') : C.addBox(this.cx, this.cz, this.t / 2 + 0.05, this.w / 2, 0, this.y0 - 0.3, this.y0 + this.h, 'door');
  }
  update(dt) { const tg = this.open ? this.sign * 1.45 : 0; if (Math.abs(tg - this.a) > 1e-3) { this.a += (tg - this.a) * (1 - Math.exp(-dt * 6)); this.apply(); } }
  apply() { this.pivot.rotation.y = this.base + this.a; }
}