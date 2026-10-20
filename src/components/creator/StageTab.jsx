import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sofa, Save, Copy, Shuffle, Camera, ImageIcon } from 'lucide-react';
import ReportView from './ReportView';
import RefinePanel from './RefinePanel';
import SurfacesPanel from './SurfacesPanel';
import ChoiceRow from './ChoiceRow';
import CostNotice from './CostNotice';
import { QUALITY } from './options';
import { construction, useConstruction } from './construction';
import { addStageCameras } from '@/game/generated';
import { captureThumb } from './thumb';

const Sec = ({ title, children }) => <div><p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">{title}</p>{children}</div>;
const Btn = ({ icon: Icon, children, ...p }) => <button {...p} className="rounded-lg bg-white/10 hover:bg-white/15 py-1.5 px-2 text-[11px] flex items-center gap-1.5 disabled:opacity-40"><Icon className="w-3.5 h-3.5" />{children}</button>;

// Actions on the generated stage that is open right now.
export default function StageTab({ engine, st, rec, api, onPick }) {
  const nav = useNavigate(), R = engine.realm?.R, [msg, setMsg] = useState(''), [q, setQ] = useState('standard'), c = useConstruction();
  const objects = () => R.set.serialize().filter((o) => !o.hidden);
  const act = async (label, payload, model) => { const d = await api.run(label, { parent_id: rec.id, ...payload }, model); if (d?.stage) nav(`/stage/${d.stage.id}`); };
  const variation = async () => { setMsg('Starting variation construction…'); try { await construction.start({ parent_id: rec.id, quality: q }); setMsg('Variation construction started (progress above).'); } catch (e) { setMsg(e.response?.data?.error || e.message); } };
  const commit = (pv) => act('Committing refinement', { action: 'commit', spec: pv.spec, report: pv.report, summary: pv.summary, instruction: pv.instruction });
  const cams = () => { if (!st?.scene) { setMsg('Open or create a scene first (Scenes bubble).'); return; } setMsg(`Added ${addStageCameras(engine)} stage cameras to “${st.scene.name}”.`); };
  const thumb = async () => { setMsg('Capturing thumbnail…'); await captureThumb(engine, rec); setMsg('Thumbnail updated (stored privately).'); };
  return (
    <div className="space-y-4">
      <ReportView rec={rec} />
      <Sec title="Edit & versions">
        <div className="grid grid-cols-2 gap-1.5">
          <Btn icon={Sofa} onClick={() => onPick?.('setedit')}>Open Set Edit</Btn>
          <Btn icon={Save} disabled={api.busy} onClick={() => act('Saving version', { action: 'edit', current_objects: objects() })}>Save as Version</Btn>
          <Btn icon={Copy} disabled={api.busy} onClick={() => act('Duplicating stage', { action: 'duplicate' })}>Duplicate Stage</Btn>
          <Btn icon={Camera} onClick={cams}>Add stage cameras</Btn>
          <Btn icon={ImageIcon} onClick={thumb}>Update thumbnail</Btn>
        </div>
        {msg && <p className="text-[11px] text-primary mt-1.5">{msg}</p>}
      </Sec>
      <Sec title="Generate Variation">
        <ChoiceRow label="AI model" options={QUALITY} value={q} onChange={setQ} />
        <Btn icon={Shuffle} disabled={api.busy || c.running} onClick={variation}>Generate Variation (new version)</Btn>
      </Sec>
      <Sec title="Refine Existing Stage"><RefinePanel rec={rec} api={api} objects={objects} commit={commit} /></Sec>
      <Sec title="Surfaces & materials"><SurfacesPanel spec={rec.spec} busy={api.busy} apply={(swaps) => act('Applying materials', { action: 'edit', swaps, current_objects: objects() })} /></Sec>
      <CostNotice />
    </div>
  );
}