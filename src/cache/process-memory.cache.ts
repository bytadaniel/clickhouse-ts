/* eslint-disable @typescript-eslint/no-dynamic-delete */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-misused-promises */
/* eslint-disable @typescript-eslint/explicit-function-return-type */
import dayjs from 'dayjs'
import crypto from 'crypto'
import { EventEmitter } from 'stream'
import { debug } from '../debug/debug'

export class ProcessMemoryCache extends EventEmitter {
  #tableChunks: Record<string, Record<string, unknown[]>>
  #chunkResolver?: NodeJS.Timeout
  readonly #splitter = '-'
  #options: {
    chunkTTLSeconds: number
    chunkExpireTimeSeconds: number
    chunkSizeLimit: number
    chunkResolverIntervalSeconds: number
    chunkResolveType: 'autoInsert' | 'events'
    useInsert: (table: string, rows: Array<Record<string, unknown>>) => Promise<void>
  }

  constructor (options: {
    chunkTTLSeconds: number
    chunkExpireTimeSeconds: number
    chunkSizeLimit: number
    chunkResolverIntervalSeconds: number
    chunkResolveType: 'autoInsert' | 'events'
    useInsert: (table: string, rows: Array<Record<string, unknown>>) => Promise<void>
  }) {
    super()
    if (options.chunkExpireTimeSeconds <= options.chunkTTLSeconds) {
      throw new Error('chunkExpireTimeSeconds must be greater then chunkTTLSeconds')
    }
    this.#tableChunks = {}

    this.#options = options

    /**
     * Запуск интервальной проверки чанков
     */
    const intervalTime = 1000 * this.#options.chunkResolverIntervalSeconds
    this.#chunkResolver = setInterval(async () => await this.#exploreChunks(), intervalTime)
  }

  /**
   * Эта функция управляет отвечает за разрешение чанков
   * При вызове будут проверены все чанки и те, котороые удовлетворяют условиям,
   * будут разрешены и переданы во вне
   */
  readonly #exploreChunks = async (resolveImmediately = false) => {
    debug.log('chunk.content', { tableChunks: this.#tableChunks })
    const now = dayjs()
    for await (const [table, chunkNamespaces] of Object.entries(this.#tableChunks)) {
      for (const chunkNamespace of Object.keys(chunkNamespaces)) {
        debug.log('chunk.check', { table, chunkNamespace })
        const [_chunk_, _table, _id, _strExpiresAtUnix] = chunkNamespace.split(this.#splitter)
        const chunkLen = this.#tableChunks[table][chunkNamespace].length
        const expiresAt = Number(_strExpiresAtUnix)
        const chunkTooOld = now.unix() > expiresAt
        debug.log('chunk.info', { table, chunkNamespace, chunkLen })
        /**
         * При кэшировании строк в памяти существует обычно чанки
         * разрешаются с течением времени, но существует необходимость
         * разрешить чанки прямо сейчас (graceful shutdown)
         * Например, при обработке сигнала SIGTERM
         */
        if (chunkTooOld || resolveImmediately) {
          await this.#resolveChunk(chunkNamespace, table)
        }
      }
    }
  }

  /**
   * При определенных условиях эта функция может быть вызвана,
   * вследствие чего конкретный chunk конкретной таблицы будет разрешен
   * и передан для управления во вне
   *
   * Существует 2 сценария разрешения чанка
   *  @stable - `chunk` event отправляет чанк всем подписантам
   *  @experimental - `autoInsert` опция, которая автоматически вставит чанк в нужную таблицу
   */
  readonly #resolveChunk = async (chunkId: string, table: string) => {
    const raw = this.#tableChunks[table][chunkId]
    const rows = raw.map(str => JSON.parse(str as string) as Record<string, unknown>)

    switch (this.#options.chunkResolveType) {
      case 'autoInsert':
        await this.#options.useInsert(table, rows)
        break
      case 'events':
        this.emit('chunk', chunkId, table, [...rows])
        break
      default: throw new Error('resolveType is not correct!')
    }

    this.#deleteChunk(table, chunkId)
  }

  /**
   * Создание пустого чанка для определенной таблицы
   *  - `table`
   *  - `id` чанка генерируется md5 хэшом
   *  - `ttl` чанка задается из глобального конфига
   * Эти параметры объединяются и создается string, который обеспечивает
   * достаточную уникальность, чтобы в перспективе не задумываться о коллизиях
   */
  readonly #createChunk = (table: string) => {
    const now = dayjs()
    const id = crypto
      .createHash('md5')
      .update((Math.random() * 9e5).toString())
      .digest('hex')
    const ttl = now.add(this.#options.chunkTTLSeconds, 'second').unix()
    const newChunkNamespace = ['chunk', table, id, ttl].join(this.#splitter)
    this.#tableChunks[table][newChunkNamespace] = []
    debug.log('chunk.create', { table, newChunkNamespace, tableChunks: this.#tableChunks })
    return newChunkNamespace
  }

  /**
   * Простое удаление чанка из структуры `tableChunks`
   */
  readonly #deleteChunk = (table: string, chunk: string) => {
    delete this.#tableChunks[table][chunk]
    debug.log('chunk.delete', { table, chunk, tableChunks: this.#tableChunks })
  }

  /**
   * Геттер чанка для таблицы
   * Инкапсулирует логику создания чанка внутри себя, чтобы
   * внешные пользователи не знали о внутренней структуре класса
   */
  readonly #getChunk = (table: string) => {
    const now = dayjs()
    // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
    if (!this.#tableChunks[table]) {
      this.#tableChunks[table] = {}
    }
    const hasChunk = Boolean(Object.values(this.#tableChunks[table]))

    if (hasChunk) {
      const chunk = Object.keys(this.#tableChunks[table]).find(chunk => {
        const [_chunk, _table, _id, strExpiresAtUnix] = chunk.split(this.#splitter)
        const expiresAt = Number(strExpiresAtUnix)
        return now.unix() < expiresAt
      })
      return chunk ?? this.#createChunk(table)
    } else {
      return this.#createChunk(table)
    }
  }

  /**
   * Clickhouse очень плохо работает с единичное вставкой
   * Можно сохранять их в памяти процесса
   * Эта функция получает чанк и сохраняет в нем строки
   * В случае необходимости текущий чанк разрешается и создается новый (в дополнение к интервальному разрешению)
   */
  public async cache (table: string, items: string[]) {
    let chunkCandidate = this.#getChunk(table)
    while (
      this.#tableChunks[table][chunkCandidate].length >= this.#options.chunkSizeLimit
    ) {
      await this.#resolveChunk(chunkCandidate, table)
      chunkCandidate = this.#getChunk(table)
    }

    this.#tableChunks[table][chunkCandidate].push(...items)

    debug.log('cache', { cached: items.length, chunk: chunkCandidate })

    return {
      cached: items.length,
      chunk: chunkCandidate
    }
  }

  /**
   * Разрешение всех чанков прямо сейчас
   * Необходимо для обеспечения целостности данных при непредвиденных ошбках
   */
  public async gracefulShutdown (codeOrSignal = '') {
    // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
    debug.log('panic.critical', `[${codeOrSignal}] Crytycal occured. Imeddiately resolving all in-memory rows`)
    if (this.#chunkResolver != null) clearInterval(this.#chunkResolver)
    const immediately = true
    await this.#exploreChunks(immediately)
  }
}
