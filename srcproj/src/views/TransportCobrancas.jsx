import NoteListView from './NoteListView';
import { SO } from '../config/constants';
export default function TransportCobrancas(props) {
  const { notes = [] } = props;
  if (notes.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '64px 24px' }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>💚</div>
        <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)', marginBottom: 8 }}>Sem cobranças</div>
        <div style={{ fontSize: 13, color: 'var(--text-3)', maxWidth: 300, margin: '0 auto' }}>Nenhuma cobrança vinculada à sua transportadora no momento.</div>
      </div>
    );
  }
  const visibleStatuses = SO.filter(s => ['cobr_tr','tr_contestou','tr_concordou','tr_nao_resp','emitida','cobrada'].includes(s.v));
  return <NoteListView {...props} notes={notes} mode="cobr" statusOptions={visibleStatuses} emptyMessage="Nenhuma cobrança encontrada." />;
}
