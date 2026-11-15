export type DrawingTool = 'select' | 'polygon'

export function describeDrawingStep(
  tool: DrawingTool,
  { vertexCount, isPolygonClosed }: { vertexCount: number; isPolygonClosed: boolean },
): string | null {
  if (tool !== 'polygon') {
    return null
  }
  if (isPolygonClosed) {
    return 'Drag points to adjust, click one to remove it, then Save'
  }
  if (vertexCount === 0) {
    return 'Outline one crop: click to place the first point'
  }
  if (vertexCount < 3) {
    return 'Keep adding boundary points'
  }
  return 'Click the first point or Finish to close the boundary'
}
