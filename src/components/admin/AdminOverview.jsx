import React from 'react';
import { Link } from 'react-router-dom';
import { Loader2, AlertTriangle } from 'lucide-react';
import useAdminApi from '@/hooks/useAdminApi';
import { fmtSize } from '@/lib/assets';

export default function AdminOverview() {
  const o = useAdminApi('overview').data, rp = useAdminApi('runpod').data, c = useAdminApi('costs').data;
  if (!o) return <Loader2 className="w-5 h-5 animate-spin" />;
  const r = o.renders || {};
  const stats = [['Total users', o.users, 'users'], ['Active (30 days)', o.active_users, 'users'], ['Productions', o.productions, 'productions'], ['In production', o.productions_active, 'productions'],
    ['Scenes', o.scenes, 'productions'], ['Asset files', o.assets, 'assets'], ['Recordings', o.takes, 'recordings'], ['Completed renders', r.completed || 0, 'rendering'],
    ['Failed renders', r.failed || 0, 'rendering'], ['Rendering now', o.rendering + (r.queued || 0), 'rendering'], ['Masters stored', fmtSize(o.render_bytes), 'storage'], ['Est. render cost', c ? `$${c.cost.toFixed(2)}` : '…', 'rendering']];
  const warnings = [!rp?.configured && rp && 'RunPod is not configured', rp?.error && `RunPod health check failed: ${rp.error}`, rp?.health?.workers?.unhealthy && `${rp.health.workers.unhealthy} unhealthy RunPod workers`, r.failed && `${r.failed} failed render jobs`].filter(Boolean);
  return (
    <div className="space-y-8">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {stats.map(([l, v, to]) => <Link key={l} to={`/admin/${to}`} className="glass rounded-2xl p-4 hover:bg-card/80"><p className="font-heading text-2xl">{v}</p><p className="text-xs text-muted-foreground mt-1">{l}</p></Link>)}
      </div>
      <div className="space-y-2">
        <h3 className="font-heading">Operational warnings</h3>
        {warnings.length ? warnings.map((w) => <p key={w} className="flex items-center gap-2 text-sm text-ember"><AlertTriangle className="w-4 h-4" />{w}</p>) : <p className="text-sm text-muted-foreground">No warnings.</p>}
      </div>
    </div>
  );
}