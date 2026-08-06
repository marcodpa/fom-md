-- ============================================================================
-- 0012 — AUDITORÍA GENERAL
-- ============================================================================
-- La auditoría deja de ser solo "alta de vehículo": ahora registra CUALQUIER
-- mutación (crear / editar / eliminar) de empresas, usuarios y vehículos, con
-- QUIÉN la hizo y CUÁNDO. Dos cambios:
--
--  1) actor_id se captura del propio JWT (default auth.uid()): el cliente ya no
--     lo manda, así que no se puede falsear quién hizo la acción.
--  2) La lectura se abre a QUIEN PUEDE VER esa empresa (FOM ve todo; el admin
--     de una ente ve la suya; el supervisor de una compañía, sus asociadas),
--     en vez de solo el admin FOM.
--
-- Correr en el SQL Editor del proyecto.
-- ============================================================================

alter table auditoria alter column actor_id set default auth.uid();

-- Alcance: FOM (soy_admin) todo; el ente sobre lo suyo (puedo_ver_empresa); y el
-- ADMINISTRADOR de una compañía sobre su compañía y sus asociadas
-- (alcance_compania), que es como puede administrar a esa gente.
drop policy if exists aud_admin_select on auditoria;
drop policy if exists aud_select on auditoria;
create policy aud_select on auditoria for select to authenticated
  using (puedo_ver_empresa(empresa_id) or empresa_id in (select alcance_compania()));

-- Escritura: mismo alcance. Las mutaciones que disparan estos registros ya
-- están validadas por sus propias reglas; esto solo registra la actividad.
drop policy if exists aud_admin_insert on auditoria;
drop policy if exists aud_insert on auditoria;
create policy aud_insert on auditoria for insert to authenticated
  with check (puedo_ver_empresa(empresa_id) or empresa_id in (select alcance_compania()));
