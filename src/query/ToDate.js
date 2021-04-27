import Expr from '../Expr'
import { arity, wrap } from './common'

/**
 * Converts an expression to a date literal.
 *
 * @param {module:query~ExprArg} expression
 *   An expression to convert to a date.
 * @return {Expr}
 */
export default function ToDate(expr) {
  arity.exact(1, arguments, ToDate.name)
  return new Expr({ to_date: wrap(expr) })
}
