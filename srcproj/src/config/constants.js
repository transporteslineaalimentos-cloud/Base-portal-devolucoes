import { createClient } from '@supabase/supabase-js';

export const SB_URL = 'https://opcrtjdnpgqcjlksofjw.supabase.co';
export const SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9wY3J0amRucGdxY2psa3NvZmp3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ0NTMwODYsImV4cCI6MjA5MDAyOTA4Nn0.ojJMzaInCSD4mrZEWrU1d9ziDVyIcp7NRm6RHx2uTGA';
export const GH_URL = 'https://raw.githubusercontent.com/transporteslineaalimentos-cloud/Base-portal-devolucoes/main/Base_Completa_Portal.xlsx';

export const supabase = createClient(SB_URL, SB_KEY);

// =====================
// Pend. Cobrança
// =====================
// Mantemos os códigos para não quebrar a base já existente.
export const SO = [
  { v: 'pendente', l: 'Pendente análise', c: '#6b7280', bg: '#f3f4f6' },
  { v: 'validado', l: 'Validada internamente', c: '#d97706', bg: '#fffbeb' },
  { v: 'cobr_tr', l: 'Aguardando posição do transportador', c: '#7c3aed', bg: '#f5f3ff' },
  { v: 'tr_contestou', l: 'Transportador contestou', c: '#dc2626', bg: '#fef2f2' },
  { v: 'tr_concordou', l: 'Transportador aprovou', c: '#0ea5e9', bg: '#f0f9ff' },
  { v: 'tr_nao_resp', l: 'Transportador não responsável', c: '#64748b', bg: '#f1f5f9' },
  { v: 'aprovar_ret', l: 'Analisar retorno do transportador', c: '#f59e0b', bg: '#fffbeb' },
  { v: 'emitida', l: 'NF débito emitida', c: '#10b981', bg: '#ecfdf5' },
  { v: 'cobrada', l: 'Cobrada', c: '#3b82f6', bg: '#eff6ff' },
  { v: 'paga', l: 'Paga', c: '#8b5cf6', bg: '#f5f3ff' },
  { v: 'cancelada', l: 'Cancelada', c: '#9ca3af', bg: '#f8fafc' },
];

// =====================
// Pend. Lançamento / Retorno
// =====================
export const TK = [
  { v: 'aguardando', l: 'Pendente análise', c: '#6b7280', bg: '#f3f4f6', i: '⏳' },
  { v: 'notificado', l: 'Em análise interna', c: '#d97706', bg: '#fffbeb', i: '🧾' },
  { v: 'retorno_auto', l: 'Retorno autorizado', c: '#0ea5e9', bg: '#f0f9ff', i: '✅' },
  { v: 'em_transito', l: 'Em retorno para o CD', c: '#8b5cf6', bg: '#f5f3ff', i: '🚚' },
  { v: 'agendado', l: 'Recebimento agendado', c: '#2563eb', bg: '#eff6ff', i: '📅', hasDate: true },
  { v: 'perdeu_agenda', l: 'Perdeu agenda', c: '#dc2626', bg: '#fef2f2', i: '❌', hasDate: true },
  { v: 'dev_recusada', l: 'Transportador recusou retorno', c: '#991b1b', bg: '#fef2f2', i: '🚫' },
  { v: 'dev_apos_dt', l: 'Devolução após entrega', c: '#b45309', bg: '#fffbeb', i: '📆' },
  { v: 'extravio', l: 'Extravio informado', c: '#7f1d1d', bg: '#fef2f2', i: '⛔' },
  { v: 'entregue', l: 'Entregue no CD', c: '#059669', bg: '#ecfdf5', i: '📦', hasDate: true },
  { v: 'ret_nao_auto', l: 'Retorno não autorizado', c: '#b91c1c', bg: '#fef2f2', i: '🚫' },
  { v: 'encaminhar', l: 'Converter para cobrança', c: '#dc2626', bg: '#fef2f2', i: '⚡' },
];

// Responsabilidade operacional
export const TK_INTERNAL = ['aguardando', 'notificado', 'retorno_auto', 'ret_nao_auto', 'perdeu_agenda', 'dev_recusada', 'dev_apos_dt', 'encaminhar'];
export const TK_TRANSPORT = ['em_transito', 'agendado', 'entregue', 'extravio'];

// Visibilidade do transportador
export const COBR_TRANSPORT_VISIBLE = ['cobr_tr', 'tr_contestou', 'tr_concordou', 'tr_nao_resp', 'emitida', 'cobrada', 'paga'];
export const COBR_TRANSPORT_ACTIONABLE = ['cobr_tr'];
export const COBR_TRANSPORT_RESPONSES = ['tr_contestou', 'tr_concordou', 'tr_nao_resp'];

export const LANC_TRANSPORT_VISIBLE = ['retorno_auto', 'em_transito', 'agendado', 'perdeu_agenda', 'dev_recusada', 'dev_apos_dt', 'extravio', 'entregue'];
export const LANC_TRANSPORT_ACTIONABLE = ['retorno_auto', 'em_transito', 'agendado', 'perdeu_agenda', 'extravio'];

// Finalizadores
export const COBR_FINALIZERS = ['emitida', 'cobrada', 'paga', 'cancelada'];
export const LANC_FINALIZERS = ['entregue', 'encaminhar', 'ret_nao_auto'];
export const LANC_MOVERS = ['encaminhar']; // move para cobrança, mantendo regra de entrada intacta
