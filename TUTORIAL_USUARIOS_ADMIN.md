# Tutorial — Administração de usuários pelo portal

## O que já ficou pronto no código
- Aba **Usuários** no portal para criar, editar e excluir usuários.
- Tela disponível para perfil `admin`.
- Cadastro de usuário novo com:
  - nome
  - e-mail
  - senha inicial
  - perfil
  - transportador vinculado
  - opção de exigir troca de senha no próximo login
- Edição de usuário existente.
- Exclusão de usuário.
- Backend seguro via **Supabase Edge Function** `admin-users`.
- O perfil principal passa a ser lido de `app_metadata.role`.

## O que você precisa fazer (uma vez)

### 1) Bootstrap do primeiro admin
Como a aba **Usuários** só aparece para `admin`, você precisa marcar pelo menos um usuário existente como admin.

Abra o **SQL Editor** no Supabase e rode este SQL, ajustando o e-mail se necessário:

```sql
update auth.users
set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || jsonb_build_object('role', 'admin')
where email = 'matheus@linea.com';

update auth.users
set raw_user_meta_data = coalesce(raw_user_meta_data, '{}'::jsonb) || jsonb_build_object('name', 'Matheus', 'pw_changed', true)
where email = 'matheus@linea.com';

update public.portal_profiles
set tabs = case
  when 'usuarios' = any(tabs) then tabs
  else array_append(tabs, 'usuarios')
end
where role = 'admin';
```

Depois disso:
- faça logout do portal
- faça login de novo com esse usuário
- a aba **Usuários** deve aparecer

### 2) Publicar a nova Edge Function
No terminal, dentro da pasta do projeto:

```bash
npx supabase login
npx supabase link --project-ref opcrtjdnpgqcjlksofjw
npx supabase functions deploy admin-users
```

> Se o projeto já estiver linkado, o comando `link` só confirma.

### 3) Confirmar os secrets da function
No Supabase, confirme que estes secrets já existem:
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

Se você já configurou isso para as outras functions, provavelmente não precisa mexer de novo.

### 4) Subir a nova versão do portal
- gere o build novo
- publique no Netlify

## Fluxo de uso depois que tudo subir
1. Entrar com usuário admin.
2. Abrir a aba **Usuários**.
3. Clicar em **Novo usuário**.
4. Preencher nome, e-mail, senha inicial, perfil e transportador (se for perfil transportador).
5. Marcar ou desmarcar “Exigir troca de senha no próximo login”.
6. Salvar.

## Perfis aceitos
Use exatamente estes valores:
- `admin`
- `transporte`
- `controladoria`
- `logistica_reversa`
- `comercial`
- `transportador`
- `internal` (legado)

## Observação importante
- **senha e login** continuam no Supabase Auth.
- **gestão de acesso** agora passa a ficar no portal.
- **role/permissão** fica em `raw_app_meta_data`.
- nome e transportador ficam no metadata do usuário.
