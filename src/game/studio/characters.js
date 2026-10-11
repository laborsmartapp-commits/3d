// Built-in character library (procedural humanoid rig). Each scene instance gets its own rig + animation state.
export const CHARACTERS = {
  krush: { name: 'Krush', colors: { skin: '#d8a88a', shirt: '#0f4f4a', pants: '#1e1b2e', hair: '#2b1b3a', accent: '#05ce91', cloak: '#3b1d5e', boots: '#1a1320' } },
  jay: { name: 'Jay', colors: { skin: '#8d5a3b', shirt: '#7a1f3d', pants: '#22304a', hair: '#120c0a', accent: '#f59e0b', cloak: '#1f2a44', boots: '#151515' } },
  nova: { name: 'Nova', colors: { skin: '#f0c8a8', shirt: '#4c1d95', pants: '#111827', hair: '#e5e7eb', accent: '#a855f7', cloak: '#312e81', boots: '#0f0f1a' } },
  rook: { name: 'Rook', colors: { skin: '#b07a55', shirt: '#334155', pants: '#3f2a1d', hair: '#3b2414', accent: '#38bdf8', cloak: '#1e293b', boots: '#1c1917' } },
};

// Schedulable body animations (procedural clips on the shared humanoid rig, no root motion).
export const ANIMATIONS = [['dance', 'Dance'], ['wave', 'Wave'], ['point', 'Point'], ['talk', 'Talk'], ['play', 'Cheer'], ['sit', 'Sit'], ['idle', 'Idle']];