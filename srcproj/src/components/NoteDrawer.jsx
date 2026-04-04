import { useState } from 'react';
import { fmt, getNoteKey, getStatus, getTracking, getTransporter, getSOByValue,
  getTKByValue, calcAging, agingCategory, checkDateMatch, deriveWorkflow } from '../utils/helpers';
import StatusButtons from './StatusButtons';
import ChatPanel from './ChatPanel';
import NoteTimeline from './NoteTimeline';
import CtePanel from './CtePanel';
import NoteMetaPanel from './NoteMetaPanel';
import AcceptanceForm from './AcceptanceForm';
import ProtectedAction from './ProtectedAction';
import TrackingStepper from './TrackingStepper';

const XIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <path d="M18 6 6 18M6 6l12 12"/>
  </svg>
);

const FileIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/>
  </svg>
);

function StatusDot({ color }) {
  return <span style={{ width: 8, height: 8, borderRadius: '50%', background: color, display: 'inline-block', flexShrink: 0 }} />;
}

export default function NoteDrawer({
  note, mode, onClose, statuses, extras, history, user, isTransporter,
  addChatMessage, onStatus, onTracking, onOpenEmail, onEditTransporter,
  onSetTransporter, transporterNames = [],
  onSaveAcceptance, acceptanceData, permissions, noteMeta, saveMeta, users,
  initialTab = 'info'
}) {
  const [activeTab, setActiveTab] = useState(initialTab || 'info');
  const [trSelect, setTrSelect] = useState('');
  const [savingTr, setSavingTr] = useState(false);
  const [showAcceptanceModal, setShowAcceptanceModal] = useState(false);
  const [showAcceptanceReadOnly, setShowAcceptanceReadOnly] = useState(false);

  if (!note) return null;

  const key = getNoteKey(note);
  const st = mode === 'cobr' ? getStatus(note, statuses) : getTracking(note, statuses);
  const stObj = mode === 'cobr' ? getSOByValue(st) : getTKByValue(st);
  const days = calcAging(note);
  const agCat = days !== null ? agingCategory(days) : null;
  const dtMatch = checkDateMatch(note);
  const chat = extras['chat:' + key]?.msgs || (Array.isArray(extras['chat:' + key]) ? extras['chat:' + key] : []);
  const tr = getTransporter(note, extras);
  const ex = extras[key] || {};
  const exObj = typeof ex === 'object' ? ex : {};
  const acceptanceKey = 'aceite:' + key;
  const acceptance = acceptanceData?.[acceptanceKey] || extras[acceptanceKey];
  const noteHist = history.filter(h => h.nf_key === key).slice(0, 20);
  const meta = noteMeta?.[key] || {};
  const processInfo = deriveWorkflow(mode, st, meta);

  const tabs = [
    { id: 'info',     label: 'Detalhes' },
    { id: 'actions',  label: 'Ações' },
    { id: 'timeline', label: `Linha do tempo${noteHist.length > 0 ? ` (${noteHist.length})` : ''}` },
    { id: 'cte',      label: 'CT-e' },
    { id: 'chat',     label: `Chat${chat.length > 0 ? ` (${chat.length})` : ''}` },
    ...(!isTransporter ? [{ id: 'meta', label: 'Gestão' }] : []),
  ];

  return (
    <>
      <div className="drawer-overlay" onClick={onClose} />
      <div className="drawer">

        {/* Header */}
        <div className="drawer-header">
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 6 }}>
              {note.t === 'P' ? (
                <>
                  <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>NFD {note.nfd}</span>
                  <span style={{ fontSize: 12, color: 'var(--text-3)' }}>· NFO {note.nfo}</span>
                </>
              ) : (
                <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>NFO {note.nfo}</span>
              )}
              <span className={note.t === 'P' ? 'tag tag-parcial' : 'tag tag-total'}>
                {note.t === 'P' ? 'PARCIAL' : 'TOTAL'}
              </span>
              {acceptance?.accepted && (
                <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 4, background: 'var(--green-dim)', color: 'var(--green)', border: '1px solid rgba(63,185,80,0.2)' }}>
                  Aceite ✓
                </span>
              )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <span className="status-badge" style={{ background: stObj.bg || 'var(--surface-3)', color: stObj.c || 'var(--text-2)', borderColor: (stObj.c || '#888') + '30' }}>
                <StatusDot color={stObj.c} />
                {mode === 'cobr' ? stObj.l : `${stObj.i || ''} ${stObj.l}`}
              </span>
              {days !== null && (
                <span className="aging-badge" style={{ background: agCat?.bg || 'var(--surface-3)', color: agCat?.color || 'var(--text-3)' }}>
                  {days}d aging
                </span>
              )}
              {dtMatch && (
                <span className="tag" style={{ background: dtMatch.ok ? 'var(--green-dim)' : 'var(--red-dim)', color: dtMatch.ok ? 'var(--green)' : 'var(--red)', border: 'none' }}>
                  {dtMatch.ok ? '✓' : '⚠'} {dtMatch.msg}
                </span>
              )}
            </div>
          </div>

          <button onClick={onClose} className="btn btn-ghost btn-sm" style={{ flexShrink: 0, padding: '6px', borderRadius: '8px' }}>
            <XIcon />
          </button>
        </div>

        {/* Tabs */}
        <div className="tab-list" style={{ padding: '0 20px', marginBottom: 0 }}>
          {tabs.map(t => (
            <button key={t.id} onClick={() => setActiveTab(t.id)} className={`tab-item ${activeTab === t.id ? 'active' : ''}`}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="drawer-body">

          {/* ── TAB: DETALHES ── */}
          {activeTab === 'info' && (
            <div>
              {/* Info Grid */}
              <div className="info-grid" style={{ marginBottom: 16 }}>
                <div className="info-item">
                  <div className="info-item-label">Valor</div>
                  <div className="info-item-value gold">{fmt(note.v)}</div>
                </div>
                <div className="info-item">
                  <div className="info-item-label">Data</div>
                  <div className="info-item-value">{note.dt || '—'}</div>
                </div>
                <div className="info-item">
                  <div className="info-item-label">Cliente</div>
                  <div className="info-item-value" style={{ fontSize: 12 }}>{note.cl || '—'}</div>
                </div>
                <div className="info-item">
                  <div className="info-item-label">UF</div>
                  <div className="info-item-value">{note.uf || '—'}</div>
                </div>
                <div className="info-item" style={{ gridColumn: '1 / -1' }}>
                  <div className="info-item-label">Motivo</div>
                  <div className="info-item-value" style={{ fontSize: 12, color: 'var(--red)', opacity: 0.9 }}>{note.mo || '—'}</div>
                </div>
                {tr && (
                  <div className="info-item" style={{ gridColumn: '1 / -1' }}>
                    <div className="info-item-label">Transportador</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div className="info-item-value" style={{ fontSize: 12 }}>{tr}</div>
                      {!isTransporter && (
                        <button onClick={() => onEditTransporter(note)} className="btn btn-outline btn-xs">Editar</button>
                      )}
                    </div>
                  </div>
                )}
                {exObj.nfDeb && (
                  <div className="info-item">
                    <div className="info-item-label">NF Débito</div>
                    <div className="info-item-value green">{exObj.nfDeb}</div>
                  </div>
                )}
                {exObj.pedido && (
                  <div className="info-item">
                    <div className="info-item-label">Pedido</div>
                    <div className="info-item-value">{exObj.pedido}</div>
                  </div>
                )}
              </div>

              {/* PDF */}
              {exObj.pdfUrl && (
                <a href={exObj.pdfUrl} target="_blank" rel="noreferrer"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--gold)', textDecoration: 'none', padding: '7px 12px', background: 'var(--gold-dim)', border: '1px solid rgba(166,139,92,0.2)', borderRadius: 8, marginBottom: 16 }}>
                  <FileIcon /> Abrir PDF da NF Débito
                </a>
              )}

              {/* Workflow info */}
              <div style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 10, padding: 14, marginBottom: 16 }}>
                <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Pipeline atual</div>
                <div style={{ fontSize: 12, color: 'var(--text-2)', marginBottom: 4 }}>
                  <strong style={{ color: 'var(--gold)' }}>Pendência com:</strong> {processInfo.pendingWith}
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-2)', marginBottom: 4 }}>
                  <strong style={{ color: 'var(--text)' }}>Próxima ação:</strong> {meta.proxima_acao || processInfo.nextAction}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-3)' }}>
                  Visível ao transportador: {processInfo.transporterVisible ? <span style={{ color: 'var(--green)' }}>Sim</span> : <span style={{ color: 'var(--text-3)' }}>Não</span>}
                </div>
              </div>

              {/* Tracking Stepper */}
              {mode === 'pend' && (
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>Progresso do retorno</div>
                  <TrackingStepper current={st} />
                </div>
              )}

              {/* Products */}
              {note.p?.length > 0 && (
                <div>
                  <div className="drawer-section-title">Produtos ({note.p.length})</div>
                  <div style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
                    <table className="product-table">
                      <thead>
                        <tr>
                          <th>Código</th>
                          <th>Descrição</th>
                          <th style={{ textAlign: 'center' }}>Qtd</th>
                          <th style={{ textAlign: 'right' }}>Vlr. Unit.</th>
                          <th style={{ textAlign: 'right' }}>Valor</th>
                        </tr>
                      </thead>
                      <tbody>
                        {note.p.map((p, idx) => (
                          <tr key={idx}>
                            <td style={{ fontFamily: 'monospace', fontSize: 10 }}>{p.cod}</td>
                            <td style={{ fontSize: 11 }}>{p.desc}</td>
                            <td style={{ textAlign: 'center' }}>
                              {Math.abs(p.qt)}{' '}
                              <span style={{ fontSize: 9, color: 'var(--text-3)', fontWeight: 600 }}>CX</span>
                            </td>
                            <td style={{ textAlign: 'right', fontSize: 11, color: 'var(--text-2)' }}>
                              {p.vu ? fmt(Math.abs(p.vu)) : '—'}
                            </td>
                            <td style={{ textAlign: 'right', fontWeight: 600, color: 'var(--text)' }}>{fmt(Math.abs(p.vi))}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── TAB: AÇÕES ── */}
          {activeTab === 'actions' && (
            <div>
              {/* Sugestão principal */}
              <div style={{ background: 'var(--gold-dim)', border: '1px solid rgba(166,139,92,0.2)', borderRadius: 10, padding: 14, marginBottom: 16 }}>
                <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--gold)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>Ação sugerida</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{meta.proxima_acao || processInfo.nextAction}</div>
              </div>

              {/* ── VERIFICAÇÃO: Transportador obrigatório ── */}
              {!tr && (
                <div style={{ background: 'var(--yellow-dim)', border: '1px solid rgba(210,153,34,0.35)', borderRadius: 10, padding: 14, marginBottom: 16 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--yellow)', marginBottom: 6 }}>
                    ⚠ Transportador não vinculado
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-2)', marginBottom: 12, lineHeight: 1.5 }}>
                    Para alterar o status desta nota é necessário vincular um transportador primeiro.
                  </div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-2)', display: 'block', marginBottom: 6 }}>
                    Selecionar transportador
                  </label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <select
                      value={trSelect}
                      onChange={e => setTrSelect(e.target.value)}
                      className="input"
                      style={{ flex: 1, fontSize: 12 }}
                    >
                      <option value="">— Selecione —</option>
                      {transporterNames.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                    <button
                      onClick={async () => {
                        if (!trSelect) return;
                        setSavingTr(true);
                        try { await onSetTransporter(key, trSelect); setTrSelect(''); }
                        finally { setSavingTr(false); }
                      }}
                      disabled={!trSelect || savingTr}
                      className="btn btn-gold btn-sm"
                      style={{ whiteSpace: 'nowrap' }}
                    >
                      {savingTr ? 'Salvando…' : 'Vincular'}
                    </button>
                  </div>
                </div>
              )}

              <div className="drawer-section-title">Atualizar status</div>
              <ProtectedAction allowed={!!tr && (mode === 'cobr' ? (isTransporter || permissions.canEditCobr) : permissions.canEditLanc || isTransporter)}>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
                  <StatusButtons
                    mode={mode}
                    isTransporter={isTransporter}
                    currentValue={st}
                    canTransporterAct={processInfo.transporterCanAct}
                    onStatus={(val, label, isEmitida) => { onStatus(key, val, label, isEmitida); onClose(); }}
                    onTracking={(val, label, hasDate, hasAttach) => { onTracking(key, val, label, hasDate, hasAttach); onClose(); }}
                  />
                </div>
              </ProtectedAction>

              {!isTransporter && permissions.canEmail && (
                <div style={{ marginBottom: 16 }}>
                  <div className="drawer-section-title">Comunicação</div>
                  <button onClick={() => { onOpenEmail([note], tr); onClose(); }} className="btn btn-outline" style={{ width: '100%', justifyContent: 'center' }}>
                    Enviar email ao transportador
                  </button>
                </div>
              )}

              {isTransporter && mode === 'cobr' && (
                <div style={{ marginTop: 16 }}>
                  <div className="drawer-section-title">Aceite / Contestação formal</div>
                  {acceptance?.accepted ? (
                    // já fez aceite — mostrar confirmação e botão ver
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: 'var(--green-dim)', border: '1px solid rgba(63,185,80,.25)', borderRadius: 8 }}>
                      <span style={{ fontSize: 14 }}>✅</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--green)' }}>Aceite já formalizado</div>
                        <div style={{ fontSize: 11, color: 'var(--text-3)' }}>{acceptance.name} · {new Date(acceptance.ts).toLocaleDateString('pt-BR')}</div>
                      </div>
                      <button
                        className="btn btn-outline btn-xs"
                        onClick={() => setShowAcceptanceReadOnly(true)}
                      >Ver dados</button>
                    </div>
                  ) : (
                    // ainda não fez aceite — mostrar os botões de ação
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      <div style={{ fontSize: 12, color: 'var(--text-2)', lineHeight: 1.5, marginBottom: 4 }}>
                        Você recebeu uma solicitação de posição sobre esta cobrança. Selecione sua resposta:
                      </div>
                      <button
                        className="btn btn-gold"
                        style={{ width: '100%', justifyContent: 'center' }}
                        onClick={() => setShowAcceptanceModal(true)}
                      >
                        ✅ Concordo — formalizar aceite
                      </button>
                      <button
                        className="btn btn-outline"
                        style={{ width: '100%', justifyContent: 'center', color: 'var(--red)', borderColor: 'var(--red)' }}
                        onClick={() => { onStatus(key, 'tr_contestou', 'Transportador contestou', false); onClose(); }}
                      >
                        ❌ Contesto esta cobrança
                      </button>
                      <button
                        className="btn btn-outline"
                        style={{ width: '100%', justifyContent: 'center' }}
                        onClick={() => { onStatus(key, 'tr_nao_resp', 'Transportador não responsável', false); onClose(); }}
                      >
                        ⚠ Não somos responsáveis
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ── TAB: CT-e ACTIVE ONSUPPLY ── */}
          {activeTab === 'cte' && (
            <div style={{ padding: '0 4px' }}>
              <CtePanel noteKey={key} extras={extras} />
            </div>
          )}

          {/* ── TAB: LINHA DO TEMPO ── */}
          {activeTab === 'timeline' && (
            <div style={{ padding: '0 4px' }}>
              <NoteTimeline history={history} noteKey={key} />
            </div>
          )}

          {/* ── TAB: CHAT ── */}
          {activeTab === 'chat' && (
            <ChatPanel
              noteKey={key}
              chat={chat}
              addChatMessage={addChatMessage}
              userName={user?.name}
              role={isTransporter ? 'transportador' : 'interno'}
            />
          )}

          {/* ── TAB: GESTÃO ── */}
          {activeTab === 'meta' && !isTransporter && (
            <NoteMetaPanel
              noteKey={key}
              meta={meta}
              onSave={saveMeta}
              users={users}
              processInfo={processInfo}
            />
          )}
        </div>
      </div>

      {/* ── Modal de aceite formal (abre só quando transportador clica em Concordo) ── */}
      {showAcceptanceModal && (
        <AcceptanceForm
          open={showAcceptanceModal}
          onClose={() => setShowAcceptanceModal(false)}
          onSave={async (data) => {
            await onSaveAcceptance.save(key, data);
            // Após aceite, mudar status para tr_concordou automaticamente
            onStatus(key, 'tr_concordou', 'Transportador aprovou', false);
            setShowAcceptanceModal(false);
            onClose();
          }}
          existing={null}
        />
      )}

      {/* ── Modal readonly para ver dados do aceite já registrado ── */}
      {showAcceptanceReadOnly && (
        <AcceptanceForm
          open={showAcceptanceReadOnly}
          onClose={() => setShowAcceptanceReadOnly(false)}
          onSave={() => {}}
          existing={acceptance}
          readOnly
        />
      )}
    </>
  );
}
