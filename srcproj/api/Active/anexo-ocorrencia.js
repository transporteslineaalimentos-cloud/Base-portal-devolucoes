const SB_URL = process.env.SUPABASE_URL;
const SB_KEY = process.env.SUPABASE_ANON_KEY;

async function sbUpsert(nfNum) {
  // UPSERT com onConflict explícito na coluna nf_numero
  const res = await fetch(
    `${SB_URL}/rest/v1/mon_canhoto_status?on_conflict=nf_numero`,
    {
      method: 'POST',
      headers: {
        'apikey': SB_KEY,
        'Authorization': `Bearer ${SB_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'resolution=merge-duplicates,return=minimal',
      },
      body: JSON.stringify({
        nf_numero: nfNum,
        status: 'recebido',
        status_revisao: 'aprovado',
        revisado_em: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }),
    }
  );
  const txt = await res.text();
  if (!res.ok) {
    console.error(`[sb:canhoto] ${res.status}`, txt.slice(0, 200));
    return false;
  }
  console.log(`[sb:canhoto] NF ${nfNum} upsert OK → status=recebido`);
  return true;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end();

  try {
    const body = req.body;
    const doc   = body?.DOCUMENTO || body?.Documento || {};
    const nfNum = String(doc.NUMERO || doc.Numero || body?.NUMERO || '');

    console.log(`[anexo-ocorrencia] payload: NF=${nfNum}`);

    if (!nfNum) {
      return res.status(200).json([{ Erro: false, Mensagem: 'Sem NF identificada' }]);
    }

    await sbUpsert(nfNum);

    return res.status(200).json([{
      Guid_Processamento: `${Date.now()}-0`,
      Chave_Cliente: 'LINEA_PORTAL',
      Inicio_Processamento: new Date().toISOString(),
      Termino_Processamento: new Date().toISOString(),
      Tempo_Processamento: '00:00:00.001',
      Codigo: '000',
      Mensagem: 'Canhoto registrado com sucesso',
      Linha: 1, Tipo_Documento: 'Anexo Ocorrência',
      Referencia: `NF: ${nfNum}`, Erro: false, Informacao_Complementar: {},
    }]);
  } catch (err) {
    console.error('[anexo-ocorrencia] ERRO:', err.message);
    return res.status(200).json([{ Erro: true, Mensagem: err.message }]);
  }
}
