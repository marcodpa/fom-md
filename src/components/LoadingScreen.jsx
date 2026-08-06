export default function LoadingScreen({ hidden }) {
  return (
    <div className={`loader${hidden ? ' hidden' : ''}`} role="status" aria-live="polite">
      <div className="loader-ring" aria-hidden="true">
        <div className="loader-core" />
      </div>
      <div className="loader-brand">FOM</div>
      <div className="loader-tagline">Fleet Operations &amp; Maintenance</div>
      <div className="loader-bar" aria-hidden="true">
        <span />
      </div>
      <div className="loader-status">{hidden ? 'Listo' : 'Iniciando plataforma'}</div>
    </div>
  )
}
