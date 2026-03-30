export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  res.setHeader('Access-Control-Allow-Origin', '*');

  try {
    const { to, cc = [], subject, html } = req.body;

    if (!to || !to.length) {
      return res.status(400).json({ error: 'Destinatário obrigatório' });
    }

    const apiKey    = process.env.BREVO_API_KEY;
    const fromEmail = process.env.FROM_EMAIL;
    const fromName  = process.env.FROM_NAME || 'Linea Alimentos - Devoluções';

    if (!apiKey || !fromEmail) {
      return res.status(500).json({ error: 'Variáveis de ambiente não configuradas' });
    }

    const payload = {
      sender: { name: fromName, email: fromEmail },
      to: (Array.isArray(to) ? to : [to]).map(email => ({ email: String(email).trim() })),
      subject,
      htmlContent: html,
    };

    if (cc && cc.length > 0) {
      payload.cc = cc.map(e => ({ email: String(e).trim() })).filter(e => e.email);
    }

    const brevoRes = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'api-key': apiKey,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = await brevoRes.json();

    if (!brevoRes.ok) {
      return res.status(brevoRes.status).json({ error: data.message || 'Falha ao enviar email' });
    }

    return res.status(200).json({ ok: true, messageId: data.messageId });
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Erro interno' });
  }
}
