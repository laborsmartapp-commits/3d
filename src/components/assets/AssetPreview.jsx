import React, { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import SceneViewer from '@/components/scenes/SceneViewer';
import { isAudio, isImage, isModel } from '@/lib/assets';

// Loads the private file through a short-lived signed link and previews it (3D model, image or audio).
export default function AssetPreview({ asset }) {
  const [url, setUrl] = useState(null);
  useEffect(() => {
    setUrl(null);
    base44.integrations.Core.CreateFileSignedUrl({ file_uri: asset.file_uri, expires_in: 1800 }).then((r) => setUrl(r.signed_url));
  }, [asset.file_uri]);
  if (!url) return <div className="h-64 grid place-items-center"><Loader2 className="w-5 h-5 animate-spin" /></div>;
  if (isModel(asset.format)) return <div className="h-72 rounded-xl overflow-hidden relative"><SceneViewer url={url} clip={asset.clip_name} /></div>;
  if (isImage(asset.format)) return <img src={url} alt={asset.name} className="max-h-72 mx-auto rounded-xl" />;
  if (isAudio(asset.format)) return <audio controls src={url} className="w-full" />;
  return <a href={url} className="text-primary text-sm" target="_blank" rel="noreferrer">No in-browser preview for .{asset.format} — download file</a>;
}