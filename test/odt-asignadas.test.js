import assert from 'node:assert/strict'
import test from 'node:test'
import { build } from 'vite'

// T-62: «Asignadas a ti». La consola no tiene lista de ODT asignadas: se parte de las órdenes listadas,
// se pregunta por la ejecución de las que están en taller y se quedan las de la persona de la sesión.
async function cargar(conApi) {
  const output = await build({configFile:false,logLevel:'silent',
    define:{'import.meta.env.VITE_FOM_API':JSON.stringify(conApi ? '/fom-api' : '')},
    build:{write:false,lib:{entry:'src/panel/datos/odtAsignadas.js',formats:['es']},minify:false}})
  const code = output[0].output.find(f=>f.type==='chunk').code
  return import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'))
}

function respuesta(status, cuerpo) {
  return {ok:status < 400,status,text:async()=>JSON.stringify(cuerpo)}
}

const ODTS = [
  {id:'a',estado:'asignada',descripcion:'Frenos',vehiculoNombre:'Unidad 01 · Z69FC7W'},
  {id:'b',estado:'en_ejecucion',descripcion:'Luces',vehiculoNombre:'Unidad 02'},
  {id:'c',estado:'abierta',descripcion:'No está en taller'},
  {id:'d',estado:'cerrada',descripcion:'Ya resuelta'},
]

test('el tiempo trabajado cuenta solo lo que corrió el reloj', async () => {
  const m = await cargar(false)
  const eventos = [{tipo:'inicio',en:'2026-10-20T10:00:00Z'},{tipo:'pausa',en:'2026-10-20T11:00:00Z'},{tipo:'reanudacion',en:'2026-10-20T12:00:00Z'}]
  assert.equal(m.segundosTrabajados(eventos, new Date('2026-10-20T12:20:00Z')), 80 * 60)
  assert.equal(m.textoTiempo(80 * 60), '1 h 20 min')
  assert.equal(m.textoTiempo(0), 'Sin empezar')
  assert.deepEqual(m.accionesDe('asignada').map(a=>a.t), ['Iniciar trabajo'])
  assert.deepEqual(m.accionesDe('en_ejecucion').map(a=>a.t), ['Entregar','Pausar'])
  assert.deepEqual(m.accionesDe('pausada').map(a=>a.t), ['Reanudar'])
  assert.deepEqual(m.accionesDe('en_calidad'), [])
})

test('conductor: solo pregunta por las órdenes en taller y se queda con las que el servidor le contesta', async () => {
  const m = await cargar(true)
  const original = globalThis.fetch
  const pedidas = []
  globalThis.fetch = async (url) => {
    pedidas.push(url)
    if (url.endsWith('/work-orders/a/execution')) return respuesta(200, {workOrder:{status:'asignada'},assignments:[{userId:'u-1',displayName:'Aliri Alira',assignedAt:'2026-10-20T09:00:00Z',endedAt:null}],events:[],totals:{productiveSeconds:0}})
    return respuesta(404, {message:'Work order not found'})
  }
  try {
    const lista = await m.listarAsignadas({odts:ODTS, perfil:{rol:'conductor',nombre:'Aliri Alira',correo:'aliri@x.com'}})
    assert.deepEqual(lista.map(o=>o.id), ['a'])
    assert.equal(lista[0].responsable.nombre, 'Aliri Alira')
    assert.equal(pedidas.length, 2)
    assert.ok(pedidas.every(u=>/work-orders\/(a|b)\/execution$/.test(u)))
  } finally { globalThis.fetch = original }
})

test('supervisor: compara el responsable con su identificador y un 403 esconde la sección', async () => {
  const m = await cargar(true)
  const original = globalThis.fetch
  try {
    globalThis.fetch = async (url) => {
      if (/\/users\?/.test(url)) return respuesta(200, {items:[{userId:'u-yo',email:'Yo@Empresa.com'}]})
      const id = url.match(/work-orders\/(\w)\/execution/)[1]
      return respuesta(200, {workOrder:{status:id === 'a' ? 'asignada' : 'en_ejecucion'},assignments:[{userId:id === 'b' ? 'u-yo' : 'u-otro',displayName:'X',endedAt:null}],events:[],totals:{productiveSeconds:600}})
    }
    const mias = await m.listarAsignadas({odts:ODTS, perfil:{rol:'supervisor',correo:'yo@empresa.com',nombre:'Yo'}})
    assert.deepEqual(mias.map(o=>[o.id,o.estado,o.segundos]), [['b','en_ejecucion',600]])

    globalThis.fetch = async () => respuesta(403, {message:'Forbidden'})
    assert.equal(await m.listarAsignadas({odts:ODTS, perfil:{rol:'conductor'}}), null)
    // Un fallo que no es de permiso sí se avisa (con reintento en pantalla).
    globalThis.fetch = async () => respuesta(500, {message:'boom'})
    await assert.rejects(m.listarAsignadas({odts:ODTS, perfil:{rol:'conductor'}}))
  } finally { globalThis.fetch = original }
})

test('los eventos viajan con el estado que se vio, una clave nueva y la nota que escribió quien trabaja', async () => {
  const m = await cargar(true)
  const original = globalThis.fetch
  const cuerpos = []
  globalThis.fetch = async (url, op) => { cuerpos.push({url, cuerpo:JSON.parse(op.body)}); return respuesta(201, {event:{toStatus:'pausada'}}) }
  try {
    // T-70: pausar y entregar sin nota no salen al servidor (ya no se rellena «Trabajo pausado desde la web»).
    await assert.rejects(m.registrarEvento({id:'b',estado:'en_ejecucion'}, 'pausa'), /motivo de la pausa/)
    await assert.rejects(m.registrarEvento({id:'b',estado:'en_ejecucion'}, 'pausa', 'ok'))
    await assert.rejects(m.registrarEvento({id:'b',estado:'en_ejecucion'}, 'entrega', ''), /qué se hizo/)
    assert.equal(cuerpos.length, 0)

    const r = await m.registrarEvento({id:'b',estado:'en_ejecucion'}, 'pausa', '  Falta el repuesto  ')
    assert.equal(r.estado, 'pausada')
    assert.match(cuerpos[0].url, /\/api\/v1\/console\/work-orders\/b\/execution-events$/)
    assert.equal(cuerpos[0].cuerpo.action, 'pausa')
    assert.equal(cuerpos[0].cuerpo.expectedStatus, 'en_ejecucion')
    assert.match(cuerpos[0].cuerpo.clientEventId, /^[0-9a-f-]{36}$/)
    assert.equal(cuerpos[0].cuerpo.note, 'Falta el repuesto')
    // Iniciar no pide nota: si no la hay, no viaja ninguna inventada.
    await m.registrarEvento({id:'a',estado:'asignada'}, 'inicio')
    assert.equal(cuerpos[1].cuerpo.action, 'inicio')
    assert.equal('note' in cuerpos[1].cuerpo, false)
  } finally { globalThis.fetch = original }
})

test('textos del momento y nota que pide cada acción, iguales a la app', async () => {
  const m = await cargar(false)
  assert.deepEqual(Object.fromEntries(Object.entries(m.MOMENTOS).map(([k, v]) => [k, v.t])), {
    asignada: 'Sin iniciar',
    en_ejecucion: 'Trabajo en curso',
    pausada: 'Trabajo pausado',
    en_calidad: 'Entregada: la revisa el supervisor',
  })
  assert.deepEqual(m.accionesDe('en_ejecucion').map(a=>[a.t, a.pideNota]), [['Entregar','Qué se hizo'],['Pausar','Motivo de la pausa']])
  assert.equal(m.accionesDe('asignada')[0].pideNota, undefined)
})

test('demo: el conductor de prueba tiene órdenes asignadas y las puede trabajar', async () => {
  const m = await cargar(false)
  const conductor = {id:'usr-002',rol:'conductor',nombre:'Carlos Méndez'}
  const lista = await m.listarAsignadas({odts:[], perfil:conductor})
  assert.ok(lista.length >= 1)
  const porEmpezar = lista.find(o=>o.estado === 'asignada')
  assert.equal(porEmpezar.responsable.nombre, 'Carlos Méndez')
  await m.registrarEvento(porEmpezar, 'inicio')
  await assert.rejects(m.registrarEvento(porEmpezar, 'inicio'))
  const despues = await m.listarAsignadas({odts:[], perfil:conductor})
  assert.equal(despues.find(o=>o.id === porEmpezar.id).estado, 'en_ejecucion')
  await m.registrarEvento({...porEmpezar,estado:'en_ejecucion'}, 'entrega', 'Pastillas cambiadas')
  const final = await m.listarAsignadas({odts:[], perfil:conductor})
  assert.equal(final.find(o=>o.id === porEmpezar.id).estado, 'en_calidad')
  // El supervisor de prueba no tiene ninguna: la sección no aparece.
  assert.deepEqual(await m.listarAsignadas({odts:[], perfil:{id:'usr-001',rol:'supervisor'}}), [])
})

// T-78: en Mantenimiento las órdenes van siempre de la más nueva a la más vieja (por cuándo se reportaron).
test('masNuevasPrimero: de la más nueva a la más vieja, sin fecha al final y sin tocar la lista original', async () => {
  const m = await cargar(false)
  const lista = [
    {id:'vieja',creadaEn:'2026-10-01T08:00:00Z'},
    {id:'sin-fecha'},
    {id:'nueva',creadaEn:'2026-10-20T08:00:00Z'},
    {id:'mala',creadaEn:'no es fecha'},
    {id:'media',creadaEn:'2026-10-10T08:00:00Z'},
  ]
  assert.deepEqual(m.masNuevasPrimero(lista).map(o=>o.id), ['nueva','media','vieja','sin-fecha','mala'])
  assert.equal(lista[0].id, 'vieja')
  assert.deepEqual(m.masNuevasPrimero(null), [])
})

test('«Asignadas a ti» también sale de la más nueva a la más vieja', async () => {
  const m = await cargar(true)
  const original = globalThis.fetch
  globalThis.fetch = async () => {
    return respuesta(200, {workOrder:{status:'asignada'},assignments:[{userId:'u-1',displayName:'Aliri Alira',endedAt:null}],events:[],totals:{productiveSeconds:0}})
  }
  try {
    const odts = [
      {id:'a',estado:'asignada',descripcion:'Vieja',creadaEn:'2026-10-02T10:00:00Z'},
      {id:'b',estado:'pausada',descripcion:'Nueva',creadaEn:'2026-10-19T10:00:00Z'},
      {id:'c',estado:'en_ejecucion',descripcion:'Media',creadaEn:'2026-10-10T10:00:00Z'},
    ]
    const lista = await m.listarAsignadas({odts, perfil:{rol:'conductor',nombre:'Aliri Alira'}})
    assert.deepEqual(lista.map(o=>o.id), ['b','c','a'])
    assert.equal(lista[0].creadaEn, '2026-10-19T10:00:00Z')
  } finally { globalThis.fetch = original }

  const demo = await cargar(false)
  const delConductor = await demo.listarAsignadas({odts:[], perfil:{id:'usr-002',rol:'conductor',nombre:'Carlos Méndez'}})
  const fechas = delConductor.map(o=>Date.parse(o.creadaEn))
  assert.deepEqual(fechas, [...fechas].sort((a,b)=>b-a))
})
