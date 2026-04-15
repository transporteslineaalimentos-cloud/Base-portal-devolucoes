const SB_URL = process.env.SUPABASE_URL;
const SB_KEY = process.env.SUPABASE_ANON_KEY;

async function sbUpsert(nfNum) {
  // Usa UPSERT para garantir que cria ou atualiza independente de existir
  const res = await fetch(`${SB_URL}/rest/v1/mon_canhoto_status`, {
    method: 'POST',
    headers: {
      'apikey': SB_KEY, 'Authorization': `Bearer ${SB_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'resolution=merge-duplicates,return=minimal'
    },
    body: JSON.stringify({
      nf_numero: nfNum,
      status: 'recebido',
      status_revisao: 'aprovado',
      revisado_em: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }),
  });
  if (!res.ok) console.error(`[sb:canhoto] ${res.status}`, (await res.text()).slice(0, 200));
  return res.ok;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end();

  try {
    const body = req.body;
    console.log('[anexo-ocorrencia] payload:', JSON.stringify(body).slice(0, 200));

    const doc   = body?.DOCUMENTO || body?.Documento || {};
    const nfNum = String(doc.NUMERO || doc.Numero || body?.NUMERO || '');

    if (!nfNum) {
      console.warn('[anexo-ocorrencia] sem numero de NF');
      return res.status(200).json([{ Erro: false, Mensagem: 'Sem NF identificada' }]);
    }

    await sbUpsert(nfNum);
    console.log(`[anexo-ocorrencia] NF ${nfNum} → canhoto RECEBIDO/APROVADO`);

    return res.status(200).json([{
      Guid_Processamento: `${Date.now()}-0`,
      Chave_Cliente: 'LINEA_PORTAL',
      Inicio_Processamento: new Date().toISOString(),
      Termino_Processamento: new Date().toISOString(),
      Tempo_Processamento: '00:00:00.001',
      Codigo: '000', Mensagem: 'Canhoto registrado com sucesso',
      Linha: 1, Tipo_Documento: 'Anexo Ocorrência',
      Referencia: `NF: ${nfNum}`, Erro: false, Informacao_Complementar: {},
    }]);
  } catch (err) {
    console.error('[anexo-ocorrencia] ERRO:', err.message);
    return res.status(200).json([{ Erro: true, Mensagem: err.message }]);
  }
}
