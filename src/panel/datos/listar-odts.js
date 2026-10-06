/** El listado completo no se corta en la primera página de 100 órdenes. */
export async function listarTodasOdts(api, filtros = {}) {
  const items = new Map()
  let desplazamiento = 0
  while (true) {
    const respuesta = await api.odts({ ...filtros, limite: 100, desplazamiento })
    const pagina = respuesta?.items ?? []
    const antes = items.size
    for (const orden of pagina) items.set(orden.id, orden)
    const total = Number(respuesta?.page?.total)
    if (pagina.length < 100 || Number.isFinite(total) && items.size >= total) return [...items.values()]
    if (items.size === antes) throw new Error('No se pudieron consultar todas las órdenes. El servidor repitió una página; vuelve a intentarlo.')
    desplazamiento += pagina.length
  }
}
