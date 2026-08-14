# Infraestructura FOM — lo que va en esta carpeta

Aquí viven los archivos para conectarse al servidor real (Proxmox / OVHcloud).
**Nada con llaves sube a GitHub**: el `.gitignore` de la raíz ya excluye
`infra/*.conf`, `*.key`, `*.pem`, `id_*` y `secretos*`.

## Archivos que hacen falta

| Archivo | Qué es | Estado |
|---|---|---|
| `JuanG-Laptop.conf` | Cliente WireGuard (lleva la llave privada) | ⬜ falta |
| `MarcoP-Laptop.conf` | Cliente WireGuard | ⬜ falta |
| `FOM-guia-estaciones.md` | Guía de estaciones / recepción GPS | ⬜ falta |
| `diagrama-red-*.jpg` | Las dos fotos del diagrama | ⬜ falta |
| `acceso-ssh.md` | Usuario SSH, host de entrada y si es llave o clave | ⬜ falta |

## Inventario del servidor (según el contexto pasado por el equipo)

| ID | Tipo | Nombre | Función | Red | IP |
|---|---|---|---|---|---|
| — | Host | `fom-pve-1` | Hipervisor Proxmox | FOM-MGMT | 10.20.10.10/24 |
| 100 | VM | `fom-gw-01` | Gateway / NAT / salida a Internet | varias | ver abajo |
| 110 | VM | `fom-db-01` | PostgreSQL + PostGIS + TimescaleDB | FOM-DATA | 10.20.50.10/24 |
| 120 | VM | `fom-app-01` | Aplicación / backend / Docker Compose | FOM-APP | 10.20.30.10/24 |
| 140 | CT | `fom-svc-01` | Redis + RabbitMQ + Mosquitto | FOM-DATA | 10.20.50.20/24 |
| 170 | VM | `fom-vpn-01` | WireGuard | FOM-MGMT | 10.20.10.30/24 |

Gateways de `fom-gw-01`: MGMT `10.20.10.1` · APP `10.20.30.1` · GPS `10.20.40.1`
· DATA `10.20.50.1` · BACKUP `10.20.70.1`.

Redes: `vmbr10` MGMT 10.20.10.0/24 · `vmbr30` APP 10.20.30.0/24 ·
`vmbr40` GPS 10.20.40.0/24 · `vmbr50` DATA 10.20.50.0/24 ·
`vmbr70` BACKUP 10.20.70.0/24.

## Cómo encaja la web con todo esto

El sitio de `fom/` es React estático: **el navegador no puede abrir una
conexión a PostgreSQL**. La cadena real es:

```
Navegador (cliente, Internet)
   │  HTTPS
   ▼
Reverse proxy / fom-fw-edge-01        ← IP pública OVH + certificado
   │
   ▼
API FOM en fom-app-01 (10.20.30.10)   ← sesión JWT, permisos por rol/empresa
   │  red FOM-DATA
   ▼
PostgreSQL en fom-db-01 (10.20.50.10) ← PostGIS + TimescaleDB
   ▲
   │  ingesta de posiciones
fom-gps-ingest-01 (red FOM-GPS 10.20.40.0/24)
```

La VPN WireGuard es para **administrar y desarrollar** (SSH, psql, pruebas).
No sustituye al proxy público: el cliente final entra por Internet, no por VPN.
