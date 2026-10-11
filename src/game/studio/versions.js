// Stable asset/version references written into every take so a remote renderer can rebuild
// the exact scene without the recording browser. Bump when the matching system changes.
export const ENGINE_VERSION = 'celestia-realm@1.0.0';
export const MANIFEST_SCHEMA = 'krush.render.v2';
export const ACTOR_ASSETS = {
  krush: { avatar: 'zodiac-fury/krush', rig: 'celestia.humanoid', rig_version: 1, animation_set: 'celestia.humanoid.procedural', animation_version: 1 },
};

// Snapshot of the world as it stood when Record was pressed.
export function worldSnapshot(e) {
  const isl = e.island || {};
  return {
    world: 'celestia-grotto', engine_version: ENGINE_VERSION, layout: 'celestia.layout.v1',
    island: { id: isl.id, name: isl.name, owned_plots: isl.owned_plots || [], weather_pref: isl.weather_pref || 'auto' },
    structures: [...e.build.objects.values()].map(({ rec: r }) => ({ id: r.id, type: r.type, x: r.x, z: r.z, rotation: r.rotation || 0, scale: r.scale || 1, tier: r.tier || 1, plot_id: r.plot_id || null })),
  };
}