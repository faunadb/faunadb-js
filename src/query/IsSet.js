import Expr from '../Expr'
import { arity, wrap } from './common'

/**
 * Check if the expression is a set.
 *
 * @param {module:query~ExprArg} expr
 *   The expression to check
 * @return {Expr}
 * @see <a href="https://docs.fauna.com/fauna/current/api/fql/functions/isset">IsSet</a>
 */
export default function IsSet(expr) {
  arity.exact(1, arguments, IsSet.name)
  return new Expr({ is_set: wrap(expr) })
}
