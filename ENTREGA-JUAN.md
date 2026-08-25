# Entrega de la web FOM — cómo correrla

Para Juan (o quien reciba este repositorio). Fecha: 2026-08-25.

## Qué es esto

La web completa de FOM: el sitio público y la **consola** (panel de flota)
que ya trabaja contra la base real de producción a través de la superficie
pública `/api/v1/console` (cookie de sesión, sin token interno).

## Arrancarla en 3 pasos

```bash
npm install
```

Crear un archivo `.env` en la raíz (copiando `.env.example`) con, como
mínimo:

```
FOM_API_URL=https://15.204.105.201
VITE_FOM_API=/fom-api
```

```bash
npm run dev
```

Abrir `http://localhost:5173` → "Saltar introducción" → iniciar sesión con
un usuario real de la consola (email + contraseña de producción).

## Notas de arquitectura (lo no obvio)

- **El puente de desarrollo** vive en `vite.config.js`: reenvía `/fom-api/*`
  al servidor y retiene la cookie `__Host-fom_session` del lado del servidor
  de desarrollo (sobre `http://localhost` esa cookie no sobrevive en el
  navegador). En producción real esto lo reemplaza servir la web bajo el
  mismo dominio HTTPS que la API.
- El certificado del servidor es autofirmado: el puente lo acepta
  (`secure: false`) porque la IP destino está fijada en el `.env`.
- **Puente de última posición**: mientras el estado vivo del servidor llegue
  vacío (hasta desplegar el PR #194 de fom-core), el panel pide la última
  posición por unidad (tope 25). Con el #194 desplegado, ese código deja de
  ejecutarse solo. Está en `src/panel/datos/repoApi.js`.
- El panel se refresca solo: centro de control cada 15 s, resumen cada 30 s,
  y se pausa con la pestaña en segundo plano.
- `FOM_INTERNAL_TOKEN` y `FOM_DEV_ACTOR_EMAIL` del `.env.example` son SOLO
  para la superficie interna heredada en desarrollo; la consola no los usa y
  no deben existir en ningún despliegue.
- El historial de trabajo y decisiones está en `fom-core-trabajo/ESTADO.md`.

## Lo que sigue (Fase 2)

Cuando el PR #199 de fom-core esté desplegado, la pantalla **Personal** se
conecta a los endpoints nuevos: crear usuarios con clave temporal, asignar
conductor principal/secundario y crear/editar vehículos, según la matriz de
permisos aprobada (documento "Permisos FOM").
