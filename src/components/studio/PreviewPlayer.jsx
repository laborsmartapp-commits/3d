import React, { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';

export default function PreviewPlayer({ take }) {
  const [url, setUrl] = useState(null);
  useEffect(() => { base44.integrations.Core.CreateFileSignedUrl({ file_uri: take.preview_uri, expires_in: 3600 }).then((r) => setUrl(r.signed_url)); }, [take.preview_uri]);
  return (
    <div className="space-y-1">
      <div className="aspect-video rounded-lg bg-black overflow-hidden flex items-center justify-center">
        {url ? <video src={url} controls autoPlay playsInline className="w-full h-full" /> : <Loader2 className="w-5 h-5 animate-spin" />}
      </div>
      <p className="text-[10px] text-muted-foreground">PREVIEW · browser-encoded {take.preview_width}×{take.preview_height} {take.preview_ext?.toUpperCase()} · not a cloud master</p>
    </div>
  );
}