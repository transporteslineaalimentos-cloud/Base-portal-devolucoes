import { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import {
  dbLoad, dbSave, dbLoadStatuses, dbSaveStatus, dbLoadHistory, dbAddHistory,
  dbLoadExtras, dbSaveExtra, dbGetLastGithubSignal, notifyTransporter,
  dbLoadTransportadores, dbSaveTransportador, dbGetTransportadorEmails,
  dbLoadKpiSnapshots
} from '../config/supabase';
import { supabase } from '../config/constants';
import { GH_URL } from '../config/constants';
import { processExcel } from '../utils/excel';

const DataContext = createContext(null);

// ── Chaves de cache no localStorage ─────────────────────────────
const CACHE_KEY_DATA      = 'portal_cache_data';
const CACHE_KEY_STATUSES  = 'portal_cache_statuses';
const CACHE_KEY_EXTRAS    = 'portal_cache_extras';
const CACHE_KEY_TRANSP    = 'portal_cache_transportadores';
const CACHE_KEY_TS        = 'portal_cache_timestamp';
// Cache expira após 10 minutos (evita dados muito velhos sem internet)
const CACHE_TTL_MS = 10 * 60 * 1000;

function readCache(key) {
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : null; } catch { return null; }
}
function writeCache(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* quota exceeded – ignore */ }
}
function cacheIsStale() {
  const ts = readCache(CACHE_KEY_TS);
  if (!ts) return true;
  return Date.now() - ts > CACHE_TTL_MS;
}

export function DataProvider({ children }) {
  // Inicializa estado com cache instantâneo se disponível
  const [data, setData] = useState(() => readCache(CACHE_KEY_DATA) || null);
  const [statuses, setStatuses] = useState(() => readCache(CACHE_KEY_STATUSES) || {});
  const [history, setHistory] = useState([]);
  const [extras, setExtras] = useState(() => readCache(CACHE_KEY_EXTRAS) || {});
  const [transportadores, setTransportadores] = useState(() => readCache(CACHE_KEY_TRANSP) || []);
  const [kpiSnapshots, setKpiSnapshots] = useState([]);
  const [lastUpdated, setLastUpdated] = useState('');
  const [lastSource, setLastSource] = useState('');
  // loading=true somente quando não há cache (primeira vez)
  const [loading, setLoading] = useState(() => !readCache(CACHE_KEY_DATA));
  const loadedRef = useRef(false);

  const loadAll = useCallback(async () => {
    // Se já temos cache, só mostra loading=true na primeira vez absoluta
    if (!loadedRef.current && !readCache(CACHE_KEY_DATA)) {
      setLoading(true);
    }

    try {
      // Fase 1: carregar dados críticos em paralelo (sem histórico — mais lento)
      const [dbData, sts, ext, trs] = await Promise.all([
        dbLoad(), dbLoadStatuses(), dbLoadExtras(), dbLoadTransportadores()
      ]);

      if (dbData?.data) {
        setData(dbData.data);
        setLastUpdated(dbData.updated_at || '');
        writeCache(CACHE_KEY_DATA, dbData.data);
      }
      if (sts && Object.keys(sts).length > 0) {
        setStatuses(sts);
        writeCache(CACHE_KEY_STATUSES, sts);
      }
      if (ext && Object.keys(ext).length > 0) {
        setExtras(ext);
        writeCache(CACHE_KEY_EXTRAS, ext);
      }
      if (trs && trs.length > 0) {
        setTransportadores(trs);
        writeCache(CACHE_KEY_TRANSP, trs);
      }
      writeCache(CACHE_KEY_TS, Date.now());

      loadedRef.current = true;
      setLoading(false);

      // Fase 2: carregar dados secundários em background (não bloqueia UI)
      Promise.all([dbLoadHistory(), dbLoadKpiSnapshots()]).then(([hist, snaps]) => {
        if (hist && hist.length > 0) setHistory(hist);
        if (snaps && snaps.length > 0) setKpiSnapshots(snaps);
      }).catch(e => console.warn('[loadAll background]', e.message));

      // ── AUTO-REFRESH: detecta push do GitHub em background ──
      dbGetLastGithubSignal().then(signal => {
        if (!signal) return;
        const signalTime = new Date(signal.created_at).getTime();
        const lastSync   = new Date(dbData?.updated_at || 0).getTime();
        const planilhaModificada = signal.payload?.planilha_modificada !== false;
        if (planilhaModificada && signalTime > lastSync) {
          console.log('[AutoRefresh] Planilha atualizada no GitHub — sincronizando...');
          syncFromGitHub(true);
        }
      }).catch(() => {});

    } catch (e) {
      console.error('Load error:', e);
      setLoading(false);
    }
  }, []);

  const syncFromGitHub = useCallback(async (silent = false) => {
    try {
      const res = await fetch(GH_URL + '?t=' + Date.now());
      if (!res.ok) throw new Error('GitHub: ' + res.status);
      const buf = await res.arrayBuffer();
      const newData = processExcel(buf);
      setData(newData);
      setLastUpdated(new Date().toISOString());
      setLastSource('GitHub');
      writeCache(CACHE_KEY_DATA, newData);
      writeCache(CACHE_KEY_TS, Date.now());
      await dbSave(newData);
      if (!silent) alert('Base atualizada do GitHub!');
    } catch (e) {
      console.log('GitHub sync:', e.message);
      if (!silent) alert('Erro: ' + e.message);
    }
  }, []);

  const importExcel = useCallback(async (file) => {
    const buf = await file.arrayBuffer();
    const newData = processExcel(buf);
    setData(newData);
    setLastUpdated(new Date().toISOString());
    setLastSource('Manual');
    writeCache(CACHE_KEY_DATA, newData);
    writeCache(CACHE_KEY_TS, Date.now());
    await dbSave(newData);
  }, []);

  const setNoteStatus = useCallback(async (key, value, obs, userName, nfDeb = '', pdfUrl = '', pedido = '', valorNf = '') => {
    const oldVal = statuses[key] || 'pendente';
    const newStatuses = { ...statuses, [key]: 'st:' + value };
    setStatuses(newStatuses);
    writeCache(CACHE_KEY_STATUSES, newStatuses);
    await dbSaveStatus(key, 'st:' + value);

    if (nfDeb || pdfUrl || pedido || valorNf) {
      let currentEx = {};
      setExtras(prev => {
        currentEx = typeof prev[key] === 'object' && prev[key] !== null ? prev[key] : {};
        return prev;
      });
      await new Promise(r => setTimeout(r, 0));
      const ex = {
        ...currentEx,
        ...(nfDeb   ? { nfDeb }   : {}),
        ...(pdfUrl  ? { pdfUrl }  : {}),
        ...(pedido  ? { pedido }  : {}),
        ...(valorNf ? { valorNfCobrado: valorNf } : {}),
      };
      setExtras(prev => {
        const next = { ...prev, [key]: ex };
        writeCache(CACHE_KEY_EXTRAS, next);
        return next;
      });
      await dbSaveExtra(key, ex);
    }

    const entry = {
      nf_key: key,
      action: nfDeb ? 'Status NF Débito' : 'Status',
      status_from: String(oldVal).replace('st:', ''),
      status_to: value,
      nf_debito: nfDeb || '',
      observation: obs || '',
      user_name: userName,
      created_at: new Date().toISOString()
    };
    await dbAddHistory(entry);
    setHistory(prev => [entry, ...prev]);

    // ── AUTO-NOTIFICAÇÃO ──
    if (value === 'cobr_tr') {
      try {
        const allNotes = [...(data?.cobr || []), ...(data?.pend || [])];
        const note = allNotes.find(n => `${n.nfd || ''}|${n.nfo || ''}` === key);
        if (note) {
          const exObj    = typeof extras[key] === 'object' ? (extras[key] || {}) : {};
          const trName   = exObj.trOverride || note.tr || '';
          const trEmailV = extras['tr_email:' + trName];
          const tr_emails = typeof trEmailV === 'string' ? trEmailV : (trEmailV?.emails || '');
          if (tr_emails) {
            notifyTransporter({ nf_key: key, tr_emails, tr_name: trName,
              valor: note.v, motivo: note.mo, nfd: note.nfd, nfo: note.nfo, cliente: note.cl });
            console.log(`[AutoNotify] Notificando ${trName}`);
          }
        }
      } catch (e) { console.warn('[AutoNotify]', e.message); }
    }

    return entry;
  }, [statuses, extras, data]);

  const setNoteTracking = useCallback(async (key, value, obs, userName, date = '', pdfUrl = '') => {
    const oldVal = statuses[key] || 'tk:aguardando';
    const newStatuses = { ...statuses, [key]: 'tk:' + value };
    setStatuses(newStatuses);
    writeCache(CACHE_KEY_STATUSES, newStatuses);
    await dbSaveStatus(key, 'tk:' + value);

    if (pdfUrl) {
      const ex = { ...(extras[key] || {}), [`pdfUrl_${value}`]: pdfUrl };
      setExtras(prev => {
        const next = { ...prev, [key]: ex };
        writeCache(CACHE_KEY_EXTRAS, next);
        return next;
      });
      await dbSaveExtra(key, ex);
    }

    const entry = {
      nf_key: key,
      action: 'Tracking',
      status_from: String(oldVal).replace('tk:', ''),
      status_to: value + (date ? ` (${date})` : ''),
      nf_debito: pdfUrl ? `[comprovante]` : '',
      observation: obs || '',
      user_name: userName,
      created_at: new Date().toISOString()
    };
    await dbAddHistory(entry);
    setHistory(prev => [entry, ...prev]);
    return entry;
  }, [statuses, extras]);

  const saveExtra = useCallback(async (key, value) => {
    setExtras(prev => {
      const next = { ...prev, [key]: value };
      writeCache(CACHE_KEY_EXTRAS, next);
      return next;
    });
    await dbSaveExtra(key, value);
  }, []);

  const patchExtra = useCallback(async (key, patch) => {
    const current = extras[key] || {};
    const next = { ...(typeof current === 'string' ? {} : current), ...patch };
    setExtras(prev => {
      const newExtras = { ...prev, [key]: next };
      writeCache(CACHE_KEY_EXTRAS, newExtras);
      return newExtras;
    });
    await dbSaveExtra(key, next);
    return next;
  }, [extras]);

  const addChatMessage = useCallback(async (noteKey, msg, user, role) => {
    const chatKey = 'chat:' + noteKey;
    const existing = extras[chatKey];
    let msgs = [];
    try {
      msgs = existing ? (typeof existing === 'string' ? JSON.parse(existing) : existing.msgs || []) : [];
    } catch {
      msgs = [];
    }
    msgs.push({ msg, user, role, ts: new Date().toISOString() });
    const saved = { msgs };
    setExtras(prev => {
      const next = { ...prev, [chatKey]: saved };
      writeCache(CACHE_KEY_EXTRAS, next);
      return next;
    });
    await dbSaveExtra(chatKey, saved);
  }, [extras]);

  const getChat = useCallback((noteKey) => {
    const chatKey = 'chat:' + noteKey;
    const v = extras[chatKey];
    if (!v) return [];
    try { return typeof v === 'string' ? JSON.parse(v) : (Array.isArray(v) ? v : v.msgs || []); } catch { return []; }
  }, [extras]);

  // ── TRANSPORTADORES ──────────────────────────────────────────
  const getTrEmails = useCallback((trName) => {
    if (!trName) return '';
    const tr = transportadores.find(t => t.nome === trName);
    if (tr) return tr.emails || '';
    const lower = trName.toLowerCase().trim();
    const tr2 = transportadores.find(t => (t.nome || '').toLowerCase().trim() === lower);
    if (tr2) return tr2.emails || '';
    const tr3 = transportadores.find(t => {
      const n = (t.nome || '').toLowerCase().trim();
      return n && (n.includes(lower) || lower.includes(n));
    });
    if (tr3) return tr3.emails || '';
    const k = 'tr_email:' + trName;
    const v = extras[k];
    return typeof v === 'string' ? v : (v?.emails || '');
  }, [transportadores, extras]);

  const setTrEmails = useCallback(async (trName, emails) => {
    await dbSaveTransportador(trName, { emails });
    setTransportadores(prev => {
      const next = prev.find(t => t.nome === trName)
        ? prev.map(t => t.nome === trName ? { ...t, emails } : t)
        : [...prev, { nome: trName, emails }];
      writeCache(CACHE_KEY_TRANSP, next);
      return next;
    });
  }, []);

  const saveTransportador = useCallback(async (nome, fields) => {
    await dbSaveTransportador(nome, fields);
    setTransportadores(prev => {
      const next = prev.find(t => t.nome === nome)
        ? prev.map(t => t.nome === nome ? { ...t, ...fields, nome } : t)
        : [...prev, { nome, ...fields }];
      writeCache(CACHE_KEY_TRANSP, next);
      return next;
    });
  }, []);

  // ── REALTIME ─────────────────────────────────────────────────
  useEffect(() => {
    const channel = supabase
      .channel('portal-realtime-data', { config: { broadcast: { self: false } } })

      .on('postgres_changes', { event: '*', schema: 'public', table: 'portal_statuses' }, (payload) => {
        if (payload.new?.key && payload.new?.status) {
          setStatuses(prev => {
            const next = { ...prev, [payload.new.key]: payload.new.status };
            writeCache(CACHE_KEY_STATUSES, next);
            return next;
          });
        }
      })

      .on('postgres_changes', { event: '*', schema: 'public', table: 'portal_extras' }, (payload) => {
        if (payload.new?.key) {
          setExtras(prev => {
            const next = { ...prev, [payload.new.key]: payload.new.value };
            writeCache(CACHE_KEY_EXTRAS, next);
            return next;
          });
        }
      })

      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'portal_history' }, (payload) => {
        if (payload.new) {
          setHistory(prev => [payload.new, ...prev]);
        }
      })

      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.info('[Realtime] Conectado ✓');
        } else if (status === 'CHANNEL_ERROR') {
          console.warn('[Realtime] Erro de conexão — tentando reconectar...');
        }
      });

    return () => { supabase.removeChannel(channel); };
  }, []); // eslint-disable-line

  return (
    <DataContext.Provider value={{
      data, statuses, history, extras, transportadores, kpiSnapshots, lastUpdated, lastSource, loading,
      loadAll, syncFromGitHub, importExcel,
      setNoteStatus, setNoteTracking,
      saveExtra, patchExtra, addChatMessage, getChat, getTrEmails, setTrEmails, saveTransportador,
      loaded: loadedRef.current
    }}>
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  return useContext(DataContext);
}
