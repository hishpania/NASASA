import { apiClient, type HttpClient } from '@/lib/api'
import type { Advice, AdviceOptions } from '../model/advice'

export class AdviceApi {
  private readonly http: HttpClient

  constructor(http: HttpClient) {
    this.http = http
  }

  forField(fieldId: string, { previousCrop, irrigated }: AdviceOptions, signal?: AbortSignal): Promise<Advice> {
    const query = new URLSearchParams({ irrigated: String(irrigated) })
    if (previousCrop) {
      query.append('previousCrops', previousCrop)
    }
    return this.http.get<Advice>(`/Fields/${fieldId}/recommendations?${query}`, signal)
  }
}

export const adviceApi = new AdviceApi(apiClient)
