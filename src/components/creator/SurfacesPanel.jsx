import React, { useMemo, useState } from 'react';
import { MAT_DEF } from '@/game/generated/materials';

const SECS = [['floors', 'Floors'], ['walls', 'Walls'], ['roofs', 'Roofs'], ['buildings', 'Facades'], ['elements', 'Elements']];
const NAMES = Object.keys(MAT_DEF);

// Swap surface materials of the generated architecture (no AI); saved as a new version.
export default function SurfacesPanel({ spec, busy, apply }) {
  const rows = useMemo(() => {
    const out = [{ section: 'ground', label: 'Ground', from: spec.ground.material, n: 1 }];
    for (const [k, l] of SECS) {
      const by = {}; for (const o of spec[k] || []) { const m = k === 'buildings' ? o.facade : o.material; if (m) by[m] = (by[m] || 0) + 1; }
      for (const [m, n] of Object.entries(by)) out.push({ section: k, label: l, from: m, n });
    }
    return out;
  }, [spec]);
  const [to, setTo] = useState({});
  const swaps = rows.map((r) => ({ section: r.section, from: r.from, to: to[`${r.section}|${r.from}`] })).filter((w) => w.to && w.to !== w.from);
  return (
    <div className="space-y-1.5">
      {rows.map((r) => { const k = `${r.section}|${r.from}`; return (
        <label key={k} className="flex items-center gap-2 text-[11px]">
          <span className="w-24 shrink-0 text-quiet truncate">{r.label} ×{r.n}</span>
          <select value={to[k] || r.from} onChange={(e) => setTo({ ...to, [k]: e.target.value })} className="flex-1 rounded-md bg-white/5 border border-white/10 px-1.5 py-1">
            {NAMES.map((n) => <option key={n} value={n} className="bg-card">{n.replace(/_/g, ' ')}</option>)}
          </select>
        </label>
      ); })}
      <button onClick={() => apply(swaps)} disabled={busy || !swaps.length} className="w-full rounded-lg bg-white/10 py-1.5 text-xs font-semibold disabled:opacity-40">Apply material changes as new version</button>
    </div>
  );
}