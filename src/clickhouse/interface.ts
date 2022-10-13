/* eslint-disable @typescript-eslint/no-explicit-any */
// import * as Types from './clickhouse.types'

export interface ConnectionConfig {
  url: string
  port: number
  user: string
  password: string
  database: string
  ca?: Buffer
}
export interface InstanceOptions {
  clickhouseOptions?: Record<string, unknown>
  defaultResponseFormat: 'JSON' | 'CSV' | 'TSV' | string
}

export type InsertRows = Array<Record<string, any>>

export interface QueryOptions extends Record<any, any> {
  responseFormat?: 'JSON' | 'CSV' | 'TSV' | string
  noFormat?: boolean
}
