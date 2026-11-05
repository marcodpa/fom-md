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
 * - Administrador FOM dentro de otra empresa: aro azul de 1 px en el logo y la etiqueta corta
 *   «Admin FOM». La frase entera («Gestionando como administrador FOM») no se ve: la lee el
 *   lector de pantalla y va en el `title`. Igual en el teléfono y en la computadora.
 *
 * `global`: la pantalla es de administración global (sin empresa elegida).
 * `nota`: decir que se está gestionando, si aplica.
 * `compacta`: una sola línea chica (logo de 18–20 px + nombre en 12 px), para ir bajo un título,
 *   como en la barra de arriba del teléfono y la de Centro de control.
 */
export default function MarcaEmpresa({ global = false, nota = true, compacta = false, className = '' }) {
  const sesion = useSesion()
  const marca = marcaDe(sesion?.perfil, { global })
  const monograma = <span className="marca-empresa-monograma" aria-hidden="true">{marca.iniciales}</span>
  return (
    <span className={`marca-empresa${marca.nota ? ' gestionando' : ''}${compacta ? ' compacta' : ''} ${className}`.trim()}
      title={nota && marca.nota ? `${marca.nombre} · ${marca.nota}` : undefined}>
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
      {nota && marca.nota && <em className="marca-empresa-etiqueta" aria-hidden="true">Admin FOM</em>}
    </span>
  )
}
