**Título sugerido:** `feat(maps): un solo mapa para la web y la app, servido por el catálogo de fom-core (con ajuste a calles propio)`

Sigue a #567 y #594.

## Qué se quiere

Que la consola web y la app del conductor muestren **el mismo mapa**, elegido en **un solo lugar** (el servidor), y que
las líneas de recorrido sigan las calles en vez de unir los puntos del GPS con rectas.

## Situación hoy

| | Web | App |
|---|---|---|
| Mapa que dibuja | Teselas de imagen de OpenStreetMap (Leaflet) | `react-native-maps` → Google Maps en Android, Apple Maps en iOS |
| Quién decide el mapa | El código de la web | El código de la app |
| Calles de la ruta | Rectas entre puntos del GPS | — |

El servidor **ya tiene** lo necesario para decidirlo en un solo sitio:
- Catálogo de proveedores: Geoapify, MapTiler, Style JSON personalizado y teselas XYZ personalizadas (`src/maps/map-provider.catalog.ts`).
- Web: `/api/v1/console/maps/{catalog,profiles,assignments,settings,health}`.
- App: `/api/v1/mobile/maps/{runtime-config,preferences}`.
- Las llaves viven en el servidor; los clientes reciben solo una referencia.

Ni la web ni la app consumen esto todavía.

## Propuesta

1. **Un perfil de mapa por defecto** en el catálogo (estilo vectorial MapLibre) y asignado a cada empresa.
2. **Web:** lee el estilo de `/console/maps/*` y lo dibuja con MapLibre. *Ya probado* (ver abajo).
3. **App:** lee el estilo de `/mobile/maps/runtime-config` y lo dibuja con `@maplibre/maplibre-react-native`,
   en lugar de `react-native-maps`.
4. **Ajuste a calles y viajes calculados en el servidor** con un OSRM propio (red interna, sin puerto público):
   ruta `GET /tenants/{t}/vehicles/{v}/trips` que devuelve viajes (inicio, fin, distancia, línea ajustada),
   paradas de ≥ 5 min y un aviso de si el ajuste se aplicó. Es la base del odómetro.

### Ya hecho en la web (fom-md)
- Capa vectorial opcional con `VITE_MAPA_ESTILO` (URL de un estilo MapLibre), cargada bajo demanda.
- Probada en desarrollo y en la compilación de producción con el estilo público de OpenFreeMap:
  calles más nítidas a cualquier zoom, sin cambiar nada más del panel.
- Sin la variable, el mapa funciona como hasta ahora.

## Lo que hay que decidir

| Decisión | Opciones | Mi recomendación |
|---|---|---|
| Proveedor del estilo | MapTiler · OpenFreeMap · Google | MapTiler (de pago, comercial, con llave en el servidor) o un estilo propio; OpenFreeMap solo para pruebas |
| Ajuste a calles | OSRM propio · Geoapify · Google Roads | OSRM propio (los datos no salen del servidor) |
| App | Quedarse en `react-native-maps` · pasar a MapLibre | MapLibre, para que web y app muestren lo mismo |

### Costos de referencia (consultados el 2 oct 2026; verificar antes de decidir)

| Servicio | Lo que cuesta |
|---|---|
| **Google · Maps JavaScript (web)** | 10.000 cargas gratis al mes; luego 7,00 USD por 1.000 (10.000–100.000) y 5,60 USD por 1.000 (100.000–500.000) |
| **Google · Maps SDK Android/iOS (app)** | Sin cargo por unidad |
| **Google · Roads API (ajuste a calles)** | 5.000 gratis al mes; luego 10,00 USD por 1.000 solicitudes |
| **MapTiler · Free** | 0 USD, **no permite uso comercial** |
| **MapTiler · Flex** | 30 USD/mes: 25.000 sesiones de mapa y 500.000 solicitudes; excedente 2,50 USD por 1.000 sesiones |
| **OpenFreeMap** | Gratis, sin llave, sin garantía de servicio |
| **OSRM propio** | Sin costo por uso; cuesta un contenedor y la memoria del servidor |

Hay que revisar, en los términos de Google, si el resultado de Roads API puede mostrarse sobre un mapa que no sea de Google.

## Limitaciones conocidas
- `@maplibre/maplibre-react-native` lleva código nativo: **no corre en Expo Go**, hace falta una build de desarrollo.
  A cambio se elimina la dependencia de la llave de Google que hoy deja el mapa en blanco en Expo Go.
- Las calles disponibles dependen de OpenStreetMap, igual que con cualquier proveedor basado en él. Lo que falte en la
  zona de operación se completa en OpenStreetMap.

## Criterios de aceptación
- Web y app muestran el mismo estilo de mapa, tomado del servidor.
- Cambiar el proveedor de una empresa se hace en el catálogo, sin publicar versiones nuevas.
- Ninguna llave viaja en el bundle de la web ni en la app.
- Un recorrido real de 24 h se dibuja sobre las calles; si OSRM falla, se dibuja como hoy y la respuesta lo indica.
- Pruebas de permisos por empresa en la ruta de viajes, como en #557.
