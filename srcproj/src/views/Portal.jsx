import { useEffect, useMemo, useState } from 'react';
import { AuthProvider, useAuth } from '../hooks/useAuth.jsx';
import { DataProvider, useData } from '../hooks/useData.jsx';
import Login from './Login';
import Dashboard from './Dashboard';
import PendCobranca from './PendCobranca';
import PendLancamento from './PendLancamento';
import NfsDebito from './NfsDebito';
import Transportadores from './Transportadores';
import Aging from './Aging';
import Historico from './Historico';
import TransportDash from './TransportDash';
import AuditLog from './AuditLog';
import UsuariosAdmin from './UsuariosAdmin';
import StatusModal from '../components/StatusModal';
import EmailModal from '../components/EmailModal';
import NotificationBell from '../components/NotificationBell';
import { usePermissions } from '../hooks/usePermissions.jsx';
import { useNoteMeta } from '../hooks/useNoteMeta.jsx';
import { useAudit } from '../hooks/useAudit.jsx';
import { useNotifications } from '../hooks/useNotifications.jsx';
import { uploadPdf } from '../config/supabase.js';
import { SO, TK } from '../config/constants';
import { exportToExcel, exportWorkbook } from '../utils/excel';
import { generateNotification } from '../utils/notification';
import {
  filterNotes, getVisibleCobranca, getVisibleLancamento, getTransporter,
  getNoteKey, groupByNfDeb, summarizeTransporters, toExportRows,
  calcAging, transporterCanSee
} from '../utils/helpers';
import { useTheme } from '../hooks/useTheme.jsx';

// Filtros padrão — incluindo agingCat para suporte ao filtro vindo do dashboard de Aging
const DEFAULT_FILTERS = { search: '', area: 'TODOS', status: 'todos', transporters: [], agingCat: null };

function Portal() {
  const { user, logout, isTransporter, transporterName } = useAuth();
  const permissions = usePermissions(user);
  const portalData = useData();
  const {
    data, statuses, history, extras, lastUpdated, lastSource, loading,
    loadAll, syncFromGitHub, setNoteStatus, setNoteTracking,
    addChatMessage, getTrEmails, setTrEmails, patchExtra
  } = portalData;
  const { noteMeta, saveMeta } = useNoteMeta();
  const { audit, logAudit } = useAudit(user);
  const { notifications, markRead, createNotification } = useNotifications(user);
  const { theme, isDark, toggleTheme } = useTheme();

  const [tab, setTab] = useState(isTransporter ? 'tr_dash' : 'dashboard');
  const [expandedId, setExpandedId] = useState(null);
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [selected, setSelected] = useState(new Set());
  const [detailTab, setDetailTab] = useState({});
  const [tabFilters, setTabFilters] = useState({});
  const [statusModal, setStatusModal] = useState({ open: false, type: 'status', key: '', val: '', label: '', showDate: false, showNfFields: false, batchKeys: [] });
  const [statusLoading, setStatusLoading] = useState(false);
  const [emailModal, setEmailModal] = useState({ open: false, notes: [], transporterName: '', defaultTo: '' });
  const [acceptanceModal, setAcceptanceModal] = useState({ opened: false, key: '' });
  const [editTransport, setEditTransport] = useState({ open: false, note: null, value: '' });
  const [notifOpen, setNotifOpen] = useState(false);
  const [batchStatusOpen, setBatchStatusOpen] = useState(false);
  const [batchStatusValue, setBatchStatusValue] = useState('validado');

  useEffect(() => {
    loadAll().then(() => { if (!isTransporter) syncFromGitHub(true); });
  }, []); // eslint-disable-line

  const applyNoteFilter = (notes) => {
    const nf = permissions.noteFilter;
    if (!nf) return notes;
    return notes.filter(n => Object.entries(nf).every(([k, v]) => n[k] === v));
  };

  // CORRIGIDO: safeData com chaves corretas (cobr/pend, não cobranca/pendencias)
  const safeData = data || { cobr: [], pend: [] };
  const baseC = applyNoteFilter(getVisibleCobranca(safeData, statuses));
  const baseP = applyNoteFilter(getVisibleLancamento(safeData, statuses));

  const myC = isTransporter
    ? baseC.filter(d => {
        const tr = getTransporter(d, extras) || '';
        const st = statuses[getNoteKey(d)]?.replace('st:', '') || 'pendente';
        return tr === transporterName && transporterCanSee('cobr', st);
      })
    : baseC;
  const myP = isTransporter
    ? baseP.filter(d => {
        const tr = getTransporter(d, extras) || '';
        const tk = statuses[getNoteKey(d)]?.replace('tk:', '') || 'aguardando';
        return tr === transporterName && transporterCanSee('pend', tk);
      })
    : baseP;

  const currentC = myC;
  const currentP = myP;

  const visibleTabsMap = {
    dashboard: 'Dashboard',
    cobranca: `Pend. Cobrança (${currentC.length})`,
    lancamento: `Pend. Lançamento (${currentP.length})`,
    nfDebito: 'NFs Débito',
    transportadores: 'Por Transportador',
    aging: '⏱ Aging',
    historico: 'Histórico',
    auditoria: 'Auditoria',
    usuarios: 'Usuários',
    tr_dash: 'Dashboard',
    tr_retorno: `Devoluções (${currentP.length})`,
    tr_cobranca: `Cobranças (${currentC.length})`,
  };
  const currentTabs = permissions.visibleTabs.map(id => ({ id, l: visibleTabsMap[id] })).filter(Boolean);

  const users = useMemo(() => {
    const set = new Set(history.map(h => h.user_name).filter(Boolean));
    return [...set];
  }, [history]);

  const nfGroups = useMemo(() => groupByNfDeb(currentC, extras, history), [currentC, extras, history]);
  const trSummary = useMemo(() => summarizeTransporters([...currentC, ...currentP], extras), [currentC, currentP, extras]);

  if (!data && loading) return (
    <div className="flex items-center justify-center h-screen premium-shell">
      <div className="premium-card px-6 py-4 text-sm premium-muted">Carregando...</div>
    </div>
  );
  if (!data) return (
    <div className="flex items-center justify-center h-screen premium-shell">
      <div className="premium-card px-6 py-4 text-sm premium-muted">Sem dados. Atualize do GitHub.</div>
    </div>
  );

  const changeTab = (t, patch = null) => {
    setTabFilters(prev => ({ ...prev, [tab]: { ...filters } }));
    const saved = tabFilters[t] || DEFAULT_FILTERS;
    const next = patch ? { ...saved, ...patch } : saved;
    setFilters(next);
    setTab(t);
    setExpandedId(null);
    setSelected(new Set());
  };

  const openStatusModal = (key, val, label, isEmitida = false) => {
    setStatusModal({ open: true, type: 'status', key, val, label, showDate: false, showNfFields: isEmitida, batchKeys: [] });
  };
  const openTrackingModal = (key, val, label, hasDate = false) => {
    setStatusModal({ open: true, type: 'tracking', key, val, label, showDate: hasDate, showNfFields: false, batchKeys: [] });
  };
  const closeStatusModal = () => setStatusModal({ open: false, type: 'status', key: '', val: '', label: '', showDate: false, showNfFields: false, batchKeys: [] });

  const getAutoMetaPatch = (type, value, currentMeta = {}) => {
    if (type === 'status') {
      const map = {
        pendente: { responsavel: 'interno', proxima_acao: 'Analisar internamente a cobrança', cobrar_transportador: false },
        validado: { responsavel: 'interno', proxima_acao: 'Enviar cobrança para posição do transportador', cobrar_transportador: true },
        cobr_tr: { responsavel: 'transportador', proxima_acao: 'Aguardar resposta do transportador', cobrar_transportador: true },
        tr_contestou: { responsavel: 'interno', proxima_acao: 'Analisar contestação do transportador', cobrar_transportador: true, aguardando_documento: true },
        tr_concordou: { responsavel: 'interno', proxima_acao: 'Emitir notificação/NF débito', cobrar_transportador: true },
        tr_nao_resp: { responsavel: 'interno', proxima_acao: 'Revisar evidência e decidir continuidade', cobrar_transportador: true },
        aprovar_ret: { responsavel: 'interno', proxima_acao: 'Analisar retorno antes de cobrar', cobrar_transportador: true },
        emitida: { responsavel: 'controladoria', proxima_acao: 'Acompanhar cobrança enviada ao transportador', cobrar_transportador: true },
        cobrada: { responsavel: 'controladoria', proxima_acao: 'Acompanhar pagamento da cobrança', cobrar_transportador: true },
        paga: { responsavel: 'encerrado', proxima_acao: 'Processo encerrado com pagamento', cobrar_transportador: true },
        cancelada: { responsavel: 'encerrado', proxima_acao: 'Cobrança cancelada', cobrar_transportador: false },
      };
      return { ...currentMeta, ...(map[value] || {}) };
    }
    const map = {
      aguardando: { responsavel: 'interno', proxima_acao: 'Analisar devolução internamente', retorno_autorizado: false },
      notificado: { responsavel: 'interno', proxima_acao: 'Concluir análise e decidir retorno', retorno_autorizado: false },
      retorno_auto: { responsavel: 'transportador', proxima_acao: 'Transportador deve informar posição do retorno', retorno_autorizado: true },
      em_transito: { responsavel: 'transportador', proxima_acao: 'Acompanhar retorno ao CD', retorno_autorizado: true },
      agendado: { responsavel: 'transportador', proxima_acao: 'Cumprir recebimento agendado', retorno_autorizado: true },
      perdeu_agenda: { responsavel: 'interno', proxima_acao: 'Reagendar recebimento', retorno_autorizado: true },
      dev_recusada: { responsavel: 'interno', proxima_acao: 'Analisar recusa do transportador', retorno_autorizado: true, aguardando_documento: true },
      dev_apos_dt: { responsavel: 'interno', proxima_acao: 'Validar devolução após entrega', retorno_autorizado: true, aguardando_documento: true },
      extravio: { responsavel: 'interno', proxima_acao: 'Avaliar conversão para cobrança', retorno_autorizado: true, cobrar_transportador: true },
      entregue: { responsavel: 'interno', proxima_acao: 'Conferir comprovante e encerrar', retorno_autorizado: true },
      ret_nao_auto: { responsavel: 'encerrado', proxima_acao: 'Caso encerrado sem retorno autorizado', retorno_autorizado: false },
      encaminhar: { responsavel: 'interno', proxima_acao: 'Tratar na fila de cobrança', retorno_autorizado: true, cobrar_transportador: true },
    };
    return { ...currentMeta, ...(map[value] || {}) };
  };

  const confirmStatusModal = async ({ obs, date, nfDeb, pedido, pdfFile }) => {
    setStatusLoading(true);
    try {
      let pdfUrl = '';
      if (statusModal.showNfFields && pdfFile) {
        pdfUrl = await uploadPdf(`${statusModal.key}_${nfDeb || 'nfdeb'}`, pdfFile);
      }
      const keys = statusModal.batchKeys?.length ? statusModal.batchKeys : [statusModal.key];
      for (const key of keys) {
        const oldValue = statusModal.type === 'status'
          ? (statuses[key]?.replace('st:', '') || 'pendente')
          : (statuses[key]?.replace('tk:', '') || 'aguardando');
        if (statusModal.type === 'status') {
          await setNoteStatus(key, statusModal.val, obs || '', user?.name, nfDeb || '', pdfUrl || '', pedido || '');
          await saveMeta(key, getAutoMetaPatch('status', statusModal.val, noteMeta[key] || {}));
          await logAudit({ nfKey: key, action: 'Status', field: 'status', oldValue, newValue: statusModal.val, obs, origin: statusModal.batchKeys?.length ? 'batch' : 'manual' });
        } else {
          await setNoteTracking(key, statusModal.val, obs || '', user?.name, date || '');
          await saveMeta(key, getAutoMetaPatch('tracking', statusModal.val, noteMeta[key] || {}));
          await logAudit({ nfKey: key, action: 'Tracking', field: 'tracking', oldValue, newValue: statusModal.val, obs, origin: statusModal.batchKeys?.length ? 'batch' : 'manual' });
        }
        if (user?.email) {
          await createNotification({
            destinatario: user.email, tipo: statusModal.type, titulo: 'Atualização na nota',
            mensagem: `${key} → ${statusModal.val}`, nf_key: key, lido: false, link: '',
            created_at: new Date().toISOString(),
          });
        }
      }
      closeStatusModal();
      setSelected(new Set());
    } catch (e) {
      alert(e.message);
    } finally {
      setStatusLoading(false);
    }
  };

  const openEmailForNotes = (notes, transporterNameFromArg = '') => {
    if (!notes.length) return;
    const trName = transporterNameFromArg || getTransporter(notes[0], extras) || 'Transportador';
    setEmailModal({ open: true, notes, transporterName: trName, defaultTo: getTrEmails(trName) });
  };

  const handleEmailSent = async ({ to }) => {
    for (const note of emailModal.notes) {
      await logAudit({ nfKey: getNoteKey(note), action: 'Email enviado', field: 'email', oldValue: '', newValue: to, origin: 'manual' });
    }
  };

  const exportCurrentView = () => {
    if (tab === 'cobranca' || tab === 'tr_cobranca') {
      exportToExcel(toExportRows(filterNotes(currentC, filters, statuses, 'cobr', extras), statuses, extras, 'cobr', noteMeta), 'cobranca');
    } else if (tab === 'lancamento' || tab === 'tr_retorno') {
      exportToExcel(toExportRows(filterNotes(currentP, filters, statuses, 'pend', extras), statuses, extras, 'pend', noteMeta), 'lancamento');
    } else if (tab === 'historico') {
      exportToExcel(history, 'historico');
    } else if (tab === 'transportadores') {
      exportToExcel(trSummary, 'transportadores');
    } else if (tab === 'aging') {
      exportToExcel(currentP.map(n => ({ ...n, aging: calcAging(n) })), 'aging');
    } else if (tab === 'nfDebito') {
      exportToExcel(nfGroups.flatMap(g => g.notes.map(n => ({ nfDeb: g.nfDeb, pedido: g.pedido, nfd: n.nfd, nfo: n.nfo, cliente: n.cl, valor: n.v }))), 'nfs_debito');
    }
  };

  const exportComplete = () => {
    exportWorkbook({
      cobranca: toExportRows(currentC, statuses, extras, 'cobr', noteMeta),
      lancamento: toExportRows(currentP, statuses, extras, 'pend', noteMeta),
      historico: history,
      auditoria: audit,
      transportadores: trSummary,
      nfs_debito: nfGroups.flatMap(g => g.notes.map(n => ({ nfDeb: g.nfDeb, pedido: g.pedido, nfd: n.nfd, nfo: n.nfo, cliente: n.cl, valor: n.v }))),
    });
  };

  const handleBatchGenerate = (notes) => {
    if (!notes.length) return alert('Selecione ao menos uma nota.');
    const grouped = {};
    notes.forEach(n => {
      const tr = getTransporter(n, extras) || 'Transportador';
      if (!grouped[tr]) grouped[tr] = [];
      grouped[tr].push(n);
    });
    Object.entries(grouped).forEach(([tr, list]) => generateNotification(list, tr));
  };

  const handleBatchEmail = (notes) => openEmailForNotes(notes);
  const handleBatchStatus = () => setBatchStatusOpen(true);
  const confirmBatchStatus = () => {
    if (!selected.size) return;
    const label = [...SO, ...TK].find(s => s.v === batchStatusValue)?.l || batchStatusValue;
    const modeType = SO.some(s => s.v === batchStatusValue) ? 'status' : 'tracking';
    setStatusModal({
      open: true, type: modeType, key: '', val: batchStatusValue, label,
      showDate: TK.find(t => t.v === batchStatusValue)?.hasDate || false,
      showNfFields: batchStatusValue === 'emitida',
      batchKeys: [...selected],
    });
    setBatchStatusOpen(false);
  };

  const acceptanceHandler = {
    opened: acceptanceModal.opened,
    key: acceptanceModal.key,
    open: (key) => setAcceptanceModal({ opened: true, key }),
    close: () => setAcceptanceModal({ opened: false, key: '' }),
    save: async (key, aceiteData) => {
      await patchExtra('aceite:' + key, aceiteData);
      await logAudit({ nfKey: key, action: 'Aceite formal', field: 'aceite', oldValue: '', newValue: aceiteData.email, origin: 'transportador' });
    },
  };

  const openEditTransport = (note) => setEditTransport({ open: true, note, value: getTransporter(note, extras) || '' });
  const saveTransportOverride = async () => {
    const key = getNoteKey(editTransport.note);
    const oldValue = getTransporter(editTransport.note, extras) || '';
    await patchExtra(key, { trOverride: editTransport.value });
    await logAudit({ nfKey: key, action: 'Transportador alterado', field: 'transportador', oldValue, newValue: editTransport.value, origin: 'manual' });
    setEditTransport({ open: false, note: null, value: '' });
  };

  const renderTab = () => {
    const commonListProps = {
      filters, setFilters, extras, statuses, expandedId, setExpandedId, selected, setSelected,
      detailTab, setDetailTab, addChatMessage, user, isTransporter, history,
      onStatus: openStatusModal, onTracking: openTrackingModal, onOpenEmail: openEmailForNotes,
      onEditTransporter: openEditTransport, acceptanceHandler, permissions, noteMeta, saveMeta, users,
      exportButton: permissions.canExport
        ? <button onClick={exportCurrentView} className="px-3 py-2 bg-green-600 text-white rounded-lg text-xs font-semibold h-fit">Excel desta aba</button>
        : null,
      onBatchGenerate: handleBatchGenerate, onBatchEmail: handleBatchEmail, onBatchStatus: handleBatchStatus,
    };

    if (tab === 'dashboard' && !isTransporter) return <Dashboard cobrNotes={currentC} pendNotes={currentP} statuses={statuses} onOpenTab={changeTab} noteMeta={noteMeta} />;
    if (tab === 'cobranca') return <PendCobranca {...commonListProps} notes={currentC} />;
    if (tab === 'lancamento') return <PendLancamento {...commonListProps} notes={currentP} />;
    if (tab === 'nfDebito') return <NfsDebito groups={nfGroups} />;
    if (tab === 'transportadores') return (
      <Transportadores
        summary={trSummary}
        getEmails={getTrEmails}
        setEmails={setTrEmails}
        onOpenFiltered={(trName, mode) => changeTab(
          mode === 'cobr' ? 'cobranca' : 'lancamento',
          { transporters: [trName], search: '', area: 'TODOS', status: 'todos', agingCat: null }
        )}
      />
    );
    if (tab === 'aging') return (
      <Aging
        pendNotes={currentP}
        extras={extras}
        onOpenFiltered={(value) => {
          // CORRIGIDO: agora passa o filtro de aging ao navegar para Pend. Lançamento
          if (value === 'expirado' || value === 'proximo' || value === 'ok') {
            return changeTab('lancamento', { agingCat: value, search: '', area: 'TODOS', status: 'todos', transporters: [] });
          }
          // Transportador clicado: filtra por transportador
          return changeTab('lancamento', { transporters: [value], search: '', area: 'TODOS', status: 'todos', agingCat: null });
        }}
      />
    );
    if (tab === 'historico') return <Historico history={history} />;
    if (tab === 'auditoria') return <AuditLog audit={audit} />;
    if (tab === 'usuarios') return <UsuariosAdmin />;
    if (tab === 'tr_dash' && isTransporter) return <TransportDash myC={currentC} myP={currentP} statuses={statuses} onOpenTab={changeTab} transporterName={transporterName} />;
    if (tab === 'tr_retorno' && isTransporter) return <PendLancamento {...commonListProps} notes={currentP} />;
    if (tab === 'tr_cobranca' && isTransporter) return <PendCobranca {...commonListProps} notes={currentC} />;
    return null;
  };

  return (
    <div className="min-h-screen premium-shell">
      <StatusModal
        open={statusModal.open}
        title={statusModal.type === 'status' ? `Alterar status: ${statusModal.label}` : `Alterar tracking: ${statusModal.label}`}
        showDate={statusModal.showDate}
        showNfFields={statusModal.showNfFields}
        onClose={closeStatusModal}
        onConfirm={confirmStatusModal}
        loading={statusLoading}
      />
      <EmailModal
        open={emailModal.open}
        notes={emailModal.notes}
        transporterName={emailModal.transporterName}
        defaultTo={emailModal.defaultTo}
        onClose={() => setEmailModal({ open: false, notes: [], transporterName: '', defaultTo: '' })}
        onSent={handleEmailSent}
      />

      {editTransport.open && (
        <div className="fixed inset-0 z-[999] bg-black/50 flex items-center justify-center p-4">
          <div className="w-full max-w-xl rounded-2xl bg-white shadow-2xl border border-gray-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100"><h2 className="text-base font-bold text-gray-800">Editar transportador</h2></div>
            <div className="p-5 space-y-4">
              <div className="text-sm text-gray-500">{editTransport.note?.cl}</div>
              <input
                value={editTransport.value}
                onChange={e => setEditTransport(prev => ({ ...prev, value: e.target.value }))}
                placeholder="Nome do transportador"
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm"
              />
            </div>
            <div className="px-5 py-4 border-t border-gray-100 flex justify-end gap-2">
              <button onClick={() => setEditTransport({ open: false, note: null, value: '' })} className="px-4 py-2 rounded-lg bg-gray-100 text-gray-600 text-sm font-semibold">Cancelar</button>
              <button onClick={saveTransportOverride} className="px-4 py-2 rounded-lg bg-[#1a365d] text-white text-sm font-semibold">Salvar</button>
            </div>
          </div>
        </div>
      )}

      {batchStatusOpen && (
        <div className="fixed inset-0 z-[999] bg-black/50 flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl border border-gray-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100"><h2 className="text-base font-bold text-gray-800">Mudar status em lote</h2></div>
            <div className="p-5 space-y-4">
              <select value={batchStatusValue} onChange={e => setBatchStatusValue(e.target.value)} className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm">
                <optgroup label="Cobrança">{SO.map(s => <option key={s.v} value={s.v}>{s.l}</option>)}</optgroup>
                <optgroup label="Tracking">{TK.filter(t => !['encaminhar', 'ret_nao_auto'].includes(t.v)).map(t => <option key={t.v} value={t.v}>{t.l}</option>)}</optgroup>
              </select>
            </div>
            <div className="px-5 py-4 border-t border-gray-100 flex justify-end gap-2">
              <button onClick={() => setBatchStatusOpen(false)} className="px-4 py-2 rounded-lg bg-gray-100 text-gray-600 text-sm font-semibold">Cancelar</button>
              <button onClick={confirmBatchStatus} className="px-4 py-2 rounded-lg bg-[#1a365d] text-white text-sm font-semibold">Continuar</button>
            </div>
          </div>
        </div>
      )}

      <div className="portal-header px-6 py-5 text-white">
        <div className="max-w-[1200px] mx-auto flex justify-between items-center flex-wrap gap-3">
          <div>
            <div className="flex items-center gap-3">
              <img src="/linea-logo.png" alt="Logo Linea Alimentos" className="h-12 w-auto drop-shadow-sm" />
              <div>
                <h1 className="text-lg font-bold tracking-tight">{isTransporter ? 'Portal do Transportador' : 'Portal de Devoluções'}</h1>
                <p className="text-xs text-white/55 mt-0.5">
                  {isTransporter ? transporterName : `${currentC.length + currentP.length} total`}
                  {lastUpdated && ` · ${new Date(lastUpdated).toLocaleString('pt-BR')}`}
                  {lastSource && ` (${lastSource})`}
                </p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button type="button" data-theme={theme} onClick={toggleTheme} className="theme-toggle">
              <span>{isDark ? 'Modo claro' : 'Modo noturno'}</span>
              <span className="theme-toggle-track"><span className="theme-toggle-thumb" /></span>
            </button>
            <div className="px-3 py-1.5 bg-white/10 rounded-xl text-xs text-white/70 border border-white/10">
              👤 <strong className="text-white">{user?.name}</strong>
            </div>
            {!isTransporter && permissions.canImport && (
              <button onClick={() => syncFromGitHub(false)} className="px-3 py-1.5 rounded-xl text-xs font-semibold action-primary">🔄 GitHub</button>
            )}
            {permissions.canExport && (
              <button onClick={exportComplete} className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-500 text-white shadow-lg shadow-emerald-900/10 hover:brightness-105 transition">⬇ Excel completo</button>
            )}
            <NotificationBell items={notifications} open={notifOpen} onToggle={() => setNotifOpen(v => !v)} onRead={(n) => { markRead(n); setNotifOpen(false); }} />
            <button onClick={logout} className="px-3 py-1.5 rounded-xl text-xs font-semibold action-soft">Sair</button>
          </div>
        </div>
      </div>

      <div className="portal-tabs px-4 overflow-x-auto">
        <div className="max-w-[1200px] mx-auto flex gap-0.5">
          {currentTabs.map(t => (
            <button key={t.id} onClick={() => changeTab(t.id)} className={`portal-tab px-4 py-3 text-xs whitespace-nowrap transition ${tab === t.id ? 'active' : ''}`}>
              {t.l}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-[1280px] mx-auto p-5 md:p-6">{renderTab()}</div>
    </div>
  );
}

export default function App() {
  return <AuthProvider><DataProvider><AppRouter /></DataProvider></AuthProvider>;
}

function AppRouter() {
  const { user, loading, needsPwChange } = useAuth();
  if (loading) return (
    <div className="flex items-center justify-center h-screen premium-shell">
      <div className="premium-card px-6 py-4 text-sm premium-muted">Conectando...</div>
    </div>
  );
  if (!user || needsPwChange) return <Login />;
  return <Portal />;
}
