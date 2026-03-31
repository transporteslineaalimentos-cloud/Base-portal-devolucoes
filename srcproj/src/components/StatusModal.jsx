import { useEffect, useState } from 'react';

export default function StatusModal({ open, title, showDate = false, showNfFields = false, onClose, onConfirm, loading = false }) {
  const [obs, setObs] = useState('');
  const [date, setDate] = useState('');
  const [nfDeb, setNfDeb] = useState('');
  const [pedido, setPedido] = useState('');
  const [pdfFile, setPdfFile] = useState(null);

  useEffect(() => {
    if (open) { setObs(''); setDate(''); setNfDeb(''); setPedido(''); setPdfFile(null); }
  }, [open]);

  if (!open) return null;

  const handleConfirm = () => {
    if (showNfFields && !nfDeb.trim()) { alert('Preencha o número da NF Débito.'); return; }
    onConfirm({ obs, date, nfDeb, pedido, pdfFile });
  };

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
            <textarea
              value={obs}
              onChange={e => setObs(e.target.value)}
              rows={3}
              placeholder="Adicione uma observação..."
              className="input"
            />
          </div>

          {showDate && (
            <div>
              <label className="input-label">Data</label>
              <input
                type="text"
                value={date}
                onChange={e => setDate(e.target.value)}
                placeholder="dd/mm/aaaa"
                className="input"
              />
            </div>
          )}

          {showNfFields && (
            <>
              <div>
                <label className="input-label">Nº NF Débito <span style={{ color: 'var(--red)' }}>*</span></label>
                <input type="text" value={nfDeb} onChange={e => setNfDeb(e.target.value)} placeholder="Número da NF Débito" className="input" />
              </div>
              <div>
                <label className="input-label">Nº Pedido <span style={{ color: 'var(--text-3)' }}>(opcional)</span></label>
                <input type="text" value={pedido} onChange={e => setPedido(e.target.value)} placeholder="Número do pedido Protheus" className="input" />
              </div>
              <div>
                <label className="input-label">PDF da NF Débito <span style={{ color: 'var(--text-3)' }}>(opcional)</span></label>
                <input
                  type="file"
                  accept="application/pdf"
                  onChange={e => setPdfFile(e.target.files?.[0] || null)}
                  className="input"
                  style={{ cursor: 'pointer' }}
                />
              </div>
            </>
          )}
        </div>

        <div className="modal-footer">
          <button onClick={onClose} className="btn btn-outline">Cancelar</button>
          <button disabled={loading} onClick={handleConfirm} className="btn btn-gold">
            {loading ? 'Salvando...' : 'Confirmar'}
          </button>
        </div>
      </div>
    </div>
  );
}
