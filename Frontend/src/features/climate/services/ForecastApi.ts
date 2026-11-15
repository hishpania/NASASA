import { apiClient, type HttpClient } from '@/lib/api'
import type { ClimateForecast } from '../model/forecast'

export class ForecastApi {
  private readonly http: HttpClient

  constructor(http: HttpClient) {
    this.http = http
  }

  forField(fieldId: string, signal?: AbortSignal): Promise<ClimateForecast> {
    return this.http.get<ClimateForecast>(`/Fields/${fieldId}/forecast`, signal)
  }
}

export const forecastApi = new ForecastApi(apiClient)
