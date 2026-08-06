-- ============================================================================
-- FOM · Seed MÍNIMO: solo los 3 ADMIN FOM (desarrolladores)
-- ============================================================================
-- Regla del producto: el sistema nace únicamente con los 3 desarrolladores.
-- TODO lo demás (empresas, empresas generales, supervisores, conductores,
-- vehículos, reglas…) lo crean ELLOS desde la Consola de la app, eligiendo el
-- perfil y la empresa de cada quien — eso define su vista y sus permisos.
--
-- CÓMO USARLO:
--   1) Crea los 3 usuarios en Authentication → Add user (✅ Auto Confirm):
--      los emails de abajo (cámbialos por los REALES de los desarrolladores
--      cuando estén definidos) con su clave.
--   2) Ejecuta este archivo en el SQL Editor. Es seguro repetirlo: todo se
--      resuelve por email y no duplica nada.
-- ============================================================================

-- ── A · Los 3 ADMIN FOM (por email; los usuarios ya existen en auth) ────────
with admins(email, nombre, cedula) as (values
  ('jguerracaldera@gmail.com', 'Juan Guerra',   'V-9.333.444'),
  ('marcodpacheco@gmail.com',  'Marco Pacheco', 'V-9.111.222'),
  ('juancpachecog@gmail.com',  'Juan Pacheco',  'V-9.555.666')
)
update perfiles p set
  rol = 'admin'::rol_usuario,
  empresa_id = null,
  conduce = false,
  perfil_completo = true,
  cedula = a.cedula,
  nombre = a.nombre
from admins a where p.email = a.email;

-- Verificación rápida: debe devolver 3 filas con rol 'admin'.
-- select email, rol from perfiles where rol = 'admin';

-- ── B · Catálogo de inspección (checklist a 3 estados, §4.1) ────────────────
-- Es catálogo del producto (no datos de una empresa): sí nace con el sistema.
insert into inspeccion_items (id, categoria, nombre, critico, ayuda, tipos) values
  ('insp-llantas-1','Llantas','Presión y estado de las llantas',true,'Sin cortes, desgaste parejo, sin objetos clavados.','{}'),
  ('insp-llantas-2','Llantas','Llanta de repuesto y herramientas',false,null,'{}'),
  ('insp-frenos-1','Frenos','Pedal de freno y freno de mano',true,'Firme, sin ir hasta el fondo; el de mano retiene.','{}'),
  ('insp-frenos-2','Frenos','Nivel de líquido de frenos',true,null,'{}'),
  ('insp-luces-1','Luces','Luces delanteras y traseras',true,'Altas, bajas, freno y reversa encienden.','{}'),
  ('insp-luces-2','Luces','Direccionales y estacionarias',false,null,'{}'),
  ('insp-motor-1','Motor y fluidos','Nivel de aceite',false,null,'{}'),
  ('insp-motor-2','Motor y fluidos','Nivel de refrigerante',false,null,'{}'),
  ('insp-motor-3','Motor y fluidos','Fugas visibles bajo el vehículo',true,'Manchas de aceite, refrigerante o combustible.','{}'),
  ('insp-cabina-1','Cabina y seguridad','Cinturones de seguridad',true,null,'{}'),
  ('insp-cabina-2','Cabina y seguridad','Espejos y limpiaparabrisas',false,null,'{}'),
  ('insp-docs-1','Documentos','Documentos del vehículo al día',false,'Trimestres, RCV, carné y póliza.','{}'),
  ('insp-carga-1','Carga y acople','Quinta rueda / acople',true,'Enganche firme y asegurado.','{camion}'),
  ('insp-carga-2','Carga y acople','Amarres y sujeción de la carga',true,null,'{camion}'),
  ('insp-carga-3','Carga y acople','Frenos de aire (presión y fugas)',true,null,'{camion}')
on conflict (id) do nothing;

-- ── Limpieza (OPCIONAL) ─────────────────────────────────────────────────────
-- Si en un intento anterior quedaron datos demo (Samfor, petrosur, chevron,
-- sampieri…) y quieres una BD limpia, descomenta y ejecuta UNA vez:
-- delete from empresas where slug in ('Samfor','petrosur','pdvsa-petroboscan','chevron','sampieri');
-- (Las tablas dependientes caen en cascada.)
