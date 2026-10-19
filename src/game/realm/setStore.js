import { base44 } from '@/api/base44Client';
import { TEMPLATES, buildTemplate } from './templates';
import { sandboxOn, sandboxSets } from './sandboxStore';

const REALM = 'living-realm';

// Named set versions persisted as RealmSet records: objects + environment + camera view settings.
export class SetStore {
  constructor(R) { Object.assign(this, { R, list: [], current: null, dirty: false, saving: false, error: '', loaded: false, sandbox: sandboxOn() }); }
  get api() { return this.sandbox ? sandboxSets : base44.entities.RealmSet; }
  // A generated stage supplies its own realm id and base set (its blueprint furnishings).
  get realm() { return this.R.realmId || REALM; }
  base() { return this.R.baseSet ? this.R.baseSet() : buildTemplate('everyday'); }
  payload() { return { objects: this.R.set.serialize(), environment: this.R.env.save(), view: this.R.cutaway.save(), object_count: this.R.set.items.size }; }
  applyData(d) {
    const P = this.R.e.prof, n = (d.objects || []).length, sync = (k, fn) => (P ? P.sync(`set apply (${n} objects): ${k}`, fn) : fn());
    sync('objects', () => this.R.set.load(d.objects || [])); sync('environment', () => this.R.env.load(d.environment));
    sync('view', () => this.R.cutaway.load(d.view)); sync('history', () => this.R.editor.reset_history());
    this.dirty = false; this.R.emit();
  }
  applySnapshot(s) { this.R.set.load(s.objects || []); this.R.env.load(s.environment); this.R.cutaway.load(s.view); this.loaded = true; }
  markDirty() { this.dirty = true; this.R.emit(); }
  async init() {
    this.applyData(this.base());
    try {
      const page = await this.api.filter({ realm: this.realm }, { sort: '-updated_date', limit: 50 });
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
  async deactivate() { if (this.current?.id) { await this.api.update(this.current.id, { is_active: false }); this.current.is_active = false; } }
  save() {
    return this.run(async () => {
      const data = this.payload();
      if (this.current) { await this.api.update(this.current.id, data); Object.assign(this.current, data); }
      else { this.current = await this.api.create({ realm: this.realm, name: this.R.baseName || TEMPLATES.everyday.name, template: this.R.realmId ? 'custom' : 'everyday', is_active: true, ...data }); this.list.unshift(this.current); }
      this.dirty = false;
    });
  }
  saveAs(name) {
    return this.run(async () => {
      const data = this.payload();
      await this.deactivate();
      const rec = await this.api.create({ realm: this.realm, name: name || 'New Set', template: 'custom', is_active: true, ...data });
      this.list.unshift(rec); this.current = rec; this.dirty = false;
    });
  }
  fromTemplate(key) {
    return this.run(async () => {
      const t = buildTemplate(key);
      this.applyData(t);
      await this.deactivate();
      const rec = await this.api.create({ realm: this.realm, name: TEMPLATES[key].name, template: key, is_active: true, ...this.payload() });
      this.list.unshift(rec); this.current = rec; this.dirty = false;
    });
  }
  activate(id) {
    return this.run(async () => {
      if (this.current?.id !== id) await this.deactivate();
      await this.api.update(id, { is_active: true });
      const rec = await this.api.get(id);
      this.list = this.list.map((x) => (x.id === id ? rec : x)); this.current = rec; this.applyData(rec);
    });
  }
  rename(id, name) { return this.run(async () => { await this.api.update(id, { name }); const r = this.list.find((x) => x.id === id); if (r) r.name = name; if (this.current?.id === id) this.current.name = name; }); }
  remove(id) { if (id === this.current?.id) return; return this.run(async () => { await this.api.delete(id); this.list = this.list.filter((x) => x.id !== id); }); }
  revert() { if (this.current) this.applyData(this.current); else this.applyData(this.base()); }
}