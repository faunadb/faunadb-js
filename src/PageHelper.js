'use strict'

import Filter from './query/Filter'
import Map from './query/Map'
import Paginate from './query/Paginate'

/**
 * A FaunaDB Lambda expression to be passed into one of the collection
 * functions: Map or Filter.
 *
 * @callback PageHelper~collectionFunction
 * @param {any} var
 *   The variable passed in by FaunaDB when this Lambda
 *   function is executed.
 * @return {Expr}
 *   The FaunaDB query expression to be returned by this Lambda.
 */

/**
 * @callback PageHelper~eachFunction
 * @param {Object} page
 *   A page returned by FaunaDB's Paginate function.
 */

/**
 * A wrapper that provides a helpful API for consuming FaunaDB pages.
 *
 * Generally this is constructed through the {@link Client#paginate} method.
 *
 * The {@link PageHelper#map} and {@link PageHelper#filter} methods will wrap the underlying query with a Map
 * and Filter query function, respectively. These will be executed on the server when a promise-returning function
 * is called.
 *
 * The {@link PageHelper#each} and {@link PageHelper#eachReverse} functions dispatch queries to FaunaDB, and return Promises
 * representing the completion of those queries. The callbacks provided to these functions are executed locally when the
 * queries return.
 *
 * The {@link PageHelper#nextPage} and {@link PageHelper#previousPage} functions also dispatch queries to FaunaDB,
 * but return their responses in a wrapped Promise.
 *
 * @param {Client} client
 *   The FaunaDB client used to paginate.
 * @param {Object} set
 *   The set to paginate.
 * @param {?Object} params
 *   Parameters to be passed to the FaunaDB Paginate function.
 * @param {?Object} options
 *   Object that configures the current pagination, overriding FaunaDB client options.
 * @param {?string} options.secret FaunaDB secret (see [Reference Documentation](https://app.fauna.com/documentation/intro/security))
 * @constructor
 */
export default function PageHelper(client, set, params, options) {
  if (params === undefined) {
    params = {}
  }

  if (options === undefined) {
    options = {}
  }

  this.reverse = false
  this.params = {}

  this.before = undefined
  this.after = undefined

  Object.assign(this.params, params)

  var cursorParams = this.params.cursor || this.params

  if ('before' in cursorParams) {
    this.before = cursorParams.before
    delete cursorParams.before
  } else if ('after' in cursorParams) {
    this.after = cursorParams.after
    delete cursorParams.after
  }

  this.options = {}
  Object.assign(this.options, options)

  this.client = client
  this.set = set

  /**
   * @member {Array.<Function>}
   * @type {Array.<Function>}
   * @private
   */
  this._faunaFunctions = []
}

/**
 * Wraps the set to be paginated with a FaunaDB Map function.
 * As this function is executed on the server, the `lambda` param must
 * return a valid query expression.
 *
 * @param {PageHelper~collectionFunction} lambda
 *   The Lambda expression to be passed into the Map function.
 * @return {PageHelper}
 *
 */
PageHelper.prototype.map = function(lambda) {
  var rv = this._clone()
  rv._faunaFunctions.push(function(q) {
    return Map(q, lambda)
  })
  return rv
}

/**
 * Wraps the set to be paginated with a FaunaDB Filter funciton.
 * As this function is executed on the server, the `lambda` param must
 * return a valid query expression.
 *
 * @param {PageHelper~collectionFunction} lambda
 *   The lambda expression to be passed into the Filter function.
 * @return {PageHelper}
 */
PageHelper.prototype.filter = function(lambda) {
  var rv = this._clone()
  rv._faunaFunctions.push(function(q) {
    return Filter(q, lambda)
  })
  return rv
}

/**
 * Executes the provided function for each page.
 *
 * @param {PageHelper~eachFunction} lambda
 *   A function to be executed for each page.
 * @returns {external:Promise.<void>}
 */
PageHelper.prototype.each = function(lambda) {
  return this._retrieveNextPage(this.after, false).then(
    this._consumePages(lambda, false)
  )
}

/**
 * Executes the provided function for each page, in the reverse direction.
 * @param {PageHelper~eachFunction} lambda
 * @returns {external:Promise.<void>}
 */
PageHelper.prototype.eachReverse = function(lambda) {
  return this._retrieveNextPage(this.before, true).then(
    this._consumePages(lambda, true)
  )
}

/**
 * Queries for the previous page from the current cursor point; this mutates
 * the state of the PageHelper when the query completes, updating the internal
 * cursor state to that of the returned page.
 *
 * @returns {external:Promise.<object>}
 */
PageHelper.prototype.previousPage = function() {
  var self = this
  return this._retrieveNextPage(this.before, true).then(
    this._adjustCursors.bind(self)
  )
}

/**
 * Queries for the next page from the current cursor point; this mutates
 * the state of the PageHelper when the query completes, updating the internal
 * cursor state to that of the returned page.
 *
 * @returns {external:Promise.<object>}
 */
PageHelper.prototype.nextPage = function() {
  var self = this
  return this._retrieveNextPage(this.after, false).then(
    this._adjustCursors.bind(self)
  )
}

PageHelper.prototype._adjustCursors = function(page) {
  if (page.after !== undefined) {
    this.after = page.after
  }

  if (page.before !== undefined) {
    this.before = page.before
  }

  return page.data
}

PageHelper.prototype._consumePages = function(lambda, reverse) {
  var self = this
  return function(page) {
    var data = []
    page.data.forEach(function(item) {
      if (item.document) {
        item.instance = item.document
      }
      if (item.value && item.value.document) {
        item.value.instance = item.value.document
      }
      data.push(item)
    })
    lambda(data)

    var nextCursor
    if (reverse) {
      nextCursor = page.before
    } else {
      nextCursor = page.after
    }

    if (nextCursor !== undefined) {
      return self
        ._retrieveNextPage(nextCursor, reverse)
        .then(self._consumePages(lambda, reverse))
    } else {
      return Promise.resolve()
    }
  }
}

/**
 *
 * @returns {external:Promise.<Object>}
 * @private
 */
PageHelper.prototype._retrieveNextPage = function(cursor, reverse) {
  var opts = {}
  Object.assign(opts, this.params)
  var cursorOpts = opts.cursor || opts

  if (cursor !== undefined) {
    if (reverse) {
      cursorOpts.before = cursor
    } else {
      cursorOpts.after = cursor
    }
  } else {
    if (reverse) {
      cursorOpts.before = null
    }
  }

  var q = Paginate(this.set, opts)

  if (this._faunaFunctions.length > 0) {
    this._faunaFunctions.forEach(function(lambda) {
      q = lambda(q)
    })
  }

  return this.client.query(q, this.options)
}

/**
 * @private
 * @returns {PageHelper}
 */
PageHelper.prototype._clone = function() {
  return Object.create(PageHelper.prototype, {
    client: { value: this.client },
    set: { value: this.set },
    _faunaFunctions: { value: this._faunaFunctions },
    before: { value: this.before },
    after: { value: this.after },
  })
}
