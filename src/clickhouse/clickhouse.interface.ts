import { DebugProvider } from '../debug'
import * as Types from './clickhouse.types'

export interface ConnectionConfig {
  url: string
  port: number
  user: string
  password: string
  database: string
  ca?: Buffer
}
export interface InstanceOptions {
  debug?: {
    mode: boolean
    exclude?: DebugProvider[]
  }
  clickhouseOptions?: Record<string, string>
  cache?: {
    provider: 'nodejs'
    chunkTTLSeconds: number
    chunkExpireTimeSeconds: number
    chunkResolverIntervalSeconds: number
    chunkSizeLimit: number
    chunkResolveType: 'autoInsert' | 'events'
  }
  defaultResponseFormat: 'JSON' | 'CSV' | 'TSV' | string
  hooks?: {
    useDefaultValue?: () => Record<string, unknown>
  }
}

export type InsertRows = Array<Record<string, unknown>>
export type InsertQueryOptions = {
  responseFormat?: 'JSON' | 'CSV' | 'TSV' | string
} & Record<string, unknown>

export type SelectQueryOptions = {
  responseFormat?: 'JSON' | 'CSV' | 'TSV' | string
  noFormat?: boolean
} & Record<string, unknown>

export type FormattedRowType = Types.String | Types.Number
