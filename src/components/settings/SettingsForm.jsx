import React, { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { adminLog } from '@/lib/studioLinks';

// [field, label, type, note]. "deploy" = also enforced in server/worker code; changing it here records intent only.
const FIELDS = [
  ['default_fps', 'Default project frame rate', 'number', 'app'], ['default_preview_quality', 'Default preview quality', 'text', 'app'],
  ['default_render_resolution', 'Default render resolution', 'text', 'app'], ['default_render_preset', 'Default render preset', 'text', 'app'],
  ['max_scene_duration', 'Maximum take duration (s)', 'number', 'deploy'], ['max_upload_mb', 'Max asset upload (MB)', 'number', 'app'],
  ['default_camera_fov', 'Default camera FOV', 'number', 'app'], ['recording_chunk_seconds', 'Recording chunk length (s)', 'number', 'deploy'],
  ['storage_retention_days', 'Storage retention (days, 0 = keep)', 'number', 'app'], ['max_active_renders_per_user', 'Active renders per user', 'number', 'app'],
  ['diagnostic_retention_days', 'Diagnostic retention (days)', 'number', 'app'], ['gpu_cost_per_hour', 'GPU cost estimate ($/hour)', 'number', 'app'],
];

export default function SettingsForm({ editable }) {
  const [rec, setRec] = useState(undefined), [f, setF] = useState({}), [saved, setSaved] = useState('');
  useEffect(() => { base44.entities.AppSettings.filter({ key: 'studio' }).then((r) => { const s = r[0] || r.items?.[0] || null; setRec(s); setF(s || {}); }); }, []);
  if (rec === undefined) return <Loader2 className="w-5 h-5 animate-spin" />;
  const save = async (e) => {
    e.preventDefault();
    const patch = Object.fromEntries(FIELDS.map(([k, , t]) => [k, t === 'number' ? Number(f[k]) : f[k]]).filter(([, v]) => v !== undefined && v !== '' && !Number.isNaN(v)));
    const r = rec ? await base44.entities.AppSettings.update(rec.id, patch) : await base44.entities.AppSettings.create({ key: 'studio', ...patch });
    setRec(r); setSaved('Saved'); adminLog('settings.updated', 'AppSettings', r.id, patch);
  };
  return (
    <form onSubmit={save} className="space-y-3 max-w-2xl">
      {!rec && <p className="text-xs text-ember">No settings saved yet — the defaults shown in Director Mode apply until an administrator saves.</p>}
      <div className="grid sm:grid-cols-2 gap-3">
        {FIELDS.map(([k, label, type, scope]) => (
          <label key={k} className="text-xs text-muted-foreground space-y-1">
            <span className="flex justify-between">{label}<span className={scope === 'deploy' ? 'text-ember' : 'text-quiet'}>{scope === 'deploy' ? 'needs deploy' : 'in-app'}</span></span>
            <input disabled={!editable} type={type} step="any" value={f[k] ?? ''} onChange={(e) => { setF({ ...f, [k]: e.target.value }); setSaved(''); }} className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm text-foreground disabled:opacity-60" />
          </label>
        ))}
      </div>
      {editable ? <button className="rounded-xl bg-primary text-primary-foreground px-5 py-2 text-sm font-semibold">Save settings</button> : <p className="text-xs text-quiet">Only administrators can change studio settings.</p>}
      {saved && <span className="text-xs text-primary ml-3">{saved}</span>}
    </form>
  );
}