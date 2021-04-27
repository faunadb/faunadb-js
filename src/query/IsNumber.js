import Expr from '../Expr'
import { arity, wrap } from './common'

/**
 * Check if the expression is a number.
 *
 * @param {module:query~ExprArg} expr
 *   The expression to check
 * @return {Expr}
 * @see <a href="https://docs.fauna.com/fauna/current/api/fql/functions/isnumber">IsNumber</a>
 */
export default function IsNumber(expr) {
  arity.exact(1, arguments, IsNumber.name)
  return new Expr({ is_number: wrap(expr) })
}
