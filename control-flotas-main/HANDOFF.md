# FOM / Control de Flotas — Documento de Traspaso Técnico

> Handoff para continuar el proyecto en otro entorno / con otro desarrollador.
> Generado el 2026-07-06. Rama principal: `main`. Repo privado.

**FOM** (Fleet Operations & Maintenance) es una app **móvil multiempresa** para control de
flotas: telemetría/GPS, inspección preoperacional, mantenimiento (preventivo/correctivo/predictivo),
desempeño del conductor ("manejo seguro"), reportes, costos, chats y asignación de viajes.
Dos grandes superficies en una sola app: **vista de conductor** (FOM-DRIVER) y **panel de
administración** (FOM-WEB, por pestañas).

Estado actual: **funcional con datos simulados (mock)**. Toda la data pasa por una **capa de
servicios abstracta** (`src/services`) con la misma forma `async` que tendrá la API real; migrar =
reescribir solo esa capa (84 puntos marcados con `TODO API`), sin tocar pantallas.

Documentación de producto ya existente en el repo (leer junto a este handoff):
`README.md`, `BRIEF_PROYECTO.md`, `DISENO_DIRECCION.md`, `FLUJOS_ARQUITECTURA_FOM.md`,
`PLAN_ADAPTACION_FOM.md`, `AGENTS.md` (nota: Expo cambió; leer los docs versionados de Expo SDK 54).

---

## 1. Stack y versiones

| Capa | Tecnología | Versión |
|------|-----------|---------|
| Runtime / framework | **Expo** (SDK 54) | `54.0.35` |
| UI | **React Native** | `0.81.5` |
| Lenguaje | **React** | `19.1.0` |
| | **TypeScript** | `~5.9.2` (strict) |
| Routing | **expo-router** (v6, file-based, typedRoutes) | `~6.0.24` |
| Navegación nativa | react-native-screens / safe-area-context | `~4.16.0` / `~5.6.0` |
| Animación | react-native-reanimated + worklets | `~4.1.1` / `0.5.1` |
| Gestos | react-native-gesture-handler | `~2.28.0` |
| Gráficos vectoriales | **react-native-svg** | `15.12.1` |
| Mapas | **react-native-maps** (Apple/Google nativo) | `1.20.1` |
| Ubicación | expo-location | `~19.0.8` |
| Imagen / cámara | expo-image / expo-image-picker | `~3.0.11` / `~17.0.11` |
| Web | react-native-web | `~0.21.0` |
| Lint | eslint + eslint-config-expo | `^9.0.0` / `~10.0.0` |

**Requisitos de entorno:** Node.js 20+, npm, y la app **Expo Go** en un teléfono (Android
recomendado) o un emulador. Para mapas reales hace falta un **dev build** (ver §7).

Notas de config relevantes (`app.json` → `experiments`): **`typedRoutes: true`** (las rutas se
tipan; se regeneran en `.expo/types/router.d.ts` al arrancar) y **`reactCompiler: true`**
(React Compiler activo). Sin `babel.config.js` ni `metro.config.js` propios (defaults de Expo).

---

## 2. Cómo ejecutar

```bash
# 1. Instalar dependencias
npm install

# 2. Arrancar el servidor de desarrollo (Metro) + QR de Expo Go
npx expo start
#   a: abrir en Android · i: abrir en iOS · w: web

# Atajos equivalentes definidos en package.json:
npm run start      # expo start
npm run android    # expo start --android
npm run ios        # expo start --ios
npm run web        # expo start --web
npm run lint       # expo lint (ESLint)

# Typecheck (no hay script; se corre directo):
npx tsc --noEmit
```

- **No hay build de producción configurado** aún (no hay EAS build / `eas.json`). Para binarios se
  usaría `eas build` (requiere cuenta Expo + config).
- **No hay tests** (no hay runner ni script `test`; `npm test` no existe). Ver §9.
- **Verificación usada durante el desarrollo:** `npx tsc --noEmit` y `npx eslint "src/**/*.{ts,tsx}"`
  deben salir en 0. Los tipos de ruta se generan arrancando Expo una vez (crea `.expo/types`).

### Usuarios de prueba (mock)

Contraseña única para todos (mock, solo desarrollo — está en `src/services/authService.ts`):
**ver el archivo** (no se reproduce aquí por seguridad).

| Rol | Correo | Aterriza en |
|-----|--------|-------------|
| Admin de empresa | `admin@samfor.com` | Panel de Samfor (directo) |
| Admin general | `general@chevron.com` | Menú de empresas (Samfor + Petrosur) + comparativas/costos |
| Conductor | `jmarrufo@samfor.com` | Inicio map-first del conductor (es el "conductor vivo", ver §8) |
| Conductor | `rbracho@petrosur.com` | Inicio del conductor |

(Los super admin del equipo también están en `authService.ts`.)

---

## 3. Variables de entorno / secretos

**Actualmente el proyecto NO usa variables de entorno ni archivos `.env`** — todo es mock e in-memory.
No hay referencias a `process.env` en el código.

Cuando se conecte el backend/mapas reales harán falta (solo **nombres sugeridos**, sin valores):

| Nombre (sugerido) | Dónde | Para qué |
|-------------------|-------|----------|
| `EXPO_PUBLIC_API_BASE_URL` | `.env` / EAS secrets | Base URL del backend real (reemplaza los mocks de `src/services`) |
| `expo.android.config.googleMaps.apiKey` | `app.json` | Renderizar Google Maps en Android (hoy ausente → mapa en blanco en Android) |
| `EXPO_PUBLIC_GOOGLE_MAPS_KEY` (o server-side) | `.env` / backend | Directions API (rutas calle por calle) y Places (búsqueda de direcciones) — hoy simulado en `routingService` |
| Claves del proveedor de identidad / MFA | backend | Login y verificación MFA reales (hoy mock, código `123456`) |

> ⚠️ **Secretos hoy hardcodeados:** `src/services/authService.ts` contiene correos y una contraseña
> mock de prueba. Deben **eliminarse/rotarse** antes de cualquier despliegue: la validación real de
> credenciales debe ocurrir en el backend.

---

## 4. Estructura del repositorio

```
Control_Flotas/
├── app.json                     # Config Expo (plugins, permisos, typedRoutes, reactCompiler)
├── package.json                 # Deps y scripts
├── tsconfig.json                # TS strict + alias @/* → src/*
├── eslint.config.js             # ESLint (flat config, eslint-config-expo)
├── expo-env.d.ts
├── README.md / BRIEF_PROYECTO.md / DISENO_DIRECCION.md
├── FLUJOS_ARQUITECTURA_FOM.md / PLAN_ADAPTACION_FOM.md / AGENTS.md / CLAUDE.md
├── HANDOFF.md                   # (este documento)
├── assets/                      # íconos, imágenes, splash
├── scripts/reset-project.js
└── src/
    ├── global.css               # variables CSS (solo web)
    ├── app/                     # RUTAS (expo-router, file-based)
    │   ├── _layout.tsx          # Root Stack + árbol de Providers
    │   ├── login.tsx  mfa.tsx  sedes.tsx  empresas.tsx
    │   ├── perfil.tsx  reportar.tsx  orden.tsx  documentos.tsx
    │   ├── mensajes.tsx  chats.tsx  chat.tsx  costos.tsx
    │   ├── comparar.tsx  reporte.tsx  reporte-usuarios.tsx  reporte-multi.tsx
    │   ├── viaje.tsx  asignar-viaje.tsx  emergencia.tsx  sincronizacion.tsx
    │   ├── (driver)/            # TABS del conductor (grupo de ruta)
    │   │   ├── _layout.tsx  index.tsx  viajes.tsx  inspeccion.tsx  alertas.tsx  mas.tsx
    │   └── panel/               # TABS del admin (carpeta nombrada, NO grupo)
    │       ├── _layout.tsx  index.tsx (Resumen)  flota.tsx  personal.tsx
    │       ├── operaciones.tsx (Viajes)  mantenimiento.tsx  mas.tsx
    │   ├── auth/                # Sesión "quién está logueado" + permisos por rol
    │   │   ├── AuthProvider.tsx  useAuth.ts  useSignOut.ts  permissions.ts  index.ts
    │   ├── session/             # Contextos de sesión (tenant, conducción, admin, destino login)
    │   │   ├── TenantProvider.tsx  DrivingProvider.tsx  AdminProvider.tsx
    │   │   ├── useLoginDestino.ts  index.ts
    │   ├── services/            # ⭐ CAPA DE DATOS ABSTRACTA (mock → API real)
    │   │   ├── index.ts (barril/contrato)  network.ts  authService.ts  accountService.ts
    │   │   ├── brandService.ts  fleetService.ts  driverService.ts  companyService.ts
    │   │   ├── userService.ts  workOrderService.ts  emergencyService.ts
    │   │   ├── maintenanceService.ts  costService.ts  routingService.ts
    │   ├── theme/               # Sistema de temas (tokens + marca por empresa)
    │   │   ├── tokens.ts  createTheme.ts  ThemeProvider.tsx  useTheme.ts
    │   │   ├── colorUtils.ts  brand.ts  types.ts  useReducedMotion.ts  index.ts
    │   ├── sync/                # Offline-first: outbox + banner + hook
    │   │   ├── outbox.ts  use-sync.ts  sync-banner.tsx  index.ts
    │   ├── components/          # ~55 componentes de UI reutilizables (ver §6)
    │   ├── hooks/               # use-color-scheme (+ .web)
    │   ├── types/index.ts       # ⭐ MODELO DE DOMINIO (todos los tipos)
    │   └── utils/               # date.ts  vigencia.ts
```

Conteo de fuentes: **79 `.tsx` + 36 `.ts` + 1 `.css`**.

---

## 5. Archivos clave (por dónde empezar a leer)

| Archivo | Rol | Prioridad |
|---------|-----|-----------|
| `src/app/_layout.tsx` | **Entrypoint**: Root Stack + anidado de Providers | ⭐⭐⭐ |
| `src/types/index.ts` | **Modelo de datos** completo del dominio (Apéndice A) | ⭐⭐⭐ |
| `src/services/index.ts` | **Contrato** de la capa de datos (barril de todos los servicios) | ⭐⭐⭐ |
| `src/services/network.ts` | `fakeNetwork()` — patrón mock (simula latencia) | ⭐⭐ |
| `src/services/driverService.ts` | Núcleo del conductor: inspección, viajes, alertas, mensajes, **mensajería admin y asignación de viajes** (933 líneas) | ⭐⭐⭐ |
| `src/services/companyService.ts` | Flota, OT, reportes, comparativas de empresa (572 líneas) | ⭐⭐⭐ |
| `src/services/authService.ts` | Login mock + usuarios/roles (⚠️ secretos) | ⭐⭐ |
| `src/session/*` | Estado global: tenant/MFA/sede, conducción (chip), empresa activa, destino de login | ⭐⭐⭐ |
| `src/auth/*` | Sesión + permisos por rol (`esAdmin`, `puedeConducir`, `esMultiempresa`) | ⭐⭐⭐ |
| `src/theme/tokens.ts` + `createTheme.ts` | Design tokens + marca por empresa | ⭐⭐ |
| `src/sync/outbox.ts` | Cola offline-first (optimista + reintento al reconectar) | ⭐⭐ |
| `src/app/(driver)/index.tsx` | Inicio map-first del conductor (lengüeta deslizable) | ⭐⭐ |
| `src/app/panel/_layout.tsx` | Tabs del admin (guards + marca por empresa) | ⭐⭐ |
| `src/components/bottom-sheet.tsx` | Lengüeta deslizable (PanResponder + Animated) | ⭐ |
| `src/components/{login-background,screen-background,appear}.tsx` | Sistema visual "fresco" (fondos SVG animados + entrada) | ⭐ |

**Componentes de UI destacados** (`src/components/`): `themed-view` (+ prop `ambient`),
`themed-text`, `card`, `button`, `pill-button`, `pressable-scale`, `metric-card`, `segmented-control`,
`score-ring`, `map-vehiculo` (+ `.web`), `map-route-picker`, `map-ruta` (+ `.web`), `tab-icon`,
`bottom-sheet`, `admin-header`, `text-field`, `ot-status-badge`, `viaje-card`, `skeleton`,
`pulse-dot`, `progress-bar`, `home-action-card`, `inspection-item`, `evidence-field`, etc.

---

## 6. Arquitectura general

### 6.1 Capas (flujo de dependencias, de arriba hacia abajo)

```
┌─────────────────────────────────────────────────────────────┐
│  PANTALLAS / RUTAS   src/app/**   (expo-router, file-based)   │
│  - Vista conductor (driver)   - Panel admin (panel/)          │
└───────────────┬───────────────────────────┬─────────────────┘
                │ consumen hooks             │ leen datos
                ▼                            ▼
┌───────────────────────────┐   ┌───────────────────────────────┐
│  ESTADO GLOBAL (Context)   │   │  CAPA DE SERVICIOS  @/services │
│  @/auth   @/session        │──▶│  (única puerta a los datos)    │
│  @/theme  @/sync           │   │  hoy MOCK · mañana API real    │
└───────────────────────────┘   └───────────────┬───────────────┘
                                                 ▼
                                 ┌───────────────────────────────┐
                                 │  DATOS MOCK en memoria          │
                                 │  (arrays/Maps a nivel de módulo,│
                                 │   mutables durante la sesión)   │
                                 └───────────────────────────────┘
```

**Regla de oro:** las pantallas **nunca** acceden a datos directamente; todo pasa por `@/services`.
Cada función de servicio devuelve una `Promise` (contrato async ya listo) y marca con `TODO API` el
punto exacto donde irá el `fetch` real. Migrar a backend = reescribir cuerpos de servicio, sin tocar
pantallas ni tipos.

### 6.2 Árbol de Providers (en `src/app/_layout.tsx`)

```
SafeAreaProvider
└─ ThemeProvider            (tema activo: tokens + marca de empresa)
   └─ AuthProvider          (usuario logueado; fuente de verdad de sesión)
      └─ TenantProvider     (MFA, cuenta/tenant, sedes — resuelto al login)
         └─ AdminProvider   (empresa activa del panel)
            └─ DrivingProvider (emparejamiento por chip/GPS del conductor)
               └─ Stack (Root, headers ocultos, transición slide + gesto)
```

El orden importa: `AuthProvider` va dentro de `ThemeProvider` (el login ya tiene tema);
Tenant/Admin/Driving dependen del `user` de Auth y se **reinician con cada usuario**.

### 6.3 Modelo multi-tenant y roles

- **Roles** (capas acumulativas, `types.Role`): `driver` → `companyAdmin` → `generalAdmin` → `superAdmin`.
- **Bandera transversal `drives`**: si es `true`, el usuario (de cualquier rol) obtiene además la
  vista de conductor.
- **Jerarquía de datos:** `Cuenta/Tenant` → `Sede` → `Company` → `FleetGroup` → `Vehicle`.
- **Permisos** centralizados en `src/auth/permissions.ts`: `esAdmin`, `puedeConducir`,
  `esConductorPuro`, `esMultiempresa`.

### 6.4 Navegación / destino de login

`useLoginDestino()` (`src/session/useLoginDestino.ts`) es la **única** fuente que decide a dónde ir
tras validar credenciales:

```
login → (MFA si aplica) → (elegir sede si empresa jurídica con >1 sede) → dashboard por rol:
  · puedeConducir           → '/'         (tabs del conductor)
  · multiempresa/sin company→ '/empresas' (menú de empresas → panel)
  · admin de 1 empresa      → '/panel'    (tabs del admin; empresa la fija AdminProvider)
```

Detalle de rutas: `(driver)/` es un **grupo de ruta** (no aparece en la URL) con las tabs del
conductor; `panel/` es una **carpeta nombrada** (rutas `/panel`, `/panel/flota`, …) — se usó carpeta
nombrada y no otro grupo `(admin)` para evitar la colisión `(admin)/index` vs `(driver)/index`
(ambos mapearían a `/`).

### 6.5 Reflejo automático conductor → admin (dato compartido)

Los servicios guardan estado mutable **a nivel de módulo** (p. ej. `MOCK_WORK_ORDERS`, `_mensajes`,
`_inspeccionDia`, `_proximosViajes`). Por eso lo que hace el conductor se refleja "solo" en el admin
dentro de la misma sesión de la app:

```
Conductor reporta falla → workOrderService.crearOrdenDeTrabajo()
   → companyService.registrarOrden() muta MOCK_WORK_ORDERS
   → panel/mantenimiento (Correctivo) y Resumen leen getOrdenesDeTrabajo() → aparece la OT
   → costService toma las OT 'Realizada' como costo de mantenimiento correctivo
```

Lo mismo con inspección (`getInspeccionVehiculo` refleja lo que hizo el conductor vivo),
mensajes (hilo `_mensajes` compartido admin↔conductor) y viajes asignados
(`asignarViaje` empuja a `_proximosViajes` del conductor vivo).

> ⚠️ Este "reflejo" es **in-memory y de una sola sesión/dispositivo**. Se pierde al recargar. Con el
> backend real será persistente y multi-dispositivo (websockets/polling).

### 6.6 Sincronización offline (`src/sync/outbox.ts`)

Patrón offline-first: las acciones del conductor actualizan el estado local **de inmediato**
(optimista) y encolan su "viaje al servidor" con `encolar(tipo, descripcion, ejecutar)`. Si hay
conexión, corre ya; si no, espera en la cola y se procesa al reconectar (`setOnline(true)`). Es un
singleton observable (sin React) consumido por `useSync`/`SyncBanner`. La conexión hoy se simula
desde la pantalla `/sincronizacion`.

### 6.7 Sistema de temas (`src/theme/`)

Tema activo = **tokens del esquema** (claro/oscuro) **+ overlay de marca de empresa**
(`createTheme(scheme, brand)`). Solo el acento (`primary`/`onPrimary`) depende de la marca; se
recalcula el contraste del texto. Las pantallas consumen `useTheme()` (colores, spacing, radii,
typography, shadows, motion, brand) y `useThemeController()` (cambiar marca/modo). Todo color sale
del tema — nunca hardcodeado. Capa visual "fresca" reciente: `login-background` / `screen-background`
(fondos SVG animados) + `appear` (entrada escalonada) + prop `ambient` en `ThemedView`.

---

## 7. Mapas (nota importante para el nuevo entorno)

`react-native-maps` es **nativo**: no funciona en Expo Go web y requiere un **dev build** para
Android/iOS reales. En iOS usa **Apple Maps** (gratis, detallado). En **Android** requiere una
**Google Maps API key** en `app.json` (`expo.android.config.googleMaps.apiKey`) — **hoy ausente**, así
que en Android el mapa puede salir en blanco hasta agregarla. Existen fallbacks web
(`map-vehiculo.web.tsx`, `map-ruta.web.tsx`). Las **rutas reales calle por calle**, la **búsqueda de
lugares** y el **paso a paso** necesitan la **Directions/Places API de Google** (de pago);
`routingService.calcularRuta()` hoy da una **aproximación local** (haversine × factor) con la ruta
dibujada como línea interpolada, ya cableada para enchufar la API real.

---

## 8. Detalle: el "conductor vivo"

En el mock, el conductor que usa la app se ancla al id **`usr-sam-1` (José Marrufo)**. Su hilo de
chat es el `_mensajes` real (lo que escribe le llega al admin y viceversa) y los viajes que el admin
le asigna entran a su agenda real (`_proximosViajes`). Para los **demás** conductores, los hilos y
viajes son simulados/deterministas por id. El vehículo vivo de referencia es **`veh-014`**.

---

## 9. Bugs conocidos, limitaciones y TODOs

### 9.1 Puntos de integración con backend (`TODO API`) — 84 en total

| Servicio | Nº | Servicio | Nº |
|----------|----|----------|----|
| driverService.ts | 33 | companyService.ts | 14 |
| emergencyService.ts | 8 | fleetService.ts | 5 |
| maintenanceService.ts | 5 | userService.ts | 5 |
| costService.ts | 4 | accountService.ts | 3 |
| workOrderService.ts | 3 | routingService.ts | 2 |
| brandService.ts | 1 | | |

Buscar `TODO API` en `src/services/*.ts` para el mapa exacto de endpoints a implementar.

### 9.2 Limitaciones / deuda técnica (no son bugs, son estado del mock)

1. **Sesión solo en memoria**: se pierde al recargar/reiniciar (sin persistencia de token). Ver
   comentario en `AuthProvider.tsx`. Falta almacenamiento seguro + refresh.
2. **Datos mock in-memory y de un solo dispositivo**: el estado compartido (OT, mensajes, viajes) se
   resetea al recargar y no sincroniza entre dispositivos.
3. **Mapas**: requieren dev build; Android sin API key → mapa en blanco (ver §7).
4. **Rutas/Places/turn-by-turn**: aproximación local en `routingService`; falta Directions API.
5. **`reverseGeocodeAsync`** en `asignar-viaje.tsx` es best-effort (try/catch); puede fallar en
   silencio y caer al nombre por defecto.
6. **Sin tests automatizados** ni runner configurado.
7. **Credenciales mock hardcodeadas** en `authService.ts` (⚠️ quitar antes de producción).
8. **Build web falla** para pantallas con mapa nativo (esperado; `expo export --platform web`
   termina con error tras generar `.expo/types`).
9. **Reportes por fecha no filtran aún**: `ReportPeriod` viaja en el alcance y se muestra, pero el
   mock no filtra por `desde`/`hasta` (los datos son estáticos). La BD real sí filtrará.
10. **Campo `estadoAceite`** (`OilStatus`) sigue en el tipo `VehicleTelemetry` pero la UI del
    conductor ya usa `aceitePct` (porcentaje). Campo semi-obsoleto en la vista.
11. Warnings **LF→CRLF** al hacer commit en Windows (inofensivos).

### 9.3 Marcadores `TODO`/`FIXME` de código (fuera de `TODO API`)

No hay `FIXME`/`HACK`/`BUG` pendientes en el código. Las 3 coincidencias de "TODO" restantes son la
palabra "TODO" en comentarios (no marcadores de tarea).

---

## 10. Guía rápida para conectar el backend real

1. **Un servicio a la vez**: abrir `src/services/<x>Service.ts`, localizar cada `TODO API` y
   reemplazar el cuerpo (que hoy arma datos mock + `fakeNetwork`) por el `fetch` real. **Mantener la
   firma y el tipo de retorno** — las pantallas no cambian.
2. **Auth primero**: `authService.signIn` y `accountService.getContextoLogin`/`verificarMfa`. Añadir
   persistencia de token en `AuthProvider` (hoy solo `useState`).
3. **Reflejo en vivo**: sustituir el estado mutable de módulo por llamadas al backend +
   polling/websockets (OT, mensajes, viajes, telemetría).
4. **Mapas**: agregar la Google Maps API key (Android) en `app.json`, hacer un **dev build**, y
   cambiar `routingService.calcularRuta` por Directions API.
5. **Variables de entorno**: introducir `EXPO_PUBLIC_API_BASE_URL` y claves (ver §3).
6. Quitar credenciales mock de `authService.ts`.

---

## 11. Volcado de archivos clave

Por tamaño, este documento incluye el **volcado completo** de la *columna vertebral* (config,
entrypoint, contrato de servicios, sesión, auth, tema, sync) en los **Apéndices** de las siguientes
tandas. El **modelo de datos completo** (`src/types/index.ts`, 750 líneas) va en el Apéndice A.

- **Apéndice A** — Modelo de datos (`src/types/index.ts`) — *incluido abajo*.
- **Apéndice B** — Config + entrypoint (`package.json`, `app.json`, `tsconfig.json`,
  `eslint.config.js`, `src/app/_layout.tsx`) — *Tanda 2*.
- **Apéndice C** — Sesión y auth (`src/session/*`, `src/auth/*`) — *Tanda 2*.
- **Apéndice D** — Capa de servicios: contrato (`index.ts`), `network.ts`, y patrón mock — *Tanda 2/3*.
- **Apéndice E** — Tema y sync (`src/theme/*`, `src/sync/outbox.ts`) — *Tanda 3*.

> El resto del código fuente vive en el repo. Puedo volcar íntegro cualquier archivo grande
> (`driverService.ts`, `companyService.ts`, pantallas) en tandas adicionales si se necesita en el doc.

---

## Apéndice A — Modelo de datos (`src/types/index.ts`)

Ver el archivo real para el contenido íntegro y comentado; a continuación, el índice de tipos por
dominio (todos exportados desde `@/types`):

- **Identidad/acceso:** `Role`, `AuthStatus`, `TenantTipo`, `Cuenta`, `Sede`, `ContextoLogin`,
  `Company`, `FleetGroup`, `User`, `FuelFill`, `DriverMetrics`, `Licencia`, `DriverProfile`.
- **Plano del vehículo:** `VehicleType`, `Vehicle`, `Emparejamiento`, `VehicleStatus`, `Gear`,
  `OilStatus`, `VehicleTelemetry`.
- **Plano del conductor / jornada:** `ScoreRange`, `DriverScore`, `InspeccionEstado`,
  `InspeccionDiaria`, `NoAptoMotivo`, `AptitudDelDia`, `ViajeEstado`, `Parada`, `Viaje`, `PasoRuta`,
  `RutaViaje`, `AgendaViajes`, `AlertaSeveridad`, `AlertaCategoria`, `Alerta`, `ResumenAvisos`,
  `MensajeAutor`, `Mensaje`, `DocumentoEstado`, `DocumentoAmbito`, `Documento`.
- **Emergencia:** `EmergenciaTipo`, `EmergenciaEstado`, `EmergenciaAutor`, `EmergenciaMensaje`,
  `Emergencia`, `EnviarSOSInput`.
- **Inspección (checklist):** `InspeccionItemEstado`, `InspeccionItem`, `InspeccionCategoria`,
  `InspeccionPlantilla`, `InspeccionItemRespuesta`, `EnviarInspeccionInput`, `ResultadoInspeccion`.
- **Órdenes de trabajo:** `WorkOrderStatus`, `WORK_ORDER_STATUSES`, `FaultType`, `WorkOrder`,
  `WorkOrderListItem`.
- **Dashboard de empresa:** `LatLng`, `MapMarker`, `FleetVehicle`, `FleetSummary`.
- **Reportes:** `ReportScopeType`, `ReportPeriod`, `ReportScope`, `ReportMetrics`,
  `VehicleReportRow`, `FleetReport`, `CompanyStats`, `UserReportScopeType`, `UserReportScope`,
  `UserReportMetrics`, `UserReport`.

> Nota: tipos del **tema** (`Theme`, `ColorTokens`, `CompanyBrand`, etc.) viven aparte en `@/theme`.
> Tipos de la **capa de servicios** (p. ej. `PlanPreventivo`, `CostoItem`, `RutaCalculada`,
> `ConversacionAdmin`, `AsignarViajeInput`, `ViajeAsignado`, `VehiculoUsado`) se declaran en su
> servicio y se reexportan por `@/services`.
