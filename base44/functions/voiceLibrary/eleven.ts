import { secrets } from 'base44:runtime';

// ElevenLabs REST helpers. Errors carry the HTTP status so callers can tell "voice gone" from "provider down".
const API = 'https://api.elevenlabs.io';
export async function el(path, init = {}, ms = 30000) {
  const key = secrets.get('ELEVENLABS_API_KEY');
  if (!key) throw Object.assign(new Error('ElevenLabs is not connected (missing API key)'), { status: 503 });
  const r = await fetch(API + path, { ...init, headers: { 'xi-api-key': key, ...(init.headers || {}) }, signal: AbortSignal.timeout(ms) });
  if (!r.ok) {
    const b = await r.json().catch(() => ({}));
    const msg = b?.detail?.message || (typeof b?.detail === 'string' ? b.detail : '') || `ElevenLabs error ${r.status}`;
    throw Object.assign(new Error(msg), { status: r.status, code: b?.detail?.status });
  }
  return r;
}
export const voiceGone = (e) => e.status === 404 || (e.status === 400 && /voice.*(not.*found|does not exist)/i.test(e.message + ' ' + (e.code || '')));

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
// Emotion shifts delivery only (style / stability / pace); the voice identity is never changed.
const EMOTION = { neutral: {}, happy: { style: 0.2 }, excited: { style: 0.35, stability: -0.2, speed: 0.05 }, calm: { stability: 0.2, speed: -0.05 }, sad: { style: 0.15, stability: 0.1, speed: -0.08 }, angry: { style: 0.4, stability: -0.25 } };
export function voiceSettings(p, emotion) {
  const d = EMOTION[emotion] || {};
  return {
    stability: clamp((p.stability ?? 0.5) + (d.stability || 0), 0, 1),
    similarity_boost: clamp(p.similarity ?? 0.75, 0, 1),
    style: clamp((p.expressiveness ?? 0.2) + (d.style || 0), 0, 1),
    speed: clamp((p.speed ?? 1) + (d.speed || 0), 0.7, 1.2),
    use_speaker_boost: p.speaker_boost !== false,
  };
}
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
export function pronounce(text, list = []) {
  let t = text;
  for (const { word, say } of list) if (word?.trim() && say?.trim()) t = t.replace(new RegExp(`\\b${esc(word.trim())}\\b`, 'gi'), say.trim());
  return t;
}
export const PRESETS = { river: 'River', storm: 'Stormy', sunny: 'Sunny', spark: 'Spark' };
export const voiceRow = (v) => ({ provider_voice_id: v.voice_id, name: v.name, category: v.category, description: v.description || '', preview_url: v.preview_url || '', labels: v.labels || {} });