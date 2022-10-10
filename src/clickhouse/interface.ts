import { DebugProvider } from '../debug/Debug'
export namespace ClickhouseNamespace {
  export type Constructor = {
    url: string,
    port: number,
    user: string,
    password: string,
    database: string,
    ca?: Buffer
  }

  export type Options = {
    debug?: {
      mode: boolean,
      exclude?: DebugProvider[]
    },
    clickhouseOptions?: Record<string, string>,
    cache?: {
      provider: 'nodejs',
      chunkTTLSeconds: number,
      chunkExpireTimeSeconds: number,
      chunkResolverIntervalSeconds: number,
      chunkSizeLimit: number,
      chunkResolveType: 'autoInsert' | 'events',
    }
    defaultResponseFormat: 'JSON' | 'CSV' | 'TSV' | string,
    hooks?: {
      useDefaultValue?: () => Record<string, any>
    }
  }

  export type InsertRows = Record<string, any>[]
  export type InsertOptions = {
    responseFormat?: 'JSON' | 'CSV' | 'TSV' | string
  } & Record<string, any>

  export type QueryOptions = {
    responseFormat?: 'JSON' | 'CSV' | 'TSV' | string,
    noFormat?: boolean
  } & Record<string, any>

  export namespace Types {
    export type Number = number
    export type String = string
    export type Array<T = unknown> = T[]
    export type Map = Record<string, any>
  }

  export type FormattedRowType = Types.String | Types.Number
}
