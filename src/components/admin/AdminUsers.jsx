import React, { useState } from 'react';
import { format } from 'date-fns';
import { Loader2 } from 'lucide-react';
import useAdminApi, { adminCall } from '@/hooks/useAdminApi';

export default function AdminUsers() {
  const { data, error, load } = useAdminApi('users');
  const [q, setQ] = useState(''), [msg, setMsg] = useState('');
  if (error) return <p className="text-destructive text-sm">{error}</p>;
  if (!data) return <Loader2 className="w-5 h-5 animate-spin" />;
  const setRole = async (u, role) => {
    if (!window.confirm(`Change ${u.email} to ${role}?`)) return;
    const r = await adminCall('setRole', { user_id: u.id, role }).catch((e) => ({ error: e.response?.data?.error || e.message }));
    setMsg(r.error || `${u.email} is now ${role}`); load();
  };
  const list = data.users.filter((u) => !q || `${u.email} ${u.full_name}`.toLowerCase().includes(q.toLowerCase()));
  return (
    <div className="space-y-4">
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search users" className="bg-card border border-border rounded-xl px-3 py-2 text-sm" />
      {msg && <p className="text-xs text-primary">{msg}</p>}
      <div className="overflow-x-auto"><table className="w-full text-sm">
        <thead className="text-xs text-quiet text-left"><tr><th className="py-2">User</th><th>Email</th><th>Role</th><th>Registered</th><th>Last active</th><th>Productions</th></tr></thead>
        <tbody>{list.map((u) => (
          <tr key={u.id} className="border-t border-border">
            <td className="py-2">{u.full_name || '—'}</td><td>{u.email}</td>
            <td>{u.id === data.me ? <span className="text-xs text-quiet">{u.role} (you)</span> : (
              <select value={u.role} onChange={(e) => setRole(u, e.target.value)} className="bg-background border border-border rounded-lg px-2 py-1 text-xs"><option value="admin">admin</option><option value="user">user</option></select>)}</td>
            <td>{format(new Date(u.created_date), 'MMM d, yyyy')}</td><td>{u.updated_date ? format(new Date(u.updated_date), 'MMM d') : '—'}</td><td>{u.productions}</td>
          </tr>
        ))}</tbody>
      </table></div>
      <p className="text-xs text-quiet">Director / Animator / Editor / Viewer roles need a role change on the main branch before they can be assigned and enforced by the server.</p>
    </div>
  );
}