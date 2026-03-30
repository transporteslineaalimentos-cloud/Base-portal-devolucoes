import { useCallback, useEffect, useState } from 'react';
import { dbAddAudit, dbLoadAudit } from '../config/supabase';

export function useAudit(user) {
  const [audit, setAudit] = useState([]);
  useEffect(() => {
    dbLoadAudit().then(setAudit);
  }, []);

  const logAudit = useCallback(async ({ nfKey, action, field, oldValue, newValue, obs, origin = 'manual' }) => {
    let ip = '';
    try {
      const r = await fetch('https://api.ipify.org?format=json');
      const d = await r.json();
      ip = d.ip || '';
    } catch {}
    const payload = {
      nf_key: nfKey,
      usuario: user?.name || user?.email || 'Sistema',
      perfil: user?.role || 'internal',
      acao: action,
      campo: field || '',
      valor_anterior: oldValue == null ? '' : String(oldValue),
      valor_novo: newValue == null ? '' : String(newValue),
      observacao: obs || '',
      origem: origin,
      ip,
      user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
      session_id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
      created_at: new Date().toISOString()
    };
    await dbAddAudit(payload);
    setAudit(prev => [payload, ...prev]);
  }, [user]);

  return { audit, logAudit };
}
