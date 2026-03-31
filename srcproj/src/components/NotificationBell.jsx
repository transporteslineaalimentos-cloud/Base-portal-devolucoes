export default function NotificationBell({ items = [], open = false, onToggle, onRead }) {
  const unread = items.filter(i => !i.lido).length;
  return (
    <div className="relative">
      <button onClick={onToggle} className="px-3 py-1.5 bg-white/10 rounded-lg text-xs font-semibold hover:bg-white/20 transition">🔔 {unread ? `(${unread})` : ''}</button>
      {open && (
        <div className="absolute right-0 mt-2 w-80 bg-white text-gray-700 rounded-xl shadow-xl border border-gray-200 max-h-80 overflow-auto z-50">
          {items.length ? items.slice(0, 8).map(n => (
            <button key={n.id || `${n.titulo}-${n.created_at}`} onClick={() => onRead?.(n)} className={`w-full text-left px-4 py-3 border-b border-gray-100 hover:bg-gray-50 ${n.lido ? 'opacity-60' : ''}`}>
              <div className="text-xs font-semibold text-gray-800">{n.titulo}</div>
              <div className="text-[11px] text-gray-500 mt-1">{n.mensagem}</div>
            </button>
          )) : <div className="px-4 py-3 text-xs text-gray-500">Sem notificações.</div>}
        </div>
      )}
    </div>
  );
}
