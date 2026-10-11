import React from 'react';

export default function PageHeader({ eyebrow, title, children }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4 mb-10">
      <div>
        {eyebrow && <p className="text-xs uppercase tracking-[0.3em] text-primary mb-2">{eyebrow}</p>}
        <h1 className="font-heading text-3xl md:text-4xl">{title}</h1>
      </div>
      <div className="flex gap-2">{children}</div>
    </div>
  );
}