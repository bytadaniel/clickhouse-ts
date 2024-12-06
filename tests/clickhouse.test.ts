import { Clickhouse } from '../src/clickhouse'

const instance = new Clickhouse({
  url: 'https://play.clickhouse.com',
  port: 443,
  user: 'explorer',
  password: '',
  database: 'default'
}, { defaultFormat: 'JSON' })

describe('clickhouse connection', () => {
  it('should be able to connect', async () => {
    const response = await instance.query('SELECT NOW()')
    expect(response.status).toEqual(200)
  })
})

describe('clickhouse requests', () => {
  it('should be able to select', async () => {
    const response = await instance.query<{
      database: string
      table: string
    }>('SELECT database, table FROM system.tables LIMIT 10')

    expect(response.status).toEqual(200)
    expect(response.data.rows).toBeGreaterThan(0)
    expect(typeof response.data.data[0]).toEqual('object')
  })

  it('should be able to insert', async () => {
    try {
      const insertCount = await instance.insert('covid', [{ date: '2020-01-01' }])
      expect(insertCount).toEqual(1)
    } catch (_e: unknown) {
      const e = _e as Error

      const message = e.message
      expect(message.includes('Not enough privileges')).toBeTruthy()
    }
  })
})

describe('clickhouse select formats', () => {
  it('should return JSON', async () => {
    const response = await instance.query('SELECT NOW() as dt', { format: 'JSON' })
    expect(() => {
      JSON.parse(JSON.stringify(response.data.data[0]))
    }).not.toThrow()
  })

  it('should not return JSON', async () => {
    const response = await instance.query('SELECT NOW() as dt', { format: 'TabSeparated' })
    expect(() => {
      JSON.parse(JSON.stringify(response.data.data[0]))
    }).toThrow()
  })
})
