const hectareFormatter = new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 })

export function formatHectares(hectares: number): string {
  return `${hectareFormatter.format(hectares)} ha`
}
