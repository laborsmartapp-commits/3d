import React, { useEffect, useState } from 'react';
import { Mountain } from 'lucide-react';
import { base44 } from '@/api/base44Client';

// Private preview thumbnail of a generated stage (signed on demand).
export default function StageThumb({ uri, className = 'h-12 w-20' }) {
  const [url, setUrl] = useState(null);
  useEffect(() => { if (uri) base44.integrations.Core.CreateFileSignedUrl({ file_uri: uri, expires_in: 3600 }).then((r) => setUrl(r.signed_url)).catch(() => {}); }, [uri]);
  return (
    <div className={`${className} shrink-0 rounded-md overflow-hidden bg-white/5 flex items-center justify-center`}>
      {url ? <img src={url} alt="Stage preview" className="w-full h-full object-cover" /> : <Mountain className="w-4 h-4 text-quiet" />}
    </div>
  );
}