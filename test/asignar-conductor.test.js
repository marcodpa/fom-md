import test from 'node:test'
import assert from 'node:assert/strict'
import { asignarPrincipal } from '../src/panel/datos/asignarConductor.js'

function escenario(fallo = '') {
 let current = { assignmentId: 'a', vehicleId: 'v', userId: 'anterior', role: 'principal' }
 const calls = []
 return { calls, actual: () => current, api: {
  conductores: async () => ({ items: current ? [current] : [] }),
  revocarAsignacion: async id => { calls.push(['retirar', id]); if(fallo === 'retirar') throw Error('Jornada abierta'); current = null },
  asignarConductor: async (vehicleId, { userId }) => {
   calls.push(['asignar', userId])
   if (userId === 'nuevo' && fallo === 'alta') throw Error('Cuenta suspendida')
   if (userId === 'nuevo' && fallo === 'concurrente') { current = {vehicleId:'v',userId:'tercero',role:'principal'}; throw Error('Conflicto') }
   current = { vehicleId, userId, role: 'principal' }
   if (userId === 'nuevo' && fallo === 'respuesta') throw Error('Respuesta perdida')
  },
 } }
}
test('cambiar conductor retira al anterior antes de asignar al elegido', async()=>{
 const s=escenario(); await asignarPrincipal(s.api,'v','nuevo')
 assert.deepEqual(s.calls,[['retirar','a'],['asignar','nuevo']]); assert.equal(s.actual().userId,'nuevo')
})
test('elegir al conductor actual no escribe', async()=>{
 const s=escenario(); await asignarPrincipal(s.api,'v','anterior'); assert.equal(s.calls.length,0)
})
test('si no se puede retirar al anterior, no intenta asignar otro', async()=>{
 const s=escenario('retirar'); await assert.rejects(asignarPrincipal(s.api,'v','nuevo'),/Jornada abierta/); assert.equal(s.actual().userId,'anterior'); assert.equal(s.calls.length,1)
})
test('si el alta falla recupera al conductor anterior e informa el error', async()=>{
 const s=escenario('alta'); await assert.rejects(asignarPrincipal(s.api,'v','nuevo'),/Se recuperó/); assert.equal(s.actual().userId,'anterior')
})
test('respuesta perdida tras alta confirmada no restaura al anterior', async()=>{
 const s=escenario('respuesta'); await asignarPrincipal(s.api,'v','nuevo'); assert.equal(s.actual().userId,'nuevo'); assert.equal(s.calls.length,2)
})
test('no deshace la asignación concurrente de otro supervisor', async()=>{
 const s=escenario('concurrente'); await assert.rejects(asignarPrincipal(s.api,'v','nuevo'),/cambió durante/); assert.equal(s.actual().userId,'tercero'); assert.equal(s.calls.length,2)
})
