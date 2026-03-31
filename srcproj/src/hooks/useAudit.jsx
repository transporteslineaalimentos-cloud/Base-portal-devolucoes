import { useCallback, useEffect, useRef, useState } from 'react';
import { dbAddAudit, dbLoadAudit } from '../config/supabase';

// IP cacheado no módulo — só faz fetch uma vez por sessão
let _cachedIp = '';
async function getIp() {
  if (_cachedIp) return _cachedIp;
  try {
    const r = await fetch('https://api.ipify.org?format=json', { signal: AbortSignal.timeout(3000) });
    const d = await r.json();
    _cachedIp = d.ip || '';
  } catch { _cachedIp = ''; }
  return _cachedIp;
}

// Session ID único por aba (não recriado a cada auditoria)
const SESSION_ID = typeof crypto !== 'undefined' && crypto.randomUUID
  ? crypto.randomUUID()
  : String(Date.now());

export function useAudit(user) {
  const [audit, setAudit] = useState([]);
  const loadedRef = useRef(false);

  useEffect(() => {
    if (loadedRef.current) return;
    loadedRef.current = true;
    dbLoadAudit().then(data => setAudit(data || []));
    // Pré-carrega IP em background para estar pronto na primeira auditoria
    getIp();
  }, []);

  const logAudit = useCallback(async ({ nfKey, action, field, oldValue, newValue, obs, origin = 'manual' }) => {
    const ip = await getIp();
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
      session_id: SESSION_ID,
      created_at: new Date().toISOString(),
    };
    await dbAddAudit(payload);
    setAudit(prev => [payload, ...prev]);
  }, [user]);

  return { audit, logAudit };
}
