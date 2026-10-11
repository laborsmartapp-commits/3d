import React, { useEffect, useRef, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { installVirtualClock } from '@/game/render/virtualClock';
import { createStageEngine } from '@/game/render/stageEngines';
import { prepareRender } from '@/game/render/RenderController';

// Headless master-render page driven by the RunPod worker. The worker injects
// window.__KRUSH_RENDER = {job_id, token} before load; access is checked server-side per job.
export default function Render() {
  const ref = useRef(null);
  const [msg, setMsg] = useState('Preparing render');
  useEffect(() => {
    const cfg = window.__KRUSH_RENDER;
    if (!cfg) { setMsg('This page is used by the cloud renderer only.'); return; }
    let e = null;
    (async () => {
      try {
        const { data } = await base44.functions.invoke('renderWorker', { action: 'bundle', job_id: cfg.job_id, token: cfg.token });
        const clock = installVirtualClock(data.job.id);
        const el = ref.current;
        el.style.width = `${data.job.width}px`; el.style.height = `${data.job.height}px`;
        e = await createStageEngine(data, el);
        window.__krushRender = await prepareRender(e, clock, data);
        setMsg('');
      } catch (err) {
        const m = err?.response?.data?.error || err.message;
        window.__krushRenderError = m; setMsg(m);
      }
    })();
    return () => e?.dispose();
  }, []);
  return (
    <div className="fixed inset-0 bg-black overflow-hidden">
      <div ref={ref} className="absolute left-0 top-0" />
      {msg && <p className="absolute bottom-4 left-4 text-sm text-muted-foreground">{msg}</p>}
    </div>
  );
}