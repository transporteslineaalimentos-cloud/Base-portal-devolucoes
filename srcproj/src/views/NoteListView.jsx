import FilterBar from '../components/FilterBar';
import TransportChips from '../components/TransportChips';
import BatchBar from '../components/BatchBar';
import NoteCard from '../components/NoteCard';
import { filterNotes, summarizeTransporters, fmt, calcAging, agingCategory } from '../utils/helpers';

const AGING_LABELS = { expirado: '🔴 Aging expirado (>30d)', proximo: '🟡 Aging próximo (20-30d)', ok: '🟢 Aging no prazo (<20d)' };

export default function NoteListView({
  notes = [], mode = 'cobr', filters, setFilters, statusOptions, extras, statuses,
  expandedId, setExpandedId, selected, setSelected, detailTab, setDetailTab,
  addChatMessage, user, isTransporter, history, onStatus, onTracking, onOpenEmail,
  onEditTransporter, acceptanceHandler, permissions, noteMeta, saveMeta, users,
  onBatchGenerate, onBatchEmail, onBatchStatus, exportButton
}) {
  const items = filterNotes(notes, filters, statuses, mode, extras);
  const areas = [...new Set(notes.map(d => d.ar).filter(Boolean))].sort();
  const trSummary = summarizeTransporters(notes, extras).map(t => ({ name: t.name, count: t.count }));
  const toggleSelected = (key) => {
    const next = new Set(selected);
    if (next.has(key)) next.delete(key); else next.add(key);
    setSelected(next);
  };
  const clearSelected = () => setSelected(new Set());
  const selectedNotes = items.filter(n => selected.has(n.nfd + '|' + n.nfo));

  return (
    <div>
      <BatchBar count={selected.size} onClear={clearSelected} onGenerate={() => onBatchGenerate?.(selectedNotes)} onEmail={() => onBatchEmail?.(selectedNotes)} onStatus={onBatchStatus ? () => onBatchStatus(selectedNotes) : null} />

      {/* Banner quando filtro de aging está ativo */}
      {filters.agingCat && (
        <div className="mb-3 px-4 py-2.5 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-between">
          <span className="text-xs font-semibold text-amber-800">
            Filtro ativo: {AGING_LABELS[filters.agingCat] || filters.agingCat}
          </span>
          <button onClick={() => setFilters({ ...filters, agingCat: null })} className="text-[10px] font-semibold text-amber-700 hover:text-amber-900 px-2 py-0.5 rounded bg-amber-100">
            ✕ Limpar filtro aging
          </button>
        </div>
      )}

      <div className="flex items-center justify-between gap-2">
        <div className="flex-1">
          <FilterBar filters={filters} setFilters={setFilters} areas={areas} statusOptions={statusOptions} showTransporters={false} />
          {!isTransporter && <TransportChips transporters={trSummary} active={filters.transporters || []} onToggle={(name) => {
            const c = filters.transporters || [];
            setFilters({ ...filters, transporters: c.includes(name) ? c.filter(x => x !== name) : [...c, name] });
          }} />}
        </div>
        {exportButton}
      </div>
      <div className="text-[10px] text-gray-400 mb-2">{items.length} itens · {fmt(items.reduce((s, d) => s + d.v, 0))}</div>
      {items.map((note, index) => (
        <NoteCard
          key={mode + '_' + index + '_' + note.nfo + '_' + note.nfd}
          note={note}
          index={index}
          mode={mode}
          expandedId={expandedId}
          setExpandedId={setExpandedId}
          statuses={statuses}
          extras={extras}
          history={history}
          isTransporter={isTransporter}
          detailTab={detailTab}
          setDetailTab={setDetailTab}
          addChatMessage={addChatMessage}
          user={user}
          onStatus={onStatus}
          onTracking={onTracking}
          onOpenEmail={onOpenEmail}
          onEditTransporter={onEditTransporter}
          onSaveAcceptance={acceptanceHandler}
          acceptanceData={extras}
          permissions={permissions}
          noteMeta={noteMeta}
          saveMeta={saveMeta}
          selected={selected}
          toggleSelected={toggleSelected}
          showSelection={!isTransporter}
          users={users}
        />
      ))}
    </div>
  );
}
