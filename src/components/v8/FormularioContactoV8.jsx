// Formulario de demostración de la web v8. Hace lo mismo que el actual (MarketingSections/
// ContactForm): arma el correo con los datos y abre la aplicación de correo hacia
// contacto@fom.app. No envía nada por su cuenta ni llama a ningún servidor.
import { useState } from 'react'
import { BotonV8 } from './PiezasV8'
import { CORREO_FOM } from '../../pages/v8/rutasV8'

export const FLOTAS_V8 = ['1 a 10 unidades', '11 a 50 unidades', '51 a 100 unidades', 'Más de 100 unidades']

export default function FormularioContactoV8({ titulo = 'Hablemos de tu operación', id = 'solicitud-demo', className = '' }) {
  const [listo, setListo] = useState(false)
  const enviar = e => {
    e.preventDefault()
    const datos = new FormData(e.currentTarget)
    const cuerpo = ['Solicitud de demostración FOM', ...['Nombre', 'Empresa', 'Correo', 'Flota', 'Mensaje'].map(k => `${k}: ${datos.get(k) || 'No indicado'}`)].join('\n')
    window.location.href = `mailto:${CORREO_FOM}?subject=${encodeURIComponent('Solicitud de demostración FOM')}&body=${encodeURIComponent(cuerpo)}`
    setListo(true)
  }
  return <form id={id} className={`v8-vidrio v8-form ${className}`} onSubmit={enviar} aria-labelledby={`${id}-titulo`}>
    <h2 id={`${id}-titulo`} className="v8-h3">{titulo}</h2>
    <div className="v8-form-fila">
      <label className="v8-campo">Nombre<input name="Nombre" autoComplete="name" required maxLength={120} /></label>
      <label className="v8-campo">Empresa<input name="Empresa" autoComplete="organization" required maxLength={160} /></label>
    </div>
    <div className="v8-form-fila">
      <label className="v8-campo">Correo<input name="Correo" type="email" autoComplete="email" required maxLength={200} /></label>
      <label className="v8-campo">Tamaño de la flota<select name="Flota" defaultValue="" required>
        <option value="" disabled>Selecciona una opción</option>
        {FLOTAS_V8.map(f => <option key={f}>{f}</option>)}
      </select></label>
    </div>
    <label className="v8-campo">Cuéntanos qué necesitas<textarea name="Mensaje" maxLength={2000} /></label>
    <BotonV8 type="submit" tamano="lg" ancho>Preparar solicitud por correo</BotonV8>
    <p className="v8-form-aviso">Se abrirá tu aplicación de correo para que revises y envíes la solicitud.</p>
    {listo && <p className="v8-form-estado" role="status">Solicitud preparada. Envíala desde tu aplicación de correo. También puedes escribir a <a href={`mailto:${CORREO_FOM}`}>{CORREO_FOM}</a>.</p>}
  </form>
}

export { FormularioContactoV8 }
