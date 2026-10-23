// Escena de teléfonos de la web v8 (pedido de Marco, a partir del efecto de slush.app, con el
// estilo de FOM): dos o tres teléfonos de frente con capturas REALES de la app. Sin caja propia
// (T-134) y sin la cinta azul de fondo (T-139, pedido de Marco): los teléfonos van solos sobre el
// fondo de la página.
// El movimiento lo hace useMomentoV8 (momentoTelefonosV8.js), atado al scroll:
//   escritorio ≥ 1024 px: la escena se queda fija; primero la pantalla de cada teléfono se
//   desplaza sola (como si alguien hiciera scroll en la app), luego los teléfonos se inclinan en
//   3D hacia lados opuestos y se separan, flotando; al final se suelta.
//   tableta y teléfono: sin escena fija; la pantalla se desplaza y se inclinan levemente al pasar.
//   «reducir movimiento»: todo quieto, de frente y con la captura de siempre.
//
// <EscenaTelefonosV8 telefonos={[{ nombre: 'cap-movil-mnt-reportar', alt: '…', pie: <>…</>, corto? }]} />
//   nombre = captura de la app (si tiene continuación en pantallasV8.js, la pantalla se desplaza).
//   pie    = texto bajo el teléfono (en el teléfono se usa `corto` si existe). nota = «Captura
//            real de la app · Datos de demostración» (o el texto que pases; false = sin nota).
import { PantallaTelefonoV8 } from './ImagenesV8'
import './escena-telefonos-v8.css'

// La captura entra a 2x en el ancho del teléfono (290 px en escritorio, ~150 en el teléfono).
const SIZES = '(max-width: 599px) 150px, 272px'

export default function EscenaTelefonosV8({ telefonos, nota = true, etiqueta, className = '' }) {
  const texto = nota === true ? 'Capturas reales de la app · Datos de demostración' : nota
  const conPie = telefonos.some(t => t.pie)
  return <figure className={`v8-tels is-${telefonos.length} ${className}`} data-v8-tels="" aria-label={etiqueta}>
    <div className="v8-tels-tarjeta">
      <div className="v8-tels-fila">
        {telefonos.map(t => <div key={t.nombre} className="v8-tels-col">
          <div className="v8-tels-tel">
            <div className="v8-tels-marco">
              <PantallaTelefonoV8 nombre={t.nombre} alt={t.alt} sizes={SIZES} />
            </div>
          </div>
        </div>)}
      </div>
    </div>
    {conPie && <ul className="v8-tels-pies v8-sm v8-t2">
      {telefonos.map(t => <li key={t.nombre}>
        {t.corto ? <><span className="v8-tels-largo">{t.pie}</span><span className="v8-tels-corto">{t.corto}</span></> : t.pie}
      </li>)}
    </ul>}
    {texto && <figcaption className="v8-nota-demo">{texto}</figcaption>}
  </figure>
}
