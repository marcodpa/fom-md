-- ============================================================================
-- FIX · RLS de notificaciones (42501 al crear una ODT)
-- ============================================================================
-- Dos arreglos:
--  1) El trigger que notifica la ODT nueva corre con los permisos del usuario
--     que la crea (un conductor, por ejemplo) y la tabla no tenía política de
--     INSERT → security definer: el trigger escribe como dueño del esquema.
--  2) Política de INSERT para las notificaciones que genera la APP (ej. la
--     alerta del conductor que también ve su supervisor): cualquier miembro
--     de la empresa puede notificar a SU empresa; el admin, a cualquiera.
-- Ejecutar UNA vez en el SQL Editor (es idempotente).
-- ============================================================================

create or replace function fn_odt_notifica() returns trigger
language plpgsql security definer set search_path = public as $$
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

drop policy if exists notif_insert on notificaciones;
create policy notif_insert on notificaciones for insert to authenticated
  with check (soy_admin() or puedo_operar_empresa(empresa_id) or empresa_id = mi_empresa());
