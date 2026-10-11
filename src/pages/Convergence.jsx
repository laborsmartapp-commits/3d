import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, MapPin } from 'lucide-react';
import { ConvergenceEngine } from '@/game/convergence/ConvergenceEngine';
import Toasts from '@/components/game/Toasts';

export default function Convergence() {
  const [mount, setMount] = useState(null);
  const [s, setS] = useState({ phase: 'loading', progress: 0, step: 'Preparing' });

  useEffect(() => {
    if (!mount) return;
    const e = new ConvergenceEngine(mount, setS);
    e.init();
    return () => e.dispose();
  }, [mount]);

  return (
    <div className="fixed inset-0 overflow-hidden bg-background text-foreground select-none font-body">
      <div ref={setMount} className="absolute inset-0" />
      {s.phase !== 'game' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-background">
          <h1 className="font-heading text-3xl tracking-wide">The Convergence</h1>
          <div className="w-64 h-1.5 rounded-full bg-white/10 overflow-hidden"><div className="h-full bg-primary transition-all" style={{ width: `${s.progress}%` }} /></div>
          <p className="text-sm text-muted-foreground">{s.step}</p>
        </div>
      )}
      {s.phase === 'game' && (
        <div className="absolute top-4 left-4 flex items-center gap-2">
          <Link to="/" className="glass rounded-full px-4 py-2 text-sm flex items-center gap-2 hover:bg-card/80"><ArrowLeft className="w-4 h-4" />Realm</Link>
          {s.zone && <div className="glass rounded-full px-4 py-2 text-sm flex items-center gap-2"><MapPin className="w-4 h-4 text-primary" />{s.zone}</div>}
        </div>
      )}
      {s.phase === 'game' && <Toasts notice={s.notice} />}
    </div>
  );
}