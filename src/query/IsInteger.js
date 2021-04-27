import Expr from '../Expr'
import { arity, wrap } from './common'

/**
 * Check if the expression is an integer.
 *
 * @param {module:query~ExprArg} expr
 *   The expression to check
 * @return {Expr}
 * @see <a href="https://docs.fauna.com/fauna/current/api/fql/functions/isinteger">IsInteger</a>
 */
export default function IsInteger(expr) {
  arity.exact(1, arguments, IsInteger.name)
  return new Expr({ is_integer: wrap(expr) })
}
