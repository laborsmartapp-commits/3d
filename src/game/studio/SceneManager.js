import { base44 } from '@/api/base44Client';
import { CameraManager } from './CameraManager';
import { PerformanceRecorder } from './PerformanceRecorder';
import { PerformancePlayback } from './PerformancePlayback';
import { defaultCloud } from './quality';
import { queueRender } from './RecordingJobManager';
import { worldSnapshot, ACTOR_ASSETS } from './versions';

const WORLD = 'celestia-grotto';
const LEVELS = ['low', 'medium', 'high'];
const Scenes = () => base44.entities.StudioScene, Takes = () => base44.entities.SceneTake;

// Orchestrates scenes, cameras, capture, playback and render queuing inside the live Realm engine.
export class SceneManager {
  constructor(e) {
    this.e = e;
    e.camera.layers.enable(1); // editor camera sees gizmos; production cameras don't
    this.cams = new CameraManager(e); this.rec = new PerformanceRecorder(e); this.play = new PerformancePlayback(e);
    this.active = false; this.scene = null; this.viewThrough = false; this.preview = true;
    this.cloud = defaultCloud(); this.localQuality = localStorage.getItem('studio.localQuality') || 'auto';
    this.status = 'idle'; this.take = null; this.recCamId = null; this.emitT = 0; this.autoT = 0; this.saveT = 0; this.libVersion = 0; this.error = '';
  }

  get freeze() { return this.status === 'playing'; }
  get busy() { return this.status !== 'idle'; }

  open(on) { this.active = on; this.emit(); }

  // ---- scenes
  listScenes() { return Scenes().filter({ world: WORLD }, { sort: '-updated_date', limit: 50 }).then((p) => p.items); }
  async newScene(name) {
    const isl = this.e.island;
    const s = await Scenes().create({ name: name || 'Untitled Scene', world: WORLD, location: isl?.name || 'Celestia Grotto', island_id: isl?.id, cameras: [], cloud_settings: this.cloud, local_quality: this.localQuality, take_count: 0 });
    this.openScene(s);
    this.cams.add(); this.dirty();
  }
  openScene(s) {
    this.scene = s; this.cloud = { ...defaultCloud(), ...s.cloud_settings };
    this.cams.load(s.cameras); if (s.selected_camera_id && this.cams.get(s.selected_camera_id)) this.cams.selId = s.selected_camera_id;
    this.emit();
  }
  renameScene(name) { this.scene.name = name; this.dirty(); }
  dirty() { this.saveT = 1; this.emit(); }
  async saveScene() {
    if (!this.scene) return;
    this.saveT = 0;
    const patch = { name: this.scene.name, cameras: this.cams.list.map((c) => ({ ...c })), selected_camera_id: this.cams.selId, cloud_settings: this.cloud, local_quality: this.localQuality };
    Object.assign(this.scene, patch);
    await Scenes().update(this.scene.id, patch);
  }

  // ---- cameras
  addCamera() { this.cams.add(); this.dirty(); }
  selectCamera(id) { this.cams.selId = id; this.dirty(); }
  editCamera(id, fn) {
    const c = this.cams.get(id); if (!c || (this.busy && id === this.recCamId)) return;
    const wasFollow = c.mode === 'follow';
    fn(c, this.cams);
    if (c.mode === 'follow' && !wasFollow) this.cams.lockFollow(c);
    this.dirty();
  }
  deleteCamera(id) { if (id === this.recCamId) return; this.cams.remove(id); this.dirty(); }

  // ---- quality
  setLocalQuality(q) { this.localQuality = q; localStorage.setItem('studio.localQuality', q); if (q !== 'auto') this.e.applyQuality(q); this.dirty(); }
  setCloud(patch) { this.cloud = { ...this.cloud, ...patch }; this.dirty(); }
  autoQuality(dt) {
    if (this.localQuality !== 'auto' || (this.autoT -= dt) > 0) return;
    this.autoT = 3;
    const i = LEVELS.indexOf(this.e.qName), fps = this.e.fps;
    if (fps < 32 && i > 0) this.e.applyQuality(LEVELS[i - 1]);
    else if (fps > 57 && i >= 0 && i < 2) this.e.applyQuality(LEVELS[i + 1]);
  }

  envState() { const v = this.e.env; return { h: +v.hour.toFixed(3), w: v.weather }; }

  // ---- recording
  async record() {
    const c = this.cams.selected;
    if (!this.scene || !c || this.busy) return;
    this.error = ''; this.recCamId = c.id; this.status = 'capturing';
    this.rec.start(); // clock starts now; chunks upload once the take id exists
    const world = worldSnapshot(this.e);
    this.emit();
    await this.saveScene();
    const n = (this.scene.take_count || 0) + 1;
    this.scene.take_count = n;
    Scenes().update(this.scene.id, { take_count: n });
    const v = this.e.env;
    this.take = await Takes().create({
      scene_id: this.scene.id, scene_name: this.scene.name, take_number: n, name: `Take ${String(n).padStart(2, '0')} — ${c.mode === 'follow' ? 'Follow Camera' : 'Stationary Camera'}`,
      world: WORLD, location: this.scene.location, island_id: this.scene.island_id, camera_id: c.id, camera_name: c.name, camera_mode: c.mode, camera_snapshot: { ...c, follow: { ...c.follow } },
      env_start: { hour: v.hour, weather: v.weather, timeScale: v.timeScale, rate: v.rate }, actors: ['krush'], status: 'capturing', render_settings: this.cloud, local_quality: this.e.qName,
      world_snapshot: world, actor_assets: { krush: ACTOR_ASSETS.krush },
    });
    this.rec.takeId = this.take.id;
  }

  async stop() {
    if (this.status !== 'capturing') return;
    this.rec.finish(this.cams.pose(this.recCamId), this.envState());
    this.status = 'uploading'; this.emit();
    const thumb = this.grabThumb();
    while (!this.take) await new Promise((r) => setTimeout(r, 100));
    const res = await this.rec.stop();
    const patch = { ...res, status: 'captured' };
    const blob = await thumb;
    if (blob) patch.thumb_uri = (await base44.integrations.Core.UploadPrivateFile({ file: new File([blob], 'thumb.jpg', { type: 'image/jpeg' }) })).file_uri;
    this.take = await Takes().update(this.take.id, patch);
    this.status = 'review'; this.emit();
  }

  async saveTake() {
    if (this.status !== 'review') return;
    await queueRender(this.take, this.cloud);
    this.endTake();
  }
  async discardTake() {
    if (this.status !== 'review') return;
    await base44.entities.PerformanceChunk.deleteMany({ take_id: this.take.id });
    await Takes().delete(this.take.id);
    this.endTake();
  }
  endTake() { this.take = null; this.recCamId = null; this.status = 'idle'; this.libVersion++; this.emit(); }

  // ---- playback
  async playTake(take) {
    if (this.busy) return;
    this.status = 'loading'; this.emit();
    const n = await this.play.load(take);
    if (!n) { this.status = 'idle'; this.error = 'This take has no recorded performance.'; this.emit(); return; }
    const p = this.e.player;
    this.saved = { x: p.pos.x, y: p.pos.y, z: p.pos.z, yaw: p.yaw, view: this.viewThrough, hour: this.e.env.hour, weather: this.e.env.weather };
    this.play.begin();
    this.playing = take; this.viewThrough = true; this.status = 'playing'; this.emit();
  }
  stopPlayback() {
    const s = this.saved, p = this.e.player;
    p.pos.set(s.x, s.y, s.z); p.yaw = s.yaw; p.vel.set(0, 0, 0);
    this.e.env.hour = s.hour; this.e.env.setWeather(s.weather);
    this.viewThrough = s.view; this.playing = null; this.status = 'idle'; this.emit();
  }

  // ---- frame
  update(dt) {
    this.autoQuality(dt);
    this.cams.helpers = this.active && this.status !== 'playing';
    if (this.status === 'playing') { if (!this.play.step(dt)) this.stopPlayback(); }
    else this.cams.update(dt, this.recCamId);
    if (this.status === 'capturing') this.rec.sample(this.cams.pose(this.recCamId), this.envState());
    if (this.saveT > 0 && (this.saveT -= dt) <= 0) this.saveScene();
    if ((this.emitT -= dt) < 0 && (this.active || this.busy)) { this.emitT = 0.2; this.emit(); }
  }

  outputCam() { return this.status === 'playing' ? this.play.cam : this.cams.cam(this.recCamId || this.cams.selId); }

  render() {
    const e = this.e, r = e.renderer, cam = this.outputCam();
    const show = (this.active || this.busy) && cam;
    if (!show || !this.viewThrough) r.render(e.scene, e.camera);
    if (!show || (!this.viewThrough && !this.preview && !this.thumbReq)) return;
    const W = e.container.clientWidth, H = e.container.clientHeight;
    let box;
    if (this.viewThrough) { const vw = Math.min(W, (H * 16) / 9), vh = (vw * 9) / 16; box = [(W - vw) / 2, (H - vh) / 2, vw, vh]; }
    else box = [16, 96, 320, 180];
    r.setScissorTest(true);
    if (this.viewThrough) { r.setViewport(0, 0, W, H); r.setScissor(0, 0, W, H); r.setClearColor(0x000000, 1); r.clear(); }
    r.setViewport(...box); r.setScissor(...box);
    r.render(e.scene, cam);
    if (this.thumbReq) { this.thumbReq(box); this.thumbReq = null; }
    r.setScissorTest(false); r.setViewport(0, 0, W, H);
  }

  // Grab the production camera frame (UI-free) right after it's drawn, as a library thumbnail.
  grabThumb() {
    return new Promise((resolve) => {
      this.thumbReq = ([x, y, w, h]) => {
        const pr = this.e.renderer.getPixelRatio(), src = this.e.renderer.domElement, c = document.createElement('canvas');
        c.width = 320; c.height = 180;
        c.getContext('2d').drawImage(src, x * pr, src.height - (y + h) * pr, w * pr, h * pr, 0, 0, 320, 180);
        c.toBlob(resolve, 'image/jpeg', 0.8);
      };
    });
  }

  emit() {
    const sel = this.cams.selected;
    this.e.emit({
      studio: {
        active: this.active, status: this.status, error: this.error, viewThrough: this.viewThrough, preview: this.preview,
        scene: this.scene ? { id: this.scene.id, name: this.scene.name, location: this.scene.location } : null,
        cameras: this.cams.list.map((c) => ({ ...c, follow: { ...c.follow } })), selId: sel?.id || null, recCamId: this.recCamId,
        recT: this.rec.active ? this.rec.t : this.take?.duration || 0, playT: this.play.t || 0, playDur: this.play.duration || 0, playing: this.playing?.name,
        take: this.take ? { id: this.take.id, name: this.take.name } : null, cloud: this.cloud, localQuality: this.localQuality, liveQuality: this.e.qName, libVersion: this.libVersion,
      },
    });
  }
}