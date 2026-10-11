import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { ArrowLeft, Box, Trash2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import SceneUpload from '@/components/scenes/SceneUpload';

export default function Scenes() {
  const [scenes, setScenes] = useState(null);
  const load = async () => { const page = await base44.entities.BlenderScene.filter({}, { sort: '-created_date', limit: 50 }); setScenes(page.items); };
  useEffect(() => { load(); }, []);
  const remove = async (id) => { await base44.entities.BlenderScene.delete(id); load(); };

  return (
    <div className="min-h-screen bg-background text-foreground font-body px-6 py-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="w-4 h-4" />Home</Link>
        <h1 className="font-heading text-4xl">Scene Library</h1>
        <SceneUpload onUploaded={load} />
        {!scenes ? <Loader2 className="w-6 h-6 animate-spin text-primary" /> : scenes.length === 0 ? (
          <p className="text-muted-foreground">No scenes imported yet.</p>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {scenes.map((s) => (
              <div key={s.id} className="glass rounded-2xl p-4 flex items-center gap-3">
                <Box className="w-6 h-6 text-primary shrink-0" />
                <Link to={`/scenes/${s.id}`} className="flex-1 min-w-0 hover:text-primary">
                  <div className="font-medium truncate">{s.name}</div>
                  <div className="text-xs text-muted-foreground truncate">{s.file_name}{s.size ? ` · ${(s.size / 1048576).toFixed(1)} MB` : ''}</div>
                </Link>
                <Button size="icon" variant="ghost" onClick={() => remove(s.id)}><Trash2 className="w-4 h-4" /></Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}