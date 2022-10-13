/* eslint-disable @typescript-eslint/no-explicit-any */
import { AxiosResponse } from 'axios'
import { QueryOptions } from '../clickhouse'

export interface HttpClientConstructor {
  context: {
    url: string
    port: number
    user: string
    password: string
    database: string
    ca?: Buffer
  }
  options?: Record<string, unknown>
}

export interface HttpClientRequest {
  params?: Record<string, unknown>
  data: string
  requestOptions?: QueryOptions
}

export interface HttpClientResponse<T> {
  headers: any
  status: AxiosResponse['status']
  statusText: AxiosResponse['statusText']
  data: {
    rows: number
    rows_before_limit_at_least?: number
    meta: Array<{ name: string, type: string }>
    data: T[]
    statistics: {
      elapsed: number
      rows_read: number
      bytes_read: number
    }
  }
}
