import { Composition } from 'remotion'
import { FomWeb, TOTAL } from './Video'

export const Root = () => (
  <Composition id="FomWeb" component={FomWeb} durationInFrames={TOTAL} fps={30} width={1920} height={1080} />
)
