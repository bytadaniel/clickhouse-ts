import sqlstring from 'sqlstring'
import { isNull, isObject } from 'lodash'
import { ClickhouseHttpClient } from '../httpClient/ClickhouseHttpClient'
import { ClickhouseNamespace } from './interface'
import { debug } from '../debug/Debug'
import { NodeJSCacheManager } from '../caching/NodeJSCacheManager'
import { PreprocessInsertQueryError } from '../errors/PreprocessInsertQueryError'




export class Clickhouse {
  // DI
  readonly #httpClient: ClickhouseHttpClient
  readonly #options: ClickhouseNamespace.Options
  readonly #defaultValues: Record<string, any>
  readonly #cacheManager?: NodeJSCacheManager
  #onChunkCb: ((chunkId: string, table: string, rows: ClickhouseNamespace.InsertRows) => void)[]

  constructor(
    context: ClickhouseNamespace.Constructor,
    options: ClickhouseNamespace.Options
  ) {
    this.#onChunkCb = []
    this.#options = options
    this.#defaultValues = options.hooks?.useDefaultValue?.() ?? {}
    this.#httpClient = new ClickhouseHttpClient({ context, options: options.clickhouseOptions })

    this.#cacheManager = this.getCacheManager(this.#options.cache?.provider ?? 'none')

    if (this.#options.debug) {
      debug.setDebugMode(this.#options.debug.mode)
      debug.excludeDebugProviders(this.#options.debug.exclude ?? [])
    }
  }

  private getCacheManager(provider: 'nodejs' | 'none') {
    if (provider === 'none') return

    const options = {
      chunkTTLSeconds: this.#options.cache!.chunkTTLSeconds,
      chunkExpireTimeSeconds: this.#options.cache!.chunkExpireTimeSeconds,
      chunkSizeLimit: this.#options.cache!.chunkSizeLimit,
      chunkResolverIntervalSeconds: this.#options.cache!.chunkResolverIntervalSeconds,
      chunkResolveType: this.#options.cache!.chunkResolveType,
      useInsert: async (table: string, rows: ClickhouseNamespace.InsertRows) => {
        debug.log('hook.useInsert', { table, rows })
        this.insert(table, rows)
      }
    }

    if (provider === 'nodejs') {
      return new NodeJSCacheManager(options)
    }
  }

  private formatInsertRows (rows: ClickhouseNamespace.InsertRows) {
    const keysArr = Object.keys(rows[0])
    const valuesSqlArr = rows.map(row => `(${keysArr.map(key => {
      try {
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

  private formatInsertValue (rowKey: string, rowValue: any, defaultValue?: any): ClickhouseNamespace.FormattedRowType {
    /**
     * Check if column value not exists
     */
    const fixedRowValue = rowValue === undefined ? defaultValue : rowValue
    if (fixedRowValue === undefined) throw new PreprocessInsertQueryError(`Cannot find value of column and has not default ${rowKey}:${fixedRowValue}`)

    debug.log('row.value', { fixedRowValue })
    /**
     * is Array
     */
    if (Array.isArray(fixedRowValue)) {
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
      return fixedRowValue as number
    }

    /**
     * is String
     */
    if (typeof fixedRowValue === 'string') {
      return sqlstring.escape(fixedRowValue) as string
    }

    /**
     * is Null
     */
    if (isNull(fixedRowValue)) {
      return sqlstring.escape('NULL')
    }

    throw new PreprocessInsertQueryError(`Unknown type of row [${rowKey}:${fixedRowValue}]`)
  }

  /**
   *
   * @param query database
   * @param rows [{ value1: 'text' }, {value2: number}]
   *
  */
  public async insert(
    table: string,
    rows: ClickhouseNamespace.InsertRows,
    options: ClickhouseNamespace.InsertOptions = {}
  ) {
    if (!rows.length) {
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
    options: ClickhouseNamespace.QueryOptions = {}
  ) {
    const format = options.noFormat
      ? ''
      : `FORMAT ${options.responseFormat ?? this.#options.defaultResponseFormat}`
    const request = `${query} ${format}`

    debug.log('ch.query', request)

    return this.#httpClient.request<T>({ data: request })
  }

  public useCaching() {
    if (!this.#cacheManager) {
      throw new Error('Cache manager is not initialized!')
    }

    this.#cacheManager.on('chunk', (
      chunkId: string,
      table: string,
      rows: Record<string, any>[]
    ) => {
      debug.log(
        'ch.useCaching',
        `received event 'chunk'`,
        { chunkId, table, rowsCount: rows.length, firstRow: rows[0] }
      )
      this.#onChunkCb.forEach(cb => cb(chunkId, table, rows))
    })
  }

  public onChunk (
    onChunkCb: (chunkId: string, table: string, rows: ClickhouseNamespace.InsertRows) => void
  ) {
    this.#onChunkCb.push(onChunkCb)
  }

  public async cache(
    table: string,
    rows: ClickhouseNamespace.InsertRows
  ) {
    if (!this.#cacheManager) {
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

  public async cleanupChunks() {
    if (!this.#cacheManager) {
      throw new Error('CacheClient is not implemented')
    }
    await this.#cacheManager.gracefulShutdown()
  }
}
