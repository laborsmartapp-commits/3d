import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Wand2, ArrowRight } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import ChoiceRow from './ChoiceRow';
import CostNotice from './CostNotice';
import ReportView from './ReportView';
import { STEPS, DEFAULTS, MODEL_LABEL } from './options';

// Step-by-step structured brief -> one AI generation -> validated, saved stage.
export default function CreateTab({ api }) {
  const [s, setS] = useState(DEFAULTS), [step, setStep] = useState(0), [made, setMade] = useState(null), nav = useNavigate();
  const set = (k) => (v) => setS((o) => ({ ...o, [k]: v }));
  const last = step === STEPS.length - 1;
  const generate = async () => {
    const { quality, prompt, ...settings } = s;
    const d = await api.generate('Generating stage', { action: 'create', mode: 'structured', settings, prompt, quality }, MODEL_LABEL[quality]);
    if (d?.stage) setMade(d.stage);
  };
  if (made) return (
    <div className="space-y-3">
      <ReportView rec={made} />
      <button onClick={() => nav(`/stage/${made.id}`)} className="w-full rounded-lg bg-primary text-primary-foreground py-2 text-xs font-semibold flex items-center justify-center gap-1.5">Open in Editor <ArrowRight className="w-3.5 h-3.5" /></button>
      <button onClick={() => setMade(null)} className="w-full rounded-lg border border-white/10 py-2 text-xs">Create another</button>
    </div>
  );
  return (
    <div>
      <div className="flex gap-1 mb-3">{STEPS.map((x, i) => <button key={x.title} onClick={() => setStep(i)} className={`flex-1 rounded-md py-1 text-[10px] font-semibold ${i === step ? 'bg-white/15' : 'text-quiet hover:bg-white/5'}`}>{i + 1}. {x.title}</button>)}</div>
      {step === 0 && <label className="block mb-3"><span className="text-[11px] font-semibold text-muted-foreground">Stage name (optional)</span><Input value={s.name} onChange={(e) => set('name')(e.target.value)} maxLength={80} placeholder="e.g. Krush's Penthouse" className="mt-1 h-8 text-xs" /></label>}
      {STEPS[step].fields.map(([k, label, opts, multi]) => <ChoiceRow key={k} label={label} options={opts} value={s[k]} onChange={set(k)} multi={multi} />)}
      {last && (
        <div className="space-y-3">
          <label className="block"><span className="text-[11px] font-semibold text-muted-foreground">Special creative details ({s.prompt.length}/600)</span><Textarea value={s.prompt} onChange={(e) => set('prompt')(e.target.value.slice(0, 600))} rows={3} placeholder="e.g. Floor-to-ceiling windows, a grand piano, gold accents" className="mt-1 text-xs" /></label>
          <CostNotice />
        </div>
      )}
      <div className="flex gap-2 mt-3">
        {step > 0 && <button onClick={() => setStep(step - 1)} className="flex-1 rounded-lg border border-white/10 py-2 text-xs">Back</button>}
        {!last ? <button onClick={() => setStep(step + 1)} className="flex-1 rounded-lg bg-white/10 py-2 text-xs font-semibold">Next</button>
          : <button onClick={generate} disabled={api.busy} className="flex-1 rounded-lg bg-primary text-primary-foreground py-2 text-xs font-semibold flex items-center justify-center gap-1.5 disabled:opacity-50"><Wand2 className="w-3.5 h-3.5" />Generate Stage</button>}
      </div>
    </div>
  );
}