// Días de la semana en que toca una planilla de inspección (T-200).
// Contrato con el servidor: valores en minúscula y sin tilde; lista vacía (o los
// siete) = todos los días. El servidor guarda sin repetidos y en orden de semana;
// aquí se hace lo mismo para que lo mostrado y lo enviado coincidan.

export const DIAS_SEMANA = [
  { valor: 'lunes', letra: 'L', corto: 'Lun', largo: 'lunes' },
  { valor: 'martes', letra: 'M', corto: 'Mar', largo: 'martes' },
  { valor: 'miercoles', letra: 'M', corto: 'Mié', largo: 'miércoles' },
  { valor: 'jueves', letra: 'J', corto: 'Jue', largo: 'jueves' },
  { valor: 'viernes', letra: 'V', corto: 'Vie', largo: 'viernes' },
  { valor: 'sabado', letra: 'S', corto: 'Sáb', largo: 'sábado' },
  { valor: 'domingo', letra: 'D', corto: 'Dom', largo: 'domingo' },
]

const ORDEN = new Map(DIAS_SEMANA.map((d, i) => [d.valor, i]))

/** Lista limpia: solo días válidos, sin repetidos, en orden de semana. Acepta cualquier cosa. */
export function normalizarDias(lista) {
  if (!Array.isArray(lista)) return []
  return [...new Set(lista.filter((d) => ORDEN.has(d)))].sort((a, b) => ORDEN.get(a) - ORDEN.get(b))
}

/** ¿Toca todos los días? Ninguno marcado o los siete. */
export const tocaTodosLosDias = (lista) => {
  const dias = normalizarDias(lista)
  return dias.length === 0 || dias.length === DIAS_SEMANA.length
}

/** «Lun, Mié, Vie» o «Todos los días». */
export function textoDias(lista) {
  if (tocaTodosLosDias(lista)) return 'Todos los días'
  return normalizarDias(lista).map((d) => DIAS_SEMANA[ORDEN.get(d)].corto).join(', ')
}

/** Marca o desmarca un día; devuelve la lista nueva en orden de semana. */
export function alternarDia(lista, dia) {
  const dias = normalizarDias(lista)
  return normalizarDias(dias.includes(dia) ? dias.filter((d) => d !== dia) : [...dias, dia])
}

/** Lo que se manda al servidor: [] si toca todos los días. */
export const diasParaEnviar = (lista) => (tocaTodosLosDias(lista) ? [] : normalizarDias(lista))

export const AVISO_SIN_DIAS_EN_SERVIDOR = 'Disponible cuando se actualice el servidor'
