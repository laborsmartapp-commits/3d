import React, { useEffect, useState } from 'react';
import { ANIMATIONS } from '@/game/studio/characters';
import { base44 } from '@/api/base44Client';

let cached;
const loadLib = () => (cached ??= base44.entities.Asset.filter({ category: 'animation', status: 'active' }, { sort: 'folder', limit: 500, fields: ['name', 'folder', 'file_uri', 'clip_name', 'duration'] }).then((r) => r.items));

// Built-in poses plus every clip in the Animation Library (dances, basketball…), grouped by folder.
export default function AnimSelect({ c, set }) {
  const [lib, setLib] = useState([]);
  useEffect(() => { loadLib().then(setLib); }, []);
  const groups = lib.reduce((m, a) => ((m[a.folder || 'Library'] ??= []).push(a), m), {});
  const pick = (v) => {
    const a = lib.find((x) => `lib:${x.id}` === v);
    set(a ? { anim: v, anim_uri: a.file_uri, clip_name: a.clip_name, label: a.name, len: a.duration || undefined } : { anim: v, anim_uri: undefined, clip_name: undefined, label: undefined, len: undefined });
  };
  return (
    <select value={c.anim} onChange={(e) => pick(e.target.value)} className="bg-white/5 rounded px-1 py-0.5 max-w-48">
      <optgroup label="Built-in" className="bg-card">{ANIMATIONS.map(([k, l]) => <option key={k} value={k} className="bg-card">{l}</option>)}</optgroup>
      {Object.entries(groups).map(([f, items]) => (
        <optgroup key={f} label={f} className="bg-card">{items.map((a) => <option key={a.id} value={`lib:${a.id}`} className="bg-card">{a.name}</option>)}</optgroup>
      ))}
    </select>
  );
}