# Score de manejo del conductor: eventos, cálculo y rutas

La web ya tiene la tarjeta **«Mi score de manejo»** (arriba en *Mi perfil* y en *Mi unidad* del conductor). Hoy dice «todavía no está disponible» porque el servidor no entrega nada. Para encenderla hace falta lo de abajo. La web **no calcula** el score: solo lo muestra, para que todas las pantallas y la app digan el mismo número.

## 1. Eventos de manejo que debe detectar y guardar el servidor

| Evento | Qué es | Referencia inicial (a calibrar) |
|---|---|---|
| Frenada brusca | Baja de velocidad muy rápido | desaceleración mayor a ~9 km/h por segundo |
| Aceleración brusca | Sube de velocidad muy rápido | aceleración mayor a ~8 km/h por segundo |
| Exceso de velocidad | Supera el límite | ya existe como regla de alerta; unificarlo aquí |
| Giro brusco (opcional) | Solo si el equipo lo reporta | el evento llega del propio GPS |

- Si el GPS trae acelerómetro y manda el evento él mismo, **usar ese evento** (es más exacto que deducirlo de la velocidad). Si no, deducirlo de la serie de velocidad/posición.
- **Descartar falsos positivos:** saltos de posición del GPS que inventan una frenada, y lecturas con velocidad nula o con `positionValid` en falso.
- Cada evento guarda: `id`, tipo, `occurredAt`, `vehicleId`, **`driverUserId` (el conductor asignado en ese momento, no el dueño de la unidad)**, `lat`, `lng`, velocidad antes y después, magnitud (por ejemplo la desaceleración), `tenantId`.
- Si cambia el conductor a mitad del día, cada evento va a quien tenía la unidad en ese instante (usar la vigencia de la asignación `validFrom`/`validTo`).

## 2. Cálculo del score

- **Base:** eventos por cada 100 km, para no castigar a quien maneja más. Usar el mismo semáforo que ya tiene la app: verde menor a 1,5; amarillo menor a 3,5; rojo desde 3,5.
- **Índice 0–100** derivado de esa tasa (verde desde 85, amarillo desde 70, rojo por debajo). Confirmar la fórmula exacta con la app y dejarla en un solo lugar del servidor.
- **Peso por evento:** propuesta inicial 1 por cada frenada, aceleración y exceso (ajustable).
- **Km del período:** salen de las posiciones, quitando los saltos y el temblor de un GPS parado. La web ya tiene esa lógica en `src/panel/datos/odometro.js` por si sirve de referencia.
- **Período:** últimos 7 días por defecto; poder pedir 30 y 90.

## 3. Rutas que necesita la web (respuesta en JSON, con la sesión de la consola)

1. **Mi score (conductor en sesión):** `GET /api/v1/console/me/driving-score?days=7`
   ```json
   { "index": 78, "eventsPer100Km": 2.4, "km": 612, "days": 7,
     "harshBraking": 6, "harshAcceleration": 4, "speeding": 5 }
   ```
   Debe responder para el **conductor** (hoy la consola le da 403 en muchas rutas; esta debe permitirle ver **solo lo suyo**).
2. **Mis eventos:** `GET /api/v1/console/me/driving-events?days=7&limit=50` con tipo, hora, lugar y unidad (para el detalle con mapa).
3. **Supervisor, ranking:** `GET /api/v1/console/driving-scores?days=7` → lista de conductores con su índice, tasa por 100 km, km y conteos, ordenable.
4. **Supervisor, detalle:** `GET /api/v1/console/drivers/{userId}/driving-score` y `/driving-events` (mismos campos que 1 y 2).
5. Todas con el espejo por empresa del #594 (`/tenants/{id}/...`) para cuando el Administrador FOM entra a una empresa.

## 4. Permisos
- El conductor ve **solo su** score y sus eventos.
- El supervisor y el administrador ven los de los conductores de **su empresa** (el administrador FOM, los de la empresa en la que está).
- Los eventos son del tenant: RLS por `tenant_id`, como el resto.

## 5. Alertas al supervisor (siguiente paso, no bloquea lo anterior)
Notificación cuando un conductor pasa a rojo en la semana, con enlace a sus eventos.

## 6. Datos que necesito saber de ti
- ¿Qué modelos de GPS están en uso y cuáles traen acelerómetro / mandan evento de manejo brusco?
- ¿Cada cuántos segundos reportan posición? (de eso dependen los umbrales)
- ¿Dónde vive hoy el índice que muestra la app del conductor y cómo lo calcula? La web debe mostrar el **mismo** número.

## Prueba para cerrarlo
1. Con un recorrido real (o simulado) con una frenada y una aceleración fuertes, aparecen 2 eventos a nombre del conductor asignado en ese momento.
2. Entrar como **conductor** → *Mi perfil* y *Mi unidad* muestran el índice, la tasa por 100 km y los tres conteos.
3. Entrar como **supervisor** → ranking de conductores con el mismo número que ve cada conductor.
4. Un conductor no puede pedir el score ni los eventos de otro.
