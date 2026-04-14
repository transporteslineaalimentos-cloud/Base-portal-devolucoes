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

// Extrai valor de uma tag XML simples (primeira ocorrência)
function xmlTag(xml, name) {
  const m = new RegExp(`<${name}[^>]*>([^<]*)</${name}>`, 'i').exec(xml);
  return m ? m[1].trim() : '';
}

// Extrai atributo de uma tag XML
function xmlAttr(xml, tag, attr) {
  const m = new RegExp(`<${tag}[^>]*${attr}="([^"]*)"`, 'i').exec(xml);
  return m ? m[1] : '';
}

// Converte DD/MM/YYYY ou DD/MM/YYYY HH:MM para YYYY-MM-DD
function parseDateBR(s) {
  if (!s) return null;
  const m = /^(\d{2})\/(\d{2})\/(\d{4})/.exec(s.trim());
  if (m) return `${m[3]}-${m[2]}-${m[1]}`;
  // Já está no formato YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  return null;
}

function g(obj, ...keys) {
  if (!obj || typeof obj !== 'object') return '';
  for (const k of keys) { if (obj[k] !== undefined && obj[k] !== null) return obj[k]; }
  return '';
}
function gn(obj, ...keys) { const v = g(obj, ...keys); return v === '' ? 0 : Number(v) || 0; }

// Parser do formato XML do Active: WS_ROMANEIO_CALCULADO_V000
// Estrutura: <ROMANEIO NUMERO="3293"><ENVOLVIDOS>...</ENVOLVIDOS><ROMANEIO>...</ROMANEIO><NOTAFISCAL><ITEM ID="236679">...</ITEM>...</NOTAFISCAL>
function parseXmlRomaneio(xml) {
  // Dados do romaneio
  const romNum   = xmlAttr(xml, 'ROMANEIO', 'NUMERO') || xmlTag(xml, 'NUMERO');
  const saidaRaw = xmlTag(xml, 'SAIDA_DATA');
  const saidaDt  = parseDateBR(saidaRaw);

  // Transportadora e contratante (nível ENVOLVIDOS)
  const transpCNPJ = xmlTag(xml, 'TRANSPORTADOR');
  const transpNome = xmlTag(xml, 'TRANSPORTADOR_RAZAOSOCIAL');
  const remetCNPJ  = xmlTag(xml, 'CONTRATANTE');
  const remetNome  = xmlTag(xml, 'CONTRATANTE_RAZAOSOCIAL');

  // NFs: cada <ITEM ID="NF_NUMERO">...</ITEM> dentro de <NOTAFISCAL>
  const nfs = [];
  const itemRegex = /<ITEM\s+ID="([^"]+)">([\s\S]*?)<\/ITEM>/gi;
  let match;
  while ((match = itemRegex.exec(xml)) !== null) {
    const nfNum  = match[1];  // ID do ITEM = número da NF
    const block  = match[2];

    const serie   = xmlTag(block, 'SERIE') || '2';
    const chave   = xmlTag(block, 'CHAVE');
    const emissao = parseDateBR(xmlTag(block, 'EMISSAO'));
    const peso    = parseFloat(xmlTag(block, 'PESO') || xmlTag(block, 'PESOCALCULADO') || '0') || 0;
    const volumes = parseInt(xmlTag(block, 'VOLUMES') || '0') || 0;
    const valor   = parseFloat(xmlTag(block, 'VALOR') || '0') || 0;
    const destCNPJ = xmlTag(block, 'DESTINATARIO');
    const destNome = xmlTag(block, 'DESTINATARIO_RAZAOSOCIAL');
    const destFantasia = xmlTag(block, 'DESTINATARIO_FANTASIA');

    nfs.push({ nfNum, serie, chave, emissao, peso, volumes, valor, destCNPJ, destNome: destFantasia || destNome });
  }

  console.log(`[romaneio-nf] XML parsed: rom=${romNum} data=${saidaDt} nfs=${nfs.length} transp=${transpNome}`);
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

  console.log(`[romaneio-nf] ct:${ct.slice(0,40)} len:${rawStr.length} starts:${rawStr.slice(0,20)}`);

  const results = [];
  let romNum = '', saidaDt = null, transpCNPJ = '', transpNome = '', remetCNPJ = '', remetNome = '', nfList = [];

  if (rawStr.startsWith('<')) {
    // XML — WS_ROMANEIO_CALCULADO_V000
    const parsed = parseXmlRomaneio(rawStr);
    romNum = parsed.romNum; saidaDt = parsed.saidaDt;
    transpCNPJ = parsed.transpCNPJ; transpNome = parsed.transpNome;
    remetCNPJ = parsed.remetCNPJ; remetNome = parsed.remetNome;
    nfList = parsed.nfs.map(n => ({
      numero: n.nfNum, serie: n.serie, chave: n.chave,
      valor: n.valor, peso: n.peso, volumes: n.volumes,
      destCNPJ: n.destCNPJ, destNome: n.destNome,
    }));
  } else {
    // JSON — API_ROMANEIO_CALCULADO_V000
    let body;
    try { body = JSON.parse(rawStr); } catch(e) {
      console.error('[romaneio-nf] formato não reconhecido:', rawStr.slice(0, 100));
      return res.status(200).json([{ Erro: true, Mensagem: 'Formato não reconhecido' }]);
    }
    const envelopes = Array.isArray(body) ? body : [body];
    for (const env of envelopes) {
      if (!env || typeof env !== 'object') continue;
      const rom = env.ROMANEIO || {};
      romNum = String(g(rom, 'NUMERO') || g(env, 'NUMERO') || '');
      saidaDt = parseDateBR(g(rom, 'SAIDA_DATA', 'DATA_SAIDA')) || g(rom, 'SAIDA_DATA') || null;
      const transp = env.TRANSPORTADOR || {};
      const remet  = env.CONTRATANTE || env.REMETENTE || {};
      transpCNPJ = g(transp, 'CNPJCPF'); transpNome = g(transp, 'RAZAOSOCIAL', 'FANTASIA');
      remetCNPJ  = g(remet, 'CNPJCPF');  remetNome  = g(remet, 'RAZAOSOCIAL', 'FANTASIA');
      const notasFiscais = Array.isArray(env.NOTAFISCAL) ? env.NOTAFISCAL : Array.isArray(env.NOTAS_FISCAIS) ? env.NOTAS_FISCAIS : [];
      for (const nf of notasFiscais) {
        if (!nf || typeof nf !== 'object') continue;
        const dest = nf.DESTINATARIO || {};
        nfList.push({ numero: String(g(nf,'NUMERO')||''), serie: g(nf,'SERIE')||'2', chave: g(nf,'CHAVE'), valor: gn(nf,'VALOR'), peso: gn(nf,'PESO','PESOCALCULADO'), volumes: parseInt(g(nf,'VOLUMES')||'0')||0, destCNPJ: g(dest,'CNPJCPF'), destNome: g(dest,'FANTASIA','RAZAOSOCIAL') });
      }
      break;
    }
  }

  console.log(`[romaneio-nf] processando rom=${romNum} nfs=${nfList.length} data=${saidaDt}`);

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
      payload_raw: { romaneio: romNum, saida: saidaDt, nf: nf.numero },
    });
    console.log(`[romaneio-nf] NF ${nf.numero} -> ${ok ? 'OK' : 'skip'}`);
    if (ok) results.push({ nf: nf.numero, romaneio: romNum });
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
