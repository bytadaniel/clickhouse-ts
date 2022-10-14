/* eslint-disable @typescript-eslint/no-non-null-assertion */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import https from 'https'
import axios, { AxiosRequestConfig, AxiosError } from 'axios'

import {
  HttpClientConstructor,
  HttpClientRequest,
  HttpClientResponse
} from './interface'

import { HttpClickhouseAxiosError } from '../errors'

/**
 * HttpClient wraps Axios and provides transparent data transfering between your code and clickhouse server
 * It uses HTTP/1 protocol
 */
export class HttpAxiosClient {
  readonly #axios = axios

  readonly #url: string
  readonly #port: number
  readonly #ca: Buffer | undefined
  readonly #password: string
  readonly #user: string
  readonly #database: string

  /**
   * https://clickhouse.com/docs/en/operations/settings/settings/
   */
  readonly #clickhouseSettings: Record<string, unknown>

  /**
   * Create HttpClient instance
   *
   * @param {HttpClientConstructor} options
   */
  constructor ({ connectionOptions, clickhouseSettings = {} }: HttpClientConstructor) {
    this.#url = connectionOptions.url
    this.#port = connectionOptions.port
    this.#user = connectionOptions.user
    this.#password = connectionOptions.password
    this.#database = connectionOptions.database
    this.#ca = connectionOptions.ca

    this.#clickhouseSettings = clickhouseSettings
  }

  /**
   * Make full axios request and get full Clickhouse HTTP response
   *
   * @param {HttpClientRequest} config request config
   * @returns {Promise<HttpClientResponse>}
   */
  public async request<T>({
    params,
    data = '',
    queryOptions = {}
  }: HttpClientRequest): Promise<HttpClientResponse<T>> {
    const config: AxiosRequestConfig = {
      maxBodyLength: Infinity,
      method: 'POST',
      url: `${this.#url}:${this.#port}`,
      params: new URLSearchParams({
        ...Boolean(params?.query) && { query: params!.query },
        user: this.#user,
        password: this.#password,
        database: this.#database,
        ...this.#clickhouseSettings,
        ...queryOptions
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as unknown as Record<string, any>),
      data
    }

    if (this.#ca !== null) {
      config.httpsAgent = new https.Agent({ ca: this.#ca })
    }

    const response = await this.#axios
      .request(config)
      .catch((error: AxiosError) => {
        throw new HttpClickhouseAxiosError({
          message: error.response?.data as string,
          status: error.response?.status as number,
          statusText: error.response?.statusText as string,
          headers: error.response?.headers
        })
      })

    return {
      headers: response.headers,
      data: response.data,
      status: response.status,
      statusText: response.statusText
    }
  }
}
