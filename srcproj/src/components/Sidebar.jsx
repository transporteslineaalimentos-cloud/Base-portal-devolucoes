import { useState } from 'react';

/* ── Inline SVG icons (sem dependência externa) ── */
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
  cobranca:      'M3 11l19-9-9 19-2-8-8-2z',
  lancamento:    'M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z',
  nfDebito:      'M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8zm-2 9H8m4 4H8m2-8H8',
  transportador: 'M1 3h15v13H1zm15 5h4l3 3v5h-7V8zM5.5 21a1.5 1.5 0 100-3 1.5 1.5 0 000 3zm13 0a1.5 1.5 0 100-3 1.5 1.5 0 000 3z',
  aging:         'M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10zm0-6V12l4 2',
  historico:     'M3 12h18M3 6h18M3 18h18',
  auditoria:     'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z',
  usuarios:      'M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zm14 10v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75',
  chevronLeft:   'M15 18l-6-6 6-6',
  chevronRight:  'M9 18l6-6-6-6',
  chevronDown:   'm6 9 6 6 6-6',
  exit:          'M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9',
  bell:          'M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9m-4.27 13a2 2 0 01-3.46 0',
  sun:           'M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42M12 8a4 4 0 100 8 4 4 0 000-8z',
  moon:          'M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z',
};

/* ── NAV CONFIG ── */
function buildNav(visibleTabs, counts = {}) {
  const all = [
    { id: 'dashboard',       label: 'Dashboard',              icon: icons.dashboard },
    { id: 'dashboard_adv',   label: 'Dashboard Executivo',    icon: icons.dashboard_adv },
    { id: 'cobranca',        label: 'Cobranças',          icon: icons.cobranca,   count: counts.cobranca,   parent: 'cobr_group' },
    { id: 'nfDebito',        label: 'NFs Débito',         icon: icons.nfDebito,                             parent: 'cobr_group' },
    { id: 'lancamento',      label: 'Todas as notas',     icon: icons.lancamento, count: counts.lancamento, parent: 'devol_group' },
    { id: 'acompanhamento',  label: 'Em acompanhamento',  icon: icons.aging,      count: counts.acompanhamento, parent: 'devol_group' },
    { id: 'transportadores', label: 'Transportadores',    icon: icons.transportador },
    { id: 'aging',           label: 'Aging',              icon: icons.aging },
    { id: 'auditoria',       label: 'Auditoria',          icon: icons.auditoria },
    { id: 'usuarios',        label: 'Usuários',           icon: icons.usuarios },
    // transportador
    { id: 'tr_dash',         label: 'Dashboard',          icon: icons.dashboard },
    { id: 'tr_retorno',      label: 'Devoluções',         icon: icons.lancamento, count: counts.lancamento },
    { id: 'tr_cobranca',     label: 'Cobranças',          icon: icons.cobranca,   count: counts.cobranca },
  ];
  return all.filter(item => visibleTabs.includes(item.id));
}

export default function Sidebar({ tab, onChangeTab, visibleTabs = [], counts = {}, user, onLogout, isDark, onToggleTheme, isTransporter }) {
  const [collapsed, setCollapsed] = useState(false);
  const [cobrOpen, setCobrOpen] = useState(true);
  const [devolOpen, setDevolOpen] = useState(true);

  const navItems = buildNav(visibleTabs, counts);

  // Separate groups
  const cobrGroup  = navItems.filter(i => i.parent === 'cobr_group');
  const devolGroup = navItems.filter(i => i.parent === 'devol_group');
  const mainItems  = navItems.filter(i => !i.parent);

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
            {/* Dashboard */}
            {mainItems.filter(i => i.id === 'dashboard').map(i => renderItem(i))}

            {/* Cobranças group */}
            {cobrGroup.length > 0 && (
              <>
                {!collapsed && (
                  <button
                    onClick={() => setCobrOpen(v => !v)}
                    className="nav-item"
                    style={{ color: 'var(--text-2)', marginTop: 4 }}
                  >
                    <Icon d={icons.cobranca} size={16} className="nav-icon" />
                    <span className="nav-label" style={{ flex: 1 }}>Cobranças</span>
                    <Icon d={icons.chevronDown} size={12}
                      style={{ transform: cobrOpen ? 'rotate(0)' : 'rotate(-90deg)', transition: 'transform 200ms', flexShrink: 0 }} />
                  </button>
                )}
                {(collapsed || cobrOpen) && cobrGroup.map(i => renderItem(i, !collapsed))}
              </>
            )}

            {/* Devoluções group */}
            {devolGroup.length > 0 && (
              <>
                {!collapsed && (
                  <button
                    onClick={() => setDevolOpen(v => !v)}
                    className="nav-item"
                    style={{ color: 'var(--text-2)', marginTop: 4 }}
                  >
                    <Icon d={icons.lancamento} size={16} className="nav-icon" />
                    <span className="nav-label" style={{ flex: 1 }}>Devoluções</span>
                    <Icon d={icons.chevronDown} size={12}
                      style={{ transform: devolOpen ? 'rotate(0)' : 'rotate(-90deg)', transition: 'transform 200ms', flexShrink: 0 }} />
                  </button>
                )}
                {(collapsed || devolOpen) && devolGroup.map(i => renderItem(i, !collapsed))}
              </>
            )}

            {/* Other items */}
            {mainItems.filter(i => i.id !== 'dashboard').map(i => renderItem(i))}
          </>
        )}
      </nav>

      {/* Footer */}
      <div className="sidebar-footer" style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {/* Theme toggle */}
        <button
          onClick={onToggleTheme}
          className="sidebar-toggle"
          title={isDark ? 'Modo claro' : 'Modo escuro'}
        >
          <Icon d={isDark ? icons.sun : icons.moon} size={16} />
          {!collapsed && (
            <span style={{ fontSize: 12, color: 'var(--text-2)', marginLeft: 8 }}>
              {isDark ? 'Modo claro' : 'Modo escuro'}
            </span>
          )}
        </button>

        {/* User + logout */}
        {user && (
          <button
            onClick={onLogout}
            className="sidebar-toggle"
            title="Sair"
          >
            <Icon d={icons.exit} size={16} style={{ color: 'var(--red)', opacity: 0.7 }} />
            {!collapsed && (
              <span style={{ fontSize: 11, color: 'var(--text-3)', marginLeft: 8, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {user.name || user.email}
              </span>
            )}
          </button>
        )}

        {/* Collapse toggle */}
        <button
          onClick={() => setCollapsed(v => !v)}
          className="sidebar-toggle"
          title={collapsed ? 'Expandir' : 'Recolher'}
        >
          <Icon d={collapsed ? icons.chevronRight : icons.chevronLeft} size={16} />
        </button>
      </div>
    </aside>
  );
}
