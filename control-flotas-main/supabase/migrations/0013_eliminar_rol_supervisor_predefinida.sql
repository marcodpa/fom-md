-- ============================================================================
-- 0013 — SE ELIMINA EL ROL "SUPERVISOR" DE SOLO LECTURA
-- ============================================================================
-- En una COMPAÑÍA queda UN SOLO rol operativo: `supervisor_company`, que se
-- muestra como "Supervisor" y gestiona su compañía Y sus contratistas asociadas
-- (reportes, comparativas, histórico de ODT). El rol `supervisor_predefinida`
-- (solo lectura) desaparece: quien lo tuviera pasa a `supervisor_company`, con
-- lo que CONSERVA todo lo que veía y además gana los permisos de administración.
--
-- El alcance sobre las asociadas ya lo resuelve `alcance_compania()` (0007): la
-- empresa del supervisor y, si esa empresa es una compañía, sus asociadas. Por
-- eso las políticas pasan a apoyarse en ella en vez de en la tabla de
-- asignaciones del rol viejo.
--
-- Correr en el SQL Editor del proyecto.
-- ============================================================================

-- 1) Nadie se queda sin acceso: el rol viejo pasa al operativo de su compañía.
update perfiles set rol = 'supervisor_company' where rol = 'supervisor_predefinida';

-- 2) Las políticas que miraban la tabla del rol viejo pasan a alcance_compania().
drop policy if exists emp_select on empresas;
create policy emp_select on empresas for select to authenticated
  using (soy_admin() or id = mi_empresa() or id in (select alcance_compania()));

drop policy if exists perf_select on perfiles;
create policy perf_select on perfiles for select to authenticated
  using (id = auth.uid() or soy_admin() or empresa_id = mi_empresa()
         or empresa_id in (select alcance_compania()));

-- 3) `puedo_ver_empresa` deja de depender del rol viejo (mismo alcance real:
--    FOM ve todo, cada quien su ente, y la compañía además sus asociadas).
create or replace function puedo_ver_empresa(eid uuid) returns boolean
language sql stable security definer set search_path = public as
$$ select soy_admin()
       or mi_empresa() = eid
       or eid in (select alcance_compania()) $$;

-- 4) Fuera la función y la tabla del rol viejo (sus políticas caen con la tabla).
drop function if exists mis_empresas_gerencial();
drop table if exists supervisor_predefinidas;

-- NOTA: el valor 'supervisor_predefinida' queda en el enum `rol_usuario` sin
-- usarse (Postgres no permite quitar valores de un enum). Ya nadie lo asigna:
-- la app no lo ofrece y las Edge Functions no lo escriben.
