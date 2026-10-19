// Every 3D stage the Scene Manager can film. New stages register here (id, name, route).
export const STAGES = {
  'celestia-grotto': { id: 'celestia-grotto', name: 'Celestia Grotto', path: '/world' },
  convergence: { id: 'convergence', name: 'The Convergence', path: '/convergence' },
  'star-square': { id: 'star-square', name: 'Star Square', path: '/star-square' },
  'living-realm': { id: 'living-realm', name: "Krush's Living Realm", path: '/living-realm' },
};

// Generated stages are "gen-<root id>" and open their latest version.
export const stageInfo = (id) => STAGES[id || 'celestia-grotto'] || (id?.startsWith('gen-') ? { id, name: 'Generated Stage', path: `/stage/${id.slice(4)}?latest=1` } : { id, name: id, path: '/' });
export const takeStage = (take) => take.world || 'celestia-grotto';