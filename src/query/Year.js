import Expr from '../Expr'
import { arity, wrap } from './common'

/**
 * Returns the time expression's year, following the ISO-8601 standard.
 *
 * @param {module:query~ExprArg} expression
 *   An expression to convert to a year.
 * @return {Expr}
 */
export default function Year(expr) {
  arity.exact(1, arguments, Year.name)
  return new Expr({ year: wrap(expr) })
}
