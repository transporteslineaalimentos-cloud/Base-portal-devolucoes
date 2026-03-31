import { useEffect, useState } from 'react';

export default function StatusModal({ open, title, showDate = false, showNfFields = false, onClose, onConfirm, loading = false }) {
  const [obs, setObs] = useState('');
  const [date, setDate] = useState('');
  const [nfDeb, setNfDeb] = useState('');
  const [pedido, setPedido] = useState('');
  const [pdfFile, setPdfFile] = useState(null);

  useEffect(() => {
    if (open) {
      setObs(''); setDate(''); setNfDeb(''); setPedido(''); setPdfFile(null);
    }
  }, [open]);

  if (!open) return null;

  const handleConfirm = () => {
    if (showNfFields && !nfDeb.trim()) {
      alert('Preencha o número da NF Débito.');
      return;
    }
    onConfirm({ obs, date, nfDeb, pedido, pdfFile });
  };

  return (
    <div className="fixed inset-0 z-[999] bg-black/50 flex items-center justify-center p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="text-base font-bold text-gray-800">{title}</h2>
          <p className="text-xs text-gray-400 mt-1">Preencha os dados e confirme.</p>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Observação</label>
            <textarea value={obs} onChange={e => setObs(e.target.value)} rows={3} placeholder="Digite uma observação..."
              className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm outline-none focus:border-blue-500 resize-none" />
          </div>
          {showDate && (
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Data</label>
              <input type="text" value={date} onChange={e => setDate(e.target.value)} placeholder="dd/mm/aaaa"
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm outline-none focus:border-blue-500" />
            </div>
          )}
          {showNfFields && (
            <>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Nº NF Débito</label>
                <input type="text" value={nfDeb} onChange={e => setNfDeb(e.target.value)} placeholder="Digite o número da NF Débito"
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm outline-none focus:border-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Nº Pedido</label>
                <input type="text" value={pedido} onChange={e => setPedido(e.target.value)} placeholder="Digite o número do pedido (opcional)"
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm outline-none focus:border-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">PDF da NF Débito</label>
                <input type="file" accept="application/pdf" onChange={e => setPdfFile(e.target.files?.[0] || null)}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm outline-none focus:border-blue-500" />
              </div>
            </>
          )}
        </div>
        <div className="px-5 py-4 border-t border-gray-100 flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 rounded-lg bg-gray-100 text-gray-600 text-sm font-semibold hover:bg-gray-200 transition">Cancelar</button>
          <button disabled={loading} onClick={handleConfirm} className="px-4 py-2 rounded-lg bg-[#1a365d] text-white text-sm font-semibold hover:opacity-90 transition disabled:opacity-50">{loading ? 'Salvando...' : 'Confirmar'}</button>
        </div>
      </div>
    </div>
  );
}
