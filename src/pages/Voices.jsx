import React, { useCallback, useEffect, useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import PageHeader from '@/components/shell/PageHeader';
import VoiceLibraryTab from '@/components/voices/VoiceLibraryTab';
import CharacterVoicesTab from '@/components/voices/CharacterVoicesTab';
import { myVoices } from '@/lib/voices';

// Account Voice Library: custom voices + presets, and the permanent voice on every character's profile.
export default function Voices() {
  const [voices, setVoices] = useState(null);
  const reload = useCallback(() => myVoices().then(setVoices), []);
  useEffect(() => { reload(); }, [reload]);
  return (
    <div>
      <PageHeader eyebrow="Account" title="Voice Library" />
      <Tabs defaultValue="characters">
        <TabsList className="mb-6"><TabsTrigger value="characters">Character Voices</TabsTrigger><TabsTrigger value="library">Voices</TabsTrigger></TabsList>
        <TabsContent value="characters"><CharacterVoicesTab voices={voices} /></TabsContent>
        <TabsContent value="library"><VoiceLibraryTab voices={voices} reload={reload} /></TabsContent>
      </Tabs>
    </div>
  );
}