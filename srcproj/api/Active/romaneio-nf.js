// Desabilita o body parser automático do Vercel para capturar o body raw
export const config = {
  api: {
    bodyParser: false,
  },
};

const SB_URL = process.env.SUPABASE_URL;
const SB_KEY = process.env.SUPABASE_ANON_KEY;

async function sbInsert(table, payload) {
  try {
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
      console.error(`[sb:${table}] ${res.status}`, txt.slice(0, 200));
    }
    return res.ok;
  } catch(e) {
    console.error(`[sb:${table}] fetch error:`, e.message);
    return false;
  }
}

// Lê o body raw da requisição (como Buffer)
function getRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', chunk => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

function g(obj, ...keys) {
  if (!obj || typeof obj !== 'object') return '';
  for (const k of keys) {
    if (obj[k] !== undefined && obj[k] !== null) return obj[k];
  }
  return '';
}

function gn(obj, ...keys) {
  const v = g(obj, ...keys);
  return v === '' || v === null ? 0 : Number(v) || 0;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // ── STEP 1: Lê o body raw (bypassa o parser automático) ──────────────
  let rawBuffer;
  try {
    rawBuffer = await getRawBody(req);
  } catch(e) {
    console.error('[romaneio-nf] erro ao ler body:', e.message);
    return res.status(200).json([{ Erro: true, Mensagem: 'Erro lendo body: ' + e.message }]);
  }

  const rawStr = rawBuffer.toString('utf-8');
  console.log('[romaneio-nf] content-type:', req.headers['content-type']);
  console.log('[romaneio-nf] body length:', rawStr.length);
  console.log('[romaneio-nf] body preview:', rawStr.slice(0, 300));

  // ── STEP 2: Salva raw para debug ───────────────────────────────────────
  await sbInsert('active_webhooks', {
    tipo: 'romaneio_nf_raw',
    source: 'active_onsupply',
    numero: `raw_${Date.now()}`,
    observacao: `ct:${req.headers['content-type']} len:${rawStr.length}`,
    payload_raw: { raw: rawStr.slice(0, 2000) }, // salva como JSONB
  });

  // ── STEP 3: Tenta parsear o JSON ──────────────────────────────────────
  let body;
  try {
    // Remove BOM e whitespace antes de parsear
    const cleaned = rawStr.replace(/^\uFEFF/, '').trim();
    body = JSON.parse(cleaned);
  } catch(e) {
    console.error('[romaneio-nf] JSON inválido:', e.message);
    console.error('[romaneio-nf] raw (primeiros 500):', rawStr.slice(0, 500));
    await sbInsert('active_webhooks', {
      tipo: 'romaneio_nf_erro',
      source: 'active_onsupply',
      numero: `erro_${Date.now()}`,
      observacao: 'JSON invalido: ' + e.message,
      payload_raw: { raw: rawStr.slice(0, 3000) },
    });
    // Retorna 200 para o Active não fazer retry
    return res.status(200).json([{ Erro: true, Mensagem: 'JSON invalido: ' + e.message }]);
  }

  // ── STEP 4: Processa as NFs ───────────────────────────────────────────
  try {
    const envelopes = Array.isArray(body) ? body : [body];
    const results = [];

    for (const envelope of envelopes) {
      if (!envelope || typeof envelope !== 'object') continue;

      const rom    = envelope.ROMANEIO || {};
      const romNum = String(g(rom, 'NUMERO') || g(envelope, 'NUMERO') || '');
      const romDt  = g(rom, 'SAIDA_DATA', 'DATA_SAIDA', 'DATA') || g(envelope, 'SAIDA_DATA') || null;

      const transp = envelope.TRANSPORTADOR || {};
      const remet  = envelope.CONTRATANTE || envelope.REMETENTE || {};

      const notasFiscais = Array.isArray(envelope.NOTAFISCAL) ? envelope.NOTAFISCAL :
                           Array.isArray(envelope.NOTAS_FISCAIS) ? envelope.NOTAS_FISCAIS :
                           Array.isArray(envelope.NOTAS) ? envelope.NOTAS : [];

      console.log(`[romaneio-nf] romaneio=${romNum} nfs=${notasFiscais.length}`);

      if (notasFiscais.length === 0) {
        await sbInsert('active_webhooks', {
          tipo: 'romaneio_nf_debug',
          source: 'active_onsupply',
          numero: `debug_${Date.now()}`,
          observacao: `romaneio_${romNum || 'sem_numero'} sem_nfs keys:${Object.keys(envelope).join(',')}`,
          payload_raw: envelope,
        });
        continue;
      }

      for (const nf of notasFiscais) {
        if (!nf || typeof nf !== 'object') continue;
        const dest   = nf.DESTINATARIO || {};
        const nfNum  = String(g(nf, 'NUMERO') || '');
        if (!nfNum) continue;

        const ok = await sbInsert('active_webhooks', {
          tipo: 'romaneio_nf',
          source: 'active_onsupply',
          numero: nfNum,
          serie: g(nf, 'SERIE') || '2',
          chave_nfe: g(nf, 'CHAVE') || '',
          data_emissao: romDt || null,
          valor_mercadoria: gn(nf, 'VALOR'),
          peso: gn(nf, 'PESO', 'PESOCALCULADO'),
          volumes: parseInt(g(nf, 'VOLUMES') || '0') || 0,
          transportador_cnpj: g(transp, 'CNPJCPF'),
          transportador_nome: g(transp, 'RAZAOSOCIAL', 'FANTASIA'),
          remetente_cnpj: g(remet, 'CNPJCPF'),
          remetente_nome: g(remet, 'RAZAOSOCIAL', 'FANTASIA'),
          destinatario_cnpj: g(dest, 'CNPJCPF'),
          destinatario_nome: g(dest, 'RAZAOSOCIAL', 'FANTASIA'),
          observacao: romNum,
          payload_raw: envelope,
        });
        console.log(`[romaneio-nf] NF ${nfNum} -> ${ok ? 'OK' : 'FALHOU'}`);
        results.push({ nf: nfNum, romaneio: romNum });
      }
    }

    return res.status(200).json(results.map((r, i) => ({
      Guid_Processamento: `${Date.now()}-${i}`,
      Chave_Cliente: 'LINEA_PORTAL',
      Inicio_Processamento: new Date().toISOString(),
      Termino_Processamento: new Date().toISOString(),
      Tempo_Processamento: '00:00:00.001',
      Codigo: '000', Mensagem: 'Processado com Sucesso',
      Linha: i + 1, Tipo_Documento: 'Romaneio NF',
      Referencia: `NF: ${r.nf} | Romaneio: ${r.romaneio}`,
      Campo_Relacionado: '', Erro: false, Informacao_Complementar: {},
    })));

  } catch (err) {
    console.error('[romaneio-nf] ERRO processamento:', err.message);
    return res.status(200).json([{ Erro: true, Mensagem: err.message }]);
  }
}
