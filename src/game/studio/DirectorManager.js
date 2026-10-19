import { ActorManager } from './ActorManager';
import { PerformancePlayback } from './PerformancePlayback';
import { now } from './PerformanceRecorder';
import { CHARACTERS } from './characters';
import { AudioEngine, loadBuffer, peaksOf, AUDIO_DEFAULTS } from './AudioEngine';
import { newTimeline, coverAt, holdAt, clipEnd, uid, animLayers, overlaps, ANIM_DEFAULTS } from './Timeline';

const OVERLAP = { perf: 'the higher-priority (then newer) pass plays where they overlap', anim: 'they blend where they overlap', audio: 'they mix where they overlap' };

// Director Mode: one master clock driving every actor's tracks. While one armed actor is recorded live,
// every other actor replays its own clips at the same timeline time (synchronized multi-pass recording).
export class DirectorManager {
  constructor(sm) {
    this.sm = sm; this.e = sm.e; this.actors = new ActorManager(sm.e);
    this.tl = newTimeline(); this.t = 0; this.state = 'stopped'; this.pbs = new Map(); this.hist = []; this.fut = []; this.stopAt = null; this.audio = new AudioEngine(); this.drift = 0;
  }

  load(tl) {
    this.tl = tl?.actors ? JSON.parse(JSON.stringify(tl)) : newTimeline();
    // The default Krush walker is never a cast member: only actors the user picks.
    this.tl.actors = this.tl.actors.filter((a) => a.id !== 'krush');
    this.tl.clips = this.tl.clips.filter((c) => c.actor !== 'krush');
    this.actors.sync(this.tl.actors); this.hist = []; this.fut = []; this.t = 0;
    this.preload().then(() => this.drive(0));
  }

  // ---- editing (undoable)
  edit(fn) {
    if (this.state !== 'stopped' || this.sm.status === 'capturing') return;
    this.hist.push(JSON.stringify(this.tl)); if (this.hist.length > 60) this.hist.shift(); this.fut = [];
    fn(this.tl); this.after();
  }
  after() {
    const end = Math.max(0, ...this.tl.clips.map(clipEnd));
    if (end > this.tl.duration) this.tl.duration = Math.ceil(end);
    this.actors.sync(this.tl.actors); this.preload(); this.sm.dirty();
  }
  undo() { if (this.hist.length && this.state === 'stopped') { this.fut.push(JSON.stringify(this.tl)); this.tl = JSON.parse(this.hist.pop()); this.after(); this.redrive(); } }
  redo() { if (this.fut.length && this.state === 'stopped') { this.hist.push(JSON.stringify(this.tl)); this.tl = JSON.parse(this.fut.pop()); this.after(); this.redrive(); } }
  // Re-pose the scene at the playhead after the arrangement changed (no scene rebuild).
  redrive() { this.preload().then(() => { if (this.state === 'stopped' && this.sm.status !== 'capturing') { this.drive(0); this.sm.emit(); } }); }

  actor(id) { return this.tl.actors.find((a) => a.id === id); }
  addActor(char) {
    const c = CHARACTERS[char], n = this.tl.actors.filter((a) => a.char === char).length;
    const id = n ? uid(char) : char, p = this.e.player.pos;
    this.edit((tl) => tl.actors.push({ id, char, name: n ? `${c.name} ${n + 1}` : c.name, x: p.x + 2, z: p.z + 1, yaw: this.e.player.yaw, armed: false, locked: false, muted: false }));
  }
  addLibraryActor(asset) {
    const n = this.tl.actors.filter((a) => a.asset_id === asset.id).length, p = this.e.player.pos;
    this.edit((tl) => tl.actors.push({ id: uid('lib'), char: 'lib', asset_id: asset.id, asset_uri: asset.file_uri, name: n ? `${asset.name} ${n + 1}` : asset.name, x: p.x + 2, z: p.z + 1, yaw: this.e.player.yaw, armed: false, locked: false, muted: false }));
  }
  removeActor(id) { this.edit((tl) => { tl.actors = tl.actors.filter((a) => a.id !== id); tl.clips = tl.clips.filter((c) => c.actor !== id); }); }
  setActor(id, patch) { this.edit((tl) => { if (patch.armed) tl.actors.forEach((a) => { a.armed = false; }); Object.assign(tl.actors.find((a) => a.id === id), patch); }); }
  placeHere(id) { const p = this.e.actors[id]; if (p) this.setActor(id, { x: +p.pos.x.toFixed(3), z: +p.pos.z.toFixed(3), yaw: +p.yaw.toFixed(4) }); }
  control(id) { if (this.sm.status !== 'capturing') { this.actors.control(id); this.sm.emit(); } }

  // anim: built-in key, or a patch {anim, anim_uri, clip_name, label, len} for a library clip.
  addAnim(actor, anim, len = 4, at = this.t) { const start = +at.toFixed(2), a = typeof anim === 'string' ? { anim } : anim; this.edit((tl) => tl.clips.push({ ...ANIM_DEFAULTS, id: uid('anim'), kind: 'anim', actor, ...a, start, end: start + len })); }
  duplicateClip(id) { this.edit((tl) => { const c = tl.clips.find((x) => x.id === id), d = clipEnd(c) - c.start; tl.clips.push({ ...c, id: uid(c.kind), start: +(clipEnd(c)).toFixed(2), ...(c.kind !== 'perf' ? { end: +(clipEnd(c) + d).toFixed(2) } : {}) }); }); }
  setClip(id, patch) { this.edit((tl) => Object.assign(tl.clips.find((c) => c.id === id), patch)); }
  // Reposition a clip on its own track: duration, data and actor are untouched; overlaps are kept and reported.
  moveClip(id, start) {
    const c = this.tl.clips.find((x) => x.id === id);
    if (!c || this.actor(c.actor)?.locked || this.sm.status === 'capturing') return;
    start = Math.max(0, +start.toFixed(3)); if (Math.abs(start - c.start) < 1e-4) return;
    this.pause(); this.keepPlacements();
    const hit = overlaps(this.tl.clips, c, start);
    this.edit((tl) => { const x = tl.clips.find((k) => k.id === id); if (x.kind !== 'perf') x.end = +(start + x.end - x.start).toFixed(3); x.start = start; });
    const note = hit.length ? `Moved onto ${hit.map((x) => x.label || x.name || x.anim || 'a clip').join(', ')}: both kept, ${OVERLAP[c.kind]}. Undo to revert.` : '';
    if (note || this.sm.notice === this.moveNote) { this.sm.notice = note; this.moveNote = note; }
    this.redrive();
  }
  deleteClip(id) { this.edit((tl) => { tl.clips = tl.clips.filter((c) => c.id !== id); }); }
  // ---- audio: clips on the same master timeline (kind 'audio'); overlapping clips mix
  async addAudio(asset, track, at = this.t) {
    const buf = await loadBuffer(asset.file_uri), start = +at.toFixed(2);
    this.edit((tl) => tl.clips.push({ ...AUDIO_DEFAULTS, id: uid('aud'), kind: 'audio', track, actor: null, asset_id: asset.id, uri: asset.file_uri, label: asset.name, len: buf.duration, peaks: peaksOf(buf), start, end: +(start + buf.duration).toFixed(3) }));
  }
  splitClip(id, t = this.t) {
    this.edit((tl) => {
      const c = tl.clips.find((x) => x.id === id); if (!c || c.kind === 'perf' || t <= c.start + 0.05 || t >= c.end - 0.05) return;
      tl.clips.push({ ...c, id: uid(c.kind), start: +t.toFixed(3), in: (c.in || 0) + (t - c.start) * (c.speed || 1), fadeIn: 0 });
      c.end = +t.toFixed(3); c.fadeOut = 0;
    });
  }
  setTl(patch) { this.edit((tl) => Object.assign(tl, patch)); }
  // Snap a time to beat markers, the BPM grid and audio clip boundaries (within 0.15s), else to frames.
  snap(t, skip) {
    const tl = this.tl; if (!tl.snap) return t;
    const pts = [...(tl.markers || []), ...tl.clips.filter((c) => c.kind === 'audio' && c.id !== skip).flatMap((c) => [c.start, c.end])];
    if (tl.bpm > 0) { const b = 60 / tl.bpm, o = tl.beat_offset || 0; pts.push(o + Math.round((t - o) / b) * b); }
    const near = pts.reduce((a, p) => (Math.abs(p - t) < Math.abs(a - t) ? p : a), Infinity);
    return Math.abs(near - t) < 0.15 ? +near.toFixed(3) : Math.round(t * tl.fps) / tl.fps;
  }
  frame(t) { return Math.round(t * this.tl.fps) / this.tl.fps; }
  // Where a dragged time lands: the snap targets when snapping is on, otherwise the nearest frame.
  place(t, skip) { return this.tl.snap ? this.snap(t, skip) : this.frame(t); }
  setDuration(d) { this.edit((tl) => { tl.duration = Math.max(1, d); }); }

  // ---- evaluation
  async preload() {
    const ids = [...new Set(this.tl.clips.filter((c) => c.kind === 'perf').map((c) => c.take_id))].filter((id) => !this.pbs.has(id));
    await Promise.all(ids.map(async (id) => { const pb = new PerformancePlayback(this.e); await pb.load({ id }); this.pbs.set(id, pb); }));
  }

  apply(id, t, dt) {
    const p = this.e.actors[id]; if (!p) return;
    const clips = this.tl.clips, c = coverAt(clips, id, 'perf', t), ref = c ? { c, local: t - c.start + c.in } : holdAt(clips, id, t);
    const pb = ref && this.pbs.get(ref.c.take_id), k = pb?.samples.length ? pb.at(ref.local).actors[ref.c.key] : null;
    if (k) {
      p.pos.set(k.p[0], k.p[1], k.p[2]); p.yaw = k.y; p.vel.set(0, 0, 0);
      Object.assign(p.anim, c ? { mode: k.m, phase: k.ph, speed: k.sp, t: k.at } : { mode: 'idle', speed: 0, t });
    } else {
      // No movement track: the actor stays at its scene placement (so seek/rewind restores it).
      const a = this.actor(id);
      if (a && a.x != null) { p.pos.x = a.x; p.pos.z = a.z; if (a.y != null) p.pos.y = a.y; if (a.yaw != null) p.yaw = a.yaw; }
      p.vel.set(0, 0, 0); Object.assign(p.anim, { mode: 'idle', speed: 0, t });
    }
    // Body animation layers blend over the locomotion pose; they never move the root (movement track owns it).
    p.anim.layers = animLayers(clips, id, t);
    p.finish(dt, false);
  }
  // Actors without a movement track keep wherever they were walked to as their start placement.
  keepPlacements() {
    let moved = false;
    for (const a of this.tl.actors) {
      const p = this.e.actors[a.id];
      if (!p || this.tl.clips.some((c) => c.actor === a.id && c.kind === 'perf' && !c.muted)) continue;
      if (a.x != null && Math.hypot(p.pos.x - a.x, p.pos.z - a.z) < 0.01 && Math.abs(p.pos.y - (a.y ?? p.pos.y)) < 0.01 && Math.abs(p.yaw - (a.yaw ?? p.yaw)) < 0.001) continue;
      Object.assign(a, { x: +p.pos.x.toFixed(3), y: +p.pos.y.toFixed(3), z: +p.pos.z.toFixed(3), yaw: +p.yaw.toFixed(4) }); moved = true;
    }
    if (moved) this.sm.dirty();
  }
  drive(dt, except) { for (const a of this.tl.actors) if (a.id !== except && !a.muted) this.apply(a.id, this.t, dt); }

  // ---- transport
  async play() {
    if (this.sm.busy) return;
    this.keepPlacements();
    this.audio.unlock();
    await Promise.all([this.preload(), this.audio.preload(this.tl.clips)]);
    if (this.t >= this.tl.duration - 0.05) this.t = 0;
    this.t0 = this.t; this.w0 = now(); this.startAudio(); this.state = 'playing'; this.sm.status = 'directing'; this.sm.emit();
  }
  startAudio() { this.audio.start(this.tl.clips, this.tl.master_gain ?? 1, this.t, this.tl.tracks); }
  setTrack(track, patch) { this.edit((tl) => { tl.tracks = { ...(tl.tracks || {}), [track]: { ...(tl.tracks?.[track] || {}), ...patch } }; }); }
  pause() { if (this.state !== 'playing') return; this.audio.stop(); this.state = 'stopped'; this.sm.status = 'idle'; this.sm.emit(); }
  seek(t) {
    if (this.sm.status === 'capturing') return;
    this.t = Math.max(0, Math.min(this.tl.duration, t));
    if (this.state === 'playing') { this.t0 = this.t; this.w0 = now(); this.startAudio(); } else { this.keepPlacements(); this.drive(0); }
    this.sm.emit();
  }
  // Manual scrubbing pauses playback for the drag and resumes it only if it was already playing.
  beginScrub() { const was = this.state === 'playing'; if (was) this.pause(); return was; }
  scrubTo(t) { this.seek(this.place(Math.max(0, t))); }
  endScrub(was) { if (was) this.play(); }

  async record() {
    const sm = this.sm, a = this.tl.actors.find((x) => x.armed);
    if (sm.busy) return;
    const fail = (m) => { sm.error = m; sm.emit(); };
    if (!sm.scene) return fail('Open or create a scene first.');
    if (!a) return fail('Arm one actor track to record.');
    if (a.locked) return fail(`${a.name}'s track is locked.`);
    this.keepPlacements();
    this.actors.control(a.id);
    this.audio.unlock();
    await Promise.all([this.preload(), this.audio.preload(this.tl.clips)]); this.drive(0); // everyone, including the armed actor, starts from their pose at the playhead
    sm.pass = { actor: a.id, name: a.name, t0: this.t };
    this.startAudio(); // music plays from the playhead, started together with the recorder clock
    await sm.record();
  }

  // Called by the Scene Manager once the pass's chunks are all saved.
  addPass(take, pass, duration) {
    this.state = 'stopped';
    this.edit((tl) => tl.clips.push({ id: uid('perf'), kind: 'perf', actor: pass.actor, key: pass.actor, take_id: take.id, name: take.name, start: pass.t0, in: 0, out: duration }));
    this.sm.saveScene();
  }

  tick(dt) {
    const sm = this.sm;
    if (sm.status === 'capturing' && sm.pass) {
      sm.rec.tick(); this.t = sm.pass.t0 + sm.rec.t;
      if (this.audio.playing) this.drift = this.t - this.audio.time(); // reported, never corrected by changing audio speed
      if (this.stopAt && this.t >= this.stopAt) sm.stop();
      // The recorded actor still performs its scheduled dances/animations, and they are captured into the take.
      const rp = this.e.actors[sm.pass.actor]; if (rp) rp.anim.layers = animLayers(this.tl.clips, sm.pass.actor, this.t);
      return this.drive(dt, sm.pass.actor);
    }
    if (this.state === 'playing') {
      this.t = this.audio.playing ? this.audio.time() : this.t0 + now() - this.w0; // audio clock is the master
      if (this.t >= this.tl.duration) { this.t = this.tl.duration; this.drive(dt); return this.pause(); }
      return this.drive(dt);
    }
    if (this.audio.playing) this.audio.stop();
    if (sm.status === 'playing') return;
    for (const p of this.actors.list) if (p !== this.e.player) { p.anim.t += dt; p.finish(dt, false); }
  }

  state_() {
    return {
      t: this.t, state: this.state, duration: this.tl.duration, fps: this.tl.fps, controlled: this.e.player.actorId, stopAt: this.stopAt,
      actors: this.tl.actors.map((a) => ({ ...a })), clips: this.tl.clips.map((c) => ({ ...c })), canUndo: this.hist.length > 0, canRedo: this.fut.length > 0, recording: this.sm.pass?.actor || null,
      bpm: this.tl.bpm || 0, beat_offset: this.tl.beat_offset || 0, markers: [...(this.tl.markers || [])], snap: !!this.tl.snap, master_gain: this.tl.master_gain ?? 1, drift: this.drift, tracks: { ...(this.tl.tracks || {}) },
    };
  }
}