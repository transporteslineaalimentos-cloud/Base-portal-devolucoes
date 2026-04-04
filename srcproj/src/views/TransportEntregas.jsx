import { useMemo } from 'react';
import NoteListView from './NoteListView';
import { TK } from '../config/constants';
import { getTracking } from '../utils/helpers';

const ENTREGA_STATUS = ['agend_confirmado', 'agendado'];

export default function TransportEntregas(props) {
  const { notes = [], statuses = {} } = props;

  const filtered = useMemo(() =>
    notes.filter(n => ENTREGA_STATUS.includes(getTracking(n, statuses)))
  , [notes, statuses]);

  const statusOptions = TK.filter(t => ENTREGA_STATUS.includes(t.v));

  if (filtered.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '64px 24px' }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>📦</div>
        <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)', marginBottom: 8 }}>Nenhuma entrega pendente</div>
        <div style={{ fontSize: 13, color: 'var(--text-3)', maxWidth: 300, margin: '0 auto' }}>
          Quando um agendamento for confirmado, a nota aparecerá aqui para marcar como entregue.
        </div>
      </div>
    );
  }

  return (
    <NoteListView
      {...props}
      notes={filtered}
      mode="pend"
      statusOptions={statusOptions}
      emptyMessage="Nenhuma entrega pendente."
    />
  );
}
