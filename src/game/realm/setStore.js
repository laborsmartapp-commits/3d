import { base44 } from '@/api/base44Client';
import { TEMPLATES, buildTemplate } from './templates';
import { SANDBOX, sandboxSets } from './sandboxStore';

const E = () => (SANDBOX ? sandboxSets : base44.entities.RealmSet), REALM = 'living-realm';

// Named set versions persisted as RealmSet records: objects + environment + camera view settings.
export class SetStore {
  constructor(R) { Object.assign(this, { R, list: [], current: null, dirty: false, saving: false, error: '', loaded: false }); }
  payload() { return { objects: this.R.set.serialize(), environment: this.R.env.save(), view: this.R.cutaway.save(), object_count: this.R.set.items.size }; }
  applyData(d) { this.R.set.load(d.objects || []); this.R.env.load(d.environment); this.R.cutaway.load(d.view); this.R.editor.reset_history(); this.dirty = false; this.R.emit(); }
  applySnapshot(s) { this.R.set.load(s.objects || []); this.R.env.load(s.environment); this.R.cutaway.load(s.view); this.loaded = true; }
  markDirty() { this.dirty = true; this.R.emit(); }
  async init() {
    this.applyData(buildTemplate('everyday'));
    try {
      const page = await E().filter({ realm: REALM }, { sort: '-updated_date', limit: 50 });
      this.list = page.items;
      const act = this.list.find((x) => x.is_active) || this.list[0];
      if (act) { this.current = act; this.applyData(act); }
    } catch (err) { this.error = `Could not load saved sets: ${err.message}`; }
    this.loaded = true; this.R.emit();
  }
  async run(fn) {
    if (this.saving) return; this.saving = true; this.error = ''; this.R.emit();
    try { await fn(); } catch (err) { this.error = err.message; }
    this.saving = false; this.R.emit();
  }
  async deactivate() { if (this.current?.id) { await E().update(this.current.id, { is_active: false }); this.current.is_active = false; } }
  save() {
    return this.run(async () => {
      const data = this.payload();
      if (this.current) { await E().update(this.current.id, data); Object.assign(this.current, data); }
      else { this.current = await E().create({ realm: REALM, name: TEMPLATES.everyday.name, template: 'everyday', is_active: true, ...data }); this.list.unshift(this.current); }
      this.dirty = false;
    });
  }
  saveAs(name) {
    return this.run(async () => {
      const data = this.payload();
      await this.deactivate();
      const rec = await E().create({ realm: REALM, name: name || 'New Set', template: 'custom', is_active: true, ...data });
      this.list.unshift(rec); this.current = rec; this.dirty = false;
    });
  }
  fromTemplate(key) {
    return this.run(async () => {
      const t = buildTemplate(key);
      this.applyData(t);
      await this.deactivate();
      const rec = await E().create({ realm: REALM, name: TEMPLATES[key].name, template: key, is_active: true, ...this.payload() });
      this.list.unshift(rec); this.current = rec; this.dirty = false;
    });
  }
  activate(id) {
    return this.run(async () => {
      if (this.current?.id !== id) await this.deactivate();
      await E().update(id, { is_active: true });
      const rec = await E().get(id);
      this.list = this.list.map((x) => (x.id === id ? rec : x)); this.current = rec; this.applyData(rec);
    });
  }
  rename(id, name) { return this.run(async () => { await E().update(id, { name }); const r = this.list.find((x) => x.id === id); if (r) r.name = name; }); }
  remove(id) { if (id === this.current?.id) return; return this.run(async () => { await E().delete(id); this.list = this.list.filter((x) => x.id !== id); }); }
  revert() { if (this.current) this.applyData(this.current); else this.applyData(buildTemplate('everyday')); }
}