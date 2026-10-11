import React, { useEffect, useState } from 'react';
import { Loader2, ShieldAlert } from 'lucide-react';
import { base44 } from '@/api/base44Client';

const E = base44.entities;
// The only records eligible: exact scene ids and the exact take ids that must belong to them.
const SCOPE = [
  { sceneId: '6acb7df07220bc2d680eecab', name: 'QA LowFPS', takes: ['6acb7f44016c0c6375d0916a', '6acb7e4714238c8deb5a0b98', '6acb7dff2978ab6f42286f42'] },
  { sceneId: '6acb80d4b9dfbcd8b73bfd03', name: 'QA Final', takes: ['6acb8209efc5542944b5a0ae', '6acb81c26303868a5a7d6677'] },
];

async function inspect() {
  return Promise.all(SCOPE.map(async (g) => {
    const scene = (await E.StudioScene.filter({ id: g.sceneId }))[0];
    const others = scene ? (await E.SceneTake.filter({ scene_id: g.sceneId }, { fields: ['id'], limit: 200 })).items.filter((t) => !g.takes.includes(t.id)).length : 0;
    const takes = await Promise.all(g.takes.map(async (id) => {
      const t = (await E.SceneTake.filter({ id }))[0];
      return { id, found: !!t, valid: !!t && t.scene_id === g.sceneId, name: t?.name, status: t?.status, chunks: t ? await E.PerformanceChunk.count({ take_id: id }) : 0, jobs: t ? await E.RenderJob.count({ take_id: id }) : 0 };
    }));
    return { ...g, found: !!scene, valid: scene?.name === g.name, others, takes };
  }));
}

export default function QACleanup() {
  const [plan, setPlan] = useState(null), [confirm, setConfirm] = useState(false), [busy, setBusy] = useState(false), [msg, setMsg] = useState('');
  const load = () => inspect().then(setPlan);
  useEffect(() => { load(); }, []);
  const run = async () => {
    setBusy(true);
    try {
      for (const g of plan) {
        if (!g.valid) continue;
        for (const t of g.takes.filter((x) => x.valid)) {
          await E.PerformanceChunk.deleteMany({ take_id: t.id }); await E.RenderJob.deleteMany({ take_id: t.id }); await E.SceneTake.delete(t.id);
        }
        if (!g.others) await E.StudioScene.delete(g.sceneId); // scene only goes if nothing else lives in it
      }
      setMsg('Cleanup finished.');
    } catch (err) { setMsg(`Cleanup stopped: ${err.message}`); }
    setBusy(false); setConfirm(false); load();
  };
  if (!plan) return <Loader2 className="w-4 h-4 animate-spin mx-auto my-6" />;
  const any = plan.some((g) => g.valid && g.takes.some((t) => t.valid));
  return (
    <div className="space-y-2">
      <p className="text-muted-foreground">Only the QA records below, matched by exact id and scene, can be removed. Nothing else is touched.</p>
      {plan.map((g) => (
        <div key={g.sceneId} className="rounded-lg bg-white/5 p-2 space-y-1">
          <p className="font-semibold">{g.name} <span className="font-mono text-[10px] text-muted-foreground">{g.sceneId}</span> {!g.found ? '(already removed)' : !g.valid ? '(id/name mismatch, skipped)' : g.others ? `(scene kept: ${g.others} other takes)` : '(scene deleted too)'}</p>
          {g.takes.map((t) => <p key={t.id} className={t.valid ? '' : 'text-muted-foreground line-through'}>{t.found ? t.name : 'missing'} · {t.status || '—'} · {t.chunks} chunks · {t.jobs} jobs <span className="font-mono text-[10px] text-muted-foreground">{t.id}</span></p>)}
        </div>
      ))}
      {msg && <p className="text-primary">{msg}</p>}
      {!confirm ? <button onClick={() => setConfirm(true)} disabled={!any} className="w-full rounded-md py-1.5 bg-destructive/20 text-destructive font-semibold disabled:opacity-40">Delete these QA records…</button> : (
        <div className="rounded-lg bg-destructive/15 p-2 space-y-1.5">
          <p className="flex gap-1.5 text-destructive"><ShieldAlert className="w-3.5 h-3.5 shrink-0" />This permanently deletes exactly the takes, chunks and render jobs listed above. It can't be undone.</p>
          <div className="flex gap-1.5">
            <button onClick={run} disabled={busy} className="flex-1 rounded-md py-1.5 bg-destructive text-destructive-foreground font-semibold flex items-center justify-center gap-1">{busy && <Loader2 className="w-3 h-3 animate-spin" />}Confirm delete</button>
            <button onClick={() => setConfirm(false)} disabled={busy} className="flex-1 rounded-md py-1.5 bg-white/10">Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}