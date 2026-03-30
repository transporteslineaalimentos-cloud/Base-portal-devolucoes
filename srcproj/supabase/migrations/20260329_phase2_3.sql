-- Portal de Devoluções - Fase 2/3

create table if not exists portal_note_meta (
  nf_key text primary key,
  prioridade text default 'media',
  responsavel text,
  proxima_acao text,
  motivo_bloqueio text,
  cobrar_transportador boolean,
  retorno_autorizado boolean,
  aguardando_documento boolean default false,
  sla_inicio timestamp,
  sla_limite timestamp,
  created_at timestamp default now(),
  updated_at timestamp default now()
);

create table if not exists portal_sla (
  etapa text primary key,
  prazo_horas int not null,
  alerta_percentual int default 80,
  ativo boolean default true
);

insert into portal_sla (etapa, prazo_horas, alerta_percentual, ativo)
values
  ('pendente', 72, 80, true),
  ('validado', 48, 80, true),
  ('cobr_tr', 120, 80, true),
  ('aguardando', 72, 80, true),
  ('notificado', 48, 80, true),
  ('retorno_auto', 168, 80, true),
  ('em_transito', 168, 80, true)
on conflict (etapa) do update set prazo_horas = excluded.prazo_horas, alerta_percentual = excluded.alerta_percentual, ativo = excluded.ativo;

create table if not exists portal_audit (
  id bigint generated always as identity primary key,
  nf_key text,
  usuario text not null,
  perfil text not null,
  acao text not null,
  campo text,
  valor_anterior text,
  valor_novo text,
  observacao text,
  origem text default 'manual',
  ip text,
  user_agent text,
  session_id text,
  created_at timestamp default now()
);

create table if not exists portal_notifications (
  id bigint generated always as identity primary key,
  destinatario text not null,
  tipo text not null,
  titulo text not null,
  mensagem text,
  nf_key text,
  lido boolean default false,
  link text,
  created_at timestamp default now()
);

create table if not exists portal_profiles (
  role text primary key,
  nome text not null,
  tabs text[] not null,
  can_edit_cobr boolean default false,
  can_edit_lanc boolean default false,
  can_import boolean default false,
  can_export boolean default true,
  can_email boolean default false,
  can_emit_nf boolean default false,
  note_filter jsonb
);

insert into portal_profiles(role, nome, tabs, can_edit_cobr, can_edit_lanc, can_import, can_export, can_email, can_emit_nf, note_filter)
values
  ('admin', 'Administrador', array['dashboard','cobranca','lancamento','nfDebito','transportadores','aging','historico','auditoria'], true, true, true, true, true, true, null),
  ('transporte', 'Transporte', array['dashboard','lancamento','aging'], false, true, false, true, false, false, '{"area":"TRANSPORTE"}'::jsonb),
  ('controladoria', 'Controladoria', array['dashboard','cobranca','nfDebito','historico'], true, false, false, true, true, true, null),
  ('logistica_reversa', 'Logística Reversa', array['dashboard','lancamento','aging'], false, true, false, true, false, false, '{"area":"LOGÍSTICA REVERSA"}'::jsonb),
  ('comercial', 'Comercial', array['dashboard'], false, false, false, true, false, false, null),
  ('transportador', 'Transportador', array['tr_dash','tr_retorno','tr_cobranca'], false, false, false, false, false, false, null)
on conflict (role) do update set
  nome = excluded.nome,
  tabs = excluded.tabs,
  can_edit_cobr = excluded.can_edit_cobr,
  can_edit_lanc = excluded.can_edit_lanc,
  can_import = excluded.can_import,
  can_export = excluded.can_export,
  can_email = excluded.can_email,
  can_emit_nf = excluded.can_emit_nf,
  note_filter = excluded.note_filter;
