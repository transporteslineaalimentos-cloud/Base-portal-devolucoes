import { createClient } from '@supabase/supabase-js';

export const SB_URL = 'https://opcrtjdnpgqcjlksofjw.supabase.co';
export const SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9wY3J0amRucGdxY2psa3NvZmp3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ0NTMwODYsImV4cCI6MjA5MDAyOTA4Nn0.ojJMzaInCSD4mrZEWrU1d9ziDVyIcp7NRm6RHx2uTGA';
export const GH_URL = 'https://raw.githubusercontent.com/transporteslineaalimentos-cloud/Base-portal-devolucoes/main/Base_Completa_Portal.xlsx';

export const supabase = createClient(SB_URL, SB_KEY);

// ─────────────────────────────────────────────────────────────────
// SO — Pend. Cobrança
// CÓDIGOS IGUAIS AO BANCO — apenas adicionamos next_internal,
// next_transp, final, transp e auto_next para controlar o fluxo.
//
// Fluxo SO (conforme caderno):
//   pendente → validado
//     ├─ cancelada          (tol. inválida — FINAL, obs obrigatória)
//     └─ cobr_tr            (tol. válida + notifica transp — nota fica visível)
//          ⚡auto → cobr_tr (fica no mesmo estado aguardando ação do transp.)
//            transportador:
//              ├─ tr_concordou  → aprovar_ret → emitida (FINAL)
//              ├─ tr_contestou  → pendente (retorna para análise)
//              └─ tr_nao_resp   → pendente (retorna para análise)
// ─────────────────────────────────────────────────────────────────
export const SO = [
  {
    v: 'pendente',      l: 'Pendente análise',                  c: '#6b7280', bg: '#f3f4f6',
    final: false, transp: false,
    next_internal: ['validado'],
    next_transp: [],
  },
  {
    v: 'validado',      l: 'Validada internamente',             c: '#d97706', bg: '#fffbeb',
    final: false, transp: false,
    // cancelada = tol. inválida (finaliza), cobr_tr = tol. válida + notifica
    next_internal: ['cancelada', 'cobr_tr'],
    next_transp: [],
    // obs obrigatória ao escolher cancelada — controlado no StatusButtons
  },
  {
    v: 'cobr_tr',       l: 'Aguardando posição do transportador', c: '#7c3aed', bg: '#f5f3ff',
    final: false, transp: true,   // nota fica visível ao transportador
    next_internal: [],
    // transportador responde com uma dessas 3 opções:
    next_transp: ['tr_concordou', 'tr_contestou', 'tr_nao_resp'],
  },
  {
    v: 'tr_contestou',  l: 'Transportador contestou',           c: '#dc2626', bg: '#fef2f2',
    final: false, transp: true,
    // retorna para análise interna
    next_internal: ['pendente'],
    next_transp: [],
  },
  {
    v: 'tr_concordou',  l: 'Transportador aprovou',             c: '#0ea5e9', bg: '#f0f9ff',
    final: false, transp: true,
    // interno deve emitir a NF de débito
    next_internal: ['aprovar_ret'],
    next_transp: [],
  },
  {
    v: 'tr_nao_resp',   l: 'Transportador não responsável',     c: '#64748b', bg: '#f1f5f9',
    final: false, transp: true,
    // retorna para análise interna
    next_internal: ['pendente'],
    next_transp: [],
  },
  {
    v: 'aprovar_ret',   l: 'Pend. emissão de débito',           c: '#f59e0b', bg: '#fffbeb',
    final: false, transp: false,
    requires_nfd: true,
    next_internal: ['emitida'],
    next_transp: [],
  },
  {
    v: 'emitida',       l: 'NF débito emitida',                 c: '#10b981', bg: '#ecfdf5',
    final: true,  transp: true,
    next_internal: [],
    next_transp: [],
  },
  {
    v: 'cobrada',       l: 'Cobrada',                           c: '#3b82f6', bg: '#eff6ff',
    final: true,  transp: false,
    next_internal: [],
    next_transp: [],
  },
  {
    v: 'paga',          l: 'Paga',                              c: '#8b5cf6', bg: '#f5f3ff',
    final: true,  transp: false,
    next_internal: [],
    next_transp: [],
  },
  {
    v: 'cancelada',     l: 'Cancelada',                         c: '#9ca3af', bg: '#f8fafc',
    final: true,  transp: false,
    requires_obs: true,
    next_internal: [],
    next_transp: [],
  },
];

// ─────────────────────────────────────────────────────────────────
// TK — Pend. Lançamento / Retorno
// CÓDIGOS IGUAIS AO BANCO — apenas adicionamos o fluxo.
//
// Fluxo TK (conforme caderno):
//   aguardando → notificado
//     ├─ ret_nao_auto         (retorno não autorizado — FINAL)
//     └─ retorno_auto         (retorno autorizado — nota visível ao transp.)
//          ⚡auto (transp. é notificado e atualiza o tracking):
//            → em_transito
//            → agendado
//            → entregue  (FINAL ✓)
//            → extravio  ⚠ → pode virar cobrança SO (encaminhar)
// ─────────────────────────────────────────────────────────────────
export const TK = [
  {
    v: 'aguardando',    l: 'Pendente análise',                  c: '#6b7280', bg: '#f3f4f6', i: '⏳',
    final: false, transp: false,
    next_internal: ['notificado'],
    next_transp: [],
  },
  {
    v: 'notificado',    l: 'Em análise interna',                c: '#d97706', bg: '#fffbeb', i: '🧾',
    final: false, transp: false,
    next_internal: ['ret_nao_auto', 'retorno_auto'],
    next_transp: [],
  },
  {
    v: 'ret_nao_auto',  l: 'Retorno não autorizado',            c: '#b91c1c', bg: '#fef2f2', i: '🚫',
    final: true,  transp: false,
    next_internal: [],
    next_transp: [],
  },
  {
    v: 'retorno_auto',  l: 'Retorno autorizado',                c: '#0ea5e9', bg: '#f0f9ff', i: '✅',
    final: false, transp: true,   // nota fica visível ao transportador
    next_internal: [],
    // transportador atualiza o tracking com qualquer dessas opções:
    next_transp: ['em_transito', 'agendado', 'entregue', 'extravio'],
  },
  {
    v: 'em_transito',   l: 'Em retorno para o CD',              c: '#8b5cf6', bg: '#f5f3ff', i: '🚚',
    final: false, transp: true,
    next_internal: [],
    next_transp: ['agendado', 'entregue', 'extravio'],
  },
  {
    v: 'agendado',      l: 'Recebimento agendado',              c: '#2563eb', bg: '#eff6ff', i: '📅', hasDate: true,
    final: false, transp: true,
    next_internal: [],
    next_transp: ['entregue', 'extravio', 'perdeu_agenda'],
  },
  {
    v: 'perdeu_agenda', l: 'Perdeu agenda',                     c: '#dc2626', bg: '#fef2f2', i: '❌', hasDate: true,
    final: false, transp: true,
    next_internal: [],
    next_transp: ['agendado', 'entregue'],
  },
  {
    v: 'dev_recusada',  l: 'Transportador recusou retorno',     c: '#991b1b', bg: '#fef2f2', i: '🚫',
    final: false, transp: true,
    next_internal: ['encaminhar', 'ret_nao_auto'],
    next_transp: [],
  },
  {
    v: 'dev_apos_dt',   l: 'Devolução após entrega',            c: '#b45309', bg: '#fffbeb', i: '📆',
    final: false, transp: false,
    next_internal: ['encaminhar', 'ret_nao_auto'],
    next_transp: [],
  },
  {
    v: 'extravio',      l: 'Extravio informado',                c: '#7f1d1d', bg: '#fef2f2', i: '⛔',
    final: false, transp: true,
    // extravio pode gerar nova cobrança SO via encaminhar
    next_internal: ['encaminhar'],
    next_transp: [],
  },
  {
    v: 'entregue',      l: 'Entregue no CD',                    c: '#059669', bg: '#ecfdf5', i: '📦', hasDate: true,
    final: true,  transp: true,
    next_internal: [],
    next_transp: [],
  },

  {
    v: 'encaminhar',    l: 'Converter para cobrança',           c: '#dc2626', bg: '#fef2f2', i: '⚡',
    final: true,  transp: false,
    next_internal: [],
    next_transp: [],
  },
];

// ─────────────────────────────────────────────────────────────────
// Tudo abaixo é igual ao original — sem mudança
// ─────────────────────────────────────────────────────────────────

export const TK_INTERNAL = ['aguardando', 'notificado', 'retorno_auto', 'ret_nao_auto', 'perdeu_agenda', 'dev_recusada', 'dev_apos_dt', 'encaminhar'];
export const TK_TRANSPORT = ['em_transito', 'agendado', 'entregue', 'extravio'];

export const COBR_TRANSPORT_VISIBLE    = ['cobr_tr', 'tr_contestou', 'tr_concordou', 'tr_nao_resp', 'emitida', 'cobrada', 'paga'];
export const COBR_TRANSPORT_ACTIONABLE = ['cobr_tr'];
export const COBR_TRANSPORT_RESPONSES  = ['tr_contestou', 'tr_concordou', 'tr_nao_resp'];

export const LANC_TRANSPORT_VISIBLE    = ['retorno_auto', 'em_transito', 'agendado', 'perdeu_agenda', 'dev_recusada', 'dev_apos_dt', 'extravio', 'entregue'];
export const LANC_TRANSPORT_ACTIONABLE = ['retorno_auto', 'em_transito', 'agendado', 'perdeu_agenda', 'extravio'];

export const COBR_FINALIZERS = ['emitida', 'cobrada', 'paga', 'cancelada'];
export const LANC_FINALIZERS = ['entregue', 'encaminhar', 'ret_nao_auto'];
export const LANC_MOVERS     = ['encaminhar'];

// ─────────────────────────────────────────────────────────────────
// getNextStatuses — retorna APENAS os próximos status válidos
// dado o status atual e o perfil (interno ou transportador)
// ─────────────────────────────────────────────────────────────────
export function getNextStatuses(mode, currentValue, isTransporter) {
  if (mode === 'cobr') {
    const st = SO.find(s => s.v === currentValue);
    if (!st || st.final) return [];
    const keys = isTransporter ? (st.next_transp || []) : (st.next_internal || []);
    return SO.filter(s => keys.includes(s.v));
  }
  const tk = TK.find(t => t.v === currentValue);
  if (!tk || tk.final) return [];
  const keys = isTransporter ? (tk.next_transp || []) : (tk.next_internal || []);
  return TK.filter(t => keys.includes(t.v));
}
