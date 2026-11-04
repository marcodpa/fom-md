import { parseT399TcpReadback } from './meitrack-readback.js'
import { IP_RECEPTOR_CONFIRMADA, PUERTO_RECEPTOR_MEITRACK } from '../datos/gps.js'
export function receiverAvailable(raw) {
  const r = raw?.receiver
  return r?.available === true && r.activationAllowed === false
    && /^meitrack-operational-[a-f0-9-]{36}$/.test(r.reference)
    && r.destination?.host === IP_RECEPTOR_CONFIRMADA && r.destination.port === PUERTO_RECEPTOR_MEITRACK && r.destination.transport === 'tcp' ? r : null
}
export function connectionSms(password, apn, receiver, compatible, pending, noAuth) {
  if (!/^[0-9]{4}$/.test(password) || !/^[a-zA-Z0-9][a-zA-Z0-9.-]{0,99}$/.test(apn)
    || !receiverAvailable({receiver}) || !compatible || !pending || pending.gprs !== 0 || pending.sms !== 0 || !noAuth) return null
  return `${password},A21,1,${receiver.destination.host},${receiver.destination.port},${apn},,`
}
export function connectionReadback(raw, imei, firmware, apn) {
  const r = parseT399TcpReadback(raw, imei, firmware)
  return !!r && r.cells[3] === `IP1:${IP_RECEPTOR_CONFIRMADA}` && r.cells[4] === `PORT1:${PUERTO_RECEPTOR_MEITRACK}` && r.cells[8] === apn
}
