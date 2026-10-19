import { U } from '../core/shared';
import { NEUTRAL, clampState, combine, toggleCondition, fromInitial, fromLegacy, isLegacyWeather, sigOf, WX_KEYS } from './state';
import { SkyRig } from './SkyRig';
import { Precip, colliderCover } from './Precip';
import { Ambient } from './Ambient';
import { Surfaces } from './Surfaces';

const KEY = (id) => `mation.weather.${id}`;
const readLocal = (id) => { try { return JSON.parse(localStorage.getItem(KEY(id)) || 'null'); } catch { return null; } };

// One manual weather + natural-environment system shared by every stage. Time of day and weather
// stay exactly as the director sets them: nothing here advances, cycles or randomises the state.
export class WeatherSystem {
  constructor(e, { stageId, initial, fog, covered } = {}) {
    this.e = e; this.stageId = stageId; this.locked = false; this.known = new Map(); this.dirtyHud = true;
    const cover = covered || colliderCover(e);
    this.s = clampState({ ...NEUTRAL, ...fromInitial(initial), ...(readLocal(stageId) || {}) });
    this.sky = new SkyRig(e, fog);
    this.precip = new Precip(e, cover);
    this.ambient = new Ambient(e);
    this.surfaces = new Surfaces(e, cover);
    this.changed(false);
  }

  get sig() { return this._sig; }
  get night() { return this.sky.night; }
  // Changes are refused while locked, while a take records and while a take plays back.
  get blocked() {
    if (this.locked) return 'The environment is locked';
    const st = this.e.studio?.status;
    if (st === 'capturing' || st === 'uploading') return 'Recording in progress';
    if (st === 'playing' || st === 'loading') return 'A take is playing back';
    return '';
  }
  guard() { const b = this.blocked; if (b) this.e.notify?.(`${b}, so the weather can't change right now.`); return !b; }

  set(patch) {
    if (!this.guard()) return false;
    const custom = Object.keys(patch).some((k) => WX_KEYS.includes(k));
    this.s = clampState({ ...this.s, ...patch, custom: custom || this.s.custom });
    this.changed(); return true;
  }
  toggleCondition(k) {
    if (!this.guard()) return false;
    const list = toggleCondition(this.s.conditions, k);
    this.s = clampState({ ...this.s, conditions: list, custom: false, ...combine(list) });
    this.changed(); return true;
  }
  load(state, force = false) {
    if (!state || (!force && !this.guard())) return false;
    this.s = clampState({ ...NEUTRAL, ...state }); this.changed(); return true;
  }
  reset() { return this.load(NEUTRAL); }
  setLock(on) { if (this.locked === !!on) return; this.locked = !!on; this.dirtyHud = true; this.e.studio?.dirty?.(); }
  save() { return { ...this.s }; }

  // Exact reproduction of a recorded environment (takes store a signature per sample + the full start state).
  remember(state) { if (state?.conditions) { const s = clampState(state); this.known.set(sigOf(s), s); } }
  applyEnv(x) {
    if (!x) return;
    let next = null;
    if (x.conditions) next = clampState(x);
    else if (isLegacyWeather(x.weather)) next = fromLegacy(x.hour, x.weather, this.s);
    else if (x.w && this.known.has(x.w)) next = this.known.get(x.w);
    else if (isLegacyWeather(x.w)) next = fromLegacy(x.h, x.w, this.s);
    if (!next || sigOf(next) === this._sig) return;
    this.s = next; this.changed(false);
  }

  changed(persist = true) {
    this._sig = sigOf(this.s); this.dirtyHud = true;
    this.known.set(this._sig, this.s);
    if (persist) { try { localStorage.setItem(KEY(this.stageId), JSON.stringify(this.s)); } catch { /* storage full */ } this.e.studio?.dirty?.(); }
  }
  hud() { return { ...this.s, sig: this._sig, locked: this.locked, surfaces: this.surfaces.supported }; }

  camera() { const st = this.e.studio; return ((st?.busy || st?.active) && st.outputCam?.()) || this.e.camera; }
  update(dt) {
    const s = this.s, cam = this.camera();
    this.sky.update(s, dt, cam);
    U.wind.value = (0.1 + s.wind * 1.1) * s.vegetation * 2; U.night.value = this.sky.night;
    this.precip.update(s, dt, cam);
    this.ambient.update(s, dt, cam, this.sky.night);
    this.surfaces.update(s);
    if (this.dirtyHud) { this.dirtyHud = false; this.e.emit?.({ weather: this.hud() }); }
  }
}