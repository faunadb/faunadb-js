import Expr from '../Expr'
import { arity, wrap } from './common'

/**
 * Check if the expression is a string.
 *
 * @param {module:query~ExprArg} expr
 *   The expression to check
 * @return {Expr}
 * @see <a href="https://docs.fauna.com/fauna/current/api/fql/functions/isstring">IsString</a>
 */
export default function IsString(expr) {
  arity.exact(1, arguments, IsString.name)
  return new Expr({ is_string: wrap(expr) })
}
