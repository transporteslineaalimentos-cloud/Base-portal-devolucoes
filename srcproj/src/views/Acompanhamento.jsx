import { useMemo } from 'react';
import { TK_TRANSP_TRACKING } from '../config/constants';
import { getTracking, getTransporter, calcAging, agingCategory } from '../utils/helpers';
import NoteListView from './NoteListView';
import { TK } from '../config/constants';

// Aba "Em acompanhamento" — mostra somente as notas TK onde o transportador
// está responsável pelo tracking (retorno_auto, ag_consolidacao, em_transito,
// recebida_filial, agend_solicitado, agend_confirmado, agendado, perdeu_agenda)
export default function Acompanhamento(props) {
  const { notes = [], statuses = {} } = props;

  const filtered = useMemo(() =>
    notes.filter(n => TK_TRANSP_TRACKING.includes(getTracking(n, statuses)))
  , [notes, statuses]);

  const statusOptions = TK.filter(t => TK_TRANSP_TRACKING.includes(t.v));

  return (
    <NoteListView
      {...props}
      notes={filtered}
      mode="pend"
      statusOptions={statusOptions}
      emptyMessage="Nenhuma nota aguardando atualização do transportador."
    />
  );
}
