import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { STAGES } from '@/game/stages/registry';
import PageHeader from '@/components/shell/PageHeader';

const ABOUT = {
  'celestia-grotto': { text: 'Floating island realm with grottos, village and living weather.', img: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=900' },
  'star-square': { text: 'Dusk-lit plaza with its fountain show, screens and neon streets.', img: 'https://images.unsplash.com/photo-1514565131-fce0801e5785?w=900' },
  convergence: { text: 'Astral Boulevard, clock tower and the city districts.', img: 'https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?w=900' },
};

export default function Stages() {
  const [counts, setCounts] = useState({});
  useEffect(() => {
    Promise.all(Object.keys(STAGES).map(async (id) => [id, await base44.entities.SceneTake.count({ world: id })])).then((r) => setCounts(Object.fromEntries(r)));
  }, []);
  return (
    <div className="max-w-6xl">
      <PageHeader eyebrow="Stage Library" title="3D Stages" />
      <div className="grid gap-6 md:grid-cols-2">
        {Object.values(STAGES).map((s) => (
          <Link key={s.id} to={s.path} className="group glass rounded-3xl overflow-hidden">
            <div className="h-52 overflow-hidden"><img src={ABOUT[s.id]?.img} alt={s.name} className="w-full h-full object-cover opacity-70 group-hover:scale-105 group-hover:opacity-90 transition duration-700" /></div>
            <div className="p-6">
              <p className="font-mono text-[11px] text-quiet">{s.id}</p>
              <h2 className="font-heading text-2xl mt-1">{s.name}</h2>
              <p className="text-sm text-muted-foreground mt-2">{ABOUT[s.id]?.text}</p>
              <div className="flex items-center justify-between mt-5 text-sm">
                <span className="text-quiet">{counts[s.id] ?? '…'} recorded takes · Recording · Cloud render</span>
                <span className="inline-flex items-center gap-1 text-primary">Enter Stage <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" /></span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}