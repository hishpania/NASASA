import { apiClient, type HttpClient } from '@/lib/api'
import type { ClimateForecast } from '../model/forecast'
import type { MonthlyOutlook } from '../model/outlook'

export class ForecastApi {
  private readonly http: HttpClient

  constructor(http: HttpClient) {
    this.http = http
  }

  forField(fieldId: string, signal?: AbortSignal): Promise<ClimateForecast> {
    return this.http.get<ClimateForecast>(`/Fields/${fieldId}/forecast`, signal)
  }

  outlookForField(fieldId: string, signal?: AbortSignal): Promise<MonthlyOutlook> {
    return this.http.get<MonthlyOutlook>(`/Fields/${fieldId}/outlook`, signal)
  }
}

export const forecastApi = new ForecastApi(apiClient)
