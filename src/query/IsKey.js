import Expr from '../Expr'
import { arity, wrap } from './common'

/**
 * Check if the expression is a key.
 *
 * @param {module:query~ExprArg} expr
 *   The expression to check
 * @return {Expr}
 * @see <a href="https://docs.fauna.com/fauna/current/api/fql/functions/iskey">IsKey</a>
 */
export default function IsKey(expr) {
  arity.exact(1, arguments, IsKey.name)
  return new Expr({ is_key: wrap(expr) })
}
