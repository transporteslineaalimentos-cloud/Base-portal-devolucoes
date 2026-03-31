export default function FilterBar({ filters, setFilters, areas = [], statusOptions = [], showTransporters = false, children }) {
  return (
    <>
      <div className="flex gap-2 mb-3 flex-wrap">
        <input
          value={filters.search}
          onChange={e => setFilters({ ...filters, search: e.target.value })}
          placeholder="Buscar (use ; para múltiplos)"
          className="flex-1 min-w-[180px] px-3 py-2.5 border border-gray-200 rounded-lg text-xs outline-none focus:border-blue-500"
        />
        <select value={filters.area} onChange={e => setFilters({ ...filters, area: e.target.value })} className="px-3 py-2.5 border border-gray-200 rounded-lg text-xs">
          <option value="TODOS">Todas Áreas</option>
          {areas.map(a => <option key={a}>{a}</option>)}
        </select>
        <select value={filters.status} onChange={e => setFilters({ ...filters, status: e.target.value })} className="px-3 py-2.5 border border-gray-200 rounded-lg text-xs">
          <option value="todos">Todos Status</option>
          {statusOptions.map(s => <option key={s.v} value={s.v}>{s.l}</option>)}
        </select>
        {children}
      </div>
      {showTransporters}
    </>
  );
}
