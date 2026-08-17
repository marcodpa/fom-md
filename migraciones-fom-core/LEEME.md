# Migraciones propuestas para `fom-core`

Respaldo de las cinco migraciones del dominio FOM-02. **No pertenecen a este
repositorio**: su sitio es `juancpachecog/fom-core`, cada una por su Issue y su
Pull Request. Se guardan aquí para que el trabajo no viva solo en un disco.

| Archivo | Issue | Estado |
|---|---|---|
| `…090000000_create_identity_and_organization.ts` | pendiente de abrir | diseñado y auditado |
| `…100000000_add_gps_position_telemetry.ts` | **#159 autorizado** | en implementación |
| `…110000000_create_fleet_domain.ts` | pendiente de abrir | diseñado y auditado |
| `…120000000_create_operations_domain.ts` | pendiente de abrir | diseñado y auditado |
| `…130000000_create_compliance_and_audit_domain.ts` | pendiente de abrir | diseñado y auditado |

Los cuatro pendientes quedan fuera del PR de #159 por decisión del propio
Issue: «Las otras entregas —identidad/organización, flota ampliada, operación y
cumplimiento— quedan fuera y requerirán Issues propios».

El detalle legible de todo el esquema está en
[`../infra/esquema-propuesto.sql`](../infra/esquema-propuesto.sql) y el informe
para dirección en [`../infra/FOM-cambio-esquema.pdf`](../infra/FOM-cambio-esquema.pdf).
