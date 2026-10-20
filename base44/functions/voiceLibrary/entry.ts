import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import { el, voiceGone, voiceSettings, pronounce, PRESETS, voiceRow } from './eleven.ts';

// Account Voice Library: import existing ElevenLabs voices by their persistent id, create voices from authorized
// recordings (a voice exists only once ElevenLabs created it), and speak a character's lines with the voice saved
// on its character profile. A missing or unavailable voice is an error; another voice is never substituted.
const now = () => new Date().toISOString();
const clean = (v, n) => (typeof v === 'string' ? v.trim().slice(0, n) : '');
const err = (error, status, code) => Response.json({ error, code }, { status });

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return err('Unauthorized', 401);
    const b = await req.json(), Voices = base44.entities.Voice, Profiles = base44.entities.CharacterVoice;
    const mine = (v) => v && v.created_by_id === user.id;

    // Character identity: library characters share one voice across all their versions.
    const keyOf = async (a) => {
      if (a.asset_id) { const as = await base44.entities.Asset.get(a.asset_id).catch(() => null); return as ? `asset:${as.root_id || as.id}` : `asset:${a.asset_id}`; }
      return `char:${a.char}`;
    };
    // The voice a character speaks with, or a reason it cannot speak.
    const resolve = async (a) => {
      const key = await keyOf(a), name = clean(a.name, 80) || key;
      const [p] = (await Profiles.filter({ created_by_id: user.id, character_key: key }, { limit: 1 })).items;
      if (!p || (p.voice_kind === 'preset' ? !PRESETS[p.preset] : !p.voice_id)) return { key, error: `${name} has no voice assigned. Assign one in the Voice Library.`, code: 'no_voice' };
      if (p.voice_kind === 'preset') return { key, profile: p, voice: { name: PRESETS[p.preset], provider: 'preset', preset: p.preset } };
      const v = await Voices.get(p.voice_id).catch(() => null);
      if (!mine(v)) return { key, profile: p, error: `${name}'s assigned voice was deleted. Choose another voice for ${name}.`, code: 'voice_unavailable' };
      if (v.status !== 'ready') return { key, profile: p, error: `${name}'s voice "${v.name}" is ${v.status === 'pending_verification' ? 'waiting for ElevenLabs verification' : 'unavailable'}. Re-check it or choose another voice.`, code: 'voice_unavailable' };
      return { key, profile: p, voice: { id: v.id, name: v.name, provider: 'elevenlabs', provider_voice_id: v.provider_voice_id } };
    };
    const check = async (v) => {
      try { await el(`/v1/voices/${encodeURIComponent(v.provider_voice_id)}`, {}, 15000); return await Voices.update(v.id, { status: v.status === 'pending_verification' ? 'pending_verification' : 'ready', status_detail: '', last_checked: now() }); }
      catch (e) { if (!voiceGone(e)) throw e; return await Voices.update(v.id, { status: 'unavailable', status_detail: 'ElevenLabs no longer has this voice', last_checked: now() }); }
    };

    if (b.action === 'provider_voices') {
      const out = []; let token = '';
      for (let i = 0; i < 3; i++) {
        const r = await (await el(`/v2/voices?page_size=100${token ? `&next_page_token=${encodeURIComponent(token)}` : ''}`)).json();
        out.push(...(r.voices || []).map(voiceRow));
        if (!r.has_more || !r.next_page_token) break; token = r.next_page_token;
      }
      const have = new Set((await Voices.filter({ created_by_id: user.id }, { limit: 500, fields: ['provider_voice_id'] })).items.map((v) => v.provider_voice_id));
      return Response.json({ voices: out.map((v) => ({ ...v, imported: have.has(v.provider_voice_id) })) });
    }

    if (b.action === 'import') {
      const id = clean(b.provider_voice_id, 64);
      if (!/^[A-Za-z0-9_-]{6,64}$/.test(id)) return err('Enter a valid ElevenLabs voice ID', 400);
      const [dup] = (await Voices.filter({ created_by_id: user.id, provider_voice_id: id }, { limit: 1 })).items;
      if (dup) return Response.json({ voice: dup, existed: true });
      let v;
      try { v = await (await el(`/v1/voices/${encodeURIComponent(id)}`)).json(); }
      catch (e) { if (voiceGone(e)) return err(`ElevenLabs has no voice with ID ${id} on this account`, 404); throw e; }
      const voice = await Voices.create({ ...voiceRow(v), name: clean(b.name, 80) || v.name, provider: 'elevenlabs', source: 'imported', status: 'ready', last_checked: now() });
      return Response.json({ voice });
    }

    if (b.action === 'create') {
      const name = clean(b.name, 80), uris = (Array.isArray(b.file_uris) ? b.file_uris : []).filter((u) => typeof u === 'string').slice(0, 5);
      if (!name) return err('Name the voice', 400);
      if (!uris.length) return err('Add at least one reference recording', 400);
      if (b.consent !== true) return err('Confirm you have the speaker\'s permission to create this voice', 400);
      const fd = new FormData();
      fd.append('name', name); fd.append('description', clean(b.description, 400)); fd.append('remove_background_noise', String(!!b.denoise));
      for (const [i, uri] of uris.entries()) {
        const { signed_url } = await base44.integrations.Core.CreateFileSignedUrl({ file_uri: uri, expires_in: 600 });
        const r = await fetch(signed_url, { signal: AbortSignal.timeout(60000) });
        if (!r.ok) return err(`Recording ${i + 1} could not be read`, 400);
        fd.append('files', new Blob([await r.arrayBuffer()], { type: r.headers.get('content-type') || 'audio/mpeg' }), `sample-${i + 1}.mp3`);
      }
      // The voice exists only if ElevenLabs actually created it; a failure leaves nothing in the library.
      const made = await (await el('/v1/voices/add', { method: 'POST', body: fd }, 120000)).json();
      if (!made.voice_id) return err('ElevenLabs did not create a voice from these recordings', 502);
      const info = await (await el(`/v1/voices/${made.voice_id}`)).json();
      const voice = await Voices.create({ ...voiceRow(info), name, provider: 'elevenlabs', source: 'created', sample_uris: uris,
        status: made.requires_verification ? 'pending_verification' : 'ready', status_detail: made.requires_verification ? 'ElevenLabs requires verification before this voice can speak' : '',
        consent: { confirmed: true, statement: clean(b.consent_statement, 400), by: user.email, at: now() }, last_checked: now() });
      return Response.json({ voice });
    }

    if (b.action === 'verify') {
      const v = await Voices.get(b.id).catch(() => null);
      if (!mine(v)) return err('Voice not found', 404);
      return Response.json({ voice: await check(v) });
    }

    if (b.action === 'resolve') {
      const list = (b.actors || []).slice(0, 20);
      return Response.json({ actors: await Promise.all(list.map(async (a) => { const r = await resolve(a); return { id: a.id, key: r.key, voice: r.voice || null, error: r.error || null, code: r.code || null }; })) });
    }

    if (b.action === 'speak') {
      const text = clean(b.text, 1200);
      if (!text) return err('Nothing to say', 400);
      let r;
      if (b.voice_id || b.preset) {
        // Preview a library voice directly (no character profile involved).
        if (b.preset) { if (!PRESETS[b.preset]) return err('Unknown preset', 400); r = { profile: {}, voice: { name: PRESETS[b.preset], provider: 'preset', preset: b.preset } }; }
        else { const v = await Voices.get(b.voice_id).catch(() => null); if (!mine(v)) return err('Voice not found', 404); if (v.status !== 'ready') return err(`"${v.name}" is not ready to speak`, 409, 'voice_unavailable'); r = { profile: b.settings || {}, voice: { id: v.id, name: v.name, provider: 'elevenlabs', provider_voice_id: v.provider_voice_id } }; }
      } else {
        r = await resolve(b);
        if (r.error) return err(r.error, 409, r.code);
      }
      const p = r.profile, emotion = clean(b.emotion, 20) || p.default_emotion || 'neutral', spoken = pronounce(text, p.pronunciations);
      let file_uri, size = 0, alignment = null;
      if (r.voice.provider === 'preset') {
        file_uri = (await base44.asServiceRole.integrations.Core.GenerateSpeech({ text: spoken, voice: r.voice.preset })).url;
      } else {
        let out;
        try {
          out = await (await el(`/v1/text-to-speech/${encodeURIComponent(r.voice.provider_voice_id)}/with-timestamps?output_format=mp3_44100_128`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: spoken, model_id: 'eleven_multilingual_v2', voice_settings: voiceSettings(p, emotion) }),
          }, 90000)).json();
        } catch (e) {
          if (!voiceGone(e)) throw e;
          await Voices.update(r.voice.id, { status: 'unavailable', status_detail: 'ElevenLabs no longer has this voice', last_checked: now() });
          return err(`The voice "${r.voice.name}" no longer exists on ElevenLabs. Choose another voice.`, 409, 'voice_unavailable');
        }
        const bytes = Uint8Array.from(atob(out.audio_base64), (c) => c.charCodeAt(0)); size = bytes.length;
        alignment = out.alignment || out.normalized_alignment || null;
        file_uri = (await base44.asServiceRole.integrations.Core.UploadPrivateFile({ file: new File([bytes], 'line.mp3', { type: 'audio/mpeg' }) })).file_uri;
      }
      const who = clean(b.name, 60);
      const asset = await base44.entities.Asset.create({ name: `${who ? `${who}: ` : ''}${text.slice(0, 60)}`, category: 'audio', subcategory: 'dialogue', folder: 'Dialogue', file_uri, file_name: 'line.mp3', format: 'mp3', size, tags: ['voice', r.voice.name, emotion] });
      return Response.json({ asset, alignment, emotion, voice: r.voice, character_key: r.key || null });
    }

    return err('Unknown action', 400);
  } catch (error) {
    return Response.json({ error: error.message }, { status: error.status && error.status < 500 ? 502 : 500 });
  }
}