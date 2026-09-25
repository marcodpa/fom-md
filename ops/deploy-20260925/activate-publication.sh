#!/usr/bin/env bash
# Publish the v7 React build (2026-09-25). Only the web root changes.
# Publish only the React build. Does not restart containers or change the database.
set -Eeuo pipefail
export PATH=/usr/sbin:/usr/bin:/sbin:/bin
test "$(id -u)" = 0 || { echo 'Ejecutar con sudo en fom-app-01.' >&2; exit 1; }
test "$(hostname -s)" = fom-app-01
stage=$(cd -- "$(dirname -- "$0")" && pwd)
config=/etc/nginx/sites-available/fom-mobile.conf
release=/var/www/fom-web/releases/20260925-web-v7
backup=/var/backups/fom-web/20260925-web-v7-$(date +%Y%m%dT%H%M%S)-$$
# Config active since the 2026-09-22 re-publication of the original site
# (ops/deploy/public-original-v2/fom-mobile.after.conf, root releases/20260921-public-original-v2).
expected=2148712f66ec3f2828ea831d5904faa4419763200e756d8a12b68f21a9fb17a7
test "$(sha256sum "$config" | cut -d ' ' -f1)" = "$expected" || { echo 'Nginx cambió desde la preparación; revisar antes de publicar.' >&2; exit 1; }
test ! -e "$backup"
cd "$stage"
sha256sum -c SHA256SUMS
nginx -t
# A failed activation may have installed this release already.
# Reuse it only when every file matches the verified artifact.
if test -d "$release"; then
    (cd "$release"; sed -n 's|  dist/|  |p' "$stage/SHA256SUMS" | sha256sum -c -)
else
    install -d -m 0755 "$release"
    cp -a dist/. "$release/"
    chown -R root:root "$release"
    find "$release" -type d -exec chmod 0755 {} +
    find "$release" -type f -exec chmod 0644 {} +
fi
install -d -m 0700 "$backup"
cp -a "$config" "$backup/fom-mobile.conf"
phase='instalar configuración'
rollback() {
    trap - ERR
    echo "Falló la fase: $phase" >&2
    cp -a "$backup/fom-mobile.conf" "$config"
    nginx -t && systemctl reload nginx
    echo "Publicación fallida: configuración anterior restaurada. Respaldo: $backup" >&2
    exit 1
}
trap rollback ERR
install -o root -g root -m 0644 fom-mobile.after.conf "$config"
phase='validar y recargar Nginx'
nginx -t
systemctl reload nginx
origin=https://15.204.105.201
probe=(curl --silent --show-error --max-time 15 --resolve 15.204.105.201:443:10.20.30.10)
# Reload sends HUP but returns before the new workers start accepting requests.
phase='esperar la nueva web después de recargar'
ready=false
for attempt in $(seq 1 20); do
    if "${probe[@]}" --max-time 3 -o "$backup/probe.html" "$origin/" && cmp -s "$backup/probe.html" "$release/index.html"; then
        ready=true
        break
    fi
    sleep 0.5
done
test "$ready" = true
phase='comprobar rutas profundas'
"${probe[@]}" --fail "$origin/panel/mi-perfil" | cmp - "$release/index.html"
phase='comprobar autenticación'
status=$("${probe[@]}" -o /dev/null -w '%{http_code}' "$origin/fom-api/api/v1/console/auth/session")
test "$status" = 401
phase='comprobar rutas internas bloqueadas'
status=$("${probe[@]}" -o /dev/null -w '%{http_code}' "$origin/fom-api/gps-console-internal/api/devices")
test "$status" = 404
phase='comprobar salud de la API'
"${probe[@]}" --fail "$origin/health" > /dev/null
trap - ERR
printf 'FOM_WEB_PUBLISHED url=%s release=%s backup=%s\n' "$origin" "$release" "$backup"
