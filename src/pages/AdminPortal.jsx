import React, { useEffect, useState } from 'react';
import { NavLink, Link, useParams } from 'react-router-dom';
import { Loader2, ShieldAlert, ArrowLeft } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import AdminOverview from '@/components/admin/AdminOverview';
import AdminUsers from '@/components/admin/AdminUsers';
import AdminProductions from '@/components/admin/AdminProductions';
import AdminStages from '@/components/admin/AdminStages';
import AdminAssets from '@/components/admin/AdminAssets';
import AdminRecordings from '@/components/admin/AdminRecordings';
import AdminRendering from '@/components/admin/AdminRendering';
import AdminStorage from '@/components/admin/AdminStorage';
import AdminDiagnostics from '@/components/admin/AdminDiagnostics';
import AdminLogs from '@/components/admin/AdminLogs';
import SettingsForm from '@/components/settings/SettingsForm';

const SECTIONS = [
  ['overview', 'Overview', AdminOverview], ['users', 'Users & Roles', AdminUsers], ['productions', 'Productions', AdminProductions], ['stages', 'Stages', AdminStages],
  ['assets', 'Characters & Assets', () => <AdminAssets cats={['character', 'object', 'texture']} />], ['animations', 'Animations & Audio', () => <AdminAssets cats={['animation', 'audio']} />],
  ['recordings', 'Recordings', AdminRecordings], ['rendering', 'Cloud Rendering & Costs', AdminRendering], ['storage', 'Storage', AdminStorage],
  ['diagnostics', 'Diagnostics & Health', AdminDiagnostics], ['logs', 'Activity Logs', AdminLogs], ['settings', 'Application Settings', () => <SettingsForm editable />],
];

// Admin data is also protected on the server: admin-only entity rules and the adminApi role check.
export default function AdminPortal() {
  const { section = 'overview' } = useParams();
  const [role, setRole] = useState(null);
  useEffect(() => { base44.auth.me().then((u) => setRole(u.role)).catch(() => setRole('none')); }, []);
  if (!role) return <div className="min-h-screen grid place-items-center"><Loader2 className="w-6 h-6 animate-spin" /></div>;
  if (role !== 'admin') return (
    <div className="min-h-screen grid place-items-center text-center px-6"><div><ShieldAlert className="w-10 h-10 text-destructive mx-auto" /><h1 className="font-heading text-2xl mt-4">Administrators only</h1><Link to="/" className="text-primary text-sm mt-4 inline-block">Back to the studio</Link></div></div>
  );
  const [, label, Section] = SECTIONS.find((s) => s[0] === section) || SECTIONS[0];
  return (
    <div className="min-h-screen bg-background text-foreground md:flex">
      <aside className="md:w-60 shrink-0 border-r border-border p-4 md:min-h-screen md:sticky md:top-0">
        <Link to="/" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"><ArrowLeft className="w-3.5 h-3.5" />Studio</Link>
        <p className="font-heading tracking-[0.3em] text-sm mt-4 mb-6">ADMIN</p>
        <nav className="flex md:flex-col gap-1 overflow-x-auto">{SECTIONS.map(([k, l]) => (
          <NavLink key={k} to={`/admin/${k}`} className={() => `whitespace-nowrap rounded-lg px-3 py-2 text-sm ${section === k ? 'bg-primary/15 text-primary' : 'text-muted-foreground hover:bg-white/5'}`}>{l}</NavLink>
        ))}</nav>
      </aside>
      <main className="flex-1 min-w-0 p-5 md:p-10"><h1 className="font-heading text-3xl mb-8">{label}</h1><Section /></main>
    </div>
  );
}