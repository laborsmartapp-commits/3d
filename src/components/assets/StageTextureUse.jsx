import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Input } from '@/components/ui/input';
import { MAT_DEF } from '@/game/generated/materials';
import { FINISH } from '@/game/realm/setScene';
import { PBR_SLOTS } from '@/game/realm/pbr';

const KINDS = [...Object.keys(FINISH).map((k) => [k, `Furniture finish · ${k}`]), ...Object.keys(MAT_DEF).map((k) => [k, `Surface · ${k}`])];
const LABEL = { base_color: 'Base colour', roughness: 'Roughness', metallic: 'Metallic', normal: 'Normal', ao: 'Ambient occlusion', height: 'Height' };

// Turns a texture asset into a PBR set for one material / finish. Maps upload privately; generated stages
// sign them when they load.
export default function StageTextureUse({ asset, onChanged }) {
  const [kind, setKind] = useState(asset.material_kind || ''), [tile, setTile] = useState(asset.tile_m || 2), [maps, setMaps] = useState(asset.pbr_maps || {}), [busy, setBusy] = useState('');
  const upload = async (slot, file) => { if (!file) return; setBusy(slot); const { file_uri } = await base44.integrations.Core.UploadPrivateFile({ file }); setMaps((m) => ({ ...m, [slot]: file_uri })); setBusy(''); };
  const save = async () => { setBusy('save'); await base44.entities.Asset.update(asset.id, { material_kind: kind || null, tile_m: +tile || 2, pbr_maps: maps }); setBusy(''); onChanged(); };
  return (
    <div className="space-y-2 text-xs">
      <select value={kind} onChange={(e) => setKind(e.target.value)} className="w-full rounded-lg bg-secondary border border-border px-2 py-1.5">
        <option value="">Not used by Stage Creator</option>{KINDS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
      </select>
      <label className="flex items-center gap-2 text-muted-foreground">Metres per repeat<Input type="number" step="0.1" value={tile} onChange={(e) => setTile(e.target.value)} className="w-24" /></label>
      <div className="grid grid-cols-2 gap-1.5">
        {Object.keys(PBR_SLOTS).map((s) => (
          <label key={s} className="flex items-center justify-between gap-2 rounded-lg bg-white/5 px-2 py-1.5 cursor-pointer">
            <span>{LABEL[s]}</span><span className={maps[s] || (s === 'base_color' && asset.file_uri) ? 'text-primary' : 'text-quiet'}>{busy === s ? 'Uploading…' : maps[s] ? 'Set' : s === 'base_color' ? 'Asset file' : 'Add'}</span>
            <input type="file" accept=".png,.jpg,.jpeg,.webp" className="hidden" onChange={(e) => upload(s, e.target.files[0])} />
          </label>
        ))}
      </div>
      <button onClick={save} disabled={!!busy} className="rounded-lg px-3 py-1.5 bg-primary text-primary-foreground disabled:opacity-60">{busy === 'save' ? 'Saving…' : 'Save texture set'}</button>
    </div>
  );
}