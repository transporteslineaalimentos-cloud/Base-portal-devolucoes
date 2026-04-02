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

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const items = Array.isArray(req.body) ? req.body : [req.body];
    const results = [];

    for (const item of items) {
      const numero = item.Numero || item.numero || '';
      const serie = item.Serie || item.serie || '';
      const chaveCte = item.Chave_Eletronica?.Chave_Eletronica || '';
      const transportador = item.Transportador || {};
      const remetente = item.Remetente || {};
      const destinatario = item.Destinatario || {};
      const frete = item.Frete || {};
      const imposto = item.Imposto || {};
      const notasFiscais = item.Nota_Fiscal || [];

      await sbInsert('active_webhooks', {
        tipo: 'conhecimento', source: 'active_onsupply', numero, serie, chave_nfe: chaveCte,
        cfop: item.CFOP || '', data_emissao: item.Data_Emissao || null,
        data_entrega: item.Data_Entrega || null, valor_mercadoria: item.Valor_Mercadoria || 0,
        peso: item.Peso || 0, observacao: item.Observacao || '',
        valor_frete_total: frete.Valor_Total || 0, valor_frete: frete.Valor_Frete || 0,
        valor_pedagio: frete.Valor_Pedagio || 0, valor_seguro: frete.Valor_Seguro || 0,
        valor_gris: frete.Valor_Gris || 0, valor_outros: frete.Valor_Outros || 0,
        imposto_valor: imposto.Valor_Total || 0, imposto_aliquota: imposto.Aliquota || 0,
        transportador_cnpj: transportador.CNPJCPF || '', transportador_nome: transportador.RazaoSocial || '',
        remetente_cnpj: remetente.CNPJCPF || '', remetente_nome: remetente.RazaoSocial || '',
        destinatario_cnpj: destinatario.CNPJCPF || '', destinatario_nome: destinatario.RazaoSocial || '',
        notas_vinculadas: JSON.stringify(notasFiscais), payload_raw: JSON.stringify(item),
        created_at: new Date().toISOString(),
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
    try { await sbInsert('active_webhooks', { tipo: 'conhecimento_erro', source: 'active_onsupply', payload_raw: JSON.stringify(req.body || 'empty'), observacao: err.message, created_at: new Date().toISOString() }); } catch {}
    return res.status(200).json([{ Guid_Processamento: `error-${Date.now()}`, Chave_Cliente: 'LINEA_PORTAL', Inicio_Processamento: new Date().toISOString(), Termino_Processamento: new Date().toISOString(), Tempo_Processamento: '00:00:00.000', Codigo: '999', Mensagem: `Erro: ${err.message}`, Linha: 1, Tipo_Documento: 'Conhecimento de Transporte', Referencia: '', Campo_Relacionado: '', Erro: true, Informacao_Complementar: {} }]);
  }
}
