// Studio roles. Legacy 'user' accounts behave as viewers.
export const ROLES = ['admin', 'director', 'animator', 'editor', 'viewer', 'user'];
export const canSubmitRender = (u) => ['admin', 'director'].includes(u?.role);
export const isAdmin = (u) => u?.role === 'admin';

export const SETTINGS_DEFAULTS = { default_fps: 30, max_scene_duration: 600, max_active_renders_per_user: 3, default_render_resolution: '1080p', default_render_preset: 'high' };
export async function loadSettings(svc) {
  const r = await svc.AppSettings.filter({ key: 'studio' });
  return { ...SETTINGS_DEFAULTS, ...((r.items || r)[0] || {}) };
}