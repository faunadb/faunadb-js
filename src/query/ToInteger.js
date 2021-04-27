import Expr from '../Expr'
import { arity, wrap } from './common'

/**
 * Converts an expression to an integer value, if possible.
 *
 * @param {module:query~ExprArg} expression
 *   An expression to convert to an integer.
 * @return {Expr}
 */
export default function ToInteger(expr) {
  arity.exact(1, arguments, ToInteger.name)
  return new Expr({ to_integer: wrap(expr) })
}
