import { base44 } from '@/api/base44Client';
import { stageInfo } from '@/game/stages/registry';

// Deep links into Director Mode. The stage page reads ?studioScene / ?shot and restores that exact scene + shot camera.
export const directorUrl = (stageId, sceneId, shotId) =>
  `${stageInfo(stageId).path}?studioScene=${sceneId}${shotId ? `&shot=${shotId}` : ''}`;

export const continueUrl = (p) => (p.last_scene_id ? directorUrl(p.stage_id, p.last_scene_id, p.last_shot_id) : `/productions/${p.id}`);

export async function openInDirector(production, scene, shot) {
  await base44.entities.Production.update(production.id, { last_scene_id: scene.id, last_shot_id: shot?.id || '', last_opened_at: new Date().toISOString() });
  window.location.href = directorUrl(scene.world || production.stage_id, scene.id, shot?.id);
}

export const playTakeUrl = (take) => `${stageInfo(take.world).path}?studioTake=${take.id}&do=play`;

export const adminLog = (log_action, target_type, target_id, meta) =>
  base44.functions.invoke('adminApi', { action: 'log', log_action, target_type, target_id, meta }).catch(() => {});