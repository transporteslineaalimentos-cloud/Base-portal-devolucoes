import { useCallback, useEffect, useState } from 'react';
import { dbCreateNotification, dbLoadNotifications, dbMarkNotificationRead } from '../config/supabase';
export function useNotifications(user) {
  const [notifications, setNotifications] = useState([]);
  useEffect(() => {
    if (!user?.email) return;
    dbLoadNotifications(user.email).then(setNotifications);
  }, [user?.email]);
  const markRead = useCallback(async (notification) => {
    if (!notification?.id) return;
    await dbMarkNotificationRead(notification.id);
    setNotifications(prev => prev.map(n => n.id === notification.id ? { ...n, lido: true } : n));
  }, []);
  const createNotification = useCallback(async (payload) => {
    await dbCreateNotification(payload);
    setNotifications(prev => [payload, ...prev]);
  }, []);
  return { notifications, markRead, createNotification };
}
