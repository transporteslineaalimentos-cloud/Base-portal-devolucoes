import { useState } from 'react';

export default function AcceptanceForm({ open, onClose, onSave, existing }) {
  const [name, setName] = useState(existing?.name || '');
  const [cargo, setCargo] = useState(existing?.cargo || '');
  const [email, setEmail] = useState(existing?.email || '');
  const [checked, setChecked] = useState(!!existing?.accepted);
  if (!open) return null;

  const handleSave = async () => {
    if (!name || !cargo || !email || !checked) return alert('Preencha nome, cargo, email e marque o aceite.');
    let ip = '';
    try {
      const res = await fetch('https://api.ipify.org?format=json');
      const data = await res.json();
      ip = data.ip || '';
    } catch {}
    onSave({ name, cargo, email, accepted: checked, ip, userAgent: navigator.userAgent, ts: new Date().toISOString() });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[999] bg-black/50 flex items-center justify-center p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="text-base font-bold text-gray-800">Aceite formal do transportador</h2>
          <p className="text-xs text-gray-400 mt-1">Os dados de aceite ficarão gravados na nota.</p>
        </div>
        <div className="p-5 space-y-4">
          <input value={name} onChange={e => setName(e.target.value)} placeholder="Nome completo" className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm" />
          <input value={cargo} onChange={e => setCargo(e.target.value)} placeholder="Cargo" className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm" />
          <input value={email} onChange={e => setEmail(e.target.value)} placeholder="Email" className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm" />
          <label className="flex items-start gap-2 text-sm text-gray-700"><input type="checkbox" checked={checked} onChange={e => setChecked(e.target.checked)} className="mt-1" /> Declaro que li as informações e formalizo o aceite desta cobrança/retorno.</label>
        </div>
        <div className="px-5 py-4 border-t border-gray-100 flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 rounded-lg bg-gray-100 text-gray-600 text-sm font-semibold">Cancelar</button>
          <button onClick={handleSave} className="px-4 py-2 rounded-lg bg-[#1a365d] text-white text-sm font-semibold">Salvar aceite</button>
        </div>
      </div>
    </div>
  );
}
