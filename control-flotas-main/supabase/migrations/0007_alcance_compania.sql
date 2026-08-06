-- ============================================================================
-- 0007 · ALCANCE DEL ADMINISTRADOR DE COMPAÑÍA
-- ============================================================================
-- El ADMINISTRADOR (rol supervisor_company) de una COMPAÑÍA (empresas.tipo =
-- 'predefinida') administra su compañía Y sus empresas asociadas: necesita
-- VERLAS (empresas), ver su GENTE (perfiles) y la relación (empresa_predefinidas).
-- Sin estas policies, la RLS solo le deja ver su propia empresa.
--
-- Las escrituras sensibles (crear/editar/eliminar usuarios) NO pasan por RLS:
-- van por las Edge Functions con service_role, que validan el alcance.
-- ============================================================================

-- Helper (SECURITY DEFINER, sin recursión de RLS): las entes al alcance del
-- usuario actual como administrador — su empresa y, si su empresa es una
-- compañía, también las asociadas a ella.
create or replace function public.alcance_compania()
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select p.empresa_id
    from public.perfiles p
   where p.id = auth.uid()
     and p.rol = 'supervisor_company'
     and p.empresa_id is not null
  union
  select ep.empresa_id
    from public.empresa_predefinidas ep
    join public.perfiles p on p.empresa_id = ep.predefinida_id
    join public.empresas e on e.id = p.empresa_id and e.tipo = 'predefinida'
   where p.id = auth.uid()
     and p.rol = 'supervisor_company';
$$;

-- El administrador VE las entes de su alcance…
drop policy if exists empresas_select_alcance_compania on public.empresas;
create policy empresas_select_alcance_compania on public.empresas
  for select to authenticated
  using (id in (select public.alcance_compania()));

-- …los perfiles de la gente de su alcance…
drop policy if exists perfiles_select_alcance_compania on public.perfiles;
create policy perfiles_select_alcance_compania on public.perfiles
  for select to authenticated
  using (empresa_id in (select public.alcance_compania()));

-- …y la relación compañía ↔ asociadas (para listarlas y contarlas).
drop policy if exists emp_predef_select_alcance_compania on public.empresa_predefinidas;
create policy emp_predef_select_alcance_compania on public.empresa_predefinidas
  for select to authenticated
  using (
    predefinida_id in (select public.alcance_compania())
    or empresa_id in (select public.alcance_compania())
  );
