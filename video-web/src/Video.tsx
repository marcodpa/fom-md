import React from 'react'
import { AbsoluteFill } from 'remotion'
import { C, fontFamily } from './theme'
import { linearTiming, TransitionSeries } from '@remotion/transitions'
import { fade } from '@remotion/transitions/fade'
import { slide } from '@remotion/transitions/slide'
import { wipe } from '@remotion/transitions/wipe'
import { App, Funciones, Intro, Plataforma } from './scenes1'
import { Areas, Beneficios, Cierre, Roles, Seguridad } from './scenes2'

const T = 18
const scenes: [React.FC, number, 'fade' | 'slide' | 'wipe'][] = [
  [Intro, 150, 'fade'],
  [Plataforma, 270, 'slide'],
  [App, 270, 'wipe'],
  [Funciones, 270, 'slide'],
  [Seguridad, 270, 'fade'],
  [Areas, 240, 'wipe'],
  [Roles, 240, 'slide'],
  [Beneficios, 240, 'fade'],
  [Cierre, 180, 'fade'],
]
export const TOTAL = scenes.reduce((a, [, d]) => a + d, 0) - T * (scenes.length - 1)

const pres = (k: 'fade' | 'slide' | 'wipe'): any =>
  k === 'fade' ? fade() : k === 'slide' ? slide({ direction: 'from-right' }) : wipe({ direction: 'from-left' })

export const FomWeb: React.FC = () => (
  <AbsoluteFill style={{ fontFamily, color: C.ink, background: C.bg }}>
  <TransitionSeries>
    {scenes.flatMap(([Scene, d, tr], i) => {
      const seq = (
        <TransitionSeries.Sequence key={'s' + i} durationInFrames={d}>
          <Scene />
        </TransitionSeries.Sequence>
      )
      return i === 0
        ? [seq]
        : [<TransitionSeries.Transition key={'t' + i} presentation={pres(scenes[i - 1][2])} timing={linearTiming({ durationInFrames: T })} />, seq]
    })}
  </TransitionSeries>
  </AbsoluteFill>
)
