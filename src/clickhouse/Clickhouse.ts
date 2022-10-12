import sqlstring from 'sqlstring'
import { isNull, isObject } from 'lodash'
import {
  InsertRows,
  ConnectionConfig,
  InstanceOptions,
  FormattedRowType,
  InsertQueryOptions,
  SelectQueryOptions
} from './clickhouse.interface'

import { HttpClient, HttpClientResponse } from '../httpClient'
import { debug } from '../debug'
import { ProcessMemoryCache } from '../cache'
import { PreprocessInsertQueryError } from '../errors'

export class Clickhouse {
  readonly #httpClient: HttpClient
  readonly #options: InstanceOptions
  readonly #defaultValues: Record<string, unknown>
  readonly #cacheManager?: ProcessMemoryCache
  #onChunkCb: Array<(chunkId: string, table: string, rows: InsertRows) => void>

  constructor (
    context: ConnectionConfig,
    options: InstanceOptions
  ) {
    this.#onChunkCb = []
    this.#options = options
    this.#defaultValues = options.hooks?.useDefaultValue?.() ?? {}
    this.#httpClient = new HttpClient({ context, options: options.clickhouseOptions })

    this.#cacheManager = this.getCacheManager(this.#options.cache?.provider ?? 'none')

    if (this.#options.debug != null) {
      debug.setDebugMode(this.#options.debug.mode)
      debug.excludeDebugProviders(this.#options.debug.exclude ?? [])
    }
  }

  private getCacheManager (provider: 'nodejs' | 'none'): ProcessMemoryCache | undefined {
    if (provider === 'none') return

    const options = {
      chunkTTLSeconds: this.#options.cache?.chunkTTLSeconds ?? 60,
      chunkExpireTimeSeconds: this.#options.cache?.chunkExpireTimeSeconds ?? 120,
      chunkSizeLimit: this.#options.cache?.chunkSizeLimit ?? 1000,
      chunkResolverIntervalSeconds: this.#options.cache?.chunkResolverIntervalSeconds ?? 10,
      chunkResolveType: this.#options.cache?.chunkResolveType ?? 'events',
      useInsert: async (table: string, rows: InsertRows) => {
        debug.log('hook.useInsert', { table, rows })
        await this.insert(table, rows)
      }
    }

    if (provider === 'nodejs') {
      return new ProcessMemoryCache(options)
    }
  }

  private formatInsertRows (rows: InsertRows): { keysArr: string[], valuesSqlFormat: string } {
    const keysArr = Object.keys(rows[0])
    const valuesSqlArr = rows.map(row => `(${keysArr.map(key => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-return
        return this.formatInsertValue(
          key,
          row[key],
          this.#defaultValues[key]
        )
      } catch (e) {
        debug.log('row.row', row)
        throw e
      }
    }).join(',')})`)

    return {
      keysArr,
      valuesSqlFormat: valuesSqlArr.join(',')
    }
  }

  private formatInsertValue (rowKey: string, rowValue: unknown, defaultValue?: unknown): FormattedRowType {
    /**
     * Check if column value not exists
     */
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const fixedRowValue = rowValue === undefined ? defaultValue : rowValue
    if (fixedRowValue === undefined) {
      throw new PreprocessInsertQueryError(
        // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
        `Cannot find value of column and has not default ${rowKey}:${fixedRowValue}`
      )
    }

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    debug.log('row.value', { fixedRowValue })
    /**
     * is Array
     */
    if (Array.isArray(fixedRowValue)) {
      // eslint-disable-next-line @typescript-eslint/unbound-method
      return `[${fixedRowValue.map(this.formatInsertValue).join(',')}]`
    }

    /**
     * is Map
     */
    if (isObject(fixedRowValue)) {
      const mapValues = Object
        .entries(fixedRowValue)
        .map(([mapKey, mapValue]) => ([sqlstring.escape(mapKey), sqlstring.escape(mapValue)]))
      return `map(${mapValues.join(',')})`
    }

    /**
     * is Number
     */
    if (typeof fixedRowValue === 'number') {
      return fixedRowValue
    }

    /**
     * is String
     */
    if (typeof fixedRowValue === 'string') {
      return sqlstring.escape(fixedRowValue)
    }

    /**
     * is Null
     */
    if (isNull(fixedRowValue)) {
      return sqlstring.escape('NULL')
    }

    // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
    throw new PreprocessInsertQueryError(`Unknown type of row [${rowKey}:${fixedRowValue}]`)
  }

  /**
   *
   * @param query database
   * @param rows [{ value1: 'text' }, {value2: number}]
   *
  */
  public async insert (
    table: string,
    rows: InsertRows,
    options: InsertQueryOptions = {}
  ): Promise<{ inserted: number, data: InsertRows }> {
    if (rows.length === 0) {
      return { inserted: rows.length, data: rows }
    }

    const { keysArr, valuesSqlFormat } = this.formatInsertRows(rows)
    const keys = keysArr.join(',')
    await this.#httpClient.request({
      params: { query: `INSERT INTO ${table} (${keys}) VALUES` },
      data: valuesSqlFormat,
      requestOptions: options
    })

    return { inserted: rows.length, data: rows }
  }

  /**
   *
   * @param query WITH now() as time SELECT time;
   *
  */
  public async query<T>(
    query: string,
    options: SelectQueryOptions = {}
  ): Promise<HttpClientResponse<T>> {
    const format = options.noFormat ?? false
      ? ''
      : `FORMAT ${options.responseFormat ?? this.#options.defaultResponseFormat}`
    const request = `${query} ${format}`

    debug.log('ch.query', request)

    return await this.#httpClient.request<T>({ data: request })
  }

  public useCaching (): void {
    if (this.#cacheManager == null) {
      throw new Error('Cache manager is not initialized!')
    }

    this.#cacheManager.on('chunk', (
      chunkId: string,
      table: string,
      rows: Array<Record<string, unknown>>
    ) => {
      debug.log(
        'ch.useCaching',
        'received event \'chunk\'',
        { chunkId, table, rowsCount: rows.length, firstRow: rows[0] }
      )
      this.#onChunkCb.forEach(cb => cb(chunkId, table, rows))
    })
  }

  public onChunk (
    onChunkCb: (chunkId: string, table: string, rows: InsertRows) => void
  ): void {
    this.#onChunkCb.push(onChunkCb)
  }

  public async cache (
    table: string,
    rows: InsertRows
  ): Promise<{ cached: number, chunk: string }> {
    if (this.#cacheManager == null) {
      throw new Error('CacheClient is not implemented')
    }

    /**
     * Simple replacing values if can
     */
    const rowsWithDefaults = rows.map(row => Object.fromEntries(Object.entries(row).map(([key, value]) => {
      return [
        key,
        value === undefined ? this.#defaultValues[key] : value
      ]
    })))

    const hasUndefined = rowsWithDefaults.some(row => Object.values(row).some(value => value === undefined))
    if (hasUndefined) throw new Error('Reject caching rows because some of them is including undefinded and can\'t replace it')

    const result = await this.#cacheManager
      .cache(
        table,
        rowsWithDefaults.map(row => JSON.stringify(row))
      )
    return result
  }

  public async cleanupChunks (): Promise<void> {
    if (this.#cacheManager == null) {
      throw new Error('CacheClient is not implemented')
    }
    await this.#cacheManager.gracefulShutdown()
  }
}
