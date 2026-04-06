import { useMemo } from 'react';
import NoteListView from './NoteListView';
import { TK } from '../config/constants';
import { getTracking } from '../utils/helpers';
const ANDAMENTO_STATUS = ['ag_consolidacao', 'em_transito', 'recebida_filial', 'agend_solicitado'];
export default function TransportAndamento(props) {
  const { notes = [], statuses = {} } = props;
  const filtered = useMemo(() => notes.filter(n => ANDAMENTO_STATUS.includes(getTracking(n, statuses))), [notes, statuses]);
  const statusOptions = TK.filter(t => ANDAMENTO_STATUS.includes(t.v));
  if (filtered.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '64px 24px' }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>🎯</div>
        <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)', marginBottom: 8 }}>Nada em andamento</div>
        <div style={{ fontSize: 13, color: 'var(--text-3)', maxWidth: 300, margin: '0 auto' }}>Quando iniciar o processo de devolução, as notas aparecerão aqui.</div>
      </div>
    );
  }
  return <NoteListView {...props} notes={filtered} mode="pend" statusOptions={statusOptions} emptyMessage="Nenhuma nota em andamento." />;
}
