import React, { useEffect, useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import Convergence from '@/pages/Convergence';
import RealmHUD from '@/components/realm/RealmHUD';
import { GEN_TOOLS } from '@/components/realm/bubble/tools';
import { generatedDistrict } from '@/game/generated';
import { captureThumb } from '@/components/creator/thumb';

// An AI-generated stage, rebuilt from its saved blueprint (no AI call) in the shared stage engine.
export default function GeneratedStage() {
  const { id } = useParams(), [sp] = useSearchParams(), latest = sp.get('latest'), preview = sp.get('preview');
  const [rec, setRec] = useState(null), [err, setErr] = useState('');
  useEffect(() => {
    setRec(null); setErr('');
    (async () => {
      let r = latest ? (await base44.entities.GeneratedStage.filter({ root_id: id, status: 'active' }, { sort: '-version', limit: 1 })).items[0] : await base44.entities.GeneratedStage.get(id);
      if (!r?.spec) throw new Error('Stage not found');
      if (preview) { const p = JSON.parse(sessionStorage.getItem(`stagePreview:${r.id}`) || 'null'); if (p) r = { ...r, spec: p.spec, preview: p }; }
      setRec(r);
    })().catch((e) => setErr(e.message));
  }, [id, latest, preview]);
  const district = useMemo(() => rec && generatedDistrict(rec), [rec]);
  if (err) return <div className="fixed inset-0 flex flex-col items-center justify-center gap-3 bg-background text-sm"><p>{err}</p><Link to="/stages" className="text-primary">Back to Stages</Link></div>;
  if (!district) return <div className="fixed inset-0 flex items-center justify-center bg-background text-sm text-muted-foreground">Loading stage blueprint…</div>;
  return <Convergence key={`${rec.id}${rec.preview ? '-p' : ''}`} district={district} title={rec.spec.name} customUI overlay={(p) => <Overlay {...p} rec={rec} />} />;
}

function Overlay({ engine, s, studioOpen, setStudioOpen, rec }) {
  // First visit: capture a library thumbnail once the stage has settled.
  useEffect(() => {
    if (rec.thumbnail_uri || rec.preview) return;
    const t = setTimeout(() => captureThumb(engine, rec).catch(() => {}), 3500);
    return () => clearTimeout(t);
  }, [engine, rec]);
  return (
    <>
      <RealmHUD engine={engine} s={s} studioOpen={studioOpen} setStudioOpen={setStudioOpen} tools={GEN_TOOLS} />
      {rec.preview && <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 glass rounded-full px-4 py-1.5 text-xs text-ember">Refinement preview: commit or discard in Stage Creator</div>}
      <Link to="/stages" className="absolute bottom-4 left-4 z-20 glass rounded-full px-3 py-1.5 text-xs hover:bg-card/80">← Stages</Link>
    </>
  );
}