import {
  SO, TK,
  COBR_FINALIZERS, LANC_FINALIZERS, LANC_MOVERS,
  COBR_TRANSPORT_VISIBLE, COBR_TRANSPORT_ACTIONABLE,
  LANC_TRANSPORT_VISIBLE, LANC_TRANSPORT_ACTIONABLE
} from '../config/constants';

export function fmt(v) {
  return 'R$ ' + (v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function esc(s) {
  if (!s) return '';
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export function norm(v) {
  return String(v || '').replace(/^0+/, '').trim();
}

export function fmtD(v) {
  if (!v) return '';
  if (typeof v === 'string' && v.includes('/')) return v;
  const n = parseFloat(v);
  if (isNaN(n)) return String(v);
  const d = new Date(1899, 11, 30);
  d.setDate(d.getDate() + Math.floor(n));
  return d.toLocaleDateString('pt-BR');
}

export function fmtDateTime(v) {
  if (!v) return '';
  try { return new Date(v).toLocaleString('pt-BR'); } catch { return String(v); }
}

export function getNoteKey(note) { return note.nfd + '|' + note.nfo; }

export function getStatus(note, statuses) {
  const key = getNoteKey(note);
  const v = statuses[key];
  if (!v) return 'pendente';
  return v.startsWith('st:') ? v.slice(3) : v;
}

export function getTracking(note, statuses) {
  const key = getNoteKey(note);
  const v = statuses[key];
  if (!v) return 'aguardando';
  return v.startsWith('tk:') ? v.slice(3) : v === 'aguardando' ? v : 'aguardando';
}

export function getTransporter(note, extras = {}) {
  const key = getNoteKey(note);
  const ex = extras[key];
  return (typeof ex === 'object' && ex !== null ? ex.trOverride : null) || note.tr || '';
}

export function getTransporterEmail(name, extras = {}) {
  if (!name) return '';
  const v = extras['tr_email:' + name];
  return typeof v === 'string' ? v : (v?.emails || '');
}

export function isCobrActive(note, statuses) {
  const s = getStatus(note, statuses);
  return !COBR_FINALIZERS.includes(s);
}

export function isLancActive(note, statuses) {
  const t = getTracking(note, statuses);
  return !LANC_FINALIZERS.includes(t);
}

export function calcAging(note) {
  if (!note?.dt) return null;
  const p = String(note.dt).split('/');
  if (p.length !== 3) return null;
  const dt = new Date(p[2], p[1] - 1, p[0]);
  if (isNaN(dt.getTime())) return null;
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  dt.setHours(0, 0, 0, 0);
  return Math.floor((now - dt) / 86400000);
}

export function agingCategory(days) {
  if (days === null) return null;
  if (days > 30) return { cat: 'expirado', color: '#dc2626', bg: '#fef2f2' };
  if (days >= 20) return { cat: 'proximo', color: '#d97706', bg: '#fffbeb' };
  return { cat: 'ok', color: '#059669', bg: '#ecfdf5' };
}

export function checkDateMatch(note) {
  if (note.t !== 'P' || !note.dt || !note.dtEnt) return null;
  const p1 = String(note.dt).split('/'), p2 = String(note.dtEnt).split('/');
  if (p1.length !== 3 || p2.length !== 3) return null;
  const d1 = new Date(p1[2], p1[1] - 1, p1[0]);
  const d2 = new Date(p2[2], p2[1] - 1, p2[0]);
  const diff = Math.round((d1 - d2) / 86400000);
  if (diff === 0) return { ok: true, msg: 'NFD no dia da entrega' };
  return { ok: false, diff, msg: diff > 0 ? `NFD ${diff}d após entrega` : `NFD ${Math.abs(diff)}d antes entrega` };
}

export function getSOByValue(v) { return SO.find(s => s.v === v) || SO[0]; }
export function getTKByValue(v) { return TK.find(t => t.v === v) || TK[0]; }

export function transporterCanSee(mode, currentValue) {
  if (mode === 'cobr') return COBR_TRANSPORT_VISIBLE.includes(currentValue);
  return LANC_TRANSPORT_VISIBLE.includes(currentValue);
}

export function transporterCanAct(mode, currentValue) {
  if (mode === 'cobr') return COBR_TRANSPORT_ACTIONABLE.includes(currentValue);
  return LANC_TRANSPORT_ACTIONABLE.includes(currentValue);
}

export function deriveWorkflow(mode, currentValue, meta = {}) {
  if (mode === 'cobr') {
    const base = {
      queue: 'Pendente Cobrança',
      processStatus: getSOByValue(currentValue).l,
      transporterVisible: transporterCanSee('cobr', currentValue),
      transporterCanAct: transporterCanAct('cobr', currentValue),
      transporterResponse: 'Sem resposta',
      pendingWith: 'interno',
      nextAction: 'Analisar internamente a cobrança',
      closeRule: 'A nota encerra quando for paga ou cancelada.',
    };
    if (currentValue === 'validado') return { ...base, nextAction: 'Enviar a cobrança para posição do transportador' };
    if (currentValue === 'cobr_tr') return { ...base, pendingWith: 'transportador', nextAction: 'Transportador deve aprovar, contestar ou recusar.' };
    if (currentValue === 'tr_contestou') return { ...base, pendingWith: 'interno', transporterResponse: 'Contestou', nextAction: 'Analisar contestação e decidir se mantém a cobrança.' };
    if (currentValue === 'tr_concordou') return { ...base, pendingWith: 'interno', transporterResponse: 'Aprovou', nextAction: 'Emitir notificação/NF débito.' };
    if (currentValue === 'tr_nao_resp') return { ...base, pendingWith: 'interno', transporterResponse: 'Informou não responsabilidade', nextAction: 'Revisar evidências e decidir continuidade.' };
    if (currentValue === 'aprovar_ret') return { ...base, pendingWith: 'interno', nextAction: 'Analisar necessidade de retorno antes de cobrar.' };
    if (currentValue === 'emitida') return { ...base, pendingWith: 'controladoria', nextAction: 'Acompanhar envio e confirmação da cobrança.', transporterResponse: 'Posicionado' };
    if (currentValue === 'cobrada') return { ...base, pendingWith: 'controladoria', nextAction: 'Acompanhar pagamento.', transporterResponse: 'Posicionado' };
    if (currentValue === 'paga') return { ...base, pendingWith: 'encerrado', nextAction: 'Processo finalizado.', transporterResponse: 'Posicionado' };
    if (currentValue === 'cancelada') return { ...base, pendingWith: 'encerrado', nextAction: 'Cobrança cancelada.', transporterResponse: 'Posicionado' };
    return base;
  }

  const base = {
    queue: 'Pendente Lançamento',
    processStatus: getTKByValue(currentValue).l,
    transporterVisible: transporterCanSee('pend', currentValue),
    transporterCanAct: transporterCanAct('pend', currentValue),
    transporterResponse: 'Sem posição',
    pendingWith: 'interno',
    nextAction: 'Analisar internamente a devolução',
    closeRule: 'A nota encerra com entrega comprovada, encerramento sem retorno ou conversão para cobrança.',
  };
  if (currentValue === 'notificado') return { ...base, nextAction: 'Concluir análise interna e decidir sobre o retorno.' };
  if (currentValue === 'retorno_auto') return { ...base, pendingWith: 'transportador', nextAction: 'Transportador deve informar posição do retorno.' };
  if (currentValue === 'em_transito') return { ...base, pendingWith: 'transportador', transporterResponse: 'Em retorno para o CD', nextAction: 'Acompanhar previsão de chegada.' };
  if (currentValue === 'agendado') return { ...base, pendingWith: 'transportador', transporterResponse: 'Recebimento agendado', nextAction: 'Aguardar entrega no CD.' };
  if (currentValue === 'perdeu_agenda') return { ...base, pendingWith: 'interno', transporterResponse: 'Perdeu agenda', nextAction: 'Replanejar recebimento ou escalar tratativa.' };
  if (currentValue === 'dev_recusada') return { ...base, pendingWith: 'interno', transporterResponse: 'Recusou retorno', nextAction: 'Decidir encerramento ou conversão para cobrança.' };
  if (currentValue === 'dev_apos_dt') return { ...base, pendingWith: 'interno', transporterResponse: 'Informou devolução após entrega', nextAction: 'Validar evidência e definir tratativa.' };
  if (currentValue === 'extravio') return { ...base, pendingWith: 'interno', transporterResponse: 'Informou extravio', nextAction: 'Avaliar conversão para cobrança.' };
  if (currentValue === 'entregue') return { ...base, pendingWith: 'interno', transporterResponse: 'Entregou no CD', nextAction: 'Conferir comprovante e encerrar.' };
  if (currentValue === 'ret_nao_auto') return { ...base, pendingWith: 'encerrado', nextAction: 'Caso encerrado sem retorno autorizado.' };
  if (currentValue === 'encaminhar') return { ...base, pendingWith: 'interno', nextAction: 'Tratar essa nota na fila de cobrança.' };
  return base;
}

export function filterNotes(items, filters, statuses, mode, extras = {}) {
  let out = [...items];
  if (filters.area && filters.area !== 'TODOS') out = out.filter(d => d.ar === filters.area);
  if (filters.status && filters.status !== 'todos') {
    out = out.filter(d => (mode === 'cobr' ? getStatus(d, statuses) : getTracking(d, statuses)) === filters.status);
  }
  if (filters.transporters?.length) {
    out = out.filter(d => filters.transporters.includes(getTransporter(d, extras) || 'Não identificado'));
  }
  // Filtro de aging (aplicado ao vir do dashboard de Aging)
  if (filters.agingCat) {
    out = out.filter(d => {
      const days = calcAging(d);
      if (filters.agingCat === 'expirado') return days !== null && days > 30;
      if (filters.agingCat === 'proximo') return days !== null && days >= 20 && days <= 30;
      if (filters.agingCat === 'ok') return days !== null && days < 20;
      return true;
    });
  }
  if (filters.search) {
    const terms = filters.search.toLowerCase().split(';').map(t => t.trim()).filter(Boolean);
    out = out.filter(d => terms.some(q =>
      d.cl?.toLowerCase().includes(q) ||
      String(d.nfd || '').toLowerCase().includes(q) ||
      String(d.nfo || '').toLowerCase().includes(q) ||
      String(d.mo || '').toLowerCase().includes(q) ||
      getTransporter(d, extras).toLowerCase().includes(q)
    ));
  }
  return out;
}

export function summarizeTransporters(notes, extras = {}) {
  const map = {};
  notes.forEach(d => {
    const tr = getTransporter(d, extras) || 'Não identificado';
    if (!map[tr]) map[tr] = { name: tr, count: 0, value: 0, cobr: 0, pend: 0 };
    map[tr].count += 1;
    map[tr].value += d.v || 0;
    if (d.p?.length > 0) map[tr].cobr += 1; else map[tr].pend += 1;
  });
  return Object.values(map).sort((a, b) => b.value - a.value);
}

export function groupByNfDeb(cobrNotes, extras = {}, history = []) {
  const map = {};
  cobrNotes.forEach(note => {
    const key = getNoteKey(note);
    const ex = extras[key] || {};
    const nfDeb = typeof ex === 'object' ? ex.nfDeb : null;
    if (!nfDeb) return;
    if (!map[nfDeb]) map[nfDeb] = { nfDeb, pedido: '', pdfUrl: '', notes: [], history: [] };
    map[nfDeb].notes.push(note);
    if (!map[nfDeb].pdfUrl && ex.pdfUrl) map[nfDeb].pdfUrl = ex.pdfUrl;
    if (!map[nfDeb].pedido && ex.pedido) map[nfDeb].pedido = ex.pedido;
  });
  Object.values(map).forEach(group => {
    const keys = new Set(group.notes.map(getNoteKey));
    group.history = history.filter(h => keys.has(h.nf_key));
    group.totalValue = group.notes.reduce((s, n) => s + (n.v || 0), 0);
  });
  return Object.values(map).sort((a, b) => String(b.nfDeb).localeCompare(String(a.nfDeb)));
}

export function getVisibleCobranca(data, statuses) {
  const base = data?.cobr || [];
  const moved = (data?.pend || []).filter(n => LANC_MOVERS.includes(getTracking(n, statuses)));
  return [...base, ...moved];
}

export function getVisibleLancamento(data, statuses) {
  return (data?.pend || []).filter(n => !LANC_MOVERS.includes(getTracking(n, statuses)));
}

export function toExportRows(notes, statuses, extras, mode, noteMeta = {}) {
  return notes.map(d => {
    const key = getNoteKey(d);
    const meta = noteMeta[key] || {};
    const current = mode === 'cobr' ? getStatus(d, statuses) : getTracking(d, statuses);
    const flow = deriveWorkflow(mode, current, meta);
    const ex = extras[key] || {};
    return {
      Tipo: d.t === 'P' ? 'PARCIAL' : 'TOTAL',
      Fila: flow.queue,
      NFD: d.nfd,
      NFO: d.nfo,
      Cliente: d.cl,
      Valor: d.v,
      UF: d.uf,
      Motivo: d.mo,
      Área: d.ar,
      Transportador: getTransporter(d, extras),
      Data: d.dt,
      'Nº NF Débito': (typeof ex === 'object' ? ex.nfDeb : null) || '',
      Pedido: (typeof ex === 'object' ? ex.pedido : null) || '',
      PDF: (typeof ex === 'object' ? ex.pdfUrl : null) || '',
      Status: flow.processStatus,
      'Pendência atual': flow.pendingWith,
      'Visível transportador': flow.transporterVisible ? 'Sim' : 'Não',
      'Posição transportador': flow.transporterResponse,
      'Próxima ação sugerida': flow.nextAction,
      Prioridade: meta.prioridade || '',
      Responsável: meta.responsavel || '',
      'Próxima ação (manual)': meta.proxima_acao || '',
      'Motivo bloqueio': meta.motivo_bloqueio || '',
      'Cobrar transportador': meta.cobrar_transportador ? 'Sim' : 'Não',
      'Retorno autorizado': meta.retorno_autorizado ? 'Sim' : 'Não',
      'Aguardando documento': meta.aguardando_documento ? 'Sim' : 'Não',
      Aging: calcAging(d),
    };
  });
}

export function buildAreaSummary(notes) {
  const map = {};
  notes.forEach(d => {
    const area = d.ar || 'SEM ÁREA';
    if (!map[area]) map[area] = { area, count: 0, value: 0 };
    map[area].count += 1;
    map[area].value += d.v || 0;
  });
  return Object.values(map).sort((a, b) => b.value - a.value);
}

// Converte código interno de status para label legível
// Ex: 'cobr_tr' → 'Aguardando posição do transportador'
export function getStatusLabel(v) {
  if (!v) return v || '';
  // Remove prefixos st: tk: e parte de data "(dd/mm/aaaa)"
  const clean = String(v).replace(/^(st:|tk:)/, '').split(' (')[0].trim();
  return SO.find(s => s.v === clean)?.l
      || TK.find(t => t.v === clean)?.l
      || clean;
}

// Traduz código interno de status para label legível (ex: 'cobr_tr' → 'Aguardando posição do transportador')
export function translateStatusLabel(code) {
  if (!code) return code;
  const raw = String(code).replace(/^(st:|tk:)/, '').trim();
  const soMatch = SO.find(s => s.v === raw);
  if (soMatch) return soMatch.l;
  const tkMatch = TK.find(t => t.v === raw);
  if (tkMatch) return tkMatch.l;
  return code;
}
