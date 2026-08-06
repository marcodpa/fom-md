-- ============================================================================
-- FIX · RLS del lado del CONDUCTOR (alertas, re-envío de inspección, auditoría)
-- ============================================================================
-- Huecos encontrados probando contra la BD real:
--  1) alertas_conductor no tenía política de INSERT: el conductor no podía
--     crear su propia alerta (42501). También se permite borrarla.
--  2) inspecciones no tenía UPDATE: reenviar la inspección del MISMO día
--     (upsert por vehículo/conductor/fecha) fallaba.
--  3) inspeccion_respuestas no tenía DELETE: al reenviar no se podían
--     reemplazar las respuestas anteriores.
--  4) auditoría solo dejaba insertar al Admin, pero ahora el SUPERVISOR
--     también da de alta vehículos desde su panel (la lectura sigue siendo
--     exclusiva del Admin, §1.3).
-- Ejecutar UNA vez en el SQL Editor (es idempotente).
-- ============================================================================

-- 1 · El conductor crea (y puede borrar) SUS alertas.
drop policy if exists alerta_insert on alertas_conductor;
create policy alerta_insert on alertas_conductor for insert to authenticated
  with check (user_id = auth.uid());
drop policy if exists alerta_delete on alertas_conductor;
create policy alerta_delete on alertas_conductor for delete to authenticated
  using (user_id = auth.uid() or soy_admin());

-- 2 · Reenviar la inspección del día (upsert) actualiza la propia.
drop policy if exists insp_update on inspecciones;
create policy insp_update on inspecciones for update to authenticated
  using (driver_id = auth.uid()) with check (driver_id = auth.uid());

-- 3 · Reemplazar las respuestas al reenviar (borra las de SU inspección).
drop policy if exists insp_resp_delete on inspeccion_respuestas;
create policy insp_resp_delete on inspeccion_respuestas for delete to authenticated
  using (exists (select 1 from inspecciones i
                 where i.id = inspeccion_id and i.driver_id = auth.uid()));

-- 4 · La auditoría del alta también la escribe el supervisor de la empresa
--     (verla sigue siendo SOLO del Admin, §1.3).
drop policy if exists aud_admin_insert on auditoria;
create policy aud_admin_insert on auditoria for insert to authenticated
  with check (soy_admin() or puedo_operar_empresa(empresa_id));
