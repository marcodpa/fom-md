import type { TourCfg } from './Tour'

// Cada recorrido guiado: qué clip, qué tramo (en segundos del clip), qué se explica y dónde se señala.
// Las coordenadas son del clip original (1920×1080). Los tiempos de `puntos` y `callouts` son del clip.

export const TOURS: Record<string, TourCfg> = {
  login: {
    clip: 'login', desde: 0.8, hasta: 9.4, num: '01', titulo: 'Entrar al panel',
    subtitulo: 'Cada persona entra con su cuenta y ve solo lo suyo.',
    puntos: [
      { t: 1.2, texto: 'Pantalla de acceso de FOM' },
      { t: 2.6, texto: 'En la demostración, la cuenta del supervisor se rellena con un botón' },
      { t: 4.5, texto: 'Entras con tu cuenta de empresa y llegas al panel' },
    ],
    callouts: [
      { t: 2.4, dur: 2.0, texto: 'Cuenta del supervisor', rect: { x: 1560, y: 655, w: 140, h: 58 }, lado: 'izq' },
      { t: 4.4, dur: 2.4, texto: 'Entrar', rect: { x: 1313, y: 527, w: 350, h: 48 }, lado: 'izq' },
    ],
  },

  resumen: {
    clip: 'resumen', desde: 0.6, hasta: 10.4, num: '02', titulo: 'Resumen',
    subtitulo: 'Toda la operación de la empresa en una pantalla.',
    puntos: [
      { t: 1.0, texto: 'Flota, órdenes de trabajo y alertas nuevas' },
      { t: 2.6, texto: 'Mapa en vivo con la unidad seleccionada y su ficha' },
      { t: 6.3, texto: 'Inspecciones de hoy, mantenimiento y documentos por vencer' },
    ],
    callouts: [
      { t: 0.9, dur: 2.4, texto: 'Los números del día', rect: { x: 260, y: 184, w: 1632, h: 136 }, lado: 'abajo' },
      { t: 2.4, dur: 1.2, texto: 'Mapa en vivo de tus unidades', rect: { x: 260, y: 340, w: 994, h: 580 }, lado: 'abajo' },
      { t: 6.4, dur: 1.9, texto: 'Inspecciones, mantenimiento y documentos', rect: { x: 260, y: 400, w: 1632, h: 150 }, lado: 'abajo' },
    ],
  },

  'mapa-vivo': {
    clip: 'mapa-vivo', desde: 0.5, hasta: 38.5, num: '03', titulo: 'Centro de control',
    subtitulo: 'Dónde está cada unidad, ahora mismo.',
    puntos: [
      { t: 1.2, texto: 'Todas tus unidades en un mapa, en vivo (se actualiza cada 15 s)' },
      { t: 3.4, texto: 'Filtra por estado y por área' },
      { t: 12.6, texto: 'Busca por placa, alias o conductor' },
      { t: 19.6, texto: 'Lista de unidades, cada una con su velocidad' },
      { t: 27, texto: 'Los carros se ajustan al zoom y la pantalla no se mueve sola', nuevo: true },
    ],
    callouts: [
      { t: 1.2, dur: 2.0, texto: 'Estado de toda la flota', rect: { x: 78, y: 16, w: 1250, h: 72 }, lado: 'abajo' },
      { t: 3.2, dur: 8.2, texto: 'En marcha, detenidas o todas, y por área', rect: { x: 20, y: 106, w: 520, h: 46 }, lado: 'abajo' },
      { t: 12.4, dur: 6.0, texto: 'Buscador', rect: { x: 1420, y: 30, w: 462, h: 44 }, lado: 'abajo' },
      { t: 19.5, dur: 2.4, texto: 'Lista de unidades', rect: { x: 1284, y: 30, w: 109, h: 44 }, lado: 'abajo' },
      { t: 22.2, dur: 4.4, texto: 'Cada unidad con su velocidad', rect: { x: 20, y: 160, w: 352, h: 866 }, lado: 'der' },
      { t: 28.6, dur: 6.4, texto: 'Alejas y los carros se achican; te acercas y crecen' },
    ],
  },

  'mapa-zoom': {
    clip: 'mapa-zoom', desde: 5.5, hasta: 28.5, num: '04', titulo: 'Un mapa nítido a cualquier zoom',
    subtitulo: 'Mapa vectorial: más detalle, y los carros a su escala.',
    puntos: [
      { t: 6.2, texto: 'Mapa vectorial: calles y nombres nítidos al acercar', nuevo: true },
      { t: 9.4, texto: 'Los carros crecen poco a poco con el zoom', nuevo: true },
      { t: 17, texto: 'El zoom llega hasta el nivel 19, el último que trae el mapa', nuevo: true },
      { t: 22, texto: 'Al alejar vuelve a verse toda la flota' },
    ],
    callouts: [
      { t: 9.6, dur: 5.4, texto: 'El carro elegido siempre se distingue' },
      { t: 17.6, dur: 5.0, texto: 'Zoom máximo: nivel 19' },
    ],
  },

  'mapa-seleccion': {
    clip: 'mapa-seleccion', desde: 5, hasta: 21, num: '05', titulo: 'Elige una unidad',
    subtitulo: 'La ficha, el centrado y de dónde viene.',
    puntos: [
      { t: 7.2, texto: 'El mapa se centra en la unidad, una sola vez', nuevo: true },
      { t: 9.2, texto: 'Línea punteada con sus últimos 5 minutos', nuevo: true },
      { t: 11, texto: 'La ficha: velocidad, última señal, conductor y ubicación' },
      { t: 13.5, texto: 'Con «Ver recorrido» pides el día completo' },
      { t: 17, texto: 'Otra unidad, otro centrado: el mapa solo se mueve cuando tú eliges' },
    ],
    callouts: [
      { t: 9.3, dur: 4.6, texto: 'La ficha de la unidad', rect: { x: 20, y: 160, w: 352, h: 866 }, lado: 'der' },
      { t: 12.4, dur: 3.2, texto: 'Línea punteada: últimos 5 min', rect: { x: 39, y: 969, w: 314, h: 38 }, lado: 'der' },
    ],
  },

  recorrido: {
    clip: 'recorrido', desde: 8, hasta: 60, num: '06', titulo: 'Ver recorrido',
    subtitulo: 'Viajes, paradas y la hora exacta de cada punto.',
    puntos: [
      { t: 8.4, texto: 'Pides el recorrido del día con un botón' },
      { t: 11, texto: 'Rango de 6, 12 o 24 horas', nuevo: true },
      { t: 12.4, texto: 'Resumen: viajes, kilómetros y paradas', nuevo: true },
      { t: 13.6, texto: 'Línea de tiempo: cada viaje y cada parada, en orden', nuevo: true },
      { t: 15.8, texto: 'Pasa el cursor: la hora y la velocidad de ese punto', nuevo: true },
      { t: 25.3, texto: 'Un clic fija la hora en un globo', nuevo: true },
      { t: 29, texto: 'Los tres viajes y las dos paradas del día en un vistazo' },
      { t: 34.6, texto: 'Elige un viaje: los demás se aclaran y el mapa lo encuadra', nuevo: true },
      { t: 47.2, texto: 'Cada P es una parada de 5 min o más', nuevo: true },
      { t: 51.2, texto: 'Cambia el rango sin recargar la pantalla' },
    ],
    callouts: [
      { t: 8.2, dur: 1.9, texto: 'Ver recorrido', rect: { x: 39, y: 874, w: 314, h: 44 }, lado: 'der' },
      { t: 11, dur: 1.5, texto: '6, 12 o 24 horas', rect: { x: 39, y: 476, w: 314, h: 36 }, lado: 'der' },
      { t: 12.5, dur: 1.4, texto: 'Viajes, km y paradas', rect: { x: 39, y: 524, w: 314, h: 22 }, lado: 'der' },
      { t: 13.9, dur: 1.6, texto: 'Línea de tiempo del día', rect: { x: 39, y: 556, w: 314, h: 336 }, lado: 'der' },
      { t: 15.8, dur: 6.8, texto: 'Pasa el cursor por la línea: hora y velocidad de cada punto' },
      { t: 25.4, dur: 2.0, texto: 'Clic: la hora queda fija', rect: { x: 815, y: 760, w: 140, h: 120 }, lado: 'der' },
      { t: 29.2, dur: 4.0, texto: 'Todo el día a la vista' },
      { t: 34.8, dur: 12.0, texto: 'El viaje elegido se resalta', rect: { x: 39, y: 556, w: 314, h: 336 }, lado: 'der' },
      { t: 47.4, dur: 3.2, texto: 'Parada: llegada, salida y duración' },
      { t: 51.3, dur: 6.0, texto: 'Rango de 6, 12 o 24 horas', rect: { x: 39, y: 476, w: 314, h: 36 }, lado: 'der' },
    ],
    zooms: [
      { t: 11.4, cx: 360, cy: 640, s: 1.6 },
      { t: 15.8, cx: 960, cy: 540, s: 1 },
      { t: 25.3, cx: 880, cy: 790, s: 1.6 },
      { t: 27.8, cx: 960, cy: 540, s: 1 },
    ],
  },

  alertas: {
    clip: 'alertas', desde: 0.6, hasta: 12.5, num: '07', titulo: 'Alertas',
    subtitulo: 'Lo que pasó y lo que necesita tu atención.',
    puntos: [
      { t: 1.2, texto: 'Sin leer, alertas de hoy, eventos de manejo y excesos de velocidad' },
      { t: 3.2, texto: 'Bandeja de avisos: descártalos o márcalos como leídos' },
      { t: 8.2, texto: 'Eventos de manejo: frenadas, aceleraciones y excesos por conductor' },
    ],
    callouts: [
      { t: 1.2, dur: 2.2, texto: 'Indicadores de las últimas semanas', rect: { x: 260, y: 184, w: 1632, h: 136 }, lado: 'abajo' },
      { t: 3.4, dur: 2.4, texto: 'Bandeja de avisos', rect: { x: 260, y: 480, w: 1632, h: 520 }, lado: 'arriba' },
      { t: 8.2, dur: 3.6, texto: 'Detalle: tipo, severidad, unidad, conductor y lugar' },
    ],
  },

  vehiculos: {
    clip: 'vehiculos', desde: 0.6, hasta: 17.8, num: '08', titulo: 'Vehículos',
    subtitulo: 'Toda la flota en una tabla y el expediente de cada unidad.',
    puntos: [
      { t: 1.2, texto: 'Total, en marcha, requieren atención y sin conductor' },
      { t: 3.2, texto: 'Filtra por estado y por área' },
      { t: 6.2, texto: '«Requieren atención»: papeles vencidos o sin responsable' },
      { t: 10.4, texto: 'Toca una fila para abrir el expediente de la unidad' },
      { t: 12.6, texto: 'Resumen, telemetría, mantenimiento, inspecciones, documentos y costos' },
    ],
    callouts: [
      { t: 1.2, dur: 2.0, texto: 'Resumen de la flota', rect: { x: 260, y: 216, w: 1632, h: 140 }, lado: 'abajo' },
      { t: 3.4, dur: 3.0, texto: 'Filtros por estado y por área', rect: { x: 264, y: 376, w: 590, h: 110 }, lado: 'der' },
      { t: 6.8, dur: 2.4, texto: 'Una fila por unidad', rect: { x: 260, y: 520, w: 1632, h: 540 }, lado: 'arriba' },
      { t: 12.8, dur: 3.8, texto: 'Expediente de la unidad' },
    ],
  },

  mantenimiento: {
    clip: 'mantenimiento', desde: 0.5, hasta: 20.8, num: '09', titulo: 'Mantenimiento',
    subtitulo: 'Qué necesita atención y qué sigue en el taller.',
    puntos: [
      { t: 1.2, texto: 'Órdenes por revisar, en proceso, cerradas y costo acumulado', nuevo: true },
      { t: 3.0, texto: '«Necesita tu atención»: lo urgente primero, con su botón', nuevo: true },
      { t: 5.0, texto: '«Cómo avanza una orden», explicado en cuatro pasos', nuevo: true },
      { t: 10.5, texto: 'El detalle de la orden y «Qué sigue»' },
      { t: 16.5, texto: 'La vista de lista, con filtros por tipo y estado' },
    ],
    callouts: [
      { t: 1.2, dur: 1.8, texto: 'Resumen de órdenes y costo', rect: { x: 264, y: 288, w: 1624, h: 98 }, lado: 'abajo' },
      { t: 3.0, dur: 2.0, texto: 'Lo que necesita tu atención', rect: { x: 264, y: 408, w: 1280, h: 660 }, lado: 'der' },
      { t: 5.0, dur: 2.4, texto: 'Cómo avanza una orden', rect: { x: 1568, y: 408, w: 320, h: 452 }, lado: 'izq' },
      { t: 10.2, dur: 4.4, texto: 'Detalle: «Qué sigue» te dice el siguiente paso', rect: { x: 420, y: 183, w: 1080, h: 715 }, lado: 'abajo' },
      { t: 16.8, dur: 3.6, texto: 'Todas las órdenes, con su costo' },
    ],
  },

  inspecciones: {
    clip: 'inspecciones', desde: 0.5, hasta: 15.6, num: '10', titulo: 'Inspecciones',
    subtitulo: 'Qué unidades se revisaron y qué requiere atención.',
    puntos: [
      { t: 1.2, texto: 'Revisadas hoy, aprobadas, con observaciones y bloqueadas', nuevo: true },
      { t: 3.2, texto: '«Requiere tu atención»: primero las unidades bloqueadas', nuevo: true },
      { t: 8.4, texto: 'Historial con filtros por fecha y resultado' },
      { t: 12.4, texto: 'El resultado punto por punto de cada inspección' },
    ],
    callouts: [
      { t: 1.2, dur: 2.0, texto: 'Cómo va la flota hoy', rect: { x: 264, y: 302, w: 1624, h: 114 }, lado: 'abajo' },
      { t: 3.4, dur: 3.2, texto: 'Unidades que requieren atención', rect: { x: 264, y: 440, w: 1300, h: 640 }, lado: 'der' },
      { t: 8.6, dur: 3.0, texto: 'Historial de inspecciones' },
      { t: 12.6, dur: 3.0, texto: 'Resultado de la inspección', rect: { x: 440, y: 24, w: 1040, h: 1032 }, lado: 'der' },
    ],
  },

  documentos: {
    clip: 'documentos', desde: 0.4, hasta: 7.7, num: '11', titulo: 'Documentos',
    subtitulo: 'Pólizas, certificados y licencias, con su vencimiento.',
    puntos: [
      { t: 1.0, texto: 'Vencidos, por vencer en 30 días, vigentes y total' },
      { t: 2.8, texto: 'Atención inmediata: lo vencido primero' },
      { t: 4.4, texto: 'Vencimientos de los próximos 6 meses' },
    ],
    callouts: [
      { t: 1.0, dur: 1.8, texto: 'Estado de los documentos', rect: { x: 260, y: 184, w: 1632, h: 136 }, lado: 'abajo' },
      { t: 2.8, dur: 2.6, texto: 'Atención inmediata', rect: { x: 260, y: 344, w: 1000, h: 600 }, lado: 'der' },
      { t: 4.6, dur: 3.0, texto: 'Próximos 6 meses', rect: { x: 1280, y: 344, w: 612, h: 600 }, lado: 'izq' },
    ],
  },

  gente: {
    clip: 'gente', desde: 0.4, hasta: 9.5, num: '12', titulo: 'Gente',
    subtitulo: 'Los conductores y supervisores de la empresa.',
    puntos: [
      { t: 1.0, texto: 'Cuentas, conductores y perfiles completos' },
      { t: 2.8, texto: 'Filtra por rol: todos, conductores, supervisores o personales' },
      { t: 5.6, texto: 'Cada persona con su cuenta y sus acciones' },
    ],
    callouts: [
      { t: 1.0, dur: 1.8, texto: 'Resumen de la gente', rect: { x: 260, y: 258, w: 1632, h: 140 }, lado: 'abajo' },
      { t: 3.0, dur: 2.4, texto: 'Filtro por rol', rect: { x: 264, y: 440, w: 480, h: 52 }, lado: 'der' },
      { t: 5.8, dur: 3.2, texto: 'Mover, clave y dar salida', rect: { x: 1300, y: 600, w: 590, h: 460 }, lado: 'izq' },
    ],
  },

  reportes: {
    clip: 'reportes', desde: 0.4, hasta: 11.2, num: '13', titulo: 'Reportes',
    subtitulo: 'Kilómetros, órdenes, costos y manejo de toda la flota.',
    puntos: [
      { t: 1.0, texto: 'Período: este mes, 90 días o el año' },
      { t: 3.0, texto: 'Kilómetros, unidades en marcha e índice de manejo' },
      { t: 6.0, texto: 'Órdenes, costos y fallas más frecuentes' },
      { t: 9.0, texto: 'Se exporta a CSV o se imprime en PDF' },
    ],
    callouts: [
      { t: 1.2, dur: 2.2, texto: 'Elige el período', rect: { x: 264, y: 640, w: 700, h: 120 }, lado: 'der' },
      { t: 6.0, dur: 4.4, texto: 'Fallas más frecuentes y costos' },
    ],
  },
}
