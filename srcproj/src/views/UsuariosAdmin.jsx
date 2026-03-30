import { useEffect, useMemo, useState } from 'react';
import { adminCreateUser, adminDeleteUser, adminListUsers, adminUpdateUser } from '../config/supabase';

const ROLE_OPTIONS = [
  { value: 'admin', label: 'Administrador' },
  { value: 'transporte', label: 'Transporte' },
  { value: 'controladoria', label: 'Controladoria' },
  { value: 'logistica_reversa', label: 'Logística Reversa' },
  { value: 'comercial', label: 'Comercial' },
  { value: 'transportador', label: 'Transportador' },
  { value: 'internal', label: 'Interno (legado)' },
];

const emptyForm = {
  id: '',
  email: '',
  password: '',
  name: '',
  role: 'transportador',
  transportador: '',
  forcePwChange: true,
};

function roleLabel(role) {
  return ROLE_OPTIONS.find(r => r.value === role)?.label || role || '—';
}

function prettyDate(value) {
  if (!value) return '—';
  try { return new Date(value).toLocaleString('pt-BR'); } catch { return value; }
}

function parseUiUser(user) {
  const app = user.app_metadata || {};
  const meta = user.user_metadata || {};
  return {
    id: user.id,
    email: user.email || '',
    role: app.role || meta.role || 'internal',
    name: meta.name || app.name || '',
    transportador: app.transportador || meta.transportador || '',
    created_at: user.created_at,
    last_sign_in_at: user.last_sign_in_at,
    email_confirmed_at: user.email_confirmed_at || user.confirmed_at,
    banned_until: user.banned_until,
    raw: user,
  };
}

export default function UsuariosAdmin() {
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState(emptyForm);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const loadUsers = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await adminListUsers();
      setUsers((data || []).map(parseUiUser));
    } catch (e) {
      setError(e.message || 'Não foi possível carregar os usuários.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return users;
    return users.filter(u =>
      [u.email, u.name, u.role, u.transportador].filter(Boolean).some(v => String(v).toLowerCase().includes(q))
    );
  }, [search, users]);

  const openNew = () => {
    setForm({ ...emptyForm, role: 'transportador', forcePwChange: true });
    setDrawerOpen(true);
  };

  const openEdit = (user) => {
    setForm({
      id: user.id,
      email: user.email,
      password: '',
      name: user.name || '',
      role: user.role || 'internal',
      transportador: user.transportador || '',
      forcePwChange: false,
    });
    setDrawerOpen(true);
  };

  const closeDrawer = () => {
    setDrawerOpen(false);
    setForm(emptyForm);
  };

  const save = async () => {
    setSaving(true);
    setError('');
    try {
      const payload = {
        email: form.email.trim(),
        password: form.password || undefined,
        name: form.name.trim(),
        role: form.role,
        transportador: form.transportador.trim(),
        forcePwChange: !!form.forcePwChange,
      };

      if (!payload.email) throw new Error('Informe o e-mail.');
      if (!payload.name) throw new Error('Informe o nome.');
      if (!form.id && !payload.password) throw new Error('Informe a senha inicial do novo usuário.');
      if (payload.role === 'transportador' && !payload.transportador) {
        throw new Error('Para perfil transportador, informe o nome do transportador.');
      }

      if (form.id) {
        await adminUpdateUser(form.id, payload);
      } else {
        await adminCreateUser(payload);
      }

      await loadUsers();
      closeDrawer();
    } catch (e) {
      setError(e.message || 'Falha ao salvar usuário.');
    } finally {
      setSaving(false);
    }
  };

  const removeUser = async (user) => {
    const ok = window.confirm(`Excluir o usuário ${user.email}? Essa ação não pode ser desfeita.`);
    if (!ok) return;
    setSaving(true);
    setError('');
    try {
      await adminDeleteUser(user.id);
      await loadUsers();
    } catch (e) {
      setError(e.message || 'Falha ao excluir usuário.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-[#eff6ff] border border-[#bfdbfe] rounded-xl p-4 text-sm text-[#1e40af] leading-6">
        <div className="font-bold mb-1">Administração de usuários</div>
        <div>
          Aqui o administrador cria usuários, define perfil de acesso e vincula transportadores sem precisar editar JSON no Supabase.
          O login continua no Supabase Auth; esta tela apenas gerencia acesso e metadata com segurança pelo backend.
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex flex-wrap gap-3 items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-gray-800">Usuários do portal</h2>
            <p className="text-xs text-gray-400 mt-1">Perfis controlados pelo próprio sistema</p>
          </div>
          <div className="flex flex-wrap gap-2 items-center">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar e-mail, nome, perfil..."
              className="w-72 max-w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm outline-none focus:border-blue-500"
            />
            <button onClick={loadUsers} className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-semibold">Atualizar</button>
            <button onClick={openNew} className="px-3 py-2 bg-[#1a365d] text-white rounded-lg text-sm font-semibold">+ Novo usuário</button>
          </div>
        </div>

        {error && <div className="mx-5 mt-4 px-3 py-2 rounded-lg bg-red-50 border border-red-200 text-sm text-red-600">{error}</div>}

        {loading ? (
          <div className="p-8 text-sm text-gray-400">Carregando usuários...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wide">
                <tr>
                  <th className="text-left px-4 py-3">Nome</th>
                  <th className="text-left px-4 py-3">E-mail</th>
                  <th className="text-left px-4 py-3">Perfil</th>
                  <th className="text-left px-4 py-3">Transportador</th>
                  <th className="text-left px-4 py-3">Último acesso</th>
                  <th className="text-left px-4 py-3">Criado em</th>
                  <th className="text-left px-4 py-3">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((u) => (
                  <tr key={u.id} className="border-t border-gray-100">
                    <td className="px-4 py-3 font-medium text-gray-800">{u.name || '—'}</td>
                    <td className="px-4 py-3 text-gray-600">{u.email}</td>
                    <td className="px-4 py-3"><span className="px-2 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold">{roleLabel(u.role)}</span></td>
                    <td className="px-4 py-3 text-gray-600">{u.transportador || '—'}</td>
                    <td className="px-4 py-3 text-gray-500">{prettyDate(u.last_sign_in_at)}</td>
                    <td className="px-4 py-3 text-gray-500">{prettyDate(u.created_at)}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button onClick={() => openEdit(u)} className="px-3 py-1.5 rounded-lg bg-gray-100 text-gray-700 text-xs font-semibold">Editar</button>
                        <button onClick={() => removeUser(u)} className="px-3 py-1.5 rounded-lg bg-red-50 text-red-600 text-xs font-semibold">Excluir</button>
                      </div>
                    </td>
                  </tr>
                ))}
                {!filtered.length && (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-sm text-gray-400">Nenhum usuário encontrado.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {drawerOpen && (
        <div className="fixed inset-0 z-[999] bg-black/50 flex items-center justify-center p-4">
          <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl border border-gray-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-gray-800">{form.id ? 'Editar usuário' : 'Novo usuário'}</h2>
                <p className="text-xs text-gray-400 mt-1">O login continua no Supabase Auth; aqui você gerencia acesso e perfil.</p>
              </div>
              <button onClick={closeDrawer} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
            </div>

            <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Nome</label>
                <input value={form.name} onChange={(e) => setForm(prev => ({ ...prev, name: e.target.value }))} className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">E-mail</label>
                <input value={form.email} onChange={(e) => setForm(prev => ({ ...prev, email: e.target.value }))} className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Perfil</label>
                <select value={form.role} onChange={(e) => setForm(prev => ({ ...prev, role: e.target.value }))} className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm bg-white">
                  {ROLE_OPTIONS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Senha {form.id ? '(opcional)' : '(obrigatória)'}</label>
                <input type="password" value={form.password} onChange={(e) => setForm(prev => ({ ...prev, password: e.target.value }))} placeholder={form.id ? 'Preencha só se quiser trocar' : 'Senha inicial'} className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Transportador vinculado</label>
                <input value={form.transportador} onChange={(e) => setForm(prev => ({ ...prev, transportador: e.target.value }))} placeholder="Obrigatório se o perfil for transportador" className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm" />
              </div>
              <div className="md:col-span-2">
                <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                  <input type="checkbox" checked={form.forcePwChange} onChange={(e) => setForm(prev => ({ ...prev, forcePwChange: e.target.checked }))} />
                  Exigir troca de senha no próximo login
                </label>
              </div>
            </div>

            <div className="px-5 py-4 border-t border-gray-100 flex justify-end gap-2">
              <button onClick={closeDrawer} className="px-4 py-2 rounded-lg bg-gray-100 text-gray-600 text-sm font-semibold">Cancelar</button>
              <button disabled={saving} onClick={save} className="px-4 py-2 rounded-lg bg-[#1a365d] text-white text-sm font-semibold disabled:opacity-60">{saving ? 'Salvando...' : 'Salvar'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
