// useRealtime — assina mudanças do Supabase e dispara callbacks
// Tabelas monitoradas: portal_statuses, portal_extras, portal_history,
//                      portal_note_meta, portal_notifications
import { useEffect, useRef } from 'react';
import { supabase } from '../config/constants';

export function useRealtime({ onStatusChange, onExtrasChange, onHistoryChange, onNoteMetaChange, onNotificationChange } = {}) {
  const channelRef = useRef(null);

  useEffect(() => {
    // Criar canal único com todas as subscriptions
    const channel = supabase
      .channel('portal-realtime', { config: { broadcast: { self: false } } })

      // portal_statuses — qualquer mudança de status (INSERT ou UPDATE)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'portal_statuses',
      }, (payload) => {
        console.info('[Realtime] portal_statuses:', payload.eventType, payload.new?.key);
        onStatusChange?.(payload);
      })

      // portal_extras — transportador vinculado, CT-e, aceite, etc.
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'portal_extras',
      }, (payload) => {
        console.info('[Realtime] portal_extras:', payload.eventType, payload.new?.key);
        onExtrasChange?.(payload);
      })

      // portal_history — nova entrada na linha do tempo
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'portal_history',
      }, (payload) => {
        console.info('[Realtime] portal_history insert:', payload.new?.nf_key);
        onHistoryChange?.(payload);
      })

      // portal_note_meta — prioridade, responsável, próx. ação
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'portal_note_meta',
      }, (payload) => {
        console.info('[Realtime] portal_note_meta:', payload.eventType, payload.new?.nf_key);
        onNoteMetaChange?.(payload);
      })

      // portal_notifications — novas notificações
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'portal_notifications',
      }, (payload) => {
        console.info('[Realtime] portal_notifications insert');
        onNotificationChange?.(payload);
      })

      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.info('[Realtime] Canal conectado ✓');
        } else if (status === 'CHANNEL_ERROR') {
          console.warn('[Realtime] Erro no canal — tentando reconectar...');
        }
      });

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
    };
  }, []); // eslint-disable-line
}
