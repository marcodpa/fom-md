# Mantenimiento para supervisores

Implementación local del diseño aprobado. Entrada: `/panel/mantenimiento`.
Órdenes, Próximos servicios y Planes comparten navegación dentro de Mantenimiento.
La ruta antigua `/panel/mantenimiento/planes` redirige a la pestaña Planes.

## Video

`mantenimiento-supervisor.mp4`: 120 segundos, 1920 × 1080, 30 fps, H.264 y audio AAC.
Explicación mediante títulos y textos en español, con música ambiental original; sin voz narrada.
Las 15 pantallas del video son propuestas ilustrativas, no datos reales de la flota.
`index.html` ofrece reproducción y descarga; `vista-previa.jpg` es un fotograma del MP4.

Fuente Remotion: `video-web/src/Mantenimiento.tsx`, `mantenimiento-scenes.json` y composición `MantenimientoSupervisor` en `Root.tsx`.

Desde `video-web`, con dependencias instaladas:

```powershell
.\node_modules\.bin\remotion.cmd render src/index.ts MantenimientoSupervisor ../output/mantenimiento-supervisor/visual.mp4 --public-dir=../output/propuesta-mantenimiento-supervisor-v1 --concurrency=4 --crf=20 --disallow-parallel-encoding
```

Desde la raíz, con FFmpeg instalado:

```powershell
ffmpeg -hide_banner -loglevel error -y -i output/mantenimiento-supervisor/visual.mp4 -i output/propuesta-mantenimiento-supervisor-v1/ambiente.wav -filter:a volume=0.13 -c:v copy -c:a aac -b:a 128k -shortest -movflags +faststart output/mantenimiento-supervisor/mantenimiento-supervisor.mp4
```

El audio se incorpora al final para evitar un fallo `kill EBADF` de la codificación paralela de audio de Remotion en este entorno Windows.

## Verificación y límites

- Compilación de la web correcta; 57 pruebas existentes aprobadas.
- Revisión autenticada de navegación, listados, formularios, búsqueda, estados vacíos y validación local, en escritorio y móvil de 390 px.
- Filtro de etapa visible también en Lista; navegación por teclado y restauración de foco en confirmaciones verificadas.
- Conservados contratos de API, estados exactos de órdenes y controles de permisos. No se crearon órdenes ni se alteraron planes reales para probar.
- No se ha desplegado este cambio en el servidor público ni enviado al repositorio en esta tarea.

Las capturas de revisión con datos reales están excluidas de Git en `.impeccable/review/mantenimiento/`.
