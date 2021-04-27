import Expr from '../Expr'
import { arity, wrap } from './common'

/**
 * Check if the expression is a date.
 *
 * @param {module:query~ExprArg} expr
 *   The expression to check
 * @return {Expr}
 * @see <a href="https://docs.fauna.com/fauna/current/api/fql/functions/isdate">IsDate</a>
 */
export default function IsDate(expr) {
  arity.exact(1, arguments, IsDate.name)
  return new Expr({ is_date: wrap(expr) })
}
