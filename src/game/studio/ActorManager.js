import { Player } from '../actors/Player';
import { CHARACTERS } from './characters';
import { attachGlb } from './GlbAvatar';

import { krushModel } from './krushLooks';

// Krush's body model (replaces the built-in procedural figure everywhere he appears; chosen in Settings).
export const applyKrushModel = (p) => { if (!p.glbModel) p.ready = attachGlb(p, krushModel()).catch((err) => console.warn('Krush model failed to load', err)); };

// One Player instance (own transform, rig, animation state) per actor. e.player is only "who has the controls".
export class ActorManager {
  constructor(e) {
    this.e = e; this.base = e.player;
    Object.assign(e.player, { actorId: 'krush', charId: 'krush' });
    e.actors = { krush: e.player };
    // Krush only appears on stages where he is the playable character (his Living Realm) and no scene cast is loaded.
    this.keep = !!e.D?.showPlayer;
    if (!this.keep) { e.player.hidden = true; e.scene.remove(e.player.h.root); }
  }

  get list() { return Object.values(this.e.actors); }

  create(a) {
    const c = CHARACTERS[a.char] || CHARACTERS.jay, p0 = this.e.player;
    const x = a.x ?? p0.pos.x + 2, z = a.z ?? p0.pos.z + 1;
    const p = new Player(this.e, c.colors, { x, y: a.y ?? p0.pos.y, z, yaw: a.yaw ?? p0.yaw });
    Object.assign(p, { actorId: a.id, charId: a.char, assetUri: a.asset_uri || null });
    p.finish(0, false);
    const uri = a.asset_uri || (a.char === 'krush' ? krushModel() : null);
    if (uri) p.ready = attachGlb(p, uri).catch((err) => console.warn('Library character failed to load', err));
    this.e.actors[a.id] = p;
    return p;
  }

  // Make the scene's actor instances match the timeline's actor list.
  sync(actors) {
    const want = new Set(actors.map((a) => a.id));
    for (const [id, p] of Object.entries(this.e.actors)) {
      if (id === 'krush' || want.has(id)) continue;
      if (this.e.player === p) this.control('krush');
      this.e.scene.remove(p.h.root); delete this.e.actors[id];
    }
    for (const a of actors) if (!this.e.actors[a.id]) this.create(a);
    // The default walker only appears when the scene's cast includes it; otherwise it stays as an invisible free-roam body.
    this.base.hidden = !want.has('krush') && !(this.keep && !actors.length);
    // Not in the cast: take the default walker out of the scene entirely (no body, no shadow, no dust).
    if (this.base.hidden) this.e.scene.remove(this.base.h.root); else if (!this.base.h.root.parent) this.e.scene.add(this.base.h.root);
    if (this.e.player === this.base && !want.has('krush') && actors[0]) this.control(actors[0].id);
  }

  control(id) { const p = this.e.actors[id]; if (p) { p.vel.set(0, 0, 0); p.anim.layers = []; this.e.player = p; } }
}