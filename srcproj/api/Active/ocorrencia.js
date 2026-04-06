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

function extractItems(body) {
  /* Active pode enviar em diversos formatos - tentamos todos */
  if (body && body.Ocorrencia && Array.isArray(body.Ocorrencia)) return { items: body.Ocorrencia, subtipo: 'geral' };
  if (body && body.OcorrenciaEntrega && Array.isArray(body.OcorrenciaEntrega)) return { items: body.OcorrenciaEntrega, subtipo: 'entrega' };
  if (body && body.OcorrenciaBaixa && Array.isArray(body.OcorrenciaBaixa)) return { items: body.OcorrenciaBaixa, subtipo: 'baixa' };
  if (body && body.OcorrenciaCancelada && Array.isArray(body.OcorrenciaCancelada)) return { items: body.OcorrenciaCancelada, subtipo: 'cancelada' };
  /* Fallback: tenta qualquer chave que seja array */
  for (const key of Object.keys(body || {})) {
    if (Array.isArray(body[key]) && body[key].length > 0 && typeof body[key][0] === 'object') {
      return { items: body[key], subtipo: key.toLowerCase() };
    }
  }
  if (Array.isArray(body)) return { items: body, subtipo: 'array' };
  return { items: [body], subtipo: 'single' };
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { items, subtipo } = extractItems(req.body);
    const results = [];

    for (const item of items) {
      /* Tenta extrair campos de múltiplas estruturas possíveis */
      const doc = item.DOCUMENTO || {};
      const transp = item.TRANSPORTADOR || {};
      const remet = item.REMETENTE || {};
      const dest = item.DESTINATARIO || {};
      const ocorr = item.OCORRENCIA || item;
      const entrega = item.ENTREGA || {};
      const nf = item.NOTAFISCAL || item.NOTA_FISCAL || {};
      const cte = item.CONHECIMENTO || item.CTE || {};

      const row = {
        tipo: 'ocorrencia',
        subtipo,
        source: 'active_onsupply',
        
        nf_numero: g(nf, 'NUMERO', 'Numero') || g(item, 'NUMERO_NF', 'NF_NUMERO') || g(doc, 'NUMERO'),
        nf_serie: g(nf, 'SERIE', 'Serie') || g(item, 'SERIE_NF'),
        nf_chave: g(nf, 'CHAVE', 'Chave') || g(item, 'CHAVE_NF', 'CHAVE_NFE'),
        cte_numero: g(cte, 'NUMERO', 'Numero') || g(item, 'NUMERO_CTE', 'CTE_NUMERO'),
        cte_chave: g(cte, 'CHAVE', 'Chave') || g(item, 'CHAVE_CTE'),
        
        codigo_ocorrencia: g(ocorr, 'CODIGO', 'Codigo', 'TIPO', 'Tipo', 'COD_OCORRENCIA'),
        descricao_ocorrencia: g(ocorr, 'DESCRICAO', 'Descricao', 'MOTIVO', 'Motivo', 'DESC_OCORRENCIA'),
        data_ocorrencia: g(ocorr, 'DATA', 'Data', 'DATA_OCORRENCIA', 'DataOcorrencia') || null,
        data_registro: g(ocorr, 'DATA_REGISTRO', 'DataRegistro', 'REGISTRO') || null,
        status_ocorrencia: g(ocorr, 'STATUS', 'Status', 'SITUACAO', 'Situacao'),
        observacao: g(ocorr, 'OBSERVACAO', 'Observacao', 'OBS') || g(item, 'OBSERVACAO', 'Observacao'),
        
        recebedor_nome: g(entrega, 'RECEBEDOR', 'Recebedor', 'NOME_RECEBEDOR') || g(item, 'RECEBEDOR', 'NOME_RECEBEDOR'),
        recebedor_documento: g(entrega, 'DOCUMENTO_RECEBEDOR', 'CPF_RECEBEDOR', 'DOC_RECEBEDOR') || g(item, 'DOC_RECEBEDOR'),
        data_entrega: g(entrega, 'DATA', 'Data', 'DATA_ENTREGA') || g(item, 'DATA_ENTREGA') || null,
        
        transportador_cnpj: g(transp, 'CNPJCPF', 'CNPJ') || g(item, 'TRANSPORTADOR_CNPJ'),
        transportador_nome: g(transp, 'RAZAOSOCIAL', 'FANTASIA') || g(item, 'TRANSPORTADOR_NOME'),
        remetente_cnpj: g(remet, 'CNPJCPF', 'CNPJ'),
        remetente_nome: g(remet, 'RAZAOSOCIAL', 'FANTASIA'),
        destinatario_cnpj: g(dest, 'CNPJCPF', 'CNPJ'),
        destinatario_nome: g(dest, 'RAZAOSOCIAL', 'FANTASIA'),
        
        payload_raw: item,
      };

      /* Limpa campos nulos/vazios para não gravar strings vazias */
      for (const k of Object.keys(row)) {
        if (row[k] === '' || row[k] === undefined) row[k] = null;
      }
      /* tipo e source não podem ser null */
      row.tipo = 'ocorrencia';
      row.source = 'active_onsupply';

      await sbInsert('active_ocorrencias', row);
      results.push({ numero: row.nf_numero || row.cte_numero || 'N/A', status: 'ok' });
    }

    return res.status(200).json(results.map((r, i) => ({
      Guid_Processamento: `${Date.now()}-${i}`,
      Chave_Cliente: 'LINEA_PORTAL',
      Inicio_Processamento: new Date().toISOString(),
      Termino_Processamento: new Date().toISOString(),
      Tempo_Processamento: '00:00:00.001',
      Codigo: '000', Mensagem: 'Processado com Sucesso',
      Linha: i + 1, Tipo_Documento: 'Ocorrencia',
      Referencia: `Ocorrencia: ${r.numero}`, Campo_Relacionado: '',
      Erro: false, Informacao_Complementar: {},
    })));
  } catch (err) {
    try { await sbInsert('active_ocorrencias', { tipo: 'ocorrencia_erro', source: 'active_onsupply', payload_raw: req.body || 'empty', observacao: err.message }); } catch {}
    return res.status(200).json([{ Guid_Processamento: `error-${Date.now()}`, Chave_Cliente: 'LINEA_PORTAL', Inicio_Processamento: new Date().toISOString(), Termino_Processamento: new Date().toISOString(), Tempo_Processamento: '00:00:00.000', Codigo: '999', Mensagem: `Erro: ${err.message}`, Linha: 1, Tipo_Documento: 'Ocorrencia', Referencia: '', Campo_Relacionado: '', Erro: true, Informacao_Complementar: {} }]);
  }
}
