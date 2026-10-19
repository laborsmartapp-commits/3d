import { useState } from 'react';
import { base44 } from '@/api/base44Client';

// One request at a time to the stage generator; job = { label, model, started } while running, { error } on failure.
// New stages are generated in two AI steps; a failed step 2 can be retried without repeating step 1.
export default function useStageApi() {
  const [job, setJob] = useState(null), [pending, setPending] = useState(null);
  const run = async (label, payload, model) => {
    setJob({ label, model, started: Date.now() });
    try {
      const res = await base44.functions.invoke('generateStage', payload);
      setJob(null);
      return res.data;
    } catch (err) {
      setJob({ label, error: err.response?.data?.error || err.message });
      return null;
    }
  };
  const dress = async (label, id, model) => {
    setPending({ label, id, model });
    const d = await run(`${label} · step 2/2 furnishing & lighting`, { action: 'dress', draft_id: id }, model);
    if (d?.stage) setPending(null);
    return d;
  };
  const generate = async (label, payload, model) => {
    const a = await run(`${label} · step 1/2 architecture`, { ...payload, phase: 'shell' }, model);
    return a?.draft ? dress(label, a.draft, model) : a;
  };
  const retry = () => pending && dress(pending.label, pending.id, pending.model);
  return { job, busy: !!job && !job.error, run, generate, retry, canRetry: !!pending && !!job?.error, clear: () => setJob(null) };
}