import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';

export default function StudioStatus() {
  const [s, setS] = useState(null);
  useEffect(() => {
    base44.entities.RenderJob.aggregate({ groupBy: 'status' }).then(({ rows }) => {
      const c = Object.fromEntries(rows.map((r) => [r.status, r.count]));
      setS({ active: (c.queued || 0) + (c.rendering || 0) + (c.encoding || 0), failed: c.failed || 0, done: c.completed || 0 });
    });
  }, []);
  const items = [['Active renders', s?.active], ['Completed renders', s?.done], ['Failed renders', s?.failed]];
  return (
    <div className="grid grid-cols-3 gap-3">
      {items.map(([l, v]) => (
        <Link key={l} to="/renders" className="glass rounded-2xl p-4 hover:bg-card/80">
          <p className="font-heading text-3xl">{v ?? '…'}</p>
          <p className="text-xs text-muted-foreground mt-1">{l}</p>
        </Link>
      ))}
    </div>
  );
}