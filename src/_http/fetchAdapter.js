'use strict'
import 'abort-controller/polyfill'
import crossFetch from 'cross-fetch'
import http from 'http'
import https from 'https'
import { AbortError, StreamsNotSupported, TimeoutError } from '../errors'
import { formatUrl, isNodeEnv } from '../_util'

/**
 * Http client adapter built around fetch API.
 *
 * @constructor
 * @param {?object} options FetchAdapter options.
 * @param {?boolean} options.keepAlive Whether use keep-alive connection.
 * @param {?boolean} options.isHttps Whether use https connection.
 * @param {?function} options.fetch Fetch compatible API.
 * @private
 */
export default function FetchAdapter(options) {
  options = options || {}

  /**
   * Identifies a type of adapter.
   *
   * @type {string}
   */
  this.type = 'fetch'
  this._fetch = resolveFetch(options.fetch)

  if (isNodeEnv() && options.keepAlive) {
    this._keepAliveEnabledAgent = new (options.isHttps ? https : http).Agent({
      keepAlive: true,
    })
  }
}

/**
 * Issues http requests using fetch API.
 *
 * @param {object} options Request options.
 * @param {string} options.origin Request origin.
 * @param {string} options.path Request path.
 * @param {?object} options.query Request query.
 * @param {string} options.method Request method.
 * @param {?object} options.headers Request headers.
 * @param {?string} options.body Request body utf8 string.
 * @params {?object} options.streamConsumer Stream consumer.
 * @param {?object} options.signal Abort signal object.
 * @param {?number} options.queryTimeout Request timeout.
 * @returns {Promise} Request result.
 */
FetchAdapter.prototype.execute = function(options) {
  var signal = options.signal
  // Use timeout only if no signal provided
  var useTimeout = !options.signal && !!options.queryTimeout
  var timerId

  var cleanup = function() {
    if (timerId) {
      clearTimeout(timerId)
    }
  }

  var onResponse = function(response) {
    cleanup()

    var headers = responseHeadersAsObject(response.headers)
    var isStreaming = response.ok && options.streamConsumer != null

    // Regular request - return text content immediately.
    if (!isStreaming) {
      return response.text().then(function(content) {
        return {
          body: content,
          headers: headers,
          status: response.status,
        }
      })
    }

    attachStreamConsumer(response, options.streamConsumer)

    return {
      // Syntactic stream representation.
      body: '[stream]',
      headers: headers,
      status: response.status,
    }
  }

  var onError = function(error) {
    cleanup()

    return Promise.reject(remapFetchError(error, useTimeout))
  }

  if (useTimeout) {
    var ctrl = new AbortController()

    signal = ctrl.signal
    timerId = setTimeout(ctrl.abort.bind(ctrl), options.queryTimeout)
  }

  return this._fetch(formatUrl(options.origin, options.path, options.query), {
    method: options.method,
    headers: options.headers,
    body: options.body,
    agent: this._keepAliveEnabledAgent,
    signal: signal,
  })
    .then(onResponse)
    .catch(onError)
}

/**
 * Attaches streamConsumer specifically either for browser or NodeJS.
 * Minimum browser compatibility based on current code:
 * Chrome                52
 * Edge                  79
 * Firefox               65
 * IE                    NA
 * Opera                 39
 * Safari                10.1
 * Android Webview       52
 * Chrome for Android    52
 * Firefox for Android   65
 * Opera for Android     41
 * Safari on iOS         10.3
 * Samsung Internet      6.0
 *
 * @param response Fetch response.
 * @param consumer StreamConsumer.
 * @private
 */
function attachStreamConsumer(response, consumer) {
  var onError = function(error) {
    consumer.onError(remapFetchError(error))
  }

  if (isNodeEnv()) {
    response.body
      .on('error', onError)
      .on('data', consumer.onData)
      .on('end', function() {
        // To simulate how browsers behave in case of "end" event.
        consumer.onError(new TypeError('network error'))
      })

    return
  }

  // ATTENTION: The following code is meant to run in browsers and is not
  // covered by current test automation. Manual testing on major browsers
  // is required after making changes to it.
  try {
    var reader = response.body.getReader()
    var decoder = new TextDecoder('utf-8')

    function pump() {
      return reader.read().then(function(msg) {
        if (!msg.done) {
          var chunk = decoder.decode(msg.value, { stream: true })

          consumer.onData(chunk)

          return pump()
        }

        // In case a browser hasn't thrown the "network error" on stream's end
        // we need to force it in order to provide a way to handle stream's
        // ending.
        consumer.onError(new TypeError('network error'))
      })
    }

    pump().catch(onError)
  } catch (err) {
    throw new StreamsNotSupported(
      'Please, consider providing a Fetch API-compatible function ' +
        'with streamable response bodies. ' +
        err
    )
  }
}

/**
 * Remaps fetch error to HttpClient's one for timeout and abort use-cases.
 * Thus HttpClient will expose the same errors.
 *
 * @param {object} error Error object.
 * @param {?boolean} useTimeout Whether timeout is specified.
 * @returns {object} Remapped or original error.
 * @private
 */
function remapFetchError(error, useTimeout) {
  var isAbortError = error && error.name === 'AbortError'

  if (!isAbortError) {
    return error
  }

  return useTimeout ? new TimeoutError() : new AbortError()
}

/**
 * Resolves which Fetch API compatible function to use. If an override is
 * provided, returns the override. If no override and the global (window) has
 * "fetch" property, return the native fetch. Otherwise returns the cross-fetch polyfill.
 *
 * @param {?function} fetchOverride An Fetch API compatible function to use.
 * @returns {function} A Fetch API compatible function.
 * @private
 */
function resolveFetch(fetchOverride) {
  if (typeof fetchOverride === 'function') {
    return fetchOverride
  }

  if (typeof global.fetch === 'function') {
    // NB. Rebinding to global is needed for Safari
    return global.fetch.bind(global)
  }

  return crossFetch
}

/**
 * Converts fetch Headers object into POJO.
 *
 * @param {object} headers Fetch Headers object.
 * @returns {object} Response headers as a plain object.
 * @private
 */
function responseHeadersAsObject(headers) {
  var result = {}

  for (var header of headers.entries()) {
    var key = header[0]
    var value = header[1]

    result[key] = value
  }

  return result
}
