import { Button } from '@/components/catalyst/button'
import { formatHectares } from '@/lib/format'
import {
  ArrowUturnLeftIcon,
  CheckIcon,
  CursorArrowRaysIcon,
  PencilIcon,
  TrashIcon,
  XMarkIcon,
} from '@heroicons/react/16/solid'
import clsx from 'clsx'
import type { ComponentType, SVGProps } from 'react'
import type { DrawingTool } from '../../model/drawing'

const TOOLS: readonly { value: DrawingTool; label: string; icon: ComponentType<SVGProps<SVGSVGElement>> }[] = [
  { value: 'select', label: 'Select', icon: CursorArrowRaysIcon },
  { value: 'polygon', label: 'Outline', icon: PencilIcon },
]

type DrawingToolbarProps = {
  tool: DrawingTool
  onToolChange: (tool: DrawingTool) => void
  vertexCount: number
  isPolygonClosed: boolean
  canClosePolygon: boolean
  /** Area of the finished shape, or null while it is still being drawn. */
  areaHectares: number | null
  isEditing: boolean
  canSave: boolean
  onUndo: () => void
  onFinish: () => void
  onClear: () => void
  onSave: () => void
  onCancel: () => void
}

const DIVIDER = <span aria-hidden="true" className="mx-1 h-6 w-px shrink-0 bg-zinc-950/10 dark:bg-white/10" />

/** Whiteboard-style tools pinned to the bottom of the map: pick a tool, then its own controls appear next to it. */
export function DrawingToolbar({
  tool,
  onToolChange,
  vertexCount,
  isPolygonClosed,
  canClosePolygon,
  areaHectares,
  isEditing,
  canSave,
  onUndo,
  onFinish,
  onClear,
  onSave,
  onCancel,
}: DrawingToolbarProps) {
  const isDrawing = tool !== 'select'

  return (
    <div
      role="toolbar"
      aria-label="Drawing tools"
      className="pointer-events-auto flex max-w-full items-center gap-1 overflow-x-auto rounded-2xl bg-white/95 p-1.5 shadow-xl ring-1 ring-zinc-950/10 backdrop-blur dark:bg-zinc-900/95 dark:ring-white/10"
    >
      {TOOLS.map(({ value, label, icon: Icon }) => (
        <button
          key={value}
          type="button"
          aria-pressed={tool === value}
          onClick={() => onToolChange(value)}
          className={clsx(
            'flex shrink-0 flex-col items-center gap-0.5 rounded-xl px-3 py-1.5 text-[11px]/4 font-medium transition',
            'focus:outline-hidden focus-visible:outline-2 focus-visible:outline-blue-500 disabled:opacity-40',
            tool === value
              ? 'bg-zinc-950 text-white dark:bg-white dark:text-zinc-950'
              : 'text-zinc-600 hover:bg-zinc-950/5 hover:text-zinc-950 dark:text-zinc-300 dark:hover:bg-white/10 dark:hover:text-white',
          )}
        >
          <Icon className="size-5" aria-hidden="true" />
          {label}
        </button>
      ))}

      {tool === 'polygon' && !isPolygonClosed && (
        <>
          {DIVIDER}
          <span className="shrink-0 px-1 text-xs/5 text-zinc-500 tabular-nums dark:text-zinc-400">
            {vertexCount} {vertexCount === 1 ? 'point' : 'points'}
          </span>
          <Button plain onClick={onUndo} disabled={vertexCount === 0} aria-label="Undo last point">
            <ArrowUturnLeftIcon data-slot="icon" />
          </Button>
          <Button outline onClick={onFinish} disabled={!canClosePolygon} className="shrink-0">
            <CheckIcon data-slot="icon" />
            Finish
          </Button>
        </>
      )}

      {isDrawing && (
        <>
          {vertexCount > 0 && (
            <Button plain onClick={onClear} className="shrink-0">
              <TrashIcon data-slot="icon" />
              Clear
            </Button>
          )}
          {DIVIDER}
          {areaHectares !== null && (
            <span className="shrink-0 px-1 text-sm/6 font-semibold text-zinc-950 tabular-nums dark:text-white">
              {formatHectares(areaHectares)}
            </span>
          )}
          <Button color="emerald" onClick={onSave} disabled={!canSave} className="shrink-0">
            <CheckIcon data-slot="icon" />
            {isEditing ? 'Save changes' : 'Save'}
          </Button>
          <Button plain onClick={onCancel} aria-label="Cancel drawing">
            <XMarkIcon data-slot="icon" />
          </Button>
        </>
      )}
    </div>
  )
}
