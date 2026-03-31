import { supabase, SB_URL, SB_KEY } from './constants';

async function safeQuery(promise, fallback = null) {
  try {
    const { data, error } = await promise;
    if (error) {
      console.warn('Supabase warning:', error.message || error);
      return fallback;
    }
    return data ?? fallback;
  } catch (e) {
    console.warn('Supabase catch:', e.message);
    return fallback;
  }
}

export async function dbLoad() {
  const data = await safeQuery(supabase.from('portal_data').select('*').eq('id', 1).single(), {});
  return data || {};
}

export async function dbSave(portalData) {
  await safeQuery(supabase.from('portal_data').upsert({ id: 1, data: portalData, updated_at: new Date().toISOString() }), null);
}

export async function dbLoadStatuses() {
  const data = await safeQuery(supabase.from('portal_statuses').select('*'), []);
  const map = {};
  (data || []).forEach(r => { map[r.key] = r.status; });
  return map;
}

export async function dbSaveStatus(key, status) {
  await safeQuery(supabase.from('portal_statuses').upsert({ key, status }), null);
}

export async function dbLoadHistory() {
  return await safeQuery(supabase.from('portal_history').select('*').order('created_at', { ascending: false }), []);
}

export async function dbAddHistory(entry) {
  await safeQuery(supabase.from('portal_history').insert(entry), null);
}

export async function dbLoadExtras() {
  const data = await safeQuery(supabase.from('portal_extras').select('*'), []);
  const map = {};
  (data || []).forEach(r => { map[r.key] = r.value; });
  return map;
}

export async function dbSaveExtra(key, value) {
  await safeQuery(supabase.from('portal_extras').upsert({ key, value }), null);
}

export async function uploadPdf(name, file) {
  const path = 'nf-debito/' + name.replace(/[^a-zA-Z0-9_-]/g, '_') + '.' + file.name.split('.').pop();
  const token = localStorage.getItem('sb_token');
  const res = await fetch(SB_URL + '/storage/v1/object/attachments/' + path, {
    method: 'POST',
    headers: {
      'apikey': SB_KEY,
      'Authorization': token ? 'Bearer ' + token : `Bearer ${SB_KEY}`,
      'Content-Type': file.type || 'application/pdf',
      'x-upsert': 'true'
    },
    body: file
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error('Falha ao subir PDF: ' + txt);
  }
  return SB_URL + '/storage/v1/object/public/attachments/' + path;
}

export async function login(email, password) {
  const res = await fetch(SB_URL + '/auth/v1/token?grant_type=password', {
    method: 'POST',
    headers: { 'apikey': SB_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  const d = await res.json();
  if (d.error) throw new Error(d.error_description || d.error);
  if (!d.user) throw new Error('Resposta inválida');
  return { token: d.access_token, refresh: d.refresh_token, user: d.user };
}

export async function refreshToken(token) {
  const refresh = localStorage.getItem('sb_refresh');
  if (!refresh) return null;
  const res = await fetch(SB_URL + '/auth/v1/token?grant_type=refresh_token', {
    method: 'POST',
    headers: { 'apikey': SB_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh_token: refresh })
  });
  const d = await res.json();
  if (d.error) return null;
  return { token: d.access_token, refresh: d.refresh_token, user: d.user };
}

export async function changePassword(token, newPassword) {
  const res = await fetch(SB_URL + '/auth/v1/user', {
    method: 'PUT',
    headers: { 'apikey': SB_KEY, 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' },
    body: JSON.stringify({ password: newPassword, data: { pw_changed: true } })
  });
  const d = await res.json();
  if (d.error) throw new Error(d.error_description || d.error);
  return d;
}

// ===== Fase 3 / tabelas novas =====

export async function dbLoadProfile(role) {
  return await safeQuery(supabase.from('portal_profiles').select('*').eq('role', role).single(), null);
}

export async function dbLoadNoteMeta() {
  const data = await safeQuery(supabase.from('portal_note_meta').select('*'), []);
  const map = {};
  (data || []).forEach(r => { map[r.nf_key] = r; });
  return map;
}

export async function dbSaveNoteMeta(nfKey, meta) {
  const payload = { nf_key: nfKey, ...meta, updated_at: new Date().toISOString() };
  await safeQuery(supabase.from('portal_note_meta').upsert(payload), null);
  return payload;
}

export async function dbLoadNotifications(userEmail) {
  return await safeQuery(
    supabase.from('portal_notifications').select('*').eq('destinatario', userEmail).order('created_at', { ascending: false }),
    []
  );
}

export async function dbMarkNotificationRead(id) {
  await safeQuery(supabase.from('portal_notifications').update({ lido: true }).eq('id', id), null);
}

export async function dbCreateNotification(payload) {
  await safeQuery(supabase.from('portal_notifications').insert(payload), null);
}

export async function dbLoadAudit() {
  return await safeQuery(supabase.from('portal_audit').select('*').order('created_at', { ascending: false }), []);
}

export async function dbAddAudit(payload) {
  await safeQuery(supabase.from('portal_audit').insert(payload), null);
}

export async function dbLoadSla() {
  const data = await safeQuery(supabase.from('portal_sla').select('*'), []);
  const map = {};
  (data || []).forEach(r => { map[r.etapa] = r; });
  return map;
}


// ─── KPI SNAPSHOTS ──────────────────────────────────
export async function dbLoadKpiSnapshots() {
  return await safeQuery(
    supabase.from('portal_kpi_snapshots').select('*').order('mes', { ascending: false }).limit(12),
    []
  );
}

// ─── CONFIGURAÇÕES DO PORTAL ────────────────────────
export async function dbLoadConfig() {
  const data = await safeQuery(supabase.from('portal_config').select('*'), []);
  const map = {};
  (data || []).forEach(r => { map[r.key] = r.value; });
  return map;
}
export async function dbSaveConfig(key, value) {
  await safeQuery(supabase.from('portal_config').upsert({ key, value, updated_at: new Date().toISOString() }), null);
}

// ─── SIGNALS (webhook GitHub → auto-refresh) ────────
export async function dbGetLastGithubSignal() {
  return await safeQuery(
    supabase.from('portal_signals')
      .select('created_at, payload')
      .eq('tipo', 'github_push')
      .order('created_at', { ascending: false })
      .limit(1)
      .single(),
    null
  );
}

// ─── AUTO-NOTIFICAÇÃO AO TRANSPORTADOR ──────────────
// Chamada quando status muda para cobr_tr
export async function notifyTransporter({ nf_key, tr_emails, tr_name, valor, motivo, nfd, nfo, cliente }) {
  if (!tr_emails) return;
  try {
    const token = localStorage.getItem('sb_token');
    await fetch(`${SB_URL}/functions/v1/auto-notify-transporter`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SB_KEY,
        ...(token ? { 'Authorization': 'Bearer ' + token } : {})
      },
      body: JSON.stringify({ nf_key, tr_emails, tr_name, valor, motivo, nfd, nfo, cliente })
    });
  } catch (e) {
    console.warn('[notifyTransporter]', e.message);
  }
}

async function parseAdminResponse(res) {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || data?.message || 'Falha na operação administrativa.');
  return data;
}

async function adminUsersRequest(method, payload = null, query = '') {
  const token = localStorage.getItem('sb_token');
  const res = await fetch(`${SB_URL}/functions/v1/admin-users${query}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'apikey': SB_KEY,
      ...(token ? { 'Authorization': 'Bearer ' + token } : {}),
    },
    body: payload ? JSON.stringify(payload) : undefined,
  });
  return await parseAdminResponse(res);
}

export async function adminListUsers() {
  const data = await adminUsersRequest('GET');
  return data.users || [];
}

export async function adminCreateUser(payload) {
  return await adminUsersRequest('POST', payload);
}

export async function adminUpdateUser(userId, payload) {
  return await adminUsersRequest('PUT', { userId, ...payload });
}

export async function adminDeleteUser(userId) {
  return await adminUsersRequest('DELETE', { userId });
}
