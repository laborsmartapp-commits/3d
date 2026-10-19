import React from 'react';
import { CheckCircle2, AlertTriangle, Ban, Shuffle } from 'lucide-react';
import { STYLE_LABEL, STYLE_NOTE, MODEL_LABEL } from './options';

const List = ({ icon: Icon, cls, title, items }) => (items?.length ? (
  <div className="mt-2"><p className={`text-[11px] font-semibold flex items-center gap-1 ${cls}`}><Icon className="w-3 h-3" />{title} ({items.length})</p>
    <ul className="mt-1 space-y-0.5 text-[11px] text-muted-foreground list-disc pl-4">{items.map((t, i) => <li key={i}>{t}</li>)}</ul></div>
) : null);

// Validation report: what was really built, what was substituted, what was removed and why.
export default function ReportView({ rec, report = rec?.report, spec = rec?.spec }) {
  if (!report || !spec) return null;
  const c = report.counts || {};
  const chips = [['floors', 'floors'], ['walls', 'walls'], ['stairs', 'stairs'], ['buildings', 'buildings'], ['elements', 'elements'], ['nature_instances', 'plants/rocks'], ['furnishings', 'editable props'], ['vfx', 'effects'], ['lights', 'lights'], ['cameras', 'cameras']].filter(([k]) => c[k]);
  return (
    <div className="rounded-xl bg-white/5 p-3 text-xs" data-testid="stage-report">
      <p className="font-heading text-sm">{spec.name}</p>
      <p className="text-[11px] text-quiet">{STYLE_LABEL[spec.style] || spec.style} · {spec.bounds.w}×{spec.bounds.d} m · {report.complexity} · ~{Math.round((report.est_triangles || 0) / 1000)}k tris{report.ai ? ` · ${MODEL_LABEL[report.ai.model] || report.ai.model}, ${report.ai.seconds}s` : ''}</p>
      {spec.summary && <p className="text-muted-foreground mt-1.5">{spec.summary}</p>}
      <p className="mt-2 flex items-center gap-1 text-[11px] font-semibold text-primary"><CheckCircle2 className="w-3 h-3" />Validated against the capability registry</p>
      <div className="flex flex-wrap gap-1 mt-1.5">{chips.map(([k, l]) => <span key={k} className="rounded-full bg-white/10 px-2 py-0.5 text-[10px]">{c[k]} {l}</span>)}</div>
      <List icon={Shuffle} cls="text-chart-4" title="Substitutions" items={report.substitutions} />
      <List icon={Ban} cls="text-destructive" title="Unsupported, removed" items={report.dropped} />
      <List icon={AlertTriangle} cls="text-ember" title="Warnings" items={report.warnings} />
      <p className="mt-2 text-[10px] text-quiet">{STYLE_NOTE[spec.style]}</p>
    </div>
  );
}