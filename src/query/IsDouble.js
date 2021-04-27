import Expr from '../Expr'
import { arity, wrap } from './common'

/**
 * Check if the expression is a double.
 *
 * @param {module:query~ExprArg} expr
 *   The expression to check
 * @return {Expr}
 * @see <a href="https://docs.fauna.com/fauna/current/api/fql/functions/isdouble">IsDouble</a>
 */
export default function IsDouble(expr) {
  arity.exact(1, arguments, IsDouble.name)
  return new Expr({ is_double: wrap(expr) })
}
