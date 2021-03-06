import {
  PlainObj,
  Matchable,
  Iterator,
  MapIterator,
  SetIterator,
  ValidMap,
  ValidSet,
  ValidCollectionKey,
} from './generic'

// https://github.com/Microsoft/TypeScript/issues/2491
// enum ObjectWithKeys {
// 	// [prop: string]: 0...255
// 	[any: Primitive]: 1...Infinity,
// }

export type isArray = Array<any>

// Object.propertyIsEnumerable
export type PropertyIsEnumerable = boolean
export type PrototypeOf = boolean
export type ObjectWithKeys = PlainObj

export interface MapishEntries {
  (arg: any): Array<string | any>
}
export interface Mapish extends ValidMap {
  // entries: MapishEntries | ValidCollectionKey
}
export type notEmptyArray = [any]

// https://github.com/Microsoft/TypeScript/issues/1289
export function toArray(arg): any[]
export function isNotEmptyArray(o: any): o is notEmptyArray

export function isString(o: any): o is string
export function isNumber(o: any): o is number
export function isStringOrNumber(o: any): o is string | number

export function isNull(o: any): o is null
export function isUndefined(o: any): o is undefined
export function isNullOrUndef(o: any): o is undefined | null

export function isFunction(o: any): o is Function
export function isObj(o: any): o is object
export function isObjWithKeys(o: any): o is ObjectWithKeys

export function isPrototypeOf(o: any, prop: any): PrototypeOf
export function isEnumerable(o: any, prop: any): PropertyIsEnumerable
export function isError(o: any): o is Error

export function isMap(o: any): o is Mapish
export function isSet(o: any): o is ValidSet
export function isIterator(o: any): o is MapIterator | SetIterator

export function isDate(o: any): o is Date
export function isRegExp(o: any): o is RegExp
export function isPureObj(o: any): o is Object
export function isSymbol(o: any): o is Symbol
export function isReal(o: any): o is '!string | !null | !undefined | !NaN' | any

export function isBoolean(o: any): o is boolean
export function isTrue(o: any): o is true
export function isFalse(o: any): o is false

export function isDot(o: any): o is string | isArray
export function toS(o: any): string
export function isMatcher(o: any): o is Matchable
export function isNodeJS(o: any): boolean
export function isObjLoose(o: any): 'o is typeof Obj' | boolean
export function isClass(o: any): 'o.toString().includes(class)' | boolean
export function isMapish(o: any): o is Mapish

export const is = {
  isArray,
  isString,
  isNumber,
  isFunction,
  isObj,
  isObjWithKeys,
  isEnumerable,
  isError,
  isMap,
  isSet,
  isIterator,
  isDate,
  isRegExp,
  isPureObj,
  isSymbol,
  isReal,
  isBoolean,
  isNull,
  isUndefined,
  isTrue,
  toS,

  // only available as `chain-able/deps/is/*` without the `is`
  // @example `chain-able/deps/is/stringOrNumber`, `chain-able/deps/is/dot`
  isNotEmptyArray,
  isStringOrNumber,
  isNullOrUndef,
  isFalse,
  isDot,
  isMapish,
}
