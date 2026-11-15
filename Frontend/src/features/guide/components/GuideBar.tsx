import { Button } from '@/components/catalyst/button'
import { ArrowRightIcon, CheckIcon, XMarkIcon } from '@heroicons/react/16/solid'
import clsx from 'clsx'
import { AnimatePresence, motion } from 'motion/react'
import { Fragment, useEffect } from 'react'
import { useLocation } from 'react-router'
import PartyPopper from '~icons/fluent-emoji-flat/party-popper'
import { useGuide } from '../hooks/useGuide'

/** A non-blocking "what to do next" strip: the steps, the current one explained, and a shortcut to it. */
export function GuideBar() {
  const { steps, done, current, hidden, hide } = useGuide()
  const { pathname } = useLocation()
  const isFinished = current === null

  // Once every step is done, show the congratulation briefly and get out of the way for good.
  useEffect(() => {
    if (!isFinished || hidden) {
      return
    }
    const timer = window.setTimeout(hide, 4000)
    return () => window.clearTimeout(timer)
  }, [isFinished, hidden, hide])

  return (
    <AnimatePresence initial={false}>
      {!hidden && (
        <motion.div
          key="guide"
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          className="shrink-0 overflow-hidden"
        >
          <div className="border-b border-zinc-950/5 bg-white dark:border-white/5 dark:bg-zinc-900">
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 px-4 py-2.5 sm:px-6">
              <ol aria-label="Getting started" className="flex items-center gap-1.5">
                {steps.map((step, index) => {
                  const isDone = done.has(step.id)
                  const isCurrent = current?.id === step.id
                  return (
                    <Fragment key={step.id}>
                      {index > 0 && (
                        <span
                          aria-hidden="true"
                          className={clsx(
                            'h-px w-4 sm:w-6',
                            isDone ? 'bg-zinc-400 dark:bg-zinc-500' : 'bg-zinc-950/10 dark:bg-white/10',
                          )}
                        />
                      )}
                      <li
                        aria-current={isCurrent ? 'step' : undefined}
                        className={clsx(
                          'flex items-center gap-1.5 text-xs/5 font-medium whitespace-nowrap',
                          isCurrent ? 'text-zinc-950 dark:text-white' : 'text-zinc-500 dark:text-zinc-400',
                        )}
                      >
                        <span
                          className={clsx(
                            'grid size-5 shrink-0 place-items-center rounded-full text-[11px]/none tabular-nums',
                            isCurrent
                              ? 'bg-emerald-600 text-white'
                              : isDone
                                ? 'bg-zinc-950/10 text-zinc-700 dark:bg-white/10 dark:text-zinc-200'
                                : 'ring-1 ring-zinc-950/15 dark:ring-white/20',
                          )}
                        >
                          {isDone ? <CheckIcon className="size-3.5" aria-hidden="true" /> : index + 1}
                        </span>
                        <span className={clsx(!isCurrent && 'max-lg:hidden')}>{step.title}</span>
                      </li>
                    </Fragment>
                  )
                })}
              </ol>

              <div className="flex min-w-0 flex-1 items-center gap-3">
                <AnimatePresence mode="wait" initial={false}>
                  <motion.p
                    key={current?.id ?? 'done'}
                    initial={{ opacity: 0, x: 8 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -8 }}
                    transition={{ duration: 0.2 }}
                    className="flex min-w-0 flex-1 items-center gap-2 text-sm/6 text-zinc-700 dark:text-zinc-300"
                  >
                    {current ? (
                      current.hint
                    ) : (
                      <>
                        <PartyPopper className="size-5 shrink-0" aria-hidden="true" />
                        Setup complete. Switch fields from the header at any time.
                      </>
                    )}
                  </motion.p>
                </AnimatePresence>
                {current && current.href !== pathname && (
                  <Button color="emerald" href={current.href} className="shrink-0">
                    {current.action}
                    <ArrowRightIcon data-slot="icon" />
                  </Button>
                )}
                <Button plain aria-label="Hide the guide" onClick={hide} className="shrink-0">
                  <XMarkIcon data-slot="icon" />
                </Button>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
