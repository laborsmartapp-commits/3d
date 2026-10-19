import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { Colliders } from '../systems/Colliders';
import { Input } from '../systems/Input';
import { CameraRig } from '../systems/CameraRig';
import { Player } from '../actors/Player';
import { FX } from '../fx/Particles';
import { makeMaterials } from './materials';
import { Batch } from './geo';
import { DISTRICTS } from './districts';
import { SceneManager } from '../studio/SceneManager';
import { DiagManager } from '../diag/DiagManager';
import { stepPlayer } from '../core/step';
import { convergenceStage } from '../stages/adapters';
import { StageProfile } from '../diag/StageProfile';

const PIXEL = { low: 0.8, medium: 1, high: 1.5 };

function rng(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }

function skyDome() {
  const c = document.createElement('canvas'); c.width = 4; c.height = 256; const g = c.getContext('2d');
  const r = g.createLinearGradient(0, 0, 0, 256); r.addColorStop(0, '#3f7cc4'); r.addColorStop(0.45, '#8ec0ea'); r.addColorStop(0.55, '#d9ebf7'); r.addColorStop(1, '#e8eef2');
  g.fillStyle = r; g.fillRect(0, 0, 4, 256);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return new THREE.Mesh(new THREE.SphereGeometry(1500, 32, 16), new THREE.MeshBasicMaterial({ map: t, side: THREE.BackSide, fog: false, depthWrite: false }));
}

// Street-level visit to The Convergence, running on the Realm's player, input, camera and collision systems.
export class ConvergenceEngine {
  constructor(container, onState, district = DISTRICTS.boulevard) {
    this.container = container; this.onState = onState; this.D = district;
    this.hud = { phase: 'loading', progress: 0, step: 'Preparing', mode: 'play' };
    this.mode = 'play'; this.time = 0; this.qName = 'high'; this.fps = 60; this.frames = 0; this.statT = 0;
    this.prof = new StageProfile();
  }

  setMode() {} // single play mode; first-person toggle stays on V
  applyQuality(name) {
    if (!PIXEL[name]) return;
    this.qName = name; this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, this.isTouch ? 1 : PIXEL[name]));
    this.emit({ quality: name });
  }

  emit(p) { this.prof.emits++; Object.assign(this.hud, p); if (!this.disposed) this.onState({ ...this.hud }); }
  // Location label follows the character's actual position (emits only when the zone changes), not a frame count.
  syncZone() { const p = this.player.pos, z = this.D.zoneAt(p.x, p.z, p.y); if (z !== this.hud.zone) this.emit({ zone: z }); }
  notify(text) { this.emit({ notice: { id: Math.random(), text } }); }
  groundAt(x, z, y) { return this.D.groundAt(x, z, y); }
  onFootstep(pos) { this.fx.emit(pos, { count: 2, color: '#b8ab94', up: 0.4, spread: 0.2, life: 0.5 }); }

  async init() {
    const P = this.prof;
    const step = async (progress, s) => { this.emit({ progress, step: s }); await P.wait(`loading screen paint: ${s}`, new Promise((r) => setTimeout(r, 30)), 'idle'); return this.disposed; };
    this.isTouch = window.matchMedia('(pointer: coarse)').matches;
    if (await step(20, this.D.steps[0])) return;
    let t = P.now();
    const r = (this.renderer = new THREE.WebGLRenderer({ antialias: !this.isTouch, powerPreference: 'high-performance' }));
    r.setPixelRatio(Math.min(window.devicePixelRatio, this.isTouch ? 1 : 1.5));
    r.setSize(this.container.clientWidth, this.container.clientHeight);
    r.shadowMap.enabled = true; r.shadowMap.type = THREE.PCFSoftShadowMap;
    r.toneMapping = THREE.ACESFilmicToneMapping; r.outputColorSpace = THREE.SRGBColorSpace;
    r.domElement.style.touchAction = 'none'; r.domElement.style.display = 'block';
    this.container.appendChild(r.domElement);
    P.add('renderer + WebGL context', t);
    const scene = (this.scene = new THREE.Scene());
    scene.fog = new THREE.Fog(...this.D.fog);
    scene.environment = P.sync('environment map (PMREM bake)', () => new THREE.PMREMGenerator(r).fromScene(new RoomEnvironment(), 0.04).texture, 'shaders');
    scene.environmentIntensity = 0.45;
    this.sky = skyDome(); scene.add(this.sky);
    this.sunDir = new THREE.Vector3(60, 95, 35);
    this.camera = new THREE.PerspectiveCamera(60, this.container.clientWidth / this.container.clientHeight, 0.1, 3000);
    const hemi = new THREE.HemisphereLight('#dbeafe', '#8a7a60', 1);
    const sun = new THREE.DirectionalLight('#fff1dc', 2.6);
    sun.castShadow = true; sun.shadow.mapSize.set(this.isTouch ? 1024 : 2048, this.isTouch ? 1024 : 2048);
    Object.assign(sun.shadow.camera, { left: -55, right: 55, top: 55, bottom: -55, near: 1, far: 300 });
    sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.03;
    scene.add(hemi, sun, sun.target);
    this.sun = sun; this.lights = { hemi, sun }; this.water = this.D.water;
    this.colliders = new Colliders(); this.occluders = [];
    this.mats = makeMaterials(); this.batch = new Batch();
    if (await step(50, this.D.steps[1])) return;
    this.tick = P.sync(`build world (${this.D.id || 'district'})`, () => this.D.build(this, rng(7)));
    if (await step(80, this.D.steps[2])) return;
    P.sync('merge static geometry (batch)', () => this.batch.build(scene));
    t = P.now();
    this.fx = new FX(scene);
    const sp = this.D.spawn;
    this.player = new Player(this);
    this.player.respawn(sp);
    this.input = new Input(r.domElement);
    this.rig = new CameraRig(this);
    this.rig.yaw = sp.yaw + Math.PI; this.rig.pitch = 0.22; this.rig.dist = 6;
    this.rig.target.set(sp.x, this.player.pos.y + 1.55, sp.z);
    this.onResize = () => { const w = this.container.clientWidth, h = this.container.clientHeight; r.setSize(w, h); this.camera.aspect = w / h; this.camera.updateProjectionMatrix(); };
    window.addEventListener('resize', this.onResize);
    this.stage = (this.D.stage || convergenceStage)(this);
    this.studio = new SceneManager(this);
    this.diag = new DiagManager(this);
    this.clock = new THREE.Clock();
    P.add('player, camera, studio, diagnostics', t);
    // Same programs the first frame would build, compiled here so the cost is measured on its own.
    P.sync('compile shaders (scene materials)', () => r.compile(scene, this.camera), 'shaders');
    P.ready();
    this.emit({ progress: 100, phase: 'game', isTouch: this.isTouch, zone: this.D.zoneAt(sp.x, sp.z) });
    this.frame();
  }

  toggleView() {
    this.mode = this.mode === 'first' ? 'play' : 'first';
    this.rig.pitch = this.mode === 'first' ? 0 : 0.22;
    if (this.mode === 'play') this.rig.yaw = this.player.yaw + Math.PI;
    this.emit({ mode: this.mode });
  }

  frame = () => {
    if (this.disposed) return;
    this.raf = requestAnimationFrame(this.frame);
    if (this.diag.skipFrame()) return;
    const f0 = performance.now();
    const delta = this.clock.getDelta(), raw = Math.min(delta, 1), dt = Math.min(raw, 0.05);
    this.time += dt;
    const inp = this.diag.input(this.input.consume());
    if (inp.pressed?.has('KeyV')) this.toggleView();
    const first = this.mode === 'first';
    const ctl = this.realm?.control(dt, raw, inp); // stages with a set editor may take over movement/camera
    const steps = this.studio.freeze || ctl?.move ? 0 : stepPlayer(this, raw, inp, first, false);
    if (this.diag.enabled) this.diag.frame(delta, raw, steps);
    this.studio.update(dt);
    if (ctl?.cam) { /* realm drove the camera */ } else if (first) this.rig.first(dt, inp, this.player); else this.rig.third(dt, inp, this.player);
    const p = this.player.pos;
    this.sun.position.copy(p).add(this.sunDir); this.sun.target.position.copy(p);
    this.fx.update(dt);
    this.tick(this.time, p.x, p.z);
    this.syncZone();
    const f1 = performance.now();
    this.studio.render();
    if (!this.prof.count) this.prof.add('first frame render (texture uploads, shadow programs)', f1, 'render');
    this.prof.frame(f0, f1, performance.now());
    this.frames++; this.statT += delta; // real elapsed time, so the FPS readout isn't capped by the step clamp
    if (this.statT > 0.5) { this.fps = Math.round(this.frames / this.statT); this.frames = 0; this.statT = 0; }
  };

  dispose() {
    this.disposed = true;
    cancelAnimationFrame(this.raf);
    this.studio?.dir?.audio.stop(); this.studio?.previewJob?.au?.stop();
    this.input?.dispose();
    if (this.onResize) window.removeEventListener('resize', this.onResize);
    if (this.renderer) { this.renderer.dispose(); this.renderer.forceContextLoss(); this.renderer.domElement.remove(); }
  }
}