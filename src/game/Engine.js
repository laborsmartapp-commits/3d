import * as THREE from 'three';
import { base44 } from '@/api/base44Client';
import { U } from './core/shared';
import { smoothstep } from './core/noise';
import { Terrain, forestMask } from './world/Terrain';
import { Colliders } from './systems/Colliders';
import { Sky } from './world/Sky';
import { createWater, createWaterfall, createMist } from './world/Water';
import { Vegetation } from './world/Vegetation';
import { Landmarks } from './world/Landmarks';
import { buildVillage } from './world/Village';
import { Environment, WEATHERS, stageOf } from './systems/Environment';
import { Input } from './systems/Input';
import { CameraRig } from './systems/CameraRig';
import { AudioManager } from './systems/Audio';
import { Interaction } from './systems/Interaction';
import { Player } from './actors/Player';
import { NPCManager, makeDialogue } from './actors/NPCs';
import { Animals } from './actors/Animals';
import { SkyLife } from './actors/SkyLife';
import { Particles, FX } from './fx/Particles';
import { Plots } from './build/Plots';
import { BuildManager } from './build/BuildManager';
import { R, WATER, SPAWN, DISCOVERIES, RIVER_S, OUTLET_S, GROTTO } from './world/layout';

const V = THREE.Vector3;
export const QUALITY = {
  low: { pr: 0.8, shadow: 0, grass: 0.25, grassDist: 45, particles: 0.3, npcs: 6, fauna: 0.5, fog: 1.4 },
  medium: { pr: 1, shadow: 1024, grass: 0.5, grassDist: 65, particles: 0.6, npcs: 8, fauna: 0.8, fog: 1.15 },
  high: { pr: 1.5, shadow: 2048, grass: 0.8, grassDist: 90, particles: 1, npcs: 10, fauna: 1, fog: 1 },
  ultra: { pr: 2, shadow: 4096, grass: 1, grassDist: 130, particles: 1, npcs: 10, fauna: 1, fog: 0.85 },
};
const NOINPUT = { move: { x: 0, y: 0 }, sprint: false, jump: false, interact: false, walk: false, drag: null, wheel: 0, clicks: [], keys: new Set(), pressed: new Set() };
const TIPS = [
  'Hold right mouse and drag to orbit the camera. Scroll to zoom.',
  'Approach glowing stones and clearings to discover buildable land.',
  'Villagers follow daily routines — visit the tavern after dusk.',
  'Bioluminescent plants awaken at night. Explore after sunset.',
  'Collect Moonshards along the trails to fund new structures.',
  'Press B for Build Mode, P for Photo Mode, V for first person.',
];

class LightPool {
  constructor(scene, n = 6) {
    this.lights = Array.from({ length: n }, () => { const l = new THREE.PointLight('#ffb060', 0, 16, 1.3); scene.add(l); return l; });
    this.sources = []; this.active = []; this.t = 0; this.max = n;
  }
  add(s) { this.sources.push(s); return s; }
  remove(s) { const i = this.sources.indexOf(s); if (i >= 0) this.sources.splice(i, 1); this.t = 0; }
  update(dt, cam, night, time) {
    this.t -= dt;
    if (this.t < 0) {
      this.t = 0.4;
      this.active = this.sources.filter((s) => s.always || night > 0.25).map((s) => [s, s.pos.distanceToSquared(cam)]).filter((a) => a[1] < 90 * 90).sort((a, b) => a[1] - b[1]).slice(0, this.max).map((a) => a[0]);
    }
    this.lights.forEach((l, i) => {
      const s = this.active[i];
      if (!s) { l.intensity = 0; return; }
      l.position.copy(s.pos); l.color.set(s.color); l.distance = s.dist;
      l.intensity = s.intensity * (s.always ? 1 : night) * (0.9 + Math.sin(time * 13 + i) * 0.1);
    });
  }
}

export class Engine {
  constructor(container, onState, onPanel) {
    this.container = container; this.onState = onState; this.onPanel = onPanel;
    this.hud = { phase: 'loading', progress: 0, step: 'Preparing', tip: TIPS[0], mode: 'intro', prompt: null };
    this.time = 0; this.mode = 'intro'; this.discT = 0; this.eventT = 30; this.hudT = 0; this.statT = 0; this.frames = 0; this.fps = 60;
    this.audioT = 0; this.emberT = 0; this.localDisc = new Set();
  }

  emit(p) { Object.assign(this.hud, p); if (!this.disposed) this.onState({ ...this.hud }); }
  notify(text) { this.emit({ notice: { id: Math.random(), text } }); }

  groundAt(x, z) {
    let h = this.terrain.getHeight(x, z);
    for (const p of this.platforms) { const v = p.heightAt(x, z); if (v !== null && v > h) h = v; }
    return h;
  }

  async init() {
    const step = async (progress, step) => { this.emit({ progress, step, tip: TIPS[Math.floor(progress / 17) % TIPS.length] }); await new Promise((r) => setTimeout(r, 30)); return this.disposed; };
    this.isTouch = window.matchMedia('(pointer: coarse)').matches;
    this.qName = this.isTouch ? 'low' : 'high';
    this.Q = QUALITY[this.qName];
    if (await step(3, 'Igniting the stars')) return;
    const r = (this.renderer = new THREE.WebGLRenderer({ antialias: !this.isTouch, powerPreference: 'high-performance' }));
    r.setPixelRatio(Math.min(window.devicePixelRatio, this.Q.pr));
    r.setSize(this.container.clientWidth, this.container.clientHeight);
    r.shadowMap.enabled = true;
    r.shadowMap.type = THREE.PCFSoftShadowMap;
    r.toneMapping = THREE.ACESFilmicToneMapping;
    r.outputColorSpace = THREE.SRGBColorSpace;
    r.domElement.style.touchAction = 'none';
    r.domElement.style.display = 'block';
    this.container.appendChild(r.domElement);
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(60, this.container.clientWidth / this.container.clientHeight, 0.1, 4500);
    this.camera.position.set(420, 260, 800);
    this.colliders = new Colliders();
    this.occluders = []; this.platforms = []; this.seats = []; this.fires = []; this.anims = [];
    this.lightPool = new LightPool(this.scene, 6);
    this.interact = new Interaction();
    this.audio = new AudioManager();
    if (await step(8, 'Raising the island')) return;
    this.terrain = new Terrain();
    this.terrain.build();
    this.scene.add(this.terrain.mesh, this.terrain.underside);
    if (await step(30, 'Filling the lagoon')) return;
    this.water = createWater(this.terrain);
    this.scene.add(this.water.mesh);
    this.buildWaterfalls();
    this.player = new Player(this);
    this.env = new Environment(this);
    this.input = new Input(r.domElement);
    this.rig = new CameraRig(this);
    if (await step(42, 'Carving ruins and bridges')) return;
    this.fx = new FX(this.scene);
    this.landmarks = new Landmarks(this);
    this.player.respawn();
    this.build = new BuildManager(this);
    this.plots = new Plots(this);
    buildVillage(this);
    if (await step(58, 'Growing the forests')) return;
    this.veg = new Vegetation(this);
    this.scene.add(this.veg.group);
    for (const s of this.seats) this.interact.add({ verb: 'Sit', label: s.kind === 'bench' ? 'Bench' : s.kind === 'log' ? 'Fallen log' : 'Rock', radius: 1.6, pos: new V(s.x, s.y, s.z), action: () => this.player.sitAt(s) });
    for (const s of this.landmarks.shards) this.interact.add({
      verb: 'Harvest', label: 'Moonshard', radius: 2, pos: new V(s.x, s.y, s.z), enabled: () => s.mesh.visible,
      action: () => { s.mesh.visible = false; s.respawn = 240; this.addShards(30); this.fx.emit(s.mesh.position, { count: 20, color: '#05ce91', up: 3, spread: 0.6, life: 1.2 }); this.audio.chime(); this.player.gestureFor('interact', 0.8); this.notify('+30 Moonshards'); },
    });
    if (await step(72, 'Waking the villagers')) return;
    this.npcs = new NPCManager(this);
    if (await step(82, 'Releasing wildlife')) return;
    this.animals = new Animals(this);
    this.skyLife = new SkyLife(this);
    if (await step(90, 'Painting the sky')) return;
    this.sky = new Sky(this.scene);
    this.particles = new Particles(this);
    if (await step(95, 'Loading your island')) return;
    await this.loadMyIsland();
    this.applyQuality(this.qName);
    this.onResize = () => {
      const w = this.container.clientWidth, h = this.container.clientHeight;
      this.renderer.setSize(w, h); this.camera.aspect = w / h; this.camera.updateProjectionMatrix();
    };
    window.addEventListener('resize', this.onResize);
    this.clock = new THREE.Clock();
    this.frame();
    this.emit({ progress: 100, step: 'The island awaits', phase: 'ready', isTouch: this.isTouch, quality: this.qName });
  }

  buildWaterfalls() {
    this.waterfallPos = [];
    const edge = (S) => {
      const i = S.findIndex((p) => Math.hypot(p[0], p[1]) > R * 0.915);
      if (i < 1) return;
      const [x, z] = S[i], [px, pz] = S[i - 1];
      const dir = new V(x - px, 0, z - pz).normalize(), side = new V(-dir.z, 0, dir.x);
      const pts = [];
      for (let k = 0; k <= 24; k++) { const t = k / 24; pts.push(new V(x, WATER - t * 160, z).addScaledVector(dir, Math.sqrt(t) * 8 + 0.5)); }
      this.scene.add(createWaterfall(pts, 9, side, true));
      this.scene.add(createMist(new V(x + dir.x * 3, WATER - 3, z + dir.z * 3), 8, 40, 8));
      this.waterfallPos.push(new V(x, WATER, z));
    };
    edge(RIVER_S); edge(OUTLET_S);
    const [sx, sz] = RIVER_S[0], [nx, nz] = RIVER_S[3];
    const dir = new V(nx - sx, 0, nz - sz).normalize(), side = new V(-dir.z, 0, dir.x);
    const pts = [];
    for (let k = 0; k <= 20; k++) { const d = 16 - k * 0.65; const x = sx - dir.x * d, z = sz - dir.z * d; pts.push(new V(x, Math.max(WATER, this.terrain.getHeight(x, z) + 0.4), z)); }
    this.scene.add(createWaterfall(pts, 5, side, false));
    this.scene.add(createMist(new V(sx, WATER, sz), 6, 30, 5));
    this.waterfallPos.push(new V(sx, WATER, sz));
  }

  async loadMyIsland() {
    const id = localStorage.getItem('celestia_island_id');
    let isl = null;
    if (id) isl = (await base44.entities.Island.filter({ id }))[0];
    if (!isl) {
      isl = await base44.entities.Island.create({ name: 'Celestia Grotto', owner_label: 'You', kind: 'player', shards: 1200, owned_plots: ['p1'], discovered: [], is_public: true });
      localStorage.setItem('celestia_island_id', isl.id);
    }
    this.myIsland = isl;
    await this.loadIsland(isl);
  }

  async loadIsland(isl) {
    this.island = isl;
    this.readOnly = isl.id !== this.myIsland.id;
    this.localDisc = new Set(isl.discovered || []);
    this.build.clear();
    const objs = await base44.entities.IslandObject.filter({ island_id: isl.id }, '-created_date', 500);
    for (const r of objs) if (!r.is_stored) this.build.addRecord(r);
    this.build.stored = objs.filter((r) => r.is_stored);
    this.plots.refresh();
    this.emit({ islandName: isl.name, owner: isl.owner_label, readOnly: this.readOnly, shards: isl.shards ?? 0, stored: this.build.storedList(), islandId: isl.id, myIslandId: this.myIsland.id, discovered: [...this.localDisc], owned: isl.owned_plots || [] });
  }

  async visitIsland(id) {
    this.emit({ fade: true });
    this.onPanel(null);
    await new Promise((r) => setTimeout(r, 450));
    const isl = id === this.myIsland.id ? this.myIsland : (await base44.entities.Island.filter({ id }))[0];
    if (this.mode !== 'play') this.setMode('play');
    await this.loadIsland(isl);
    this.player.respawn();
    this.rig.yaw = SPAWN.camYaw; this.rig.pitch = 0.3;
    if (id !== this.myIsland.id) {
      const rec = JSON.parse(localStorage.getItem('celestia_recent') || '[]').filter((x) => x !== id);
      localStorage.setItem('celestia_recent', JSON.stringify([id, ...rec].slice(0, 6)));
    }
    this.emit({ fade: false });
    this.notify(id === this.myIsland.id ? 'Welcome home' : `Welcome to ${isl.name}`);
  }

  saveIsland(patch) {
    if (this.readOnly) return;
    Object.assign(this.island, patch);
    clearTimeout(this.saveTimer);
    this.saveTimer = setTimeout(() => base44.entities.Island.update(this.island.id, patch), 600);
  }

  addShards(n) {
    if (this.readOnly) return;
    const shards = Math.max(0, (this.island.shards || 0) + n);
    this.saveIsland({ shards });
    this.emit({ shards });
  }

  start() {
    this.audio.start();
    this.emit({ phase: 'intro' });
    const end = this.rig.thirdPos(this.player.pos, new V());
    this.intro = { t: 0, dur: 10, curve: new THREE.CatmullRomCurve3([new V(420, 260, 800), new V(300, 190, 560), new V(200, 95, 240), new V(175, 30, -10), end]) };
    this.mode = 'intro';
  }

  skipIntro() { if (this.intro) this.intro.t = 1; }

  updateIntro(dt) {
    const I = this.intro;
    I.t += dt / I.dur;
    const t = Math.min(1, I.t), k = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
    this.camera.position.copy(I.curve.getPoint(k));
    const head = new V(this.player.pos.x, this.player.pos.y + 1.55, this.player.pos.z);
    this.camera.lookAt(new V(0, 20, 0).lerp(head, smoothstep(0.55, 0.95, t)));
    this.sky.setIntroSpread(Math.min(1, t * 3));
    if (t > 0.8 && !this.introFx) { this.introFx = true; this.fx.emit(head, { count: 40, color: '#05ce91', up: 2, spread: 1, life: 1.5 }); this.audio.chime(); }
    if (t >= 1) {
      this.sky.setIntroSpread(1);
      this.rig.target.copy(head); this.rig.cur = this.rig.dist;
      this.mode = 'play'; this.intro = null;
      this.emit({ phase: 'game', mode: 'play' });
    }
  }

  cinematic(center, radius, height, dur, after) {
    const prev = this.cine ? this.cine.prevMode : this.mode;
    this.cine = { center, radius, height, t: 0, dur, a0: Math.atan2(this.camera.position.z - center.z, this.camera.position.x - center.x), after, prevMode: prev };
    this.mode = 'cine';
    this.rig.startBlend(1.2);
    this.emit({ cine: true });
  }

  updateCine(dt) {
    const c = this.cine;
    c.t += dt;
    const a = c.a0 + c.t * 0.35;
    this.camera.position.set(c.center.x + Math.cos(a) * c.radius, c.center.y + c.height, c.center.z + Math.sin(a) * c.radius);
    this.camera.lookAt(c.center);
    if (c.t > c.dur) { this.mode = c.prevMode; this.cine = null; this.rig.startBlend(1); this.emit({ cine: false }); c.after?.(); }
  }

  setMode(m) {
    if (this.hud.phase !== 'game' || this.mode === 'cine') return;
    if (m === 'build' && this.readOnly) { this.notify('You are visiting — building is disabled'); return; }
    const prev = this.mode;
    if (prev === m) m = 'play';
    if (prev === 'build') { this.build.cancel(); this.plots.showRings(false); this.build.devPlace = false; }
    this.rig.startBlend(m === 'build' || prev === 'build' ? 1.2 : 0.7);
    const p = this.player.pos;
    if (m === 'build') { this.rig.bld.focus.copy(p); this.rig.bld.yaw = this.rig.yaw; this.rig.bld.dist = 45; this.plots.showRings(true); }
    if (m === 'photo') Object.assign(this.rig.photo, { yaw: this.rig.yaw, pitch: this.rig.pitch, dist: this.rig.dist }), this.rig.photo.focus.set(p.x, p.y + 1.4, p.z);
    if (m === 'free') { this.rig.free.pos.copy(this.camera.position); this.rig.free.yaw = this.rig.yaw; this.rig.free.pitch = this.rig.pitch; }
    if (m === 'first') this.rig.pitch = 0;
    if (prev === 'first' && m === 'play') this.rig.pitch = 0.3;
    this.mode = m;
    this.input.lookAny = m === 'first' || m === 'free' || m === 'photo';
    this.emit({ mode: m });
  }

  handleKeys(inp) {
    if (this.hud.phase !== 'game') return;
    const P = inp.pressed, m = this.mode;
    if (P.has('Escape')) {
      if (this.hud.dialogue) this.closeDialogue();
      else if (this.hud.plot) this.emit({ plot: null });
      else if (m === 'build' && (this.build.ghost || this.build.selected)) this.build.cancel();
      else if (m !== 'play') this.setMode('play');
      else this.onPanel(null);
    }
    if (P.has('KeyB')) { this.setMode('build'); this.onPanel(this.mode === 'build' ? 'catalog' : null); }
    if (P.has('KeyP')) this.setMode('photo');
    if (P.has('KeyV') && (m === 'play' || m === 'first')) this.setMode(m === 'first' ? 'play' : 'first');
    if (P.has('Backquote')) this.onPanel('toggle-dev');
    if (P.has('KeyF') && this.devOpen) this.setMode('free');
    if (m === 'play' || m === 'first') {
      if (P.has('KeyG')) this.player.gestureFor('wave');
      if (P.has('KeyT')) this.player.gestureFor('point');
    }
    if (m === 'build' && (P.has('Delete') || P.has('Backspace')) && this.build.selected) this.build.demolishSel();
  }

  pickGround(nx, ny) {
    const ray = new THREE.Raycaster();
    ray.setFromCamera(new THREE.Vector2(nx, ny), this.camera);
    const o = ray.ray.origin, d = ray.ray.direction;
    let prev = 0;
    for (let t = 1; t < 900; t += 1.5) {
      const x = o.x + d.x * t, y = o.y + d.y * t, z = o.z + d.z * t;
      if (y < this.groundAt(x, z)) {
        let a = prev, b = t;
        for (let i = 0; i < 8; i++) { const m = (a + b) / 2; if (o.y + d.y * m < this.groundAt(o.x + d.x * m, o.z + d.z * m)) b = m; else a = m; }
        const p = new V(o.x + d.x * b, 0, o.z + d.z * b);
        p.y = this.groundAt(p.x, p.z);
        return p.y < -100 ? null : p;
      }
      prev = t;
    }
    return null;
  }

  onFootstep(pos, wet) {
    const g = this.groundAt(pos.x, pos.z), t = this.terrain.getHeight(pos.x, pos.z);
    const surf = wet ? 'water' : g > t + 0.15 ? 'wood' : this.terrain.surfaceAt(pos.x, pos.z);
    this.audio.footstep(surf);
    const fx = { dirt: '#9a8466', sand: '#c9b58f', water: '#bdf6ff', leaves: '#5d8a3a', crystal: '#a855f7' }[surf];
    if (fx) this.fx.emit(pos, { count: surf === 'water' ? 6 : 3, color: fx, up: 0.6, spread: 0.3, life: 0.6 });
  }

  startDialogue(npc) {
    npc.talking = true;
    npc.relationship++;
    this.dialogueNpc = npc;
    const d = npc.data;
    this.emit({ dialogue: { name: d.name, job: d.job, age: d.age, mood: npc.mood, personality: d.personality, friendship: npc.relationship, lines: makeDialogue(npc, this.npcs.dialogueContext(npc)), id: Math.random() } });
  }

  closeDialogue() { if (this.dialogueNpc) this.dialogueNpc.talking = false; this.dialogueNpc = null; this.emit({ dialogue: null }); }

  openDoor(id) { const o = this.build.statics.get(id); if (o) o.doorUntil = this.time + 3.5; }

  onAnimalInteract(a) {
    this.player.gestureFor('interact', 1);
    if (a.sp.pet) { this.fx.emit(new V(a.pos.x, a.pos.y + 0.6, a.pos.z), { count: 12, color: '#f472b6', up: 1.2, spread: 0.3, life: 1 }); this.audio.chime(); this.notify(`The ${a.sp.name} purrs and leans into your hand.`); return; }
    this.notify(`${a.sp.name} — ${a.sp.lore}`);
    if (a.sp.rare && !a.seen) { a.seen = true; this.addShards(100); this.emit({ discovery: { id: Math.random(), title: 'Rare Sighting', sub: a.sp.name } }); }
  }

  openPlot(p) { this.emit({ plot: this.plots.info(p) }); }

  purchasePlot(id) {
    const p = this.plots.list.find((x) => x.id === id), info = this.plots.info(p);
    if (this.readOnly) return this.notify('You cannot purchase land on another island');
    if (!info.unlocked) return this.notify(info.unlockLabel);
    const price = p.unlock === 'purchase' ? p.price : 0;
    if (price > this.island.shards) { this.audio.error(); return this.notify('Not enough Moonshards'); }
    this.saveIsland({ owned_plots: [...(this.island.owned_plots || []), id] });
    this.addShards(-price);
    this.plots.refresh();
    this.audio.chime();
    this.fx.emit(new V(p.x, p.y + 1, p.z), { count: 60, color: '#05ce91', up: 3, spread: p.r * 0.6, life: 1.6 });
    this.notify(`${p.name} is now yours`);
    this.emit({ plot: this.plots.info(p), owned: this.island.owned_plots });
  }

  previewPlot(id) {
    const p = this.plots.list.find((x) => x.id === id);
    this.cinematic(new V(p.x, p.y + 2, p.z), p.r + 16, 12, 5);
  }

  buildOnPlot(id) {
    const p = this.plots.list.find((x) => x.id === id);
    this.emit({ plot: null });
    this.setMode('build');
    if (this.mode !== 'build') return;
    this.rig.bld.focus.set(p.x, p.y, p.z);
    this.rig.bld.dist = p.r * 2.5 + 20;
    this.onPanel('catalog');
  }

  teleport(x, z) { this.player.teleport(x, z); if (this.mode !== 'play' && this.mode !== 'first') this.setMode('play'); }

  applyQuality(name) {
    this.qName = name;
    this.Q = QUALITY[name];
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, this.Q.pr));
    const s = this.env.sun;
    s.castShadow = this.Q.shadow > 0;
    if (this.Q.shadow) { s.shadow.mapSize.set(this.Q.shadow, this.Q.shadow); s.shadow.map?.dispose(); s.shadow.map = null; }
    this.npcs.maxVisible = this.Q.npcs;
    this.lightPool.max = name === 'low' ? 2 : name === 'medium' ? 4 : 6;
    this.emit({ quality: name });
  }

  toggleCollisionViz(on) {
    if (this.colViz) { this.scene.remove(this.colViz); this.colViz = null; }
    if (on) { this.colViz = this.colliders.debugMesh((x, z) => this.groundAt(x, z)); this.scene.add(this.colViz); }
  }

  checkDiscoveries() {
    const p = this.player.pos;
    for (const d of DISCOVERIES) {
      if (this.localDisc.has(d.id) || Math.hypot(p.x - d.x, p.z - d.z) > d.r) continue;
      this.localDisc.add(d.id);
      this.emit({ discovery: { id: Math.random(), title: d.name, sub: d.secret ? 'Secret Discovered' : 'Discovered' }, discovered: [...this.localDisc] });
      this.audio.chime();
      if (!this.readOnly) {
        this.saveIsland({ discovered: [...this.localDisc] });
        this.addShards(25);
        if (this.localDisc.size === 5) this.notify('Quest complete: Starwell Plateau is now unlocked');
        if (d.id === 'hollow') this.notify('A hidden plot of land has revealed itself');
      }
    }
  }

  ambientEvent() {
    const r = Math.random(), p = this.player.pos;
    if (this.env.night > 0.6 && r < 0.3) this.sky.shootingStar();
    else if (r < 0.45) this.animals.landNear(p);
    else if (r < 0.6 && this.env.p.cloud > 0.5) this.audio.thunder(3);
    else if (r < 0.72) this.audio.whale();
    else {
      const fox = this.animals.list.find((a) => a.key === 'fox' && a.root.visible);
      if (!fox) return;
      const fwd = new V(Math.sin(this.player.yaw), 0, Math.cos(this.player.yaw)), right = new V(fwd.z, 0, -fwd.x);
      const s = p.clone().addScaledVector(fwd, 10).addScaledVector(right, 14);
      if (!this.animals.validGround(s.x, s.z)) return;
      const tgt = p.clone().addScaledVector(fwd, 10).addScaledVector(right, -16);
      fox.pos.set(s.x, this.groundAt(s.x, s.z), s.z);
      fox.target = { x: tgt.x, z: tgt.z }; fox.state = 'flee'; fox.timer = 5;
    }
  }

  frame = () => {
    if (this.disposed) return;
    this.raf = requestAnimationFrame(this.frame);
    const dt = Math.min(this.clock.getDelta(), 0.05);
    this.time += dt;
    U.time.value = this.time;
    const inp = this.input.consume();
    this.handleKeys(inp);
    this.env.update(dt);
    const m = this.mode;
    if (this.hud.phase === 'ready') { this.camera.position.set(420 + Math.sin(this.time * 0.1) * 10, 260, 800); this.camera.lookAt(0, 20, 0); }
    else if (m === 'intro') this.updateIntro(dt);
    else if (m === 'cine') { this.player.update(dt, NOINPUT, this.rig.yaw, false, true); this.updateCine(dt); }
    else {
      const frozen = m === 'photo' || m === 'build' || m === 'free' || !!this.dialogueNpc;
      this.player.update(dt, frozen ? NOINPUT : inp, this.rig.yaw, m === 'first', frozen);
      if (m === 'play') this.rig.third(dt, inp, this.player);
      else if (m === 'first') this.rig.first(dt, inp, this.player);
      else if (m === 'photo') this.rig.photoCam(dt, inp);
      else if (m === 'build') { this.rig.buildCam(dt, inp); this.build.update(dt, inp); }
      else if (m === 'free') this.rig.freeCam(dt, inp);
      if ((m === 'play' || m === 'first') && !this.dialogueNpc) {
        const it = this.interact.update(this.player.pos);
        if (inp.interact && it) it.action();
      }
    }
    this.rig.applyBlend(dt);
    U.player.value.copy(this.player.pos);
    const cam = this.camera.position;
    this.build.tick(dt);
    for (const fn of this.anims) fn(this.time, this.env.night, this.env.p.wind, dt);
    this.veg.update(dt, cam, this.Q);
    this.sky.update(dt, this.env, this.camera);
    this.npcs.update(dt);
    const fauna = this.animals.update(dt, this.Q.fauna);
    this.skyLife.update(dt);
    this.particles.update(this.env, cam, this.Q);
    this.fx.update(dt);
    this.plots.update(dt, this.player.pos, m === 'play' || m === 'first');
    this.lightPool.update(dt, cam, this.env.night, this.time);
    this.emberT -= dt;
    if (this.emberT < 0) { this.emberT = 0.3; for (const f of this.fires) if (f.distanceToSquared(cam) < 1600) this.fx.emit(f, { count: 1, color: '#ff9a3c', up: 1.4, spread: 0.25, life: 1.4 }); }
    if (this.hud.phase === 'game') {
      this.discT -= dt;
      if (this.discT < 0) { this.discT = 0.5; this.checkDiscoveries(); }
      this.eventT -= dt;
      if (this.eventT < 0) { this.eventT = 25 + Math.random() * 20; this.ambientEvent(); }
    }
    this.audioT -= dt;
    if (this.audioT < 0) {
      this.audioT = 0.5;
      const p = this.player.pos;
      let wd = 1e9;
      for (const w of this.waterfallPos) wd = Math.min(wd, w.distanceTo(p));
      for (let i = 0; i < RIVER_S.length; i += 6) wd = Math.min(wd, Math.hypot(RIVER_S[i][0] - p.x, RIVER_S[i][1] - p.z) + 15);
      this.audioCtx = { wind: this.env.p.wind, rain: this.env.p.rain, night: this.env.night, day: this.env.day, waterDist: wd, crystalDist: Math.hypot(p.x - GROTTO.x, p.z - GROTTO.z), forest: forestMask(p.x, p.z), altitude: Math.min(1, Math.max(0, p.y / 60)) };
    }
    if (this.audioCtx) this.audio.update(dt, this.audioCtx);
    this.renderer.render(this.scene, this.camera);
    this.frames++;
    this.statT += dt;
    if (this.statT > 0.5) {
      this.fps = Math.round(this.frames / this.statT); this.frames = 0; this.statT = 0;
      const info = this.renderer.info.render, p = this.player.pos;
      this.stats = { fps: this.fps, tris: info.triangles, calls: info.calls, npcs: this.npcs.activeCount(), fauna, x: p.x.toFixed(1), y: p.y.toFixed(1), z: p.z.toFixed(1) };
    }
    this.hudT -= dt;
    if (this.hudT < 0) {
      this.hudT = 0.15;
      const it = (m === 'play' || m === 'first') && !this.dialogueNpc ? this.interact.current : null;
      this.emit({ clock: this.env.clock(), stage: stageOf(this.env.hour), weather: WEATHERS[this.env.weather].label, weatherKey: this.env.weather, fps: this.fps, prompt: it ? { verb: it.verb, label: it.label } : null, stats: this.stats, hour: this.env.hour });
    }
  };

  dispose() {
    this.disposed = true;
    cancelAnimationFrame(this.raf);
    this.input?.dispose();
    if (this.onResize) window.removeEventListener('resize', this.onResize);
    if (this.renderer) { this.renderer.dispose(); this.renderer.domElement.remove(); }
    this.audio?.ctx?.close();
  }
}