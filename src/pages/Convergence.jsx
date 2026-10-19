import React, { Profiler, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, MapPin } from 'lucide-react';
import { ConvergenceEngine } from '@/game/convergence/ConvergenceEngine';
import Toasts from '@/components/game/Toasts';
import StageStudio from '@/components/studio/StageStudio';
import useStageStudio from '@/hooks/useStageStudio';

export default function Convergence({ district, title = 'The Convergence', overlay, customUI = false }) {
  const [mount, setMount] = useState(null);
  const [engine, setEngine] = useState(null);
  const [studioOpen, setStudioOpen] = useState(false);
  const [s, setS] = useState({ phase: 'loading', progress: 0, step: 'Preparing' });

  useEffect(() => {
    if (!mount) return;
    const e = new ConvergenceEngine(mount, setS, district);
    setEngine(e);
    window.__stage = e;
    e.init();
    return () => e.dispose();
  }, [mount]);

  useStageStudio(engine, s.phase, () => setStudioOpen(true));
  useEffect(() => { if (s.phase === 'game') engine?.studio?.open(studioOpen); }, [studioOpen, engine, s.phase]);

  return (
    <div className="fixed inset-0 overflow-hidden bg-background text-foreground select-none font-body">
      <div ref={setMount} className="absolute inset-0" />
      {s.phase !== 'game' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-background">
          <h1 className="font-heading text-3xl tracking-wide">{title}</h1>
          <div className="w-64 h-1.5 rounded-full bg-white/10 overflow-hidden"><div className="h-full bg-primary transition-all" style={{ width: `${s.progress}%` }} /></div>
          <p className="text-sm text-muted-foreground">{s.step}</p>
        </div>
      )}
      {s.phase === 'game' && !customUI && (
        <div className="absolute top-4 left-4 flex items-center gap-2">
          <Link to="/" className="glass rounded-full px-4 py-2 text-sm flex items-center gap-2 hover:bg-card/80"><ArrowLeft className="w-4 h-4" />Home</Link>
          {s.zone && <div className="glass rounded-full px-4 py-2 text-sm flex items-center gap-2"><MapPin className="w-4 h-4 text-primary" />{s.zone}</div>}
        </div>
      )}
      <Profiler id="stage-ui" onRender={(id, ph, d) => engine?.prof.onReact(d)}>
        {s.phase === 'game' && engine?.studio && !customUI && <StageStudio engine={engine} s={s} open={studioOpen} setOpen={setStudioOpen} />}
        {s.phase === 'game' && engine && overlay?.({ engine, s, studioOpen, setStudioOpen })}
      </Profiler>
      {s.phase === 'game' && <Toasts notice={s.notice} />}
    </div>
  );
}