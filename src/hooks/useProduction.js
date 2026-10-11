import { useCallback, useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { defaultCloud } from '@/game/studio/quality';

const E = base44.entities;

// Loads one production with its scenes (ordered by scene_ids), shots and takes, and exposes the edit actions.
export default function useProduction(id) {
  const [d, setD] = useState(null);
  const load = useCallback(async () => {
    const p = await E.Production.get(id).catch(() => null);
    if (!p) return setD({ missing: true });
    const ids = p.scene_ids || [];
    const [scenes, shots, takes] = ids.length ? await Promise.all([
      E.StudioScene.filter({ id: { $in: ids } }, { limit: 100 }),
      E.Shot.filter({ production_id: id }, { sort: 'order', limit: 500 }),
      E.SceneTake.filter({ scene_id: { $in: ids } }, { sort: 'take_number', limit: 200, fields: ['name', 'take_number', 'scene_id', 'status', 'duration'] }),
    ]).then((r) => r.map((x) => x.items)) : [[], [], []];
    setD({ p, scenes: ids.map((s) => scenes.find((x) => x.id === s)).filter(Boolean), shots, takes });
  }, [id]);
  useEffect(() => { load(); }, [load]);

  const run = async (fn) => { await fn(); await load(); };
  const p = d?.p;
  const setScenes = (ids) => E.Production.update(p.id, { scene_ids: ids });
  const cloud = () => ({ ...defaultCloud(), resolution: p.resolution, fps: p.fps });

  return {
    d, load,
    newScene: (name, world) => run(async () => { const s = await E.StudioScene.create({ name, world, cameras: [], cloud_settings: cloud(), take_count: 0 }); await setScenes([...(p.scene_ids || []), s.id]); }),
    linkScene: (sid) => run(() => setScenes([...(p.scene_ids || []), sid])),
    renameScene: (s, name) => run(() => E.StudioScene.update(s.id, { name })),
    moveScene: (s, dir) => run(() => { const ids = [...p.scene_ids], i = ids.indexOf(s.id); [ids[i], ids[i + dir]] = [ids[i + dir], ids[i]]; return setScenes(ids); }),
    duplicateScene: (s) => run(async () => {
      const c = await E.StudioScene.create({ name: `${s.name} (Copy)`, world: s.world, location: s.location, island_id: s.island_id, cameras: s.cameras, selected_camera_id: s.selected_camera_id, timeline: s.timeline, cloud_settings: s.cloud_settings, local_quality: s.local_quality, take_count: 0 });
      const own = d.shots.filter((x) => x.scene_id === s.id);
      if (own.length) await E.Shot.bulkCreate(own.map(({ name, order, camera_id, start_t, end_t, notes }) => ({ production_id: p.id, scene_id: c.id, name, order, camera_id, start_t, end_t, notes })));
      const ids = [...p.scene_ids]; ids.splice(ids.indexOf(s.id) + 1, 0, c.id); await setScenes(ids);
    }),
    // Removing a scene from a production keeps the scene, its takes and renders; only this production's shots go.
    removeScene: (s) => run(async () => { await E.Shot.deleteMany({ production_id: p.id, scene_id: s.id }); await setScenes(p.scene_ids.filter((x) => x !== s.id)); }),
    saveShot: (scene, shot, f) => run(() => (shot?.id ? E.Shot.update(shot.id, f) : E.Shot.create({ ...f, production_id: p.id, scene_id: scene.id, order: d.shots.filter((x) => x.scene_id === scene.id).length }))),
    moveShot: (list, i, dir) => run(() => E.Shot.bulkUpdate([{ id: list[i].id, order: list[i + dir].order }, { id: list[i + dir].id, order: list[i].order }])),
    duplicateShot: (s, n) => run(() => E.Shot.create({ production_id: s.production_id, scene_id: s.scene_id, name: `${s.name} (Copy)`, order: n, camera_id: s.camera_id, start_t: s.start_t, end_t: s.end_t, notes: s.notes })),
    deleteShot: (s) => run(() => E.Shot.delete(s.id)),
  };
}