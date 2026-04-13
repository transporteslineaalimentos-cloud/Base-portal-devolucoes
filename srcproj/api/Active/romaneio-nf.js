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

// Extrai a lista de NFs do payload — suporta múltiplos formatos do Active
function extractNFs(body) {
  // Log para debug — ver o que chega
  console.log('[romaneio-nf] payload keys:', Object.keys(body || {}));
  console.log('[romaneio-nf] payload preview:', JSON.stringify(body).slice(0, 500));

  // Formato WS_ROMANEIO_CALCULADO_V000: array de romaneios, cada um com NOTAS
  if (Array.isArray(body)) {
    const nfs = [];
    for (const romaneio of body) {
      const romNum = g(romaneio, 'NUMERO', 'Numero', 'numero', 'NUMERO_ROMANEIO');
      const transp = romaneio.TRANSPORTADOR || romaneio.Transportador || {};
      const remet  = romaneio.REMETENTE   || romaneio.Remetente   || {};
      const dataSaida = g(romaneio, 'DATA_SAIDA', 'DataSaida', 'DATA', 'EMISSAO', 'Data_Emissao');
      // NFs do romaneio podem estar em campos variados
      const notasArr = romaneio.NOTAS_FISCAIS || romaneio.NOTASFISCAIS || romaneio.NOTAS ||
                       romaneio.NotasFiscais || romaneio.Notas || romaneio.NFs || [];
      if (notasArr.length > 0) {
        for (const nf of notasArr) {
          nfs.push({ nf, romNum, transp, remet, dataSaida });
        }
      } else {
        // O romaneio inteiro é tratado como um item (formato antigo)
        nfs.push({ nf: romaneio, romNum, transp, remet, dataSaida });
      }
    }
    return nfs;
  }

  // Formato envelope: { Romaneio: [...] } ou { WS_ROMANEIO: [...] }
  for (const key of Object.keys(body || {})) {
    const val = body[key];
    if (Array.isArray(val) && val.length > 0 && typeof val[0] === 'object') {
      return extractNFs(val); // recursivo com o array encontrado
    }
  }

  // Fallback: body é um único objeto
  return [{ nf: body, romNum: '', transp: {}, remet: {}, dataSaida: null }];
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    // Salva o payload RAW para debug (sem unique constraint)
    await sbInsert('active_webhooks', {
      tipo: 'romaneio_nf_raw',
      source: 'active_onsupply',
      numero: `debug_${Date.now()}`,
      payload_raw: req.body,
      observacao: 'payload capturado para debug',
    });

    const nfItems = extractNFs(req.body);
    const results = [];

    for (const { nf, romNum, transp: transpRom, remet: remetRom, dataSaida } of nfItems) {
      // NF number pode estar em diferentes campos
      const numero = g(nf, 'NUMERO', 'Numero', 'numero', 'NF', 'NUMERO_NF', 'NOTA_FISCAL');
      const serie  = g(nf, 'SERIE', 'Serie', 'serie');
      const chave  = g(nf, 'CHAVE', 'Chave_Eletronica', 'chave_nfe', 'CHAVE_NF');

      // Transportadora pode estar no nível do romaneio ou da NF
      const transp = nf.TRANSPORTADOR || nf.Transportador || transpRom;
      const remet  = nf.REMETENTE     || nf.Remetente     || remetRom;
      const dest   = nf.DESTINATARIO  || nf.Destinatario  || {};

      const emissao    = g(nf, 'EMISSAO', 'Data_Emissao') || dataSaida;
      const cfop       = g(nf, 'CFOP', 'cfop');
      const valor      = gn(nf, 'VALOR', 'Valor_Mercadoria', 'VALOR_MERCADORIA');
      const peso       = gn(nf, 'PESO', 'Peso');
      const volumes    = parseInt(g(nf, 'VOLUMES', 'Quantidade_Volumes', 'QTDE_VOLUMES')) || 0;
      const centro     = g(nf, 'CENTRO_CUSTO', 'CentroCusto', 'CC');
      const pedido     = g(nf, 'PEDIDO', 'Pedido');

      if (!numero) {
        console.warn('[romaneio-nf] item sem numero, pulando. keys:', Object.keys(nf));
        continue;
      }

      await sbInsert('active_webhooks', {
        tipo: 'romaneio_nf',
        source: 'active_onsupply',
        numero,
        serie,
        chave_nfe: chave,
        cfop,
        data_emissao: emissao || null,
        valor_mercadoria: valor,
        peso,
        volumes,
        natureza_operacao: g(nf, 'OPERACAO_FISCAL', 'Natureza_Operacao'),
        pedido,
        transportador_cnpj: g(transp, 'CNPJCPF'),
        transportador_nome: g(transp, 'RAZAOSOCIAL', 'FANTASIA'),
        remetente_cnpj: g(remet, 'CNPJCPF'),
        remetente_nome: g(remet, 'RAZAOSOCIAL', 'FANTASIA'),
        destinatario_cnpj: g(dest, 'CNPJCPF'),
        destinatario_nome: g(dest, 'RAZAOSOCIAL', 'FANTASIA'),
        observacao: romNum ? String(romNum) : centro, // romaneio no campo observacao
        payload_raw: req.body,
      });
      results.push({ numero, romaneio: romNum, status: 'ok' });
    }

    return res.status(200).json(results.map((r, i) => ({
      Guid_Processamento: `${Date.now()}-${i}`,
      Chave_Cliente: 'LINEA_PORTAL',
      Inicio_Processamento: new Date().toISOString(),
      Termino_Processamento: new Date().toISOString(),
      Tempo_Processamento: '00:00:00.001',
      Codigo: '000', Mensagem: 'Processado com Sucesso',
      Linha: i + 1, Tipo_Documento: 'Romaneio NF',
      Referencia: `NF: ${r.numero} | Romaneio: ${r.romaneio}`, Campo_Relacionado: '',
      Erro: false, Informacao_Complementar: {},
    })));
  } catch (err) {
    console.error('[romaneio-nf] erro:', err.message, err.stack);
    try {
      await sbInsert('active_webhooks', {
        tipo: 'romaneio_nf_erro',
        source: 'active_onsupply',
        numero: `erro_${Date.now()}`,
        payload_raw: req.body || 'empty',
        observacao: err.message,
      });
    } catch (e2) { console.error('[romaneio-nf] catch interno:', e2.message); }
    return res.status(200).json([{
      Guid_Processamento: `error-${Date.now()}`, Chave_Cliente: 'LINEA_PORTAL',
      Inicio_Processamento: new Date().toISOString(), Termino_Processamento: new Date().toISOString(),
      Tempo_Processamento: '00:00:00.000', Codigo: '999', Mensagem: `Erro: ${err.message}`,
      Linha: 1, Tipo_Documento: 'Romaneio NF', Referencia: '', Campo_Relacionado: '', Erro: true,
      Informacao_Complementar: {},
    }]);
  }
}
