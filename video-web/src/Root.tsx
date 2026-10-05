import { Composition } from 'remotion'
import { FomWeb, TOTAL } from './Video'
import { MantenimientoSupervisor, MAINTENANCE_TOTAL } from './Mantenimiento'

export const Root = () => (
  <>
  <Composition id="MantenimientoSupervisor" component={MantenimientoSupervisor} durationInFrames={MAINTENANCE_TOTAL} fps={30} width={1920} height={1080} />
  <Composition id="FomWeb" component={FomWeb} durationInFrames={TOTAL} fps={30} width={1920} height={1080} />
  </>
)
