import React from 'react';
import { Switch } from '@/components/ui/switch';

// Admin-only. Non-admins never see this section, and the engine refuses to enable diagnostics for them.
export default function StudioDiagnostics({ engine, on }) {
  if (!engine.isAdmin) return null;
  const D = engine.diag;
  return (
    <section className="space-y-2 rounded-lg border border-white/10 p-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Diagnostics</h3>
        <Switch checked={!!on} disabled={!!D.running} onCheckedChange={(v) => D.setEnabled(v)} />
      </div>
      <p className="text-xs text-muted-foreground">{on ? 'Enabled: the diagnostics panel is open over the world. It never appears in recordings.' : 'Disabled: no diagnostic sampling, throttling or overlays are running.'} Shortcut: open the world with <span className="font-mono">?sceneDiag=1</span>.</p>
    </section>
  );
}