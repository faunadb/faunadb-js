import Expr from '../Expr'
import { arity, wrap } from './common'

/**
 * Converts an expression to a number literal.
 *
 * @param {module:query~ExprArg} expression
 *   An expression to convert to a number.
 * @return {Expr}
 */
export default function ToNumber(expr) {
  arity.exact(1, arguments, ToNumber.name)
  return new Expr({ to_number: wrap(expr) })
}
