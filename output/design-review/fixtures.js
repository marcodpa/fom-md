// Fixtures de la revisión visual local. Este archivo no se importa en producción.
export function applyReviewFixtures(repo) {
  const ahora = new Date().toISOString()
  const filtro = (rows, key = 'estado') => async (p = {}) => rows.filter(x => !p[key] || x[key] === p[key])
  repo.conductores = async () => {
    const [persona] = await repo.personal.listar({ soloConductores: true })
    const [vehiculo] = await repo.vehiculos.listar()
    return persona && vehiculo ? [{ id: persona.id, nombre: persona.nombre, vehiculoId: vehiculo.id, rol: 'principal', desde: ahora }] : []
  }
  repo.jornadas.listar = filtro([{ id:'review-j1', conductor:'Elena Rojas', vehiculo:'FOM-024', placa:'DEMO-024', estado:'active', inicio:ahora, rol:'principal', origen:'pin' }])
  const planes = [{id:'review-plan',codigo:'aceite-5000',servicio:'Cambio de aceite',cadaKm:5000,cadaDias:90,unidades:12,estrategia:'combined',criticidad:'medium',activo:true}]
  repo.planes.listar = async () => planes
  repo.planes.acciones = async () => []
  repo.programaInspecciones.citas = filtro([{id:'review-cita',vehiculo:'FOM-024',placa:'DEMO-024',plantilla:'Revisión preoperacional',asignadoA:'Elena Rojas',fecha:ahora,estado:'programada'}])
  repo.programaInspecciones.hallazgos = async () => []
  repo.programaInspecciones.plantillas = async () => []
  const transferencias = [{id:'review-transfer',origenId:'transporte-lago-sur',destinoId:'review-destino',rolDestino:'supervisor',estado:'pending',motivo:'Reasignación operativa de ejemplo',creadaEn:ahora,liberadaEn:ahora}]
  repo.transferencias.identidad.listar = filtro(transferencias)
  repo.transferencias.vehiculo.listar = async () => []
  repo.admin.plataforma.personas = async () => {
    const [persona] = await repo.personal.listar({ soloConductores: true })
    return Object.assign(persona ? [{...persona,userId:persona.id,empresaNombre:'Empresa de ejemplo',empresaCodigo:'DEMO',rol:'conductor',estado:'active'}] : [],{total:persona ? 1 : 0})
  }
  repo.admin.gps.sinEmparejar = async () => [{imei:'DEMO-4821',mensajes:12,transporte:'tcp',primeraVez:ahora,ultimaVez:ahora,reportando:true}]
}
