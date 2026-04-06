export default function KPICard({ label, value, sub, color, onClick, icon, delta }) {
  return (
    <div className={`stat-card ${onClick ? 'cursor-pointer' : ''}`} style={{ borderLeftColor: color || 'var(--gold)' }} onClick={onClick}>
      <div className="kpi-label">{label}</div>
      <div className="kpi-value" style={{ color: 'var(--text)', fontSize: 22 }}>{value}</div>
      {sub && <div className="kpi-sub" style={{ color: color || 'var(--gold)', fontWeight: 600 }}>{sub}</div>}
    </div>
  );
}
export function HeroCard({ label, value, sub, trend = [], color = 'var(--gold)', onClick, icon }) {
  const sparkPath = (() => {
    if (trend.length < 2) return '';
    const w = 120, h = 36;
    const max = Math.max(...trend, 1);
    const min = Math.min(...trend);
    const range = max - min || 1;
    const points = trend.map((v, i) => { const x = (i / (trend.length - 1)) * w; const y = h - ((v - min) / range) * (h - 4) - 2; return `${x},${y}`; });
    const areaClose = `L${(trend.length-1)/(trend.length-1)*w},${h} L0,${h} Z`;
    return { line: `M${points.join('L')}`, area: `M${points.join('L')} ${areaClose}` };
  })();
  return (
    <div className="kpi-hero" onClick={onClick}>
      {icon && <div className="kpi-icon" style={{ background: 'var(--gold-dim)' }}>{icon}</div>}
      <div className="kpi-label">{label}</div>
      <div className="kpi-value">{value}</div>
      <div className="kpi-sub">{sub}</div>
      {sparkPath && (
        <div className="sparkline">
          <svg viewBox="0 0 120 36" preserveAspectRatio="none">
            <defs>
              <linearGradient id={`sg_${label?.replace(/\s/g,'')}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity="0.3"/>
                <stop offset="100%" stopColor={color} stopOpacity="0"/>
              </linearGradient>
            </defs>
            <path d={sparkPath.area} fill={`url(#sg_${label?.replace(/\s/g,'')})`} />
            <path d={sparkPath.line} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
      )}
    </div>
  );
}
