import Expr from '../Expr'
import { arity, wrap } from './common'

/**
 * Converts an expression to a double value, if possible.
 *
 * @param {module:query~ExprArg} expression
 *   An expression to convert to a double.
 * @return {Expr}
 */
export default function ToDouble(expr) {
  arity.exact(1, arguments, ToDouble.name)
  return new Expr({ to_double: wrap(expr) })
}
