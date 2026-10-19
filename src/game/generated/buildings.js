import * as THREE from 'three';
import { tbox, bbox } from './merge';
import { textPlane } from '../convergence/geo';

// Solid exterior building massing with facade detail that depends on the style:
// photoreal = framed windows with sills + mullions, storey bands, rooftop plant; stylized = rounded corner
// pilasters and cornice; low poly = flat inset panes only.
export function buildBuilding(c, b) {
  const S = c.S, { m, tile } = c.mat(b.facade, b.color), y0 = c.L.terrain(b.x, b.z) - 0.05, cs = Math.cos(b.ry), sn = Math.sin(b.ry);
  const W = (lx, lz) => [b.x + lx * cs + lz * sn, b.z - lx * sn + lz * cs];
  const trim = c.mat('painted_wood', b.trim_color || (S.flat ? '#d8d0c0' : '#efe9dc')).m, dark = c.mat('iron').m;
  c.mg.add(m, tbox(b.w, b.h, b.d, tile), b.x, y0 + b.h / 2, b.z, b.ry);
  c.C.addBox(b.x, b.z, b.w / 2, b.d / 2, b.ry, -1, y0 + b.h + 1, 'building');
  const roofH = b.roof === 'parapet' ? 0.9 : 0, fh = (b.h - roofH) / b.storeys;

  // Face fy: rotation of the face normal in building space. put = local (tangent u, height y, out offset).
  const faces = [[0, b.w, b.d / 2], [Math.PI, b.w, b.d / 2], [Math.PI / 2, b.d, b.w / 2], [-Math.PI / 2, b.d, b.w / 2]];
  for (const [fy, len, hd] of faces) {
    const nx = Math.sin(fy), nz = Math.cos(fy), tx = Math.cos(fy), tz = -Math.sin(fy);
    const put = (mat, u, y, off, sx, sy, sz, rx = 0) => { const [x, z] = W(nx * (hd + off) + tx * u, nz * (hd + off) + tz * u); c.inst.add(mat, x, y0 + y, z, sx, sy, sz, b.ry + fy, undefined, rx); };
    const front = fy === 0, store = front && b.windows === 'storefront';
    if (b.windows !== 'none') {
      const ww = S.flat ? 1.6 : 1.3, wh = Math.min(fh * 0.55, S.flat ? 1.3 : 1.7), cols = Math.max(1, Math.floor(len / (S.flat ? 4 : 3.1)));
      for (let i = store ? 1 : 0; i < b.storeys; i++) for (let k = 0; k < cols; k++) {
        const u = -len / 2 + (len / cols) * (k + 0.5), y = i * fh + fh * 0.55;
        if (front && i === 0 && k === Math.floor(cols / 2)) continue; // door bay
        put(c.win, u, y, S.flat ? 0.01 : 0.02, ww, wh, 0.04);
        if (S.trims) { const f = S.trims === 2 ? 0.07 : 0.11; put(trim, u, y + wh / 2 + f / 2, 0.05, ww + f * 2, f, 0.08); put(trim, u - ww / 2 - f / 2, y, 0.05, f, wh, 0.08); put(trim, u + ww / 2 + f / 2, y, 0.05, f, wh, 0.08); }
        if (S.trims === 2) { put(trim, u, y - wh / 2 - 0.04, 0.09, ww + 0.25, 0.07, 0.18); put(trim, u, y, 0.05, 0.04, wh, 0.05); }
      }
    }
    if (S.trims === 2) for (let i = 1; i < b.storeys; i++) put(trim, 0, i * fh, 0.04, len + 0.08, 0.14, 0.08); // storey bands
    else if (S.trims === 1 && b.storeys > 1) put(trim, 0, fh, 0.05, len + 0.1, 0.2, 0.1);
    if (front) {
      if (store) {
        const gw = len - 1.2, gh = fh * 0.72, n = Math.max(2, Math.round(gw / 1.6));
        put(c.glass, 0, 0.35 + gh / 2, 0.03, gw, gh, 0.04);
        put(dark, 0, 0.18, 0.06, gw + 0.1, 0.36, 0.12);
        if (!S.flat) for (let i = 0; i <= n; i++) put(dark, -gw / 2 + (gw * i) / n, 0.35 + gh / 2, 0.06, 0.06, gh, 0.08);
        if (b.awning) put(c.mat('fabric', b.awning).m, 0, 0.4 + gh + 0.25, 0.6, gw, 0.08, 1.2, -0.35);
        if (b.sign) { const sg = textPlane(b.sign, Math.min(gw, 6), 0.9, '#1b1d22', '#f3e6c8'); const [x, z] = W(nx * (hd + 0.07), nz * (hd + 0.07)); sg.position.set(x, y0 + fh * 0.92 + 0.2, z); sg.rotation.y = b.ry + fy; c.e.scene.add(sg); }
      } else {
        put(c.mat('walnut_wood').m, 0, 1.15, 0.02, 1.2, 2.3, 0.06);
        if (S.trims) { put(trim, 0, 2.38, 0.05, 1.5, 0.12, 0.1); put(trim, -0.66, 1.15, 0.05, 0.1, 2.3, 0.1); put(trim, 0.66, 1.15, 0.05, 0.1, 2.3, 0.1); }
      }
    }
  }
  // Corners and roofline
  if (S.bevel > 0.03) for (const sx of [-1, 1]) for (const sz of [-1, 1]) { const [x, z] = W(sx * b.w / 2, sz * b.d / 2); c.mg.add(trim, bbox(0.45, b.h - roofH, 0.45, 0.12), x, y0 + (b.h - roofH) / 2, z, b.ry); }
  const top = y0 + b.h;
  if (b.roof === 'gable') {
    const along = b.w >= b.d, span = (along ? b.d : b.w) + 0.5, len = (along ? b.w : b.d) + 0.5, rise = span * 0.35;
    const sh = new THREE.Shape([new THREE.Vector2(-span / 2, 0), new THREE.Vector2(span / 2, 0), new THREE.Vector2(0, rise)]);
    c.mg.add(c.mat('roof_shingle').m, new THREE.ExtrudeGeometry(sh, { depth: len, bevelEnabled: false }).translate(0, 0, -len / 2), b.x, top, b.z, b.ry + (along ? Math.PI / 2 : 0));
  } else {
    const cr = S.bevel > 0.03 ? 0.08 : 0;
    c.mg.add(trim, cr ? bbox(b.w + 0.3, 0.3, b.d + 0.3, cr) : tbox(b.w + 0.3, 0.3, b.d + 0.3, 1), b.x, top - 0.15, b.z, b.ry); // cornice / coping
    if (S.trims === 2 && b.w > 6) { const [x, z] = W(b.w * 0.2, -b.d * 0.15); c.mg.add(c.metal, tbox(2, 1.1, 1.4, 1), x, top + 0.55, z, b.ry); }
  }
}