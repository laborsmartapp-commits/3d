import { useState } from 'react';
import { base44 } from '@/api/base44Client';

// One request at a time to the stage generator; job = { label, model, started } while running, { error } on failure.
export default function useStageApi() {
  const [job, setJob] = useState(null);
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
  return { job, busy: !!job && !job.error, run, clear: () => setJob(null) };
}