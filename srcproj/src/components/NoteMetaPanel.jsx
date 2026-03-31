import { useMemo } from 'react';

const PRIORITY_STYLES = {
  baixa: 'bg-green-50 text-green-700 border-green-200',
  media: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  alta: 'bg-red-50 text-red-700 border-red-200',
};

export default function NoteMetaPanel({ noteKey, meta = {}, onSave, users = [], processInfo = null }) {
  const slaPercent = useMemo(() => {
    if (!meta.sla_inicio || !meta.sla_limite) return 0;
    const start = new Date(meta.sla_inicio).getTime();
    const end = new Date(meta.sla_limite).getTime();
    const now = Date.now();
    if (end <= start) return 0;
    return Math.max(0, Math.min(100, ((now - start) / (end - start)) * 100));
  }, [meta]);

  const patch = (field, value) => onSave(noteKey, { ...meta, [field]: value });

  return (
    <div className="mt-3 rounded-xl border border-gray-200 bg-white p-4">
      <div className="text-xs font-bold text-gray-500 uppercase mb-3">Gestão da nota</div>

      {processInfo && (
        <div className="grid md:grid-cols-2 gap-3 mb-4">
          <div className="rounded-lg border border-blue-100 bg-blue-50 p-3">
            <div className="text-[11px] font-semibold text-blue-700 mb-1">Pendência atual</div>
            <div className="text-sm font-bold text-blue-900">{processInfo.pendingWith}</div>
            <div className="text-[11px] text-blue-700 mt-2">Visível ao transportador: <strong>{processInfo.transporterVisible ? 'Sim' : 'Não'}</strong></div>
            <div className="text-[11px] text-blue-700">Posição do transportador: <strong>{processInfo.transporterResponse}</strong></div>
          </div>
          <div className="rounded-lg border border-amber-100 bg-amber-50 p-3">
            <div className="text-[11px] font-semibold text-amber-700 mb-1">Próxima ação sugerida</div>
            <div className="text-sm font-bold text-amber-900">{processInfo.nextAction}</div>
            <div className="text-[11px] text-amber-700 mt-2">Encerramento: {processInfo.closeRule}</div>
          </div>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-3">
        <div>
          <label className="block text-[11px] font-semibold text-gray-500 mb-1">Prioridade</label>
          <select value={meta.prioridade || 'media'} onChange={e => patch('prioridade', e.target.value)} className={`w-full px-3 py-2 rounded-lg border text-sm ${PRIORITY_STYLES[meta.prioridade || 'media'] || 'border-gray-200'}`}>
            <option value="baixa">Baixa</option>
            <option value="media">Média</option>
            <option value="alta">Alta</option>
          </select>
        </div>
        <div>
          <label className="block text-[11px] font-semibold text-gray-500 mb-1">Responsável</label>
          <input list={`responsaveis-${noteKey}`} value={meta.responsavel || ''} onChange={e => patch('responsavel', e.target.value)} placeholder="Nome ou email" className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm" />
          <datalist id={`responsaveis-${noteKey}`}>{users.map(u => <option key={u} value={u} />)}</datalist>
        </div>
        <div className="md:col-span-2">
          <label className="block text-[11px] font-semibold text-gray-500 mb-1">Próxima ação (manual)</label>
          <input value={meta.proxima_acao || ''} onChange={e => patch('proxima_acao', e.target.value)} className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm" />
        </div>
        <div className="md:col-span-2">
          <label className="block text-[11px] font-semibold text-gray-500 mb-1">Motivo de bloqueio</label>
          <input value={meta.motivo_bloqueio || ''} onChange={e => patch('motivo_bloqueio', e.target.value)} className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm" />
        </div>
      </div>
      <div className="grid md:grid-cols-3 gap-3 mt-3">
        <label className="flex items-center gap-2 text-sm text-gray-700"><input type="checkbox" checked={!!meta.cobrar_transportador} onChange={e => patch('cobrar_transportador', e.target.checked)} /> Cobrar transportador?</label>
        <label className="flex items-center gap-2 text-sm text-gray-700"><input type="checkbox" checked={!!meta.retorno_autorizado} onChange={e => patch('retorno_autorizado', e.target.checked)} /> Retorno autorizado?</label>
        <label className="flex items-center gap-2 text-sm text-gray-700"><input type="checkbox" checked={!!meta.aguardando_documento} onChange={e => patch('aguardando_documento', e.target.checked)} /> Aguardando documento?</label>
      </div>
      <div className="mt-3">
        <div className="flex items-center justify-between text-[11px] text-gray-500 mb-1"><span>SLA</span><span>{Math.round(slaPercent)}%</span></div>
        <div className="h-2 rounded-full bg-gray-100 overflow-hidden"><div className={`h-full ${slaPercent < 60 ? 'bg-green-500' : slaPercent < 85 ? 'bg-yellow-500' : 'bg-red-500'}`} style={{ width: `${slaPercent}%` }} /></div>
      </div>
    </div>
  );
}
