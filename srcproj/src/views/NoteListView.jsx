import { useState, useEffect } from 'react';
import FilterBar from '../components/FilterBar';
import TransportChips from '../components/TransportChips';
import BatchBar from '../components/BatchBar';
import NoteCard from '../components/NoteCard';
import NoteDrawer from '../components/NoteDrawer';
import { filterNotes, summarizeTransporters, fmt } from '../utils/helpers';
export default function NoteListView({ notes = [], mode = 'cobr', filters, setFilters, statusOptions, extras, statuses, selected, setSelected, detailTab, setDetailTab, addChatMessage, user, isTransporter, history, onStatus, onTracking, onOpenEmail, onEditTransporter, onSetTransporter, transporterNames = [], acceptanceHandler, permissions, noteMeta, saveMeta, users, onBatchGenerate, onBatchEmail, onBatchStatus, exportButton, pendingNoteOpen = null, onPendingNoteConsumed = null }) {
  const [drawerNote, setDrawerNote] = useState(null);
  const [drawerInitialTab, setDrawerInitialTab] = useState('info');
  const items = filterNotes(notes, filters, statuses, mode, extras);
  const areas = [...new Set(notes.map(d => d.ar).filter(Boolean))].sort();
  const trSummary = summarizeTransporters(notes, extras).map(t => ({ name: t.name, count: t.count }));
  useEffect(() => {
    if (!pendingNoteOpen?.key) return;
    const target = notes.find(n => `${n.nfd||''}|${n.nfo||''}` === pendingNoteOpen.key);
    if (target) { setDrawerNote(target); setDrawerInitialTab(pendingNoteOpen.initialTab || 'timeline'); onPendingNoteConsumed?.(); }
  }, [pendingNoteOpen]); // eslint-disable-line
  const toggleSelected = (key) => { const next = new Set(selected); if (next.has(key)) next.delete(key); else next.add(key); setSelected(next); };
  const clearSelected = () => setSelected(new Set());
  const selectedNotes = items.filter(n => selected.has(n.nfd+'|'+n.nfo));
  return (
    <div>
      <BatchBar count={selected.size} onClear={clearSelected} onGenerate={() => onBatchGenerate?.(selectedNotes)} onEmail={() => onBatchEmail?.(selectedNotes)} onStatus={onBatchStatus ? () => onBatchStatus(selectedNotes) : null} />
      {filters.agingCat && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 14px', background: 'var(--yellow-dim)', border: '1px solid rgba(210,153,34,0.2)', borderRadius: 10, marginBottom: 12 }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--yellow)' }}>Filtro aging: {filters.agingCat==='expirado'?'🔴 Expirados (>30d)':filters.agingCat==='proximo'?'🟡 Próximos (20-30d)':'🟢 No prazo (<20d)'}</span>
          <button onClick={() => setFilters({ ...filters, agingCat: null })} style={{ fontSize: 11, color: 'var(--yellow)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>✕ Limpar</button>
        </div>
      )}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 8, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 320 }}>
          <FilterBar filters={filters} setFilters={setFilters} areas={areas} statusOptions={statusOptions} />
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', paddingTop: 2 }}>
          {!isTransporter && <TransportChips transporters={trSummary} active={filters.transporters||[]} onToggle={(name) => { const c=filters.transporters||[]; setFilters({ ...filters, transporters: c.includes(name)?c.filter(x=>x!==name):[...c,name] }); }} />}
          {exportButton}
        </div>
      </div>
      <div className="list-summary">
        <span><strong>{items.length}</strong> registros</span>
        <span>·</span>
        <span style={{ color: 'var(--gold)', fontWeight: 600 }}>{fmt(items.reduce((s,d)=>s+d.v,0))}</span>
        {selected.size>0 && <><span>·</span><span style={{ color: 'var(--gold)', fontWeight: 600 }}>{selected.size} selecionado(s)</span></>}
      </div>
      {items.length===0 ? (
        <div className="empty-state" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14 }}>
          <div className="empty-text">Nenhum registro encontrado para os filtros aplicados.</div>
        </div>
      ) : (
        <div className="data-table-wrap">
          {items.map((note, index) => <NoteCard key={mode+'_'+index+'_'+note.nfo+'_'+note.nfd} note={note} index={index} mode={mode} statuses={statuses} extras={extras} isTransporter={isTransporter} selected={selected} toggleSelected={toggleSelected} showSelection={!isTransporter} onOpenDrawer={(note) => { setDrawerNote(note); setDrawerInitialTab('info'); }} />)}
        </div>
      )}
      {drawerNote && (
        <NoteDrawer note={drawerNote} initialTab={drawerInitialTab} mode={mode} onClose={() => { setDrawerNote(null); setDrawerInitialTab('info'); }} statuses={statuses} extras={extras} history={history} user={user} isTransporter={isTransporter} addChatMessage={addChatMessage} onStatus={onStatus} onTracking={onTracking} onOpenEmail={onOpenEmail} onEditTransporter={onEditTransporter} onSetTransporter={onSetTransporter} transporterNames={transporterNames} onSaveAcceptance={acceptanceHandler} acceptanceData={extras} permissions={permissions} noteMeta={noteMeta} saveMeta={saveMeta} users={users} detailTab={detailTab} setDetailTab={setDetailTab} />
      )}
    </div>
  );
}
