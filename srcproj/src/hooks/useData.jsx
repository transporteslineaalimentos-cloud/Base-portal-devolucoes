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

export function DataProvider({ children }) {
  const [data, setData] = useState(null);
  const [statuses, setStatuses] = useState({});
  const [history, setHistory] = useState([]);
  const [extras, setExtras] = useState({});
  const [transportadores, setTransportadores] = useState([]);  // nova tabela dedicada
  const [kpiSnapshots, setKpiSnapshots] = useState([]);         // histórico mensal MoM
  const [lastUpdated, setLastUpdated] = useState('');
  const [lastSource, setLastSource] = useState('');
  const [loading, setLoading] = useState(false);
  const loadedRef = useRef(false);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [dbData, sts, hist, ext, trs, snaps] = await Promise.all([
        dbLoad(), dbLoadStatuses(), dbLoadHistory(), dbLoadExtras(), dbLoadTransportadores(), dbLoadKpiSnapshots()
      ]);

      // Só atualiza data se veio algo válido — evita apagar dados existentes por falha de rede/token
      if (dbData?.data) {
        setData(dbData.data);
        setLastUpdated(dbData.updated_at || '');
      }
      // Statuses, history, extras e transportadores: só atualiza se retornou dados não-vazios
      if (sts && Object.keys(sts).length > 0) setStatuses(sts);
      if (hist && hist.length > 0) setHistory(hist);
      if (ext  && Object.keys(ext).length > 0) setExtras(ext);
      if (trs  && trs.length > 0) setTransportadores(trs);
      if (snaps && snaps.length > 0) setKpiSnapshots(snaps);

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

  const setNoteStatus = useCallback(async (key, value, obs, userName, nfDeb = '', pdfUrl = '', pedido = '', valorNf = '') => {
    const oldVal = statuses[key] || 'pendente';
    const newStatuses = { ...statuses, [key]: 'st:' + value };
    setStatuses(newStatuses);
    await dbSaveStatus(key, 'st:' + value);

    if (nfDeb || pdfUrl || pedido || valorNf) {
      // Usar functional update para evitar stale closure nos extras
      let currentEx = {};
      setExtras(prev => {
        currentEx = typeof prev[key] === 'object' && prev[key] !== null ? prev[key] : {};
        return prev;
      });
      // Aguardar um tick para currentEx ser preenchido
      await new Promise(r => setTimeout(r, 0));
      const ex = {
        ...currentEx,
        ...(nfDeb   ? { nfDeb }   : {}),
        ...(pdfUrl  ? { pdfUrl }  : {}),
        ...(pedido  ? { pedido }  : {}),
        ...(valorNf ? { valorNfCobrado: valorNf } : {}),
      };
      setExtras(prev => ({ ...prev, [key]: ex }));
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

  const setNoteTracking = useCallback(async (key, value, obs, userName, date = '', pdfUrl = '') => {
    const oldVal = statuses[key] || 'tk:aguardando';
    const newStatuses = { ...statuses, [key]: 'tk:' + value };
    setStatuses(newStatuses);
    await dbSaveStatus(key, 'tk:' + value);

    // Salvar comprovante no extras vinculado ao status específico
    if (pdfUrl) {
      const ex = { ...(extras[key] || {}), [`pdfUrl_${value}`]: pdfUrl };
      setExtras(prev => ({ ...prev, [key]: ex }));
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

  // ── TRANSPORTADORES — nova tabela dedicada ───────────────────
  // getTrEmails: lê da lista em memória (carregada no loadAll)
  const getTrEmails = useCallback((trName) => {
    if (!trName) return '';
    const tr = transportadores.find(t => t.nome === trName);
    if (tr) return tr.emails || '';
    // fallback: extras legados (migração)
    const k = 'tr_email:' + trName;
    const v = extras[k];
    return typeof v === 'string' ? v : (v?.emails || '');
  }, [transportadores, extras]);

  // setTrEmails: salva na nova tabela E atualiza lista em memória
  const setTrEmails = useCallback(async (trName, emails) => {
    await dbSaveTransportador(trName, { emails });
    setTransportadores(prev => {
      const exists = prev.find(t => t.nome === trName);
      if (exists) return prev.map(t => t.nome === trName ? { ...t, emails } : t);
      return [...prev, { nome: trName, emails }];
    });
  }, []);

  // saveTransportador: salva todos os campos (nome, emails, telefone, contato, obs)
  const saveTransportador = useCallback(async (nome, fields) => {
    await dbSaveTransportador(nome, fields);
    setTransportadores(prev => {
      const exists = prev.find(t => t.nome === nome);
      if (exists) return prev.map(t => t.nome === nome ? { ...t, ...fields, nome } : t);
      return [...prev, { nome, ...fields }];
    });
  }, []);

  // ── REALTIME — recebe mudanças de outros usuários em tempo real ──────────
  useEffect(() => {
    const channel = supabase
      .channel('portal-realtime-data', { config: { broadcast: { self: false } } })

      // Status atualizado por outro usuário → atualizar mapa local imediatamente
      .on('postgres_changes', { event: '*', schema: 'public', table: 'portal_statuses' }, (payload) => {
        if (payload.new?.key && payload.new?.status) {
          setStatuses(prev => ({ ...prev, [payload.new.key]: payload.new.status }));
        }
      })

      // Extras atualizados (transportador, CT-e, aceite) → mesclar com estado atual
      .on('postgres_changes', { event: '*', schema: 'public', table: 'portal_extras' }, (payload) => {
        if (payload.new?.key) {
          setExtras(prev => ({ ...prev, [payload.new.key]: payload.new.value }));
        }
      })

      // Novo evento na linha do tempo → adicionar ao histórico
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'portal_history' }, (payload) => {
        if (payload.new) {
          setHistory(prev => [payload.new, ...prev]);
        }
      })

      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.info('[Realtime] Conectado — atualizações em tempo real ativas ✓');
        } else if (status === 'CHANNEL_ERROR') {
          console.warn('[Realtime] Erro de conexão — tentando reconectar...');
        }
      });

    return () => { supabase.removeChannel(channel); };
  }, []); // eslint-disable-line
  // ────────────────────────────────────────────────────────────────────────

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
