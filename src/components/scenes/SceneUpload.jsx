import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Upload, Loader2 } from 'lucide-react';

export default function SceneUpload({ onUploaded }) {
  const [file, setFile] = useState(null);
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async (ev) => {
    ev.preventDefault();
    if (!file) return;
    if (!/\.glb$/i.test(file.name)) { setError('Please choose a .glb file (in Blender: File → Export → glTF 2.0, format "Binary").'); return; }
    setBusy(true); setError('');
    const { file_uri } = await base44.integrations.Core.UploadPrivateFile({ file });
    await base44.entities.BlenderScene.create({ name: name.trim() || file.name.replace(/\.glb$/i, ''), file_uri, file_name: file.name, size: file.size });
    setFile(null); setName(''); ev.target.reset(); setBusy(false);
    onUploaded();
  };

  return (
    <form onSubmit={submit} className="glass rounded-2xl p-5 space-y-3">
      <h2 className="font-heading text-xl">Import a Blender scene</h2>
      <p className="text-sm text-muted-foreground">In Blender use File → Export → glTF 2.0 and pick the binary (.glb) format.</p>
      <div className="grid gap-3 md:grid-cols-[1fr_1fr_auto]">
        <Input placeholder="Scene name (optional)" value={name} onChange={(e) => setName(e.target.value)} />
        <Input type="file" accept=".glb" onChange={(e) => setFile(e.target.files[0] || null)} />
        <Button type="submit" disabled={!file || busy}>{busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}Import</Button>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </form>
  );
}