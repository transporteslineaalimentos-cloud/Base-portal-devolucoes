import { useEffect, useMemo, useState } from 'react';
import { fmt, esc } from '../utils/helpers';
function buildEmailHtml(notes, transporterName, obs) {
  const rows = notes.map(n => `<tr><td style="padding:8px 12px;border-bottom:1px solid #e5e7eb">${esc(n.nfd||'-')}</td><td style="padding:8px 12px;border-bottom:1px solid #e5e7eb">${esc(n.nfo||'-')}</td><td style="padding:8px 12px;border-bottom:1px solid #e5e7eb">${esc(n.cl||'-')}</td><td style="padding:8px 12px;border-bottom:1px solid #e5e7eb">${esc(n.mo||'-')}</td><td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:right;font-weight:600">${fmt(n.v||0)}</td></tr>`).join('');
  return `<div style="font-family:Segoe UI,Arial,sans-serif;color:#1f2937;max-width:700px"><div style="background:#1a2744;padding:24px 28px;border-radius:10px 10px 0 0"><div style="font-size:22px;font-weight:800;color:#fff;font-style:italic">LINEA</div><div style="font-size:11px;color:rgba(255,255,255,0.6);letter-spacing:3px;margin-top:2px">ALIMENTOS</div></div><div style="padding:24px 28px;border:1px solid #e5e7eb;border-top:none"><h2 style="color:#1a365d;margin:0 0 16px;font-size:18px">Notificação de Débito</h2><p style="margin:0 0 12px;color:#374151">Prezado(s) — ${esc(transporterName||'Transportador')},</p><p style="margin:0 0 16px;color:#374151">Segue relação de devoluções/ocorrências para análise, tratativa e retorno formal.</p>${obs?`<div style="background:#fffbeb;border-left:3px solid #d97706;padding:10px 14px;border-radius:4px;margin-bottom:16px;font-size:13px;color:#374151"><strong>Observação:</strong> ${esc(obs)}</div>`:''}<table style="width:100%;border-collapse:collapse;font-size:13px"><thead><tr style="background:#f8fafc"><th style="padding:10px 12px;text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:.04em;color:#6b7280;border-bottom:2px solid #e5e7eb">NFD</th><th style="padding:10px 12px;text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:.04em;color:#6b7280;border-bottom:2px solid #e5e7eb">NFO</th><th style="padding:10px 12px;text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:.04em;color:#6b7280;border-bottom:2px solid #e5e7eb">Cliente</th><th style="padding:10px 12px;text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:.04em;color:#6b7280;border-bottom:2px solid #e5e7eb">Motivo</th><th style="padding:10px 12px;text-align:right;font-size:11px;text-transform:uppercase;letter-spacing:.04em;color:#6b7280;border-bottom:2px solid #e5e7eb">Valor</th></tr></thead><tbody>${rows}</tbody><tfoot><tr><td colspan="4" style="padding:12px;font-weight:700;color:#1a365d">Total</td><td style="padding:12px;text-align:right;font-weight:700;color:#1a365d">${fmt(notes.reduce((s,n)=>s+(n.v||0),0))}</td></tr></tfoot></table><p style="margin:24px 0 0;color:#6b7280;font-size:13px">Atenciosamente,<br/><strong style="color:#1a365d">Linea Alimentos — Transportes</strong></p></div></div>`;
}
export default function EmailModal({ open, notes = [], transporterName = '', defaultTo = '', onClose, onSent }) {
  const [to, setTo] = useState(defaultTo); const [cc, setCc] = useState(''); const [obs, setObs] = useState(''); const [sending, setSending] = useState(false);
  useEffect(() => { if (open) { setTo(defaultTo||''); setCc('transporte@lineaalimentos.com.br'); setObs(''); } }, [open, defaultTo]);
  const subject = useMemo(() => `Notificação de Débito — ${transporterName||'Transportador'} — ${notes.length} nota(s)`, [transporterName, notes.length]);
  if (!open) return null;
  const handleSend = async () => {
    if (!to.trim()) return alert('Preencha o email do transportador.');
    setSending(true);
    try {
      const html = buildEmailHtml(notes, transporterName, obs);
      const res = await fetch('/api/send-email', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ to: to.split(';').map(v=>v.trim()).filter(Boolean), cc: cc.split(';').map(v=>v.trim()).filter(Boolean), subject, html }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error||'Falha ao enviar');
      onSent?.({ to, cc, obs, subject });
      onClose();
      alert('Email enviado com sucesso.');
    } catch (e) { alert(e.message); } finally { setSending(false); }
  };
  return (
    <div className="modal-overlay" onClick={e => e.target===e.currentTarget&&onClose()}>
      <div className="modal" style={{ maxWidth: 560 }}>
        <div className="modal-header">
          <h2 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>Enviar notificação por email</h2>
          <p style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 3 }}>{notes.length} nota(s) · {transporterName||'Transportador'}</p>
        </div>
        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div><label className="input-label">Para (use ; para múltiplos)</label><input value={to} onChange={e=>setTo(e.target.value)} placeholder="email@transportador.com; outro@..." className="input" /></div>
          <div><label className="input-label">CC</label><input value={cc} onChange={e=>setCc(e.target.value)} placeholder="cc1@...; cc2@..." className="input" /></div>
          <div><label className="input-label">Observação</label><textarea value={obs} onChange={e=>setObs(e.target.value)} rows={3} className="input" placeholder="Mensagem adicional..." /></div>
          <div style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 8, padding: 12 }}>
            <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>Assunto</div>
            <div style={{ fontSize: 12, color: 'var(--text-2)' }}>{subject}</div>
          </div>
        </div>
        <div className="modal-footer">
          <button onClick={onClose} className="btn btn-outline">Cancelar</button>
          <button disabled={sending} onClick={handleSend} className="btn btn-gold">{sending?'Enviando...':'Enviar'}</button>
        </div>
      </div>
    </div>
  );
}
