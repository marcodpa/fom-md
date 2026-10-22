// Pie de la web v8: marca, Plataforma, Información y Contacto. En el teléfono, dos columnas.
import { Link } from 'react-router-dom'
import { LogoV8 } from './MarcaV8'
import { GRUPOS_V8 } from './NavV8'
import { rutaV8, paginaV8, ENTRAR, CORREO_FOM } from '../../pages/v8/rutasV8'

export default function PieV8() {
  return <footer className="v8-pie">
    <div className="v8-c">
      <div className="v8-pie-cols">
        <div className="v8-pie-marca">
          <Link to={rutaV8('inicio')} aria-label="FOM, inicio"><LogoV8 /></Link>
          <p>Fleet Operations &amp; Maintenance</p>
          <p>La oficina y la carretera, conectadas.</p>
        </div>
        {GRUPOS_V8.map(g => <nav key={g.id} aria-label={g.nombre}>
          <h2>{g.nombre}</h2>
          <ul>{g.claves.map(c => <li key={c}><Link to={rutaV8(c)}>{paginaV8(c).nombre}</Link></li>)}</ul>
        </nav>)}
        <nav aria-label="Contacto">
          <h2>Contacto</h2>
          <ul>
            <li><Link to={rutaV8('contacto')}>Solicitar una demostración</Link></li>
            <li><a href={`mailto:${CORREO_FOM}`}>{CORREO_FOM}</a></li>
            <li><Link to={ENTRAR}>Iniciar sesión</Link></li>
          </ul>
        </nav>
      </div>
      <div className="v8-pie-legal">
        <small>© {new Date().getFullYear()} FOM. Todos los derechos reservados.</small>
        <small>Flotas que mantienen el mundo en movimiento.</small>
      </div>
    </div>
  </footer>
}

export { PieV8 }
