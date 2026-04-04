import { useState } from 'react';

const Icon = ({ d, size = 18, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"
    strokeLinejoin="round" className={className}>
    <path d={d} />
  </svg>
);

const icons = {
  dashboard:     'M3 3h7v7H3zm11 0h7v7h-7zM3 14h7v7H3zm11 3a4 4 0 100-8 4 4 0 000 8z',
  dashboard_adv: 'M18 20V10M12 20V4M6 20v-6',
  aging:         'M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10zm0-6V12l4 2',
  cobranca:      'M3 11l19-9-9 19-2-8-8-2z',
  lancamento:    'M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z',
  nfDebito:      'M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8zm-2 9H8m4 4H8m2-8H8',
  transportador: 'M1 3h15v13H1zm15 5h4l3 3v5h-7V8zM5.5 21a1.5 1.5 0 100-3 1.5 1.5 0 000 3zm13 0a1.5 1.5 0 100-3 1.5 1.5 0 000 3z',
  auditoria:     'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z',
  usuarios:      'M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zm14 10v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75',
  chevronLeft:   'M15 18l-6-6 6-6',
  chevronRight:  'M9 18l6-6-6-6',
  chevronDown:   'm6 9 6 6 6-6',
  exit:          'M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9',
  barChart:      'M12 20V10m6 10V4M6 20v-4',
  sun:           'M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42M12 8a4 4 0 100 8 4 4 0 000-8z',
  moon:          'M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z',
};

// Tabs que pertencem ao grupo de análises
const ANALISES_TABS = ['dashboard', 'dashboard_adv', 'aging'];
// Tabs do grupo cobranças
const COBR_TABS = ['cobranca', 'nfDebito'];
// Tabs do grupo devoluções
const DEVOL_TABS = ['lancamento', 'acompanhamento'];

function buildNav(visibleTabs, counts = {}) {
  const all = [
    // Análises (grupo)
    { id: 'dashboard',       label: 'Dashboard',           icon: icons.dashboard,     group: 'analises' },
    { id: 'dashboard_adv',   label: 'Executivo',           icon: icons.dashboard_adv, group: 'analises' },
    { id: 'aging',           label: 'Aging',               icon: icons.aging,         group: 'analises' },
    // Cobranças (grupo)
    { id: 'cobranca',        label: 'Cobranças',           icon: icons.cobranca,      group: 'cobr', count: counts.cobranca },
    { id: 'nfDebito',        label: 'NFs Débito',          icon: icons.nfDebito,      group: 'cobr' },
    // Devoluções (grupo)
    { id: 'lancamento',      label: 'Todas as notas',      icon: icons.lancamento,    group: 'devol', count: counts.lancamento },
    { id: 'acompanhamento',  label: 'Em acompanhamento',   icon: icons.aging,         group: 'devol', count: counts.acompanhamento },
    // Standalone
    { id: 'transportadores', label: 'Transportadores',     icon: icons.transportador },
    { id: 'auditoria',       label: 'Auditoria',           icon: icons.auditoria },
    { id: 'usuarios',        label: 'Usuários',            icon: icons.usuarios },
    // Transportador
    { id: 'tr_dash',         label: 'Dashboard',           icon: icons.dashboard },
  ];
  return all.filter(i => visibleTabs.includes(i.id));
}

export default function Sidebar({ tab, onChangeTab, visibleTabs = [], counts = {}, user, onLogout, isDark, onToggleTheme, isTransporter }) {
  const [collapsed, setCollapsed]     = useState(false);
  const [analisesOpen, setAnalisesOpen] = useState(true);
  const [cobrOpen, setCobrOpen]       = useState(true);
  const [devolOpen, setDevolOpen]     = useState(true);

  const navItems = buildNav(visibleTabs, counts);

  const analisesGroup = navItems.filter(i => i.group === 'analises');
  const cobrGroup     = navItems.filter(i => i.group === 'cobr');
  const devolGroup    = navItems.filter(i => i.group === 'devol');
  const standalone    = navItems.filter(i => !i.group);

  const renderItem = (item, isChild = false) => {
    const active = tab === item.id;
    return (
      <button
        key={item.id}
        onClick={() => onChangeTab(item.id)}
        className={`nav-item ${isChild ? 'nav-item-sub' : ''} ${active ? 'active' : ''}`}
        title={collapsed ? item.label : undefined}
      >
        <Icon d={item.icon} size={16} className="nav-icon" />
        {!collapsed && (
          <>
            <span className="nav-label">{item.label}</span>
            {item.count != null && item.count > 0 && (
              <span className="nav-badge">{item.count}</span>
            )}
          </>
        )}
      </button>
    );
  };

  const renderGroup = (groupItems, label, iconPath, open, setOpen) => {
    if (!groupItems.length) return null;
    // Se algum item do grupo está ativo, mostrar grupo expandido por padrão
    const hasActive = groupItems.some(i => i.id === tab);
    return (
      <>
        {!collapsed && (
          <button
            onClick={() => setOpen(v => !v)}
            className={`nav-item nav-group-header ${hasActive ? 'group-has-active' : ''}`}
          >
            <Icon d={iconPath} size={16} className="nav-icon" />
            <span className="nav-label" style={{ flex: 1 }}>{label}</span>
            <Icon d={icons.chevronDown} size={12}
              style={{ transform: open ? 'rotate(0)' : 'rotate(-90deg)', transition: 'transform 200ms', flexShrink: 0 }} />
          </button>
        )}
        {(collapsed || open) && groupItems.map(i => renderItem(i, !collapsed))}
      </>
    );
  };

  return (
    <aside className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
      {/* Logo */}
      <div className="sidebar-logo">
        <img src="/linea-logo.png" alt="Linea" onError={e => { e.target.style.display='none'; }} />
        {!collapsed && (
          <div className="sidebar-brand">
            <span className="sidebar-brand-name">Linea</span>
            <span className="sidebar-brand-sub">Devoluções</span>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="sidebar-nav">
        {isTransporter ? (
          navItems.map(i => renderItem(i))
        ) : (
          <>
            {/* Análises — Dashboard + Executivo + Aging */}
            {renderGroup(analisesGroup, 'Análises', icons.barChart, analisesOpen, setAnalisesOpen)}

            {/* Cobranças — Cobranças + NFs Débito */}
            {renderGroup(cobrGroup, 'Cobranças', icons.cobranca, cobrOpen, setCobrOpen)}

            {/* Devoluções — Todas + Acompanhamento */}
            {renderGroup(devolGroup, 'Devoluções', icons.lancamento, devolOpen, setDevolOpen)}

            {/* Standalone */}
            {standalone.map(i => renderItem(i))}
          </>
        )}
      </nav>

      {/* Footer */}
      <div className="sidebar-footer" style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <button onClick={onToggleTheme} className="sidebar-toggle" title={isDark ? 'Modo claro' : 'Modo escuro'}>
          <Icon d={isDark ? icons.sun : icons.moon} size={16} />
          {!collapsed && (
            <span style={{ fontSize: 12, color: 'var(--text-2)', marginLeft: 8 }}>
              {isDark ? 'Modo claro' : 'Modo escuro'}
            </span>
          )}
        </button>

        {user && (
          <button onClick={onLogout} className="sidebar-toggle" title="Sair">
            <Icon d={icons.exit} size={16} style={{ color: 'var(--red)', opacity: 0.7 }} />
            {!collapsed && (
              <span style={{ fontSize: 11, color: 'var(--text-3)', marginLeft: 8, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {user.name || user.email}
              </span>
            )}
          </button>
        )}

        <button onClick={() => setCollapsed(v => !v)} className="sidebar-toggle" title={collapsed ? 'Expandir' : 'Recolher'}>
          <Icon d={collapsed ? icons.chevronRight : icons.chevronLeft} size={16} />
        </button>
      </div>
    </aside>
  );
}
