import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
  'content-type': 'application/json',
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: corsHeaders })
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const publishableKey = Deno.env.get('SB_PUBLISHABLE_KEY') || Deno.env.get('SUPABASE_ANON_KEY')!
  const authHeader = req.headers.get('Authorization') || ''
  const token = authHeader.replace(/^Bearer\s+/i, '').trim()

  if (!token) return json({ error: 'Token ausente.' }, 401)

  // Client only for validating the caller token / claims
  const authClient = createClient(supabaseUrl, publishableKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  // Admin client only for auth.admin operations
  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  // Prefer getClaims for projects with asymmetric JWT signing keys (ES256/RSA)
  const { data: claimsData, error: claimsError } = await authClient.auth.getClaims(token)
  if (claimsError || !claimsData?.claims) {
    return json({ error: 'Não foi possível validar o usuário autenticado.' }, 401)
  }

  const claims = claimsData.claims as Record<string, unknown>
  const role = String((claims.app_metadata as Record<string, unknown> | undefined)?.role || (claims.user_metadata as Record<string, unknown> | undefined)?.role || 'internal')
  if (!['admin', 'internal'].includes(role)) {
    return json({ error: 'Apenas administradores podem gerenciar usuários.' }, 403)
  }

  try {
    if (req.method === 'GET') {
      const { data, error } = await adminClient.auth.admin.listUsers({ page: 1, perPage: 1000 })
      if (error) return json({ error: error.message }, 400)
      return json({ users: data?.users || [] })
    }

    if (req.method === 'POST') {
      const body = await req.json()
      const { email, password, name, role, transportador, forcePwChange } = body || {}
      if (!email || !password || !name || !role) return json({ error: 'Campos obrigatórios: email, password, name, role.' }, 400)
      const { data, error } = await adminClient.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          name,
          transportador: transportador || '',
          pw_changed: forcePwChange ? false : true,
        },
        app_metadata: {
          role,
          transportador: transportador || '',
        },
      })
      if (error) return json({ error: error.message }, 400)
      return json({ user: data.user })
    }

    if (req.method === 'PUT') {
      const body = await req.json()
      const { userId, email, password, name, role, transportador, forcePwChange } = body || {}
      if (!userId || !email || !name || !role) return json({ error: 'Campos obrigatórios: userId, email, name, role.' }, 400)

      const { data: currentData, error: currentError } = await adminClient.auth.admin.getUserById(userId)
      if (currentError || !currentData?.user) return json({ error: currentError?.message || 'Usuário não encontrado.' }, 404)

      const currentUser = currentData.user
      const nextUserMeta = {
        ...(currentUser.user_metadata || {}),
        name,
        transportador: transportador || '',
        pw_changed: forcePwChange ? false : (currentUser.user_metadata?.pw_changed ?? true),
      }
      const nextAppMeta = {
        ...(currentUser.app_metadata || {}),
        role,
        transportador: transportador || '',
      }

      const updatePayload: Record<string, unknown> = {
        email,
        user_metadata: nextUserMeta,
        app_metadata: nextAppMeta,
      }
      if (password) updatePayload.password = password

      const { data, error } = await adminClient.auth.admin.updateUserById(userId, updatePayload)
      if (error) return json({ error: error.message }, 400)
      return json({ user: data.user })
    }

    if (req.method === 'DELETE') {
      const body = await req.json()
      const { userId } = body || {}
      if (!userId) return json({ error: 'Informe userId.' }, 400)
      const { error } = await adminClient.auth.admin.deleteUser(userId)
      if (error) return json({ error: error.message }, 400)
      return json({ ok: true })
    }

    return json({ error: 'Método não suportado.' }, 405)
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Falha inesperada.'
    return json({ error: message }, 500)
  }
})
