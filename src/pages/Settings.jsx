import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import PageHeader from '@/components/shell/PageHeader';
import SettingsForm from '@/components/settings/SettingsForm';

export default function Settings() {
  const [me, setMe] = useState(null);
  useEffect(() => { base44.auth.me().then(setMe); }, []);
  return (
    <div className="max-w-4xl">
      <PageHeader eyebrow="Studio" title="Settings" />
      {me && <p className="text-sm text-muted-foreground mb-6">Signed in as {me.email} · role {me.role}</p>}
      {me && <SettingsForm editable={me.role === 'admin'} />}
    </div>
  );
}