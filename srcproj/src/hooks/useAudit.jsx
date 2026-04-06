import { useCallback, useEffect, useRef, useState } from 'react';
import { dbAddAudit, dbLoadAudit } from '../config/supabase';
export function useAudit(user) {
  const [audit, setAudit] = useState([]);
  const ipRef = useRef('');
  useEffect(() => {
    dbLoadAudit().then(setAudit);
    fetch('https://api.ipify.org?format=json').then(r => r.json()).then(d => { ipRef.current = d.ip || ''; }).catch(() => {});
  }, []);
  const logAudit = useCallback(async ({ nfKey, action, field, oldValue, newValue, obs, origin = 'manual' }) => {
    const payload = {
      nf_key: nfKey, usuario: user?.name || user?.email || 'Sistema', perfil: user?.role || 'internal',
      acao: action, campo: field || '', valor_anterior: oldValue == null ? '' : String(oldValue),
      valor_novo: newValue == null ? '' : String(newValue), observacao: obs || '', origem: origin,
      ip: ipRef.current, user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
      session_id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
      created_at: new Date().toISOString()
    };
    await dbAddAudit(payload);
    setAudit(prev => [payload, ...prev]);
  }, [user]);
  return { audit, logAudit };
}
