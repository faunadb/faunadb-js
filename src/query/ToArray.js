import Expr from '../Expr'
import { arity, wrap } from './common'

/**
 * Converts an expression to an Array.
 *
 * @param {module:query~ExprArg} expression
 *   An expression to convert to an Array.
 * @return {Expr}
 */
export default function ToArray(expr) {
  arity.exact(1, arguments, ToArray.name)
  return new Expr({ to_array: wrap(expr) })
}
