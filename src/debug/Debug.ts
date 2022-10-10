
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

export class Debug {
  #isDebugMode: boolean
  #providersBlacklist: string[]

  constructor() {
    this.#isDebugMode = false
    this.#providersBlacklist = []
  }

  public setDebugMode(mode: boolean) {
    this.#isDebugMode = mode
  }

  public excludeDebugProviders(providers: string[]) {
    this.#providersBlacklist.push(...providers)
  }

  public log(provider: DebugProvider, ...args: (string | number | Object | Function)[]) {
    if (
      this.#isDebugMode &&
      !this.#providersBlacklist.includes(provider)
    ) {
      console.log(`[Debug][${provider}]`, ...args)
    }
  }
}

export const debug = new Debug()