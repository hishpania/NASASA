import { divIcon, type DivIcon } from 'leaflet'

function createHandleIcon(sizePx: number, classes: string): DivIcon {
  return divIcon({
    className: 'shape-handle',
    html: `<span class="block rounded-full border-2 border-zinc-950 shadow-md ${classes}" style="width:${sizePx}px;height:${sizePx}px"></span>`,
    iconSize: [sizePx, sizePx],
    iconAnchor: [sizePx / 2, sizePx / 2],
  })
}

export const vertexIcon = createHandleIcon(14, 'bg-amber-400')
export const selectedVertexIcon = createHandleIcon(18, 'bg-white')
export const closingVertexIcon = createHandleIcon(22, 'bg-white animate-pulse cursor-pointer')
export const midpointIcon = createHandleIcon(10, 'bg-white/80 cursor-copy')

export const removeVertexIcon = divIcon({
  className: 'shape-handle',
  html: `<span title="Remove point" class="grid size-6 cursor-pointer place-items-center rounded-full bg-white text-zinc-950 shadow-lg ring-1 ring-zinc-950/20 hover:bg-red-600 hover:text-white"><svg viewBox="0 0 16 16" fill="currentColor" class="size-3.5"><path d="M5.28 4.22a.75.75 0 0 0-1.06 1.06L6.94 8l-2.72 2.72a.75.75 0 1 0 1.06 1.06L8 9.06l2.72 2.72a.75.75 0 1 0 1.06-1.06L9.06 8l2.72-2.72a.75.75 0 0 0-1.06-1.06L8 6.94 5.28 4.22Z"/></svg></span>`,
  iconSize: [24, 24],
  iconAnchor: [-6, 30],
})
