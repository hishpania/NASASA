export type ProblemDetails = {
  title?: string
  detail?: string
  status?: number
  errors?: Record<string, string[]>
}

export class ApiError extends Error {
  readonly status: number
  readonly problem: ProblemDetails | null

  constructor(status: number, problem: ProblemDetails | null) {
    super(ApiError.describe(status, problem))
    this.name = 'ApiError'
    this.status = status
    this.problem = problem
  }

  get isUnauthorized(): boolean {
    return this.status === 401
  }

  private static describe(status: number, problem: ProblemDetails | null): string {
    const validationMessages = Object.values(problem?.errors ?? {}).flat()
    if (validationMessages.length > 0) {
      return validationMessages.join(' ')
    }
    return problem?.detail ?? problem?.title ?? `Request failed with status ${status}`
  }
}
