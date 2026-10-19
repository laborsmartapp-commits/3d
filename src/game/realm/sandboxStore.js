// Development sandbox for saved sets: same API as the RealmSet entity, stored in this browser only.
// Enabled with ?sandbox=1 in development builds, so save/reload can be exercised on a branch without
// touching live data. It is NOT database persistence and the HUD labels it as such.
const KEY = 'realm-sandbox-sets';
const read = () => JSON.parse(localStorage.getItem(KEY) || '[]');
const write = (l) => localStorage.setItem(KEY, JSON.stringify(l));
const now = () => new Date().toISOString();
const copy = (r) => (r ? JSON.parse(JSON.stringify(r)) : r);

// Read when the realm is built (not at module load), so arriving at ?sandbox=1 via in-app navigation counts.
export const sandboxOn = () => import.meta.env.DEV && new URLSearchParams(window.location.search).has('sandbox');
export const sandboxSets = {
  async filter() { return { items: read().sort((a, b) => b.updated_date.localeCompare(a.updated_date)).map(copy) }; },
  async get(id) { return copy(read().find((x) => x.id === id)); },
  async create(d) { const r = { ...copy(d), id: `sbx_${Math.random().toString(36).slice(2, 10)}`, created_date: now(), updated_date: now() }; write([r, ...read()]); return copy(r); },
  async update(id, d) { const l = read(), r = l.find((x) => x.id === id); if (!r) throw new Error('Sandbox set not found'); Object.assign(r, copy(d), { updated_date: now() }); write(l); return copy(r); },
  async delete(id) { write(read().filter((x) => x.id !== id)); },
};