import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';

// Drives a progressive stage-construction job: one short server step (one AI operation) at a time.
// Module-level so construction keeps going while the user moves between stages and panels in the app.
// Every completed operation is already saved on the server; closing the app only pauses the job.
let state = { job: null, stage: null, running: false, error: '', rev: 0 };
let stopAsked = false;
const subs = new Set();
const emit = (p) => { state = { ...state, ...p }; subs.forEach((f) => f(state)); };
const call = async (payload) => (await base44.functions.invoke('stageConstruction', payload)).data;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function loop(retry) {
  if (state.running) return;
  stopAsked = false; emit({ running: true, error: '' });
  let again = !!retry;
  try {
    while (state.job && state.job.status !== 'completed' && !stopAsked) {
      const d = await call({ action: 'step', job_id: state.job.id, retry: again });
      again = false;
      emit({ job: d.job, ...(d.stage ? { stage: d.stage, rev: state.rev + 1 } : {}) });
      if (d.busy) { await sleep(8000); continue; }
      if (d.needs_retry || d.job.status === 'failed') break;
    }
  } catch (e) { emit({ error: e.response?.data?.error || e.message }); }
  emit({ running: false });
}

export const construction = {
  get: () => state,
  subscribe: (f) => { subs.add(f); return () => subs.delete(f); },
  async start(payload) {
    const d = await call({ action: 'start', ...payload });
    emit({ job: d.job, stage: d.stage, error: '', rev: state.rev + 1 });
    loop();
    return d;
  },
  async load(jobId) {
    if (state.job?.id === jobId) return;
    const d = await call({ action: 'get', job_id: jobId });
    if (!state.running) emit({ job: d.job, stage: d.stage, error: '' });
  },
  resume: (retry) => loop(retry),
  pause: () => { stopAsked = true; },
};

export function useConstruction() {
  const [s, set] = useState(construction.get());
  useEffect(() => construction.subscribe(set), []);
  return s;
}

// The newest unfinished construction job of the signed-in user (to resume after a reload).
export async function findOpenJob() {
  const me = await base44.auth.me();
  const page = await base44.entities.StageGenJob.filter({ created_by_id: me.id, status: { $in: ['running', 'failed'] } }, { sort: '-created_date', limit: 1, fields: ['id'] });
  return page.items[0]?.id || null;
}