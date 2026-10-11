// Cloud output settings. These never touch the local viewport — they travel in the render manifest.
export const RESOLUTIONS = { '1080p': { w: 1920, h: 1080 }, '1440p': { w: 2560, h: 1440 }, '4k': { w: 3840, h: 2160 } };
export const PRESETS = {
  standard: { label: 'Standard', engineQuality: 'high', shadowMap: 2048, msaa: 4, supersample: 1 },
  high: { label: 'High', engineQuality: 'ultra', shadowMap: 4096, msaa: 4, supersample: 1 },
  ultra: { label: 'Ultra', engineQuality: 'ultra', shadowMap: 4096, msaa: 8, supersample: 1.5 },
  maximum: { label: 'Maximum', engineQuality: 'ultra', shadowMap: 8192, msaa: 8, supersample: 2, maxLights: 12, drawDistance: 'max' },
};
export const FRAME_RATES = [24, 30, 60];
export const LOCAL_QUALITY = ['low', 'medium', 'high', 'auto'];
export const defaultCloud = () => ({ resolution: '1080p', preset: 'high', fps: 30 });
export const cloudLabel = (c) => `${c.resolution === '4k' ? '4K' : c.resolution} · ${PRESETS[c.preset]?.label} · ${c.fps} fps`;