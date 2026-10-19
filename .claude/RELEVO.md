# Relevo para la sesión nueva (16 oct 2026)

Lee esto primero. La sesión anterior («Conectar servidor y base de datos») se
hizo demasiado larga y Remote Control no conectaba. Todo sigue igual: aquí
está dónde quedó cada cosa.

Marco escribe informal y quiere respuestas en lenguaje sencillo, en español,
que terminen con «Qué te toca a ti».

## La oficina (panel del equipo de agentes)

- Enlace: https://claude.ai/artifact/M8gUBbgDPfag6A4sBKcrDi (base de datos:
  colecciones `agentes` y `tareas`; escribir con ArtifactData + `if_version`).
- Fuente: `.claude/oficina/equipo-fom.html`. Para republicar desde una sesión
  nueva: primero `Artifact` action `read` de ese enlace, luego publish con `url`.
- Publicado (versión 5): cursor de látigo (al darle a
  un robot salta, se queja y teclea rápido; la tarjeta abre la ficha) y zoom
  (ruedita, pellizco, botones + − y volver, arrastrar cuando está acercada).
- Regla: cada vez que se lanza o termina un agente, actualizar la oficina
  (agentes y tareas). Marco se quejó cuando no se veían trabajando.

## Equipo de agentes

`.claude/agents/`: fom-desarrollador (opus), fom-pruebas (sonnet),
fom-revisor (opus, solo lectura), fom-disenador (opus). Reglas en
`.claude/EQUIPO.md`: un archivo = una tarea a la vez; solo el coordinador hace
commit (por ruta); nada de producción ni despliegues.

## App (C:\Users\home\Downloads\fom-driver-juan, rama diseno-como-web)

- Último commit: `a72f624` (auditoría y arreglos T-19 a T-23: SOS, sesión,
  red con tiempo límite, pantallas sin esqueletos eternos, mapas, limpieza).
- APK instalada en la tablet R9 a las 13:26 del 16 oct (adb en
  `C:/Users/home/Documents/Codex/.tools/android-sdk/platform-tools/adb.exe`;
  compilar con `npx eas-cli@latest build -p android --profile preview
  --non-interactive --no-wait`). Pesa ~227 MB (antes ~55): revisar qué la infló
  (posibles archivos sueltos sin guardar: metro.config.js, web-shims/, png).
- 7 archivos con cambios de OTRA sesión sin guardar: cambiar-clave,
  fom-conexion, recuperar, photo-viewer, origen, validate, costService.
- Pendiente: el Resumen en tablet sale muy estirado (bloque del mes).

## Web (C:\Users\home\Downloads\fom, rama codex/rediseno-v6-fiel)

- Muchos archivos sin guardar de otra sesión = lo que corre en producción
  desde el 14 oct (transferencias, GPS, credenciales…). Riesgo de perderlos.
  Marco aún no respondió si se guarda todo junto.
- T-26 hecha sin guardar: aviso 403 de Transferencias, conteos de
  inspecciones («—» si no vienen), instalar GPS sin señal (+ demo igualada).
  126/126 pruebas.
- T-27 (pruebas de botones, modo demo `npx vite --mode demo`, NUNCA el modo
  normal: apunta a producción) quedó parcial. Fallos: Alertas «Descartar» en
  demo (faltan `descartar`/`descartarLeidos` en repoSemilla.js) y clave
  duplicada en Planes. Falta probar admin FOM y muchos flujos. Scripts en el
  scratchpad de la sesión anterior, carpeta t27.
- T-28 (diseñador comparando UI/UX web vs app) estaba en marcha; su informe
  queda en el scratchpad anterior, carpeta t28\INFORME.md:
  `C:\Users\home\AppData\Local\Temp\claude\C--Users-home-Downloads-fom\01b5bb3d-038d-44f9-9e15-0c4b57cbf62c\scratchpad\t28\`

## Pendiente con Marco / Juan

- Respaldo en marcodpa/fom-md: el parche de la app está listo y con la clave
  de demo tapada en `comparativa/app-diseno-web/diseno-como-web.patch`, pero el
  sistema bloqueó el commit y el push; Marco tiene que hacerlo.
- La clave de demo vieja sigue en el historial del repo de la app: cambiarla si
  fue real.
- Para Juan: ¿el servidor rechaza pedir datos de otra empresa?, ¿respeta
  Idempotency-Key en /mobile/emergencies?, que GET /inspections mande conteos
  de fallas, pruebas con cuentas reales de transferencias, GPS e inspecciones.
- fom-core rama mejora/rendimiento-api (T-13) sin publicar: esperando el sí de
  Marco para subirla y abrir PR a Juan.

## T-28 terminada (informe del diseñador)

Informe: `...\scratchpad\t28\INFORME.md` (ruta completa arriba), capturas lado
a lado en `t28\lado\`. 31 diferencias; cambios repartidos por archivo en la
sección 6 (web: redesign.css + apariencia.css a un solo agente; app:
tokens.ts + types.ts juntos). Decisiones pendientes de Marco antes de cambiar:
1. ¿Azul FOM fijo en web y app (cada empresa solo su logo) o color por empresa?
2. ¿El admin entra a un Resumen (como la app) o a Usuarios generales (como la web)?
3. Aprobar la lista de nombres comunes (sección 5 del informe).
Lo más visible: la app aún dice «Control de Flotas» con un cuadro «CF» en vez
del logo FOM (src/theme/brand.ts), y la barra de abajo no tiene nombres.
