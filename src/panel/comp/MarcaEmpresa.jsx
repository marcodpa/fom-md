import { useSesion } from '../useSesion'
import LogoFom from '../../components/LogoFom'
import { marcaDe } from '../datos/marcaEmpresa'
import { CODIGO_FOM } from '../datos/logos'
import LogoEmpresa from './LogoEmpresa'
import './marca-empresa.css'

/**
 * Logo + nombre de la empresa en la que se está trabajando. Es la única pieza
 * que lo dibuja: la cabecera de la consola y Centro de control la usan igual.
 *
 * - Con logo (almacén del servidor o Cloudinary): se ve el logo.
 * - Sin logo: monograma con las iniciales, del mismo tamaño.
 * - FOM Operations y las pantallas globales de administración: el logo de FOM.
 * - Administrador FOM dentro de otra empresa: además dice que está gestionando.
 *
 * `global`: la pantalla es de administración global (sin empresa elegida).
 * `nota`: mostrar la línea «Gestionando como administrador FOM» si aplica.
 * `compacta`: una sola línea chica (logo de 18–20 px + nombre), para ir bajo un título, como en la
 *   barra de arriba del teléfono. La nota no se ve, la lee el lector de pantalla y va en el
 *   `title`; a la vista lo dicen el aro azul de 1 px del logo y la etiqueta «Admin FOM».
 */
export default function MarcaEmpresa({ global = false, nota = true, compacta = false, className = '' }) {
  const sesion = useSesion()
  const marca = marcaDe(sesion?.perfil, { global })
  const monograma = <span className="marca-empresa-monograma" aria-hidden="true">{marca.iniciales}</span>
  return (
    <span className={`marca-empresa${marca.nota ? ' gestionando' : ''}${compacta ? ' compacta' : ''} ${className}`.trim()}
      title={compacta && marca.nota ? `${marca.nombre} · ${marca.nota}` : undefined}>
      <span className="marca-empresa-logo">
        {marca.esFom
          ? <LogoFom simbolo decorativo className="logo-empresa logo-fom" />
          : <LogoEmpresa key={marca.empresaId ?? 'sin-id'} empresaId={marca.empresaId} nombre="" respaldo={monograma} />}
      </span>
      <span className="marca-empresa-texto">
        <b className="marca-empresa-nombre">{marca.nombre}</b>
        {nota && marca.nota && <small className="marca-empresa-nota">{marca.nota}</small>}
      </span>
      {/* A la vista, corto: el texto entero ya lo lee el lector de pantalla en la nota. */}
      {compacta && marca.nota && <em className="marca-empresa-etiqueta" aria-hidden="true">Admin FOM</em>}
    </span>
  )
}
