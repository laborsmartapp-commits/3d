export const PREVIEW_RES = { '720p': { w: 1280, h: 720, bps: 5e6 }, '1080p': { w: 1920, h: 1080, bps: 10e6 } };
const TYPES = [['video/mp4;codecs=avc1.42E01E', 'mp4'], ['video/mp4;codecs=avc1', 'mp4'], ['video/mp4', 'mp4'], ['video/webm;codecs=vp9', 'webm'], ['video/webm;codecs=vp8', 'webm'], ['video/webm', 'webm']];
// Video + audio containers, best first (MP4 with AAC, then WebM with Opus).
const AV_TYPES = [['video/mp4;codecs=avc1.42E01E,mp4a.40.2', 'mp4'], ['video/mp4;codecs=avc1,mp4a.40.2', 'mp4'], ['video/webm;codecs=vp9,opus', 'webm'], ['video/webm;codecs=vp8,opus', 'webm']];
export const FPS = 30;

// Real container the browser can encode natively. MP4 when supported, otherwise honestly WebM.
// withAudio: only containers that also carry an audio track; null when the browser has none.
export function previewFormat(withAudio = false) {
  if (typeof MediaRecorder === 'undefined' || !HTMLCanvasElement.prototype.captureStream) return null;
  const f = (withAudio ? AV_TYPES : TYPES).find(([m]) => MediaRecorder.isTypeSupported(m));
  return f ? { mime: f[0], type: f[0].split(';')[0], ext: f[1], audio: withAudio } : null;
}

// Browser preview: copies only the production camera's frame (WebGL output, no DOM UI) into a
// fixed-size canvas and encodes it with MediaRecorder. `audioStream` (the timeline mix) is muxed in
// when the browser can encode video with audio; otherwise the preview is video-only and says so.
export class PreviewEncoder {
  constructor(res, audioStream = null) {
    const R = PREVIEW_RES[res] || PREVIEW_RES['720p'];
    this.res = res; this.w = R.w; this.h = R.h; this.chunks = []; this.src = null;
    this.fmt = (audioStream && previewFormat(true)) || previewFormat();
    this.audioWanted = !!audioStream;
    this.canvas = Object.assign(document.createElement('canvas'), { width: R.w, height: R.h });
    this.ctx = this.canvas.getContext('2d');
    const stream = this.canvas.captureStream(FPS);
    if (this.fmt.audio) audioStream.getAudioTracks().forEach((t) => stream.addTrack(t));
    this.rec = new MediaRecorder(stream, { mimeType: this.fmt.mime, videoBitsPerSecond: R.bps, ...(this.fmt.audio && { audioBitsPerSecond: 160000 }) });
    this.rec.ondataavailable = (ev) => ev.data.size && this.chunks.push(ev.data);
  }
  start() { this.rec.start(1000); }
  draw(src, [x, y, w, h], pr) {
    this.ctx.drawImage(src, x * pr, src.height - (y + h) * pr, w * pr, h * pr, 0, 0, this.w, this.h);
    this.src = [Math.round(w * pr), Math.round(h * pr)];
  }
  stop() { return new Promise((r) => { this.rec.onstop = () => r(new Blob(this.chunks, { type: this.fmt.type })); this.rec.stop(); }); }
}