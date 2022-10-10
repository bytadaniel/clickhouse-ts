import axios, { AxiosRequestConfig, AxiosError } from 'axios'
import https from 'https'
import { debug } from '../debug/Debug'
import { ClickhouseHttpError } from '../errors/ClickhouseHttpError'

namespace ClickhouseHttpClient {
  export type Constructor = {
    context: {
      url: string,
      port: number,
      user: string,
      password: string,
      database: string,
      ca?: Buffer
    },
    options?: Record<string, any>
  }

  export type Request = {
    params?: Record<string, any> 
    data: string
    requestOptions?: Record<string, string>
  }

  export type Response<T> = {
    headers: Record<string, string>,
    status: number,
    statusText: string,
    data: {
      data: {
        rows: number,
        rows_before_limit_at_least?: number,
        meta: { name: string, type: string }[],
        data: T[],
        statistics: {
          elapsed: number,
          rows_read: number,
          bytes_read: number
        }
      }
    }
  }
}

export class ClickhouseHttpClient {
  // DI
  readonly #axios = axios
  readonly #https = https

  readonly #url: string
  readonly #port: number
  readonly #ca: Buffer | undefined
  readonly #password: string
  readonly #user: string
  readonly #database: string
  readonly #options: Record<string, any> | undefined


  constructor({ context, options = {} }: ClickhouseHttpClient.Constructor) {
    this.#url = context.url
    this.#port = context.port
    this.#user = context.user
    this.#password = context.password
    this.#database = context.database
    this.#ca = context.ca

    this.#options = options
  }


  public async request<T>({ params, data = '', requestOptions = {} }: ClickhouseHttpClient.Request) {
    return new Promise((resolve, reject) => {
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
        }),
        data: data,
        ...this.#ca && { httpsAgent: new this.#https.Agent({ ca: this.#ca }) }
      }

      debug.log('http.request', 'Http request', { config })
      
      this.#axios
        .request(config)
        .then(response => resolve({
          headers: response.headers,
          data: response.data,
          status: response.status,
          statusText: response.statusText
        }))
        .catch((error: AxiosError) => {
          console.log(error)
          reject(new ClickhouseHttpError(error.response))
        })
    }) as unknown as ClickhouseHttpClient.Response<T>
  }
}