import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { login as apiLogin, refreshToken, changePassword, syncAuthToken } from '../config/supabase';

const AuthContext = createContext(null);

// Tempo em ms para fazer refresh antes da expiração (45 minutos)
const REFRESH_INTERVAL = 45 * 60 * 1000;

export function AuthProvider({ children }) {
  const [user, setUser]               = useState(null);
  const [token, setToken]             = useState(null);
  const [loading, setLoading]         = useState(true);
  const [needsPwChange, setNeedsPwChange] = useState(false);
  const refreshTimerRef               = useRef(null);

  // ── Agenda refresh automático do token ──────────────────────────
  const scheduleRefresh = useCallback((currentToken) => {
    if (refreshTimerRef.current) clearInterval(refreshTimerRef.current);
    refreshTimerRef.current = setInterval(async () => {
      console.info('[Auth] Renovando token preventivamente...');
      const r = await refreshToken(currentToken).catch(() => null);
      if (r) {
        setToken(r.token);
        localStorage.setItem('sb_token', r.token);
        localStorage.setItem('sb_refresh', r.refresh);
        syncAuthToken();
        console.info('[Auth] Token renovado com sucesso');
      } else {
        console.warn('[Auth] Falha no refresh — usuário pode precisar relogar');
      }
    }, REFRESH_INTERVAL);
  }, []);

  // ── Restore de sessão ao carregar a página ──────────────────────
  useEffect(() => {
    const savedToken = localStorage.getItem('sb_token');
    const savedUser  = localStorage.getItem('sb_user');

    if (savedToken && savedUser) {
      try {
        const u = JSON.parse(savedUser);
        if (!u.role)         u.role         = u.appMeta?.role         || u.meta?.role         || 'internal';
        if (!u.transportador) u.transportador = u.appMeta?.transportador || u.meta?.transportador || '';
        if (!u.id)            u.id            = u.meta?.id || '';
        setUser(u);
        setToken(savedToken);
        // Sincroniza token no cliente Supabase imediatamente
        syncAuthToken();

        // Tenta refresh logo ao abrir (caso token esteja próximo de expirar)
        refreshToken(savedToken).then(r => {
          if (r) {
            setToken(r.token);
            localStorage.setItem('sb_token', r.token);
            localStorage.setItem('sb_refresh', r.refresh);
            syncAuthToken();
            scheduleRefresh(r.token);
          } else {
            scheduleRefresh(savedToken);
          }
        }).catch(() => {
          scheduleRefresh(savedToken);
        }).finally(() => setLoading(false));
      } catch {
        setLoading(false);
      }
    } else {
      setLoading(false);
    }

    return () => {
      if (refreshTimerRef.current) clearInterval(refreshTimerRef.current);
    };
  }, []); // eslint-disable-line

  // ── Login ───────────────────────────────────────────────────────
  const doLogin = useCallback(async (email, password) => {
    const result = await apiLogin(email, password);
    const um = result.user.user_metadata || result.user.meta || {};
    const am = result.user.app_metadata  || {};
    const u = {
      id:           result.user.id || '',
      email:        result.user.email || email,
      name:         um.name || am.name || email.split('@')[0],
      meta:         um,
      appMeta:      am,
      role:         am.role || um.role || 'internal',
      transportador: am.transportador || um.transportador || ''
    };
    setToken(result.token);
    setUser(u);
    localStorage.setItem('sb_token',   result.token);
    localStorage.setItem('sb_refresh', result.refresh);
    localStorage.setItem('sb_user',    JSON.stringify(u));
    syncAuthToken();
    scheduleRefresh(result.token);

    if (!um.pw_changed) {
      setNeedsPwChange(true);
      return { needsPwChange: true };
    }
    return { needsPwChange: false };
  }, [scheduleRefresh]);

  // ── Troca de senha ──────────────────────────────────────────────
  const doChangePassword = useCallback(async (newPassword) => {
    await changePassword(token, newPassword);
    const updated = { ...user, meta: { ...user.meta, pw_changed: true } };
    setUser(updated);
    setNeedsPwChange(false);
    localStorage.setItem('sb_user', JSON.stringify(updated));
  }, [token, user]);

  // ── Logout ──────────────────────────────────────────────────────
  const doLogout = useCallback(() => {
    if (refreshTimerRef.current) clearInterval(refreshTimerRef.current);
    setUser(null);
    setToken(null);
    setNeedsPwChange(false);
    localStorage.removeItem('sb_token');
    localStorage.removeItem('sb_refresh');
    localStorage.removeItem('sb_user');
  }, []);

  const isTransporter  = user?.role === 'transportador';
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
