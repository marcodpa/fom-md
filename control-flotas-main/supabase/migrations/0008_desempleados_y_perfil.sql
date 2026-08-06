-- ============================================================================
-- 0008 · DESEMPLEADOS C.A. (ente de respaldo) + campos de perfil
-- ============================================================================
-- 1) La ente de RESPALDO del sistema: al "eliminar" a una persona de su
--    empresa, su cuenta NO se borra — pasa a Desempleados C.A. hasta que la
--    administración FOM la reasigne a otra compañía → contratista/personal
--    (evita re-crear cuentas cuando alguien es recontratado). Nace con el
--    servicio SUSPENDIDO: su gente no puede iniciar sesión, y solo el admin
--    FOM la ve en su tab de Empresas.
-- 2) Campos editables del perfil (Mi perfil): dirección y fecha de nacimiento
--    (cédula y foto_url ya existían desde 0001).
-- ============================================================================

insert into public.empresas (slug, nombre, tipo, servicio_activo)
values ('desempleados-ca', 'Desempleados C.A.', 'estandar', false)
on conflict (slug) do nothing;

alter table public.perfiles add column if not exists direccion text;
alter table public.perfiles add column if not exists fecha_nacimiento date;

-- 3) CRUD de contratistas por el administrador de su compañía: puede EDITAR
--    los datos de sus asociadas (nunca los de la propia compañía: eso es FOM).
drop policy if exists empresas_update_alcance_compania on public.empresas;
create policy empresas_update_alcance_compania on public.empresas
  for update to authenticated
  using (id in (select public.alcance_compania()) and tipo <> 'predefinida')
  with check (id in (select public.alcance_compania()) and tipo <> 'predefinida');

-- 4) CRUD de vehículos por el administrador de su ente (editar/eliminar los
--    suyos; el alta ya existía).
drop policy if exists vehiculos_update_admin_ente on public.vehiculos;
create policy vehiculos_update_admin_ente on public.vehiculos
  for update to authenticated
  using (public.puedo_operar_empresa(empresa_id))
  with check (public.puedo_operar_empresa(empresa_id));

drop policy if exists vehiculos_delete_admin_ente on public.vehiculos;
create policy vehiculos_delete_admin_ente on public.vehiculos
  for delete to authenticated
  using (public.puedo_operar_empresa(empresa_id));
