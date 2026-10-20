import { base44 } from '@/api/base44Client';
import { CHARACTERS } from '@/game/studio/characters';

export const PRESETS = [['river', 'River', 'Calm, neutral'], ['storm', 'Stormy', 'Formal, authoritative'], ['sunny', 'Sunny', 'Bright, upbeat'], ['spark', 'Spark', 'Energetic, quick']];
export const EMOTIONS = ['neutral', 'happy', 'excited', 'calm', 'sad', 'angry'];
export const DEFAULTS = { stability: 0.5, similarity: 0.75, expressiveness: 0.2, speed: 1, speaker_boost: true, default_emotion: 'neutral', delivery_notes: '', pronunciations: [] };

export async function voiceApi(action, payload = {}) {
  try { return (await base44.functions.invoke('voiceLibrary', { action, ...payload })).data; }
  catch (e) { throw Object.assign(new Error(e.response?.data?.error || e.message), { code: e.response?.data?.code }); }
}

// Every character that can be cast: built-in rigs plus library characters (one identity across versions).
export async function castableCharacters() {
  const lib = (await base44.entities.Asset.filter({ category: 'character', status: 'active' }, { sort: 'name', limit: 100, fields: ['name', 'root_id', 'subcategory'] })).items;
  const seen = new Set(), out = Object.entries(CHARACTERS).map(([k, c]) => ({ key: `char:${k}`, name: c.name, kind: 'Built-in' }));
  for (const a of lib) { const key = `asset:${a.root_id || a.id}`; if (!seen.has(key)) { seen.add(key); out.push({ key, name: a.name, kind: a.subcategory || 'Imported' }); } }
  return out;
}

export const myProfiles = async () => (await base44.entities.CharacterVoice.filter({ created_by_id: (await base44.auth.me()).id }, { limit: 200 })).items;
export const myVoices = async () => (await base44.entities.Voice.filter({ created_by_id: (await base44.auth.me()).id }, { sort: 'name', limit: 200 })).items;

export const playUri = async (uri) => {
  const u = /^https?:/.test(uri) ? uri : (await base44.integrations.Core.CreateFileSignedUrl({ file_uri: uri, expires_in: 600 })).signed_url;
  const a = new Audio(u); await a.play(); return a;
};