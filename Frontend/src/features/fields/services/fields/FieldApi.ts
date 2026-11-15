import type { HttpClient } from '@/lib/api'
import type { Field, FieldDetails } from '../../model/collection'
import { toField, toPayload, type FieldDto } from './fieldDto'

const RESOURCE = '/Fields'

export class FieldApi {
  private readonly http: HttpClient

  constructor(http: HttpClient) {
    this.http = http
  }

  async list(signal?: AbortSignal): Promise<Field[]> {
    const fields = await this.http.get<FieldDto[]>(RESOURCE, signal)
    return fields.map(toField)
  }

  async create(details: FieldDetails): Promise<Field> {
    return toField(await this.http.post<FieldDto>(RESOURCE, toPayload(details)))
  }

  async update(id: string, details: FieldDetails): Promise<Field> {
    return toField(await this.http.put<FieldDto>(`${RESOURCE}/${id}`, { id: Number(id), ...toPayload(details) }))
  }

  remove(id: string): Promise<void> {
    return this.http.delete(`${RESOURCE}/${id}`)
  }
}
