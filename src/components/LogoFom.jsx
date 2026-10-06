import '../styles/brand.css'

/** Vector version of the approved Concepto 08; no raster background or caption. */
export default function LogoFom({ simbolo = false, className = '', decorativo = false }) {
  return <img className={`fom-logo${simbolo ? ' fom-logo-simbolo' : ''} ${className}`} src={`/brand/fom-${simbolo ? 'symbol' : 'logo'}.svg`} alt={decorativo ? '' : 'FOM'} aria-hidden={decorativo || undefined} width={simbolo ? 104 : 280} height={84} />
}
