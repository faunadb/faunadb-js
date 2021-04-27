import Expr from '../Expr'
import { arity, wrap } from './common'

/**
 * Converts an expression to a time literal.
 *
 * @param {module:query~ExprArg} expression
 *   An expression to convert to a time.
 * @return {Expr}
 */
export default function ToTime(expr) {
  arity.exact(1, arguments, ToTime.name)
  return new Expr({ to_time: wrap(expr) })
}
