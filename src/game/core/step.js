export const MAX_STEPS = 20;

// Fixed sub-steps (≤50 ms) over the real frame time, so movement distance doesn't depend on FPS.
export function stepPlayer(e, raw, inp, fp, frozen) {
  const n = Math.min(MAX_STEPS, Math.max(1, Math.ceil(raw / 0.05 - 1e-6))), h = raw / n;
  for (let i = 0; i < n; i++) e.player.update(h, i ? { ...inp, jump: false, interact: false } : inp, e.rig.yaw, fp, frozen);
  return n;
}