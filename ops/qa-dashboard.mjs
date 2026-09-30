// Prueba opt-in contra la sesión local: nunca se ejecuta desde npm test.
// Solo crea registros PRUEBA QA. Conserva un registro para no repetir altas.
import fs from 'node:fs/promises'
import { build } from 'vite'
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'

if (process.env.FOM_QA_WRITE !== '1') throw new Error('Requiere FOM_QA_WRITE=1 y una sesión autorizada en el proxy local.')
const output = 'docs/qa-dashboard/ejecucion.json'
await fs.mkdir('docs/qa-dashboard', { recursive: true })
const ledger = await fs.readFile(output, 'utf8').then(JSON.parse).catch(() => ({ run: `qa-${Date.now()}`, ids: {}, checks: [] }))
const base = 'http://127.0.0.1:5174/fom-api'
// Node no añade Origin como lo hace el navegador. Se conserva el contrato
// CSRF y la sesión autenticada del proxy; no se usan credenciales internas.
const nativeFetch = globalThis.fetch
globalThis.fetch = (url, options = {}) => nativeFetch(url, { ...options, headers: { ...options.headers, origin: 'http://127.0.0.1:5174' } })
const bundle = await build({ root: process.cwd(), logLevel: 'error', define: { 'import.meta.env.VITE_FOM_API': JSON.stringify(base) }, build: { write: false, lib: { entry: 'src/panel/datos/repo.js', formats: ['es'], fileName: 'qa' } } })
const { repo } = await import('data:text/javascript;base64,' + Buffer.from(bundle[0].output[0].code).toString('base64'))
const save = () => fs.writeFile(output, JSON.stringify(ledger, null, 2))
async function check(name, fn) {
  try { const result = await fn(); ledger.checks.push({ name, status: 'PASS', at: new Date().toISOString() }); await save(); console.log('PASS', name); return result }
  catch (e) { ledger.checks.push({ name, status: 'FAIL', error: e.message, at: new Date().toISOString() }); await save(); console.log('FAIL', name, e.message); return null }
}
async function request(path, method = 'GET', body) {
 const r = await fetch(base + '/api/v1/console/' + path, { method, headers: method === 'GET' ? undefined : {'content-type':'application/json','x-fom-csrf':'fom-browser-v1','idempotency-key':randomUUID()}, body: body ? JSON.stringify(body) : undefined })
 const data = await r.json(); if(!r.ok) throw new Error(`${r.status}: ${JSON.stringify(data.message)}`); return data
}
const session = await request('auth/session')
assert.equal(session.authenticated, true)
assert.equal(session.user.tenantId, '996e4f53-a9a2-4052-98ee-e84f837b5c4b')
const id = ledger.ids
const phase = process.argv[2] || 'create'
if (phase === 'create') {
 if (!id.vehicle) await check('Vehículo: crear y recuperar expediente', async () => { const r=await repo.vehiculos.crear({alias:`PRUEBA QA ${ledger.run}`,placa:'QA092926',marca:'QA',modelo:'PRUEBA NO OPERATIVA',tipo:'otro'}); assert.ok(r.id); id.vehicle=r.id; await save(); const v=await repo.vehiculos.obtener(r.id); assert.equal(v.placa,'QA092926') })
 if (!id.user) await check('Personal: crear conductor de prueba y consultar directorio', async () => { const r=await repo.admin.usuarios.crear({nombre:`PRUEBA QA ${ledger.run}`,email:`${ledger.run}@example.invalid`,rol:'conductor',clave:randomUUID()+'-Qa!'}); assert.ok(r.id); id.user=r.id; await save(); assert.ok((await repo.admin.usuarios.listar()).some(u=>u.id===r.id)) })
 if (!id.plan) await check('Plan: código con acentos, creación y lectura', async () => { const r=await repo.planes.guardar({codigo:`PRUEBA QA revisión ${ledger.run}`,servicio:`PRUEBA QA ${ledger.run}`,estrategia:'fixed',cadaKm:5000,criticidad:'low'}); id.plan=r.id; await save(); assert.ok((await repo.planes.listar()).some(p=>p.id===r.id)) })
 if (id.vehicle && id.plan) await check('Plan: cobertura y kilometraje cero', async()=>{await repo.planes.cubrirUnidad(id.plan,id.vehicle,{ultimoServicioKm:0,proximoKm:5000});const d=await request(`maintenance/plans/${id.plan}`);assert.ok(JSON.stringify(d).includes(id.vehicle))})
 if (id.vehicle && !id.action) await check('Acción preventiva: crear y consultar',async()=>{const r=await repo.planes.crearAccion({vehiculoId:id.vehicle,planId:id.plan,ciclo:1,titulo:`PRUEBA QA ${ledger.run}`,detalle:'PRUEBA QA sin intervención física, validación del panel',venceKm:5000,costo:0,moneda:'USD'});id.action=r.id;await save();assert.ok((await repo.planes.acciones({vehiculoId:id.vehicle})).some(a=>a.id===r.id))})
 if(id.action&&!id.odt) await check('ODT desde acción: crear y conservar vínculo',async()=>{const a=(await repo.planes.acciones({vehiculoId:id.vehicle})).find(a=>a.id===id.action);const r=await repo.planes.odtDesdeAccion(a);id.odt=r.id;await save();assert.ok(r.id);const updated=(await repo.planes.acciones({vehiculoId:id.vehicle})).find(a=>a.id===id.action);assert.equal(updated.odtId,r.id)})
 if(id.vehicle&&id.user&&!id.assigned) await check('Conductor: asignar a vehículo QA',async()=>{await repo.vehiculos.asignarConductor(id.vehicle,id.user);id.assigned=true;await save();assert.equal((await repo.vehiculos.obtener(id.vehicle)).conductorPrincipalId,id.user)})
 if(id.vehicle&&!id.document) await check('Documento: registrar y consultar',async()=>{const r=await repo.documentos.crear({ambito:'vehiculo',vehiculoId:id.vehicle,tipo:'rcv',numero:ledger.run,emitidoEn:'2026-09-29',venceEn:'2027-09-29',notas:'PRUEBA QA sin validez documental'});id.document=r.id;await save();assert.ok((await repo.documentos.listar({vehiculoId:id.vehicle})).some(d=>d.id===r.id))})
 if(!id.rule) await check('Alerta: crear regla desactivada de prueba',async()=>{const r=await repo.reglas.crear({tipo:'velocidad',umbralKmh:199,activa:false});id.rule=r.id;await save();assert.ok((await repo.reglas.listar()).some(g=>g.id===r.id&&!g.activa))})
}
if (phase === 'operations') {
 await check('Vehículo: editar alias y comprobar lectura', async()=>{await repo.vehiculos.set(id.vehicle,{alias:`PRUEBA QA ${ledger.run} verificada`});assert.match((await repo.vehiculos.obtener(id.vehicle)).alias,/verificada/)})
 await check('Documento: actualizar vencimiento y leer',async()=>{await repo.documentos.actualizarVencimiento(id.document,'2027-10-01');assert.equal((await repo.documentos.listar({vehiculoId:id.vehicle})).find(d=>d.id===id.document).venceEn.slice(0,10),'2027-10-01')})
 await check('Alerta: asignar únicamente vehículo QA y activar/desactivar',async()=>{await repo.reglas.set(id.rule,{vehiculoIds:[id.vehicle],activa:true});assert.equal((await repo.reglas.listar()).find(r=>r.id===id.rule).vehiculos,1);await repo.reglas.set(id.rule,{activa:false});assert.equal((await repo.reglas.listar()).find(r=>r.id===id.rule).activa,false)})
 if(!id.template) await check('Inspecciones: crear borrador y publicar plantilla',async()=>{const r=await repo.programaInspecciones.crearPlantilla({codigo:ledger.run,nombre:`PRUEBA QA ${ledger.run}`,puntos:[{nombre:'PRUEBA QA comprobación visual',critico:false}]});assert.ok(r.id);id.template=r.id;await save();await repo.programaInspecciones.cambiarPlantilla({id:r.id,estado:'borrador'},'publicada');assert.equal((await repo.programaInspecciones.plantillas()).find(t=>t.id===r.id).estado,'publicada')})
 if(id.template&&!id.schedule) await check('Inspecciones: programar cita QA',async()=>{const r=await repo.programaInspecciones.programar({vehiculoId:id.vehicle,plantillaId:id.template,asignadoA:id.user,fecha:new Date(Date.now()+86400000).toISOString()});assert.ok(r.id);id.schedule=r.id;await save();assert.ok((await repo.programaInspecciones.citas()).some(c=>c.id===r.id))})
 if(id.schedule&&!id.scheduleCancelled) await check('Inspecciones: cancelar cita QA',async()=>{await repo.programaInspecciones.cancelar(id.schedule,'prueba-qa-finalizada');assert.equal((await repo.programaInspecciones.citas()).find(c=>c.id===id.schedule).estado,'cancelada');id.scheduleCancelled=true})
 if(!id.tenant) await check('Empresas: crear empresa QA',async()=>{const r=await repo.admin.empresas.crear({nombre:`PRUEBA QA ${ledger.run}`,tipo:'estandar'});assert.ok(r.id);id.tenant=r.id;await save();assert.ok((await repo.admin.empresas.listar()).some(t=>t.id===r.id))})
 if(id.tenant&&!id.vehicleTransfer) await check('Transferencia vehículo: abrir solicitud y cancelar',async()=>{const r=await repo.transferencias.vehiculo.crear({vehiculoId:id.vehicle,origenId:session.user.tenantId,destinoId:id.tenant,codigoDestino:ledger.run,motivo:'prueba-qa'});assert.ok(r.id);id.vehicleTransfer=r.id;await save();const t=(await repo.transferencias.vehiculo.listar()).find(t=>t.id===r.id);await repo.transferencias.vehiculo.decidir(t,'cancellation','prueba-qa-finalizada')})
 if(id.tenant&&!id.identityTransfer) await check('Transferencia persona: abrir solicitud y cancelar',async()=>{const r=await repo.transferencias.identidad.crear({usuarioId:id.user,origenId:session.user.tenantId,destinoId:id.tenant,rolDestino:'conductor',motivo:'prueba-qa'});assert.ok(r.id);id.identityTransfer=r.id;await save();const t=(await repo.transferencias.identidad.listar()).find(t=>t.id===r.id);await repo.transferencias.identidad.decidir(t,'cancellation','prueba-qa-finalizada')})
 await check('Pagos: lectura real de empresas',async()=>{assert.ok(Array.isArray(await repo.admin.pagos.listar({})))})
 if(id.tenant&&!id.payment) await check('Pagos: crear cuota QA y anularla sin cobro',async()=>{const r=await repo.admin.pagos.registrar({empresaId:id.tenant,periodo:'2026-09',monto:1,venceEn:'2026-10-30',nota:'PRUEBA QA SIN COBRO REAL'});const p=(await repo.admin.pagos.listar({empresaId:id.tenant}))[0];assert.ok(p);id.payment=p.id;await save();await repo.admin.pagos.actualizarEstado(p.id,'anulado',null,p);assert.equal((await repo.admin.pagos.listar({empresaId:id.tenant}))[0].estado,'anulado')})
 await check('Notificaciones: leer y descartar solo aviso de ODT QA',async()=>{const n=(await repo.alertas.listar()).find(n=>n.odtId===id.odt);assert.ok(n);await repo.alertas.marcarLeida(n.id);await repo.alertas.descartar(n.id);assert.ok(!(await repo.alertas.listar()).some(x=>x.id===n.id))})
 await check('Auditoría: registros de las pruebas presentes',async()=>{const logs=await repo.admin.auditoria.listar({});assert.ok(logs.some(x=>JSON.stringify(x).includes(id.vehicle.slice(0,8))))})
}
if (phase === 'odt') {
  const actor = (await request('users?limit=200')).items.find(u => u.email === session.user.email)
  assert.ok(actor?.userId)
  await check('ODT: revisión y aprobación',async()=>{let o=await repo.odts.obtener(id.odt);for(const [from,to] of [['abierta','en_revision'],['en_revision','aprobada']]){if(o.estado===from){await repo.odts.cambiarEstado(id.odt,to,{estadoActual:from,nota:'PRUEBA QA transición sin trabajo físico'});o=await repo.odts.obtener(id.odt);assert.equal(o.estado,to)}}})
  await check('ODT: asignar responsable',async()=>{const o=await repo.odts.obtener(id.odt);if(o.estado==='aprobada')await repo.odts.asignarResponsable(id.odt,{usuarioId:actor.userId,nota:'PRUEBA QA'});const e=await repo.odts.ejecucion(id.odt);assert.equal(e.responsable.id,actor.userId)})
  for(const [from,to,action] of [['asignada','en_ejecucion','inicio'],['en_ejecucion','pausada','pausa'],['pausada','en_ejecucion','reanudacion'],['en_ejecucion','en_calidad','entrega']]) await check(`ODT: ${action}`,async()=>{const o=await repo.odts.obtener(id.odt);if(o.estado===from){await repo.odts.ejecutar(o,action,'PRUEBA QA verificación funcional');assert.equal((await repo.odts.obtener(id.odt)).estado,to)}else throw new Error(`Estado actual ${o.estado}, se esperaba ${from}`)})
  await check('ODT: cerrar con resolución y verificar acción vinculada',async()=>{const o=await repo.odts.obtener(id.odt);if(o.estado==='en_calidad')await repo.odts.cambiarEstado(id.odt,'cerrada',{estadoActual:o.estado,nota:'PRUEBA QA cierre',notaSolucion:'PRUEBA QA finalizada sin reparación física ni gasto',costo:0,moneda:'USD',odometro:0});assert.equal((await repo.odts.obtener(id.odt)).estado,'cerrada');const a=(await repo.planes.acciones({vehiculoId:id.vehicle})).find(a=>a.id===id.action);assert.equal(a.estado,'completed')})
}
if (phase === 'inventory') {
 if(!id.area) await check('Áreas: crear área QA y vincular unidad',async()=>{const r=await repo.areas.crear(session.user.tenantId,{nombre:`PRUEBA QA ${ledger.run}`,tipo:'ubicacion'});assert.ok(r.id);id.area=r.id;await save();await repo.vehiculos.asignarArea(id.vehicle,r.id);assert.equal((await repo.vehiculos.obtener(id.vehicle)).areaId,r.id)})
 if(!id.gps) await check('GPS: registrar equipo QA de inventario sin telemetría',async()=>{const r=await repo.admin.gps.registrar({imei:'000000000092926',modelo:`PRUEBA QA ${ledger.run}`,protocolo:'coban-gps103',fabricante:'PRUEBA QA SIN EQUIPO FISICO'});assert.ok(r.id);id.gps=r.id;await save();assert.ok((await repo.admin.gps.listar()).some(g=>g.id===r.id))})
 if(id.gps&&!id.gpsRemoved) await check('GPS: instalar, comprobar y desmontar del vehículo QA',async()=>{await repo.admin.gps.asociar(id.gps,id.vehicle,'PRUEBA QA sin dispositivo físico');assert.equal((await repo.admin.gps.listar()).find(g=>g.id===id.gps).vehiculoId,id.vehicle);const d=await request('gps-devices');const g=d.devices.find(g=>g.id===id.gps);console.log('GPS fields',Object.keys(g));id.installation=g.installationId??g.activeInstallationId;if(!id.installation)throw new Error('Falta installationId en inventario para desmontar');await save();await repo.admin.gps.desmontar(id.installation,'PRUEBA QA finalizada');id.gpsRemoved=true})
 await check('Personal: suspender y reactivar únicamente cuenta QA',async()=>{await repo.admin.usuarios.suspender(id.user,'prueba-qa');assert.equal((await repo.admin.usuarios.listar()).find(u=>u.id===id.user).estado,'suspended');await repo.admin.usuarios.reactivar(id.user,'prueba-qa');assert.equal((await repo.admin.usuarios.listar()).find(u=>u.id===id.user).estado,'active')})
 await check('Conductor: retirar asignación QA',async()=>{await repo.vehiculos.asignarConductor(id.vehicle,null);assert.equal((await repo.vehiculos.obtener(id.vehicle)).conductorPrincipalId,null);id.assigned=false})
}
if (phase === 'final-flows') {
 await check('Área: asignar y filtrar flota',async()=>{await repo.vehiculos.asignarArea(id.vehicle,id.area);const rows=await repo.vehiculos.listar({areaId:id.area});assert.ok(rows.some(v=>v.id===id.vehicle));assert.ok(rows.every(v=>v.areaId===id.area))})
 await check('GPS: desmontar instalación QA identificada en auditoría',async()=>{const audit=await request('audit?limit=200');const a=audit.items.find(a=>a.action==='gps_device.install'&&a.changes?.gpsDeviceId===id.gps);assert.ok(a);id.installation=a.entityId;await save();await repo.admin.gps.desmontar(a.entityId,'PRUEBA QA finalizada');id.gpsRemoved=true;await repo.admin.gps.set(id.gps,{estado:'inactive'});assert.equal((await repo.admin.gps.listar()).find(g=>g.id===id.gps).vehiculoId,null)})
 for(const type of ['vehiculo','identidad']) await check(`Transferencia ${type}: solicitud libre de asignaciones y cancelación`,async()=>{const r=await repo.transferencias[type].crear(type==='vehiculo'?{vehiculoId:id.vehicle,origenId:session.user.tenantId,destinoId:id.tenant,codigoDestino:ledger.run,motivo:'prueba-qa'}:{usuarioId:id.user,origenId:session.user.tenantId,destinoId:id.tenant,rolDestino:'conductor',motivo:'prueba-qa'});assert.ok(r.id);id[type+'Transfer']=r.id;await save();const t=(await repo.transferencias[type].listar()).find(t=>t.id===r.id);await repo.transferencias[type].decidir(t,'cancellation','prueba-qa-finalizada')})
 await check('Personal: actualizar nombre de prueba',async()=>{await repo.admin.usuarios.actualizarPerfil(id.user,{nombre:`PRUEBA QA ${ledger.run} verificado`});assert.ok((await repo.admin.usuarios.listar()).find(u=>u.id===id.user).nombre.includes('verificado'))})
}
if (phase === 'transfer-active') {
 await repo.admin.empresas.setServicio(id.tenant,true)
 await repo.admin.usuarios.reactivar(id.user,'prueba-qa-transferencia')
 if(!id.transferVehicle){const r=await repo.vehiculos.crear({alias:`PRUEBA QA traslado ${ledger.run}`,placa:'QAT0929',marca:'QA',modelo:'SIN OPERACION',tipo:'otro'});id.transferVehicle=r.id;await save()}
 for(const type of ['vehiculo','identidad']) await check(`Transferencia ${type}: destino activo, creación y cancelación`,async()=>{const r=await repo.transferencias[type].crear(type==='vehiculo'?{vehiculoId:id.transferVehicle,origenId:session.user.tenantId,destinoId:id.tenant,codigoDestino:ledger.run,motivo:'prueba-qa'}:{usuarioId:id.user,origenId:session.user.tenantId,destinoId:id.tenant,rolDestino:'conductor',motivo:'prueba-qa'});assert.ok(r.id);id[type+'Transfer']=r.id;await save();const t=(await repo.transferencias[type].listar()).find(t=>t.id===r.id);await repo.transferencias[type].decidir(t,'cancellation','prueba-qa-finalizada');assert.notEqual((await repo.transferencias[type].listar()).find(t=>t.id===r.id).estado,'pending')})
 await check('Limpieza final: vehículo adicional archivado',async()=>{await repo.vehiculos.archivar(id.transferVehicle,{estadoActual:'active',motivo:'prueba-qa-finalizada'})})
 await repo.admin.usuarios.suspender(id.user,'prueba-qa-finalizada')
 await repo.admin.empresas.setServicio(id.tenant,false)
 await check('Limpieza final: área archivada',async()=>{await repo.areas.set(id.area,{estado:'archived'})})
}
if (phase === 'cleanup') {
 await check('Personal: nombre corregido y suspensión QA',async()=>{await repo.admin.usuarios.actualizarPerfil(id.user,{nombre:`PRUEBA QA ${ledger.run} verificado`});assert.ok((await repo.admin.usuarios.listar()).find(u=>u.id===id.user).nombre.includes('verificado'));await repo.admin.usuarios.suspender(id.user,'prueba-qa-finalizada');assert.equal((await repo.admin.usuarios.listar()).find(u=>u.id===id.user).estado,'suspended')})
 await check('Limpieza: archivar documento QA',async()=>{await repo.documentos.archivar(id.document)})
 await check('Limpieza: retirar cobertura y desactivar plan QA',async()=>{await repo.planes.quitarUnidad(id.plan,id.vehicle);const p=(await repo.planes.listar()).find(p=>p.id===id.plan);await repo.planes.guardar({...p,activo:false});assert.equal((await repo.planes.listar()).find(p=>p.id===id.plan).activo,false)})
 await check('Limpieza: archivar plantilla QA',async()=>{const t=(await repo.programaInspecciones.plantillas()).find(t=>t.id===id.template);if(t.estado!=='archivada')await repo.programaInspecciones.cambiarPlantilla(t,'archivada')})
 await check('Limpieza: archivar vehículo QA',async()=>{await repo.vehiculos.archivar(id.vehicle,{estadoActual:'active',motivo:'prueba-qa-finalizada'})})
 await check('Limpieza: desactivar área QA',async()=>{await repo.areas.set(id.area,{estado:'inactive'})})
 await check('Limpieza: comprobar cuota QA y anular si persiste',async()=>{const p=(await repo.admin.pagos.listar({empresaId:id.tenant})).find(p=>p.id===id.payment);console.log('Cuota QA:',p ? p.estado : 'no encontrada');if(p&&p.estado!=='anulado')await repo.admin.pagos.actualizarEstado(p.id,'anulado',null,p)})
 await check('Limpieza: suspender empresa QA',async()=>{await repo.admin.empresas.setServicio(id.tenant,false);assert.equal((await repo.admin.empresas.listar()).find(t=>t.id===id.tenant).servicioActivo,false)})
 await check('Empresas: filtros por nombre y tipo',async()=>{const rows=await repo.admin.empresas.listar({q:ledger.run,tipo:'estandar'});assert.equal(rows.length,1);assert.equal(rows[0].id,id.tenant)})
}
await save()


