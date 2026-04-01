import { useEffect, useMemo, useState } from 'react';
import { dbLoadProfile } from '../config/supabase';

const FALLBACK = {
  admin:             { tabs: ['dashboard','cobranca','lancamento','acompanhamento','nfDebito','transportadores','aging','auditoria','usuarios'], can_edit_cobr: true, can_edit_lanc: true, can_import: true, can_export: true, can_email: true, can_emit_nf: true, note_filter: null },
  internal:          { tabs: ['dashboard','cobranca','lancamento','acompanhamento','nfDebito','transportadores','aging','auditoria'], can_edit_cobr: true, can_edit_lanc: true, can_import: true, can_export: true, can_email: true, can_emit_nf: true, note_filter: null },
  transporte:        { tabs: ['dashboard','lancamento','acompanhamento','aging'], can_edit_cobr: false, can_edit_lanc: true, can_import: false, can_export: true, can_email: false, can_emit_nf: false, note_filter: { area: 'TRANSPORTE' } },
  controladoria:     { tabs: ['dashboard','cobranca','nfDebito'], can_edit_cobr: true, can_edit_lanc: false, can_import: false, can_export: true, can_email: true, can_emit_nf: true, note_filter: null },
  logistica_reversa: { tabs: ['dashboard','lancamento','acompanhamento','aging'], can_edit_cobr: false, can_edit_lanc: true, can_import: false, can_export: true, can_email: false, can_emit_nf: false, note_filter: { area: 'LOGÍSTICA REVERSA' } },
  comercial:         { tabs: ['dashboard'], can_edit_cobr: false, can_edit_lanc: false, can_import: false, can_export: true, can_email: false, can_emit_nf: false, note_filter: null },
  transportador:     { tabs: ['tr_dash','tr_retorno','tr_cobranca'], can_edit_cobr: false, can_edit_lanc: false, can_import: false, can_export: false, can_email: false, can_emit_nf: false, note_filter: null }
};

export function usePermissions(user) {
  const [profile, setProfile] = useState(FALLBACK[user?.role || 'internal']);

  useEffect(() => {
    let active = true;
    async function load() {
      if (!user?.role) return;
      const dbProfile = await dbLoadProfile(user.role);
      if (active) setProfile(dbProfile || FALLBACK[user.role] || FALLBACK.internal);
    }
    load();
    return () => { active = false; };
  }, [user?.role]);

  const enrichedTabs = useMemo(() => {
    const baseTabs = profile?.tabs || FALLBACK.internal.tabs;
    if (user?.role === 'admin' && !baseTabs.includes('usuarios')) return [...baseTabs, 'usuarios'];
    return baseTabs;
  }, [profile, user?.role]);

  return useMemo(() => ({
    visibleTabs: enrichedTabs,
    canEditCobr: !!profile?.can_edit_cobr,
    canEditLanc: !!profile?.can_edit_lanc,
    canImport: !!profile?.can_import,
    canExport: profile?.can_export !== false,
    canEmail: !!profile?.can_email,
    canEmitNf: !!profile?.can_emit_nf,
    noteFilter: profile?.note_filter || null,
    profile,
  }), [enrichedTabs, profile]);
}
