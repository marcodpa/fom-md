# FOM / Control de Flotas — Apéndices del Traspaso (volcado de archivos clave)

> Complemento de `HANDOFF.md`. Aquí va el **contenido íntegro** de los archivos de la columna
> vertebral (config, entrypoint, sesión, auth, tema, sync, contrato de servicios). El código de
> pantallas y de los servicios grandes (`driverService.ts`, `companyService.ts`, …) vive en el repo;
> se puede volcar en tandas adicionales si se requiere en el documento.

Índice:
- **Apéndice B** — Config + entrypoint
- **Apéndice C** — Sesión (`@/session`) y auth (`@/auth`)
- **Apéndice D** — Capa de servicios: contrato + patrón mock + API surface
- **Apéndice E** — Tema (`@/theme`) y sync (`@/sync`)

---

## Apéndice B — Config + entrypoint

### `package.json`

```json
{
  "name": "control_flotas",
  "main": "expo-router/entry",
  "version": "1.0.0",
  "dependencies": {
    "expo": "54.0.35",
    "expo-constants": "~18.0.13",
    "expo-font": "~14.0.12",
    "expo-image": "~3.0.11",
    "expo-image-picker": "~17.0.11",
    "expo-linking": "~8.0.12",
    "expo-location": "~19.0.8",
    "expo-router": "~6.0.24",
    "expo-splash-screen": "~31.0.13",
    "expo-status-bar": "~3.0.9",
    "expo-system-ui": "~6.0.9",
    "react": "19.1.0",
    "react-dom": "19.1.0",
    "react-native": "0.81.5",
    "react-native-gesture-handler": "~2.28.0",
    "react-native-maps": "1.20.1",
    "react-native-reanimated": "~4.1.1",
    "react-native-safe-area-context": "~5.6.0",
    "react-native-screens": "~4.16.0",
    "react-native-svg": "15.12.1",
    "react-native-web": "~0.21.0",
    "react-native-worklets": "0.5.1"
  },
  "devDependencies": {
    "@types/react": "~19.1.10",
    "eslint": "^9.0.0",
    "eslint-config-expo": "~10.0.0",
    "typescript": "~5.9.2"
  },
  "scripts": {
    "start": "expo start",
    "reset-project": "node ./scripts/reset-project.js",
    "android": "expo start --android",
    "ios": "expo start --ios",
    "web": "expo start --web",
    "lint": "expo lint"
  },
  "private": true
}
```

### `app.json`

```json
{
  "expo": {
    "name": "Control_Flotas",
    "slug": "Control_Flotas",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/images/icon.png",
    "scheme": "controlflotas",
    "userInterfaceStyle": "automatic",
    "ios": { "icon": "./assets/expo.icon" },
    "android": {
      "adaptiveIcon": {
        "backgroundColor": "#E6F4FE",
        "foregroundImage": "./assets/images/android-icon-foreground.png",
        "backgroundImage": "./assets/images/android-icon-background.png",
        "monochromeImage": "./assets/images/android-icon-monochrome.png"
      },
      "predictiveBackGestureEnabled": false
    },
    "web": { "output": "static", "favicon": "./assets/images/favicon.png" },
    "plugins": [
      "expo-router",
      ["expo-splash-screen", { "backgroundColor": "#208AEF", "android": { "image": "./assets/images/splash-icon.png", "imageWidth": 76 } }],
      ["expo-image-picker", { "photosPermission": "...evidencia al reportar una falla.", "cameraPermission": "...foto de la falla." }],
      ["expo-location", { "locationWhenInUsePermission": "...mostrar el vehículo en el mapa en vivo." }]
    ],
    "experiments": { "typedRoutes": true, "reactCompiler": true }
  }
}
```

> ⚠️ Falta `expo.android.config.googleMaps.apiKey` para Google Maps en Android (ver HANDOFF §7).

### `tsconfig.json`

```json
{
  "extends": "expo/tsconfig.base",
  "compilerOptions": {
    "strict": true,
    "paths": { "@/*": ["./src/*"], "@/assets/*": ["./assets/*"] }
  },
  "include": ["**/*.ts", "**/*.tsx", ".expo/types/**/*.ts", "expo-env.d.ts"]
}
```

### `eslint.config.js`

```js
const { defineConfig } = require('eslint/config');
const expoConfig = require("eslint-config-expo/flat");

module.exports = defineConfig([
  expoConfig,
  { ignores: ["dist/*"] }
]);
```

### `src/app/_layout.tsx` (ENTRYPOINT)

```tsx
import '@/global.css';

import { Stack } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AuthProvider } from '@/auth';
import { AdminProvider, DrivingProvider, TenantProvider } from '@/session';
import { ThemeProvider, useTheme } from '@/theme';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AuthProvider>
          <TenantProvider>
            <AdminProvider>
              <DrivingProvider>
                <NavigationChrome />
              </DrivingProvider>
            </AdminProvider>
          </TenantProvider>
        </AuthProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

function NavigationChrome() {
  const { colors } = useTheme();
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
        animation: 'slide_from_right',
        animationDuration: 260,
        gestureEnabled: true,
      }}
    />
  );
}
```

---

## Apéndice C — Sesión y auth

### `src/session/index.ts`

```ts
export { DrivingProvider, useDriving } from './DrivingProvider';
export { TenantProvider, useTenant } from './TenantProvider';
export { AdminProvider, useAdmin } from './AdminProvider';
export { useLoginDestino } from './useLoginDestino';
```

### `src/session/TenantProvider.tsx`

Resuelve el contexto multi-tenant al iniciar sesión (MFA, cuenta/tenant, sedes) vía
`getContextoLogin(user)`. Estado: `cargando, mfaRequerido, mfaOk, marcarMfaOk, cuenta, sedes, sede,
setSede`. Se reinicia con cada `user`; si hay una sola sede, se elige sola.

```tsx
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useAuth } from '@/auth/useAuth';
import { getContextoLogin } from '@/services';
import type { Cuenta, Sede } from '@/types';

interface TenantContextValue {
  cargando: boolean; mfaRequerido: boolean; mfaOk: boolean; marcarMfaOk: () => void;
  cuenta: Cuenta | null; sedes: Sede[]; sede: Sede | null; setSede: (sede: Sede) => void;
}
const TenantContext = createContext<TenantContextValue | null>(null);

export function TenantProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [cargando, setCargando] = useState(true);
  const [mfaRequerido, setMfaRequerido] = useState(false);
  const [mfaOk, setMfaOk] = useState(false);
  const [cuenta, setCuenta] = useState<Cuenta | null>(null);
  const [sedes, setSedes] = useState<Sede[]>([]);
  const [sede, setSede] = useState<Sede | null>(null);

  useEffect(() => {
    let active = true;
    setMfaOk(false); setSede(null);
    if (!user) { setMfaRequerido(false); setCuenta(null); setSedes([]); setCargando(false); return; }
    setCargando(true);
    getContextoLogin(user).then((ctx) => {
      if (!active) return;
      setMfaRequerido(ctx.mfaRequerido); setCuenta(ctx.cuenta); setSedes(ctx.sedes);
      setSede(ctx.sedes.length === 1 ? ctx.sedes[0] : null); setCargando(false);
    });
    return () => { active = false; };
  }, [user]);

  const value = useMemo<TenantContextValue>(() => ({
    cargando, mfaRequerido, mfaOk, marcarMfaOk: () => setMfaOk(true), cuenta, sedes, sede, setSede,
  }), [cargando, mfaRequerido, mfaOk, cuenta, sedes, sede]);

  return <TenantContext.Provider value={value}>{children}</TenantContext.Provider>;
}

export function useTenant(): TenantContextValue {
  const ctx = useContext(TenantContext);
  if (!ctx) throw new Error('useTenant debe usarse dentro de <TenantProvider>.');
  return ctx;
}
```

### `src/session/DrivingProvider.tsx`

Estado global de emparejamiento por chip/GPS. Verifica al login vía `getEmparejamientoActual(user)`.
Expone: `driving, vehicle, cargando, setDriving, recheck, sinChipConfirmado, entrarSinChip`. Clave:
`cargando` se mantiene `true` hasta que el emparejamiento corresponda al `user.id` actual (evita
mostrar el estado del usuario anterior). El día de mañana este valor lo fija el GPS real.

```tsx
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useAuth } from '@/auth/useAuth';   // desde el archivo, no el barril (evita ciclo con useSignOut)
import { getEmparejamientoActual } from '@/services';
import type { Vehicle } from '@/types';

interface DrivingContextValue {
  driving: boolean; vehicle: Vehicle | null; cargando: boolean;
  setDriving: (v: boolean) => void; recheck: () => void;
  sinChipConfirmado: boolean; entrarSinChip: () => void;
}
const DrivingContext = createContext<DrivingContextValue | null>(null);

export function DrivingProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [driving, setDriving] = useState(false);
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [cargando, setCargando] = useState(true);
  const [resueltoPara, setResueltoPara] = useState<string | null>(null);
  const [intento, setIntento] = useState(0);
  const [sinChip, setSinChip] = useState(false);

  useEffect(() => {
    let active = true; setSinChip(false);
    if (!user) { setDriving(false); setVehicle(null); setResueltoPara(null); setCargando(false); return; }
    setCargando(true);
    getEmparejamientoActual(user).then((e) => {
      if (!active) return;
      setDriving(e.emparejado); setVehicle(e.vehicle); setResueltoPara(user.id); setCargando(false);
    });
    return () => { active = false; };
  }, [user, intento]);

  const verificando = cargando || (!!user && user.id !== resueltoPara);
  const value = useMemo<DrivingContextValue>(() => ({
    driving, vehicle, cargando: verificando, setDriving,
    recheck: () => setIntento((n) => n + 1),
    sinChipConfirmado: sinChip, entrarSinChip: () => setSinChip(true),
  }), [driving, vehicle, verificando, sinChip]);

  return <DrivingContext.Provider value={value}>{children}</DrivingContext.Provider>;
}

export function useDriving(): DrivingContextValue {
  const ctx = useContext(DrivingContext);
  if (!ctx) throw new Error('useDriving debe usarse dentro de <DrivingProvider>.');
  return ctx;
}
```

### `src/session/AdminProvider.tsx`

Empresa activa del panel. Para admin de una empresa se **deriva síncrono** de su `user.companyId`
(sin parpadeo); el admin general la **elige** en el menú (`setEmpresa`).

```tsx
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { esAdmin, esMultiempresa } from '@/auth/permissions';
import { useAuth } from '@/auth/useAuth';

interface AdminContextValue { empresaId: string | null; setEmpresa: (id: string) => void; }
const AdminContext = createContext<AdminContextValue | null>(null);

export function AdminProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [elegida, setElegida] = useState<string | null>(null);
  useEffect(() => { setElegida(null); }, [user]);
  const empresaId = elegida ?? (user && esAdmin(user) && !esMultiempresa(user) ? user.companyId ?? null : null);
  const value = useMemo<AdminContextValue>(() => ({ empresaId, setEmpresa: setElegida }), [empresaId]);
  return <AdminContext.Provider value={value}>{children}</AdminContext.Provider>;
}

export function useAdmin(): AdminContextValue {
  const ctx = useContext(AdminContext);
  if (!ctx) throw new Error('useAdmin debe usarse dentro de <AdminProvider>.');
  return ctx;
}
```

### `src/session/useLoginDestino.ts`

```ts
import type { Href } from 'expo-router';
import { esAdmin, esMultiempresa, puedeConducir } from '@/auth/permissions';
import { useAuth } from '@/auth/useAuth';
import { useTenant } from './TenantProvider';

export function useLoginDestino(): Href | null {
  const { user } = useAuth();
  const tenant = useTenant();
  if (!user) return '/login';
  if (tenant.cargando) return null;
  if (tenant.mfaRequerido && !tenant.mfaOk) return '/mfa';
  if (esAdmin(user) && !esMultiempresa(user) && tenant.cuenta?.tipo === 'juridica'
      && tenant.sedes.length > 1 && !tenant.sede) return '/sedes';
  if (puedeConducir(user)) return '/';
  if (esMultiempresa(user) || !user.companyId) return '/empresas';
  return '/panel';
}
```

### `src/auth/index.ts`

```ts
export { AuthProvider, AuthContext, type AuthContextValue } from './AuthProvider';
export { useAuth } from './useAuth';
export { useSignOut } from './useSignOut';
export { esAdmin, puedeConducir, esConductorPuro, esMultiempresa } from './permissions';
```

### `src/auth/AuthProvider.tsx`

Fuente de verdad de "quién está logueado". **Sesión solo en memoria** (se pierde al recargar; añadir
persistencia de token con el backend). `signIn` deja subir el error del servicio para mostrarlo.

```tsx
import { createContext, useCallback, useMemo, useState, type ReactNode } from 'react';
import { signIn as signInService } from '@/services';
import type { AuthStatus, User } from '@/types';

export interface AuthContextValue {
  user: User | null; status: AuthStatus;
  signIn: (email: string, password: string) => Promise<void>; signOut: () => void;
}
export const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const signIn = useCallback(async (email: string, password: string) => {
    const authenticated = await signInService(email, password);
    setUser(authenticated);
  }, []);
  const signOut = useCallback(() => setUser(null), []);
  const value = useMemo<AuthContextValue>(() => ({
    user, status: user ? 'signedIn' : 'signedOut', signIn, signOut,
  }), [user, signIn, signOut]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
```

### `src/auth/permissions.ts`

```ts
import type { User } from '@/types';
// Acceso al panel (cualquiera que no sea conductor puro):
export function esAdmin(user: Pick<User, 'role'>): boolean { return user.role !== 'driver'; }
// Opera un vehículo → obtiene las tabs del conductor:
export function puedeConducir(user: Pick<User, 'drives'>): boolean { return user.drives === true; }
// Conductor puro (solo conduce, sin panel):
export function esConductorPuro(user: Pick<User, 'role'>): boolean { return user.role === 'driver'; }
// Administra varias empresas (menú multiempresa + comparativas):
export function esMultiempresa(user: Pick<User, 'role'>): boolean {
  return user.role === 'generalAdmin' || user.role === 'superAdmin';
}
```

### `src/auth/useSignOut.ts`

Cierre de sesión correcto: limpia usuario, resetea sesión de conducción, restaura marca base y
descarta la pila de navegación dejando solo el login.

```ts
import { useRouter } from 'expo-router';
import { useCallback } from 'react';
import { useDriving } from '@/session';
import { DEFAULT_BRAND, useThemeController } from '@/theme';
import { useAuth } from './useAuth';

export function useSignOut(): () => void {
  const router = useRouter();
  const { signOut } = useAuth();
  const { setBrand } = useThemeController();
  const { setDriving } = useDriving();
  return useCallback(() => {
    signOut(); setDriving(false); setBrand(DEFAULT_BRAND);
    if (router.canDismiss()) router.dismissAll();
    router.replace('/login');
  }, [signOut, setDriving, setBrand, router]);
}
```

### `src/auth/useAuth.ts` — hook trivial que lee `AuthContext` (throw si falta el Provider).

### `src/services/authService.ts` (⚠️ SECRETOS REDACTADOS)

Login mock. Estructura: arrays `SUPER_ADMINS`, `COMPANY_ADMINS`, `GENERAL_ADMINS`, `DRIVERS` de tipo
`MockCredential = User & { password }`. `signIn(email, password)` normaliza el correo, busca por
email, compara password y devuelve el `User` público (sin password). Mensaje de error genérico
(no revela si el correo existe).

```ts
// FORMA (valores sensibles redactados — ver archivo real):
type MockCredential = User & { password: string };

const SUPER_ADMINS: MockCredential[] = [
  { id: 'sa-1', name: 'Juan Guerra',  email: '<REDACTADO>', role: 'superAdmin', drives: false, password: '<REDACTADO>' },
  { id: 'sa-2', name: 'Juan Pacheco', email: '<REDACTADO>', role: 'superAdmin', drives: false, password: '<REDACTADO>' },
  { id: 'sa-3', name: 'Marco Pacheco',email: '<REDACTADO>', role: 'superAdmin', drives: false, password: '<REDACTADO>' },
];
const COMPANY_ADMINS: MockCredential[] = [
  { id: 'ca-Samfor-1', name: 'Carlos Fuenmayor', email: 'admin@samfor.com', role: 'companyAdmin', companyId: 'Samfor', drives: false, password: '<REDACTADO>' },
];
const GENERAL_ADMINS: MockCredential[] = [
  { id: 'ga-chevron-1', name: 'Andrea Méndez', email: 'general@chevron.com', role: 'generalAdmin', companyId: 'chevron', drives: false, password: '<REDACTADO>' },
];
const DRIVERS: MockCredential[] = [
  { id: 'usr-sam-1', name: 'José Marrufo',  email: 'jmarrufo@samfor.com', role: 'driver', companyId: 'Samfor',  drives: true, password: '<REDACTADO>' },
  { id: 'usr-sam-2', name: 'María Chourio',  email: 'mariachourio@samfor.com', role: 'driver', companyId: 'Samfor',  drives: true, password: '<REDACTADO>' },
  { id: 'usr-pet-1', name: 'Ramón Bracho',   email: 'rbracho@petrosur.com', role: 'driver', companyId: 'petrosur', drives: true, password: '<REDACTADO>' },
  { id: 'usr-pet-2', name: 'Yelitza Soto',   email: 'ysoto@petrosur.com',   role: 'driver', companyId: 'petrosur', drives: true, password: '<REDACTADO>' },
];

export async function signIn(email: string, password: string): Promise<User> {
  const normalized = email.trim().toLowerCase();
  const match = MOCK_USERS.find((u) => u.email.toLowerCase() === normalized);
  if (!match || match.password !== password) throw new Error('Correo o contraseña incorrectos.');
  return toPublicUser(match); // quita el password
}
```

---

## Apéndice D — Capa de servicios

### `src/services/index.ts` (CONTRATO — barril de todo lo que consumen las pantallas)

```ts
export { getCompanyBrands, getCompanyBrandByName, getCompanyBrandById } from './brandService';
export { signIn } from './authService';
export { getContextoLogin, verificarMfa } from './accountService';
export { getMiVehiculoActual, getEmparejamientoActual, getTelemetria, getMiScore } from './fleetService';
export { crearOrdenDeTrabajo, type NuevaOrdenInput } from './workOrderService';
export {
  getResumenFlota, getFlotaVehiculos, getMiVehiculoFlota, getGruposDeFlota,
  getOrdenesDeTrabajo, getOrdenDeTrabajo, actualizarEstadoOrden, getEmpresasDelUsuario,
  getReporte, getReporteUsuarios, periodoMesActual, getComparativaEmpresas,
  getComparativaEmpresasConColor, getEmpresasDelUsuarioConColor,
} from './companyService';
export {
  getPlanesPreventivos, getAlertasPredictivas, getMantenimientoResumen, getMantenimientoCorrectivo,
  type PlanPreventivo, type PlanEstado, type AlertaPredictiva, type MantenimientoResumen,
} from './maintenanceService';
export {
  getCostos, getResumenCostos, getCostosPorEmpresa, rangoPreset, CATEGORIAS_COSTO,
  type CostoItem, type CostoCategoria, type CostoClase, type RangoFechas, type RangoPreset,
  type CostoPorCategoria, type ResumenCostos, type CostoEmpresa,
} from './costService';
export {
  getUsuariosDeEmpresa, getPerfilUsuario, getVehiculosUsados, getHistorialViajesConductor,
  type VehiculoUsado,
} from './userService';
export {
  getInspeccionDelDia, getInspeccionVehiculo, getAptitudDelDia, getPlantillaInspeccion,
  enviarInspeccion, notificarSupervisor, solicitarOtraUnidad, getProximoViaje, getViajes,
  iniciarViaje, agregarParada, finalizarViaje, cancelarViaje, getRutaViaje, type CierreViajeInput,
  getResumenAvisos, getAlertas, marcarAlertaLeida, marcarTodasAlertasLeidas,
  getMensajes, enviarMensaje, marcarMensajesLeidos,
  getConversacionesAdmin, getHiloConductor, enviarMensajeAConductor, marcarHiloAdminLeido,
  type ConversacionAdmin,
  asignarViaje, getViajesAsignados, type AsignarViajeInput, type ViajeAsignado,
  getDocumentosVehiculo, getDocumentosConductor,
} from './driverService';
export {
  enviarSOS, definirTipoEmergencia, enviarMensajeEmergencia, getEmergenciaActiva,
  cerrarEmergencia, cancelarSOS,
} from './emergencyService';
export { calcularRuta, type RutaCalculada } from './routingService';
```

### `src/services/network.ts` (patrón mock)

```ts
/** Simula latencia de red para que los mocks se comporten como una API real. */
export function fakeNetwork<T>(value: T, ms = 300): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}
```

### API surface por servicio (firmas públicas)

| Servicio | Funciones (firma resumida) |
|----------|----------------------------|
| **authService** | `signIn(email, password): Promise<User>` |
| **accountService** | `getContextoLogin(user): Promise<ContextoLogin>` · `verificarMfa(codigo): Promise<boolean>` (mock `123456`) |
| **brandService** | `getCompanyBrands()` · `getCompanyBrandByName(name)` · `getCompanyBrandById(companyId)` |
| **fleetService** | `getMiVehiculoActual(user)` · `getEmparejamientoActual(user)` · `getTelemetria(vehicleId)` · `getMiScore(userId)` |
| **workOrderService** | `crearOrdenDeTrabajo(input: NuevaOrdenInput): Promise<WorkOrder>` |
| **companyService** | `getResumenFlota` · `getFlotaVehiculos` · `getMiVehiculoFlota` · `getGruposDeFlota` · `getOrdenesDeTrabajo` · `getOrdenDeTrabajo` · `actualizarEstadoOrden` · `registrarOrden` · `getEmpresasDelUsuario` · `getReporte` · `getReporteUsuarios` · `getComparativaEmpresas(+ConColor)` · `periodoMesActual` · `listarEmpresasMock` |
| **maintenanceService** | `getPlanesPreventivos` · `getAlertasPredictivas` · `getMantenimientoResumen` · `getMantenimientoCorrectivo` (= OT) |
| **costService** | `getCostos` · `getResumenCostos` · `getCostosPorEmpresa` · `rangoPreset` (+ `CATEGORIAS_COSTO`). Costo correctivo = OT 'Realizada' |
| **userService** | `getUsuariosDeEmpresa` · `getPerfilUsuario` · `getVehiculosUsados` · `getHistorialViajesConductor` · `perfilesDeEmpresa` · `getNombreConductor` · `getIdConductorPorNombre` |
| **driverService** | Inspección (`getInspeccionDelDia/Vehiculo`, `getAptitudDelDia`, `getPlantillaInspeccion`, `enviarInspeccion`) · Viajes (`getProximoViaje`, `getViajes`, `iniciar/agregarParada/finalizar/cancelarViaje`, `getRutaViaje`) · Avisos/alertas · Mensajes conductor + **admin** (`getConversacionesAdmin`, `getHiloConductor`, `enviarMensajeAConductor`, `marcarHiloAdminLeido`) · **Despacho** (`asignarViaje`, `getViajesAsignados`) · Documentos |
| **emergencyService** | `enviarSOS` · `definirTipoEmergencia` · `enviarMensajeEmergencia` · `getEmergenciaActiva` · `cerrarEmergencia` · `cancelarSOS` |
| **routingService** | `calcularRuta(origen, destino): Promise<RutaCalculada>` (haversine × factor; `TODO API`: Directions) |

### `src/services/network.ts` + `accountService.ts` + `brandService.ts`

Estos tres son pequeños y muestran el **patrón mock** completo: datos en constantes de módulo +
`fakeNetwork(...)` + comentarios `TODO API` en cada función. Ver los archivos reales (≤ 62 líneas c/u).
`accountService` mantiene `CUENTAS`, `SEDES` por empresa y `MFA_USERS` (quiénes requieren MFA);
`brandService` mantiene `MOCK_BRANDS` (color de acento por empresa).

---

## Apéndice E — Tema y sync

### `src/theme/createTheme.ts`

```ts
import { getContrastingTextColor } from './colorUtils';
import { buildShadows, colorSchemes, motion, radii, spacing, typography } from './tokens';
import type { ColorScheme, CompanyBrand, Theme } from './types';

export function createTheme(scheme: ColorScheme, brand: CompanyBrand): Theme {
  const base = colorSchemes[scheme];
  return {
    colorScheme: scheme,
    colors: { ...base, primary: brand.primaryColor, onPrimary: getContrastingTextColor(brand.primaryColor) },
    spacing, radii, typography, shadows: buildShadows(scheme), motion, brand,
  };
}
```

### `src/theme/tokens.ts` (extracto — escalas y paletas)

```ts
export const motion: MotionTokens = { durations: { fast: 120, base: 220, slow: 360 }, pressedScale: 0.97 };
export const spacing: SpacingScale = { none: 0, xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32, xxxl: 48 };
export const radii: RadiiScale   = { none: 0, sm: 6, md: 10, lg: 16, xl: 24, pill: 999 };
// typography.fontSize: xs12 sm14 md16 lg20 xl24 xxl32 display40 (+ pesos y line-heights)
// colorSchemes.light / .dark: background, surface, surfaceElevated, text/secondary/muted/inverted,
//   border/borderStrong, primary/onPrimary (los re-pinta la marca),
//   success/warning/danger/info (+ on* y *Surface).
// buildShadows(scheme): { card, sheet } vía boxShadow (cross-platform RN 0.81+).
```

Acento por defecto: `#208AEF`. Marcas mock: Samfor `#0F7B6C`, Petrosur `#B4530A`, Chevron `#1A3FAA`.

### `src/theme/brand.ts`

```ts
export const DEFAULT_BRAND: CompanyBrand = { name: 'Control de Flotas', primaryColor: '#208AEF', logo: null };
```

### `src/theme/index.ts` (barril)

Exporta: `ThemeProvider`, `useTheme`, `useThemeController`, `useReducedMotion`, `createTheme`,
`getContrastingTextColor`, `darken`, `DEFAULT_BRAND`, `colorSchemes/motion/radii/spacing/typography`,
y tipos (`Theme`, `ColorTokens`, `CompanyBrand`, `ColorScheme`, `ThemeMode`, etc.).

### `src/sync/outbox.ts` (offline-first, singleton observable)

```ts
export type OutboxOpTipo = 'ot' | 'inspeccion' | 'mensaje' | 'sos' | 'viaje';
export interface OutboxOpInfo { id: string; tipo: OutboxOpTipo; descripcion: string; creadaEn: string; }
export interface EstadoSync { online: boolean; sincronizando: boolean; pendientes: OutboxOpInfo[]; }

// Estado privado de módulo: _online, _sincronizando, _cola[], _snapshot (referencia estable p/ useSyncExternalStore)
export function subscribe(listener: () => void): () => void { /* set de listeners */ }
export function getSnapshot(): EstadoSync { return _snapshot; }

/** Encola la sincronización: si hay conexión corre ya; si no, espera y se procesa al reconectar. */
export async function encolar(tipo, descripcion, ejecutar: () => Promise<void>): Promise<void> {
  if (_online) { await ejecutar(); return; }
  _cola.push({ id, tipo, descripcion, creadaEn, ejecutar }); emitir();
}
export async function setOnline(online: boolean): Promise<void> { /* al reconectar → procesarCola() */ }
export async function sincronizarAhora(): Promise<void> { /* procesa la cola en orden, reintenta si falla */ }
```

Consumido por `useSync` (hook con `useSyncExternalStore`) y `SyncBanner` (indicador global sobre las
tabs del conductor). La conexión hoy se alterna desde la pantalla `/sincronizacion`.

---

*Fin de los apéndices. Para el volcado íntegro de `driverService.ts` (933 líneas),
`companyService.ts` (572), `costService.ts`, o cualquier pantalla, pídelo y se añade en una tanda
adicional.*
