/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { AxiosError, AxiosResponse } from 'axios'

/**
 * ClickhouseHttpError is a custom error for handling Axios Crashes or Clickhouse bad responses
 */
export class ClickhouseHttpError extends Error {
  status?: number
  statusText?: string
  config?: Record<any, any>
  headers?: AxiosResponse['headers']

  /**
   * Create ClickhouseHttpError instance
   *
   * @param {AxiosError} error axios
   */
  constructor (error: AxiosError['response']) {
    super()
    this.message = error?.data as string
    this.status = error?.status
    this.statusText = error?.statusText
    this.headers = error?.headers
    this.config = error?.config
  }
}
