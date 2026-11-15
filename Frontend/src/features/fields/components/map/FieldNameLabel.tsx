import { formatHectares } from '@/lib/format'
import type { Field } from '../../model/collection'
import type { LabelVariant } from './labelLayout'

type FieldNameLabelProps = {
  field: Field
  variant: LabelVariant
}

/** The field's name on the map, with its area when there is room. */
export function FieldNameLabel({ field, variant }: FieldNameLabelProps) {
  return (
    <div className="max-w-48 text-sm/5">
      <p className="truncate font-semibold text-zinc-950 dark:text-white">{field.name}</p>
      {variant === 'full' && (
        <p className="text-xs/4 text-zinc-500 tabular-nums dark:text-zinc-400">
          {formatHectares(field.shape.areaHectares)}
        </p>
      )}
    </div>
  )
}
