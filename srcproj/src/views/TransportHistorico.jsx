import NoteListView from './NoteListView';
import { SO, TK } from '../config/constants';
export default function TransportHistorico(props) {
  const { notes = [] } = props;
  if (notes.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '64px 24px' }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>📂</div>
        <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)', marginBottom: 8 }}>Nenhuma nota encontrada</div>
        <div style={{ fontSize: 13, color: 'var(--text-3)', maxWidth: 300, margin: '0 auto' }}>Não há notas vinculadas à sua transportadora.</div>
      </div>
    );
  }
  const allStatuses = [
    ...SO.filter(s => ['cobr_tr','tr_contestou','tr_concordou','tr_nao_resp','emitida','cobrada','paga','cancelada'].includes(s.v)),
    ...TK,
  ];
  return <NoteListView {...props} notes={notes} mode="pend" statusOptions={allStatuses} emptyMessage="Nenhuma nota encontrada." />;
}
