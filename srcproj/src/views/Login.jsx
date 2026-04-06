import { useState } from 'react';
import { useAuth } from '../hooks/useAuth.jsx';
const EyeIcon = ({ off }) => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
    {off ? <><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></> : <><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></>}
  </svg>
);
export default function Login() {
  const { login, changePassword, needsPwChange } = useAuth();
  const [email, setEmail] = useState(''); const [password, setPassword] = useState(''); const [showPw, setShowPw] = useState(false);
  const [pw1, setPw1] = useState(''); const [pw2, setPw2] = useState('');
  const [error, setError] = useState(''); const [loading, setLoading] = useState(false);
  const handleLogin = async () => {
    if (!email || !password) { setError('Preencha email e senha'); return; }
    setLoading(true); setError('');
    try { await login(email, password); } catch (e) { setError(e.message); }
    setLoading(false);
  };
  const handleChangePw = async () => {
    if (!pw1 || pw1.length < 6) { setError('Mínimo 6 caracteres'); return; }
    if (pw1 !== pw2) { setError('Senhas não conferem'); return; }
    setLoading(true);
    try { await changePassword(pw1); } catch (e) { setError(e.message); }
    setLoading(false);
  };
  if (needsPwChange) {
    return (
      <div className="login-shell">
        <div className="login-card">
          <div style={{ textAlign: 'center', marginBottom: 28 }}>
            <img src="/linea-logo.png" alt="Linea" style={{ height: 48, margin: '0 auto 12px', display: 'block' }} onError={e => e.target.style.display='none'} />
            <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--text)' }}>Primeiro acesso</div>
            <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 4 }}>Crie sua senha pessoal</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div><label className="input-label">Nova senha</label><input type="password" value={pw1} onChange={e => setPw1(e.target.value)} placeholder="Mínimo 6 caracteres" className="input" /></div>
            <div><label className="input-label">Confirmar senha</label><input type="password" value={pw2} onChange={e => setPw2(e.target.value)} placeholder="Repita a senha" className="input" onKeyDown={e => e.key==='Enter'&&handleChangePw()} /></div>
            {error && <div style={{ padding: '8px 12px', background: 'var(--red-dim)', border: '1px solid rgba(248,81,73,0.2)', borderRadius: 8, fontSize: 12, color: 'var(--red)' }}>{error}</div>}
            <button onClick={handleChangePw} disabled={loading} className="btn btn-gold" style={{ width: '100%', justifyContent: 'center', padding: '11px', marginTop: 4 }}>{loading ? 'Salvando...' : 'Criar senha'}</button>
          </div>
        </div>
      </div>
    );
  }
  return (
    <div className="login-shell">
      <div className="login-card">
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <img src="/linea-logo.png" alt="Linea Alimentos" style={{ height: 52, margin: '0 auto 14px', display: 'block' }} onError={e => e.target.style.display='none'} />
          <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.02em' }}>Portal de Devoluções</div>
          <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 4, letterSpacing: '0.04em' }}>LINEA ALIMENTOS</div>
        </div>
        <div style={{ height: 1, background: 'var(--border)', marginBottom: 28 }} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div><label className="input-label">Email</label><input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="seu@email.com" className="input" autoComplete="email" /></div>
          <div>
            <label className="input-label">Senha</label>
            <div style={{ position: 'relative' }}>
              <input type={showPw?'text':'password'} value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" className="input" style={{ paddingRight: 40 }} onKeyDown={e => e.key==='Enter'&&handleLogin()} autoComplete="current-password" />
              <button type="button" onClick={() => setShowPw(v=>!v)} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-3)', cursor: 'pointer', padding: 2 }}><EyeIcon off={showPw} /></button>
            </div>
          </div>
          {error && <div style={{ padding: '8px 12px', background: 'var(--red-dim)', border: '1px solid rgba(248,81,73,0.2)', borderRadius: 8, fontSize: 12, color: 'var(--red)' }}>{error}</div>}
          <button onClick={handleLogin} disabled={loading} className="btn btn-gold" style={{ width: '100%', justifyContent: 'center', padding: '12px', marginTop: 4, fontSize: 14 }}>{loading ? 'Entrando...' : 'Entrar'}</button>
        </div>
        <p style={{ textAlign: 'center', color: 'var(--text-3)', fontSize: 11, marginTop: 20 }}>Solicite credenciais ao administrador do sistema.</p>
      </div>
    </div>
  );
}
