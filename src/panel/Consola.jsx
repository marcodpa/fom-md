import { useEffect, useState } from 'react'
import { Link, NavLink, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { cerrarSesion, esAdminFom } from './auth'
import { esGestor } from './roles'
import { useSesion } from './useSesion'
import { Icono } from './Iconos'
import repo, { alCambiarDatos } from './datos/repo'
import { useTema } from './useTema'

// Marca de la empresa activa: repinta el acento de toda la consola, igual que
// el sistema multi-marca de la app.
const MARCA_EMPRESA = { nombre: 'Transporte Lago Sur, C.A.', color: '#208AEF' }

import Resumen from './modulos/Resumen'
import CentroControl from './modulos/CentroControl'
import Flota from './modulos/Flota'
import ExpedienteVehiculo from './modulos/ExpedienteVehiculo'
import Mantenimiento from './modulos/Mantenimiento'
import Inspecciones from './modulos/Inspecciones'
import ExpedienteConductor from './modulos/ExpedienteConductor'
import Alertas from './modulos/Alertas'
import Documentos from './modulos/Documentos'
import Reportes from './modulos/Reportes'
import AdminEmpresas from './modulos/AdminEmpresas'
import AdminPagos from './modulos/AdminPagos'
import AdminGps from './modulos/AdminGps'
import AdminUsuarios from './modulos/AdminUsuarios'
import AdminAuditoria from './modulos/AdminAuditoria'

// Módulos de la consola, agrupados como en la arquitectura FOM-WEB.
const MENU = [
  {
    grupo: 'Operación',
    items: [
      { a: '/panel', icono: 'resumen', texto: 'Resumen', fin: true },
      { a: '/panel/mapa', icono: 'mapa', texto: 'Centro de control' },
      { a: '/panel/alertas', icono: 'alerta', texto: 'Alertas' },
    ],
  },
  {
    grupo: 'Flota',
    items: [
      { a: '/panel/flota', icono: 'camion', texto: 'Vehículos' },
      { a: '/panel/mantenimiento', icono: 'llave', texto: 'Mantenimiento' },
      { a: '/panel/inspecciones', icono: 'check', texto: 'Inspecciones' },
      { a: '/panel/documentos', icono: 'documento', texto: 'Documentos' },
    ],
  },
  {
    grupo: 'Gente',
    // Una sola entrada. «Personal» y «Usuarios» eran dos pantallas para la
    // misma gente —una preguntaba «puede manejar hoy» y la otra «tiene
    // acceso»— y la primera ademas estaba vacia. Ahora es una.
    items: [{ a: '/panel/personal', icono: 'gente', texto: 'Gente' }],
  },
  {
    grupo: 'Análisis',
    items: [{ a: '/panel/reportes', icono: 'reporte', texto: 'Reportes' }],
  },
]

// Grupo extra que SOLO ve el Administrador FOM: la capa multiempresa.
const MENU_ADMIN = {
  grupo: 'Administración FOM',
  items: [
    { a: '/panel/admin/empresas', icono: 'empresa', texto: 'Empresas' },
    { a: '/panel/admin/pagos', icono: 'costos', texto: 'Pagos' },
    { a: '/panel/admin/gps', icono: 'pin', texto: 'GPS' },
    { a: '/panel/admin/auditoria', icono: 'auditoria', texto: 'Auditoría' },
  ],
}

function Lateral({ perfil, abierto, cerrar, sinLeer, esquema, alternarTema }) {
  // Antes aqui se colaba una segunda entrada, «Usuarios», para los gestores.
  // Sobra: la pantalla de Gente ya trae la cuenta y sus acciones.
  const menuGestor = MENU
  const menu = esAdminFom(perfil) ? [MENU_ADMIN, ...MENU] : menuGestor
  return (
    <aside className={`pnl-side${abierto ? ' abierto' : ''}`}>
      <div className="pnl-side-top">
        <NavLink to="/panel" end className="pnl-marca" onClick={cerrar}>
          <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
            <path
              d="M12 2.4c-3.9 0-7 3.1-7 7 0 4.9 7 12.6 7 12.6s7-7.7 7-12.6c0-3.9-3.1-7-7-7Z"
              fill="url(#pnl-mark)"
            />
            <circle cx="12" cy="9.3" r="2.4" fill="#0a1120" />
            <defs>
              <linearGradient id="pnl-mark" x1="5" y1="2" x2="19" y2="22" gradientUnits="userSpaceOnUse">
                <stop stopColor="#5cb0ff" />
                <stop offset="1" stopColor="#208aef" />
              </linearGradient>
            </defs>
          </svg>
          <span>FOM</span>
          <em>consola</em>
        </NavLink>
      </div>

      <div className={`pnl-empresa${esAdminFom(perfil) ? ' es-admin' : ''}`}>
        <b>{perfil.empresa}</b>
        <span>{perfil.sede}</span>
      </div>

      <nav className="pnl-nav" aria-label="Módulos">
        {menu.map((g) => (
          <div className="pnl-nav-grupo" key={g.grupo}>
            <span className="pnl-nav-titulo">{g.grupo}</span>
            {g.items.map((it) => (
              <NavLink
                key={it.a}
                to={it.a}
                end={it.fin}
                onClick={cerrar}
                className={({ isActive }) => `pnl-nav-item${isActive ? ' activo' : ''}`}
              >
                <Icono nombre={it.icono} />
                {it.texto}
                {it.icono === 'alerta' && sinLeer > 0 && (
                  <em className="pnl-nav-globo" aria-label={`${sinLeer} sin leer`}>
                    {sinLeer}
                  </em>
                )}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      <div className="pnl-side-pie">
        <div className="pnl-usuario">
          <i className="pnl-avatar">{perfil.iniciales}</i>
          <div>
            <b>{perfil.nombre}</b>
            <span>{perfil.rolNombre}</span>
          </div>
        </div>
        <button type="button" className="pnl-salir" onClick={alternarTema}>
          <Icono nombre={esquema === 'oscuro' ? 'sol' : 'luna'} />
          {esquema === 'oscuro' ? 'Modo claro' : 'Modo oscuro'}
        </button>
        <Link to="/" className="pnl-salir">
          <Icono nombre="volver" />
          Ir al sitio
        </Link>
        <button type="button" className="pnl-salir" onClick={cerrarSesion}>
          <Icono nombre="salir" />
          Cerrar sesión
        </button>
      </div>
    </aside>
  )
}

export default function Consola() {
  const sesion = useSesion()
  const { pathname } = useLocation()
  const { esquema, alternar } = useTema(MARCA_EMPRESA)
  const [menuAbierto, setMenuAbierto] = useState(false)
  const [sinLeer, setSinLeer] = useState(0)

  useEffect(() => {
    setMenuAbierto(false)
  }, [pathname])

  // Contador del globo de alertas: se recalcula al navegar y cuando algo cambia.
  useEffect(() => {
    let vivo = true
    const leer = () =>
      repo.alertas.listar({ soloSinLeer: true }).then((l) => vivo && setSinLeer(l.length))
    leer()
    const baja = alCambiarDatos(leer)
    return () => {
      vivo = false
      baja()
    }
  }, [pathname])

  useEffect(() => {
    document.title = 'Consola FOM'
    return () => {
      document.title = 'FOM — Control total de tu flota'
    }
  }, [])

  // `undefined` = todavía se le está preguntando al servidor si hay sesión.
  // Redirigir aquí mandaría a /entrar a quien sí tiene sesión abierta.
  if (sesion === undefined) {
    return (
      <div className="pnl-cargando-sesion" role="status">
        Comprobando tu sesión…
      </div>
    )
  }
  if (!sesion) return <Navigate to="/entrar" replace />
  if (sesion.debeCambiarClave) return <Navigate to="/cambiar-clave-inicial" replace />

  const { perfil } = sesion

  return (
    <div className="pnl">
      <Lateral
        perfil={perfil}
        abierto={menuAbierto}
        cerrar={() => setMenuAbierto(false)}
        sinLeer={sinLeer}
        esquema={esquema}
        alternarTema={alternar}
      />
      {menuAbierto && (
        <button
          type="button"
          className="pnl-velo"
          aria-label="Cerrar menú"
          onClick={() => setMenuAbierto(false)}
        />
      )}

      <main className="pnl-main" id="contenido">
        <button
          type="button"
          className="pnl-menu-btn"
          aria-label="Abrir menú"
          onClick={() => setMenuAbierto(true)}
        >
          <Icono nombre="menu" />
        </button>

        <Routes>
          <Route index element={<Resumen />} />
          <Route path="mapa" element={<CentroControl />} />
          <Route path="alertas" element={<Alertas />} />
          <Route path="flota" element={<Flota />} />
          <Route path="flota/:id" element={<ExpedienteVehiculo />} />
          <Route path="mantenimiento" element={<Mantenimiento />} />
          <Route path="inspecciones" element={<Inspecciones />} />
          <Route path="documentos" element={<Documentos />} />
          <Route path="personal" element={<AdminUsuarios />} />
          <Route path="personal/:id" element={<ExpedienteConductor />} />
          <Route path="reportes" element={<Reportes />} />
          {/* La capa multiempresa: solo existe para el Administrador FOM. */}
          {esAdminFom(perfil) && (
            <>
              <Route path="admin/empresas" element={<AdminEmpresas />} />
              <Route path="admin/pagos" element={<AdminPagos />} />
              <Route path="admin/gps" element={<AdminGps />} />
              <Route path="admin/auditoria" element={<AdminAuditoria />} />
            </>
          )}
          {esGestor(perfil) && <Route path="admin/usuarios" element={<AdminUsuarios />} />}
          <Route path="*" element={<Navigate to="/panel" replace />} />
        </Routes>
      </main>
    </div>
  )
}
