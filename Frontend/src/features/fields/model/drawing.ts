import type { ShapeMode } from './shape'

/** The map tool in hand: select fields, or draw one as an outline or a circle. */
export type DrawingTool = 'select' | ShapeMode

/** One-line instruction above the toolbar for what to do next with the current tool. */
export function describeDrawingStep(
  tool: DrawingTool,
  { vertexCount, isPolygonClosed, hasCenter }: { vertexCount: number; isPolygonClosed: boolean; hasCenter: boolean },
): string | null {
  if (tool === 'polygon') {
    if (isPolygonClosed) {
      return 'Drag points to refine the boundary, then Save'
    }
    if (vertexCount === 0) {
      return 'Click to place the first boundary point'
    }
    if (vertexCount < 3) {
      return 'Keep adding boundary points'
    }
    return 'Click the first point or Finish to close the boundary'
  }
  if (tool === 'radius') {
    return hasCenter ? 'Adjust the centre or radius, then Save' : 'Click to set the field centre'
  }
  return null
}
