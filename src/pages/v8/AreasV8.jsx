// Áreas de la web v8 (T-148, rediseño de T-107). La página cuenta lo que el panel hace hoy con las
// áreas, las empresas y los roles (src/panel/modulos/Flota.jsx: «Nueva área» y «Agregar vehículos a
// un área»; CentroControl.jsx y Reportes.jsx: filtro por área; AdminEmpresas.jsx: contratista,
// compañía y personal; Consola.jsx: lo que ve cada rol; datos/catalogos.js: jerarquía de mando).
// Las geocercas y los permisos por área que contaba la versión anterior no existen en el panel:
// se quitaron hasta que existan.
// Momento propio (lo memorable): «El mapa de tu operación» (areas/EscenaAreasV8.jsx), un
// organigrama de la demostración que se arma con el scroll (empresa → áreas → unidades → quién ve
// qué) junto a la pantalla real del panel de cada paso. Escena fija solo en escritorio ≥ 1024 px;
// tableta y «reducir movimiento»: riel; teléfono: el organigrama ya armado y los pasos apilados.
// Lo demás: hero (titular escalonado y foto que crece, HeroV8) y apariciones suaves.
import { useRef } from 'react'
import { PAGES } from '../../content/pages'
import {
  SitioV8, NavLocalV8, HeroV8, SeccionV8, ContenedorV8, EncabezadoV8, FotoIntegradaV8, CapturaFlotanteV8,
  PreguntasV8, BotonV8, EnlaceV8, useMomentoV8, rutaV8,
} from '../../components/v8'
import EscenaAreasV8, { OrganigramaAreasV8, PASOS_AREAS } from './areas/EscenaAreasV8'
import './areas-v8.css'

const P = PAGES.areas

const LOCAL = [['mapa', 'Tu operación'], ['empresas', 'Empresas'], ['jerarquia', 'Jerarquía'], ['preguntas', 'Preguntas']]

// Tipos de empresa (AdminEmpresas.jsx).
const EMPRESAS = [
  ['Contratista', 'Opera una flota de vehículos: sus áreas, sus unidades, sus conductores y su mantenimiento.'],
  ['Compañía', 'Supervisa las flotas de sus contratistas: ve sus usuarios y sus reportes.'],
  ['Personal', 'Una cuenta individual, con su mapa, sus alertas y sus documentos.'],
]

// Jerarquía de mando (catalogos.js · RANGO): cada quien gestiona solo a los de rango menor.
const ESCALONES = [
  ['Administrador FOM', 'Da de alta las empresas y sus unidades, y gestiona a todos los demás.'],
  ['Supervisor de la empresa', 'Da de alta a su gente, cambia su rol y ordena la flota en áreas.'],
  ['Conductor y usuario personal', 'Usan lo suyo. No gestionan a nadie.'],
]

// Preguntas verdaderas (lo que hace el panel hoy).
const PREGUNTAS = [
  { q: '¿Qué tipos de área puedo crear?', a: 'Tres: por ubicación, por sector o por contrato. El nombre lo pones tú, por ejemplo «Costa oriental» o el nombre de un contrato.' },
  { q: '¿Una unidad puede estar en dos áreas?', a: 'No. Cada unidad está en un área a la vez. Cambiarla toma un clic desde su fila en Vehículos o desde su expediente, y conserva su conductor.' },
  { q: '¿Quién puede crear áreas y mover unidades?', a: 'El supervisor de la empresa y el administrador FOM. Los conductores no.' },
  { q: '¿Puedo ver solo un área en el mapa o en los reportes?', a: 'Sí. Vehículos, Centro de control y Reportes tienen el filtro por área: eliges una y ves solo sus unidades.' },
  { q: '¿Un conductor ve toda la flota?', a: 'No. Ve su unidad, su mapa, su mantenimiento y sus alertas, en el panel y en la app.' },
]

export default function AreasV8() {
  const raiz = useRef(null)
  // Sin momentos propios de página: la escena se mueve sola (patrón de piezasEscenaV8) y el resto
  // usa lo que useMomentoV8 hace con los atributos de la base (hero, apariciones, capturas).
  useMomentoV8(raiz, () => {})

  return <SitioV8 raiz={raiz} titulo="Áreas y flota — FOM" descripcion="Ordena la flota por ubicación, sector o contrato y decide quién ve qué, desde el panel web de FOM.">
    <HeroV8
      kicker={P.eyebrow}
      titulo={['Tu empresa, tus áreas,', 'cada unidad en su sitio.']}
      bajada={<>
        <span className="v8-solo-escritorio">Ordena la flota por ubicación, sector o contrato, y decide quién ve qué. Todo desde el panel web, y cada persona lo ve en su app.</span>
        <span className="v8-solo-movil">Ordena la flota por áreas y decide quién ve qué.</span>
      </>}
      bajadaAngosta
      primaria={{ to: rutaV8('contacto'), texto: 'Solicitar demostración' }}
      secundaria={{ to: '#mapa', texto: 'Ver cómo se arma' }}
      foto={{ nombre: 'aerea-terminal', alt: 'Vista aérea nocturna de una terminal de carga con camiones y patios iluminados.' }}
      className="areas-hero"
    />

    <NavLocalV8 titulo="Áreas" enlaces={LOCAL} />

    {/* El mapa de tu operación: el momento de la página. */}
    <SeccionV8 id="mapa" className="ar-sec" aria-labelledby="ar-mapa-titulo">
      <ContenedorV8>
        <EncabezadoV8 centro kicker="Tu operación, por áreas" id="ar-mapa-titulo" titulo={['De la empresa a cada unidad,', 'en un solo mapa.']}
          bajada={<><span className="v8-solo-escritorio">Así se ordena una flota en FOM, paso a paso, con la empresa de la demostración y las pantallas reales donde se hace.</span><span className="v8-solo-movil">Así se ordena una flota en FOM, con la empresa de la demostración.</span></>} />
      </ContenedorV8>

      <ContenedorV8 className="ar-marco ar-solo-escritorio">
        <EscenaAreasV8 />
      </ContenedorV8>

      {/* Teléfono: el organigrama ya armado y los pasos uno bajo otro. */}
      <ContenedorV8 className="ar-movil ar-solo-movil">
        <OrganigramaAreasV8 paso={2} className="is-movil" />
        <p className="v8-nota-demo">Datos de demostración</p>
        <ol className="ar-movil-pasos">
          {PASOS_AREAS.map((p, i) => <li key={p.corto} data-v8-aparece="">
            <span className="ar-movil-num" aria-hidden="true">{i + 1}</span>
            <div>
              <h3 className="v8-h4">{p.titulo}</h3>
              <p className="v8-sm v8-t2">{p.texto}</p>
              {p.roles && <dl className="ar-roles">{p.roles.map(([r, q]) => <div key={r}><dt>{r}</dt><dd>{q}</dd></div>)}</dl>}
            </div>
          </li>)}
        </ol>
        <CapturaFlotanteV8 className="ar-movil-captura" nombre="cap-movil-areas-vehiculos" ancho={270} nota="Captura real del panel en el teléfono · Datos de demostración"
          alt="Vehículos en el teléfono: «Nueva área», «Agregar vehículos a un área» y las áreas con sus unidades. Datos de demostración." />
      </ContenedorV8>
    </SeccionV8>

    {/* Tipos de empresa */}
    <SeccionV8 id="empresas" className="ar-empresas" aria-labelledby="ar-empresas-titulo">
      <ContenedorV8 className="v8-split ar-empresas-split">
        <FotoIntegradaV8 className="ar-empresas-foto" nombre="fila-flota" marco="redondo" sizes="(min-width: 1240px) 460px, (min-width: 900px) 40vw, calc(100vw - 40px)" posicion="62% 50%"
          alt="Supervisor de FOM con una tableta junto a la fila de camiones de la flota de noche." />
        <div>
          <p className="v8-kick" data-v8-aparece="">Tipos de empresa</p>
          <h2 id="ar-empresas-titulo" className="v8-h2" data-v8-aparece="">Contratistas, compañías y cuentas personales.</h2>
          <dl className="ar-tipos">
            {EMPRESAS.map(([t, d]) => <div key={t} data-v8-aparece=""><dt>{t}</dt><dd className="v8-t2">{d}</dd></div>)}
          </dl>
          <p className="v8-sm v8-t2 ar-tipos-nota" data-v8-aparece="">Una contratista puede trabajar para varias compañías: el administrador FOM las asocia y cada compañía ve lo de sus contratistas.</p>
        </div>
      </ContenedorV8>
    </SeccionV8>

    {/* Jerarquía de mando */}
    <SeccionV8 id="jerarquia" banda className="ar-jerarquia" aria-labelledby="ar-jerarquia-titulo">
      <ContenedorV8 className="ar-jerarquia-c">
        <div className="ar-jerarquia-cab">
          <p className="v8-kick" data-v8-aparece="">Jerarquía de mando</p>
          <h2 id="ar-jerarquia-titulo" className="v8-h2" data-v8-aparece="">Nadie gestiona a quien está por encima.</h2>
          <p className="v8-lead ar-mt" data-v8-aparece="">Cada persona da de alta o cambia de rol solo a quienes están por debajo. Nunca a sí misma.</p>
          <p className="v8-sm v8-t2 ar-mt-sm" data-v8-aparece="">Cada acción de administración queda en la auditoría de FOM: quién la hizo, sobre qué y cuándo.</p>
        </div>
        <ol className="ar-escalera">
          {ESCALONES.map(([t, d], i) => <li key={t} style={{ '--i': i }} data-v8-aparece="">
            <b>{t}</b>
            <span className="v8-sm v8-t2">{d}</span>
          </li>)}
        </ol>
      </ContenedorV8>
    </SeccionV8>

    <SeccionV8 id="preguntas" className="areas-preguntas" aria-labelledby="areas-faq-titulo">
      <ContenedorV8>
        <h2 id="areas-faq-titulo" className="v8-h2 v8-centro" data-v8-aparece="">Preguntas sobre áreas.</h2>
        <PreguntasV8 items={PREGUNTAS} />
      </ContenedorV8>
    </SeccionV8>

    <SeccionV8 className="areas-cierre" aria-labelledby="areas-cierre-titulo">
      <ContenedorV8 className="v8-centro">
        <h2 id="areas-cierre-titulo" className="v8-h2" data-v8-aparece="">Ordena tu flota como trabajas.</h2>
        <div className="v8-acciones" data-v8-aparece="">
          <BotonV8 to={rutaV8('contacto')} tamano="lg" className="areas-cierre-boton">Solicitar demostración</BotonV8>
          <EnlaceV8 to={rutaV8('plataforma')}>Ver la plataforma</EnlaceV8>
        </div>
      </ContenedorV8>
    </SeccionV8>
  </SitioV8>
}
