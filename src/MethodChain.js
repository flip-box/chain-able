/**
 * @TODO clarify .set vs .call
 * @see https://github.com/iluwatar/java-design-patterns/tree/master/property
 * @see https://github.com/iluwatar/java-design-patterns/tree/master/prototype
 */
/* eslint-disable complexity */
/* eslint-disable import/max-dependencies */

// core
const ChainedMap = require('./ChainedMapBase')
const meta = require('./deps/meta')
const DECORATED_KEY = require('./deps/meta/decorated')
const SHORTHANDS_KEY = require('./deps/meta/shorthands')
const ENV_DEVELOPMENT = require('./deps/env/dev')
// schema
const validatorMethodFactory = require('./deps/validators/methodFactory')
const schemaFactory = require('./deps/validators/schemaFactory')
const methodEncasingFactory = require('./deps/encase/factory')
// obj
const hasOwnProperty = require('./deps/util/hasOwnProperty')
const getDescriptor = require('./deps/util/getDescriptor')
const ObjectDefine = require('./deps/define')
const ObjectKeys = require('./deps/util/keys')
const ObjectAssign = require('./deps/util/assign')
// utils
const toarr = require('./deps/to-arr')
const argumentor = require('./deps/argumentor')
const camelCase = require('./deps/camel-case')
const markForGarbageCollection = require('./deps/gc')
// is
const isObj = require('./deps/is/obj')
const isArray = require('./deps/is/array')
const isFunction = require('./deps/is/function')
const isUndefined = require('./deps/is/undefined')
const isTrue = require('./deps/is/true')

// const timer = require('fliplog').fliptime()

function getSetFactory(_this, name, desc) {
  _this[camelCase(`set-${name}`)] = desc.set
  _this[camelCase(`get-${name}`)] = desc.get
}

function aliasFactory(name, parent, aliases) {
  if (aliases) {
    for (let a = 0; a < aliases.length; a++) {
      ObjectDefine(parent, aliases[a], getDescriptor(parent, name))
    }
  }
}

// @TODO: to use as a function
// function _methods() {}
// _methods.use(obj) {
//   this.obj = obj
//   return _methods
// }
// _methods.extend = _methods.use
// _methods.methods = function(methods) {
//   return new MethodChain(this.obj)
// }

/**
 * @since 4.0.0
 *
 * @TODO: .prop - for things on the instance, not in the store?
 *        !!! .sponge - absorn properties into the store
 *
 * @type {Map}
 */
class MethodChain extends ChainedMap {
  constructor(parent) {
    // timer.start('methodchain')

    super(parent)

    // ----------------

    const set = this.set.bind(this)

    this.toNumber = () => this.build(0)

    this.extend([
      'onInvalid',
      'onValid',
      'initial',
      'default',
      'type',
      'callReturns',
      'decorationTarget',
    ])

    // shorthand
    this.method = this.methods = name => {
      if (!this.length) return this.name(name)
      return this.build().methods(name)
    }

    // default argument...
    this.encase = x => {
      return set('encase', parent[x] || x || true)
    }

    // alias
    this.then = this.onValid.bind(this)
    this.catch = this.onInvalid.bind(this)

    // @NOTE shorthands.bindMethods
    this.bind = (should = parent) => set('bind', should)
    this.returns = (x, callReturns) =>
      set('returns', x || parent).set('callReturns', callReturns)

    // @NOTE  replaces shorthands.chainWrap
    this.chainable = this.returns

    this.onSet = x => set('set', x)
    this.onGet = x => set('get', x)
    this.onCall = x => set('call', x)

    this.alias = aliases =>
      this.tap('alias', (old, merge) => merge(old, toarr(aliases)))
    this.factory = factory =>
      this.tap('factories', (old, merge) => merge(old, toarr(factory)))

    /**
     * @since 4.0.0
     * @param  {string | Object | Array<string>} methods
     * @return {MethodChain}
     */
    this.name = methods => {
      let names = methods

      /**
       * @desc this is a factory for building methods
       *       schema defaults value to `.type`
       *       this defaults values to `.onCall`
       */
      if (!isArray(methods) && isObj(methods)) {
        names = ObjectKeys(methods)
        names.forEach(method =>
          this.factory(name => {
            const obj = methods[name]

            if (isFunction(obj)) {
              // @TODO: IS THIS THE BEST DEFAULT?!
              this.define(false)
              this.onCall(obj)
              // .onSet(obj).onGet(obj)
            }
            else {
              this.from(obj)
              // @NOTE: this is reserved
              if (obj.set) this.onSet(obj.set)
              if (obj.get) this.onGet(obj.get)
              if (obj.call) this.onCall(obj.call)
              // aka, ^ this.from !!!!
              // if (obj.type) this.type(obj.type)
              // if (obj.define) this.define(true)
              // if (obj.getSet) this.getSet(true)
              // if (obj.alias) this.alias(obj.alias)
              // if (obj.factory) this.factory(obj.factory)
              // if (obj.onValid) this.onValid(obj.onValid)
              // if (obj.onInvalid) this.onInvalid(obj.onInvalid)
              // if (obj.initial) this.initial(obj.initial)
              // if (obj.default) this.default(obj.default)
              // if (obj.returns) this.returns(obj.returns)
              if (obj.set && obj.get) {
                this.define().getSet()
              }
            }
          })
        )
      }
      return set('names', names)
    }

    this.camelCase = () => set('camel', true)

    this.define = (x = true) => set('define', x)
    this.getSet = (x = true) => set('getSet', x)
  }

  /**
   * @since 4.0.0
   * @param {Object} obj schema
   * @return {MethodChain} @chainable
   *
   * @TODO inherit properties (in factory, for each key)
   *       from this for say, dotProp, getSet
   *
   * @TODO very @important
   *       that we setup schema validation at the highest root for validation
   *       and then have some demo for how to validate on set using say mobx
   *       observables for all the way down...
   */
  schema(obj) {
    const {onInvalid, onValid, define, getSet} = this.entries()

    const keys = ObjectKeys(obj)

    for (let k = 0; k < keys.length; k++) {
      const key = keys[k]
      const value = obj[key]

      let builder = this.parent.method(key)
      if (onInvalid) builder.onInvalid(onInvalid)
      if (onValid) builder.onValid(onValid)
      if (define) builder.define()
      if (getSet) builder.getSet()

      if (isObj(value)) {
        const traversableValidator = schemaFactory(key, value)
        traversableValidator.schema = value
        builder.type(traversableValidator)
      }
      else {
        builder.type(value)
      }

      this.parent.meta('schema', key, value)
      builder.build()
    }

    return this
  }

  /**
   * @TODO: if passing in a name that already exists, operations are decorations... (partially done)
   * @see https://github.com/iluwatar/java-design-patterns/tree/master/step-builder
   *
   * @since 4.0.0
   * @desc set the actual method, also need .context - use .parent
   * @param  {any} [returnValue=undefined] returned at the end of the function for ease of use
   * @return {MethodChain} @chainable
   */
  build(returnValue) {
    const parent = this.parent
    const names = toarr(this.get('names'))
    const shouldTapName = this.get('camel')

    for (let n = 0; n < names.length; n++) {
      let name = names[n]
      if (shouldTapName) name = camelCase(name)
      this._build(name, parent)
    }

    // timer.stop('methodchain').log('methodchain').start('gc')

    // remove refs to unused
    this.clear()
    delete this.parent
    markForGarbageCollection(this)

    // very fast - timer & ensuring props are cleaned
    // timer.stop('gc').log('gc')
    // require('fliplog').quick(this)

    return isUndefined(returnValue) ? parent : returnValue
  }

  /**
   * @TODO: optimize the size of this
   *        with some bitwise operators
   *        hashing the things that have been defaulted
   *
   * @since 4.0.0
   * @protected
   * @param {Primitive} name
   * @param {Object} parent
   * @param {Object} built
   */
  _defaults(name, parent, built) {
    // defaults
    const defaultOnSet = arg => parent.set(name, arg)
    const defaultOnGet = () => parent.get(name)

    // so we know if we defaulted them
    defaultOnSet.defaulted = true
    defaultOnGet.defaulted = true

    // when we've defaulted already for another method,
    // we need a new function,
    // else the name will be scoped incorrectly
    const {call, set, get} = built
    if (!get || get.defaulted) {
      this.onGet(defaultOnGet)
    }
    if (!call || call.defaulted) {
      this.onCall(defaultOnSet)
    }
    if (!set || set.defaulted) {
      this.onSet(defaultOnSet)
    }
  }

  /**
   * @protected
   * @TODO: add to .meta(shorthands)
   * @TODO: reduce complexity if perf allows
   * @NOTE: scoping here adding default functions have to rescope arguments
   * @param {Primitive} name
   * @param {Object} parent
   * @return {void}
   */
  _build(name, parent) {
    let method
    let existing
    const entries = () => this.entries()

    // could ternary `let method =` here
    if (hasOwnProperty(parent, name)) {
      existing = getDescriptor(parent, name)
      // avoid `TypeError: Cannot redefine property:`
      if (existing.configurable === false) return
      // use existing property, when configurable
      method = existing.value
      method.decorated = true
      this.onCall(method).onSet(method)
    }
    else if (parent[name]) {
      method = parent[name]
      method.decorated = true
      this.onCall(method).onSet(method)
    }

    // scope it once for factories & type building, then get it again
    let built = entries()

    this._defaults(name, parent, built)

    // factories can add methods,
    // useful as plugins/presets & decorators for multi-name building
    if (built.factories) {
      built.factories.map(factory => factory(name, parent))
    }

    built = entries()

    if (built.type) {
      const validatorMethod = validatorMethodFactory(name, parent, built)
      this.set('call', validatorMethod).set('set', validatorMethod)
      built = entries()
    }
    else if (built.encase) {
      const encased = methodEncasingFactory(name, parent, built, method)
      encased.encased = method
      this.set('call', encased).set('set', encased)
      method = encased
      built = entries()
    }

    // not destructured for better variable names
    const shouldAddGetterSetter = built.getSet
    const shouldDefineGetSet = built.define
    const defaultValue = built.default

    // can only have `call` or `get/set`...
    const {get, set, call, initial, bind, returns, callReturns} = built

    // default method, if we do not have one already
    if (!method) {
      method = (arg = defaultValue) => call.call(parent, arg)
    }

    if (bind) {
      // bind = bindArgument || parent
      method = method.bind(bind)
    }
    if (returns) {
      const ref = method
      method = function() {
        const args = argumentor.apply(null, arguments)

        // eslint-disable-next-line prefer-rest-params
        const result = ref.apply(parent, args)

        return isTrue(callReturns)
          ? returns.apply(parent, [result].concat(args))
          : returns
      }
    }
    if (!isUndefined(initial)) {
      parent.set(name, initial)
    }

    // --------------- stripped -----------

    /**
     * can add .meta on them though for re-decorating
     * -> but this has issue with .getset so needs to be on .meta[name]
     */

    /* istanbul ignore next: dev */
    if (ENV_DEVELOPMENT) {
      ObjectDefine(get, 'name', {value: camelCase(`get-${name}`)})
      ObjectDefine(set, 'name', {value: camelCase(`set-${name}`)})
      ObjectDefine(call, 'name', {value: camelCase(`call-${name}`)})
      ObjectDefine(method, 'name', {value: camelCase(`${name}`)})
    }

    /* istanbul ignore next: dev */
    if (process.env.NODE_ENV === 'debug') {
      console.log({
        name,
        defaultValue,
        initial,
        returns,
        get,
        set,
        method: method.toString(),
      })
    }

    // ----------------- ;stripped ------------

    // --- could be a method too ---
    let descriptor = shouldDefineGetSet ? {get, set} : {value: method}
    if (existing) descriptor = ObjectAssign(existing, descriptor)

    // [TypeError: Invalid property descriptor.
    // Cannot both specify accessors and a value or writable attribute, #<Object>]
    if (descriptor.value && descriptor.get) {
      delete descriptor.value
    }
    if (!isUndefined(descriptor.writable)) {
      delete descriptor.writable
    }

    const target = this.get('decorationTarget') || parent

    ObjectDefine(target, name, descriptor)

    if (shouldAddGetterSetter) {
      if (target.meta) target.meta(SHORTHANDS_KEY, name, set)
      getSetFactory(target, name, {get, set})
    }

    aliasFactory(name, target, built.alias)

    // if (built.metadata) {
    //   target.meta(SHORTHANDS_KEY, name, set)
    // }
    // require('fliplog')
    //   .bold('decorate')
    //   .data({
    //     // t: this,
    //     descriptor,
    //     shouldDefineGetSet,
    //     method,
    //     str: method.toString(),
    //     // target,
    //     name,
    //   })
    //   .echo()
  }

  // ---

  /**
   * @since 4.0.0 <- moved from Extend
   * @since 1.0.0
   * @alias extendParent
   * @desc add methods to the parent for easier chaining
   * @see ChainedMap.parent
   * @param {Object} parentToDecorate
   * @return {ChainedMap} @chainable
   */
  decorate(parentToDecorate) {
    if (!parentToDecorate) {
      parentToDecorate = this.parent.parent
    }
    if (!parentToDecorate) {
      if (ENV_DEVELOPMENT) {
        throw new Error('must provide parent argument')
      }
      return this
    }
    this.decorationTarget(parentToDecorate)

    // can use this to "undecorate"
    if (!parentToDecorate.meta) {
      parentToDecorate.meta = meta(parentToDecorate)
    }

    // default returns result of calling function,
    // else .parentToDecorate
    return this.factory((name, parent) => {
      parentToDecorate.meta(DECORATED_KEY, name)

      // @NOTE: so we can return...
      /* prettier-ignore */
      return this
        .returns(parentToDecorate)
        .callReturns(function returnsFunction(result, ...args) {
          return result || parentToDecorate
        })
    })
  }

  /**
   * @since 4.0.0 <- renamed from .extendIncrement
   * @since 0.4.0
   * @desc adds a factory to increment the value on every call
   *        @modifies this.initial
   *        @modifies this.onCall
   * @return {MethodChain} @chainable
   */
  autoIncrement() {
    /* prettier-ignore */
    return this.factory((name, parent) => this
      .set('initial', 0)
      .set('call', () => parent.tap(name, num => num + 1))
    )
  }
}

module.exports = MethodChain
