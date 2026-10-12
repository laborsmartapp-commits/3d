import { base44 } from '@/api/base44Client';
import { THEATRE } from './layout';
import { Jets } from './jets';
import { Spray, FountainAudio } from './spray';
import { nozzle } from './theatre';
import { showState, DEFAULTS } from './showClock';

// The Grand Water Theatre show: nozzle groups on one instanced stream mesh, spray pools,
// sound, and the shared schedule stored in GameSettings.fountain_show (live-updated).
export class FountainShow {
  // opts.place(add, J) lays out another fountain's nozzles (Star Square) on the same show system.
  constructor(K, sites, opts = {}) {
    this.center = opts.center || THEATRE; this.reach = opts.reach ?? 40;
    const { e } = K, T = THEATRE, w = T.water + 0.18;
    this.e = e; this.cfg = { ...DEFAULTS }; this.local = null; this.hudT = 0;
    const J = (this.jets = new Jets(e.scene));
    const add = (g, x, y, z, dir, h, wd, ex, big) => { J.add(g, x, y, z, dir, h, wd, ex); if (!ex?.noNozzle) nozzle(K, x, y, z, big); };
    if (opts.place) opts.place(add, J); else {
    for (let k = -4; k <= 4; k++) add('columns', T.x + k * 12, w, T.z, [0, 1, 0], k === 0 ? 38 : 30 - Math.abs(k) * 2, k === 0 ? 0.55 : 0.36, null, true);
    for (let i = 0; i < 18; i++) { const a = (i / 18) * Math.PI * 2; add('crown', T.x + Math.cos(a) * 8, w, T.z + Math.sin(a) * 8, [-Math.cos(a) * 0.28, 1, -Math.sin(a) * 0.28], 12, 0.2); }
    // Crossing arcs from both long sides; each is tuned so it lands past the centre line, inside the basin.
    for (let k = 0; k < 12; k++) {
      const x = T.x - 36 + k * 6.5, cross = k % 2 ? 0.3 : -0.3, zo = 0.78 * T.rz * Math.sqrt(1 - (x / T.rx) ** 2), h = (1.1 * zo * 1.3) / 4;
      add('arcs', x, w, T.z - zo, [cross, 1.1, 1], h, 0.18); add('arcs', x, w, T.z + zo, [-cross, 1.1, -1], h, 0.18);
    }
    for (const sx of [-30, 30]) for (let k = -3; k <= 3; k++) { const th = (k * 8.3 * Math.PI) / 180; add('fans', T.x + sx, w, T.z, [0, Math.cos(th), Math.sin(th)], 13 - (Math.abs(k) * 4) / 3, 0.17); }
    for (let i = 0; i < 14; i++) { const a = i * 2.39, r = 12 + (i % 4) * 7; add('bubblers', T.x + Math.cos(a) * r * 1.4, w, T.z + Math.sin(a) * r * 0.45, [0, 1, 0], 1.3, 0.45); }
    for (const [x, y, z, k] of sites.chase) add('chase', x, y, z, [x < 0 ? 0.45 : -0.45, 1, 0.2], 2.2, 0.12, { chase: k });
    for (const [x, y, z] of sites.poolCrowns) for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; add('chase', x + Math.cos(a) * 2.6, y, z + Math.sin(a) * 2.6, [-Math.cos(a) * 0.35, 1, -Math.sin(a) * 0.35], 3.2, 0.12); }
    for (const [x, y, z] of sites.curtain) J.add('curtain', x, y, z, [0, 0.5, 0.86], 0.12, 0.34, { drop: 0.68 });
    }
    this.spray = new Spray(e.scene, e.isTouch);
    // Sound only in the explorable district, never over a live fight.
    this.audio = e.renderer ? new FountainAudio() : null;
    // opts.cfg: a fixed schedule of its own, not the shared gardens settings.
    if (opts.cfg) this.cfg = { ...DEFAULTS, ...opts.cfg }; else this.load();
  }

  async load() {
    const rec = (await base44.entities.GameSettings.filter({ key: 'global' }).catch(() => []))[0];
    if (this.gone) return;
    this.rec = rec; this.cfg = { ...DEFAULTS, ...(rec?.fountain_show || {}) };
    this.unsub = base44.entities.GameSettings.subscribe((ev) => { if (ev.data?.key === 'global' && ev.data.fountain_show) { this.rec = ev.data; this.cfg = { ...DEFAULTS, ...ev.data.fountain_show }; } });
  }

  // Admin: persist a shared change for everyone in the gardens.
  async save(patch) {
    this.cfg = { ...this.cfg, ...patch }; this.local = null;
    if (this.rec) this.rec = await base44.entities.GameSettings.update(this.rec.id, { fountain_show: this.cfg });
    else this.rec = await base44.entities.GameSettings.create({ key: 'global', fountain_show: this.cfg });
  }
  // Admin preview: a local-only override (OFF / STARTING / SHOW compositions / STOPPING); null clears.
  preview(patch) { this.local = patch ? { ...this.cfg, ...patch } : null; }

  state(now = Date.now()) { return showState(this.local || this.cfg, now); }

  update(dt, t, fx, fz) {
    const st = this.state();
    this.jets.update(dt, t, st.levels);
    this.spray.update(dt, this.jets.impacts);
    this.audio?.set(this.jets.flow, Math.hypot(fx - this.center.x, fz - this.center.z) - this.reach);
    if ((this.hudT -= dt) < 0 && this.e.emit) {
      this.hudT = 0.5;
      this.e.emit({ fountain: { phase: st.phase, cue: st.cue?.name || null, nextAt: st.nextAt, ambient: !!st.ambient, preview: !!this.local, cfg: this.cfg } });
    }
  }

  dispose() {
    this.gone = true; this.unsub?.(); this.audio?.dispose(); this.spray.dispose();
    this.jets.mesh.removeFromParent(); this.jets.geo.dispose(); this.jets.mesh.material.dispose();
  }
}