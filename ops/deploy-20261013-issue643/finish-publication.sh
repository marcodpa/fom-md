#!/usr/bin/env bash
# Actualización fijada al PR #643; respaldo obligatorio y lectura independiente.
set -Eeuo pipefail
export PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
umask 077
readonly TARGET=bf08e2e1d3847334d1ed53a49e4c9de9761b75c3
readonly BASELINE=ce4def3182187c4307d44505378a76a1f7621c80
readonly REPO=/opt/fom/apps/fom-core
readonly COMPOSE_DIR=/opt/fom/docker/core
readonly STATE=/opt/fom/state/prod/publication-20261013-issue643
fail() { printf 'FOM_PUBLICATION=FAIL %s\n' "$1" >&2; exit 1; }
test "$(id -u)" = 0 || fail 'Ejecutar con sudo dentro de fom-app-01.'
test "$(hostname -s)" = fom-app-01 || fail 'Servidor incorrecto.'
test "$#" = 0 || fail 'Este comando no admite argumentos.'
test -t 0 && test -t 1 || fail 'Se necesita una terminal interactiva para pegar el recibo del respaldo.'
stage=$(cd -- "$(dirname -- "$0")" && pwd)
cd "$stage"
sha256sum --quiet -c SHA256SUMS
sha256sum --quiet -c runtime-SHA256SUMS
test ! -e "$STATE" || fail 'Existe un intento anterior; revisar su resultado antes de repetir.'
test -e /opt/fom/deploy/fom-core/state/PAUSE || fail 'Falta el marcador PAUSE del despliegue.'
test "$(sha256sum /etc/nginx/sites-available/fom-mobile.conf | awk '{print $1}')" = 3fab5e7c138ef8d6a310ac984d2d31ccb1c4bb9f92bbdee878bb8f7893f9dc6c || fail 'Nginx cambió desde la preparación.'
test "$(df -Pk /opt/fom | awk 'NR == 2 { print $4 }')" -ge 10485760 || fail 'Se necesitan al menos 10 GiB libres.'
version_commit() {
  curl --fail --silent --show-error --max-time 15 http://127.0.0.1:3000/version |
    python3 -c 'import json,sys; print(json.load(sys.stdin)["commit"])'
}
test "$(version_commit)" = "$BASELINE" || fail 'La API ya no está en la versión de partida.'
oldimage="fom-core-api:git-${BASELINE:0:12}"
test "$(docker inspect --format '{{.Config.Image}}' fom-core-api)" = "$oldimage" || fail 'La imagen activa difiere de la versión esperada.'
git_owner() { runuser -u fom-codex -- env GIT_TERMINAL_PROMPT=0 git -C "$REPO" "$@"; }
test "$(stat -c %U "$REPO")" = fom-codex || fail 'Propietario inesperado del repositorio.'
test -z "$(git_owner status --porcelain)" || fail 'El servidor tiene cambios locales; no se sobrescriben.'
test "$(git_owner ls-remote --exit-code origin refs/heads/main | awk 'NR == 1 {print $1}')" = "$TARGET" || fail 'main cambió; volver a preparar la publicación.'
git_owner fetch origin main
git_owner cat-file -e "$TARGET^{commit}"
git_owner merge-base --is-ancestor "$BASELINE" "$TARGET"
expected=$(cat <<'MIGRATIONS'
A	20261005180000000_align_transfer_platform_admin_scope.ts
A	20261006180000000_enable_platform_notification_receipts.ts
A	20261006190000000_classify_inspections_and_record_attempts.ts
A	20261006210000000_add_driver_behavior_events.ts
A	20261010210000000_enable_managed_user_credentials.ts
MIGRATIONS
)
actual=$(git_owner diff --no-renames --name-status "$BASELINE..$TARGET" -- src/database/migrations/files | sed 's|src/database/migrations/files/||')
test "$actual" = "$expected" || fail 'La diferencia no son las cinco migraciones revisadas.'
curl --noproxy '*' --resolve 15.204.105.201:443:10.20.30.10 --fail --silent --show-error --max-time 15 https://15.204.105.201/health > /dev/null
witness() {
  FOM_API_IMAGE="$2" docker compose --project-directory "$COMPOSE_DIR" \
    --file "$COMPOSE_DIR/docker-compose.yml" --file "$COMPOSE_DIR/docker-compose.deploy.yml" \
    --profile operations run --rm --no-deps --entrypoint node \
    --volume "$stage/migration-witness.cjs:/app/publication-witness.cjs:ro" \
    migrate /app/publication-witness.cjs "$1"
}
witness before "$oldimage"
bash "$stage/fom-prod-pinned" plan
# Se guarda una copia root del paquete verificado antes de ejecutar sus componentes.
install -d -m 0700 "$STATE"
for item in dist README.md VERIFICACION.md SHA256SUMS runtime-SHA256SUMS finish-publication.sh activate-publication.sh fom-prod-pinned migration-witness.cjs; do
  cp -a "$stage/$item" "$STATE/"
done
chown -R root:root "$STATE"
stage="$STATE"
(cd "$stage"; sha256sum --quiet -c SHA256SUMS)
phase='actualizar API y migraciones'
trap 'printf "FOM_PUBLICATION=FAIL fase=%s. No se reintenta ni se revierte la base automáticamente. Registro: %s\n" "$phase" "$STATE" >&2' ERR
bash "$stage/fom-prod-pinned" deploy
phase='comprobar versión y migraciones'
test "$(version_commit)" = "$TARGET"
witness after "fom-core-api:git-${TARGET:0:12}"
bash "$stage/fom-prod-pinned" smoke
phase='comprobar registro de las rutas nuevas'
probe=(curl --noproxy '*' --resolve 15.204.105.201:443:10.20.30.10 --silent --show-error --max-time 15 -o /dev/null -w '%{http_code}')
test "$("${probe[@]}" https://15.204.105.201/api/v1/console/driving-scores)" = 401
test "$("${probe[@]}" --request PATCH --header 'Content-Type: application/json' --header 'x-fom-csrf: fom-browser-v1' --header 'Idempotency-Key: 00000000-0000-4000-8000-000000000001' --data '{}' https://15.204.105.201/api/v1/console/users/00000000-0000-4000-8000-000000000001/credentials)" = 401
phase='publicar web'
bash "$stage/activate-publication.sh"
trap - ERR
printf '%s\n' "$TARGET" > "$STATE/completed"
printf 'FOM_PUBLICATION=PASS commit=%s migrations=5 web=https://15.204.105.201/\n' "$TARGET"
