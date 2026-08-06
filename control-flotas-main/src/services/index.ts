/**
 * Capa de servicios.
 *
 * Punto único de acceso a datos. Toda pantalla pide datos por aquí (nunca
 * directo a una API), de modo que migrar de mock a la API real de Juan sea
 * un cambio localizado en estas implementaciones.
 */

export { getCompanyBrands, getCompanyBrandByName, getCompanyBrandById } from './brandService';
export {
  signIn,
  crearSupervisorEmpresa,
  crearConductorEmpresa,
  crearUsuarioConRol,
  recuperarClave,
  cambiarMiClave,
  cambiarClaveUsuario,
  cerrarSesionRemota,
  listarUsuariosSistema,
  actualizarRolUsuario,
  actualizarUsuario,
  eliminarUsuario,
  eliminarUsuarioDefinitivo,
  type RolAsignable,
} from './authService';
export { getContextoLogin } from './accountService';
export { getMiPerfil, actualizarMiPerfil, type MiPerfil } from './perfilService';
export {
  getMiVehiculoActual,
  getEmparejamientoActual,
  getTelemetria,
  getMiScore,
  getSesionConduccion,
  getPosicionVehiculo,
  getMisUnidadesSecundario,
  type SesionConduccion,
} from './fleetService';
export { crearOrdenDeTrabajo, type NuevaOrdenInput } from './workOrderService';
export {
  registrarGps,
  asociarGps,
  verificarGps,
  probarPanicoGps,
  getGpsDeVehiculo,
  getGpsDisponibles,
  type RegistrarGpsInput,
} from './gpsService';
export { registrarAuditoria, getAuditoria, type RegistrarAuditoriaInput } from './auditoriaService';
export {
  getAreas,
  crearArea,
  asignarVehiculoAArea,
  asignarConductorPrincipal,
  getSecundarios,
  autorizarSecundario,
  regenerarPinSecundario,
  revocarSecundario,
  ingresarPinEnGps,
  dejarVehiculo,
} from './asignacionService';
export { getReporteFormatoPredefinida } from './formatoPredefService';
export {
  getReglasAlerta,
  crearReglaAlerta,
  evaluarReglas,
  type NuevaReglaInput,
} from './alertRuleService';
export {
  getNotificacionesPanel,
  getNotificacionesNoLeidas,
  marcarNotificacionLeida,
} from './notificationService';
export {
  getResumenFlota,
  getFlotaVehiculos,
  getVehiculosSistema,
  crearVehiculo,
  getEmpresasAsignables,
  getDocumentosAltaVehiculo,
  getVehiculo,
  crearEmpresa,
  getPredefinidas,
  asignarPredefinidas,
  getEmpresasSistema,
  actualizarEmpresa,
  setServicioEmpresa,
  eliminarEmpresa,
  actualizarVehiculo,
  eliminarVehiculo,
  DESEMPLEADOS_ID,
  esDesempleados,
  type NuevoVehiculoInput,
  type NuevaEmpresaInput,
  getMiVehiculoFlota,
  getOrdenesDeTrabajo,
  getOrdenDeTrabajo,
  actualizarEstadoOrden,
  getEmpresasDelUsuario,
  getEmpresasAsignadasA,
  getReporteGerencial,
  getReporte,
  getReporteUsuarios,
  periodoMesActual,
  getComparativaEmpresas,
  getComparativaEmpresasConColor,
  getEmpresasDelUsuarioConColor,
  getTipoEmpresa,
} from './companyService';
export {
  getPlanesPreventivos,
  getAlertasPredictivas,
  getMantenimientoResumen,
  getMantenimientoCorrectivo,
  type PlanPreventivo,
  type PlanEstado,
  type AlertaPredictiva,
  type MantenimientoResumen,
} from './maintenanceService';
export {
  getCostos,
  getResumenCostos,
  getCostosPorEmpresa,
  rangoPreset,
  CATEGORIAS_COSTO,
  type CostoItem,
  type CostoCategoria,
  type CostoClase,
  type RangoFechas,
  type RangoPreset,
  type CostoPorCategoria,
  type ResumenCostos,
  type CostoEmpresa,
} from './costService';
export {
  getUsuariosDeEmpresa,
  crearUsuarioPersonal,
  completarPerfil,
  type CompletarPerfilInput,
} from './userService';
export {
  getInspeccionDelDia,
  getInspeccionVehiculo,
  getAptitudDelDia,
  getPlantillaInspeccion,
  enviarInspeccion,
  notificarSupervisor,
  solicitarOtraUnidad,
  getResumenAvisos,
  getAlertas,
  crearAlerta,
  type NuevaAlertaInput,
  marcarAlertaLeida,
  marcarTodasAlertasLeidas,
  getDocumentosVehiculo,
  getDocumentosConductor,
  crearDocumento,
  getDocumento,
  agregarFotosDocumento,
  actualizarVencimientoDocumento,
} from './driverService';
export {
  getPagosEmpresa,
  registrarPago,
  actualizarEstadoPago,
  listarPagosSistema,
  type PagoSistema,
} from './pagoService';
export {
  enviarSOS,
  definirTipoEmergencia,
  enviarMensajeEmergencia,
  getEmergenciaActiva,
  cerrarEmergencia,
  cancelarSOS,
} from './emergencyService';
