import { readFileSync, writeFileSync } from 'node:fs'

const source = readFileSync(new URL('./fom-mobile.before.conf', import.meta.url), 'utf8')
const fallback = '    location / {\n        return 404;\n    }'
if (source.split(fallback).length !== 3) throw new Error('Expected the two original Nginx fallback locations')
const web = `    # FOM React website: static production build, independent browser sessions.
    root /var/www/fom-web/releases/20260921-redesign-v1;
    index index.html;

    location = /fom-api/health { rewrite ^ /health last; }
    location = /fom-api/version { rewrite ^ /version last; }
    location ^~ /fom-api/api/v1/console/ {
        rewrite ^/fom-api(/api/v1/console/.*)$ $1 last;
    }
    location ^~ /fom-api/ { return 404; }
    location /api/ { return 404; }
    location /gps-console-internal { return 404; }
    location ~ /\\. { return 404; }
    location = /_redirects { return 404; }
    location /assets/ { try_files $uri =404; }
    location /intro/ { try_files $uri =404; }
    location / { try_files $uri $uri/ /index.html; }`
const parts = source.split(fallback)
const result = parts[0] + '    location / {\n        return 308 https://15.204.105.201$request_uri;\n    }' + parts[1] + web + parts[2]
writeFileSync(new URL('./fom-mobile.after.conf', import.meta.url), result)
