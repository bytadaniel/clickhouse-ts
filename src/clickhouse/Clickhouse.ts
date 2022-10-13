/* eslint-disable @typescript-eslint/restrict-template-expressions */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import {
  InsertRows,
  ConnectionConfig,
  InstanceOptions,
  QueryOptions
} from './interface'

import { HttpClient, HttpClientResponse } from '../httpClient'
import { formatInsertRows } from '../utils'

/**
 * Clickhouse is a simple client for making queries and getting responses
 */
export class Clickhouse {
  readonly #httpClient: HttpClient
  readonly #options: InstanceOptions

  /**
   * Create Clickhouse instance
   *
   * @param {ConnectionConfig} context
   * @param {InstanceOptions} options
   */
  constructor (
    context: ConnectionConfig,
    options: InstanceOptions
  ) {
    this.#options = options
    this.#httpClient = new HttpClient({
      context,
      options: this.#options.clickhouseOptions
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
    rows: InsertRows,
    options: QueryOptions = {}
  ): Promise<number> {
    if (rows.length === 0) {
      return 0
    }

    const { keysArr, valuesSqlFormat } = formatInsertRows(rows)
    const keys = keysArr.join(',')
    await this.#httpClient.request({
      params: { query: `INSERT INTO ${table} (${keys}) VALUES` },
      data: valuesSqlFormat,
      requestOptions: options
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
    let format: string

    const {
      noFormat = false,
      responseFormat = this.#options.defaultResponseFormat
    } = options

    if (noFormat === false) {
      format = ''
    } else {
      format = `FORMAT ${responseFormat}`
    }
    const request = `${query} ${format}`

    return await this.#httpClient.request<T>({ data: request })
  }
}
