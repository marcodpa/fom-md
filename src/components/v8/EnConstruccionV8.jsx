// Página temporal para las rutas /nuevo/* que todavía no tienen su página v8 programada.
// Usa la base completa (navegación, pie) para poder recorrer el sitio nuevo de punta a punta.
import { useLocation } from 'react-router-dom'
import SitioV8 from './SitioV8'
import { BotonV8, EnlaceV8 } from './PiezasV8'
import { PAGINAS_V8, rutaV8, PUBLICADA } from '../../pages/v8/rutasV8'

export default function EnConstruccionV8() {
  const { pathname } = useLocation()
  const actual = pathname.replace(/\/+$/, '') || '/'
  const pagina = PAGINAS_V8.find(p => (PUBLICADA ? p.real : p.nueva) === actual)
  const nombre = pagina?.nombre || 'Esta página'
  return <SitioV8 titulo={`${nombre} — FOM`}>
    <section className="v8-obra" aria-labelledby="v8-obra-titulo">
      <div className="v8-c">
        <p className="v8-kick">Web nueva de FOM</p>
        <h1 id="v8-obra-titulo" className="v8-h2">{nombre}, en construcción.</h1>
        <p className="v8-lead">Estamos terminando esta página con el diseño nuevo. Mientras tanto, puedes ver la versión actual o volver al inicio.</p>
        <div className="v8-acciones">
          {pagina && <BotonV8 to={pagina.real} tamano="lg">Ver la versión actual</BotonV8>}
          <EnlaceV8 to={rutaV8('inicio')}>Volver al inicio</EnlaceV8>
        </div>
      </div>
    </section>
  </SitioV8>
}
