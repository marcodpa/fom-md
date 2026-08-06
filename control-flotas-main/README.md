# Control de Flotas (FleetView)

Plataforma multiempresa para el control de flotas de transporte: GPS/telemetría, mantenimiento y desempeño del conductor, en un solo sistema. App móvil hecha con **Expo (React Native) + TypeScript**.

> Enfoque de producto: **cuidar a la gente y que todos lleguen a casa**. El score y el semáforo del conductor se enmarcan como *manejo seguro*, no como vigilancia. Ver `BRIEF_PROYECTO.md` y `DISENO_DIRECCION.md`.

## Estado

Base **funcional con datos simulados (mock)**. Toda la data pasa por una **capa de servicios abstracta** (`src/services`): cuando esté la BD/API real, se cambia solo esa capa sin tocar las pantallas.

## Requisitos

- Node.js 20+
- npm
- App **Expo Go** en el teléfono (Android recomendado) o un emulador

## Cómo correr

```bash
npm install
npx expo start
```

Escanea el QR con Expo Go (Android) o ábrelo en emulador. En iOS con Expo Go el mapa usa Apple Maps; en Android usa Google Maps (ver nota de mapas más abajo).

## Usuarios de prueba

Contraseña para todos: **`Flotas2026..`** (credenciales mock, solo desarrollo — están en `src/services/authService.ts`).

| Rol | Correo | Qué ve |
|-----|--------|--------|
| Admin de empresa | `admin@samfor.com` | Panel de Samfor (entra directo) |
| Admin general | `general@chevron.com` | Menú de empresas (Samfor + Petrosur), comparador y reportes multi-empresa |
| Conductor | `jmarrufo@samfor.com` | Inicio + vista de conductor |
| Conductor | `rbracho@petrosur.com` | Inicio + vista de conductor |

(Los super admin del equipo de desarrollo también están en `authService.ts`.)

## Arquitectura

- **`src/app`** — pantallas y navegación (Expo Router, rutas por archivo).
- **`src/services`** — capa de datos (hoy mock; marcada con `TODO API`). Punto único de acceso; las pantallas nunca llaman a una API directo.
- **`src/theme`** — sistema de diseño: tokens (colores por capa, tipografía, espaciado, radios, animación) y **tema por empresa** (cada empresa re-pinta el acento sin tocar pantallas).
- **`src/components`** — componentes reutilizables (botón, tarjetas, mapa, chips, pills de estado, skeletons, etc.).
- **`src/auth`** — sesión y roles. **`src/session`** — emparejamiento conductor↔vehículo (chip). **`src/types`** — tipos de dominio.

### Roles (capas acumulativas)

Conductor → Admin de empresa → Admin general → Super admin. Cada rol suma capacidades; todos tienen la vista base de conductor si conducen.

## Módulos incluidos

- Login por rol · Inicio + emparejamiento por chip · Vista de conductor (mapa, telemetría, índice de manejo seguro)
- Panel de admin por empresa (mapa de flota, resumen, vehículos/usuarios)
- Órdenes de trabajo de punta a punta (crear, detalle, ciclo de estados, nota/costo de solución)
- Reportes de **vehículos** y de **usuarios** (por vehículo/grupo/flota/general) con rango de tiempo
- Comparador y generador de reportes **multi-empresa**
- Grupos de flota · Perfiles de usuario con métricas

## Nota sobre mapas

Se usa `react-native-maps`. **Android ya usa Google Maps**; iOS usa Apple Maps por defecto. Para Google Maps en iOS hace falta API key de Google + un *development build* (no funciona en Expo Go iOS). Pendiente para la fase de build.

## Calidad

```bash
npx tsc --noEmit   # tipos
npx eslint src/    # lint
```

## Convenciones para el equipo

- TypeScript siempre. Todo el color sale del **tema** (nunca hardcodeado).
- Trabajar en **ramas** y abrir **Pull Requests** hacia `main`.
- Mantener el tema por empresa intacto; los colores semánticos (verde/amarillo/rojo) solo para estado/seguridad.
