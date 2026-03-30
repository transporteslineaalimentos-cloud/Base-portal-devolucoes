import NoteListView from './NoteListView';
import { TK } from '../config/constants';

export default function PendLancamento(props) {
  return <NoteListView {...props} mode="pend" statusOptions={TK.filter(t => !['encaminhar','ret_nao_auto'].includes(t.v))} />;
}
