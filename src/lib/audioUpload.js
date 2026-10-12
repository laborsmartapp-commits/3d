import { base44 } from '@/api/base44Client';

const OK = /\.(mp3|wav|ogg|m4a|aac|flac|webm)$/i, MAX_MB = 250;

// Uploads an audio file (stored privately); the server verifies the real bytes, size and the
// uploader's role before it is registered in the Audio Library. Browser checks are only a fast pre-check.
export async function uploadAudioAsset(file, { name, subcategory, folder } = {}) {
  if (!OK.test(file.name)) throw new Error('Use MP3, WAV, OGG, M4A, AAC, FLAC or WebM audio.');
  if (file.size > MAX_MB * 1048576) throw new Error(`Audio files must be under ${MAX_MB} MB.`);
  const { file_uri } = await base44.integrations.Core.UploadPrivateFile({ file });
  try {
    return (await base44.functions.invoke('registerAudioAsset', { file_uri, file_name: file.name, name, subcategory, folder })).data;
  } catch (e) {
    throw new Error(e.response?.data?.error || e.message);
  }
}