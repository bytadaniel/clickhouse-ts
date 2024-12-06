import {
  JSONFormatRow,
  Connection,
  Options,
  QueryOptions
} from './interface'

import { HttpAxiosClient, HttpClientResponse } from '../httpClient'
import { jsonInsertFormatToSqlValues, jsonRowsToInsertFormat } from '../utils'

/**
 * Clickhouse is a simple client for making queries and getting responses
 */
export class Clickhouse {
  readonly #httpClient: HttpAxiosClient
  readonly #options: Options

  /**
   * Create Clickhouse instance
   *
   * @param {Connection} connection
   * @param {Options} options
   */
  constructor (
    connection: Connection,
    options: Options
  ) {
    this.#options = options
    this.#httpClient = new HttpAxiosClient({
      connectionOptions: connection,
      clickhouseSettings: this.#options.clickhouseSettings
    })
  }

  /**
   * Make insert query
   * Auto validating data
   *
   * @param {string} table table name
   * @param {InsertRows} rows insert rows in JSON format
   * @param {InsertQueryOptions} options insert options
   *
   * @returns {Promise<number>} insert count
  */
  public async insert (
    table: string,
    rows: JSONFormatRow[],
    options: QueryOptions = {}
  ): Promise<number> {
    if (rows.length === 0) {
      return 0
    }

    const jsonInsertFormat = jsonRowsToInsertFormat(rows)

    await this.#httpClient.request({
      params: { query: `INSERT INTO ${table} (${jsonInsertFormat.keys.join(',')}) VALUES` },
      data: jsonInsertFormatToSqlValues(jsonInsertFormat),
      queryOptions: options
    })

    return rows.length
  }

  /**
   * Select query for getting results
   * There is no anu wrapper for response. So, you can do what you want with response
   *
   * @param {string} query WITH now() as time SELECT time;
   * @param {SelectQueryOptions} options select options
   *
   * @returns {Promise<HttpClientResponse>}
  */
  public async query<T>(
    query: string,
    options: QueryOptions = {}
  ): Promise<HttpClientResponse<T>> {
    const {
      noFormat = false,
      format = this.#options.defaultFormat
    } = options

    const queryFormatCondition = noFormat ? '' : `FORMAT ${format}`

    const SQL = `${query} ${queryFormatCondition}`.trim()

    return await this.#httpClient.request<T>({ data: SQL })
  }
}
