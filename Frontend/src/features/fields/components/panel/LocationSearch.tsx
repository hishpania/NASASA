import { Combobox, ComboboxDescription, ComboboxLabel, ComboboxOption } from '@/components/catalyst/combobox'
import { Field, Label } from '@/components/catalyst/fieldset'
import { useState } from 'react'
import { usePlaceSearch } from '../../hooks/usePlaceSearch'
import type { LatLng } from '../../model/geo'
import type { Place } from '../../services'

type LocationSearchProps = {
  near: LatLng | null
  onSelect: (place: Place) => void
}

export function LocationSearch({ near, onSelect }: LocationSearchProps) {
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<Place | null>(null)
  const { places } = usePlaceSearch(query, near)

  const handleChange = (place: Place | null) => {
    setSelected(place)
    if (place) {
      onSelect(place)
    }
  }

  return (
    <Field>
      <Label>Find a place</Label>
      <Combobox<Place | null>
        options={places}
        value={selected}
        by="id"
        onChange={handleChange}
        onQueryChange={setQuery}
        displayValue={(place) => place?.name}
                aria-label="Find a place"
      >
        {(place) => (
          <ComboboxOption value={place}>
            <ComboboxLabel>{place.name}</ComboboxLabel>
            {place.description && <ComboboxDescription>{place.description}</ComboboxDescription>}
          </ComboboxOption>
        )}
      </Combobox>
    </Field>
  )
}

