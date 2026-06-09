import { useCallback, useEffect, useRef, useState } from 'react';
import { useOobj } from '../hooks/useOobj';

// ── Ícones inline ─────────────────────────────────────────────────────────────
const Ic = ({ d, size = 16, color = 'currentColor', style = {} }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={style}>
    <path d={d} />
  </svg>
);

const ICONS = {
  nfe:      'M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8zm-2 9H8m4 4H8m2-8H8',
  search:   'M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0',
  filter:   'M4 6h16M7 12h10M10 18h4',
  refresh:  'M1 4v6h6M23 20v-6h-6M20.49 9A9 9 0 005.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 013.51 15',
  download: 'M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3',
  link:     'M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71',
  eye:      'M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8zm11-3a3 3 0 100 6 3 3 0 000-6z',
  chevronL: 'M15 18l-6-6 6-6',
  chevronR: 'M9 18l6-6-6-6',
  x:        'M18 6L6 18M6 6l12 12',
  clock:    'M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10zm0-6V12l4 2',
  check:    'M20 6L9 17l-5-5',
  pkg:      'M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z',
  alert:    'M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0zM12 9v4m0 4h.01',
};

// ── Status config ─────────────────────────────────────────────────────────────
const STATUS_CFG = {
  pendente:    { l: 'Pendente',    c: '#6b7280', bg: 'rgba(107,114,128,0.12)' },
  em_analise:  { l: 'Em análise', c: '#d97706', bg: 'rgba(217,119,6,0.12)'   },
  aprovada:    { l: 'Aprovada',   c: '#10b981', bg: 'rgba(16,185,129,0.12)'  },
  rejeitada:   { l: 'Rejeitada',  c: '#f85149', bg: 'rgba(248,81,73,0.12)'   },
  concluida:   { l: 'Concluída',  c: '#58a6ff', bg: 'rgba(88,166,255,0.12)'  },
};

const TIPO_CFG = {
  devolucao:               { l: 'Devolução',       c: '#a68b5c', bg: 'rgba(166,139,92,0.12)'  },
  outros:                  { l: 'Outros',          c: '#6b7280', bg: 'rgba(107,114,128,0.1)'   },
  pendente_classificacao:  { l: 'Sem class.',      c: '#d97706', bg: 'rgba(217,119,6,0.12)'    },
};

const CNPJ_MAP = {
  '05207076000297': 'MIX',
  '05207076000459': 'CHOCOLATE',
};

function fmtDate(d) {
  if (!d) return '—';
  const [y, m, day] = d.split('-');
  return `${day}/${m}/${y}`;
}

function fmtBRL(v) {
  if (v == null) return '—';
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
}

function Badge({ cfg, small }) {
  if (!cfg) return null;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      fontSize: small ? 10 : 11, fontWeight: 600,
      color: cfg.c, background: cfg.bg,
      padding: small ? '2px 6px' : '3px 8px',
      borderRadius: 4, whiteSpace: 'nowrap',
    }}>{cfg.l}</span>
  );
}

// ── Drawer de detalhe ─────────────────────────────────────────────────────────
function DetailDrawer({ nfeId, onClose, user, getXmlUrl, loadDetail, updateStatus, saving, onSaved }) {
  const [nfe, setNfe]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [xmlUrl, setXmlUrl]  = useState(null);
  const [statusEdit, setStatusEdit] = useState(false);
  const [newStatus, setNewStatus]   = useState('');
  const [obs, setObs]        = useState('');
  const [saveErr, setSaveErr]= useState('');

  useEffect(() => {
    if (!nfeId) return;
    setLoading(true); setNfe(null); setXmlUrl(null); setStatusEdit(false);
    loadDetail(nfeId).then(d => {
      setNfe(d);
      setNewStatus(d?.status_portal || 'pendente');
      setLoading(false);
    }).catch(e => { console.warn(e); setLoading(false); });
  }, [nfeId]); // eslint-disable-line

  const handleGetXml = async () => {
    if (!nfe?.xml_path) return;
    try {
      const url = await getXmlUrl(nfe.xml_path);
      if (url) window.open(url, '_blank');
    } catch (e) { alert('Erro ao gerar link: ' + e.message); }
  };

  const handleSaveStatus = async () => {
    setSaveErr('');
    try {
      await updateStatus(nfe.id, newStatus, obs);
      setNfe(prev => ({ ...prev, status_portal: newStatus }));
      setStatusEdit(false); setObs('');
      onSaved?.();
    } catch (e) { setSaveErr(e.message); }
  };

  const obsHistory = nfe?.raw_json?.obs_historico || [];

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 200,
        display: 'flex', justifyContent: 'flex-end',
        background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(2px)',
      }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div style={{
        width: 520, maxWidth: '100vw', height: '100%',
        background: 'var(--surface)', borderLeft: '1px solid var(--border)',
        display: 'flex', flexDirection: 'column',
        boxShadow: 'var(--shadow-lg)', overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '16px 20px', borderBottom: '1px solid var(--border)',
          background: 'var(--surface-2)',
        }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>
              NF-e {loading ? '...' : `${nfe?.nf_numero || '—'}/${nfe?.nf_serie || ''}`}
            </div>
            {nfe && <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>{nfe.nome_emitente}</div>}
          </div>
          <button onClick={onClose} className="btn btn-outline btn-sm" style={{ padding: '4px 8px' }}>
            <Ic d={ICONS.x} size={14} />
          </button>
        </div>

        {loading ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-3)', fontSize: 13 }}>
            Carregando...
          </div>
        ) : !nfe ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--red)', fontSize: 13 }}>
            Erro ao carregar NF-e.
          </div>
        ) : (
          <div style={{ flex: 1, overflowY: 'auto', padding: '0 0 24px 0' }}>

            {/* Badges + ações */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 20px', flexWrap: 'wrap', borderBottom: '1px solid var(--border)' }}>
              <Badge cfg={TIPO_CFG[nfe.tipo]} />
              <Badge cfg={STATUS_CFG[nfe.status_portal] || STATUS_CFG.pendente} />
              <div style={{ flex: 1 }} />
              {nfe.xml_baixado && nfe.xml_path && (
                <button onClick={handleGetXml} className="btn btn-outline btn-sm" style={{ fontSize: 11, gap: 4, display: 'flex', alignItems: 'center' }}>
                  <Ic d={ICONS.download} size={12} /> XML
                </button>
              )}
              <button onClick={() => setStatusEdit(v => !v)} className="btn btn-gold btn-sm" style={{ fontSize: 11, gap: 4, display: 'flex', alignItems: 'center' }}>
                <Ic d={ICONS.check} size={12} /> Atualizar status
              </button>
            </div>

            {/* Status editor */}
            {statusEdit && (
              <div style={{ margin: '12px 20px', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 8, padding: 14 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-2)', marginBottom: 8 }}>Novo status</div>
                <select
                  value={newStatus}
                  onChange={e => setNewStatus(e.target.value)}
                  className="input"
                  style={{ marginBottom: 8 }}
                >
                  {Object.entries(STATUS_CFG).map(([k, v]) => (
                    <option key={k} value={k}>{v.l}</option>
                  ))}
                </select>
                <textarea
                  value={obs}
                  onChange={e => setObs(e.target.value)}
                  placeholder="Observação (opcional)"
                  className="input"
                  rows={2}
                  style={{ resize: 'vertical', marginBottom: 8 }}
                />
                {saveErr && <div style={{ color: 'var(--red)', fontSize: 11, marginBottom: 6 }}>{saveErr}</div>}
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => setStatusEdit(false)} className="btn btn-outline btn-sm">Cancelar</button>
                  <button onClick={handleSaveStatus} disabled={saving} className="btn btn-gold btn-sm">
                    {saving ? 'Salvando...' : 'Salvar'}
                  </button>
                </div>
              </div>
            )}

            {/* Dados gerais */}
            <Section title="Dados da NF-e">
              <Row label="Número / Série" value={`${nfe.nf_numero || '—'} / ${nfe.nf_serie || '—'}`} />
              <Row label="Chave de acesso" value={<span style={{ fontFamily: 'monospace', fontSize: 10, wordBreak: 'break-all' }}>{nfe.chave_nfe}</span>} />
              <Row label="Natureza da operação" value={nfe.nat_operacao || '—'} />
              <Row label="Emissão" value={fmtDate(nfe.dt_emissao)} />
              <Row label="CFOPs" value={(nfe.cfops || []).join(', ') || '—'} />
              <Row label="CNPJ destinatário" value={`${CNPJ_MAP[nfe.cnpj_destinatario] || ''} — ${nfe.cnpj_destinatario || '—'}`} />
            </Section>

            {/* Emitente */}
            <Section title="Emitente">
              <Row label="Nome" value={nfe.nome_emitente || '—'} />
              <Row label="CNPJ" value={nfe.cnpj_emitente || '—'} />
              <Row label="Município / UF" value={`${nfe.municipio_emitente || '—'} / ${nfe.uf_emitente || '—'}`} />
            </Section>

            {/* Valores */}
            <Section title="Valores">
              <Row label="Total NF" value={<strong style={{ color: 'var(--gold)' }}>{fmtBRL(nfe.valor)}</strong>} />
              <Row label="Produtos" value={fmtBRL(nfe.valor_produtos)} />
              <Row label="ICMS" value={fmtBRL(nfe.valor_icms)} />
              <Row label="ICMS-ST" value={fmtBRL(nfe.valor_st)} />
            </Section>

            {/* NF Referenciada */}
            {nfe.chave_nfe_referenciada && (
              <Section title="NF de venda referenciada">
                <div style={{ padding: '0 0 4px 0', fontSize: 11, color: 'var(--text-2)' }}>
                  Esta devolução referencia a NF-e de saída original:
                </div>
                <div style={{
                  fontFamily: 'monospace', fontSize: 10, background: 'var(--surface-3)',
                  padding: '8px 10px', borderRadius: 6, wordBreak: 'break-all',
                  color: 'var(--blue)', border: '1px solid var(--border)',
                }}>
                  {nfe.chave_nfe_referenciada}
                </div>
                <div style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 4 }}>
                  Use a chave acima para localizar no Active OnSupply
                </div>
              </Section>
            )}

            {/* Itens */}
            {Array.isArray(nfe.itens) && nfe.itens.length > 0 && (
              <Section title={`Itens (${nfe.itens.length})`}>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
                    <thead>
                      <tr>
                        {['#','CFOP','Produto','Qtd','Vl. Total'].map(h => (
                          <th key={h} style={{ textAlign: h === '#' || h === 'CFOP' ? 'center' : 'left', padding: '4px 6px', color: 'var(--text-3)', fontWeight: 600, borderBottom: '1px solid var(--border)' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {nfe.itens.map((it, i) => (
                        <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                          <td style={{ textAlign: 'center', padding: '5px 6px', color: 'var(--text-3)' }}>{it.item}</td>
                          <td style={{ textAlign: 'center', padding: '5px 6px', color: 'var(--gold)', fontWeight: 600 }}>{it.cfop}</td>
                          <td style={{ padding: '5px 6px', color: 'var(--text)', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={it.descricao}>{it.descricao}</td>
                          <td style={{ padding: '5px 6px', color: 'var(--text-2)', whiteSpace: 'nowrap' }}>{it.quantidade} {it.unidade}</td>
                          <td style={{ padding: '5px 6px', color: 'var(--text)', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>{fmtBRL(it.valor_total)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Section>
            )}

            {/* Histórico de observações */}
            {obsHistory.length > 0 && (
              <Section title="Histórico de status">
                {obsHistory.slice().reverse().map((h, i) => (
                  <div key={i} style={{ display: 'flex', gap: 10, marginBottom: 8 }}>
                    <div style={{ width: 6, flexShrink: 0, background: 'var(--gold)', borderRadius: 3, marginTop: 2 }} />
                    <div>
                      <div style={{ fontSize: 11, color: 'var(--text-2)' }}>
                        <span style={{ color: 'var(--text)', fontWeight: 600 }}>{STATUS_CFG[h.status]?.l || h.status}</span>
                        {' · '}{h.user}{' · '}{new Date(h.ts).toLocaleString('pt-BR')}
                      </div>
                      {h.obs && <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>{h.obs}</div>}
                    </div>
                  </div>
                ))}
              </Section>
            )}

          </div>
        )}
      </div>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)' }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>{title}</div>
      {children}
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6, gap: 12 }}>
      <span style={{ fontSize: 11, color: 'var(--text-3)', flexShrink: 0 }}>{label}</span>
      <span style={{ fontSize: 11, color: 'var(--text-2)', textAlign: 'right', wordBreak: 'break-word' }}>{value}</span>
    </div>
  );
}

// ── KPI Card compacto ──────────────────────────────────────────────────────────
function KpiCard({ label, value, sub, color, icon, onClick }) {
  return (
    <div onClick={onClick} style={{
      background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10,
      padding: '14px 16px', cursor: onClick ? 'pointer' : 'default',
      transition: 'border-color 150ms, background 150ms',
    }}
      onMouseEnter={e => { if (onClick) { e.currentTarget.style.borderColor = color; e.currentTarget.style.background = 'var(--surface-2)'; }}}
      onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = 'var(--surface)'; }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <span style={{ fontSize: 11, color: 'var(--text-3)', fontWeight: 500 }}>{label}</span>
        <div style={{ opacity: 0.6 }}>{icon}</div>
      </div>
      <div style={{ fontSize: 24, fontWeight: 700, color, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

// ── Componente principal ───────────────────────────────────────────────────────
export default function OobjNfes({ user }) {
  const hook = useOobj(user);
  const {
    nfes, total, kpis, loading, saving, filters, applyFilters,
    page, setPage, totalPages, reload, loadDetail, updateStatus, getXmlUrl,
    fmtBRL,
  } = hook;

  const [selectedId, setSelectedId] = useState(null);
  const [showFilters, setShowFilters] = useState(false);

  // local search (debounced)
  const searchRef = useRef(null);
  const handleSearch = (v) => {
    clearTimeout(searchRef.current);
    searchRef.current = setTimeout(() => applyFilters({ search: v }), 350);
  };

  const handleSaved = () => reload();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12 }}>
        <KpiCard
          label="Total de devoluções"
          value={kpis.count.toLocaleString('pt-BR')}
          sub={fmtBRL(kpis.valor)}
          color="var(--gold)"
          icon={<Ic d={ICONS.pkg} size={16} color="var(--gold)" />}
          onClick={() => applyFilters({ tipo: 'devolucao', status: '' })}
        />
        <KpiCard
          label="Pendentes de análise"
          value={kpis.pendentes.toLocaleString('pt-BR')}
          color="var(--yellow)"
          icon={<Ic d={ICONS.alert} size={16} color="var(--yellow)" />}
          onClick={() => applyFilters({ tipo: 'devolucao', status: 'pendente' })}
        />
        <KpiCard
          label="Em análise / concluídas"
          value={(kpis.count - kpis.pendentes).toLocaleString('pt-BR')}
          color="var(--green)"
          icon={<Ic d={ICONS.check} size={16} color="var(--green)" />}
          onClick={() => applyFilters({ tipo: 'devolucao', status: 'em_analise' })}
        />
      </div>

      {/* Barra de busca + filtros */}
      <div style={{
        background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', borderBottom: showFilters ? '1px solid var(--border)' : 'none' }}>
          <Ic d={ICONS.search} size={15} color="var(--text-3)" />
          <input
            type="text"
            placeholder="Buscar por emitente, número NF ou chave..."
            defaultValue={filters.search}
            onChange={e => handleSearch(e.target.value)}
            style={{
              flex: 1, background: 'none', border: 'none', outline: 'none',
              fontSize: 13, color: 'var(--text)', '::placeholder': { color: 'var(--text-3)' },
            }}
          />
          <button
            onClick={() => setShowFilters(v => !v)}
            className={`btn btn-sm ${showFilters ? 'btn-gold' : 'btn-outline'}`}
            style={{ display: 'flex', alignItems: 'center', gap: 5 }}
          >
            <Ic d={ICONS.filter} size={13} />
            Filtros
          </button>
          <button onClick={() => reload()} className="btn btn-outline btn-sm" style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <Ic d={ICONS.refresh} size={13} />
          </button>
        </div>

        {showFilters && (
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', padding: '10px 12px', background: 'var(--surface-2)' }}>
            <select value={filters.tipo} onChange={e => applyFilters({ tipo: e.target.value })} className="input" style={{ width: 'auto', minWidth: 140 }}>
              <option value="">Todos os tipos</option>
              <option value="devolucao">Devoluções</option>
              <option value="outros">Outros</option>
              <option value="pendente_classificacao">Sem classificação</option>
            </select>
            <select value={filters.status} onChange={e => applyFilters({ status: e.target.value })} className="input" style={{ width: 'auto', minWidth: 140 }}>
              <option value="">Todos os status</option>
              {Object.entries(STATUS_CFG).map(([k, v]) => (
                <option key={k} value={k}>{v.l}</option>
              ))}
            </select>
            <select value={filters.cnpj} onChange={e => applyFilters({ cnpj: e.target.value })} className="input" style={{ width: 'auto', minWidth: 140 }}>
              <option value="">Todos os CNPJs</option>
              {Object.entries(CNPJ_MAP).map(([cnpj, label]) => (
                <option key={cnpj} value={cnpj}>{label}</option>
              ))}
            </select>
            <input type="text" placeholder="UF (ex: SP)" maxLength={2} value={filters.uf}
              onChange={e => applyFilters({ uf: e.target.value.toUpperCase() })}
              className="input" style={{ width: 70 }}
            />
            <input type="date" value={filters.dtInicio}
              onChange={e => applyFilters({ dtInicio: e.target.value })}
              className="input" style={{ width: 'auto' }}
            />
            <input type="date" value={filters.dtFim}
              onChange={e => applyFilters({ dtFim: e.target.value })}
              className="input" style={{ width: 'auto' }}
            />
            <button
              onClick={() => applyFilters({ tipo: 'devolucao', status: '', cnpj: '', uf: '', dtInicio: '', dtFim: '', search: '' })}
              className="btn btn-outline btn-sm"
            >
              Limpar
            </button>
          </div>
        )}
      </div>

      {/* Tabela */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
        {/* Header tabela */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '90px 1fr 60px 80px 110px 110px 110px 80px',
          padding: '8px 14px',
          background: 'var(--surface-2)',
          borderBottom: '1px solid var(--border)',
          fontSize: 10, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.07em',
        }}>
          <span>NF / Série</span>
          <span>Emitente</span>
          <span>UF</span>
          <span>CNPJ Dest.</span>
          <span>Emissão</span>
          <span style={{ textAlign: 'right' }}>Valor NF</span>
          <span style={{ textAlign: 'center' }}>Tipo / Status</span>
          <span style={{ textAlign: 'center' }}>XML</span>
        </div>

        {/* Corpo */}
        {loading ? (
          <div style={{ padding: '32px 14px', textAlign: 'center', color: 'var(--text-3)', fontSize: 13 }}>
            Carregando...
          </div>
        ) : nfes.length === 0 ? (
          <div style={{ padding: '40px 14px', textAlign: 'center', color: 'var(--text-3)', fontSize: 13 }}>
            Nenhuma NF-e encontrada para os filtros selecionados.
          </div>
        ) : nfes.map((nfe, idx) => (
          <div
            key={nfe.id}
            onClick={() => setSelectedId(nfe.id)}
            style={{
              display: 'grid',
              gridTemplateColumns: '90px 1fr 60px 80px 110px 110px 110px 80px',
              padding: '10px 14px',
              borderBottom: idx < nfes.length - 1 ? '1px solid var(--border)' : 'none',
              cursor: 'pointer', alignItems: 'center',
              transition: 'background 100ms',
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-2)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          >
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)', fontVariantNumeric: 'tabular-nums' }}>
                {nfe.nf_numero || '—'}
              </div>
              <div style={{ fontSize: 10, color: 'var(--text-3)' }}>Série {nfe.nf_serie || '—'}</div>
            </div>

            <div style={{ overflow: 'hidden' }}>
              <div style={{ fontSize: 12, color: 'var(--text)', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {nfe.nome_emitente || '—'}
              </div>
              <div style={{ fontSize: 10, color: 'var(--text-3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {nfe.municipio_emitente}
              </div>
            </div>

            <div style={{ fontSize: 12, color: 'var(--text-2)', fontWeight: 600 }}>
              {nfe.uf_emitente || '—'}
            </div>

            <div style={{ fontSize: 10, color: 'var(--text-3)' }}>
              {CNPJ_MAP[nfe.cnpj_destinatario] || '—'}
            </div>

            <div style={{ fontSize: 11, color: 'var(--text-2)' }}>
              {fmtDate(nfe.dt_emissao)}
            </div>

            <div style={{ textAlign: 'right', fontSize: 12, fontWeight: 600, color: 'var(--text)', fontVariantNumeric: 'tabular-nums' }}>
              {fmtBRL(nfe.valor)}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 3, alignItems: 'center' }}>
              <Badge cfg={TIPO_CFG[nfe.tipo]} small />
              <Badge cfg={STATUS_CFG[nfe.status_portal] || STATUS_CFG.pendente} small />
            </div>

            <div style={{ textAlign: 'center' }}>
              {nfe.xml_baixado ? (
                <span style={{ fontSize: 10, color: 'var(--green)', fontWeight: 600 }}>✓ sim</span>
              ) : (
                <span style={{ fontSize: 10, color: 'var(--text-3)' }}>aguard.</span>
              )}
            </div>
          </div>
        ))}

        {/* Paginação */}
        {totalPages > 1 && (
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '10px 14px', borderTop: '1px solid var(--border)', background: 'var(--surface-2)',
          }}>
            <span style={{ fontSize: 11, color: 'var(--text-3)' }}>
              {total.toLocaleString('pt-BR')} registros · Página {page + 1} de {totalPages}
            </span>
            <div style={{ display: 'flex', gap: 6 }}>
              <button
                disabled={page === 0}
                onClick={() => setPage(p => Math.max(0, p - 1))}
                className="btn btn-outline btn-sm"
                style={{ padding: '4px 8px', opacity: page === 0 ? 0.4 : 1 }}
              >
                <Ic d={ICONS.chevronL} size={14} />
              </button>
              <button
                disabled={page >= totalPages - 1}
                onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                className="btn btn-outline btn-sm"
                style={{ padding: '4px 8px', opacity: page >= totalPages - 1 ? 0.4 : 1 }}
              >
                <Ic d={ICONS.chevronR} size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Drawer de detalhe */}
      {selectedId && (
        <DetailDrawer
          nfeId={selectedId}
          onClose={() => setSelectedId(null)}
          user={user}
          getXmlUrl={getXmlUrl}
          loadDetail={loadDetail}
          updateStatus={updateStatus}
          saving={saving}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
}
