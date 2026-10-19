import { base44 } from '@/api/base44Client';
import { CameraManager } from './CameraManager';
import { PerformanceRecorder } from './PerformanceRecorder';
import { PerformancePlayback } from './PerformancePlayback';
import { defaultCloud } from './quality';
import { queueRender } from './RecordingJobManager';
import { ACTOR_ASSETS } from './versions';
import { PreviewEncoder, previewFormat, FPS } from './PreviewEncoder';
import { AudioEngine } from './AudioEngine';
import { takeStage } from '../stages/registry';
import { DirectorManager } from './DirectorManager';
import { CHARACTERS } from './characters';
import { finalizeTake } from './finalizeTake';

const LEVELS = ['low', 'medium', 'high'];
const Scenes = () => base44.entities.StudioScene, Takes = () => base44.entities.SceneTake;

// Orchestrates scenes, cameras, capture, playback and render queuing inside the live Realm engine.
export class SceneManager {
  constructor(e) {
    this.e = e; this.stage = e.stage;
    e.camera.layers.enable(1); // editor camera sees gizmos; production cameras don't
    this.cams = new CameraManager(e); this.rec = new PerformanceRecorder(e); this.play = new PerformancePlayback(e); this.dir = new DirectorManager(this);
    this.active = false; this.scene = null; this.viewThrough = false; this.preview = true;
    this.cloud = defaultCloud(); this.localQuality = localStorage.getItem('studio.localQuality') || 'auto';
    if (this.localQuality !== 'auto') e.applyQuality(this.localQuality); // keep the chosen preview quality after a refresh
    this.status = 'idle'; this.take = null; this.recCamId = null; this.emitT = 0; this.autoT = 0; this.saveT = 0; this.libVersion = 0; this.error = '';
  }

  get freeze() { return this.status === 'playing' || this.status === 'directing'; }
  get busy() { return this.status !== 'idle'; }

  open(on) { this.active = on; this.emit(); }

  // ---- scenes
  listScenes() { return Scenes().filter({ world: this.stage.id }, { sort: '-updated_date', limit: 50 }).then((p) => p.items); }
  async newScene(name) {
    const s = await Scenes().create({ name: name || 'Untitled Scene', world: this.stage.id, location: this.stage.location(), island_id: this.e.island?.id, cameras: [], cloud_settings: this.cloud, local_quality: this.localQuality, take_count: 0 });
    this.openScene(s);
    this.cams.add(); this.dirty();
  }
  openScene(s) {
    this.scene = s; this.cloud = { ...defaultCloud(), ...s.cloud_settings };
    this.dir.load(s.timeline);
    this.cams.load(s.cameras); if (s.selected_camera_id && this.cams.get(s.selected_camera_id)) this.cams.selId = s.selected_camera_id;
    // A scene brings back its own shooting environment (stored apart from the stage geometry).
    const w = this.e.weather;
    if (w) { w.setLock(false); if (s.weather) w.load(s.weather, true); w.setLock(s.weather_locked); }
    this.emit();
  }
  renameScene(name) { this.scene.name = name; this.dirty(); }
  dirty() { this.saveT = 1; this.emit(); }
  async saveScene() {
    if (!this.scene) return;
    this.saveT = 0; this.saving = true; this.emit();
    const patch = { name: this.scene.name, cameras: this.cams.list.map((c) => ({ ...c })), selected_camera_id: this.cams.selId, timeline: JSON.parse(JSON.stringify(this.dir.tl)), cloud_settings: this.cloud, local_quality: this.localQuality };
    // While a take replays its own recorded weather, the scene keeps the editor's weather from before playback.
    if (this.e.weather) Object.assign(patch, { weather: this.playing && this.saved?.env?.conditions ? this.saved.env : this.e.weather.save(), weather_locked: this.e.weather.locked });
    Object.assign(this.scene, patch);
    try { await Scenes().update(this.scene.id, patch); this.saveError = ''; }
    catch (err) { this.saveError = err.message; this.saveT = 5; }
    this.saving = false; this.emit();
  }
  get saveState() { return this.saving ? 'saving' : this.saveError ? 'error' : this.saveT > 0 ? 'unsaved' : 'saved'; }

  // Bakes the whole multi-actor timeline into one new, immutable take version.
  async finalizeTake() {
    if (!this.scene || this.busy) return;
    this.error = ''; this.status = 'finalizing'; this.emit();
    try { const t = await finalizeTake(this); this.notice = `Finalized “${t.name}”. Find it in Recorded Scenes.`; }
    catch (err) { this.error = `Finalize failed: ${err.message}`; }
    this.status = 'idle'; this.libVersion++; this.emit();
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
  setLocalQuality(q) { this.localQuality = q; localStorage.setItem('studio.localQuality', q); if (q !== 'auto') this.e.applyQuality(q); this.emit(); return this.saveScene(); }
  setCloud(patch) { this.cloud = { ...this.cloud, ...patch }; this.emit(); return this.saveScene(); }
  autoQuality(dt) {
    if (this.localQuality !== 'auto' || (this.autoT -= dt) > 0) return;
    this.autoT = 3;
    const i = LEVELS.indexOf(this.e.qName), fps = this.e.fps;
    if (fps < 32 && i > 0) this.e.applyQuality(LEVELS[i - 1]);
    else if (fps > 57 && i >= 0 && i < 2) this.e.applyQuality(LEVELS[i + 1]);
  }

  envState() { return this.stage.env.get(); }

  // ---- recording
  async record() {
    const c = this.cams.selected;
    if (!this.scene || !c || this.busy) return;
    this.error = ''; this.recCamId = c.id; this.status = 'capturing';
    const pass = this.pass; this.rec.actorId = pass?.actor || 'krush';
    this.rec.start(); // clock starts now; chunks upload once the take id exists
    const world = this.stage.snapshot();
    this.emit();
    await this.saveScene();
    const n = (this.scene.take_count || 0) + 1;
    this.scene.take_count = n;
    Scenes().update(this.scene.id, { take_count: n });
    const st = this.stage;
    this.take = await Takes().create({
      scene_id: this.scene.id, scene_name: this.scene.name, take_number: n, name: pass ? `Take ${String(n).padStart(2, '0')} — ${pass.name} pass @ ${pass.t0.toFixed(1)}s` : `Take ${String(n).padStart(2, '0')} — ${c.mode === 'follow' ? 'Follow Camera' : 'Stationary Camera'}`,
      world: st.id, stage_name: st.name, stage_version: st.version, location: this.scene.location, island_id: this.scene.island_id, camera_id: c.id, camera_name: c.name, camera_mode: c.mode, camera_snapshot: { ...c, follow: { ...c.follow } },
      env_start: st.env.start(), actors: pass ? [pass.actor] : st.actors, status: 'capturing', render_settings: this.cloud, local_quality: this.e.qName,
      world_snapshot: world, actor_assets: pass ? { [pass.actor]: { ...ACTOR_ASSETS.krush, avatar: `krush-studio/${this.e.player.charId}`, character: CHARACTERS[this.e.player.charId]?.name } } : { krush: ACTOR_ASSETS.krush },
    });
    this.rec.takeId = this.take.id;
  }

  async stop() {
    if (this.status !== 'capturing') return;
    this.rec.finish(this.cams.pose(this.recCamId), this.envState());
    this.status = 'uploading'; this.emit();
    const thumb = this.grabThumb();
    while (!this.take) await new Promise((r) => setTimeout(r, 100));
    this.final = { res: await this.rec.stop(), blob: await thumb };
    await this.finalize();
  }

  // Only marks the take saved once every chunk is on the server; otherwise it stays pending on this device.
  async finalize() {
    const left = this.rec.unsent.length;
    if (left) { this.status = 'pending'; this.error = `${left} chunk${left > 1 ? 's' : ''} not uploaded yet — kept on this device.`; this.emit(); return; }
    try {
      const { res, blob } = this.final, patch = { ...res, status: 'captured' };
      if (blob && !this.final.thumb) this.final.thumb = (await base44.integrations.Core.UploadPrivateFile({ file: new File([blob], 'thumb.jpg', { type: 'image/jpeg' }) })).file_uri;
      if (this.final.thumb) patch.thumb_uri = this.final.thumb;
      this.take = await Takes().update(this.take.id, patch);
      this.error = '';
      if (this.pass) { const pass = this.pass, take = this.take; this.endTake(); this.dir.addPass(take, pass, res.duration); return; }
      this.status = 'review';
    } catch { this.status = 'pending'; this.error = 'Could not finish saving the take — data is kept on this device.'; }
    this.emit();
  }
  async retryUpload() {
    if (this.status !== 'pending') return;
    this.status = 'uploading'; this.emit();
    await this.rec.retry();
    await this.finalize();
  }

  async saveTake() {
    if (this.status !== 'review') return;
    await queueRender(this.take, this.cloud);
    this.endTake();
  }
  async discardTake() {
    if (this.status !== 'review' && this.status !== 'pending') return;
    this.rec.unsent = [];
    await base44.entities.PerformanceChunk.deleteMany({ take_id: this.take.id });
    await Takes().delete(this.take.id);
    this.endTake();
  }
  endTake() { this.pass = null; this.take = null; this.recCamId = null; this.status = 'idle'; this.libVersion++; this.emit(); }

  // ---- playback
  async playTake(take, chunks) {
    if (this.busy) return;
    if (takeStage(take) !== this.stage.id) { this.error = `This take was recorded in ${take.stage_name || takeStage(take)}. Open that stage to play it.`; this.emit(); return; }
    this.status = 'loading'; this.emit();
    if (take.cast?.length) this.dir.actors.sync(take.cast); // finalized multi-actor take brings its own cast
    const n = await this.play.load(take, chunks);
    if (!n) { this.status = 'idle'; this.error = 'This take has no recorded performance.'; this.emit(); return; }
    const p = this.e.player;
    this.saved = { x: p.pos.x, y: p.pos.y, z: p.pos.z, yaw: p.yaw, view: this.viewThrough, env: this.stage.env.save() };
    const job = this.previewJob;
    job?.enc.start();
    if (job?.au) job.au.start(job.tl.clips, job.tl.master_gain ?? 1, 0, job.tl.tracks);
    this.play.begin();
    this.playing = take; this.viewThrough = true; this.status = 'playing'; this.emit();
  }
  stopPlayback(completed = false) {
    const s = this.saved, p = this.e.player;
    p.pos.set(s.x, s.y, s.z); p.yaw = s.yaw; p.vel.set(0, 0, 0);
    this.stage.env.apply(s.env);
    this.viewThrough = s.view; this.playing = null; this.status = 'idle';
    this.dir.actors.sync(this.dir.tl.actors); this.dir.drive(0);
    const job = this.previewJob; this.previewJob = null;
    job?.au?.stop();
    if (job) { this.status = 'saving'; this.finishPreview(job, completed); }
    this.emit();
  }

  // ---- browser preview video (separate from the cloud master; never labeled as one)
  async generatePreview(take, res = '720p') {
    if (this.busy) return;
    if (!previewFormat()) { this.error = 'This browser cannot encode video. Try a current Chrome, Edge or Safari.'; this.emit(); return; }
    this.error = '';
    // The take's frozen audio arrangement, mixed live through Web Audio and recorded with the frames.
    const tl = take.timeline || {}, hasAudio = (tl.clips || []).some((c) => c.kind === 'audio' && c.uri);
    let au = null;
    if (hasAudio) { au = new AudioEngine(); au.unlock(); await au.preload(tl.clips); au.tap = au.ctx.createMediaStreamDestination(); }
    this.previewJob = { take, tl, au, enc: new PreviewEncoder(res, au?.tap.stream) };
    await this.playTake(take);
    if (this.status !== 'playing') this.previewJob = null;
  }
  async finishPreview({ take, enc }, completed) {
    const blob = await enc.stop();
    try {
      if (!completed) throw new Error('cancelled before the end of the take');
      const { file_uri } = await base44.integrations.Core.UploadPrivateFile({ file: new File([blob], `preview.${enc.fmt.ext}`, { type: enc.fmt.type }) });
      await Takes().update(take.id, {
        preview_error: enc.audioWanted && !enc.fmt.audio ? 'This browser cannot record audio into video, so this preview is silent. Use Chrome or Edge for a preview with sound, or a cloud render once cloud audio is enabled.' : '',
        preview_status: 'ready', preview_uri: file_uri, preview_mime: enc.fmt.type, preview_ext: enc.fmt.ext, preview_width: enc.w, preview_height: enc.h, preview_fps: FPS, preview_size: blob.size,
        preview_info: { kind: 'browser-preview', encoder: `MediaRecorder ${enc.fmt.mime}`, resolution: enc.res, source_px: enc.src, audio: enc.fmt.audio ? 'timeline mix' : enc.audioWanted ? 'unsupported by this browser' : 'none', local_quality: this.e.qName, created_at: new Date().toISOString() },
      });
    } catch (err) {
      this.error = `Preview not saved: ${err.message}. The recorded performance is unaffected.`;
      if (completed) await Takes().update(take.id, { preview_status: 'failed', preview_error: err.message });
    }
    this.status = 'idle'; this.libVersion++; this.emit();
  }

  // ---- frame
  update(dt) {
    this.autoQuality(dt);
    this.cams.helpers = this.active && this.status !== 'playing';
    if (this.status === 'playing') { if (!this.play.step(dt)) this.stopPlayback(true); }
    else this.cams.update(dt, this.recCamId);
    this.dir.tick(dt);
    if (this.status === 'capturing') this.rec.sample(this.cams.pose(this.recCamId), this.envState());
    if (this.saveT > 0 && (this.saveT -= dt) <= 0) this.saveScene();
    if ((this.emitT -= dt) < 0 && (this.active || this.busy)) { this.emitT = this.status === 'idle' ? 0.2 : 0.08; this.emit(); }
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
    if (this.previewJob && this.status === 'playing') this.previewJob.enc.draw(r.domElement, box, r.getPixelRatio());
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
        stage: { id: this.stage.id, name: this.stage.name }, encoding: this.previewJob ? this.previewJob.enc.res : null,
        active: this.active, status: this.status, error: this.error, viewThrough: this.viewThrough, preview: this.preview,
        scene: this.scene ? { id: this.scene.id, name: this.scene.name, location: this.scene.location } : null,
        cameras: this.cams.list.map((c) => ({ ...c, follow: { ...c.follow } })), selId: sel?.id || null, recCamId: this.recCamId,
        recT: this.rec.active ? this.rec.t : this.take?.duration || 0, playT: this.play.t || 0, playDur: this.play.duration || 0, playing: this.playing?.name,
        take: this.take ? { id: this.take.id, name: this.take.name } : null, cloud: this.cloud, localQuality: this.localQuality, liveQuality: this.e.qName, libVersion: this.libVersion, director: this.dir.state_(), saveState: this.saveState, notice: this.notice || '',
      },
    });
  }
}