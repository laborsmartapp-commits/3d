import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { Plus, FolderOpen, Mountain, Clapperboard, Server, ArrowRight, Upload } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { stageInfo } from '@/game/stages/registry';
import StatusBadge from '@/components/shell/StatusBadge';
import StudioStatus from '@/components/dashboard/StudioStatus';
import { continueUrl } from '@/lib/studioLinks';

const QUICK = [['/productions?new=1', 'New Production', Plus], ['/productions', 'Open Production', FolderOpen], ['/stages', 'Enter Stage', Mountain], ['/world', 'Director Mode', Clapperboard],
  ['/assets?cat=character&upload=1', 'Import Character', Upload], ['/assets?cat=object&upload=1', 'Import Object', Upload], ['/assets?cat=animation&upload=1', 'Import Animation', Upload], ['/renders', 'Render Queue', Server]];

const Section = ({ title, to, children }) => (
  <section className="mt-12">
    <div className="flex justify-between items-baseline mb-4"><h2 className="font-heading text-xl">{title}</h2><Link to={to} className="text-xs text-primary">View all</Link></div>
    {children}
  </section>
);

export default function Dashboard() {
  const [d, setD] = useState(null);
  useEffect(() => {
    Promise.all([
      base44.entities.Production.filter({ status: { $ne: 'archived' } }, { sort: '-updated_date', limit: 4 }),
      base44.entities.SceneTake.filter({}, { sort: '-created_date', limit: 4 }),
      base44.entities.RenderJob.filter({}, { sort: '-created_date', limit: 4 }),
    ]).then(([p, t, r]) => setD({ prods: p.items, takes: t.items, jobs: r.items }));
  }, []);
  const cur = d?.prods[0];
  return (
    <div className="max-w-6xl">
      <p className="text-xs uppercase tracking-[0.3em] text-primary">Krush Studio</p>
      <h1 className="font-heading text-4xl md:text-5xl mt-2">Tonight’s production</h1>
      {cur ? (
        <div className="glass rounded-3xl p-8 mt-8 flex flex-wrap items-center justify-between gap-6 bg-gradient-to-br from-accent/10 to-transparent">
          <div><p className="text-xs text-quiet uppercase tracking-widest">Continue working</p><h2 className="font-heading text-3xl mt-2">{cur.title}</h2>
            <p className="text-sm text-muted-foreground mt-2">{stageInfo(cur.stage_id).name} · edited {format(new Date(cur.updated_date), 'MMM d, HH:mm')}</p></div>
          <Link to={continueUrl(cur)} className="inline-flex items-center gap-2 rounded-xl bg-primary text-primary-foreground px-5 py-3 font-semibold">Continue Editing <ArrowRight className="w-4 h-4" /></Link>
        </div>
      ) : d && <Link to="/productions?new=1" className="block glass rounded-3xl p-8 mt-8 text-muted-foreground hover:text-foreground">Start your first production →</Link>}
      <div className="flex flex-wrap gap-2 mt-6">
        {QUICK.map(([to, l, I]) => <Link key={l} to={to} className="inline-flex items-center gap-2 rounded-xl bg-white/5 hover:bg-white/10 px-4 py-2.5 text-sm"><I className="w-4 h-4 text-primary" />{l}</Link>)}
      </div>
      <Section title="Studio Status" to="/renders"><StudioStatus /></Section>
      <Section title="Recent Recordings" to="/recordings">
        <div className="grid gap-3 sm:grid-cols-2">{d?.takes.map((t) => (
          <Link key={t.id} to="/recordings" className="glass rounded-2xl p-4 hover:bg-card/80"><p className="font-semibold">{t.name || `Take ${t.take_number}`}</p><p className="text-xs text-muted-foreground mt-1">{t.scene_name} · {stageInfo(t.world).name} · {(t.duration || 0).toFixed(1)}s</p></Link>
        ))}{d && !d.takes.length && <p className="text-sm text-muted-foreground">No recordings yet.</p>}</div>
      </Section>
      <Section title="Recent Renders" to="/renders">
        <div className="grid gap-3 sm:grid-cols-2">{d?.jobs.map((j) => (
          <Link key={j.id} to="/renders" className="glass rounded-2xl p-4 hover:bg-card/80 flex justify-between items-center"><span className="text-sm">{j.resolution} · {j.fps} fps<span className="block text-xs text-quiet">{format(new Date(j.created_date), 'MMM d, HH:mm')}</span></span><StatusBadge status={j.status} /></Link>
        ))}{d && !d.jobs.length && <p className="text-sm text-muted-foreground">No renders yet.</p>}</div>
      </Section>
    </div>
  );
}