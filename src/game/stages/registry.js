// Every 3D stage the Scene Manager can film. New stages register here (id, name, route).
export const STAGES = {
  'celestia-grotto': { id: 'celestia-grotto', name: 'Celestia Grotto', path: '/world' },
  convergence: { id: 'convergence', name: 'The Convergence', path: '/convergence' },
};

export const stageInfo = (id) => STAGES[id || 'celestia-grotto'] || { id, name: id, path: '/' };
export const takeStage = (take) => take.world || 'celestia-grotto';