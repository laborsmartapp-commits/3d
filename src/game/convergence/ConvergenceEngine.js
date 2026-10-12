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
  }

  setMode() {} // single play mode; first-person toggle stays on V
  applyQuality(name) {
    if (!PIXEL[name]) return;
    this.qName = name; this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, this.isTouch ? 1 : PIXEL[name]));
    this.emit({ quality: name });
  }

  emit(p) { Object.assign(this.hud, p); if (!this.disposed) this.onState({ ...this.hud }); }
  notify(text) { this.emit({ notice: { id: Math.random(), text } }); }
  groundAt(x, z) { return this.D.groundAt(x, z); }
  get waterLevel() { return -Infinity; } // street districts have no swimmable water
  onFootstep(pos) { this.fx.emit(pos, { count: 2, color: '#b8ab94', up: 0.4, spread: 0.2, life: 0.5 }); }

  async init() {
    const step = async (progress, s) => { this.emit({ progress, step: s }); await new Promise((r) => setTimeout(r, 30)); return this.disposed; };
    this.isTouch = window.matchMedia('(pointer: coarse)').matches;
    if (await step(20, this.D.steps[0])) return;
    const r = (this.renderer = new THREE.WebGLRenderer({ antialias: !this.isTouch, powerPreference: 'high-performance' }));
    r.setPixelRatio(Math.min(window.devicePixelRatio, this.isTouch ? 1 : 1.5));
    r.setSize(this.container.clientWidth, this.container.clientHeight);
    r.shadowMap.enabled = true; r.shadowMap.type = THREE.PCFSoftShadowMap;
    r.toneMapping = THREE.ACESFilmicToneMapping; r.outputColorSpace = THREE.SRGBColorSpace;
    r.domElement.style.touchAction = 'none'; r.domElement.style.display = 'block';
    this.container.appendChild(r.domElement);
    const scene = (this.scene = new THREE.Scene());
    scene.fog = new THREE.Fog(...this.D.fog);
    scene.environment = new THREE.PMREMGenerator(r).fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environmentIntensity = 0.45;
    scene.add(skyDome());
    this.camera = new THREE.PerspectiveCamera(60, this.container.clientWidth / this.container.clientHeight, 0.1, 3000);
    const hemi = new THREE.HemisphereLight('#dbeafe', '#8a7a60', 1);
    const sun = new THREE.DirectionalLight('#fff1dc', 2.6);
    sun.castShadow = true; sun.shadow.mapSize.set(this.isTouch ? 1024 : 2048, this.isTouch ? 1024 : 2048);
    Object.assign(sun.shadow.camera, { left: -55, right: 55, top: 55, bottom: -55, near: 1, far: 300 });
    sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.03;
    scene.add(hemi, sun, sun.target);
    this.sun = sun; this.lights = { hemi, sun };
    this.colliders = new Colliders(); this.occluders = [];
    this.mats = makeMaterials(); this.batch = new Batch();
    if (await step(50, this.D.steps[1])) return;
    this.tick = this.D.build(this, rng(7));
    if (await step(80, this.D.steps[2])) return;
    this.batch.build(scene);
    this.fx = new FX(scene);
    const sp = this.D.spawn;
    this.player = new Player(this);
    this.player.respawn(sp);
    if (this.D.stage === 'star-square') this.player.hidden = true; // empty stage: the director casts every actor
    this.input = new Input(r.domElement);
    this.rig = new CameraRig(this);
    this.rig.yaw = sp.yaw + Math.PI; this.rig.pitch = 0.22; this.rig.dist = 6;
    this.rig.target.set(sp.x, this.player.pos.y + 1.55, sp.z);
    this.onResize = () => { const w = this.container.clientWidth, h = this.container.clientHeight; r.setSize(w, h); this.camera.aspect = w / h; this.camera.updateProjectionMatrix(); };
    window.addEventListener('resize', this.onResize);
    this.stage = convergenceStage(this);
    this.studio = new SceneManager(this);
    this.diag = new DiagManager(this);
    this.clock = new THREE.Clock();
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
    const delta = this.clock.getDelta(), raw = Math.min(delta, 1), dt = Math.min(raw, 0.05);
    this.time += dt;
    const inp = this.diag.input(this.input.consume());
    if (inp.pressed?.has('KeyV')) this.toggleView();
    const first = this.mode === 'first';
    const steps = this.studio.freeze ? 0 : stepPlayer(this, raw, inp, first, false);
    if (this.diag.enabled) this.diag.frame(delta, raw, steps);
    this.studio.update(dt);
    if (first) this.rig.first(dt, inp, this.player); else this.rig.third(dt, inp, this.player);
    const p = this.player.pos;
    this.sun.position.set(p.x + 60, p.y + 95, p.z + 35); this.sun.target.position.copy(p);
    this.fx.update(dt);
    this.tick(this.time, p.x, p.z);
    if ((this.zoneTick = (this.zoneTick || 0) + 1) % 30 === 0) { const z = this.D.zoneAt(p.x, p.z); if (z !== this.hud.zone) this.emit({ zone: z }); }
    this.studio.render();
    this.frames++; this.statT += dt;
    if (this.statT > 0.5) { this.fps = Math.round(this.frames / this.statT); this.frames = 0; this.statT = 0; }
  };

  dispose() {
    this.disposed = true;
    cancelAnimationFrame(this.raf);
    this.input?.dispose();
    if (this.onResize) window.removeEventListener('resize', this.onResize);
    if (this.renderer) { this.renderer.dispose(); this.renderer.forceContextLoss(); this.renderer.domElement.remove(); }
  }
}