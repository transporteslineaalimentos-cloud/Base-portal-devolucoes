import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../config/constants';

const TRACKING_LABELS = {
  aguardando_consolidacao:    '📦 Aguardando consolidação no CD',
  em_transito_filial_origem:  '🚚 Em trânsito para filial origem',
  em_transito_filial_destino: '🚛 Em trânsito para filial destino',
  aguardando_agendamento:     '📅 Aguardando agendamento',
  agendada:                   '📋 Agendada',
  entregue:                   '✅ Entregue — Retornou ao CD',
};

const STATUS_MAP = {
  registrada:  { c: '#6b7280', bg: '#f3f4f6', l: 'Registrada' },
  em_analise:  { c: '#d97706', bg: '#fffbeb', l: 'Em análise' },
  validada:    { c: '#0891b2', bg: '#ecfeff', l: 'Validada' },
  cobrar:      { c: '#dc2626', bg: '#fef2f2', l: 'Cobrança aprovada' },
  nao_cobrar:  { c: '#059669', bg: '#ecfdf5', l: 'Sem cobrança' },
  encerrada:   { c: '#9ca3af', bg: '#f8fafc', l: 'Encerrada' },
};

const MOTIVOS_COBRANCA = [
  'Extrapolou prazo de retorno',
  'Nota não compensa retornar — valor abaixo do frete',
  'Recusa indevida de entrega',
  'Extravio confirmado',
  'Avaria por responsabilidade do transportador',
  'Outros',
];

function ValidacaoModal({ open, ocorrencia, analista, onClose, onSaved }) {
  const [status, setStatus] = useState('');
  const [statusCobranca, setStatusCobranca] = useState('');
  const [motivoCobranca, setMotivoCobranca] = useState('');
  const [obs, setObs] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open && ocorrencia) {
      setStatus(ocorrencia.status || 'registrada');
      setStatusCobranca(ocorrencia.status_cobranca || '');
      setMotivoCobranca(ocorrencia.motivo_cobranca || '');
      setObs(ocorrencia.observacao_linea || '');
      setError('');
    }
  }, [open, ocorrencia]);

  if (!open || !ocorrencia) return null;

  const handleSave = async () => {
    if (statusCobranca === 'cobrar' && !motivoCobranca) {
      setError('Selecione o motivo da cobrança.'); return;
    }
    setSaving(true); setError('');
    try {
      const { error: err } = await supabase.from('dev_ocorrencias').update({
        status,
        status_cobranca: statusCobranca || null,
        motivo_cobranca: motivoCobranca || null,
        observacao_linea: obs || null,
        analista_nome: analista?.name || analista?.email || '',
        validada_em: new Date().toISOString(),
        validada_por: analista?.email || '',
        updated_at: new Date().toISOString(),
      }).eq('id', ocorrencia.id);
      if (err) throw new Error(err.message);
      onSaved?.();
      onClose();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 520 }}>
        <div className="modal-header">
          <h2 style={{ fontSize: 15, fontWeight: 800, color: 'var(--text)' }}>🔍 Analisar Ocorrência</h2>
          <p style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 3 }}>NFD {ocorrencia.nfd_numero} · {ocorrencia.transportador_nome}</p>
        </div>
        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 8, padding: 14 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, fontSize: 12 }}>
              <div><span style={{ color: 'var(--text-3)' }}>Nº NFD:</span> <strong>{ocorrencia.nfd_numero || '—'}</strong></div>
              <div><span style={{ color: 'var(--text-3)' }}>Data:</span> <strong>{ocorrencia.nfd_data ? String(ocorrencia.nfd_data).slice(0,10).split('-').reverse().join('/') : '—'}</strong></div>
              <div><span style={{ color: 'var(--text-3)' }}>Tipo:</span> <strong style={{ textTransform: 'capitalize' }}>{ocorrencia.tipo?.replace(/_/g,' ')}</strong></div>
              <div><span style={{ color: 'var(--text-3)' }}>Posição:</span> <strong>{TRACKING_LABELS[ocorrencia.tracking_status] || '—'}</strong></div>
            </div>
            <div style={{ marginTop: 10, fontSize: 12, color: 'var(--text-2)' }}>{ocorrencia.motivo}</div>
            {ocorrencia.tracking_comprovante_url && (
              <a href={ocorrencia.tracking_comprovante_url} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: 'var(--gold)', display: 'block', marginTop: 8 }}>📎 Ver comprovante</a>
            )}
          </div>

          <div>
            <label className="input-label">Status interno</label>
            <select value={status} onChange={e => setStatus(e.target.value)} className="input">
              {Object.entries(STATUS_MAP).map(([v, s]) => <option key={v} value={v}>{s.l}</option>)}
            </select>
          </div>

          <div>
            <label className="input-label">Decisão de cobrança</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 6 }}>
              {[
                { v: 'cobrar',    icon: '⚡', label: 'Cobrar transportador', c: '#dc2626', bg: '#fef2f2' },
                { v: 'nao_cobrar',icon: '✓',  label: 'Não cobrar',           c: '#059669', bg: '#ecfdf5' },
              ].map(opt => (
                <button key={opt.v} onClick={() => setStatusCobranca(statusCobranca === opt.v ? '' : opt.v)}
                  style={{ padding: '12px', borderRadius: 10, cursor: 'pointer', textAlign: 'center',
                    border: `2px solid ${statusCobranca === opt.v ? opt.c : 'var(--border)'}`,
                    background: statusCobranca === opt.v ? opt.bg : 'var(--surface)',
                    fontSize: 13, fontWeight: statusCobranca === opt.v ? 700 : 400,
                    color: statusCobranca === opt.v ? opt.c : 'var(--text-2)', transition: 'all .15s' }}>
                  <div style={{ fontSize: 20 }}>{opt.icon}</div>
                  <div>{opt.label}</div>
                </button>
              ))}
            </div>
          </div>

          {statusCobranca === 'cobrar' && (
            <div>
              <label className="input-label">Motivo da cobrança <span style={{ color: 'var(--red)' }}>*</span></label>
              <select value={motivoCobranca} onChange={e => setMotivoCobranca(e.target.value)} className="input">
                <option value="">Selecione...</option>
                {MOTIVOS_COBRANCA.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
          )}

          <div>
            <label className="input-label">Observação interna <span style={{ color: 'var(--text-3)', fontWeight: 400 }}>(opcional)</span></label>
            <textarea value={obs} onChange={e => setObs(e.target.value)} rows={2} placeholder="Notas para uso interno..." className="input" />
          </div>

          {error && <div style={{ padding: '10px 14px', borderRadius: 8, background: 'rgba(248,81,73,.06)', border: '1px solid rgba(248,81,73,.15)', fontSize: 12, color: '#F85149' }}>{error}</div>}
        </div>
        <div className="modal-footer">
          <button onClick={onClose} className="btn btn-outline">Cancelar</button>
          <button disabled={saving} onClick={handleSave} className="btn btn-gold">{saving ? 'Salvando...' : '✅ Salvar análise'}</button>
        </div>
      </div>
    </div>
  );
}

export default function AnalistaOcorrencias({ user }) {
  const [ocorrencias, setOcorrencias] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [filtroStatus, setFiltroStatus] = useState('');
  const [filtroCobranca, setFiltroCobranca] = useState('');
  const [busca, setBusca] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from('dev_ocorrencias').select('*').order('created_at', { ascending: false });
    setOcorrencias(data || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = ocorrencias.filter(o => {
    if (filtroStatus && o.status !== filtroStatus) return false;
    if (filtroCobranca === 'pendente' && o.status_cobranca) return false;
    if (filtroCobranca === 'cobrar' && o.status_cobranca !== 'cobrar') return false;
    if (filtroCobranca === 'nao_cobrar' && o.status_cobranca !== 'nao_cobrar') return false;
    if (busca) {
      const q = busca.toLowerCase();
      return (o.nfd_numero||'').toLowerCase().includes(q)||(o.transportador_nome||'').toLowerCase().includes(q)||(o.motivo||'').toLowerCase().includes(q);
    }
    return true;
  });

  const pendentesAnalise = ocorrencias.filter(o => o.status === 'registrada').length;
  const aCobrar = ocorrencias.filter(o => o.status_cobranca === 'cobrar').length;
  const semCobranca = ocorrencias.filter(o => o.status_cobranca === 'nao_cobrar').length;
  const fmtDate = s => s ? String(s).slice(0,10).split('-').reverse().join('/') : '—';

  return (
    <div style={{ padding: '0 0 32px' }}>
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ fontSize: 18, fontWeight: 800, color: 'var(--text)', margin: 0 }}>🔍 Análise de Ocorrências</h2>
        <p style={{ fontSize: 13, color: 'var(--text-3)', marginTop: 4 }}>{ocorrencias.length} ocorrências · {pendentesAnalise} pendentes de análise</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
        {[
          { l: 'Pendentes análise', v: pendentesAnalise, c: '#f59e0b', icon: '⏳' },
          { l: 'A cobrar',          v: aCobrar,          c: '#dc2626', icon: '⚡' },
          { l: 'Sem cobrança',      v: semCobranca,      c: '#059669', icon: '✓' },
          { l: 'Total',             v: ocorrencias.length, c: '#6b7280', icon: '📋' },
        ].map(k => (
          <div key={k.l} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '14px 18px', borderLeft: `3px solid ${k.c}` }}>
            <div style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '.05em' }}>{k.l}</div>
            <div style={{ fontSize: 28, fontWeight: 800, color: k.c }}>{k.icon} {k.v}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="🔍 NFD, transportador..." className="input" style={{ width: 240, margin: 0 }} />
        <select value={filtroStatus} onChange={e => setFiltroStatus(e.target.value)} className="input" style={{ width: 'auto', margin: 0 }}>
          <option value="">Status (todos)</option>
          {Object.entries(STATUS_MAP).map(([v,s]) => <option key={v} value={v}>{s.l}</option>)}
        </select>
        <select value={filtroCobranca} onChange={e => setFiltroCobranca(e.target.value)} className="input" style={{ width: 'auto', margin: 0 }}>
          <option value="">Cobrança (todas)</option>
          <option value="pendente">Sem decisão</option>
          <option value="cobrar">A cobrar</option>
          <option value="nao_cobrar">Sem cobrança</option>
        </select>
        {(filtroStatus||filtroCobranca||busca) && (
          <button onClick={() => { setFiltroStatus(''); setFiltroCobranca(''); setBusca(''); }} className="btn btn-outline" style={{ fontSize: 12 }}>× Limpar</button>
        )}
        <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--text-3)' }}>{filtered.length} resultado(s)</span>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 48, color: 'var(--text-3)' }}>Carregando...</div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px 24px', color: 'var(--text-3)' }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>✅</div>
          <div style={{ fontSize: 15, fontWeight: 700 }}>Nenhuma ocorrência encontrada</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filtered.map(oc => {
            const st = STATUS_MAP[oc.status] || STATUS_MAP.registrada;
            const cobr = oc.status_cobranca === 'cobrar' ? { c: '#dc2626', bg: '#fef2f2', l: '⚡ A cobrar' }
                       : oc.status_cobranca === 'nao_cobrar' ? { c: '#059669', bg: '#ecfdf5', l: '✓ Sem cobrança' }
                       : null;
            const isPend = oc.status === 'registrada';
            return (
              <div key={oc.id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 16, borderLeft: `3px solid ${isPend ? '#f59e0b' : st.c}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 15, fontWeight: 800, color: 'var(--gold)' }}>NFD {oc.nfd_numero || '—'}</span>
                      <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, background: st.bg, color: st.c, fontWeight: 600 }}>{st.l}</span>
                      {cobr && <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, background: cobr.bg, color: cobr.c, fontWeight: 700 }}>{cobr.l}</span>}
                      {isPend && <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 20, background: '#fffbeb', color: '#d97706', fontWeight: 700 }}>⏳ Aguardando análise</span>}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-2)', marginBottom: 6, display: 'flex', gap: 14, flexWrap: 'wrap' }}>
                      <span>🚛 <strong>{oc.transportador_nome}</strong></span>
                      <span>📅 <strong>{fmtDate(oc.nfd_data)}</strong></span>
                      <span>🏷️ <strong style={{ textTransform: 'capitalize' }}>{oc.tipo?.replace(/_/g,' ')}</strong></span>
                      <span style={{ color: 'var(--text-3)' }}>Registrada {fmtDate(oc.created_at)}</span>
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 6 }}>{oc.motivo}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-3)' }}>
                      📍 <strong style={{ color: 'var(--text-2)' }}>{TRACKING_LABELS[oc.tracking_status] || oc.tracking_status || '—'}</strong>
                      {oc.tracking_data_agendamento && <span> · 📅 {fmtDate(oc.tracking_data_agendamento)}</span>}
                    </div>
                    {oc.motivo_cobranca && <div style={{ fontSize: 11, marginTop: 4, color: '#dc2626' }}>⚡ {oc.motivo_cobranca}</div>}
                    {oc.observacao_linea && <div style={{ fontSize: 11, marginTop: 4, color: 'var(--text-3)', fontStyle: 'italic' }}>💬 {oc.observacao_linea}</div>}
                    {oc.validada_por && <div style={{ fontSize: 11, marginTop: 4, color: 'var(--text-3)' }}>✅ Validada por <strong>{oc.validada_por}</strong> em {fmtDate(oc.validada_em)}</div>}
                    {oc.tracking_comprovante_url && (
                      <a href={oc.tracking_comprovante_url} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: 'var(--gold)', display: 'inline-block', marginTop: 6 }}>📎 Ver comprovante</a>
                    )}
                  </div>
                  <button onClick={() => setSelected(oc)} className="btn btn-gold" style={{ fontSize: 12, flexShrink: 0, whiteSpace: 'nowrap' }}>
                    🔍 {oc.status === 'registrada' ? 'Analisar' : 'Editar'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <ValidacaoModal open={!!selected} ocorrencia={selected} analista={user} onClose={() => setSelected(null)} onSaved={load} />
    </div>
  );
}
