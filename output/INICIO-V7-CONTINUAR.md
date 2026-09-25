# Continuar FOM desde casa

Guía completa para otra IA: [CONTINUAR-REDISENO.md](../CONTINUAR-REDISENO.md). Mapa de todas las páginas y referencias: [PLAN-IMPLEMENTACION-V7.md](PLAN-IMPLEMENTACION-V7.md).

Rama: `codex/rediseno-v6-fiel`.

## Estado entregado

Inicio (`/`) implementa las 11 secciones de la propuesta v7 con texto HTML, enlaces, formulario y preguntas interactivos. Los dispositivos muestran las capturas existentes de la app y del panel mediante proyección en perspectiva. Fotografías optimizadas en WebP, con originales PNG y procedencia conservados.

La galería completa tiene 90 imágenes seleccionadas para las 11 páginas. Las otras diez páginas conservan su implementación anterior: el usuario pidió comenzar implementando Inicio para revisar el resultado antes de continuar.

## Abrir

```powershell
git switch codex/rediseno-v6-fiel
git pull --ff-only origin codex/rediseno-v6-fiel
npm ci
npm run dev -- --host 127.0.0.1 --port 5174
```

- Web: `http://127.0.0.1:5174/`
- Propuestas por sección: `http://127.0.0.1:5174/output/laminas-secciones-v7/index.html`
- Referencias de Inicio: `output/laminas-secciones-v7/01-inicio/01.png` a `11.png`.
- Implementación: `src/pages/HomeV7.jsx`, `src/styles/home-v7.css`.
- Pantallas reales: `src/lib/screenProjection.js` y las capturas ya existentes en assets.
- Procedencia de las fotografías: `output/home-v7-assets.json`.

## Secciones implementadas

1. Hero con panel real.
2. Control desde la app móvil.
3. Quiénes somos.
4. Plataforma web.
5. App del conductor.
6. Inspecciones y mantenimiento.
7. Seguridad e índice de conducción.
8. Áreas de la flota.
9. Contacto y solicitud de demostración.
10. Preguntas frecuentes.
11. Footer fotográfico y navegación.

## Verificación

`npm test`: 14 pruebas aprobadas. `npm run build`: compilación aprobada. Revisión visual de escritorio y móvil; corrección del estilo heredado que rotaba las preguntas abiertas. El formulario conserva la preparación de correo existente: no envía mensajes automáticamente. No se hizo despliegue del servidor.

Continuar con las otras páginas usando sus imágenes individuales de v7 como referencia, sin mezclar el diseño anterior ni inventar información del producto.
