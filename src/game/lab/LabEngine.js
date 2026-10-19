import * as THREE from 'three';
import { Player } from '../actors/Player';
import { SceneManager } from '../studio/SceneManager';

const env = { get: () => ({}), start: () => ({}), save: () => ({}), apply() {} };

// Minimal stage for testing the real Scene Manager, Director timeline and studio UI without a heavy world:
// flat ground, two lights, real Player actors. Frames run on rAF; tests can also call step(dt) directly.
export class LabEngine {
  constructor(container, onState) {
    this.container = container; this.onState = onState; this.state = {};
    this.mode = 'play'; this.qName = 'medium'; this.fps = 60; this.water = -999; this.D = { showPlayer: false };
    this.colliders = { resolve() {} };
    this.input = { move: { x: 0, y: 0 }, jump: false, sprint: false, walk: false };
    this.stage = { id: 'timeline-lab', name: 'Timeline Lab', version: 'lab-1', location: () => 'Timeline Lab', env, snapshot: () => ({ stage: 'timeline-lab' }), actors: [] };
    const W = container.clientWidth, H = container.clientHeight;
    this.renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5)); this.renderer.setSize(W, H);
    container.appendChild(this.renderer.domElement);
    this.scene = new THREE.Scene(); this.scene.background = new THREE.Color('#0b1020');
    this.camera = new THREE.PerspectiveCamera(50, W / H, 0.1, 500); this.camera.position.set(1, 4.5, 10); this.camera.lookAt(1, 1, 0);
    this.scene.add(new THREE.HemisphereLight('#a5b4fc', '#1e1b4b', 1.4));
    const sun = new THREE.DirectionalLight('#fde68a', 1.6); sun.position.set(6, 10, 4); this.scene.add(sun);
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), new THREE.MeshStandardMaterial({ color: '#14213d', roughness: 1 }));
    ground.rotation.x = -Math.PI / 2; this.scene.add(ground, new THREE.GridHelper(40, 40, '#05cc8d', '#24345c'));
    this.player = new Player(this, undefined, { x: 0, z: 0, yaw: 0 });
    this.studio = new SceneManager(this); this.studio.open(true);
    this.last = performance.now();
    const loop = () => { this.raf = requestAnimationFrame(loop); const t = performance.now(); this.step(Math.min(0.1, (t - this.last) / 1000)); this.last = t; };
    loop();
    this.onResize = () => { const w = container.clientWidth, h = container.clientHeight; this.renderer.setSize(w, h); this.camera.aspect = w / h; this.camera.updateProjectionMatrix(); };
    window.addEventListener('resize', this.onResize);
  }

  groundAt() { return 0; }
  onFootstep() {}
  applyQuality(q) { this.qName = q; }
  notify(text) { this.emit({ notice: { id: Math.random(), text } }); }
  emit(p) { this.state = { ...this.state, ...p }; this.onState(this.state); }

  step(dt) {
    if (!this.studio.freeze) this.player.update(dt, this.input, 0, false, false);
    this.studio.update(dt);
    this.studio.render();
  }

  dispose() {
    cancelAnimationFrame(this.raf); window.removeEventListener('resize', this.onResize);
    this.studio.dir.audio.stop(); this.renderer.dispose(); this.renderer.domElement.remove();
  }
}