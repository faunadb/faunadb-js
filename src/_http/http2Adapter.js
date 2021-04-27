'use strict'
import http2 from 'http2'
import { AbortError, TimeoutError } from '../errors'
import { querystringify } from '../_util'

var STREAM_PREFIX = 'stream::'

/**
 * Http client adapter built around NodeJS http2 module.
 *
 * @constructor
 * @param {object} options Http2Adapter options.
 * @param {number} options.http2SessionIdleTime The time (in milliseconds) that
 * an HTTP2 session may live when there's no activity.
 * @private
 */
export default function Http2Adapter(options) {
  /**
   * Identifies a type of adapter.
   *
   * @type {string}
   */
  this.type = 'http2'
  /**
   * Serves for reusing http2 sessions between multiple calls.
   *
   * @type {object}
   * @private
   */
  this._sessionMap = {}
  /**
   * The time (in ms) that an HTTP2 session may live when there's no activity.
   *
   * @type {number}
   * @private
   */
  this._http2SessionIdleTime = options.http2SessionIdleTime
}

/**
 * Resolves ClientHttp2Session to be reused across multiple requests.
 *
 * @param {string} origin Request origin to connect to.
 * @param {?boolean} isStreaming Whether it's a streaming request. A separate session
 * is created for streaming requests to avoid shared resources with regular
 * ones for the purpose of reliability.
 * @returns {object} An interface to operate with HTTP2 session.
 */
Http2Adapter.prototype._resolveSessionFor = function(origin, isStreaming) {
  var sessionKey = isStreaming ? STREAM_PREFIX + origin : origin

  if (this._sessionMap[sessionKey]) {
    return this._sessionMap[sessionKey]
  }

  var self = this
  var timerId = null
  var ongoingRequests = 0

  var cleanup = function() {
    self._cleanupSessionFor(origin, isStreaming)
  }

  var clearInactivityTimeout = function() {
    if (timerId) {
      clearTimeout(timerId)
      timerId = null
    }
  }

  var setInactivityTimeout = function() {
    clearInactivityTimeout()

    var onTimeout = function() {
      timerId = null

      if (ongoingRequests === 0) {
        cleanup()
      }
    }

    timerId = setTimeout(onTimeout, self._http2SessionIdleTime)
  }

  var sessionInterface = {
    session: http2
      .connect(origin)
      .once('error', cleanup)
      .once('goaway', cleanup),

    onRequestStart: function onRequestStart() {
      ++ongoingRequests
      clearInactivityTimeout()
    },

    onRequestEnd: function onRequestEnd() {
      --ongoingRequests

      // Set inactivity timer only if there are no ongoing requests.
      if (ongoingRequests === 0) {
        setInactivityTimeout()
      }
    },
  }

  this._sessionMap[sessionKey] = sessionInterface

  return sessionInterface
}

/**
 * Performs cleanup for broken session.
 *
 * @param {string} origin Request origin to connect to.
 * @param {?boolean} isStreaming Whether it's a streaming request.
 * @returns {void}
 */
Http2Adapter.prototype._cleanupSessionFor = function(origin, isStreaming) {
  var sessionKey = isStreaming ? STREAM_PREFIX + origin : origin

  if (this._sessionMap[sessionKey]) {
    this._sessionMap[sessionKey].session.close()
    delete this._sessionMap[sessionKey]
  }
}

/**
 * Issues http requests using http2 module.
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
Http2Adapter.prototype.execute = function(options) {
  var self = this
  var isStreaming = options.streamConsumer != null

  return new Promise(function(resolvePromise, rejectPromise) {
    var isPromiseSettled = false
    var isCanceled = false

    var resolve = function(value) {
      isPromiseSettled = true
      resolvePromise(value)
    }

    // If an error has occurred after the Promise is settled
    // we need to call streamConsumer.onError instead of reject function.
    // Possible scenario is aborting request when stream is already being consumed.
    var rejectOrOnError = function(error) {
      if (isPromiseSettled && isStreaming) {
        return options.streamConsumer.onError(error)
      }

      isPromiseSettled = true
      rejectPromise(error)
    }

    var onSettled = function() {
      sessionInterface.onRequestEnd()

      if (options.signal) {
        options.signal.removeEventListener('abort', onAbort)
      }
    }

    var onError = function(error) {
      onSettled()
      rejectOrOnError(error)
    }

    var onAbort = function() {
      isCanceled = true
      onSettled()
      request.close(http2.constants.NGHTTP2_CANCEL)
      rejectOrOnError(new AbortError())
    }

    var onTimeout = function() {
      isCanceled = true
      onSettled()
      request.close(http2.constants.NGHTTP2_CANCEL)
      rejectOrOnError(new TimeoutError())
    }

    var onResponse = function(responseHeaders) {
      var status = responseHeaders[http2.constants.HTTP2_HEADER_STATUS]
      var isOkStatus = status >= 200 && status < 400
      var processStream = isOkStatus && isStreaming
      var responseBody = ''

      var onData = function(chunk) {
        if (processStream) {
          return options.streamConsumer.onData(chunk)
        }

        responseBody += chunk
      }

      var onEnd = function() {
        if (!isCanceled) {
          onSettled()
        }

        if (!processStream) {
          return resolve({
            body: responseBody,
            headers: responseHeaders,
            status: status,
          })
        }

        // Call .onError with TypeError only if the request hasn't been canceled
        // in order to align on how FetchAdapter works - it throws the TypeError
        // due to underlying fetch API mechanics.
        if (!isCanceled) {
          options.streamConsumer.onError(new TypeError('network error'))
        }
      }

      if (processStream) {
        resolve({
          // Syntactic stream representation.
          body: '[stream]',
          headers: responseHeaders,
          status: status,
        })
      }

      request.on('data', onData).on('end', onEnd)
    }

    try {
      var pathname =
        (options.path[0] === '/' ? options.path : '/' + options.path) +
        querystringify(options.query, '?')
      var requestHeaders = Object.assign({}, options.headers, {
        [http2.constants.HTTP2_HEADER_PATH]: pathname,
        [http2.constants.HTTP2_HEADER_METHOD]: options.method,
      })
      var sessionInterface = self._resolveSessionFor(
        options.origin,
        isStreaming
      )
      var request = sessionInterface.session
        .request(requestHeaders)
        .setEncoding('utf8')
        .on('error', onError)
        .on('response', onResponse)

      sessionInterface.onRequestStart()

      // Set up timeout only if no signal provided.
      if (!options.signal && options.queryTimeout) {
        request.setTimeout(options.queryTimeout, onTimeout)
      }

      if (options.signal) {
        options.signal.addEventListener('abort', onAbort)
      }

      if (options.body != null) {
        request.write(options.body)
      }

      request.end()
    } catch (error) {
      self._cleanupSessionFor(options.origin, isStreaming)
      rejectOrOnError(error)
    }
  })
}
