import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { login as apiLogin, refreshToken, changePassword } from '../config/supabase';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [needsPwChange, setNeedsPwChange] = useState(false);

  useEffect(() => {
    const savedToken = localStorage.getItem('sb_token');
    const savedUser = localStorage.getItem('sb_user');
    if (savedToken && savedUser) {
      try {
        const u = JSON.parse(savedUser);
        if (!u.role) u.role = u.appMeta?.role || u.meta?.role || 'internal';
        if (!u.transportador) u.transportador = u.appMeta?.transportador || u.meta?.transportador || '';
        if (!u.id) u.id = u.meta?.id || '';
        setUser(u);
        setToken(savedToken);
        refreshToken(savedToken).then(r => {
          if (r) {
            setToken(r.token);
            localStorage.setItem('sb_token', r.token);
            localStorage.setItem('sb_refresh', r.refresh);
          }
        }).catch(() => {}).finally(() => setLoading(false));
      } catch { setLoading(false); }
    } else {
      setLoading(false);
    }
  }, []);

  const doLogin = useCallback(async (email, password) => {
    const result = await apiLogin(email, password);
    const um = result.user.user_metadata || result.user.meta || {};
    const am = result.user.app_metadata || {};
    const u = {
      id: result.user.id || '',
      email: result.user.email || email,
      name: um.name || am.name || email.split('@')[0],
      meta: um,
      appMeta: am,
      role: am.role || um.role || 'internal',
      transportador: am.transportador || um.transportador || ''
    };
    setToken(result.token);
    setUser(u);
    localStorage.setItem('sb_token', result.token);
    localStorage.setItem('sb_refresh', result.refresh);
    localStorage.setItem('sb_user', JSON.stringify(u));
    if (!um.pw_changed) {
      setNeedsPwChange(true);
      return { needsPwChange: true };
    }
    return { needsPwChange: false };
  }, []);

  const doChangePassword = useCallback(async (newPassword) => {
    await changePassword(token, newPassword);
    const updated = { ...user, meta: { ...user.meta, pw_changed: true } };
    setUser(updated);
    setNeedsPwChange(false);
    localStorage.setItem('sb_user', JSON.stringify(updated));
  }, [token, user]);

  const doLogout = useCallback(() => {
    setUser(null);
    setToken(null);
    setNeedsPwChange(false);
    localStorage.removeItem('sb_token');
    localStorage.removeItem('sb_refresh');
    localStorage.removeItem('sb_user');
  }, []);

  const isTransporter = user?.role === 'transportador';
  const transporterName = user?.transportador || user?.appMeta?.transportador || user?.meta?.transportador || '';

  return (
    <AuthContext.Provider value={{
      user, token, loading, needsPwChange,
      isTransporter, transporterName,
      login: doLogin, logout: doLogout, changePassword: doChangePassword
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
