import Expr from '../Expr'
import { arity, varargs, wrap, argsToArray } from './common'

/**
 * Format values into a string.
 *
 * @param  {string}  string string with format specifiers
 * @param  {array}   values list of values to format
 * @return {string}         a string
 */
export default function Format(string) {
  arity.min(1, arguments, Format.name)
  var args = argsToArray(arguments)
  args.shift()
  return new Expr({ format: wrap(string), values: wrap(varargs(args)) })
}

// Time and date functions
