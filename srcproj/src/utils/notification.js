import { fmt, esc } from './helpers';
export function generateNotification(notes, transporterName = '') {
  const total = notes.reduce((s, n) => s + (n.v || 0), 0);
  const rows = notes.map((n, i) => `<tr><td>${i+1}</td><td>${esc(n.nfd||'-')}</td><td>${esc(n.nfo||'-')}</td><td>${esc(n.cl||'-')}</td><td>${esc(n.mo||'-')}</td><td style="text-align:right">${fmt(n.v||0)}</td></tr>`).join('');
  const html = `<html><head><title>Notificação de Débito</title><style>body{font-family:Segoe UI,Arial,sans-serif;padding:32px;color:#1f2937}.brand{font-size:26px;font-weight:800;color:#1a365d;font-style:italic}.title{font-size:24px;font-weight:700;color:#1a365d;margin:8px 0}.box{border:1px solid #e5e7eb;border-radius:16px;padding:20px;margin-bottom:20px;background:#f8fafc}table{width:100%;border-collapse:collapse;margin-top:16px}th,td{border:1px solid #e5e7eb;padding:10px;font-size:12px;text-align:left}th{background:#f8fafc}.total{margin-top:16px;font-size:18px;font-weight:700;color:#1a365d;text-align:right}@media print{body{padding:0}button{display:none}}</style></head><body><div><div class="brand">LINEA</div><div class="title">Notificação de Débito</div><div>Transportador: <strong>${esc(transporterName||'Não identificado')}</strong></div><div>Data: <strong>${new Date().toLocaleDateString('pt-BR')}</strong></div><button onclick="window.print()" style="padding:10px 16px;border:none;border-radius:10px;background:#1a365d;color:#fff;font-weight:700;cursor:pointer;margin-top:12px">Imprimir / Salvar PDF</button></div><div class="box">Solicitamos análise e tratativa das ocorrências abaixo relacionadas.</div><table><thead><tr><th>#</th><th>NFD</th><th>NFO</th><th>Cliente</th><th>Motivo</th><th style="text-align:right">Valor</th></tr></thead><tbody>${rows}</tbody></table><div class="total">Total: ${fmt(total)}</div></body></html>`;
  const w = window.open('', '_blank');
  if (!w) return;
  w.document.write(html);
  w.document.close();
}
