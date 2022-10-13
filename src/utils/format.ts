/* eslint-disable no-tabs */
import ss from 'sqlstring'
import { isObject, isNull } from 'lodash'
import { InsertRows } from '../clickhouse'
import { PreprocessInsertQueryError } from '../errors'
import { FormatRowsResponse } from './interface'

/**
 * This util optimizes JSON input and validates its data structure consistency
 *
 * @param {InsertRows} rows
 * @returns {FormatRowsResponse}
 */
export function formatInsertRows (rows: InsertRows): FormatRowsResponse {
  const keysArr = Object.keys(rows[0])
  const valuesSqlArr = rows.map(row => `(${keysArr.map(key => {
		// eslint-disable-next-line @typescript-eslint/no-unsafe-return
		return formatInsertValue(key, row[key])
	}).join(',')})`)

  return {
    keysArr,
    valuesSqlFormat: valuesSqlArr.join(',')
  }
}

/**
 * Validation of row
 *
 * @param {string} rowKey
 * @param {any} rowValue
 * @returns {string|number}
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function formatInsertValue (rowKey: string, rowValue: unknown | undefined): string | number {
  /**
	 * Check if column value not exists
	 */
  if (rowValue === undefined) {
    throw new PreprocessInsertQueryError(`Cannot find value of column and has not default ${rowKey}`)
  }

  /**
	 * is Array
	 */
  if (Array.isArray(rowValue)) {
    return `[${rowValue.map(formatInsertValue).join(',')}]`
  }

  /**
	 * is Map
	 */
  if (isObject(rowValue)) {
    const mapValues = Object
      .entries(rowValue)
      .map(([mapKey, mapValue]) => ([ss.escape(mapKey), ss.escape(mapValue)]))
    return `map(${mapValues.join(',')})`
  }

  /**
	 * is Number
	 */
  if (typeof rowValue === 'number') {
    return rowValue
  }

  /**
	 * is String
	 */
  if (typeof rowValue === 'string') {
    return ss.escape(rowValue)
  }

  /**
	 * is Null
	 */
  if (isNull(rowValue)) {
    return ss.escape('NULL')
  }

  // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
  throw new PreprocessInsertQueryError(`Unknown type of row [${rowKey}:${rowValue}]`)
}
