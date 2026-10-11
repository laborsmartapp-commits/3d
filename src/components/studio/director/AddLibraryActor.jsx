import React, { useState } from 'react';
import { Loader2, UserPlus } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { base44 } from '@/api/base44Client';

// Timeline button: add a character from the Asset Library as a new actor track.
export default function AddLibraryActor({ engine, disabled }) {
  const [items, setItems] = useState(null);
  const load = async (open) => {
    if (open && !items) setItems((await base44.entities.Asset.filter({ category: 'character', status: 'active', format: 'glb' }, { sort: '-created_date', limit: 50 })).items);
  };
  return (
    <Popover onOpenChange={load}>
      <PopoverTrigger disabled={disabled} className="h-7 w-full px-2 flex items-center gap-1 text-primary border-t border-white/5 hover:bg-white/5 disabled:opacity-40"><UserPlus className="w-3 h-3" />Character</PopoverTrigger>
      <PopoverContent side="top" align="start" className="w-56 p-1 bg-card border-border">
        {!items && <Loader2 className="w-4 h-4 animate-spin m-2" />}
        {items && !items.length && <p className="text-xs text-muted-foreground p-2">No .glb characters in your library yet.</p>}
        {items?.map((a) => <button key={a.id} onClick={() => engine.studio.dir.addLibraryActor(a)} className="w-full text-left text-sm px-2 py-1.5 rounded-md hover:bg-white/10 truncate">{a.name}</button>)}
      </PopoverContent>
    </Popover>
  );
}