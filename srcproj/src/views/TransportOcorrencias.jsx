import { useEffect, useState, useCallback } from 'react';
import { supabase, SB_URL, SB_KEY } from '../config/constants';

const TRACKING_OPTIONS = [
  { v: 'aguardando_consolidacao',    l: 'Aguardando consolidação no CD',      i: '📦' },
  { v: 'em_transito_filial_origem',  l: 'Em trânsito para filial origem',      i: '🚚' },
  { v: 'em_transito_filial_destino', l: 'Em trânsito para filial destino',     i: '🚛' },
  { v: 'aguardando_agendamento',     l: 'Aguardando agendamento',              i: '📅' },
  { v: 'agendada',                   l: 'Agendada',                            i: '📋', hasDate: true },
  { v: 'entregue',                   l: 'Entregue — Retornou ao CD',           i: '✅', hasProof: true },
];

const STATUS_COLORS = {
  registrada:  { c: '#6b7280', bg: '#f3f4f6', l: 'Registrada' },
  em_analise:  { c: '#d97706', bg: '#fffbeb', l: 'Em análise' },
  validada:    { c: '#059669', bg: '#ecfdf5', l: 'Validada' },
  cobrar:      { c: '#dc2626', bg: '#fef2f2', l: 'Cobrança aprovada' },
  nao_cobrar:  { c: '#10b981', bg: '#ecfdf5', l: 'Sem cobrança' },
  encerrada:   { c: '#9ca3af', bg: '#f8fafc', l: 'Encerrada' },
};

async function uploadAnexo(ocorrenciaId, file) {
  const ts = Date.now();
  const ext = file.name.split('.').pop();
  const path = `${ocorrenciaId}/${ts}_${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
  const token = localStorage.getItem('sb_token');
  const res = await fetch(`${SB_URL}/storage/v1/object/dev-anexos/${path}`, {
    method: 'POST',
    headers: {
      'apikey': SB_KEY,
      'Authorization': token ? `Bearer ${token}` : `Bearer ${SB_KEY}`,
      'Content-Type': file.type || 'application/octet-stream',
      'x-upsert': 'true',
    },
    body: file,
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error('Falha no upload: ' + txt);
  }
  return `${SB_URL}/storage/v1/object/public/dev-anexos/${path}`;
}

/* ── Modal de Nova Ocorrência ─────────────────────────────── */
function NovaOcorrenciaModal({ open, transportador_cnpj, transportador_nome, onClose, onSaved }) {
  const [nfd_numero, setNfd] = useState('');
  const [nfd_data, setNfdData] = useState('');
  const [tipo, setTipo] = useState('avaria');
  const [motivo, setMotivo] = useState('');
  const [observacao, setObs] = useState('');
  const [arquivo, setArquivo] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) { setNfd(''); setNfdData(''); setTipo('avaria'); setMotivo(''); setObs(''); setArquivo(null); setError(''); }
  }, [open]);

  if (!open) return null;

  const handleSave = async () => {
    if (!nfd_numero.trim()) { setError('Preencha o número da NFD.'); return; }
    if (!nfd_data) { setError('Preencha a data da devolução.'); return; }
    if (!motivo.trim()) { setError('Descreva o motivo.'); return; }
    setSaving(true); setError('');
    try {
      const { data: oc, error: err } = await supabase.from('dev_ocorrencias').insert({
        transportador_cnpj, transportador_nome,
        nfd_numero: nfd_numero.trim(),
        nfd_data,
        tipo,
        motivo: motivo.trim(),
        observacao: observacao.trim() || null,
        status: 'registrada',
        tracking_status: 'aguardando_consolidacao',
      }).select().single();
      if (err) throw new Error(err.message);

      if (arquivo && oc?.id) {
        try {
          const url = await uploadAnexo(oc.id, arquivo);
          await supabase.from('dev_ocorrencias').update({ tracking_comprovante_url: url }).eq('id', oc.id);
          await supabase.from('dev_tracking').insert({ ocorrencia_id: oc.id, status: 'aguardando_consolidacao', comprovante_url: url, registrado_por: transportador_nome });
        } catch (upErr) {
          console.warn('Anexo falhou:', upErr.message);
        }
      } else if (oc?.id) {
        await supabase.from('dev_tracking').insert({ ocorrencia_id: oc.id, status: 'aguardando_consolidacao', registrado_por: transportador_nome });
      }

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
          <h2 style={{ fontSize: 16, fontWeight: 800, color: 'var(--text)' }}>📋 Registrar Ocorrência de Devolução</h2>
          <p style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 3 }}>Preencha os dados da devolução para registro</p>
        </div>
        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label className="input-label">Nº da NFD (Nota Fiscal de Devolução) <span style={{ color: 'var(--red)' }}>*</span></label>
              <input value={nfd_numero} onChange={e => setNfd(e.target.value)} placeholder="Ex: 12345" className="input" />
            </div>
            <div>
              <label className="input-label">Data da Devolução <span style={{ color: 'var(--red)' }}>*</span></label>
              <input type="date" value={nfd_data} onChange={e => setNfdData(e.target.value)} className="input" />
            </div>
          </div>
          <div>
            <label className="input-label">Tipo de Ocorrência</label>
            <select value={tipo} onChange={e => setTipo(e.target.value)} className="input">
              <option value="avaria">Avaria</option>
              <option value="extravio">Extravio</option>
              <option value="recusa_entrega">Recusa de Entrega</option>
              <option value="endereco_incorreto">Endereço Incorreto</option>
              <option value="cliente_ausente">Cliente Ausente</option>
              <option value="outros">Outros</option>
            </select>
          </div>
          <div>
            <label className="input-label">Motivo / Descrição <span style={{ color: 'var(--red)' }}>*</span></label>
            <textarea value={motivo} onChange={e => setMotivo(e.target.value)} rows={3} placeholder="Descreva o motivo da devolução..." className="input" />
          </div>
          <div>
            <label className="input-label">Observações adicionais</label>
            <textarea value={observacao} onChange={e => setObs(e.target.value)} rows={2} placeholder="Informações complementares..." className="input" />
          </div>
          <div>
            <label className="input-label">Anexo (foto / PDF) <span style={{ color: 'var(--text-3)', fontWeight: 400 }}>(opcional)</span></label>
            <input type="file" accept="image/*,application/pdf" onChange={e => setArquivo(e.target.files?.[0] || null)} className="input" style={{ cursor: 'pointer' }} />
          </div>
          {error && <div style={{ padding: '10px 14px', borderRadius: 8, background: 'rgba(248,81,73,.06)', border: '1px solid rgba(248,81,73,.15)', fontSize: 12, color: '#F85149' }}>{error}</div>}
        </div>
        <div className="modal-footer">
          <button onClick={onClose} className="btn btn-outline">Cancelar</button>
          <button disabled={saving} onClick={handleSave} className="btn btn-gold">{saving ? 'Salvando...' : '✅ Registrar Ocorrência'}</button>
        </div>
      </div>
    </div>
  );
}

/* ── Modal de Atualização de Tracking ─────────────────────── */
function TrackingModal({ open, ocorrencia, transportador_nome, onClose, onSaved }) {
  const [novoStatus, setNovoStatus] = useState('');
  const [dataAgendamento, setDataAgendamento] = useState('');
  const [observacao, setObs] = useState('');
  const [arquivo, setArquivo] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const opt = TRACKING_OPTIONS.find(o => o.v === novoStatus);

  useEffect(() => {
    if (open) { setNovoStatus(''); setDataAgendamento(''); setObs(''); setArquivo(null); setError(''); }
  }, [open]);

  if (!open || !ocorrencia) return null;

  const handleSave = async () => {
    if (!novoStatus) { setError('Selecione um status de tracking.'); return; }
    if (opt?.hasDate && !dataAgendamento) { setError('Informe a data de agendamento.'); return; }
    setSaving(true); setError('');
    try {
      let comprovanteUrl = null;
      if (arquivo) {
        comprovanteUrl = await uploadAnexo(ocorrencia.id, arquivo);
      }
      const updates = {
        tracking_status: novoStatus,
        tracking_updated_at: new Date().toISOString(),
        ...(dataAgendamento && { tracking_data_agendamento: dataAgendamento }),
        ...(comprovanteUrl && { tracking_comprovante_url: comprovanteUrl }),
      };
      if (novoStatus === 'entregue') updates.status = 'entregue';

      const { error: err } = await supabase.from('dev_ocorrencias').update(updates).eq('id', ocorrencia.id);
      if (err) throw new Error(err.message);

      await supabase.from('dev_tracking').insert({
        ocorrencia_id: ocorrencia.id,
        status: novoStatus,
        data_agendamento: dataAgendamento || null,
        comprovante_url: comprovanteUrl,
        observacao: observacao || null,
        registrado_por: transportador_nome,
      });

      onSaved?.();
      onClose();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const currentIdx = TRACKING_OPTIONS.findIndex(o => o.v === ocorrencia.tracking_status);

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 480 }}>
        <div className="modal-header">
          <h2 style={{ fontSize: 15, fontWeight: 800, color: 'var(--text)' }}>📍 Atualizar Posição da Devolução</h2>
          <p style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 3 }}>NFD {ocorrencia.nfd_numero} · {ocorrencia.transportador_nome}</p>
        </div>
        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Posição atual */}
          <div style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 14px', fontSize: 12, color: 'var(--text-2)' }}>
            <span style={{ color: 'var(--text-3)' }}>Posição atual:</span>{' '}
            <strong>{TRACKING_OPTIONS.find(o => o.v === ocorrencia.tracking_status)?.l || ocorrencia.tracking_status || '—'}</strong>
          </div>
          <div>
            <label className="input-label">Nova posição <span style={{ color: 'var(--red)' }}>*</span></label>
            <select value={novoStatus} onChange={e => setNovoStatus(e.target.value)} className="input">
              <option value="">Selecione...</option>
              {TRACKING_OPTIONS.map(o => (
                <option key={o.v} value={o.v}>{o.i} {o.l}</option>
              ))}
            </select>
          </div>
          {opt?.hasDate && (
            <div>
              <label className="input-label">Data do agendamento <span style={{ color: 'var(--red)' }}>*</span></label>
              <input type="date" value={dataAgendamento} onChange={e => setDataAgendamento(e.target.value)} className="input" />
            </div>
          )}
          {opt?.hasProof && (
            <div>
              <label className="input-label">Comprovante de entrega <span style={{ color: 'var(--red)' }}>*</span></label>
              <input type="file" accept="image/*,application/pdf" onChange={e => setArquivo(e.target.files?.[0] || null)} className="input" style={{ cursor: 'pointer' }} />
              {arquivo && <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 4 }}>✅ {arquivo.name}</div>}
            </div>
          )}
          {!opt?.hasProof && (
            <div>
              <label className="input-label">Anexo <span style={{ color: 'var(--text-3)', fontWeight: 400 }}>(opcional)</span></label>
              <input type="file" accept="image/*,application/pdf" onChange={e => setArquivo(e.target.files?.[0] || null)} className="input" style={{ cursor: 'pointer' }} />
              {arquivo && <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 4 }}>✅ {arquivo.name}</div>}
            </div>
          )}
          <div>
            <label className="input-label">Observação <span style={{ color: 'var(--text-3)', fontWeight: 400 }}>(opcional)</span></label>
            <textarea value={observacao} onChange={e => setObs(e.target.value)} rows={2} placeholder="Informações adicionais..." className="input" />
          </div>
          {error && <div style={{ padding: '10px 14px', borderRadius: 8, background: 'rgba(248,81,73,.06)', border: '1px solid rgba(248,81,73,.15)', fontSize: 12, color: '#F85149' }}>{error}</div>}
        </div>
        <div className="modal-footer">
          <button onClick={onClose} className="btn btn-outline">Cancelar</button>
          <button disabled={saving} onClick={handleSave} className="btn btn-gold">{saving ? 'Atualizando...' : '📍 Confirmar posição'}</button>
        </div>
      </div>
    </div>
  );
}

/* ── Main Component ───────────────────────────────────────── */
export default function TransportOcorrencias({ user, transporterName, transporterCnpj }) {
  const [ocorrencias, setOcorrencias] = useState([]);
  const [loading, setLoading] = useState(true);
  const [novaOpen, setNovaOpen] = useState(false);
  const [trackingOc, setTrackingOc] = useState(null);
  const [filtroStatus, setFiltroStatus] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    let q = supabase.from('dev_ocorrencias').select('*').order('created_at', { ascending: false });
    if (transporterCnpj) q = q.eq('transportador_cnpj', transporterCnpj);
    else if (transporterName) q = q.ilike('transportador_nome', `%${transporterName}%`);
    const { data } = await q;
    setOcorrencias(data || []);
    setLoading(false);
  }, [transporterCnpj, transporterName]);

  useEffect(() => { load(); }, [load]);

  const filtered = filtroStatus ? ocorrencias.filter(o => o.tracking_status === filtroStatus) : ocorrencias;
  const pendentes = ocorrencias.filter(o => !['entregue','encerrada'].includes(o.tracking_status)).length;

  const fmtDate = s => s ? s.slice(0, 10).split('-').reverse().join('/') : '—';

  return (
    <div style={{ padding: '0 0 32px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 800, color: 'var(--text)', margin: 0 }}>📋 Minhas Devoluções</h2>
          <p style={{ fontSize: 13, color: 'var(--text-3)', marginTop: 4 }}>{ocorrencias.length} ocorrências registradas · {pendentes} em andamento</p>
        </div>
        <button onClick={() => setNovaOpen(true)} className="btn btn-gold" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          + Nova Ocorrência
        </button>
      </div>

      {/* Filtros */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        <button onClick={() => setFiltroStatus('')} className={`btn btn-outline ${!filtroStatus ? 'active' : ''}`} style={{ fontSize: 12, padding: '5px 12px', fontWeight: !filtroStatus ? 700 : 400 }}>Todas</button>
        {TRACKING_OPTIONS.map(o => (
          <button key={o.v} onClick={() => setFiltroStatus(o.v)} className={`btn btn-outline ${filtroStatus === o.v ? 'active' : ''}`} style={{ fontSize: 12, padding: '5px 12px', fontWeight: filtroStatus === o.v ? 700 : 400 }}>
            {o.i} {o.l}
          </button>
        ))}
      </div>

      {/* Lista */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 48, color: 'var(--text-3)' }}>Carregando...</div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '64px 24px' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>📦</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)', marginBottom: 8 }}>Nenhuma ocorrência registrada</div>
          <div style={{ fontSize: 13, color: 'var(--text-3)', marginBottom: 20 }}>Clique em "Nova Ocorrência" para registrar uma devolução.</div>
          <button onClick={() => setNovaOpen(true)} className="btn btn-gold">+ Registrar Ocorrência</button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {filtered.map(oc => {
            const tk = TRACKING_OPTIONS.find(o => o.v === oc.tracking_status);
            const st = STATUS_COLORS[oc.status] || STATUS_COLORS.registrada;
            const isEntregue = oc.tracking_status === 'entregue';
            return (
              <div key={oc.id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 18, borderLeft: `3px solid ${st.c}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
                      <span style={{ fontSize: 15, fontWeight: 800, color: 'var(--gold)' }}>NFD {oc.nfd_numero}</span>
                      <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, background: st.bg, color: st.c, fontWeight: 600 }}>{st.l}</span>
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-2)', marginBottom: 6, display: 'flex', gap: 16 }}>
                      <span>📅 Data: <strong>{fmtDate(oc.nfd_data)}</strong></span>
                      <span>🏷️ Tipo: <strong style={{ textTransform: 'capitalize' }}>{oc.tipo?.replace('_', ' ')}</strong></span>
                      <span>🕐 Registrada: <strong>{fmtDate(oc.created_at)}</strong></span>
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 10 }}>{oc.motivo}</div>

                    {/* Tracking stepper */}
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 8 }}>
                      {TRACKING_OPTIONS.map((o, idx) => {
                        const currentIdx = TRACKING_OPTIONS.findIndex(x => x.v === oc.tracking_status);
                        const done = idx < currentIdx;
                        const active = idx === currentIdx;
                        return (
                          <div key={o.v} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            <div style={{ padding: '3px 10px', borderRadius: 20, fontSize: 10, fontWeight: active ? 700 : 500, background: done ? 'rgba(16,185,129,.1)' : active ? 'rgba(251,191,36,.15)' : 'var(--surface-2)', color: done ? '#059669' : active ? '#d97706' : 'var(--text-3)', border: `1px solid ${done ? 'rgba(16,185,129,.2)' : active ? 'rgba(251,191,36,.3)' : 'var(--border)'}` }}>
                              {done ? '✓' : o.i} {o.l}
                            </div>
                            {idx < TRACKING_OPTIONS.length - 1 && <span style={{ color: 'var(--text-3)', fontSize: 10 }}>›</span>}
                          </div>
                        );
                      })}
                    </div>

                    {oc.tracking_data_agendamento && (
                      <div style={{ fontSize: 12, color: '#0891b2', marginTop: 6 }}>📅 Agendada para: <strong>{fmtDate(oc.tracking_data_agendamento)}</strong></div>
                    )}
                    {oc.tracking_comprovante_url && (
                      <div style={{ marginTop: 6 }}>
                        <a href={oc.tracking_comprovante_url} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: 'var(--gold)', textDecoration: 'none' }}>📎 Ver anexo</a>
                      </div>
                    )}
                  </div>

                  {!isEntregue && (
                    <button onClick={() => setTrackingOc(oc)} className="btn btn-outline" style={{ fontSize: 12, marginLeft: 12, flexShrink: 0, whiteSpace: 'nowrap' }}>
                      📍 Atualizar posição
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <NovaOcorrenciaModal
        open={novaOpen}
        transportador_cnpj={transporterCnpj || ''}
        transportador_nome={transporterName || ''}
        onClose={() => setNovaOpen(false)}
        onSaved={load}
      />
      <TrackingModal
        open={!!trackingOc}
        ocorrencia={trackingOc}
        transportador_nome={transporterName || ''}
        onClose={() => setTrackingOc(null)}
        onSaved={load}
      />
    </div>
  );
}
