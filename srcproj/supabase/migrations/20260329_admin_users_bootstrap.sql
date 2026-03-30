-- Bootstrap do primeiro usuário administrador para liberar a aba "Usuários" no portal
-- Ajuste o e-mail se necessário antes de rodar.

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
