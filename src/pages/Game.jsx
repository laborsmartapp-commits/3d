import React, { useEffect, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { Engine } from '@/game/Engine';
import LoadingScreen from '@/components/game/LoadingScreen';
import HUD from '@/components/game/HUD';
import Toasts from '@/components/game/Toasts';
import PhotoPanel from '@/components/game/PhotoPanel';
import DiagOverlay from '@/components/diag/DiagOverlay';
import { base44 } from '@/api/base44Client';

export default function Game() {
  const [mount, setMount] = useState(null);
  const [engine, setEngine] = useState(null);
  const [s, setS] = useState({ phase: 'loading', progress: 0, step: 'Preparing' });
  const [panel, setPanel] = useState(null);
  const [hideUI, setHideUI] = useState(false);

  useEffect(() => {
    if (!mount) return;
    const onPanel = (p) => setPanel((cur) => (p === 'toggle-dev' ? (cur === 'dev' ? null : 'dev') : p));
    const e = new Engine(mount, setS, onPanel);
    setEngine(e);
    window.__celestia = e;
    e.init();
    return () => e.dispose();
  }, [mount]);

  // Admin check via the server-issued session; ?sceneDiag=1 only takes effect for admins.
  useEffect(() => {
    if (!engine) return;
    base44.auth.me().then((u) => {
      engine.isAdmin = u?.role === 'admin'; engine.adminEmail = engine.isAdmin ? u.email : null;
      engine.wantDiag = engine.isAdmin && new URLSearchParams(window.location.search).get('sceneDiag') === '1';
    }).catch(() => { engine.isAdmin = false; });
  }, [engine]);
  useEffect(() => {
    if (s.phase !== 'game' || !engine?.wantDiag) return;
    engine.wantDiag = false; engine.diag.setEnabled(true);
  }, [s.phase, engine, engine?.wantDiag]);

  useEffect(() => { if (engine) engine.devOpen = panel === 'dev'; }, [panel, engine]);
  useEffect(() => { engine?.studio?.open(panel === 'studio'); }, [panel, engine, s.phase]);

  const playing = s.phase === 'game';
  const photoHidden = s.mode === 'photo' && hideUI;

  return (
    <div className="fixed inset-0 overflow-hidden bg-background text-foreground select-none font-body">
      <div ref={setMount} className="absolute inset-0" />
      <AnimatePresence>
        {(s.phase === 'loading' || s.phase === 'ready') && <LoadingScreen key="loading" s={s} onEnter={() => engine.start()} />}
      </AnimatePresence>
      {s.phase === 'intro' && (
        <button onClick={() => engine.skipIntro()} className="absolute bottom-8 right-8 glass rounded-full px-5 py-2 text-sm font-medium hover:bg-card/80">
          Skip intro
        </button>
      )}
      <div className={`absolute inset-0 bg-background pointer-events-none transition-opacity duration-500 ${s.fade ? 'opacity-100' : 'opacity-0'}`} />
      {playing && !s.cine && !photoHidden && <HUD engine={engine} s={s} panel={panel} setPanel={setPanel} />}
      {playing && s.mode === 'photo' && !s.cine && <PhotoPanel engine={engine} s={s} hideUI={hideUI} setHideUI={setHideUI} />}
      {playing && s.diag && <DiagOverlay engine={engine} />}
      {playing && <Toasts notice={s.notice} discovery={s.discovery} />}
    </div>
  );
}