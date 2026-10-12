import { base44 } from '@/api/base44Client';

const OK = /\.(mp3|wav|ogg|m4a|aac|flac|webm)$/i, MAX_MB = 250;

// Uploads an audio file (stored privately) and registers it in the Audio Library as a new asset.
export async function uploadAudioAsset(file, { name, subcategory } = {}) {
  if (!OK.test(file.name)) throw new Error('Use MP3, WAV, OGG, M4A, AAC, FLAC or WebM audio.');
  if (file.size > MAX_MB * 1048576) throw new Error(`Audio files must be under ${MAX_MB} MB.`);
  const { file_uri } = await base44.integrations.Core.UploadPrivateFile({ file });
  return base44.entities.Asset.create({
    name: name || file.name.replace(/\.[^.]+$/, ''), category: 'audio', subcategory, file_uri, file_name: file.name,
    format: file.name.split('.').pop().toLowerCase(), size: file.size, version: 1, status: 'active',
  });
}