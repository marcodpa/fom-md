import { useState } from 'react'
import { Link } from 'react-router-dom'
import repo from '../datos/repo'
import { useDatos } from '../useDatos'
import { cerrarSesion, salirEmpresa } from '../auth'
import Avatar from '../comp/Avatar'
import { Modal } from '../comp/ui'
import { useMovil } from '../comp/movil-navegacion'
import { Icono } from '../Iconos'
import * as f from '../datos/formato'
import '../../styles/perfil-movil.css'
import '../../styles/supervisor-movil.css'

// ============================================================
// MI PERFIL DEL SUPERVISOR EN EL TELÉFONO — `panel/mas.tsx` de la app
// ------------------------------------------------------------
// La portada, el retrato, «rol · empresa», lo más usado a un toque, el tamaño
// de lo que opera (unidades, personal y áreas, cada cifra abre su pestaña),
// «Mi información», los accesos, «Cambiar de vista» si la tiene, y cerrar
// sesión con pregunta.
//
// La web no tiene Control, Costos, Auditoría, «Quién puede salir hoy»,
// Índices ni Kilómetros como pantallas propias, ni cambia la contraseña: en
// su lugar van las pantallas que la web sí tiene (Planes, Reportes…).
// ============================================================

const TRAZOS = {
  chevron: <path d="M9 18l6-6-6-6" />,
  personal: <><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><path d="M12 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8z" /></>,
  editar: <><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" /></>,
}
function IconoApp({ nombre, tam = 20 }) {
  if (!TRAZOS[nombre]) return <Icono nombre={nombre} tam={tam} />
  return (
    <svg viewBox="0 0 24 24" width={tam} height={tam} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {TRAZOS[nombre]}
    </svg>
  )
}

function FilaDato({ icono, etiqueta, valor }) {
  const hay = Boolean(String(valor ?? '').trim())
  return (
    <div className="mvp-dato">
      <span className="mvp-dato-icono"><IconoApp nombre={icono} tam={16} /></span>
      <span className="mvp-dato-k">{etiqueta}</span>
      <b className={hay ? '' : 'vacio'}>{hay ? valor : 'Sin registrar'}</b>
    </div>
  )
}

/** Lo más usado de la empresa, a un toque (la fila de PerfilAcciones). */
const ACCIONES = [
  { a: '/panel/alertas', icono: 'alerta', tono: 'info', texto: 'Alertas' },
  { a: '/panel/inspecciones', icono: 'check', tono: 'acento', texto: 'Inspecciones' },
  { a: '/panel/mantenimiento?vista=planes', icono: 'sync', tono: 'aviso', texto: 'Planes' },
  { a: '/panel/reportes', icono: 'reporte', tono: 'exito', texto: 'Reportes' },
  { a: '/panel/flota', icono: 'pin', tono: 'primario', texto: 'Áreas' },
]
const EN_ACCIONES = new Set(ACCIONES.map((x) => x.a.split('?')[0]))

/**
 * El tamaño de lo que opera, de las mismas lecturas que sus pestañas. Si una
 * no se puede leer, su cifra dice «—»: nunca un cero que no se sabe.
 */
function useTotales(sesion) {
  return useDatos(async () => {
    const [flota, gente, areas] = await Promise.all([
      repo.vehiculos.listar().catch(() => null),
      repo.admin.usuarios.listar({ empresaId: sesion?.empresaId }).catch(() => null),
      repo.areas().catch(() => null),
    ])
    return {
      unidades: flota?.length ?? null,
      // Uno no se cuenta a sí mismo, como en la lista de Usuarios de la app.
      personal: gente ? gente.filter((g) => g.email !== sesion?.correo).length : null,
      areas: areas?.length ?? null,
    }
  }, [sesion?.id, sesion?.empresaId])
}

export default function MiPerfilSupervisorMovil({ persona, sesion, aviso, alEditar }) {
  const movil = useMovil()
  const [saliendo, setSaliendo] = useState(false)
  const totales = useTotales(sesion).datos
  const nombre = persona.nombre || sesion?.nombre || ''
  const empresa = sesion?.empresaGestion?.nombre || persona.empresa || sesion?.empresa || ''
  const identidad = [sesion?.rolNombre || persona.rol, empresa].filter(Boolean).join(' · ')
  const sinLeer = movil?.sinLeer ?? 0
  const accesos = (movil?.accesos ?? []).filter((x) => !EN_ACCIONES.has(x.a))
  const cifra = (n) => (n == null ? '—' : f.numero(n))

  return (
    <div className="mvp">
      <div className="mvp-portada" aria-hidden="true" />

      <section className="mvp-heroe" aria-label="Tu perfil">
        <div className="mvp-heroe-barra">
          {persona.editable && (
            <button type="button" className="mvp-lapiz" onClick={alEditar} aria-label="Editar tu perfil">
              <IconoApp nombre="editar" tam={17} />
            </button>
          )}
        </div>
        <div className="mvp-retrato">
          <i className="mvp-retrato-halo" aria-hidden="true" />
          <span className="mvp-retrato-marco">
            <Avatar userId={persona.id} iniciales={f.iniciales(nombre)} nombre={nombre} clase="mvp-avatar" tam={216} />
          </span>
        </div>
        <h1 className="mvp-nombre">{nombre}</h1>
        {identidad && <p className="mvp-identidad">{identidad}</p>}
      </section>

      <div className="mvp-contenido">
        {aviso && <p className="mvp-aviso" role="status"><Icono nombre="check" tam={18} />{aviso}</p>}

        <div className="mvp-acciones">
          {ACCIONES.map((x) => (
            <Link key={x.texto} to={x.a} className={`mvp-accion ${x.tono}`}
              aria-label={x.a === '/panel/alertas' && sinLeer ? `${x.texto}, ${sinLeer} sin leer` : x.texto}>
              <span className="mvp-accion-boton">
                <Icono nombre={x.icono} tam={22} />
                {x.a === '/panel/alertas' && sinLeer > 0 && <em className="mvp-globo">{sinLeer > 99 ? '99+' : sinLeer}</em>}
              </span>
              <span className="mvp-accion-texto">{x.texto}</span>
            </Link>
          ))}
        </div>

        {/* El tamaño de lo que opera; cada cifra abre su pestaña. */}
        <div className="mvp-cifras">
          {[
            [totales?.unidades, 'Unidades', '/panel/flota'],
            [totales?.personal, 'Personal', '/panel/personal'],
            [totales?.areas, 'Áreas', '/panel/flota'],
          ].map(([n, t, a]) => (
            <Link key={t} to={a} className="mvp-cifra" aria-label={n == null ? `Ver ${t.toLowerCase()}` : `${n} ${t.toLowerCase()}. Ver`}>
              <b>{cifra(n)}</b><small>{t}</small>
            </Link>
          ))}
        </div>

        <section className="mvp-tarjeta mvp-info" aria-labelledby="mvs-info-titulo">
          <h2 id="mvs-info-titulo" className="mvp-overline">Mi información</h2>
          <FilaDato icono="personal" etiqueta="Cédula" valor={persona.cedula} />
          <FilaDato icono="llamar" etiqueta="Teléfono" valor={persona.telefono} />
          <FilaDato icono="mensaje" etiqueta="Correo" valor={persona.email || sesion?.correo} />
        </section>

        <section className="mvp-tarjeta mvp-accesos" aria-labelledby="mvs-accesos-titulo">
          <h2 id="mvs-accesos-titulo" className="mvp-overline">Accesos</h2>
          <ul>
            {accesos.map((x) => (
              <li key={x.a}>
                <Link to={x.a} className="mvp-acceso">
                  <span className="mvp-acceso-icono"><Icono nombre={x.icono} tam={18} /></span>
                  <b>{x.a === '/panel/configuracion' ? 'Apariencia' : x.texto}</b>
                  <IconoApp nombre="chevron" tam={15} />
                </Link>
              </li>
            ))}
            <li>
              <Link to="/" className="mvp-acceso">
                <span className="mvp-acceso-icono"><Icono nombre="volver" tam={18} /></span>
                <b>Ir al sitio</b>
                <IconoApp nombre="chevron" tam={15} />
              </Link>
            </li>
          </ul>
        </section>

        {/* El admin FOM dentro de una empresa: volver a la vista de todas. */}
        {sesion?.empresaGestion && (
          <section className="mvp-tarjeta mvp-accesos" aria-labelledby="mvs-vista-titulo">
            <h2 id="mvs-vista-titulo" className="mvp-overline">Cambiar de vista</h2>
            <ul>
              <li>
                <Link to="/panel/admin/empresas" className="mvp-acceso" onClick={salirEmpresa}>
                  <span className="mvp-acceso-icono"><Icono nombre="empresa" tam={18} /></span>
                  <b>Salir de {sesion.empresaGestion.nombre || 'la empresa'}</b>
                  <IconoApp nombre="chevron" tam={15} />
                </Link>
              </li>
            </ul>
          </section>
        )}

        <button type="button" className="mvp-salir" onClick={() => setSaliendo(true)}>
          <Icono nombre="salir" tam={20} />Cerrar sesión
        </button>
        <p className="mvp-pie">{empresa ? `FOM · Panel de ${empresa}` : 'FOM · Panel web'}</p>
      </div>

      <Modal abierto={saliendo} titulo="¿Cerrar sesión?" alCerrar={() => setSaliendo(false)} ancho={420}>
        <p className="mv-salir-texto">Tendrás que volver a entrar con tu correo y tu clave.</p>
        <div className="mv-salir-acciones">
          <button type="button" className="pnl-btn sutil" onClick={() => setSaliendo(false)}>Cancelar</button>
          <button type="button" className="pnl-btn mv-salir" onClick={cerrarSesion}><Icono nombre="salir" tam={18} />Cerrar sesión</button>
        </div>
      </Modal>
    </div>
  )
}
