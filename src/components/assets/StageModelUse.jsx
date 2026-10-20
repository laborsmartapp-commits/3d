import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Input } from '@/components/ui/input';
import { CATALOG } from '@/game/realm/catalog';

const list = (s) => s.split(',').map((x) => x.trim()).filter(Boolean);

// Binds an object model to catalog furnishing types: generated stages then show it in place of the primitive piece,
// keeping the piece's id, placement, collision, seats and saved layouts.
export default function StageModelUse({ asset, onChanged }) {
  const [types, setTypes] = useState((asset.stage_types || []).join(', ')), [tags, setTags] = useState((asset.semantic_tags || []).join(', ')), [busy, setBusy] = useState(false);
  const unknown = list(types).filter((t) => !CATALOG[t]);
  const save = async () => { setBusy(true); await base44.entities.Asset.update(asset.id, { stage_types: list(types).filter((t) => CATALOG[t]), semantic_tags: list(tags) }); setBusy(false); onChanged(); };
  return (
    <div className="space-y-2">
      <label className="block text-xs text-muted-foreground">Stands in for furnishing types (comma separated)
        <Input list="stage-catalog-types" value={types} onChange={(e) => setTypes(e.target.value)} placeholder="sofa_sectional, armchair" className="mt-1" />
      </label>
      <datalist id="stage-catalog-types">{Object.keys(CATALOG).map((k) => <option key={k} value={k} />)}</datalist>
      {unknown.length > 0 && <p className="text-xs text-ember">Not catalog types (ignored): {unknown.join(', ')}</p>}
      <label className="block text-xs text-muted-foreground">Style / property tags
        <Input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="velvet, luxury, mid-century" className="mt-1" />
      </label>
      <button onClick={save} disabled={busy} className="rounded-lg px-3 py-1.5 text-xs bg-primary text-primary-foreground disabled:opacity-60">{busy ? 'Saving…' : 'Save Stage Creator use'}</button>
    </div>
  );
}