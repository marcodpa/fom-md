# Trabajo sobre `fom-core` — estado y cómo retomarlo

Esta carpeta es el respaldo del trabajo hecho sobre el backend `fom-core`, que
vive en **otro repositorio** (`juancpachecog/fom-core`). Está aquí para poder
continuar desde cualquier computadora sin depender de tener aquel repositorio
clonado ni de recordar en qué rama quedó cada cosa.

Última actualización: 18 de agosto de 2026.

---

## Dónde está cada cosa hoy

| PR | Qué es | Rama | CI | Estado |
|---|---|---|---|---|
| [#165](https://github.com/juancpachecog/fom-core/pull/165) | Telemetría: velocidad y rumbo (Issue #159) | `feat/159-telemetria-canonica-aditiva` | verde | abierto, sin integrar |
| [#166](https://github.com/juancpachecog/fom-core/pull/166) | Esquema de dominio: 18 tablas | `feat/esquema-dominio-fom02` | verde | abierto, sin integrar |

**Nada se ha aplicado a ninguna base de datos.** Ni a producción ni a FOM-TEST.
Las migraciones existen como propuesta y están verificadas, pero no ejecutadas.

Juan pidió expresamente no ejecutar migraciones ni despliegues hasta que él lo
coordine, después del merge.

---

## Contenido

```
parches/       Los dos PR completos, aplicables con git am
migraciones/   Las cinco migraciones, legibles sin aplicar nada
pipeline/      Los archivos del decodificador GPS que cambian en el #165
verificar/     Herramientas para probar las migraciones sin servidor
```

### Retomar desde otra computadora

```bash
git clone https://github.com/juancpachecog/fom-core.git
cd fom-core
git checkout -b feat/159-telemetria-canonica-aditiva origin/feat/159-telemetria-canonica-aditiva
```

Las ramas están publicadas, así que basta con eso. Los parches de `parches/`
son la red de seguridad por si alguna rama se pierde:

```bash
git checkout main
git am < ../fom/fom-core-trabajo/parches/165-telemetria-canonica.patch
```

---

## Cómo probar las migraciones sin servidor

Esto es lo que convirtió las vueltas de 25 minutos en vueltas de 20 segundos.
No hace falta PostgreSQL instalado ni acceso al servidor: PGlite es PostgreSQL
17 compilado a WebAssembly y corre dentro de Node.

```bash
mkdir prueba-pg && cd prueba-pg
npm init -y
npm install @electric-sql/pglite
```

Después, desde la raíz de `fom-core`:

```bash
node ../fom/fom-core-trabajo/verificar/aplicar.mjs src/database/migrations/files
```

Aplica las veintitrés migraciones en orden y se detiene en la primera que
falle, mostrando el error con su contexto.

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

## El hallazgo importante del #165

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

## Dos cosas que quedaron deliberadamente en NULL

**`speed_kph`.** GPS103 no declara la unidad de ese campo y las dos lecturas
posibles se diferencian en un factor de 1,852. Equivocarse no produce un error
visible: produce velocidades verosímiles y falsas de forma permanente.

Se resuelve comparando el campo reportado con la velocidad implícita entre dos
posiciones válidas consecutivas del mismo equipo (distancia sobre tiempo). Si
coincide son km/h; si el campo es la implícita entre 1,852, son nudos.
Confirmada la unidad: cambiar `COBAN_SPEED_WIRE_UNIT` en el decodificador,
subir `protocolVersion` a `'3'` y reprocesar.

**`ignition` y `odometer_km`.** Ninguno de los trece campos de una trama
`tracker` los transporta. El encendido llega en mensajes `acc on` / `acc off`
que hoy se rechazan como `unsupported_family`. Las columnas se crean ahora para
no volver a migrar la tabla. Derivar el encendido de la velocidad sería
inventarlo.

---

## Lo que falta para que la consola web funcione entera

Las tablas son necesarias pero **no suficientes**. La web no habla con la base
de datos: habla con la API, y la API no tiene endpoints para estos dominios.

Endpoints que existen hoy en `fom-core`:

```
login · session · logout · me · refresh
devices · devices/:id/position/latest · devices/:id/positions
devices/:id/telemetry · observability/* · map-providers/* · health
```

No hay ninguno para órdenes de trabajo, inspecciones, documentos, alertas,
conductores ni administración.

Estado por módulo de la consola:

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
TypeScript. Un comentario que escriba `` `columna`` `` con comillas invertidas
cierra la cadena a media migración y el archivo deja de compilar. Pasó dos
veces.

**`CASE` dentro de la condición de un `IF` en PL/pgSQL.** El analizador corta la
condición en el primer `THEN` fuera de paréntesis, y el `THEN` del `CASE` llega
antes. El error que devuelve —`syntax error at end of input`— no menciona ni el
`IF` ni el `CASE`.

**Añadir una columna `NOT NULL` y quitarle el `DEFAULT`.** Rompe toda sentencia
existente que no nombre la columna. Una migración aditiva no puede romper a
quien ya escribe. Lo detectó el CI, no la revisión humana.

**La cadena de reversión del CI.** Los pasos de `migration:down` de `ci.yml` y
`gps-console-ci.yml` encadenan reversiones contando desde la última migración
aplicada. Cualquier migración nueva rompe esa cuenta y hace fallar una
comprobación que no tiene nada roto que señalar. Toda migración necesita su
paso de reversión insertado **arriba** de los existentes.

---

## Acceso al servidor

La cuenta individual funciona: `fomdev-marco` en `fom-app-01` (10.20.30.10),
por WireGuard, grupo `fom-test-operators`.

Permite ejecutar, cuando esté autorizado y solo sobre FOM-TEST:

```bash
sudo /usr/local/sbin/fom-test promote
sudo /usr/local/sbin/fom-test deploy
sudo /usr/local/sbin/fom-test migrate
sudo /usr/local/sbin/fom-test smoke
```

`promote` solo acepta lo que ya está integrado en `main`. FOM-PROD queda fuera
de este acceso de forma permanente.
