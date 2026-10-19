import { Precip } from './Precip';
import { Ambient } from './Ambient';

// Rendering adapter for Celestia Grotto: the island keeps its own sky, sea, rain and lighting rig,
// but every value comes from the shared manual weather state. Snow, fireflies, leaves and dust are shared.
export function celestiaRender(e, { cover }) {
  const precip = new Precip(e, cover), ambient = new Ambient(e);
  precip.rainOn = false; // the island's own rain particles already draw rain
  return {
    get night() { return e.env.night; },
    surfaces: false,
    update(s, dt, cam) {
      e.env.manual(s);
      e.env.update(dt);
      precip.update(s, dt, cam);
      ambient.update(s, dt, cam, e.env.night);
    },
  };
}