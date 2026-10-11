export const CATEGORIES = {
  character: { label: 'Characters', subs: ['rigged', 'variant', 'costume', 'facial rig'], accept: '.glb,.gltf' },
  object: { label: 'Objects', subs: ['furniture', 'prop', 'vehicle', 'building', 'decoration', 'environment'], accept: '.glb,.gltf' },
  animation: { label: 'Animations', subs: ['dance', 'walk', 'run', 'gesture', 'facial', 'custom'], accept: '.glb,.gltf,.fbx,.bvh' },
  audio: { label: 'Audio', subs: ['song', 'dialogue', 'sfx', 'ambient'], accept: '.mp3,.wav,.ogg,.m4a' },
  texture: { label: 'Textures', subs: ['texture', 'material'], accept: '.png,.jpg,.jpeg,.webp,.ktx2' },
};

export const extOf = (name) => (name.split('.').pop() || '').toLowerCase();
export const fmtSize = (b) => (!b ? '—' : b > 1e9 ? `${(b / 1e9).toFixed(2)} GB` : b > 1e6 ? `${(b / 1e6).toFixed(1)} MB` : `${Math.round(b / 1e3)} KB`);
export const isModel = (f) => ['glb', 'gltf'].includes(f);
export const isImage = (f) => ['png', 'jpg', 'jpeg', 'webp'].includes(f);
export const isAudio = (f) => ['mp3', 'wav', 'ogg', 'm4a'].includes(f);