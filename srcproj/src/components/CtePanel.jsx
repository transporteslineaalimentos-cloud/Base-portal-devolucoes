import { useEffect, useState } from 'react';
import { dbGetCteForNote } from '../config/supabase';
function fmt(v) { return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0); }
export default function CtePanel({ noteKey, extras = {} }) {
  const [cte, setCte] = useState(null); const [loading, setLoading] = useState(true);
  useEffect(() => {
    const fromExtras = extras['cte:' + noteKey];
    if (fromExtras) { setCte(typeof fromExtras==='object'?fromExtras:null); setLoading(false); return; }
    dbGetCteForNote(noteKey).then(v => { setCte(v); setLoading(false); });
  }, [noteKey, extras]);
  if (loading) return <div style={{ padding: '24px 0', textAlign: 'center', color: 'var(--text-3)', fontSize: 12 }}>Verificando CT-e…</div>;
  if (!cte) return (
    <div style={{ padding: '24px 0', textAlign: 'center' }}>
      <div style={{ fontSize: 28, marginBottom: 10 }}>📋</div>
      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-2)', marginBottom: 4 }}>Nenhum CT-e vinculado</div>
      <div style={{ fontSize: 11, color: 'var(--text-3)' }}>Quando a transportadora emitir o CT-e no Active onSupply, ele aparecerá aqui automaticamente.</div>
    </div>
  );
  const dtFmt = (s) => s ? new Date(s).toLocaleDateString('pt-BR', { day:'2-digit', month:'2-digit', year:'2-digit', hour:'2-digit', minute:'2-digit' }) : '—';
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', background: 'rgba(63,185,80,.1)', border: '1px solid rgba(63,185,80,.25)', borderRadius: 10 }}>
        <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#3FB950', boxShadow: '0 0 0 3px rgba(63,185,80,.2)', flexShrink: 0 }} />
        <div><div style={{ fontSize: 12, fontWeight: 700, color: '#3FB950' }}>CT-e emitido — Active onSupply</div><div style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 1 }}>Sincronizado em {dtFmt(cte.sincronizado_em)}</div></div>
      </div>
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
        <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)', background: 'var(--surface-2)' }}>
          <div style={{ fontSize: 10, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Conhecimento de Transporte</div>
          <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--gold)', marginTop: 2 }}>CT-e {cte.numero}</div>
        </div>
        <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[{ l:'Transportadora', v:cte.transportador, bold:true }, { l:'Valor do frete', v:fmt(cte.valor_frete), color:'#3FB950', bold:true }, { l:'Emissão', v:dtFmt(cte.data_emissao) }, { l:'Previsão entrega', v:dtFmt(cte.data_previsao) }, { l:'Entrega realizada', v:dtFmt(cte.data_entrega) }].map(d => d.v && d.v!=='—' ? (
            <div key={d.l} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 7, borderBottom: '1px solid var(--border)' }}>
              <span style={{ fontSize: 11, color: 'var(--text-3)' }}>{d.l}</span>
              <span style={{ fontSize: 12, fontWeight: d.bold?700:400, color: d.color||'var(--text)' }}>{d.v}</span>
            </div>
          ) : null)}
          {cte.chave && <div><div style={{ fontSize: 10, color: 'var(--text-3)', marginBottom: 3 }}>Chave eletrônica</div><div style={{ fontSize: 9, fontFamily: 'monospace', color: 'var(--text-2)', wordBreak: 'break-all', background: 'var(--surface-2)', padding: '6px 8px', borderRadius: 6 }}>{cte.chave}</div></div>}
        </div>
      </div>
    </div>
  );
}
