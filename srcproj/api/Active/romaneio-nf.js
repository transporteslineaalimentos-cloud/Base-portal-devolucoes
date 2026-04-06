const SB_URL = process.env.SUPABASE_URL;
const SB_KEY = process.env.SUPABASE_ANON_KEY;

async function sbInsert(table, payload) {
  const res = await fetch(`${SB_URL}/rest/v1/${table}`, {
    method: 'POST',
    headers: { 'apikey': SB_KEY, 'Authorization': `Bearer ${SB_KEY}`, 'Content-Type': 'application/json', 'Prefer': 'return=minimal' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) console.error(`[sb:${table}]`, res.status, await res.text());
  return res.ok;
}

function g(obj, ...keys) {
  if (!obj) return '';
  for (const k of keys) {
    if (obj[k] !== undefined && obj[k] !== null) return obj[k];
  }
  return '';
}

function gn(obj, ...keys) {
  const v = g(obj, ...keys);
  return v === '' || v === null ? 0 : Number(v) || 0;
}

function extractItems(body) {
  for (const key of Object.keys(body || {})) {
    if (Array.isArray(body[key]) && body[key].length > 0 && typeof body[key][0] === 'object') {
      return body[key];
    }
  }
  if (Array.isArray(body)) return body;
  return [body];
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const items = extractItems(req.body);
    const results = [];

    for (const item of items) {
      const transp = item.TRANSPORTADOR || {};
      const remet = item.REMETENTE || {};
      const dest = item.DESTINATARIO || {};

      const numero = g(item, 'NUMERO', 'Numero', 'numero');
      const serie = g(item, 'SERIE', 'Serie', 'serie');
      const chave = g(item, 'CHAVE', 'Chave_Eletronica', 'chave_nfe');

      await sbInsert('active_webhooks', {
        tipo: 'romaneio_nf',
        source: 'active_onsupply',
        numero,
        serie,
        chave_nfe: chave,
        cfop: g(item, 'CFOP', 'cfop'),
        data_emissao: g(item, 'EMISSAO', 'Data_Emissao') || null,
        data_previsao: g(item, 'PREVISAO', 'Data_Previsao') || null,
        valor_mercadoria: gn(item, 'VALOR', 'Valor_Mercadoria'),
        peso: gn(item, 'PESO', 'Peso'),
        volumes: parseInt(g(item, 'VOLUMES', 'Quantidade_Volumes')) || 0,
        natureza_operacao: g(item, 'OPERACAO_FISCAL', 'Natureza_Operacao'),
        pedido: g(item, 'PEDIDO', 'Pedido'),
        transportador_cnpj: g(transp, 'CNPJCPF'),
        transportador_nome: g(transp, 'RAZAOSOCIAL', 'FANTASIA'),
        remetente_cnpj: g(remet, 'CNPJCPF'),
        remetente_nome: g(remet, 'RAZAOSOCIAL', 'FANTASIA'),
        destinatario_cnpj: g(dest, 'CNPJCPF'),
        destinatario_nome: g(dest, 'RAZAOSOCIAL', 'FANTASIA'),
        observacao: g(item, 'OBSERVACAO', 'Observacao', 'CENTRO_CUSTO'),
        payload_raw: item,
      });
      results.push({ numero, status: 'ok' });
    }

    return res.status(200).json(results.map((r, i) => ({
      Guid_Processamento: `${Date.now()}-${i}`,
      Chave_Cliente: 'LINEA_PORTAL',
      Inicio_Processamento: new Date().toISOString(),
      Termino_Processamento: new Date().toISOString(),
      Tempo_Processamento: '00:00:00.001',
      Codigo: '000', Mensagem: 'Processado com Sucesso',
      Linha: i + 1, Tipo_Documento: 'Romaneio NF',
      Referencia: `Romaneio NF: ${r.numero}`, Campo_Relacionado: '',
      Erro: false, Informacao_Complementar: {},
    })));
  } catch (err) {
    try { await sbInsert('active_webhooks', { tipo: 'romaneio_nf_erro', source: 'active_onsupply', payload_raw: req.body || 'empty', observacao: err.message }); } catch {}
    return res.status(200).json([{ Guid_Processamento: `error-${Date.now()}`, Chave_Cliente: 'LINEA_PORTAL', Inicio_Processamento: new Date().toISOString(), Termino_Processamento: new Date().toISOString(), Tempo_Processamento: '00:00:00.000', Codigo: '999', Mensagem: `Erro: ${err.message}`, Linha: 1, Tipo_Documento: 'Romaneio NF', Referencia: '', Campo_Relacionado: '', Erro: true, Informacao_Complementar: {} }]);
  }
}
