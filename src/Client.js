'use strict'

var APIVersion = 'UNSTABLE'

var btoa = require('btoa-lite')
var errors = require('./errors')
var query = require('./query')
var values = require('./values')
var json = require('./_json')
var RequestResult = require('./RequestResult')
var util = require('./_util')
var PageHelper = require('./PageHelper')
var parse = require('url-parse')

/**
 * The callback that will be executed after every completed request.
 *
 * @callback Client~observerCallback
 * @param {RequestResult} res
 */

/**
 * A client for interacting with FaunaDB.
 *
 * Users will mainly call the {@link Client#query} method to execute queries.
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
 * @param {?number} options.timeout Read timeout in seconds.
 * @param {?Client~observerCallback} options.observer
 *   Callback that will be called after every completed request.
 * @param {?boolean} options.keepAlive
 *   Configures http/https keepAlive option (ignored in browser environments)
 * @param {?fetch} options.fetch
 *   a fetch compatible [API](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API) for making a request
 * @param {?number} options.queryTimeout
 *   Sets the maximum amount of time (in milliseconds) for query execution on the server,
 */
function Client(options) {
  var isNodeEnv = typeof window === 'undefined'
  var opts = util.applyDefaults(options, {
    domain: 'db.fauna.com',
    scheme: 'https',
    port: null,
    secret: null,
    timeout: 60,
    observer: null,
    keepAlive: true,
    headers: {},
    fetch: undefined,
    queryTimeout: null,
  })
  var isHttps = opts.scheme === 'https'

  if (opts.port === null) {
    opts.port = isHttps ? 443 : 80
  }

  this._baseUrl = opts.scheme + '://' + opts.domain + ':' + opts.port
  this._timeout = Math.floor(opts.timeout * 1000)
  this._secret = opts.secret
  this._observer = opts.observer
  this._lastSeen = null
  this._headers = opts.headers
  this._fetch = opts.fetch || require('cross-fetch')
  this._queryTimeout = opts.queryTimeout

  if (isNodeEnv && opts.keepAlive) {
    this._keepAliveEnabledAgent = new (isHttps
      ? require('https')
      : require('http')
    ).Agent({ keepAlive: true })
  }
}

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
  return this._execute('POST', '', query.wrap(expression), null, options)
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
Client.prototype.ping = function(scope, timeout) {
  return this._execute('GET', 'ping', null, { scope: scope, timeout: timeout })
}

/**
 * Get the freshest timestamp reported to this client.
 * @returns {number} the last seen transaction time
 */
Client.prototype.getLastTxnTime = function() {
  return this._lastSeen
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
  if (this._lastSeen == null || this._lastSeen < time) {
    this._lastSeen = time
  }
}

Client.prototype._execute = function(method, path, data, query, options) {
  query = defaults(query, null)

  if (
    path instanceof values.Ref ||
    util.checkInstanceHasProperty(path, '_isFaunaRef')
  ) {
    path = path.value
  }

  if (query !== null) {
    query = util.removeUndefinedValues(query)
  }

  var startTime = Date.now()
  var self = this
  var body =
    ['GET', 'HEAD'].indexOf(method) >= 0 ? undefined : JSON.stringify(data)

  return this._performRequest(method, path, body, query, options).then(function(
    response
  ) {
    var endTime = Date.now()
    var responseText = response.text
    var responseObject = json.parseJSON(responseText)
    var requestResult = new RequestResult(
      method,
      path,
      query,
      body,
      data,
      responseText,
      responseObject,
      response.status,
      responseHeadersAsObject(response),
      startTime,
      endTime
    )
    var txnTimeHeaderKey = 'x-txn-time'

    if (response.headers.has(txnTimeHeaderKey)) {
      self.syncLastTxnTime(parseInt(response.headers.get(txnTimeHeaderKey), 10))
    }

    if (self._observer != null) {
      self._observer(requestResult, self)
    }

    errors.FaunaHTTPError.raiseForStatusCode(requestResult)
    return responseObject['resource']
  })
}

Client.prototype._performRequest = function(
  method,
  path,
  body,
  query,
  options
) {
  var url = parse(this._baseUrl)
  url.set('pathname', path)
  url.set('query', query)
  options = defaults(options, {})
  var secret = options.secret || this._secret
  var queryTimeout = this._queryTimeout

  if (options && options.queryTimeout) {
    queryTimeout = options.queryTimeout
  }

  return this._fetch(url.href, {
    agent: this._keepAliveEnabledAgent,
    body: body,
    headers: util.removeNullAndUndefinedValues({
      ...this._headers,
      Authorization: secret && secretHeader(secret),
      'X-FaunaDB-API-Version': APIVersion,
      'X-Fauna-Driver': 'Javascript',
      'X-Last-Seen-Txn': this._lastSeen,
      'X-Query-Timeout': queryTimeout,
    }),
    method: method,
    timeout: this._timeout,
  }).then(function(response) {
    return response.text().then(function(text) {
      response.text = text
      return response
    })
  })
}

function defaults(obj, def) {
  if (obj === undefined) {
    return def
  } else {
    return obj
  }
}

function secretHeader(secret) {
  return 'Basic ' + btoa(secret + ':')
}

function responseHeadersAsObject(response) {
  var headers = {}

  for (var header of response.headers.entries()) {
    var key = header[0]
    var value = header[1]
    headers[key] = value
  }

  return headers
}

module.exports = Client
