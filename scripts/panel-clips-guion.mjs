// Guiones de los clips del panel. Cada uno recibe `p` (ver panel-clips.mjs) y hace lo que haría una persona.
// Las «marcas» dejan escrito cuándo ocurre cada cosa y dónde está en pantalla.

const primeraUnidad = async (p) => {
  await p.clic('Unidades', 'main', 1100)
  await p.clicSel('.pnl-fila', 600)
}

export const GUIONES = {
  login: {
    inicio: '/entrar',
    async hacer(p) {
      await p.esperar(2500)
      await p.marcar('tarjeta-supervisor', 'Rellenar')
      await p.clic('Rellenar', 'main', 900)
      await p.marcar('entrar', 'Entrar')
      await p.clic('Entrar', 'main', 4500)
    },
  },

  resumen: {
    inicio: '/panel',
    async hacer(p) {
      await p.esperar(2500)
      await p.marcar('resumen', 'main')
      await p.mover(1000, 400, 1200)
      await p.desplazar(520, 2400)
      await p.esperar(2200)
      await p.alTope()
      await p.esperar(800)
    },
  },

  'mapa-vivo': {
    inicio: '/panel/mapa',
    esperaInicial: 7000,
    async hacer(p) {
      await p.esperar(1500)
      await p.marcar('encabezado', '.control-search')
      await p.marcar('filtros', '.control-filters')
      await p.esperar(1800)
      await p.clic('En marcha', 'main', 2400)
      await p.marcar('en-marcha', '.control-filters')
      await p.clic('Detenidas', 'main', 2400)
      await p.clic('Todas', 'main', 1600)
      await p.marcar('buscador', '.control-search')
      await p.clicSel('.control-search input', 600)
      await p.escribir('Unidad 0', 170)
      await p.esperar(2000)
      await p.borrar(8)
      await p.esperar(900)
      await p.marcar('lista-boton', 'Unidades')
      await p.clic('Unidades', 'main', 1800)
      await p.marcar('lista', '#control-unidades')
      await p.esperar(2000)
      await p.clicSel('button[aria-label="Cerrar lista de unidades"]', 900)
      // acercar y alejar con la rueda sobre los carros: cambian de tamaño con el zoom
      await p.marcar('zoom', '.fleet-map-legend')
      const c = (await p.ev(`(()=>{const e=document.querySelectorAll('.fleet-marker')[6]||document.querySelector('.fleet-marker');if(!e)return null;const r=e.getBoundingClientRect();return {x:Math.round(r.left+26),y:Math.round(r.top+40)}})()`)) || { x: 1000, y: 520 }
      await p.rueda(c.x, c.y, -200, 4, 1300)
      await p.esperar(2600)
      await p.rueda(c.x, c.y, 200, 4, 800)
      await p.esperar(3200)
    },
  },

  'mapa-seleccion': {
    inicio: '/panel/mapa',
    esperaInicial: 7000,
    async hacer(p) {
      await p.esperar(1200)
      await primeraUnidad(p)
      await p.esperar(4200)
      await p.marcar('ficha', '.control-unit')
      await p.marcar('cola-nota', '.ruta-cola-nota')
      await p.esperar(2600)
      // otra unidad: se vuelve a centrar, una sola vez
      await p.clicSel('button[aria-label="Cerrar ficha del vehículo"]', 900)
      await p.clic('Detenidas', 'main', 1800)
      if (!(await p.ev(`!!document.querySelector('.pnl-fila')`))) await p.clic('Unidades', 'main', 1100)
      await p.clicSel('.pnl-fila', 600)
      await p.esperar(4200)
      await p.marcar('detenida', '.control-unit')
      await p.esperar(2400)
    },
  },

  recorrido: {
    inicio: '/panel/mapa',
    esperaInicial: 7000,
    async hacer(p) {
      await p.esperar(1000)
      await primeraUnidad(p)
      await p.esperar(3200)
      await p.marcar('boton-recorrido', 'Ver recorrido')
      await p.clic('Ver recorrido', 'main', 3600)
      await p.marcar('rangos', '.ruta-rangos')
      await p.marcar('resumen', '.ruta-resumen')
      await p.marcar('lineatiempo', '.ruta-linea')
      await p.esperar(2000)
      // la hora de cada punto al pasar el cursor
      for (const f of [0.25, 0.55, 0.85]) {
        const pt = await p.puntoDeViaje(0, f)
        if (pt) { await p.pasar(pt.x, pt.y, 1400); if (f === 0.55) await p.marcar('hora-punto', '.leaflet-tooltip.ruta-hora') }
      }
      // clic: la hora queda fijada en un globo
      const clic = await p.puntoDeViaje(0, 0.4)
      if (clic) { await p.clicEn(clic.x, clic.y, 2200); await p.marcar('globo', '.leaflet-popup') }
      await p.clicSel('.leaflet-popup-close-button', 600)
      // alejar un poco: se ven los tres viajes y las dos paradas
      await p.rueda(1100, 560, 200, 2, 900)
      await p.esperar(2200)
      await p.marcar('todo-el-dia', '.ruta-panel')
      // elegir un viaje en la lista: los demás se aclaran y el mapa lo encuadra
      const n = await p.ev(`document.querySelectorAll('.ruta-item.viaje').length`)
      for (let i = 0; i < Math.min(n, 3); i++) {
        const r = await p.ev(`(()=>{const e=document.querySelectorAll('.ruta-item.viaje')[${i}];e.scrollIntoView({block:'nearest'});const q=e.getBoundingClientRect();return {x:Math.round(q.left+70),y:Math.round(q.top+q.height/2)}})()`)
        await p.clicEn(r.x, r.y, 3300)
        await p.marcar('viaje-' + (i + 1), '.ruta-item.activo')
      }
      // una parada
      await p.marcar('parada', '.ruta-pin.parada')
      await p.clicSel('.ruta-pin.parada', 2400)
      await p.marcar('globo-parada', '.leaflet-popup')
      // los rangos
      await p.clic('Últimas 6 h', 'main', 3000)
      await p.marcar('rango-6', '.ruta-rangos')
      await p.clic('Últimas 12 h', 'main', 3000)
      await p.clic('Últimas 24 h', 'main', 3000)
    },
  },

  'mapa-zoom': {
    inicio: '/panel/mapa',
    esperaInicial: 7000,
    async hacer(p) {
      await p.esperar(1000)
      await primeraUnidad(p)
      await p.esperar(4000)
      const m = await p.ev(`(()=>{const e=document.querySelector('.fleet-marker.selected');if(!e)return null;const r=e.getBoundingClientRect();return {x:Math.round(r.left+26),y:Math.round(r.top+40)}})()`)
      const c = m || { x: 1100, y: 540 }
      await p.marcar('zoom-inicio', '.fleet-map-legend')
      await p.rueda(c.x, c.y, -200, 8, 1100)
      await p.marcar('zoom-maximo', '.fleet-map-legend')
      await p.esperar(2800)
      await p.rueda(c.x, c.y, 200, 5, 900)
      await p.esperar(1200)
    },
  },

  alertas: {
    inicio: '/panel/alertas',
    async hacer(p) {
      await p.esperar(2500)
      await p.marcar('tarjetas', 'main')
      await p.mover(1000, 600, 1000)
      await p.clic('Eventos de manejo', 'main', 3200)
      await p.marcar('eventos', 'main')
      await p.desplazar(480, 2200)
      await p.esperar(1800)
    },
  },

  vehiculos: {
    inicio: '/panel/flota',
    async hacer(p) {
      await p.esperar(2500)
      await p.marcar('tabla', 'main')
      await p.clic('Requieren atención', 'main', 2400)
      await p.clic('Todas', 'main', 1400)
      await p.clic('Unidad 01', 'row', 4200)
      await p.marcar('expediente', 'main')
      await p.desplazar(560, 2400)
      await p.esperar(2000)
    },
  },

  documentos: {
    inicio: '/panel/documentos',
    async hacer(p) {
      await p.esperar(2500)
      await p.marcar('kpis', 'main')
      await p.mover(1300, 500, 1200)
      await p.desplazar(420, 2200)
      await p.esperar(2000)
    },
  },

  gente: {
    inicio: '/panel/personal',
    async hacer(p) {
      await p.esperar(2500)
      await p.marcar('cuentas', 'main')
      await p.clic('Conductores', 'main', 2200)
      await p.desplazar(380, 2000)
      await p.esperar(1600)
    },
  },

  reportes: {
    inicio: '/panel/reportes',
    async hacer(p) {
      await p.esperar(2500)
      await p.marcar('reporte', 'main')
      await p.clic('90 días', 'main', 2600)
      await p.desplazar(900, 3000)
      await p.esperar(1800)
    },
  },

  mantenimiento: {
    inicio: '/panel/mantenimiento',
    async hacer(p) {
      await p.esperar(2500)
      await p.marcar('ordenes', 'main')
      await p.mover(900, 620, 1200)
      await p.esperar(1800)
      await p.clic('Revisar', 'main', 3400)
      await p.marcar('detalle', '[role=dialog]')
      await p.esperar(2600)
      await p.tecla('Escape', 1200)
      await p.clic('Lista', 'main', 2800)
      await p.marcar('lista', 'main')
      await p.desplazar(300, 1800)
      await p.esperar(1400)
    },
  },

  inspecciones: {
    inicio: '/panel/inspecciones',
    async hacer(p) {
      await p.esperar(2500)
      await p.marcar('resumen', 'main')
      await p.mover(900, 650, 1000)
      await p.esperar(1800)
      await p.clic('Historial', 'main', 3000)
      await p.marcar('historial', 'main')
      await p.desplazar(260, 1800)
      await p.esperar(1400)
      await p.clic('Ver resultado', 'main', 3400)
      await p.marcar('resultado', '[role=dialog]')
      await p.esperar(2200)
    },
  },
}
