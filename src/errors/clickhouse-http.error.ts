/**
 * HttpClickhouseError is a custom error for handling Axios Crashes or Clickhouse bad responses
 */
export class HttpClickhouseError extends Error {
  status: number
  statusText: string
  headers: Record<string, unknown>

  /**
   * Create HttpClickhouseError instance
   *
   * @param error ErrorOptions
   */
  constructor (error: {
    status: number
    statusText: string
    message?: string
    headers: any
  }) {
    super(error.message)
    this.status = error.status
    this.statusText = error.statusText
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    this.headers = error.headers
  }
}

/**
 * Custom HTTP error for Axios client
 */
export class HttpClickhouseAxiosError extends HttpClickhouseError {}
