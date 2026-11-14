import type { FieldCollection } from '../../model/collection'

const POSITION_PATTERN = /\[\s+(-?[\d.]+),\s+(-?[\d.]+)\s+\]/g
const LAT_LNG_PATTERN = /\{\s+"lat": (-?[\d.]+),\s+"lng": (-?[\d.]+)\s+\}/g

function formatJson(value: unknown): string {
  return JSON.stringify(value, null, 2)
    .replace(POSITION_PATTERN, '[$1, $2]')
    .replace(LAT_LNG_PATTERN, '{ "lat": $1, "lng": $2 }')
}

type FieldsJsonProps = {
  collection: FieldCollection
}

export function FieldsJson({ collection }: FieldsJsonProps) {
  return (
    <pre className="max-h-96 overflow-auto rounded-lg bg-zinc-950 p-4 font-mono text-xs/5 text-zinc-100 ring-1 ring-zinc-950/10 select-all dark:bg-black/40 dark:ring-white/10">
      {formatJson(collection.toFeatureCollection())}
    </pre>
  )
}
