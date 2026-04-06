import { useEffect, useState } from 'react';

export default function StatusModal({ open, title, showDate = false, showNfFields = false, confirmOnly = false, showAttach = false, onClose, onConfirm, loading = false }) {
  const [obs, setObs]         = useState('');
  const [date, setDate]       = useState('');
  const [nfDeb, setNfDeb]     = useState('');
  const [pedido, setPedido]   = useState('');
  const [valorNf, setValorNf] = useState('');
  const [pdfFile, setPdfFile] = useState(null);

  useEffect(() => {
    if (open) { setObs(''); setDate(''); setNfDeb(''); setPedido(''); setValorNf(''); setPdfFile(null); }
  }, [open]);

  if (!open) return null;

  const handleConfirm = () => {
    if (showNfFields && !nfDeb.trim()) { alert('Preencha o número da NF Débito.'); return; }
    if (showAttach && !date.trim())    { alert('Preencha a data.'); return; }
    onConfirm({ obs, date, nfDeb, pedido, valorNf, pdfFile });
  };

  if (confirmOnly) {
    return (
      <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
        <div className="modal" style={{ maxWidth: 380 }}>
          <div className="modal-header">
            <h2 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>{title}</h2>
            <p style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 3 }}>Deseja confirmar essa alteração de status?</p>
          </div>
          <div className="modal-footer">
            <button onClick={onClose} className="btn btn-outline">Cancelar</button>
            <button disabled={loading} onClick={() => onConfirm({ obs: '', date: '', nfDeb: '', pedido: '', valorNf: '', pdfFile: null })} className="btn btn-gold">
              {loading ? 'Salvando...' : 'Confirmar'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (showAttach) {
    const isDateOnly = !title.toLowerCase().includes('agendamento') && !title.toLowerCase().includes('entregue');
    return (
      <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
        <div className="modal" style={{ maxWidth: 420 }}>
          <div className="modal-header">
            <h2 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>{title}</h2>
            <p style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 3 }}>{isDateOnly ? 'Informe a data prevista.' : 'Informe a data e anexe o comprovante.'}</p>
          </div>
          <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label className="input-label">
                {title.toLowerCase().includes('trânsito') ? 'Previsão de chegada na filial origem' :
                 title.toLowerCase().includes('recebida') ? 'Data de chegada na filial' :
                 title.toLowerCase().includes('solicitado') ? 'Data em que solicitou o agendamento' :
                 title.toLowerCase().includes('confirmado') ? 'Data confirmada de agendamento' :
                 'Data da entrega'}
                <span style={{ color: 'var(--red)' }}> *</span>
              </label>
              <input type="date" value={date} onChange={e => setDate(e.target.value)} className="input" />
            </div>
            {!isDateOnly && (
              <div>
                <label className="input-label">
                  {title.toLowerCase().includes('solicitado') ? 'Comprovante de solicitação' :
                   title.toLowerCase().includes('confirmado') ? 'Comprovante de confirmação' :
                   'Comprovante de entrega'}
                  <span style={{ color: 'var(--text-3)', fontWeight: 400 }}> (opcional)</span>
                </label>
                <input type="file" accept="application/pdf,image/*" onChange={e => setPdfFile(e.target.files?.[0] || null)} className="input" style={{ cursor: 'pointer' }} />
              </div>
            )}
          </div>
          <div className="modal-footer">
            <button onClick={onClose} className="btn btn-outline">Cancelar</button>
            <button disabled={loading} onClick={handleConfirm} className="btn btn-gold">{loading ? 'Salvando...' : 'Confirmar'}</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h2 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>{title}</h2>
          <p style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 3 }}>Preencha os dados e confirme a alteração.</p>
        </div>
        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label className="input-label">Observação <span style={{ color: 'var(--text-3)' }}>(opcional)</span></label>
            <textarea value={obs} onChange={e => setObs(e.target.value)} rows={3} placeholder="Adicione uma observação..." className="input" />
          </div>
          {showDate && (
            <div>
              <label className="input-label">Data</label>
              <input type="text" value={date} onChange={e => setDate(e.target.value)} placeholder="dd/mm/aaaa" className="input" />
            </div>
          )}
          {showNfFields && (
            <>
              <div>
                <label className="input-label">Nº NF Débito <span style={{ color: 'var(--red)' }}>*</span></label>
                <input type="text" value={nfDeb} onChange={e => setNfDeb(e.target.value)} placeholder="Número da NF Débito" className="input" />
              </div>
              <div>
                <label className="input-label">Nº Pedido Protheus <span style={{ color: 'var(--text-3)' }}>(opcional)</span></label>
                <input type="text" value={pedido} onChange={e => setPedido(e.target.value)} placeholder="Número do pedido Protheus" className="input" />
              </div>
              <div>
                <label className="input-label">Valor cobrado na NF <span style={{ color: 'var(--text-3)' }}>(opcional — informe se for cobrança parcial)</span></label>
                <input type="text" value={valorNf} onChange={e => setValorNf(e.target.value.replace(/[^\d.,]/g, ''))} placeholder="Ex: 1.250,00" className="input" />
                <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 4 }}>Deixe vazio se o valor cobrado for o total da nota fiscal</div>
              </div>
              <div>
                <label className="input-label">PDF da NF Débito <span style={{ color: 'var(--text-3)' }}>(opcional)</span></label>
                <input type="file" accept="application/pdf" onChange={e => setPdfFile(e.target.files?.[0] || null)} className="input" style={{ cursor: 'pointer' }} />
              </div>
            </>
          )}
        </div>
        <div className="modal-footer">
          <button onClick={onClose} className="btn btn-outline">Cancelar</button>
          <button disabled={loading} onClick={handleConfirm} className="btn btn-gold">{loading ? 'Salvando...' : 'Confirmar'}</button>
        </div>
      </div>
    </div>
  );
}
