import { fmt, getNoteKey, getStatus, getTracking, getTransporter, getSOByValue, getTKByValue, calcAging, agingCategory, checkDateMatch, fmtDateTime, deriveWorkflow } from '../utils/helpers';
import StatusButtons from './StatusButtons';
import ChatPanel from './ChatPanel';
import NoteMetaPanel from './NoteMetaPanel';
import AcceptanceForm from './AcceptanceForm';
import ProtectedAction from './ProtectedAction';

export default function NoteCard({
  note, index, mode, expandedId, setExpandedId, statuses, extras, history, isTransporter,
  detailTab, setDetailTab, addChatMessage, user, onStatus, onTracking, onOpenEmail,
  onEditTransporter, onSaveAcceptance, acceptanceData, permissions, noteMeta, saveMeta,
  selected, toggleSelected, showSelection = true, users = []
}) {
  const key = getNoteKey(note);
  const uid = `${mode}_${index}_${key}`;
  const isExp = expandedId === uid;
  const st = mode === 'cobr' ? getStatus(note, statuses) : getTracking(note, statuses);
  const stObj = mode === 'cobr' ? getSOByValue(st) : getTKByValue(st);
  const days = calcAging(note), agCat = days !== null ? agingCategory(days) : null;
  const dtMatch = checkDateMatch(note);
  const chat = extras['chat:' + key]?.msgs || (Array.isArray(extras['chat:' + key]) ? extras['chat:' + key] : []);
  const tr = getTransporter(note, extras);
  const dTab = detailTab[key] || 'chat';
  const ex = extras[key] || {};
  const acceptanceKey = 'aceite:' + key;
  const acceptance = acceptanceData?.[acceptanceKey] || extras[acceptanceKey];
  const noteHist = history.filter(h => h.nf_key === key).slice(0, 12);
  const meta = noteMeta?.[key] || {};
  const processInfo = deriveWorkflow(mode, st, meta);

  return (
    <div className={`note-card rounded-[1rem] border mb-2 shadow-sm overflow-hidden transition relative premium-glow ${isExp ? 'border-blue-400 shadow-md' : 'border-gray-100 hover:border-gray-300'}`}>
      <div className="px-4 py-3 flex items-center gap-3 cursor-pointer flex-wrap" onClick={() => setExpandedId(isExp ? null : uid)}>
        {showSelection && !isTransporter && (
          <input type="checkbox" checked={selected.has(key)} onChange={(e) => { e.stopPropagation(); toggleSelected(key); }} onClick={e => e.stopPropagation()} className="w-4 h-4" />
        )}
        <div className="flex-1 min-w-[180px]">
          <div className="flex items-center gap-2 flex-wrap">
            {note.t === 'P' ? <><span className="text-sm font-bold text-[#1a365d]">NFD {note.nfd}</span><span className="text-[11px] text-gray-400">NFO {note.nfo}</span></> : <span className="text-sm font-bold text-[#1a365d]">NFO {note.nfo}</span>}
            <span className={`text-[9px] text-white px-1.5 py-0.5 rounded font-bold ${note.t === 'P' ? 'bg-indigo-500' : 'bg-yellow-500'}`}>{note.t === 'P' ? 'PARCIAL' : 'TOTAL'}</span>
            <span className="section-chip bg-slate-50 text-slate-700 border border-slate-200">{processInfo.queue}</span>
            {mode === 'cobr' && note.p.length > 0 && <span className="text-[10px] text-green-600 font-semibold">✓ {note.p.length} prod.</span>}
            {chat.length > 0 && <span className="text-[9px] text-purple-600 font-semibold">💬 {chat.length}</span>}
            {acceptance?.accepted && <span className="text-[9px] text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-2 py-0.5 font-semibold">Aceite registrado</span>}
            {meta.prioridade && <span className={`text-[9px] rounded-full px-2 py-0.5 font-semibold ${meta.prioridade === 'alta' ? 'bg-red-50 text-red-700 border border-red-200' : meta.prioridade === 'media' ? 'bg-yellow-50 text-yellow-700 border border-yellow-200' : 'bg-green-50 text-green-700 border border-green-200'}`}>{meta.prioridade}</span>}
            {processInfo.transporterVisible && <span className="text-[9px] rounded-full px-2 py-0.5 font-semibold bg-blue-50 text-blue-700 border border-blue-200">Visível ao transportador</span>}
            {dtMatch && <span className={`text-[9px] font-bold px-2 py-0.5 rounded ${dtMatch.ok ? 'bg-green-50 text-green-600 border border-green-200' : 'bg-red-50 text-red-600 border border-red-200'}`}>{dtMatch.ok ? '✓' : '⚠'} {dtMatch.msg}</span>}
          </div>
          <div className="text-[11px] text-red-500 font-semibold mt-0.5">{note.mo}</div>
          <div className="text-[11px] text-gray-500">{note.cl}</div>
          {tr && <div className="text-[11px] text-blue-600 font-semibold">{tr}</div>}
          <div className="flex items-center gap-2 flex-wrap mt-1">
            <span className="text-[10px] text-gray-500">Pendência: <strong className="text-gray-700">{processInfo.pendingWith}</strong></span>
            <span className="text-[10px] text-gray-500">Posição transp.: <strong className="text-gray-700">{processInfo.transporterResponse}</strong></span>
          </div>
          {meta.responsavel && <div className="text-[10px] text-gray-400 mt-0.5">Resp.: {meta.responsavel}</div>}
        </div>
        <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold border" style={{ color: stObj.c, background: stObj.bg, borderColor: stObj.c + '33' }}>{mode === 'cobr' ? stObj.l : `${stObj.i} ${stObj.l}`}</span>
        {days !== null && <span className="text-[10px] font-bold px-2 py-1 rounded-lg" style={{ color: agCat?.color, background: agCat?.bg }}>{days}d</span>}
        <div className="text-right min-w-[110px]">
          <div className="text-[15px] font-bold text-gray-800">{fmt(note.v)}</div>
          <div className="text-[10px] text-gray-400">{note.uf} · {note.dt || '—'}</div>
        </div>
      </div>

      {isExp && (
        <div className="note-detail px-4 pb-4 pt-1 border-t border-gray-100">
          <div className="grid md:grid-cols-3 gap-3 mb-3">
            <div className="rounded-xl border border-blue-100 bg-blue-50 p-3">
              <div className="text-[10px] font-bold uppercase tracking-wide text-blue-700 mb-1">Próxima ação sugerida</div>
              <div className="text-sm font-semibold text-blue-900">{meta.proxima_acao || processInfo.nextAction}</div>
            </div>
            <div className="rounded-xl border border-amber-100 bg-amber-50 p-3">
              <div className="text-[10px] font-bold uppercase tracking-wide text-amber-700 mb-1">Fluxo / dono da bola</div>
              <div className="text-sm font-semibold text-amber-900">{processInfo.pendingWith}</div>
              <div className="text-[11px] text-amber-700 mt-1">Transportador: {processInfo.transporterVisible ? 'já vê a nota' : 'ainda não vê a nota'}</div>
            </div>
            <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-3">
              <div className="text-[10px] font-bold uppercase tracking-wide text-emerald-700 mb-1">Fechamento</div>
              <div className="text-sm font-semibold text-emerald-900">{processInfo.closeRule}</div>
            </div>
          </div>

          <div className="text-[11px] text-gray-500 mb-2"><strong>Motivo:</strong> {note.mo} · <strong>Transportador:</strong> {tr || 'Não identificado'} {ex.nfDeb && <>· <strong>NF Débito:</strong> {ex.nfDeb}</>} {ex.pedido && <>· <strong>Pedido:</strong> {ex.pedido}</>}</div>
          {ex.pdfUrl && <div className="mb-2"><a href={ex.pdfUrl} target="_blank" rel="noreferrer" className="text-[11px] font-semibold text-blue-600">📄 Abrir PDF da NF Débito</a></div>}
          <div className="flex gap-2 flex-wrap mb-3">
            <ProtectedAction allowed={mode === 'cobr' ? (isTransporter || permissions.canEditCobr) : permissions.canEditLanc || isTransporter}>
              <StatusButtons
                mode={mode}
                isTransporter={isTransporter}
                currentValue={st}
                canTransporterAct={processInfo.transporterCanAct}
                onStatus={(val, label, isEmitida) => onStatus(key, val, label, isEmitida)}
                onTracking={(val, label, hasDate) => onTracking(key, val, label, hasDate)}
              />
            </ProtectedAction>
            {!isTransporter && permissions.canEmail && <button onClick={() => onOpenEmail([note], tr)} className="px-3 py-1.5 rounded-lg text-[11px] font-semibold border border-blue-200 bg-blue-50 text-blue-700">Enviar email</button>}
            {!isTransporter && <button onClick={() => onEditTransporter(note)} className="px-3 py-1.5 rounded-lg text-[11px] font-semibold border border-gray-200 bg-white text-gray-700">Editar transportador</button>}
            {isTransporter && mode === 'cobr' && <button onClick={() => onSaveAcceptance.open(key)} className="px-3 py-1.5 rounded-lg text-[11px] font-semibold border border-emerald-200 bg-emerald-50 text-emerald-700">Aceite formal</button>}
          </div>
          <div className="flex gap-1 mb-2">
            <button onClick={() => setDetailTab({ ...detailTab, [key]: 'chat' })} className={`px-3 py-1 rounded-lg text-[10px] font-semibold ${dTab === 'chat' ? 'bg-[#1a365d] text-white' : 'bg-gray-200 text-gray-500'}`}>💬 Chat ({chat.length})</button>
            <button onClick={() => setDetailTab({ ...detailTab, [key]: 'hist' })} className={`px-3 py-1 rounded-lg text-[10px] font-semibold ${dTab === 'hist' ? 'bg-[#1a365d] text-white' : 'bg-gray-200 text-gray-500'}`}>📋 Histórico</button>
            {!isTransporter && <button onClick={() => setDetailTab({ ...detailTab, [key]: 'meta' })} className={`px-3 py-1 rounded-lg text-[10px] font-semibold ${dTab === 'meta' ? 'bg-[#1a365d] text-white' : 'bg-gray-200 text-gray-500'}`}>⚙️ Gestão</button>}
          </div>

          {dTab === 'hist' && (
            <div>{noteHist.map((h, i) => <div key={i} className="text-[10px] text-gray-500 py-0.5">{fmtDateTime(h.created_at)} · <strong>{h.action}</strong>: {h.status_to} <span className="text-purple-500">{h.user_name}</span>{h.observation && ' — ' + h.observation}</div>)}</div>
          )}
          {dTab === 'chat' && (
            <ChatPanel noteKey={key} chat={chat} addChatMessage={addChatMessage} userName={user?.name} role={isTransporter ? 'transportador' : 'interno'} />
          )}
          {dTab === 'meta' && !isTransporter && (
            <NoteMetaPanel noteKey={key} meta={meta} onSave={saveMeta} users={users} processInfo={processInfo} />
          )}

          {!!note.p.length && (
            <div className="mt-3">
              <div className="text-[10px] font-bold text-gray-500 uppercase mb-2">Produtos</div>
              <div className="overflow-auto rounded-xl border border-gray-200 bg-white">
                <table className="w-full text-[11px]">
                  <thead><tr className="bg-gray-50"><th className="px-3 py-2 text-left">Código</th><th className="px-3 py-2 text-left">Descrição</th><th className="px-3 py-2 text-center">Qtd</th><th className="px-3 py-2 text-right">Valor</th></tr></thead>
                  <tbody>{note.p.map((p, idx) => <tr key={idx} className={idx % 2 ? 'bg-gray-50/50' : ''}><td className="px-3 py-2 font-mono">{p.cod}</td><td className="px-3 py-2">{p.desc}</td><td className="px-3 py-2 text-center">{p.qt}</td><td className="px-3 py-2 text-right">{fmt(p.vi)}</td></tr>)}</tbody>
                </table>
              </div>
            </div>
          )}

          <AcceptanceForm open={onSaveAcceptance.key === key && onSaveAcceptance.opened} onClose={onSaveAcceptance.close} onSave={(data) => onSaveAcceptance.save(key, data)} existing={acceptance} />
        </div>
      )}
    </div>
  );
}
