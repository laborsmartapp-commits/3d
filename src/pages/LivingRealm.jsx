import React from 'react';
import Convergence from '@/pages/Convergence';
import { LIVING_REALM } from '@/game/realm/stage';
import RealmHUD from '@/components/realm/RealmHUD';

export default function LivingRealm() {
  return <Convergence district={LIVING_REALM} title="Krush's Living Realm" customUI overlay={(p) => <RealmHUD {...p} />} />;
}