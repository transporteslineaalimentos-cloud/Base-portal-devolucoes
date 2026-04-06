import { calcAging, getStatus, getTracking } from './helpers';
export const RULES = [
  { nome: 'Área Transporte → Responsável', trigger: 'import', condition: (note) => note.ar === 'TRANSPORTE', action: () => ({ responsavel: 'equipe_transporte@linea.com' }) },
  { nome: 'Retorno autorizado → Flag', trigger: 'tracking_change', condition: (note, payload) => payload?.newTracking === 'retorno_auto', action: () => ({ retorno_autorizado: true }) },
  { nome: 'Cobrada → Travar edição', trigger: 'status_change', condition: (note, payload) => payload?.newStatus === 'cobrada', action: () => ({ locked: true }) },
  { nome: 'Aging > 15 dias → Prioridade alta', trigger: 'daily', condition: (note) => (calcAging(note) || 0) > 15, action: () => ({ prioridade: 'alta' }) }
];
export function applyRules(notes, noteMeta, statuses) {
  const patches = {};
  notes.forEach(note => {
    RULES.forEach(rule => {
      if (rule.trigger === 'daily' && rule.condition(note, { status: getStatus(note, statuses), tracking: getTracking(note, statuses) })) {
        patches[note.nfd + '|' + note.nfo] = { ...(patches[note.nfd + '|' + note.nfo] || {}), ...rule.action(note) };
      }
    });
  });
  return patches;
}
