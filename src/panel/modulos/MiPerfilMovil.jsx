import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { cerrarSesion } from '../auth'
import Avatar from '../comp/Avatar'
import { Modal } from '../comp/ui'
import { useMovil } from '../comp/movil-navegacion'
import { Icono } from '../Iconos'
import * as f from '../datos/formato'
import { ManejoAnillo } from './MiUnidadMovil'
import '../../styles/perfil-movil.css'

// ============================================================
// MI PERFIL DEL CONDUCTOR EN EL TELÉFONO — la pestaña de la app
// ------------------------------------------------------------
// Copia de `(driver)/mas.tsx` de FOM-DRIVER: la portada azul, el retrato con
// su marco, el nombre con «rol · unidad · empresa», las acciones a un toque,
// el índice de manejo con el anillo, las tres cifras, «Mi información», los
// accesos y «Cerrar sesión» (con pregunta).
//
// Lo que la app tiene y la web no: «Otra unidad» (activarse en otra unidad
// con el PIN, pin-unidad.tsx) y cambiar la contraseña. No se ofrecen: serían
// botones que no llevan a nada.
//
// El punto verde del retrato es el «en línea» de perfil-hero.tsx: en la app
// se enciende si tiene sesión de manejo; aquí, si tiene unidad asignada.
// ============================================================

/** Trazos de tab-icon.tsx de la app que el set de la web no tiene. */
const TRAZOS = {
  reportar: <><path d="M12 3.8 21 19.5H3z" /><path d="M12 9.5v4" /><path d="M12 16.6h.01" strokeWidth="2.6" /></>,
  inspeccion: <><path d="M9 4h6v3H9z" /><path d="M9 5.5H6.5a1 1 0 0 0-1 1V20a1 1 0 0 0 1 1h11a1 1 0 0 0 1-1V6.5a1 1 0 0 0-1-1H15" /><path d="m9 14 2 2 4-4" /></>,
  chevron: <path d="M9 18l6-6-6-6" />,
  personal: <><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><path d="M12 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8z" /></>,
  gps: <><path d="M12 21s-7-6.5-7-11a7 7 0 0 1 14 0c0 4.5-7 11-7 11z" /><circle cx="12" cy="10" r="2.5" /></>,
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

/** Una fila de «Mi información»: ícono, rótulo y el dato (o «Sin registrar»). */
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

/** El id de la puerta en mayúsculas o, sin él, la placa (como `etiquetaCortaDeUnidad`). */
function etiquetaCorta(u) {
  const id = u?.numero && u.numero !== '—' ? u.numero.toUpperCase() : null
  return id ?? (u?.placa && u.placa !== '—' ? u.placa : null)
}

/**
 * Lo pinta MiPerfil en la vista de teléfono, con lo que ya leyó: aquí solo se
 * dibuja. Editar y ver documentos abren los mismos diálogos de la web.
 */
export default function MiPerfilMovil({ persona, sesion, aviso, alEditar, documentos, alVerDocumentos }) {
  const movil = useMovil()
  const navegar = useNavigate()
  const [saliendo, setSaliendo] = useState(false)
  const nombre = persona.nombre || sesion?.nombre || ''
  const unidad = persona.unidad ?? null
  const identidad = [sesion?.rolNombre || persona.rol, etiquetaCorta(unidad), persona.empresa || sesion?.empresa].filter(Boolean).join(' · ')

  // Las tres cifras, solo lo que se puede medir hoy: si no hay dato, «—», nunca un número inventado.
  const conEstado = documentos.filter((d) => d.estado)
  const alDia = conEstado.filter((d) => d.estado === 'vigente').length
  const porAtender = conEstado.filter((d) => d.estado === 'vencido' || d.estado === 'por_vencer').length
  const reportadas = Array.isArray(persona.odts) ? persona.odts.length : null
  const cifras = [
    { valor: unidad?.km == null ? '—' : f.numero(Math.round(unidad.km)), texto: 'km de tu unidad' },
    { valor: conEstado.length ? `${alDia}/${conEstado.length}` : '—', texto: 'documentos al día', tono: conEstado.length ? (alDia === conEstado.length ? 'exito' : 'aviso') : '' },
    { valor: reportadas == null ? '—' : f.numero(reportadas), texto: reportadas === 1 ? 'falla reportada' : 'fallas reportadas' },
  ]

  const acciones = [
    { icono: 'reportar', tono: 'peligro', texto: 'Reportar falla', alTocar: () => navegar('/panel/mantenimiento?reportar=1') },
    { icono: 'inspeccion', tono: 'primario', texto: 'Documentos', globo: porAtender, alTocar: alVerDocumentos },
  ]
  // Lo que no está en la barra de abajo (Alertas, Configuración…), como en el menú lateral.
  const accesos = movil?.accesos ?? []
  const sinLeer = movil?.sinLeer ?? 0

  return (
    <div className="mvp mvu-tonos">
      <div className="mvp-portada" aria-hidden="true" />

      {/* ── Héroe: el lápiz arriba, el retrato con su marco, el nombre y su línea. ── */}
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
            {unidad && <i className="mvp-en-linea" role="img" aria-label="Con unidad asignada" />}
          </span>
        </div>
        <h1 className="mvp-nombre">{nombre}</h1>
        {identidad && <p className="mvp-identidad">{identidad}</p>}
      </section>

      <div className="mvp-contenido">
        {aviso && <p className="mvp-aviso" role="status"><Icono nombre="check" tam={18} />{aviso}</p>}

        {/* Lo más usado, a un toque. */}
        <div className="mvp-acciones">
          {acciones.map((a) => (
            <button key={a.texto} type="button" className={`mvp-accion ${a.tono}`} onClick={a.alTocar}
              aria-label={a.globo ? `${a.texto}, ${a.globo} por atender` : a.texto}>
              <span className="mvp-accion-boton">
                <IconoApp nombre={a.icono} tam={22} />
                {a.globo > 0 && <em className="mvp-globo">{a.globo}</em>}
              </span>
              <span className="mvp-accion-texto">{a.texto}</span>
            </button>
          ))}
        </div>

        {/* Índice de manejo: el anillo, con el selector 7 / 30 días. */}
        {persona.conduce !== false && <ManejoAnillo key={`${sesion?.id}:${sesion?.empresaId}`} />}

        <div className="mvp-cifras">
          {cifras.map((c) => (
            <div key={c.texto} className="mvp-cifra"><b className={c.tono}>{c.valor}</b><small>{c.texto}</small></div>
          ))}
        </div>

        <section className="mvp-tarjeta mvp-info" aria-labelledby="mvp-info-titulo">
          <h2 id="mvp-info-titulo" className="mvp-overline">Mi información</h2>
          <FilaDato icono="personal" etiqueta="Cédula" valor={persona.cedula} />
          <FilaDato icono="llamar" etiqueta="Teléfono" valor={persona.telefono} />
          <FilaDato icono="gps" etiqueta="Dirección" valor={persona.direccion} />
          <FilaDato icono="inspeccion" etiqueta="Nacimiento" valor={persona.fechaNacimiento ? f.fecha(persona.fechaNacimiento) : ''} />
          <FilaDato icono="mensaje" etiqueta="Email" valor={persona.email || sesion?.correo} />
        </section>

        {accesos.length > 0 && (
          <section className="mvp-tarjeta mvp-accesos" aria-labelledby="mvp-accesos-titulo">
            <h2 id="mvp-accesos-titulo" className="mvp-overline">Accesos</h2>
            <ul>
              {accesos.map((a) => (
                <li key={a.a}>
                  <Link to={a.a} className="mvp-acceso">
                    <span className="mvp-acceso-icono"><Icono nombre={a.icono} tam={18} /></span>
                    <b>{a.a === '/panel/configuracion' ? 'Apariencia' : a.texto}</b>
                    {a.a === '/panel/alertas' && sinLeer > 0 && <em className="mvp-globo plano" aria-label={`${sinLeer} sin leer`}>{sinLeer}</em>}
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
        )}

        {/* Cerrar sesión: pide confirmación, no se sale de un toque. */}
        <button type="button" className="mvp-salir" onClick={() => setSaliendo(true)}>
          <Icono nombre="salir" tam={20} />Cerrar sesión
        </button>
        <p className="mvp-pie">FOM · Panel web del conductor</p>
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
