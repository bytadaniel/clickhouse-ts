
export type DebugProvider =
  'panic.critical' |
  'chunk.delete' |
  'chunk.check' |
  'chunk.create' |
  'chunk.content' |
  'chunk.info' |
  'hook.useInsert' |
  'hook.useInstance' |
  'cache' |
  'ch.insert' |
  'ch.query' |
  'ch.cache' |
  'ch.useCaching' |
  'http.request' |
  'row.value' |
  'row.row'

type LogFunction = (...args: unknown[]) => unknown

export class Debug {
  #isDebugMode: boolean
  #providersBlacklist: string[]

  constructor () {
    this.#isDebugMode = false
    this.#providersBlacklist = []
  }

  public setDebugMode (mode: boolean): void {
    this.#isDebugMode = mode
  }

  public excludeDebugProviders (providers: string[]): void {
    this.#providersBlacklist.push(...providers)
  }

  public log (provider: DebugProvider, ...args: Array<string | number | Record<string, unknown> | LogFunction>): void {
    if (
      this.#isDebugMode &&
      !this.#providersBlacklist.includes(provider)
    ) {
      console.log(`[Debug][${provider}]`, ...args)
    }
  }
}

export const debug = new Debug()
