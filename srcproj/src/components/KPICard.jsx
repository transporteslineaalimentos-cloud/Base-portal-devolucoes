export default function KPICard({ label, value, sub, color = '#1a365d', onClick }) {
  return (
    <div onClick={onClick} className={`bg-white rounded-xl p-4 shadow-sm border border-gray-100 ${onClick ? 'cursor-pointer hover:shadow-md hover:-translate-y-0.5' : ''} transition`} style={{ borderLeftColor: color, borderLeftWidth: 3 }}>
      <div className="text-[10px] text-gray-500 font-semibold uppercase tracking-wide mb-1">{label}</div>
      <div className="text-2xl font-bold" style={{ color }}>{value}</div>
      <div className="text-xs text-gray-400 mt-0.5">{sub}</div>
    </div>
  );
}
