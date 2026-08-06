const BENEFITS = [
  'Que todos lleguen a casa a salvo',
  'Operación por excepciones: solo lo que requiere atención',
  'Expediente digital único por vehículo',
  'Funciona offline en campo y sincroniza al volver la señal',
  'Independiente del proveedor de GPS',
  'Multi-empresa y multi-marca: la plataforma se pinta con tu color',
]

export default function Benefits() {
  return (
    <section className="section" id="beneficios">
      <div className="container ben-wrap">
        <div data-reveal>
          <div className="sec-kicker">Beneficios</div>
          <h2 className="ben-statement">
            Calma con precisión.
            <br />
            <span>Cuidar a la gente, no vigilarla.</span>
          </h2>
          <p className="ben-note">
            El semáforo del índice de manejo seguro es una herramienta de cuidado, no de
            castigo. FOM está diseñado para proteger a tus equipos y a tu operación.
          </p>
        </div>

        <div className="ben-list">
          {BENEFITS.map((b, i) => (
            <div className="ben-item" style={{ '--i': i }} key={b} data-reveal>
              <b>{String(i + 1).padStart(2, '0')}</b>
              <p>{b}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
