// Webhook: recebe do Active quando um anexo é lançado em uma ocorrência de entrega
const SB_URL = process.env.SUPABASE_URL;
const SB_KEY = process.env.SUPABASE_ANON_KEY;

async function sb(table, method, payload, filter='') {
  const res = await fetch(`${SB_URL}/rest/v1/${table}${filter}`, {
    method,
    headers: { 'apikey': SB_KEY, 'Authorization': `Bearer ${SB_KEY}`, 'Content-Type': 'application/json', 'Prefer': 'return=minimal' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) console.error(`[sb:${table}] ${res.status}`, (await res.text()).slice(0,200));
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
    console.log('[anexo-ocorrencia] recebido:', JSON.stringify(body).slice(0, 300));

    // O Active envia: DOCUMENTO.NUMERO = número da NF, OCORRENCIA.CODIGO = código da ocorrência
    const doc  = body?.DOCUMENTO || body?.Documento || {};
    const ocorr = body?.OCORRENCIA || body?.Ocorrencia || {};
    const nfNum = String(doc.NUMERO || doc.Numero || body?.NUMERO || '');
    const codOcorr = String(ocorr.CODIGO || ocorr.Codigo || '');

    if (!nfNum) {
      console.warn('[anexo-ocorrencia] sem numero de NF no payload');
      return res.status(200).json([{ Erro: false, Mensagem: 'Sem NF' }]);
    }

    // Marca canhoto como recebido se a ocorrência for de entrega (01) ou qualquer ocorrência com anexo
    const ok = await sb('mon_canhoto_status', 'PATCH',
      { status: 'recebido', recebido_em: new Date().toISOString() },
      `?nf_numero=eq.${nfNum}`
    );

    // Se não existe o registro ainda, cria
    if (!ok) {
      await sb('mon_canhoto_status', 'POST',
        { nf_numero: nfNum, status: 'recebido', recebido_em: new Date().toISOString() }
      );
    }

    console.log(`[anexo-ocorrencia] NF ${nfNum} → canhoto RECEBIDO`);

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
