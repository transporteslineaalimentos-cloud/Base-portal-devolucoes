import { useState, useEffect } from 'react';
import { supabase } from '../config/constants';

const ENDPOINT = 'https://opcrtjdnpgqcjlksofjw.supabase.co/functions/v1/protheus-sync';
const SECRET   = 'linea-sync-2026'; // Mude isso nas variáveis de ambiente da Edge Function

async function loadLogs() {
  const { data } = await supabase
    .from('portal_sync_log')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(20);
  return data || [];
}

function fmt(n) { return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n || 0); }
function dtFmt(s) { return new Date(s).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' }); }

export default function ProtheusSync() {
  const [logs, setLogs]       = useState([]);
  const [loading, setLoading] = useState(true);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [copied, setCopied]   = useState('');

  useEffect(() => {
    loadLogs().then(setLogs).finally(() => setLoading(false));
  }, []);

  const copy = (text, label) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(label);
      setTimeout(() => setCopied(''), 2000);
    });
  };

  const runTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const body = {
        tipo: 'incremental',
        notas: [{
          nf_debito: 'TESTE001', nf_original: 'NF99999', cliente: 'CLIENTE TESTE PROTHEUS',
          transportador: 'FAST SOLUTION LOGISTICA LTDA', motivo: 'Teste de integração',
          area: 'TRANSPORTE', uf: 'GO', valor: 1234.56, data_emissao: new Date().toISOString().split('T')[0], tipo: 'P'
        }]
      };
      const res = await fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-sync-secret': SECRET },
        body: JSON.stringify(body)
      });
      const d = await res.json();
      setTestResult({ ok: res.ok, data: d });
      if (res.ok) loadLogs().then(setLogs);
    } catch (e) {
      setTestResult({ ok: false, data: { erro: e.message } });
    } finally {
      setTesting(false);
    }
  };

  const curlCmd = `curl -X POST "${ENDPOINT}" \\
  -H "Content-Type: application/json" \\
  -H "x-sync-secret: ${SECRET}" \\
  -d '{
    "tipo": "incremental",
    "notas": [
      {
        "nf_debito": "NF001",
        "nf_original": "NF999",
        "cliente": "NOME DO CLIENTE",
        "transportador": "NOME DA TRANSPORTADORA",
        "motivo": "Motivo da devolução",
        "area": "TRANSPORTE",
        "uf": "GO",
        "valor": 1500.00,
        "data_emissao": "2026-04-01",
        "tipo": "P"
      }
    ]
  }'`;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Status do endpoint */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: '18px 22px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>Endpoint de sincronização</div>
            <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>Recebe dados do Protheus e atualiza o portal automaticamente</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#3FB950', boxShadow: '0 0 0 3px rgba(63,185,80,0.2)' }} />
            <span style={{ fontSize: 11, color: '#3FB950', fontWeight: 600 }}>Online</span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--surface-2)', borderRadius: 8, padding: '10px 14px', fontFamily: 'monospace', fontSize: 12, color: 'var(--text)', marginBottom: 12 }}>
          <span style={{ color: 'var(--text-3)', flexShrink: 0 }}>POST</span>
          <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ENDPOINT}</span>
          <button onClick={() => copy(ENDPOINT, 'url')} style={{ background: copied === 'url' ? '#3FB95020' : 'none', border: 'none', cursor: 'pointer', color: copied === 'url' ? '#3FB950' : 'var(--text-3)', fontSize: 11, padding: '2px 8px', borderRadius: 6 }}>
            {copied === 'url' ? '✓ Copiado' : 'Copiar'}
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
          {[
            { l: 'Header de autenticação', v: 'x-sync-secret', desc: 'Envie este header com a chave secreta em toda requisição' },
            { l: 'Tipos de sync', v: 'full | incremental', desc: 'full substitui tudo, incremental faz upsert por NF' },
          ].map(d => (
            <div key={d.l} style={{ background: 'var(--surface-2)', borderRadius: 8, padding: '10px 12px' }}>
              <div style={{ fontSize: 10, color: 'var(--text-3)', marginBottom: 4 }}>{d.l}</div>
              <div style={{ fontFamily: 'monospace', fontSize: 12, color: 'var(--gold)', marginBottom: 4 }}>{d.v}</div>
              <div style={{ fontSize: 10, color: 'var(--text-3)' }}>{d.desc}</div>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={runTest} disabled={testing} className="btn btn-gold btn-sm">
            {testing ? 'Testando…' : '▶ Executar teste'}
          </button>
          <button onClick={() => copy(curlCmd, 'curl')} className="btn btn-outline btn-sm">
            {copied === 'curl' ? '✓ Copiado' : '⧉ Copiar cURL'}
          </button>
        </div>

        {testResult && (
          <div style={{ marginTop: 12, padding: '10px 14px', borderRadius: 8, background: testResult.ok ? '#3FB95012' : '#F8514912', border: `1px solid ${testResult.ok ? '#3FB95030' : '#F8514930'}`, fontSize: 11, fontFamily: 'monospace', color: testResult.ok ? '#3FB950' : '#F85149' }}>
            {testResult.ok ? '✓ Sucesso: ' : '✗ Erro: '}{JSON.stringify(testResult.data)}
          </div>
        )}
      </div>

      {/* Exemplo de payload */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden' }}>
        <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>Exemplo de integração (cURL)</div>
          <button onClick={() => copy(curlCmd, 'curl2')} style={{ background: copied === 'curl2' ? '#3FB95020' : 'none', border: 'none', cursor: 'pointer', color: copied === 'curl2' ? '#3FB950' : 'var(--text-3)', fontSize: 11, padding: '4px 10px', borderRadius: 6 }}>
            {copied === 'curl2' ? '✓ Copiado' : '⧉ Copiar'}
          </button>
        </div>
        <pre style={{ padding: '14px 20px', fontSize: 11, color: 'var(--text-2)', fontFamily: 'monospace', overflowX: 'auto', lineHeight: 1.6, background: 'var(--surface-2)', margin: 0 }}>{curlCmd}</pre>
      </div>

      {/* Campos da nota */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden' }}>
        <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>Mapeamento de campos</div>
          <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>Campos aceitos em cada nota do array</div>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
          <thead>
            <tr style={{ background: 'var(--surface-2)' }}>
              {['Campo Protheus', 'Tipo', 'Obrig.', 'Descrição'].map(h => (
                <th key={h} style={{ padding: '8px 16px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', borderBottom: '1px solid var(--border)' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[
              ['nf_debito',    'string', '✓', 'Número da NF de débito'],
              ['nf_original',  'string', '✓', 'Número da NF original do cliente'],
              ['cliente',      'string', '✓', 'Razão social do cliente'],
              ['transportador','string', '', 'Nome da transportadora responsável'],
              ['motivo',       'string', '', 'Motivo da devolução/cobrança'],
              ['area',         'string', '', 'Área responsável (TRANSPORTE, COMERCIAL…)'],
              ['uf',           'string', '', 'Estado (sigla)'],
              ['valor',        'number', '✓', 'Valor em R$ da nota'],
              ['data_emissao', 'string', '', 'Data de emissão no formato YYYY-MM-DD'],
              ['tipo',         '"P"|"C"', '✓', 'P = Devolução (Pendente) · C = Cobrança'],
            ].map(([campo, tipo, obrig, desc]) => (
              <tr key={campo} style={{ borderBottom: '1px solid var(--border)' }}>
                <td style={{ padding: '8px 16px', fontFamily: 'monospace', color: 'var(--gold)', fontWeight: 600 }}>{campo}</td>
                <td style={{ padding: '8px 16px', fontFamily: 'monospace', color: 'var(--blue)' }}>{tipo}</td>
                <td style={{ padding: '8px 16px', color: obrig ? '#3FB950' : 'var(--text-3)', fontWeight: 600, textAlign: 'center' }}>{obrig || '—'}</td>
                <td style={{ padding: '8px 16px', color: 'var(--text-2)' }}>{desc}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Log de sincronizações */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden' }}>
        <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>Histórico de sincronizações</div>
          <button onClick={() => { setLoading(true); loadLogs().then(setLogs).finally(() => setLoading(false)); }} className="btn btn-outline btn-xs">↻ Atualizar</button>
        </div>
        {loading ? (
          <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-3)', fontSize: 12 }}>Carregando…</div>
        ) : logs.length === 0 ? (
          <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-3)', fontSize: 12 }}>Nenhuma sincronização registrada ainda.</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
            <thead>
              <tr style={{ background: 'var(--surface-2)' }}>
                {['Data', 'Fonte', 'Status', 'Total', 'Novas', 'Atualizadas', 'Mensagem'].map(h => (
                  <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontSize: 9, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', borderBottom: '1px solid var(--border)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {logs.map(l => {
                const c = l.status === 'ok' ? '#3FB950' : l.status === 'parcial' ? '#D29922' : '#F85149';
                return (
                  <tr key={l.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '8px 12px', color: 'var(--text-3)', whiteSpace: 'nowrap' }}>{dtFmt(l.created_at)}</td>
                    <td style={{ padding: '8px 12px', color: 'var(--text-2)', textTransform: 'uppercase', fontSize: 10 }}>{l.fonte}</td>
                    <td style={{ padding: '8px 12px' }}><span style={{ background: `${c}18`, color: c, padding: '2px 8px', borderRadius: 6, fontWeight: 600 }}>{l.status}</span></td>
                    <td style={{ padding: '8px 12px', color: 'var(--text)', fontWeight: 600 }}>{l.notas_total}</td>
                    <td style={{ padding: '8px 12px', color: '#3FB950', fontWeight: 600 }}>{l.notas_novas}</td>
                    <td style={{ padding: '8px 12px', color: '#58A6FF', fontWeight: 600 }}>{l.notas_atualizadas}</td>
                    <td style={{ padding: '8px 12px', color: 'var(--text-3)', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.mensagem}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
