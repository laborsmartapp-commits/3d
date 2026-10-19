import { U } from '../core/shared';
import { SkyRig } from './SkyRig';
import { Precip } from './Precip';
import { Ambient } from './Ambient';
import { Surfaces } from './Surfaces';

// Rendering adapter for stages on the street-level engine (Convergence, Star Square, Living Realm, generated stages).
export function streetRender(e, { fog, cover }) {
  const sky = new SkyRig(e, fog), precip = new Precip(e, cover), ambient = new Ambient(e), surfaces = new Surfaces(e, cover);
  return {
    get night() { return sky.night; },
    get surfaces() { return surfaces.supported; },
    update(s, dt, cam) {
      sky.update(s, dt, cam);
      U.wind.value = (0.1 + s.wind * 1.1) * s.vegetation * 2; U.night.value = sky.night;
      precip.update(s, dt, cam);
      ambient.update(s, dt, cam, sky.night);
      surfaces.update(s);
    },
  };
}