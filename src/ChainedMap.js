const Chainable = require('./Chainable')
const MergeChain = require('./MergeChain')
const dopemerge = require('./deps/dopemerge')

const ignored = k =>
  k === 'inspect' ||
  k === 'parent' ||
  k === 'store' ||
  k === 'shorthands' ||
  k === 'decorated'

/**
 * @tutorial https://ponyfoo.com/articles/es6-maps-in-depth
 * @tutorial https://developer.mozilla.org/en/docs/Web/JavaScript/Reference/Global_Objects/Map
 * @inheritdoc
 * @type {Chainable}
 * @prop {Array} shorthands
 * @prop {Map} store
 */
class ChainedMap extends Chainable {
  /**
   * @param {ChainedMap | Chainable | any} parent
   */
  constructor(parent) {
    super(parent)
    this.shorthands = []
    this.store = new Map()

    // @TODO for wrapping methods to force return `this`
    // this.chainableMethods = []
  }

  /**
   * @since 0.7.0
   * @see this.set, this.get
   * @desc   tap a value with a function
   *         @modifies this.store.get(name)
   *
   * @example
   *  chain
   *    .set('moose', {eh: true})
   *    .tap('moose', moose => {moose.eh = false; return moose})
   *    .get('moose') === {eh: false}
   *
   * @param  {string | any} name key to `.get`
   * @param  {Function} fn function to tap with
   * @return {Chain} @chainable
   */
  tap(name, fn) {
    const old = this.get(name)
    const updated = fn(old, dopemerge)
    return this.set(name, updated)
  }

  /**
   * @since 0.5.0
   * @TODO needs improvements like parsing stringify
   *       since it is just .merge atm
   *
   * @desc checks each property of the object
   *       calls the chains accordingly
   *
   * @example chain.from({eh: true}) === chain.eh(true)
   *
   * @param {Object} obj
   * @return {Chainable} @chainable
   */
  from(obj) {
    Object.keys(obj).forEach(key => {
      // const fn = this[k]
      const val = obj[key]

      if (this[key] && this[key] instanceof Chainable) {
        return this[key].merge(val)
      }
      else if (typeof this[key] === 'function') {
        // const fnStr = typeof fn === 'function' ? fn.toString() : ''
        // if (fnStr.includes('return this') || fnStr.includes('=> this')) {
        return this[key](val)
      }
      else {
        this.set(key, val)
      }
    })
    return this
  }

  /**
   * @since 0.4.0
   * @desc shorthand methods, from strings to functions that call .set
   * @example this.extend(['eh']) === this.eh = val => this.set('eh', val)
   * @param  {Array<string>} methods
   * @return {ChainedMap}
   */
  extend(methods) {
    methods.forEach(method => {
      this.shorthands.push(method)
      this[method] = value => this.set(method, value)
    })
    return this
  }

  /**
   * @since 0.4.0
   * @desc clears the map,
   *       goes through this properties,
   *       calls .clear if they are instanceof Chainable or Map
   *
   * @see https://github.com/fliphub/flipchain/issues/2
   * @return {ChainedMap} @chainable
   */
  clear() {
    this.store.clear()
    Object.keys(this).forEach(key => {
      if (ignored(key)) return
      if (this[key] instanceof Chainable) this[key].clear()
      if (this[key] instanceof Map) this[key].clear()
    })

    return this
  }

  /**
   * @since 0.4.0
   * @desc spreads the entries from ChainedMap.store (Map)
   *       return store.entries, plus all chain properties if they exist
   * @param  {boolean} [chains=false] if true, returns all properties that are chains
   * @return {Object}
   */
  entries(chains = false) {
    const entries = [...this.store]
    let reduced = {}
    if (entries.length !== 0) {
      reduced = entries.reduce((acc, [key, value]) => {
        acc[key] = value
        return acc
      }, {})
    }

    if (chains === false) return reduced

    const add = self => {
      Object.keys(self).forEach(k => {
        if (ignored(k)) return
        const val = self[k]
        if (val && typeof val.entries === 'function') {
          Object.assign(reduced, {[k]: val.entries(true) || {}})
        }
      })

      return {add, reduced}
    }

    return add(this).add(reduced).reduced
  }

  /**
   * @since 0.4.0
   * @example chain.set('eh', true).get('eh') === true
   * @param  {any} key
   * @return {any}
   */
  get(key) {
    return this.store.get(key)
  }

  /**
   * @see ChainedMap.store
   * @since 0.4.0
   * @desc sets the value using the key on store
   * @example chain.set('eh', true).get('eh') === true
   * @param {any} key
   * @param {any} value
   * @return {ChainedMap}
   */
  set(key, value) {
    this.store.set(key, value)
    return this
  }

  /**
   * @TODO needs to pass in additional opts somehow...
   * @see dopemerge, MergeChain
   * @since 0.4.0
   *       ...as second arg? on instance property?
   * @example chain.set('eh', [1]).merge({eh: [2]}).get('eh') === [1, 2]
   * @desc merges an object with the current store
   * @param {Object} obj object to merge
   * @param {Function | null} cb return the merger to the callback
   * @return {ChainedMap} @chainable
   */
  merge(obj, cb = null) {
    const merger = MergeChain.init(this)
    if (cb === null) {
      merger.merge(obj)
    }
    else {
      cb(merger.obj(obj))
    }
    return this
  }

  /**
   * @since 0.4.0
   * @desc goes through the maps,
   *       and the map values,
   *       reduces them to array
   *       then to an object using the reduced values
   *
   * @param {Object} obj object to clean, usually .entries()
   * @return {Object}
   */
  clean(obj) {
    return Object.keys(obj).reduce((acc, key) => {
      const val = obj[key]
      if (val === undefined || val === null) return acc
      if (Array.isArray(val) && !val.length) return acc
      if (
        Object.prototype.toString.call(val) === '[object Object]' &&
        Object.keys(val).length === 0
      ) {
        return acc
      }

      acc[key] = val

      return acc
    }, {})
  }
}

module.exports = ChainedMap
