import { useMemo, useState } from 'react';
import { fmt, getStatus, getTracking, calcAging, getNoteKey } from '../utils/helpers';
import { TK, SO } from '../config/constants';
import NoteDrawer from '../components/NoteDrawer';

const tkLabel = (v) => TK.find(t => t.v === v)?.l || v;

function agingColor(d) {
  if (d >= 30) return '#E53E3E';
  if (d >= 20) return '#D29922';
  return '#3FB950';
}

// ── Card de nota — design limpo e focado ──────────────────────────────────────
function NoteCard({ note, action, actionColor = 'var(--gold)', onOpen }) {
  const aging = calcAging(note) || 0;
  const ac = agingColor(aging);
  return (
    <button
      onClick={() => onOpen?.(note)}
      style={{
        width: '100%', textAlign: 'left', border: 'none', background: 'var(--surface)',
        borderRadius: 12, padding: '16px 18px', cursor: 'pointer',
        borderLeft: `4px solid ${actionColor}`,
        boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
        transition: 'transform 100ms, box-shadow 100ms',
        marginBottom: 10,
      }}
      onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.10)'; }}
      onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.06)'; }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
        {/* Aging badge */}
        <div style={{ flexShrink: 0, textAlign: 'center', background: `${ac}15`, border: `1px solid ${ac}30`, borderRadius: 10, padding: '8px 12px', minWidth: 52 }}>
          <div style={{ fontSize: 22, fontWeight: 800, color: ac, lineHeight: 1 }}>{aging}</div>
          <div style={{ fontSize: 9, color: ac, fontWeight: 700, marginTop: 1, textTransform: 'uppercase' }}>dias</div>
        </div>

        {/* Info principal */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>NF {note.nfd || '—'}</span>
            <span style={{ fontSize: 11, color: 'var(--text-3)' }}>{note.nfo}</span>
            <span style={{ fontSize: 11, fontWeight: 600, color: actionColor, background: `${actionColor}18`, padding: '1px 8px', borderRadius: 5 }}>
              {fmt(note.v || 0)}
            </span>
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-2)', marginBottom: 6, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {note.cl || 'Cliente'}
          </div>
          {/* O que fazer — instrução clara */}
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 600, color: actionColor, background: `${actionColor}12`, padding: '4px 10px', borderRadius: 6 }}>
            <span style={{ fontSize: 13 }}>→</span> {action}
          </div>
        </div>

        {/* Chevron */}
        <span style={{ color: 'var(--text-3)', fontSize: 18, alignSelf: 'center' }}>›</span>
      </div>
    </button>
  );
}

function EmptyState({ icon, title, sub }) {
  return (
    <div style={{ padding: '56px 20px', textAlign: 'center' }}>
      <div style={{ fontSize: 44, marginBottom: 12 }}>{icon}</div>
      <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', marginBottom: 6 }}>{title}</div>
      <div style={{ fontSize: 12, color: 'var(--text-3)', maxWidth: 260, margin: '0 auto', lineHeight: 1.7 }}>{sub}</div>
    </div>
  );
}

// ── Tabs de navegação ─────────────────────────────────────────────────────────
const TABS = [
  { id: 'urgente',    emoji: '🔴', label: 'Urgente',        desc: 'Aguardando sua resposta' },
  { id: 'andamento',  emoji: '🔵', label: 'Em andamento',   desc: 'Para atualizar o status' },
  { id: 'agendado',   emoji: '📅', label: 'Agendado',       desc: 'Pendente marcar entregue' },
  { id: 'aging',      emoji: '⚠️', label: 'Perto do limite',desc: 'Aging alto — atenção' },
  { id: 'cobrancas',  emoji: '📋', label: 'Cobranças',      desc: 'Posição aguardada' },
];

// ── Principal ─────────────────────────────────────────────────────────────────
export default function TransportDash({
  myC = [], myP = [], statuses = {}, transporterName,
  // Props do Portal necessárias para abrir o NoteDrawer
  extras = {}, history = [], user = {}, addChatMessage,
  onStatus, onTracking, onOpenEmail, onSetTransporter,
  transporterNames = [], acceptanceHandler, permissions,
  noteMeta = {}, saveMeta, users = [],
}) {
  const [activeTab, setActiveTab] = useState('urgente');
  const [drawerNote, setDrawerNote] = useState(null);
  const [drawerMode, setDrawerMode] = useState('pend');

  const getT = (n) => getTracking(n, statuses) || '';
  const getS = (n) => getStatus(n, statuses) || '';

  const calc = useMemo(() => {
    // Urgente: cobranças esperando posição + notas sem início ou que perderam agenda
    const urgente_cobr  = myC.filter(n => getS(n) === 'cobr_tr');
    const urgente_devol = myP.filter(n => ['retorno_auto', 'perdeu_agenda'].includes(getT(n)));

    // Em andamento: notas que o transportador precisa atualizar status
    const andamento = myP.filter(n =>
      ['ag_consolidacao', 'em_transito', 'recebida_filial', 'agend_solicitado'].includes(getT(n))
    );

    // Agendado: confirmado mas ainda não entregue
    const agendado = myP.filter(n =>
      ['agend_confirmado', 'agendado'].includes(getT(n))
    );

    // Aging alto: qualquer nota ativa com 20+ dias
    const FINAL = ['entregue', 'encaminhar', 'ret_nao_auto', 'extravio'];
    const aging_alto = myP
      .filter(n => !FINAL.includes(getT(n)) && (calcAging(n) || 0) >= 20)
      .sort((a, b) => (calcAging(b) || 0) - (calcAging(a) || 0));

    // Cobranças (duplicado para a aba dedicada)
    const cobr_pos = myC.filter(n => getS(n) === 'cobr_tr');

    return { urgente_cobr, urgente_devol, andamento, agendado, aging_alto, cobr_pos };
  }, [myC, myP, statuses]);

  const counts = {
    urgente:   calc.urgente_cobr.length + calc.urgente_devol.length,
    andamento: calc.andamento.length,
    agendado:  calc.agendado.length,
    aging:     calc.aging_alto.length,
    cobrancas: calc.cobr_pos.length,
  };

  const openNote = (note, mode = 'pend') => {
    setDrawerNote(note);
    setDrawerMode(mode);
  };

  // Instrução por status
  const acoesDevol = {
    retorno_auto:     'Clique para iniciar o processo de devolução',
    perdeu_agenda:    'Clique para solicitar novo agendamento',
    ag_consolidacao:  'Clique quando a carga sair em trânsito',
    em_transito:      'Clique para informar chegada na filial',
    recebida_filial:  'Clique para solicitar agendamento com o cliente',
    agend_solicitado: 'Clique quando o agendamento for confirmado',
    agend_confirmado: 'Clique para marcar como entregue',
    agendado:         'Clique para marcar como entregue',
  };

  const renderContent = () => {
    switch (activeTab) {

      case 'urgente':
        if (counts.urgente === 0) {
          return <EmptyState icon="✅" title="Nenhuma ação urgente" sub="Você está em dia. Nenhum item aguardando sua resposta agora." />;
        }
        return (
          <div>
            {calc.urgente_cobr.length > 0 && (
              <>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#D29922', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8, marginTop: 4 }}>
                  Cobranças aguardando sua posição ({calc.urgente_cobr.length})
                </div>
                {calc.urgente_cobr.map((n, i) => (
                  <NoteCard key={i} note={n} actionColor="#D29922"
                    action="Abrir → concordo / contesto / não responsável"
                    onOpen={n => openNote(n, 'cobr')}
                  />
                ))}
              </>
            )}
            {calc.urgente_devol.length > 0 && (
              <>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#E53E3E', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8, marginTop: calc.urgente_cobr.length > 0 ? 16 : 4 }}>
                  Devoluções aguardando ação ({calc.urgente_devol.length})
                </div>
                {calc.urgente_devol.map((n, i) => (
                  <NoteCard key={i} note={n} actionColor="#E53E3E"
                    action={acoesDevol[getT(n)] || 'Clique para atualizar'}
                    onOpen={n => openNote(n, 'pend')}
                  />
                ))}
              </>
            )}
          </div>
        );

      case 'andamento':
        if (counts.andamento === 0) {
          return <EmptyState icon="🎯" title="Tudo atualizado" sub="Não há notas aguardando atualização de status agora." />;
        }
        return (
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#58A6FF', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8, marginTop: 4 }}>
              Notas para atualizar ({counts.andamento}) — ordenadas por aging
            </div>
            {calc.andamento
              .sort((a, b) => (calcAging(b) || 0) - (calcAging(a) || 0))
              .map((n, i) => (
                <NoteCard key={i} note={n} actionColor="#58A6FF"
                  action={acoesDevol[getT(n)] || 'Atualizar status'}
                  onOpen={n => openNote(n, 'pend')}
                />
              ))}
          </div>
        );

      case 'agendado':
        if (counts.agendado === 0) {
          return <EmptyState icon="📅" title="Nenhum agendamento pendente" sub="Todos os agendamentos já foram finalizados como entregue." />;
        }
        return (
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#0d9488', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8, marginTop: 4 }}>
              Agendamentos confirmados — marcar entregue ao realizar ({counts.agendado})
            </div>
            {calc.agendado
              .sort((a, b) => (calcAging(b) || 0) - (calcAging(a) || 0))
              .map((n, i) => (
                <NoteCard key={i} note={n} actionColor="#0d9488"
                  action="Clique para marcar como entregue com a data real"
                  onOpen={n => openNote(n, 'pend')}
                />
              ))}
          </div>
        );

      case 'aging':
        if (counts.aging === 0) {
          return <EmptyState icon="👍" title="Sem notas com aging crítico" sub="Nenhuma nota ativa tem mais de 20 dias em aberto." />;
        }
        return (
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#D29922', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8, marginTop: 4 }}>
              Notas com aging alto — atenção ({counts.aging})
            </div>
            {calc.aging_alto.map((n, i) => {
              const d = calcAging(n) || 0;
              const c = agingColor(d);
              return (
                <NoteCard key={i} note={n} actionColor={c}
                  action={`${d} dias em aberto — ${acoesDevol[getT(n)] || 'Atualizar para evitar penalidades'}`}
                  onOpen={n => openNote(n, 'pend')}
                />
              );
            })}
          </div>
        );

      case 'cobrancas':
        if (counts.cobrancas === 0) {
          return <EmptyState icon="💚" title="Nenhuma cobrança pendente" sub="Você não tem cobranças aguardando posição no momento." />;
        }
        return (
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#D29922', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8, marginTop: 4 }}>
              Cobranças aguardando sua posição ({counts.cobrancas})
            </div>
            {calc.cobr_pos.map((n, i) => (
              <NoteCard key={i} note={n} actionColor="#D29922"
                action="Abrir → concordo / contesto / não responsável"
                onOpen={n => openNote(n, 'cobr')}
              />
            ))}
          </div>
        );

      default: return null;
    }
  };

  const totalUrgente = counts.urgente;

  return (
    <>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 780, margin: '0 auto' }}>

        {/* Cabeçalho compacto */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'var(--gold-dim)', border: '2px solid rgba(166,139,92,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 700, color: 'var(--gold)', flexShrink: 0 }}>
            {(transporterName || '?').trim().split(' ').slice(0, 2).map(w => w[0] || '').join('').toUpperCase()}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 10, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Portal do transportador</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)', marginTop: 1 }}>{transporterName}</div>
          </div>
          {/* Resumo rápido de contadores */}
          <div style={{ display: 'flex', gap: 8 }}>
            {totalUrgente > 0 && (
              <div style={{ background: 'rgba(229,62,62,0.1)', border: '1px solid rgba(229,62,62,0.2)', borderRadius: 10, padding: '8px 14px', textAlign: 'center' }}>
                <div style={{ fontSize: 20, fontWeight: 800, color: '#E53E3E', lineHeight: 1 }}>{totalUrgente}</div>
                <div style={{ fontSize: 9, color: '#E53E3E', fontWeight: 600, marginTop: 2 }}>URGENTE</div>
              </div>
            )}
            {counts.andamento > 0 && (
              <div style={{ background: 'rgba(88,166,255,0.1)', border: '1px solid rgba(88,166,255,0.2)', borderRadius: 10, padding: '8px 14px', textAlign: 'center' }}>
                <div style={{ fontSize: 20, fontWeight: 800, color: '#58A6FF', lineHeight: 1 }}>{counts.andamento}</div>
                <div style={{ fontSize: 9, color: '#58A6FF', fontWeight: 600, marginTop: 2 }}>ATUALIZAR</div>
              </div>
            )}
            {counts.agendado > 0 && (
              <div style={{ background: 'rgba(13,148,136,0.1)', border: '1px solid rgba(13,148,136,0.2)', borderRadius: 10, padding: '8px 14px', textAlign: 'center' }}>
                <div style={{ fontSize: 20, fontWeight: 800, color: '#0d9488', lineHeight: 1 }}>{counts.agendado}</div>
                <div style={{ fontSize: 9, color: '#0d9488', fontWeight: 600, marginTop: 2 }}>AGENDADO</div>
              </div>
            )}
          </div>
        </div>

        {/* Instruções — sempre visíveis, simples */}
        <div style={{ background: 'rgba(166,139,92,0.06)', border: '1px solid rgba(166,139,92,0.15)', borderRadius: 10, padding: '12px 16px', fontSize: 12, color: 'var(--text-2)', lineHeight: 1.7 }}>
          <span style={{ fontWeight: 700, color: 'var(--gold)' }}>Como usar: </span>
          Selecione uma aba abaixo → clique na nota → vá em <strong>Ações</strong> → escolha o que fazer. Seus registros são salvos automaticamente e a Linea é notificada.
        </div>

        {/* Abas + conteúdo */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden' }}>
          {/* Tab bar */}
          <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', overflowX: 'auto', scrollbarWidth: 'none' }}>
            {TABS.map(t => {
              const cnt = counts[t.id];
              const isActive = activeTab === t.id;
              const isUrgent = t.id === 'urgente' && cnt > 0;
              return (
                <button
                  key={t.id}
                  onClick={() => setActiveTab(t.id)}
                  style={{
                    flex: 1, minWidth: 110, display: 'flex', flexDirection: 'column', alignItems: 'center',
                    gap: 3, padding: '13px 10px', border: 'none', background: isActive ? 'rgba(166,139,92,0.06)' : 'transparent',
                    borderBottom: isActive ? '2px solid var(--gold)' : '2px solid transparent',
                    cursor: 'pointer', transition: 'all 120ms', flexShrink: 0, position: 'relative',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <span style={{ fontSize: 15 }}>{t.emoji}</span>
                    {cnt > 0 && (
                      <span style={{
                        background: isUrgent ? '#E53E3E' : isActive ? 'var(--gold)' : 'var(--surface-3)',
                        color: '#fff', fontSize: 10, fontWeight: 700,
                        padding: '1px 6px', borderRadius: 10, lineHeight: 1.4,
                      }}>{cnt}</span>
                    )}
                  </div>
                  <span style={{ fontSize: 11, fontWeight: isActive ? 700 : 500, color: isActive ? 'var(--gold)' : 'var(--text-2)', whiteSpace: 'nowrap' }}>
                    {t.label}
                  </span>
                  <span style={{ fontSize: 9, color: isActive ? 'var(--gold)' : 'var(--text-3)', whiteSpace: 'nowrap', opacity: 0.8 }}>
                    {t.desc}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Conteúdo da aba */}
          <div style={{ padding: '16px 16px 8px' }}>
            {renderContent()}
          </div>
        </div>
      </div>

      {/* NoteDrawer embutido — abre quando clica numa nota */}
      {drawerNote && (
        <NoteDrawer
          note={drawerNote}
          mode={drawerMode}
          initialTab="actions"
          onClose={() => setDrawerNote(null)}
          statuses={statuses}
          extras={extras}
          history={history}
          user={user}
          isTransporter
          addChatMessage={addChatMessage}
          onStatus={onStatus}
          onTracking={onTracking}
          onOpenEmail={onOpenEmail}
          onSetTransporter={onSetTransporter}
          transporterNames={transporterNames}
          onSaveAcceptance={acceptanceHandler}
          acceptanceData={extras}
          permissions={permissions}
          noteMeta={noteMeta}
          saveMeta={saveMeta}
          users={users}
        />
      )}
    </>
  );
}
