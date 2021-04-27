'use strict'

import { toJSON } from './_json'

/**
 * Functions to assist with debug logging.
 * @module clientLogger
 */

/**
 * A user provided log line handler.
 *
 * @callback loggerCallback
 * @param {string} logged
 */

/**
 * Function that can be the `observer` for a {@link Client}.
 * Will call `loggerFunction` with a string representation of each {@link RequestResult}.
 *
 * An example logging string:
 * ```plain
 * Fauna POST /
 * Request JSON: {
 *   "data": ...
 * }
 * Response headers: {
 *    "x-faunadb-host": ...,
 *    "x-faunadb-build": ...,
 *    "connection": "close",
 *    "content-length": ...,
 *    "content-type": "application/json;charset=utf-8"
 *  }
 * Response JSON: {
 *    "resource": {
 *      "ref": { ... },
 *      "class": { ... },
 *      "ts": ...
 *    }
 *  }
 * Response (201): Network latency 13ms
 * ```
 *
 * @param {loggerCallback} loggerFunction
 * @return {Client~observerCallback}
 * @example
 * var client = new Client({
 *   ... other options ...
 *   observer: logger(console.log)
 * })
 * client.ping() // Logs the request and response.
 */
export function logger(loggerFunction) {
  return function(requestResult, client) {
    return loggerFunction(showRequestResult(requestResult), client)
  }
}

/**
 * Convenience function used by {@link logger} to transform a {@link RequestResult}
 * to a string for logging.
 * @param {RequestResult} requestResult
 * @returns {string} string to be logged.
 */
export function showRequestResult(requestResult) {
  var query = requestResult.query,
    method = requestResult.method,
    path = requestResult.path,
    requestContent = requestResult.requestContent,
    responseHeaders = requestResult.responseHeaders,
    responseContent = requestResult.responseContent,
    statusCode = requestResult.statusCode,
    timeTaken = requestResult.timeTaken

  var out = ''

  function log(str) {
    out = out + str
  }

  log('Fauna ' + method + ' /' + path + _queryString(query) + '\n')
  if (requestContent != null) {
    log('  Request JSON: ' + _showJSON(requestContent) + '\n')
  }
  log('  Response headers: ' + _showJSON(responseHeaders) + '\n')
  log('  Response JSON: ' + _showJSON(responseContent) + '\n')
  log('  Response (' + statusCode + '): Network latency ' + timeTaken + 'ms\n')

  return out
}

function _indent(str) {
  var indentStr = '  '
  return str.split('\n').join('\n' + indentStr)
}

function _showJSON(object) {
  return _indent(toJSON(object, true))
}

function _queryString(query) {
  if (query == null) {
    return ''
  }

  var keys = Object.keys(query)
  if (keys.length === 0) {
    return ''
  }

  var pairs = keys.map(function(key) {
    return key + '=' + query[key]
  })
  return '?' + pairs.join('&')
}
