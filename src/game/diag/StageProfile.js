// Always-on, low-overhead startup + frame-cost profiler for stage engines.
// Read it with window.__stage.prof.report(). Measures only: it never changes what is built or drawn.
const SOFTWARE = /swiftshader|llvmpipe|softpipe|software|basic render|microsoft basic/i;
const N = 240; // rolling frame window
const ms = (v) => Math.round(v * 10) / 10;
const stats = (a) => {
  if (!a.length) return null;
  const s = [...a].sort((x, y) => x - y), sum = a.reduce((x, y) => x + y, 0);
  return { avg: ms(sum / a.length), p50: ms(s[Math.floor(s.length * 0.5)]), p95: ms(s[Math.floor(s.length * 0.95)]), max: ms(s[s.length - 1]) };
};

export class StageProfile {
  constructor() {
    this.t0 = performance.now(); this.phases = []; this.assets = []; this.long = [];
    this.f = { sim: [], render: [], gap: [] }; this.first = []; this.count = 0; this.lastEnd = 0;
    this.react = { commits: 0, ms: 0, max: 0 }; this.emits = 0; this.readyAt = null;
    try {
      this.po = new PerformanceObserver((l) => { for (const x of l.getEntries()) if (this.long.length < 400) this.long.push({ at: Math.round(x.startTime - this.t0), ms: Math.round(x.duration) }); });
      this.po.observe({ type: 'longtask', buffered: true });
    } catch { this.po = null; }
  }
  now() { return performance.now(); }
  add(name, t, kind = 'build') { this.phases.push({ name, kind, ms: ms(performance.now() - t), at: Math.round(t - this.t0) }); }
  sync(name, fn, kind) { const t = performance.now(), v = fn(); this.add(name, t, kind); return v; }
  async wait(name, p, kind) { const t = performance.now(), v = await p; this.add(name, t, kind); return v; }
  asset(name, t, ok) { this.assets.push({ name: String(name || '').split('/').pop().slice(0, 60), ms: ms(performance.now() - t), ok, at: Math.round(t - this.t0) }); }
  ready() { this.readyAt = Math.round(performance.now() - this.t0); }

  // One frame: simulation (everything before drawing), render (draw calls), gap (time the browser spent
  // outside our frame since the previous one: React commits, GC, compositing, other tasks).
  frame(start, mid, end) {
    const sim = mid - start, render = end - mid, gap = this.lastEnd ? Math.max(0, start - this.lastEnd) : 0;
    this.lastEnd = end; this.count++;
    if (this.first.length < 5) this.first.push({ sim: ms(sim), render: ms(render) });
    for (const [k, v] of [['sim', sim], ['render', render], ['gap', gap]]) { const a = this.f[k]; a.push(v); if (a.length > N) a.shift(); }
  }
  onReact(d) { this.react.commits++; this.react.ms += d; this.react.max = Math.max(this.react.max, d); }

  gpu(r) {
    if (!r) return {};
    const gl = r.getContext(), ext = gl.getExtension('WEBGL_debug_renderer_info');
    const name = ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER);
    return { renderer: name, vendor: ext ? gl.getParameter(ext.UNMASKED_VENDOR_WEBGL) : gl.getParameter(gl.VENDOR), software: SOFTWARE.test(name) };
  }

  report(e) {
    const r = e?.renderer, info = r?.info, wall = (performance.now() - this.t0) / 1000;
    const by = (k) => ms(this.phases.filter((p) => p.kind === k).reduce((s, p) => s + p.ms, 0));
    const sim = stats(this.f.sim), render = stats(this.f.render), gap = stats(this.f.gap);
    const frameMs = sim && render && gap ? ms(sim.avg + render.avg + gap.avg) : null;
    let tris = 0; e?.scene?.traverse((o) => { if (o.isMesh && o.visible && o.geometry) tris += (o.geometry.index ? o.geometry.index.count : o.geometry.attributes.position?.count || 0) / 3; });
    const pending = e?.realm?.R?.set ? [...e.realm.R.set.items.values()].filter((o) => o.loading).length : 0;
    return {
      gpu: this.gpu(r), readyMs: this.readyAt, wallS: ms(wall),
      startup: { phases: this.phases, totals: { build: by('build'), assets: by('assets'), shaders: by('shaders'), firstRender: by('render'), idle: by('idle') } },
      assets: { loads: this.assets, pending },
      frames: {
        count: this.count, fps: e?.fps, frameMs, simMs: sim, renderMs: render, outsideFrameMs: gap, first: this.first,
        shareRender: frameMs ? ms((render.avg / frameMs) * 100) : null,
        drawCalls: info?.render.calls, triangles: info?.render.triangles, sceneTriangles: Math.round(tris),
        programs: info?.programs?.length, geometries: info?.memory.geometries, textures: info?.memory.textures,
        pixelRatio: r?.getPixelRatio(), canvas: r ? `${r.domElement.width}x${r.domElement.height}` : null, shadows: r?.shadowMap.enabled,
      },
      react: { commits: this.react.commits, totalMs: ms(this.react.ms), avgMs: this.react.commits ? ms(this.react.ms / this.react.commits) : 0, maxMs: ms(this.react.max), perSec: ms(this.react.commits / wall), hudEmits: this.emits, emitsPerSec: ms(this.emits / wall) },
      longTasks: { count: this.long.length, totalMs: this.long.reduce((s, x) => s + x.ms, 0), worst: [...this.long].sort((a, b) => b.ms - a.ms).slice(0, 8) },
    };
  }
}