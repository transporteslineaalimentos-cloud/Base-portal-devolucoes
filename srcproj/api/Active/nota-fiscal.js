const SB_URL = 'https://opcrtjdnpgqcjlksofjw.supabase.co';
const SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9wY3J0amRucGdxY2psa3NvZmp3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ0NTMwODYsImV4cCI6MjA5MDAyOTA4Nn0.ojJMzaInCSD4mrZEWrU1d9ziDVyIcp7NRm6RHx2uTGA';

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

function extractNFs(body) {
  if (body && body.NotaFiscal && Array.isArray(body.NotaFiscal)) return body.NotaFiscal;
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
    const items = extractNFs(req.body);
    const results = [];

    for (const item of items) {
      const numero = g(item, 'NUMERO', 'Numero', 'numero');
      const serie = g(item, 'SERIE', 'Serie', 'serie');
      const chave = g(item, 'CHAVE', 'Chave_Eletronica', 'chave_nfe') || (item.Chave_Eletronica?.Chave_Eletronica || '');
      const transp = item.TRANSPORTADOR || item.Transportador || {};
      const remet = item.REMETENTE || item.Remetente || {};
      const dest = item.DESTINATARIO || item.Destinatario || {};

      const emissaoRaw = g(item, 'EMISSAO', 'Data_Emissao', 'data_emissao');
      const previsaoRaw = g(item, 'PREVISAO', 'Data_Previsao', 'data_previsao');
      const entregaRaw = g(item, 'ENTREGA', 'Data_Entrega', 'data_entrega');

      await sbInsert('active_webhooks', {
        tipo: 'nota_fiscal',
        source: 'active_onsupply',
        numero,
        serie,
        chave_nfe: chave,
        cfop: g(item, 'CFOP', 'cfop'),
        data_emissao: emissaoRaw || null,
        data_previsao: previsaoRaw || null,
        data_entrega: entregaRaw || null,
        valor_mercadoria: gn(item, 'VALOR', 'Valor_Mercadoria', 'valor_mercadoria'),
        peso: gn(item, 'PESO', 'Peso', 'peso'),
        volumes: parseInt(g(item, 'VOLUMES', 'Quantidade_Volumes', 'volumes')) || 0,
        natureza_operacao: g(item, 'OPERACAO_FISCAL', 'Natureza_Operacao', 'natureza_operacao'),
        pedido: g(item, 'PEDIDO', 'Pedido', 'pedido'),
        transportador_cnpj: g(transp, 'CNPJCPF', 'CnpjCpf', 'cnpjcpf'),
        transportador_nome: g(transp, 'RAZAOSOCIAL', 'RazaoSocial', 'razaosocial', 'FANTASIA'),
        remetente_cnpj: g(remet, 'CNPJCPF', 'CnpjCpf', 'cnpjcpf'),
        remetente_nome: g(remet, 'RAZAOSOCIAL', 'RazaoSocial', 'razaosocial', 'FANTASIA'),
        destinatario_cnpj: g(dest, 'CNPJCPF', 'CnpjCpf', 'cnpjcpf'),
        destinatario_nome: g(dest, 'RAZAOSOCIAL', 'RazaoSocial', 'razaosocial', 'FANTASIA'),
        observacao: g(item, 'Observacao', 'observacao', 'CENTRO_CUSTO'),
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
      Linha: i + 1, Tipo_Documento: 'Nota Fiscal',
      Referencia: `NF: ${r.numero}`, Campo_Relacionado: '',
      Erro: false, Informacao_Complementar: {},
    })));
  } catch (err) {
    try { await sbInsert('active_webhooks', { tipo: 'nota_fiscal_erro', source: 'active_onsupply', payload_raw: req.body || "empty", observacao: err.message }); } catch {}
    return res.status(200).json([{ Guid_Processamento: `error-${Date.now()}`, Chave_Cliente: 'LINEA_PORTAL', Inicio_Processamento: new Date().toISOString(), Termino_Processamento: new Date().toISOString(), Tempo_Processamento: '00:00:00.000', Codigo: '999', Mensagem: `Erro: ${err.message}`, Linha: 1, Tipo_Documento: 'Nota Fiscal', Referencia: '', Campo_Relacionado: '', Erro: true, Informacao_Complementar: {} }]);
  }
}
