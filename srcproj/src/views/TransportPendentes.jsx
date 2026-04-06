import { useMemo } from 'react';
import NoteListView from './NoteListView';
import { SO, TK } from '../config/constants';
import { getStatus, getTracking } from '../utils/helpers';
export default function TransportPendentes(props) {
  const { cobrNotes = [], pendNotes = [], statuses = {} } = props;
  const pendCobr = useMemo(() => cobrNotes.filter(n => getStatus(n, statuses) === 'cobr_tr'), [cobrNotes, statuses]);
  const pendDevol = useMemo(() => pendNotes.filter(n => ['retorno_auto', 'perdeu_agenda'].includes(getTracking(n, statuses))), [pendNotes, statuses]);
  const allPending = useMemo(() => [...pendDevol, ...pendCobr], [pendDevol, pendCobr]);
  const statusOptions = [
    ...TK.filter(t => ['retorno_auto', 'perdeu_agenda'].includes(t.v)),
    ...SO.filter(s => s.v === 'cobr_tr'),
  ];
  if (allPending.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '64px 24px' }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
        <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)', marginBottom: 8 }}>Tudo em dia!</div>
        <div style={{ fontSize: 13, color: 'var(--text-3)', maxWidth: 300, margin: '0 auto' }}>Não há devoluções nem cobranças esperando sua resposta.</div>
      </div>
    );
  }
  return <NoteListView {...props} notes={allPending} mode="pend" statusOptions={statusOptions} emptyMessage="Nenhuma nota pendente de ação." />;
}
