# Publicación de la web v7b — 25 de septiembre de 2026

Igual que `ops/deploy-20260925/README.md`, con la barra de progreso del header retirada.
Versión: `/var/www/fom-web/releases/20260925-web-v7b`. El script acepta la configuración
de Nginx de la publicación v7 (si se ejecutó) o la de la republicación del 22-09.

```bash
scp ops/deploy-20260925-web-v7b/fom-web-publication-20260925-web-v7b.tar.gz fomadmin@10.20.30.10:~/
ssh fomadmin@10.20.30.10
tar -xzf fom-web-publication-20260925-web-v7b.tar.gz
sudo bash ~/fom-web-publication-20260925-web-v7b/activate-publication.sh
```

El comprimido (≈100 MB) y `dist` se generan localmente y no se suben a Git.
