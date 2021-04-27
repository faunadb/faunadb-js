import Expr from '../Expr'
import { arity, wrap } from './common'

/**
 * Check if the expression is a timestamp.
 *
 * @param {module:query~ExprArg} expr
 *   The expression to check
 * @return {Expr}
 * @see <a href="https://docs.fauna.com/fauna/current/api/fql/functions/istimestamp">IsTimestamp</a>
 */
export default function IsTimestamp(expr) {
  arity.exact(1, arguments, IsTimestamp.name)
  return new Expr({ is_timestamp: wrap(expr) })
}
