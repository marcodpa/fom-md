import { api } from './api'

const estados = { pending: 'pendiente', overdue: 'vencido', paid: 'pagado', void: 'anulado' }
export const pagosApi = {
  async listar({ empresaId = '', estado = '' } = {}) {
    const entes = (await api.entes({ limite: 200 })).items ?? []
    const grupos = await Promise.all(entes.filter(e => !empresaId || e.id === empresaId).map(async e => {
      const items = []
      let offset = 0
      while (true) {
        const r = await api.pagosServicio(e.id, { offset })
        const page = r.items ?? []
        items.push(...page)
        offset += page.length
        if (!page.length || offset >= (r.page?.total ?? offset)) break
      }
      return items.map(p => ({ id: p.id, empresaId: e.id, empresaNombre: e.name, periodo: p.periodStart?.slice(0, 7), monto: Number(p.amount), moneda: p.currency, estado: estados[p.status] ?? p.status, estadoActual: p.status, saldo: Number(p.balanceAmount ?? p.amount), pagadoEn: p.paidAt, venceEn: p.dueAt, nota: p.concept ?? '' }))
    }))
    return grupos.flat().filter(p => !estado || p.estado === estado)
  },
  async registrar({ empresaId, monto, periodo, venceEn, nota }) {
    if (!empresaId || !/^\d{4}-(0[1-9]|1[0-2])$/.test(periodo) || !Number.isFinite(Number(monto)) || Number(monto) <= 0 || !venceEn) throw new Error('Completa empresa, período, importe positivo y vencimiento.')
    return api.crearPagoServicio(empresaId, { periodStart: `${periodo}-01`, amount: Number(monto).toFixed(2), currency: 'USD', dueAt: new Date(`${venceEn}T12:00:00`).toISOString(), concept: nota?.trim() || 'Cuota mensual de servicio' })
  },
  async actualizarEstado(id, estado, _actor, cuota) {
    if (!cuota?.empresaId || !cuota?.estadoActual) throw new Error('Recarga la cuota antes de actualizarla.')
    if (estado === 'pagado') {
      if (!cuota.referencia || !/^[A-Za-z0-9][A-Za-z0-9:._/-]{2,119}$/.test(cuota.referencia)) throw new Error('La referencia del abono debe tener de 3 a 120 caracteres, sin espacios.')
      return api.abonarPagoServicio(cuota.empresaId, id, { amount: Number(cuota.saldo).toFixed(2), reference: cuota.referencia, concept: 'Abono registrado desde el panel' })
    }
    return api.moverPagoServicio(cuota.empresaId, id, { expectedStatus: cuota.estadoActual, status: estado === 'anulado' ? 'void' : 'overdue', reason: 'actualizacion-desde-panel' })
  },
}
