import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { prepareModel } from './modelPrep';

// Development diagnostics for imported models (window.__modelLab): times each pipeline stage, renders the
// model in an isolated scene on the realm's own renderer and lighting, and measures main-thread stalls.
export function installModelLab(R) {
  const e = R.e, r = e.renderer, gl = r.getContext(), rt = new THREE.WebGLRenderTarget(256, 256);
  const sync = () => gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(4));
  const since = (t) => Math.round(performance.now() - t);
  const draw = (scene, cam) => { const t = performance.now(), prev = r.getRenderTarget(); r.setRenderTarget(rt); r.render(scene, cam); sync(); r.setRenderTarget(prev); return since(t); };
  const progs = () => r.info.programs.length;
  const lightsOf = (s) => { const c = {}; s.traverse((x) => { if (x.isLight) c[x.type] = (c[x.type] || 0) + 1; }); return c; };
  // Longest gap of a 10ms timer while fn runs = the longest main-thread block.
  const stall = async (fn) => {
    let last = performance.now(), max = 0, on = true;
    const tick = () => { const n = performance.now(); max = Math.max(max, n - last); last = n; if (on) setTimeout(tick, 10); };
    setTimeout(tick, 10); const t = performance.now(); const v = await fn(); const ms = since(t);
    await new Promise((res) => setTimeout(res, 40)); on = false; return { ms, maxStallMs: Math.round(max), v };
  };
  // Same light rig as the realm (cloned), nothing else.
  const mini = () => {
    const s = new THREE.Scene();
    e.scene.traverse((c) => { if (c.isLight && !c.parent?.isLight) { const l = c.clone(); s.add(l); if (l.target) { l.target.position.copy(c.target.position); s.add(l.target); } } });
    return s;
  };
  const cam = new THREE.PerspectiveCamera(45, 1, 0.05, 100); cam.position.set(2, 1.5, 3); cam.lookAt(0, 0.4, 0);
  const raw = new Map();
  const parse = async (url) => {
    if (raw.has(url)) return { cached: true, g: raw.get(url) };
    let t = performance.now(); const buf = await (await fetch(url)).arrayBuffer(); const download = since(t);
    t = performance.now(); const g = await new GLTFLoader().parseAsync(buf, ''); const parseMs = since(t);
    raw.set(url, g); return { download, parse: parseMs, bytes: buf.byteLength, g };
  };

  const lab = {
    // Runs [label, fn] steps in the background; progress (including the step in flight) is kept in
    // window.__labOut and localStorage so a stall still shows exactly where it happened.
    run(steps) {
      const out = (window.__labOut = { running: null, done: {}, t0: Math.round(performance.now()) });
      const keep = () => { try { localStorage.setItem('modelLabOut', JSON.stringify(out)); } catch { /* quota */ } };
      (async () => {
        for (const [label, fn] of steps) {
          out.running = label; out.runningSince = Math.round(performance.now()); keep();
          await new Promise((res) => setTimeout(res, 50));
          try { out.done[label] = await stall(fn); } catch (err) { out.done[label] = { error: String(err?.message || err) }; }
          keep();
        }
        out.running = null; out.finished = true; keep();
      })();
      return true;
    },
    state: () => ({ programs: progs(), lights: lightsOf(e.scene), calls: r.info.render.calls }),
    async inspect(url) {
      const p = await parse(url), g = p.g, mats = new Set(), tex = new Set();
      g.scene.traverse((c) => { if (c.isMesh) [].concat(c.material).forEach((m) => { mats.add(m); for (const k in m) if (m[k]?.isTexture) tex.add(m[k]); }); });
      return { download: p.download, parse: p.parse, bytes: p.bytes, lightsInFile: lightsOf(g.scene), materials: [...mats].map((m) => m.type), textures: [...tex].map((t) => `${t.image?.width}x${t.image?.height}`), ...prepareModel(g).stats };
    },
    // Minimal scene on the realm renderer + lighting: first frame (compile/upload) vs. next frame.
    async isolated(url, keepLights = false) {
      const g = (await parse(url)).g, s = mini(), p0 = progs();
      const m = keepLights ? g.scene.clone(true) : prepareModel(g).m; s.add(m);
      const t = performance.now(); const prep = prepareModel(g).stats; const prepMs = since(t);
      const box = new THREE.Box3().setFromObject(m);
      const first = draw(s, cam), second = draw(s, cam), third = draw(s, cam);
      return { keepLights, sceneLights: lightsOf(s), prepMs, prep, size: box.getSize(new THREE.Vector3()).toArray().map((v) => +v.toFixed(3)), firstFrameMs: first, secondFrameMs: second, thirdFrameMs: third, newPrograms: progs() - p0 };
    },
    // Does one extra light force already-compiled realm materials to rebuild? n realm materials only.
    async lightRecompile(n = 3) {
      const s = mini(), mats = Object.values(R.M).filter((m) => m?.isMaterial).slice(0, n), geo = new THREE.BoxGeometry(0.3, 0.3, 0.3);
      mats.forEach((m, i) => { const b = new THREE.Mesh(geo, m); b.position.x = i * 0.4 - 0.6; s.add(b); });
      const p0 = progs(), base1 = draw(s, cam), base2 = draw(s, cam), p1 = progs();
      const L = new THREE.DirectionalLight('#ffffff', 3); s.add(L);
      const withLight = draw(s, cam), p2 = progs(), withLight2 = draw(s, cam);
      return { materials: mats.map((m) => m.type), baseFirstMs: base1, baseNextMs: base2, programsReused: p1 === p0, afterExtraLightMs: withLight, afterExtraLightNextMs: withLight2, programsRebuilt: p2 - p1, perProgramMs: Math.round(withLight / Math.max(1, p2 - p1)) };
    },
    stall,
    // Each pipeline stage raced against a time limit, so a stage that never finishes is named instead of
    // hanging the run. A 10ms timer measures the longest main-thread block per stage (sync vs. async stall).
    async stages(url, onStep = () => {}) {
      const res = {}, race = (p, ms) => Promise.race([p.then((v) => ({ ok: true, v }), (err) => ({ ok: false, error: String(err?.message || err) })), new Promise((r) => setTimeout(() => r({ ok: false, timeout: ms }), ms))]);
      const step = async (k, fn, ms) => { const s = await stall(() => race(Promise.resolve().then(fn), ms)); res[k] = { ms: s.ms, maxStallMs: s.maxStallMs, ok: s.v.ok, timeout: s.v.timeout, error: s.v.error }; onStep(k, res[k]); return s.v; };
      const dl = await step('download', async () => { const r = await fetch(url); return new Uint8Array(await r.arrayBuffer()); }, 7000); if (!dl.ok) return res;
      const bytes = dl.v; res.download.bytes = bytes.length;
      const parsed = await step('parseDefault', () => new GLTFLoader().parseAsync(bytes.buffer, ''), 6000);
      if (!parsed.ok) {
        const dv = new DataView(bytes.buffer), jl = dv.getUint32(12, true), j = JSON.parse(new TextDecoder().decode(bytes.subarray(20, 20 + jl))), bin = 20 + jl + 8;
        const img = j.images?.[0], bv = img && j.bufferViews[img.bufferView], blob = bv && new Blob([bytes.subarray(bin + (bv.byteOffset || 0), bin + (bv.byteOffset || 0) + bv.byteLength)], { type: img.mimeType });
        if (blob) {
          await step('decodeImageBitmap', () => createImageBitmap(blob, { premultiplyAlpha: 'none', colorSpaceConversion: 'none' }).then((b) => `${b.width}x${b.height}`), 3000);
          await step('decodeImageElement', () => new Promise((ok, no) => { const im = new Image(); im.onload = () => ok(`${im.width}x${im.height}`); im.onerror = no; im.src = URL.createObjectURL(blob); }), 3000);
        }
        const tl = new GLTFLoader(); tl.register((p) => { p.textureLoader = new THREE.TextureLoader(p.options.manager); return { name: 'lab_texture_loader' }; });
        await step('parseWithImageElements', () => tl.parseAsync(bytes.buffer, ''), 5000);
        return res;
      }
      const { m } = prepareModel(parsed.v); m.position.set(e.player.pos.x, e.player.pos.y, e.player.pos.z);
      await step('compileAsyncInRealm', () => r.compileAsync(m, e.camera, e.scene), 5000);
      await step('firstRealmFrameWithModel', () => { e.scene.add(m); const a = draw(e.scene, e.camera), b = draw(e.scene, e.camera); e.scene.remove(m); return [a, b]; }, 5000);
      return res;
    },
    // Shader cost of the model's own materials vs. light count, with and without sheen (fresh program per run).
    async compileCost(url, nPoint, keepSheen) {
      const g = (await parse(url)).g, s = new THREE.Scene(), { m } = prepareModel(g), p0 = progs();
      for (let i = 0; i < nPoint; i++) { const l = new THREE.PointLight('#ffffff', 1, 8, 2); l.position.set(i - 1, 2, 1); s.add(l); }
      s.add(new THREE.DirectionalLight('#ffffff', 2));
      m.traverse((c) => { if (c.isMesh) { c.material = c.material.clone(); if (!keepSheen) { c.material.sheen = 0; } } });
      s.add(m);
      return { nPoint, keepSheen, ms: draw(s, cam), newPrograms: progs() - p0 };
    },
    caps: () => ({ parallelCompile: !!gl.getExtension('KHR_parallel_shader_compile'), realmPointLights: lightsOf(e.scene).PointLight || 0, sofaMaterial: null }),
    // Realm frame cost: n forced-sync renders of the real scene from the real camera.
    realmFrames(n = 3) { const out = []; for (let i = 0; i < n; i++) out.push(draw(e.scene, e.camera)); return out; },
  };
  return lab;
}