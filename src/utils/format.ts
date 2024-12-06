import ss from 'sqlstring'
import { JSONFormatRow } from '../clickhouse'
import { PreprocessInsertQueryError } from '../errors'
import { isNull, isObject } from './common'
import { OptimizedJSONInsertFormat } from './interface'

/**
 * Get optimized and validated insert format for http insert request
 *
 * @param {JSONFormatRow} rows
 * @returns {OptimizedJSONInsertFormat}
 */
export function jsonRowsToInsertFormat (rows: JSONFormatRow[]): OptimizedJSONInsertFormat {
  const keys = Object.keys(rows[0])
  const values = rows.map(row => keys.map(key => getSimpleValidatedValue(key, row[key])))
  return {
    keys,
    values
  }
}

/**
 * Get value enumeration in (...values), (...values) format
 *
 * @param {OptimizedJSONInsertFormat} jsonInsertFormat
 * @returns {string}
 */
export function jsonInsertFormatToSqlValues ({ values: valuesList }: OptimizedJSONInsertFormat): string {
  return valuesList.map(rowValues => `(${rowValues.join(',')})`).join(',')
}

/**
 * Validation of key-value pair
 *
 * @param {string} key
 * @param {any} value
 * @returns {string|number}
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getSimpleValidatedValue (key: string, value: unknown | undefined): string | number {
  /**
   * Check if column value not exists
   */
  if (value === undefined) {
    // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
    throw new PreprocessInsertQueryError(`Cannot find value of column and has not default ${value}`)
  }

  /**
   * is Array
   */
  if (Array.isArray(value)) {
    return `[${value.map(getSimpleValidatedValue).join(',')}]`
  }

  /**
   * is Map
   */
  if (isObject(value)) {
    const mapValues = Object
      .entries(value)
      .map(([mapKey, mapValue]) => ([ss.escape(mapKey), ss.escape(mapValue)]))

    return `map(${mapValues.join(',')})`
  }

  /**
   * is Number
   */
  if (typeof value === 'number') {
    return value
  }

  /**
   * is String
   */
  if (typeof value === 'string') {
    return ss.escape(value)
  }

  /**
   * is Null
   */
  if (isNull(value)) {
    return ss.escape('NULL')
  }

  // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
  throw new PreprocessInsertQueryError(`Unknown type of key-value [${key}:${value}]`)
}
