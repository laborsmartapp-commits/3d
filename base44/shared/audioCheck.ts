// Server-side audio validation: real bytes (magic numbers) and real stored size, never the client's claims.
export const AUDIO_EXT = ['mp3', 'wav', 'ogg', 'm4a', 'aac', 'flac', 'webm'];

function sniff(b) {
  const s = (o, t) => [...t].every((c, i) => b[o + i] === c.charCodeAt(0));
  if (s(0, 'ID3') || (b[0] === 0xff && (b[1] & 0xe0) === 0xe0)) return b[1] >= 0xf0 && (b[1] & 0x06) === 0 ? 'aac' : 'mp3';
  if (s(0, 'RIFF') && s(8, 'WAVE')) return 'wav';
  if (s(0, 'OggS')) return 'ogg';
  if (s(0, 'fLaC')) return 'flac';
  if (s(4, 'ftyp')) return 'm4a';
  if (b[0] === 0x1a && b[1] === 0x45 && b[2] === 0xdf && b[3] === 0xa3) return 'webm';
  return null;
}

// Fetches the first bytes of the stored file and its true size. Throws a user-readable error when invalid.
export async function checkAudioFile(signedUrl, maxBytes) {
  const r = await fetch(signedUrl, { headers: { Range: 'bytes=0-63' }, signal: AbortSignal.timeout(15000) });
  if (!r.ok) throw new Error(`Stored file is not readable (${r.status})`);
  const head = new Uint8Array(await r.arrayBuffer()).slice(0, 64);
  const size = Number((r.headers.get('content-range') || '').split('/')[1]) || Number(r.headers.get('content-length')) || 0;
  const kind = sniff(head);
  if (!kind) throw new Error('Not a supported audio file (MP3, WAV, OGG, M4A, AAC, FLAC or WebM).');
  if (!size) throw new Error('Could not determine the file size.');
  if (size > maxBytes) throw new Error(`Audio file is ${(size / 1048576).toFixed(1)} MB; the limit is ${Math.round(maxBytes / 1048576)} MB.`);
  return { kind, size };
}