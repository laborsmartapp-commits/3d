import { useEffect } from 'react';
import { base44 } from '@/api/base44Client';

// Shared per-stage wiring: server-checked admin role (?sceneDiag=1 only works for admins)
// and deep links (?studioTake=<id>&do=play|preview&res=720p) from the cross-stage library.
export default function useStageStudio(engine, phase, onOpenStudio) {
  useEffect(() => {
    if (!engine) return;
    base44.auth.me().then((u) => {
      engine.isAdmin = u?.role === 'admin'; engine.adminEmail = engine.isAdmin ? u.email : null;
    }).catch(() => { engine.isAdmin = false; });
  }, [engine]);

  useEffect(() => {
    if (phase !== 'game' || !engine?.studio) return;
    const q = new URLSearchParams(window.location.search), id = q.get('studioTake'), act = q.get('do');
    const diag = q.get('sceneDiag') === '1';
    if (!id && !diag) return;
    window.history.replaceState(null, '', window.location.pathname);
    base44.auth.me().then(async (u) => {
      if (diag && u?.role === 'admin') { engine.isAdmin = true; engine.diag.setEnabled(true); }
      if (!id) return;
      const take = await base44.entities.SceneTake.get(id);
      onOpenStudio?.();
      if (act === 'preview') engine.studio.generatePreview(take, q.get('res') || '720p'); else engine.studio.playTake(take);
    });
  }, [phase, engine]);
}