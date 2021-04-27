import Expr from '../Expr'
import { arity, wrap } from './common'

/**
 * Returns a time expression's month of the year, from 1 to 12.
 *
 * @param {module:query~ExprArg} expression
 *   An expression to convert to a month.
 * @return {Expr}
 */
export default function Month(expr) {
  arity.exact(1, arguments, Month.name)
  return new Expr({ month: wrap(expr) })
}
