/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import https from 'https'
import axios, { AxiosRequestConfig, AxiosError } from 'axios'

import {
  HttpClientConstructor,
  HttpClientRequest,
  HttpClientResponse
} from './http-client.interface'

import { ClickhouseHttpError } from '../errors'

/**
 * HttpClient wraps Axios and provides transparent data transfering between your code and clickhouse server
 * It uses HTTP/1 protocol
 */
export class HttpClient {
  readonly #axios = axios
  readonly #https = https

  readonly #url: string
  readonly #port: number
  readonly #ca: Buffer | undefined
  readonly #password: string
  readonly #user: string
  readonly #database: string
  readonly #options: Record<string, unknown> | undefined

  /**
   * Create HttpClient instance
   *
   * @param {HttpClientConstructor} options
   */
  constructor ({ context, options = {} }: HttpClientConstructor) {
    this.#url = context.url
    this.#port = context.port
    this.#user = context.user
    this.#password = context.password
    this.#database = context.database
    this.#ca = context.ca

    this.#options = options
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
    requestOptions = {}
  }: HttpClientRequest): Promise<HttpClientResponse<T>> {
    const config: AxiosRequestConfig = {
      maxBodyLength: Infinity,
      method: 'POST',
      url: `${this.#url}:${this.#port}`,
      params: new URLSearchParams({
        ...params,
        user: this.#user,
        password: this.#password,
        database: this.#database,
        ...this.#options,
        ...requestOptions
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as unknown as Record<string, any>),
      data,
      ...(this.#ca != null) && { httpsAgent: new this.#https.Agent({ ca: this.#ca }) }
    }

    const response = await this.#axios
      .request(config)
      .catch((error: AxiosError) => {
        console.log(error)
        throw new ClickhouseHttpError(error.response)
      })

    return {
      headers: response.headers,
      data: response.data,
      status: response.status,
      statusText: response.statusText
    }
  }
}
