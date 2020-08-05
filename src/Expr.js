'use strict'

var util = require('./_util')

/**
 * A representation of a FaunaDB Query Expression. Generally, you shouldn't need
 * to use this class directly; use the Query helpers defined in {@link module:query}.
 *
 * @param {Object} obj The object that represents a Query to be treated as an Expression.
 * @constructor
 */
function Expr(obj) {
  this.raw = obj
}

Expr.prototype._isFaunaExpr = true

var varArgsFunctions = [
  'Do',
  'Call',
  'Union',
  'Intersection',
  'Difference',
  'Equals',
  'Add',
  'BitAnd',
  'BitOr',
  'BitXor',
  'Divide',
  'Max',
  'Min',
  'Modulo',
  'Multiply',
  'Subtract',
  'LT',
  'LTE',
  'GT',
  'GTE',
  'And',
  'Or',
]

// FQL function names come across the wire as all lowercase letters
// (like the key of this object). Not all are properly snake-cased
// on the Core side, which causes improper capitalizations.
//
// JS Driver patch: https://faunadb.atlassian.net/browse/FE-540
// Core update: https://faunadb.atlassian.net/browse/ENG-2110

var specialCases = {
  containsstr: 'ContainsStr',
  containsstrregex: 'ContainsStrRegex',
  endswith: 'EndsWith',
  findstr: 'FindStr',
  findstrregex: 'FindStrRegex',
  gt: 'GT',
  gte: 'GTE',
  is_nonempty: 'is_non_empty',
  lowercase: 'LowerCase',
  lt: 'LT',
  lte: 'LTE',
  ltrim: 'LTrim',
  rtrim: 'RTrim',
  regexescape: 'RegexEscape',
  replacestr: 'ReplaceStr',
  replacestrregex: 'ReplaceStrRegex',
  startswith: 'StartsWith',
  substring: 'SubString',
  titlecase: 'TitleCase',
  uppercase: 'UpperCase',
}

var exprToString = function(expr, caller) {
  var isExpr = function(e) {
    return e instanceof Expr || util.checkInstanceHasProperty(e, '_isFaunaExpr')
  }

  if (isExpr(expr)) {
    if ('id' in expr || 'collection' in expr || 'database' in expr)
      return expr.toString()
    if ('set' in expr) return expr.toString()
    if ('isoTime' in expr) return expr.toString()
    if ('isoDate' in expr) return expr.toString()
    if ('bytes' in expr) return expr.toString()
    if ('query' in expr) return expr.toString()

    expr = expr.raw
  }

  var type = typeof expr

  if (type === 'string') {
    return JSON.stringify(expr)
  }

  if (type === 'symbol' || type === 'number' || type === 'boolean') {
    return expr.toString()
  }

  if (type === 'undefined') {
    return 'undefined'
  }

  if (expr === null) {
    return 'null'
  }

  var printObject = function(obj) {
    return (
      '{' +
      Object.keys(obj)
        .map(function(k) {
          return k + ': ' + exprToString(obj[k])
        })
        .join(', ') +
      '}'
    )
  }

  var printArray = function(array, toStr) {
    return array
      .map(function(item) {
        return toStr(item)
      })
      .join(', ')
  }

  if (Array.isArray(expr)) {
    var array = printArray(expr, exprToString)

    return varArgsFunctions.indexOf(caller) != -1 ? array : '[' + array + ']'
  }

  if ('match' in expr) {
    var matchStr = exprToString(expr['match'])
    var terms = expr['terms'] || []

    if (isExpr(terms)) terms = terms.raw

    if (Array.isArray(terms) && terms.length == 0)
      return 'Match(' + matchStr + ')'

    if (Array.isArray(terms)) {
      return (
        'Match(' + matchStr + ', [' + printArray(terms, exprToString) + '])'
      )
    }

    return 'Match(' + matchStr + ', ' + exprToString(terms) + ')'
  }

  if ('paginate' in expr) {
    var setStr = exprToString(expr['paginate'])

    var expr2 = Object.assign({}, expr)
    delete expr2['paginate']

    if (Object.keys(expr2).length == 0) return 'Paginate(' + setStr + ')'

    return 'Paginate(' + setStr + ', ' + printObject(expr2) + ')'
  }

  if ('let' in expr && 'in' in expr) {
    var letExpr = ''

    if (Array.isArray(expr['let']))
      letExpr = '[' + printArray(expr['let'], printObject) + ']'
    else letExpr = printObject(expr['let'])

    return 'Let(' + letExpr + ', ' + exprToString(expr['in']) + ')'
  }

  if ('object' in expr) return printObject(expr['object'])

  // Versioned queries/lambdas will have an api_version field.
  // We want to prevent it from being parsed and displayed as:
  // Query(ApiVersion("3", "X", Var("X")))
  var keys = Object.keys(expr).filter(
    expression => expression !== 'api_version'
  )
  var fn = keys[0]

  // For FQL functions with special formatting concerns, we
  // use the specialCases object above to define their casing.
  if (fn in specialCases) fn = specialCases[fn]

  fn = fn
    .split('_')
    .map(function(str) {
      return str.charAt(0).toUpperCase() + str.slice(1)
    })
    .join('')

  var args = keys.map(function(k) {
    var v = expr[k]
    return exprToString(v, fn)
  })

  var shouldReverseArgs = ['filter', 'map', 'foreach'].some(function(fn) {
    return fn in expr
  })

  if (shouldReverseArgs) {
    args.reverse()
  }

  args = args.join(', ')

  return fn + '(' + args + ')'
}

Expr.toString = exprToString

module.exports = Expr
