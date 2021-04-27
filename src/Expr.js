'use strict'

import { checkInstanceHasProperty } from './_util'

/**
 * A representation of a FaunaDB Query Expression. Generally, you shouldn't need
 * to use this class directly; use the Query helpers defined in {@link module:query}.
 *
 * @param {Object} obj The object that represents a Query to be treated as an Expression.
 * @constructor
 */
export default function Expr(obj) {
  this.raw = obj
}

Expr.prototype._isFaunaExpr = true

Expr.prototype.toJSON = function() {
  return this.raw
}

Expr.prototype.toFQL = function() {
  return exprToString(this.raw)
}

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

/**
 *
 * @param {Expr} expression A FQL expression
 * @returns {Boolean} Returns true for valid expressions
 * @private
 */
function isExpr(expression) {
  return (
    expression instanceof Expr ||
    checkInstanceHasProperty(expression, '_isFaunaExpr')
  )
}

/**
 *
 * @param {Object} obj An object to print
 * @returns {String} String representation of object
 * @private
 */
function printObject(obj) {
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

/**
 *
 * @param {Array} arr An array to print
 * @param {Function} toStr Function used for stringification
 * @returns {String} String representation of array
 * @private
 */
function printArray(arr, toStr) {
  return arr
    .map(function(item) {
      return toStr(item)
    })
    .join(', ')
}

/**
 *
 * @param {String} fn A snake-case FQL function name
 * @returns {String} The correpsonding camel-cased FQL function name
 * @private
 */
function convertToCamelCase(fn) {
  // For FQL functions with special formatting concerns, we
  // use the specialCases object above to define their casing.
  if (fn in specialCases) fn = specialCases[fn]

  return fn
    .split('_')
    .map(function(str) {
      return str.charAt(0).toUpperCase() + str.slice(1)
    })
    .join('')
}

var exprToString = function(expr, caller) {
  // If expr is a Expr, we want to parse expr.raw instead
  if (isExpr(expr)) {
    if ('value' in expr) return expr.toString()
    expr = expr.raw
  }

  // Return early to avoid extra work if null
  if (expr === null) {
    return 'null'
  }

  // Return stringified value if expression is not an Object or Array
  switch (typeof expr) {
    case 'string':
      return JSON.stringify(expr)
    case 'symbol':
    case 'number':
    case 'boolean':
      return expr.toString()
    case 'undefined':
      return 'undefined'
  }

  // Handle expression Arrays
  if (Array.isArray(expr)) {
    var array = printArray(expr, exprToString)
    return varArgsFunctions.indexOf(caller) != -1 ? array : '[' + array + ']'
  }

  // Parse expression Objects
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
    var exprKeys = Object.keys(expr)
    if (exprKeys.length === 1) {
      return 'Paginate(' + exprToString(expr['paginate']) + ')'
    }

    var expr2 = Object.assign({}, expr)
    delete expr2['paginate']

    return (
      'Paginate(' +
      exprToString(expr['paginate']) +
      ', ' +
      printObject(expr2) +
      ')'
    )
  }

  if ('let' in expr && 'in' in expr) {
    var letExpr = ''

    if (Array.isArray(expr['let']))
      letExpr = '[' + printArray(expr['let'], printObject) + ']'
    else letExpr = printObject(expr['let'])

    return 'Let(' + letExpr + ', ' + exprToString(expr['in']) + ')'
  }

  if ('object' in expr) return printObject(expr['object'])

  if ('merge' in expr) {
    if (expr.lambda) {
      return (
        'Merge(' +
        exprToString(expr.merge) +
        ', ' +
        exprToString(expr.with) +
        ', ' +
        exprToString(expr.lambda) +
        ')'
      )
    }

    return (
      'Merge(' + exprToString(expr.merge) + ', ' + exprToString(expr.with) + ')'
    )
  }

  if ('lambda' in expr) {
    return (
      'Lambda(' +
      exprToString(expr['lambda']) +
      ', ' +
      exprToString(expr['expr']) +
      ')'
    )
  }

  if ('filter' in expr) {
    return (
      'Filter(' +
      exprToString(expr['collection']) +
      ', ' +
      exprToString(expr['filter']) +
      ')'
    )
  }

  if ('call' in expr) {
    return (
      'Call(' +
      exprToString(expr['call']) +
      ', ' +
      exprToString(expr['arguments']) +
      ')'
    )
  }

  if ('map' in expr) {
    return (
      'Map(' +
      exprToString(expr['collection']) +
      ', ' +
      exprToString(expr['map']) +
      ')'
    )
  }

  if ('foreach' in expr) {
    return (
      'Foreach(' +
      exprToString(expr['collection']) +
      ', ' +
      exprToString(expr['foreach']) +
      ')'
    )
  }

  var keys = Object.keys(expr)
  var fn = keys[0]
  fn = convertToCamelCase(fn)

  // The filter prevents zero arity functions from having a null argument
  // This only works under the assumptions
  // that there are no functions where a single 'null' argument makes sense.
  var args = keys
    .filter(k => expr[k] !== null || keys.length > 1)
    .map(k => exprToString(expr[k], fn))
    .join(', ')

  return fn + '(' + args + ')'
}

Expr.toString = exprToString
