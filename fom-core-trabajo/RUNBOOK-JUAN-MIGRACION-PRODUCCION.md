# Runbook para Juan — subir las tablas a la base de PRODUCCIÓN

Fecha: 2026-08-24 · Contexto: ventana operativa del Issue #191 · Autor: Claude (sesión de Marco)

## Situación en una línea

El primer `fom-prod deploy` falló construyendo la imagen (una prueba de modo
ejecutable fallaba dentro del contenedor; **la base no se tocó**:
`DATABASE_CHANGED=NO`). La corrección está lista en el **PR #192** con CI
verde. Falta: integrarlo y re-ejecutar el deploy. Son unos 15 minutos.

## Paso 0 — Integrar el PR #192 (desde GitHub)

- PR: https://github.com/juancpachecog/fom-core/pull/192
- Es **solo pruebas** (un archivo, `test/developer-vpn-access.test.js`): la
  prueba del helper del Issue 160 ahora verifica el modo ejecutable en el
  índice de git (100755) en vez del disco, porque el checkout de producción
  no refleja modos en disco (`core.fileMode` degradado) y la imagen Docker no
  lleva `.git`. Cero cambios de runtime, cero migraciones.
- Integrar por **squash merge** (CI ya está verde: Validate backend 4m08s ✓,
  MQTT ✓).

## Paso 1 — Respaldo del día (en fom-db-01)

La atestación exige un recibo de HOY. Si el recibo vigente ya es de hoy,
salta este paso. Si no:

```bash
sudo /usr/local/sbin/fom-prod backup
```

Guarda la línea `FOM_PROD_BACKUP_OK date=... path=... sha256=...` completa.

## Paso 2 — Deploy con migraciones (en fom-app-01)

```bash
sudo /usr/local/sbin/fom-prod deploy
```

- Resuelve `origin/main` (ya con el #192), corre primero el `--dry-run`, y
  te pide pegar el recibo `FOM_PROD_BACKUP_OK` **textual** del paso 1.
- Luego construye la imagen, aplica las migraciones
  (`deploy.sh --with-migrations`) y corre el health-check.
- Éxito = `FOM_PROD_DEPLOY_OK commit=<sha>`. Copia también la línea
  `PREVIOUS_IMAGE=...` que imprime el deploy (es el token de rollback).
  La de la corrida fallida era `fom-core-api:git-978f731745c6`.

## Paso 3 — Exponer la consola (en fom-app-01)

```bash
sudo /usr/local/sbin/fom-prod nginx-install
```

Éxito = `FOM_PROD_NGINX_OK probe=401` (la consola responde y exige sesión).

## Paso 4 — Humo y versión (en fom-app-01)

```bash
sudo /usr/local/sbin/fom-prod smoke
```

```bash
sudo /usr/local/sbin/fom-prod version
```

Éxito = `FOM_PROD_SMOKE_OK` con las cuatro rutas en 401, y `version` con el
commit nuevo.

## Paso 5 — Publicar recibos

Pegar en el #191: recibo del respaldo, `FOM_PROD_DEPLOY_OK`,
`PREVIOUS_IMAGE`, `FOM_PROD_NGINX_OK`, `FOM_PROD_SMOKE_OK` y la salida de
`version`.

## Si algo falla

- **Deploy falla**: detente y publica la salida completa en el #191; el
  resumen `MIGRATION_EXECUTED/DATABASE_CHANGED/DEPLOYMENT_OK` dice si la base
  se tocó. No repitas a ciegas.
- **Rollback de imagen** (solo si el runtime quedó mal tras un deploy OK):

```bash
sudo /usr/local/sbin/fom-prod rollback-image
```

  y pega el `PREVIOUS_IMAGE` del recibo. Para revertir migraciones de base
  existe el plan por fases del runbook del #185 — no improvisar.

## Después (para que Marco entre a la consola)

1. Root crea `/opt/fom/secrets/prod/console-identity.email` con el email
   REAL de Marco (una sola línea, `0644` dentro de un directorio `0700`).
2. Con Marco tecleando en persona:

```bash
sudo /usr/local/sbin/fom-prod console-password
```

3. Marco entra a la consola con ese email + contraseña y ve su flota real.
