/**
 * Lee una lista paginada del servidor ENTERA, no solo su primera página.
 *
 * `pedirPagina(desplazamiento, limite)` devuelve `{ items, page: { total } }`.
 * La primera página dice el total; las que faltan se piden a la vez, de
 * `enParalelo` en `enParalelo` (el servidor limita las consultas de cada
 * usuario: soltarlas todas juntas acaba en 429). Sin total, se sigue página a
 * página hasta una vacía o más corta que la primera.
 *
 * `parar(pagina)` corta antes: sirve para listas que llegan de la más nueva a
 * la más vieja cuando solo interesa lo reciente (se lee en orden, sin paralelo).
 * `tope` es el máximo de páginas: si se alcanza, sale `incompleta: true` para
 * que la pantalla lo diga en vez de contar de menos sin avisar.
 */
export async function leerTodasLasPaginas(pedirPagina, {
  limite = 200,
  tope = 50,
  enParalelo = 5,
  clave = (x) => x?.id,
  parar = null,
  repetida = 'El servidor repitió una página. Vuelve a intentarlo.',
} = {}) {
  const items = new Map()
  // Lo que no trae identificador no se puede comparar: entra siempre.
  const sumar = (lista) => {
    const antes = items.size
    for (const x of lista) items.set(clave(x) ?? Symbol('sin-id'), x)
    return items.size - antes
  }
  const leerTotal = (r, previo) => {
    const t = Number(r?.page?.total)
    return Number.isFinite(t) ? t : previo
  }

  const primera = await pedirPagina(0, limite)
  let pagina = primera?.items ?? []
  sumar(pagina)
  // El tamaño real de página lo dice el servidor (puede cortar por debajo del límite pedido).
  const paso = pagina.length
  let total = leerTotal(primera, NaN)
  let paginas = 1
  let desplazamiento = paso
  let incompleta = false
  const salida = () => ({ items: [...items.values()], total: Number.isFinite(total) ? total : items.size, incompleta })
  // `parar` se consulta UNA vez por página: puede llevar la cuenta de lo ya visto.
  let cortar = Boolean(parar && parar(pagina))
  if (!paso || cortar) return salida()

  // Con el total ya conocido, lo que falta se pide en tandas a la vez.
  if (!parar && Number.isFinite(total)) {
    const faltan = []
    for (let d = paso; d < total && paginas + faltan.length < tope; d += paso) faltan.push(d)
    for (let i = 0; i < faltan.length; i += enParalelo) {
      const tanda = faltan.slice(i, i + enParalelo)
      const respuestas = await Promise.all(tanda.map((d) => pedirPagina(d, limite)))
      for (const r of respuestas) {
        sumar(r?.items ?? [])
        total = leerTotal(r, total)
      }
      paginas += tanda.length
      pagina = respuestas.at(-1)?.items ?? []
      desplazamiento = tanda.at(-1) + pagina.length
    }
  }

  // El resto, en orden: sin total, con `parar`, o si entraron registros nuevos mientras se leía.
  const terminado = () =>
    cortar ||
    !pagina.length ||
    (Number.isFinite(total) ? desplazamiento >= total : pagina.length < paso)
  while (!terminado()) {
    if (paginas >= tope) { incompleta = true; break }
    const r = await pedirPagina(desplazamiento, limite)
    pagina = r?.items ?? []
    paginas += 1
    total = leerTotal(r, total)
    if (pagina.length && !sumar(pagina)) throw new Error(repetida)
    desplazamiento += pagina.length
    if (parar && pagina.length) cortar = Boolean(parar(pagina))
  }
  return salida()
}

/**
 * El listado completo de órdenes (todas las páginas, de 200 en 200).
 * `opciones.parar` permite cortar antes cuando solo hace falta lo reciente.
 * Si se agota el tope de páginas, el arreglo lleva `incompleta = true`.
 */
export async function listarTodasOdts(api, filtros = {}, { parar = null } = {}) {
  const r = await leerTodasLasPaginas(
    (desplazamiento, limite) => api.odts({ ...filtros, limite, desplazamiento }),
    { parar, repetida: 'No se pudieron consultar todas las órdenes. El servidor repitió una página; vuelve a intentarlo.' },
  )
  if (r.incompleta) r.items.incompleta = true
  return r.items
}
