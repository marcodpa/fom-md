-- ============================================================================
-- FOM · Control de Flotas — BD PROVISIONAL (Supabase / Postgres)
-- ============================================================================
-- Esquema completo del dominio FOM-02 para pruebas y depuración. Cubre todo lo
-- que la app maneja hoy en mocks: empresas y asignación a predefinidas, los 6
-- roles, vehículos con GPS obligatorio, áreas, titularidad (principal +
-- secundarios con PIN), sesiones de uso, ODT con cierre completo, inspección
-- diaria a 3 estados, reglas de alerta con contador, notificaciones in-app,
-- documentos con vencimiento, alertas del conductor y auditoría del alta.
--
-- Las VALIDACIONES DE PROCESO viven en triggers (no solo en la app):
--   V1 · No existe vehículo sin GPS verificado (FOM-02 §1.2).
--   V2 · IMEI único en todo el sistema (§8-4).
--   V3 · Al cerrar una ODT se fija resuelta_en; al reabrirla se limpia (§3.3).
--   V4 · Al cerrar una ODT preventiva, el contador de su regla se reinicia (§3.4).
--   V5 · ODT correctiva nueva → notificación al panel de su empresa (§3.3).
--   V6 · Secundarios solo en vehículos cuyo GPS soporta PIN (§3.5).
--
-- Ejecutar en el SQL Editor de Supabase (o `supabase db push`). Luego correr
-- 0002_seed.sql. Ver SUPABASE.md en la raíz del repo.
-- ============================================================================

create extension if not exists pgcrypto;

-- ─────────────────────────────── ENUMS ─────────────────────────────────────

create type rol_usuario as enum
  ('admin','supervisor_predefinida','supervisor_company','conductor','supervisor_personal','usuario_personal');
create type company_tipo as enum ('estandar','predefinida','personal');
create type vehiculo_tipo as enum ('camioneta','camion','auto','otro');
create type marcha_estado as enum ('en_marcha','parada');
create type area_tipo as enum ('ubicacion','sector','contrato');
create type odt_estado as enum ('abierta','en_revision','cerrada');
create type odt_tipo as enum ('correctiva','preventiva');
create type autor_via as enum ('principal','secundario');
create type inspeccion_item_estado as enum ('conforme','observacion','falla');
create type inspeccion_resultado as enum ('pendiente','aprobada','aprobada_con_observaciones','bloqueada');
create type regla_tipo as enum ('velocidad','mantenimiento');
create type notificacion_tipo as enum ('odt_nueva','alerta_cumplida','otro');
create type documento_ambito as enum ('vehiculo','persona');
create type alerta_severidad as enum ('info','advertencia','critica');
create type alerta_categoria as enum ('seguridad','mantenimiento','documento','otro');

-- ────────────────────────────── EMPRESAS ───────────────────────────────────

create table empresas (
  id          uuid primary key default gen_random_uuid(),
  slug        text unique not null,           -- 'Samfor', 'pdvsa-petroboscan'…
  nombre      text not null,
  tipo        company_tipo not null default 'estandar',
  rif         text,
  contacto    text,
  color_marca text,                           -- acento de la marca (hex)
  creada_en   timestamptz not null default now()
);

-- Asignación estándar → predefinida (N:M; Samfor→Chevron, PDVSA→Chevron).
create table empresa_predefinidas (
  empresa_id     uuid not null references empresas(id) on delete cascade,
  predefinida_id uuid not null references empresas(id) on delete cascade,
  primary key (empresa_id, predefinida_id),
  check (empresa_id <> predefinida_id)
);

-- ────────────────────────────── PERSONAS ───────────────────────────────────

-- Perfil 1:1 con auth.users. El trigger de abajo lo crea vacío al registrarse;
-- el seed lo llena para el elenco de prueba.
create table perfiles (
  id               uuid primary key references auth.users(id) on delete cascade,
  nombre           text not null default '',
  email            text unique not null,
  rol              rol_usuario not null default 'conductor',
  empresa_id       uuid references empresas(id) on delete set null,
  conduce          boolean not null default false,
  -- Perfil obligatorio del primer ingreso (FOM-02 §3.1/§4.1/§5.1/§6.1)
  perfil_completo  boolean not null default false,
  cedula           text,
  licencia_numero  text,
  licencia_categoria text,
  licencia_vence   date,
  carta_medica_vence date,
  foto_url         text,
  creado_en        timestamptz not null default now()
);

-- Predefinidas que supervisa un supervisor_predefinida (Lino puede tener N, §2.1).
create table supervisor_predefinidas (
  user_id        uuid not null references perfiles(id) on delete cascade,
  predefinida_id uuid not null references empresas(id) on delete cascade,
  primary key (user_id, predefinida_id)
);

-- Al registrarse en auth, nace su perfil (rol por defecto: conductor; el Admin
-- lo ajusta). Mantiene email sincronizado.
create or replace function fn_nuevo_usuario() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into perfiles (id, email, nombre)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'nombre', ''))
  on conflict (id) do nothing;
  return new;
end $$;

create trigger trg_nuevo_usuario
  after insert on auth.users
  for each row execute function fn_nuevo_usuario();

-- ─────────────────────────── ÁREAS (§3.1) ──────────────────────────────────

create table areas (
  id         uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references empresas(id) on delete cascade,
  nombre     text not null,
  tipo       area_tipo not null,
  unique (empresa_id, nombre)
);

-- ─────────────────────────── GPS (§1.2/§8-4) ───────────────────────────────

create table gps (
  id             uuid primary key default gen_random_uuid(),
  modelo         text not null,                -- 1° modelo
  imei           text not null unique,         -- 2° IMEI único (V2)
  linea          text not null,                -- 3° línea telefónica
  empresa_id     uuid references empresas(id) on delete set null,
  verificado     boolean not null default false, -- ¿reporta posición?
  pin_support    boolean not null default false, -- §3.5
  panico_probado boolean not null default false,
  creado_en      timestamptz not null default now()
);

-- ────────────────────────── VEHÍCULOS (§1.2) ───────────────────────────────

create table vehiculos (
  id            uuid primary key default gen_random_uuid(),
  empresa_id    uuid not null references empresas(id) on delete cascade,
  marca         text not null,
  modelo        text not null,
  anio          int  not null check (anio between 1980 and 2100),
  placa         text not null,
  numero        text not null,                 -- número de flota (legado)
  alias         text,                          -- nombre interno (§8-1)
  tipo          vehiculo_tipo not null default 'camioneta',
  gps_id        uuid not null unique references gps(id),  -- GPS OBLIGATORIO
  area_id       uuid references areas(id) on delete set null,
  conductor_principal_id uuid references perfiles(id) on delete set null,
  -- Telemetría "en vivo" (para pruebas; en real la escribe el ingestor del GPS)
  estado_marcha marcha_estado not null default 'parada',
  velocidad_kmh int not null default 0,
  km            int not null default 0,
  lat           double precision,
  lng           double precision,
  indice_seguro int not null default 100,
  ciclo_estado  text not null default 'activo_reportando',
  creado_en     timestamptz not null default now(),
  unique (empresa_id, placa)
);

-- V1 · No se crea un vehículo si su GPS no está VERIFICADO (§1.2 paso 3.3).
create or replace function fn_validar_gps_verificado() returns trigger
language plpgsql as $$
declare v_ok boolean;
begin
  select verificado into v_ok from gps where id = new.gps_id;
  if v_ok is distinct from true then
    raise exception 'El GPS % no está verificado: no se puede terminar el alta del vehículo (FOM-02 §1.2).', new.gps_id;
  end if;
  return new;
end $$;

create trigger trg_vehiculo_gps_verificado
  before insert on vehiculos
  for each row execute function fn_validar_gps_verificado();

-- ─────────────── SECUNDARIOS + PIN y SESIONES DE USO (§3.5/§4.3) ───────────

create table conductores_secundarios (
  vehiculo_id uuid not null references vehiculos(id) on delete cascade,
  user_id     uuid not null references perfiles(id) on delete cascade,
  pin         text not null,                  -- provisional en claro; en real, en el equipo
  creado_en   timestamptz not null default now(),
  primary key (vehiculo_id, user_id)
);

-- V6 · Solo se autorizan secundarios si el GPS del vehículo soporta PIN.
create or replace function fn_validar_pin_support() returns trigger
language plpgsql as $$
declare v_pin boolean;
begin
  select g.pin_support into v_pin
  from vehiculos v join gps g on g.id = v.gps_id
  where v.id = new.vehiculo_id;
  if v_pin is distinct from true then
    raise exception 'El GPS de esta unidad no soporta PIN: solo conductor principal (FOM-02 §3.5).';
  end if;
  return new;
end $$;

create trigger trg_secundario_pin_support
  before insert on conductores_secundarios
  for each row execute function fn_validar_pin_support();

-- Sesión de uso temporal (quién usa la unidad ahora y a qué título).
create table sesiones_uso (
  id          uuid primary key default gen_random_uuid(),
  vehiculo_id uuid not null references vehiculos(id) on delete cascade,
  user_id     uuid not null references perfiles(id) on delete cascade,
  via         autor_via not null,
  desde       timestamptz not null default now(),
  hasta       timestamptz                      -- null = activa
);
create index idx_sesion_activa on sesiones_uso (vehiculo_id) where hasta is null;

-- ──────────────────────────── ODT (§3.3/§4.2) ──────────────────────────────

create table odts (
  id            uuid primary key default gen_random_uuid(),
  empresa_id    uuid not null references empresas(id) on delete cascade,
  vehiculo_id   uuid not null references vehiculos(id) on delete cascade,
  -- null = la creó el SISTEMA (preventiva automática, §3.4)
  creador_id    uuid references perfiles(id) on delete set null,
  autor_via     autor_via,
  tipo          odt_tipo not null default 'correctiva',
  estado        odt_estado not null default 'abierta',
  descripcion   text not null,
  tipo_falla    text,
  ubicacion     text,
  evidencia_urls text[] not null default '{}',
  -- Cierre completo (§3.3)
  nota_solucion text,
  costo         numeric(12,2),
  evidencia_resolucion_urls text[] not null default '{}',
  resuelta_en   timestamptz,
  regla_id      uuid,                          -- FK diferida (reglas_alerta abajo)
  creada_en     timestamptz not null default now()
);

-- ─────────────────────── INSPECCIÓN DIARIA (§4.1) ──────────────────────────

-- Plantilla del checklist en BD (los ítems que hoy viven en el mock).
create table inspeccion_items (
  id        text primary key,                  -- 'insp-frenos-1'…
  categoria text not null,
  nombre    text not null,
  critico   boolean not null default false,
  ayuda     text,
  -- A qué tipos de vehículo aplica ('{}' = a todos)
  tipos     vehiculo_tipo[] not null default '{}'
);

create table inspecciones (
  id          uuid primary key default gen_random_uuid(),
  vehiculo_id uuid not null references vehiculos(id) on delete cascade,
  driver_id   uuid not null references perfiles(id) on delete cascade,
  fecha       date not null default current_date,
  resultado   inspeccion_resultado not null,
  ubicacion   text,
  creada_en   timestamptz not null default now(),
  unique (vehiculo_id, driver_id, fecha)
);

create table inspeccion_respuestas (
  inspeccion_id uuid not null references inspecciones(id) on delete cascade,
  item_id       text not null references inspeccion_items(id),
  estado        inspeccion_item_estado not null,
  nota          text,
  evidencia_urls text[] not null default '{}',
  crear_odt     boolean,                       -- respuesta a "¿crear ODT?" (§4.1)
  primary key (inspeccion_id, item_id)
);

-- ─────────────────────── REGLAS DE ALERTA (§3.6) ───────────────────────────

create table reglas_alerta (
  id         uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references empresas(id) on delete cascade,
  tipo       regla_tipo not null,
  umbral     int not null check (umbral > 0),  -- km/h o km entre servicios
  servicio   text,                             -- 'Cambio de aceite'…
  creada_por uuid references perfiles(id) on delete set null,
  activa     boolean not null default true,
  creada_en  timestamptz not null default now()
);

-- Asignación regla ↔ vehículos, con el contador de km (§3.4).
create table regla_vehiculos (
  regla_id    uuid not null references reglas_alerta(id) on delete cascade,
  vehiculo_id uuid not null references vehiculos(id) on delete cascade,
  progreso_km int not null default 0,
  primary key (regla_id, vehiculo_id)
);

alter table odts
  add constraint odts_regla_fk foreign key (regla_id) references reglas_alerta(id) on delete set null;

-- ───────────────────── NOTIFICACIONES DEL PANEL (D7) ───────────────────────

create table notificaciones (
  id         uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references empresas(id) on delete cascade,
  tipo       notificacion_tipo not null default 'otro',
  titulo     text not null,
  detalle    text not null default '',
  odt_id     uuid references odts(id) on delete cascade,
  leida      boolean not null default false,
  creada_en  timestamptz not null default now()
);

-- ───────────── DOCUMENTOS con vencimiento (§1.2 p2 / §5.2 / §6.1) ──────────

create table documentos (
  id         uuid primary key default gen_random_uuid(),
  ambito     documento_ambito not null,
  vehiculo_id uuid references vehiculos(id) on delete cascade,
  user_id    uuid references perfiles(id) on delete cascade,
  tipo       text not null,                    -- 'Trimestres', 'RCV', 'Licencia'…
  vence_en   date not null,                    -- de aquí saltan las alertas por vencer
  -- Fotos del documento (URLs de Cloudinary; o de Supabase Storage si se
  -- prefiere guardar unas pocas en la BD provisional).
  foto_urls  text[] not null default '{}',
  check ((ambito = 'vehiculo' and vehiculo_id is not null) or (ambito = 'persona' and user_id is not null))
);

-- ───────────────────── ALERTAS DEL CONDUCTOR ───────────────────────────────

create table alertas_conductor (
  id        uuid primary key default gen_random_uuid(),
  user_id   uuid not null references perfiles(id) on delete cascade,
  titulo    text not null,
  detalle   text not null default '',
  severidad alerta_severidad not null default 'info',
  categoria alerta_categoria not null default 'otro',
  -- PERSONAL (documentos propios, perfil) vs del VEHÍCULO (separa las listas).
  ambito    text not null default 'vehiculo' check (ambito in ('personal', 'vehiculo')),
  -- Fotos adjuntas (URLs de Cloudinary).
  foto_urls text[] not null default '{}',
  enlace    text,
  leida     boolean not null default false,
  creada_en timestamptz not null default now()
);

-- ───────────────────── AUDITORÍA del alta (§1.2 p4 / §1.3) ─────────────────

create table auditoria (
  id          uuid primary key default gen_random_uuid(),
  tipo        text not null default 'alta_vehiculo',
  actor_id    uuid references perfiles(id) on delete set null,
  empresa_id  uuid references empresas(id) on delete set null,
  vehiculo_id uuid references vehiculos(id) on delete set null,
  gps_id      uuid references gps(id) on delete set null,
  detalle     text not null default '',
  fecha       timestamptz not null default now()
);

-- ───────────────────── TRIGGERS DE PROCESO (V3/V4/V5) ──────────────────────

-- V3 · resuelta_en se fija al cerrar y se limpia al reabrir (§3.3).
create or replace function fn_odt_cierre() returns trigger
language plpgsql as $$
begin
  if new.estado = 'cerrada' and old.estado <> 'cerrada' then
    new.resuelta_en := coalesce(new.resuelta_en, now());
  elsif new.estado <> 'cerrada' then
    new.resuelta_en := null;
  end if;
  return new;
end $$;

create trigger trg_odt_cierre
  before update of estado on odts
  for each row execute function fn_odt_cierre();

-- V4 · Cerrar una ODT preventiva reinicia el contador de su regla (§3.4).
create or replace function fn_odt_reinicia_contador() returns trigger
language plpgsql as $$
begin
  if new.estado = 'cerrada' and old.estado <> 'cerrada'
     and new.tipo = 'preventiva' and new.regla_id is not null then
    update regla_vehiculos
      set progreso_km = 0
      where regla_id = new.regla_id and vehiculo_id = new.vehiculo_id;
  end if;
  return new;
end $$;

create trigger trg_odt_reinicia_contador
  after update of estado on odts
  for each row execute function fn_odt_reinicia_contador();

-- V5 · ODT nueva → notificación al panel de su empresa (§3.3;
--      "Nueva ODT — Vehículo Unidad 07 (ABC-123)").
-- security definer: el trigger escribe la notificación aunque quien crea la
-- ODT (un conductor) no tenga permiso directo de INSERT en notificaciones.
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

create trigger trg_odt_notifica
  after insert on odts
  for each row execute function fn_odt_notifica();

-- ─────────────────────────── RLS (seguridad) ───────────────────────────────
-- Regla general: cada quien ve SU empresa; el admin ve todo; el supervisor de
-- predefinida SOLO LECTURA de las empresas asignadas a sus predefinidas (§2.1);
-- la auditoría es SOLO del Admin (§1.3). El service_role (backend) ignora RLS.

-- Helpers (security definer para no recursar sobre perfiles).
create or replace function mi_rol() returns rol_usuario
language sql stable security definer set search_path = public as
$$ select rol from perfiles where id = auth.uid() $$;

create or replace function mi_empresa() returns uuid
language sql stable security definer set search_path = public as
$$ select empresa_id from perfiles where id = auth.uid() $$;

create or replace function soy_admin() returns boolean
language sql stable security definer set search_path = public as
$$ select mi_rol() = 'admin' $$;

-- Empresas asignadas a mis predefinidas (para el supervisor de predefinida).
create or replace function mis_empresas_gerencial() returns setof uuid
language sql stable security definer set search_path = public as
$$ select ep.empresa_id
   from supervisor_predefinidas sp
   join empresa_predefinidas ep on ep.predefinida_id = sp.predefinida_id
   where sp.user_id = auth.uid() $$;

-- ¿Puedo VER datos de esta empresa? (admin, mi empresa, o gerencial asignada)
create or replace function puedo_ver_empresa(eid uuid) returns boolean
language sql stable security definer set search_path = public as
$$ select soy_admin()
       or mi_empresa() = eid
       or eid in (select mis_empresas_gerencial()) $$;

-- ¿Puedo OPERAR esta empresa? (admin o supervisor de ESA empresa; gerencial NO)
create or replace function puedo_operar_empresa(eid uuid) returns boolean
language sql stable security definer set search_path = public as
$$ select soy_admin()
       or (mi_empresa() = eid and mi_rol() in ('supervisor_company','supervisor_personal')) $$;

alter table empresas               enable row level security;
alter table empresa_predefinidas   enable row level security;
alter table perfiles               enable row level security;
alter table supervisor_predefinidas enable row level security;
alter table areas                  enable row level security;
alter table gps                    enable row level security;
alter table vehiculos              enable row level security;
alter table conductores_secundarios enable row level security;
alter table sesiones_uso           enable row level security;
alter table odts                   enable row level security;
alter table inspeccion_items       enable row level security;
alter table inspecciones           enable row level security;
alter table inspeccion_respuestas  enable row level security;
alter table reglas_alerta          enable row level security;
alter table regla_vehiculos        enable row level security;
alter table notificaciones         enable row level security;
alter table documentos             enable row level security;
alter table alertas_conductor      enable row level security;
alter table auditoria              enable row level security;

-- Empresas: todos los autenticados ven las que les tocan; solo Admin escribe.
create policy emp_select on empresas for select to authenticated
  using (soy_admin() or id = mi_empresa() or id in (select mis_empresas_gerencial())
         or id in (select predefinida_id from supervisor_predefinidas where user_id = auth.uid()));
create policy emp_admin_write on empresas for all to authenticated
  using (soy_admin()) with check (soy_admin());

create policy emppre_select on empresa_predefinidas for select to authenticated using (true);
create policy emppre_admin on empresa_predefinidas for all to authenticated
  using (soy_admin()) with check (soy_admin());

-- Perfiles: veo el mío y los de mi ámbito; edito el mío (perfil obligatorio);
-- el Admin y el supervisor operativo gestionan los de su alcance.
create policy perf_select on perfiles for select to authenticated
  using (id = auth.uid() or soy_admin() or empresa_id = mi_empresa()
         or empresa_id in (select mis_empresas_gerencial()));
create policy perf_update_propio on perfiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());
create policy perf_admin on perfiles for all to authenticated
  using (soy_admin() or puedo_operar_empresa(empresa_id))
  with check (soy_admin() or puedo_operar_empresa(empresa_id));

create policy suppre_select on supervisor_predefinidas for select to authenticated
  using (user_id = auth.uid() or soy_admin());
create policy suppre_admin on supervisor_predefinidas for all to authenticated
  using (soy_admin()) with check (soy_admin());

-- Datos operativos por empresa (ver: ámbito; operar: supervisor/admin).
create policy areas_select on areas for select to authenticated using (puedo_ver_empresa(empresa_id));
create policy areas_write  on areas for all to authenticated
  using (puedo_operar_empresa(empresa_id)) with check (puedo_operar_empresa(empresa_id));

create policy gps_select on gps for select to authenticated
  using (empresa_id is null or puedo_ver_empresa(empresa_id));
create policy gps_admin on gps for all to authenticated using (soy_admin()) with check (soy_admin());

create policy veh_select on vehiculos for select to authenticated using (puedo_ver_empresa(empresa_id));
create policy veh_admin_insert on vehiculos for insert to authenticated with check (soy_admin());
create policy veh_update on vehiculos for update to authenticated
  using (puedo_operar_empresa(empresa_id)) with check (puedo_operar_empresa(empresa_id));

create policy sec_select on conductores_secundarios for select to authenticated
  using (user_id = auth.uid()
         or puedo_operar_empresa((select empresa_id from vehiculos v where v.id = vehiculo_id)));
create policy sec_write on conductores_secundarios for all to authenticated
  using (puedo_operar_empresa((select empresa_id from vehiculos v where v.id = vehiculo_id)))
  with check (puedo_operar_empresa((select empresa_id from vehiculos v where v.id = vehiculo_id)));

create policy ses_select on sesiones_uso for select to authenticated
  using (user_id = auth.uid()
         or puedo_ver_empresa((select empresa_id from vehiculos v where v.id = vehiculo_id)));
create policy ses_write on sesiones_uso for all to authenticated
  using (user_id = auth.uid()
         or puedo_operar_empresa((select empresa_id from vehiculos v where v.id = vehiculo_id)))
  with check (user_id = auth.uid()
         or puedo_operar_empresa((select empresa_id from vehiculos v where v.id = vehiculo_id)));

-- ODT: el conductor crea las suyas y ve las suyas; el supervisor opera las de
-- su empresa; la vista gerencial las LEE (histórico, §2.1).
create policy odt_select on odts for select to authenticated
  using (creador_id = auth.uid() or puedo_ver_empresa(empresa_id));
create policy odt_insert_conductor on odts for insert to authenticated
  with check (creador_id = auth.uid() or puedo_operar_empresa(empresa_id));
create policy odt_update on odts for update to authenticated
  using (puedo_operar_empresa(empresa_id)) with check (puedo_operar_empresa(empresa_id));

create policy items_select on inspeccion_items for select to authenticated using (true);
create policy items_admin on inspeccion_items for all to authenticated
  using (soy_admin()) with check (soy_admin());

create policy insp_select on inspecciones for select to authenticated
  using (driver_id = auth.uid()
         or puedo_ver_empresa((select empresa_id from vehiculos v where v.id = vehiculo_id)));
create policy insp_insert on inspecciones for insert to authenticated
  with check (driver_id = auth.uid());
create policy insp_update on inspecciones for update to authenticated
  using (driver_id = auth.uid()) with check (driver_id = auth.uid());
create policy insp_resp_select on inspeccion_respuestas for select to authenticated
  using (exists (select 1 from inspecciones i where i.id = inspeccion_id
                 and (i.driver_id = auth.uid()
                      or puedo_ver_empresa((select empresa_id from vehiculos v where v.id = i.vehiculo_id)))));
create policy insp_resp_insert on inspeccion_respuestas for insert to authenticated
  with check (exists (select 1 from inspecciones i where i.id = inspeccion_id and i.driver_id = auth.uid()));
create policy insp_resp_delete on inspeccion_respuestas for delete to authenticated
  using (exists (select 1 from inspecciones i where i.id = inspeccion_id and i.driver_id = auth.uid()));

create policy regla_select on reglas_alerta for select to authenticated using (puedo_ver_empresa(empresa_id));
create policy regla_write on reglas_alerta for all to authenticated
  using (puedo_operar_empresa(empresa_id)) with check (puedo_operar_empresa(empresa_id));
create policy reglaveh_select on regla_vehiculos for select to authenticated
  using (puedo_ver_empresa((select empresa_id from reglas_alerta r where r.id = regla_id)));
create policy reglaveh_write on regla_vehiculos for all to authenticated
  using (puedo_operar_empresa((select empresa_id from reglas_alerta r where r.id = regla_id)))
  with check (puedo_operar_empresa((select empresa_id from reglas_alerta r where r.id = regla_id)));

create policy notif_select on notificaciones for select to authenticated
  using (puedo_operar_empresa(empresa_id) or (soy_admin()));
create policy notif_update on notificaciones for update to authenticated
  using (puedo_operar_empresa(empresa_id)) with check (puedo_operar_empresa(empresa_id));
-- La app también notifica (ej. alerta del conductor → panel de SU empresa).
create policy notif_insert on notificaciones for insert to authenticated
  with check (soy_admin() or puedo_operar_empresa(empresa_id) or empresa_id = mi_empresa());

create policy doc_select on documentos for select to authenticated
  using (user_id = auth.uid()
         or (vehiculo_id is not null and puedo_ver_empresa((select empresa_id from vehiculos v where v.id = vehiculo_id)))
         or (user_id is not null and puedo_ver_empresa((select empresa_id from perfiles p where p.id = user_id))));
create policy doc_write on documentos for all to authenticated
  using (soy_admin()
         or (vehiculo_id is not null and puedo_operar_empresa((select empresa_id from vehiculos v where v.id = vehiculo_id))))
  with check (soy_admin()
         or (vehiculo_id is not null and puedo_operar_empresa((select empresa_id from vehiculos v where v.id = vehiculo_id))));

create policy alerta_select on alertas_conductor for select to authenticated using (user_id = auth.uid());
create policy alerta_update on alertas_conductor for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy alerta_insert on alertas_conductor for insert to authenticated
  with check (user_id = auth.uid());
create policy alerta_delete on alertas_conductor for delete to authenticated
  using (user_id = auth.uid() or soy_admin());

-- Auditoría: SOLO el Admin la ve (§1.3). La escribe el sistema/Admin.
create policy aud_admin_select on auditoria for select to authenticated using (soy_admin());
create policy aud_admin_insert on auditoria for insert to authenticated
  with check (soy_admin() or puedo_operar_empresa(empresa_id));
