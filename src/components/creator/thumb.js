import { base44 } from '@/api/base44Client';

// Captures the current view (editor-only gizmos and marks hidden) as the stage's library thumbnail.
export async function captureThumb(engine, rec) {
  const r = engine.renderer, cam = engine.camera, src = r.domElement;
  cam.layers.disable(1); r.render(engine.scene, cam);
  const c = document.createElement('canvas'); c.width = 480; c.height = 270;
  const k = Math.min(src.width / 16, src.height / 9);
  c.getContext('2d').drawImage(src, (src.width - 16 * k) / 2, (src.height - 9 * k) / 2, 16 * k, 9 * k, 0, 0, 480, 270);
  cam.layers.enable(1);
  const blob = await new Promise((res) => c.toBlob(res, 'image/jpeg', 0.85));
  const { file_uri } = await base44.integrations.Core.UploadPrivateFile({ file: new File([blob], 'stage-thumb.jpg', { type: 'image/jpeg' }) });
  await base44.entities.GeneratedStage.update(rec.id, { thumbnail_uri: file_uri });
  rec.thumbnail_uri = file_uri;
  return file_uri;
}