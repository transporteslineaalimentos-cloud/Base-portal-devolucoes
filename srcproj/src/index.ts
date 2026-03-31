import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'content-type': 'application/json',
}

function fmt(v: number) {
  return 'R$ ' + v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function esc(s: string) {
  if (!s) return ''
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const body = await req.json()
    const { nf_key, tr_emails, tr_name, valor, motivo, nfd, nfo, cliente } = body

    if (!tr_emails) {
      return new Response(JSON.stringify({ ok: false, reason: 'no_emails' }), { status: 200, headers: corsHeaders })
    }

    const BREVO_API_KEY = Deno.env.get('BREVO_API_KEY')
    const FROM_EMAIL    = Deno.env.get('FROM_EMAIL') || 'noreply@lineaalimentos.com.br'
    const FROM_NAME     = Deno.env.get('FROM_NAME')  || 'Linea Alimentos — Devoluções'

    if (!BREVO_API_KEY) {
      console.warn('[auto-notify] BREVO_API_KEY não configurada')
      return new Response(JSON.stringify({ ok: false, reason: 'no_api_key' }), { status: 200, headers: corsHeaders })
    }

    const toList = tr_emails
      .split(';')
      .map((e: string) => e.trim())
      .filter(Boolean)
      .map((email: string) => ({ email }))

    if (!toList.length) {
      return new Response(JSON.stringify({ ok: false, reason: 'empty_email_list' }), { status: 200, headers: corsHeaders })
    }

    const html = `
      <div style="font-family:Segoe UI,Arial,sans-serif;color:#1f2937;max-width:600px">
        <div style="background:#1a2744;padding:20px 24px;border-radius:8px 8px 0 0">
          <div style="font-size:20px;font-weight:800;color:#fff;font-style:italic">LINEA</div>
          <div style="font-size:10px;color:rgba(255,255,255,0.6);letter-spacing:3px">ALIMENTOS</div>
        </div>
        <div style="padding:24px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px">
          <h2 style="color:#1a365d;margin:0 0 12px;font-size:16px">Notificação de Débito — Posição Solicitada</h2>
          <p style="margin:0 0 16px;color:#374151">Prezado(a) <strong>${esc(tr_name || 'Transportador')}</strong>,</p>
          <p style="margin:0 0 16px;color:#374151">
            Foi registrada uma ocorrência de devolução em nosso portal que requer o seu posicionamento.
          </p>
          <table style="width:100%;border-collapse:collapse;font-size:13px;margin-bottom:16px">
            <tr style="background:#f8fafc"><th style="padding:8px 12px;text-align:left;color:#6b7280;border-bottom:1px solid #e5e7eb">Campo</th><th style="padding:8px 12px;text-align:left;color:#6b7280;border-bottom:1px solid #e5e7eb">Dados</th></tr>
            <tr><td style="padding:8px 12px;border-bottom:1px solid #f3f4f6;color:#6b7280">NFD</td><td style="padding:8px 12px;border-bottom:1px solid #f3f4f6;font-weight:600">${esc(nfd || '—')}</td></tr>
            <tr><td style="padding:8px 12px;border-bottom:1px solid #f3f4f6;color:#6b7280">NFO</td><td style="padding:8px 12px;border-bottom:1px solid #f3f4f6;font-weight:600">${esc(nfo || '—')}</td></tr>
            <tr><td style="padding:8px 12px;border-bottom:1px solid #f3f4f6;color:#6b7280">Cliente</td><td style="padding:8px 12px;border-bottom:1px solid #f3f4f6">${esc(cliente || '—')}</td></tr>
            <tr><td style="padding:8px 12px;border-bottom:1px solid #f3f4f6;color:#6b7280">Motivo</td><td style="padding:8px 12px;border-bottom:1px solid #f3f4f6;color:#dc2626">${esc(motivo || '—')}</td></tr>
            <tr><td style="padding:8px 12px;color:#6b7280">Valor</td><td style="padding:8px 12px;font-weight:700;color:#1a365d">${fmt(valor || 0)}</td></tr>
          </table>
          <div style="background:#fffbeb;border-left:3px solid #d97706;padding:12px 16px;border-radius:4px;font-size:13px;color:#374151;margin-bottom:16px">
            <strong>Ação necessária:</strong> Acesse o portal de devoluções e informe se aprova, contesta ou declina a responsabilidade por esta cobrança.
          </div>
          <p style="margin:0;color:#6b7280;font-size:12px">Atenciosamente,<br/><strong style="color:#1a365d">Linea Alimentos — Transportes</strong></p>
        </div>
      </div>
    `

    const subject = `[Linea Alimentos] Cobrança aguarda seu posicionamento — ${nfd || nfo || nf_key}`

    const brevoRes = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'api-key': BREVO_API_KEY,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        sender: { name: FROM_NAME, email: FROM_EMAIL },
        to: toList,
        subject,
        htmlContent: html,
      }),
    })

    const data = await brevoRes.json()

    if (!brevoRes.ok) {
      console.error('[auto-notify] Brevo error:', data)
      return new Response(JSON.stringify({ ok: false, error: data.message }), { status: 200, headers: corsHeaders })
    }

    return new Response(JSON.stringify({ ok: true, messageId: data.messageId }), { headers: corsHeaders })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erro inesperado'
    console.error('[auto-notify]', msg)
    return new Response(JSON.stringify({ ok: false, error: msg }), { status: 200, headers: corsHeaders })
  }
})
