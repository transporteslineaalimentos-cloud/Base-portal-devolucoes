import { useEffect, useState } from 'react';
import { supabase } from '../config/constants';
import { syncAuthToken } from '../config/supabase';
import { fmt } from '../utils/helpers';

/* ── Single acceptance card ──────────────────────────────────── */
function AceiteCard({ aceite, expanded, onToggle }) {
  const isConcordancia = aceite.tipo === 'concordancia';
  const color = isConcordancia ? '#3FB950' : '#F85149';

  return (
    <div style={{
      border: `1px solid ${color}25`,
      borderRadius: 10, overflow: 'hidden',
      background: `${color}04`,
    }}>
      {/* Header - always visible */}
      <button
        onClick={onToggle}
        style={{
          width: '100%', textAlign: 'left', border: 'none', background: 'none',
          padding: '12px 16px', cursor: 'pointer',
          display: 'flex', alignItems: 'center', gap: 12,
        }}
      >
        <div style={{
          width: 32, height: 32, borderRadius: 8,
          background: `${color}12`, border: `1px solid ${color}25`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 14, flexShrink: 0,
        }}>
          {isConcordancia ? '✅' : '⚠️'}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', fontFamily: 'monospace' }}>
              {aceite.codigo}
            </span>
            <span style={{
              fontSize: 10, fontWeight: 600, color, padding: '2px 8px',
              background: `${color}12`, borderRadius: 5,
            }}>
              {isConcordancia ? 'Concordância' : 'Contestação'}
            </span>
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>
            {aceite.signatario_nome} · {new Date(aceite.created_at).toLocaleString('pt-BR')}
          </div>
        </div>
        <span style={{ fontSize: 14, color: 'var(--text-3)', transform: expanded ? 'rotate(90deg)' : 'none', transition: 'transform 150ms' }}>
          ›
        </span>
      </button>

      {/* Expanded details */}
      {expanded && (
        <div style={{ padding: '0 16px 16px', fontSize: 12 }}>
          <div style={{ borderTop: '1px solid var(--border)', paddingTop: 12 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 12 }}>
              <div><span style={{ color: 'var(--text-3)' }}>Signatário:</span> <strong>{aceite.signatario_nome}</strong></div>
              <div><span style={{ color: 'var(--text-3)' }}>Cargo:</span> <strong>{aceite.signatario_cargo}</strong></div>
              <div><span style={{ color: 'var(--text-3)' }}>Email:</span> <strong>{aceite.signatario_email}</strong></div>
              <div><span style={{ color: 'var(--text-3)' }}>CNPJ:</span> <strong>{aceite.transportador_cnpj?.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5')}</strong></div>
              <div><span style={{ color: 'var(--text-3)' }}>Valor:</span> <strong style={{ color: 'var(--gold)' }}>{fmt(aceite.valor_total || 0)}</strong></div>
              <div><span style={{ color: 'var(--text-3)' }}>IP:</span> <span style={{ fontFamily: 'monospace' }}>{aceite.ip_address || 'N/A'}</span></div>
              <div><span style={{ color: 'var(--text-3)' }}>Email enviado:</span> {aceite.email_enviado ? '✅ Sim' : '❌ Não'}</div>
            </div>

            {aceite.observacao && (
              <div style={{ marginBottom: 12 }}>
                <span style={{ color: 'var(--text-3)' }}>Observação:</span>
                <div style={{ marginTop: 4, padding: '8px 12px', background: 'var(--bg)', borderRadius: 6, color: 'var(--text-2)', lineHeight: 1.6 }}>
                  {aceite.observacao}
                </div>
              </div>
            )}

            {/* Notas */}
            {aceite.notas_json?.length > 0 && (
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>
                  Notas incluídas
                </div>
                {aceite.notas_json.map((n, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0', fontSize: 11, color: 'var(--text-2)' }}>
                    <span>NF {n.nfd || '—'} / {n.nfo || '—'}</span>
                    <span style={{ fontWeight: 600 }}>{fmt(n.v || 0)}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Hash */}
            <div>
              <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>
                Hash SHA-256
              </div>
              <div style={{
                fontFamily: 'monospace', fontSize: 9, color: 'var(--text-2)',
                background: 'var(--bg)', padding: '6px 10px', borderRadius: 6,
                wordBreak: 'break-all', lineHeight: 1.5,
              }}>
                {aceite.content_hash}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   ACEITES PANEL - shows in NoteDrawer
═══════════════════════════════════════════════════════════════ */
export function AceitesPanel({ nfKey }) {
  const [aceites, setAceites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expanded, setExpanded] = useState(null);

  useEffect(() => {
    if (!nfKey) return;
    setLoading(true);
    setError('');

    // Sincroniza o token antes de consultar para garantir que a RLS permita a leitura
    syncAuthToken();

    supabase
      .from('portal_aceites')
      .select('*')
      .eq('nf_key', nfKey)
      .order('created_at', { ascending: false })
      .then(({ data, error: dbErr }) => {
        if (dbErr) {
          console.error('[AceitesPanel]', dbErr.message);
          setError(dbErr.message);
        } else {
          setAceites(data || []);
        }
        setLoading(false);
      });
  }, [nfKey]);

  if (loading) return (
    <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-3)', fontSize: 12 }}>
      Carregando aceites...
    </div>
  );

  if (error) return (
    <div style={{ padding: 20, textAlign: 'center' }}>
      <div style={{ fontSize: 13, color: 'var(--red)', marginBottom: 8 }}>Erro ao carregar aceites</div>
      <div style={{ fontSize: 11, color: 'var(--text-3)', fontFamily: 'monospace' }}>{error}</div>
    </div>
  );

  if (!aceites.length) return (
    <div style={{ padding: '32px 20px', textAlign: 'center' }}>
      <div style={{ fontSize: 36, marginBottom: 8, opacity: 0.5 }}>📋</div>
      <div style={{ fontSize: 13, color: 'var(--text-3)' }}>Nenhum aceite formal registrado para esta nota.</div>
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>
        {aceites.length} aceite(s) registrado(s)
      </div>
      {aceites.map(a => (
        <AceiteCard
          key={a.id}
          aceite={a}
          expanded={expanded === a.id}
          onToggle={() => setExpanded(expanded === a.id ? null : a.id)}
        />
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   VERIFICAÇÃO - standalone lookup by code
═══════════════════════════════════════════════════════════════ */
export function AceiteVerificacao() {
  const [code, setCode] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSearch = async () => {
    if (!code.trim()) return;
    setLoading(true);
    setError('');
    setResult(null);

    syncAuthToken();

    const { data, error: dbErr } = await supabase
      .from('portal_aceites')
      .select('*')
      .eq('codigo', code.trim().toUpperCase())
      .maybeSingle();

    setLoading(false);
    if (dbErr) { setError(dbErr.message); return; }
    if (!data) { setError('Código não encontrado.'); return; }
    setResult(data);
  };

  return (
    <div style={{ maxWidth: 600, margin: '0 auto' }}>
      <div style={{
        background: 'var(--surface)', border: '1px solid var(--border)',
        borderRadius: 14, padding: 24,
      }}>
        <h2 style={{ fontSize: 16, fontWeight: 800, color: 'var(--text)', marginBottom: 4 }}>
          Verificar Aceite Formal
        </h2>
        <p style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 20 }}>
          Insira o código de verificação (ex: ACE-2026-00001) para consultar o registro.
        </p>

        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          <input
            value={code}
            onChange={e => setCode(e.target.value.toUpperCase())}
            placeholder="ACE-2026-00000"
            className="input"
            style={{ flex: 1, fontFamily: 'monospace', fontSize: 14, letterSpacing: '0.05em' }}
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
          />
          <button onClick={handleSearch} disabled={loading} className="btn btn-gold">
            {loading ? '...' : 'Buscar'}
          </button>
        </div>

        {error && (
          <div style={{ padding: '10px 14px', borderRadius: 8, background: 'rgba(248,81,73,.06)', border: '1px solid rgba(248,81,73,.15)', fontSize: 12, color: '#F85149' }}>
            {error}
          </div>
        )}

        {result && (
          <AceiteCard aceite={result} expanded={true} onToggle={() => {}} />
        )}
      </div>
    </div>
  );
}
