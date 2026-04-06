const SearchIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
  </svg>
);
export default function FilterBar({ filters, setFilters, areas = [], statusOptions = [] }) {
  const hasActiveFilters = filters.area !== 'TODOS' || filters.status !== 'todos' || filters.transporters?.length > 0 || filters.search;
  return (
    <div className="filter-bar">
      <div className="search-wrap" style={{ flex: 2, minWidth: 220 }}>
        <span className="search-icon"><SearchIcon /></span>
        <input value={filters.search} onChange={e => setFilters({ ...filters, search: e.target.value })} placeholder="Buscar NFD, NFO, cliente, motivo... (use ; para múltiplos)" className="search-input" style={{ width: '100%' }} />
      </div>
      <select value={filters.area} onChange={e => setFilters({ ...filters, area: e.target.value })} className="filter-select">
        <option value="TODOS">Todas as áreas</option>
        {areas.map(a => <option key={a}>{a}</option>)}
      </select>
      <select value={filters.status} onChange={e => setFilters({ ...filters, status: e.target.value })} className="filter-select">
        <option value="todos">Todos os status</option>
        {statusOptions.map(s => <option key={s.v} value={s.v}>{s.l}</option>)}
      </select>
      {hasActiveFilters && (
        <button onClick={() => setFilters({ search: '', area: 'TODOS', status: 'todos', transporters: [], agingCat: null })} className="btn btn-ghost btn-sm" style={{ color: 'var(--red)', opacity: 0.8, padding: '5px 10px' }} title="Limpar filtros">
          ✕ Limpar
        </button>
      )}
    </div>
  );
}
