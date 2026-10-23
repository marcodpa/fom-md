// Escenas extra de la web v8 (T-142; puestas en sus páginas en T-144: televisor en Inicio,
// monitores en Plataforma, aviso en Seguridad y cabina en App). Cada una se mueve sola (piezasEscenaV8 → usarEscenaV8): no hace falta
// useMomentoV8 para que funcionen, y se pueden poner en cualquier página.
//   import { EscenaTelevisorV8 } from '../../components/v8/escenasExtraV8'
export { default as EscenaTelevisorV8 } from './EscenaTelevisorV8'
export { default as EscenaMonitoresV8 } from './EscenaMonitoresV8'
export { default as EscenaAlertaV8 } from './EscenaAlertaV8'
export { default as EscenaTableroV8 } from './EscenaTableroV8'
export { usarEscenaV8, CapturaV8, MEDIDAS_ESCENA_V8 } from './piezasEscenaV8'
