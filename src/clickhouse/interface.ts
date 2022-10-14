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
  defaultFormat: 'JSON' | 'CSV' | 'TSV' | string
}

type ClickhouseMap = Record<string | number, string | number>

export type JSONFormatRow = Record<string, string | number | ClickhouseMap>

export interface QueryOptions extends Record<any, any> {
  format?: 'JSON' | 'CSV' | 'TSV' | string
  noFormat?: boolean
}
