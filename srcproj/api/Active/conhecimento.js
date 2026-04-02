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

function extractCTes(body) {
  /* Active sends: { "CTe": [ {...}, ... ] } */
  if (body && body.CTe && Array.isArray(body.CTe)) return body.CTe;
  if (body && body.Conhecimento && Array.isArray(body.Conhecimento)) return body.Conhecimento;
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
    const items = extractCTes(req.body);
    const results = [];

    for (const item of items) {
      /* Active CTe structure:
         DOCUMENTO: { NUMERO, SERIE, CHAVE, EMISSAO, OBSERVACAO }
         PRESTACAO: { CFOP, TOTAL_FRETE, VALOR_PRESTACAO, IMPOSTO: { BASE, VALOR, ALIQUOTA } }
         CARGA: { PESO, VOLUMES, VALOR, KM, M3 }
         TRANSPORTADOR, REMETENTE, DESTINATARIO, PAGADOR
         NOTAFISCAL: [ { NUMERO, SERIE, CHAVE, VALOR, PESO, VOLUMES } ]
      */
      const doc = item.DOCUMENTO || {};
      const prest = item.PRESTACAO || {};
      const carga = item.CARGA || {};
      const imp = prest.IMPOSTO || {};
      const transp = item.TRANSPORTADOR || {};
      const remet = item.REMETENTE || {};
      const dest = item.DESTINATARIO || {};
      const nfs = item.NOTAFISCAL || [];

      const numero = g(doc, 'NUMERO') || g(item, 'NUMERO', 'Numero', 'numero');
      const serie = g(doc, 'SERIE') || g(item, 'SERIE', 'Serie', 'serie');
      const chave = g(doc, 'CHAVE') || g(item, 'CHAVE', 'Chave_Eletronica', 'chave_nfe');
      const emissao = g(doc, 'EMISSAO') || g(item, 'EMISSAO', 'Data_Emissao');
      const obs = g(doc, 'OBSERVACAO') || g(item, 'Observacao', 'observacao');

      await sbInsert('active_webhooks', {
        tipo: 'conhecimento',
        source: 'active_onsupply',
        numero,
        serie,
        chave_nfe: chave,
        cfop: g(prest, 'CFOP') || g(item, 'CFOP', 'cfop'),
        data_emissao: emissao || null,
        data_entrega: g(item, 'ENTREGA', 'Data_Entrega') || null,
        valor_mercadoria: gn(carga, 'VALOR') || gn(item, 'VALOR', 'Valor_Mercadoria'),
        peso: gn(carga, 'PESO') || gn(item, 'PESO', 'Peso'),
        volumes: parseInt(g(carga, 'VOLUMES') || g(item, 'VOLUMES')) || 0,
        observacao: obs,
        valor_frete_total: gn(prest, 'TOTAL_FRETE', 'VALOR_PRESTACAO') || gn(item, 'VALOR_FRETE'),
        valor_frete: gn(prest, 'TOTAL_FRETE', 'VALOR_PRESTACAO'),
        imposto_valor: gn(imp, 'VALOR', 'Valor_Total'),
        imposto_aliquota: gn(imp, 'ALIQUOTA', 'Aliquota'),
        transportador_cnpj: g(transp, 'CNPJCPF'),
        transportador_nome: g(transp, 'RAZAOSOCIAL', 'FANTASIA'),
        remetente_cnpj: g(remet, 'CNPJCPF'),
        remetente_nome: g(remet, 'RAZAOSOCIAL', 'FANTASIA'),
        destinatario_cnpj: g(dest, 'CNPJCPF'),
        destinatario_nome: g(dest, 'RAZAOSOCIAL', 'FANTASIA'),
        notas_vinculadas: nfs.length > 0 ? nfs : null,
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
      Linha: i + 1, Tipo_Documento: 'Conhecimento de Transporte',
      Referencia: `CT-e: ${r.numero}`, Campo_Relacionado: '',
      Erro: false, Informacao_Complementar: {},
    })));
  } catch (err) {
    try { await sbInsert('active_webhooks', { tipo: 'conhecimento_erro', source: 'active_onsupply', payload_raw: req.body || 'empty', observacao: err.message }); } catch {}
    return res.status(200).json([{ Guid_Processamento: `error-${Date.now()}`, Chave_Cliente: 'LINEA_PORTAL', Inicio_Processamento: new Date().toISOString(), Termino_Processamento: new Date().toISOString(), Tempo_Processamento: '00:00:00.000', Codigo: '999', Mensagem: `Erro: ${err.message}`, Linha: 1, Tipo_Documento: 'Conhecimento de Transporte', Referencia: '', Campo_Relacionado: '', Erro: true, Informacao_Complementar: {} }]);
  }
}
