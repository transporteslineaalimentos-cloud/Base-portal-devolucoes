const SB_URL = process.env.SUPABASE_URL;
const SB_KEY = process.env.SUPABASE_ANON_KEY;

async function sbInsert(table, payload) {
  const res = await fetch(`${SB_URL}/rest/v1/${table}`, {
    method: 'POST',
    headers: {
      'apikey': SB_KEY,
      'Authorization': `Bearer ${SB_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=minimal'
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const txt = await res.text();
    console.error(`[sb:${table}] ${res.status}`, txt);
  }
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

// Normaliza um único payload no formato API_ROMANEIO_CALCULADO_V000
// Retorna lista de items { romNum, romData, transp, remet, nf }
function parsePayload(body) {
  // O Active pode enviar array de romaneios ou objeto único
  const items = Array.isArray(body) ? body : [body];
  const result = [];

  for (const item of items) {
    // Campos do romaneio
    const rom      = item.ROMANEIO || {};
    const romNum   = g(rom, 'NUMERO') || g(item, 'NUMERO', 'numero');
    const romData  = g(rom, 'SAIDA_DATA', 'DATA', 'DATA_SAIDA') || g(item, 'SAIDA_DATA', 'DATA');
    const romHora  = g(rom, 'SAIDA_HORA', 'HORA') || '';

    // Transportadora e remetente ficam no nível raiz
    const transp   = item.TRANSPORTADOR || {};
    const remet    = item.CONTRATANTE   || item.REMETENTE || {};

    // NFs ficam em NOTAFISCAL (array)
    const notasFiscais = item.NOTAFISCAL || item.NOTAS_FISCAIS || item.NOTAS || [];

    if (notasFiscais.length === 0) {
      // Sem NFs no payload — salva o payload bruto para debug
      console.warn('[romaneio-nf] nenhuma NF no payload. keys:', Object.keys(item));
      result.push({ romNum, romData, romHora, transp, remet, nf: null, rawItem: item });
    } else {
      for (const nf of notasFiscais) {
        result.push({ romNum, romData, romHora, transp, remet, nf, rawItem: item });
      }
    }
  }

  return result;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const body = req.body;

    // Log estrutural do payload para debug
    console.log('[romaneio-nf] keys raiz:', Object.keys(body || {}));
    console.log('[romaneio-nf] ROMANEIO:', JSON.stringify(body?.ROMANEIO || body?.romaneio || 'n/a').slice(0, 200));
    console.log('[romaneio-nf] NOTAFISCAL count:', (body?.NOTAFISCAL || body?.NOTAS_FISCAIS || []).length);

    const parsed = parsePayload(body);
    const results = [];

    for (const { romNum, romData, transp, remet, nf, rawItem } of parsed) {
      if (!nf) {
        // Salva debug sem NF
        await sbInsert('active_webhooks', {
          tipo: 'romaneio_nf_debug',
          source: 'active_onsupply',
          numero: `debug_${Date.now()}`,
          observacao: `romaneio_${romNum || 'sem_numero'}`,
          payload_raw: rawItem,
        });
        continue;
      }

      const nfNum    = g(nf, 'NUMERO', 'numero', 'NF');
      const nfSerie  = g(nf, 'SERIE', 'serie');
      const nfChave  = g(nf, 'CHAVE', 'chave_nfe', 'CHAVE_NF');
      const nfEmiss  = g(nf, 'EMISSAO', 'EMISSAO_DATA') || romData;
      const nfCFOP   = g(nf, 'CFOP', 'cfop');
      const nfValor  = gn(nf, 'VALOR');
      const nfPeso   = gn(nf, 'PESO', 'PESOCALCULADO');
      const nfVols   = parseInt(g(nf, 'VOLUMES', 'QTDE_VOLUMES')) || 0;
      const nfCC     = g(nf, 'CENTRO_CUSTO', 'CC', 'CENTRO');
      const dest     = nf.DESTINATARIO || {};

      if (!nfNum) {
        console.warn('[romaneio-nf] NF sem numero. keys:', Object.keys(nf));
        continue;
      }

      console.log(`[romaneio-nf] inserindo NF ${nfNum} | romaneio ${romNum} | transp ${g(transp,'RAZAOSOCIAL','FANTASIA')}`);

      await sbInsert('active_webhooks', {
        tipo: 'romaneio_nf',
        source: 'active_onsupply',
        numero: nfNum,           // número da NF
        serie: nfSerie,
        chave_nfe: nfChave,
        cfop: nfCFOP,
        data_emissao: romData || nfEmiss || null,  // data de saída do romaneio
        valor_mercadoria: nfValor,
        peso: nfPeso,
        volumes: nfVols,
        transportador_cnpj: g(transp, 'CNPJCPF'),
        transportador_nome: g(transp, 'RAZAOSOCIAL', 'FANTASIA'),
        remetente_cnpj: g(remet, 'CNPJCPF'),
        remetente_nome: g(remet, 'RAZAOSOCIAL', 'FANTASIA'),
        destinatario_cnpj: g(dest, 'CNPJCPF'),
        destinatario_nome: g(dest, 'RAZAOSOCIAL', 'FANTASIA'),
        observacao: romNum ? String(romNum) : nfCC,  // número do romaneio no campo observacao
        payload_raw: rawItem,
      });

      results.push({ nf: nfNum, romaneio: romNum, status: 'ok' });
    }

    console.log(`[romaneio-nf] processadas ${results.length} NFs`);

    return res.status(200).json(results.map((r, i) => ({
      Guid_Processamento: `${Date.now()}-${i}`,
      Chave_Cliente: 'LINEA_PORTAL',
      Inicio_Processamento: new Date().toISOString(),
      Termino_Processamento: new Date().toISOString(),
      Tempo_Processamento: '00:00:00.001',
      Codigo: '000',
      Mensagem: 'Processado com Sucesso',
      Linha: i + 1,
      Tipo_Documento: 'Romaneio NF',
      Referencia: `NF: ${r.nf} | Romaneio: ${r.romaneio}`,
      Campo_Relacionado: '',
      Erro: false,
      Informacao_Complementar: {},
    })));

  } catch (err) {
    console.error('[romaneio-nf] ERRO:', err.message, err.stack);
    try {
      await sbInsert('active_webhooks', {
        tipo: 'romaneio_nf_erro',
        source: 'active_onsupply',
        numero: `erro_${Date.now()}`,
        payload_raw: req.body || 'empty',
        observacao: err.message,
      });
    } catch (e2) {
      console.error('[romaneio-nf] catch interno:', e2.message);
    }
    return res.status(200).json([{
      Guid_Processamento: `error-${Date.now()}`,
      Chave_Cliente: 'LINEA_PORTAL',
      Inicio_Processamento: new Date().toISOString(),
      Termino_Processamento: new Date().toISOString(),
      Tempo_Processamento: '00:00:00.000',
      Codigo: '999',
      Mensagem: `Erro: ${err.message}`,
      Linha: 1,
      Tipo_Documento: 'Romaneio NF',
      Referencia: '',
      Campo_Relacionado: '',
      Erro: true,
      Informacao_Complementar: {},
    }]);
  }
}
