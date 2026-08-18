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
| [PR #166](https://github.com/juancpachecog/fom-core/pull/166) | Esquema de dominio: 18 tablas | Abierto, CI verde, **no se despliega** |

El #165 se integró por squash merge en el commit
`1c3e1a3d32fbdcf6b69ee96e99a7e38af65ac95e`.

El #166 queda como propuesta de diseño, dividida en cuatro Issues:

| Issue | Bloque | Depende de |
|---|---|---|
| [#168](https://github.com/juancpachecog/fom-core/issues/168) | Identidad y organización | — |
| [#169](https://github.com/juancpachecog/fom-core/issues/169) | Flota | #168 |
| [#170](https://github.com/juancpachecog/fom-core/issues/170) | Operación: ODT e inspecciones | #168, #169 |
| [#171](https://github.com/juancpachecog/fom-core/issues/171) | Cumplimiento y auditoría | los tres |

---

## Lo que YA está en la base de FOM-TEST

`fom.gps_positions` tiene cuatro columnas nuevas: `speed_kph`, `heading_deg`,
`ignition` y `odometer_km`.

Salida de los seis pasos, el 18 de agosto de 2026:

```text
FOM_TEST_PROMOTION_OK   commit=1c3e1a3d32fbdcf6b69ee96e99a7e38af65ac95e
FOM_TEST_VALIDATION_OK  commit=1c3e1a3d32fbdcf6b69ee96e99a7e38af65ac95e
deploy                  Image fom-core-api:test Built · fom-test-api Healthy
FOM_TEST_MIGRATION_OK   20260817120000000_add_gps_position_telemetry (UP)
FOM_TEST_SMOKE_OK       las cinco pruebas de móvil en PASS
FOM_TEST_VERSION_OK     commit=1c3e1a3, environment=test, node v22.23.2
```

**Es la base de PRUEBAS, no producción.** FOM-PROD queda fuera de este acceso
de forma permanente.

---

## Contenido de esta carpeta

```
parches/       165-INTEGRADO-1c3e1a3.txt  resumen de lo que se integró
               166-esquema-dominio.patch  el PR abierto, aplicable con git am
migraciones/   las cinco migraciones, legibles sin aplicar nada
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

Ninguna migración del repositorio usa PostGIS ni TimescaleDB, así que lo único
que le falta a esta copia local son extensiones que estas migraciones no tocan.

**Aviso.** Estos scripts extraen el SQL con una expresión regular y no miran la
sintaxis de TypeScript. Hay que correr también `npx tsc --noEmit`: son
comprobaciones distintas y ya se coló un error por saltarse la segunda.

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
