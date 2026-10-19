import React, { useState } from 'react'
import { createRoot } from 'react-dom/client'
import { TarjetaManejo } from '/src/panel/comp/ScoreManejo.jsx'
import '/src/panel/comp/fotos-de.css'

const score = { indice: 86, dias: 7, km: 1124, eventosPor100: .62, frenadas: 4, aceleraciones: 2, excesos: 1, rating: 'green' }
function Verificacion() {
  const [azul, setAzul] = useState(false)
  const [bajo, setBajo] = useState(false)
  return <>
    <div className="controles"><button className="pnl-btn sutil" onClick={() => { document.querySelector('.pnl').dataset.diseno = azul ? 'glass' : 'azul'; setAzul(!azul) }}>Ver en {azul ? 'Glass' : 'Azul'}</button><button className="pnl-btn sutil" onClick={() => setBajo(!bajo)}>Probar {bajo ? 'manejo seguro' : 'índice bajo'}</button></div>
    <TarjetaManejo score={bajo ? { ...score, indice: 60, rating: 'red' } : score} empresa="Empresa de ejemplo" logoEmpresa="/brand/fom-logo.svg" />
    <div className="estrecha"><TarjetaManejo score={score} empresa="Empresa de ejemplo" /></div>
    <TarjetaManejo score={null} />
    <h2>Foto del vehículo: recorte cuadrado</h2><p>Foto ilustrativa para verificar el marco. Al ampliar una foto de tu flota se abre su original completo.</p>
    <figure className="fleet-vehicle-image fleet-photo con-foto"><div className="fleet-photo-stage"><img src="/src/assets/marketing/generated-v6/truck-highway.png" alt="Ejemplo de una fotografía horizontal recortada a un cuadro" /></div></figure>
  </>
}
createRoot(document.getElementById('root')).render(<Verificacion />)
