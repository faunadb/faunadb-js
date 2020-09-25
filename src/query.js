'use strict'

var annotate = require('fn-annotate')
var deprecate = require('util-deprecate')
var Expr = require('./Expr')
var errors = require('./errors')
var values = require('./values')
var objectAssign = require('object-assign')
var util = require('./_util')

/**
 * This module contains functions used to construct FaunaDB Queries.
 *
 * See the [FaunaDB Query API Documentation](https://app.fauna.com/documentation/reference/queryapi)
 * for per-function documentation.
 *
 * @module query
 */

/**
 * @typedef {(Expr|string|number|boolean|Object)} module:query~ExprTerm
 */

/**
 * @typedef {(module:query~ExprTerm|Array<module:query~ExprTerm>)} module:query~ExprArg
 */

// Type helpers

/**
 * If one parameter is provided, constructs a literal Ref value.
 * The string `collections/widget/123` will be equivalent to `new values.Ref('123', new values.Ref('widget', values.Native.COLLECTIONS))`
 *
 * If two are provided, constructs a Ref() function that, when evaluated, returns a Ref value.
 *
 * @param {string|module:query~ExprArg} ref|cls
 *   Alone, the ref in path form. Combined with `id`, must be a collection ref.
 * @param {module:query~ExprArg} [id]
 *   A numeric id of the given collection.
 * @return {Expr}
 */
function Ref() {
  arity.between(1, 2, arguments, Ref.name)
  switch (arguments.length) {
    case 1:
      return new Expr({ '@ref': wrap(arguments[0]) })
    case 2:
      return new Expr({ ref: wrap(arguments[0]), id: wrap(arguments[1]) })
  }
}

/**
 * @param {Uint8Array|ArrayBuffer|module:query~ExprArg} bytes
 *   A base64 encoded string or a byte array
 * @return {Expr}
 */
function Bytes(bytes) {
  arity.exact(1, arguments, Bytes.name)
  return new values.Bytes(bytes)
}

// Basic forms

/**
 * See the [docs](https://app.fauna.com/documentation/reference/queryapi#basic-forms).
 *
 * @param {module:query~ExprArg} msg
 *   The message to send back to the client.
 * @return {Expr}
 * */
function Abort(msg) {
  arity.exact(1, arguments, Abort.name)
  return new Expr({ abort: wrap(msg) })
}

/**
 * See the [docs](https://app.fauna.com/documentation/reference/queryapi#basic-forms).
 *
 * @param {module:query~ExprArg} timestamp
 *   An Expr that will evaluate to a Time.
 * @param {module:query~ExprArg} expr
 *   The Expr to run at the given snapshot time.
 * @return {Expr}
 * */
function At(timestamp, expr) {
  arity.exact(2, arguments, At.name)
  return new Expr({ at: wrap(timestamp), expr: wrap(expr) })
}

/**
 * See the [docs](https://app.fauna.com/documentation/reference/queryapi#basic-forms).
 *
 * @param {module:query~ExprArg} bindings
 *   A set of bindings to use within the given expression.
 * @param {module:query~ExprArg} in
 *   The expression to run with the given bindings.
 * @return {Expr}
 * */
function Let(vars, expr) {
  arity.exact(2, arguments, Let.name)
  var bindings = []

  if (Array.isArray(vars)) {
    bindings = vars.map(function(item) {
      return wrapValues(item)
    })
  } else {
    bindings = Object.keys(vars).map(function(k) {
      var b = {}
      b[k] = wrap(vars[k])
      return b
    })
  }

  if (typeof expr === 'function') {
    if (Array.isArray(vars)) {
      var expr_vars = []

      vars.forEach(function(item) {
        Object.keys(item).forEach(function(name) {
          expr_vars.push(Var(name))
        })
      })

      expr = expr.apply(null, expr_vars)
    } else {
      expr = expr.apply(
        null,
        Object.keys(vars).map(function(name) {
          return Var(name)
        })
      )
    }
  }

  return new Expr({ let: bindings, in: wrap(expr) })
}

/**
 * See the [docs](https://app.fauna.com/documentation/reference/queryapi#basic-forms).
 *
 * @param {module:query~ExprArg} varName
 *   The name of the bound var.
 * @return {Expr}
 * */
function Var(varName) {
  arity.exact(1, arguments, Var.name)
  return new Expr({ var: wrap(varName) })
}

/**
 * See the [docs](https://app.fauna.com/documentation/reference/queryapi#basic-forms).
 *
 * @param {module:query~ExprArg} condition
 *   An expression that returns a boolean.
 * @param {module:query~ExprArg} then
 *   The expression to run if condition is true.
 * @param {module:query~ExprArg} else
 *   The expression to run if the condition is false.
 * @return {Expr}
 * */
function If(condition, then, _else) {
  arity.exact(3, arguments, If.name)
  return new Expr({ if: wrap(condition), then: wrap(then), else: wrap(_else) })
}

/**
 * See the [docs](https://app.fauna.com/documentation/reference/queryapi#basic-forms).
 *
 * @param {...module:query~ExprArg} args
 *   A series of expressions to run.
 * @return {Expr}
 * */
function Do() {
  arity.min(1, arguments, Do.name)
  var args = argsToArray(arguments)
  return new Expr({ do: wrap(args) })
}

/** See the [docs](https://app.fauna.com/documentation/reference/queryapi#basic-forms).
 *
 * @param {...module:query~ExprArg} fields
 *   The object to be escaped.
 * @return {Expr}
 * */
var objectFunction = function(fields) {
  arity.exact(1, arguments, objectFunction.name)
  return new Expr({ object: wrapValues(fields) })
}
/**
 * See the [docs](https://app.fauna.com/documentation/reference/queryapi#basic-forms).
 *
 * Directly produces a FaunaDB Lambda expression as described in the FaunaDB reference
 * documentation.
 *
 * @param {module:query~ExprArg} var
 *   The names of the variables to be bound in this lambda expression.
 * @param {module:query~ExprArg} expr
 *   The lambda expression.
 * @return {Expr}
 */

/**
 * See the [docs](https://app.fauna.com/documentation/reference/queryapi#basic-forms).
 *
 * Takes a Javascript function, and will transform it
 * into the appropriate FaunaDB query. For example:
 *
 * ```
 * Lambda(function(a) { return Add(a, a); });
 * // Returns { lambda: 'a', expr: { add: [{ var: a }, { var: a }] } }
 * ```
 * Note that the driver will handle wrapping all usages of the lambda's bound
 * variables with the {@link modules:query~Var} function.
 *
 * @param {function} func
 *   Takes the provided function and produces the appropriate FaunaDB query expression.
 * @return {Expr}
 *
 */ function Lambda() {
  arity.between(1, 2, arguments, Lambda.name)
  switch (arguments.length) {
    case 1:
      var value = arguments[0]
      if (typeof value === 'function') {
        return _lambdaFunc(value)
      } else if (
        value instanceof Expr ||
        util.checkInstanceHasProperty(value, '_isFaunaExpr')
      ) {
        return value
      } else {
        throw new errors.InvalidValue(
          'Lambda function takes either a Function or an Expr.'
        )
      }
    case 2:
      var var_name = arguments[0]
      var expr = arguments[1]

      return _lambdaExpr(var_name, expr)
  }
}

/**
 * @private
 */
function _lambdaFunc(func) {
  var vars = annotate(func)
  switch (vars.length) {
    case 0:
      throw new errors.InvalidValue(
        'Provided Function must take at least 1 argument.'
      )
    case 1:
      return _lambdaExpr(vars[0], func(Var(vars[0])))
    default:
      return _lambdaExpr(
        vars,
        func.apply(
          null,
          vars.map(function(name) {
            return Var(name)
          })
        )
      )
  }
}

/**
 * @private
 */
function _lambdaExpr(var_name, expr) {
  return new Expr({ lambda: wrap(var_name), expr: wrap(expr) })
}

/**
 * See the [docs](https://app.fauna.com/documentation/reference/queryapi#basic-forms).
 *
 * Invokes a given function passing in the provided arguments
 *
 * ```
 * Call(Ref("functions/a_function"), 1, 2)
 * ```
 *
 * @param {module:query~ExprArg} ref
 *   The ref of the UserDefinedFunction to call
 * @param {...module:query~ExprArg} args
 *   A series of values to pass as arguments to the UDF.
 * @return {Expr}
 * */
function Call(ref) {
  arity.min(1, arguments, Call.name)
  var args = argsToArray(arguments)
  args.shift()
  return new Expr({ call: wrap(ref), arguments: wrap(varargs(args)) })
}

/**
 * See the [docs](https://app.fauna.com/documentation/reference/queryapi#basic-forms).
 *
 * Constructs a `@query` type using the Lambda() or a function.
 *
 * ```
 * Query(Lambda(['a', 'b'], Add(Var('a'), Var('b'))))
 * Query(function (a, b) { return Add(a, b) })
 * ```
 *
 * @param {module:query~ExprArg|function} lambda
 *   A function to escape as a query.
 * @return {Expr}
 * */
function Query(lambda) {
  arity.exact(1, arguments, Query.name)
  return new Expr({ query: wrap(lambda) })
}

// Collection functions

/** See the [docs](https://app.fauna.com/documentation/reference/queryapi#collections).
 *
 * @param {module:query~ExprArg} collection
 *   An expression resulting in a collection to be mapped over.
 * @param {module:query~ExprArg|function} lambda
 *   A function to be called for each element of the collection.
 * @return {Expr}
 * */
function Map(collection, lambda_expr) {
  arity.exact(2, arguments, Map.name)
  return new Expr({ map: wrap(lambda_expr), collection: wrap(collection) })
}

/**
 * See the [docs](https://app.fauna.com/documentation/reference/queryapi#collections).
 *
 * @param {module:query~ExprArg} collection
 *   An expression resulting in a collection to be iterated over.
 * @param {module:query~ExprArg|function} lambda
 *   A function to be called for each element of the collection.
 * @return {Expr}
 * */
function Foreach(collection, lambda_expr) {
  arity.exact(2, arguments, Foreach.name)
  return new Expr({ foreach: wrap(lambda_expr), collection: wrap(collection) })
}

/**
 * See the [docs](https://app.fauna.com/documentation/reference/queryapi#collections).
 *
 * @param {module:query~ExprArg} collection
 *   An expression resulting in a collection to be filtered.
 * @param {module:query~ExprArg|function} lambda
 *   A function that returns a boolean used to filter unwanted values.
 * @return {Expr}
 * */
function Filter(collection, lambda_expr) {
  arity.exact(2, arguments, Filter.name)
  return new Expr({ filter: wrap(lambda_expr), collection: wrap(collection) })
}

/**
 * See the [docs](https://app.fauna.com/documentation/reference/queryapi#collections).
 *
 * @param {module:query~ExprArg} number
 *   An expression resulting in the number of elements to take from the collection.
 * @param {module:query~ExprArg} collection
 *   An expression resulting in a collection.
 * @return {Expr}
 * */
function Take(number, collection) {
  arity.exact(2, arguments, Take.name)
  return new Expr({ take: wrap(number), collection: wrap(collection) })
}

/**
 * See the [docs](https://app.fauna.com/documentation/reference/queryapi#collections).
 *
 * @param {module:query~ExprArg} number
 *   An expression resulting in the number of elements to drop from the collection.
 * @param {module:query~ExprArg} collection
 *   An expression resulting in a collection.
 * @return {Expr}
 * */
function Drop(number, collection) {
  arity.exact(2, arguments, Drop.name)
  return new Expr({ drop: wrap(number), collection: wrap(collection) })
}

/**
 * See the [docs](https://app.fauna.com/documentation/reference/queryapi#collections).
 *
 * @param {module:query~ExprArg} elements
 *   An expression resulting in a collection of elements to prepend to the given collection.
 * @param {module:query~ExprArg} collection
 *   An expression resulting in a collection.
 * @return {Expr}
 */
function Prepend(elements, collection) {
  arity.exact(2, arguments, Prepend.name)
  return new Expr({ prepend: wrap(elements), collection: wrap(collection) })
}

/**
 * See the [docs](https://app.fauna.com/documentation/reference/queryapi#collections).
 *
 * @param {module:query~ExprArg} elements
 *   An expression resulting in a collection of elements to append to the given collection.
 * @param {module:query~ExprArg} collection
 *   An expression resulting in a collection.
 * @return {Expr}
 */
function Append(elements, collection) {
  arity.exact(2, arguments, Append.name)
  return new Expr({ append: wrap(elements), collection: wrap(collection) })
}

/**
 * See the [docs](https://app.fauna.com/documentation/reference/queryapi#collections).
 *
 * @param {module:query~ExprArg} collection
 *   An expression resulting in a collection.
 * @return {Expr}
 */
function IsEmpty(collection) {
  arity.exact(1, arguments, IsEmpty.name)
  return new Expr({ is_empty: wrap(collection) })
}

/**
 * See the [docs](https://app.fauna.com/documentation/reference/queryapi#collections).
 *
 * @param {module:query~ExprArg} collection
 *   An expression resulting in a collection.
 * @return {Expr}
 */
function IsNonEmpty(collection) {
  arity.exact(1, arguments, IsNonEmpty.name)
  return new Expr({ is_nonempty: wrap(collection) })
}

// Type check functions

/**
 * Check if the expression is a number.
 *
 * @param {module:query~ExprArg} expr
 *   The expression to check
 * @return {Expr}
 * @see <a href="https://docs.fauna.com/fauna/current/api/fql/functions/isnumber">IsNumber</a>
 */
function IsNumber(expr) {
  arity.exact(1, arguments, IsNumber.name)
  return new Expr({ is_number: wrap(expr) })
}

/**
 * Check if the expression is a double.
 *
 * @param {module:query~ExprArg} expr
 *   The expression to check
 * @return {Expr}
 * @see <a href="https://docs.fauna.com/fauna/current/api/fql/functions/isdouble">IsDouble</a>
 */
function IsDouble(expr) {
  arity.exact(1, arguments, IsDouble.name)
  return new Expr({ is_double: wrap(expr) })
}

/**
 * Check if the expression is an integer.
 *
 * @param {module:query~ExprArg} expr
 *   The expression to check
 * @return {Expr}
 * @see <a href="https://docs.fauna.com/fauna/current/api/fql/functions/isinteger">IsInteger</a>
 */
function IsInteger(expr) {
  arity.exact(1, arguments, IsInteger.name)
  return new Expr({ is_integer: wrap(expr) })
}

/**
 * Check if the expression is a boolean.
 *
 * @param {module:query~ExprArg} expr
 *   The expression to check
 * @return {Expr}
 * @see <a href="https://docs.fauna.com/fauna/current/api/fql/functions/isboolean">IsBoolean</a>
 */
function IsBoolean(expr) {
  arity.exact(1, arguments, IsBoolean.name)
  return new Expr({ is_boolean: wrap(expr) })
}

/**
 * Check if the expression is null.
 *
 * @param {module:query~ExprArg} expr
 *   The expression to check
 * @return {Expr}
 * @see <a href="https://docs.fauna.com/fauna/current/api/fql/functions/isnull">IsNull</a>
 */
function IsNull(expr) {
  arity.exact(1, arguments, IsNull.name)
  return new Expr({ is_null: wrap(expr) })
}

/**
 * Check if the expression is a byte array.
 *
 * @param {module:query~ExprArg} expr
 *   The expression to check
 * @return {Expr}
 * @see <a href="https://docs.fauna.com/fauna/current/api/fql/functions/isbytes">IsBytes</a>
 */
function IsBytes(expr) {
  arity.exact(1, arguments, IsBytes.name)
  return new Expr({ is_bytes: wrap(expr) })
}

/**
 * Check if the expression is a timestamp.
 *
 * @param {module:query~ExprArg} expr
 *   The expression to check
 * @return {Expr}
 * @see <a href="https://docs.fauna.com/fauna/current/api/fql/functions/istimestamp">IsTimestamp</a>
 */
function IsTimestamp(expr) {
  arity.exact(1, arguments, IsTimestamp.name)
  return new Expr({ is_timestamp: wrap(expr) })
}

/**
 * Check if the expression is a date.
 *
 * @param {module:query~ExprArg} expr
 *   The expression to check
 * @return {Expr}
 * @see <a href="https://docs.fauna.com/fauna/current/api/fql/functions/isdate">IsDate</a>
 */
function IsDate(expr) {
  arity.exact(1, arguments, IsDate.name)
  return new Expr({ is_date: wrap(expr) })
}

/**
 * Check if the expression is a string.
 *
 * @param {module:query~ExprArg} expr
 *   The expression to check
 * @return {Expr}
 * @see <a href="https://docs.fauna.com/fauna/current/api/fql/functions/isstring">IsString</a>
 */
function IsString(expr) {
  arity.exact(1, arguments, IsString.name)
  return new Expr({ is_string: wrap(expr) })
}

/**
 * Check if the expression is an array.
 *
 * @param {module:query~ExprArg} expr
 *   The expression to check
 * @return {Expr}
 * @see <a href="https://docs.fauna.com/fauna/current/api/fql/functions/isarray">IsArray</a>
 */
function IsArray(expr) {
  arity.exact(1, arguments, IsArray.name)
  return new Expr({ is_array: wrap(expr) })
}

/**
 * Check if the expression is an object.
 *
 * @param {module:query~ExprArg} expr
 *   The expression to check
 * @return {Expr}
 * @see <a href="https://docs.fauna.com/fauna/current/api/fql/functions/isobject">IsObject</a>
 */
function IsObject(expr) {
  arity.exact(1, arguments, IsObject.name)
  return new Expr({ is_object: wrap(expr) })
}

/**
 * Check if the expression is a reference.
 *
 * @param {module:query~ExprArg} expr
 *   The expression to check
 * @return {Expr}
 * @see <a href="https://docs.fauna.com/fauna/current/api/fql/functions/isref">IsRef</a>
 */
function IsRef(expr) {
  arity.exact(1, arguments, IsRef.name)
  return new Expr({ is_ref: wrap(expr) })
}

/**
 * Check if the expression is a set.
 *
 * @param {module:query~ExprArg} expr
 *   The expression to check
 * @return {Expr}
 * @see <a href="https://docs.fauna.com/fauna/current/api/fql/functions/isset">IsSet</a>
 */
function IsSet(expr) {
  arity.exact(1, arguments, IsSet.name)
  return new Expr({ is_set: wrap(expr) })
}

/**
 * Check if the expression is a document (either a reference or an instance).
 *
 * @param {module:query~ExprArg} expr
 *   The expression to check
 * @return {Expr}
 * @see <a href="https://docs.fauna.com/fauna/current/api/fql/functions/isdoc">IsDoc</a>
 */
function IsDoc(expr) {
  arity.exact(1, arguments, IsDoc.name)
  return new Expr({ is_doc: wrap(expr) })
}

/**
 * Check if the expression is a lambda.
 *
 * @param {module:query~ExprArg} expr
 *   The expression to check
 * @return {Expr}
 * @see <a href="https://docs.fauna.com/fauna/current/api/fql/functions/islambda">IsLambda</a>
 */
function IsLambda(expr) {
  arity.exact(1, arguments, IsLambda.name)
  return new Expr({ is_lambda: wrap(expr) })
}

/**
 * Check if the expression is a collection.
 *
 * @param {module:query~ExprArg} expr
 *   The expression to check
 * @return {Expr}
 * @see <a href="https://docs.fauna.com/fauna/current/api/fql/functions/iscollection">IsCollection</a>
 */
function IsCollection(expr) {
  arity.exact(1, arguments, IsCollection.name)
  return new Expr({ is_collection: wrap(expr) })
}

/**
 * Check if the expression is a database.
 *
 * @param {module:query~ExprArg} expr
 *   The expression to check
 * @return {Expr}
 * @see <a href="https://docs.fauna.com/fauna/current/api/fql/functions/isdatabase">IsDatabase</a>
 */
function IsDatabase(expr) {
  arity.exact(1, arguments, IsDatabase.name)
  return new Expr({ is_database: wrap(expr) })
}

/**
 * Check if the expression is an index.
 *
 * @param {module:query~ExprArg} expr
 *   The expression to check
 * @return {Expr}
 * @see <a href="https://docs.fauna.com/fauna/current/api/fql/functions/isindex">IsIndex</a>
 */
function IsIndex(expr) {
  arity.exact(1, arguments, IsIndex.name)
  return new Expr({ is_index: wrap(expr) })
}

/**
 * Check if the expression is a function.
 *
 * @param {module:query~ExprArg} expr
 *   The expression to check
 * @return {Expr}
 * @see <a href="https://docs.fauna.com/fauna/current/api/fql/functions/isfunction">IsFunction</a>
 */
function IsFunction(expr) {
  arity.exact(1, arguments, IsFunction.name)
  return new Expr({ is_function: wrap(expr) })
}

/**
 * Check if the expression is a key.
 *
 * @param {module:query~ExprArg} expr
 *   The expression to check
 * @return {Expr}
 * @see <a href="https://docs.fauna.com/fauna/current/api/fql/functions/iskey">IsKey</a>
 */
function IsKey(expr) {
  arity.exact(1, arguments, IsKey.name)
  return new Expr({ is_key: wrap(expr) })
}

/**
 * Check if the expression is a token.
 *
 * @param {module:query~ExprArg} expr
 *   The expression to check
 * @return {Expr}
 * @see <a href="https://docs.fauna.com/fauna/current/api/fql/functions/istoken">IsToken</a>
 */
function IsToken(expr) {
  arity.exact(1, arguments, IsToken.name)
  return new Expr({ is_token: wrap(expr) })
}

/**
 * Check if the expression is credentials.
 *
 * @param {module:query~ExprArg} expr
 *   The expression to check
 * @return {Expr}
 * @see <a href="https://docs.fauna.com/fauna/current/api/fql/functions/iscredentials">IsCredentials</a>
 */
function IsCredentials(expr) {
  arity.exact(1, arguments, IsCredentials.name)
  return new Expr({ is_credentials: wrap(expr) })
}

/**
 * Check if the expression is a role.
 *
 * @param {module:query~ExprArg} expr
 *   The expression to check
 * @return {Expr}
 * @see <a href="https://docs.fauna.com/fauna/current/api/fql/functions/isrole">IsRole</a>
 */
function IsRole(expr) {
  arity.exact(1, arguments, IsRole.name)
  return new Expr({ is_role: wrap(expr) })
}

// Read functions

/**
 * See the [docs](https://app.fauna.com/documentation/reference/queryapi#read-functions).
 *
 * @param {module:query~ExprArg} ref
 *   An expression resulting in either a Ref or SetRef.
 * @param {?module:query~ExprArg} ts
 *   The snapshot time at which to get the document.
 * @return {Expr}
 */
function Get(ref, ts) {
  arity.between(1, 2, arguments, Get.name)
  ts = defaults(ts, null)

  return new Expr(params({ get: wrap(ref) }, { ts: wrap(ts) }))
}

/**
 * See the [docs](https://app.fauna.com/documentation/reference/queryapi#read-functions).
 *
 * @param {module:query~ExprArg} secret
 *   The key or token secret to lookup.
 * @return {Expr}
 */
function KeyFromSecret(secret) {
  arity.exact(1, arguments, KeyFromSecret.name)
  return new Expr({ key_from_secret: wrap(secret) })
}

/**
 * See the [docs](https://docs.fauna.com/fauna/current/api/fql/functions/reduce).
 *
 * @param {module:query~ExprArg} lambda
 *   The accumulator function
 * @param {module:query~ExprArg} initial
 *   The initial value
 * @param {module:query~ExprArg} collection
 *   The colleciton to be reduced
 * @return {Expr}
 */
function Reduce(lambda, initial, collection) {
  arity.exact(3, arguments, Reduce.name)
  return new Expr({
    reduce: wrap(lambda),
    initial: wrap(initial),
    collection: wrap(collection),
  })
}

/**
 * See the [docs](https://app.fauna.com/documentation/reference/queryapi#read-functions).
 * You may want to utilize {@link Client#paginate} to obtain a {@link PageHelper},
 * rather than using this query function directly.
 *
 * @param {module:query~ExprArg} set
 *   An expression resulting in a SetRef to page over.
 * @param {?Object} opts
 *  An object representing options for pagination.
 *    - size: Maximum number of results to return.
 *    - after: Return the next page of results after this cursor (inclusive).
 *    - before: Return the previous page of results before this cursor (exclusive).
 *    - sources: If true, include the source sets along with each element.
 * @return {Expr}
 */
function Paginate(set, opts) {
  arity.between(1, 2, arguments, Paginate.name)
  opts = defaults(opts, {})

  return new Expr(objectAssign({ paginate: wrap(set) }, wrapValues(opts)))
}

/**
 * See the [docs](https://app.fauna.com/documentation/reference/queryapi#read-functions).
 *
 * @param {module:query~ExprArg} ref
 *   An expression resulting in a Ref.
 * @param {?module:query~ExprArg} ts
 *   The snapshot time at which to check for the document's existence.
 * @return {Expr}
 */
function Exists(ref, ts) {
  arity.between(1, 2, arguments, Exists.name)
  ts = defaults(ts, null)

  return new Expr(params({ exists: wrap(ref) }, { ts: wrap(ts) }))
}

// Write functions

/**
 * See the [docs](https://app.fauna.com/documentation/reference/queryapi#write-functions).
 *
 * @param {module:query~ExprArg} ref
 *   The Ref (usually a CollectionRef) to create.
 * @param {?module:query~ExprArg} params
 *   An object representing the parameters of the document.
 * @return {Expr}
 */
function Create(collection_ref, params) {
  arity.between(1, 2, arguments, Create.name)
  return new Expr({ create: wrap(collection_ref), params: wrap(params) })
}

/**
 * See the [docs](https://app.fauna.com/documentation/reference/queryapi#write-functions).
 *
 * @param {module:query~ExprArg} ref
 *   The Ref to update.
 * @param {module:query~ExprArg} params
 *   An object representing the parameters of the document.
 * @return {Expr}
 */
function Update(ref, params) {
  arity.exact(2, arguments, Update.name)
  return new Expr({ update: wrap(ref), params: wrap(params) })
}

/**
 * See the [docs](https://app.fauna.com/documentation/reference/queryapi#write-functions).
 *
 * @param {module:query~ExprArg} ref
 *   The Ref to replace.
 * @param {module:query~ExprArg} params
 *   An object representing the parameters of the document.
 * @return {Expr}
 */
function Replace(ref, params) {
  arity.exact(2, arguments, Replace.name)
  return new Expr({ replace: wrap(ref), params: wrap(params) })
}

/**
 * See the [docs](https://app.fauna.com/documentation/reference/queryapi#write-functions).
 *
 * @param {module:query~ExprArg} ref
 *   The Ref to delete.
 * @return {Expr}
 */
function Delete(ref) {
  arity.exact(1, arguments, Delete.name)
  return new Expr({ delete: wrap(ref) })
}

/**
 * See the [docs](https://app.fauna.com/documentation/reference/queryapi#write-functions).
 *
 * @param {module:query~ExprArg} ref
 *   The Ref to insert against
 * @param {module:query~ExprArg} ts
 *   The valid time of the inserted event
 * @param {module:query~ExprArg} action
 *   Whether the event should be a Create, Update, or Delete.
 * @param {module:query~ExprArg} params
 *   If this is a Create or Update, the parameters of the document.
 * @return {Expr}
 */
function Insert(ref, ts, action, params) {
  arity.exact(4, arguments, Insert.name)
  return new Expr({
    insert: wrap(ref),
    ts: wrap(ts),
    action: wrap(action),
    params: wrap(params),
  })
}

/**
 * See the [docs](https://app.fauna.com/documentation/reference/queryapi#write-functions).
 *
 * @param {module:query~ExprArg} ref
 *   The Ref of the document whose event should be removed.
 * @param {module:query~ExprArg} ts
 *   The valid time of the event.
 * @param {module:query~ExprArg} action
 *   The event action (Create, Update, or Delete) that should be removed.
 * @return {Expr}
 */
function Remove(ref, ts, action) {
  arity.exact(3, arguments, Remove.name)
  return new Expr({ remove: wrap(ref), ts: wrap(ts), action: wrap(action) })
}

/**
 * See the [docs](https://app.fauna.com/documentation/reference/queryapi#write-functions).
 *
 * @param {module:query~ExprArg} params
 *   An object of parameters used to create a class.
 *     - name (required): the name of the class to create
 * @return {Expr}
 *
 * @deprecated use CreateCollection instead
 */
function CreateClass(params) {
  arity.exact(1, arguments, CreateClass.name)
  return new Expr({ create_class: wrap(params) })
}

/**
 * See the [docs](https://app.fauna.com/documentation/reference/queryapi#write-functions).
 *
 * @param {module:query~ExprArg} params
 *   An object of parameters used to create a collection.
 *     - name (required): the name of the collection to create
 * @return {Expr}
 */
function CreateCollection(params) {
  arity.exact(1, arguments, CreateCollection.name)
  return new Expr({ create_collection: wrap(params) })
}

/**
 * See the [docs](https://app.fauna.com/documentation/reference/queryapi#write-functions).
 *
 * @param {module:query~ExprArg} params
 *   An object of parameters used to create a database.
 *     - name (required): the name of the database to create
 * @return {Expr}
 */
function CreateDatabase(params) {
  arity.exact(1, arguments, CreateDatabase.name)
  return new Expr({ create_database: wrap(params) })
}

/**
 * See the [docs](https://app.fauna.com/documentation/reference/queryapi#write-functions).
 *
 * @param {module:query~ExprArg} params
 *   An object of parameters used to create an index.
 *     - name (required): the name of the index to create
 *     - source: One or more source objects describing source collections and (optional) field bindings.
 *     - terms: An array of term objects describing the fields to be indexed. Optional
 *     - values: An array of value objects describing the fields to be covered. Optional
 *     - unique: If true, maintains a uniqueness constraint on combined terms and values. Optional
 *     - partitions: The number of sub-partitions within each term. Optional
 * @return {Expr}
 */
function CreateIndex(params) {
  arity.exact(1, arguments, CreateIndex.name)
  return new Expr({ create_index: wrap(params) })
}

/**
 * See the [docs](https://app.fauna.com/documentation/reference/queryapi#write-functions).
 *
 * @param {module:query~ExprArg} params
 *   An object of parameters used to create a new key
 *     - database: Ref of the database the key will be scoped to. Optional.
 *     - role: The role of the new key
 * @return {Expr}
 */
function CreateKey(params) {
  arity.exact(1, arguments, CreateKey.name)
  return new Expr({ create_key: wrap(params) })
}

/**
 * See the [docs](https://app.fauna.com/documentation/reference/queryapi#write-functions).
 *
 * @param {module:query~ExprArg} params
 *   An object of parameters used to create a new user defined function.
 *     - name: The name of the function
 *     - body: A lambda function (escaped with `query`).
 * @return {Expr}
 */
function CreateFunction(params) {
  arity.exact(1, arguments, CreateFunction.name)
  return new Expr({ create_function: wrap(params) })
}

/**
 * See the [docs](https://app.fauna.com/documentation/reference/queryapi#write-functions).
 *
 * @param {module:query~ExprArg} params
 *   An object of parameters used to create a new role.
 *     - name: The name of the role
 *     - privileges: An array of privileges
 *     - membership: An array of membership bindings
 * @return {Expr}
 */
function CreateRole(params) {
  arity.exact(1, arguments, CreateRole.name)
  return new Expr({ create_role: wrap(params) })
}

/**
 * See the [docs](https://app.fauna.com/documentation/reference/queryapi#write-functions).
 *
 * @param {module:query~ExprArg} params
 *   An object of parameters used to create a new access provider.
 *     - name: A valid schema name
 *     - issuer: A unique string
 *     - jwks_uri: A valid HTTPS URI
 *     - allowed_roles: An optional list of Role refs
 *     - allowed_collections: An optional list of user-defined Collection refs
 * @return {Expr}
 */
function CreateAccessProvider(params) {
  arity.exact(1, arguments, CreateAccessProvider.name)
  return new Expr({ create_access_provider: wrap(params) })
}

// Sets

/**
 * See the [docs](https://app.fauna.com/documentation/reference/queryapi#sets).
 *
 * @param {module:query~ExprArg} ref
 *   The Ref of the document for which to retrieve the singleton set.
 * @return {Expr}
 */
function Singleton(ref) {
  arity.exact(1, arguments, Singleton.name)
  return new Expr({ singleton: wrap(ref) })
}

/**
 * See the [docs](https://app.fauna.com/documentation/reference/queryapi#sets).
 *
 * @param {module:query~ExprArg} ref
 *   A Ref or SetRef to retrieve an event set from.
 * @return {Expr}
 */
function Events(ref_set) {
  arity.exact(1, arguments, Events.name)
  return new Expr({ events: wrap(ref_set) })
}

/**
 * See the [docs](https://app.fauna.com/documentation/reference/queryapi#sets).
 *
 * @param {module:query~ExprArg} index
 *   The Ref of the index to match against.
 * @param {...module:query~ExprArg} terms
 *   A list of terms used in the match.
 * @return {Expr}
 */
function Match(index) {
  arity.min(1, arguments, Match.name)
  var args = argsToArray(arguments)
  args.shift()
  return new Expr({ match: wrap(index), terms: wrap(varargs(args)) })
}

/**
 * See the [docs](https://app.fauna.com/documentation/reference/queryapi#sets).
 *
 * @param {...module:query~ExprArg} sets
 *   A list of SetRefs to union together.
 * @return {Expr}
 */
function Union() {
  arity.min(1, arguments, Union.name)
  return new Expr({ union: wrap(varargs(arguments)) })
}

/**
 * Merge two or more objects..
 *
 * @param {...module:query~ExprArg} merge merge the first object.
 * @param {...module:query~ExprArg} _with the second object or a list of objects
 * @param {...module:query~ExprArg} lambda a lambda to resolve possible conflicts
 * @return {Expr}
 * */
function Merge(merge, _with, lambda) {
  arity.between(2, 3, arguments, Merge.name)
  return new Expr(
    params({ merge: wrap(merge), with: wrap(_with) }, { lambda: wrap(lambda) })
  )
}

/**
 * See the [docs](https://app.fauna.com/documentation/reference/queryapi#sets).
 *
 * @param {...module:query~ExprArg} sets
 *   A list of SetRefs to intersect.
 * @return {Expr}
 * */
function Intersection() {
  arity.min(1, arguments, Intersection.name)
  return new Expr({ intersection: wrap(varargs(arguments)) })
}

/**
 * See the [docs](https://app.fauna.com/documentation/reference/queryapi#sets).
 *
 * @param {...module:query~ExprArg} sets
 *   A list of SetRefs to diff.
 * @return {Expr}
 * */
function Difference() {
  arity.min(1, arguments, Difference.name)
  return new Expr({ difference: wrap(varargs(arguments)) })
}

/**
 * See the [docs](https://app.fauna.com/documentation/reference/queryapi#sets).
 *
 * @param {module:query~ExprArg} set
 *   A SetRef to remove duplicates from.
 * @return {Expr}
 * */
function Distinct(set) {
  arity.exact(1, arguments, Distinct.name)
  return new Expr({ distinct: wrap(set) })
}

/**
 * See the [docs](https://app.fauna.com/documentation/reference/queryapi#sets).
 *
 * @param {module:query~ExprArg} source
 *   A SetRef of the source set
 * @param {module:query~ExprArg|function} target
 *   A Lambda that will accept each element of the source Set and return a Set
 * @return {Expr}
 */
function Join(source, target) {
  arity.exact(2, arguments, Join.name)
  return new Expr({ join: wrap(source), with: wrap(target) })
}

/**
 * See the [docs](https://docs.fauna.com/fauna/current/api/fql/functions/range).
 *
 * @param {module:query~ExprArg} set
 *   A SetRef of the source set
 * @param {module:query~ExprArg} from
 *   The lower bound
 * @param {module:query~ExprArg} to
 *   The upper bound
 * @return {Expr}
 */
function Range(set, from, to) {
  arity.exact(3, arguments, Range.name)
  return new Expr({ range: wrap(set), from: wrap(from), to: wrap(to) })
}

// Authentication

/**
 * See the [docs](https://app.fauna.com/documentation/reference/queryapi#authentication).
 *
 * @param {module:query~ExprArg} ref
 *   A Ref with credentials to authenticate against
 * @param {module:query~ExprArg} params
 *   An object of parameters to pass to the login function
 *     - password: The password used to login
 * @return {Expr}
 * */
function Login(ref, params) {
  arity.exact(2, arguments, Login.name)
  return new Expr({ login: wrap(ref), params: wrap(params) })
}

/**
 * See the [docs](https://app.fauna.com/documentation/reference/queryapi#authentication).
 *
 * @param {module:query~ExprArg} delete_tokens
 *   If true, log out all tokens associated with the current session.
 * @return {Expr}
 */
function Logout(delete_tokens) {
  arity.exact(1, arguments, Logout.name)
  return new Expr({ logout: wrap(delete_tokens) })
}

/**
 * See the [docs](https://app.fauna.com/documentation/reference/queryapi#authentication).
 *
 * @param {module:query~ExprArg} ref
 *   The Ref to check the password against.
 * @param {module:query~ExprArg} password
 *   The credentials password to check.
 * @return {Expr}
 */
function Identify(ref, password) {
  arity.exact(2, arguments, Identify.name)
  return new Expr({ identify: wrap(ref), password: wrap(password) })
}

/**
 * See the [docs](https://app.fauna.com/documentation/reference/queryapi#authentication).
 *
 * @return {Expr}
 */
function Identity() {
  arity.exact(0, arguments, Identity.name)
  return new Expr({ identity: null })
}

/**
 * See the [docs](https://app.fauna.com/documentation/reference/queryapi#authentication).
 *
 * @return {Expr}
 */
function HasIdentity() {
  arity.exact(0, arguments, HasIdentity.name)
  return new Expr({ has_identity: null })
}

// String functions

/**
 * See the [docs](https://app.fauna.com/documentation/reference/queryapi#string-functions).
 *
 * @param {string} strings - A list of strings to concatenate.
 * @param {string} separator  - The separator to use between each string.
 * @return {string} a single combined string
 */
function Concat(strings, separator) {
  arity.min(1, arguments, Concat.name)
  separator = defaults(separator, null)
  return new Expr(
    params({ concat: wrap(strings) }, { separator: wrap(separator) })
  )
}

/**
 * See the [docs](https://app.fauna.com/documentation/reference/queryapi#string-functions).
 *
 * @param {string} string - The string to casefold.
 * @param {string} normalizer - The algorithm to use. One of: NFKCCaseFold, NFC, NFD, NFKC, NFKD.
 * @return {string} a normalized string
 */
function Casefold(string, normalizer) {
  arity.min(1, arguments, Casefold.name)
  return new Expr(
    params({ casefold: wrap(string) }, { normalizer: wrap(normalizer) })
  )
}

/**
 * Returns true if the string contains the given substring, or false if otherwise
 *
 * @param {string} value  - the string to evaluate
 * @param {string} search - the substring to search for
 * @return {boolean}      - was the search result found
 * @see <a href="https://docs.fauna.com/fauna/current/api/fql/functions/containsstr">FaunaDB ContainsStr Function</a>
 */
function ContainsStr(value, search) {
  arity.exact(2, arguments, ContainsStr.name)
  return new Expr({ contains_str: wrap(value), search: wrap(search) })
}

/**
 * Returns true if the string contains the given pattern, or false if otherwise
 *
 * @param {string} value   - the string to evaluate
 * @param {string} pattern - the pattern to search for
 * @return {boolean}       - was the regex search result found
 * @see <a href="https://docs.fauna.com/fauna/current/api/fql/functions/containsstrregex">FaunaDB ContainsStrRegex Function</a>
 */
function ContainsStrRegex(value, pattern) {
  arity.exact(2, arguments, ContainsStrRegex.name)
  return new Expr({ contains_str_regex: wrap(value), pattern: wrap(pattern) })
}

/**
 * Returns true if the string starts with the given prefix value, or false if otherwise
 *
 * @param {string} value   - the string to evaluate
 * @param {string} search  - the prefix to search for
 * @return {boolean}       - does `value` start with `search`
 * @see <a href="https://docs.fauna.com/fauna/current/api/fql/functions/startswith">FaunaDB StartsWith Function</a>
 */
function StartsWith(value, search) {
  arity.exact(2, arguments, StartsWith.name)
  return new Expr({ starts_with: wrap(value), search: wrap(search) })
}

/**
 * Returns true if the string ends with the given suffix value, or false if otherwise
 *
 * @param {string} value   - the string to evaluate
 * @param {string} search  - the suffix to search for
 * @return {boolean}       - does `value` end with `search`
 * @see <a href="https://docs.fauna.com/fauna/current/api/fql/functions/endswith">FaunaDB EndsWith Function</a>
 */
function EndsWith(value, search) {
  arity.exact(2, arguments, EndsWith.name)
  return new Expr({ ends_with: wrap(value), search: wrap(search) })
}

/**
 * It takes a string and returns a regex which matches the input string verbatim.
 *
 * @param value      - the string to analyze
 * @return {string}  - a regex which matches the input string verbatim
 * @see <a href="https://docs.fauna.com/fauna/current/api/fql/functions/regexescape">FaunaDB RegexEscape Function</a>
 */
function RegexEscape(value) {
  arity.exact(1, arguments, RegexEscape.name)
  return new Expr({ regex_escape: wrap(value) })
}

/**
 * See the [docs](https://app.fauna.com/documentation/reference/queryapi#string-functions).
 *
 * @param {string} value - A string to search.
 * @param {string} find - Find the first position of this string in the search string
 * @param {int} start - An optional start offset into the search string
 * @return {int} location of the found string or -1 if not found
 */
function FindStr(value, find, start) {
  arity.between(2, 3, arguments, FindStr.name)
  start = defaults(start, null)
  return new Expr(
    params({ find_str: wrap(value), find: wrap(find) }, { start: wrap(start) })
  )
}

/**
 * See the [docs](https://app.fauna.com/documentation/reference/queryapi#string-functions).
 *
 * @param {string} value - A string to search.
 * @param {string} pattern - Find the first position of this pattern in the search string using a java regular expression syntax
 * @param {int} start - An optional start offset into the search string
 * @param {int} numResults - An optional number of results to return, max 1024
 * @return {Array} an array of object describing where the search pattern was located
 */
function FindStrRegex(value, pattern, start, numResults) {
  arity.between(2, 4, arguments, FindStrRegex.name)
  start = defaults(start, null)
  return new Expr(
    params(
      { find_str_regex: wrap(value), pattern: wrap(pattern) },
      { start: wrap(start), num_results: wrap(numResults) }
    )
  )
}

/**
 * See the [docs](https://app.fauna.com/documentation/reference/queryapi#string-functions).
 *
 * @param {string} value - The string to calculate the length in codepoints.
 * @return {int} the length of the string in codepoints
 */
function Length(value) {
  arity.exact(1, arguments, Length.name)
  return new Expr({ length: wrap(value) })
}

/**
 * See the [docs](https://app.fauna.com/documentation/reference/queryapi#string-functions).
 *
 * @param {string} value - The string to LowerCase.
 * @return {string} the string converted to lowercase
 */
function LowerCase(value) {
  arity.exact(1, arguments, LowerCase.name)
  return new Expr({ lower_case: wrap(value) })
}

/**
 * See the [docs](https://app.fauna.com/documentation/reference/queryapi#string-functions).
 *
 * @param {string} value - The string to trim leading white space.
 * @return {string} the string with leading white space removed
 */
function LTrim(value) {
  arity.exact(1, arguments, LTrim.name)
  return new Expr({ l_trim: wrap(value) })
}

/**
 * See the [docs](https://app.fauna.com/documentation/reference/queryapi#string-functions).
 *
 * @param {module:query~ExprArg} terms
 *   A document from which to produce ngrams.
 * @param {?Object} opts
 *   An object of options
 *     - min: The minimum ngram size.
 *     - max: The maximum ngram size.
 * @return {Array|Value}
 */
function NGram(terms, min, max) {
  arity.between(1, 3, arguments, NGram.name)
  min = defaults(min, null)
  max = defaults(max, null)

  return new Expr(
    params({ ngram: wrap(terms) }, { min: wrap(min), max: wrap(max) })
  )
}

/**
 * See the [docs](https://app.fauna.com/documentation/reference/queryapi#string-functions).
 *
 * @param {string} value - A string to repeat.
 * @param {int} number - The number of times to repeat the string
 * @return {string} a string which was repeated
 */
function Repeat(value, number) {
  arity.between(1, 2, arguments, Repeat.name)
  number = defaults(number, null)
  return new Expr(params({ repeat: wrap(value) }, { number: wrap(number) }))
}

/**
 * See the [docs](https://app.fauna.com/documentation/reference/queryapi#string-functions).
 *
 * @param {string} value - A string to search.
 * @param {string} find - The string to find in the search string
 * @param {string} replace - The string to replace in the search string
 * @return {String} all the occurrences of find substituted with replace string
 */
function ReplaceStr(value, find, replace) {
  arity.exact(3, arguments, ReplaceStr.name)
  return new Expr({
    replace_str: wrap(value),
    find: wrap(find),
    replace: wrap(replace),
  })
}

/**
 * See the [docs](https://app.fauna.com/documentation/reference/queryapi#string-functions).
 *
 * @param {string} value - A string to search.
 * @param {string} pattern - The pattern to find in the search string using a java regular expression syntax
 * @param {string} replace - The string to replace in the search string
 * @param {boolean} first - Replace all or just the first
 * @return {string} all the occurrences of find pattern substituted with replace string
 */
function ReplaceStrRegex(value, pattern, replace, first) {
  arity.between(3, 4, arguments, ReplaceStrRegex.name)
  first = defaults(first, null)
  return new Expr(
    params(
      {
        replace_str_regex: wrap(value),
        pattern: wrap(pattern),
        replace: wrap(replace),
      },
      { first: wrap(first) }
    )
  )
}

/**
 * See the [docs](https://app.fauna.com/documentation/reference/queryapi#string-functions).
 *
 * @param {string} value - The string to remove white space from the end.
 * @return {string} the string with trailing whitespaces removed
 */
function RTrim(value) {
  arity.exact(1, arguments, RTrim.name)
  return new Expr({ r_trim: wrap(value) })
}

/**
 * See the [docs](https://app.fauna.com/documentation/reference/queryapi#string-functions).
 *
 * @param {int} num - The string of N Space(s).
 * @return {string} a string with spaces
 */
function Space(num) {
  arity.exact(1, arguments, Space.name)
  return new Expr({ space: wrap(num) })
}
/**
 * See the [docs](https://app.fauna.com/documentation/reference/queryapi#string-functions).
 *
 * @param {string} value  The string to SubString.
 * @param {int} start  The position the first character of the return string begins at
 * @param {int} length  An optional length, if omitted then returns to the end of string
 * @return {string}
 */
function SubString(value, start, length) {
  arity.between(1, 3, arguments, SubString.name)
  start = defaults(start, null)
  length = defaults(length, null)
  return new Expr(
    params(
      { sub_string: wrap(value) },
      { start: wrap(start), length: wrap(length) }
    )
  )
}

/**
 * See the [docs](https://app.fauna.com/documentation/reference/queryapi#string-functions).
 *
 * @param {string} value - The string to TitleCase.
 * @return {string}  A string converted to titlecase
 */
function TitleCase(value) {
  arity.exact(1, arguments, TitleCase.name)
  return new Expr({ title_case: wrap(value) })
}

/**
 * See the [docs](https://app.fauna.com/documentation/reference/queryapi#string-functions).
 *
 * @param {string} value - The string to Trim.
 * @return {string} a string with leading and trailing whitespace removed
 */
function Trim(value) {
  arity.exact(1, arguments, Trim.name)
  return new Expr({ trim: wrap(value) })
}

/**
 * See the [docs](https://app.fauna.com/documentation/reference/queryapi#string-functions).
 *
 * @param {string} value - The string to Uppercase.
 * @return {string} An uppercase string
 */
function UpperCase(value) {
  arity.exact(1, arguments, UpperCase.name)
  return new Expr({ upper_case: wrap(value) })
}

/**
 * Format values into a string.
 *
 * @param  {string}  string string with format specifiers
 * @param  {array}   values list of values to format
 * @return {string}         a string
 */
function Format(string) {
  arity.min(1, arguments, Format.name)
  var args = argsToArray(arguments)
  args.shift()
  return new Expr({ format: wrap(string), values: wrap(varargs(args)) })
}

// Time and date functions
/**
 * See the [docs](https://app.fauna.com/documentation/reference/queryapi#time-and-date).
 *
 * @param {module:query~ExprArg} string
 *   A string to converted to a time object.
 * @return {Expr}
 */
function Time(string) {
  arity.exact(1, arguments, Time.name)
  return new Expr({ time: wrap(string) })
}

/**
 * See the [docs](https://app.fauna.com/documentation/reference/queryapi#time-and-date).
 *
 * @param {module:query~ExprArg} number
 *   The number of `unit`s from Epoch
 * @param {module:query~ExprArg} unit
 *   The unit of `number`. One of second, millisecond, microsecond, nanosecond.
 * @return {Expr}
 */
function Epoch(number, unit) {
  arity.exact(2, arguments, Epoch.name)
  return new Expr({ epoch: wrap(number), unit: wrap(unit) })
}

/**
 * See the [docs](https://docs.fauna.com/fauna/current/api/fql/functions/timeadd).
 *
 * Returns a new time or date with the offset in terms of the unit
 * added.
 *
 * @param base the base time or data
 * @param offset the number of units
 * @param unit the unit type
 * @return {Expr}
 */
function TimeAdd(base, offset, unit) {
  arity.exact(3, arguments, TimeAdd.name)
  return new Expr({
    time_add: wrap(base),
    offset: wrap(offset),
    unit: wrap(unit),
  })
}

/**
 * See the [docs](https://docs.fauna.com/fauna/current/api/fql/functions/timesubtract).
 *
 * Returns a new time or date with the offset in terms of the unit
 * subtracted.
 *
 * @param base the base time or data
 * @param offset the number of units
 * @param unit the unit type
 * @return {Expr}
 */
function TimeSubtract(base, offset, unit) {
  arity.exact(3, arguments, TimeSubtract.name)
  return new Expr({
    time_subtract: wrap(base),
    offset: wrap(offset),
    unit: wrap(unit),
  })
}

/**
 * See the [docs](https://docs.fauna.com/fauna/current/api/fql/functions/timediff).
 *
 * Returns the number of intervals in terms of the unit between
 * two times or dates. Both start and finish must be of the same
 * type.
 *
 * @param start the starting time or date, inclusive
 * @param finish the ending time or date, exclusive
 * @param unit the unit type
 * @return {Expr}
 */
function TimeDiff(start, finish, unit) {
  arity.exact(3, arguments, TimeDiff.name)
  return new Expr({
    time_diff: wrap(start),
    other: wrap(finish),
    unit: wrap(unit),
  })
}

/**
 * See the [docs](https://app.fauna.com/documentation/reference/queryapi#time-and-date).
 *
 * @param {module:query~ExprArg} string
 *   A string to convert to a Date object
 * @return {Expr}
 */
function Date(string) {
  arity.exact(1, arguments, Date.name)
  return new Expr({ date: wrap(string) })
}

/**
 * Returns the current snapshot time.
 *
 * @return {Expr}
 * @see <a href="https://docs.fauna.com/fauna/current/api/fql/functions/now">Now function</a>
 */
function Now() {
  arity.exact(0, arguments, Now.name)
  return new Expr({ now: wrap(null) })
}

// Miscellaneous functions

/**
 * See the [docs](https://app.fauna.com/documentation/reference/queryapi#miscellaneous-functions).
 *
 * @deprecated use NewId instead
 * @return {Expr}
 */
function NextId() {
  arity.exact(0, arguments, NextId.name)
  return new Expr({ next_id: null })
}

/**
 * See the [docs](https://app.fauna.com/documentation/reference/queryapi#miscellaneous-functions).
 *
 * @return {Expr}
 */
function NewId() {
  arity.exact(0, arguments, NewId.name)
  return new Expr({ new_id: null })
}

/**
 * See the [docs](https://app.fauna.com/documentation/reference/queryapi#miscellaneous-functions).
 *
 * @param {module:query~ExprArg} name
 *   The name of the database.
 * @param {module:query~ExprArg} [scope]
 *   The Ref of the database's scope.
 * @return {Expr}
 */
function Database(name, scope) {
  arity.between(1, 2, arguments, Database.name)
  switch (arguments.length) {
    case 1:
      return new Expr({ database: wrap(name) })
    case 2:
      return new Expr({ database: wrap(name), scope: wrap(scope) })
  }
}

/**
 * See the [docs](https://app.fauna.com/documentation/reference/queryapi#miscellaneous-functions).
 *
 * @param {module:query~ExprArg} name
 *   The name of the index.
 * @param {module:query~ExprArg} [scope]
 *   The Ref of the index's scope.
 * @return {Expr}
 */
function Index(name, scope) {
  arity.between(1, 2, arguments, Index.name)
  switch (arguments.length) {
    case 1:
      return new Expr({ index: wrap(name) })
    case 2:
      return new Expr({ index: wrap(name), scope: wrap(scope) })
  }
}

/**
 * See the [docs](https://app.fauna.com/documentation/reference/queryapi#miscellaneous-functions).
 *
 * @param {module:query~ExprArg} name
 *   The name of the class.
 * @param {module:query~ExprArg} [scope]
 *   The Ref of the class's scope.
 * @return {Expr}
 *
 * @deprecated Class is deprecated, use Collection instead
 */
function Class(name, scope) {
  arity.between(1, 2, arguments, Class.name)
  switch (arguments.length) {
    case 1:
      return new Expr({ class: wrap(name) })
    case 2:
      return new Expr({ class: wrap(name), scope: wrap(scope) })
  }
}

/**
 * See the [docs](https://app.fauna.com/documentation/reference/queryapi#miscellaneous-functions).
 *
 * @param {module:query~ExprArg} name
 *   The name of the collection.
 * @param {module:query~ExprArg} [scope]
 *   The Ref of the collection's scope.
 * @return {Expr}
 */
function Collection(name, scope) {
  arity.between(1, 2, arguments, Collection.name)
  switch (arguments.length) {
    case 1:
      return new Expr({ collection: wrap(name) })
    case 2:
      return new Expr({ collection: wrap(name), scope: wrap(scope) })
  }
}

/**
 * See the [docs](https://app.fauna.com/documentation/reference/queryapi#miscellaneous-functions).
 *
 * @param {module:query~ExprArg} name
 *   The name of the user defined function.
 * @param {module:query~ExprArg} [scope]
 *   The Ref of the user defined function's scope.
 * @return {Expr}
 */
function FunctionFn(name, scope) {
  arity.between(1, 2, arguments, FunctionFn.name)
  switch (arguments.length) {
    case 1:
      return new Expr({ function: wrap(name) })
    case 2:
      return new Expr({ function: wrap(name), scope: wrap(scope) })
  }
}

/**
 * See the [docs](https://app.fauna.com/documentation/reference/queryapi#miscellaneous-functions).
 *
 * @param {module:query~ExprArg} name
 *   The name of the role.
 * @param {module:query~ExprArg} [scope]
 *   The Ref of the role's scope.
 * @return {Expr}
 */
function Role(name, scope) {
  arity.between(1, 2, arguments, Role.name)
  scope = defaults(scope, null)
  return new Expr(params({ role: wrap(name) }, { scope: wrap(scope) }))
}

/**
 *
 * @param {module:query~ExprArg} scope
 *   The Ref of the database set's scope.
 * @return {Expr}
 */
function AccessProviders(scope) {
  arity.max(1, arguments, AccessProviders.name)
  scope = defaults(scope, null)
  return new Expr({ access_providers: wrap(scope) })
}

/**
 * See the [docs](https://app.fauna.com/documentation/reference/queryapi#miscellaneous-functions).
 *
 * Constructs a `classes` function that, when evaluated, returns a Ref value.
 *
 * @param {module:query~ExprArg} [scope]
 *   The Ref of the class set's scope.
 * @return {Expr}
 */
function Classes(scope) {
  arity.max(1, arguments, Classes.name)
  scope = defaults(scope, null)
  return new Expr({ classes: wrap(scope) })
}

/**
 * See the [docs](https://app.fauna.com/documentation/reference/queryapi#miscellaneous-functions).
 *
 * Constructs a `collections` function that, when evaluated, returns a Ref value.
 *
 * @param {module:query~ExprArg} [scope]
 *   The Ref of the collection set's scope.
 * @return {Expr}
 */
function Collections(scope) {
  arity.max(1, arguments, Collections.name)
  scope = defaults(scope, null)
  return new Expr({ collections: wrap(scope) })
}

/**
 * See the [docs](https://app.fauna.com/documentation/reference/queryapi#miscellaneous-functions).
 *
 * Constructs a `databases` functions that, when evaluated, returns a Ref value.
 *
 * @param {module:query~ExprArg} [scope]
 *   The Ref of the database set's scope.
 * @return {Expr}
 */
function Databases(scope) {
  arity.max(1, arguments, Databases.name)
  scope = defaults(scope, null)
  return new Expr({ databases: wrap(scope) })
}

/**
 * See the [docs](https://app.fauna.com/documentation/reference/queryapi#miscellaneous-functions).
 *
 * Constructs an `indexes` function that, when evaluated, returns a Ref value.
 *
 * @param {module:query~ExprArg} [scope]
 *   The Ref of the index set's scope.
 * @return {Expr}
 */
function Indexes(scope) {
  arity.max(1, arguments, Indexes.name)
  scope = defaults(scope, null)
  return new Expr({ indexes: wrap(scope) })
}

/**
 * See the [docs](https://app.fauna.com/documentation/reference/queryapi#miscellaneous-functions).
 *
 * Constructs a `functions` function that, when evaluated, returns a Ref value.
 *
 * @param {module:query~ExprArg} [scope]
 *   The Ref of the user defined function set's scope.
 * @return {Expr}
 */
function Functions(scope) {
  arity.max(1, arguments, Functions.name)
  scope = defaults(scope, null)
  return new Expr({ functions: wrap(scope) })
}

/**
 * See the [docs](https://app.fauna.com/documentation/reference/queryapi#miscellaneous-functions).
 *
 * Constructs a `roles` function that, when evaluated, returns a Ref value.
 *
 * @param {module:query~ExprArg} [scope]
 *   The Ref of the role set's scope.
 * @return {Expr}
 */
function Roles(scope) {
  arity.max(1, arguments, Roles.name)
  scope = defaults(scope, null)
  return new Expr({ roles: wrap(scope) })
}

/**
 * See the [docs](https://app.fauna.com/documentation/reference/queryapi#miscellaneous-functions).
 *
 * Constructs a `keys` function that, when evaluated, returns a Ref value.
 *
 * @param {module:query~ExprArg} [scope]
 *   The Ref of the key set's scope.
 * @return {Expr}
 */
function Keys(scope) {
  arity.max(1, arguments, Keys.name)
  scope = defaults(scope, null)
  return new Expr({ keys: wrap(scope) })
}

/**
 * See the [docs](https://app.fauna.com/documentation/reference/queryapi#miscellaneous-functions).
 *
 * Constructs a `tokens` function that, when evaluated, returns a Ref value.
 *
 * @param {module:query~ExprArg} [scope]
 *   The Ref of the token set's scope.
 * @return {Expr}
 */
function Tokens(scope) {
  arity.max(1, arguments, Tokens.name)
  scope = defaults(scope, null)
  return new Expr({ tokens: wrap(scope) })
}

/**
 * See the [docs](https://app.fauna.com/documentation/reference/queryapi#miscellaneous-functions).
 *
 * Constructs a `credentials` functions that, when evaluated, returns a Ref value.
 *
 * @param {module:query~ExprArg} [scope]
 *   The Ref of the credential set's scope.
 * @return {Expr}
 */
function Credentials(scope) {
  arity.max(1, arguments, Credentials.name)
  scope = defaults(scope, null)
  return new Expr({ credentials: wrap(scope) })
}

/**
 * See the [docs](https://app.fauna.com/documentation/reference/queryapi#miscellaneous-functions).
 *
 * @param {...module:query~ExprArg} terms
 *   A collection of expressions to check for equivalence.
 * @return {Expr}
 */
function Equals() {
  arity.min(1, arguments, Equals.name)
  return new Expr({ equals: wrap(varargs(arguments)) })
}

/**
 * See the [docs](https://app.fauna.com/documentation/reference/queryapi#miscellaneous-functions).
 *
 * @param {module:query~ExprArg} path
 *   An array representing a path to check for the existence of.
 * @param {module:query~ExprArg} in
 *   An object to search against.
 * @return {Expr}
 *
 * @deprecated use ContainsPath instead
 */
function Contains(path, _in) {
  arity.exact(2, arguments, Contains.name)
  return new Expr({ contains: wrap(path), in: wrap(_in) })
}

/**
 * See the [docs](https://app.fauna.com/documentation/reference/queryapi#miscellaneous-functions).
 *
 * @param {module:query~ExprArg} value
 *   Represent the value we want to search for.
 * @param {module:query~ExprArg} in
 *   An object we will search for the value passed in.
 * @return {Expr}
 */
function ContainsValue(value, _in) {
  arity.exact(2, arguments, ContainsValue.name)
  return new Expr({ contains_value: wrap(value), in: wrap(_in) })
}

/**
 * @param {string} field
 *   A field name we want to confirm exists.
 * @param {module:query~ExprArg} obj
 *   An object to search against.
 * @return {Expr}
 */
function ContainsField(field, obj) {
  arity.exact(2, arguments, ContainsField.name)
  return new Expr({ contains_field: wrap(field), in: wrap(obj) })
}

/**
 * See the [docs](https://app.fauna.com/documentation/reference/queryapi#miscellaneous-functions).
 *
 * @param {module:query~ExprArg} path
 *   An array representing a path to check for the existence of.
 * @param {module:query~ExprArg} in
 *   An object to search against.
 * @return {Expr}
 */
function ContainsPath(path, _in) {
  arity.exact(2, arguments, ContainsPath.name)
  return new Expr({ contains_path: wrap(path), in: wrap(_in) })
}

/**
 * See the [docs](https://app.fauna.com/documentation/reference/queryapi#miscellaneous-functions).
 *
 * @param {module:query~ExprArg} path
 *   An array representing a path to pull from an object.
 * @param {module:query~ExprArg} from
 *   The object to select from
 * @param {?module:query~ExprArg} default
 *   A default value if the path does not exist.
 * @return {Expr}
 */
function Select(path, from, _default) {
  arity.between(2, 3, arguments, Select.name)
  var exprObj = { select: wrap(path), from: wrap(from) }
  if (_default !== undefined) {
    exprObj.default = wrap(_default)
  }
  return new Expr(exprObj)
}

/**
 * See the [docs](https://app.fauna.com/documentation/reference/queryapi#miscellaneous-functions).
 *
 * @param {module:query~ExprArg} path
 *   An array representing a path to pull from an object.
 * @param {module:query~ExprArg} from
 *   The object to select from
 * @return {Expr}
 *
 * @deprecated avoid using
 */
function SelectAll(path, from) {
  arity.exact(2, arguments, SelectAll.name)
  return new Expr({ select_all: wrap(path), from: wrap(from) })
}

/**
 * See the [docs](https://app.fauna.com/documentation/reference/queryapi#mathematical-functions).
 *
 * @param {...module:query~ExprArg} terms
 *   A numbers to provide the absolute value.
 * @return {Expr}
 */
function Abs(expr) {
  arity.exact(1, arguments, Abs.name)
  return new Expr({ abs: wrap(expr) })
}

/**
 * See the [docs](https://app.fauna.com/documentation/reference/queryapi#mathematical-functions).
 *
 * @param {...module:query~ExprArg} terms
 *   A collection of numbers to sum together.
 * @return {Expr}
 */
function Add() {
  arity.min(1, arguments, Add.name)
  return new Expr({ add: wrap(varargs(arguments)) })
}

/**
 * See the [docs](https://app.fauna.com/documentation/reference/queryapi#mathematical-functions).
 *
 * @param {...module:query~ExprArg} terms
 *   A collection of numbers to bitwise and together.
 * @return {Expr}
 */
function BitAnd() {
  arity.min(1, arguments, BitAnd.name)
  return new Expr({ bit_and: wrap(varargs(arguments)) })
}

/**
 * See the [docs](https://app.fauna.com/documentation/reference/queryapi#mathematical-functions).
 *
 * @param {...module:query~ExprArg} terms
 *   A numbers to provide the bitwise not.
 * @return {Expr}
 */
function BitNot(expr) {
  arity.exact(1, arguments, BitNot.name)
  return new Expr({ bit_not: wrap(expr) })
}

/**
 * See the [docs](https://app.fauna.com/documentation/reference/queryapi#mathematical-functions).
 *
 * @param {...module:query~ExprArg} terms
 *   A collection of numbers to bitwise Or'd together.
 * @return {Expr}
 */
function BitOr() {
  arity.min(1, arguments, BitOr.name)
  return new Expr({ bit_or: wrap(varargs(arguments)) })
}

/**
 * See the [docs](https://app.fauna.com/documentation/reference/queryapi#mathematical-functions).
 *
 * @param {...module:query~ExprArg} terms
 *   A collection of numbers to bitwise Xor'd together.
 * @return {Expr}
 */
function BitXor() {
  arity.min(1, arguments, BitXor.name)
  return new Expr({ bit_xor: wrap(varargs(arguments)) })
}

/**
 * See the [docs](https://app.fauna.com/documentation/reference/queryapi#mathematical-functions).
 *
 * @param {...module:query~ExprArg} terms
 *   The least integer that is greater than or equal to the number
 * @return {Expr}
 */
function Ceil(expr) {
  arity.exact(1, arguments, Ceil.name)
  return new Expr({ ceil: wrap(expr) })
}

/**
 * See the [docs](https://app.fauna.com/documentation/reference/queryapi#mathematical-functions).
 *
 * @param {...module:query~ExprArg} terms
 *   A collection of numbers to compute the quotient of.
 * @return {Expr}
 */
function Divide() {
  arity.min(1, arguments, Divide.name)
  return new Expr({ divide: wrap(varargs(arguments)) })
}

/**
 * See the [docs](https://app.fauna.com/documentation/reference/queryapi#mathematical-functions).
 *
 * @param {...module:query~ExprArg} terms
 *   The greatest integer that is less than or equal to the number
 * @return {Expr}
 */
function Floor(expr) {
  arity.exact(1, arguments, Floor.name)
  return new Expr({ floor: wrap(expr) })
}

/**
 * See the [docs](https://app.fauna.com/documentation/reference/queryapi#mathematical-functions).
 *
 * @param {...module:query~ExprArg} terms
 *   A collection of numbers to multiply together.
 * @return {Expr}
 */
function Max() {
  arity.min(1, arguments, Max.name)
  return new Expr({ max: wrap(varargs(arguments)) })
}

/**
 * See the [docs](https://app.fauna.com/documentation/reference/queryapi#mathematical-functions).
 *
 * @param {...module:query~ExprArg} terms
 *   A collection of numbers to multiply together.
 * @return {Expr}
 */
function Min() {
  arity.min(1, arguments, Min.name)
  return new Expr({ min: wrap(varargs(arguments)) })
}

/**
 * See the [docs](https://app.fauna.com/documentation/reference/queryapi#mathematical-functions).
 *
 * @param {...module:query~ExprArg} terms
 *   A collection of numbers to compute the quotient of. The remainder will be returned.
 * @return {Expr}
 */
function Modulo() {
  arity.min(1, arguments, Modulo.name)
  return new Expr({ modulo: wrap(varargs(arguments)) })
}

/**
 * See the [docs](https://app.fauna.com/documentation/reference/queryapi#mathematical-functions).
 *
 * @param {...module:query~ExprArg} terms
 *   A collection of numbers to multiply together.
 * @return {Expr}
 */
function Multiply() {
  arity.min(1, arguments, Multiply.name)
  return new Expr({ multiply: wrap(varargs(arguments)) })
}

/**
 * See the [docs](https://app.fauna.com/documentation/reference/queryapi#mathematical-functions).
 *
 * @param {...module:query~ExprArg} terms
 *   A numbers to round.
 * @param {...module:query~ExprArg} terms
 *   An optional precision
 * @return {Expr}
 */
function Round(value, precision) {
  arity.min(1, arguments, Round.name)
  precision = defaults(precision, null)
  return new Expr(
    params({ round: wrap(value) }, { precision: wrap(precision) })
  )
}

/**
 * See the [docs](https://app.fauna.com/documentation/reference/queryapi#mathematical-functions).
 *
 * @param {...module:query~ExprArg} terms
 *   A collection of numbers to compute the difference of.
 * @return {Expr}
 */
function Subtract() {
  arity.min(1, arguments, Subtract.name)
  return new Expr({ subtract: wrap(varargs(arguments)) })
}

/**
 * See the [docs](https://app.fauna.com/documentation/reference/queryapi#mathematical-functions).
 *
 * @param {...module:query~ExprArg} terms
 *   The sign of the number is returned as positive 1, zero 0 , negative -1
 * @return {Expr}
 */
function Sign(expr) {
  arity.exact(1, arguments, Sign.name)
  return new Expr({ sign: wrap(expr) })
}

/**
 * See the [docs](https://app.fauna.com/documentation/reference/queryapi#mathematical-functions).
 *
 * @param {...module:query~ExprArg} terms
 *   The square root of the number
 * @return {Expr}
 */
function Sqrt(expr) {
  arity.exact(1, arguments, Sqrt.name)
  return new Expr({ sqrt: wrap(expr) })
}

/**
 * See the [docs](https://app.fauna.com/documentation/reference/queryapi#mathematical-functions).
 *
 * @param {...module:query~ExprArg} terms
 *   A numbers to truncate.
 * @param {...module:query~ExprArg} terms
 *   An optional precision
 * @return {Expr}
 */
function Trunc(value, precision) {
  arity.min(1, arguments, Trunc.name)
  precision = defaults(precision, null)
  return new Expr(
    params({ trunc: wrap(value) }, { precision: wrap(precision) })
  )
}

/**
 *
 * Count the number of elements in the collection.
 *
 * @param {array}    - array of items
 * @return {integer} - number of items in the collection
 * @see <a href="https://docs.fauna.com/fauna/current/api/fql/functions/count">Count function</a>
 */
function Count(collection) {
  arity.exact(1, arguments, Count.name)
  return new Expr({ count: wrap(collection) })
}

/**
 *
 * Sum the elements in the collection.
 *
 * @param {array} - collection of numbers
 * @return {integer} - total of all numbers in collection
 * @see <a href="https://docs.fauna.com/fauna/current/api/fql/functions/sum">Sum function</a>
 */
function Sum(collection) {
  arity.exact(1, arguments, Sum.name)
  return new Expr({ sum: wrap(collection) })
}

/**
 *
 * Returns the mean of all elements in the collection.
 *
 * @param {array} - collection the numbers
 * @return {float} - the mean of all numbers in the collection
 * @see <a href="https://docs.fauna.com/fauna/current/api/fql/functions/mean">Mean function</a>
 */
function Mean(collection) {
  arity.exact(1, arguments, Mean.name)
  return new Expr({ mean: wrap(collection) })
}

/**
 *
 * Evaluates to true if any element of the collection is true.
 *
 * @param {array} - collection the collection
 * @return {Expr}
 * @see <a href="https://docs.fauna.com/fauna/current/api/fql/functions/any">Any function</a>
 */
function Any(collection) {
  arity.exact(1, arguments, Any.name)
  return new Expr({ any: wrap(collection) })
}

/**
 *
 * Evaluates to true if all elements of the collection are true.
 *
 * @param {array} - collection the collection
 * @return {Expr}
 * @see <a href="https://docs.fauna.com/fauna/current/api/fql/functions/all">All function</a>
 */
function All(collection) {
  arity.exact(1, arguments, All.name)
  return new Expr({ all: wrap(collection) })
}

/**
 * See the [docs](https://app.fauna.com/documentation/reference/queryapi#mathematical-functions).
 *
 * @param {...module:query~ExprArg} terms
 *   The arc cosine of the number
 * @return {Expr}
 */
function Acos(expr) {
  arity.exact(1, arguments, Acos.name)
  return new Expr({ acos: wrap(expr) })
}

/**
 * See the [docs](https://app.fauna.com/documentation/reference/queryapi#mathematical-functions).
 *
 * @param {...module:query~ExprArg} terms
 *   The arc sine of the number
 * @return {Expr}
 */
function Asin(expr) {
  arity.exact(1, arguments, Asin.name)
  return new Expr({ asin: wrap(expr) })
}

/**
 * See the [docs](https://app.fauna.com/documentation/reference/queryapi#mathematical-functions).
 *
 * @param {...module:query~ExprArg} terms
 *   The arc tangent of the number
 * @return {Expr}
 */
function Atan(expr) {
  arity.exact(1, arguments, Atan.name)
  return new Expr({ atan: wrap(expr) })
}

/**
 * See the [docs](https://app.fauna.com/documentation/reference/queryapi#mathematical-functions).
 *
 * @param {...module:query~ExprArg} terms
 *   The cosine of a number
 * @return {Expr}
 */
function Cos(expr) {
  arity.exact(1, arguments, Cos.name)
  return new Expr({ cos: wrap(expr) })
}

/**
 * See the [docs](https://app.fauna.com/documentation/reference/queryapi#mathematical-functions).
 *
 * @param {...module:query~ExprArg} terms
 *   The hyperbolic cosine of the number
 * @return {Expr}
 */
function Cosh(expr) {
  arity.exact(1, arguments, Cosh.name)
  return new Expr({ cosh: wrap(expr) })
}

/**
 * See the [docs](https://app.fauna.com/documentation/reference/queryapi#mathematical-functions).
 *
 * @param {...module:query~ExprArg} terms
 *   Take radians and convert it to degrees 360 degrees = 2 * pi radians
 * @return {Expr}
 */
function Degrees(expr) {
  arity.exact(1, arguments, Degrees.name)
  return new Expr({ degrees: wrap(expr) })
}

/**
 * See the [docs](https://app.fauna.com/documentation/reference/queryapi#mathematical-functions).
 *
 * @param {...module:query~ExprArg} terms
 *   The e raised to an exponent number
 * @return {Expr}
 */
function Exp(expr) {
  arity.exact(1, arguments, Exp.name)
  return new Expr({ exp: wrap(expr) })
}

/**
 * See the [docs](https://app.fauna.com/documentation/reference/queryapi#mathematical-functions).
 *
 * @param {...module:query~ExprArg} terms
 *   A side of the right triangle
 * @param {...module:query~ExprArg} terms
 *   The second side of a right triange, defaults to the first side
 * @return {Expr}
 */
function Hypot(value, side) {
  arity.min(1, arguments, Hypot.name)
  side = defaults(side, null)
  return new Expr(params({ hypot: wrap(value) }, { b: wrap(side) }))
}

/**
 * See the [docs](https://app.fauna.com/documentation/reference/queryapi#mathematical-functions).
 *
 * @param {...module:query~ExprArg} terms
 *   The natural log of the number
 * @return {Expr}
 */
function Ln(expr) {
  arity.exact(1, arguments, Ln.name)
  return new Expr({ ln: wrap(expr) })
}

/**
 * See the [docs](https://app.fauna.com/documentation/reference/queryapi#mathematical-functions).
 *
 * @param {...module:query~ExprArg} terms
 *   The log base 10 of a number
 * @return {Expr}
 */
function Log(expr) {
  arity.exact(1, arguments, Log.name)
  return new Expr({ log: wrap(expr) })
}

/**
 * See the [docs](https://app.fauna.com/documentation/reference/queryapi#mathematical-functions).
 *
 * @param {...module:query~ExprArg} terms
 *   A numbers to raise to the power.
 * @param {...module:query~ExprArg} terms
 *   An optional exponent
 * @return {Expr}
 */
function Pow(value, exponent) {
  arity.min(1, arguments, Pow.name)
  exponent = defaults(exponent, null)
  return new Expr(params({ pow: wrap(value) }, { exp: wrap(exponent) }))
}

/**
 * See the [docs](https://app.fauna.com/documentation/reference/queryapi#mathematical-functions).
 *
 * @param {...module:query~ExprArg} terms
 *   Take degrees and convert the number to radians 2 * pi = 360 degrees
 * @return {Expr}
 */
function Radians(expr) {
  arity.exact(1, arguments, Radians.name)
  return new Expr({ radians: wrap(expr) })
}

/**
 * See the [docs](https://app.fauna.com/documentation/reference/queryapi#mathematical-functions).
 *
 * @param {...module:query~ExprArg} terms
 *   The sine of a number
 * @return {Expr}
 */
function Sin(expr) {
  arity.exact(1, arguments, Sin.name)
  return new Expr({ sin: wrap(expr) })
}

/**
 * See the [docs](https://app.fauna.com/documentation/reference/queryapi#mathematical-functions).
 *
 * @param {...module:query~ExprArg} terms
 *   The hyperbolic sine of a number
 * @return {Expr}
 */
function Sinh(expr) {
  arity.exact(1, arguments, Sinh.name)
  return new Expr({ sinh: wrap(expr) })
}

/**
 * See the [docs](https://app.fauna.com/documentation/reference/queryapi#mathematical-functions).
 *
 * @param {...module:query~ExprArg} terms
 *   The Tangent of a number
 * @return {Expr}
 */
function Tan(expr) {
  arity.exact(1, arguments, Tan.name)
  return new Expr({ tan: wrap(expr) })
}

/**
 * See the [docs](https://app.fauna.com/documentation/reference/queryapi#mathematical-functions).
 *
 * @param {...module:query~ExprArg} terms
 *   The hyberbolic tangent of a number
 * @return {Expr}
 */
function Tanh(expr) {
  arity.exact(1, arguments, Tanh.name)
  return new Expr({ tanh: wrap(expr) })
}

/**
 * See the [docs](https://app.fauna.com/documentation/reference/queryapi#logical-functions).
 *
 * @param {...module:query~ExprArg} terms
 *   A collection of terms to compare.
 * @return {Expr}
 */
function LT() {
  arity.min(1, arguments, LT.name)
  return new Expr({ lt: wrap(varargs(arguments)) })
}

/**
 * See the [docs](https://app.fauna.com/documentation/reference/queryapi#logical-functions).
 *
 * @param {...module:query~ExprArg} terms
 *   A collection of terms to compare.
 * @return {Expr}
 */
function LTE() {
  arity.min(1, arguments, LTE.name)
  return new Expr({ lte: wrap(varargs(arguments)) })
}

/**
 * See the [docs](https://app.fauna.com/documentation/reference/queryapi#logical-functions).
 *
 * @param {...module:query~ExprArg} terms
 *   A collection of terms to compare.
 * @return {Expr}
 */
function GT() {
  arity.min(1, arguments, GT.name)
  return new Expr({ gt: wrap(varargs(arguments)) })
}

/**
 * See the [docs](https://app.fauna.com/documentation/reference/queryapi#logical-functions).
 *
 * @param {...module:query~ExprArg} terms
 *   A collection of terms to compare.
 * @return {Expr}
 */
function GTE() {
  arity.min(1, arguments, GTE.name)
  return new Expr({ gte: wrap(varargs(arguments)) })
}

/**
 * See the [docs](https://app.fauna.com/documentation/reference/queryapi#logical-functions).
 *
 * @param {...module:query~ExprArg} terms
 *   A collection to compute the conjunction of.
 * @return {Expr}
 */
function And() {
  arity.min(1, arguments, And.name)
  return new Expr({ and: wrap(varargs(arguments)) })
}

/**
 * See the [docs](https://app.fauna.com/documentation/reference/queryapi#logical-functions).
 *
 * @param {...module:query~ExprArg} terms
 *   A collection to compute the disjunction of.
 * @return {Expr}
 */
function Or() {
  arity.min(1, arguments, Or.name)
  return new Expr({ or: wrap(varargs(arguments)) })
}

/**
 * See the [docs](https://app.fauna.com/documentation/reference/queryapi#logical-functions).
 *
 * @param {module:query~ExprArg} boolean
 *   A boolean to produce the negation of.
 * @return {Expr}
 */
function Not(boolean) {
  arity.exact(1, arguments, Not.name)
  return new Expr({ not: wrap(boolean) })
}

/**
 * Converts an expression to a string literal.
 *
 * @param {module:query~ExprArg} expression
 *   An expression to convert to a string.
 * @return {Expr}
 */
function ToString(expr) {
  arity.exact(1, arguments, ToString.name)
  return new Expr({ to_string: wrap(expr) })
}

/**
 * Converts an expression to a number literal.
 *
 * @param {module:query~ExprArg} expression
 *   An expression to convert to a number.
 * @return {Expr}
 */
function ToNumber(expr) {
  arity.exact(1, arguments, ToNumber.name)
  return new Expr({ to_number: wrap(expr) })
}

/**
 * Converts an expression to an Object.
 *
 * @param {module:query~ExprArg} expression
 *   An expression to convert to an Object.
 * @return {Expr}
 */
function ToObject(expr) {
  arity.exact(1, arguments, ToObject.name)
  return new Expr({ to_object: wrap(expr) })
}

/**
 * Converts an expression to an Array.
 *
 * @param {module:query~ExprArg} expression
 *   An expression to convert to an Array.
 * @return {Expr}
 */
function ToArray(expr) {
  arity.exact(1, arguments, ToArray.name)
  return new Expr({ to_array: wrap(expr) })
}

/**
 * Converts an expression to a double value, if possible.
 *
 * @param {module:query~ExprArg} expression
 *   An expression to convert to a double.
 * @return {Expr}
 */
function ToDouble(expr) {
  arity.exact(1, arguments, ToDouble.name)
  return new Expr({ to_double: wrap(expr) })
}

/**
 * Converts an expression to an integer value, if possible.
 *
 * @param {module:query~ExprArg} expression
 *   An expression to convert to an integer.
 * @return {Expr}
 */
function ToInteger(expr) {
  arity.exact(1, arguments, ToInteger.name)
  return new Expr({ to_integer: wrap(expr) })
}

/**
 * Converts an expression to a time literal.
 *
 * @param {module:query~ExprArg} expression
 *   An expression to convert to a time.
 * @return {Expr}
 */
function ToTime(expr) {
  arity.exact(1, arguments, ToTime.name)
  return new Expr({ to_time: wrap(expr) })
}

/**
 * Converts an expression evaluating to a time to seconds since epoch.
 *
 * @param {module:query~ExprArg} expression
 *   An expression to convert to seconds numeric value.
 * @return {Expr}
 */
function ToSeconds(expr) {
  arity.exact(1, arguments, ToSeconds.name)
  return new Expr({ to_seconds: wrap(expr) })
}

/**
 * Converts a time expression to milliseconds since the UNIX epoch.
 *
 * @param {module:query~ExprArg} expression
 *   An expression to convert to millisecond numeric value.
 * @return {Expr}
 */
function ToMillis(expr) {
  arity.exact(1, arguments, ToMillis.name)
  return new Expr({ to_millis: wrap(expr) })
}

/**
 * Converts a time expression to microseconds since the UNIX epoch.
 *
 * @param {module:query~ExprArg} expression
 *   An expression to convert to microsecond numeric value.
 * @return {Expr}
 */
function ToMicros(expr) {
  arity.exact(1, arguments, ToMicros.name)
  return new Expr({ to_micros: wrap(expr) })
}

/**
 * Returns a time expression's day of the week following ISO-8601 convention, from 1 (Monday) to 7 (Sunday).
 *
 * @param {module:query~ExprArg} expression
 *   An expression to convert to day of week.
 * @return {Expr}
 */
function DayOfWeek(expr) {
  arity.exact(1, arguments, DayOfWeek.name)
  return new Expr({ day_of_week: wrap(expr) })
}

/**
 * Returns a time expression's day of the year, from 1 to 365, or 366 in a leap year.
 *
 * @param {module:query~ExprArg} expression
 *   An expression to convert to day of year.
 * @return {Expr}
 */
function DayOfYear(expr) {
  arity.exact(1, arguments, DayOfYear.name)
  return new Expr({ day_of_year: wrap(expr) })
}

/**
 * Returns a time expression's day of the month, from 1 to 31.
 *
 * @param {module:query~ExprArg} expression
 *   An expression to convert to day of month.
 * @return {Expr}
 */
function DayOfMonth(expr) {
  arity.exact(1, arguments, DayOfMonth.name)
  return new Expr({ day_of_month: wrap(expr) })
}

/**
 * Returns a time expression's second of the minute, from 0 to 59.
 *
 * @param {module:query~ExprArg} expression
 *   An expression to convert to a hour.
 * @return {Expr}
 */
function Hour(expr) {
  arity.exact(1, arguments, Hour.name)
  return new Expr({ hour: wrap(expr) })
}

/**
 * Returns a time expression's second of the minute, from 0 to 59.
 *
 * @param {module:query~ExprArg} expression
 *   An expression to convert to a month.
 * @return {Expr}
 */
function Minute(expr) {
  arity.exact(1, arguments, Minute.name)
  return new Expr({ minute: wrap(expr) })
}

/**
 * Returns a time expression's second of the minute, from 0 to 59.
 *
 * @param {module:query~ExprArg} expression
 *   An expression to convert to a month.
 * @return {Expr}
 */
function Second(expr) {
  arity.exact(1, arguments, Second.name)
  return new Expr({ second: wrap(expr) })
}

/**
 * Returns a time expression's month of the year, from 1 to 12.
 *
 * @param {module:query~ExprArg} expression
 *   An expression to convert to a month.
 * @return {Expr}
 */
function Month(expr) {
  arity.exact(1, arguments, Month.name)
  return new Expr({ month: wrap(expr) })
}

/**
 * Returns the time expression's year, following the ISO-8601 standard.
 *
 * @param {module:query~ExprArg} expression
 *   An expression to convert to a year.
 * @return {Expr}
 */
function Year(expr) {
  arity.exact(1, arguments, Year.name)
  return new Expr({ year: wrap(expr) })
}

/**
 * Converts an expression to a date literal.
 *
 * @param {module:query~ExprArg} expression
 *   An expression to convert to a date.
 * @return {Expr}
 */
function ToDate(expr) {
  arity.exact(1, arguments, ToDate.name)
  return new Expr({ to_date: wrap(expr) })
}

/**
 * Move database to a new hierarchy.
 *
 * @param {string}  from database reference to be moved.
 * @param {string}  to new parent database reference.
 * @return {Expr}   The expression wrapping the provided object.
 * @see <a href="https://app.fauna.com/documentation/reference/queryapi#write-functions">FaunaDB Write Functions</a>
 */
function MoveDatabase(from, to) {
  arity.exact(2, arguments, MoveDatabase.name)
  return new Expr({ move_database: wrap(from), to: wrap(to) })
}

/**
 * Returns a set of all documents in the given collection.
 * A set must be paginated in order to retrieve its values.
 *
 * @param collection a reference to the collection. Type: Ref
 * @return a new {@link Expr} instance
 * @see #Paginate(Expr)
 */
function Documents(collection) {
  arity.exact(1, arguments, Documents.name)
  return new Expr({ documents: wrap(collection) })
}

/**
 *
 * @param {module:query~ExprArg} expr
 *  An expression (i.e. Set, Page, or Array) to reverse
 * @return {Expr}
 */
function Reverse(expr) {
  arity.exact(1, arguments, Reverse.name)
  return new Expr({ reverse: wrap(expr) })
}

/**
 *
 * @param {module:query~ExprArg} name
 * A string representing an AccessProvider's name
 * @return {Expr}
 */
function AccessProvider(name) {
  arity.exact(1, arguments, AccessProvider.name)
  return new Expr({ access_provider: wrap(name) })
}

// Helpers

/**
 * @ignore
 */
function arity(min, max, args, callerFunc) {
  if (
    (min !== null && args.length < min) ||
    (max !== null && args.length > max)
  ) {
    throw new errors.InvalidArity(min, max, args.length, callerFunc)
  }
}

arity.exact = function(n, args, callerFunc) {
  arity(n, n, args, callerFunc)
}
arity.max = function(n, args, callerFunc) {
  arity(null, n, args, callerFunc)
}
arity.min = function(n, args, callerFunc) {
  arity(n, null, args, callerFunc)
}
arity.between = function(min, max, args, callerFunc) {
  arity(min, max, args, callerFunc)
}

/** Adds optional parameters to the query.
 *
 * @ignore
 * */
function params(mainParams, optionalParams) {
  for (var key in optionalParams) {
    var val = optionalParams[key]
    if (val !== null) {
      mainParams[key] = val
    }
  }
  return mainParams
}

/**
 * Called on rest arguments.
 * This ensures that a single value passed is not put in an array, so
 * `query.add([1, 2])` will work as well as `query.add(1, 2)`.
 *
 * @ignore
 */
function varargs(values) {
  var valuesAsArr = Array.isArray(values)
    ? values
    : Array.prototype.slice.call(values)
  return values.length === 1 ? values[0] : valuesAsArr
}

/**
 * @ignore
 */
function argsToArray(args) {
  var rv = []
  rv.push.apply(rv, args)
  return rv
}

/**
 * @ignore
 */
function defaults(param, def) {
  if (param === undefined) {
    return def
  } else {
    return param
  }
}

/**
 * Wraps an object as an Expression. This will automatically wrap any bare objects with
 * the appropriate {@link object} escaping.
 * @param {Object} obj
 *  The object to be wrapped as an Expression.
 * @returns {Expr}
 *   The expression wrapping the provided object.
 * @private
 */
function wrap(obj) {
  arity.exact(1, arguments, wrap.name)
  if (obj === null) {
    return null
  } else if (
    obj instanceof Expr ||
    util.checkInstanceHasProperty(obj, '_isFaunaExpr')
  ) {
    return obj
  } else if (typeof obj === 'symbol') {
    return obj.toString().replace(/Symbol\((.*)\)/, function(str, symbol) {
      return symbol
    })
  } else if (typeof obj === 'function') {
    return Lambda(obj)
  } else if (Array.isArray(obj)) {
    return new Expr(
      obj.map(function(elem) {
        return wrap(elem)
      })
    )
  } else if (obj instanceof Uint8Array || obj instanceof ArrayBuffer) {
    return new values.Bytes(obj)
  } else if (typeof obj === 'object') {
    return new Expr({ object: wrapValues(obj) })
  } else {
    return obj
  }
}

/**
 * Wraps all of the values of a provided Object, while leaving the parent object unwrapped.
 * @param {Object} obj
 *  The object whose values are to be wrapped as Expressions.
 * @returns {Object}
 *  A copy of the provided object, with the values wrapped as Expressions.
 * @private
 */
function wrapValues(obj) {
  if (obj !== null) {
    var rv = {}

    Object.keys(obj).forEach(function(key) {
      rv[key] = wrap(obj[key])
    })

    return rv
  } else {
    return null
  }
}

module.exports = {
  Ref: Ref,
  Bytes: Bytes,
  Abort: Abort,
  At: At,
  Let: Let,
  Var: Var,
  If: If,
  Do: Do,
  Object: objectFunction,
  Lambda: Lambda,
  Call: Call,
  Query: Query,
  Map: Map,
  Foreach: Foreach,
  Filter: Filter,
  Take: Take,
  Drop: Drop,
  Prepend: Prepend,
  Append: Append,
  IsEmpty: IsEmpty,
  IsNonEmpty: IsNonEmpty,
  IsNumber: IsNumber,
  IsDouble: IsDouble,
  IsInteger: IsInteger,
  IsBoolean: IsBoolean,
  IsNull: IsNull,
  IsBytes: IsBytes,
  IsTimestamp: IsTimestamp,
  IsDate: IsDate,
  IsString: IsString,
  IsArray: IsArray,
  IsObject: IsObject,
  IsRef: IsRef,
  IsSet: IsSet,
  IsDoc: IsDoc,
  IsLambda: IsLambda,
  IsCollection: IsCollection,
  IsDatabase: IsDatabase,
  IsIndex: IsIndex,
  IsFunction: IsFunction,
  IsKey: IsKey,
  IsToken: IsToken,
  IsCredentials: IsCredentials,
  IsRole: IsRole,
  Get: Get,
  KeyFromSecret: KeyFromSecret,
  Reduce: Reduce,
  Paginate: Paginate,
  Exists: Exists,
  Create: Create,
  Update: Update,
  Replace: Replace,
  Delete: Delete,
  Insert: Insert,
  Remove: Remove,
  CreateClass: deprecate(
    CreateClass,
    'CreateClass() is deprecated, use CreateCollection() instead'
  ),
  CreateCollection: CreateCollection,
  CreateDatabase: CreateDatabase,
  CreateIndex: CreateIndex,
  CreateKey: CreateKey,
  CreateFunction: CreateFunction,
  CreateRole: CreateRole,
  CreateAccessProvider: CreateAccessProvider,
  Singleton: Singleton,
  Events: Events,
  Match: Match,
  Union: Union,
  Merge: Merge,
  Intersection: Intersection,
  Difference: Difference,
  Distinct: Distinct,
  Join: Join,
  Range: Range,
  Login: Login,
  Logout: Logout,
  Identify: Identify,
  Identity: Identity,
  HasIdentity: HasIdentity,
  Concat: Concat,
  Casefold: Casefold,
  ContainsStr: ContainsStr,
  ContainsStrRegex: ContainsStrRegex,
  StartsWith: StartsWith,
  EndsWith: EndsWith,
  FindStr: FindStr,
  FindStrRegex: FindStrRegex,
  Length: Length,
  LowerCase: LowerCase,
  LTrim: LTrim,
  NGram: NGram,
  Repeat: Repeat,
  ReplaceStr: ReplaceStr,
  ReplaceStrRegex: ReplaceStrRegex,
  RegexEscape: RegexEscape,
  RTrim: RTrim,
  Space: Space,
  SubString: SubString,
  TitleCase: TitleCase,
  Trim: Trim,
  UpperCase: UpperCase,
  Format: Format,
  Time: Time,
  TimeAdd: TimeAdd,
  TimeSubtract: TimeSubtract,
  TimeDiff: TimeDiff,
  Epoch: Epoch,
  Date: Date,
  Now: Now,
  NextId: deprecate(NextId, 'NextId() is deprecated, use NewId() instead'),
  NewId: NewId,
  Database: Database,
  Index: Index,
  Class: deprecate(Class, 'Class() is deprecated, use Collection() instead'),
  Collection: Collection,
  Function: FunctionFn,
  Role: Role,
  AccessProviders: AccessProviders,
  Classes: deprecate(
    Classes,
    'Classes() is deprecated, use Collections() instead'
  ),
  Collections: Collections,
  Databases: Databases,
  Indexes: Indexes,
  Functions: Functions,
  Roles: Roles,
  Keys: Keys,
  Tokens: Tokens,
  Credentials: Credentials,
  Equals: Equals,
  Contains: deprecate(
    Contains,
    'Contains() is deprecated, use ContainsPath() instead'
  ),
  ContainsPath: ContainsPath,
  ContainsField: ContainsField,
  ContainsValue: ContainsValue,
  Select: Select,
  SelectAll: deprecate(SelectAll, 'SelectAll() is deprecated. Avoid use.'),
  Abs: Abs,
  Add: Add,
  BitAnd: BitAnd,
  BitNot: BitNot,
  BitOr: BitOr,
  BitXor: BitXor,
  Ceil: Ceil,
  Divide: Divide,
  Floor: Floor,
  Max: Max,
  Min: Min,
  Modulo: Modulo,
  Multiply: Multiply,
  Round: Round,
  Subtract: Subtract,
  Sign: Sign,
  Sqrt: Sqrt,
  Trunc: Trunc,
  Count: Count,
  Sum: Sum,
  Mean: Mean,
  Any: Any,
  All: All,
  Acos: Acos,
  Asin: Asin,
  Atan: Atan,
  Cos: Cos,
  Cosh: Cosh,
  Degrees: Degrees,
  Exp: Exp,
  Hypot: Hypot,
  Ln: Ln,
  Log: Log,
  Pow: Pow,
  Radians: Radians,
  Sin: Sin,
  Sinh: Sinh,
  Tan: Tan,
  Tanh: Tanh,
  LT: LT,
  LTE: LTE,
  GT: GT,
  GTE: GTE,
  And: And,
  Or: Or,
  Not: Not,
  ToString: ToString,
  ToNumber: ToNumber,
  ToObject: ToObject,
  ToArray: ToArray,
  ToDouble: ToDouble,
  ToInteger: ToInteger,
  ToTime: ToTime,
  ToSeconds: ToSeconds,
  ToMicros: ToMicros,
  ToMillis: ToMillis,
  DayOfMonth: DayOfMonth,
  DayOfWeek: DayOfWeek,
  DayOfYear: DayOfYear,
  Second: Second,
  Minute: Minute,
  Hour: Hour,
  Month: Month,
  Year: Year,
  ToDate: ToDate,
  MoveDatabase: MoveDatabase,
  Documents: Documents,
  Reverse: Reverse,
  AccessProvider: AccessProvider,
  wrap: wrap,
}
