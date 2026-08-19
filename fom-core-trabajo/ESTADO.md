# Trabajo sobre `fom-core` — estado y cómo retomarlo

Esta carpeta es el respaldo del trabajo hecho sobre el backend `fom-core`, que
vive en **otro repositorio** (`juancpachecog/fom-core`). Está aquí para poder
continuar desde cualquier computadora sin depender de tener aquel repositorio
clonado ni de recordar en qué rama quedó cada cosa.

Última actualización: 18 de agosto de 2026, tras el despliegue en FOM-TEST.

---

## Dónde está cada cosa hoy

| | Qué es | Estado |
|---|---|---|
| [PR #165](https://github.com/juancpachecog/fom-core/pull/165) | Telemetría: velocidad y rumbo (Issue #159) | **Integrado y desplegado en FOM-TEST** |
| [PR #166](https://github.com/juancpachecog/fom-core/pull/166) | Esquema de dominio: 18 tablas | Draft. Sirvió de fuente; se dividió en cuatro PR ya integrados |
| #175, #176, #177, #178 | Los cuatro bloques | **Integrados y desplegados** |

El #165 se integró por squash merge en el commit
`1c3e1a3d32fbdcf6b69ee96e99a7e38af65ac95e`.

### La revisión del #166

Juan lo devolvió a Draft con tres objeciones, todas atendidas el 18 de agosto:

1. **No estaba vinculado a un Issue que autorizase el alcance.** El handoff
   exige presentar el diseño, pero eso no sustituye una decisión de alcance.
2. **Mezclaba seis límites funcionales y de seguridad distintos.** La revisión
   y el despliegue deben poder aprobarse bloque a bloque.
3. **Al integrar el #165 antes, había que rebasar y arreglar la cadena de
   reversión de CI.** Hecho: los dos workflows conservan los cinco pasos, con
   los cuatro de dominio delante del de telemetría.

Los cuatro Issues quedan completos con lo que pidió: tablas, invariantes con el
CHECK o trigger que los impone, permisos por columna, estrategia
expand/contract, pruebas cross-tenant y autorización operacional acotada a
FOM-TEST.

**Los cuatro fueron autorizados** bajo la política de autonomía continua
([#174](https://github.com/juancpachecog/fom-core/issues/174)) y están
integrados y desplegados. Cada uno traía criterios de cierre propios, atendidos
en su PR.

| Issue | Bloque | Depende de |
|---|---|---|
| [#168](https://github.com/juancpachecog/fom-core/issues/168) | Identidad y organización | — |
| [#169](https://github.com/juancpachecog/fom-core/issues/169) | Flota | #168 |
| [#170](https://github.com/juancpachecog/fom-core/issues/170) | Operación: ODT e inspecciones | #168, #169 |
| [#171](https://github.com/juancpachecog/fom-core/issues/171) | Cumplimiento y auditoría | los tres |

Y uno más, para desbloquear la consola web:

| Issue | Qué decide |
|---|---|
| [#173](https://github.com/juancpachecog/fom-core/issues/173) | El contrato de la superficie de lectura: vehículos, áreas y conductores |

---

## Lo que YA está en la base de FOM-TEST

**Las dieciocho tablas están aplicadas.** Programa #168 → #169 → #170 → #171
cerrado el 19 de agosto de 2026, más las cuatro columnas de telemetría del
#159 del día anterior.

| Bloque | Commit | Qué añadió |
|---|---|---|
| #159 telemetría | `1c3e1a3` | `speed_kph`, `heading_deg`, `ignition`, `odometer_km` |
| #168 identidad | `4795575` | `tenant_relationships`, `user_profiles`, `user_credentials`, `tenants.category` |
| #169 flota | `3f6387e` | `areas`, `vehicle_driver_assignments`, `vehicle_live_state`, `vehicles.vehicle_type` |
| #170 operación | `a47d5cc` | `work_orders`, `work_order_events` y las cuatro de inspecciones |
| #171 cumplimiento | `301d474` | `documents`, `document_files`, `alert_rules`, `alert_rule_vehicles`, `notifications`, `audit_log` |

Cinco despliegues, ningún paso fallido, ningún seed ni backfill ni dato real.

**Es la base de PRUEBAS.** FOM-PROD queda fuera de este acceso de forma
permanente, y ahí no hay nada de esto todavía.

### Lo que cada bloque encontró

Ninguno fue solo copiar tablas. En cada uno apareció algo:

**#168** — el aislamiento de datos personales **no existía**. Un permiso por
columna limita qué columnas se leen, no qué filas, y estas tablas no llevan
`tenant_id` porque la cédula es de la persona y no del contratista. La
aplicación podía leer la cédula y el teléfono de todo el sistema. Se resolvió
con identidad de actor en la sesión y políticas de fila. Además, `operator` se
traducía a `conductor`: el operador telemático no es quien maneja.

**#169** — el PIN del conductor ya no puede guardarse en claro: el CHECK exige
formato argon2id, así que la base rechaza cuatro dígitos o un hash de otra
familia.

**#170** — el catálogo de estados vivía repetido en tres sitios, de modo que
ampliarlo obligaba a acertar en los tres. Ahora vive en un dominio y crecer es
una línea. Se reconcilió con `docs/functional/FOM-MAINTENANCE.md` y con la app
móvil: entran `aprobada` y `cancelada`, no entra `pendiente` —la solicitud es
una entidad, no un estado—.

**#171** — la clave de almacenamiento admitía URLs. Una URL firmada mete un
secreto con caducidad en una tabla que se respalda y se audita. Ahora se
rechaza cualquier esquema, cadena de consulta o espacio.

### Las pruebas tienen dientes

Las cuatro pruebas de ejecución (`pruebas/`) corren en cada CI, y **cada una se
verificó rompiéndola a propósito** para comprobar que detecta el fallo que dice
cubrir. Una prueba que no puede fallar no demuestra nada.

## Contenido de esta carpeta

```
parches/       165-INTEGRADO-1c3e1a3.txt  resumen de lo que se integró
               166-esquema-dominio.patch  el PR abierto, aplicable con git am
migraciones/   las cinco migraciones, legibles sin aplicar nada
pruebas/       las cuatro pruebas de ejecucion y el guardia de plantillas
pipeline/      los archivos del decodificador GPS, ya en su versión de main
verificar/     probar migraciones sin servidor ni PostgreSQL instalado
```

### Retomar desde otra computadora

```bash
git clone https://github.com/juancpachecog/fom-core.git
cd fom-core
```

`main` ya trae el #165. Para seguir con el esquema de dominio:

```bash
git checkout -b feat/esquema-dominio-fom02 origin/feat/esquema-dominio-fom02
```

---

## Cómo probar migraciones sin servidor

Esto convirtió las vueltas de 25 minutos en vueltas de 20 segundos. No hace
falta PostgreSQL instalado ni acceso al servidor: PGlite es PostgreSQL 17
compilado a WebAssembly y corre dentro de Node.

```bash
mkdir prueba-pg && cd prueba-pg
npm init -y
npm install @electric-sql/pglite
```

Después, desde la raíz de `fom-core`:

```bash
node ../fom/fom-core-trabajo/verificar/aplicar.mjs src/database/migrations/files
```

Aplica todas las migraciones en orden y se detiene en la primera que falle,
mostrando el error con su contexto.

| Script | Para qué |
|---|---|
| `aplicar.mjs` | Aplica todas las migraciones en orden |
| `revertir.mjs` | Aplica y después revierte las nuevas, comprobando que el esquema queda igual |
| `sintaxis.mjs` | Solo sintaxis, ignorando errores de catálogo |
| `determinar-unidad-velocidad.sql` | Resuelve si el campo de GPS103 son km/h o nudos |
| `lib-bloques.mjs` | Extrae el SQL de una migración separando up() de down() |

Ninguna migración del repositorio usa PostGIS ni TimescaleDB, así que lo único
que le falta a esta copia local son extensiones que estas migraciones no tocan.

**Aviso.** Estos scripts extraen el SQL con una expresión regular y no miran la
sintaxis de TypeScript. Hay que correr también `npx tsc --noEmit`: son
comprobaciones distintas y ya se coló un error por saltarse la segunda.

**Segundo aviso, aprendido a golpes.** La primera versión de `aplicar.mjs`
tomaba solo el primer `pgm.sql()` de cada migración. La de telemetría tiene
cuatro en `up()` —`SET LOCAL`, `ALTER TABLE`, restricciones y comentarios—, así
que la herramienta ejecutaba únicamente el `SET LOCAL` y daba por aplicada una
migración que no lo estaba. Corregido en `lib-bloques.mjs`, que corta por la
posición de `export const down`. Una herramienta de verificación que miente es
peor que no tenerla.

---

## El hallazgo del #165

El decodificador Coban exigía que los campos 12 y 13 de GPS103 —velocidad y
rumbo— vinieran **vacíos**, y descartaba la trama completa cuando no lo
estaban:

```ts
if (fields[3] !== '' || fields[11] !== '' || fields[12] !== ';') {
  return failure('unsupported', 'unexpected_fields');
}
```

Un equipo detenido los deja en blanco. Uno en movimiento no. La regla descartaba
justamente las tramas de los vehículos que circulaban: lo que llegaba a
`fom.gps_positions` estaba sesgado hacia las paradas.

Nada se perdió de forma irreversible: `gps_raw_messages.payload` se conserva
íntegro y `decoder_version` forma parte de la clave de idempotencia, así que
subir la versión del decodificador y reprocesar recupera el histórico.

---

## Lo que sigue pendiente

### 1. La unidad de velocidad

`COBAN_SPEED_WIRE_UNIT` está en `'undetermined'` y `speed_kph` se escribe como
NULL. GPS103 no declara la unidad y las dos lecturas posibles se diferencian en
1,852. Equivocarse no produce un error visible: produce velocidades verosímiles
y falsas de forma permanente.

**Cómo se resuelve:** para un mismo equipo, tomar pares de posiciones válidas
consecutivas, calcular la velocidad implícita entre ellas (distancia sobre
tiempo) y compararla con el campo reportado. Si coincide son km/h; si el campo
es la implícita entre 1,852, son nudos.

No se puede hacer en FOM-TEST: `GPS_LIVE_ENABLED=NO` y los datos son
sintéticos. Hace falta alguien con lectura sobre tramas reales. Preguntado en
el Issue #159.

Confirmada la unidad: cambiar la constante, subir `protocolVersion` a `'3'` y
reprocesar.

### 2. Ignición y odómetro

Ninguno de los trece campos de una trama `tracker` los transporta. El encendido
llega en mensajes `acc on` / `acc off` que hoy se rechazan como
`unsupported_family`. Preguntado en el #159 si entra ahí o va en Issue aparte.

Mientras tanto, el verde y el gris del mapa siguen significando «reportando» y
«sin señal», no «encendido» y «apagado».

### 3. Los endpoints que faltan para la consola web

Las tablas son necesarias pero **no suficientes**. La web no habla con la base
de datos: habla con la API, y la API no tiene endpoints para estos dominios.

Endpoints que existen hoy:

```
login · session · logout · me · refresh
devices · devices/:id/position/latest · devices/:id/positions
devices/:id/telemetry · observability/* · map-providers/* · health
```

No hay ninguno para órdenes de trabajo, inspecciones, documentos, alertas,
conductores ni administración.

| Con datos reales | Con datos de ejemplo |
|---|---|
| Centro de control | Mantenimiento |
| Flota (lista) | Inspecciones |
| Resumen (parcial) | Documentos |
| Expediente de vehículo (parcial) | Alertas |
| | Personal |
| | Reportes |
| | Admin: Empresas, Usuarios, Pagos, Auditoría |

Hace falta un Issue funcional por bloque, con servicio, DTO, OpenAPI y pruebas.
Orden propuesto por valor: vehículos y conductores → mantenimiento y órdenes →
documentos y alertas → administración.

**Segundo hueco, más de fondo.** La consola usa hoy `gps-console-internal`, que
no es una superficie pública: funciona en local porque `vite.config.js` monta
un puente que guarda el token del lado del servidor. Para publicar la web hace
falta una superficie pública equivalente a la de la app móvil.

---

## Trampas encontradas, para no repetirlas

**Comillas invertidas en comentarios SQL.** Las migraciones son plantillas de
TypeScript. Un comentario que escriba una columna entre comillas invertidas
cierra la cadena a media migración y el archivo deja de compilar. Pasó dos
veces, la segunda al redactar la explicación de un arreglo.

**`CASE` dentro de la condición de un `IF` en PL/pgSQL.** El analizador corta la
condición en el primer `THEN` fuera de paréntesis, y el `THEN` del `CASE` llega
antes. El error que devuelve —`syntax error at end of input`— no menciona ni el
`IF` ni el `CASE`.

**Añadir una columna `NOT NULL` y quitarle el `DEFAULT`.** Rompe toda sentencia
existente que no nombre la columna. Una migración aditiva no puede hacer eso.
Lo detectó el CI, no la revisión humana.

**La cadena de reversión del CI.** Los pasos de `migration:down` de `ci.yml` y
`gps-console-ci.yml` encadenan reversiones contando desde la última migración
aplicada. Cualquier migración nueva rompe esa cuenta. Toda migración necesita su
paso de reversión insertado **arriba** de los existentes. Corregido en ambos
workflows con un comentario que lo advierte.

**Declarar una unidad que no está demostrada.** El tipo del decodificador solo
admitía `'knot' | 'kph'`, así que con la constante en `'undetermined'` publicaba
`'knot'`. Lo detectó la revisión de Juan: afirmaba como observado justo lo que
el PR declaraba desconocido.

---

## Acceso al servidor

Cuenta individual nominal en `fom-app-01`, por WireGuard, grupo
`fom-test-operators`. El usuario, la dirección y la ruta de la llave no se
escriben aquí: este repositorio es público. Están en
`docs/team/FOM-TEST-DIRECT-ACCESS.md` del repositorio del backend y en la
configuración local de cada quien.

Comandos disponibles, solo sobre FOM-TEST:

```bash
sudo /usr/local/sbin/fom-test promote    # trae main al servidor
sudo /usr/local/sbin/fom-test validate
sudo /usr/local/sbin/fom-test deploy
sudo /usr/local/sbin/fom-test migrate    # aplica migraciones up
sudo /usr/local/sbin/fom-test smoke
sudo /usr/local/sbin/fom-test version
```

`promote` solo acepta lo que ya está integrado en `main`; rechaza ramas de
trabajo. Si `deploy` o `migrate` fallan: detenerse, publicar la salida y no
repetir.

Para que Claude Code pueda ejecutarlos hace falta
`.claude/settings.json` en el proyecto con la regla de permiso correspondiente.
Ese archivo lo tiene que crear una persona: ampliar los permisos del asistente
no es algo que el asistente pueda hacerse a sí mismo.
