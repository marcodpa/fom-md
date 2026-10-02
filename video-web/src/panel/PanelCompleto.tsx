import React from 'react'
import { AbsoluteFill } from 'remotion'
import { linearTiming, TransitionSeries } from '@remotion/transitions'
import { fade } from '@remotion/transitions/fade'
import { slide } from '@remotion/transitions/slide'
import { wipe } from '@remotion/transitions/wipe'
import { C, fontFamily } from '../theme'
import { duracionTour, Tour } from './Tour'
import { TOURS } from './escenas'
import { ColaCinco, Cierre, Deriva, Intro, OrdenFlujo, Parada, ProximosPasos, QueEsElPanel, Roles } from './Graficos'

type Trans = 'fade' | 'slide' | 'wipe'
type Escena = { id: string; frames: number; trans: Trans; el: React.FC }

const tour = (k: keyof typeof TOURS): Escena => ({ id: k, frames: duracionTour(TOURS[k]), trans: 'fade', el: () => <Tour {...TOURS[k]} /> })
const graf = (id: string, el: React.FC, seg: number, trans: Trans = 'slide'): Escena => ({ id, frames: Math.round(seg * 30), trans, el })

// El orden de la historia: qué es el panel → centro de control → lo nuevo de los recorridos → el resto de módulos → permisos → lo que viene.
export const ESCENAS: Escena[] = [
  graf('intro', Intro, 5, 'fade'),
  graf('que-es', QueEsElPanel, 8),
  tour('login'),
  tour('resumen'),
  tour('mapa-vivo'),
  tour('mapa-zoom'),
  tour('mapa-seleccion'),
  graf('cola', ColaCinco, 9.5, 'wipe'),
  tour('recorrido'),
  graf('deriva', Deriva, 8.5),
  graf('parada', Parada, 9.5, 'wipe'),
  tour('alertas'),
  tour('vehiculos'),
  tour('mantenimiento'),
  graf('orden', OrdenFlujo, 9.5),
  tour('inspecciones'),
  tour('documentos'),
  tour('gente'),
  tour('reportes'),
  graf('roles', Roles, 9.5, 'wipe'),
  graf('proximos', ProximosPasos, 10.5),
  graf('cierre', Cierre, 6, 'fade'),
]

const T = 15
export const PANEL_TOTAL = ESCENAS.reduce((a, e) => a + e.frames, 0) - T * (ESCENAS.length - 1)

const pres = (k: Trans): any => (k === 'fade' ? fade() : k === 'slide' ? slide({ direction: 'from-right' }) : wipe({ direction: 'from-left' }))

export const PanelCompleto: React.FC = () => (
  <AbsoluteFill style={{ fontFamily, color: C.ink, background: C.bg }}>
    <TransitionSeries>
      {ESCENAS.flatMap((e, i) => {
        const seq = (
          <TransitionSeries.Sequence key={'s' + e.id} durationInFrames={e.frames}>
            <e.el />
          </TransitionSeries.Sequence>
        )
        return i === 0
          ? [seq]
          : [<TransitionSeries.Transition key={'t' + e.id} presentation={pres(ESCENAS[i - 1].trans)} timing={linearTiming({ durationInFrames: T })} />, seq]
      })}
    </TransitionSeries>
  </AbsoluteFill>
)
