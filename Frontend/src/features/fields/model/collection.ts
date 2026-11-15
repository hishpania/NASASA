import type { Place } from './place'
import type { Shape } from './shape'

export type Field = {
  id: string
  name: string
  place: Place | null
  shape: Shape
}

export type FieldDetails = Omit<Field, 'id'>

export class FieldCollection {
  static readonly EMPTY = new FieldCollection([])

  static of(entries: readonly Field[]): FieldCollection {
    return new FieldCollection(entries)
  }

  readonly entries: readonly Field[]

  private constructor(entries: readonly Field[]) {
    this.entries = entries
  }

  get size(): number {
    return this.entries.length
  }

  get isEmpty(): boolean {
    return this.entries.length === 0
  }

  find(id: string): Field | undefined {
    return this.entries.find((entry) => entry.id === id)
  }

  add(entry: Field): FieldCollection {
    return new FieldCollection([...this.entries, entry])
  }

  update(id: string, changes: Partial<FieldDetails>): FieldCollection {
    return new FieldCollection(this.entries.map((entry) => (entry.id === id ? { ...entry, ...changes } : entry)))
  }

  remove(id: string): FieldCollection {
    return new FieldCollection(this.entries.filter((entry) => entry.id !== id))
  }

  nextDefaultName(): string {
    return `Field ${this.size + 1}`
  }
}
