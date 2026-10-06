import test from 'node:test'
import assert from 'node:assert/strict'
import { presentarHistorial } from '../src/panel/datos/historial-odt.js'
import { listarTodasOdts } from '../src/panel/datos/listar-odts.js'

const en = '2026-10-05T12:23:00Z'
test('la asignación y la operación de taller aparecen una sola vez y conservan notas distintas', () => {
  const cambios = [{ de:'aprobada', a:'asignada', actor:'Supervisor', en, nota:'Responsable elegido' },
    { de:'asignada', a:'en_ejecucion', actor:'Supervisor', en:'2026-10-05T12:24:00Z', nota:'Inicio de taller' }]
  const ejecucion = { responsable:{nombre:'Ana',desde:en}, eventos:[{tipo:'inicio',de:'asignada',a:'en_ejecucion',actor:'Supervisor',en:'2026-10-05T12:24:00.500Z',nota:'Revisión de frenos'}] }
  const resultado = presentarHistorial({}, cambios, ejecucion)
  assert.equal(resultado.length,2)
  assert.equal(resultado[0].responsable,'Ana')
  assert.equal(resultado[1].titulo,'Trabajo iniciado')
  assert.deepEqual(resultado[1].notas,['Inicio de taller','Revisión de frenos'])
  assert.equal(cambios[1].nota,'Inicio de taller')
})
test('no se juntan operaciones de distintas horas o personas ni se ocultan reaperturas', () => {
  const cambios = [{de:'asignada',a:'en_ejecucion',actor:'Ana',en}, {de:'cerrada',a:'en_revision',actor:'Ana',en:'2026-10-06T12:00:00Z'}]
  const eventos = [{tipo:'inicio',de:'asignada',a:'en_ejecucion',actor:'Luis',en}, {tipo:'inicio',de:'asignada',a:'en_ejecucion',actor:'Ana',en:'2026-10-05T13:00:00Z'}]
  const resultado = presentarHistorial({},cambios,{eventos})
  assert.equal(resultado.length,4)
  assert.equal(resultado.at(-1).titulo,'Orden reabierta')
})
test('ausencias no inventan autor o fecha ni llevan la solución actual a un cierre antiguo', () => {
  const resultado = presentarHistorial({notaSolucion:'Solución actual'},[{de:'en_calidad',a:'cerrada',en:null,nota:'Cierre anterior'}])
  assert.equal(resultado[0].actor,null)
  assert.equal(resultado[0].fechaValida,false)
  assert.deepEqual(resultado[0].notas,['Cierre anterior'])
})
test('consulta todas las páginas conservando filtros y quitando solapamientos', async () => {
  const llamadas=[]
  const resultado=await listarTodasOdts({odts:async p => {
    llamadas.push(p)
    return {items:Array.from({length:p.desplazamiento===0?100:2},(_,i)=>({id:String(p.desplazamiento+i)})),page:{total:102}}
  }},{estado:'cerrada'})
  assert.equal(resultado.length,102)
  assert.deepEqual(llamadas.map(p=>[p.estado,p.desplazamiento]),[['cerrada',0],['cerrada',100]])
})
test('una página repetida se informa y no produce un bucle ni un listado incompleto silencioso', async () => {
  await assert.rejects(listarTodasOdts({odts:async()=>({items:Array.from({length:100},(_,i)=>({id:String(i)}))})}),/repitió una página/)
})
