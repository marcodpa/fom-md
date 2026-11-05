# Meitrack de la AH533FD: manda tramas pero nunca publica su ubicación (5 nov 2026)

**Prioridad alta.** Sin esto, la unidad no sale en el mapa aunque el equipo funciona bien.

## Qué pasa
- Equipo: Meitrack T399L, IMEI `867869061378428`, firmware T399L-V254, TCP puerto 5002.
- Unidad: AH533FD (JAC Savanah 2026), FOM OPERATIONS. Instalado el 3 nov 2026 (Tablero, Juan Pacheco).
- Recepción perfecta: 61 tramas por hora, una cada 60 s, de 143 B, con el IMEI que coincide (100 %).
- Pero el diagnóstico de ubicación sigue en **`clock_pending`** («Validación de hora pendiente») desde la instalación.
- `GET /console/tenants/{id}/vehicles` no trae posición para la unidad. La web muestra «Sin ubicación · nunca».

## Lo que hace falta del servidor
1. **Dar la hora por comprobada** para este equipo y publicar sus posiciones en
   `fom.vehicle_live_state` (`latitude`, `longitude`, `lastPositionAt`, `motionState`).
2. Si la comprobación necesita la respuesta **DB4** del equipo, decir cómo se carga: por SMS, por
   la consola o con un comando GPRS que envíe el servidor. Hoy nadie la ha cargado y la web no
   tiene dónde ponerla.
3. Revisar si las tramas de 143 B traen fecha y hora GPS en UTC. Si la traen, usarla para validar
   sola, sin esperar la DB4.

## Hecho cuando
La AH533FD sale en el Centro de control con su posición y pasa a «En marcha» o «Detenida» en
menos de 2 minutos con el carro encendido.

## Relacionado
- Coban del Camry AK116MA (`868166050887355`): sigue conectado, pero su última posición es del
  4 nov a las 20:21 UTC. Puede ser el mismo tema de la hora (ver `ISSUE-2026-11-04-lo-que-falta-del-servidor.md`, punto 4).
