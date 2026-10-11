import React, { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { LayoutDashboard, Clapperboard, Mountain, Film, Server, Menu, X } from 'lucide-react';

const NAV = [
  ['/', 'Dashboard', LayoutDashboard],
  ['/productions', 'My Productions', Clapperboard],
  ['/stages', '3D Stages', Mountain],
  ['/recordings', 'Recorded Scenes', Film],
  ['/renders', 'Render Queue', Server],
];

export default function StudioLayout() {
  const [open, setOpen] = useState(false);
  const links = NAV.map(([to, label, Icon]) => (
    <NavLink key={to} to={to} end={to === '/'} onClick={() => setOpen(false)}
      className={({ isActive }) => `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors ${isActive ? 'bg-primary/15 text-primary' : 'text-muted-foreground hover:bg-white/5 hover:text-foreground'}`}>
      <Icon className="w-4 h-4" />{label}
    </NavLink>
  ));
  return (
    <div className="min-h-screen bg-background text-foreground lg:flex">
      <header className="lg:hidden flex items-center justify-between px-5 py-4 border-b border-border">
        <span className="font-heading tracking-widest">KRUSH STUDIO</span>
        <button onClick={() => setOpen(!open)} aria-label="Menu">{open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}</button>
      </header>
      <aside className={`${open ? 'block' : 'hidden'} lg:block lg:w-64 shrink-0 border-r border-border p-5 lg:min-h-screen lg:sticky lg:top-0`}>
        <div className="hidden lg:block font-heading text-lg tracking-[0.3em] mb-10">KRUSH<span className="block text-xs text-primary tracking-[0.5em]">STUDIO</span></div>
        <nav className="space-y-1">{links}</nav>
      </aside>
      <main className="flex-1 min-w-0 px-5 py-8 lg:px-12 lg:py-12"><Outlet /></main>
    </div>
  );
}