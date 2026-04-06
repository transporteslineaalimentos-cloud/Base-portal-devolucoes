export default function BatchBar({ count, onClear, onGenerate, onEmail, onStatus }) {
  if (!count) return null;
  return (
    <div className="batch-bar">
      <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--gold)', flex: 1 }}>
        {count} registro{count !== 1 ? 's' : ''} selecionado{count !== 1 ? 's' : ''}
      </span>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {onStatus && <button onClick={onStatus} className="btn btn-outline btn-sm">Mudar status</button>}
        {onGenerate && <button onClick={onGenerate} className="btn btn-outline btn-sm">Gerar notificação</button>}
        {onEmail && <button onClick={onEmail} className="btn btn-outline btn-sm">Enviar email</button>}
        <button onClick={onClear} className="btn btn-danger btn-sm">✕ Limpar</button>
      </div>
    </div>
  );
}
