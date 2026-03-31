export default function BatchBar({ count, onClear, onGenerate, onEmail, onStatus }) {
  if (!count) return null;
  return (
    <div className="sticky top-2 z-20 bg-[#1a365d] text-white rounded-xl px-4 py-3 mb-3 flex items-center justify-between gap-3 shadow-lg">
      <div className="text-sm font-semibold">{count} item(ns) selecionado(s)</div>
      <div className="flex gap-2 flex-wrap">
        {onStatus && <button onClick={onStatus} className="px-3 py-1.5 rounded-lg bg-white/15 text-xs font-semibold">Mudar status</button>}
        {onGenerate && <button onClick={onGenerate} className="px-3 py-1.5 rounded-lg bg-white/15 text-xs font-semibold">Gerar notificação</button>}
        {onEmail && <button onClick={onEmail} className="px-3 py-1.5 rounded-lg bg-white/15 text-xs font-semibold">Enviar email</button>}
        <button onClick={onClear} className="px-3 py-1.5 rounded-lg bg-red-500 text-xs font-semibold">Limpar</button>
      </div>
    </div>
  );
}
