export default function NoteMetaPanel({ noteKey, meta = {}, onSave }) {
  const patch = (field, value) => onSave(noteKey, { ...meta, [field]: value });
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div>
        <label className="input-label">Prioridade</label>
        <div style={{ display: 'flex', gap: 8 }}>
          {['baixa', 'media', 'alta'].map(p => {
            const colors = {
              baixa: { active: 'var(--green-dim)', border: 'rgba(63,185,80,0.4)', text: 'var(--green)' },
              media: { active: 'var(--yellow-dim)', border: 'rgba(210,153,34,0.4)', text: 'var(--yellow)' },
              alta:  { active: 'var(--red-dim)',    border: 'rgba(248,81,73,0.4)',  text: 'var(--red)' },
            }[p];
            const isActive = meta.prioridade === p;
            return (
              <button key={p} onClick={() => patch('prioridade', p)} className="btn btn-sm" style={{ flex: 1, justifyContent: 'center', background: isActive ? colors.active : 'transparent', borderColor: isActive ? colors.border : 'var(--border)', color: isActive ? colors.text : 'var(--text-2)', fontWeight: isActive ? 700 : 400 }}>
                {p.charAt(0).toUpperCase() + p.slice(1)}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
