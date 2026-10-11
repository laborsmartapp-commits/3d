import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowUp, ArrowDown, Copy, Plus, X, Clapperboard, Users, Music } from 'lucide-react';
import { stageInfo } from '@/game/stages/registry';
import ShotRow from './ShotRow';

const ib = 'p-1.5 rounded-lg hover:bg-white/10 disabled:opacity-30';

export default function SceneBlock({ scene, shots, takes, first, last, h }) {
  const tl = scene.timeline || {}, actors = tl.actors || [];
  const sorted = [...shots].sort((a, b) => a.order - b.order);
  return (
    <section className="glass rounded-2xl p-5">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex-1 min-w-0">
          <h3 className="font-heading text-xl truncate">{scene.name}</h3>
          <p className="text-xs text-muted-foreground mt-1">{stageInfo(scene.world).name} · {(scene.cameras || []).length} cameras · {tl.duration || 0}s timeline · {takes.length} takes</p>
        </div>
        <button className={ib} disabled={first} onClick={() => h.moveScene(scene, -1)} aria-label="Move scene up"><ArrowUp className="w-4 h-4" /></button>
        <button className={ib} disabled={last} onClick={() => h.moveScene(scene, 1)} aria-label="Move scene down"><ArrowDown className="w-4 h-4" /></button>
        <button className={ib} onClick={() => h.renameScene(scene)} aria-label="Rename scene" title="Rename">Aa</button>
        <button className={ib} onClick={() => h.duplicateScene(scene)} aria-label="Duplicate scene"><Copy className="w-4 h-4" /></button>
        <button className={ib} onClick={() => h.removeScene(scene)} aria-label="Remove scene"><X className="w-4 h-4" /></button>
        <button onClick={() => h.open(scene)} className="inline-flex items-center gap-1 rounded-lg bg-primary/15 text-primary px-3 py-1.5 text-xs font-semibold"><Clapperboard className="w-3.5 h-3.5" />Open Scene</button>
      </div>
      <div className="flex flex-wrap gap-4 mt-3 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1"><Users className="w-3.5 h-3.5" />{actors.map((a) => a.name).join(', ') || 'No actors yet'}</span>
        <span className="inline-flex items-center gap-1"><Music className="w-3.5 h-3.5" />{(tl.clips || []).filter((c) => c.kind === 'perf').length} performance · {(tl.clips || []).filter((c) => c.kind === 'anim').length} animation clips</span>
      </div>
      <div className="mt-4 space-y-1.5">
        {sorted.map((s, i) => (
          <ShotRow key={s.id} shot={s} scene={scene} first={i === 0} last={i === sorted.length - 1}
            onOpen={() => h.open(scene, s)} onEdit={() => h.editShot(scene, s)} onMove={(d) => h.moveShot(sorted, i, d)}
            onDuplicate={() => h.duplicateShot(s, sorted.length)} onDelete={() => h.deleteShot(s)} />
        ))}
        <button onClick={() => h.editShot(scene, null)} className="inline-flex items-center gap-1 text-xs text-primary mt-1"><Plus className="w-3.5 h-3.5" />Add shot</button>
      </div>
      {!!takes.length && (
        <div className="mt-4 flex flex-wrap gap-1.5">
          {takes.map((t) => <Link key={t.id} to={`/recordings?take=${t.id}`} className="rounded-full bg-white/5 hover:bg-white/10 px-2.5 py-1 text-[11px]">{t.name || `Take ${t.take_number}`}</Link>)}
        </div>
      )}
    </section>
  );
}