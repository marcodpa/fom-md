import { useSesion } from '../useSesion'
import { useApariencia } from '../useApariencia'
import { DISENOS } from '../apariencia-store'
import { Icono } from '../Iconos'
import { Tarjeta } from './ui'

export default function Apariencia() {
  const sesion = useSesion()
  const { diseno, cambiar, aviso } = useApariencia(sesion?.perfil)
  return <Tarjeta titulo="Apariencia de la web">
    <p className="apariencia-ayuda">Escoge cómo quieres ver FOM. El cambio se aplica a todos los apartados de tu plataforma.</p>
    <fieldset className="apariencia-opciones">
      <legend className="apariencia-legend">Diseño de la plataforma</legend>
      {DISENOS.map(d => <label key={d.id} className={`apariencia-opcion${diseno === d.id ? ' elegida' : ''}`}>
        <input type="radio" name="apariencia" value={d.id} checked={diseno === d.id} onChange={() => cambiar(d.id)} />
        <span className={`apariencia-preview ${d.id}`} aria-hidden="true"><i className="apariencia-preview-nav" /><span className="apariencia-preview-body"><i /><span><i /><i /></span><i /></span></span>
        <span className="apariencia-opcion-texto"><strong>{d.nombre}</strong><span>{d.descripcion}</span></span>
        {diseno === d.id && <span className="apariencia-elegida"><Icono nombre="check" tam={17} />Seleccionado</span>}
      </label>)}
    </fieldset>
    <p className="apariencia-ayuda apariencia-privada">Tu elección se guarda por cuenta en este navegador. No cambia el diseño de otras personas.</p>
    <p className="apariencia-aviso" role="status" aria-live="polite">{aviso}</p>
  </Tarjeta>
}
