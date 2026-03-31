import { createContext, useContext, useState, useCallback, useRef } from 'react';
import {
  dbLoad, dbSave, dbLoadStatuses, dbSaveStatus, dbLoadHistory, dbAddHistory,
  dbLoadExtras, dbSaveExtra, dbGetLastGithubSignal, notifyTransporter
} from '../config/supabase';
import { GH_URL } from '../config/constants';
import { processExcel } from '../utils/excel';

const DataContext = createContext(null);

export function DataProvider({ children }) {
  const [data, setData] = useState(null);
  const [statuses, setStatuses] = useState({});
  const [history, setHistory] = useState([]);
  const [extras, setExtras] = useState({});
  const [lastUpdated, setLastUpdated] = useState('');
  const [lastSource, setLastSource] = useState('');
  const [loading, setLoading] = useState(false);
  const loadedRef = useRef(false);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [dbData, sts, hist, ext] = await Promise.all([
        dbLoad(), dbLoadStatuses(), dbLoadHistory(), dbLoadExtras()
      ]);
      if (dbData?.data) {
        setData(dbData.data);
        setLastUpdated(dbData.updated_at || '');
      }
      setStatuses(sts || {});
      setHistory(hist || []);
      setExtras(ext || {});
      loadedRef.current = true;

      // ── AUTO-REFRESH: detecta push do GitHub e atualiza base automaticamente ──
      try {
        const signal = await dbGetLastGithubSignal();
        if (signal) {
          const signalTime = new Date(signal.created_at).getTime();
          const lastSync   = new Date(dbData?.updated_at || 0).getTime();
          const planilhaModificada = signal.payload?.planilha_modificada !== false;
          if (planilhaModificada && signalTime > lastSync) {
            console.log('[AutoRefresh] Planilha atualizada no GitHub — sincronizando...');
            // Roda em background sem bloquear o carregamento inicial
            setTimeout(() => syncFromGitHub(true), 500);
          }
        }
      } catch (e) {
        console.warn('[AutoRefresh]', e.message);
      }
      // ─────────────────────────────────────────────────────────────────────────
    } catch (e) {
      console.error('Load error:', e);
    }
    setLoading(false);
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
    await dbSave(newData);
  }, []);

  const setNoteStatus = useCallback(async (key, value, obs, userName, nfDeb = '', pdfUrl = '', pedido = '') => {
    const oldVal = statuses[key] || 'pendente';
    const newStatuses = { ...statuses, [key]: 'st:' + value };
    setStatuses(newStatuses);
    await dbSaveStatus(key, 'st:' + value);

    if (nfDeb || pdfUrl || pedido) {
      const ex = { ...(extras[key] || {}), ...(nfDeb ? { nfDeb } : {}), ...(pdfUrl ? { pdfUrl } : {}), ...(pedido ? { pedido } : {}) };
      const newExtras = { ...extras, [key]: ex };
      setExtras(newExtras);
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

    // ── AUTO-NOTIFICAÇÃO: avisa transportador automaticamente quando cobr_tr ──
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
    // ──────────────────────────────────────────────────────────────────────────

    return entry;
  }, [statuses, extras, data]);

  const setNoteTracking = useCallback(async (key, value, obs, userName, date = '') => {
    const oldVal = statuses[key] || 'tk:aguardando';
    const newStatuses = { ...statuses, [key]: 'tk:' + value };
    setStatuses(newStatuses);
    await dbSaveStatus(key, 'tk:' + value);

    const entry = {
      nf_key: key,
      action: 'Tracking',
      status_from: String(oldVal).replace('tk:', ''),
      status_to: value + (date ? ` (${date})` : ''),
      observation: obs || '',
      user_name: userName,
      created_at: new Date().toISOString()
    };
    await dbAddHistory(entry);
    setHistory(prev => [entry, ...prev]);
    return entry;
  }, [statuses]);

  const saveExtra = useCallback(async (key, value) => {
    const newExtras = { ...extras, [key]: value };
    setExtras(newExtras);
    await dbSaveExtra(key, value);
  }, [extras]);

  const patchExtra = useCallback(async (key, patch) => {
    const current = extras[key] || {};
    const next = { ...(typeof current === 'string' ? {} : current), ...patch };
    const newExtras = { ...extras, [key]: next };
    setExtras(newExtras);
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
    const newExtras = { ...extras, [chatKey]: saved };
    setExtras(newExtras);
    await dbSaveExtra(chatKey, saved);
  }, [extras]);

  const getChat = useCallback((noteKey) => {
    const chatKey = 'chat:' + noteKey;
    const v = extras[chatKey];
    if (!v) return [];
    try { return typeof v === 'string' ? JSON.parse(v) : (Array.isArray(v) ? v : v.msgs || []); } catch { return []; }
  }, [extras]);

  const getTrEmails = useCallback((trName) => {
    if (!trName) return '';
    const k = 'tr_email:' + trName;
    const v = extras[k];
    return typeof v === 'string' ? v : (v?.emails || '');
  }, [extras]);

  const setTrEmails = useCallback(async (trName, emails) => {
    const key = 'tr_email:' + trName;
    const value = { emails };
    const newExtras = { ...extras, [key]: value };
    setExtras(newExtras);
    await dbSaveExtra(key, value);
  }, [extras]);

  return (
    <DataContext.Provider value={{
      data, statuses, history, extras, lastUpdated, lastSource, loading,
      loadAll, syncFromGitHub, importExcel,
      setNoteStatus, setNoteTracking,
      saveExtra, patchExtra, addChatMessage, getChat, getTrEmails, setTrEmails,
      loaded: loadedRef.current
    }}>
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  return useContext(DataContext);
}
