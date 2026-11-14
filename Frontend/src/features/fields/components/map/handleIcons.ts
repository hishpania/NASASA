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
export const closingVertexIcon = createHandleIcon(22, 'bg-white animate-pulse cursor-pointer')
export const centerIcon = createHandleIcon(18, 'bg-amber-400')
export const midpointIcon = createHandleIcon(10, 'bg-white/80 cursor-copy')
