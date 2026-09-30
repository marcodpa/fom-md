#!/usr/bin/env bash
set -Eeuo pipefail
export PATH=/usr/sbin:/usr/bin:/sbin:/bin
test "$(id -u)" = 0 || { echo 'Ejecutar con sudo dentro del servidor.' >&2; exit 1; }
test "$(hostname -s)" = fom-app-01
config=/etc/nginx/sites-available/fom-mobile.conf
old='add_header Referrer-Policy "no-referrer" always;'
new='add_header Referrer-Policy "strict-origin" always;'
if grep -Fq "$new" "$config"; then
    nginx -t
    systemctl reload nginx
    exit 0
fi
test "$(grep -Fc "$old" "$config")" = 1
nginx -t
backup="/var/backups/fom-map-referrer-$(date +%Y%m%dT%H%M%S)-$$.conf"
cp -a "$config" "$backup"
rollback() {
    trap - ERR
    cp -a "$backup" "$config"
    nginx -t && systemctl reload nginx
    echo "Error; configuración restaurada desde $backup" >&2
    exit 1
}
trap rollback ERR
sed -i 's/add_header Referrer-Policy "no-referrer" always;/add_header Referrer-Policy "strict-origin" always;/' "$config"
nginx -t
systemctl reload nginx
trap - ERR
echo "Corregida la identificación del sitio para mapas. Respaldo: $backup"
