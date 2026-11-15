import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { useEffect, useState } from 'react'
import Cloud from '~icons/fluent-emoji-flat/cloud'
import Satellite from '~icons/fluent-emoji-flat/satellite'
import Seedling from '~icons/fluent-emoji-flat/seedling'
import Sun from '~icons/fluent-emoji-flat/sun'

/** What the advisor works through for every request; the caption cycles through them while it runs. */
const STAGES = [
  'Reading NASA climate records',
  'Checking soil and crop history',
  'Scoring crops for this field',
  'Comparing rotation plans',
] as const

const STAGE_MS = 1800
const SPROUTS = 9

type AdviceLoadingProps = {
  fieldName: string
}

export function AdviceLoading({ fieldName }: AdviceLoadingProps) {
  const reduceMotion = useReducedMotion() ?? false
  const [stage, setStage] = useState(0)

  useEffect(() => {
    const timer = window.setInterval(() => setStage((current) => (current + 1) % STAGES.length), STAGE_MS)
    return () => window.clearInterval(timer)
  }, [])

  return (
    <div
      role="status"
      aria-live="polite"
      className="overflow-hidden rounded-xl bg-white ring-1 ring-zinc-950/5 dark:bg-zinc-900 dark:ring-white/10"
    >
      <FieldScene animate={!reduceMotion} />
      <div className="flex flex-col items-center gap-1 px-6 py-5 text-center">
        <p className="text-base/6 font-semibold text-zinc-950 dark:text-white">Analysing {fieldName}</p>
        <div className="relative h-6 w-full">
          <AnimatePresence mode="wait" initial={false}>
            <motion.p
              key={stage}
              initial={reduceMotion ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduceMotion ? undefined : { opacity: 0, y: -8 }}
              transition={{ duration: 0.25 }}
              className="text-sm/6 text-zinc-500 dark:text-zinc-400"
            >
              {STAGES[stage]}…
            </motion.p>
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}

/** A satellite sweeps over a field while seedlings come up row by row. */
function FieldScene({ animate }: { animate: boolean }) {
  const loop = { repeat: Infinity, ease: 'easeInOut' } as const

  return (
    <div
      aria-hidden="true"
      className="relative h-48 overflow-hidden bg-linear-to-b from-sky-200 to-sky-50 dark:from-indigo-950 dark:to-zinc-900"
    >
      <motion.div
        className="absolute top-5 right-8"
        animate={animate ? { rotate: 360, scale: [1, 1.08, 1] } : undefined}
        transition={{ rotate: { duration: 24, repeat: Infinity, ease: 'linear' }, scale: { duration: 3, ...loop } }}
      >
        <Sun className="size-14 drop-shadow-[0_0_18px_rgba(251,191,36,0.6)]" />
      </motion.div>

      {[
        { top: '18%', size: 'size-12', duration: 26, delay: 0 },
        { top: '34%', size: 'size-9', duration: 34, delay: -14 },
      ].map(({ top, size, duration, delay }) => (
        <motion.div
          key={top}
          className="absolute opacity-80"
          style={{ top }}
          initial={{ left: '-15%' }}
          animate={animate ? { left: ['-15%', '105%'] } : { left: '30%' }}
          transition={{ duration, delay, repeat: Infinity, ease: 'linear' }}
        >
          <Cloud className={size} />
        </motion.div>
      ))}

      <motion.div
        className="absolute top-3 flex w-24 flex-col items-center"
        initial={{ left: '2%' }}
        animate={animate ? { left: ['2%', '82%'] } : { left: '40%' }}
        transition={{ duration: 6, ...loop, repeatType: 'reverse' }}
      >
        <motion.div animate={animate ? { rotate: [-8, 8, -8] } : undefined} transition={{ duration: 2, ...loop }}>
          <Satellite className="size-10" />
        </motion.div>
        <motion.div
          className="h-28 w-24 bg-linear-to-b from-emerald-300/60 to-transparent [clip-path:polygon(45%_0,55%_0,100%_100%,0_100%)] dark:from-emerald-400/40"
          animate={animate ? { opacity: [0.35, 0.9, 0.35] } : undefined}
          transition={{ duration: 1.2, ...loop }}
        />
      </motion.div>

      <div className="absolute inset-x-0 bottom-0 h-14 bg-[repeating-linear-gradient(180deg,#a16207_0_7px,#78350f_7px_10px)] dark:bg-[repeating-linear-gradient(180deg,#78350f_0_7px,#451a03_7px_10px)]" />
      <div className="absolute inset-x-0 bottom-9 flex justify-around px-4">
        {Array.from({ length: SPROUTS }, (_, index) => (
          <motion.div
            key={index}
            style={{ originY: 1 }}
            initial={{ scale: animate ? 0 : 1 }}
            animate={animate ? { scale: [0, 1.15, 1, 1, 0] } : { scale: 1 }}
            transition={{
              duration: 3.6,
              times: [0, 0.18, 0.26, 0.85, 1],
              delay: index * 0.18,
              repeat: Infinity,
              repeatDelay: 0.4,
            }}
          >
            <Seedling className="size-8" />
          </motion.div>
        ))}
      </div>
    </div>
  )
}
