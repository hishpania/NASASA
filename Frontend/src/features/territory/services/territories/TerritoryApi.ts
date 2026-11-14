import type { HttpClient } from '@/lib/api'
import type { TerritoryEntry, TerritoryEntryDetails } from '../../model/collection'
import { toEntry, toPayload, type TerritoryDto } from './territoryDto'

const RESOURCE = '/Territories'

export class TerritoryApi {
  private readonly http: HttpClient

  constructor(http: HttpClient) {
    this.http = http
  }

  async list(signal?: AbortSignal): Promise<TerritoryEntry[]> {
    const territories = await this.http.get<TerritoryDto[]>(RESOURCE, signal)
    return territories.map(toEntry)
  }

  async create(details: TerritoryEntryDetails): Promise<TerritoryEntry> {
    return toEntry(await this.http.post<TerritoryDto>(RESOURCE, toPayload(details)))
  }

  async update(id: string, details: TerritoryEntryDetails): Promise<TerritoryEntry> {
    return toEntry(await this.http.put<TerritoryDto>(`${RESOURCE}/${id}`, { id: Number(id), ...toPayload(details) }))
  }

  remove(id: string): Promise<void> {
    return this.http.delete(`${RESOURCE}/${id}`)
  }
}
