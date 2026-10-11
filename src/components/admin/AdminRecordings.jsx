import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { Loader2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { stageInfo } from '@/game/stages/registry';
import StatusBadge from '@/components/shell/StatusBadge';

export default function AdminRecordings() {
  const [q, setQ] = useState(''), [items, setItems] = useState(null);
  useEffect(() => {
    const t = setTimeout(async () => {
      const rx = { $regex: q, $options: 'i' };
      setItems((await base44.entities.SceneTake.filter(q ? { $or: [{ name: rx }, { scene_name: rx }] } : {}, { sort: '-created_date', limit: 100 })).items);
    }, 250);
    return () => clearTimeout(t);
  }, [q]);
  return (
    <div className="space-y-4">
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search recordings" className="bg-card border border-border rounded-xl px-3 py-2 text-sm" />
      {!items && <Loader2 className="w-5 h-5 animate-spin" />}
      {!!items && <div className="overflow-x-auto"><table className="w-full text-sm">
        <thead className="text-xs text-quiet text-left"><tr><th className="py-2">Take</th><th>Scene</th><th>Stage</th><th>Duration</th><th>Chunks</th><th>Actors</th><th>Status</th><th>Date</th></tr></thead>
        <tbody>{items.map((t) => (
          <tr key={t.id} className="border-t border-border">
            <td className="py-2"><Link to={`/recordings?take=${t.id}`} className="text-primary">{t.name || `Take ${t.take_number}`}</Link></td><td>{t.scene_name}</td><td>{stageInfo(t.world).name}</td>
            <td>{(t.duration || 0).toFixed(1)}s</td><td>{t.chunk_count}{t.source_take_id ? ' (shared)' : ''}</td><td>{(t.actors || []).join(', ')}</td><td><StatusBadge status={t.status} /></td><td>{format(new Date(t.created_date), 'MMM d')}</td>
          </tr>
        ))}</tbody>
      </table></div>}
    </div>
  );
}