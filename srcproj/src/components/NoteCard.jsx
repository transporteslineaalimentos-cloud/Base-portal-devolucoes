import { fmt, getNoteKey, getStatus, getTracking, getTransporter, getSOByValue, getTKByValue, calcAging, agingCategory, checkDateMatch } from '../utils/helpers';
function StatusDot({ color }) { return <span style={{ width: 7, height: 7, borderRadius: '50%', background: color, display: 'inline-block', flexShrink: 0 }} />; }
export default function NoteCard({ note, index, mode, statuses, extras, isTransporter, selected, toggleSelected, showSelection, onOpenDrawer }) {
  const key = getNoteKey(note);
  const st = mode === 'cobr' ? getStatus(note, statuses) : getTracking(note, statuses);
  const stObj = mode === 'cobr' ? getSOByValue(st) : getTKByValue(st);
  const days = calcAging(note);
  const agCat = days !== null ? agingCategory(days) : null;
  const dtMatch = checkDateMatch(note);
  const tr = getTransporter(note, extras);
  const ex = extras[key] || {};
  const exObj = typeof ex === 'object' ? ex : {};
  const chat = extras['chat:'+key]?.msgs || (Array.isArray(extras['chat:'+key]) ? extras['chat:'+key] : []);
  const isSelected = selected?.has(key);
  return (
    <div className={`note-row ${isSelected ? 'selected' : ''}`} style={{ gridTemplateColumns: showSelection && !isTransporter ? '20px 1fr auto auto auto' : '1fr auto auto auto', gap: 12 }} onClick={() => onOpenDrawer(note)}>
      {showSelection && !isTransporter && <input type="checkbox" checked={isSelected} onChange={e => { e.stopPropagation(); toggleSelected(key); }} onClick={e => e.stopPropagation()} style={{ width: 14, height: 14, accentColor: 'var(--gold)', cursor: 'pointer' }} />}
      <div style={{ minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3, flexWrap: 'wrap' }}>
          {note.t === 'P' ? (<><span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', fontVariantNumeric: 'tabular-nums' }}>NFD {note.nfd}</span><span style={{ fontSize: 11, color: 'var(--text-3)' }}>NFO {note.nfo}</span></>) : (<span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', fontVariantNumeric: 'tabular-nums' }}>NFO {note.nfo}</span>)}
          <span className={note.t==='P'?'tag tag-parcial':'tag tag-total'}>{note.t==='P'?'PARCIAL':'TOTAL'}</span>
          {mode==='cobr' && note.p?.length>0 && <span style={{ fontSize: 10, color: 'var(--green)', fontWeight: 600 }}>✓ {note.p.length} prod.</span>}
          {chat.length>0 && <span style={{ fontSize: 10, color: 'var(--purple)', fontWeight: 600 }}>💬 {chat.length}</span>}
          {dtMatch && !dtMatch.ok && <span style={{ fontSize: 10, color: 'var(--red)', fontWeight: 600 }}>⚠ {dtMatch.msg}</span>}
          {exObj.nfDeb && <span style={{ fontSize: 10, color: 'var(--green)', fontWeight: 600 }}>NF {exObj.nfDeb}</span>}
        </div>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 11, color: 'var(--red)', opacity: 0.85, fontWeight: 500 }}>{note.mo}</span>
          <span style={{ fontSize: 11, color: 'var(--text-3)' }}>{note.cl}</span>
          {tr && <span style={{ fontSize: 11, color: 'var(--text-2)', fontWeight: 500 }}>· {tr}</span>}
        </div>
      </div>
      <span className="status-badge" style={{ background: stObj.bg||'var(--surface-3)', color: stObj.c||'var(--text-2)', borderColor: (stObj.c||'#888')+'30', flexShrink: 0 }}>
        <StatusDot color={stObj.c} />
        <span style={{ maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{mode==='cobr'?stObj.l:`${stObj.i||''} ${stObj.l}`}</span>
      </span>
      {days !== null ? <span className="aging-badge" style={{ background: agCat?.bg||'var(--surface-3)', color: agCat?.color||'var(--text-3)', flexShrink: 0 }}>{days}d</span> : <span />}
      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--gold)', fontVariantNumeric: 'tabular-nums' }}>{fmt(note.v)}</div>
        <div style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 1 }}>{note.uf} · {note.dt||'—'}</div>
      </div>
    </div>
  );
}
