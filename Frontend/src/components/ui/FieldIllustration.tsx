import clsx from 'clsx'
import { AnimatePresence, motion } from 'motion/react'
import { useId } from 'react'
import Satellite from '~icons/fluent-emoji-flat/satellite'
import type { FieldPhase } from './useFieldPhase'

const PLOTS = [
  { points: '0,0 150,0 140,96 0,120', light: '#fef3c7', dark: '#57381a' },
  { points: '150,0 310,0 300,74 140,96', light: '#86efac', dark: '#166534' },
  { points: '310,0 470,0 480,52 300,74', light: '#fde68a', dark: '#713f12' },
  { points: '470,0 640,0 640,34 480,52', light: '#a7f3d0', dark: '#064e3b' },
  { points: '0,120 140,96 170,170 0,190', light: '#bbf7d0', dark: '#14532d' },
  { points: '140,96 300,74 330,150 170,170', light: '#fde68a', dark: '#713f12' },
  { points: '300,74 480,52 520,130 330,150', light: '#a7f3d0', dark: '#064e3b' },
  { points: '480,52 640,34 640,112 520,130', light: '#fef08a', dark: '#5b4a0f' },
  { points: '0,190 170,170 196,240 0,240', light: '#fde68a', dark: '#713f12' },
  { points: '170,170 330,150 356,240 196,240', light: '#86efac', dark: '#166534' },
  { points: '330,150 520,130 552,240 356,240', light: '#fef3c7', dark: '#57381a' },
  { points: '520,130 640,112 640,240 552,240', light: '#bbf7d0', dark: '#14532d' },
]

const CORNERS = [
  [196, 172],
  [318, 158],
  [340, 222],
  [212, 234],
] as const

const OUTLINE = `M ${CORNERS.map(([x, y]) => `${x} ${y}`).join(' L ')} Z`

const MAP_X = 120
const MAP_Y = 56
const SCALE_X = 0.625
const SCALE_Y = 0.8
const CENTER_X = MAP_X + 266 * SCALE_X
const CENTER_Y = MAP_Y + 196 * SCALE_Y

type FieldIllustrationProps = {
  phase: FieldPhase
  animated?: boolean
  compact?: boolean
  className?: string
}

export function FieldIllustration({ phase, animated = true, compact = false, className }: FieldIllustrationProps) {
  const clipId = useId()
  const duration = animated ? 1 : 0

  return (
    <div aria-hidden="true" className={clsx('relative overflow-hidden', className)}>
      <svg viewBox={compact ? '104 4 432 252' : '0 0 640 260'} className="absolute inset-0 size-full">
        <defs>
          <clipPath id={clipId}>
            <rect x="0" y="0" width="640" height="240" rx="28" />
          </clipPath>
        </defs>
        <g transform={`translate(${MAP_X} ${MAP_Y}) scale(${SCALE_X} ${SCALE_Y})`}>
          <rect x="6" y="14" width="640" height="240" rx="28" fill="rgba(15,23,42,0.18)" />
          <g clipPath={`url(#${clipId})`}>
            <g className="dark:hidden">
              {PLOTS.map((plot) => (
                <polygon key={plot.points} points={plot.points} fill={plot.light} stroke="#ffffff" strokeWidth="4" />
              ))}
            </g>
            <g className="hidden dark:block">
              {PLOTS.map((plot) => (
                <polygon key={plot.points} points={plot.points} fill={plot.dark} stroke="#27272a" strokeWidth="4" />
              ))}
            </g>
            <motion.path
              d={OUTLINE}
              stroke="#10b981"
              strokeWidth="4"
              strokeDasharray="12 8"
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
              fill="#34d399"
              initial={false}
              animate={{
                pathLength: phase === 0 ? 0 : 1,
                opacity: phase === 0 ? 0 : 1,
                fillOpacity: phase === 2 ? 0.45 : 0,
              }}
              transition={{
                pathLength: { duration: phase === 1 ? 1.6 * duration : 0.3 * duration, ease: 'easeInOut' },
                opacity: { duration: 0.2 * duration },
                fillOpacity: { duration: 0.5 * duration },
              }}
            />
          </g>
        </g>

        {CORNERS.map(([x, y], index) => (
          <motion.circle
            key={`${x}-${y}`}
            cx={MAP_X + x * SCALE_X}
            cy={MAP_Y + y * SCALE_Y}
            r="4.5"
            fill="#ffffff"
            stroke="#10b981"
            strokeWidth="2.5"
            initial={false}
            animate={{ scale: phase === 0 ? 0 : 1 }}
            transition={{ delay: phase === 1 ? index * 0.4 * duration : 0, duration: 0.25 * duration }}
            style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
          />
        ))}

        <AnimatePresence>
          {phase === 0 && (
            <motion.g
              key="pin"
              initial={animated ? { y: -60, opacity: 0 } : false}
              animate={{ y: [0, -6, 0], opacity: 1 }}
              exit={{ y: -20, opacity: 0, transition: { duration: 0.25 * duration } }}
              transition={{
                y: { duration: 1.4, repeat: Infinity, ease: 'easeInOut', delay: 0.45 * duration },
                opacity: { duration: 0.3 * duration },
              }}
            >
              <path
                d={`M ${CENTER_X} ${CENTER_Y - 46} c -13 0 -22 9 -22 21 c 0 16 22 37 22 37 s 22 -21 22 -37 c 0 -12 -9 -21 -22 -21 z`}
                fill="#ef4444"
                stroke="#ffffff"
                strokeWidth="2.5"
              />
              <circle cx={CENTER_X} cy={CENTER_Y - 25} r="7.5" fill="#ffffff" />
            </motion.g>
          )}
          {phase === 2 && (
            <motion.g
              key="saved"
              initial={animated ? { scale: 0, opacity: 0 } : false}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.6, opacity: 0, transition: { duration: 0.2 * duration } }}
              transition={{ type: 'spring', stiffness: 380, damping: 18, delay: 0.25 * duration }}
              style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
            >
              <circle cx={CENTER_X} cy={CENTER_Y} r="17" fill="#059669" stroke="#ffffff" strokeWidth="3" />
              <path
                d={`M ${CENTER_X - 7} ${CENTER_Y} l 5 5 l 9 -10`}
                fill="none"
                stroke="#ffffff"
                strokeWidth="3.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </motion.g>
          )}
        </AnimatePresence>
      </svg>
      <motion.div
        className={clsx('absolute', compact ? 'top-[2%] w-[14%]' : 'top-[4%] w-[12%] max-w-12')}
        initial={{ left: '50%' }}
        animate={
          animated
            ? { left: compact ? ['30%', '62%', '30%'] : ['42%', '54%', '42%'], rotate: [-6, 6, -6] }
            : undefined
        }
        transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
      >
        <Satellite className="size-full" />
      </motion.div>
    </div>
  )
}
