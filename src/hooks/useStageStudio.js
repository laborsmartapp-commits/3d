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
    const diag = q.get('sceneDiag') === '1', sceneId = q.get('studioScene'), shotId = q.get('shot');
    if (!id && !diag && !sceneId) return;
    window.history.replaceState(null, '', window.location.pathname);
    base44.auth.me().then(async (u) => {
      if (diag && u?.role === 'admin') { engine.isAdmin = true; engine.diag.setEnabled(true); }
      if (sceneId) { // restore the exact scene (timeline, actors, cameras) and the shot's camera from the Production Manager
        const scene = await base44.entities.StudioScene.get(sceneId);
        onOpenStudio?.(); engine.studio.open(true); engine.studio.openScene(scene);
        const shot = shotId ? await base44.entities.Shot.get(shotId).catch(() => null) : null;
        if (shot?.camera_id && engine.studio.cams.get(shot.camera_id)) engine.studio.selectCamera(shot.camera_id);
        if (shot?.start_t) engine.studio.dir.t = shot.start_t;
      }
      if (!id) return;
      const take = await base44.entities.SceneTake.get(id);
      onOpenStudio?.();
      if (act === 'preview') engine.studio.generatePreview(take, q.get('res') || '720p'); else engine.studio.playTake(take);
    });
  }, [phase, engine]);
}