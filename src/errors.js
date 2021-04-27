'use strict'
import { inherits } from './_util'

/**
 * FaunaDB error types. Request errors can originate from the client (e.g. bad
 * method parameters) or from the FaunaDB Server (e.g. invalid queries,
 * timeouts.) Server errors will subclass {@link module:errors~FaunaHTTPError}.
 * Stream errors will subclass {@link module:errors~StreamError}.
 *
 * @module errors
 */

/**
 * The base exception type for all FaunaDB errors.
 *
 * @param {string} message
 * @extends Error
 * @constructor
 */
export function FaunaError(name, message, description) {
  Error.call(this)

  /**
   * Name of this exception.
   * @type {string}
   */
  this.name = name

  /**
   * Message for this exception.
   * @type {string}
   */
  this.message = message

  /**
   * Description for this exception.
   * @type {string}
   */
  this.description = description
}

inherits(FaunaError, Error)

/**
 * Exception thrown by this client library when an invalid
 * value is provided as a function argument.
 *
 * @extends module:errors~FaunaError
 * @constructor
 */
export function InvalidValue(message) {
  FaunaError.call(this, 'InvalidValue', message)
}

inherits(InvalidValue, FaunaError)

/**
 * Exception thrown by this client library when an invalid
 * value is provided as a function argument.
 *
 * @extends module:errors~FaunaError
 * @constructor
 */
export function InvalidArity(min, max, actual, callerFunc) {
  var arityInfo = `${callerFunc} function requires ${messageForArity(
    min,
    max
  )} argument(s) but ${actual} were given`
  var documentationLink = logDocumentationLink(callerFunc)

  FaunaError.call(this, 'InvalidArity', `${arityInfo}\n${documentationLink}`)

  /**
   * Minimum number of arguments.
   * @type {number}
   */
  this.min = min

  /**
   * Maximum number of arguments.
   * @type {number}
   */
  this.max = max

  /**
   * Actual number of arguments called with.
   * @type {number}
   */
  this.actual = actual

  function messageForArity(min, max) {
    if (max === null) return 'at least ' + min
    if (min === null) return 'up to ' + max
    if (min === max) return min
    return 'from ' + min + ' to ' + max
  }

  function logDocumentationLink(functionName) {
    var docsURL = 'https://docs.fauna.com/fauna/current/api/fql/functions/'
    return `For more info, see the docs: ${docsURL}${functionName.toLowerCase()}`
  }
}

inherits(InvalidArity, FaunaError)

/**
 * Base exception type for errors returned by the FaunaDB server.
 *
 * @param {RequestResult} requestResult
 *
 * @extends module:errors~FaunaError
 * @constructor
 */
export function FaunaHTTPError(name, requestResult) {
  var response = requestResult.responseContent
  var errors = response.errors
  var message = errors.length === 0 ? '(empty "errors")' : errors[0].code
  var description =
    errors.length === 0 ? '(empty "errors")' : errors[0].description
  FaunaError.call(this, name, message, description)

  /**
   * A wrapped {@link RequestResult} object, containing the request and response
   * context of the failed request.
   *
   * @type {RequestResult}
   */
  this.requestResult = requestResult
}

inherits(FaunaHTTPError, FaunaError)

/**
 * Convenience method to return the errors from the response object.
 *
 * @returns {Object}
 */
FaunaHTTPError.prototype.errors = function() {
  return this.requestResult.responseContent.errors
}

/**
 * Takes a {@link RequestResult} and throws an appropriate exception if
 * it contains a failed request.
 *
 * @param requestResult {RequestResult}
 */
FaunaHTTPError.raiseForStatusCode = function(requestResult) {
  var code = requestResult.statusCode
  if (code < 200 || code >= 300) {
    switch (code) {
      case 400:
        throw new BadRequest(requestResult)
      case 401:
        throw new Unauthorized(requestResult)
      case 403:
        throw new PermissionDenied(requestResult)
      case 404:
        throw new NotFound(requestResult)
      case 405:
        throw new MethodNotAllowed(requestResult)
      case 429:
        throw new TooManyRequests(requestResult)
      case 500:
        throw new InternalError(requestResult)
      case 503:
        throw new UnavailableError(requestResult)
      default:
        throw new FaunaHTTPError('UnknownError', requestResult)
    }
  }
}

/**
 * A HTTP 400 error.
 *
 * @param {RequestResult} requestResult
 * @extends module:errors~FaunaHTTPError
 * @constructor
 */
export function BadRequest(requestResult) {
  FaunaHTTPError.call(this, 'BadRequest', requestResult)
}

inherits(BadRequest, FaunaHTTPError)

/**
 * A HTTP 401 error.
 * @param {RequestResult} requestResult
 * @extends module:errors~FaunaHTTPError
 * @constructor
 */
export function Unauthorized(requestResult) {
  FaunaHTTPError.call(this, 'Unauthorized', requestResult)
}

inherits(Unauthorized, FaunaHTTPError)

/**
 * A HTTP 403 error.
 * @param {RequestResult} requestResult
 * @extends module:errors~FaunaHTTPError
 * @constructor
 */
export function PermissionDenied(requestResult) {
  FaunaHTTPError.call(this, 'PermissionDenied', requestResult)
}

inherits(PermissionDenied, FaunaHTTPError)

/**
 * A HTTP 404 error.
 * @param {RequestResult} requestResult
 * @extends module:errors~FaunaHTTPError
 * @constructor
 */
export function NotFound(requestResult) {
  FaunaHTTPError.call(this, 'NotFound', requestResult)
}

inherits(NotFound, FaunaHTTPError)

/**
 * A HTTP 405 error.
 * @param {RequestResult} requestResult
 * @extends module:errors~FaunaHTTPError
 * @constructor
 */
export function MethodNotAllowed(requestResult) {
  FaunaHTTPError.call(this, 'MethodNotAllowed', requestResult)
}

inherits(MethodNotAllowed, FaunaHTTPError)

/**
 * A HTTP 429 error.
 * @param {RequestResult} requestResult
 * @extends module:errors~FaunaHTTPError
 * @constructor
 */
function TooManyRequests(requestResult) {
  FaunaHTTPError.call(this, 'TooManyRequests', requestResult)
}

inherits(TooManyRequests, FaunaHTTPError)

/**
 * A HTTP 500 error.
 * @param {RequestResult} requestResult
 * @extends module:errors~FaunaHTTPError
 * @constructor
 */
export function InternalError(requestResult) {
  FaunaHTTPError.call(this, 'InternalError', requestResult)
}

inherits(InternalError, FaunaHTTPError)

/**
 * A HTTP 503 error.
 * @param {RequestResult} requestResult
 * @extends module:errors~FaunaHTTPError
 * @constructor
 */
export function UnavailableError(requestResult) {
  FaunaHTTPError.call(this, 'UnavailableError', requestResult)
}

inherits(UnavailableError, FaunaHTTPError)

/**
 * The base exception type for all stream related errors.
 *
 * @constructor
 * @param {string} name The error class name.
 * @param {string} message The error message.
 * @param {string} description The error detailed description.
 * @extends module:errors~FaunaError
 */
export function StreamError(name, message, description) {
  FaunaError.call(this, name, message, description)
}

inherits(StreamError, FaunaError)

/**
 * An error thrown by the client when streams are not supported by the current
 * platform.
 *
 * @constructor
 * @param {string} description The error description.
 * @extends module:errors~StreamError
 */
export function StreamsNotSupported(description) {
  FaunaError.call(
    this,
    'StreamsNotSupported',
    'streams not supported',
    description
  )
}

inherits(StreamsNotSupported, StreamError)

/**
 * An Error thrown by the server when something wrong happened with the
 * subscribed stream.
 * @constructor
 * @param {Object} event The error event.
 * @property {Object} event The error event.
 * @extends module:errors~StreamError
 */
export function StreamErrorEvent(event) {
  var error = event.data || {}
  FaunaError.call(this, 'StreamErrorEvent', error.code, error.description)
  this.event = event
}

inherits(StreamErrorEvent, StreamError)

/**
 * Thrown by HttpClient when request hits specified timeout.
 *
 * @param {?string} message
 * @extends Error
 * @constructor
 */
export function TimeoutError(message) {
  Error.call(this)

  this.message = message || 'Request aborted due to timeout'
  this.isTimeoutError = true
}

inherits(TimeoutError, Error)

/**
 * Thrown by HttpClient when request is aborted via Signal interface.
 *
 * @param {?string} message
 * @extends Error
 * @constructor
 */
export function AbortError(message) {
  Error.call(this)

  this.message = message || 'Request aborted'
  this.isAbortError = true
}

inherits(AbortError, Error)
