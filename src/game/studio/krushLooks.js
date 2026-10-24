import { attachGlb } from './GlbAvatar';

// Krush's body models. Both ship their own 4K texture set and walk cycle.
export const KRUSH_LOOKS = {
  hoodie: { label: 'KrushHoodie', uri: 'https://media.base44.com/files/public/6ab6497ea34096d474396b48/c5ef74931_KrushHoodie.glb' },
  undies: { label: 'KrushUndies', uri: 'https://media.base44.com/files/public/6ab6497ea34096d474396b48/f25420f7c_KrundiesWalk.glb' },
};
const KEY = 'krush_look';
export const krushLook = () => (KRUSH_LOOKS[localStorage.getItem(KEY)] ? localStorage.getItem(KEY) : 'hoodie');
export const krushModel = () => KRUSH_LOOKS[krushLook()].uri;

// Saves the choice and re-dresses every Krush currently in the scene.
export function setKrushLook(engine, look) {
  localStorage.setItem(KEY, look);
  const actors = Object.values(engine?.actors || (engine?.player ? { krush: engine.player } : {}));
  for (const p of actors) if (p.charId === 'krush' && !p.assetUri) p.ready = attachGlb(p, KRUSH_LOOKS[look].uri).catch((err) => console.warn('Krush model failed to load', err));
}