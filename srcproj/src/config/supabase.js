import { supabase, SB_URL, SB_KEY } from './constants';

// ── Sync auth token with supabase client ──
// The portal handles auth manually (fetch), but the supabase-js client
// needs the token too for RLS-protected writes to work.
export function syncAuthToken() {
  const token = localStorage.getItem('sb_token');
  const refresh = localStorage.getItem('sb_refresh');
  if (token && refresh) {
    supabase.auth.setSession({ access_token: token, refresh_token: refresh }).catch(() => {});
  }
}

async function safeQuery(promise, fallback = null) {
  try {
    const { data, error } = await promise;
    if (error) {
      console.warn('Supabase warning:', error.message || error);
      // If auth error, try syncing token and retry once
      if (error.message?.includes('JWT') || error.message?.includes('auth') || error.code === 'PGRST301') {
        syncAuthToken();
      }
      return fallback;
    }
    return data ?? fallback;
  } catch (e) {
    console.warn('Supabase catch:', e.message);
    return fallback;
  }
}

export async function dbLoad() {
  syncAuthToken();
  const data = await safeQuery(supabase.from('portal_data').select('*').eq('id', 1).single(), {});
  return data || {};
}

export async function dbSave(portalData) {
  syncAuthToken();
  await safeQuery(supabase.from('portal_data').upsert({ id: 1, data: portalData, updated_at: new Date().toISOString() }), null);
}

export async function dbLoadStatuses() {
  syncAuthToken();
  const data = await safeQuery(supabase.from('portal_statuses').select('*'), []);
  const map = {};
  (data || []).forEach(r => { map[r.key] = r.status; });
  return map;
}

export async function dbSaveStatus(key, status) {
  syncAuthToken();
  await safeQuery(supabase.from('portal_statuses').upsert({ key, status }), null);
}

export async function dbLoadHistory() {
  syncAuthToken();
  return await safeQuery(supabase.from('portal_history').select('*').order('created_at', { ascending: false }), []);
}

export async function dbAddHistory(entry) {
  syncAuthToken();
  await safeQuery(supabase.from('portal_history').insert(entry), null);
}

export async function dbLoadExtras() {
  syncAuthToken();
  const data = await safeQuery(supabase.from('portal_extras').select('*'), []);
  const map = {};
  (data || []).forEach(r => { map[r.key] = r.value; });
  return map;
}

export async function dbSaveExtra(key, value) {
  syncAuthToken();
  const result = await safeQuery(supabase.from('portal_extras').upsert({ key, value }), null);
  if (result === null) {
    // Fallback: try direct fetch with auth header
    try {
      const token = localStorage.getItem('sb_token');
      const res = await fetch(`${SB_URL}/rest/v1/portal_extras?on_conflict=key`, {
        method: 'POST',
        headers: {
          'apikey': SB_KEY,
          'Authorization': `Bearer ${token || SB_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'resolution=merge-duplicates',
        },
        body: JSON.stringify({ key, value }),
      });
      if (!res.ok) console.warn('dbSaveExtra fallback failed:', await res.text());
    } catch (e) {
      console.warn('dbSaveExtra fallback error:', e.message);
    }
  }
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
  // Sync token to supabase-js client immediately
  if (d.access_token && d.refresh_token) {
    supabase.auth.setSession({ access_token: d.access_token, refresh_token: d.refresh_token }).catch(() => {});
  }
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
  // Sync refreshed token
  if (d.access_token && d.refresh_token) {
    supabase.auth.setSession({ access_token: d.access_token, refresh_token: d.refresh_token }).catch(() => {});
  }
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
  syncAuthToken();
  return await safeQuery(supabase.from('portal_profiles').select('*').eq('role', role).single(), null);
}

export async function dbLoadNoteMeta() {
  syncAuthToken();
  const data = await safeQuery(supabase.from('portal_note_meta').select('*'), []);
  const map = {};
  (data || []).forEach(r => { map[r.nf_key] = r; });
  return map;
}

export async function dbSaveNoteMeta(nfKey, meta) {
  syncAuthToken();
  const payload = { nf_key: nfKey, ...meta, updated_at: new Date().toISOString() };
  await safeQuery(supabase.from('portal_note_meta').upsert(payload), null);
  return payload;
}

export async function dbLoadNotifications(userEmail) {
  syncAuthToken();
  return await safeQuery(
    supabase.from('portal_notifications').select('*').eq('destinatario', userEmail).order('created_at', { ascending: false }),
    []
  );
}

export async function dbMarkNotificationRead(id) {
  syncAuthToken();
  await safeQuery(supabase.from('portal_notifications').update({ lido: true }).eq('id', id), null);
}

export async function dbCreateNotification(payload) {
  syncAuthToken();
  await safeQuery(supabase.from('portal_notifications').insert(payload), null);
}

export async function dbLoadAudit() {
  syncAuthToken();
  return await safeQuery(supabase.from('portal_audit').select('*').order('created_at', { ascending: false }), []);
}

export async function dbAddAudit(payload) {
  syncAuthToken();
  await safeQuery(supabase.from('portal_audit').insert(payload), null);
}

export async function dbLoadSla() {
  syncAuthToken();
  const data = await safeQuery(supabase.from('portal_sla').select('*'), []);
  const map = {};
  (data || []).forEach(r => { map[r.etapa] = r; });
  return map;
}

export async function dbLoadKpiSnapshots() {
  syncAuthToken();
  return await safeQuery(
    supabase.from('portal_kpi_snapshots').select('*').order('mes', { ascending: false }).limit(12),
    []
  );
}

export async function dbLoadConfig() {
  syncAuthToken();
  const data = await safeQuery(supabase.from('portal_config').select('*'), []);
  const map = {};
  (data || []).forEach(r => { map[r.key] = r.value; });
  return map;
}

export async function dbSaveConfig(key, value) {
  syncAuthToken();
  await safeQuery(supabase.from('portal_config').upsert({ key, value, updated_at: new Date().toISOString() }), null);
}

export async function dbGetLastGithubSignal() {
  syncAuthToken();
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
