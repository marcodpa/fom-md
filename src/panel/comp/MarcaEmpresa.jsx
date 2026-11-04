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
 * `compacta`: una sola línea chica (logo de 20 px + nombre), para ir bajo un título, como en la
 *   barra del teléfono de Centro de control. La nota no se ve, la lee el lector de pantalla; el
 *   aro azul del logo dice que se está gestionando.
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
    </span>
  )
}
