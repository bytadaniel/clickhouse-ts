/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable no-tabs */

/**
 * Native implementation of lodash isObject
 *
 * @param {any} value
 * @returns {boolean} is object
 */
export function isObject (value: any): value is Record<string, any> {
  return typeof value === 'object' &&
		!Array.isArray(value) &&
		value !== null
}

/**
 * Native implementation of isNull
 *
 * @param {any} value
 * @returns {boolean}
 */
export function isNull (value: any): value is null {
  return value === null
}
