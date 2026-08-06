-- ============================================================================
-- FIX · Trigger V5 (notificación automática al crear una ODT)
-- ============================================================================
-- El CASE devolvía texto y la columna `tipo` es del enum notificacion_tipo:
-- creaba un error 42804 al insertar cualquier ODT. Este archivo re-crea la
-- función con el cast. Ejecutar UNA vez en el SQL Editor (es idempotente).
-- ============================================================================

create or replace function fn_odt_notifica() returns trigger
language plpgsql as $$
declare v_alias text; v_placa text;
begin
  select coalesce(alias, numero), placa into v_alias, v_placa
    from vehiculos where id = new.vehiculo_id;
  insert into notificaciones (empresa_id, tipo, titulo, detalle, odt_id)
  values (
    new.empresa_id,
    (case when new.tipo = 'preventiva' then 'alerta_cumplida' else 'odt_nueva' end)::notificacion_tipo,
    case when new.tipo = 'preventiva'
      then coalesce(new.tipo_falla, 'Mantenimiento') || ' · ' || v_alias
      else 'Nueva ODT — Vehículo ' || v_alias || ' (' || v_placa || ')'
    end,
    new.descripcion,
    new.id
  );
  return new;
end $$;
