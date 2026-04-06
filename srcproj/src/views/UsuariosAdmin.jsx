import { useEffect, useMemo, useState } from 'react';
import { adminCreateUser, adminDeleteUser, adminListUsers, adminUpdateUser } from '../config/supabase';
import { supabase } from '../config/constants';

const ROLE_OPTIONS = [
  { value: 'admin',            label: 'Administrador' },
  { value: 'transporte',       label: 'Transporte' },
  { value: 'controladoria',    label: 'Controladoria' },
  { value: 'logistica_reversa',label: 'Logística Reversa' },
  { value: 'comercial',        label: 'Comercial' },
  { value: 'transportador',    label: 'Transportador' },
  { value: 'internal',         label: 'Interno (legado)' },
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
  const app  = user.app_metadata  || {};
  const meta = user.user_metadata || {};
  return {
    id:                user.id,
    email:             user.email || '',
    role:              app.role  || meta.role  || 'internal',
    name:              meta.name || app.name   || '',
    transportador:     app.transportador || meta.transportador || '',
    created_at:        user.created_at,
    last_sign_in_at:   user.last_sign_in_at,
    email_confirmed_at:user.email_confirmed_at || user.confirmed_at,
    raw: user,
  };
}

export default function UsuariosAdmin() {
  const [users, setUsers]           = useState([]);
  const [search, setSearch]         = useState('');
  const [loading, setLoading]       = useState(true);
  const [saving, setSaving]         = useState(false);
  const [error, setError]           = useState('');
  const [form, setForm]             = useState(emptyForm);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Lista de transportadores reais do banco para o dropdown
  const [transportadorOptions, setTransportadorOptions] = useState([]);
  const [loadingTransp, setLoadingTransp]               = useState(false);
  const [trSearch, setTrSearch]                         = useState('');

  // Carrega transportadores da tabela dedicada + extras para montar a lista completa
  const loadTransportadores = async () => {
    setLoadingTransp(true);
    try {
      // Tenta carregar da tabela portal_transportadores (fonte primária)
      const { data: trData } = await supabase
        .from('portal_transportadores')
        .select('nome')
        .order('nome');

      if (trData && trData.length > 0) {
        setTransportadorOptions(trData.map(t => t.nome).filter(Boolean));
        setLoadingTransp(false);
        return;
      }

      // Fallback: extrai nomes únicos dos extras (trOverride) caso a tabela esteja vazia
      const { data: extrasData } = await supabase
        .from('portal_extras')
        .select('value')
        .not('key', 'like', 'chat:%')
        .not('key', 'like', 'cte:%')
        .not('key', 'like', 'tr_email:%')
        .not('key', 'like', 'aceite:%');

      const names = new Set();
      (extrasData || []).forEach(row => {
        const v = row.value;
        if (typeof v === 'object' && v?.trOverride) names.add(v.trOverride);
      });
      setTransportadorOptions([...names].sort());
    } catch (e) {
      console.warn('[loadTransportadores]', e.message);
    } finally {
      setLoadingTransp(false);
    }
  };

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
    loadTransportadores();
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return users;
    return users.filter(u =>
      [u.email, u.name, u.role, u.transportador].filter(Boolean)
        .some(v => String(v).toLowerCase().includes(q))
    );
  }, [search, users]);

  // Transportadores filtrados pelo campo de busca interno do dropdown
  const filteredTrOptions = useMemo(() => {
    if (!trSearch.trim()) return transportadorOptions;
    const q = trSearch.toLowerCase();
    return transportadorOptions.filter(n => n.toLowerCase().includes(q));
  }, [transportadorOptions, trSearch]);

  const openNew = () => {
    setForm({ ...emptyForm, role: 'transportador', forcePwChange: true });
    setTrSearch('');
    setDrawerOpen(true);
  };

  const openEdit = (user) => {
    setForm({
      id:           user.id,
      email:        user.email,
      password:     '',
      name:         user.name || '',
      role:         user.role || 'internal',
      transportador:user.transportador || '',
      forcePwChange:false,
    });
    setTrSearch(user.transportador || '');
    setDrawerOpen(true);
  };

  const closeDrawer = () => {
    setDrawerOpen(false);
    setForm(emptyForm);
    setTrSearch('');
  };

  const save = async () => {
    setSaving(true);
    setError('');
    try {
      const payload = {
        email:        form.email.trim(),
        password:     form.password || undefined,
        name:         form.name.trim(),
        role:         form.role,
        transportador:form.transportador.trim(),
        forcePwChange:!!form.forcePwChange,
      };

      if (!payload.email)  throw new Error('Informe o e-mail.');
      if (!payload.name)   throw new Error('Informe o nome.');
      if (!form.id && !payload.password) throw new Error('Informe a senha inicial do novo usuário.');
      if (payload.role === 'transportador' && !payload.transportador) {
        throw new Error('Para perfil transportador, selecione a transportadora vinculada.');
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

  const isTransportador = form.role === 'transportador';

  return (
    <div className="space-y-4">
      <div className="bg-[#eff6ff] border border-[#bfdbfe] rounded-xl p-4 text-sm text-[#1e40af] leading-6">
        <div className="font-bold mb-1">Administração de usuários</div>
        <div>
          Crie usuários, defina perfil de acesso e vincule transportadores. Usuários com perfil
          <strong> Transportador</strong> enxergam somente as notas da empresa selecionada.
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex flex-wrap gap-3 items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-gray-800">Usuários do portal</h2>
            <p className="text-xs text-gray-400 mt-1">{users.length} usuário(s) cadastrado(s)</p>
          </div>
          <div className="flex flex-wrap gap-2 items-center">
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar e-mail, nome, perfil..."
              className="w-72 max-w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm outline-none focus:border-blue-500"
            />
            <button onClick={loadUsers} className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-semibold">
              Atualizar
            </button>
            <button onClick={openNew} className="px-3 py-2 bg-[#1a365d] text-white rounded-lg text-sm font-semibold">
              + Novo usuário
            </button>
          </div>
        </div>

        {error && (
          <div className="mx-5 mt-4 px-3 py-2 rounded-lg bg-red-50 border border-red-200 text-sm text-red-600">
            {error}
          </div>
        )}

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
                  <th className="text-left px-4 py-3">Transportadora vinculada</th>
                  <th className="text-left px-4 py-3">Último acesso</th>
                  <th className="text-left px-4 py-3">Criado em</th>
                  <th className="text-left px-4 py-3">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(u => (
                  <tr key={u.id} className="border-t border-gray-100">
                    <td className="px-4 py-3 font-medium text-gray-800">{u.name || '—'}</td>
                    <td className="px-4 py-3 text-gray-600">{u.email}</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold">
                        {roleLabel(u.role)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {u.transportador ? (
                        <span className="px-2 py-1 rounded-full bg-amber-50 text-amber-700 text-xs font-semibold">
                          {u.transportador}
                        </span>
                      ) : (
                        <span className="text-gray-400 text-xs">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-500">{prettyDate(u.last_sign_in_at)}</td>
                    <td className="px-4 py-3 text-gray-500">{prettyDate(u.created_at)}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button onClick={() => openEdit(u)}
                          className="px-3 py-1.5 rounded-lg bg-gray-100 text-gray-700 text-xs font-semibold">
                          Editar
                        </button>
                        <button onClick={() => removeUser(u)}
                          className="px-3 py-1.5 rounded-lg bg-red-50 text-red-600 text-xs font-semibold">
                          Excluir
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {!filtered.length && (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-sm text-gray-400">
                      Nenhum usuário encontrado.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Drawer de cadastro/edição ── */}
      {drawerOpen && (
        <div className="fixed inset-0 z-[999] bg-black/50 flex items-center justify-center p-4">
          <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl border border-gray-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-gray-800">
                  {form.id ? 'Editar usuário' : 'Novo usuário'}
                </h2>
                <p className="text-xs text-gray-400 mt-1">
                  Campos com <span className="text-red-500">*</span> são obrigatórios.
                </p>
              </div>
              <button onClick={closeDrawer} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
            </div>

            <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4">

              {/* Nome */}
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                  Nome <span className="text-red-500">*</span>
                </label>
                <input
                  value={form.name}
                  onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                  placeholder="Nome completo"
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm outline-none focus:border-blue-400"
                />
              </div>

              {/* Email */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                  E-mail <span className="text-red-500">*</span>
                </label>
                <input
                  value={form.email}
                  onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                  placeholder="email@empresa.com"
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm outline-none focus:border-blue-400"
                />
              </div>

              {/* Perfil */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                  Perfil <span className="text-red-500">*</span>
                </label>
                <select
                  value={form.role}
                  onChange={e => setForm(p => ({ ...p, role: e.target.value, transportador: '' }))}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm bg-white outline-none focus:border-blue-400"
                >
                  {ROLE_OPTIONS.map(r => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
                </select>
              </div>

              {/* Senha */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                  Senha {form.id ? <span className="text-gray-400 font-normal">(opcional — preencha só para alterar)</span> : <span className="text-red-500">*</span>}
                </label>
                <input
                  type="password"
                  value={form.password}
                  onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                  placeholder={form.id ? 'Deixe vazio para manter a atual' : 'Senha inicial'}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm outline-none focus:border-blue-400"
                />
              </div>

              {/* Forçar troca de senha */}
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="forcePwChange"
                  checked={form.forcePwChange}
                  onChange={e => setForm(p => ({ ...p, forcePwChange: e.target.checked }))}
                  className="w-4 h-4 accent-blue-600"
                />
                <label htmlFor="forcePwChange" className="text-sm text-gray-600 cursor-pointer">
                  Exigir troca de senha no próximo login
                </label>
              </div>

              {/* ── Transportadora — só aparece quando o perfil é transportador ── */}
              {isTransportador && (
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                    Transportadora vinculada <span className="text-red-500">*</span>
                  </label>

                  {/* Campo de busca dentro do select */}
                  <div className="relative">
                    <input
                      value={trSearch}
                      onChange={e => {
                        setTrSearch(e.target.value);
                        // Se o usuário digitar algo que não bate com nenhuma opção, limpa a seleção
                        if (!transportadorOptions.includes(e.target.value)) {
                          setForm(p => ({ ...p, transportador: '' }));
                        }
                      }}
                      placeholder={loadingTransp ? 'Carregando transportadoras...' : 'Digite para filtrar...'}
                      disabled={loadingTransp}
                      className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm outline-none focus:border-blue-400 pr-8"
                    />
                    {/* Ícone de lupa */}
                    <span className="absolute right-3 top-3 text-gray-400 text-xs">🔍</span>
                  </div>

                  {/* Lista de opções */}
                  {trSearch && filteredTrOptions.length > 0 && !form.transportador && (
                    <div className="border border-gray-200 rounded-lg mt-1 max-h-48 overflow-y-auto shadow-sm bg-white z-10 relative">
                      {filteredTrOptions.map(name => (
                        <button
                          key={name}
                          type="button"
                          onClick={() => {
                            setForm(p => ({ ...p, transportador: name }));
                            setTrSearch(name);
                          }}
                          className="w-full text-left px-3 py-2.5 text-sm hover:bg-blue-50 border-b border-gray-100 last:border-0"
                        >
                          {name}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Indicador de seleção confirmada */}
                  {form.transportador && (
                    <div className="mt-2 flex items-center gap-2 px-3 py-2 bg-green-50 border border-green-200 rounded-lg">
                      <span className="text-green-600 text-sm">✅</span>
                      <span className="text-sm font-semibold text-green-700">{form.transportador}</span>
                      <button
                        type="button"
                        onClick={() => { setForm(p => ({ ...p, transportador: '' })); setTrSearch(''); }}
                        className="ml-auto text-xs text-gray-400 hover:text-red-500"
                      >
                        ✕ Limpar
                      </button>
                    </div>
                  )}

                  {/* Aviso se não há transportadoras cadastradas */}
                  {!loadingTransp && transportadorOptions.length === 0 && (
                    <p className="text-xs text-amber-600 mt-1">
                      ⚠️ Nenhuma transportadora encontrada no banco. Certifique-se de que existem notas importadas ou transportadoras cadastradas na aba Transportadores.
                    </p>
                  )}

                  <p className="text-xs text-gray-400 mt-2">
                    O usuário verá somente as notas vinculadas a esta transportadora.
                    O nome deve bater exatamente com o que aparece nas notas.
                  </p>
                </div>
              )}

            </div>

            {/* Rodapé */}
            <div className="px-5 py-4 border-t border-gray-100 flex justify-between items-center">
              <div>
                {error && (
                  <p className="text-sm text-red-600">{error}</p>
                )}
              </div>
              <div className="flex gap-2">
                <button onClick={closeDrawer}
                  className="px-4 py-2 rounded-lg bg-gray-100 text-gray-600 text-sm font-semibold">
                  Cancelar
                </button>
                <button
                  disabled={saving}
                  onClick={save}
                  className="px-4 py-2 rounded-lg bg-[#1a365d] text-white text-sm font-semibold disabled:opacity-60"
                >
                  {saving ? 'Salvando...' : form.id ? 'Salvar alterações' : 'Criar usuário'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
