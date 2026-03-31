import { useEffect, useMemo, useState } from 'react';
import { fmt, esc } from '../utils/helpers';

function buildEmailHtml(notes, transporterName, obs) {
  const rows = notes.map(n => `
    <tr>
      <td style="padding:8px;border:1px solid #e5e7eb">${esc(n.nfd || '-')}</td>
      <td style="padding:8px;border:1px solid #e5e7eb">${esc(n.nfo || '-')}</td>
      <td style="padding:8px;border:1px solid #e5e7eb">${esc(n.cl || '-')}</td>
      <td style="padding:8px;border:1px solid #e5e7eb">${esc(n.mo || '-')}</td>
      <td style="padding:8px;border:1px solid #e5e7eb;text-align:right">${fmt(n.v || 0)}</td>
    </tr>
  `).join('');
  return `
    <div style="font-family:Segoe UI,Arial,sans-serif;color:#1f2937">
      <h2 style="color:#1a365d;margin:0 0 12px">Notificação de Débito - ${esc(transporterName || 'Transportador')}</h2>
      <p style="margin:0 0 12px">Prezados,</p>
      <p style="margin:0 0 12px">Segue relação de devoluções/ocorrências para análise e tratativa de cobrança.</p>
      ${obs ? `<p style="margin:0 0 12px"><strong>Observação:</strong> ${esc(obs)}</p>` : ''}
      <table style="width:100%;border-collapse:collapse;font-size:13px">
        <thead>
          <tr style="background:#f8fafc">
            <th style="padding:8px;border:1px solid #e5e7eb;text-align:left">NFD</th>
            <th style="padding:8px;border:1px solid #e5e7eb;text-align:left">NFO</th>
            <th style="padding:8px;border:1px solid #e5e7eb;text-align:left">Cliente</th>
            <th style="padding:8px;border:1px solid #e5e7eb;text-align:left">Motivo</th>
            <th style="padding:8px;border:1px solid #e5e7eb;text-align:right">Valor</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
      <p style="margin:16px 0 0">Att.,<br/>Linea Alimentos - Transportes</p>
    </div>
  `;
}

export default function EmailModal({ open, notes = [], transporterName = '', defaultTo = '', onClose, onSent }) {
  const [to, setTo] = useState(defaultTo);
  const [cc, setCc] = useState('');
  const [obs, setObs] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (open) {
      setTo(defaultTo || ''); setCc(''); setObs('');
    }
  }, [open, defaultTo]);

  const subject = useMemo(() => `Notificação de Débito - ${transporterName || 'Transportador'}`, [transporterName]);
  if (!open) return null;

  const handleSend = async () => {
    if (!to.trim()) return alert('Preencha o email do transportador.');
    setSending(true);
    try {
      const html = buildEmailHtml(notes, transporterName, obs);
      const res = await fetch('/.netlify/functions/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: to.split(';').map(v => v.trim()).filter(Boolean), cc: cc.split(';').map(v => v.trim()).filter(Boolean), subject, html })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Falha ao enviar email');
      onSent?.({ to, cc, obs, subject });
      onClose();
      alert('Email enviado com sucesso.');
    } catch (e) {
      alert(e.message);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[999] bg-black/50 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="text-base font-bold text-gray-800">Enviar email</h2>
          <p className="text-xs text-gray-400 mt-1">{notes.length} nota(s) selecionada(s) para {transporterName || 'transportador'}.</p>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Para</label>
            <input value={to} onChange={e => setTo(e.target.value)} placeholder="email@transportador.com.br; outro@..." className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm outline-none focus:border-blue-500" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">CC</label>
            <input value={cc} onChange={e => setCc(e.target.value)} placeholder="cc1@...; cc2@..." className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm outline-none focus:border-blue-500" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Observação</label>
            <textarea value={obs} onChange={e => setObs(e.target.value)} rows={4} className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm outline-none focus:border-blue-500 resize-none" />
          </div>
          <div className="bg-gray-50 rounded-xl p-4 text-xs text-gray-600">
            <div className="font-semibold text-gray-700 mb-2">Assunto</div>
            <div>{subject}</div>
          </div>
        </div>
        <div className="px-5 py-4 border-t border-gray-100 flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 rounded-lg bg-gray-100 text-gray-600 text-sm font-semibold hover:bg-gray-200 transition">Cancelar</button>
          <button disabled={sending} onClick={handleSend} className="px-4 py-2 rounded-lg bg-[#1a365d] text-white text-sm font-semibold hover:opacity-90 transition disabled:opacity-50">{sending ? 'Enviando...' : 'Enviar'}</button>
        </div>
      </div>
    </div>
  );
}
