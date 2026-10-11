import { useCallback, useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';

export const adminCall = (action, args = {}) => base44.functions.invoke('adminApi', { action, ...args }).then((r) => r.data);

export default function useAdminApi(action) {
  const [data, setData] = useState(null), [error, setError] = useState('');
  const load = useCallback(() => adminCall(action).then(setData).catch((e) => setError(e.response?.data?.error || e.message)), [action]);
  useEffect(() => { load(); }, [load]);
  return { data, error, load };
}