import { useState } from 'react';
import { useTheme } from '../hooks/useTheme.jsx';
import { useAuth } from '../hooks/useAuth.jsx';

export default function Login() {
  const { login, changePassword, needsPwChange } = useAuth();
  const { theme, toggleTheme, isDark } = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [pw1, setPw1] = useState('');
  const [pw2, setPw2] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) { setError('Preencha email e senha'); return; }
    setLoading(true);
    setError('');
    try {
      await login(email, password);
    } catch (e) {
      setError(e.message);
    }
    setLoading(false);
  };

  const handleChangePw = async () => {
    if (!pw1 || pw1.length < 6) { setError('Mínimo 6 caracteres'); return; }
    if (pw1 !== pw2) { setError('Senhas não conferem'); return; }
    setLoading(true);
    try {
      await changePassword(pw1);
    } catch (e) {
      setError(e.message);
    }
    setLoading(false);
  };

  const shellHeader = (
    <div className="absolute top-5 right-5">
      <button type="button" data-theme={theme} onClick={toggleTheme} className="theme-toggle">
        <span>{isDark ? 'Modo claro' : 'Modo noturno'}</span>
        <span className="theme-toggle-track"><span className="theme-toggle-thumb" /></span>
      </button>
    </div>
  );

  if (needsPwChange) {
    return (
      <div className="login-shell relative">{shellHeader}
        <div className="login-card premium-glow relative">
          <div className="text-center mb-6">
            <img src="/linea-logo.png" alt="Logo Linea Alimentos" className="mx-auto h-24 w-auto drop-shadow-sm mb-3" />
            <div className="text-[10px] login-subline tracking-[3px] font-semibold">LINEA ALIMENTOS</div>
          </div>
          <div className="w-12 h-[3px] bg-[var(--primary)] mx-auto mb-5 rounded" />
          <h2 className="text-xl font-extrabold text-center login-brand mb-1">Primeiro acesso</h2>
          <p className="text-center login-subline text-sm mb-7">Crie sua senha pessoal</p>
          <label className="block text-xs font-semibold text-gray-600 mb-1">Nova senha</label>
          <input type="password" value={pw1} onChange={e => setPw1(e.target.value)} placeholder="Mínimo 6 caracteres"
            className="w-full px-4 py-3 border border-gray-200 rounded-lg text-sm mb-4 outline-none focus:border-[#2b6cb0] focus:ring-2 focus:ring-blue-100" />
          <label className="block text-xs font-semibold text-gray-600 mb-1">Confirmar senha</label>
          <input type="password" value={pw2} onChange={e => setPw2(e.target.value)} placeholder="Repita a senha"
            onKeyDown={e => e.key === 'Enter' && handleChangePw()}
            className="w-full px-4 py-3 border border-gray-200 rounded-lg text-sm mb-4 outline-none focus:border-[#2b6cb0] focus:ring-2 focus:ring-blue-100" />
          {error && <div className="bg-red-50 text-red-600 border border-red-200 rounded-lg px-4 py-2 text-xs mb-4">{error}</div>}
          <button onClick={handleChangePw} disabled={loading}
            className="w-full py-3.5 bg-[#1a365d] text-white rounded-xl font-bold text-sm hover:bg-[#2b4c7e] disabled:bg-gray-400 transition">
            {loading ? 'Salvando...' : 'Salvar nova senha'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="login-shell relative">{shellHeader}
      <div className="login-card premium-glow relative">
        <div className="text-center mb-6">
          <img src="/linea-logo.png" alt="Logo Linea Alimentos" className="mx-auto h-24 w-auto drop-shadow-sm mb-3" />
          <div className="text-[10px] login-subline tracking-[3px] font-semibold">LINEA ALIMENTOS</div>
        </div>
        <div className="w-12 h-[3px] bg-[var(--primary)] mx-auto mb-5 rounded" />
        <h2 className="text-xl font-extrabold text-center login-brand mb-1">Portal de Devoluções</h2>
        <p className="text-center login-subline text-sm mb-7">Faça login para acessar</p>
        <label className="block text-xs font-semibold text-gray-600 mb-1">Email</label>
        <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="seu@email.com"
          className="w-full px-4 py-3 border border-gray-200 rounded-lg text-sm mb-4 outline-none focus:border-[#2b6cb0] focus:ring-2 focus:ring-blue-100" />
        <label className="block text-xs font-semibold text-gray-600 mb-1">Senha</label>
        <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••"
          onKeyDown={e => e.key === 'Enter' && handleLogin()}
          className="w-full px-4 py-3 border border-gray-200 rounded-lg text-sm mb-4 outline-none focus:border-[#2b6cb0] focus:ring-2 focus:ring-blue-100" />
        {error && <div className="bg-red-50 text-red-600 border border-red-200 rounded-lg px-4 py-2 text-xs mb-4">{error}</div>}
        <button onClick={handleLogin} disabled={loading}
          className="w-full py-3.5 bg-[#1a365d] text-white rounded-xl font-bold text-sm hover:bg-[#2b4c7e] disabled:bg-gray-400 transition">
          {loading ? 'Entrando...' : 'Entrar'}
        </button>
        <p className="text-center text-gray-400 text-[10px] mt-4">Solicite credenciais ao administrador.</p>
      </div>
    </div>
  );
}
