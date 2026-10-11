import React, { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Loader2, ArrowLeft, Play } from 'lucide-react';
import { stageInfo } from '@/game/stages/registry';
import { openInDirector } from '@/lib/studioLinks';
import useProduction from '@/hooks/useProduction';
import PageHeader from '@/components/shell/PageHeader';
import StatusBadge from '@/components/shell/StatusBadge';
import SceneBlock from '@/components/productions/SceneBlock';
import ShotDialog from '@/components/productions/ShotDialog';
import AddSceneBar from '@/components/productions/AddSceneBar';
import { TYPES } from '@/components/productions/NewProductionDialog';

export default function ProductionDetail() {
  const { id } = useParams();
  const a = useProduction(id), d = a.d;
  const [shotEdit, setShotEdit] = useState(null);
  if (!d) return <Loader2 className="w-5 h-5 animate-spin" />;
  if (d.missing) return <p className="text-muted-foreground">Production not found. <Link to="/productions" className="text-primary">Back to productions</Link></p>;
  const p = d.p, last = d.scenes.find((s) => s.id === p.last_scene_id), lastShot = d.shots.find((s) => s.id === p.last_shot_id);
  const h = {
    ...a, open: (scene, shot) => openInDirector(p, scene, shot),
    renameScene: (s) => { const n = window.prompt('Rename scene', s.name); if (n?.trim()) a.renameScene(s, n.trim()); },
    removeScene: (s) => window.confirm(`Remove “${s.name}” from this production? The scene and its recorded takes stay in Recorded Scenes.`) && a.removeScene(s),
    deleteShot: (s) => window.confirm(`Delete shot “${s.name}”? Takes are not affected.`) && a.deleteShot(s),
    editShot: (scene, shot) => setShotEdit({ scene, shot }),
  };
  return (
    <div className="max-w-5xl">
      <Link to="/productions" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mb-4"><ArrowLeft className="w-3.5 h-3.5" />My Productions</Link>
      <PageHeader eyebrow={`${TYPES[p.production_type]} · ${stageInfo(p.stage_id).name}`} title={p.title}>
        {last && <button onClick={() => h.open(last, lastShot)} className="inline-flex items-center gap-2 rounded-xl bg-primary text-primary-foreground px-4 py-2 text-sm font-semibold"><Play className="w-4 h-4" />Continue: {last.name}{lastShot ? ` / ${lastShot.name}` : ''}</button>}
      </PageHeader>
      <div className="flex flex-wrap gap-3 items-center text-sm text-muted-foreground mb-8">
        <StatusBadge status={p.status} /><span>{p.fps} fps · {p.resolution}</span><span>{d.scenes.length} scenes · {d.shots.length} shots · {d.takes.length} takes</span>
        {p.description && <span className="w-full">{p.description}</span>}
      </div>
      <div className="space-y-4">
        {d.scenes.map((s, i) => <SceneBlock key={s.id} scene={s} shots={d.shots.filter((x) => x.scene_id === s.id)} takes={d.takes.filter((t) => t.scene_id === s.id)} first={i === 0} last={i === d.scenes.length - 1} h={h} />)}
        {!d.scenes.length && <p className="text-sm text-muted-foreground">No scenes yet. Add one below — it opens straight into Director Mode on its stage.</p>}
        <AddSceneBar production={p} onCreate={a.newScene} onLink={a.linkScene} />
      </div>
      <ShotDialog open={!!shotEdit} scene={shotEdit?.scene} shot={shotEdit?.shot} onClose={() => setShotEdit(null)} onSave={async (f) => { await a.saveShot(shotEdit.scene, shotEdit.shot, f); setShotEdit(null); }} />
    </div>
  );
}