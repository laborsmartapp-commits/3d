import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, Loader2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { DEV_TOOLS } from '@/game/realm/modelPrep';
import { DEV_MODELS } from '@/game/realm/devModels';

const TEST = DEV_TOOLS ? DEV_MODELS : [];

// Swap a piece's visual for an imported GLB/GLTF while it keeps its placement, saved slot and interaction points.
export default function ModelUpgrade({ ed, o }) {
  const [assets, setAssets] = useState(null), [all, setAll] = useState(false);
  useEffect(() => { base44.entities.Asset.filter({ category: 'object', status: 'active' }, { sort: '-created_date', limit: 100 }).then((p) => setAssets(p.items)).catch(() => setAssets([])); }, []);
  const pick = (id) => { const a = [...(assets || []), ...TEST].find((x) => x.id === id); if (a) ed.setModel(a, all); };
  const any = assets?.length || TEST.length;
  return (
    <div className="rounded-xl bg-white/5 p-3 space-y-2">
      <p className="text-xs font-semibold flex items-center gap-1.5"><Sparkles className="w-3.5 h-3.5 text-accent" />Visual model</p>
      <p className="text-[11px] text-muted-foreground">{o.model_name ? `Using imported model “${o.model_name}”.` : 'Using the built-in piece.'} Position, rotation, scale and interaction points stay the same.</p>
      {o.loading && <p className="text-[11px] text-primary flex items-center gap-1.5"><Loader2 className="w-3 h-3 animate-spin" />Loading model… the original piece shows until it is ready.</p>}
      {o.error && <p className="text-[11px] text-destructive">{o.error}</p>}
      {assets === null ? <p className="text-[11px] text-quiet">Loading models…</p> : any ? (
        <select value={o.model_asset_id || ''} onChange={(e) => pick(e.target.value)} className="w-full rounded-md bg-white/5 border border-white/10 px-1.5 py-1 text-xs">
          <option value="" disabled className="bg-card">Choose an imported model…</option>
          {assets.map((a) => <option key={a.id} value={a.id} className="bg-card">{a.name}{a.version > 1 ? ` (v${a.version})` : ''}</option>)}
          {TEST.length > 0 && <optgroup label="Development test models" className="bg-card">{TEST.map((a) => <option key={a.id} value={a.id} className="bg-card">{a.name}</option>)}</optgroup>}
        </select>
      ) : <p className="text-[11px] text-foreground/80">Upload .glb/.gltf files as “Objects” in the <Link to="/assets" className="text-primary underline">Asset Library</Link> to use them here.</p>}
      <label className="flex items-center gap-2 text-[11px]"><input type="checkbox" checked={all} onChange={(e) => setAll(e.target.checked)} className="accent-primary" />Apply to every “{o.label}” type piece in this set</label>
      {o.model_uri && <button onClick={() => ed.setModel(null, all)} className="w-full rounded-md bg-white/5 hover:bg-white/10 py-1 text-xs">Restore built-in piece</button>}
    </div>
  );
}