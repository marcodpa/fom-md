# FOM-02-FUN-002-V0.2
## Flujos de Trabajo por Rol

**Etapa:** FOM-02
**Fecha:** Julio 2026
**Base:** FOM-ROLES-001-V1.0 + FOM-02-FUN-001-V0.1
**Cambios V0.2:**
- Crear vehículo: "asignar empresa", alias interno, póliza de seguro, GPS obligatorio dentro del alta
- Instalador: orden modelo → IMEI → línea telefónica
- Supervisor predefinida: solo reporte gerencial + reportes + histórico ODT (sin métricas operativas)
- Conductor principal y conductores secundarios (identificación por PIN del GPS)
- Alertas asignables a uno o varios vehículos
- Mapa siempre muestra tu ubicación + la del vehículo

---

# 1. ADMIN (Marco, Juan)

## 1.1 Flujo: Dar de alta una empresa nueva (ej: Samfor)

```
INICIA SESIÓN (Admin)
│
▼
CREAR EMPRESA
├── Nombre, RIF, datos de contacto
├── Tipo: estándar | predefinida | personal
└── (Opcional) Asignar empresa predefinida
    Ej: Samfor → Chevron
│
▼
CREAR EL SUPERVISOR DE LA EMPRESA
├── Nombre, email
├── Rol: supervisor_company
├── Empresa: Samfor
└── Invitación → el supervisor entra y llena su perfil
    (cédula, licencia, carta médica)
│
▼
CREAR LOS VEHÍCULOS (ver flujo 1.2 — incluye GPS)
│
▼
EMPRESA OPERATIVA
└── El supervisor (Yeison) toma el control:
    conductores, áreas, asignaciones, alertas
```

## 1.2 Flujo: Crear vehículo (el GPS se instala AQUÍ — es obligatorio)

**Regla:** No se puede terminar de crear un vehículo sin instalarle su GPS.
El instalador es un paso dentro del alta del vehículo.

```
PASO 1 — DATOS DEL VEHÍCULO
├── Placa, marca, modelo, año, tipo
├── ASIGNAR EMPRESA (a qué empresa pertenece)
└── ALIAS: nombre interno de la empresa para el vehículo
    Ej: "Unidad 07", "Camioneta de Producción"
    (cada empresa usa sus propios alias)
│
▼
PASO 2 — DOCUMENTOS DEL VEHÍCULO (con vencimientos)
├── Trimestres
├── Responsabilidad civil (RCV)
├── Carné de circulación
└── Póliza de seguro
│
▼
PASO 3 — INSTALAR GPS (obligatorio, dentro del alta)
│
│   3.1 REGISTRAR EQUIPO
│   ├── 1° Modelo de GPS (ej: Teltonika FMC150)
│   ├── 2° IMEI (único)
│   └── 3° Línea telefónica asociada
│
│   3.2 ASOCIAR
│   ├── GPS ↔ este vehículo
│   └── El GPS hereda la empresa del vehículo
│
│   3.3 VERIFICAR
│   ├── ¿Reporta posición?
│   │   ├── SÍ → continúa
│   │   └── NO → revisar línea/configuración, reintentar
│   └── (Opcional) prueba del botón de pánico físico
│
▼
PASO 4 — VEHÍCULO CREADO ✓
└── Estado: activo y reportando
    Auditoría: quién lo creó, qué GPS se instaló, cuándo
```

## 1.3 Día a día del Admin

```
├── Ver TODO el sistema
├── Crear/editar empresas, supervisores
├── Crear vehículos (con su GPS)
├── Asignar empresas predefinidas a empresas
└── Revisar auditoría (solo Admin)
```

---

# 2. SUPERVISOR EMPRESA PREDEFINIDA (Lino — Chevron)

## 2.1 Flujo: Sesión típica

```
INICIA SESIÓN
│
▼
¿Supervisa más de una predefinida? (Chevron Y PDVSA)
├── SÍ → Selecciona la cuenta
└── NO → Entra directo
│
▼
LISTA DE EMPRESAS ASOCIADAS
└── Empresas asignadas a Chevron (ej: Samfor)
│
▼
SELECCIONA UNA EMPRESA (ej: Samfor)
│
▼
VE (solo lectura):
├── REPORTE GERENCIAL
├── Todos los reportes de esa empresa
│   (en el formato que Chevron exige)
├── Histórico de ODT
└── "Información extra" (pendiente de definir alcance)
```

**Lino NO ve:** métricas operativas de la empresa, vehículos y su estado,
kilometraje, disponibilidad, ni alertas de velocidad. Su vista es gerencial,
no operativa.

**Lino NO puede:** crear, editar ni eliminar nada.

---

# 3. SUPERVISOR EMPRESA (Yeison — Samfor)

## 3.1 Flujo: Configuración inicial de su empresa

```
PRIMER INGRESO
│
▼
LLENAR SU PERFIL (obligatorio)
└── Cédula, licencia, carta médica
│
▼
CREAR ÁREAS DE LA EMPRESA
├── Por ubicación (ej: Base Maturín)
├── Por sector (ej: Producción)
└── Por contrato (ej: Contrato Chevron 2026)
│
▼
CREAR USUARIOS (conductores)
└── Cada conductor llena su perfil al entrar
│
▼
ASIGNAR
├── Vehículo → área
├── CONDUCTOR PRINCIPAL → vehículo (el titular de la unidad)
└── CONDUCTORES SECUNDARIOS (ver 3.5)
│
▼
CONFIGURAR ALERTAS (ver 3.6)
│
▼
EMPRESA LISTA PARA OPERAR
```

## 3.2 Flujo: Día a día

```
INICIA SESIÓN
│
▼
DASHBOARD
├── MAPA
│   ├── Ubicación de TODOS los vehículos de la empresa
│   ├── TU ubicación (dónde estás tú) siempre visible
│   └── Click en vehículo → resumen:
│       conductor actual (principal o secundario),
│       kilometraje, velocidad, estado
├── ODT pendientes de revisar
├── Alertas nuevas
│   ├── Exceso de velocidad
│   ├── Mantenimiento próximo/vencido
│   └── Documentos por vencer (vehículos y personas)
└── KPIs
│
├─────────────────────────────────────────┐
▼                                         ▼
GESTIONAR ODT (3.3)                GENERAR REPORTES
                                   ├── Normales de su empresa
                                   └── Formato de la predefinida
                                       (ej: formato Chevron)
```

## 3.3 Flujo: Gestionar una ODT

```
NOTIFICACIÓN: "Nueva ODT — Vehículo Unidad 07 (ABC-123)"
│
▼
ABRE LA ODT (abierta)
├── Descripción, fotos, vehículo, fecha, ubicación
├── QUIÉN LA CREÓ: conductor principal o secundario
│   (si fue secundario, el sistema lo identificó por su PIN)
└── Estado → en_revision
│
▼
GESTIONA LA REPARACIÓN
│
▼
COMPLETA
├── Qué se hizo
├── Costo + factura/foto
└── Fecha de resolución
│
▼
CIERRA (cerrada) → histórico → reportes
```

## 3.4 Flujo: Alerta preventiva que se cumple

```
SISTEMA: "Unidad 07 llegó a 3.000 km del último cambio de aceite"
│
▼
ODT AUTOMÁTICA (preventiva, abierta) → notificación a Yeison
│
▼
MISMO FLUJO 3.3 → al cerrar, el contador se reinicia
```

## 3.5 Flujo: Conductor principal y secundarios

**Concepto:**
- Cada vehículo tiene UN **conductor principal** (el titular)
- Puede tener **conductores secundarios** que lo usan temporalmente
- Los secundarios dependen de que el GPS tenga **identificación por PIN**
  (función que traen algunos equipos)

```
YEISON CONFIGURA
├── Unidad 07 → Conductor principal: Pedro
└── Conductores secundarios autorizados: Luis, Carlos
    └── A cada uno se le genera/asigna su PIN
│
▼
EN CAMPO: Luis va a usar la Unidad 07
│
▼
Luis ingresa SU PIN en el equipo GPS del vehículo
│
▼
EL SISTEMA RECONOCE
└── "Unidad 07 está siendo usada TEMPORALMENTE por Luis"
    ├── En el mapa: el resumen muestra a Luis como conductor actual
    ├── Los eventos (velocidad, km) de ese lapso quedan asociados a Luis
    └── Si pasa algo → Luis puede llenar la ODT desde su app
        (la ODT registra que la creó Luis, no Pedro)
│
▼
Luis termina de usarla
└── El vehículo vuelve a asociarse a Pedro (principal)
```

**Si el GPS NO tiene función de PIN:** el vehículo solo maneja conductor
principal (sin secundarios).

## 3.6 Flujo: Crear alertas y asignarlas a vehículos

**Regla:** Toda alerta que crea el Supervisor se puede asignar a UN vehículo
o a VARIOS.

```
YEISON CREA UNA ALERTA
│
▼
TIPO
├── Exceso de velocidad (ej: límite 80 km/h)
└── Mantenimiento preventivo (ej: aceite cada 3.000 km)
│
▼
ASIGNAR A:
├── Un vehículo        → solo Unidad 07
├── Varios vehículos   → Unidad 07, 08 y 12
└── (Práctico: seleccionar por área, ej: todos los de "Base Maturín")
│
▼
ALERTA ACTIVA
└── Cada vehículo asignado se monitorea con esa regla
```

---

# 4. CONDUCTOR EMPRESA (ej: Pedro — Samfor)

## 4.1 Flujo: Jornada diaria

```
ABRE LA APP (funciona sin señal)
│
▼
PRIMER USO: perfil obligatorio
└── Cédula, licencia, carta médica
│
▼
INSPECCIÓN DIARIA (antes de arrancar)
├── Checklist:
│   ├── ✅ Conforme
│   ├── ⚠️ Observación
│   └── ❌ Falla → ¿crear ODT?
└── GUARDAR
    ├── Con señal → se envía
    └── Sin señal → local → sincroniza después
│
▼
DURANTE EL DÍA
├── MAPA (requiere señal):
│   ├── Ubicación de SU vehículo + métricas del GPS
│   └── TU ubicación (dónde estás tú) siempre visible
└── Si pasa algo → ODT correctiva (4.2)
│
▼
EMERGENCIA → botón de pánico FÍSICO del GPS
```

## 4.2 Flujo: Reportar una falla (ODT correctiva)

```
PASA ALGO (ej: se explotó un caucho)
│
▼
APP → "Reportar falla"
├── Vehículo: automático
│   (si es conductor secundario usando el vehículo con PIN,
│    el sistema ya sabe que él lo está usando y le permite
│    llenar la ODT de ESE vehículo)
├── Descripción + fotos
└── ENVIAR (con señal directo / sin señal → cola local)
│
▼
LLEGA A YEISON (abierta)
└── El conductor ve el estado de SUS ODT:
    abierta → en_revision → cerrada
```

## 4.3 Conductor secundario (uso temporal)

```
Luis (secundario autorizado de la Unidad 07)
│
▼
Ingresa su PIN en el GPS del vehículo
│
▼
El sistema lo reconoce como conductor ACTUAL temporal
├── Su app muestra la Unidad 07 mientras la usa
├── Puede: inspección, ver mapa del vehículo, crear ODT
└── Todo lo que haga queda registrado a SU nombre
│
▼
Deja el vehículo → todo vuelve al principal (Pedro)
```

---

# 5. SUPERVISOR PERSONAL (Ale Sampieri)

## 5.1 Flujo: Configuración inicial

```
ADMIN ya creó: cuenta de Ale + sus vehículos (con GPS)
│
▼
ALE ENTRA (directo, sin seleccionar empresa)
│
▼
LLENA SU PERFIL (cédula, licencia, carta médica)
│
▼
CREA SUS USUARIOS: Santi, Sofi
└── Cada uno llena su perfil al entrar
│
▼
ASIGNA VEHÍCULOS
├── Carro 1 → Santi (principal)
└── Carro 2 → Sofi (principal)
│
▼
CREA ALERTAS DE MANTENIMIENTO
└── Asignables a uno o varios de sus carros
    Ej: aceite cada 5.000 km → Carro 1 y Carro 2
```

## 5.2 Flujo: Día a día

```
INICIA SESIÓN
│
▼
VE SUS CARROS (todos, con toda su info)
├── MAPA: dónde está cada carro + DÓNDE ESTÁ ELLA
├── Kilometraje, velocidad
├── Alertas de mantenimiento
└── Documentos por vencer
    ├── Carros: trimestres, RCV, carné, póliza de seguro
    └── Usuarios: licencia, carta médica, cédula
│
▼
ALERTA CUMPLIDA → notificación
    Ej: "Cambio de aceite del carro de Santi: vencido"
```

---

# 6. USUARIO PERSONAL (Santi, Sofi)

## 6.1 Flujo completo

```
INICIA SESIÓN EN LA APP
│
▼
PRIMER USO: perfil (cédula, licencia, carta médica)
│
▼
VE:
├── MAPA: ubicación de su vehículo + SU propia ubicación
└── ALERTAS
    ├── Mantenimiento
    └── Documentos por vencer (suyos y del carro)
│
FIN — no crea ni edita nada
```

---

# 7. MAPA GENERAL DE ROLES

```
                    ┌─────────────┐
                    │    ADMIN    │
                    │ Marco, Juan │
                    └──────┬──────┘
     crea empresas, supervisores, vehículos (GPS incluido)
                           │
        ┌──────────────────┼──────────────────────┐
        ▼                  ▼                      ▼
┌──────────────┐   ┌──────────────┐      ┌──────────────┐
│ PREDEFINIDA  │   │   EMPRESA    │      │   PERSONAL   │
│   Chevron    │◄──│    Samfor    │      │ Ale Sampieri │
│              │asig│              │      │              │
│ Lino VE:     │   │ Yeison:      │      │ Ale crea:    │
│ - Reporte    │   │ áreas, users,│      │ Santi, Sofi  │
│   gerencial  │   │ ODT, alertas │      │ + alertas    │
│ - Reportes   │   │ (multi-      │      │ (multi-carro)│
│ - Hist. ODT  │   │  vehículo),  │      └──────┬───────┘
│ (sin métricas│   │ reportes,    │             ▼
│  operativas) │   │ cond. princ./│      ┌──────────────┐
└──────────────┘   │ secundarios  │      │ Santi, Sofi  │
                   └──────┬───────┘      │ mapa + alertas│
                          ▼              └──────────────┘
                   ┌──────────────┐
                   │  CONDUCTORES │
                   │ principal +  │
                   │ secundarios  │
                   │ (PIN en GPS) │
                   └──────────────┘

REGLA DE MAPA (todos los roles con mapa):
  SIEMPRE se muestra TU ubicación + la del vehículo/vehículos

FLUJO ODT:
  Conductor (principal o secundario) reporta
  → Yeison revisa/completa/cierra
  → histórico → reportes → Lino (reporte gerencial, formato Chevron)
```

---

# 8. CAMBIOS INCORPORADOS EN ESTA VERSIÓN

| # | Cambio |
|---|--------|
| 1 | Crear vehículo: "asignar empresa" + campo ALIAS (nombre interno por empresa) |
| 2 | Documentos del vehículo: se agrega PÓLIZA DE SEGURO |
| 3 | El GPS se instala DENTRO del alta del vehículo (obligatorio para crearlo) |
| 4 | Instalador — orden: 1° modelo, 2° IMEI, 3° línea telefónica asociada |
| 5 | Lino: solo reporte gerencial + reportes + histórico ODT (sin métricas operativas, sin vehículos/estado, sin kilometraje/disponibilidad, sin alertas de velocidad) |
| 6 | Conductor principal por vehículo + conductores secundarios con PIN del GPS (uso temporal reconocido por el sistema; el secundario puede llenar ODT) |
| 7 | Alertas del supervisor asignables a uno o varios vehículos |
| 8 | El mapa siempre muestra TU ubicación + la del vehículo |
