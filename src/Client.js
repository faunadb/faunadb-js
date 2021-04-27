'use strict'

import packageJson from '../package.json'
import { FaunaHTTPError } from './errors'
import PageHelper from './PageHelper'
import { wrap } from './query/common'
import RequestResult from './RequestResult'
import { Ref } from './values'
import HttpClient from './_http'
import { parseJSON } from './_json'
import {
  applyDefaults,
  checkInstanceHasProperty,
  defaults,
  getEnvVariable,
  removeUndefinedValues,
} from './_util'

/**
 * The callback that will be executed after every completed request.
 *
 * @callback Client~observerCallback
 * @param {RequestResult} res
 */

/**
 * **WARNING: This is an experimental feature. There are no guarantees to
 * its API stability and/or service availability. DO NOT USE IT IN
 * PRODUCTION**.
 *
 * Creates a subscription to the result of the given read-only expression. When
 * executed, the expression must only perform reads and produce a single
 * streamable type, such as a reference or a version. Expressions that attempt
 * to perform writes or produce non-streamable types will result in an error.
 * Otherwise, any expression can be used to initiate a stream, including
 * user-defined function calls.
 *
 * The subscription returned by this method does not issue any requests until
 * the {@link module:stream~Subscription#start} method is called. Make sure to
 * subscribe to the events of interest, otherwise the received events are simply
 * ignored. For example:
 *
 * ```
 * client.stream(document.ref)
 *   .on('version', version => console.log(version))
 *   .on('error', error => console.log(error))
 *   .start()
 * ```
 *
 * Please note that streams are not temporal, meaning that there is no option to
 * configure its starting timestamp. The stream will, however, state its initial
 * subscription time via the {@link module:stream~Subscription#event:start}
 * event. A common programming mistake is to read a document, then initiate a
 * subscription. This approach can miss events that occurred between the initial
 * read and the subscription request. To prevent event loss, make sure the
 * subscription has started before performing a data load. The following example
 * buffer events until the document's data is loaded:
 *
 * ```
 * var buffer = []
 * var loaded = false
 *
 * client.stream(document.ref)
 *   .on('start', ts => {
 *     loadData(ts).then(data => {
 *       processData(data)
 *       processBuffer(buffer)
 *       loaded = true
 *     })
 *   })
 *   .on('version', version => {
 *     if (loaded) {
 *       processVersion(version)
 *     } else {
 *       buffer.push(version)
 *     }
 *   })
 *   .start()
 * ```
 *
 * The reduce boilerplate, the `document` helper implements a similar
 * functionality, except it discards events prior to the document's snapshot
 * time. The expression given to this helper must be a reference as it
 * internally runs a {@link module:query~Get} call with it. The example above
 * can be rewritten as:
 *
 * ```
 * client.stream.document(document.ref)
 *   .on('snapshot', data => processData(data))
 *   .on('version', version => processVersion(version))
 *   .start()
 * ```
 *
 * Be aware that streams are not available in all browsers. If the client can't
 * initiate a stream, an error event with the {@link
 * module:errors~StreamsNotSupported} error will be emmited.
 *
 * To stop a subscription, call the {@link module:stream~Subscription#close}
 * method:
 *
 * ```
 * var subscription = client.stream(document.ref)
 *   .on('version', version => processVersion(version))
 *   .start()
 *
 * // ...
 * subscription.close()
 * ```
 *
 * @param {module:query~ExprArg} expression
 *   The expression to subscribe to. Created from {@link module:query}
 *   functions.
 *
 * @param {?module:stream~Options} options
 *   Object that configures the stream.
 *
 * @property {function} document
 *  A document stream helper. See {@link Client#stream} for more information.
 *
 * @see module:stream~Subscription
 *
 * @function
 * @name Client#stream
 * @returns {module:stream~Subscription} A new subscription instance.
 */

/**
 * A client for interacting with FaunaDB.
 *
 * Users will mainly call the {@link Client#query} method to execute queries, or
 * the {@link Client#stream} method to subscribe to streams.
 *
 * See the [FaunaDB Documentation](https://fauna.com/documentation) for detailed examples.
 *
 * All methods return promises containing a JSON object that represents the FaunaDB response.
 * Literal types in the response object will remain as strings, Arrays, and objects.
 * FaunaDB types, such as {@link Ref}, {@link SetRef}, {@link FaunaTime}, and {@link FaunaDate} will
 * be converted into the appropriate object.
 *
 * (So if a response contains `{ "@ref": "collections/frogs/123" }`,
 * it will be returned as `new Ref("collections/frogs/123")`.)
 *
 * @constructor
 * @param {?Object} options
 *   Object that configures this FaunaDB client.
 * @param {?string} options.domain
 *   Base URL for the FaunaDB server.
 * @param {?{ string: string }} options.headers
 *   Base URL for the FaunaDB server.
 * @param {?('http'|'https')} options.scheme
 *   HTTP scheme to use.
 * @param {?number} options.port
 *   Port of the FaunaDB server.
 * @param {?string} options.secret FaunaDB secret (see [Reference Documentation](https://app.fauna.com/documentation/intro/security))
 * @param {?Client~observerCallback} options.observer
 *   Callback that will be called after every completed request.
 * @param {?boolean} options.keepAlive
 *   Configures http/https keepAlive option (ignored in browser environments)
 * @param {?fetch} options.fetch
 *   a fetch compatible [API](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API) for making a request
 * @param {?number} options.queryTimeout
 *   Sets the maximum amount of time (in milliseconds) for query execution on the server
 * @param {?number} options.http2SessionIdleTime
 *   Sets the maximum amount of time (in milliseconds) an HTTP2 session may live
 *   when there's no activity. Only applicable for NodeJS environment (when http2 module is used), 500 by default,
 *   can be configured via FAUNADB_HTTP2_SESSION_IDLE_TIME environment variable.
 */
export default function Client(options) {
  var http2SessionIdleTimeEnv = parseInt(
    getEnvVariable('FAUNADB_HTTP2_SESSION_IDLE_TIME'),
    10
  )
  var http2SessionIdleTimeDefault = !isNaN(http2SessionIdleTimeEnv)
    ? http2SessionIdleTimeEnv
    : 500

  options = applyDefaults(options, {
    domain: 'db.fauna.com',
    scheme: 'https',
    port: null,
    secret: null,
    observer: null,
    keepAlive: true,
    headers: {},
    fetch: undefined,
    queryTimeout: 60 * 1000,
    http2SessionIdleTime: http2SessionIdleTimeDefault,
  })

  this._observer = options.observer
  this._http = new HttpClient(options)
}

/**
 * Current API version.
 *
 * @type {string}
 */
Client.apiVersion = packageJson.apiVersion

/**
 * Executes a query via the FaunaDB Query API.
 * See the [docs](https://app.fauna.com/documentation/reference/queryapi),
 * and the query functions in this documentation.
 * @param expression {module:query~ExprArg}
 *   The query to execute. Created from {@link module:query} functions.
 * @param {?Object} options
 *   Object that configures the current query, overriding FaunaDB client options.
 * @param {?string} options.secret FaunaDB secret (see [Reference Documentation](https://app.fauna.com/documentation/intro/security))
 * @return {external:Promise<Object>} FaunaDB response object.
 */
Client.prototype.query = function(expression, options) {
  return this._execute('POST', '', wrap(expression), null, options)
}

/**
 * Returns a {@link PageHelper} for the given Query expression.
 * This provides a helpful API for paginating over FaunaDB responses.
 * @param expression {Expr}
 *   The Query expression to paginate over.
 * @param params {Object}
 *   Options to be passed to the paginate function. See [paginate](https://app.fauna.com/documentation/reference/queryapi#read-functions).
 * @param options {?Object}
 *   Object that configures the current pagination queries, overriding FaunaDB client options.
 * @param {?string} options.secret FaunaDB secret (see [Reference Documentation](https://app.fauna.com/documentation/intro/security))
 * @returns {PageHelper} A PageHelper that wraps the provided expression.
 */
Client.prototype.paginate = function(expression, params, options) {
  params = defaults(params, {})
  options = defaults(options, {})

  return new PageHelper(this, expression, params, options)
}

/**
 * Sends a `ping` request to FaunaDB.
 * @return {external:Promise<string>} Ping response.
 */
Client.prototype.ping = function(scope, queryTimeout) {
  return this._execute('GET', 'ping', null, {
    scope: scope,
    timeout: queryTimeout,
  })
}

/**
 * Get the freshest timestamp reported to this client.
 * @returns {number} the last seen transaction time
 */
Client.prototype.getLastTxnTime = function() {
  return this._http.getLastTxnTime()
}

/**
 * Sync the freshest timestamp seen by this client.
 *
 * This has no effect if staler than currently stored timestamp.
 * WARNING: This should be used only when coordinating timestamps across
 *          multiple clients. Moving the timestamp arbitrarily forward into
 *          the future will cause transactions to stall.
 * @param time {number} the last seen transaction time
 */
Client.prototype.syncLastTxnTime = function(time) {
  this._http.syncLastTxnTime(time)
}

Client.prototype._execute = function(method, path, data, query, options) {
  query = defaults(query, null)

  if (path instanceof Ref || checkInstanceHasProperty(path, '_isFaunaRef')) {
    path = path.value
  }

  if (query !== null) {
    query = removeUndefinedValues(query)
  }

  var startTime = Date.now()
  var self = this
  var body =
    ['GET', 'HEAD'].indexOf(method) >= 0 ? undefined : JSON.stringify(data)

  return this._http
    .execute(
      Object.assign({}, options, {
        path: path,
        query: query,
        method: method,
        body: body,
      })
    )
    .then(function(response) {
      var endTime = Date.now()
      var responseObject = parseJSON(response.body)
      var result = new RequestResult(
        method,
        path,
        query,
        body,
        data,
        response.body,
        responseObject,
        response.status,
        response.headers,
        startTime,
        endTime
      )
      self._handleRequestResult(response, result, options)

      return responseObject['resource']
    })
}

Client.prototype._handleRequestResult = function(response, result, options) {
  var txnTimeHeaderKey = 'x-txn-time'

  if (response.headers[txnTimeHeaderKey] != null) {
    this.syncLastTxnTime(parseInt(response.headers[txnTimeHeaderKey], 10))
  }

  var observers = [this._observer, options && options.observer]

  observers.forEach(observer => {
    if (typeof observer == 'function') {
      observer(result, this)
    }
  })

  FaunaHTTPError.raiseForStatusCode(result)
}
