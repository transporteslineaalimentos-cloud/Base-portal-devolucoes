import { SO, TK, TK_INTERNAL, TK_TRANSPORT } from '../config/constants';

export default function StatusButtons({ mode, isTransporter, onStatus, onTracking, currentValue, canTransporterAct = true }) {
  if (mode === 'cobr') {
    if (isTransporter) {
      if (!canTransporterAct) {
        return <span className="px-3 py-1.5 rounded-lg text-[11px] font-semibold border bg-gray-50 border-gray-200 text-gray-500">Aguardando ação interna</span>;
      }
      return (
        <>
          <button onClick={() => onStatus('tr_concordou', 'Aprovar cobrança', false)} className="px-3 py-1.5 rounded-lg text-[11px] font-semibold border-[1.5px] bg-white border-green-600 text-green-600">Aprovar</button>
          <button onClick={() => onStatus('tr_contestou', 'Contestar cobrança', false)} className="px-3 py-1.5 rounded-lg text-[11px] font-semibold border-[1.5px] bg-white border-red-600 text-red-600">Contestar</button>
          <button onClick={() => onStatus('tr_nao_resp', 'Não responsável', false)} className="px-3 py-1.5 rounded-lg text-[11px] font-semibold border-[1.5px] bg-white border-gray-500 text-gray-500">Não responsável</button>
        </>
      );
    }
    return SO.filter(s => !['tr_concordou', 'tr_contestou', 'tr_nao_resp'].includes(s.v)).map(s => (
      <button key={s.v} onClick={() => onStatus(s.v, s.l, s.v === 'emitida')} className="px-3 py-1.5 rounded-lg text-[11px] font-semibold border-[1.5px] bg-white hover:-translate-y-0.5 transition" style={{ borderColor: s.c, color: s.c }}>{s.l}</button>
    ));
  }

  if (isTransporter) {
    if (!canTransporterAct) {
      return <span className="px-3 py-1.5 rounded-lg text-[11px] font-semibold border bg-gray-50 border-gray-200 text-gray-500">Aguardando ação interna</span>;
    }
    const list = TK.filter(t => TK_TRANSPORT.includes(t.v));
    return list.map(t => (
      <button key={t.v} onClick={() => onTracking(t.v, t.l, !!t.hasDate)} className="px-3 py-1.5 rounded-lg text-[11px] font-semibold border-[1.5px] bg-white hover:-translate-y-0.5 transition" style={{ borderColor: t.c, color: t.c }}>{t.i} {t.l}</button>
    ));
  }

  const list = TK.filter(t => TK_INTERNAL.includes(t.v));
  return list.map(t => (
    <button key={t.v} onClick={() => onTracking(t.v, t.l, !!t.hasDate)} className="px-3 py-1.5 rounded-lg text-[11px] font-semibold border-[1.5px] bg-white hover:-translate-y-0.5 transition" style={{ borderColor: t.c, color: t.c }}>{t.i} {t.l}</button>
  ));
}
