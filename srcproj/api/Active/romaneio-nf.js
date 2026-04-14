export const config = { api: { bodyParser: false } };

const SB_URL = process.env.SUPABASE_URL;
const SB_KEY = process.env.SUPABASE_ANON_KEY;

async function sbInsert(table, payload) {
  try {
    const res = await fetch(`${SB_URL}/rest/v1/${table}`, {
      method: 'POST',
      headers: { 'apikey': SB_KEY, 'Authorization': `Bearer ${SB_KEY}`, 'Content-Type': 'application/json', 'Prefer': 'return=minimal' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) console.error(`[sb:${table}] ${res.status}`, (await res.text()).slice(0, 200));
    return res.ok;
  } catch(e) { console.error(`[sb:${table}] err:`, e.message); return false; }
}

function getRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', c => chunks.push(c));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

function g(obj, ...keys) {
  if (!obj || typeof obj !== 'object') return '';
  for (const k of keys) { if (obj[k] !== undefined && obj[k] !== null) return obj[k]; }
  return '';
}
function gn(obj, ...keys) { const v = g(obj, ...keys); return v === '' ? 0 : Number(v) || 0; }

// Parser XML simples para o formato do Active (sem biblioteca externa)
function parseXmlRomaneio(xml) {
  const attr = (tag, name) => { const m = new RegExp(`<${tag}[^>]*${name}="([^"]*)"`, 'i').exec(xml); return m ? m[1] : ''; };
  const tag   = (name) => { const m = new RegExp(`<${name}[^>]*>([^<]*)</${name}>`, 'i').exec(xml); return m ? m[1].trim() : ''; };

  const romNum = attr('ROMANEIO', 'NUMERO') || tag('NUMERO');
  const saidaDt = tag('SAIDA_DATA') || tag('DATA_SAIDA');
  const transpCNPJ = tag('TRANSPORTADOR');
  const transpNome = tag('TRANSPORTADOR_RAZAOSOCIAL');
  const remetCNPJ = tag('CONTRATANTE');
  const remetNome = tag('CONTRATANTE_RAZAOSOCIAL');

  // Extrai todas as NFs do XML
  const nfs = [];
  const nfBlocks = xml.match(/<NOTAFISCAL[^>]*>[\s\S]*?<\/NOTAFISCAL>/gi) || [];
  for (const block of nfBlocks) {
    const nfTag = (n) => { const m = new RegExp(`<${n}[^>]*>([^<]*)</${n}>`, 'i').exec(block); return m ? m[1].trim() : ''; };
    const nfNum = nfTag('NUMERO');
    if (!nfNum) continue;
    nfs.push({
      numero: nfNum,
      serie: nfTag('SERIE') || '2',
      chave: nfTag('CHAVE'),
      valor: parseFloat(nfTag('VALOR')) || 0,
      peso: parseFloat(nfTag('PESO') || nfTag('PESOCALCULADO')) || 0,
      volumes: parseInt(nfTag('VOLUMES')) || 0,
      destCNPJ: nfTag('DESTINATARIO') || nfTag('DESTINATARIO_CNPJ'),
      destNome: nfTag('DESTINATARIO_RAZAOSOCIAL'),
    });
  }

  return { romNum, saidaDt, transpCNPJ, transpNome, remetCNPJ, remetNome, nfs };
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const rawBuffer = await getRawBody(req).catch(() => Buffer.from(''));
  const rawStr = rawBuffer.toString('utf-8').replace(/^\uFEFF/, '').trim();
  const ct = req.headers['content-type'] || '';

  console.log(`[romaneio-nf] ct:${ct.slice(0,40)} len:${rawStr.length} starts:${rawStr.slice(0,30)}`);

  const results = [];
  let romNum = '', saidaDt = null, transpCNPJ = '', transpNome = '', remetCNPJ = '', remetNome = '', nfList = [];

  // ── Detecta formato: XML ou JSON ───────────────────────────────────────
  if (rawStr.startsWith('<')) {
    // Formato XML (WS_ROMANEIO_CALCULADO_V000 envia XML mesmo com Content-Type json)
    console.log('[romaneio-nf] formato XML detectado');
    const parsed = parseXmlRomaneio(rawStr);
    romNum = parsed.romNum; saidaDt = parsed.saidaDt;
    transpCNPJ = parsed.transpCNPJ; transpNome = parsed.transpNome;
    remetCNPJ = parsed.remetCNPJ; remetNome = parsed.remetNome;
    nfList = parsed.nfs;
  } else {
    // Formato JSON
    let body;
    try { body = JSON.parse(rawStr); } catch(e) {
      console.error('[romaneio-nf] JSON inválido:', e.message.slice(0, 100));
      await sbInsert('active_webhooks', { tipo: 'romaneio_nf_erro', source: 'active_onsupply', numero: `erro_${Date.now()}`, observacao: 'parse err: ' + e.message.slice(0,200), payload_raw: { raw: rawStr.slice(0,2000) } });
      return res.status(200).json([{ Erro: true, Mensagem: 'Formato não reconhecido' }]);
    }

    const envelopes = Array.isArray(body) ? body : [body];
    for (const env of envelopes) {
      if (!env || typeof env !== 'object') continue;
      const rom = env.ROMANEIO || {};
      romNum = String(g(rom, 'NUMERO') || g(env, 'NUMERO') || '');
      saidaDt = g(rom, 'SAIDA_DATA', 'DATA_SAIDA') || g(env, 'SAIDA_DATA') || null;
      const transp = env.TRANSPORTADOR || {};
      const remet  = env.CONTRATANTE || env.REMETENTE || {};
      transpCNPJ = g(transp, 'CNPJCPF'); transpNome = g(transp, 'RAZAOSOCIAL', 'FANTASIA');
      remetCNPJ  = g(remet, 'CNPJCPF');  remetNome  = g(remet, 'RAZAOSOCIAL', 'FANTASIA');

      const notasFiscais = Array.isArray(env.NOTAFISCAL) ? env.NOTAFISCAL : Array.isArray(env.NOTAS_FISCAIS) ? env.NOTAS_FISCAIS : [];
      for (const nf of notasFiscais) {
        if (!nf || typeof nf !== 'object') continue;
        const dest = nf.DESTINATARIO || {};
        nfList.push({ numero: String(g(nf,'NUMERO')||''), serie: g(nf,'SERIE')||'2', chave: g(nf,'CHAVE'), valor: gn(nf,'VALOR'), peso: gn(nf,'PESO','PESOCALCULADO'), volumes: parseInt(g(nf,'VOLUMES')||'0')||0, destCNPJ: g(dest,'CNPJCPF'), destNome: g(dest,'RAZAOSOCIAL','FANTASIA') });
      }

      // Processa apenas o primeiro envelope
      break;
    }
  }

  console.log(`[romaneio-nf] romaneio=${romNum} nfs=${nfList.length} data=${saidaDt}`);

  if (nfList.length === 0) {
    await sbInsert('active_webhooks', { tipo: 'romaneio_nf_debug', source: 'active_onsupply', numero: `debug_${Date.now()}`, observacao: `rom_${romNum}_sem_nfs`, payload_raw: { raw: rawStr.slice(0, 2000) } });
  } else {
    for (const nf of nfList) {
      if (!nf.numero) continue;
      const ok = await sbInsert('active_webhooks', {
        tipo: 'romaneio_nf', source: 'active_onsupply',
        numero: nf.numero, serie: nf.serie, chave_nfe: nf.chave,
        data_emissao: saidaDt || null,
        valor_mercadoria: nf.valor, peso: nf.peso, volumes: nf.volumes,
        transportador_cnpj: transpCNPJ, transportador_nome: transpNome,
        remetente_cnpj: remetCNPJ, remetente_nome: remetNome,
        destinatario_cnpj: nf.destCNPJ, destinatario_nome: nf.destNome,
        observacao: romNum,
        payload_raw: { raw: rawStr.slice(0, 3000) },
      });
      console.log(`[romaneio-nf] NF ${nf.numero} -> ${ok ? 'OK' : 'skip(dup?)'}`);
      results.push({ nf: nf.numero, romaneio: romNum });
    }
  }

  return res.status(200).json(results.map((r, i) => ({
    Guid_Processamento: `${Date.now()}-${i}`, Chave_Cliente: 'LINEA_PORTAL',
    Inicio_Processamento: new Date().toISOString(), Termino_Processamento: new Date().toISOString(),
    Tempo_Processamento: '00:00:00.001', Codigo: '000', Mensagem: 'Processado com Sucesso',
    Linha: i + 1, Tipo_Documento: 'Romaneio NF',
    Referencia: `NF: ${r.nf} | Romaneio: ${r.romaneio}`,
    Campo_Relacionado: '', Erro: false, Informacao_Complementar: {},
  })));
}
