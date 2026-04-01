import { useEffect, useMemo, useState } from 'react';
import { AuthProvider, useAuth } from '../hooks/useAuth.jsx';
import { DataProvider, useData } from '../hooks/useData.jsx';
import Login from './Login';
import Dashboard from './Dashboard';
import DashboardAvancado from './DashboardAvancado';
import PendCobranca from './PendCobranca';
import PendLancamento from './PendLancamento';
import Acompanhamento from './Acompanhamento';
import NfsDebito from './NfsDebito';
import Transportadores from './Transportadores';
import Aging from './Aging';
import TransportDash from './TransportDash';
import AuditLog from './AuditLog';
import UsuariosAdmin from './UsuariosAdmin';
import StatusModal from '../components/StatusModal';
import EmailModal from '../components/EmailModal';
import NotificationBell from '../components/NotificationBell';
import Sidebar from '../components/Sidebar';
import { usePermissions } from '../hooks/usePermissions.jsx';
import { useNoteMeta } from '../hooks/useNoteMeta.jsx';
import { useAudit } from '../hooks/useAudit.jsx';
import { useNotifications } from '../hooks/useNotifications.jsx';
import { uploadPdf } from '../config/supabase.js';
import { SO, TK, TK_TRANSP_TRACKING } from '../config/constants';
import { exportToExcel, exportWorkbook } from '../utils/excel';
import { generateNotification } from '../utils/notification';
import {
  filterNotes, getVisibleCobranca, getVisibleLancamento, getTransporter,
  getNoteKey, groupByNfDeb, summarizeTransporters, toExportRows,
  calcAging, transporterCanSee, getTracking
} from '../utils/helpers';
import { useTheme } from '../hooks/useTheme.jsx';

const DEFAULT_FILTERS = { search: '', area: 'TODOS', status: 'todos', transporters: [], agingCat: null };

const PAGE_TITLES = {
  dashboard:        'Dashboard',
  dashboard_adv:    'Dashboard Executivo',
  cobranca:         'Gestão de Cobranças',
  lancamento:     'Todas as Devoluções',
  acompanhamento: 'Em Acompanhamento (Transportador)',
  nfDebito:       'NFs Débito',
  transportadores:'Por Transportador',
  aging:          'Aging',
  auditoria:      'Auditoria',
  usuarios:       'Usuários',
  tr_dash:        'Dashboard',
  tr_retorno:     'Devoluções',
  tr_cobranca:    'Cobranças',
};

function Portal() {
  const { user, logout, isTransporter, transporterName } = useAuth();
  const permissions = usePermissions(user);
  const portalData = useData();
  const {
    data, statuses, history, extras, transportadores, lastUpdated, lastSource, loading,
    loadAll, syncFromGitHub, setNoteStatus, setNoteTracking,
    addChatMessage, getTrEmails, setTrEmails, saveTransportador, patchExtra
  } = portalData;
  const { noteMeta, saveMeta } = useNoteMeta();
  const { audit, logAudit } = useAudit(user);
  const { notifications, markRead, createNotification } = useNotifications(user);
  const { isDark, toggleTheme } = useTheme();

  const [tab, setTab] = useState(isTransporter ? 'tr_dash' : 'dashboard');
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
    loadAll(); // auto-refresh via webhook acontece dentro do loadAll
  }, []); // eslint-disable-line

  const applyNoteFilter = (notes) => {
    const nf = permissions.noteFilter;
    if (!nf) return notes;
    return notes.filter(n => Object.entries(nf).every(([k, v]) => n[k] === v));
  };

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

  const users = useMemo(() => [...new Set(history.map(h => h.user_name).filter(Boolean))], [history]);
  const nfGroups = useMemo(() => groupByNfDeb(myC, extras, history), [myC, extras, history]);
  const trSummary = useMemo(() => summarizeTransporters([...myC, ...myP], extras), [myC, myP, extras]);

  if (!data && loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'var(--bg)' }}>
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '16px 24px', fontSize: 13, color: 'var(--text-3)' }}>
        Conectando...
      </div>
    </div>
  );

  const changeTab = (t, patch = null) => {
    setTabFilters(prev => ({ ...prev, [tab]: { ...filters } }));
    const saved = tabFilters[t] || DEFAULT_FILTERS;
    setFilters(patch ? { ...saved, ...patch } : saved);
    setTab(t);
    setSelected(new Set());
  };

  const openStatusModal = (key, val, label, isEmitida = false) => {
    setStatusModal({ open: true, type: 'status', key, val, label, showDate: false, showNfFields: isEmitida, batchKeys: [] });
  };
  const openTrackingModal = (key, val, label, hasDate = false) => {
    setStatusModal({ open: true, type: 'tracking', key, val, label, showDate: hasDate, showNfFields: false, batchKeys: [] });
  };
  const closeStatusModal = () => setStatusModal(prev => ({ ...prev, open: false }));

  const getAutoMetaPatch = (type, value, currentMeta = {}) => {
    if (type === 'status') {
      const map = {
        pendente: { responsavel: 'interno', proxima_acao: 'Analisar internamente a cobrança', cobrar_transportador: false },
        validado: { responsavel: 'interno', proxima_acao: 'Enviar cobrança para posição do transportador', cobrar_transportador: true },
        cobr_tr: { responsavel: 'transportador', proxima_acao: 'Aguardar resposta do transportador', cobrar_transportador: true },
        tr_contestou: { responsavel: 'interno', proxima_acao: 'Analisar contestação do transportador', cobrar_transportador: true, aguardando_documento: true },
        tr_concordou: { responsavel: 'interno', proxima_acao: 'Emitir notificação/NF débito', cobrar_transportador: true },
        tr_nao_resp: { responsavel: 'interno', proxima_acao: 'Revisar evidência e decidir continuidade', cobrar_transportador: true },
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
            destinatario: user.email, tipo: statusModal.type,
            titulo: 'Atualização na nota', mensagem: `${key} → ${statusModal.val}`,
            nf_key: key, lido: false, link: '', created_at: new Date().toISOString(),
          });
        }
      }
      closeStatusModal();
      setSelected(new Set());
    } catch (e) { alert(e.message); }
    finally { setStatusLoading(false); }
  };

  const openEmailForNotes = (notes, trNameArg = '') => {
    if (!notes.length) return;
    const trName = trNameArg || getTransporter(notes[0], extras) || 'Transportador';
    setEmailModal({ open: true, notes, transporterName: trName, defaultTo: getTrEmails(trName) });
  };

  const handleEmailSent = async ({ to }) => {
    for (const note of emailModal.notes) {
      await logAudit({ nfKey: getNoteKey(note), action: 'Email enviado', field: 'email', oldValue: '', newValue: to, origin: 'manual' });
    }
  };

  const exportCurrentView = () => {
    if (tab === 'cobranca' || tab === 'tr_cobranca') {
      exportToExcel(toExportRows(filterNotes(myC, filters, statuses, 'cobr', extras), statuses, extras, 'cobr', noteMeta), 'cobranca');
    } else if (tab === 'lancamento' || tab === 'tr_retorno') {
      exportToExcel(toExportRows(filterNotes(myP, filters, statuses, 'pend', extras), statuses, extras, 'pend', noteMeta), 'lancamento');
    } else if (tab === 'acompanhamento') {
      const acompNotes = myP.filter(n => TK_TRANSP_TRACKING.includes(getTracking(n, statuses)));
      exportToExcel(toExportRows(filterNotes(acompNotes, filters, statuses, 'pend', extras), statuses, extras, 'pend', noteMeta), 'acompanhamento');
    } else if (tab === 'transportadores') {
      exportToExcel(trSummary, 'transportadores');
    } else if (tab === 'aging') {
      exportToExcel(myP.map(n => ({ ...n, aging: calcAging(n) })), 'aging');
    } else if (tab === 'nfDebito') {
      exportToExcel(nfGroups.flatMap(g => g.notes.map(n => ({ nfDeb: g.nfDeb, pedido: g.pedido, nfd: n.nfd, nfo: n.nfo, cliente: n.cl, valor: n.v }))), 'nfs_debito');
    }
  };

  const exportComplete = () => {
    exportWorkbook({
      cobranca: toExportRows(myC, statuses, extras, 'cobr', noteMeta),
      lancamento: toExportRows(myP, statuses, extras, 'pend', noteMeta),
      auditoria: audit, transportadores: trSummary,
      nfs_debito: nfGroups.flatMap(g => g.notes.map(n => ({ nfDeb: g.nfDeb, pedido: g.pedido, nfd: n.nfd, nfo: n.nfo, cliente: n.cl, valor: n.v }))),
    });
  };

  const handleBatchGenerate = (notes) => {
    if (!notes.length) return alert('Selecione ao menos uma nota.');
    const grouped = {};
    notes.forEach(n => { const tr = getTransporter(n, extras) || 'Transportador'; if (!grouped[tr]) grouped[tr] = []; grouped[tr].push(n); });
    Object.entries(grouped).forEach(([tr, list]) => generateNotification(list, tr));
  };

  const handleBatchEmail = (notes) => openEmailForNotes(notes);
  const handleBatchStatus = () => setBatchStatusOpen(true);
  const confirmBatchStatus = () => {
    if (!selected.size) return;
    const label = [...SO, ...TK].find(s => s.v === batchStatusValue)?.l || batchStatusValue;
    const modeType = SO.some(s => s.v === batchStatusValue) ? 'status' : 'tracking';
    setStatusModal({ open: true, type: modeType, key: '', val: batchStatusValue, label, showDate: TK.find(t => t.v === batchStatusValue)?.hasDate || false, showNfFields: batchStatusValue === 'emitida', batchKeys: [...selected] });
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

  const handleSetTransporter = async (noteKey, trName) => {
    await patchExtra(noteKey, { trOverride: trName });
    await logAudit({ nfKey: noteKey, action: 'Transportador vinculado', field: 'transportador', oldValue: '', newValue: trName, origin: 'manual' });
  };

  const commonListProps = {
    filters, setFilters, extras, statuses, selected, setSelected,
    detailTab, setDetailTab, addChatMessage, user, isTransporter, history,
    onStatus: openStatusModal, onTracking: openTrackingModal,
    onOpenEmail: openEmailForNotes, onEditTransporter: openEditTransport,
    onSetTransporter: handleSetTransporter,
    transporterNames: trSummary.map(t => t.name),
    acceptanceHandler, permissions, noteMeta, saveMeta, users,
    onBatchGenerate: handleBatchGenerate, onBatchEmail: handleBatchEmail, onBatchStatus: handleBatchStatus,
    exportButton: permissions.canExport ? (
      <button onClick={exportCurrentView} className="btn btn-outline btn-sm">
        ⬇ Excel
      </button>
    ) : null,
  };

  const renderContent = () => {
    if (tab === 'dashboard' && !isTransporter)     return <Dashboard cobrNotes={myC} pendNotes={myP} statuses={statuses} onOpenTab={changeTab} noteMeta={noteMeta} />;
    if (tab === 'dashboard_adv' && !isTransporter) return <DashboardAvancado cobrNotes={myC} pendNotes={myP} statuses={statuses} noteMeta={noteMeta} extras={extras} />;
    if (tab === 'cobranca') return <PendCobranca {...commonListProps} notes={myC} />;
    if (tab === 'lancamento') return <PendLancamento {...commonListProps} notes={myP} />;
    if (tab === 'acompanhamento') return <Acompanhamento {...commonListProps} notes={myP} />;
    if (tab === 'nfDebito') return <NfsDebito groups={nfGroups} />;
    if (tab === 'transportadores') return (
      <Transportadores
        summary={trSummary}
        getEmails={getTrEmails}
        setEmails={setTrEmails}
        transportadores={transportadores}
        saveTransportador={saveTransportador}
        onOpenFiltered={(trName, mode) => changeTab(mode === 'cobr' ? 'cobranca' : 'lancamento', { transporters: [trName], search: '', area: 'TODOS', status: 'todos', agingCat: null })}
      />
    );
    if (tab === 'aging') return (
      <Aging
        pendNotes={myP} extras={extras}
        onOpenFiltered={(value) => {
          if (['expirado', 'proximo', 'ok'].includes(value))
            return changeTab('lancamento', { agingCat: value, search: '', area: 'TODOS', status: 'todos', transporters: [] });
          return changeTab('lancamento', { transporters: [value], search: '', area: 'TODOS', status: 'todos', agingCat: null });
        }}
      />
    );
    if (tab === 'auditoria') return <AuditLog audit={audit} />;
    if (tab === 'usuarios') return <UsuariosAdmin />;
    if (tab === 'tr_dash' && isTransporter) return <TransportDash myC={myC} myP={myP} statuses={statuses} onOpenTab={changeTab} transporterName={transporterName} />;
    if (tab === 'tr_retorno' && isTransporter) return <PendLancamento {...commonListProps} notes={myP} />;
    if (tab === 'tr_cobranca' && isTransporter) return <PendCobranca {...commonListProps} notes={myC} />;
    return null;
  };

  const pageTitle = PAGE_TITLES[tab] || tab;
  const pageDesc = tab === 'cobranca' ? `${myC.length} registros`
    : tab === 'lancamento' ? `${myP.length} registros`
    : tab === 'acompanhamento' ? `${myP.filter(n => TK_TRANSP_TRACKING.includes(getTracking(n, statuses))).length} aguardando transportador`
    : lastUpdated ? `Atualizado ${new Date(lastUpdated).toLocaleString('pt-BR')}${lastSource ? ` · ${lastSource}` : ''}` : '';

  return (
    <div className="app-layout">
      {/* Sidebar */}
      <Sidebar
        tab={tab}
        onChangeTab={changeTab}
        visibleTabs={[
          ...permissions.visibleTabs,
          ...(!isTransporter && permissions.visibleTabs.includes('dashboard') && !permissions.visibleTabs.includes('dashboard_adv')
            ? ['dashboard_adv'] : []),
        ]}
        counts={{ cobranca: myC.length, lancamento: myP.length, acompanhamento: myP.filter(n => TK_TRANSP_TRACKING.includes(getTracking(n, statuses))).length }}
        user={user}
        onLogout={logout}
        isDark={isDark}
        onToggleTheme={toggleTheme}
        isTransporter={isTransporter}
      />

      <div className="app-main">
        {/* Top bar */}
        <header className="topbar">
          <div style={{ flex: 1 }}>
            <div className="topbar-title">{pageTitle}</div>
            {pageDesc && <div className="topbar-sub">{pageDesc}</div>}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {!isTransporter && permissions.canImport && (
              <button onClick={() => syncFromGitHub(false)} className="btn btn-outline btn-sm">
                🔄 Atualizar
              </button>
            )}
            {permissions.canExport && (
              <button onClick={exportComplete} className="btn btn-gold btn-sm">
                ⬇ Excel completo
              </button>
            )}
            <div style={{ position: 'relative' }}>
              <NotificationBell
                items={notifications}
                open={notifOpen}
                onToggle={() => setNotifOpen(v => !v)}
                onRead={(n) => { markRead(n); setNotifOpen(false); }}
              />
            </div>
            <div style={{ height: 28, width: 1, background: 'var(--border)', margin: '0 4px' }} />
            <div style={{ fontSize: 12, color: 'var(--text-2)' }}>
              {user?.name || user?.email}
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="app-content">
          {!data && !loading ? (
            <div style={{ textAlign: 'center', padding: '60px 24px', color: 'var(--text-3)', fontSize: 14 }}>
              Sem dados carregados. Clique em "Atualizar" para buscar do GitHub.
            </div>
          ) : (
            renderContent()
          )}
        </main>
      </div>

      {/* Modals */}
      <StatusModal
        open={statusModal.open}
        title={statusModal.type === 'status' ? `Atualizar status: ${statusModal.label}` : `Atualizar tracking: ${statusModal.label}`}
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

      {/* Edit transporter modal */}
      {editTransport.open && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setEditTransport({ open: false, note: null, value: '' })}>
          <div className="modal">
            <div className="modal-header">
              <h2 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>Editar transportador</h2>
              <p style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>{editTransport.note?.cl}</p>
            </div>
            <div className="modal-body">
              <input
                value={editTransport.value}
                onChange={e => setEditTransport(prev => ({ ...prev, value: e.target.value }))}
                placeholder="Nome do transportador"
                className="input"
              />
            </div>
            <div className="modal-footer">
              <button onClick={() => setEditTransport({ open: false, note: null, value: '' })} className="btn btn-outline">Cancelar</button>
              <button onClick={saveTransportOverride} className="btn btn-gold">Salvar</button>
            </div>
          </div>
        </div>
      )}

      {/* Batch status modal */}
      {batchStatusOpen && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setBatchStatusOpen(false)}>
          <div className="modal" style={{ maxWidth: 400 }}>
            <div className="modal-header">
              <h2 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>Mudar status em lote</h2>
              <p style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>{selected.size} registro(s) selecionado(s)</p>
            </div>
            <div className="modal-body">
              <label className="input-label">Novo status</label>
              <select value={batchStatusValue} onChange={e => setBatchStatusValue(e.target.value)} className="input">
                <optgroup label="Cobrança">{SO.map(s => <option key={s.v} value={s.v}>{s.l}</option>)}</optgroup>
                <optgroup label="Tracking">{TK.filter(t => !['encaminhar', 'ret_nao_auto'].includes(t.v)).map(t => <option key={t.v} value={t.v}>{t.l}</option>)}</optgroup>
              </select>
            </div>
            <div className="modal-footer">
              <button onClick={() => setBatchStatusOpen(false)} className="btn btn-outline">Cancelar</button>
              <button onClick={confirmBatchStatus} className="btn btn-gold">Aplicar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function App() {
  return <AuthProvider><DataProvider><AppRouter /></DataProvider></AuthProvider>;
}

function AppRouter() {
  const { user, loading, needsPwChange } = useAuth();
  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'var(--bg)' }}>
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '16px 24px', fontSize: 13, color: 'var(--text-3)' }}>
        Conectando...
      </div>
    </div>
  );
  if (!user || needsPwChange) return <Login />;
  return <Portal />;
}
