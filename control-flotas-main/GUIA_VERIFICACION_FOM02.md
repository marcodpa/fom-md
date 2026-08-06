# Guía de verificación — FOM-02-FUN-002-V0.2, punto por punto

> ⚠️ NOTA (2026-07-10): el elenco demo fue RETIRADO del login — el sistema nace
> solo con los 3 admin FOM y los demás usuarios se crean desde la Consola.
> Para reproducir estos flujos, crea primero los usuarios equivalentes desde
> la Consola (perfil + empresa) y entra con ellos.
>
> Cómo comprobar EN LA APP cada punto del documento. Arranca con `npx expo start`.
> Contraseña de todos los usuarios de demo: `Flotas2026..`.
>
> | Rol | Persona | Email |
> |---|---|---|
> | Admin | Juan / Marco / Juan P. | `juan@fom.app` / `marco@fom.app` / `juanp@fom.app` |
> | Supervisor predefinida | Lino | `lino@chevron.com` |
> | Supervisor empresa | Yeison | `yeison@samfor.com` (1er ingreso: perfil) |
> | Conductor (principal U-07) | Pedro | `pvillalobos@samfor.com` |
> | Conductor (secundario U-07) | Luis | `latencio@samfor.com` |
> | Conductor (solo secundario) | Carlos | `cpaz@samfor.com` (1er ingreso: perfil) |
> | Supervisor personal | Ale | `ale@sampieri.com` (1er ingreso: perfil) |
> | Usuario personal | Santi / Sofi | `santi@sampieri.com` / `sofi@sampieri.com` (1er ingreso: perfil) |

## §1 · ADMIN (Marco, Juan)

| Punto | Cómo verificarlo |
|---|---|
| §1.1 Crear empresa (nombre, RIF, contacto, tipo, asignar predefinida) | Entra como `marco@fom.app` → menú Empresas → **Crear empresa**. Crea una estándar y asígnala a Chevron en el mismo formulario. |
| §1.1 Crear el supervisor (rol `supervisor_company`, invitación, perfil al entrar) | En la misma pantalla, paso 2: nombre + email → "Crear e invitar". Cierra sesión y entra con ese email (contraseña de demo): te pedirá **completar el perfil** antes de ver su panel. |
| §1.2 Crear vehículo con GPS OBLIGATORIO | Empresas → **Crear vehículo**. Paso 1: datos + **asignar empresa** + **alias**. Paso 2: vencimientos de **trimestres, RCV, carné, póliza**. Paso 3: GPS en orden **modelo → IMEI → línea** (prueba un IMEI repetido, ej. `356938035643801`: lo rechaza). "Verificar": el **primer intento falla** a propósito → Reintentar → ✓. Prueba opcional del botón de pánico. Paso 4: "**Activo y reportando**". No hay forma de crear el vehículo sin verificar el GPS. |
| §1.3 Ver TODO / asignar predefinidas / auditoría solo Admin | El menú Empresas muestra las 3 operativas. **Auditoría** (botón del menú) muestra el alta que acabas de hacer: quién, qué GPS, cuándo. Entra como Yeison o Lino: no existe ese acceso (y la ruta redirige). |

## §2 · SUPERVISOR PREDEFINIDA (Lino)

| Punto | Cómo verificarlo |
|---|---|
| Selector de predefinida si supervisa >1 | Lino tiene solo Chevron → entra directo (el selector aparece si `predefinidaIds` tiene 2+; el modelo lo soporta). |
| Lista de empresas ASIGNADAS a Chevron | `lino@chevron.com` → home gerencial: **Samfor y PDVSA Petroboscan** (las dos asignadas). Todo pintado con la marca Chevron (P14). |
| Ve reporte gerencial + reportes + histórico ODT (solo lectura) | Toca Samfor → pestañas **Gerencial / Reportes / ODT**. En Reportes: botón "**Informe en formato Chevron**". En ODT: histórico completo, y el detalle no tiene ni un botón de edición. |
| "Información extra" pendiente | Tarjeta "Información extra — alcance por definir" en la pestaña Gerencial. |
| NO ve métricas operativas / NO crea nada | La sección Gerencial solo muestra datos derivados de ODT y costos (sin mapa, sin vehículos/estado, sin km). Escribe a mano la ruta `/panel`: te devuelve a `/gerencial` (guard estructural). |

## §3 · SUPERVISOR EMPRESA (Yeison)

| Punto | Cómo verificarlo |
|---|---|
| §3.1 Perfil obligatorio al primer ingreso | Primer login de `yeison@samfor.com` → pantalla "completa tu perfil" (cédula, licencia, carta médica). Sin llenarla no pasas. |
| §3.1 Crear áreas (ubicación/sector/contrato) | Panel → Flota → **Gestionar áreas**: ya existen "Base Maturín", "Producción", "Contrato Chevron 2026"; crea una nueva. |
| §3.1 Asignar vehículo→área, principal, secundarios | Flota → toca una unidad → asigna **área**, **conductor principal** y **secundarios** (genera su PIN). |
| §3.2 Dashboard: mapa + TU ubicación + resumen al tocar | Resumen: el mapa pide tu ubicación y la muestra junto a la flota (§8-8). Toca un vehículo → conductor actual **(principal o secundario)**, km, velocidad, estado. |
| §3.2 ODT pendientes / alertas nuevas / KPIs | Tarjetas "ODT" y "Alertas nuevas" en el Resumen. |
| §3.2 Reportes normales + formato de la predefinida | Más → Reportes: "Reporte de vehículos" y "**Formato de la predefinida**" (informe SIRCOP mejorado, filtrable por área). |
| §3.3 Gestionar ODT completa | Mantto. → abre la ODT de frenos: verás **quién la creó (principal o secundario por PIN)** → pásala a "En revisión" → "Cerrada": **qué se hizo + costo + factura/foto**, la **fecha de resolución** la pone el sistema. |
| §3.4 Alerta preventiva → ODT automática → contador se reinicia | Al abrir el Resumen, el motor detecta "Unidad 07 llegó a 3.000 km del cambio de aceite" → crea la **ODT preventiva** sola + notificación. Ciérrala y mira en Más → Reglas de alerta: el contador de la Unidad 07 quedó en 0. |
| §3.5 Principal + secundarios + PIN (y sin PIN → solo principal) | Unidad 07: Pedro principal, Luis (`4821`) y Carlos (`7359`) secundarios. Abre la **Unidad 14** (GPS sin PIN): la sección de secundarios explica que no aplica. |
| §3.6 Alertas a 1/N vehículos o por área | Más → **Reglas de alerta**: crea una de velocidad y asígnala con "Seleccionar por área" (ej. Base Maturín). |

## §4 · CONDUCTOR (Pedro, Luis, Carlos)

| Punto | Cómo verificarlo |
|---|---|
| §4.1 Perfil al primer uso | `cpaz@samfor.com` (Carlos, primer ingreso) → gate de perfil. |
| §4.1 Inspección 3 estados + ¿crear ODT? + bloqueo crítico | Pedro → Inspección: cada ítem tiene **Conforme / Observación / Falla**. Marca una falla NO crítica: aparece "**¿Crear ODT?** Sí / Solo registrar". Marca una **crítica**: ODT automática + **salida bloqueada** (regla conservada). |
| §4.1 Guardar sin señal | Activa modo avión y envía: queda en cola (banner de sincronización) y sale al reconectar. |
| §4.1 Mapa: su vehículo + SU ubicación | Inicio de Pedro: el marcador de la unidad viene del GPS (mock) y tu punto azul es tu teléfono — **dos puntos**. |
| §4.1 Emergencia = pánico físico del GPS | La prueba del botón físico vive en el alta del vehículo (paso 3.3). El SOS in-app sigue existiendo (decisión: nada se elimina). |
| §4.2 ODT correctiva: vehículo automático + fotos + offline | Pedro → "Reportar una falla": el vehículo ya viene puesto (su sesión), foto obligatoria, cola offline. Le llega a Yeison como **abierta** y Pedro ve el estado de SUS ODT. |
| §4.3 Secundario por PIN | Luis → Más → "**Usar otra unidad (PIN)**" → Unidad 07 + PIN `4821`. Su Inicio muestra la U-07 con el chip "USANDO · PIN"; reporta una falla → en el panel dice "**Luis Atencio · Secundario (PIN)**"; en el mapa del panel el conductor actual es Luis. "Dejar el vehículo" → todo vuelve a Pedro. |

## §5 · SUPERVISOR PERSONAL (Ale) y §6 · USUARIO PERSONAL (Santi, Sofi)

| Punto | Cómo verificarlo |
|---|---|
| §5.1 Entra directo, perfil, crea usuarios, asigna principales, alertas multi-carro | `ale@sampieri.com` → perfil → home personal: crea un usuario (formulario), cambia el principal de un carro, "Configurar alertas" (la regla "aceite cada 5.000 km → Carro 1 y 2" ya existe, literal del documento). |
| §5.2 Sus carros con toda su info + notificación de alerta cumplida | Mapa con sus 2 carros + su ubicación; km y velocidad por carro; documentos por vencer de carros y personas. Notificaciones: "**Cambio de aceite de Carro de Santi: vencido**" (la regla ya venció en el mock). Sin ODT de taller: las cuentas personales solo notifican. |
| §6.1 Santi: mapa + alertas, NO crea nada | `santi@sampieri.com` → perfil → su vista: SU carro en el mapa + su ubicación, alertas de mantenimiento y documentos. No hay un solo botón de crear/editar. |

## §7 y §8 · Transversales

| Punto | Cómo verificarlo |
|---|---|
| §7 Flujo ODT completo | Conductor reporta → Yeison revisa/completa/cierra → histórico → reportes → Lino lo ve (gerencial + formato Chevron). Punta a punta con los pasos de arriba. |
| §8-8 Mapa con TU ubicación en TODOS los roles | Pedro (single), Yeison (flota), Ale (multi), Santi (single), y si niegas el permiso el mapa sigue y te lo avisa con calma. |
| §8-1..7 | Cubiertos arriba: alias (1), póliza (2), GPS dentro del alta (3), orden del instalador (4), Lino recortado (5), principal/secundarios PIN (6), alertas asignables (7). |

## Informe formato Chevron (D2/D3 — sobre los PDF reales de junio)

Más (panel de Yeison) → "Formato de la predefinida", o Lino → empresa → Reportes → "Informe en formato Chevron". Contra el informe real:
- Las mismas 4 secciones del SIRCOP: indicadores con semáforo, distancias (mes + últimos 6 meses), resumen por conductor, alertas por 100 km.
- **Filtro por área/contrato** (sus informes van por Oficina/Termoeléctrica/Desmalezado — aquí son las áreas).
- El "% de registro de conductores" (0.00% en los reales, filas "SIN IDENTIFICAR") ahora sale de la **titularidad + PIN**: con los principales asignados, cada km tiene responsable.
- Pendiente para el backend: exportar a PDF/correo (hoy el informe viaja por email).

## Qué queda pendiente (depende de insumos externos)

1. **D1** — "Información extra" de Lino: placeholder hasta que Chevron defina el alcance.
2. **D4/D9** — GPS real (catálogo de modelos, PIN por hardware, ciclo de vida): Sr. Pacheco; hoy simulado con la forma async de la API.
3. **D7** — Notificaciones push: hoy in-app; push cuando exista backend.
4. **Backend real**: cada servicio tiene su «TODO API» localizado; migrar no toca pantallas.
5. **Fase B** (eliminaciones): congelada hasta lista aprobada ítem por ítem.
