/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { AxiosError, AxiosResponse } from 'axios'

export class ClickhouseHttpError extends Error {
  status?: number
  statusText?: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  config?: Record<any, any>
  headers?: AxiosResponse['headers']

  constructor (error: AxiosError['response']) {
    super()
    this.message = error?.data as string
    this.status = error?.status
    this.statusText = error?.statusText
    this.headers = error?.headers
    this.config = error?.config
  }
}
