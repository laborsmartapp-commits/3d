import React from 'react';
import StageModelUse from './StageModelUse';
import StageTextureUse from './StageTextureUse';

// Stage Creator binding for a library asset: object models replace primitive furnishings, texture sets replace
// procedural materials. Other categories are not used by Stage Creator.
export default function StageUse({ asset, onChanged }) {
  if (asset.category !== 'object' && asset.category !== 'texture') return null;
  return (
    <section className="rounded-xl border border-border p-3 space-y-2">
      <h3 className="text-sm font-semibold">Stage Creator use</h3>
      <p className="text-xs text-muted-foreground">
        {asset.category === 'object' ? 'Generated stages show this model in place of these pieces. Placement, collision, seats and saved layouts stay with each piece.' : 'Generated stages use these maps for the chosen material or finish instead of the procedural texture.'}
      </p>
      {asset.category === 'object' ? <StageModelUse key={asset.id} asset={asset} onChanged={onChanged} /> : <StageTextureUse key={asset.id} asset={asset} onChanged={onChanged} />}
    </section>
  );
}