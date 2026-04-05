import { useEffect, useMemo, useState } from 'react';
import { fmt, esc } from '../utils/helpers';
import { supabase } from '../config/constants';

/* ── helpers ──────────────────────────────────────────────────── */

function formatCpf(v) {
  const d = v.replace(/\D/g, '').slice(0, 11);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`;
  if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
}

function validCpf(cpf) {
  const d = cpf.replace(/\D/g, '');
  if (d.length !== 11 || /^(\d)\1+$/.test(d)) return false;
  for (let t = 9; t < 11; t++) {
    let sum = 0;
    for (let i = 0; i < t; i++) sum += parseInt(d[i]) * (t + 1 - i);
    const r = (sum * 10) % 11;
    if ((r === 10 ? 0 : r) !== parseInt(d[t])) return false;
  }
  return true;
}

function formatCnpj(v) {
  const d = v.replace(/\D/g, '').slice(0, 14);
  if (d.length <= 2) return d;
  if (d.length <= 5) return `${d.slice(0, 2)}.${d.slice(2)}`;
  if (d.length <= 8) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5)}`;
  if (d.length <= 12) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8)}`;
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`;
}

async function sha256(text) {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function generateCodigo() {
  const year = new Date().getFullYear();
  // Get next sequence value
  const { data } = await supabase.rpc('nextval_aceite');
  const seq = data || Math.floor(Math.random() * 99999);
  return `ACE-${year}-${String(seq).padStart(5, '0')}`;
}

/* ── Step indicator ──────────────────────────────────────────── */
function StepBar({ current, steps }) {
  return (
    <div style={{ display: 'flex', gap: 4, marginBottom: 20 }}>
      {steps.map((s, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <div key={i} style={{ flex: 1, textAlign: 'center' }}>
            <div style={{
              height: 4, borderRadius: 2, marginBottom: 6,
              background: done ? 'var(--gold)' : active ? 'var(--gold)' : 'var(--border)',
              opacity: active ? 1 : done ? 0.6 : 0.3,
            }} />
            <div style={{
              fontSize: 10, fontWeight: active ? 700 : 500,
              color: active ? 'var(--gold)' : done ? 'var(--text-2)' : 'var(--text-3)',
              textTransform: 'uppercase', letterSpacing: '0.06em',
            }}>{s}</div>
          </div>
        );
      })}
    </div>
  );
}

/* ── Success screen ──────────────────────────────────────────── */
function SuccessScreen({ codigo, hash, onClose }) {
  return (
    <div style={{ textAlign: 'center', padding: '32px 24px' }}>
      <div style={{ fontSize: 56, marginBottom: 16 }}>✅</div>
      <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--text)', marginBottom: 8 }}>
        Aceite registrado com sucesso
      </div>
      <div style={{ fontSize: 13, color: 'var(--text-2)', marginBottom: 24, lineHeight: 1.7 }}>
        O termo foi registrado com validade jurídica. Um email de confirmação foi enviado para as partes.
      </div>

      <div style={{
        background: 'var(--surface-2)', border: '1px solid var(--border)',
        borderRadius: 12, padding: 20, marginBottom: 20, textAlign: 'left',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 8, background: 'rgba(166,139,92,.1)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 16, fontWeight: 800, color: 'var(--gold)',
          }}>📋</div>
          <div>
            <div style={{ fontSize: 10, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>
              Código de verificação
            </div>
            <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--gold)', fontFamily: 'monospace' }}>
              {codigo}
            </div>
          </div>
        </div>

        <div style={{ fontSize: 10, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600, marginBottom: 4 }}>
          Hash de integridade (SHA-256)
        </div>
        <div style={{
          fontSize: 10, fontFamily: 'monospace', color: 'var(--text-2)',
          background: 'var(--bg)', padding: '8px 12px', borderRadius: 6,
          wordBreak: 'break-all', lineHeight: 1.6,
        }}>
          {hash}
        </div>
      </div>

      <button onClick={onClose} className="btn btn-gold" style={{ width: '100%', padding: '12px 0' }}>
        Fechar
      </button>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════════════════════════ */
export default function AcceptanceForm({
  open,
  nfKey,
  notes = [],
  transporterName = '',
  tipo = 'concordancia', // concordancia | contestacao
  onClose,
  onSaved,
  user,
}) {
  const [step, setStep] = useState(0); // 0=identificação, 1=termo, 2=confirmação
  const [nome, setNome] = useState('');
  const [cpf, setCpf] = useState('');
  const [cargo, setCargo] = useState('');
  const [email, setEmail] = useState('');
  const [cnpj, setCnpj] = useState('');
  const [obs, setObs] = useState('');
  const [aceito, setAceito] = useState(false);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(null); // { codigo, hash }
  const [error, setError] = useState('');

  const STEPS = ['Identificação', 'Termo', 'Confirmação'];

  const valorTotal = useMemo(() => notes.reduce((s, n) => s + (n.v || 0), 0), [notes]);

  const termoTexto = useMemo(() => {
    const tipoLabel = tipo === 'concordancia'
      ? 'RECONHECE E CONCORDA com o débito'
      : 'CONTESTA o débito';
    const notasDesc = notes.map(n =>
      `  • NF Devolução ${n.nfd || '—'} / NF Origem ${n.nfo || '—'} — Cliente: ${n.cl || '—'} — Valor: ${fmt(n.v || 0)}`
    ).join('\n');

    return `TERMO DE ${tipo === 'concordancia' ? 'CONCORDÂNCIA' : 'CONTESTAÇÃO'} DE DÉBITO

Pelo presente instrumento, o representante da empresa transportadora abaixo identificada ${tipoLabel} referente às notas fiscais de devolução a seguir discriminadas, decorrentes de ocorrências de transporte sob sua responsabilidade.

EMPRESA CONTRATANTE:
LINEA ALIMENTOS IND E COM S/A
CNPJ: 02.382.580/0001-10
Endereço: Rodovia BR-153, Km 08, S/N — Distrito Agroindustrial de Anápolis — Anápolis/GO

EMPRESA TRANSPORTADORA:
${transporterName}

NOTAS FISCAIS:
${notasDesc}

VALOR TOTAL: ${fmt(valorTotal)}

${tipo === 'concordancia'
  ? `O signatário declara que:\n1. Reconhece a responsabilidade sobre as ocorrências listadas;\n2. Concorda com o valor total de ${fmt(valorTotal)} a ser debitado;\n3. Autoriza a emissão de Nota Fiscal de Débito correspondente;\n4. Está ciente de que este aceite tem validade jurídica e não poderá ser revogado unilateralmente.`
  : `O signatário declara que CONTESTA o débito pelos seguintes motivos (a serem detalhados no campo de observação).\n\nA contestação será analisada pela Linea Alimentos que se reserva o direito de manter ou rever a cobrança com base nas evidências apresentadas.`
}

Este termo é gerado eletronicamente pelo Portal de Devoluções da Linea Alimentos, com registro de data, hora, identificação do signatário, endereço IP e hash de integridade SHA-256 para garantia de autenticidade e não-repúdio.

Data e hora do aceite: ${new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}
`;
  }, [notes, transporterName, tipo, valorTotal]);

  useEffect(() => {
    if (open) {
      setStep(0);
      setNome('');
      setCpf('');
      setCargo('');
      setEmail('');
      setCnpj('');
      setObs('');
      setAceito(false);
      setSaving(false);
      setSuccess(null);
      setError('');
    }
  }, [open]);

  if (!open) return null;

  const validateStep0 = () => {
    if (!nome.trim()) return 'Preencha o nome completo.';
    if (!validCpf(cpf)) return 'CPF inválido.';
    if (!cargo.trim()) return 'Preencha o cargo.';
    if (!email.trim() || !email.includes('@')) return 'Preencha um email válido.';
    if (cnpj.replace(/\D/g, '').length < 14) return 'CNPJ inválido (14 dígitos).';
    return null;
  };

  const handleNext = () => {
    if (step === 0) {
      const err = validateStep0();
      if (err) { setError(err); return; }
      setError('');
      setStep(1);
    } else if (step === 1) {
      setStep(2);
    }
  };

  const handleBack = () => {
    setError('');
    setStep(s => Math.max(0, s - 1));
  };

  const handleConfirm = async () => {
    if (!aceito) { setError('Você precisa marcar a caixa de aceite.'); return; }
    setSaving(true);
    setError('');

    try {
      // 1. Generate hash
      const hashInput = JSON.stringify({
        termo: termoTexto,
        notas: notes.map(n => ({ nfd: n.nfd, nfo: n.nfo, cl: n.cl, v: n.v })),
        signatario: { nome, cpf: cpf.replace(/\D/g, ''), cargo, email },
        transportador: { nome: transporterName, cnpj: cnpj.replace(/\D/g, '') },
        tipo,
        valor: valorTotal,
        timestamp: new Date().toISOString(),
      });
      const hash = await sha256(hashInput);

      // 2. Generate unique code
      const codigo = await generateCodigo();

      // 3. Get IP (best effort)
      let ipAddress = '';
      try {
        const ipRes = await fetch('https://api.ipify.org?format=json');
        const ipData = await ipRes.json();
        ipAddress = ipData.ip || '';
      } catch { /* ignore */ }

      // 4. Save to Supabase
      const record = {
        codigo,
        nf_key: nfKey,
        tipo,
        transportador_nome: transporterName,
        transportador_cnpj: cnpj.replace(/\D/g, ''),
        signatario_nome: nome,
        signatario_cpf: cpf.replace(/\D/g, ''),
        signatario_cargo: cargo,
        signatario_email: email,
        termo_texto: termoTexto,
        notas_json: notes.map(n => ({ nfd: n.nfd, nfo: n.nfo, cl: n.cl, mo: n.mo, v: n.v })),
        valor_total: valorTotal,
        content_hash: hash,
        ip_address: ipAddress,
        user_agent: navigator.userAgent || '',
        observacao: obs,
      };

      const { error: dbErr } = await supabase.from('portal_aceites').insert(record);
      if (dbErr) throw new Error(dbErr.message);

      // 5. Send confirmation email
      try {
        await fetch('/api/send-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: [email, 'transporte@lineaalimentos.com.br'],
            cc: [],
            subject: `${tipo === 'concordancia' ? 'Aceite' : 'Contestação'} Formal — ${codigo} — ${transporterName}`,
            html: buildConfirmationEmail({ codigo, hash, nome, cpf, cargo, email, cnpj, transporterName, notes, valorTotal, tipo, termoTexto, ipAddress }),
          }),
        });
        // Mark email as sent
        await supabase.from('portal_aceites').update({ email_enviado: true }).eq('codigo', codigo);
      } catch { /* email failure is non-blocking */ }

      // 6. Callback
      onSaved?.({
        codigo,
        hash,
        tipo,
        nome,
        cpf: cpf.replace(/\D/g, ''),
        cargo,
        email,
        cnpj: cnpj.replace(/\D/g, ''),
        created_at: new Date().toISOString(),
      });

      setSuccess({ codigo, hash });
    } catch (e) {
      setError(e.message || 'Erro ao salvar aceite.');
    } finally {
      setSaving(false);
    }
  };

  if (success) {
    return (
      <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
        <div className="modal" style={{ maxWidth: 500 }}>
          <SuccessScreen codigo={success.codigo} hash={success.hash} onClose={onClose} />
        </div>
      </div>
    );
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 600 }}>
        {/* Header */}
        <div className="modal-header" style={{ borderBottom: '1px solid var(--border)', paddingBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 8,
              background: tipo === 'concordancia' ? 'rgba(63,185,80,.1)' : 'rgba(248,81,73,.1)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18,
            }}>
              {tipo === 'concordancia' ? '✅' : '⚠️'}
            </div>
            <div>
              <h2 style={{ fontSize: 16, fontWeight: 800, color: 'var(--text)', margin: 0 }}>
                {tipo === 'concordancia' ? 'Aceite Formal de Débito' : 'Contestação Formal'}
              </h2>
              <p style={{ fontSize: 12, color: 'var(--text-3)', margin: '2px 0 0' }}>
                {notes.length} nota(s) · {fmt(valorTotal)} · {transporterName}
              </p>
            </div>
          </div>
        </div>

        <div className="modal-body" style={{ padding: '16px 20px' }}>
          <StepBar current={step} steps={STEPS} />

          {/* ── STEP 0: Identificação ─────────────────────────── */}
          {step === 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{
                background: 'rgba(166,139,92,.04)', border: '1px solid rgba(166,139,92,.12)',
                borderRadius: 8, padding: '10px 14px', fontSize: 12, color: 'var(--text-2)', lineHeight: 1.6,
              }}>
                <strong style={{ color: 'var(--gold)' }}>Importante:</strong> Preencha com os dados do representante autorizado da transportadora. Estes dados serão registrados com validade jurídica.
              </div>

              <div>
                <label className="input-label">Nome completo do signatário <span style={{ color: 'var(--red)' }}>*</span></label>
                <input value={nome} onChange={e => setNome(e.target.value)} placeholder="Nome completo" className="input" />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label className="input-label">CPF <span style={{ color: 'var(--red)' }}>*</span></label>
                  <input value={cpf} onChange={e => setCpf(formatCpf(e.target.value))} placeholder="000.000.000-00" className="input" maxLength={14} />
                </div>
                <div>
                  <label className="input-label">Cargo <span style={{ color: 'var(--red)' }}>*</span></label>
                  <input value={cargo} onChange={e => setCargo(e.target.value)} placeholder="Ex: Gerente comercial" className="input" />
                </div>
              </div>
              <div>
                <label className="input-label">Email do signatário <span style={{ color: 'var(--red)' }}>*</span></label>
                <input value={email} onChange={e => setEmail(e.target.value)} placeholder="email@transportadora.com.br" className="input" type="email" />
              </div>
              <div>
                <label className="input-label">CNPJ da transportadora <span style={{ color: 'var(--red)' }}>*</span></label>
                <input value={cnpj} onChange={e => setCnpj(formatCnpj(e.target.value))} placeholder="00.000.000/0000-00" className="input" maxLength={18} />
              </div>
            </div>
          )}

          {/* ── STEP 1: Termo ─────────────────────────────────── */}
          {step === 1 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{
                background: 'rgba(166,139,92,.04)', border: '1px solid rgba(166,139,92,.12)',
                borderRadius: 8, padding: '10px 14px', fontSize: 12, color: 'var(--text-2)', lineHeight: 1.6,
              }}>
                Leia atentamente o termo abaixo. Ao prosseguir, você confirma que leu e compreendeu o conteúdo.
              </div>

              <div style={{
                background: 'var(--bg)', border: '1px solid var(--border)',
                borderRadius: 10, padding: '16px 18px',
                maxHeight: 340, overflowY: 'auto',
                fontSize: 12, color: 'var(--text)', lineHeight: 1.8,
                whiteSpace: 'pre-wrap', fontFamily: 'inherit',
              }}>
                {termoTexto}
              </div>

              {/* Resumo das notas */}
              <div style={{
                background: 'var(--surface-2)', border: '1px solid var(--border)',
                borderRadius: 8, padding: 14,
              }}>
                <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
                  Notas fiscais incluídas
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {notes.map((n, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text-2)' }}>
                      <span>NF {n.nfd || '—'} / {n.nfo || '—'} — {n.cl || '—'}</span>
                      <span style={{ fontWeight: 600, color: 'var(--gold)' }}>{fmt(n.v || 0)}</span>
                    </div>
                  ))}
                </div>
                <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', fontSize: 13, fontWeight: 700 }}>
                  <span style={{ color: 'var(--text)' }}>Total</span>
                  <span style={{ color: 'var(--gold)' }}>{fmt(valorTotal)}</span>
                </div>
              </div>

              {tipo === 'contestacao' && (
                <div>
                  <label className="input-label">Motivo da contestação <span style={{ color: 'var(--red)' }}>*</span></label>
                  <textarea value={obs} onChange={e => setObs(e.target.value)} rows={3} className="input"
                    placeholder="Descreva detalhadamente o motivo da contestação..." />
                </div>
              )}
            </div>
          )}

          {/* ── STEP 2: Confirmação ──────────────────────────── */}
          {step === 2 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Resumo do signatário */}
              <div style={{
                background: 'var(--surface-2)', border: '1px solid var(--border)',
                borderRadius: 10, padding: 16,
              }}>
                <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>
                  Dados do signatário
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 12 }}>
                  <div><span style={{ color: 'var(--text-3)' }}>Nome:</span> <span style={{ color: 'var(--text)', fontWeight: 600 }}>{nome}</span></div>
                  <div><span style={{ color: 'var(--text-3)' }}>CPF:</span> <span style={{ color: 'var(--text)', fontWeight: 600 }}>{cpf}</span></div>
                  <div><span style={{ color: 'var(--text-3)' }}>Cargo:</span> <span style={{ color: 'var(--text)', fontWeight: 600 }}>{cargo}</span></div>
                  <div><span style={{ color: 'var(--text-3)' }}>Email:</span> <span style={{ color: 'var(--text)', fontWeight: 600 }}>{email}</span></div>
                  <div style={{ gridColumn: 'span 2' }}><span style={{ color: 'var(--text-3)' }}>CNPJ:</span> <span style={{ color: 'var(--text)', fontWeight: 600 }}>{cnpj}</span></div>
                </div>
              </div>

              {/* Resumo do termo */}
              <div style={{
                background: 'var(--surface-2)', border: '1px solid var(--border)',
                borderRadius: 10, padding: 16,
              }}>
                <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>
                  Resumo do {tipo === 'concordancia' ? 'aceite' : 'contestação'}
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-2)', lineHeight: 1.7 }}>
                  {tipo === 'concordancia'
                    ? <>Eu, <strong>{nome}</strong>, CPF <strong>{cpf}</strong>, na qualidade de <strong>{cargo}</strong> da empresa <strong>{transporterName}</strong> (CNPJ {cnpj}), declaro que <span style={{ color: '#3FB950', fontWeight: 700 }}>RECONHEÇO E CONCORDO</span> com o débito de <strong style={{ color: 'var(--gold)' }}>{fmt(valorTotal)}</strong> referente a {notes.length} nota(s) fiscal(is) de devolução.</>
                    : <>Eu, <strong>{nome}</strong>, CPF <strong>{cpf}</strong>, na qualidade de <strong>{cargo}</strong> da empresa <strong>{transporterName}</strong> (CNPJ {cnpj}), declaro que <span style={{ color: '#F85149', fontWeight: 700 }}>CONTESTO</span> o débito de <strong style={{ color: 'var(--gold)' }}>{fmt(valorTotal)}</strong>.</>
                  }
                </div>
              </div>

              {/* Checkbox de aceite */}
              <label style={{
                display: 'flex', gap: 10, alignItems: 'flex-start',
                background: aceito ? 'rgba(63,185,80,.05)' : 'rgba(248,81,73,.03)',
                border: `1px solid ${aceito ? 'rgba(63,185,80,.2)' : 'rgba(248,81,73,.15)'}`,
                borderRadius: 10, padding: '14px 16px', cursor: 'pointer',
                transition: 'all 200ms',
              }}>
                <input
                  type="checkbox"
                  checked={aceito}
                  onChange={e => setAceito(e.target.checked)}
                  style={{ marginTop: 2, width: 18, height: 18, accentColor: 'var(--gold)' }}
                />
                <span style={{ fontSize: 12, color: 'var(--text)', lineHeight: 1.7 }}>
                  Declaro que li integralmente o Termo de {tipo === 'concordancia' ? 'Concordância' : 'Contestação'},
                  que todas as informações acima estão corretas, que estou autorizado(a) a representar a empresa
                  transportadora neste ato, e que <strong>estou ciente de que este registro tem validade jurídica,
                  com identificação, data/hora, endereço IP e hash de integridade SHA-256 para garantia de
                  autenticidade e não-repúdio.</strong>
                </span>
              </label>

              {/* Security info */}
              <div style={{
                display: 'flex', gap: 12, alignItems: 'center',
                background: 'var(--surface-2)', border: '1px solid var(--border)',
                borderRadius: 8, padding: '10px 14px',
              }}>
                <span style={{ fontSize: 18 }}>🔒</span>
                <div style={{ fontSize: 11, color: 'var(--text-3)', lineHeight: 1.6 }}>
                  Este aceite será registrado com hash SHA-256, IP, user-agent e timestamp.
                  Um email de confirmação será enviado para <strong>{email}</strong> e <strong>transporte@lineaalimentos.com.br</strong>.
                </div>
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div style={{
              marginTop: 12, padding: '10px 14px', borderRadius: 8,
              background: 'rgba(248,81,73,.06)', border: '1px solid rgba(248,81,73,.15)',
              fontSize: 12, color: '#F85149', fontWeight: 500,
            }}>
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="modal-footer" style={{ display: 'flex', justifyContent: 'space-between' }}>
          <button onClick={step === 0 ? onClose : handleBack} className="btn btn-outline">
            {step === 0 ? 'Cancelar' : '← Voltar'}
          </button>
          {step < 2 ? (
            <button onClick={handleNext} className="btn btn-gold">
              Próximo →
            </button>
          ) : (
            <button
              disabled={saving || !aceito}
              onClick={handleConfirm}
              className="btn btn-gold"
              style={{ opacity: aceito ? 1 : 0.5 }}
            >
              {saving ? 'Registrando...' : tipo === 'concordancia' ? '✅ Confirmar Aceite' : '⚠️ Registrar Contestação'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Email HTML builder ──────────────────────────────────────── */
function buildConfirmationEmail({ codigo, hash, nome, cpf, cargo, email, cnpj, transporterName, notes, valorTotal, tipo, termoTexto, ipAddress }) {
  const tipoLabel = tipo === 'concordancia' ? 'Concordância' : 'Contestação';
  const rows = notes.map(n => `
    <tr>
      <td style="padding:6px 10px;border-bottom:1px solid #e5e7eb;font-size:12px">${esc(n.nfd || '—')}</td>
      <td style="padding:6px 10px;border-bottom:1px solid #e5e7eb;font-size:12px">${esc(n.nfo || '—')}</td>
      <td style="padding:6px 10px;border-bottom:1px solid #e5e7eb;font-size:12px">${esc(n.cl || '—')}</td>
      <td style="padding:6px 10px;border-bottom:1px solid #e5e7eb;font-size:12px;text-align:right;font-weight:600">${fmt(n.v || 0)}</td>
    </tr>
  `).join('');

  return `
    <div style="font-family:Segoe UI,Arial,sans-serif;color:#1f2937;max-width:700px;margin:0 auto">
      <div style="background:#1a2744;padding:24px 28px;border-radius:10px 10px 0 0">
        <div style="font-size:22px;font-weight:800;color:#fff;font-style:italic">LINEA</div>
        <div style="font-size:11px;color:rgba(255,255,255,0.6);letter-spacing:3px;margin-top:2px">ALIMENTOS</div>
      </div>

      <div style="padding:24px 28px;border:1px solid #e5e7eb;border-top:none">
        <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:16px 20px;margin-bottom:20px;text-align:center">
          <div style="font-size:14px;font-weight:700;color:#166534;margin-bottom:4px">
            ${tipoLabel} Formal Registrada
          </div>
          <div style="font-size:24px;font-weight:800;color:#166534;font-family:monospace">
            ${esc(codigo)}
          </div>
        </div>

        <h3 style="color:#1a365d;margin:0 0 16px;font-size:16px">Dados do Registro</h3>

        <table style="width:100%;font-size:13px;margin-bottom:20px">
          <tr><td style="padding:4px 0;color:#6b7280;width:140px">Transportadora:</td><td style="font-weight:600">${esc(transporterName)}</td></tr>
          <tr><td style="padding:4px 0;color:#6b7280">CNPJ:</td><td style="font-weight:600">${esc(cnpj)}</td></tr>
          <tr><td style="padding:4px 0;color:#6b7280">Signatário:</td><td style="font-weight:600">${esc(nome)}</td></tr>
          <tr><td style="padding:4px 0;color:#6b7280">CPF:</td><td style="font-weight:600">${esc(cpf)}</td></tr>
          <tr><td style="padding:4px 0;color:#6b7280">Cargo:</td><td style="font-weight:600">${esc(cargo)}</td></tr>
          <tr><td style="padding:4px 0;color:#6b7280">Email:</td><td style="font-weight:600">${esc(email)}</td></tr>
          <tr><td style="padding:4px 0;color:#6b7280">Data/Hora:</td><td style="font-weight:600">${new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}</td></tr>
          <tr><td style="padding:4px 0;color:#6b7280">IP:</td><td style="font-weight:600;font-family:monospace">${esc(ipAddress || 'N/A')}</td></tr>
        </table>

        <h3 style="color:#1a365d;margin:0 0 12px;font-size:14px">Notas Fiscais</h3>
        <table style="width:100%;border-collapse:collapse;margin-bottom:20px">
          <thead>
            <tr style="background:#f8fafc">
              <th style="padding:8px 10px;text-align:left;font-size:10px;text-transform:uppercase;color:#6b7280;border-bottom:2px solid #e5e7eb">NFD</th>
              <th style="padding:8px 10px;text-align:left;font-size:10px;text-transform:uppercase;color:#6b7280;border-bottom:2px solid #e5e7eb">NFO</th>
              <th style="padding:8px 10px;text-align:left;font-size:10px;text-transform:uppercase;color:#6b7280;border-bottom:2px solid #e5e7eb">Cliente</th>
              <th style="padding:8px 10px;text-align:right;font-size:10px;text-transform:uppercase;color:#6b7280;border-bottom:2px solid #e5e7eb">Valor</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
          <tfoot>
            <tr>
              <td colspan="3" style="padding:10px;font-weight:700;color:#1a365d;border-top:2px solid #e5e7eb">Total</td>
              <td style="padding:10px;text-align:right;font-weight:700;color:#1a365d;border-top:2px solid #e5e7eb">${fmt(valorTotal)}</td>
            </tr>
          </tfoot>
        </table>

        <div style="background:#f8fafc;border:1px solid #e5e7eb;border-radius:8px;padding:14px;margin-bottom:20px">
          <div style="font-size:10px;color:#6b7280;text-transform:uppercase;letter-spacing:1px;margin-bottom:6px;font-weight:600">
            Hash de Integridade (SHA-256)
          </div>
          <div style="font-family:monospace;font-size:11px;color:#374151;word-break:break-all;line-height:1.6">
            ${esc(hash)}
          </div>
        </div>

        <p style="color:#6b7280;font-size:11px;line-height:1.6;margin:0">
          Este documento foi gerado eletronicamente pelo Portal de Devoluções da Linea Alimentos.
          O código <strong>${esc(codigo)}</strong> pode ser utilizado para verificação de autenticidade.
          O hash SHA-256 garante que o conteúdo deste aceite não foi alterado após o registro.
        </p>
      </div>
    </div>
  `;
}
