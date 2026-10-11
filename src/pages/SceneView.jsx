import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { ArrowLeft } from 'lucide-react';
import SceneViewer from '@/components/scenes/SceneViewer';

export default function SceneView() {
  const { id } = useParams();
  const [scene, setScene] = useState(null);
  const [url, setUrl] = useState(null);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    (async () => {
      const page = await base44.entities.BlenderScene.filter({ id }, { limit: 1 });
      const s = page.items[0];
      if (!s) { setMissing(true); return; }
      setScene(s);
      const { signed_url } = await base44.integrations.Core.CreateFileSignedUrl({ file_uri: s.file_uri, expires_in: 3600 });
      setUrl(signed_url);
    })();
  }, [id]);

  return (
    <div className="fixed inset-0 bg-background text-foreground font-body">
      {url && <SceneViewer url={url} />}
      {missing && <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">Scene not found.</div>}
      <div className="absolute top-4 left-4 flex items-center gap-2">
        <Link to="/scenes" className="glass rounded-full px-4 py-2 text-sm flex items-center gap-2 hover:bg-card/80"><ArrowLeft className="w-4 h-4" />Library</Link>
        {scene && <div className="glass rounded-full px-4 py-2 text-sm">{scene.name}</div>}
      </div>
    </div>
  );
}