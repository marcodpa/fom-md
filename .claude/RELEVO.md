# Relevo para la sesión nueva (20 oct 2026)

Lee esto primero. Marco escribe informal y quiere respuestas en lenguaje sencillo,
en español, que terminen con «Qué te toca a ti».

## La oficina (panel del equipo de agentes)

- Enlace: https://claude.ai/artifact/M8gUBbgDPfag6A4sBKcrDi (colecciones `agentes` y
  `tareas`; escribir con ArtifactData + `if_version`). Fuente: `.claude/oficina/equipo-fom.html`.
  Para republicar desde una sesión nueva: primero `Artifact` action `read`, luego publish con `url`.
- Regla: cada vez que se lanza o termina un agente, actualizar la oficina. Última tarea: T-56.

## Equipo de agentes

`.claude/agents/`: fom-desarrollador, fom-pruebas, fom-revisor (solo lectura), fom-disenador.
Reglas en `.claude/EQUIPO.md`. Briefs comunes (scratchpad de la sesión 940a35f0…):
`diseno\GUIA.md`, `diseno\T33-REGLAS.md`, `diseno\T46-REPORTES.md`. Los agentes se quedan sin
turnos a menudo: continuarlos con SendMessage.

## Diseño

- Lienzo «FOM normalizado: web y app»: https://claude.ai/artifact/2xfQQSJHTA2794V5t4bgrX
  (filas 1-7 pantallas, 8 Reportes, 9 PDF A4). Aprobado y programado.
- Decisiones: azul FOM fijo #3D9BF5 con texto #08121C; glosario común; admin igual.
- NUNCA nombrar a «SIRCOP» ni «Samfor» (competencia).

## Estado del código (todo guardado el 20 oct)

- Web (este repo, rama codex/rediseno-v6-fiel, subida a marcodpa/fom-md, commit 217f8e3):
  diseño normalizado, Reportes nuevo + PDF A4, web en teléfono igual a la app
  (movil-app.css, movil-modulos.css), formato IOGP «Conducción» con «Publicar en esta empresa»
  (Inspecciones › Plantillas; Marco ya lo publicó en FOM Operations), mínimo de clave 16.
- App (fom-driver-juan, rama diseno-como-web, commit 792b0cb, sin subir al repo de Juan; respaldo
  en `comparativa/app-diseno-web/diseno-como-web.patch` con claves retiradas): diseño normalizado,
  Glass, Reportes y PDF, inspecciones programadas, carga en círculo, Cloudinary igual que la web.
- Teléfono: lanzador `fom-app-telefono` (Expo túnel, QR exp://0hd3tje-marcodpa2810-8081.exp.direct).
- Web local: `fom-demo` (5174, datos de prueba). La web con datos reales (`npm run dev`, 5173)
  la tiene que prender Marco: el sistema bloquea a Claude contra producción.

## Decidido con Marco (21 oct)

- Fines de semana en inspecciones: el sábado/domingo la app le pregunta al conductor si va a
  trabajar; el calendario cuenta lunes a viernes siempre y sábado/domingo solo si ese día hizo
  la inspección (T-75, web y app iguales).
- ODT: sin reloj ni Empezar/Pausar; flujo simple Abierta → En curso → Resuelta con «cuánto
  tardó». El servidor ya guarda la hora de cada paso (fom.work_order_events). PR a Juan:
  https://github.com/juancpachecog/fom-core/pull/706 (rama simplificar-odt; copia en
  comparativa/fom-core/simplificar-odt.patch). Botones simples en web/app: después de que Juan
  publique. «Cuánto tardó» = desde que se reportó la falla (creación de la ODT) hasta que se
  resolvió (decidido por Marco el 21 oct); un solo número, igual en web y app.

## Pendiente con Juan

1. Activar la web nueva: `sudo bash /home/fomadmin/deploy-20261019-normalizado/activate-publication.sh`
   en fom-app-01 (ops/deploy-20261019-normalizado/README.md). Producción sigue con la web del 6 oct;
   hay que volver a empaquetar si se quiere publicar lo del 20 oct.
2. Aplicar las 4 migraciones pendientes del #641 (fom-core). Sin la primera
   (`20261005180000000_align_transfer_platform_admin_scope`) Transferencias da 403 al admin FOM.
3. Confirmar cómo cuenta `days=` en `driving-scores` y si tiene tope.
4. Datos que faltan en Reportes: km/eventos por unidad en la web, horas al volante, gasto por
   unidad, costos de la unidad (repoApi devuelve `costos: []`).
5. Si se quiere: rutas para que el supervisor programe inspecciones desde la app.
6. La clave de demo vieja sigue en el historial del repo de la app: cambiarla si fue real.
7. Rendimiento con 340 unidades (servidor): https://github.com/juancpachecog/fom-core/issues/713
   (consultas de última posición sin índice, consola GPS, pool de 10, retención GPS, filtro por
   fecha en órdenes). Informe: https://claude.ai/artifact/BrP3b7cdSLKRBqc2JQSgBf. Web y app ya
   arregladas (T-83 a T-85). Prueba local: `npx vite --mode demo` y `/panel?estres=1`.
8. Web del 21 oct lista para publicar: ops/deploy-20261021-escala (comandos en su README; sirve
   aunque la activa sea la del 6 o la del 20 oct).
