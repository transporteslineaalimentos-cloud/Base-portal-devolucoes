// Vercel Serverless Function
// Recebe webhook do Active onSupply — Importação de Nota Fiscal
// Layout: API_NOTAFISCAL_IMPORTACAO_V000
// Encaminha para a Supabase Edge Function que faz o cruzamento com o portal

const EDGE_URL = 'https://opcrtjdnpgqcjlksofjw.supabase.co/functions/v1/active-onsupply';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido' });

  try {
    const body = req.body ?? {};

    // Adiciona o tipo correto para o processador identificar que é uma NF
    const payload = { ...body, tipo: 'nota_fiscal' };

    const sbRes = await fetch(EDGE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const data = await sbRes.json().catch(() => ({}));

    if (!sbRes.ok) {
      console.error('[active/nota-fiscal] Edge error:', JSON.stringify(data));
      return res.status(sbRes.status).json(data);
    }

    return res.status(200).json(data);
  } catch (err) {
    console.error('[active/nota-fiscal]', err.message);
    return res.status(500).json({ error: err.message });
  }
}
