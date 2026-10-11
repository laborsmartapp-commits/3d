import React, { useCallback, useEffect, useState } from 'react';
import { Plus, Loader2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import PageHeader from '@/components/shell/PageHeader';
import ProductionCard from '@/components/productions/ProductionCard';
import NewProductionDialog from '@/components/productions/NewProductionDialog';

const P = base44.entities.Production;

export default function Productions() {
  const [items, setItems] = useState(null), [showArchived, setShowArchived] = useState(false);
  const [creating, setCreating] = useState(new URLSearchParams(window.location.search).has('new'));
  const [toDelete, setToDelete] = useState(null);
  const load = useCallback(async () => {
    setItems((await P.filter(showArchived ? { status: 'archived' } : { status: { $ne: 'archived' } }, { sort: '-updated_date', limit: 50 })).items);
  }, [showArchived]);
  useEffect(() => { load(); }, [load]);

  const act = async (fn) => { await fn(); load(); };
  const create = (f) => act(async () => { await P.create({ ...f, status: 'draft' }); setCreating(false); });
  const rename = (p) => { const t = window.prompt('Rename production', p.title); if (t?.trim()) act(() => P.update(p.id, { title: t.trim() })); };
  const duplicate = (p) => act(() => P.create({ title: `${p.title} (Copy)`, description: p.description, production_type: p.production_type, stage_id: p.stage_id, fps: p.fps, resolution: p.resolution, scene_ids: p.scene_ids || [], status: 'draft' }));

  return (
    <div className="max-w-6xl">
      <PageHeader eyebrow="Production Manager" title="My Productions">
        <button onClick={() => setShowArchived(!showArchived)} className="rounded-xl px-4 py-2 text-sm bg-white/5 hover:bg-white/10">{showArchived ? 'Active' : 'Archived'}</button>
        <button onClick={() => setCreating(true)} className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm bg-primary text-primary-foreground font-semibold"><Plus className="w-4 h-4" />New Production</button>
      </PageHeader>
      {!items && <Loader2 className="w-5 h-5 animate-spin" />}
      {items && !items.length && <p className="text-muted-foreground text-sm">{showArchived ? 'No archived productions.' : 'No productions yet. Create your first one.'}</p>}
      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {items?.map((p) => <ProductionCard key={p.id} p={p} onRename={rename} onDuplicate={duplicate} onStatus={(x, s) => act(() => P.update(x.id, { status: s }))} onDelete={setToDelete} />)}
      </div>
      <NewProductionDialog open={creating} onOpenChange={setCreating} onCreate={create} />
      <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete “{toDelete?.title}”?</AlertDialogTitle>
            <AlertDialogDescription>This removes the production only. Its recorded takes, renders and library assets are kept.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive" onClick={() => act(() => P.delete(toDelete.id))}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}