/* eslint-disable @typescript-eslint/no-explicit-any */
// import * as Types from './clickhouse.types'

export interface Connection {
  url: string
  port: number
  user: string
  password: string
  database: string
  ca?: Buffer
}
export interface Options {
  clickhouseSettings?: Record<string, unknown>
  defaultResponseFormat: 'JSON' | 'CSV' | 'TSV' | string
}

type ClickhouseMap = Record<string | number, string | number>

export type JSONFormatRow = Record<string, string | number | ClickhouseMap>

export interface QueryOptions extends Record<any, any> {
  responseFormat?: 'JSON' | 'CSV' | 'TSV' | string
  noFormat?: boolean
}
