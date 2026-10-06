# Publicación preparada — 6 oct 2026

Compilación final verificada: diseño Azul/Glass, marca FOM, mapa del conductor, historial entendible y consulta completa de mantenimiento. El paquete final está en `/home/fomadmin/deploy-20261006-apariencia-ordenes-v2` de `fom-app-01`; sus 189 archivos se verificaron contra SHA256SUMS.

La activación conserva toda la configuración existente de Nginx salvo la raíz web, crea un respaldo, verifica la configuración y restaura el respaldo si falla. No reinicia contenedores ni cambia la base de datos.

En el servidor:

```bash
sudo bash /home/fomadmin/deploy-20261006-apariencia-ordenes-v2/activate-publication.sh
```

La conexión automática no dispone de sudo sin contraseña. La publicación solo se considera activa después de ejecutar ese comando y comprobar que la web pública entrega el índice y los archivos de esta compilación.
