// Los estilos de los módulos de la consola, en el MISMO orden en que se
// cargaban cuando Consola.jsx importaba los módulos de forma directa.
//
// Los módulos ahora se bajan bajo demanda (React.lazy), pero su CSS no puede:
// un CSS que llega tarde se pega al final de la página y le gana en la cascada
// a movil-app.css y movimiento.css, que tienen que ir los últimos (T-184).
// Por eso el CSS se queda aquí, fijo, y solo el JavaScript se reparte.
// Un CSS nuevo de un módulo puede quedarse en el módulo: se carga con él.
import './quitador/quitar-fondo.css'
import './comp/fotos-de.css'
import './comp/score-manejo.css'
import '../styles/fleet-map.css'
import '../styles/mapa-mapbox.css'
import './comp/eventos-manejo.css'
import '../styles/control-map.css'
import '../styles/movil-modulos.css'
import '../styles/supervisor-movil.css'
import '../styles/vehiculos-movil.css'
import './comp/archivos.css'
import './modulos/documentos.css'
import './modulos/expediente-unidad.css'
import '../styles/mi-unidad-movil.css'
import './modulos/mantenimiento.css'
import '../styles/mantenimiento-movil.css'
import './modulos/sos-conductor.css'
import './modulos/inspecciones.css'
import './modulos/usuarios-perfil.css'
import './comp/fotos-identidad.css'
import './modulos/alertas-conductor.css'
import './modulos/perfil-alertas.css'
import './modulos/informe/informe.css'
import './modulos/reportes.css'
import './modulos/empresas.css'
import './modulos/admin-gps.css'
import './modulos/admin-rediseno.css'
import './modulos/inspeccion-conductor.css'
import './modulos/otra-unidad.css'
import './comp/editar-mis-datos.css'
import '../styles/perfil-movil.css'
import './modulos/admin-vehiculos.css'
