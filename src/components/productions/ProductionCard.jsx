import React from 'react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { MoreHorizontal } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { stageInfo } from '@/game/stages/registry';
import { continueUrl } from '@/lib/studioLinks';
import StatusBadge from '@/components/shell/StatusBadge';
import { TYPES } from './NewProductionDialog';

const STATUSES = ['draft', 'in_production', 'review', 'completed', 'archived'];

export default function ProductionCard({ p, onRename, onStatus, onDuplicate, onDelete }) {
  const s = stageInfo(p.stage_id);
  return (
    <div className="glass rounded-2xl p-5 flex flex-col">
      <div className="flex items-start justify-between gap-2">
        <div><StatusBadge status={p.status} /><Link to={`/productions/${p.id}`} className="block font-heading text-xl mt-3 hover:text-primary">{p.title}</Link></div>
        <DropdownMenu>
          <DropdownMenuTrigger className="p-1 rounded-lg hover:bg-white/10" aria-label="Actions"><MoreHorizontal className="w-4 h-4" /></DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem asChild><Link to={`/productions/${p.id}`}>Open</Link></DropdownMenuItem>
            <DropdownMenuItem onClick={() => onRename(p)}>Rename</DropdownMenuItem>
            <DropdownMenuItem onClick={() => onDuplicate(p)}>Duplicate</DropdownMenuItem>
            <DropdownMenuSeparator />
            {STATUSES.filter((x) => x !== p.status).map((x) => <DropdownMenuItem key={x} onClick={() => onStatus(p, x)} className="capitalize">Mark {x.replace('_', ' ')}</DropdownMenuItem>)}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => onDelete(p)} className="text-destructive">Delete</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <p className="text-sm text-muted-foreground mt-2 line-clamp-2 flex-1">{p.description || 'No description'}</p>
      <p className="text-xs text-quiet mt-4">{TYPES[p.production_type]} · {s.name} · {p.fps} fps · {p.resolution} · edited {format(new Date(p.updated_date), 'MMM d')}</p>
      <Link to={continueUrl(p)} className="mt-4 text-center rounded-xl bg-primary/15 text-primary py-2 text-sm font-semibold hover:bg-primary/25">Continue Editing</Link>
    </div>
  );
}