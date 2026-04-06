import NoteListView from './NoteListView';
import { SO } from '../config/constants';
export default function PendCobranca(props) {
  return <NoteListView {...props} mode="cobr" statusOptions={SO} />;
}
